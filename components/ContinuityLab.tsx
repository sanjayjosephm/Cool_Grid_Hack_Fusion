"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import ScenarioResults from "@/components/ScenarioResults";
import { equipmentRule, facilityFloodWarnings, groupContext } from "@/lib/area-context";
import { OUTAGE_HOURS } from "@/lib/backup";
import { backupRows, DEMO_COMMUNITIES, DEMO_FACILITIES, FLOOD_SHARE, HEAT_SHARE, runDemoReview } from "@/lib/demo-review";
import { FACILITIES } from "@/lib/planning-data";
import { ARRANGEMENTS, ARRANGEMENT_LABELS, type PlannerConfig, plannerConfigUrl } from "@/lib/planner-config";

const BACKUP_TONE: Record<string, string> = { pass: "text-[#3E8E6A]", assessment: "text-[#B07A10]" };
const BACKUP_LABEL: Record<string, string> = { pass: "Passes", "fail-energy": "Fails: battery", "fail-power": "Fails: inverter", "fail-circuit": "Fails: wiring", assessment: "Needs assessment" };

export default function ContinuityLab({ initialConfig }: { initialConfig: PlannerConfig }) {
  const router = useRouter();
  const [config, setConfig] = useState(initialConfig);
  const [crewInput, setCrewInput] = useState(initialConfig.crews === null ? "" : String(initialConfig.crews));

  const updateConfig = (next: PlannerConfig) => {
    const validConfig = { ...next, errors: [] };
    setConfig(validConfig);
    router.replace(plannerConfigUrl("/continuity", validConfig), { scroll: false });
  };

  const setArrangement = (value: string) => {
    const arrangement = ARRANGEMENTS.find((option) => option === value) ?? null;
    updateConfig({ ...config, arrangement, errors: [] });
  };

  const setCrews = (value: string) => {
    setCrewInput(value);
    const crews = value !== "" && /^(0|[1-9]\d*)$/.test(value) && Number.isSafeInteger(Number(value))
      ? Number(value)
      : null;
    const errors = value !== "" && crews === null ? ["Crew count must be a non-negative whole number."] : [];
    const validConfig = { ...config, crews, errors };
    setConfig(validConfig);
    router.replace(plannerConfigUrl("/continuity", validConfig), { scroll: false });
  };

  const canGenerateBrief = config.arrangement !== null && config.crews !== null;
  const review = useMemo(() => runDemoReview(config.crews), [config.crews]);
  const backups = useMemo(() => backupRows(), []);
  const floodWarnings = facilityFloodWarnings(FACILITIES.filter((f) => DEMO_FACILITIES.includes(f.id)));

  return (
    <main className="mx-auto max-w-6xl px-6 pb-16 pt-10">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">P1 · Continuity Lab</p>
      <h1 className="text-4xl">Test the service arrangement</h1>
      <p className="mt-3 max-w-3xl text-muted">
        Compare separate disruption scenarios for council planning. Facility capacities and staffing remain labelled as illustrative or unknown; this screen does not designate public destinations or routes.
      </p>
      {config.errors.map((error) => <p key={error} role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</p>)}

      <section className="my-8 grid gap-6 rounded-2xl bg-white p-6 ring-1 ring-line md:grid-cols-[1fr_240px]">
        <fieldset>
          <legend className="mb-3 font-semibold">Choose an arrangement</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {ARRANGEMENTS.map((arrangement) => (
              <label key={arrangement} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${config.arrangement === arrangement ? "border-ink bg-paper" : "border-line hover:bg-paper"}`}>
                <input type="radio" name="arrangement" value={arrangement} checked={config.arrangement === arrangement} onChange={() => setArrangement(arrangement)} />
                <span className="text-sm font-medium">{ARRANGEMENT_LABELS[arrangement]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="font-semibold">
          Available crews
          <input className="mt-2 block w-full rounded-lg border border-line px-3 py-2 font-normal" type="number" min="0" step="1" value={crewInput}
            onChange={(event) => setCrews(event.target.value)} aria-describedby="crew-hint" />
          <span id="crew-hint" className="mt-1 block text-xs font-normal text-muted">Enter a whole number. Leave blank until confirmed.</span>
        </label>
      </section>

      <section aria-labelledby="scenario-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="scenario-heading" className="text-2xl">Scenario results</h2>
            <p className="text-sm text-muted">Scenarios are assessed separately and are not combined into a single score.</p>
          </div>
          {canGenerateBrief
            ? <Link className="rounded-full bg-ink px-5 py-2.5 font-semibold text-white no-underline hover:bg-[#344154]" href={plannerConfigUrl("/brief", config)}>Prepare review brief →</Link>
            : <span className="text-sm text-muted">Select an arrangement and enter a crew count to continue.</span>}
        </div>
        <ScenarioResults result={review.result} arrangement={config.arrangement} />
      </section>
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 ring-1 ring-line">
          <h2 className="text-xl">Backup check ({OUTAGE_HOURS}-hour outage)</h2>
          <p className="mt-1 text-sm text-muted">Calculated from each facility&apos;s battery, inverter and cooling loads. Unknown inputs never pass. Feeds the heat + outage scenario.</p>
          <table className="mt-3 w-full text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wide text-muted"><th className="pb-1">Facility</th><th className="pb-1">Result</th></tr></thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.facilityId} className="border-t border-line align-top">
                  <td className="py-1.5 pr-2">{b.name}</td>
                  <td className="py-1.5">
                    <span className={`font-semibold ${BACKUP_TONE[b.existing.status] ?? "text-[#C8402F]"}`}>{BACKUP_LABEL[b.existing.status]}</span>
                    <span className="block text-xs text-muted">{b.existing.detail}</span>
                    {b.proposed && <span className="mt-1 block text-xs"><b>With proposed upgrade (Backup added):</b> {BACKUP_LABEL[b.proposed.status]}. {b.proposed.detail}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-2xl bg-white p-5 ring-1 ring-line">
          <h2 className="text-xl">Who lives in these communities</h2>
          <p className="mt-1 text-sm text-muted">ABS Census 2021 shares, to read alongside any gap. Context only: they are not used to count anyone.</p>
          <div className="mt-3 space-y-3 text-sm">
            {DEMO_COMMUNITIES.map((sal) => {
              const g = groupContext(sal);
              const rule = equipmentRule(sal);
              return (
                <div key={sal} className="border-t border-line pt-2">
                  <p className="font-semibold">{g.name} <span className="font-normal text-muted">· {g.population.toLocaleString()} residents · top languages {g.languages.join(", ")}</span></p>
                  <p className="text-muted">{g.groups.map((x) => `${x.pct}% ${x.label}`).join(" · ")}</p>
                  {rule && <p className="mt-1 text-xs text-[#1F5A9A]">Flood rule: {rule.message.split(": ").slice(1).join(": ")}</p>}
                </div>
              );
            })}
          </div>
          {floodWarnings.length === 0 && <p className="mt-3 text-xs text-muted">None of the selected facilities lies inside a Vicmap flood overlay.</p>}
          {floodWarnings.map((w) => <p key={w.subject} className="mt-2 text-sm text-[#C8402F]">{w.message}</p>)}
        </div>
      </section>

      <p className="mt-8 border-l-4 border-blue bg-white px-4 py-3 text-sm">
        Places counted are conditional on the labelled inputs: facility places, crews, authorisation and suitability are illustrative planning assumptions, and demand is an illustrative requirement ({HEAT_SHARE * 100}% of residents aged 65+ for heat; {FLOOD_SHARE * 100}% of residents in the riverine flood-overlay share for flood). Routes are straight-line approximations. This screen does not designate public destinations or routes. See the <Link href="/dashboard">planning map</Link> and <Link href="/validation">validation</Link>.
      </p>
    </main>
  );
}
