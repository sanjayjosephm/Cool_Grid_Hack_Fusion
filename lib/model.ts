import { FLOOD, HUB_SPECS, type Neighbourhood } from "./data";
import { checkHub, PROPOSED_HUB, type HubResult } from "./hub";

// Transparent rules-based score. Weights from the CoolGrid design.
export const WEIGHTS = { heat: 0.3, vulnerability: 0.25, building: 0.2, grid: 0.15, resilience: 0.1 };
export type Weights = typeof WEIGHTS;
export type Factors = { heat: number; vulnerability: number; building: number; grid: number; resilience: number };

export type Measures = { insulation: boolean; shading: boolean; solar: boolean; battery: boolean; hub: boolean; network: boolean; floodproof: boolean };
export const NO_MEASURES: Measures = { insulation: false, shading: false, solar: false, battery: false, hub: false, network: false, floodproof: false };

export const MEASURE_INFO: Record<keyof Measures, { label: string; costPerHome: number; note: string }> = {
  insulation: { label: "Add insulation and draught sealing", costPerHome: 3500, note: "Cuts building inefficiency by 25%" },
  shading: { label: "Add external shading / cool roofs", costPerHome: 1800, note: "Cuts heat exposure by 12%" },
  solar: { label: "Add rooftop solar", costPerHome: 6500, note: "Cuts daytime grid stress by 12%" },
  battery: { label: "Add battery backup", costPerHome: 9000, note: "Cuts grid stress by 15%, adds resilience" },
  hub: { label: "Add backup-powered cooling hub", costPerHome: 0, note: "Adds resilience; sized to pass the 6-hour backup check" },
  network: { label: "Upgrade local network capacity", costPerHome: 1200, note: "Cuts grid stress by 30%" },
  floodproof: { label: "Mount equipment above flood level", costPerHome: 1500, note: "Protects heat pumps, batteries and switchboards in flood-prone homes" },
};

// Share of homes assumed to take up the electrification package and each home-level measure in this prototype.
export const UPTAKE = 0.4;
const HUB_COST = 1_200_000;

const clamp = (x: number) => Math.max(0, Math.min(100, x));

// Unrounded score. Dividing by the sum of the positive weights lets scores use the full 0-100 range
// (resilience only subtracts); with the default weights that divisor is 0.9.
export function rawScore(f: Factors, w: Weights = WEIGHTS) {
  const raw = w.heat * f.heat + w.vulnerability * f.vulnerability + w.building * f.building + w.grid * f.grid - w.resilience * f.resilience;
  return clamp(raw / (w.heat + w.vulnerability + w.building + w.grid));
}
export const priorityScore = (f: Factors, w: Weights = WEIGHTS) => Math.round(rawScore(f, w));

export type Category = { key: "ready" | "support" | "high" | "urgent"; label: string; meaning: string; color: string };
export function categorise(score: number): Category {
  if (score < 35) return { key: "ready", label: "Electrification-ready", meaning: "Proceed with standard electrification support", color: "#3E8E6A" };
  if (score < 60) return { key: "support", label: "Support required", meaning: "Add selected building or energy upgrades", color: "#E0A030" };
  if (score < 80) return { key: "high", label: "High priority", meaning: "Deploy a resilience package before scaling electrification", color: "#C8402F" };
  return { key: "urgent", label: "Urgent resilience action", meaning: "Prioritise public investment and emergency cooling access", color: "#8E1F1A" };
}

export type FloodLevel = { key: "low" | "moderate" | "high"; label: string; color: string };
export function floodLevel(n: Neighbourhood): FloodLevel {
  const f = FLOOD[n.id] ?? 0;
  if (f >= 50) return { key: "high", label: "High flood exposure", color: "#1F5A9A" };
  if (f >= 30) return { key: "moderate", label: "Moderate flood exposure", color: "#6FA3D6" };
  return { key: "low", label: "Low flood exposure", color: "#CFE1F2" };
}

// Rule-based starting package from the area's main drivers. Planners can change it; it is a suggestion, not an optimum.
export function recommendedPackage(n: Neighbourhood): Measures {
  const hub = HUB_SPECS[n.id] && n.hasHub ? checkHub(HUB_SPECS[n.id]) : null;
  return {
    insulation: n.building >= 60,
    shading: n.heat >= 70,
    solar: n.grid >= 60,
    battery: n.grid >= 65 && n.resilience < 30,
    network: n.grid >= 68,
    hub: n.vulnerability >= 60 && hub?.status !== "pass",
    floodproof: floodLevel(n).key === "high",
  };
}

// ILLUSTRATIVE end-use split of final energy in a gas-heated Melbourne home, and heat-pump efficiency.
export const END_USE = { heating: 0.45, hotWater: 0.2, cooling: 0.05, other: 0.3 };
export const HEAT_PUMP_COP = 3;
export const BUILDING_TARGET = 25; // COP31: cut building-sector energy use 25% by 2035

// Final-energy saving (%) for one upgraded home versus the same home on gas.
// Heat pumps deliver ~3 units of heat per unit of electricity; insulation cuts heating/cooling more in leakier
// buildings; shading cuts cooling. Solar and batteries change supply, not use, so they are excluded.
export function energySaving(n: Neighbourhood, m: Measures) {
  let heating = END_USE.heating / HEAT_PUMP_COP;
  let cooling = END_USE.cooling;
  const hotWater = END_USE.hotWater / HEAT_PUMP_COP;
  if (m.insulation) { const f = 1 - 0.35 * (n.building / 100); heating *= f; cooling *= f; }
  if (m.shading) cooling *= 0.7;
  return Math.round((1 - (heating + hotWater + cooling + END_USE.other)) * 100);
}

// Which hub the area relies on, and whether it passes the backup check. A proposed hub replaces an existing one.
export function hubFor(n: Neighbourhood, m: Measures): HubResult | null {
  if (m.hub) return checkHub(PROPOSED_HUB);
  const spec = HUB_SPECS[n.id];
  return n.hasHub && spec ? checkHub(spec) : null;
}

export function applyMeasures(n: Neighbourhood, m: Measures) {
  let { heat, building, grid, resilience } = n;
  if (m.insulation) building *= 0.75;
  if (m.shading) heat *= 0.88;
  if (m.solar) grid *= 0.88;
  if (m.battery) { grid *= 0.85; resilience += 15; }
  if (m.network) grid *= 0.7;
  if (m.hub) resilience += 20;
  resilience = clamp(resilience);
  const adj = { heat: clamp(heat), vulnerability: n.vulnerability, building: clamp(building), grid: clamp(grid), resilience };
  const score = priorityScore(adj);

  // Only a hub that passes the backup check counts as protecting anyone.
  const hub = hubFor(n, m);
  const covered = hub?.status === "pass" ? Math.round(n.vulnerableResidents * (m.hub ? 0.8 : 0.35)) : 0;
  const saving = energySaving(n, m);
  const homeCost = (["insulation", "shading", "solar", "battery", "network", "floodproof"] as const)
    .reduce((s, k) => s + (m[k] ? MEASURE_INFO[k].costPerHome * n.homes * UPTAKE : 0), 0);
  const cost = homeCost + (m.hub ? HUB_COST : 0);

  // Floods do not change the heat score; they change how the package must be installed.
  const level = floodLevel(n);
  const flood = { level, equipmentAtRisk: level.key === "high" && !m.floodproof, hubExposed: level.key === "high" && hub !== null };

  return { score, category: categorise(score), peakPressure: Math.round(adj.grid), saving, areaSaving: Math.round(saving * UPTAKE), hub, covered, cost, flood };
}
