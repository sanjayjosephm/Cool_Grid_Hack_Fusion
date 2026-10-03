// Planner edits travel in the page address (?o=...) so the review brief shows the same inputs as the Continuity Lab.
// Parsing is strict: unknown facilities, fields or value types are dropped, never guessed.
import { DEMO_FACILITIES, type FacilityOverride, type Overrides } from "./demo-review";

const NUMBER_FIELDS = ["coolingPlaces", "floodPlaces", "crews", "batteryKWh", "inverterKW"] as const;
const isCount = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100_000;

export function encodeOverrides(o: Overrides): string | null {
  const clean = Object.fromEntries(Object.entries(o).filter(([, v]) => v && Object.keys(v).length));
  return Object.keys(clean).length ? JSON.stringify(clean) : null;
}

export function parseOverrides(param: string | string[] | undefined): Overrides {
  const raw = Array.isArray(param) ? param[0] : param;
  if (!raw) return {};
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return {}; }
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const out: Overrides = {};
  for (const [id, fields] of Object.entries(data as Record<string, unknown>)) {
    if (!DEMO_FACILITIES.includes(id) || !fields || typeof fields !== "object") continue;
    const f = fields as Record<string, unknown>;
    const o: FacilityOverride = {};
    for (const k of NUMBER_FIELDS) if (k in f && (f[k] === null || isCount(f[k]))) o[k] = f[k] as number | null;
    if ("hours" in f && (f.hours === null || (typeof f.hours === "string" && /^\d{2}:\d{2}-\d{2}:\d{2}$/.test(f.hours)))) o.hours = f.hours as string | null;
    if ("coolingOnBackup" in f && (f.coolingOnBackup === null || typeof f.coolingOnBackup === "boolean")) o.coolingOnBackup = f.coolingOnBackup as boolean | null;
    if (Object.keys(o).length) out[id] = o;
  }
  return out;
}
