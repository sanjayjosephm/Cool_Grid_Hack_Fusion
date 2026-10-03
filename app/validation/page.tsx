import { NEIGHBOURHOODS } from "@/lib/data";
import { INVERTER_EFFICIENCY, OUTAGE_HOURS } from "@/lib/hub";
import { hubTests, sensitivity, WEIGHT_LABELS } from "@/lib/validation";

export const metadata = { title: "Validation · CoolGrid" };

const name = (id: string) => NEIGHBOURHOODS.find((n) => n.id === id)!.name;
const th = "border-b border-line px-2 py-1.5 text-left font-semibold";
const td = "border-b border-line px-2 py-1.5 align-top";
const Badge = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
  <span className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold text-white ${ok ? "bg-[#3E8E6A]" : "bg-[#C8402F]"}`}>{children}</span>
);

// Computed at build time from the same code the app runs, so these results cannot drift from the model.
export default function Validation() {
  const { base, rows } = sensitivity();
  const tests = hubTests();
  const passed = tests.filter((t) => t.ok).length;
  const top3Stable = rows.filter((r) => r.top3Same).length;
  const minRho = Math.min(...rows.map((r) => r.rho));
  const maxShift = Math.max(...rows.map((r) => r.maxShift));

  return (
    <main className="mx-auto max-w-[860px] px-6 pb-16 pt-10">
      <h1 className="mb-3 text-4xl">Validation results</h1>
      <p className="text-muted">Each check below runs the same code as the app every time the site is built. These tests check that the model behaves correctly and robustly with its stated assumptions. They do not prove real-world outcomes; that needs real data and council review (see Method and limits).</p>

      <div className="my-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4 ring-1 ring-line"><p className="font-serif text-3xl">{top3Stable}/{rows.length}</p><p className="text-sm text-muted">weight changes keep the same top 3 areas</p></div>
        <div className="rounded-xl bg-white p-4 ring-1 ring-line"><p className="font-serif text-3xl">{minRho.toFixed(2)}</p><p className="text-sm text-muted">lowest rank correlation with the original ranking (1 = identical)</p></div>
        <div className="rounded-xl bg-white p-4 ring-1 ring-line"><p className="font-serif text-3xl">{passed}/{tests.length}</p><p className="text-sm text-muted">backup-check cases match the hand calculation</p></div>
      </div>

      <h2 className="mt-10 text-2xl">1. Weight sensitivity</h2>
      <p className="my-3">Our weights are a judgement call, so we changed each one by 20% in both directions (10 scenarios) and re-ranked all {base.length} areas. A robust tool should still send money to the same places. The biggest move by any area in any scenario was {maxShift} place{maxShift === 1 ? "" : "s"}.</p>
      <p className="mb-3 text-sm text-muted">Original top 3: {base.slice(0, 3).map(name).join(", ")}.</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead><tr><th className={th}>Weight changed</th><th className={th}>Same top 3?</th><th className={th}>Rank correlation</th><th className={th}>Largest move</th><th className={th}>Category changes</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.weight + r.change}>
                <td className={td}>{WEIGHT_LABELS[r.weight]} {r.change}</td>
                <td className={td}><Badge ok={r.top3Same}>{r.top3Same ? "Yes" : "No"}</Badge></td>
                <td className={`${td} tabular-nums`}>{r.rho.toFixed(3)}</td>
                <td className={`${td} tabular-nums`}>{r.maxShift} place{r.maxShift === 1 ? "" : "s"}</td>
                <td className={td}>{r.categoryChanges.length ? r.categoryChanges.join(", ") : "None"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">Category changes list areas that cross a category boundary (for example from High priority to Support required). Areas sitting near a boundary should be reviewed by a planner rather than decided by the score alone.</p>

      <h2 className="mt-12 text-2xl">2. Cooling-hub backup check</h2>
      <p className="my-3">
        CoolGrid only counts a cooling hub as protecting residents if its backup power can run the cooling through a {OUTAGE_HOURS}-hour blackout.
        The check tests three things: the air-conditioning is wired to the backed-up circuit, the inverter can handle the compressor's start-up surge, and the usable battery energy (after the reserve and {Math.round((1 - INVERTER_EFFICIENCY) * 100)}% inverter losses) lasts the outage.
        Unknown inputs never pass. We worked each case below by hand and compared it with the app.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead><tr><th className={th}>Case</th><th className={th}>Hand calculation</th><th className={th}>Expected</th><th className={th}>App result</th><th className={th}>Match</th></tr></thead>
          <tbody>
            {tests.map((t) => (
              <tr key={t.name}>
                <td className={`${td} font-medium`}>{t.name}</td>
                <td className={`${td} text-muted`}>{t.why}</td>
                <td className={td}>{t.expected}{t.runtime !== undefined && ` (${t.runtime} h)`}</td>
                <td className={td}>{t.got.label}</td>
                <td className={td}><Badge ok={t.ok}>{t.ok ? "✓" : "✗"}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-12 text-2xl">Not yet validated</h2>
      <ul className="my-3 list-disc space-y-1 pl-6">
        <li>Neighbourhood scores, hub specifications and costs are illustrative sample data.</li>
        <li>Electrical endurance does not prove a safe indoor temperature; that needs a thermal assessment of each hub.</li>
        <li>Rankings have not yet been reviewed by council planners or compared with past heatwave health data.</li>
      </ul>
    </main>
  );
}
