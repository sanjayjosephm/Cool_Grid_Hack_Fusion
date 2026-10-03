import { DATA_SOURCE_ROWS, GENERATED_DATA_DATES } from "@/lib/planning-data";
import { planningDataChecks } from "@/lib/planning-validation";
import { sensitivity } from "@/lib/area-context";
import { checkBackup } from "@/lib/backup";
import { CASES, spec } from "@/lib/backup-cases";
import { reviewPacket, validateReviewPacket } from "@/lib/continuity";
import { runDemoReview } from "@/lib/demo-review";
import { worksheetComparison, worksheetCsv } from "@/lib/planning-tools";
import { AREAS } from "@/lib/planning-data";
import fictional from "@/examples/review-packet.json";

// Doc 04 reference: two communities needing 4 places each, three arrangements, three separate scenarios.
const GOLDEN = { existing: [8, 0, 4], backup: [8, 8, 4], local: [8, 8, 8] };
function goldenRows() {
  const v = validateReviewPacket(fictional);
  if (!v.valid) return [];
  const result = reviewPacket(v.packet);
  return Object.entries(GOLDEN).map(([id, expected]) => {
    const got = ["heat", "outage", "flood"].map((s) => result.rows.find((r) => r.scenarioId === s && r.arrangementId === id)?.total ?? null);
    return { id, expected, got, ok: got.every((x, i) => x === expected[i]) };
  });
}
function backupCaseRows() {
  return CASES.map((c) => {
    const got = checkBackup(spec(c.s));
    return { ...c, got, ok: got.status === c.expected && (c.runtime === undefined || Math.abs((got.runtimeHours ?? -1) - c.runtime) < 0.01) };
  });
}
function reviewInvariants() {
  const r = runDemoReview(3).result;
  const blocked = runDemoReview(null).result;
  const demand = (id: string) => r.factsUsed.scenarios.find((s) => s.id === id)!.demand.reduce((t, d) => t + (d.amount.value ?? 0), 0);
  const capacityOk = r.rows.every((row) => row.witnesses.every((w) => w.flows.every((f) => f.places >= 0)));
  return [
    { name: "No scenario ever counts more places than its demand", ok: r.rows.every((row) => row.total === null || row.total <= demand(row.scenarioId)) },
    { name: "Gaps plus allocations equal demand for every community", ok: r.rows.every((row) => (row.gapVectors ?? []).every((v) => v.every((g) => g.gap + g.allocated === g.demand))) },
    { name: "Crews used never exceed the crews entered", ok: r.rows.every((row) => row.witnesses.every((w) => w.crewsUsed <= 3)) },
    { name: "Without a crew count, every scenario is blocked and asks for it", ok: blocked.rows.every((row) => row.status === "blocked" && row.blockers.some((b) => b.category === "crew-ceiling")) },
    { name: "Flows are never negative", ok: capacityOk },
    { name: "Backup added changes the outage result but not the flood result", ok: (() => { const t = (s: string, a: string) => r.rows.find((x) => x.scenarioId === s && x.arrangementId === a)!.total; return t("outage", "backup-added") !== t("outage", "existing") && t("flood", "backup-added") === t("flood", "existing"); })() },
  ];
}

export const metadata = { title: "Validation · CoolGrid" };

const th = "border-b border-line px-3 py-2 text-left font-semibold";
const td = "border-b border-line px-3 py-2 align-top";

export default function Validation() {
  const checks = planningDataChecks();
  const golden = goldenRows();
  const backupCases = backupCaseRows();
  const sens = sensitivity();
  const invariants = reviewInvariants();
  const sheetResult = runDemoReview(3).result;
  const sheet = worksheetComparison(sheetResult);
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

      <h2 className="mb-3 mt-12 text-2xl">Continuity engine checks</h2>
      <p className="mb-3 text-sm text-muted">Computed when the site is built, from the same code the app runs. The full automated suite runs with <code>npm test</code>.</p>

      <h3 className="mt-6 text-lg">Golden comparison (doc 04 reference example, fictional evidence)</h3>
      <table className="mt-2 w-full border-collapse text-sm">
        <thead><tr className="text-left"><th className="border-b border-line py-1.5">Arrangement</th><th className="border-b border-line py-1.5">Heat / outage / flood (places)</th><th className="border-b border-line py-1.5">Expected</th><th className="border-b border-line py-1.5">Match</th></tr></thead>
        <tbody>
          {golden.map((g) => (
            <tr key={g.id}><td className="border-b border-line py-1.5">{g.id}</td><td className="border-b border-line py-1.5 tabular-nums">{g.got.join(" / ")}</td><td className="border-b border-line py-1.5 tabular-nums">{g.expected.join(" / ")}</td><td className="border-b border-line py-1.5">{g.ok ? "✓" : "✗"}</td></tr>
          ))}
        </tbody>
      </table>

      <h3 className="mt-8 text-lg">Backup check against hand calculations ({backupCases.filter((c) => c.ok).length}/{backupCases.length})</h3>
      <table className="mt-2 w-full border-collapse text-sm">
        <thead><tr className="text-left"><th className="border-b border-line py-1.5">Case</th><th className="border-b border-line py-1.5">Hand calculation</th><th className="border-b border-line py-1.5">Expected</th><th className="border-b border-line py-1.5">App</th><th className="border-b border-line py-1.5">Match</th></tr></thead>
        <tbody>
          {backupCases.map((c) => (
            <tr key={c.name} className="align-top"><td className="border-b border-line py-1.5 pr-2">{c.name}</td><td className="border-b border-line py-1.5 pr-2 text-muted">{c.why}</td><td className="border-b border-line py-1.5">{c.expected}{c.runtime !== undefined && ` (${c.runtime} h)`}</td><td className="border-b border-line py-1.5">{c.got.status}{c.got.runtimeHours !== undefined && ` (${c.got.runtimeHours.toFixed(2)} h)`}</td><td className="border-b border-line py-1.5">{c.ok ? "✓" : "✗"}</td></tr>
          ))}
        </tbody>
      </table>

      <h3 className="mt-8 text-lg">Area context score: weight sensitivity</h3>
      <p className="mt-1 text-sm">Each of the {sens.rows.length / 2} weights changed by ±20%. The top 3 areas stayed the same in {sens.rows.filter((r) => r.top3Same).length}/{sens.rows.length} cases; lowest rank correlation {Math.min(...sens.rows.map((r) => r.rho)).toFixed(2)}; largest move {Math.max(...sens.rows.map((r) => r.maxShift))} place(s). Original top 3: {sens.base.slice(0, 3).map((sal) => AREAS.find((a) => a.sal === sal)!.name).join(", ")}.</p>
      <table className="mt-2 w-full border-collapse text-sm">
        <thead><tr className="text-left"><th className="border-b border-line py-1.5">Weight changed</th><th className="border-b border-line py-1.5">Same top 3</th><th className="border-b border-line py-1.5">Rank correlation</th><th className="border-b border-line py-1.5">Largest move</th></tr></thead>
        <tbody>
          {sens.rows.map((r) => (
            <tr key={r.key + r.change}><td className="border-b border-line py-1.5">{r.label} {r.change}</td><td className="border-b border-line py-1.5">{r.top3Same ? "Yes" : "No"}</td><td className="border-b border-line py-1.5 tabular-nums">{r.rho.toFixed(3)}</td><td className="border-b border-line py-1.5 tabular-nums">{r.maxShift}</td></tr>
          ))}
        </tbody>
      </table>

      <h3 className="mt-8 text-lg">Compared with a simple worksheet</h3>
      <p className="mt-1 text-sm">A competent spreadsheet adds up the places of every nominated facility (capped at demand). The engine also checks backup power, opening hours, crews and flooded crossings. Where they differ, the engine names why. 3 crews, illustrative inputs. {sheet.filter((x) => x.differs).length} of {sheet.length} results differ.</p>
      <table className="mt-2 w-full border-collapse text-sm">
        <thead><tr className="text-left"><th className="border-b border-line py-1.5">Scenario</th><th className="border-b border-line py-1.5">Arrangement</th><th className="border-b border-line py-1.5">Worksheet</th><th className="border-b border-line py-1.5">Engine</th><th className="border-b border-line py-1.5">Why they differ</th></tr></thead>
        <tbody>
          {sheet.map((x) => (
            <tr key={x.scenario + x.arrangement} className="align-top"><td className="border-b border-line py-1.5 pr-2">{x.scenario}</td><td className="border-b border-line py-1.5 pr-2">{x.arrangement}</td><td className="border-b border-line py-1.5 tabular-nums">{x.worksheet}</td><td className="border-b border-line py-1.5 tabular-nums">{x.engine ?? "blocked"}</td><td className="border-b border-line py-1.5">{x.differs ? x.reasons.join(", ") : "Same"}</td></tr>
          ))}
        </tbody>
      </table>
      <a className="mt-2 inline-block text-sm" download="coolgrid-worksheet-comparison.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(worksheetCsv(sheetResult))}`}>Download the worksheet comparison (CSV) →</a>

      <h3 className="mt-8 text-lg">Real-data review invariants</h3>
      <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
        {invariants.map((i) => <li key={i.name}>{i.ok ? "✓" : "✗"} {i.name}</li>)}
      </ul>

      <h2 className="mb-2 mt-10 text-2xl">Interpretation and limits</h2>
      <ul className="list-disc space-y-2 pl-6 text-sm text-muted">
        <li>Public dataset provenance does not make facility service capacity, staffing or backup values public; those remain illustrative or unknown as labelled.</li>
        <li>Access links are illustrative straight-line approximations, not routed paths or evacuation advice.</li>
        <li>Unknown required facts must block affected results and be raised for verification by an owner.</li>
      </ul>
    </main>
  );
}
