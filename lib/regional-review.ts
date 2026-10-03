// P3-2 regional review: the same engine, rules and labelled assumptions as the Melbourne study, on a regional council's
// public data. Backup facts are unknown in a first regional review, so the outage scenario raises questions instead.
import region from "./data/regions/shepparton.json";
import { backupFact, type BackupSpec } from "./backup";
import { buildReviewPacket, reviewPacket, type PlannedFacilityFacts, type PlanningFacts, type ProcessedCatalogue, type ReviewResult } from "./continuity";
import { FLOOD_SHARE, HEAT_SHARE, hoursCover, SCENARIO_META } from "./demo-review";
import type { Arrangement } from "./planner-config";
import type { Names } from "./review-causes";
import type { Sourced } from "./sourced";

export const REGION = region;
export const REGION_ARRANGEMENTS = ["existing", "local-facilities"] as const satisfies readonly Arrangement[];
const DATE = "2026-10-03";
const ill = <T>(value: T, source: string): Sourced<T> => ({ value, status: "illustrative", source, date: DATE });
const CENTRAL = region.facilities[0].id;
const COMMUNITIES = region.areas.map((a) => a.sal);
const FACILITIES = region.facilities.map((f) => f.id);

const catalogue = {
  areas: region.areas, facilities: region.facilities, crossings: region.crossings, links: region.links,
} as unknown as ProcessedCatalogue;

export const REGION_NAMES: Names = {
  area: (sal) => region.areas.find((a) => a.sal === sal)?.name ?? sal,
  facility: (id) => region.facilities.find((f) => f.id === id)?.name ?? id,
  crossing: (id) => region.crossings.find((c) => c.id === id)?.road ?? id,
};

function demand(sal: string, kind: "heat" | "flood"): Sourced<number> {
  const a = region.areas.find((x) => x.sal === sal)!;
  const pop = a.population.value as number;
  if (kind === "heat") return ill(Math.max(1, Math.round(pop * ((a.pct65Plus.value as number) / 100) * HEAT_SHARE)), `Illustrative requirement: ${HEAT_SHARE * 100}% of residents aged 65+ (ABS Census 2021)`);
  return ill(Math.max(1, Math.round(pop * ((a.pctRiverine.value as number) / 100) * FLOOD_SHARE)), `Illustrative requirement: ${FLOOD_SHARE * 100}% of residents in the riverine flood-overlay share of the suburb (ABS Census × Vicmap)`);
}

function facts(arrangement: Arrangement, service: "coolingRespite" | "floodRelief"): PlannedFacilityFacts[] {
  return region.facilities.map((f) => ({
    facilityId: f.id,
    nominated: ill(arrangement === "local-facilities" || f.id === CENTRAL, arrangement === "existing" ? "Arrangement nominates the central library only" : "Arrangement nominates the central library and the local library"),
    capacity: (service === "coolingRespite" ? f.services.coolingRespite.places : f.services.floodRelief.places) as Sourced<number>,
    crewsRequired: f.crews as Sourced<number>,
    authorised: ill(true, "Planning assumption: facility owner agreement assumed for this review; verify"),
    suitable: service === "coolingRespite" ? hoursCover(f.services.coolingRespite.hours as Sourced<string>) : ill(true, "Planning assumption: facility suitable for flood relief; verify"),
    backup: backupFact(f.backup as BackupSpec),
  }));
}

export function regionalFacts(crews: number | null): PlanningFacts {
  const crewCeiling: Sourced<number> = crews === null
    ? { value: null, status: "unknown", source: "Crew count not entered", date: DATE }
    : { value: crews, status: "declared", source: "Entered by the planner", date: DATE };
  const deps = [...new Set(region.links.flatMap((l) => l.dependsOn.value ?? []))].sort();
  return {
    title: `${region.region} continuity review (illustrative planning inputs on public ABS and Vicmap data)`,
    arrangements: [{ id: "existing", label: "Existing arrangement" }, { id: "local-facilities", label: "Local facilities" }],
    scenarios: SCENARIO_META.map((s) => ({
      id: s.id, label: s.title, kind: s.kind, service: s.service, window: s.window, units: "places", crewCeiling,
      demand: COMMUNITIES.map((communityId) => ({ communityId, amount: demand(communityId, s.kind === "flood-access-loss" ? "flood" : "heat") })),
      arrangementFacts: REGION_ARRANGEMENTS.map((arrangementId) => ({ arrangementId, facilities: facts(arrangementId, s.service) })),
      access: COMMUNITIES.flatMap((communityId) => FACILITIES.map((facilityId) => ({ communityId, facilityId, available: ill(true, "Planning assumption: route usable when its crossings are open (routed on the Vicmap road network)") }))),
      dependencyStates: deps.map((dependencyId) => ({ dependencyId, open: s.kind === "flood-access-loss" ? ill(false, "Scenario: crossing closed because it lies in a riverine flood overlay") : ill(true, "Scenario: no flooding, crossing open") })),
    })),
  };
}

export function runRegionalReview(crews: number | null): ReviewResult {
  return reviewPacket(buildReviewPacket(catalogue, { communityIds: COMMUNITIES, facilityIds: FACILITIES }, regionalFacts(crews)));
}
