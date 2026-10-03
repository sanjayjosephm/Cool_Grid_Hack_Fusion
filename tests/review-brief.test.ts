import { describe, expect, it } from "vitest";
import entered from "../examples/review-packet.json";
import { renderReviewBrief } from "../lib/brief";
import { reviewPacket, validateReviewPacket } from "../lib/continuity";
import type { ReviewPacket, ReviewResult } from "../lib/review-contract";
import type { Sourced } from "../lib/sourced";

const fixture = (): ReviewPacket => JSON.parse(JSON.stringify(entered)) as ReviewPacket;
const unknown = <T>(source: string): Sourced<T> => ({ value: null, status: "unknown", source, date: "2026-10-03", licence: "Synthetic evidence" });
const row = (result: ReviewResult, scenarioId: string, arrangementId: string) =>
  result.rows.find(r => r.scenarioId === scenarioId && r.arrangementId === arrangementId)!;
const section = (brief: string, label: string, id: string) =>
  brief.split(`### ${label} (${id})\n`)[1]?.split("\n### ")[0] ?? "";

describe("review brief from checkout-local fictional evidence", () => {
  it("validates the fixture and reports the independently calculated golden comparisons", () => {
    expect(validateReviewPacket(fixture()).valid).toBe(true);
    const result = reviewPacket(fixture());
    expect(["heat", "outage", "flood"].map(id => row(result, id, "existing").total)).toEqual([8, 0, 4]);
    expect(["heat", "outage", "flood"].map(id => row(result, id, "backup").total)).toEqual([8, 8, 4]);
    expect(["heat", "outage", "flood"].map(id => row(result, id, "local").total)).toEqual([8, 8, 8]);
    const brief = renderReviewBrief(result);
    expect(brief).toContain("| Existing central | conditional | 0 places |");
    expect(brief).toContain("Highest counted total among calculable arrangements in this scenario: Entered local (8 places).");
    expect(brief).toContain("Service: floodRelief. Window: 10:00\\-14:00 fictional flood window. Units: places.");
    expect(brief).toContain("no combined cross-scenario score is calculated");
    expect(brief).toContain("does not certify physical service readiness");
    expect(brief).toContain("Before community outcomes:");
    expect(brief).toContain("After community outcomes:");
    expect(brief).toContain("Conditional delta: 4 places.");
  });

  it("derives changed zero-capacity comparisons and prose instead of inheriting the golden answers", () => {
    const packet = fixture();
    for (const scenario of packet.scenarios) for (const arrangement of scenario.arrangementFacts) {
      arrangement.facilities.find(f => f.facilityId === "central")!.capacity.value = 0;
    }
    const result = reviewPacket(packet);
    expect(["heat", "outage", "flood"].map(id => row(result, id, "backup").total)).toEqual([0, 0, 0]);
    const brief = renderReviewBrief(result);
    expect(brief).not.toContain("| Entered central backup | conditional | 8 places |");
    expect(brief).toContain("| Entered central backup | conditional | 0 places |");
    expect(brief.match(/Highest counted total among calculable arrangements in this scenario: Entered local \(8 places\)\./g)).toHaveLength(3);
    expect(brief).toContain("Zero standalone delta creates no default extra verification work");
    expect(brief).toContain("It does not prove this fact irrelevant when multiple blockers remain");
  });

  it("changes nomination descriptions and winners when an arrangement label retains different facts", () => {
    const packet = fixture();
    for (const scenario of packet.scenarios) {
      const arrangement = scenario.arrangementFacts.find(a => a.arrangementId === "backup")!;
      arrangement.facilities.forEach(f => { f.nominated.value = f.facilityId !== "central"; });
    }
    const result = reviewPacket(packet);
    expect(["heat", "outage", "flood"].map(id => row(result, id, "backup").total)).toEqual([8, 8, 8]);
    const brief = renderReviewBrief(result);
    const changed = section(brief, "Entered central backup", "backup");
    expect(changed).toContain("Entered nominations: West local (west\\-local), East local (east\\-local).");
    expect(changed).toContain("Intentional exclusions: Central (central).");
    expect(changed).not.toContain("Entered nominations: Central (central).");
    expect(brief).toContain("Highest counted total among calculable arrangements in this scenario: Entered central backup, Entered local (8 places).");
  });

  it("keeps unknown nominations and backup provenance alongside targeted questions", () => {
    const packet = fixture();
    const arrangement = packet.scenarios[1].arrangementFacts.find(a => a.arrangementId === "backup")!;
    arrangement.facilities.find(f => f.facilityId === "central")!.backup = unknown("Synthetic backup evidence pending");
    arrangement.facilities.find(f => f.facilityId === "east-local")!.nominated = unknown("Synthetic nomination intent pending");
    const result = reviewPacket(packet);
    expect(row(result, "outage", "backup").total).toBe(0);
    const brief = renderReviewBrief(result);
    expect(brief).toContain("Unknown nomination intent: East local (east\\-local).");
    expect(brief).toContain("Synthetic backup evidence pending");
    expect(brief).toContain("Synthetic nomination intent pending");
    expect(brief).toContain("| unknown | Synthetic backup evidence pending | 2026\\-10\\-03 | Synthetic evidence |");
    expect(brief).toContain("Roles below are hypotheses for review routing, not assigned people.");
    expect(row(result, "outage", "backup").questions.length).toBeGreaterThan(0);
  });

  it("keeps unknown scenario counts null and avoids ranking their arrangements", () => {
    const packet = fixture();
    packet.scenarios[0].demand[0].amount = unknown("Synthetic demand not entered");
    packet.scenarios[1].crewCeiling = unknown("Synthetic crew ceiling not entered");
    const result = reviewPacket(packet);
    expect(row(result, "heat", "existing").total).toBeNull();
    expect(row(result, "heat", "existing").gapVectors).toBeNull();
    expect(row(result, "outage", "backup").total).toBeNull();
    const brief = renderReviewBrief(result);
    expect(brief.match(/No arrangement total is calculable in this scenario/g)).toHaveLength(2);
    expect(brief).toContain("| Existing central | blocked | not calculable | not calculable |");
    expect(brief).toContain("Community gaps: not calculable.");
    expect(brief).toContain("this probe does not invent counts");
  });

  it("shows both local community outcomes under a one-crew outage", () => {
    const packet = fixture();
    packet.scenarios[1].crewCeiling.value = 1;
    const result = reviewPacket(packet);
    expect(row(result, "outage", "backup").total).toBe(8);
    expect(row(result, "outage", "local").total).toBe(4);
    const outcomes = row(result, "outage", "local").gapVectors!;
    expect(outcomes).toHaveLength(2);
    expect(outcomes.map(g => g.map(c => c.gap))).toContainEqual([0, 4]);
    expect(outcomes.map(g => g.map(c => c.gap))).toContainEqual([4, 0]);
    const brief = renderReviewBrief(result);
    expect(brief).toContain("| Entered local | conditional | 4 places | 2 |");
    expect(brief).toContain("West community (west) | 4 | 0 | 4 |");
    expect(brief).toContain("East community (east) | 4 | 0 | 4 |");
  });

  it("renders a zero-gain distribution probe without calling it a total benefit", () => {
    const result = reviewPacket(fixture());
    const target = row(result, "heat", "existing");
    const before = [{ communityId: "west", demand: 4, allocated: 4, gap: 0 }, { communityId: "east", demand: 4, allocated: 0, gap: 4 }];
    const after = [{ communityId: "west", demand: 4, allocated: 0, gap: 4 }, { communityId: "east", demand: 4, allocated: 4, gap: 0 }];
    target.probes.push({ path: "synthetic.distribution", beforeFact: { value: false, status: "illustrative", source: "Synthetic distribution", date: "2026-10-03" },
      afterFact: { value: true, status: "illustrative", source: "Synthetic distribution probe", date: "2026-10-03" },
      beforeTotal: 4, afterTotal: 4, conditionalDelta: 0, beforeGapVectors: [before], afterGapVectors: [after],
      distributionChanged: true, interpretation: "distribution-change" });
    const brief = renderReviewBrief(result);
    expect(brief).toContain("Counted total before: 4 places. Counted total after: 4 places. Conditional delta: 0 places.");
    expect(brief).toContain("Distribution changed: yes. Interpretation: distribution\\-change.");
    expect(brief).toContain("community distribution can change without a total gain");
  });

  it("escapes untrusted Markdown and HTML while retaining exact facts as fenced JSON", () => {
    const packet = fixture();
    packet.title = "<script> | [link](https://invalid.example) ```";
    packet.facilities[0].name = "Central\n## injected <img src=x> | *bold*";
    packet.arrangements[0].label = "[arrangement](evil)";
    const result = reviewPacket(packet);
    const snapshot = JSON.stringify(result);
    const brief = renderReviewBrief(result);
    const humanText = brief.split("## Exact facts used")[0];
    expect(humanText).not.toContain("<script>");
    expect(humanText).not.toContain("<img src=x>");
    expect(humanText).not.toContain("\n## injected");
    expect(humanText).toContain("&lt;script&gt; \\| \\[link\\]\\(https://invalid\\.example\\) \\`\\`\\`");
    expect(humanText).toContain("\\[arrangement\\]\\(evil\\)");
    const fenced = brief.match(/(`{3,})json\n([\s\S]*)\n\1/)!;
    expect(fenced[1].length).toBeGreaterThan(3);
    expect(JSON.parse(fenced[2])).toEqual(packet);
    expect(JSON.stringify(result)).toBe(snapshot);
    expect(renderReviewBrief(result)).toBe(brief);
  });
});
