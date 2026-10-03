// Engine output for one review, shown per scenario. Shared by the Continuity Lab and the review brief.
import type { Blocker, ReviewResult, ReviewRow } from "@/lib/continuity";
import { areaName, crossingName, facilityName, SCENARIO_META } from "@/lib/demo-review";
import { ARRANGEMENTS, ARRANGEMENT_LABELS, type Arrangement } from "@/lib/planner-config";

const demandOf = (result: ReviewResult, scenarioId: string) =>
  result.factsUsed.scenarios.find((s) => s.id === scenarioId)!.demand.reduce((t, d) => t + (d.amount.value ?? 0), 0);

/** Plain-language cause for a blocker, using names rather than IDs. */
export function causeText(b: Blocker): string {
  const fac = b.facilityId ? facilityName(b.facilityId) : "";
  switch (b.category) {
    case "backup": return b.kind === "false" ? `${fac}: backup fails the outage check. ${b.fact.source.split(": ").slice(1).join(": ")}` : `${fac}: backup not verified (${b.fact.source.split(": ").slice(1).join(": ") || "inputs unknown"})`;
    case "dependency": return `${crossingName(b.dependencyId!)} crossing is ${b.kind === "false" ? "closed" : "of unknown status"}: routes that rely on it cannot be counted.`;
    case "crew-ceiling": return "Crew count not entered, so no allocation can be calculated.";
    case "demand": return `Demand for ${b.communityId ? areaName(b.communityId) : "a community"} is unknown.`;
    default: return b.explanation;
  }
}

/** One cause per distinct fact (a closed crossing blocks many paths but is one cause). */
export function causes(row: ReviewRow): { text: string; owner: string; kind: Blocker["kind"] }[] {
  const seen = new Map<string, { text: string; owner: string; kind: Blocker["kind"] }>();
  for (const b of row.blockers) {
    const key = b.category === "dependency" ? `dep:${b.dependencyId}` : `${b.category}:${b.facilityId ?? ""}:${b.communityId ?? ""}`;
    if (!seen.has(key)) seen.set(key, { text: causeText(b), owner: b.roleHypothesis, kind: b.kind });
  }
  return [...seen.values()];
}

export default function ScenarioResults({ result, arrangement, compact = false }: { result: ReviewResult; arrangement: Arrangement | null; compact?: boolean }) {
  const rowFor = (scenarioId: string, a: Arrangement) => result.rows.find((r) => r.scenarioId === scenarioId && r.arrangementId === a)!;
  return (
    <div className={`grid gap-4 ${compact ? "" : "lg:grid-cols-3"}`}>
      {SCENARIO_META.map((s) => {
        const demand = demandOf(result, s.id);
        const row = arrangement ? rowFor(s.id, arrangement) : null;
        const gaps = row?.gapVectors?.[0] ?? null;
        const witness = row?.witnesses[0];
        const rowCauses = row ? causes(row) : [];
        return (
          <article key={s.id} className="rounded-2xl bg-white p-5 ring-1 ring-line print:break-inside-avoid print:ring-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue">Scenario</p>
            <h3 className="mt-1 text-xl">{s.title}</h3>
            <p className="text-sm text-muted">{s.window}. {s.note}</p>

            <table className="mt-4 w-full text-sm">
              <caption className="sr-only">Places counted by arrangement</caption>
              <thead><tr className="text-left text-xs uppercase tracking-wide text-muted"><th className="pb-1 font-semibold">Arrangement</th><th className="pb-1 text-right font-semibold">Places counted</th></tr></thead>
              <tbody>
                {ARRANGEMENTS.map((a) => {
                  const r = rowFor(s.id, a);
                  return (
                    <tr key={a} className={`border-t border-line ${a === arrangement ? "font-semibold" : ""}`}>
                      <td className="py-1">{ARRANGEMENT_LABELS[a]}{a === arrangement && " ◀"}</td>
                      <td className="py-1 text-right tabular-nums">{r.status === "blocked" ? "Blocked" : `${r.total} of ${demand}`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!row ? <p className="mt-4 text-sm text-muted">Select an arrangement to see gaps and causes.</p>
              : row.status === "blocked" ? (
                <div role="status" className="mt-4 rounded-lg border-l-4 border-amber bg-paper p-3 text-sm">
                  <p className="font-semibold">Blocked: required input missing</p>
                  <ul className="mt-1 list-disc pl-5">{rowCauses.filter((c) => c.kind === "unknown").slice(0, 3).map((c) => <li key={c.text}>{c.text}</li>)}</ul>
                </div>
              ) : (
                <>
                  <h4 className="mt-4 text-sm font-semibold">Gap by community</h4>
                  <ul className="mt-1 space-y-1 text-sm">
                    {gaps!.map((g) => (
                      <li key={g.communityId} className="flex justify-between gap-2">
                        <span>{areaName(g.communityId)}</span>
                        <span className={`tabular-nums ${g.gap > 0 ? "font-semibold text-[#C8402F]" : "text-[#3E8E6A]"}`}>{g.gap > 0 ? `${g.gap} of ${g.demand} not counted` : `all ${g.demand} counted`}</span>
                      </li>
                    ))}
                  </ul>
                  {witness && <p className="mt-2 text-xs text-muted">Crews used: {witness.crewsUsed}. Facilities counted: {witness.facilityIds.length ? witness.facilityIds.map(facilityName).join(", ") : "none"}.</p>}
                  {rowCauses.length > 0 && (
                    <>
                      <h4 className="mt-4 text-sm font-semibold">Why: dependencies limiting this result</h4>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{rowCauses.slice(0, 4).map((c) => <li key={c.text}>{c.text}</li>)}</ul>
                      {rowCauses.length > 4 && <p className="mt-1 text-xs text-muted">and {rowCauses.length - 4} more in the review brief.</p>}
                    </>
                  )}
                  {row.questions.length > 0 && (
                    <>
                      <h4 className="mt-4 text-sm font-semibold">Next: verify</h4>
                      <ul className="mt-1 space-y-2 text-sm">{row.questions.slice(0, compact ? 10 : 2).map((q) => <li key={q.path}>{q.question}<span className="block text-xs text-muted">Owner: {q.roleHypothesis}</span></li>)}</ul>
                    </>
                  )}
                </>
              )}
          </article>
        );
      })}
    </div>
  );
}
