import Link from "next/link";
import PrintButton from "@/components/PrintButton";
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

  return (
    <main className="mx-auto max-w-4xl px-6 pb-16 pt-10 print:max-w-none print:px-0 print:py-0">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 print:mb-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted print:text-black">P1 · Council planning</p>
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

      <section className="my-6 rounded-xl border-l-4 border-amber bg-white p-5 ring-1 ring-line print:break-inside-avoid print:ring-0 print:p-0">
        <h2 className="text-xl">Scenario findings and recommended exercise</h2>
        <p className="mt-2 text-sm">
          Not available: the Continuity Lab engine is not present in this branch, so scenario allocations, shortfalls, their causes and engine-derived verification or exercise recommendations cannot yet be generated. No findings have been fabricated.
        </p>
      </section>

      <p className="mt-8 border-t border-line pt-3 text-xs text-muted print:text-black">
        This brief reflects the inputs in its URL. Facility planning values may be illustrative or unknown; verify them with the named data owner before relying on an assessment.
      </p>
    </main>
  );
}
