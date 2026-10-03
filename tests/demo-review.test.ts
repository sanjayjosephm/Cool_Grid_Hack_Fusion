import { describe, expect, it } from "vitest";
import { DEMO_COMMUNITIES, DEMO_CROSSINGS, demandFor, planningFacts, runDemoReview } from "../lib/demo-review";

const total = (crews: number | null, scenario: string, arrangement: string) =>
  runDemoReview(crews).result.rows.find((r) => r.scenarioId === scenario && r.arrangementId === arrangement)!;
const ALBION = "20021";

describe("real-data continuity review (ABS + Vicmap data, labelled planning assumptions)", () => {
  it("never labels an assumption as public evidence", () => {
    const facts = planningFacts(3);
    for (const s of facts.scenarios) {
      for (const d of s.demand ?? []) expect(d.amount!.status).toBe("illustrative");
      for (const a of s.arrangementFacts ?? []) for (const f of a.facilities ?? [])
        for (const k of ["nominated", "authorised", "suitable", "applyNominalCapacity"] as const) expect(f[k]!.status, `${f.facilityId}.${k}`).not.toBe("public");
    }
  });

  it("states the demand formula in every demand label", () => {
    for (const sal of DEMO_COMMUNITIES) {
      expect(demandFor(sal, "heat").source).toMatch(/aged 65\+/);
      expect(demandFor(sal, "flood").source).toMatch(/flood-overlay/);
    }
  });

  it("blocks every scenario and asks for crews when no crew count is entered", () => {
    for (const row of runDemoReview(null).result.rows) {
      expect(row.status).toBe("blocked");
      expect(row.blockers.some((b) => b.category === "crew-ceiling")).toBe(true);
    }
  });

  it("existing arrangement loses all outage capacity because the central library's battery fails the check", () => {
    expect(total(3, "outage", "existing").total).toBe(0);
    const backupBlock = total(3, "outage", "existing").blockers.find((b) => b.category === "backup" && b.facilityId === "fac-sunshine-library");
    expect(backupBlock?.kind).toBe("false");
    expect(backupBlock?.fact.source).toMatch(/Runs out after 5\.2 h/);
  });

  it("adding backup restores the outage result but does not change the flood result", () => {
    expect(total(3, "outage", "backup-added").total).toBe(total(3, "heat", "backup-added").total);
    expect(total(3, "flood", "backup-added").total).toBe(total(3, "flood", "existing").total);
  });

  it("Albion is cut off in the flood scenario under every arrangement, because all its routes cross a flood overlay", () => {
    for (const a of ["existing", "backup-added", "local-facilities"]) {
      const gap = total(6, "flood", a).gapVectors![0].find((g) => g.communityId === ALBION)!;
      expect(gap.allocated, a).toBe(0);
    }
    expect(DEMO_CROSSINGS.some((id) => id.startsWith("x-ballarat-road"))).toBe(true);
  });

  it("names the closed crossings as the cause of flood gaps", () => {
    const deps = total(3, "flood", "local-facilities").blockers.filter((b) => b.category === "dependency");
    expect(deps.length).toBeGreaterThan(0);
    for (const d of deps) expect(d.kind).toBe("false");
  });

  it("more crews never reduce the places counted", () => {
    for (const s of ["heat", "outage", "flood"])
      for (const a of ["existing", "backup-added", "local-facilities"]) {
        const counts = [1, 2, 3, 6].map((c) => total(c, s, a).total!);
        for (let i = 1; i < counts.length; i++) expect(counts[i], `${s}/${a}`).toBeGreaterThanOrEqual(counts[i - 1]);
      }
  });
});
