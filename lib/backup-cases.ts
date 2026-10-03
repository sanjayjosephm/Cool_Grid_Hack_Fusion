// Hand-calculated backup cases shared by tests/backup.test.ts and the validation page.
import type { BackupSpec, BackupStatus } from "./backup";
import type { Sourced } from "./sourced";

export const known = <T>(value: T): Sourced<T> => ({ value, status: "illustrative", source: "test", date: "2026-10-03" });
export const unknown = <T>(): Sourced<T> => ({ value: null, status: "unknown", source: "test", date: "2026-10-03" });
export type Raw = { [K in keyof BackupSpec]: BackupSpec[K]["value"] };
export const spec = (s: Partial<Raw>): BackupSpec => {
  const raw: Raw = { batteryKWh: 60, reservePct: 20, inverterKW: 15, coolingKW: 5, surgeKW: 12, baseKW: 2, coolingOnBackup: true, ...s };
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v === null ? unknown() : known(v)])) as BackupSpec;
};

// Expected values worked by hand: usable = battery × (1 − reserve); needed = (cooling + base) × 6 h ÷ 0.9;
// runtime = usable × 0.9 ÷ (cooling + base); start-up power = surge + base must not exceed the inverter.
export const CASES: { name: string; why: string; s: Partial<Raw>; expected: BackupStatus; runtime?: number }[] = [
  { name: "correctly sized", why: "60 × 0.8 = 48 kWh usable; 7 kW × 6 ÷ 0.9 = 46.7 kWh needed", s: {}, expected: "pass", runtime: 6.17 },
  { name: "exactly enough energy", why: "37.5 × 0.8 = 30 kWh; 4.5 × 6 ÷ 0.9 = 30 kWh", s: { batteryKWh: 37.5, inverterKW: 10, coolingKW: 3.5, surgeKW: 8, baseKW: 1 }, expected: "pass", runtime: 6.0 },
  { name: "battery too small", why: "40 × 0.8 = 32 kWh; 5.5 × 6 ÷ 0.9 = 36.7 kWh", s: { batteryKWh: 40, inverterKW: 10, coolingKW: 4, surgeKW: 8, baseKW: 1.5 }, expected: "fail-energy", runtime: 5.24 },
  { name: "inverter too small", why: "start-up 8 + 1 = 9 kW > 5 kW", s: { batteryKWh: 30, reservePct: 10, inverterKW: 5, coolingKW: 3.5, surgeKW: 8, baseKW: 1 }, expected: "fail-power" },
  { name: "runs fine, cannot start", why: "running 4.5 kW fits; start-up 9.5 + 1 = 10.5 kW > 10 kW", s: { inverterKW: 10, coolingKW: 3.5, surgeKW: 9.5, baseKW: 1 }, expected: "fail-power" },
  { name: "cooling not backed up", why: "a large battery is irrelevant if the air-conditioner is not wired to it", s: { batteryKWh: 200, inverterKW: 30, coolingOnBackup: false }, expected: "fail-circuit" },
  { name: "wiring unknown", why: "everything else passes, but an unverified hub must not pass", s: { batteryKWh: 200, inverterKW: 30, coolingOnBackup: null }, expected: "assessment" },
  { name: "battery size unknown", why: "missing input gives assessment, never a guess", s: { batteryKWh: null }, expected: "assessment" },
  { name: "not backed up and battery unknown", why: "a known circuit failure is reported even when other facts are missing", s: { batteryKWh: null, coolingOnBackup: false }, expected: "fail-circuit" },
];

