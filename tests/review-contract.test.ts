import { describe, expect, it } from "vitest";
import { REVIEW_VERSION, type ReviewPacket } from "../lib/review-contract";
import { validateReviewPacket } from "../lib/review-validation";
import type { Sourced } from "../lib/sourced";

const declared = <T>(value: T): Sourced<T> => ({ value, status: "declared", source: "Synthetic entered fact", date: "2026-10-03" });
const unknown = <T>(): Sourced<T> => ({ value: null, status: "unknown", source: "Synthetic unresolved evidence", date: "not supplied" });
function packet(): ReviewPacket {
  return {
    version: REVIEW_VERSION, title: "Contract test",
    communities: [{ id: "c1", name: "Community" }], facilities: [{ id: "f1", name: "Facility" }],
    dependencies: [{ id: "d1", name: "Crossing" }], arrangements: [{ id: "a1", label: "Entered arrangement" }],
    scenarios: [{ id: "s1", label: "Heat", kind: "heat", service: "coolingRespite", window: "10:00–14:00", units: "places",
      demand: [{ communityId: "c1", amount: declared(8) }], crewCeiling: declared(1),
      arrangementFacts: [{ arrangementId: "a1", facilities: [{ facilityId: "f1", nominated: declared(true), capacity: declared(8),
        crewsRequired: declared(1), authorised: declared(true), suitable: declared(true), backup: unknown<boolean>() }] }],
      access: [{ id: "p1", communityId: "c1", facilityId: "f1", available: declared(true), dependsOn: declared(["d1"]) }],
      dependencyStates: [],
    }],
  };
}
function invalid(input: unknown, path: string) {
  const result = validateReviewPacket(input);
  expect(result.valid).toBe(false);
  if (!result.valid) expect(result.errors.some(error => error.path === path)).toBe(true);
}

describe("review packet boundary", () => {
  it("accepts explicit unknown facts and preserves exact evidence without trimming", () => {
    const input = packet();
    input.title = " Entered title ";
    input.facilities[0].context = { census: { value: [{ language: "Vietnamese", persons: 2 }], status: "public", source: "ABS Census", date: "2021 (downloaded 2026-10-03)", licence: "CC BY 4.0" } };
    const result = validateReviewPacket(input);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.packet).toEqual(input);
  });
  it.each([null, [], true, "packet", new Date()])("rejects non-packet %s", input => invalid(input, "$"));
  it("rejects unknown operational fields and unsafe object keys", () => {
    invalid({ ...packet(), futureVersionField: true }, "$.futureVersionField");
    const input = JSON.parse(JSON.stringify(packet()));
    input.scenarios[0].access[0].dependsOn.extra = "ignored";
    invalid(input, "$.scenarios[0].access[0].dependsOn.extra");
    const unsafe = JSON.parse(JSON.stringify(packet()));
    unsafe.facilities[0].context = JSON.parse('{"__proto__":{"value":true,"status":"declared","source":"x","date":"x"}}');
    invalid(unsafe, "$.facilities[0].context.__proto__");
  });
  it("requires supported version, kind, bounded labels and stable IDs", () => {
    invalid({ ...packet(), version: "v2" }, "$.version");
    invalid({ ...packet(), title: " " }, "$.title");
    invalid({ ...packet(), title: "x".repeat(513) }, "$.title");
    const input = packet(); input.facilities[0].id = " f1 "; invalid(input, "$.facilities[0].id");
    const kind = JSON.parse(JSON.stringify(packet())); kind.scenarios[0].kind = "fire"; invalid(kind, "$.scenarios[0].kind");
  });
  it.each([-1, 1.5, 1_000_001, NaN, Infinity, "3", null])("rejects invalid count %s", value => {
    const input = packet(); input.scenarios[0].crewCeiling = declared(value) as Sourced<number>;
    invalid(input, "$.scenarios[0].crewCeiling.value");
  });
  it("accepts zero and the maximum entered count", () => {
    const input = packet(); input.scenarios[0].crewCeiling = declared(0); input.scenarios[0].demand[0].amount = declared(1_000_000);
    expect(validateReviewPacket(input).valid).toBe(true);
  });
  it.each([
    [{ value: 2, status: "unknown", source: "x", date: "current" }, "value"],
    [{ value: null, status: "declared", source: "x", date: "current" }, "value"],
    [{ value: 2, status: "unverified", source: "x", date: "current" }, "status"],
    [{ value: 2, status: "declared", source: " ", date: "current" }, "source"],
    [{ value: 2, status: "declared", source: "x", date: "" }, "date"],
    [{ value: 2, status: "public", source: "x", date: "current" }, "licence"],
    [{ value: 2, status: "public", source: "x", date: "current", licence: " " }, "licence"],
  ])("rejects malformed provenance %j", (fact, field) => {
    const input = packet(); input.scenarios[0].crewCeiling = fact as Sourced<number>;
    invalid(input, `$.scenarios[0].crewCeiling.${field}`);
  });
  it("requires complete demand and arrangement facility evidence", () => {
    const demand = packet(); demand.scenarios[0].demand = []; invalid(demand, "$.scenarios[0].demand");
    const facilities = packet(); facilities.scenarios[0].arrangementFacts[0].facilities = []; invalid(facilities, "$.scenarios[0].arrangementFacts[0].facilities");
    const arrangements = packet(); arrangements.scenarios[0].arrangementFacts = []; invalid(arrangements, "$.scenarios[0].arrangementFacts");
    const missing = JSON.parse(JSON.stringify(packet())); delete missing.scenarios[0].arrangementFacts[0].facilities[0].backup;
    invalid(missing, "$.scenarios[0].arrangementFacts[0].facilities[0].backup");
  });
  it("requires boolean gates and a unique sourced dependency-ID list", () => {
    const gate = packet(); gate.scenarios[0].arrangementFacts[0].facilities[0].authorised = declared(1) as unknown as Sourced<boolean>;
    invalid(gate, "$.scenarios[0].arrangementFacts[0].facilities[0].authorised.value");
    const list = packet(); list.scenarios[0].access[0].dependsOn = declared(["d1", "d1"]);
    invalid(list, "$.scenarios[0].access[0].dependsOn.value[1]");
    const malformed = packet(); malformed.scenarios[0].access[0].dependsOn = declared("d1") as unknown as Sourced<string[]>;
    invalid(malformed, "$.scenarios[0].access[0].dependsOn.value");
    const unresolved = packet(); unresolved.scenarios[0].access[0].dependsOn = unknown<string[]>();
    expect(validateReviewPacket(unresolved).valid).toBe(true);
  });
  it("rejects duplicate physical IDs, repeated facts and dangling references", () => {
    const physical = packet(); physical.dependencies[0].id = "f1"; invalid(physical, "$.dependencies[0].id");
    const repeated = packet(); repeated.scenarios[0].demand.push(repeated.scenarios[0].demand[0]); invalid(repeated, "$.scenarios[0].demand[1].communityId");
    const dangling = packet(); dangling.scenarios[0].access[0].facilityId = "missing"; invalid(dangling, "$.scenarios[0].access[0].facilityId");
    const topology = packet(); topology.scenarios[0].access[0].dependsOn = declared(["missing"]); invalid(topology, "$.scenarios[0].access[0].dependsOn.value[0]");
    const states = packet(); states.scenarios[0].dependencyStates = [{ dependencyId: "missing", open: declared(true) }]; invalid(states, "$.scenarios[0].dependencyStates[0].dependencyId");
  });
  it("rejects every oversized selection without truncation", () => {
    for (const [key, size] of [["facilities", 7], ["communities", 5], ["dependencies", 65], ["arrangements", 4], ["scenarios", 4]] as const) {
      const input = packet();
      (input[key] as unknown[]) = Array.from({ length: size }, (_, i) => ({ id: `entity${i}`, name: "Entity", label: "Entity" }));
      invalid(input, `$.${key}`);
    }
    const access = packet(); access.scenarios[0].access = Array.from({ length: 49 }, (_, i) => ({ ...access.scenarios[0].access[0], id: `p${i}` }));
    invalid(access, "$.scenarios[0].access");
  });
  it("bounds context and rejects non-JSON values, cycles, accessors and sparse arrays", () => {
    const nan = packet(); nan.facilities[0].context = { geo: declared(NaN) }; invalid(nan, "$.facilities[0].context.geo.value");
    const functionValue = packet(); functionValue.facilities[0].context = { geo: declared(() => true) }; invalid(functionValue, "$.facilities[0].context.geo.value");
    const cycle: Record<string, unknown> = {}; cycle.self = cycle;
    const cyclic = packet(); cyclic.facilities[0].context = { geo: declared(cycle) }; invalid(cyclic, "$.facilities[0].context.geo.value.self");
    const getter = packet(); Object.defineProperty(getter, "title", { get: () => { throw Error("must not run"); }, enumerable: true });
    invalid(getter, "$.title");
    const sparse = packet(); sparse.scenarios = Array(1); invalid(sparse, "$.scenarios[0]");
    const deep = packet(); let nested: unknown = 1; for (let i = 0; i < 14; i++) nested = { next: nested };
    deep.facilities[0].context = { geo: declared(nested) }; expect(validateReviewPacket(deep).valid).toBe(false);
  });
  it("rejects hidden fields and array entries before clone-based processing", () => {
    const top = packet(); Object.defineProperty(top, "scenarios", { value: top.scenarios, enumerable: false }); invalid(top, "$.scenarios");
    const scenario = packet(); Object.defineProperty(scenario.scenarios[0], "crewCeiling", { value: declared(1), enumerable: false }); invalid(scenario, "$.scenarios[0].crewCeiling");
    const context = packet(); const evidence = declared(2); Object.defineProperty(evidence, "source", { value: evidence.source, enumerable: false });
    context.facilities[0].context = { census: evidence }; invalid(context, "$.facilities[0].context.census.source");
    const array = packet(); Object.defineProperty(array.scenarios, "0", { value: array.scenarios[0], enumerable: false }); invalid(array, "$.scenarios[0]");
  });
});
