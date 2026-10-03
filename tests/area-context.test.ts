import { describe, expect, it } from "vitest";
import { areaScores, equipmentRule, facilityFloodWarnings, groupContext, sensitivity, WEIGHTS } from "../lib/area-context";
import { AREAS } from "../lib/planning-data";

describe("P1-E6 area context score", () => {
  it("scores every study area between 0 and 100", () => {
    const s = areaScores();
    expect(s).toHaveLength(AREAS.length);
    for (const a of s) {
      expect(a.score).toBeGreaterThanOrEqual(0);
      expect(a.score).toBeLessThanOrEqual(100);
    }
  });

  it("ranks the most disadvantaged suburb above the least disadvantaged one", () => {
    const order = areaScores().map((a) => a.name);
    expect(order.indexOf("Broadmeadows")).toBeLessThan(order.indexOf("Brunswick West")); // IRSD 774 vs 1048
  });

  it("is driven by the weights: all weight on disadvantage reproduces the SEIFA order", () => {
    const only = Object.fromEntries(Object.keys(WEIGHTS).map((k) => [k, k === "irsdScore" ? 1 : 0])) as typeof WEIGHTS;
    const bySeifa = [...AREAS].sort((a, b) => (a.irsdScore.value as number) - (b.irsdScore.value as number)).map((a) => a.sal);
    expect(areaScores(only).map((a) => a.sal)).toEqual(bySeifa);
  });

  it("records a sensitivity result for every weight changed by ±20%", () => {
    const { rows } = sensitivity();
    expect(rows).toHaveLength(Object.keys(WEIGHTS).length * 2);
    for (const r of rows) {
      expect(r.rho).toBeGreaterThan(0.8);
      expect(r.maxShift).toBeLessThanOrEqual(3);
    }
  });
});

describe("P1-E4 group context", () => {
  it("reports each group share with its ABS source", () => {
    const g = groupContext("20021");
    expect(g.name).toBe("Albion");
    expect(g.groups).toHaveLength(5);
    for (const x of g.groups) {
      expect(x.pct).toBeGreaterThanOrEqual(0);
      expect(x.source).toMatch(/^ABS Census 2021/);
    }
    expect(g.languages[0]).toBe("Vietnamese");
  });
});

describe("P1-E5 flood rules", () => {
  const fac = (id: string, overlay: string | null) => ({ id, name: id, floodOverlay: { value: overlay } });

  it("flags a facility inside a riverine overlay (fictional positive control)", () => {
    const w = facilityFloodWarnings([fac("test-in", "riverine"), fac("test-out", "none")]);
    expect(w.map((x) => x.subject)).toEqual(["test-in"]);
    expect(w[0].message).toMatch(/riverine flood overlay/);
  });

  it("treats unknown overlay status as a question, not as safe", () => {
    expect(facilityFloodWarnings([fac("test-unknown", null)])[0].message).toMatch(/unknown/);
  });

  it("raises no facility warning for the real facilities, none of which is in an overlay", () => {
    expect(facilityFloodWarnings()).toEqual([]);
  });

  it("requires raised equipment where part of a suburb is in a flood overlay", () => {
    expect(equipmentRule("20935")?.message).toMatch(/above flood level/); // Footscray
  });
});
