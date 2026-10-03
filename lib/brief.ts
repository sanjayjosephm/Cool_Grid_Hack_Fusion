import type {
  GapVector, ReviewResult, ReviewRow, ReviewScenario,
} from "./review-contract";
import type { Sourced } from "./sourced";

/** Escape entered labels in headings, paragraphs and tables; they are never HTML. */
function text(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/[\\`*_[\]{}()#+\-.!|]/g, "\\$&")
    .replace(/[\r\n\t\u0000-\u001f\u007f]/g, " ");
}

function known(fact: Sourced<unknown>): boolean {
  return fact.status !== "unknown" && fact.value !== null;
}

function value(fact: Sourced<unknown>): string {
  return known(fact) ? text(JSON.stringify(fact.value)) : "unknown (null)";
}

function provenance(fact: Sourced<unknown>): string[] {
  return [value(fact), text(fact.status), text(fact.source), text(fact.date),
    fact.licence === undefined ? "not supplied" : text(fact.licence)];
}

function table(headers: string[], rows: string[][]): string[] {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map(row => `| ${row.join(" | ")} |`),
    "",
  ];
}

function codeBlock(value: unknown): string {
  const json = JSON.stringify(value, null, 2);
  // A malicious label containing a Markdown fence cannot terminate this block.
  let longest = 2;
  for (const match of json.matchAll(/`+/g)) longest = Math.max(longest, match[0].length);
  const fence = "`".repeat(longest + 1);
  return `${fence}json\n${json}\n${fence}`;
}

/** Pure Markdown projection. All numerical comparisons come from result rows. */
export function renderReviewBrief(result: ReviewResult): string {
  const packet = result.factsUsed;
  const facilities = new Map(packet.facilities.map(f => [f.id, f.name]));
  const communities = new Map(packet.communities.map(c => [c.id, c.name]));
  const arrangements = new Map(packet.arrangements.map(a => [a.id, a.label]));
  const facility = (id: string) => `${text(facilities.get(id) ?? id)} (${text(id)})`;
  const community = (id: string) => `${text(communities.get(id) ?? id)} (${text(id)})`;
  const arrangement = (id: string) => text(arrangements.get(id) ?? id);
  const count = (n: number | null, units: string) => n === null ? "not calculable" : `${n} ${text(units)}`;

  const gapLines = (vectors: GapVector[] | null): string[] => {
    if (vectors === null) return ["Community gaps: not calculable.", ""];
    if (vectors.length === 0) return ["No community-gap vectors returned.", ""];
    return table(["Outcome", "Community", "Entered demand", "Allocated", "Gap"],
      vectors.flatMap((vector, i) => vector.map(gap => [
        String(i + 1), community(gap.communityId), String(gap.demand),
        String(gap.allocated), String(gap.gap),
      ])));
  };

  const rowLines = (row: ReviewRow, scenario: ReviewScenario): string[] => {
    const lines = [
      `### ${arrangement(row.arrangementId)} (${text(row.arrangementId)})`, "",
      `Result status: ${text(row.status)}. Conditional counted total: ${count(row.total, scenario.units)}.`, "",
    ];
    const entered = scenario.arrangementFacts.find(a => a.arrangementId === row.arrangementId);
    const facts = entered?.facilities ?? [];
    const nominated = facts.filter(f => known(f.nominated) && f.nominated.value === true);
    const excluded = facts.filter(f => known(f.nominated) && f.nominated.value === false);
    const unknown = facts.filter(f => !known(f.nominated));
    const names = (items: typeof facts) => items.length ? items.map(f => facility(f.facilityId)).join(", ") : "none";
    lines.push(`Entered nominations: ${names(nominated)}.`, "",
      `Intentional exclusions: ${names(excluded)}.`, "",
      `Unknown nomination intent: ${names(unknown)}.`, "",
      "False nominations are intentional exclusions; unknown nomination intent requires confirmation before counting.", "");
    if (facts.length) lines.push(...table(
      ["Facility", "Nominated", "Status", "Source", "Date", "Licence"],
      facts.map(f => [facility(f.facilityId), ...provenance(f.nominated)]),
    ));

    lines.push("#### Community outcomes", "", ...gapLines(row.gapVectors));
    lines.push("#### Allocation witnesses", "");
    if (row.witnesses.length === 0) lines.push("No allocation witnesses returned.", "");
    row.witnesses.forEach((witness, i) => {
      lines.push(`Witness ${i + 1}: ${count(witness.total, scenario.units)}; ${witness.crewsUsed} crews used; selected facilities: ${witness.facilityIds.length ? witness.facilityIds.map(facility).join(", ") : "none"}.`, "");
      if (witness.flows.length) lines.push(...table(["Facility", "Community", text(scenario.units)],
        witness.flows.map(flow => [facility(flow.facilityId), community(flow.communityId), String(flow.places)])));
      else lines.push("No positive allocation flows in this witness.", "");
      lines.push(...gapLines([witness.gaps]));
    });

    lines.push("#### False and unknown blockers", "");
    if (!row.blockers.length) lines.push("No false or unknown blockers returned.", "");
    else lines.push(...table(
      ["Fact path", "Kind / category", "Explanation", "Value", "Status", "Source", "Date", "Licence", "Verification-role hypothesis"],
      row.blockers.map(blocker => [text(blocker.path), `${text(blocker.kind)} / ${text(blocker.category)}`,
        text(blocker.explanation), ...provenance(blocker.fact), text(blocker.roleHypothesis)]),
    ));

    lines.push("#### One-factor conditional probes", "",
      "Each probe changes only the stated fact. An access-dependency probe sets that state known-open while retaining path topology, availability and all other dependencies. These are conditional model changes, not measured benefits.", "");
    if (!row.probes.length) lines.push("No one-factor probes returned.", "");
    row.probes.forEach(probe => {
      lines.push(`Probe: ${text(probe.path)}.`, "", ...table(
        ["State", "Value", "Status", "Source", "Date", "Licence"],
        [["Before", ...provenance(probe.beforeFact)], ["After", ...provenance(probe.afterFact)]],
      ));
      lines.push(`Counted total before: ${count(probe.beforeTotal, scenario.units)}. Counted total after: ${count(probe.afterTotal, scenario.units)}. Conditional delta: ${count(probe.conditionalDelta, scenario.units)}.`, "",
        `Distribution changed: ${probe.distributionChanged ? "yes" : "no"}. Interpretation: ${text(probe.interpretation)}.`, "",
        "Before community outcomes:", "", ...gapLines(probe.beforeGapVectors),
        "After community outcomes:", "", ...gapLines(probe.afterGapVectors));
      if (probe.conditionalDelta === 0) lines.push(
        "Zero standalone delta creates no default extra verification work. It does not prove this fact irrelevant when multiple blockers remain; community distribution can change without a total gain and can inform an owner's inquiry. Unknown facts still require evidence independently of this probe.", "");
      if (probe.conditionalDelta === null) lines.push(
        "The delta remains uncalculated because required scenario evidence is unknown; this probe does not invent counts.", "");
    });

    lines.push("#### Targeted verification questions", "",
      "Roles below are hypotheses for review routing, not assigned people.", "");
    if (!row.questions.length) lines.push("No default verification questions returned.", "");
    else lines.push(...table(["Fact path", "Question", "Reason", "Verification-role hypothesis"],
      row.questions.map(q => [text(q.path), text(q.question), text(q.reason), text(q.roleHypothesis)])));
    return lines;
  };

  const lines = [
    `# ${text(result.title)}`, "", `Contract: ${text(result.version)}.`, "",
    "This review counts places conditionally from entered evidence. Excluding an unresolved contribution does not establish zero actual capacity. Totals are separate for each scenario, service and window; no combined cross-scenario score is calculated. Windows are metadata, and this review does not certify physical service readiness.", "",
  ];
  for (const scenario of packet.scenarios) {
    const rows = result.rows.filter(row => row.scenarioId === scenario.id);
    lines.push(`## ${text(scenario.label)} (${text(scenario.id)})`, "",
      `Service: ${text(scenario.service)}. Window: ${text(scenario.window)}. Units: ${text(scenario.units)}. Scenario kind: ${text(scenario.kind)}.`, "", ...table(
        ["Entered scenario fact", "Value", "Status", "Source", "Date", "Licence"],
        [["Crew ceiling", ...provenance(scenario.crewCeiling)],
          ...scenario.demand.map(d => [`Demand: ${community(d.communityId)}`, ...provenance(d.amount)])],
      ), ...table(["Arrangement", "Status", "Counted total", "Distinct community outcomes"],
        rows.map(row => [arrangement(row.arrangementId), text(row.status), count(row.total, scenario.units),
          row.gapVectors === null ? "not calculable" : String(row.gapVectors.length)])));
    const calculable = rows.filter((row): row is ReviewRow & { total: number } => row.total !== null);
    if (calculable.length) {
      const highest = Math.max(...calculable.map(row => row.total));
      const labels = calculable.filter(row => row.total === highest).map(row => arrangement(row.arrangementId));
      lines.push(`Highest counted total among calculable arrangements in this scenario: ${labels.join(", ")} (${count(highest, scenario.units)}).`, "");
      if (calculable.length < rows.length) lines.push("An arrangement with an uncalculated total cannot be ranked by this comparison.", "");
    } else lines.push("No arrangement total is calculable in this scenario; no numerical comparison is made.", "");
    rows.forEach(row => lines.push(...rowLines(row, scenario)));
  }
  lines.push("## Model limits", "");
  lines.push(...table(["Machine-readable code", "Limit"],
    result.modelLimits.map(limit => [text(limit.code), text(limit.description)])));
  lines.push("The returned witnesses represent deterministic maximum allocations from selected facility subsets and distinct best-subset community-gap vectors. They do not enumerate every within-subset flow tie or implement an equity policy.", "",
    "## Exact facts used", "",
    "The complete packet below retains entered values, unknowns, statuses, sources, dates, optional licences and contextual evidence. It is the input for this review; context alone does not establish demand, closure, suitability or readiness.", "",
    codeBlock(packet), "");
  return lines.join("\n");
}
