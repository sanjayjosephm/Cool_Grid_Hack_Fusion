import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import PrintButton from "@/components/PrintButton";
import ScenarioResults, { causes } from "@/components/ScenarioResults";
import { facilityName, runDemoReview, SCENARIO_META } from "@/lib/demo-review";
import { parseOverrides } from "@/lib/overrides-url";
import { FACILITIES, formatSourcedValue, sourcedRows } from "@/lib/planning-data";
import { ARRANGEMENT_LABELS, parsePlannerConfig, plannerConfigUrl, type SearchParam } from "@/lib/planner-config";

export const metadata = { title: "Review brief · CoolGrid" };

const unresolved = FACILITIES.flatMap((facility) =>
  sourcedRows(facility, ["id", "name", "type", "sal"])
    .filter((row) => row.status === "unknown")
    .map((row) => ({ facility, row })),
);

export default function BriefPage({ searchParams }: { searchParams?: Record<string, SearchParam> }) {
  const config = parsePlannerConfig(searchParams ?? {});
  const configured = config.arrangement !== null && config.crews !== null;
  const overrides = parseOverrides(searchParams?.o);
  const policy = searchParams?.policy === "fair" ? "fair" : "max";
  const review = configured ? runDemoReview(config.crews, overrides) : null;
  const rows = review ? SCENARIO_META.map((s) => ({ s, row: review.result.rows.find((r) => r.scenarioId === s.id && r.arrangementId === config.arrangement)! })) : [];
  // Scenario with the most places not counted, among those the engine could calculate.
  const largestGap = rows
    .filter(({ row }) => row.gapVectors !== null)
    .map(({ s, row }) => ({ title: s.title, gap: row.gapVectors![0].reduce((t, g) => t + g.gap, 0) }))
    .sort((a, b) => b.gap - a.gap)[0];

  return (
    <>
    <PageHeader art="brief" eyebrow="Review brief" title="What to verify, who owns it, and what to exercise next.">
      Generated from the engine for the arrangement, crews and inputs you chose in the Continuity Lab. Print it or download the full engine brief.
    </PageHeader>
    <main data-reveal className="mx-auto max-w-4xl px-6 pb-16 pt-8 print:max-w-none print:px-0 print:py-0">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 print:mb-4">
        {/* The dark header covers this on screen; this title is what prints. */}
        <div className="hidden print:block">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted print:text-black">Council planning</p>
          <h1 className="text-4xl print:text-3xl">Review brief</h1>
          <p className="mt-2 text-sm text-muted print:text-black">CoolGrid planning output · based on the selected arrangement and current labelled inputs</p>
        </div>
        <PrintButton />
      </div>

      {config.errors.map((error) => <p key={error} role="alert" className="my-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 print:hidden">{error}</p>)}

      <section className="my-6 rounded-xl bg-white p-5 ring-1 ring-line print:break-inside-avoid print:ring-0 print:p-0">
        <h2 className="text-xl">Planning inputs</h2>
        {configured ? (
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div><dt className="text-sm text-muted">Arrangement</dt><dd className="font-semibold">{ARRANGEMENT_LABELS[config.arrangement!]}</dd></div>
            <div><dt className="text-sm text-muted">Available crews</dt><dd className="font-semibold">{config.crews}</dd></div>
            <div><dt className="text-sm text-muted">Allocation policy</dt><dd className="font-semibold">{policy === "fair" ? "Fair share between communities" : "Most places counted"}</dd></div>
            <div><dt className="text-sm text-muted">Facility inputs entered by the planner</dt><dd className="font-semibold">{Object.keys(overrides).length ? Object.entries(overrides).map(([id, o]) => `${facilityName(id)} (${Object.entries(o).map(([k, v]) => `${k} ${v ?? "unknown"}`).join(", ")})`).join("; ") : "None: illustrative placeholders"}</dd></div>
          </dl>
        ) : (
          <>
            <p className="mt-2 text-sm">A complete, validated arrangement and crew count were not provided in this link. No planning result has been assumed.</p>
            <Link className="mt-3 inline-block text-sm print:hidden" href={plannerConfigUrl("/continuity", config)}>Return to the Continuity Lab to choose inputs →</Link>
          </>
        )}
      </section>

      <section className="my-6">
        <h2 className="text-2xl">Unresolved facts and questions</h2>
        <p className="mt-2 text-sm text-muted print:text-black">
          These questions are generated from facility fields explicitly labelled unknown in the current data. Their stated source indicates who needs to verify them.
        </p>
        {unresolved.length > 0 ? (
          <div className="mt-4 space-y-3">
            {unresolved.map(({ facility, row }) => (
              <article key={`${facility.id}-${row.key}`} className="rounded-xl bg-white p-4 ring-1 ring-line print:break-inside-avoid print:ring-0 print:p-0">
                <p className="font-semibold">{facility.name} · {row.label}</p>
                <p className="mt-1 text-sm">Question: What is the verified value for {row.label.toLowerCase()}?</p>
                <p className="mt-1 text-sm"><span className="font-medium">Owner:</span> {row.source.toLowerCase().includes("facility owner") ? "Facility owner" : row.source}</p>
                <p className="mt-1 text-xs text-muted">Source note: {row.source}</p>
                <p className="mt-1 text-xs text-muted print:text-black">Status: {row.status} · data date: {row.date} · current value: {formatSourcedValue(row.value)}</p>
              </article>
            ))}
          </div>
        ) : <p className="mt-3 text-sm">There are no facility fields currently marked unknown.</p>}
      </section>

      {review && (
        <>
          <section className="my-6">
            <h2 className="text-2xl">Scenario findings</h2>
            <p className="mt-2 text-sm text-muted print:text-black">Each scenario is assessed separately; results are never added together. Places counted are conditional on the labelled inputs below and do not certify that any facility is ready or open.</p>
            <div className="mt-4"><ScenarioResults result={review.result} arrangement={config.arrangement} compact policy={policy} /></div>
          </section>

          <section className="my-6">
            <h2 className="text-2xl">Dependencies to verify, by owner</h2>
            {rows.map(({ s, row }) => {
              const list = causes(row);
              return (
                <div key={s.id} className="mt-4 rounded-xl bg-white p-4 ring-1 ring-line print:break-inside-avoid print:ring-0 print:p-0">
                  <h3 className="font-semibold">{s.title}</h3>
                  {list.length === 0 ? <p className="mt-1 text-sm">No blocking dependency in this scenario for the selected arrangement.</p> : (
                    <ul className="mt-2 space-y-2 text-sm">{list.map((c) => <li key={c.text}>{c.text}<span className="block text-xs text-muted">Owner: {c.owner}</span></li>)}</ul>
                  )}
                </div>
              );
            })}
          </section>

          <section className="my-6 rounded-xl border-l-4 border-amber bg-white p-5 ring-1 ring-line print:break-inside-avoid print:ring-0 print:p-0">
            <h2 className="text-xl">Recommended next exercise</h2>
            <p className="mt-2 text-sm">
              Run a tabletop exercise of the scenario with the largest gap for this arrangement
              ({largestGap ? `${largestGap.title}: ${largestGap.gap} places not counted` : "no scenario could be calculated"}),
              and verify the dependencies listed above with their owners before relying on the arrangement.
            </p>
            <a className="mt-3 inline-block text-sm print:hidden" download="coolgrid-review-brief.md" href={`data:text/markdown;charset=utf-8,${encodeURIComponent(review.brief)}`}>Download the full engine brief (Markdown) →</a>
          </section>
        </>
      )}

      <p className="mt-8 border-t border-line pt-3 text-xs text-muted print:text-black">
        This brief reflects the inputs in its URL. Facility planning values may be illustrative or unknown; verify them with the named data owner before relying on an assessment.
      </p>
    </main>
    </>
  );
}
