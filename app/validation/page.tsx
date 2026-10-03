import { DATA_SOURCE_ROWS, GENERATED_DATA_DATES } from "@/lib/planning-data";
import { planningDataChecks } from "@/lib/planning-validation";

export const metadata = { title: "Validation · CoolGrid" };

const th = "border-b border-line px-3 py-2 text-left font-semibold";
const td = "border-b border-line px-3 py-2 align-top";

export default function Validation() {
  const checks = planningDataChecks();
  const passed = checks.filter((check) => check.passed).length;

  return (
    <main className="mx-auto max-w-6xl px-6 pb-16 pt-10">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">P1 · Data provenance and checks</p>
      <h1 className="mb-3 text-4xl">Validation</h1>
      <p className="max-w-3xl text-muted">
        Dataset labels and integrity checks are shown from the data used by the app. Passing these checks does not establish that planning assumptions or real-world operations are correct.
      </p>

      <div className="my-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4 ring-1 ring-line">
          <p className="font-serif text-3xl">{passed}/{checks.length}</p>
          <p className="text-sm text-muted">planning data checks pass at build time</p>
        </div>
        <div className="rounded-xl bg-white p-4 ring-1 ring-line">
          <p className="font-serif text-3xl">{DATA_SOURCE_ROWS.length}</p>
          <p className="text-sm text-muted">distinct source/date/licence/status combinations in the loaded records</p>
        </div>
        <div className="rounded-xl bg-white p-4 ring-1 ring-line">
          <p className="font-serif text-lg">Engine tests available</p>
          <p className="text-sm text-muted">Scenario test outcomes are verified by the automated test suite. This page does not yet display those outcomes.</p>
        </div>
      </div>

      <h2 className="mb-3 mt-10 text-2xl">Dataset provenance</h2>
      <p className="mb-3 text-sm text-muted">
        Data files were generated on {Object.values(GENERATED_DATA_DATES).join(", ")}. The per-value data date below is retained as recorded by the dataset.
      </p>
      <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-line">
        <table className="w-full border-collapse text-sm">
          <thead><tr><th className={th}>Source / dataset</th><th className={th}>Date</th><th className={th}>Licence</th><th className={th}>Status</th></tr></thead>
          <tbody>
            {DATA_SOURCE_ROWS.map((row) => (
              <tr key={`${row.source}|${row.date}|${row.licence ?? ""}|${row.status}`}>
                <td className={td}>{row.source}</td>
                <td className={td}>{row.date}</td>
                <td className={td}>{row.licence ?? "Not applicable / not supplied"}</td>
                <td className={td}><span className="rounded bg-paper px-2 py-1 capitalize">{row.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 mt-12 text-2xl">Data checks</h2>
      <p className="mb-3 text-sm text-muted">These checks are computed from the imported records when this page is rendered; the totals are not manually entered.</p>
      <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-line">
        <table className="w-full border-collapse text-sm">
          <thead><tr><th className={th}>Check</th><th className={th}>Result</th><th className={th}>Details</th></tr></thead>
          <tbody>
            {checks.map((check) => (
              <tr key={check.name}>
                <td className={`${td} font-medium`}>{check.name}</td>
                <td className={td}><span className={`rounded px-2 py-1 text-xs font-semibold text-white ${check.passed ? "bg-[#3E8E6A]" : "bg-[#C8402F]"}`}>{check.passed ? "PASS" : "FAIL"}</span></td>
                <td className={td}>{check.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="my-8 rounded-xl border-l-4 border-amber bg-white p-5 ring-1 ring-line">
        <h2 className="text-xl">Continuity engine tests</h2>
        <p className="mt-2 text-sm">
          The continuity engine and its automated tests are available in this codebase. This page is not yet connected to their validation outputs. The data checks above describe the loaded records and do not certify scenario outcomes.
        </p>
      </div>

      <h2 className="mb-2 mt-10 text-2xl">Interpretation and limits</h2>
      <ul className="list-disc space-y-2 pl-6 text-sm text-muted">
        <li>Public dataset provenance does not make facility service capacity, staffing or backup values public; those remain illustrative or unknown as labelled.</li>
        <li>Access links are illustrative straight-line approximations, not routed paths or evacuation advice.</li>
        <li>Unknown required facts must block affected results and be raised for verification by an owner.</li>
      </ul>
    </main>
  );
}
