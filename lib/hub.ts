// Backup-power check for a cooling hub: can the backed-up cooling run through a defined outage?
// Conservative by design: any unknown input gives "assessment", never a pass. No solar recharge during the outage is assumed.

export const OUTAGE_HOURS = 6;
export const INVERTER_EFFICIENCY = 0.9;

export type HubSpec = {
  site: string;
  batteryKWh: number | null; // nameplate battery capacity
  reservePct: number | null; // charge kept back and never used
  inverterKW: number | null; // maximum power the backup system can supply
  coolingKW: number | null; // air-conditioning running load
  surgeKW: number | null; // compressor start-up load
  baseKW: number | null; // lights, fridge, comms
  coolingOnBackup: boolean | null; // is the cooling circuit actually on the backed-up board?
};

export type HubStatus = "pass" | "fail-energy" | "fail-power" | "fail-circuit" | "assessment";
export type HubResult = { status: HubStatus; label: string; detail: string; runtimeHours?: number; neededKWh?: number; availableKWh?: number };

const FIELDS = { batteryKWh: "battery size", reservePct: "battery reserve", inverterKW: "inverter power", coolingKW: "cooling load", surgeKW: "start-up load", baseKW: "other loads", coolingOnBackup: "cooling circuit wiring" } as const;

export function checkHub(h: HubSpec, hours = OUTAGE_HOURS): HubResult {
  const missing = (Object.keys(FIELDS) as (keyof typeof FIELDS)[]).filter((k) => h[k] === null).map((k) => FIELDS[k]);
  if (missing.length) return { status: "assessment", label: "Needs assessment", detail: `Unknown: ${missing.join(", ")}. An unverified hub is never counted as working.` };
  const s = h as { [K in keyof HubSpec]: NonNullable<HubSpec[K]> };

  if (!s.coolingOnBackup) return { status: "fail-circuit", label: "Fails: cooling not backed up", detail: "The air-conditioning circuit is not on the backed-up board, so it stops when the grid fails." };

  const peakKW = s.surgeKW + s.baseKW;
  const runKW = s.coolingKW + s.baseKW;
  if (peakKW > s.inverterKW || runKW > s.inverterKW)
    return { status: "fail-power", label: "Fails: inverter too small", detail: `Start-up needs ${peakKW.toFixed(1)} kW but the inverter supplies ${s.inverterKW} kW, so the cooling cannot start.` };

  const availableKWh = s.batteryKWh * (1 - s.reservePct / 100);
  const neededKWh = (runKW * hours) / INVERTER_EFFICIENCY;
  const runtimeHours = (availableKWh * INVERTER_EFFICIENCY) / runKW;
  const r = { runtimeHours, neededKWh, availableKWh };
  if (neededKWh > availableKWh + 1e-9)
    return { status: "fail-energy", label: `Fails: runs out after ${runtimeHours.toFixed(1)} h`, detail: `Needs ${neededKWh.toFixed(1)} kWh for ${hours} h but only ${availableKWh.toFixed(1)} kWh is usable.`, ...r };
  return { status: "pass", label: `Passes: lasts ${runtimeHours.toFixed(1)} h`, detail: `Needs ${neededKWh.toFixed(1)} kWh for ${hours} h; ${availableKWh.toFixed(1)} kWh is usable.`, ...r };
}

// A new hub proposed through CoolGrid is specified to pass the check (sized for the outage, cooling on the backed-up board).
export const PROPOSED_HUB: HubSpec = { site: "Proposed hub", batteryKWh: 80, reservePct: 20, inverterKW: 15, coolingKW: 5, surgeKW: 12, baseKW: 2, coolingOnBackup: true };
