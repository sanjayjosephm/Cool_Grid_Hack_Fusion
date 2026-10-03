import Link from "next/link";
import AutoForm from "@/components/AutoForm";
import PageHeader from "@/components/PageHeader";
import ScenarioResults from "@/components/ScenarioResults";
import type { SearchParam } from "@/lib/planner-config";
import { ARRANGEMENT_LABELS } from "@/lib/planner-config";
import { REGION, REGION_ARRANGEMENTS, REGION_NAMES, runRegionalReview } from "@/lib/regional-review";

export const metadata = { title: "Regional review · CoolGrid" };

const first = (p: SearchParam) => (Array.isArray(p) ? p[0] : p);
const th = "border-b border-line px-2 py-1.5 text-left font-semibold";
const td = "border-b border-line px-2 py-1.5";

// P3-2: the same pipeline, engine and rules applied to a regional council.
export default function RegionalPage({ searchParams }: { searchParams?: Record<string, SearchParam> }) {
  const arrangement = REGION_ARRANGEMENTS.find((a) => a === first(searchParams?.arrangement)) ?? "existing";
  const crewsIn = Number(first(searchParams?.crews));
  const crews = Number.isInteger(crewsIn) && crewsIn >= 0 && crewsIn <= 20 ? crewsIn : 4;
  const result = runRegionalReview(crews);

  return (
    <>
    <PageHeader eyebrow="Regional review" title={<>{REGION.region}: same tool, regional council.</>}
      stats={[{ value: REGION.areas.reduce((t, a) => t + (a.population.value ?? 0), 0).toLocaleString("en-AU"), label: "residents" }, { value: `${Math.round(Math.min(...REGION.areas.map((a) => a.pctRiverine.value ?? 0)))}–${Math.round(Math.max(...REGION.areas.map((a) => a.pctRiverine.value ?? 0)))}%`, label: "of each suburb in a river flood overlay" }, { value: REGION.crossings.length, label: "flood-exposed roads on routes" }]} />
    <main className="mx-auto max-w-6xl px-6 pb-16 pt-8">
      <p className="mt-3 max-w-3xl text-muted">
        The same public-data pipeline (ABS Census and SEIFA, Vicmap flood overlays, facilities and roads), engine and rules, applied to a regional city on the Goulburn River.
        In the October 2022 flood, the Causeway between Shepparton and Mooroopna closed and cut Mooroopna off from Shepparton&apos;s services. The flood scenario below tests that kind of dependency.
      </p>

      <h2 className="mt-8 text-2xl">Communities</h2>
      <div className="overflow-x-auto">
        <table className="mt-3 w-full min-w-[640px] border-collapse text-sm">
          <thead><tr><th className={th}>Suburb</th><th className={th}>Residents</th><th className={th}>SEIFA decile</th><th className={th}>Aged 65+</th><th className={th}>No car</th><th className={th}>Area in riverine flood overlay</th></tr></thead>
          <tbody>{REGION.areas.map((a) => (
            <tr key={a.sal}><td className={`${td} font-medium`}>{a.name}</td><td className={`${td} tabular-nums`}>{a.population.value?.toLocaleString("en-AU")}</td><td className={td}>{a.irsdDecile.value}</td><td className={td}>{a.pct65Plus.value}%</td><td className={td}>{a.pctNoCar.value}%</td><td className={td}>{a.pctRiverine.value}%</td></tr>
          ))}</tbody>
        </table>
      </div>
      <p className="mt-1 text-xs text-muted">ABS Census 2021 and SEIFA 2021; Vicmap Planning flood overlays. All CC BY 4.0.</p>

      <h2 className="mt-8 text-2xl">Facilities</h2>
      <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
        {REGION.facilities.map((f) => <li key={f.id}><b>{f.name}</b> ({f.type}, {REGION_NAMES.area(f.sal ?? "")}){f.floodOverlay.value !== "none" && <span className="text-[#C8402F]"> · inside a {f.floodOverlay.value} flood overlay</span>}. Places and crews are placeholders; backup facts not yet provided.</li>)}
      </ul>

      <AutoForm className="my-6 flex flex-wrap items-end gap-4 rounded-2xl bg-white p-5 ring-1 ring-line">
        <fieldset>
          <legend className="mb-1 text-sm font-semibold">Arrangement</legend>
          {REGION_ARRANGEMENTS.map((a) => <label key={a} className="mr-4 inline-flex items-center gap-1.5 text-sm"><input type="radio" name="arrangement" value={a} defaultChecked={a === arrangement} />{ARRANGEMENT_LABELS[a]}</label>)}
        </fieldset>
        <label className="text-sm font-semibold">Available crews
          <input name="crews" type="number" min="0" max="20" defaultValue={crews} className="mt-1 block w-24 rounded-lg border border-line px-3 py-2 font-normal" />
        </label>
        <button className="rounded-full bg-ink px-5 py-2.5 font-semibold text-white">Update</button>
      </AutoForm>

      <ScenarioResults result={result} arrangement={arrangement} names={REGION_NAMES} arrangements={REGION_ARRANGEMENTS} />
      <p className="mt-8 border-l-4 border-blue bg-white px-4 py-3 text-sm">
        A first review in a new region mostly produces <b>questions</b>: backup facts are unknown, so the outage scenario cannot count any place until they are provided.
        That is the intended behaviour. Regional coordination across council boundaries is the next step. Melbourne study: <Link href="/continuity?arrangement=existing&crews=3">Continuity Lab</Link>.
      </p>
    </main>
    </>
  );
}
