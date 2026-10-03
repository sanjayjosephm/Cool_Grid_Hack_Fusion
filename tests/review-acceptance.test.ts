import { describe, expect, it } from "vitest";
import { reviewPacket, REVIEW_VERSION, type ReviewPacket } from "../lib/continuity";
import type { Sourced } from "../lib/sourced";

const entered = <T>(value: T): Sourced<T> => ({
  value, status: "illustrative", source: "Independent synthetic acceptance case", date: "2026-10-03",
});

function smallPacket(capacities: number[], costs: number[], demands: number[], routes: boolean[][], ceiling: number): ReviewPacket {
  const facilities = capacities.map((_, i) => ({ id: `f${i}`, name: `Site ${i}` }));
  const communities = demands.map((_, i) => ({ id: `c${i}`, name: `Community ${i}` }));
  return {
    version: REVIEW_VERSION, title: "Independent bounded allocation case",
    facilities, communities, dependencies: [], arrangements: [{ id: "a", label: "Entered arrangement" }],
    scenarios: [{
      id: "s", label: "Entered heat", kind: "heat", service: "Synthetic cooling", window: "Entered window", units: "places",
      crewCeiling: entered(ceiling), demand: communities.map((c, i) => ({ communityId: c.id, amount: entered(demands[i]) })),
      arrangementFacts: [{ arrangementId: "a", facilities: facilities.map((f, i) => ({
        facilityId: f.id, nominated: entered(true), capacity: entered(capacities[i]), crewsRequired: entered(costs[i]),
        authorised: entered(true), suitable: entered(true), backup: entered(false),
      })) }],
      access: facilities.flatMap((f, i) => communities.map((c, j) => ({
        id: `p${i}-${j}`, facilityId: f.id, communityId: c.id, available: entered(routes[i][j]), dependsOn: entered<string[]>([]),
      }))), dependencyStates: [],
    }],
  };
}

/** Independent exhaustive state search: no flow network or subset solver. */
function exhaustiveTotal(capacities: number[], costs: number[], demands: number[], routes: boolean[][], ceiling: number): number {
  let states = new Map<string, { allocation: number[]; crews: number }>();
  states.set(`0:${demands.map(() => 0).join(",")}`, { allocation: demands.map(() => 0), crews: 0 });
  for (let f = 0; f < capacities.length; f++) {
    const next = new Map(states);
    for (const state of states.values()) {
      if (state.crews + costs[f] > ceiling) continue;
      const enumerate = (c: number, remaining: number, additional: number[]) => {
        if (c === demands.length) {
          const allocation = state.allocation.map((n, j) => n + additional[j]);
          const crews = state.crews + costs[f];
          next.set(`${crews}:${allocation.join(",")}`, { allocation, crews });
          return;
        }
        const upper = routes[f][c] ? Math.min(remaining, demands[c] - state.allocation[c]) : 0;
        for (let n = 0; n <= upper; n++) enumerate(c + 1, remaining - n, [...additional, n]);
      };
      enumerate(0, capacities[f], []);
    }
    states = next;
  }
  return Math.max(...Array.from(states.values(), s => s.allocation.reduce((a, n) => a + n, 0)));
}

describe("independent allocation acceptance", () => {
  it("matches exhaustive attainable states in 36 four-community cases with up to six facilities", () => {
    let seed = 57281;
    const rand = (max: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max; };
    for (let caseId = 0; caseId < 36; caseId++) {
      const n = 1 + rand(6);
      const capacities = Array.from({ length: n }, () => rand(4));
      const costs = Array.from({ length: n }, () => rand(3));
      const demands = Array.from({ length: 4 }, () => rand(4));
      const routes = Array.from({ length: n }, () => Array.from({ length: 4 }, () => rand(3) !== 0));
      const ceiling = rand(5);
      const packet = smallPacket(capacities, costs, demands, routes, ceiling);
      const row = reviewPacket(packet).rows[0];
      expect(row.total, `case ${caseId}`).toBe(exhaustiveTotal(capacities, costs, demands, routes, ceiling));
      for (const witness of row.witnesses) {
        expect(witness.total).toBe(row.total);
        expect(new Set(witness.facilityIds).size).toBe(witness.facilityIds.length);
        const crews = witness.facilityIds.reduce((sum, id) => sum + costs[Number(id.slice(1))], 0);
        expect(witness.crewsUsed).toBe(crews);
        expect(crews).toBeLessThanOrEqual(ceiling);
        expect(witness.flows.reduce((sum, flow) => sum + flow.places, 0)).toBe(row.total);
        for (let f = 0; f < n; f++) {
          expect(witness.flows.filter(flow => flow.facilityId === `f${f}`).reduce((sum, flow) => sum + flow.places, 0)).toBeLessThanOrEqual(capacities[f]);
        }
        for (const flow of witness.flows) {
          expect(Number.isInteger(flow.places)).toBe(true);
          expect(flow.places).toBeGreaterThan(0);
          expect(witness.facilityIds).toContain(flow.facilityId);
          expect(routes[Number(flow.facilityId.slice(1))][Number(flow.communityId.slice(1))]).toBe(true);
        }
        for (const gap of witness.gaps) {
          const c = Number(gap.communityId.slice(1));
          const allocation = witness.flows.filter(flow => flow.communityId === gap.communityId).reduce((sum, flow) => sum + flow.places, 0);
          expect(gap).toEqual({ communityId: `c${c}`, demand: demands[c], allocated: allocation, gap: demands[c] - allocation });
          expect(gap.gap).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("exposes a new community outcome with zero total gain without asserting irrelevance", () => {
    const packet = smallPacket([1, 1], [1, 1], [1, 1], [[true, false], [false, false]], 1);
    const row = reviewPacket(packet).rows[0];
    const probe = row.probes.find(p => p.path.endsWith("access[3].available"));
    expect(probe).toBeDefined();
    expect(probe?.conditionalDelta).toBe(0);
    expect(probe?.distributionChanged).toBe(true);
    expect(probe?.interpretation).toBe("distribution-change");
    expect(probe?.afterGapVectors).toHaveLength(2);
    expect(row.questions.some(q => q.path === probe?.path)).toBe(false);
  });

  it("does not mutate entered facts and owns its returned evidence snapshot", () => {
    const packet = smallPacket([2], [1], [1, 1], [[true, true]], 1);
    const before = JSON.stringify(packet);
    const result = reviewPacket(packet);
    expect(JSON.stringify(packet)).toBe(before);
    packet.scenarios[0].arrangementFacts[0].facilities[0].capacity.value = 0;
    expect(result.factsUsed.scenarios[0].arrangementFacts[0].facilities[0].capacity.value).toBe(2);
  });

  it("uses stable IDs to keep witnesses and gaps invariant to input ordering and display names", () => {
    const packet = smallPacket([2, 1, 1], [1, 1, 1], [1, 1, 1, 1], [[true, true, false, false], [false, false, true, false], [false, false, false, true]], 2);
    const before = reviewPacket(packet).rows[0];
    packet.facilities.reverse(); packet.communities.reverse();
    packet.facilities.forEach(f => f.name = "Renamed");
    packet.communities.forEach(c => c.name = "Renamed");
    const scenario = packet.scenarios[0];
    scenario.demand.reverse(); scenario.access.reverse(); scenario.arrangementFacts[0].facilities.reverse();
    const after = reviewPacket(packet).rows[0];
    expect({ total: after.total, witnesses: after.witnesses, gaps: after.gapVectors }).toEqual({ total: before.total, witnesses: before.witnesses, gaps: before.gapVectors });
  });
});
