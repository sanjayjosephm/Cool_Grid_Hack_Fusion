import { describe, expect, it } from "vitest";
import { runDemoReview, SCENARIO_META } from "../lib/demo-review";
import { parseOverrides, encodeOverrides } from "../lib/overrides-url";
import { fairShare, investmentOptions, PACKAGES, recommendArrangement, worksheetComparison, worksheetCsv } from "../lib/planning-tools";

const r3 = runDemoReview(3).result;

describe("P2-E8 worksheet comparison", () => {
  it("never counts fewer places than the engine, because the worksheet skips the checks", () => {
    for (const x of worksheetComparison(r3)) if (x.engine !== null) expect(x.worksheet, `${x.scenario}/${x.arrangement}`).toBeGreaterThanOrEqual(x.engine);
  });

  it("gives a reason for every difference", () => {
    for (const x of worksheetComparison(r3)) if (x.differs) expect(x.reasons.length, `${x.scenario}/${x.arrangement}`).toBeGreaterThan(0);
  });

  it("finds the backup failure the worksheet misses in the outage scenario", () => {
    const x = worksheetComparison(r3).find((y) => y.scenario === "Heat + outage" && y.arrangement === "Existing arrangement")!;
    expect(x.worksheet).toBeGreaterThan(0);
    expect(x.engine).toBe(0);
    expect(x.reasons).toContain("backup");
  });

  it("exports one CSV row per scenario and arrangement", () => {
    expect(worksheetCsv(r3).split("\n")).toHaveLength(1 + 9);
  });
});

describe("P2-E10 recommended arrangement", () => {
  it("picks an arrangement that is best in at least one scenario and explains it", () => {
    const rec = recommendArrangement(r3);
    expect(rec.arrangement).not.toBeNull();
    expect(rec.wins.length).toBeGreaterThan(0);
    for (const w of rec.wins) expect(rec.perScenario.find((p) => p.scenario === w)!.best).toContain(rec.arrangement);
  });

  it("recommends nothing when no scenario can be calculated", () => {
    expect(recommendArrangement(runDemoReview(null).result).arrangement).toBeNull();
  });
});

describe("P3-5 fair-share allocation", () => {
  it("never counts more places than the engine's maximum, nor gives a community more than it needs", () => {
    for (const s of SCENARIO_META) for (const a of ["existing", "backup-added", "local-facilities"]) {
      const f = fairShare(r3, s.id, a);
      if (!f) continue;
      expect(f.total).toBeLessThanOrEqual(f.maxTotal);
      for (const c of f.allocated) expect(c.allocated).toBeLessThanOrEqual(c.demand);
    }
  });

  it("raises the smallest share compared with the most-places allocation", () => {
    const row = r3.rows.find((x) => x.scenarioId === "flood" && x.arrangementId === "local-facilities")!;
    const maxMin = Math.min(...row.gapVectors![0].map((g) => g.allocated / g.demand));
    expect(fairShare(r3, "flood", "local-facilities")!.minShare).toBeGreaterThanOrEqual(maxMin);
  });

  it("prefers facility sets that leave no community unreachable", () => {
    expect(fairShare(r3, "flood", "local-facilities")!.unreachable).toEqual([]);
  });
});

describe("P3-1 investment gate", () => {
  it("stays within budget and always includes the no-upgrade baseline", () => {
    const opts = investmentOptions(50_000, 3);
    expect(opts.some((o) => o.packages.length === 0)).toBe(true);
    for (const o of opts) expect(o.cost).toBeLessThanOrEqual(50_000);
  });

  it("labels every cost as an illustrative placeholder", () => {
    for (const p of PACKAGES) expect(p.cost.status).toBe("illustrative");
  });

  it("marks an option as beaten only when another is no dearer and at least as good everywhere", () => {
    const opts = investmentOptions(125_000, 6);
    for (const o of opts.filter((x) => x.dominated))
      expect(opts.some((x) => x !== o && x.cost <= o.cost && x.totals.every((t, i) => t >= o.totals[i]))).toBe(true);
  });

  it("shows the central battery restoring outage places", () => {
    const opts = investmentOptions(125_000, 3);
    const none = opts.find((o) => o.packages.length === 0)!, battery = opts.find((o) => o.packages.join() === "central-battery")!;
    expect(battery.totals[1]).toBeGreaterThan(none.totals[1]);
  });
});

describe("planner inputs in the page address", () => {
  it("round-trips valid edits and drops anything invalid", () => {
    const o = { "fac-sunshine-library": { coolingPlaces: 80, hours: "09:00-18:00", coolingOnBackup: null } };
    expect(parseOverrides(encodeOverrides(o)!)).toEqual(o);
    expect(parseOverrides(JSON.stringify({ "not-a-facility": { crews: 1 }, "fac-braybrook-cc": { crews: -1, hours: "noon", extra: 1 } }))).toEqual({});
    expect(parseOverrides("{bad json")).toEqual({});
  });
});
