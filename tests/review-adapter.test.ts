import { describe, expect, it } from "vitest";
import { buildReviewPacket, processedCatalogue } from "../lib/review-adapter";
import { ReviewContractError, type PlannedFacilityFacts, type PlanningFacts, type PlanningScenario, type ProcessedCatalogue } from "../lib/review-contract";
import { reviewPacket } from "../lib/continuity";
import type { Sourced } from "../lib/sourced";

const declared = <T>(value: T): Sourced<T> => ({ value, status: "declared", source: "Synthetic planning input", date: "2026-10-03" });
const illustrative = <T>(value: T): Sourced<T> => ({ value, status: "illustrative", source: "Synthetic catalogue placeholder", date: "2026-10-03" });
const publicFact = <T>(value: T): Sourced<T> => ({ value, status: "public", source: "Synthetic public geography", date: "current", licence: "CC BY 4.0" });
const unknown = <T>(): Sourced<T> => ({ value: null, status: "unknown", source: "Synthetic unresolved input", date: "not supplied" });
const selection = { communityIds: ["c1"], facilityIds: ["f1"] };
function catalogue(): ProcessedCatalogue {
  return {
    areas: [{ sal: "c1", name: "Community", population: publicFact(100), topLanguages: publicFact([{ language: "A", persons: 12 }]) }],
    facilities: [{ id: "f1", sal: "c1", name: "Facility", location: publicFact([144.8, -37.7]), floodOverlay: publicFact("SBO"),
      crews: illustrative(50), backup: { coolingOnBackup: illustrative(true) },
      services: { coolingRespite: { places: illustrative(8) }, floodRelief: { places: illustrative(3) } } }],
    crossings: [{ id: "d1", road: "Crossing", location: publicFact([144.9, -37.8]), overlay: "LSIO" }, { id: "unused", road: "Unselected crossing" }],
    links: [{ from: "c1", to: "f1", distanceKm: illustrative(2.1), dependsOn: illustrative(["d1"]) }],
  };
}
type CompletePlanning = Omit<PlanningFacts, "scenarios"> & {
  scenarios: (Required<PlanningScenario> & { arrangementFacts: { arrangementId: string; facilities: PlannedFacilityFacts[] }[] })[];
};
function planning(): CompletePlanning {
  return {
    title: "Adapter example", arrangements: [{ id: "a1", label: "Entered nomination" }],
    scenarios: [{ id: "s1", label: "Heat outage", kind: "heat-outage", service: "coolingRespite", window: "10:00–14:00", units: "places",
      demand: [{ communityId: "c1", amount: declared(8) }], crewCeiling: declared(1),
      arrangementFacts: [{ arrangementId: "a1", facilities: [{ facilityId: "f1", nominated: declared(true), crewsRequired: declared(1),
        authorised: declared(true), suitable: declared(true), backup: unknown<boolean>() }] }],
      access: [{ communityId: "c1", facilityId: "f1", available: declared(true) }], dependencyStates: [],
    }],
  };
}

describe("labelled processed-data adapter", () => {
  it("joins IDs and preserves Census, geography and illustrative topology provenance", () => {
    const data = catalogue(); const input = planning(); const result = buildReviewPacket(data, selection, input);
    expect(result.communities[0].context?.population).toEqual(data.areas[0].population);
    expect(result.communities[0].context?.topLanguages).toEqual(data.areas[0].topLanguages);
    expect(result.facilities[0].context?.floodOverlay).toEqual(data.facilities[0].floodOverlay);
    expect(result.scenarios[0].access[0].dependsOn).toEqual(data.links[0].dependsOn);
    expect(result.scenarios[0].access[0].available).toEqual(input.scenarios[0].access[0].available);
    expect(result.dependencies.map(dependency => dependency.id)).toEqual(["d1"]);
    expect(result.dependencies[0].context?.location).toEqual(data.crossings[0].location);
    expect(result.dependencies[0].context?.overlay?.value).toBe("LSIO");
    expect(result.scenarios[0].dependencyStates).toEqual([]);
    expect(result.scenarios[0].arrangementFacts[0].facilities[0].backup.status).toBe("unknown");
  });
  it("does not apply nominal places until an explicit sourced planning assumption", () => {
    const data = catalogue(); const input = planning();
    const unresolved = buildReviewPacket(data, selection, input);
    expect(unresolved.scenarios[0].arrangementFacts[0].facilities[0].capacity).toMatchObject({ value: null, status: "unknown" });
    const assumption = declared(true); input.scenarios[0].arrangementFacts[0].facilities[0].applyNominalCapacity = assumption;
    const applied = buildReviewPacket(data, selection, input);
    expect(applied.scenarios[0].arrangementFacts[0].facilities[0].capacity).toEqual(data.facilities[0].services.coolingRespite.places);
    expect(applied.facilities[0].context?.["services.coolingRespite.places"]).toEqual(data.facilities[0].services.coolingRespite.places);
    expect(applied.facilities[0].context?.["scenario:s1:arrangement:a1:applyNominalCapacity"]).toEqual(assumption);
    expect(applied.scenarios[0].arrangementFacts[0].facilities[0].capacity.status).toBe("illustrative");
  });
  it("keeps nominal application assumptions distinct across scenarios and arrangements", () => {
    const input = planning(); const first = input.scenarios[0].arrangementFacts[0].facilities[0]; first.applyNominalCapacity = declared(true);
    const second = structuredClone(input.scenarios[0]); second.id = "flood"; second.kind = "flood-access-loss"; second.service = "floodRelief";
    second.arrangementFacts[0].facilities[0].applyNominalCapacity = illustrative(true); input.scenarios.push(second);
    const result = buildReviewPacket(catalogue(), selection, input);
    expect(result.scenarios.map(scenario => scenario.arrangementFacts[0].facilities[0].capacity.value)).toEqual([8, 3]);
    expect(result.facilities[0].context?.["scenario:s1:arrangement:a1:applyNominalCapacity"]).toEqual(declared(true));
    expect(result.facilities[0].context?.["scenario:flood:arrangement:a1:applyNominalCapacity"]).toEqual(illustrative(true));
  });
  it("retains entered zero capacity and never falls back to catalogue crew or backup", () => {
    const input = planning(); const fact = input.scenarios[0].arrangementFacts[0].facilities[0];
    fact.capacity = declared(0); fact.applyNominalCapacity = declared(true); fact.crewsRequired = unknown<number>();
    const result = buildReviewPacket(catalogue(), selection, input).scenarios[0].arrangementFacts[0].facilities[0];
    expect(result.capacity).toEqual(declared(0)); expect(result.crewsRequired).toEqual(unknown<number>()); expect(result.backup).toEqual(unknown<boolean>());
  });
  it.each([declared(false), unknown<boolean>()])("keeps capacity unknown for non-true application %j", assumption => {
    const input = planning(); input.scenarios[0].arrangementFacts[0].facilities[0].applyNominalCapacity = assumption;
    expect(buildReviewPacket(catalogue(), selection, input).scenarios[0].arrangementFacts[0].facilities[0].capacity.status).toBe("unknown");
  });
  it("rejects public-status and non-boolean nominal application assumptions", () => {
    const input = planning(); input.scenarios[0].arrangementFacts[0].facilities[0].applyNominalCapacity = publicFact(true);
    expect(() => buildReviewPacket(catalogue(), selection, input)).toThrow(ReviewContractError);
    input.scenarios[0].arrangementFacts[0].facilities[0].applyNominalCapacity = declared("true") as unknown as Sourced<boolean>;
    expect(() => buildReviewPacket(catalogue(), selection, input)).toThrow(ReviewContractError);
  });
  it("normalizes omitted caller evidence to honest unknown without catalogue fallbacks", () => {
    for (const field of ["nominated", "authorised", "suitable", "backup", "crewsRequired"] as const) {
      const input = planning(); delete (input.scenarios[0].arrangementFacts[0].facilities[0] as unknown as Record<string, unknown>)[field];
      const output = buildReviewPacket(catalogue(), selection, input);
      expect(output.scenarios[0].arrangementFacts[0].facilities[0][field]).toMatchObject({ status: "unknown", value: null, date: "not supplied" });
    }
    const demand = planning(); demand.scenarios[0].demand = [];
    expect(buildReviewPacket(catalogue(), selection, demand).scenarios[0].demand).toEqual([{ communityId: "c1", amount: expect.objectContaining({ status: "unknown", value: null }) }]);
    const missingAvailability = planning(); delete (missingAvailability.scenarios[0].access[0] as unknown as Record<string, unknown>).available;
    expect(buildReviewPacket(catalogue(), selection, missingAvailability).scenarios[0].access[0].available).toMatchObject({ status: "unknown", value: null });
  });
  it("builds an unknown-heavy packet from structural scenario metadata alone", () => {
    const input: PlanningFacts = { title: "Unknown-heavy planning", arrangements: [{ id: "a1", label: "Entered arrangement" }],
      scenarios: [{ id: "s1", label: "Heat outage", kind: "heat-outage", service: "coolingRespite", window: "10:00–14:00", units: "places" }],
    };
    const output = buildReviewPacket(catalogue(), selection, input);
    const scenario = output.scenarios[0];
    expect(scenario.crewCeiling).toMatchObject({ value: null, status: "unknown" });
    expect(scenario.demand[0].amount).toMatchObject({ value: null, status: "unknown" });
    expect(scenario.arrangementFacts[0].facilities[0]).toMatchObject({ facilityId: "f1", nominated: { value: null, status: "unknown" }, capacity: { value: null, status: "unknown" } });
    expect(scenario.access).toHaveLength(1); expect(scenario.access[0].available).toMatchObject({ value: null, status: "unknown" });
    expect(scenario.access[0].dependsOn).toEqual(catalogue().links[0].dependsOn);
    expect(output.communities[0].context?.population).toEqual(catalogue().areas[0].population);
    const result = reviewPacket(output); expect(result.rows[0]).toMatchObject({ status: "blocked", total: null, gapVectors: null });
    const categories = result.rows[0].blockers.map(blocker => blocker.category);
    for (const category of ["demand", "crew-ceiling", "nomination", "capacity", "crew-requirement", "authorisation", "suitability", "backup", "access", "dependency"]) expect(categories).toContain(category);
    expect(new Set(result.rows[0].questions.map(question => question.path))).toEqual(new Set(result.rows[0].blockers.map(blocker => blocker.path)));
    expect(result.factsUsed).toEqual(output);
  });
  it("completes partial community, facility, arrangement and availability inputs", () => {
    const data = catalogue(); data.areas.push({ sal: "c2", name: "Second community" });
    data.facilities.push({ id: "f2", sal: "c1", name: "Second facility", services: {} });
    data.links.push({ from: "c2", to: "f2", distanceKm: illustrative(1), dependsOn: illustrative([]) });
    const input = planning(); input.arrangements.push({ id: "a2", label: "Second arrangement" });
    const output = buildReviewPacket(data, { communityIds: ["c1", "c2"], facilityIds: ["f1", "f2"] }, input);
    const scenario = output.scenarios[0];
    expect(scenario.demand.map(entry => entry.amount.value)).toEqual([8, null]);
    expect(scenario.arrangementFacts).toHaveLength(2);
    expect(scenario.arrangementFacts[0].facilities[1].nominated).toMatchObject({ value: null, status: "unknown" });
    expect(scenario.arrangementFacts[1].facilities.map(fact => fact.capacity.value)).toEqual([null, null]);
    expect(scenario.access).toHaveLength(4);
    expect(scenario.access.filter(path => path.available.status === "unknown")).toHaveLength(3);
    expect(scenario.access.find(path => path.communityId === "c2" && path.facilityId === "f1")?.dependsOn).toMatchObject({ value: null, status: "unknown" });
  });
  it("keeps missing nominal capacity and absent catalogue topology unknown", () => {
    const data = catalogue(); data.links = []; data.facilities[0].services = {};
    const input = planning(); input.scenarios[0].arrangementFacts[0].facilities[0].applyNominalCapacity = declared(true);
    const output = buildReviewPacket(data, selection, input);
    expect(output.scenarios[0].arrangementFacts[0].facilities[0].capacity).toMatchObject({ value: null, status: "unknown" });
    expect(output.scenarios[0].access[0].dependsOn).toMatchObject({ value: null, status: "unknown" });
    expect(output.scenarios[0].access[0].available).toEqual(declared(true));
    expect(output.dependencies).toEqual([]);
  });
  it("rejects supplied malformed evidence and out-of-selection inputs instead of discarding them", () => {
    for (const malformed of [null, undefined, true, { value: 1, status: "declared", source: undefined, date: "current" }, { value: 1, status: "declared", source: null, date: "current" }]) {
      const input = planning(); (input.scenarios[0].arrangementFacts[0].facilities[0] as unknown as Record<string, unknown>).capacity = malformed;
      expect(() => buildReviewPacket(catalogue(), selection, input)).toThrow(ReviewContractError);
    }
    const demand = planning(); demand.scenarios[0].demand.push({ communityId: "outside", amount: declared(1) });
    expect(() => buildReviewPacket(catalogue(), selection, demand)).toThrow(ReviewContractError);
    const facilities = planning(); facilities.scenarios[0].arrangementFacts[0].facilities.push({ facilityId: "outside" });
    expect(() => buildReviewPacket(catalogue(), selection, facilities)).toThrow(ReviewContractError);
    const groups = planning(); groups.scenarios[0].arrangementFacts.push({ arrangementId: "outside", facilities: [] });
    expect(() => buildReviewPacket(catalogue(), selection, groups)).toThrow(ReviewContractError);
    const access = planning(); access.scenarios[0].access.push({ communityId: "outside", facilityId: "f1", available: declared(true) });
    expect(() => buildReviewPacket(catalogue(), selection, access)).toThrow(ReviewContractError);
    const states = planning(); states.scenarios[0].dependencyStates.push({ dependencyId: "unused", open: declared(true) });
    expect(() => buildReviewPacket(catalogue(), selection, states)).toThrow(ReviewContractError);
  });
  it("rejects duplicate partial facts and hidden fields before normalization", () => {
    const demand = planning(); demand.scenarios[0].demand.push(demand.scenarios[0].demand[0]);
    expect(() => buildReviewPacket(catalogue(), selection, demand)).toThrow(ReviewContractError);
    const hidden = planning(); Object.defineProperty(hidden.scenarios[0], "crewCeiling", { value: declared(1), enumerable: false });
    expect(() => buildReviewPacket(catalogue(), selection, hidden)).toThrow("$.planningFacts.scenarios[0].crewCeiling");
    const hiddenIndex = planning(); Object.defineProperty(hiddenIndex.scenarios, "0", { value: hiddenIndex.scenarios[0], enumerable: false });
    expect(() => buildReviewPacket(catalogue(), selection, hiddenIndex)).toThrow("$.planningFacts.scenarios[0]");
  });
  it("keeps exact assumptions and distance context for delimiter-containing ID tuples", () => {
    const input = planning(); input.arrangements = [{ id: "b", label: "B" }, { id: "a:arrangement:b", label: "A" }];
    input.scenarios[0].id = "s:arrangement:a"; input.scenarios[0].arrangementFacts = [{ arrangementId: "b", facilities: [{ facilityId: "f1", applyNominalCapacity: declared(true) }] }];
    const second = structuredClone(input.scenarios[0]); second.id = "s";
    second.arrangementFacts = [{ arrangementId: "a:arrangement:b", facilities: [{ facilityId: "f1", applyNominalCapacity: illustrative(false) }] }];
    input.scenarios.push(second);
    const output = buildReviewPacket(catalogue(), selection, input);
    expect(output.facilities[0].context?.["scenario:s%3Aarrangement%3Aa:arrangement:b:applyNominalCapacity"]).toEqual(declared(true));
    expect(output.facilities[0].context?.["scenario:s:arrangement:a%3Aarrangement%3Ab:applyNominalCapacity"]).toEqual(illustrative(false));
    expect(output.scenarios[0].arrangementFacts[0].facilities[0].capacity).toEqual(illustrative(8));
    expect(output.facilities[0].context?.["scenario:s%3Aarrangement%3Aa:community:c1:distanceKm"]).toEqual(illustrative(2.1));
    expect(output.facilities[0].context?.["scenario:s:community:c1:distanceKm"]).toEqual(illustrative(2.1));
  });
  it("rejects oversized, duplicated and unknown selections without silently trimming", () => {
    for (const input of [
      { communityIds: ["c1", "c1"], facilityIds: ["f1"] },
      { communityIds: ["missing"], facilityIds: ["f1"] },
      { communityIds: ["c1"], facilityIds: ["missing"] },
      { communityIds: ["c1"], facilityIds: Array.from({ length: 7 }, (_, i) => `f${i}`) },
    ]) expect(() => buildReviewPacket(catalogue(), input, planning())).toThrow(ReviewContractError);
  });
  it("rejects broken SAL, crossing joins and invalid labelled catalogue evidence", () => {
    const sal = catalogue(); sal.facilities[0].sal = "missing";
    expect(() => buildReviewPacket(sal, selection, planning())).toThrow(ReviewContractError);
    const crossing = catalogue(); crossing.links[0].dependsOn = illustrative(["missing"]);
    expect(() => buildReviewPacket(crossing, selection, planning())).toThrow(ReviewContractError);
    const provenance = catalogue(); provenance.areas[0].population = { value: 12, status: "public", source: "ABS", date: "2021" };
    expect(() => buildReviewPacket(provenance, selection, planning())).toThrow(ReviewContractError);
  });
  it("uses the checked-in labelled JSON without private files", () => {
    const area = processedCatalogue.areas[0]; const facility = processedCatalogue.facilities[0];
    const link = processedCatalogue.links.find(entry => entry.from === area.sal && entry.to === facility.id)!;
    const input = planning(); input.scenarios[0].demand[0].communityId = area.sal;
    input.scenarios[0].arrangementFacts[0].facilities[0].facilityId = facility.id;
    input.scenarios[0].access[0] = { communityId: area.sal, facilityId: facility.id, available: unknown<boolean>() };
    const result = buildReviewPacket(processedCatalogue, { communityIds: [area.sal], facilityIds: [facility.id] }, input);
    expect(result.scenarios[0].access[0].dependsOn).toEqual(link.dependsOn);
    expect(result.dependencies.map(entry => entry.id)).toEqual([...new Set(link.dependsOn.value)].sort());
    expect(result.communities[0].context?.population).toEqual(area.population);
    expect(result.facilities[0].context?.["services.coolingRespite.places"]).toEqual(facility.services.coolingRespite.places);
  });
  it("returns detached evidence without references into catalogue or caller inputs", () => {
    const data = catalogue(); const input = planning(); input.scenarios[0].arrangementFacts[0].facilities[0].applyNominalCapacity = declared(true);
    const output = buildReviewPacket(data, selection, input);
    output.scenarios[0].arrangementFacts[0].facilities[0].capacity.value = 0;
    output.scenarios[0].access[0].dependsOn.value?.push("extra");
    (output.communities[0].context?.topLanguages.value as { language: string; persons: number }[])[0].persons = 999;
    output.facilities[0].context!["scenario:s1:arrangement:a1:applyNominalCapacity"].source = "changed";
    expect(data.facilities[0].services.coolingRespite.places.value).toBe(8);
    expect(data.links[0].dependsOn.value).toEqual(["d1"]);
    expect((data.areas[0].topLanguages as Sourced<{ language: string; persons: number }[]>).value?.[0].persons).toBe(12);
    expect(input.scenarios[0].arrangementFacts[0].facilities[0].applyNominalCapacity?.source).toBe("Synthetic planning input");
  });
});
