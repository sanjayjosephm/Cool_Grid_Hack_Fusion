import type { Neighbourhood } from "./data";

// Transparent rules-based score. Weights from the CoolGrid design.
// Raw max is 0.9 (resilience only subtracts), so we divide by 0.9 to use the full 0-100 range.
export const WEIGHTS = { heat: 0.3, vulnerability: 0.25, building: 0.2, grid: 0.15, resilience: 0.1 };

export type Measures = { insulation: boolean; shading: boolean; solar: boolean; battery: boolean; hub: boolean; network: boolean };
export const NO_MEASURES: Measures = { insulation: false, shading: false, solar: false, battery: false, hub: false, network: false };

export const MEASURE_INFO: Record<keyof Measures, { label: string; costPerHome: number; note: string }> = {
  insulation: { label: "Add insulation and draught sealing", costPerHome: 3500, note: "Cuts building inefficiency by 25%" },
  shading: { label: "Add external shading / cool roofs", costPerHome: 1800, note: "Cuts heat exposure by 12%" },
  solar: { label: "Add rooftop solar", costPerHome: 6500, note: "Cuts daytime grid stress by 12%" },
  battery: { label: "Add battery backup", costPerHome: 9000, note: "Cuts grid stress by 15%, adds resilience" },
  hub: { label: "Add backup-powered cooling hub", costPerHome: 0, note: "Adds resilience, covers vulnerable residents" },
  network: { label: "Upgrade local network capacity", costPerHome: 1200, note: "Cuts grid stress by 30%" },
};

// Share of homes assumed to receive each home-level measure in this prototype.
const UPTAKE = 0.4;
const HUB_COST = 1_200_000;

const clamp = (x: number) => Math.max(0, Math.min(100, x));

export function priorityScore(m: { heat: number; vulnerability: number; building: number; grid: number; resilience: number }) {
  const raw = WEIGHTS.heat * m.heat + WEIGHTS.vulnerability * m.vulnerability + WEIGHTS.building * m.building + WEIGHTS.grid * m.grid - WEIGHTS.resilience * m.resilience;
  return Math.round(clamp(raw / 0.9));
}

export type Category = { key: "ready" | "support" | "high" | "urgent"; label: string; meaning: string; color: string };
export function categorise(score: number): Category {
  if (score < 35) return { key: "ready", label: "Electrification-ready", meaning: "Proceed with standard electrification support", color: "#3E8E6A" };
  if (score < 60) return { key: "support", label: "Support required", meaning: "Add selected building or energy upgrades", color: "#E0A030" };
  if (score < 80) return { key: "high", label: "High priority", meaning: "Deploy a resilience package before scaling electrification", color: "#C8402F" };
  return { key: "urgent", label: "Urgent resilience action", meaning: "Prioritise public investment and emergency cooling access", color: "#8E1F1A" };
}

export function applyMeasures(n: Neighbourhood, m: Measures) {
  let { heat, building, grid, resilience } = n;
  if (m.insulation) building *= 0.75;
  if (m.shading) heat *= 0.88;
  if (m.solar) grid *= 0.88;
  if (m.battery) { grid *= 0.85; resilience += 15; }
  if (m.network) grid *= 0.7;
  const hubActive = n.hasHub || m.hub;
  if (m.hub) resilience += 20;
  resilience = clamp(resilience);
  const adj = { heat: clamp(heat), vulnerability: n.vulnerability, building: clamp(building), grid: clamp(grid), resilience };
  const score = priorityScore(adj);

  const emissions = Math.round(clamp(55 + (m.solar ? 12 : 0) + (m.insulation ? 8 : 0) + (m.battery ? 4 : 0)));
  const covered = hubActive ? Math.round(n.vulnerableResidents * (m.hub ? 0.8 : 0.35)) : 0;
  const homeCost = (["insulation", "shading", "solar", "battery", "network"] as const)
    .reduce((s, k) => s + (m[k] ? MEASURE_INFO[k].costPerHome * n.homes * UPTAKE : 0), 0);
  const cost = homeCost + (m.hub ? HUB_COST : 0);

  return { score, category: categorise(score), heatResilience: Math.round(100 - score), peakPressure: Math.round(adj.grid), emissions, covered, cost };
}
