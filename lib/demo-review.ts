// Real-data Continuity Lab review: public ABS/Vicmap data plus labelled planning assumptions, run through the
// review engine. Every assumption here is illustrative and says so; nothing is upgraded to public evidence.
import { backupFact, checkBackup, type BackupSpec, type BackupResult } from "./backup";
import { buildReviewPacket, processedCatalogue, reviewPacket, type PlannedFacilityFacts, type PlanningFacts, type ReviewResult } from "./continuity";
import { renderReviewBrief } from "./brief";
import { AREAS, CROSSINGS, FACILITIES, FLOOD_AREAS, ACCESS_LINKS } from "./planning-data";
import type { Arrangement } from "./planner-config";
import type { Sourced } from "./sourced";

const DATE = "2026-10-03";
const ill = <T>(value: T, source: string): Sourced<T> => ({ value, status: "illustrative", source, date: DATE });

/** Study selection within the engine's limits: Albion has no facility of its own and relies on neighbours. */
export const DEMO_COMMUNITIES = ["20021", "22395", "22397", "20324"]; // Albion, Sunshine, Sunshine West, Braybrook
export const CENTRAL = "fac-sunshine-library";
export const LOCAL = ["fac-west-sunshine-cc", "fac-braybrook-cc", "fac-st-albans-library", "fac-deer-park-library"];
export const DEMO_FACILITIES = [CENTRAL, ...LOCAL];

/** Proposed upgrade for the "backup added" arrangement: a planning proposal, not an installed system. */
export const PROPOSED_BACKUP = (base: BackupSpec): BackupSpec => ({
  ...base,
  batteryKWh: ill(80, "Proposed backup upgrade (planning option, not installed)"),
  coolingOnBackup: ill(true, "Proposed backup upgrade (planning option, not installed)"),
});

const area = (sal: string) => AREAS.find((a) => a.sal === sal)!;
const facility = (id: string) => FACILITIES.find((f) => f.id === id)!;
const flood = (sal: string) => FLOOD_AREAS.find((a) => a.sal === sal)!;

// Illustrative demand: a transparent planning assumption from Census, to be replaced by the council's requirement.
export const HEAT_SHARE = 0.05; // places for 5% of residents aged 65+
export const FLOOD_SHARE = 0.25; // places for 25% of residents in the riverine flood-overlay share of the suburb
export function demandFor(sal: string, kind: "heat" | "flood"): Sourced<number> {
  const a = area(sal);
  const pop = a.population.value as number;
  if (kind === "heat") {
    const value = Math.max(1, Math.round(pop * ((a.pct65Plus.value as number) / 100) * HEAT_SHARE));
    return ill(value, `Illustrative requirement: ${HEAT_SHARE * 100}% of residents aged 65+ (ABS Census 2021). Replace with the council's declared requirement.`);
  }
  const value = Math.max(1, Math.round(pop * ((flood(sal).pctRiverine.value as number) / 100) * FLOOD_SHARE));
  return ill(value, `Illustrative requirement: ${FLOOD_SHARE * 100}% of residents in the riverine flood-overlay share of the suburb (ABS Census × Vicmap). Replace with the council's declared requirement.`);
}

export type BackupRow = { facilityId: string; name: string; existing: BackupResult; proposed?: BackupResult };
export function backupRows(overrides: Overrides = {}): BackupRow[] {
  return DEMO_FACILITIES.map((id) => {
    const spec = facilityInputs(id, overrides).backup;
    const proposed = id === CENTRAL && !overrides[id] ? checkBackup(PROPOSED_BACKUP(spec)) : undefined;
    return { facilityId: id, name: facility(id).name, existing: checkBackup(spec), proposed };
  });
}

const NOMINATED: Record<Arrangement, string[]> = {
  existing: [CENTRAL],
  "backup-added": [CENTRAL],
  "local-facilities": DEMO_FACILITIES,
};

/** Values a planner can enter in the Continuity Lab (P2-E9). null means "explicitly unknown". */
export type FacilityOverride = Partial<{
  coolingPlaces: number | null; floodPlaces: number | null; crews: number | null; hours: string | null;
  batteryKWh: number | null; inverterKW: number | null; coolingOnBackup: boolean | null;
}>;
export type Overrides = Record<string, FacilityOverride>;
const DECLARED = "Entered by the planner in the Continuity Lab";
const declared = <T>(value: T | null): Sourced<T> => ({ value, status: value === null ? "unknown" : "declared", source: value === null ? `${DECLARED} as unknown` : DECLARED, date: DATE });
const pick = <T>(o: FacilityOverride | undefined, k: keyof FacilityOverride, base: Sourced<T>): Sourced<T> =>
  o && k in o ? declared(o[k] as T | null) : base;

/** Facility inputs after any planner edits, in the labelled format. */
export function facilityInputs(id: string, overrides: Overrides = {}) {
  const f = facility(id), o = overrides[id];
  const b = f.backup as BackupSpec;
  return {
    coolingPlaces: pick(o, "coolingPlaces", f.services.coolingRespite.places as Sourced<number>),
    floodPlaces: pick(o, "floodPlaces", f.services.floodRelief.places as Sourced<number>),
    hours: pick(o, "hours", f.services.coolingRespite.hours as Sourced<string>),
    crews: pick(o, "crews", f.crews as Sourced<number>),
    backup: { ...b, batteryKWh: pick(o, "batteryKWh", b.batteryKWh), inverterKW: pick(o, "inverterKW", b.inverterKW), coolingOnBackup: pick(o, "coolingOnBackup", b.coolingOnBackup) } as BackupSpec,
  };
}

// P2-E7 opening hours: cooling respite counts only if the facility is open for the whole scenario window.
export const HEAT_WINDOW = { from: "12:00", to: "18:00" };
const minutes = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
export function hoursCover(hours: Sourced<string>, window = HEAT_WINDOW): Sourced<boolean> {
  if (hours.value === null || !/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(hours.value))
    return { value: null, status: "unknown", source: `Opening hours not known, so cover of ${window.from}–${window.to} cannot be checked`, date: DATE };
  const [open, close] = hours.value.split("-");
  const ok = minutes(open) <= minutes(window.from) && minutes(close) >= minutes(window.to);
  const status = hours.status === "declared" ? "declared" : "illustrative";
  return { value: ok, status, source: ok ? `Open ${hours.value}, covering the ${window.from}–${window.to} window` : `Open ${hours.value}: does not cover the ${window.from}–${window.to} window`, date: DATE };
}

function facilityFacts(arrangement: Arrangement, service: "coolingRespite" | "floodRelief", overrides: Overrides): PlannedFacilityFacts[] {
  return DEMO_FACILITIES.map((id) => {
    const inputs = facilityInputs(id, overrides);
    const useProposed = arrangement === "backup-added" && id === CENTRAL && !overrides[id];
    return {
      facilityId: id,
      nominated: ill(NOMINATED[arrangement].includes(id), `Arrangement "${arrangement}" nominates ${NOMINATED[arrangement].length === 1 ? "the central library only" : "the central library and local facilities"}`),
      capacity: service === "coolingRespite" ? inputs.coolingPlaces : inputs.floodPlaces,
      crewsRequired: inputs.crews,
      authorised: ill(true, "Planning assumption: facility owner agreement assumed for this review; verify"),
      // Flood relief opens on activation, so ordinary opening hours do not apply to it.
      suitable: service === "coolingRespite" ? hoursCover(inputs.hours) : ill(true, "Planning assumption: facility suitable for flood relief; verify"),
      backup: backupFact(useProposed ? PROPOSED_BACKUP(inputs.backup) : inputs.backup),
    };
  });
}

/** Crossings the selected access paths depend on. */
export const DEMO_CROSSINGS = [...new Set(ACCESS_LINKS
  .filter((l) => DEMO_COMMUNITIES.includes(l.from) && DEMO_FACILITIES.includes(l.to))
  .flatMap((l) => l.dependsOn.value))].sort();

export const SCENARIO_META = [
  { id: "heat", title: "Heat", kind: "heat", service: "coolingRespite", window: "Heatwave afternoon, 12:00–18:00 (illustrative)", note: "Grid power available; all crossings open. Facilities must be open for the whole window." },
  { id: "outage", title: "Heat + outage", kind: "heat-outage", service: "coolingRespite", window: "Heatwave afternoon, 12:00–18:00, with a 6-hour power outage (illustrative)", note: "Only facilities whose backup passes the check can count." },
  { id: "flood", title: "Flood + crossings closed", kind: "flood-access-loss", service: "floodRelief", window: "First 24 hours of a riverine flood (illustrative)", note: "Every road crossing inside a riverine flood overlay is closed." },
] as const;

export function planningFacts(crews: number | null, overrides: Overrides = {}): PlanningFacts {
  const crewCeiling: Sourced<number> = crews === null
    ? { value: null, status: "unknown", source: "Crew count not entered in the Continuity Lab", date: DATE }
    : { value: crews, status: "declared", source: "Entered by the planner in the Continuity Lab", date: DATE };
  const arrangements: Arrangement[] = ["existing", "backup-added", "local-facilities"];
  return {
    title: "Brimbank/Maribyrnong continuity review (illustrative planning inputs on public ABS and Vicmap data)",
    arrangements: [
      { id: "existing", label: "Existing arrangement" },
      { id: "backup-added", label: "Backup added" },
      { id: "local-facilities", label: "Local facilities" },
    ],
    scenarios: SCENARIO_META.map((s) => ({
      id: s.id, label: s.title, kind: s.kind, service: s.service, window: s.window, units: "places",
      crewCeiling,
      demand: DEMO_COMMUNITIES.map((communityId) => ({ communityId, amount: demandFor(communityId, s.kind === "flood-access-loss" ? "flood" : "heat") })),
      arrangementFacts: arrangements.map((arrangementId) => ({ arrangementId, facilities: facilityFacts(arrangementId, s.service, overrides) })),
      access: DEMO_COMMUNITIES.flatMap((communityId) => DEMO_FACILITIES.map((facilityId) => ({
        communityId, facilityId, available: ill(true, "Planning assumption: route usable when its crossings are open (routed on the Vicmap road network)"),
      }))),
      dependencyStates: DEMO_CROSSINGS.map((dependencyId) => ({
        dependencyId,
        open: s.kind === "flood-access-loss"
          ? ill(false, "Scenario: crossing closed because it lies in a riverine flood overlay")
          : ill(true, "Scenario: no flooding, crossing open"),
      })),
    })),
  };
}

export type DemoReview = { result: ReviewResult; brief: string };
export function runDemoReview(crews: number | null, overrides: Overrides = {}): DemoReview {
  const packet = buildReviewPacket(processedCatalogue, { communityIds: DEMO_COMMUNITIES, facilityIds: DEMO_FACILITIES }, planningFacts(crews, overrides));
  const result = reviewPacket(packet);
  return { result, brief: renderReviewBrief(result) };
}

export const crossingName = (id: string) => CROSSINGS.find((c) => c.id === id)?.road ?? id;
export const areaName = (sal: string) => area(sal).name;
export const facilityName = (id: string) => facility(id).name;
