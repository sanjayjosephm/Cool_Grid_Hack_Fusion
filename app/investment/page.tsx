import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { SCENARIO_META } from "@/lib/demo-review";
import { investmentOptions, PACKAGES } from "@/lib/planning-tools";
import type { SearchParam } from "@/lib/planner-config";

export const metadata = { title: "Investment Gate · CoolGrid" };

const BUDGETS = [25_000, 50_000, 80_000, 125_000];
const money = (n: number) => `$${n.toLocaleString("en-AU")}`;
const first = (p: SearchParam) => (Array.isArray(p) ? p[0] : p);
const th = "border-b border-line px-2 py-1.5 text-left font-semibold";
const td = "border-b border-line px-2 py-1.5 align-top";

// P3-1: compare upgrade packages under a budget. Effects come from the review engine; costs are labelled placeholders.
export default function InvestmentPage({ searchParams }: { searchParams?: Record<string, SearchParam> }) {
  const budgetIn = Number(first(searchParams?.budget));
  const crewsIn = Number(first(searchParams?.crews));
  const budget = BUDGETS.includes(budgetIn) ? budgetIn : 80_000;
  const crews = Number.isInteger(crewsIn) && crewsIn >= 1 && crewsIn <= 10 ? crewsIn : 3;
  const options = investmentOptions(budget, crews);
  const base = options.find((o) => o.packages.length === 0)!;
  const label = (id: string) => PACKAGES.find((p) => p.id === id)!.label;

  return (
    <>
    <PageHeader eyebrow="Investment Gate" title="Which upgrades are worth checking first?"
      stats={[{ value: PACKAGES.length, label: "upgrade packages" }, { value: options.length, label: `affordable combinations within ${money(budget)}` }, { value: options.filter((o) => !o.dominated).length, label: "worth checking" }]} />
    <main className="mx-auto max-w-5xl px-6 pb-16 pt-8">
      <p className="mt-3 max-w-3xl text-muted">
        Each combination of upgrades is run through the same review engine for the <b>local facilities</b> arrangement. Places gained come from the engine;
        costs are <b>illustrative placeholders</b> to be replaced with assessed quotes. Results stay separate for each scenario and are never added together.
      </p>

      <form className="my-6 flex flex-wrap items-end gap-4 rounded-2xl bg-white p-5 ring-1 ring-line" method="get">
        <label className="text-sm font-semibold">Budget
          <select name="budget" defaultValue={budget} className="mt-1 block rounded-lg border border-line px-3 py-2 font-normal">
            {BUDGETS.map((b) => <option key={b} value={b}>{money(b)}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Available crews
          <input name="crews" type="number" min="1" max="10" defaultValue={crews} className="mt-1 block w-24 rounded-lg border border-line px-3 py-2 font-normal" />
        </label>
        <button className="rounded-full bg-ink px-5 py-2.5 font-semibold text-white">Compare</button>
      </form>

      <h2 className="mt-8 text-2xl">Upgrade packages</h2>
      <table className="mt-3 w-full border-collapse text-sm">
        <thead><tr><th className={th}>Package</th><th className={th}>What it changes</th><th className={th}>Cost (placeholder)</th></tr></thead>
        <tbody>{PACKAGES.map((p) => <tr key={p.id}><td className={`${td} font-medium`}>{p.label}</td><td className={td}>{p.note}</td><td className={`${td} tabular-nums`}>{money(p.cost.value!)}</td></tr>)}</tbody>
      </table>

      <h2 className="mt-10 text-2xl">Affordable combinations within {money(budget)}, {crews} crews</h2>
      <p className="mt-1 text-sm text-muted">Places counted per scenario, with the change from no upgrades in brackets. &ldquo;Worth checking&rdquo; means no cheaper-or-equal combination does at least as well in every scenario.</p>
      <div className="overflow-x-auto">
        <table className="mt-3 w-full min-w-[720px] border-collapse text-sm">
          <thead><tr><th className={th}>Combination</th><th className={th}>Cost</th>{SCENARIO_META.map((s) => <th key={s.id} className={th}>{s.title}</th>)}<th className={th}>Verdict</th></tr></thead>
          <tbody>
            {options.map((o) => (
              <tr key={o.packages.join("+") || "none"} className={o.dominated ? "text-muted" : "bg-[#3E8E6A]/[0.07] font-medium"}>
                <td className={td}>{o.packages.length ? o.packages.map(label).join(" + ") : "No upgrades"}</td>
                <td className={`${td} tabular-nums`}>{money(o.cost)}</td>
                {o.totals.map((t, i) => <td key={i} className={`${td} tabular-nums`}>{t}{t !== base.totals[i] && <span className="text-[#3E8E6A]"> (+{t - base.totals[i]})</span>}</td>)}
                <td className={td}>{o.dominated ? "Beaten by a cheaper or equal option" : <b className="text-[#3E8E6A]">Worth checking</b>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-6 border-l-4 border-amber bg-white px-4 py-3 text-sm">
        A package that adds nothing here may still matter with more crews or different facility inputs. Try a different crew count, or edit facility inputs in the <Link href="/continuity?arrangement=local-facilities&crews=3">Continuity Lab</Link>.
        This view does not establish value for money: it shows which assessed quotes are worth requesting first.
      </p>
    </main>
    </>
  );
}
