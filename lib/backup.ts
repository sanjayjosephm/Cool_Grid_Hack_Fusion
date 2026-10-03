import { isKnown, type Sourced } from "./sourced";

// P1-E1 backup check: can a facility's backed-up cooling run through a defined outage?
// Conservative: any unknown input gives "assessment", never a pass. No solar recharge is assumed.
// The result feeds the review engine's `backup` prerequisite for heat-outage scenarios.

export const OUTAGE_HOURS = 6;
export const INVERTER_EFFICIENCY = 0.9;

export type BackupSpec = {
  batteryKWh: Sourced<number>; reservePct: Sourced<number>; inverterKW: Sourced<number>;
  coolingKW: Sourced<number>; surgeKW: Sourced<number>; baseKW: Sourced<number>;
  coolingOnBackup: Sourced<boolean>;
};
export type BackupStatus = "pass" | "fail-circuit" | "fail-power" | "fail-energy" | "assessment";
export type BackupResult = {
  status: BackupStatus; detail: string; missing: (keyof BackupSpec)[];
  runtimeHours?: number; neededKWh?: number; availableKWh?: number;
};

const LABELS: Record<keyof BackupSpec, string> = {
  batteryKWh: "battery size", reservePct: "battery reserve", inverterKW: "inverter power", coolingKW: "cooling load",
  surgeKW: "start-up load", baseKW: "other loads", coolingOnBackup: "cooling circuit wiring",
};

export function checkBackup(spec: BackupSpec, hours = OUTAGE_HOURS): BackupResult {
  // A circuit that is known not to be backed up fails regardless of any other unknowns.
  if (isKnown(spec.coolingOnBackup) && !spec.coolingOnBackup.value)
    return { status: "fail-circuit", missing: [], detail: "The cooling circuit is not on the backed-up board, so cooling stops when the grid fails." };

  const missing = (Object.keys(LABELS) as (keyof BackupSpec)[]).filter((k) => !isKnown(spec[k] as Sourced<unknown>));
  if (missing.length)
    return { status: "assessment", missing, detail: `Needs assessment. Unknown: ${missing.map((k) => LABELS[k]).join(", ")}.` };

  const v = (k: keyof BackupSpec) => spec[k].value as number;
  const peakKW = v("surgeKW") + v("baseKW");
  const runKW = v("coolingKW") + v("baseKW");
  if (peakKW > v("inverterKW") || runKW > v("inverterKW"))
    return { status: "fail-power", missing: [], detail: `Start-up needs ${peakKW.toFixed(1)} kW but the inverter supplies ${v("inverterKW")} kW, so the cooling cannot start.` };

  const availableKWh = v("batteryKWh") * (1 - v("reservePct") / 100);
  const neededKWh = (runKW * hours) / INVERTER_EFFICIENCY;
  const runtimeHours = (availableKWh * INVERTER_EFFICIENCY) / runKW;
  const r = { missing: [], runtimeHours, neededKWh, availableKWh };
  if (neededKWh > availableKWh + 1e-9)
    return { status: "fail-energy", ...r, detail: `Runs out after ${runtimeHours.toFixed(1)} h: needs ${neededKWh.toFixed(1)} kWh for ${hours} h but ${availableKWh.toFixed(1)} kWh is usable.` };
  return { status: "pass", ...r, detail: `Lasts ${runtimeHours.toFixed(1)} h: needs ${neededKWh.toFixed(1)} kWh for ${hours} h and ${availableKWh.toFixed(1)} kWh is usable.` };
}

/** Converts the check into the engine's backup prerequisite. Assessment stays unknown; never upgraded to public. */
export function backupFact(spec: BackupSpec, hours = OUTAGE_HOURS): Sourced<boolean> {
  const r = checkBackup(spec, hours);
  const inputs = Object.values(spec);
  const status = inputs.some((s) => s.status === "illustrative") ? "illustrative" : "declared";
  return {
    value: r.status === "pass" ? true : r.status === "assessment" ? null : false,
    status: r.status === "assessment" ? "unknown" : status,
    source: `CoolGrid backup check (${hours} h outage, ${INVERTER_EFFICIENCY * 100}% inverter efficiency, no solar recharge): ${r.detail}`,
    date: inputs.map((s) => s.date).sort().at(-1) ?? "not supplied",
  };
}
