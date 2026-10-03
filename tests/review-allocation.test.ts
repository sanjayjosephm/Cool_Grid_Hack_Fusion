import { describe, expect, it } from "vitest";
import { allocateReview } from "../lib/review-allocation";
import { REVIEW_VERSION, type AllocationWitness, type ReviewPacket } from "../lib/review-contract";
import type { Sourced } from "../lib/sourced";

const known = <T>(value: T): Sourced<T> => ({ value, status: "illustrative", source: "Synthetic allocation fixture",
  date: "2026-10-03", licence: "CC0 synthetic facts" });
const unknown = <T>(): Sourced<T> => ({ value: null, status: "unknown", source: "Fixture fact not supplied",
  date: "2026-10-03", licence: "CC0 synthetic facts" });

function fixture(capacities: Record<string, number> = { f1: 4 }, demands: Record<string, number> = { c1: 4 }, crews = 6): ReviewPacket {
  const facilities = Object.keys(capacities).map(id => ({ id, name: `Facility ${id}` }));
  const communities = Object.keys(demands).map(id => ({ id, name: `Community ${id}` }));
  return {
    version: REVIEW_VERSION, title: "Independent synthetic allocation case", facilities, communities,
    dependencies: [], arrangements: [{ id: "arrangement", label: "Entered arrangement" }],
    scenarios: [{ id: "scenario", label: "Entered scenario", kind: "heat", service: "cooling places",
      window: "12:00–16:00", units: "places", crewCeiling: known(crews),
      demand: communities.map(community => ({ communityId: community.id, amount: known(demands[community.id]) })),
      arrangementFacts: [{ arrangementId: "arrangement", facilities: facilities.map(facility => ({
        facilityId: facility.id, nominated: known(true), capacity: known(capacities[facility.id]), crewsRequired: known(1),
        authorised: known(true), suitable: known(true), backup: known(true),
      })) }],
      access: facilities.flatMap(facility => communities.map(community => ({
        id: `${facility.id}-${community.id}`, communityId: community.id, facilityId: facility.id,
        available: known(true), dependsOn: known<string[]>([]),
      }))), dependencyStates: [],
    }],
  };
}

function routes(packet: ReviewPacket, permitted: Record<string, string[]>): void {
  packet.scenarios[0].access.forEach(path => { path.available = known(permitted[path.facilityId].includes(path.communityId)); });
}

function conserve(packet: ReviewPacket, witness: AllocationWitness): void {
  const scenario = packet.scenarios[0];
  const facts = scenario.arrangementFacts[0].facilities;
  expect(witness.total).toBe(witness.flows.reduce((sum, flow) => sum + flow.places, 0));
  expect(witness.crewsUsed).toBe(facts.filter(site => witness.facilityIds.includes(site.facilityId))
    .reduce((sum, site) => sum + site.crewsRequired.value!, 0));
  expect(witness.crewsUsed).toBeLessThanOrEqual(scenario.crewCeiling.value!);
  facts.forEach(site => {
    const used = witness.flows.filter(flow => flow.facilityId === site.facilityId).reduce((sum, flow) => sum + flow.places, 0);
    expect(used).toBeLessThanOrEqual(site.capacity.value!);
  });
  witness.gaps.forEach(gap => {
    expect(gap.allocated).toBe(witness.flows.filter(flow => flow.communityId === gap.communityId)
      .reduce((sum, flow) => sum + flow.places, 0));
    expect(gap.gap).toBe(gap.demand - gap.allocated);
    expect(gap.allocated).toBeLessThanOrEqual(gap.demand);
    expect(Number.isInteger(gap.allocated)).toBe(true);
  });
  witness.flows.forEach(flow => {
    expect(Number.isInteger(flow.places)).toBe(true);
    expect(flow.places).toBeGreaterThan(0);
    expect(witness.facilityIds).toContain(flow.facilityId);
    expect(scenario.access.some(path => path.facilityId === flow.facilityId && path.communityId === flow.communityId
      && path.available.value === true)).toBe(true);
  });
}

// Independent exhaustive oracle: try each site's integer allocations directly,
// rather than building a flow graph or enumerating the engine's facility masks.
function exhaustiveTotal(capacities: number[], demands: number[], crewRequirements: number[], crewCeiling: number, open: boolean[][]): number {
  const memo = new Map<string, number>();
  function choose(site: number, crewsLeft: number, remaining: number[]): number {
    if (site === capacities.length) return 0;
    const key = `${site}:${crewsLeft}:${remaining.join(",")}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    let best = choose(site + 1, crewsLeft, remaining);
    if (crewRequirements[site] <= crewsLeft) {
      function distribute(community: number, placesLeft: number, next: number[], served: number): void {
        if (community === demands.length) {
          best = Math.max(best, served + choose(site + 1, crewsLeft - crewRequirements[site], next));
          return;
        }
        const bound = open[site][community] ? Math.min(placesLeft, remaining[community]) : 0;
        for (let amount = 0; amount <= bound; amount++) {
          const changed = next.slice();
          changed[community] -= amount;
          distribute(community + 1, placesLeft - amount, changed, served + amount);
        }
      }
      distribute(0, capacities[site], remaining.slice(), 0);
    }
    memo.set(key, best);
    return best;
  }
  return choose(0, crewCeiling, demands);
}

describe("allocation maximum flow and subset witnesses", () => {
  it("reroutes across four communities and six facilities, without greedy loss", () => {
    const packet = fixture({ f1: 3, f2: 3, f3: 2, f4: 2, f5: 1, f6: 1 }, { c1: 3, c2: 3, c3: 2, c4: 4 });
    routes(packet, { f1: ["c1", "c2"], f2: ["c1"], f3: ["c3", "c4"], f4: ["c3"], f5: ["c4"], f6: ["c4"] });
    const row = allocateReview(packet).rows[0];
    expect(row.total).toBe(12);
    expect(row.witnesses).toHaveLength(1);
    expect(row.witnesses[0].flows).toEqual([
      { facilityId: "f1", communityId: "c2", places: 3 }, { facilityId: "f2", communityId: "c1", places: 3 },
      { facilityId: "f3", communityId: "c4", places: 2 }, { facilityId: "f4", communityId: "c3", places: 2 },
      { facilityId: "f5", communityId: "c4", places: 1 }, { facilityId: "f6", communityId: "c4", places: 1 },
    ]);
    row.witnesses.forEach(witness => conserve(packet, witness));
    expect(row.gapVectors?.[0].map(gap => gap.gap)).toEqual([0, 0, 0, 0]);
  });

  it("shows a six-site dependency bottleneck and one-factor reopening gain", () => {
    const packet = fixture({ f1: 3, f2: 3, f3: 2, f4: 2, f5: 1, f6: 1 }, { c1: 3, c2: 3, c3: 2, c4: 4 });
    routes(packet, { f1: ["c1", "c2"], f2: ["c1"], f3: ["c3", "c4"], f4: ["c3"], f5: ["c4"], f6: ["c4"] });
    packet.dependencies = [{ id: "bridge", name: "Synthetic bridge" }];
    packet.scenarios[0].dependencyStates = [{ dependencyId: "bridge", open: known(false) }];
    packet.scenarios[0].access.find(path => path.id === "f6-c4")!.dependsOn = known(["bridge"]);
    const row = allocateReview(packet).rows[0];
    expect(row.total).toBe(11);
    expect(row.witnesses).toHaveLength(2); // Redundant closed-access site may still be in a best subset.
    row.witnesses.forEach(witness => conserve(packet, witness));
    const probe = row.probes.find(item => item.path.endsWith("dependencyStates[0].open"))!;
    expect(probe).toMatchObject({ beforeTotal: 11, afterTotal: 12, conditionalDelta: 1, interpretation: "individual-gain" });
    expect(row.questions.find(question => question.path === probe.path)?.reason).toBe("conditional-gain");
  });

  it("returns each best subset, distinct sorted four-community outcomes, and ID-based rename invariance", () => {
    const packet = fixture({ f4: 2, f2: 2, f1: 2, f3: 2 }, { c4: 2, c2: 2, c1: 2, c3: 2 }, 1);
    routes(packet, { f1: ["c1"], f2: ["c2"], f3: ["c3"], f4: ["c4"] });
    const row = allocateReview(packet).rows[0];
    expect(row.total).toBe(2);
    expect(row.witnesses.map(witness => witness.facilityIds)).toEqual([["f1"], ["f2"], ["f3"], ["f4"]]);
    expect(row.gapVectors?.map(vector => vector.map(gap => gap.gap))).toEqual([[0, 2, 2, 2], [2, 0, 2, 2], [2, 2, 0, 2], [2, 2, 2, 0]]);
    row.witnesses.forEach(witness => conserve(packet, witness));
    packet.facilities.reverse().forEach(entity => { entity.name = "A renamed facility"; });
    packet.communities.reverse().forEach(entity => { entity.name = "A renamed community"; });
    packet.scenarios[0].access.reverse();
    packet.scenarios[0].demand.reverse();
    packet.scenarios[0].arrangementFacts[0].facilities.reverse();
    const renamed = allocateReview(packet).rows[0];
    expect(renamed.witnesses).toEqual(row.witnesses);
    expect(renamed.gapVectors).toEqual(row.gapVectors);
  });

  it("retains redundant zero-capacity subsets and treats entered zero as known", () => {
    const packet = fixture({ f1: 4, f2: 0 });
    const row = allocateReview(packet).rows[0];
    expect(row.total).toBe(4);
    expect(row.witnesses.map(witness => witness.facilityIds)).toEqual([["f1"], ["f1", "f2"]]);
    expect(row.blockers).toEqual([]);
    packet.scenarios[0].arrangementFacts[0].facilities[0].capacity = known(0);
    const zero = allocateReview(packet).rows[0];
    expect(zero.total).toBe(0);
    expect(zero.witnesses.map(witness => witness.facilityIds)).toEqual([[], ["f1"], ["f1", "f2"], ["f2"]]);
    expect(zero.gapVectors?.[0][0]).toMatchObject({ demand: 4, allocated: 0, gap: 4 });
  });

  it("conserves capacity and demand with zero crew sites and crew-infeasible subsets", () => {
    const packet = fixture({ f1: 9, f2: 9, f3: 20 }, { c1: 2, c2: 3 }, 1);
    packet.scenarios[0].arrangementFacts[0].facilities[0].crewsRequired = known(0);
    packet.scenarios[0].arrangementFacts[0].facilities[2].crewsRequired = known(2);
    const row = allocateReview(packet).rows[0];
    expect(row.total).toBe(5);
    expect(row.witnesses.every(witness => !witness.facilityIds.includes("f3"))).toBe(true);
    row.witnesses.forEach(witness => conserve(packet, witness));
  });

  it("matches an independent exhaustive integer-allocation oracle on bounded four-community cases", () => {
    let seed = 127;
    const next = (bound: number) => { seed = (seed * 48271) % 2147483647; return seed % bound; };
    for (let caseNumber = 0; caseNumber < 12; caseNumber++) {
      const capacities = Array.from({ length: 4 }, () => next(3));
      const demands = Array.from({ length: 4 }, () => next(3));
      const requirements = Array.from({ length: 4 }, () => next(3));
      const crewCeiling = next(5);
      const open = capacities.map(() => demands.map(() => next(2) === 1));
      const packet = fixture(Object.fromEntries(capacities.map((amount, i) => [`f${i}`, amount])),
        Object.fromEntries(demands.map((amount, i) => [`c${i}`, amount])), crewCeiling);
      packet.scenarios[0].arrangementFacts[0].facilities.forEach((site, i) => { site.crewsRequired = known(requirements[i]); });
      packet.scenarios[0].access.forEach(path => { path.available = known(open[Number(path.facilityId.slice(1))][Number(path.communityId.slice(1))]); });
      const row = allocateReview(packet).rows[0];
      expect(row.total, `Case ${caseNumber}`).toBe(exhaustiveTotal(capacities, demands, requirements, crewCeiling, open));
      row.witnesses.forEach(witness => conserve(packet, witness));
    }
  });
});

describe("allocation evidence gates and conditional probes", () => {
  it("treats false nomination as intentional exclusion, without probes or default questions", () => {
    const packet = fixture();
    const site = packet.scenarios[0].arrangementFacts[0].facilities[0];
    site.nominated = known(false);
    site.capacity = unknown(); site.authorised = unknown(); site.suitable = known(false);
    packet.scenarios[0].access = [];
    const row = allocateReview(packet).rows[0];
    expect(row.total).toBe(0);
    expect(row.excludedNominations).toEqual([{ facilityId: "f1", fact: site.nominated }]);
    expect(row.blockers).toEqual([]);
    expect(row.probes).toEqual([]);
    expect(row.questions).toEqual([]);
  });

  it("asks the review owner about unknown nomination and preserves entered provenance", () => {
    const packet = fixture();
    packet.scenarios[0].arrangementFacts[0].facilities[0].nominated = unknown();
    const row = allocateReview(packet).rows[0];
    expect(row.total).toBe(0);
    expect(row.blockers[0]).toMatchObject({ category: "nomination", kind: "unknown", fact: unknown() });
    expect(row.probes[0]).toMatchObject({ beforeFact: unknown(), beforeTotal: 0, afterTotal: 4, conditionalDelta: 4 });
    expect(row.probes[0].afterFact.source).toContain("conditional probe");
    expect(row.questions[0]).toMatchObject({ reason: "unknown-fact", roleHypothesis: "Review owner (hypothesis)" });
    expect(row.questions[0].question).toContain("owner's intent");
  });

  it("preserves simultaneous applicable false and unknown blockers, without causal certainty from zero deltas", () => {
    const packet = fixture();
    const scenario = packet.scenarios[0];
    scenario.kind = "heat-outage";
    const site = scenario.arrangementFacts[0].facilities[0];
    site.authorised = known(false); site.suitable = known(false); site.backup = unknown();
    scenario.access[0].available = unknown();
    scenario.access[0].dependsOn = known(["closed", "unconfirmed"]);
    packet.dependencies = [{ id: "closed", name: "Closed crossing" }, { id: "unconfirmed", name: "Unconfirmed crossing" }];
    scenario.dependencyStates = [{ dependencyId: "closed", open: known(false) }, { dependencyId: "unconfirmed", open: unknown() }];
    const row = allocateReview(packet).rows[0];
    expect(row.blockers).toHaveLength(6);
    expect(row.probes).toHaveLength(6);
    expect(row.probes.every(probe => probe.conditionalDelta === 0 && probe.interpretation === "no-standalone-gain")).toBe(true);
    expect(row.questions).toHaveLength(3);
    expect(row.questions.every(question => question.reason === "unknown-fact")).toBe(true);
    row.blockers.forEach(blocker => expect(blocker.fact.licence).toBe("CC0 synthetic facts"));
    expect(allocateReview(packet).modelLimits.find(limit => limit.code === "one-factor-probes")?.description).toContain("multiple blockers");
  });

  it("creates targeted conditional verification only for a false gate with standalone gain", () => {
    const packet = fixture();
    packet.scenarios[0].arrangementFacts[0].facilities[0].authorised = known(false);
    const row = allocateReview(packet).rows[0];
    expect(row.total).toBe(0);
    expect(row.probes[0]).toMatchObject({ beforeTotal: 0, afterTotal: 4, conditionalDelta: 4, interpretation: "individual-gain" });
    expect(row.blockers[0].fact).toEqual(known(false));
    expect(row.questions[0]).toMatchObject({ reason: "conditional-gain", roleHypothesis: "Facility authorisation owner (hypothesis)" });
    expect(row.questions[0].question).toContain("authorisation");
  });

  it("applies backup only in heat-outage and keeps scenario services separate", () => {
    const packet = fixture();
    packet.scenarios[0].arrangementFacts[0].facilities[0].backup = known(false);
    const heat = structuredClone(packet.scenarios[0]);
    const outage = structuredClone(heat); outage.id = "outage"; outage.kind = "heat-outage";
    const flood = structuredClone(heat); flood.id = "flood"; flood.kind = "flood-access-loss"; flood.service = "device charging"; flood.units = "devices";
    packet.scenarios = [heat, outage, flood];
    const result = allocateReview(packet);
    expect(result.rows.map(row => [row.scenarioId, row.total])).toEqual([["flood", 4], ["outage", 0], ["scenario", 4]]);
    expect(result.rows.find(row => row.scenarioId === "outage")?.blockers[0].category).toBe("backup");
    expect(result.rows.filter(row => row.scenarioId !== "outage").every(row => row.blockers.length === 0)).toBe(true);
    expect(result).not.toHaveProperty("total");
    expect(result.modelLimits.find(limit => limit.code === "separate-scenarios-services")?.description).toContain("no summed cross-scenario");
  });

  it("excludes unknown capacity and crew requirements without numeric probes", () => {
    const packet = fixture({ f1: 4, f2: 4 });
    const sites = packet.scenarios[0].arrangementFacts[0].facilities;
    sites[0].capacity = unknown(); sites[1].crewsRequired = unknown();
    const row = allocateReview(packet).rows[0];
    expect(row.total).toBe(0);
    expect(row.gapVectors?.[0][0].gap).toBe(4);
    expect(row.blockers.map(blocker => blocker.category).sort()).toEqual(["capacity", "crew-requirement"]);
    expect(row.questions).toHaveLength(2);
    expect(row.probes).toEqual([]);
  });

  it.each(["demand", "crews"])("keeps totals AND gaps null for unknown scenario %s, including every boolean probe", field => {
    const packet = fixture({ f1: 4, f2: 4 });
    const scenario = packet.scenarios[0];
    if (field === "demand") scenario.demand[0].amount = unknown();
    else scenario.crewCeiling = unknown();
    scenario.arrangementFacts[0].facilities[0].authorised = known(false);
    scenario.arrangementFacts[0].facilities[0].suitable = unknown();
    scenario.arrangementFacts[0].facilities[1].nominated = known(false);
    const row = allocateReview(packet).rows[0];
    expect(row).toMatchObject({ total: null, gapVectors: null, status: "blocked", witnesses: [] });
    expect(row.blockers).toHaveLength(3);
    expect(row.excludedNominations).toHaveLength(1);
    expect(row.probes).toHaveLength(2);
    row.probes.forEach(probe => expect(probe).toMatchObject({ beforeTotal: null, afterTotal: null,
      beforeGapVectors: null, afterGapVectors: null, conditionalDelta: null, distributionChanged: false, interpretation: "not-calculable" }));
    expect(row.questions).toHaveLength(2); // Unknown facts always need targeted evidence; false non-calculable facts do not add work.
  });

  it("preserves factsUsed as a detached exact snapshot, including context, and exposes no internal candidates", () => {
    const packet = fixture();
    packet.communities[0].context = { overlappingGroup: known({ population: 123, overlapping: true }) };
    const original = structuredClone(packet);
    const result = allocateReview(packet);
    expect(result.factsUsed).toEqual(original);
    expect(result.rows[0]).not.toHaveProperty("candidates");
    packet.title = "Changed after review";
    packet.scenarios[0].arrangementFacts[0].facilities[0].capacity.value = 0;
    expect(result.factsUsed).toEqual(original);
    result.factsUsed.facilities[0].name = "Changed output snapshot";
    expect(packet.facilities[0].name).toBe("Facility f1");
  });
});

describe("access paths and declared dependencies", () => {
  it("lets a false dependency override available and probes only its one state", () => {
    const packet = fixture();
    packet.dependencies = [{ id: "crossing", name: "Synthetic crossing" }];
    packet.scenarios[0].access[0].dependsOn = known(["crossing"]);
    packet.scenarios[0].dependencyStates = [{ dependencyId: "crossing", open: known(false) }];
    const row = allocateReview(packet).rows[0];
    expect(row.total).toBe(0);
    expect(row.probes).toHaveLength(1);
    expect(row.probes[0]).toMatchObject({ afterTotal: 4, conditionalDelta: 4 });
    expect(row.blockers[0]).toMatchObject({ category: "dependency", dependencyId: "crossing", fact: known(false) });
    expect(row.blockers[0].explanation).toContain("even if availability is true");
  });

  it("keeps absent states unknown and allows a one-state probe without manufacturing topology", () => {
    const packet = fixture();
    packet.dependencies = [{ id: "crossing", name: "Synthetic crossing" }];
    packet.scenarios[0].access[0].dependsOn = known(["crossing"]);
    const row = allocateReview(packet).rows[0];
    expect(row.total).toBe(0);
    expect(row.blockers[0]).toMatchObject({ category: "dependency", kind: "unknown", fact: { value: null, status: "unknown", source: "Not supplied in review packet" } });
    expect(row.probes[0]).toMatchObject({ afterTotal: 4, conditionalDelta: 4 });
    expect(row.questions[0].reason).toBe("unknown-fact");
    expect(packet.scenarios[0].dependencyStates).toEqual([]);
    expect(row.probes[0].beforeFact.value).toBeNull();
  });

  it("deduplicates a shared dependency fact into one global probe", () => {
    const packet = fixture({ f1: 4, f2: 4 }, { c1: 4, c2: 4 });
    packet.dependencies = [{ id: "crossing", name: "Synthetic crossing" }];
    packet.scenarios[0].access.forEach(path => { path.dependsOn = known(["crossing"]); });
    packet.scenarios[0].dependencyStates = [{ dependencyId: "crossing", open: known(false) }];
    const row = allocateReview(packet).rows[0];
    expect(row.blockers).toHaveLength(1);
    expect(row.probes).toHaveLength(1);
    expect(row.probes[0]).toMatchObject({ beforeTotal: 0, afterTotal: 8, conditionalDelta: 8 });
  });

  it("does not create topology or paths for unknown topology and missing pairs", () => {
    const packet = fixture({ f1: 4, f2: 4 });
    packet.scenarios[0].access[0].dependsOn = unknown();
    packet.scenarios[0].access = packet.scenarios[0].access.filter(path => path.facilityId !== "f2");
    const row = allocateReview(packet).rows[0];
    expect(row.total).toBe(0);
    expect(row.blockers.map(blocker => blocker.category).sort()).toEqual(["access", "topology"]);
    expect(row.probes).toEqual([]);
    expect(row.questions).toHaveLength(2);
    expect(row.questions.every(question => question.reason === "unknown-fact")).toBe(true);
  });

  it("keeps availability, every other dependency and topology intact in a one-factor probe", () => {
    const packet = fixture();
    packet.dependencies = [{ id: "a", name: "A crossing" }, { id: "b", name: "B crossing" }];
    const scenario = packet.scenarios[0];
    scenario.access[0].available = known(false);
    scenario.access[0].dependsOn = known(["a", "b"]);
    scenario.dependencyStates = [{ dependencyId: "a", open: known(false) }, { dependencyId: "b", open: unknown() }];
    const row = allocateReview(packet).rows[0];
    expect(row.blockers).toHaveLength(3);
    expect(row.probes.every(probe => probe.afterTotal === 0 && probe.conditionalDelta === 0)).toBe(true);
    expect(row.questions).toHaveLength(1);
    expect(row.questions[0].path).toContain("dependencyStates[1]");
  });

  it("counts an alternative usable path and adds no default work for a false nonbinding route", () => {
    const packet = fixture();
    const scenario = packet.scenarios[0];
    scenario.access[0].available = known(false);
    scenario.access.push({ ...structuredClone(scenario.access[0]), id: "alternative", available: known(true) });
    const row = allocateReview(packet).rows[0];
    expect(row.total).toBe(4);
    expect(row.blockers).toHaveLength(1);
    expect(row.probes[0]).toMatchObject({ conditionalDelta: 0, distributionChanged: false, interpretation: "no-standalone-gain" });
    expect(row.questions).toEqual([]);
  });

  it("asks about an unknown nonbinding route without claiming its zero delta proves irrelevance", () => {
    const packet = fixture();
    const scenario = packet.scenarios[0];
    scenario.access[0].available = unknown();
    scenario.access.push({ ...structuredClone(scenario.access[0]), id: "alternative", available: known(true) });
    const row = allocateReview(packet).rows[0];
    expect(row.total).toBe(4);
    expect(row.probes[0].conditionalDelta).toBe(0);
    expect(row.questions).toHaveLength(1);
    expect(row.questions[0].reason).toBe("unknown-fact");
  });

  it("recognises changed community outcomes with no total gain", () => {
    const packet = fixture({ f1: 4, f2: 4 }, { c1: 4, c2: 4 }, 1);
    routes(packet, { f1: ["c2"], f2: ["c2"] });
    const row = allocateReview(packet).rows[0];
    expect(row.total).toBe(4);
    expect(row.gapVectors?.map(vector => vector.map(gap => gap.gap))).toEqual([[4, 0]]);
    const pathIndex = packet.scenarios[0].access.findIndex(path => path.id === "f2-c1");
    const probe = row.probes.find(item => item.path === `scenarios[0].access[${pathIndex}].available`)!;
    expect(probe).toMatchObject({ beforeTotal: 4, afterTotal: 4, conditionalDelta: 0,
      distributionChanged: true, interpretation: "distribution-change" });
    expect(probe.afterGapVectors?.map(vector => vector.map(gap => gap.gap))).toEqual([[0, 4], [4, 0]]);
    expect(row.questions.find(question => question.path === probe.path)).toBeUndefined();
  });
});
