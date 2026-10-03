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
export function backupRows(): BackupRow[] {
  return DEMO_FACILITIES.map((id) => {
    const f = facility(id);
    const spec = f.backup as BackupSpec;
    return { facilityId: id, name: f.name, existing: checkBackup(spec), proposed: id === CENTRAL ? checkBackup(PROPOSED_BACKUP(spec)) : undefined };
  });
}

const NOMINATED: Record<Arrangement, string[]> = {
  existing: [CENTRAL],
  "backup-added": [CENTRAL],
  "local-facilities": DEMO_FACILITIES,
};

function facilityFacts(arrangement: Arrangement): PlannedFacilityFacts[] {
  return DEMO_FACILITIES.map((id) => {
    const f = facility(id);
    const spec = f.backup as BackupSpec;
    const useProposed = arrangement === "backup-added" && id === CENTRAL;
    return {
      facilityId: id,
      nominated: ill(NOMINATED[arrangement].includes(id), `Arrangement "${arrangement}" nominates ${NOMINATED[arrangement].length === 1 ? "the central library only" : "the central library and local facilities"}`),
      applyNominalCapacity: ill(true, "Planning assumption: apply the facility's declared places to this service and window"),
      crewsRequired: f.crews as Sourced<number>,
      authorised: ill(true, "Planning assumption: facility owner agreement assumed for this review; verify"),
      suitable: ill(true, "Planning assumption: facility suitable for this service; verify"),
      backup: backupFact(useProposed ? PROPOSED_BACKUP(spec) : spec),
    };
  });
}

/** Crossings the selected access paths depend on. */
export const DEMO_CROSSINGS = [...new Set(ACCESS_LINKS
  .filter((l) => DEMO_COMMUNITIES.includes(l.from) && DEMO_FACILITIES.includes(l.to))
  .flatMap((l) => l.dependsOn.value))].sort();

export const SCENARIO_META = [
  { id: "heat", title: "Heat", kind: "heat", service: "coolingRespite", window: "Heatwave afternoon, 12:00–18:00 (illustrative)", note: "Grid power available; all crossings open." },
  { id: "outage", title: "Heat + outage", kind: "heat-outage", service: "coolingRespite", window: "Heatwave afternoon with a 6-hour power outage (illustrative)", note: "Only facilities whose backup passes the check can count." },
  { id: "flood", title: "Flood + crossings closed", kind: "flood-access-loss", service: "floodRelief", window: "First 24 hours of a riverine flood (illustrative)", note: "Every main-road crossing in a riverine flood overlay is closed." },
] as const;

export function planningFacts(crews: number | null): PlanningFacts {
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
      arrangementFacts: arrangements.map((arrangementId) => ({ arrangementId, facilities: facilityFacts(arrangementId) })),
      access: DEMO_COMMUNITIES.flatMap((communityId) => DEMO_FACILITIES.map((facilityId) => ({
        communityId, facilityId, available: ill(true, "Planning assumption: path usable when its crossings are open (straight-line approximation)"),
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
export function runDemoReview(crews: number | null): DemoReview {
  const packet = buildReviewPacket(processedCatalogue, { communityIds: DEMO_COMMUNITIES, facilityIds: DEMO_FACILITIES }, planningFacts(crews));
  const result = reviewPacket(packet);
  return { result, brief: renderReviewBrief(result) };
}

export const crossingName = (id: string) => CROSSINGS.find((c) => c.id === id)?.road ?? id;
export const areaName = (sal: string) => area(sal).name;
export const facilityName = (id: string) => facility(id).name;
