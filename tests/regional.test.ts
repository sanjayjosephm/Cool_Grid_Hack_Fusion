import { describe, expect, it } from "vitest";
import region from "../lib/data/regions/shepparton.json";
import { regionalFacts, runRegionalReview } from "../lib/regional-review";

const MOOROOPNA = "21756";
const row = (crews: number, s: string, a: string) => runRegionalReview(crews).rows.find((r) => r.scenarioId === s && r.arrangementId === a)!;

describe("P3-2 regional data (Greater Shepparton)", () => {
  it("has the four communities, all with public ABS data", () => {
    expect(region.areas.map((a) => a.name)).toEqual(["Shepparton", "Mooroopna", "Kialla", "Shepparton North"]);
    for (const a of region.areas) for (const k of ["population", "irsdScore", "pct65Plus", "pctNoCar", "pctRiverine"] as const) expect(a[k].status, `${a.name}.${k}`).toBe("public");
  });

  it("places each facility inside a study suburb, from Vicmap", () => {
    for (const f of region.facilities) {
      expect(region.areas.some((a) => a.sal === f.sal), f.id).toBe(true);
      expect(f.location.status).toBe("public");
    }
  });

  it("routes every community to every facility and only references known crossings", () => {
    const ids = new Set(region.crossings.map((c) => c.id));
    expect(region.links).toHaveLength(region.areas.length * region.facilities.length);
    for (const l of region.links) {
      expect(l.distanceKm.value, `${l.from}>${l.to}`).not.toBeNull();
      for (const id of l.dependsOn.value ?? []) expect(ids.has(id), id).toBe(true);
    }
  });

  it("keeps every backup fact unknown, so nothing is assumed about a new region's facilities", () => {
    for (const f of region.facilities) for (const v of Object.values(f.backup)) expect(v.status).toBe("unknown");
  });
});

describe("P3-2 regional review", () => {
  it("uses the same scenarios with planner crews and labelled demand", () => {
    const facts = regionalFacts(4);
    expect(facts.scenarios.map((s) => s.id)).toEqual(["heat", "outage", "flood"]);
    for (const s of facts.scenarios) for (const d of s.demand ?? []) expect(d.amount!.status).toBe("illustrative");
  });

  it("counts no outage places and asks for backup evidence, because backup facts are unknown", () => {
    const r = row(4, "outage", "local-facilities");
    expect(r.total).toBe(0);
    expect(r.questions.some((q) => /backup/i.test(q.question))).toBe(true);
  });

  it("counts heat places when crews are available", () => {
    expect(row(4, "heat", "existing").total!).toBeGreaterThan(0);
  });

  it("makes Mooroopna's trip to Shepparton Library depend on flood crossings", () => {
    const link = region.links.find((l) => l.from === MOOROOPNA && l.to === "reg-shepparton-library")!;
    expect(link.dependsOn.value!.length).toBeGreaterThan(0);
  });
});
