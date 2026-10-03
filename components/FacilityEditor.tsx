"use client";
// P2-E9: planners enter facility facts; edited values are labelled "declared" and the review re-runs immediately.
import { DEMO_FACILITIES, facilityInputs, facilityName, type FacilityOverride, type Overrides } from "@/lib/demo-review";
import type { Sourced } from "@/lib/sourced";

type NumField = "coolingPlaces" | "floodPlaces" | "crews" | "batteryKWh" | "inverterKW";
const NUM_FIELDS: [NumField, string][] = [["coolingPlaces", "Cooling places"], ["floodPlaces", "Flood places"], ["crews", "Crews"], ["batteryKWh", "Battery kWh"], ["inverterKW", "Inverter kW"]];
const cell = "border-b border-line px-1.5 py-1";
const input = "w-20 rounded border px-1.5 py-1 text-sm";
const tone = (s: Sourced<unknown>) => (s.status === "declared" ? "border-blue bg-blue/5" : s.status === "unknown" ? "border-[#B07A10] bg-[#B07A10]/5" : "border-line");

export default function FacilityEditor({ overrides, onChange }: { overrides: Overrides; onChange: (o: Overrides) => void }) {
  const set = (id: string, patch: FacilityOverride) => onChange({ ...overrides, [id]: { ...overrides[id], ...patch } });
  const num = (v: string) => (v.trim() === "" ? null : Number(v) >= 0 ? Number(v) : null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted">
            <th className={cell}>Facility</th>{NUM_FIELDS.map(([, l]) => <th key={l} className={cell}>{l}</th>)}<th className={cell}>Hours</th><th className={cell}>Cooling on backup</th>
          </tr>
        </thead>
        <tbody>
          {DEMO_FACILITIES.map((id) => {
            const v = facilityInputs(id, overrides);
            const vals: Record<NumField, Sourced<number>> = { coolingPlaces: v.coolingPlaces, floodPlaces: v.floodPlaces, crews: v.crews, batteryKWh: v.backup.batteryKWh, inverterKW: v.backup.inverterKW };
            return (
              <tr key={id}>
                <td className={`${cell} font-medium`}>{facilityName(id)}</td>
                {NUM_FIELDS.map(([k, l]) => (
                  <td key={k} className={cell}>
                    <input aria-label={`${l}, ${facilityName(id)}`} className={`${input} ${tone(vals[k])}`} type="number" min="0" value={vals[k].value ?? ""} placeholder="unknown"
                      onChange={(e) => set(id, { [k]: num(e.target.value) })} />
                  </td>
                ))}
                <td className={cell}>
                  {/* Saved when the box loses focus, so partly typed times are not rejected mid-typing. */}
                  <input key={`${id}-${v.hours.value}`} aria-label={`Opening hours, ${facilityName(id)}`} className={`w-28 rounded border px-1.5 py-1 text-sm ${tone(v.hours)}`} defaultValue={v.hours.value ?? ""} placeholder="09:00-17:00"
                    onBlur={(e) => { const t = e.target.value.trim(); if (t === "") set(id, { hours: null }); else if (/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(t)) set(id, { hours: t }); else e.target.value = v.hours.value ?? ""; }} />
                </td>
                <td className={cell}>
                  <select aria-label={`Cooling on backup, ${facilityName(id)}`} className={`rounded border px-1.5 py-1 text-sm ${tone(v.backup.coolingOnBackup)}`}
                    value={v.backup.coolingOnBackup.value === null ? "unknown" : String(v.backup.coolingOnBackup.value)}
                    onChange={(e) => set(id, { coolingOnBackup: e.target.value === "unknown" ? null : e.target.value === "true" })}>
                    <option value="true">Yes</option><option value="false">No</option><option value="unknown">Unknown</option>
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted">
        <span className="rounded border border-blue px-1">blue</span> entered by you (declared) · <span className="rounded border border-[#B07A10] px-1">amber</span> unknown · grey: illustrative placeholder.
        Clear a box to mark it unknown. Hours use 24-hour HH:MM-HH:MM.
      </p>
    </div>
  );
}
