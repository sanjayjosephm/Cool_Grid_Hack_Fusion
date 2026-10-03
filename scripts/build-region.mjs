// P3-2 regional expansion: runs the same public-data pipeline for a regional council and writes one combined file.
// Usage: node scripts/build-region.mjs shepparton   (part of npm run data:build)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as turf from "@turf/turf";
import * as XLSX from "xlsx";

const REGIONS = {
  shepparton: {
    name: "Greater Shepparton",
    lga: "Greater Shepparton",
    areas: [["22275", "Shepparton"], ["21756", "Mooroopna"], ["21340", "Kialla"], ["22277", "Shepparton North"]],
    facilityTypes: ["community venue", "cultural centre"],
    // Planning facilities: the central library plus the named community halls Vicmap maps on each side of the river
    // (Mooroopna has no mapped library or community centre).
    chosen: [["reg-shepparton-library", "Shepparton Library"], ["reg-mooroopna-hall", "Mooroopna Scout And Guide Hall"], ["reg-kialla-hall", "Kialla Public Hall"]],
  },
};
const key = process.argv[2] ?? "shepparton";
const R = REGIONS[key];
if (!R) throw new Error(`unknown region ${key}`);
const RAW = `data/raw/${key}`;
mkdirSync(RAW, { recursive: true });
mkdirSync("lib/data/regions", { recursive: true });
const TODAY = new Date().toISOString().slice(0, 10);
const LICENCE = "CC BY 4.0";
const CODES = R.areas.map(([c]) => c);
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const S = (value, status, source, date = `downloaded ${TODAY}`) => ({ value, status: value === null ? "unknown" : status, source, date, licence: status === "public" ? LICENCE : undefined });

async function download(url, file, init) {
  if (existsSync(file)) return;
  console.log("downloading", file);
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

// ---------- boundaries (ABS SAL 2021) ----------
await download(`https://geo.abs.gov.au/arcgis/rest/services/ASGS2021/SAL/MapServer/0/query?${new URLSearchParams({ where: `SAL_CODE_2021 IN (${CODES.map((c) => `'${c}'`).join(",")})`, outFields: "SAL_NAME_2021,SAL_CODE_2021", outSR: "4326", maxAllowableOffset: "0.0002", geometryPrecision: "5", f: "geojson" })}`, `${RAW}/suburbs.geo.json`);
const suburbs = read(`${RAW}/suburbs.geo.json`);
const subOf = (sal) => suburbs.features.find((f) => f.properties.sal_code_2021 === sal);
const BBOX = turf.bbox(turf.buffer(suburbs, 1, { units: "kilometers" })).map((v) => v.toFixed(4)).join(",");

// ---------- people (ABS Census 2021 + SEIFA 2021) ----------
async function census(table, dims, regionPos) {
  const file = `${RAW}/${table.toLowerCase()}.csv`;
  const k = Array.from({ length: dims }, (_, i) => (i === regionPos ? CODES.join("+") : "")).join(".");
  await download(`https://data.api.abs.gov.au/rest/data/ABS,C21_${table}_SAL,1.0.0/${k}?dimensionAtObservation=AllDimensions`, file, { headers: { Accept: "application/vnd.sdmx.data+csv" } });
  const [head, ...rows] = readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).map((l) => l.split(","));
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}
const pick = (rows, sal, where) => Number(rows.find((r) => r.REGION === sal && Object.entries(where).every(([k, v]) => r[k] === v))?.OBS_VALUE);
const [g01, g18, g34] = [await census("G01", 5, 2), await census("G18", 6, 3), await census("G34", 5, 2)];
await download("https://www.abs.gov.au/statistics/people/people-and-communities/socio-economic-indexes-areas-seifa-australia/2021/Suburbs%20and%20Localities%2C%20Indexes%2C%20SEIFA%202021.xlsx", "data/raw/seifa_sal.xlsx");
const seifa = XLSX.utils.sheet_to_json(XLSX.read(readFileSync("data/raw/seifa_sal.xlsx")).Sheets["Table 1"], { header: 1 });
const pct = (a, b) => Math.round((a / b) * 1000) / 10;
const src = (t) => `ABS Census 2021, ${t}, Suburbs and Localities`;
const areas = R.areas.map(([sal, name]) => {
  const s = seifa.find((r) => String(r[0]) === sal);
  const persons = pick(g01, sal, { SEXP: "3", PCHAR: "P_1" });
  return {
    sal, name, lga: R.lga,
    irsdScore: S(Math.round(s[2] * 10) / 10, "public", "ABS SEIFA 2021, IRSD, SAL", "2021"),
    irsdDecile: S(s[3], "public", "ABS SEIFA 2021, IRSD national decile, SAL", "2021"),
    population: S(persons, "public", src("G01 total persons"), "2021"),
    pct65Plus: S(pct(["65_74", "75_84", "GE85"].reduce((t, c) => t + pick(g01, sal, { SEXP: "3", PCHAR: c }), 0), persons), "public", src("G01 age 65+ / total persons"), "2021"),
    pctNeedAssistance: S(pct(pick(g18, sal, { SEXP: "3", AGEP: "_T", ASSNP: "1" }), pick(g18, sal, { SEXP: "3", AGEP: "_T", ASSNP: "_T" })), "public", src("G18 core activity need for assistance"), "2021"),
    pctNoCar: S(pct(pick(g34, sal, { VEHD: "0" }), pick(g34, sal, { VEHD: "_T" })), "public", src("G34 dwellings with no motor vehicle"), "2021"),
  };
});

// ---------- Vicmap layers ----------
async function wfs(file, typeName, cql, props) {
  const path = `${RAW}/${file}`;
  if (existsSync(path)) return read(path);
  console.log("downloading", typeName);
  const features = [];
  for (let start = 0; ; start += 5000) {
    const q = new URLSearchParams({ service: "WFS", version: "2.0.0", request: "GetFeature", typeNames: `open-data-platform:${typeName}`, outputFormat: "application/json", srsName: "EPSG:4326", count: "5000", startIndex: String(start), sortBy: "ufi", propertyName: props, cql_filter: `(${cql}) AND BBOX(geom,${BBOX},'EPSG:4326')` });
    const res = await fetch(`https://opendata.maps.vic.gov.au/geoserver/wfs?${q}`);
    if (!res.ok) throw new Error(`${res.status} for ${typeName}`);
    const page = await res.json();
    features.push(...page.features);
    if (page.features.length < 5000) break;
  }
  writeFileSync(path, JSON.stringify({ type: "FeatureCollection", features }));
  return { features };
}
const VIC = `current Vicmap (downloaded ${TODAY})`;
const overlays = await wfs("flood_overlays.json", "plan_overlay", "zone_code LIKE 'LSIO%' OR zone_code LIKE 'FO%' OR zone_code LIKE 'SBO%'", "pfi,zone_code,lga,geom");
// Regional floodplain overlays are very detailed (160k+ vertices); simplifying to ~10 m keeps crossing and area checks fast.
const riverine = overlays.features.filter((f) => /^(LSIO|FO)/.test(f.properties.zone_code))
  .map((f) => turf.simplify(f, { tolerance: 0.0001, highQuality: false })).map((f) => ({ f, box: turf.bbox(f) }));
const inRiverine = (pt) => riverine.some(({ f, box }) => pt[0] >= box[0] && pt[0] <= box[2] && pt[1] >= box[1] && pt[1] <= box[3] && turf.booleanPointInPolygon(pt, f));
const foi = await wfs("foi_all.json", "foi_point", `feature_type IN (${R.facilityTypes.map((t) => `'${t}'`).join(",")})`, "ufi,feature_type,feature_subtype,name_label,geom");
const roads = (await wfs("roads.json", "tr_road", "class_code IN (0,1,2,3,4,5)", "ufi,ezi_road_name_label,class_code,geom")).features;

// Flood share of each suburb (riverine overlays), by area.
const flood = Object.fromEntries(CODES.map((sal) => {
  const sub = subOf(sal), sbox = turf.bbox(sub);
  const pieces = riverine.filter(({ box }) => box[0] <= sbox[2] && box[2] >= sbox[0] && box[1] <= sbox[3] && box[3] >= sbox[1]).map(({ f }) => turf.intersect(turf.featureCollection([sub, f]))).filter(Boolean);
  const merged = pieces.length > 1 ? turf.union(turf.featureCollection(pieces)) : pieces[0];
  return [sal, S(merged ? Math.round((turf.area(merged) / turf.area(sub)) * 1000) / 10 : 0, "public", "Vicmap Planning, LSIO + FO area ÷ suburb area", VIC)];
}));
for (const a of areas) a.pctRiverine = flood[a.sal];

// Facilities: public locations; planning inputs are placeholders, with backup facts unknown for a first regional review.
const ill = (v) => S(v, "illustrative", "CoolGrid demo placeholder: replace with council asset and emergency-management records", TODAY);
const unk = () => S(null, "unknown", "Not yet provided by the facility owner", TODAY);
const PLACES = { "reg-shepparton-library": [150, 80, 2], "reg-mooroopna-hall": [40, 40, 1], "reg-kialla-hall": [40, 30, 1] };
const facilities = R.chosen.map(([id, label]) => {
  const hit = foi.features.find((f) => f.properties.name_label === label);
  if (!hit) throw new Error(`facility not found in Vicmap: ${label}`);
  const c = (hit.geometry.coordinates[0] ?? hit.geometry.coordinates).map((v) => Math.round(v * 1e5) / 1e5);
  const sub = suburbs.features.find((s) => turf.booleanPointInPolygon(c, s));
  const [cool, floodPlaces, crews] = PLACES[id];
  return {
    id, name: label, type: hit.properties.feature_subtype, sal: sub?.properties.sal_code_2021 ?? null,
    location: S(c, "public", "Vicmap Features of Interest (foi_point)", VIC),
    floodOverlay: S(inRiverine(c) ? "riverine" : "none", "public", "Vicmap Planning: facility point inside LSIO/FO", VIC),
    services: { coolingRespite: { places: ill(cool), hours: ill("10:00-18:00") }, floodRelief: { places: ill(floodPlaces) } },
    crews: ill(crews),
    backup: { batteryKWh: unk(), reservePct: unk(), inverterKW: unk(), coolingKW: unk(), surgeKW: unk(), baseKW: unk(), coolingOnBackup: unk() },
  };
});

// Crossings: named roads passing through riverine overlays. On a floodplain one road crosses many overlay pieces, so the
// regional build keeps one dependency per road ("this road is closed in the flood"), ID = road name.
const crossings = new Map();
for (const r of roads) {
  const road = r.properties.ezi_road_name_label;
  if (!road || /^unnamed/i.test(road)) continue;
  const rbox = turf.bbox(r);
  for (const { f, box } of riverine) {
    if (rbox[0] > box[2] || rbox[2] < box[0] || rbox[1] > box[3] || rbox[3] < box[1] || !turf.booleanIntersects(r, f)) continue;
    const id = `x-${road.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    if (!crossings.has(id)) {
      const at = (turf.lineIntersect(r, turf.polygonToLine(f)).features[0]?.geometry.coordinates ?? turf.pointOnFeature(r).geometry.coordinates).map((v) => Math.round(v * 1e5) / 1e5);
      crossings.set(id, { id, road, overlay: f.properties.zone_code, lga: f.properties.lga, roadUfis: [], location: S(at, "public", "Vicmap Transport (tr_road) × Vicmap Planning riverine overlays", VIC) });
    }
    crossings.get(id).roadUfis.push(r.properties.ufi);
  }
}

// Routing on the full road network (same method as P2-D6).
const k = (c) => `${c[0].toFixed(6)},${c[1].toFixed(6)}`;
const nodes = new Map();
const node = (c, cls) => { const id = k(c); if (!nodes.has(id)) nodes.set(id, { c, edges: [], freewayOnly: true }); if (cls !== 0) nodes.get(id).freewayOnly = false; return id; };
for (const r of roads) for (const line of r.geometry.type === "MultiLineString" ? r.geometry.coordinates : [r.geometry.coordinates])
  for (let i = 1; i < line.length; i++) {
    const a = node(line[i - 1], r.properties.class_code), b = node(line[i], r.properties.class_code), km = turf.distance(line[i - 1], line[i]);
    nodes.get(a).edges.push({ to: b, km, ufi: r.properties.ufi }); nodes.get(b).edges.push({ to: a, km, ufi: r.properties.ufi });
  }
const keys = [...nodes.keys()].filter((x) => !nodes.get(x).freewayOnly);
const snap = (c) => keys.reduce((best, x) => { const d = turf.distance(c, nodes.get(x).c); return d < best.km ? { key: x, km: d } : best; }, { key: null, km: Infinity });
function dijkstra(src) {
  const dist = new Map([[src, 0]]), prev = new Map(), heap = [[0, src]];
  // Binary heap of [distance, node].
  const push = (x) => { heap.push(x); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  while (heap.length) {
    const [d, u] = pop();
    if (d > dist.get(u)) continue;
    for (const e of nodes.get(u).edges) { const nd = d + e.km; if (nd < (dist.get(e.to) ?? Infinity)) { dist.set(e.to, nd); prev.set(e.to, { from: u, ufi: e.ufi }); push([nd, e.to]); } }
  }
  return { dist, prev };
}
const byUfi = new Map();
for (const c of crossings.values()) for (const u of c.roadUfis) (byUfi.get(u) ?? byUfi.set(u, new Set()).get(u)).add(c.id);
const centreOf = (sub) => { const c = turf.centroid(sub).geometry.coordinates; return turf.booleanPointInPolygon(c, sub) ? c : turf.pointOnFeature(sub).geometry.coordinates; };
const ROUTE_SRC = "Shortest route on the Vicmap road network (freeway to local street), suburb centre and facility snapped to the nearest non-freeway road point; not a travel-time or accessibility model";
const L = (value) => ({ value, status: "illustrative", source: ROUTE_SRC, date: TODAY });
const links = [];
for (const sal of CODES) {
  const o = snap(centreOf(subOf(sal)));
  const { dist, prev } = dijkstra(o.key);
  for (const f of facilities) {
    const dsnap = snap(f.location.value);
    if (!dist.has(dsnap.key)) { links.push({ from: sal, to: f.id, distanceKm: L(null), dependsOn: L(null) }); continue; }
    const deps = new Set();
    for (let x = dsnap.key; x !== o.key; x = prev.get(x).from) for (const id of byUfi.get(prev.get(x).ufi) ?? []) deps.add(id);
    links.push({ from: sal, to: f.id, distanceKm: L(Math.round((dist.get(dsnap.key) + o.km + dsnap.km) * 100) / 100), dependsOn: L([...deps].sort()) });
  }
}
const used = new Set(links.flatMap((l) => l.dependsOn.value ?? []));
const crossingList = [...crossings.values()].filter((c) => used.has(c.id)).sort((a, b) => a.id.localeCompare(b.id));

writeFileSync(`lib/data/regions/${key}.geo.json`, JSON.stringify(suburbs));
writeFileSync(`lib/data/regions/${key}.json`, JSON.stringify({ generated: TODAY, region: R.name, areas, facilities, crossings: crossingList, links }, null, 2) + "\n");
console.log(`region ${R.name}: ${areas.length} areas, ${facilities.length} facilities, ${crossingList.length} crossings used by ${links.length} routes`);
for (const l of links) console.log(" ", areas.find((a) => a.sal === l.from).name.padEnd(16), "->", l.to.padEnd(24), `${l.distanceKm.value} km`, (l.dependsOn.value ?? []).map((x) => x.replace(/^x-/, "").replace(/-\d+$/, "")).join(", "));
