"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ARRANGEMENTS, ARRANGEMENT_LABELS, type Arrangement, type PlannerConfig, plannerConfigUrl } from "@/lib/planner-config";

const SCENARIOS = [
  { id: "heat", title: "Heat", description: "Heat disruption only." },
  { id: "heat-outage", title: "Heat + outage", description: "Heat disruption with a power outage." },
  { id: "flood-crossing", title: "Flood + crossing closed", description: "Flood access disruption with a crossing closure." },
] as const;

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
        <div className="grid gap-4 lg:grid-cols-3">
          {SCENARIOS.map((scenario) => (
            <article key={scenario.id} className="rounded-2xl bg-white p-5 ring-1 ring-line">
              <p className="text-xs font-semibold uppercase tracking-widest text-blue">Scenario</p>
              <h3 className="mt-1 text-xl">{scenario.title}</h3>
              <p className="text-sm text-muted">{scenario.description}</p>
              <div role="status" className="mt-5 rounded-lg border-l-4 border-amber bg-paper p-3">
                <p className="font-semibold">Engine results not connected yet</p>
                <p className="mt-1 text-sm text-muted">
                  No allocations or shortfalls are shown until the Continuity Lab engine is integrated. This avoids presenting illustrative values as assessed outcomes.
                </p>
              </div>
              <dl className="mt-4 space-y-2 border-t border-line pt-3 text-sm">
                <div className="flex justify-between gap-2"><dt className="text-muted">Arrangement</dt><dd>{config.arrangement ? ARRANGEMENT_LABELS[config.arrangement] : "Not selected"}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-muted">Crew count</dt><dd>{config.crews === null ? "Not confirmed" : config.crews}</dd></div>
                <div><dt className="text-muted">Community/group gaps</dt><dd>Awaiting engine output</dd></div>
                <div><dt className="text-muted">Cause and next action</dt><dd>Awaiting engine output</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>
      <p className="mt-8 border-l-4 border-blue bg-white px-4 py-3 text-sm">
        Area and facility details are available on the <Link href="/dashboard">planning map</Link>. Scenario results will appear here once this screen is connected to the review engine using entered service evidence.
      </p>
    </main>
  );
}
