// P2 data layers. Run after build-data.mjs and build-geo.mjs (npm run data:build runs all three).
//   D6  access routed on the Vicmap main-road network (replaces straight lines as the primary dependency list)
//   D7  rooftop solar, home batteries and heat-pump water heaters per 100 dwellings (Clean Energy Regulator × ABS)
//   D9  mapped urban trees per hectare, a heat proxy (Vicmap tree_urban)
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import * as turf from "@turf/turf";

const RAW = "data/raw";
const TODAY = new Date().toISOString().slice(0, 10);
const LICENCE = "CC BY 4.0";
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const suburbs = read("lib/suburbs.geo.json");
const AREAS = read("lib/data/study-areas.json");
const facilities = read("lib/data/facilities.json").facilities;
const crossings = read("lib/data/crossings.json").crossings;
const straight = read("lib/data/access-straight.json");
const subOf = (sal) => suburbs.features.find((f) => f.properties.sal_code_2021 === sal);

async function download(url, file, init) {
  if (existsSync(file)) return;
  console.log("downloading", file);
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

// ---------- D6: shortest routes on the full road network ----------
// Graph: every vertex of every road segment, freeway to local street (Vicmap class 0-5); edges weighted by length.
// Origins are suburb centres and destinations facilities, snapped to the nearest non-freeway road vertex.
const WFS = "https://opendata.maps.vic.gov.au/geoserver/wfs";
async function wfsPaged(file, typeName, cql, props) {
  const path = `${RAW}/${file}`;
  if (existsSync(path)) return read(path);
  console.log("downloading", typeName, cql);
  const features = [];
  for (let start = 0; ; start += 5000) {
    const q = new URLSearchParams({ service: "WFS", version: "2.0.0", request: "GetFeature", typeNames: `open-data-platform:${typeName}`, outputFormat: "application/json", srsName: "EPSG:4326", count: "5000", startIndex: String(start), sortBy: "ufi", propertyName: props, cql_filter: `(${cql}) AND BBOX(geom,${turf.bbox(suburbs).map((v) => v.toFixed(4)).join(",")},'EPSG:4326')` });
    const res = await fetch(`${WFS}?${q}`);
    if (!res.ok) throw new Error(`${res.status} for ${typeName}`);
    const page = await res.json();
    features.push(...page.features);
    if (page.features.length < 5000) break;
  }
  const fc = { type: "FeatureCollection", features };
  writeFileSync(path, JSON.stringify(fc));
  return fc;
}
const roads = (await wfsPaged("all_roads.json", "tr_road", "class_code IN (0,1,2,3,4,5)", "ufi,ezi_road_name_label,class_code,geom")).features;

// Local-street crossings of riverine flood overlays, added to the main-road crossings from build-geo (P1-D5).
const riverine = read(`${RAW}/flood_overlays.json`).features.filter((f) => /^(LSIO|FO)/.test(f.properties.zone_code)).map((f) => ({ f, box: turf.bbox(f) }));
const overlapsBox = (a, b) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
const crossingIds = new Set(crossings.map((c) => c.id));
let added = 0;
for (const r of roads.filter((x) => x.properties.class_code >= 4)) {
  const road = r.properties.ezi_road_name_label;
  if (!road || /^unnamed/i.test(road)) continue;
  const rbox = turf.bbox(r);
  for (const { f, box } of riverine) {
    if (!overlapsBox(rbox, box) || !turf.booleanIntersects(r, f)) continue;
    const id = `x-${road.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${f.properties.pfi}`;
    let c = crossings.find((x) => x.id === id);
    if (!c) {
      const at = (turf.lineIntersect(r, turf.polygonToLine(f)).features[0]?.geometry.coordinates ?? turf.pointOnFeature(r).geometry.coordinates).map((v) => Math.round(v * 1e5) / 1e5);
      c = { id, road, overlay: f.properties.zone_code, lga: f.properties.lga, at, roadUfis: [], local: true,
        location: { value: at, status: "public", source: "Vicmap Transport (tr_road, class 4-5 local streets) × Vicmap Planning, planning scheme overlays (plan_overlay)", date: `current Vicmap (downloaded ${TODAY})`, licence: LICENCE } };
      crossings.push(c); crossingIds.add(id); added++;
    }
    if (!c.roadUfis.includes(r.properties.ufi)) c.roadUfis.push(r.properties.ufi);
  }
}
crossings.sort((a, b) => a.id.localeCompare(b.id));
writeFileSync("lib/data/crossings.json", JSON.stringify({ generated: TODAY, crossings }, null, 2) + "\n");
console.log(`D6 added ${added} local-street crossings (${crossings.length} crossings in total)`);
const key = (c) => `${c[0].toFixed(6)},${c[1].toFixed(6)}`;
const nodes = new Map(); // key -> { c, edges: [{ to, km, ufi }], freewayOnly }
const node = (c, cls) => { const k = key(c); if (!nodes.has(k)) nodes.set(k, { c, edges: [], freewayOnly: true }); if (cls !== 0) nodes.get(k).freewayOnly = false; return k; };
for (const r of roads) {
  const lines = r.geometry.type === "MultiLineString" ? r.geometry.coordinates : [r.geometry.coordinates];
  for (const line of lines)
    for (let i = 1; i < line.length; i++) {
      const a = node(line[i - 1], r.properties.class_code), b = node(line[i], r.properties.class_code);
      const km = turf.distance(line[i - 1], line[i]);
      nodes.get(a).edges.push({ to: b, km, ufi: r.properties.ufi });
      nodes.get(b).edges.push({ to: a, km, ufi: r.properties.ufi });
    }
}
const nodeKeys = [...nodes.keys()].filter((k) => !nodes.get(k).freewayOnly); // never start or end on a freeway
const snap = (c) => {
  let best = null, bestKm = Infinity;
  for (const k of nodeKeys) { const d = turf.distance(c, nodes.get(k).c); if (d < bestKm) { bestKm = d; best = k; } }
  return { key: best, km: bestKm };
};
// Dijkstra with a binary heap; returns distance and predecessor edge for every reachable node.
function dijkstra(src) {
  const dist = new Map([[src, 0]]), prev = new Map(), heap = [[0, src]];
  const push = (x) => { heap.push(x); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  while (heap.length) {
    const [d, u] = pop();
    if (d > dist.get(u)) continue;
    for (const e of nodes.get(u).edges) {
      const nd = d + e.km;
      if (nd < (dist.get(e.to) ?? Infinity)) { dist.set(e.to, nd); prev.set(e.to, { from: u, ufi: e.ufi }); push([nd, e.to]); }
    }
  }
  return { dist, prev };
}
const crossingByUfi = new Map();
for (const c of crossings) for (const u of c.roadUfis) (crossingByUfi.get(u) ?? crossingByUfi.set(u, new Set()).get(u)).add(c.id);

const ROUTE_SRC = "Shortest route on the Vicmap road network (freeway to local street), suburb centre and facility snapped to the nearest non-freeway road point; not a travel-time or accessibility model";
const R = (value) => ({ value, status: "illustrative", source: ROUTE_SRC, date: TODAY });
const facSnap = new Map(facilities.map((f) => [f.id, snap(f.location.value)]));
const links = [], routing = [];
let unreachable = 0;
for (const centre of straight.centres) {
  const origin = snap(centre.centre);
  const { dist, prev } = dijkstra(origin.key);
  for (const sl of straight.links.filter((l) => l.from === centre.sal)) {
    const dest = facSnap.get(sl.to);
    if (!dist.has(dest.key)) { unreachable++; links.push({ from: sl.from, to: sl.to, distanceKm: R(null), dependsOn: R(null) }); continue; }
    const deps = new Set();
    for (let k = dest.key; k !== origin.key; k = prev.get(k).from) for (const id of crossingByUfi.get(prev.get(k).ufi) ?? []) deps.add(id);
    links.push({ from: sl.from, to: sl.to, distanceKm: R(Math.round((dist.get(dest.key) + origin.km + dest.km) * 100) / 100), dependsOn: R([...deps].sort()) });
    routing.push({ from: sl.from, to: sl.to, snapKm: { origin: Math.round(origin.km * 100) / 100, destination: Math.round(dest.km * 100) / 100 } });
  }
}
// access-links.json is the engine's input, so it holds only from, to, distanceKm and dependsOn.
writeFileSync("lib/data/access-links.json", JSON.stringify({ generated: TODAY, method: "routed", centres: straight.centres, links }, null, 2) + "\n");
writeFileSync("lib/data/access-routing.json", JSON.stringify({ generated: TODAY, method: ROUTE_SRC, roadPoints: nodes.size, routing }, null, 2) + "\n");
const changed = links.filter((l) => JSON.stringify(l.dependsOn.value) !== JSON.stringify(straight.links.find((x) => x.from === l.from && x.to === l.to).dependsOn.value)).length;
console.log(`D6 routed ${links.length} links on ${nodes.size} road points; ${unreachable} unreachable; ${changed} dependency lists differ from the straight-line version`);

// ---------- D7: small-scale solar, batteries and heat-pump water heaters ----------
const POA_URL = "https://geo.abs.gov.au/arcgis/rest/services/ASGS2021/POA/MapServer/0/query";
const bbox = turf.bbox(suburbs).join(",");
await download(`${POA_URL}?${new URLSearchParams({ where: "1=1", geometry: bbox, geometryType: "esriGeometryEnvelope", inSR: "4326", outSR: "4326", outFields: "POA_CODE_2021", maxAllowableOffset: "0.0001", geometryPrecision: "5", f: "geojson" })}`, `${RAW}/poa.geo.json`);
const poas = read(`${RAW}/poa.geo.json`).features;
const postcodeOf = (sal) => {
  const sub = subOf(sal);
  const shares = poas.map((p) => ({ poa: p.properties.poa_code_2021, km2: (() => { const i = turf.intersect(turf.featureCollection([sub, p])); return i ? turf.area(i) / 1e6 : 0; })() }))
    .filter((s) => s.km2 > 0).sort((a, b) => b.km2 - a.km2);
  const total = shares.reduce((t, s) => t + s.km2, 0);
  return { main: shares[0].poa, share: Math.round((shares[0].km2 / total) * 100) };
};
const postcodes = Object.fromEntries(AREAS.map(({ sal }) => [sal, postcodeOf(sal)]));
const POAS = [...new Set(Object.values(postcodes).map((p) => p.main))];

const CER = {
  solar: { file: "cer_solar.csv", url: "https://cer.gov.au/document/sgu-solar-installations-2011-to-present-and-totals", label: "rooftop solar systems (2001 to Aug 2026)" },
  battery: { file: "cer_battery.csv", url: "https://cer.gov.au/document/sgu-battery-installations-2011-to-present-and-totals", label: "home batteries (Jul 2025 to Aug 2026)" },
  heatPump: { file: "cer_heatpump.csv", url: "https://cer.gov.au/document/swh-air-source-heat-pump-installations-2011-to-present-and-totals", label: "air-source heat-pump water heaters (2001 to Aug 2026)" },
};
// Quote-aware CSV row split: large counts are written like "4,700".
const csvRow = (line) => {
  const out = []; let cur = "", q = false;
  for (const ch of line) { if (ch === '"') q = !q; else if (ch === "," && !q) { out.push(cur); cur = ""; } else cur += ch; }
  out.push(cur); return out;
};
const cerTotals = {};
for (const [k, c] of Object.entries(CER)) {
  await download(c.url, `${RAW}/${c.file}`);
  const rows = readFileSync(`${RAW}/${c.file}`, "latin1").split(/\r?\n/).filter(Boolean).map(csvRow);
  const col = rows[0].findIndex((h) => /^Total Installation Quantity/.test(h));
  cerTotals[k] = Object.fromEntries(rows.slice(1).filter((r) => POAS.includes(r[0])).map((r) => [r[0], Number(r[col].replace(/,/g, ""))]));
  for (const p of POAS) if (!Number.isFinite(cerTotals[k][p])) throw new Error(`${k}: no valid total for postcode ${p}`);
}
// Occupied private dwellings per postcode (Census 2021 G34 total).
await download(`https://data.api.abs.gov.au/rest/data/ABS,C21_G34_POA,1.0.0/_T.D.${POAS.join("+")}..?dimensionAtObservation=AllDimensions`, `${RAW}/g34_poa.csv`, { headers: { Accept: "application/vnd.sdmx.data+csv" } });
const g34 = readFileSync(`${RAW}/g34_poa.csv`, "utf8").split(/\r?\n/).filter(Boolean).map((l) => l.split(","));
const h = g34[0], ri = h.indexOf("REGION"), vi = h.indexOf("OBS_VALUE");
const dwellings = Object.fromEntries(g34.slice(1).map((r) => [r[ri].replace(/^POA/, ""), Number(r[vi])]));

const energy = AREAS.map(({ sal, name }) => {
  const { main, share } = postcodes[sal];
  const per100 = (k) => Math.round((cerTotals[k][main] / dwellings[main]) * 1000) / 10;
  const S = (k) => ({ value: per100(k), status: "public", source: `Clean Energy Regulator small-scale installations by postcode, ${CER[k].label} ÷ ABS Census 2021 occupied private dwellings (G34), postcode ${main}`, date: `Aug 2026 (downloaded ${TODAY})`, licence: LICENCE });
  return {
    sal, name, postcode: main, postcodeAreaShare: share,
    installations: Object.fromEntries(Object.keys(CER).map((k) => [k, cerTotals[k][main]])), dwellings: dwellings[main],
    solarPer100: S("solar"), batteryPer100: S("battery"), heatPumpPer100: S("heatPump"),
  };
});
writeFileSync("lib/data/energy.json", JSON.stringify({ generated: TODAY, note: "Postcode-level: suburbs sharing a postcode show the same values.", areas: energy }, null, 2) + "\n");
console.log("D7 energy (per 100 dwellings, postcode-level)");
for (const e of energy) console.log(" ", e.name.padEnd(15), e.postcode, `${e.postcodeAreaShare}%`, "solar", e.solarPer100.value, "battery", e.batteryPer100.value, "heat pump", e.heatPumpPer100.value);

// ---------- D9: mapped urban trees per hectare ----------
async function treeCount(sal) {
  const file = `${RAW}/trees_${sal}.json`;
  if (existsSync(file)) return read(file);
  const poly = turf.simplify(subOf(sal), { tolerance: 0.0005, highQuality: true });
  const wkt = `POLYGON((${poly.geometry.coordinates[0].map((c) => `${c[0].toFixed(5)} ${c[1].toFixed(5)}`).join(",")}))`;
  const q = new URLSearchParams({ service: "WFS", version: "2.0.0", request: "GetFeature", typeNames: "open-data-platform:tree_urban", resultType: "hits", srsName: "EPSG:4326", cql_filter: `INTERSECTS(geom,SRID=4326;${wkt})` });
  const res = await fetch(`https://opendata.maps.vic.gov.au/geoserver/wfs?${q}`);
  const n = Number((await res.text()).match(/numberMatched="(\d+)"/)?.[1]);
  const out = { count: n, hectares: turf.area(poly) / 1e4 };
  writeFileSync(file, JSON.stringify(out));
  return out;
}
const trees = [];
for (const { sal, name } of AREAS) {
  const { count, hectares } = await treeCount(sal);
  trees.push({ sal, name, treesPerHa: { value: Number.isFinite(count) ? Math.round((count / hectares) * 10) / 10 : null, status: Number.isFinite(count) ? "public" : "unknown", source: "Vicmap Vegetation urban trees (tree_urban) counted inside the suburb boundary ÷ suburb area; a heat proxy (fewer trees, hotter streets), not a temperature", date: `current Vicmap (downloaded ${TODAY})`, licence: LICENCE }, treeCount: count });
}
writeFileSync("lib/data/heat.json", JSON.stringify({ generated: TODAY, areas: trees }, null, 2) + "\n");
console.log("D9 mapped urban trees per hectare");
for (const t of trees) console.log(" ", t.name.padEnd(15), t.treesPerHa.value, `(${t.treeCount} trees)`);
