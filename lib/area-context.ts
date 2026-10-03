// P1-E4 group context, P1-E5 flood rules and P1-E6 area context score, all from labelled public data.
// The score is background context for choosing where to review first, never the planning decision itself.
import heatData from "./data/heat.json";
import { AREAS, FLOOD_AREAS, FACILITIES } from "./planning-data";

// ---------- E6: area context score ----------
export const INDICATORS = [
  { key: "irsdScore", label: "Socio-economic disadvantage (SEIFA IRSD, inverted)", invert: true },
  { key: "pct65Plus", label: "Residents aged 65+" },
  { key: "pctNeedAssistance", label: "Residents needing assistance" },
  { key: "pctNoCar", label: "Households with no car" },
  { key: "pctLivingAlone", label: "People living alone" },
  { key: "pctLowEnglish", label: "Low English proficiency" },
  { key: "pctRiverine", label: "Area in riverine flood overlay" },
  { key: "treesPerHa", label: "Low urban tree cover (heat proxy, inverted)", invert: true },
] as const;
export type IndicatorKey = (typeof INDICATORS)[number]["key"];
export type Weights = Record<IndicatorKey, number>;
export const WEIGHTS: Weights = { irsdScore: 0.25, pct65Plus: 0.2, pctNeedAssistance: 0.15, pctNoCar: 0.1, pctLivingAlone: 0.1, pctLowEnglish: 0.1, pctRiverine: 0.1, treesPerHa: 0.1 };

const raw = (sal: string, key: IndicatorKey): number => {
  const record = key === "pctRiverine" ? FLOOD_AREAS.find((a) => a.sal === sal)!
    : key === "treesPerHa" ? heatData.areas.find((a) => a.sal === sal)!
    : AREAS.find((a) => a.sal === sal)!;
  const v = (record as unknown as Record<string, { value: number | null }>)[key].value;
  if (v === null) throw new Error(`${key} unknown for ${sal}`);
  return v;
};

/** Each indicator is min-max scaled to 0-100 across the study areas (100 = most in need), then weighted. */
export function areaScores(w: Weights = WEIGHTS) {
  const total = Object.values(w).reduce((s, x) => s + x, 0);
  const scaled = Object.fromEntries(INDICATORS.map(({ key, ...i }) => {
    const vals = AREAS.map((a) => raw(a.sal, key));
    const lo = Math.min(...vals), hi = Math.max(...vals);
    return [key, (v: number) => (hi === lo ? 0 : (("invert" in i ? hi - v : v - lo) / (hi - lo)) * 100)];
  })) as Record<IndicatorKey, (v: number) => number>;
  return AREAS.map((a) => {
    const parts = Object.fromEntries(INDICATORS.map(({ key }) => [key, scaled[key](raw(a.sal, key))])) as Record<IndicatorKey, number>;
    const score = INDICATORS.reduce((s, { key }) => s + w[key] * parts[key], 0) / total;
    return { sal: a.sal, name: a.name, score: Math.round(score * 10) / 10, parts };
  }).sort((x, y) => y.score - x.score);
}

/** Changes each weight by ±20% (14 scenarios) and reports how stable the ranking is. */
export function sensitivity() {
  const base = areaScores().map((a) => a.sal);
  const n = base.length;
  const rows = INDICATORS.flatMap(({ key, label }) => [0.8, 1.2].map((f) => {
    const order = areaScores({ ...WEIGHTS, [key]: WEIGHTS[key] * f }).map((a) => a.sal);
    const shifts = base.map((sal, i) => Math.abs(order.indexOf(sal) - i));
    return {
      key, label, change: f > 1 ? "+20%" : "−20%",
      rho: 1 - (6 * shifts.reduce((s, d) => s + d * d, 0)) / (n * (n * n - 1)),
      top3Same: order.slice(0, 3).every((sal) => base.slice(0, 3).includes(sal)),
      maxShift: Math.max(...shifts),
    };
  }));
  return { base, rows };
}

// ---------- E4: who lives in a community with a gap ----------
export const GROUPS = [
  { key: "pct65Plus", label: "aged 65+" },
  { key: "pctNeedAssistance", label: "need assistance" },
  { key: "pctNoCar", label: "households with no car" },
  { key: "pctLivingAlone", label: "live alone" },
  { key: "pctLowEnglish", label: "low English proficiency" },
] as const;
export function groupContext(sal: string) {
  const a = AREAS.find((x) => x.sal === sal)!;
  const lang = (a.topLanguages.value ?? []).map((l) => l.name);
  return {
    name: a.name, population: a.population.value as number, languages: lang,
    groups: GROUPS.map(({ key, label }) => ({ key, label, pct: (a as unknown as Record<string, { value: number }>)[key].value, source: (a as unknown as Record<string, { source: string }>)[key].source })),
  };
}

// ---------- E5: flood rules ----------
export type FloodWarning = { kind: "facility-in-overlay" | "equipment-height"; subject: string; message: string };
type FacilityLike = { id: string; name: string; floodOverlay: { value: string | null } };

export function facilityFloodWarnings(facilities: FacilityLike[] = FACILITIES): FloodWarning[] {
  return facilities.flatMap((f) => {
    if (f.floodOverlay.value === null) return [{ kind: "facility-in-overlay" as const, subject: f.id, message: `${f.name}: flood-overlay status unknown; check the site against the planning scheme.` }];
    if (f.floodOverlay.value === "none") return [];
    return [{ kind: "facility-in-overlay" as const, subject: f.id, message: `${f.name} is inside a ${f.floodOverlay.value} flood overlay: check equipment height, access routes and whether it can serve during a flood.` }];
  });
}

export function equipmentRule(sal: string): FloodWarning | null {
  const f = FLOOD_AREAS.find((a) => a.sal === sal)!;
  const riverine = f.pctRiverine.value as number, storm = f.pctStormwater.value as number;
  if (riverine === 0 && storm === 0) return null;
  return {
    kind: "equipment-height", subject: sal,
    message: `${f.name}: ${riverine}% of the area is in a riverine flood overlay and ${storm}% in a stormwater overlay. Homes there that electrify should have heat pumps, batteries and switchboards mounted above flood level.`,
  };
}
