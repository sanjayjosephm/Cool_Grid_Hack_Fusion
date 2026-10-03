// ILLUSTRATIVE DATA. Scores are 0-100 placeholders for demonstration, not measured values.
// Replace with real layers (urban heat, Census/SEIFA, building age, solar installs, network data).
// Suburb boundaries are real (ABS, see SAL_CODE below); the scores attached to them are not.
import type { HubSpec } from "./hub";
import suburbs from "./suburbs.geo.json";

export type Neighbourhood = {
  id: string; name: string; council: string; lat: number; lng: number;
  population: number; homes: number; vulnerableResidents: number;
  heat: number; vulnerability: number; building: number; grid: number; resilience: number;
  hasHub: boolean; // existing backup-powered cooling space nearby
};

export const NEIGHBOURHOODS: Neighbourhood[] = [
  { id: "sunshine-west", name: "Sunshine West", council: "Brimbank", lat: -37.79, lng: 144.81, population: 12400, homes: 4600, vulnerableResidents: 2900, heat: 88, vulnerability: 78, building: 82, grid: 70, resilience: 18, hasHub: false },
  { id: "sunshine", name: "Sunshine", council: "Brimbank", lat: -37.788, lng: 144.832, population: 11800, homes: 4300, vulnerableResidents: 2600, heat: 84, vulnerability: 74, building: 76, grid: 66, resilience: 28, hasHub: true },
  { id: "albion", name: "Albion", council: "Brimbank", lat: -37.776, lng: 144.811, population: 6200, homes: 2300, vulnerableResidents: 1300, heat: 80, vulnerability: 70, building: 74, grid: 60, resilience: 20, hasHub: false },
  { id: "deer-park", name: "Deer Park", council: "Brimbank", lat: -37.77, lng: 144.775, population: 14100, homes: 5200, vulnerableResidents: 2100, heat: 70, vulnerability: 58, building: 62, grid: 55, resilience: 35, hasHub: false },
  { id: "st-albans", name: "St Albans", council: "Brimbank", lat: -37.74, lng: 144.8, population: 16500, homes: 5800, vulnerableResidents: 3300, heat: 76, vulnerability: 72, building: 70, grid: 64, resilience: 25, hasHub: true },
  { id: "braybrook", name: "Braybrook", council: "Maribyrnong", lat: -37.78, lng: 144.855, population: 8800, homes: 3300, vulnerableResidents: 2200, heat: 78, vulnerability: 80, building: 78, grid: 62, resilience: 22, hasHub: false },
  { id: "maidstone", name: "Maidstone", council: "Maribyrnong", lat: -37.777, lng: 144.87, population: 9300, homes: 3500, vulnerableResidents: 1700, heat: 66, vulnerability: 60, building: 66, grid: 50, resilience: 38, hasHub: true },
  { id: "footscray", name: "Footscray", council: "Maribyrnong", lat: -37.8, lng: 144.9, population: 17100, homes: 7000, vulnerableResidents: 2900, heat: 60, vulnerability: 62, building: 58, grid: 52, resilience: 45, hasHub: true },
  { id: "brunswick-west", name: "Brunswick West", council: "Merri-bek", lat: -37.76, lng: 144.94, population: 9700, homes: 4300, vulnerableResidents: 1100, heat: 40, vulnerability: 30, building: 48, grid: 36, resilience: 62, hasHub: true },
  { id: "broadmeadows", name: "Broadmeadows", council: "Hume", lat: -37.68, lng: 144.92, population: 13900, homes: 4600, vulnerableResidents: 3100, heat: 72, vulnerability: 84, building: 72, grid: 68, resilience: 24, hasHub: false },
];

// ILLUSTRATIVE backup specs for the existing hubs (areas with hasHub). Real values need a site visit or installer records.
export const HUB_SPECS: Record<string, HubSpec> = {
  sunshine: { site: "Sunshine community centre", batteryKWh: 40, reservePct: 20, inverterKW: 10, coolingKW: 4, surgeKW: 8, baseKW: 1.5, coolingOnBackup: true },
  "st-albans": { site: "St Albans library", batteryKWh: 60, reservePct: 20, inverterKW: 15, coolingKW: 5, surgeKW: 12, baseKW: 2, coolingOnBackup: true },
  maidstone: { site: "Maidstone neighbourhood house", batteryKWh: 30, reservePct: 10, inverterKW: 5, coolingKW: 3.5, surgeKW: 8, baseKW: 1, coolingOnBackup: true },
  footscray: { site: "Footscray town hall annex", batteryKWh: 100, reservePct: 20, inverterKW: 20, coolingKW: 6, surgeKW: 14, baseKW: 2, coolingOnBackup: null },
  "brunswick-west": { site: "Brunswick West community hall", batteryKWh: 50, reservePct: 20, inverterKW: 10, coolingKW: 3, surgeKW: 7, baseKW: 1, coolingOnBackup: true },
};

// ILLUSTRATIVE flood exposure 0-100, roughly reflecting closeness to the Maribyrnong River and local creeks
// (Kororoit, Stony, Moonee Ponds). Replace with the share of homes inside Melbourne Water flood extents or the
// planning-scheme Land Subject to Inundation Overlay.
export const FLOOD: Record<string, number> = {
  maidstone: 72, footscray: 60, braybrook: 48, "sunshine-west": 42, broadmeadows: 40,
  "deer-park": 35, "st-albans": 30, albion: 28, sunshine: 25, "brunswick-west": 18,
};

// ABS Suburbs and Localities (SAL, ASGS 2021) code for each area. Boundaries in suburbs.geo.json were downloaded
// from the ABS ASGS 2021 SAL map service (simplified to ~10 m), © Australian Bureau of Statistics, CC BY 4.0.
const SAL_CODE: Record<string, string> = {
  "sunshine-west": "22397", sunshine: "22395", albion: "20021", "deer-park": "20729", "st-albans": "22330",
  braybrook: "20324", maidstone: "21575", footscray: "20935", "brunswick-west": "20363", broadmeadows: "20346",
};

export function geojson(extra: (n: Neighbourhood) => Record<string, unknown>) {
  return {
    type: "FeatureCollection" as const,
    features: NEIGHBOURHOODS.map((n) => ({
      type: "Feature" as const,
      properties: { id: n.id, name: n.name, ...extra(n) },
      geometry: suburbs.features.find((f) => f.properties.sal_code_2021 === SAL_CODE[n.id])!.geometry as { type: "Polygon"; coordinates: number[][][] },
    })),
  };
}
