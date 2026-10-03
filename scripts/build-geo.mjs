// Builds flood exposure (D3), facilities (D4) and flood-exposed crossings (D5) from Vicmap open data.
// Run: npm run data:build. Raw downloads are cached in data/raw (gitignored).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import * as turf from "@turf/turf";

const RAW = "data/raw";
const WFS = "https://opendata.maps.vic.gov.au/geoserver/wfs";
const TODAY = new Date().toISOString().slice(0, 10);
const LICENCE = "CC BY 4.0";
const VICMAP_DATE = `current Vicmap (downloaded ${TODAY})`;

const suburbs = JSON.parse(readFileSync("lib/suburbs.geo.json", "utf8"));
const AREAS = JSON.parse(readFileSync("lib/data/study-areas.json", "utf8"));
const BBOX = turf.bbox(suburbs).map((v) => v.toFixed(4)).join(",");

// Download a WFS layer as GeoJSON, paging past the server's 5000-feature cap.
async function wfs(file, typeName, cql, props) {
  const path = `${RAW}/${file}`;
  if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8"));
  console.log("downloading", typeName);
  const features = [];
  for (let start = 0; ; start += 5000) {
    const q = new URLSearchParams({
      service: "WFS", version: "2.0.0", request: "GetFeature", typeNames: `open-data-platform:${typeName}`,
      outputFormat: "application/json", srsName: "EPSG:4326", count: "5000", startIndex: String(start), sortBy: "ufi",
      propertyName: props, cql_filter: `(${cql}) AND BBOX(geom,${BBOX},'EPSG:4326')`,
    });
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

const S = (value, status, source, extra = {}) => ({ value, status: value === null ? "unknown" : status, source, date: VICMAP_DATE, licence: LICENCE, ...extra });
const overlaps = (a, b) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
const withBox = (fc) => fc.features.map((f) => ({ f, box: turf.bbox(f) }));

const overlays = await wfs("flood_overlays.json", "plan_overlay", "zone_code LIKE 'LSIO%' OR zone_code LIKE 'FO%' OR zone_code LIKE 'SBO%'", "pfi,zone_code,zone_description,lga,geom");
const riverine = withBox({ features: overlays.features.filter((f) => /^(LSIO|FO)/.test(f.properties.zone_code)) });
const stormwater = withBox({ features: overlays.features.filter((f) => /^SBO/.test(f.properties.zone_code)) });
const foi = await wfs("foi_points.json", "foi_point", "feature_subtype IN ('library','community centre','neighbourhood house','senior citizens')", "ufi,feature_subtype,name_label,geom");
const roads = await wfs("main_roads.json", "tr_road", "class_code IN (0,1,2,3)", "ufi,ezi_road_name_label,class_code,geom");

const suburbOf = (sal) => suburbs.features.find((f) => f.properties.sal_code_2021 === sal);
const inAny = (pt, set) => set.some(({ f, box }) => pt[0] >= box[0] && pt[0] <= box[2] && pt[1] >= box[1] && pt[1] <= box[3] && turf.booleanPointInPolygon(pt, f));

// ---------- D3: % of each suburb's area inside flood overlays ----------
function pctCovered(sub, set) {
  const sbox = turf.bbox(sub);
  const pieces = set.filter(({ box }) => overlaps(box, sbox))
    .map(({ f }) => turf.intersect(turf.featureCollection([sub, f]))).filter(Boolean);
  if (!pieces.length) return 0;
  const merged = pieces.length === 1 ? pieces[0] : turf.union(turf.featureCollection(pieces));
  return Math.round((turf.area(merged) / turf.area(sub)) * 1000) / 10;
}
// Independent check: share of a ~40 m point grid inside the suburb that falls inside an overlay.
function pctSampled(sub, set) {
  const grid = turf.pointGrid(turf.bbox(sub), 0.04, { units: "kilometers", mask: sub });
  const hits = grid.features.filter((p) => inAny(p.geometry.coordinates, set)).length;
  return Math.round((hits / grid.features.length) * 1000) / 10;
}

const OVERLAY_SRC = "Vicmap Planning, planning scheme overlays (plan_overlay)";
const flood = AREAS.map(({ sal, name }) => {
  const sub = suburbOf(sal);
  return {
    sal, name,
    pctRiverine: S(pctCovered(sub, riverine), "public", `${OVERLAY_SRC}: LSIO + FO area ÷ suburb area`),
    pctStormwater: S(pctCovered(sub, stormwater), "public", `${OVERLAY_SRC}: SBO area ÷ suburb area`),
    check: { pctRiverineSampled: pctSampled(sub, riverine), pctStormwaterSampled: pctSampled(sub, stormwater) },
  };
});
writeFileSync("lib/data/flood.json", JSON.stringify({ generated: TODAY, areas: flood }, null, 2) + "\n");
console.log("D3 flood exposure (% area: polygon / grid check)");
for (const a of flood) console.log(" ", a.name.padEnd(15), "riverine", a.pctRiverine.value, "/", a.check.pctRiverineSampled, " stormwater", a.pctStormwater.value, "/", a.check.pctStormwaterSampled);

// ---------- D4: facilities (public location + declared planning inputs) ----------
// Chosen planning facilities: one per study suburb where one exists (Albion has none, so it depends on neighbours).
const CHOSEN = [
  ["fac-sunshine-library", "Sunshine Library"], ["fac-st-albans-library", "St Albans Library"], ["fac-deer-park-library", "Deer Park Library"],
  ["fac-footscray-library", "Footscray Library"], ["fac-broadmeadows-library", "Broadmeadows Library"], ["fac-brunswick-west-library", "Brunswick West Library"],
  ["fac-braybrook-cc", "Braybrook Community Centre"], ["fac-maidstone-cc", "Maidstone Community Centre"], ["fac-west-sunshine-cc", "West Sunshine Community Centre"],
];
const declared = JSON.parse(readFileSync("lib/data/facilities-declared.json", "utf8"));
const FOI_SRC = "Vicmap Features of Interest (foi_point)";
const facilities = CHOSEN.map(([id, label]) => {
  const hit = foi.features.find((f) => f.properties.name_label === label);
  if (!hit) throw new Error(`facility not found in Vicmap: ${label}`);
  const coord = hit.geometry.coordinates[0] ?? hit.geometry.coordinates;
  const sub = suburbs.features.find((s) => turf.booleanPointInPolygon(coord, s));
  const zone = inAny(coord, riverine) ? "riverine" : inAny(coord, stormwater) ? "stormwater" : "none";
  return {
    id, name: label, type: hit.properties.feature_subtype, vicmapUfi: hit.properties.ufi,
    sal: sub?.properties.sal_code_2021 ?? null,
    location: S(coord.map((v) => Math.round(v * 1e5) / 1e5), "public", FOI_SRC),
    floodOverlay: S(zone, "public", `${OVERLAY_SRC}: facility point inside LSIO/FO (riverine) or SBO (stormwater)`),
    ...(declared[id] ?? {}),
  };
});
writeFileSync("lib/data/facilities.json", JSON.stringify({ generated: TODAY, facilities }, null, 2) + "\n");
console.log("D4 facilities");
for (const f of facilities) console.log(" ", f.id.padEnd(28), f.sal, f.floodOverlay.value);

// ---------- D5: main-road crossings of riverine flood overlays ----------
// A crossing = a named main road passing through one riverine overlay polygon. ID is stable: road + overlay PFI.
const crossings = new Map();
for (const r of roads.features) {
  const rbox = turf.bbox(r);
  for (const { f, box } of riverine) {
    if (!overlaps(rbox, box) || !turf.booleanIntersects(r, f)) continue;
    const road = r.properties.ezi_road_name_label;
    if (!road || /^unnamed/i.test(road)) continue;
    const id = `x-${road.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${f.properties.pfi}`;
    const pts = turf.lineIntersect(r, turf.polygonToLine(f)).features.map((p) => p.geometry.coordinates);
    const at = pts[0] ?? turf.pointOnFeature(r).geometry.coordinates;
    if (!crossings.has(id)) crossings.set(id, { id, road, overlay: f.properties.zone_code, lga: f.properties.lga, at: at.map((v) => Math.round(v * 1e5) / 1e5), roadUfis: [] });
    crossings.get(id).roadUfis.push(r.properties.ufi);
  }
}
const crossingList = [...crossings.values()].sort((a, b) => a.id.localeCompare(b.id)).map((c) => ({
  ...c, location: S(c.at, "public", `Vicmap Transport (tr_road, class 0-3) × ${OVERLAY_SRC}`),
}));
writeFileSync("lib/data/crossings.json", JSON.stringify({ generated: TODAY, crossings: crossingList }, null, 2) + "\n");
console.log(`D5 ${crossingList.length} flood-exposed main-road crossings`);
for (const c of crossingList) console.log(" ", c.id, c.overlay, c.lga);

// ---------- D5b: which crossings each community's trip to each facility depends on ----------
// Approximation agreed by the team: straight line from the suburb centre to the facility; any crossing within
// BUFFER_KM of that line is a dependency. Labelled illustrative; real road routing is P2.
const BUFFER_KM = 0.5;
const LINK_SRC = "Straight-line approximation, not a routed path: crossings within 0.5 km of the line from suburb centre to facility";
const centreOf = (sub) => {
  const c = turf.centroid(sub).geometry.coordinates;
  return turf.booleanPointInPolygon(c, sub) ? c : turf.pointOnFeature(sub).geometry.coordinates;
};
const centres = AREAS.map(({ sal, name }) => ({ sal, name, centre: centreOf(suburbOf(sal)).map((v) => Math.round(v * 1e5) / 1e5) }));
const L = (value) => ({ value, status: "illustrative", source: LINK_SRC, date: TODAY });
const links = centres.flatMap(({ sal, centre }) => facilities.map((f) => {
  const line = turf.lineString([centre, f.location.value]);
  const dependsOn = crossingList.filter((c) => turf.pointToLineDistance(c.location.value, line, { units: "kilometers" }) <= BUFFER_KM).map((c) => c.id);
  return { from: sal, to: f.id, distanceKm: L(Math.round(turf.length(line) * 100) / 100), dependsOn: L(dependsOn) };
}));
// Straight-line links are kept for comparison; build-p2.mjs writes the routed access-links.json the engine uses.
writeFileSync("lib/data/access-straight.json", JSON.stringify({ generated: TODAY, bufferKm: BUFFER_KM, centres, links }, null, 2) + "\n");
console.log(`D5b ${links.length} community-to-facility links, ${links.filter((l) => l.dependsOn.value.length).length} depend on at least one crossing`);
