import { describe, expect, it } from "vitest";
import { DEMO_COMMUNITIES, DEMO_CROSSINGS, demandFor, hoursCover, planningFacts, runDemoReview } from "../lib/demo-review";

const row = (crews: number | null, scenario: string, arrangement: string, o = {}) =>
  runDemoReview(crews, o).result.rows.find((r) => r.scenarioId === scenario && r.arrangementId === arrangement)!;
const ALBION = "20021";
const allocatedTo = (r: ReturnType<typeof row>, sal: string) => r.gapVectors![0].find((g) => g.communityId === sal)!.allocated;

describe("real-data continuity review (ABS + Vicmap data, labelled planning assumptions)", () => {
  it("never labels an assumption as public evidence", () => {
    for (const s of planningFacts(3).scenarios) {
      for (const d of s.demand ?? []) expect(d.amount!.status).toBe("illustrative");
      for (const a of s.arrangementFacts ?? []) for (const f of a.facilities ?? [])
        for (const k of ["nominated", "authorised", "suitable", "capacity", "crewsRequired"] as const) expect(f[k]!.status, `${f.facilityId}.${k}`).not.toBe("public");
    }
  });

  it("states the demand formula in every demand label", () => {
    for (const sal of DEMO_COMMUNITIES) {
      expect(demandFor(sal, "heat").source).toMatch(/aged 65\+/);
      expect(demandFor(sal, "flood").source).toMatch(/flood-overlay/);
    }
  });

  it("blocks every scenario and asks for crews when no crew count is entered", () => {
    for (const r of runDemoReview(null).result.rows) {
      expect(r.status).toBe("blocked");
      expect(r.blockers.some((b) => b.category === "crew-ceiling")).toBe(true);
    }
  });

  it("existing arrangement loses all outage capacity because the central library's battery fails the check", () => {
    expect(row(3, "outage", "existing").total).toBe(0);
    const b = row(3, "outage", "existing").blockers.find((x) => x.category === "backup" && x.facilityId === "fac-sunshine-library");
    expect(b?.kind).toBe("false");
    expect(b?.fact.source).toMatch(/Runs out after 5\.2 h/);
  });

  it("adding backup restores the outage result but does not change the flood result", () => {
    expect(row(3, "outage", "backup-added").total).toBe(row(3, "heat", "backup-added").total);
    expect(row(3, "flood", "backup-added").total).toBe(row(3, "flood", "existing").total);
  });

  it("with routed access, Albion is cut off in a flood unless local facilities are used", () => {
    expect(allocatedTo(row(6, "flood", "existing"), ALBION)).toBe(0);
    expect(allocatedTo(row(6, "flood", "backup-added"), ALBION)).toBe(0);
    expect(allocatedTo(row(6, "flood", "local-facilities"), ALBION)).toBeGreaterThan(0);
    expect(DEMO_CROSSINGS.some((id) => id.startsWith("x-ballarat-road"))).toBe(true);
  });

  it("names closed crossings as causes in the flood scenario", () => {
    const deps = row(3, "flood", "existing").blockers.filter((b) => b.category === "dependency");
    expect(deps.length).toBeGreaterThan(0);
    for (const d of deps) expect(d.kind).toBe("false");
  });

  it("more crews never reduce the places counted", () => {
    for (const s of ["heat", "outage", "flood"])
      for (const a of ["existing", "backup-added", "local-facilities"]) {
        const counts = [1, 2, 3, 6].map((c) => row(c, s, a).total!);
        for (let i = 1; i < counts.length; i++) expect(counts[i], `${s}/${a}`).toBeGreaterThanOrEqual(counts[i - 1]);
      }
  });
});

describe("P2-E7 opening hours", () => {
  const h = (value: string | null) => ({ value, status: "illustrative" as const, source: "test", date: "2026-10-03" });
  it("requires the facility to be open for the whole window", () => {
    expect(hoursCover(h("10:00-20:00")).value).toBe(true);
    expect(hoursCover(h("09:00-17:00")).value).toBe(false);
    expect(hoursCover(h("12:00-18:00")).value).toBe(true);
    expect(hoursCover(h(null)).value).toBeNull();
    expect(hoursCover(h("all day")).status).toBe("unknown");
  });

  it("community centres closing at 17:00 do not count in the 12:00-18:00 heat window until their hours are extended", () => {
    const blocked = row(6, "heat", "local-facilities").blockers.filter((b) => b.category === "suitability" && b.kind === "false").map((b) => b.facilityId);
    expect(blocked).toEqual(expect.arrayContaining(["fac-west-sunshine-cc", "fac-braybrook-cc"]));
    const later = { "fac-west-sunshine-cc": { hours: "09:00-18:00" }, "fac-braybrook-cc": { hours: "09:00-18:00" } };
    expect(row(6, "heat", "local-facilities", later).total!).toBeGreaterThan(row(6, "heat", "local-facilities").total!);
  });
});

describe("P2-E9 planner inputs", () => {
  it("labels an edited value as declared and re-runs the review with it", () => {
    const facts = planningFacts(3, { "fac-sunshine-library": { coolingPlaces: 10 } });
    const f = facts.scenarios[0].arrangementFacts![0].facilities!.find((x) => x.facilityId === "fac-sunshine-library")!;
    expect(f.capacity).toMatchObject({ value: 10, status: "declared" });
    expect(row(3, "heat", "existing", { "fac-sunshine-library": { coolingPlaces: 10 } }).total).toBe(10);
  });

  it("treats a value cleared by the planner as unknown, which blocks that facility", () => {
    const r = row(3, "heat", "existing", { "fac-sunshine-library": { coolingPlaces: null } });
    expect(r.blockers.some((b) => b.category === "capacity" && b.kind === "unknown")).toBe(true);
    expect(r.total).toBe(0);
  });
});
