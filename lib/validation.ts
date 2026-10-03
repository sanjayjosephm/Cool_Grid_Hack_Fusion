import { NEIGHBOURHOODS } from "./data";
import { checkHub, type HubSpec, type HubStatus } from "./hub";
import { categorise, priorityScore, rawScore, WEIGHTS, type Weights } from "./model";

// ---------- Weight sensitivity: does the ranking survive if our weights are wrong by ±20%? ----------

const ranking = (w: Weights) => [...NEIGHBOURHOODS].sort((a, b) => rawScore(b, w) - rawScore(a, w)).map((n) => n.id);

export const WEIGHT_LABELS: Record<keyof Weights, string> = {
  heat: "Heat exposure", vulnerability: "Social vulnerability", building: "Building inefficiency", grid: "Grid stress", resilience: "Existing resilience",
};

export function sensitivity() {
  const base = ranking(WEIGHTS);
  const baseTop3 = base.slice(0, 3);
  const baseCat = new Map(NEIGHBOURHOODS.map((n) => [n.id, categorise(priorityScore(n)).key]));
  const n = base.length;

  const rows = (Object.keys(WEIGHTS) as (keyof Weights)[]).flatMap((k) => [0.8, 1.2].map((f) => {
    const w = { ...WEIGHTS, [k]: WEIGHTS[k] * f };
    const r = ranking(w);
    const shifts = base.map((id, i) => Math.abs(r.indexOf(id) - i));
    const rho = 1 - (6 * shifts.reduce((s, d) => s + d * d, 0)) / (n * (n * n - 1)); // Spearman rank correlation
    return {
      weight: k, change: f > 1 ? "+20%" : "−20%",
      rho,
      top3Same: r.slice(0, 3).every((id) => baseTop3.includes(id)),
      maxShift: Math.max(...shifts),
      categoryChanges: NEIGHBOURHOODS.filter((x) => categorise(priorityScore(x, w)).key !== baseCat.get(x.id)).map((x) => x.name),
    };
  }));
  return { base, rows };
}

// ---------- Hub backup check: app output versus hand calculation ----------

const spec = (s: Partial<HubSpec>): HubSpec => ({ site: "", batteryKWh: 60, reservePct: 20, inverterKW: 15, coolingKW: 5, surgeKW: 12, baseKW: 2, coolingOnBackup: true, ...s });

// Expected values worked by hand: usable = battery × (1 − reserve); needed = (cooling + base) × 6 h ÷ 0.9;
// runtime = usable × 0.9 ÷ (cooling + base); start-up power = surge + base must not exceed the inverter.
export const HUB_CASES: { name: string; why: string; spec: HubSpec; expected: HubStatus; runtime?: number }[] = [
  { name: "Correctly sized hub", why: "60 kWh × 0.8 = 48 kWh usable; 7 kW × 6 h ÷ 0.9 = 46.7 kWh needed", spec: spec({}), expected: "pass", runtime: 6.17 },
  { name: "Exactly enough energy", why: "37.5 × 0.8 = 30 kWh usable; 4.5 kW × 6 ÷ 0.9 = 30 kWh needed (boundary)", spec: spec({ batteryKWh: 37.5, inverterKW: 10, coolingKW: 3.5, surgeKW: 8, baseKW: 1 }), expected: "pass", runtime: 6.0 },
  { name: "Battery too small", why: "40 × 0.8 = 32 kWh usable; 5.5 kW × 6 ÷ 0.9 = 36.7 kWh needed", spec: spec({ batteryKWh: 40, inverterKW: 10, coolingKW: 4, surgeKW: 8, baseKW: 1.5 }), expected: "fail-energy", runtime: 5.24 },
  { name: "Inverter too small", why: "Start-up 8 + 1 = 9 kW > 5 kW inverter", spec: spec({ batteryKWh: 30, reservePct: 10, inverterKW: 5, coolingKW: 3.5, surgeKW: 8, baseKW: 1 }), expected: "fail-power" },
  { name: "Runs fine, cannot start", why: "Running 4.5 kW fits, but start-up 9.5 + 1 = 10.5 kW > 10 kW", spec: spec({ inverterKW: 10, coolingKW: 3.5, surgeKW: 9.5, baseKW: 1 }), expected: "fail-power" },
  { name: "Cooling not on backup circuit", why: "Huge battery is irrelevant if the air-conditioner is not wired to it", spec: spec({ batteryKWh: 200, inverterKW: 30, coolingOnBackup: false }), expected: "fail-circuit" },
  { name: "Wiring unknown", why: "Everything else passes, but an unverified hub must not pass", spec: spec({ batteryKWh: 200, inverterKW: 30, coolingOnBackup: null }), expected: "assessment" },
  { name: "Battery size unknown", why: "Missing input gives assessment, never a guess", spec: spec({ batteryKWh: null }), expected: "assessment" },
];

export function hubTests() {
  return HUB_CASES.map((c) => {
    const got = checkHub(c.spec);
    const runtimeOk = c.runtime === undefined || (got.runtimeHours !== undefined && Math.abs(got.runtimeHours - c.runtime) < 0.01);
    return { ...c, got, ok: got.status === c.expected && runtimeOk };
  });
}
