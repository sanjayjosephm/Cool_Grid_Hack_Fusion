// Engine output for one review, shown per scenario. Shared by the Continuity Lab and the review brief.
import type { ReviewResult } from "@/lib/continuity";
import { SCENARIO_META } from "@/lib/demo-review";
import { causes, MELBOURNE_NAMES, type Names } from "@/lib/review-causes";
import { fairShare } from "@/lib/planning-tools";

export { causes };
import { ARRANGEMENTS, ARRANGEMENT_LABELS, type Arrangement } from "@/lib/planner-config";

const demandOf = (result: ReviewResult, scenarioId: string) =>
  result.factsUsed.scenarios.find((s) => s.id === scenarioId)!.demand.reduce((t, d) => t + (d.amount.value ?? 0), 0);

export type Policy = "max" | "fair";

// Accent and icon per scenario, matching the landing page story.
const LOOK: Record<string, { color: string; icon: string }> = {
  heat: { color: "#E2562F", icon: "☀" }, outage: { color: "#B07A10", icon: "⚡" }, flood: { color: "#2B6CB0", icon: "≈" },
};
const barColor = (pct: number) => (pct >= 0.6 ? "#3E8E6A" : pct > 0 ? "#E0A030" : "#C8402F");

type Props = { result: ReviewResult; arrangement: Arrangement | null; compact?: boolean; policy?: Policy; names?: Names; arrangements?: readonly Arrangement[] };

export default function ScenarioResults({ result, arrangement, compact = false, policy = "max", names = MELBOURNE_NAMES, arrangements = ARRANGEMENTS }: Props) {
  const areaName = names.area, facilityName = names.facility;
  const rowFor = (scenarioId: string, a: Arrangement) => result.rows.find((r) => r.scenarioId === scenarioId && r.arrangementId === a)!;
  return (
    <div className={`grid gap-4 ${compact ? "" : "lg:grid-cols-3"}`}>
      {SCENARIO_META.map((s) => {
        const demand = demandOf(result, s.id);
        const row = arrangement ? rowFor(s.id, arrangement) : null;
        const fair = row && policy === "fair" ? fairShare(result, s.id, row.arrangementId) : null;
        const gaps = fair ? fair.allocated : row?.gapVectors?.[0] ?? null;
        const witness = row?.witnesses[0];
        const rowCauses = row ? causes(row, names) : [];
        return (
          <article key={s.id} className="relative overflow-hidden rounded-2xl bg-white p-5 ring-1 ring-line transition-shadow hover:shadow-lg print:break-inside-avoid print:ring-0">
            <span className="absolute inset-x-0 top-0 h-1" style={{ background: LOOK[s.id]?.color }} aria-hidden="true" />
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl text-white" style={{ background: LOOK[s.id]?.color }} aria-hidden="true">{LOOK[s.id]?.icon}</span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: LOOK[s.id]?.color }}>Scenario</p>
                <h3 className="text-xl leading-tight">{s.title}</h3>
              </div>
            </div>
            <p className="text-sm text-muted">{s.window}. {s.note}</p>

            <table className="mt-4 w-full text-sm">
              <caption className="sr-only">Places counted by arrangement</caption>
              <thead><tr className="text-left text-xs uppercase tracking-wide text-muted"><th className="pb-1 font-semibold">Arrangement</th><th className="pb-1 text-right font-semibold">Places counted</th></tr></thead>
              <tbody>
                {arrangements.map((a, i) => {
                  const r = rowFor(s.id, a);
                  const pct = r.total === null ? 0 : r.total / Math.max(1, demand);
                  return (
                    <tr key={a} className={`border-t border-line ${a === arrangement ? "font-semibold" : ""}`}>
                      <td className="py-1.5 pr-2">
                        {ARRANGEMENT_LABELS[a]}{a === arrangement && " ◀"}
                        {/* Share of demand counted; key re-mounts the bar so it re-animates when the value changes. */}
                        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-line/60" aria-hidden="true">
                          <span key={`${r.total}`} className="grow-x block h-full rounded-full" style={{ width: `${pct * 100}%`, background: barColor(pct), ["--d" as string]: `${i * 120}ms` }} />
                        </span>
                      </td>
                      <td className="py-1.5 text-right align-top tabular-nums">{r.status === "blocked" ? "Blocked" : `${r.total} of ${demand}`}</td>
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
                  <h4 className="mt-4 text-sm font-semibold">Gap by community{fair ? " (fair share)" : ""}</h4>
                  {fair && <p className="mt-1 text-xs text-muted">
                    Every reachable community first gets at least {Math.round(fair.minShare * 100)}% of its places; remaining places are then filled. Total {fair.total} (most places possible: {fair.maxTotal}).
                    {fair.unreachable.length > 0 && <> No counted facility can be reached from {fair.unreachable.map(areaName).join(", ")}.</>}
                  </p>}
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
