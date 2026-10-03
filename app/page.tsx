import Link from "next/link";
import type { CSSProperties } from "react";
import CountUp from "@/components/landing/CountUp";
import Reveal from "@/components/landing/Reveal";
import { backupRows, CENTRAL, facilityName, runDemoReview, SCENARIO_META } from "@/lib/demo-review";
import { AREAS, CROSSINGS, FACILITIES } from "@/lib/planning-data";
import { ARRANGEMENTS, ARRANGEMENT_LABELS } from "@/lib/planner-config";

// Stagger delay for .reveal elements.
const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
const eyebrow = "mb-3 text-xs font-semibold uppercase tracking-[0.16em]";
const DEMO_CREWS = 3;

const STEPS = [
  ["Real public data", "ABS Census and SEIFA for who lives where; Vicmap flood overlays, facilities and main roads. Every value labelled with its source."],
  ["Facilities and backup", "Each facility's places, crews and backup power, checked against a 6-hour outage. Unknown facts are never guessed."],
  ["Three separate scenarios", "Heat, heat with a power outage, and a flood that closes crossings. Never added into one score."],
  ["Review brief", "Gaps per community, the dependency causing each one, and a question for the person who can verify it."],
] as const;

const USERS = [
  ["Emergency and relief planners", "Prepare the pre-season review: which arrangement to verify or exercise next."],
  ["Asset and facility managers", "See which building facts (backup wiring, battery size, crews) the plan depends on."],
  ["Council committees", "Review a brief that shows its assumptions, gaps and owners, not a black-box score."],
] as const;

export default function Home() {
  const { result } = runDemoReview(DEMO_CREWS);
  const total = (s: string, a: string) => result.rows.find((r) => r.scenarioId === s && r.arrangementId === a)!;
  const demand = (s: string) => result.factsUsed.scenarios.find((x) => x.id === s)!.demand.reduce((t, x) => t + (x.amount.value ?? 0), 0);
  const central = backupRows().find((b) => b.facilityId === CENTRAL)!;
  const floodLocal = total("flood", "local-facilities");
  const cutOff = floodLocal.gapVectors![0].filter((g) => g.allocated === 0).map((g) => AREAS.find((a) => a.sal === g.communityId)!.name);

  const FINDINGS = [
    { tag: "Heat + outage", value: `${total("outage", "existing").total} places`, text: `With the existing arrangement, the outage removes every counted place: ${facilityName(CENTRAL)}'s backup ${central.existing.detail.charAt(0).toLowerCase()}${central.existing.detail.slice(1)}` },
    { tag: "Flood", value: `${total("flood", "backup-added").total} = ${total("flood", "existing").total}`, text: "Adding backup power changes the outage result but not the flood result: when crossings close, the problem is access, not electricity." },
    { tag: "Access", value: cutOff.join(", ") || "none", text: `Cut off in the flood scenario even with local facilities, because every route to a facility crosses a flood-exposed road.` },
  ];

  return (
    <main>
      <Reveal />

      {/* Hero */}
      <section className="heat-bg relative overflow-hidden text-white">
        <div className="grid-lines pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 py-20 lg:grid-cols-[1.15fr_1fr] lg:py-28">
          <div>
            <p className={`reveal ${eyebrow} text-amber`}>COP31 · Resilient Cities &amp; Buildings</p>
            <h1 className="reveal mb-6 text-[clamp(2.3rem,5.5vw,4rem)] font-medium leading-[1.05] tracking-tight" style={d(100)}>
              Will your heatwave plan still work when the <em className="text-heat">power fails</em> or the <em className="text-[#7FB2DD]">road floods</em>?
            </h1>
            <p className="reveal max-w-[52ch] text-lg text-white/75" style={d(200)}>
              CoolGrid helps council planners test whether the facilities they rely on still work when the power goes out, a crossing
              closes or staff run short, and shows exactly what to verify next.
            </p>
            <div className="reveal mt-8 flex flex-wrap gap-3" style={d(300)}>
              <Link href={`/continuity?arrangement=existing&crews=${DEMO_CREWS}`} className="rounded-full bg-white px-6 py-3 font-semibold text-ink no-underline transition hover:-translate-y-0.5 hover:shadow-lg">
                Open the Continuity Lab →
              </Link>
              <Link href="/dashboard" className="rounded-full px-6 py-3 font-semibold text-white no-underline ring-1 ring-white/30 transition hover:bg-white/10">
                Explore the planning map
              </Link>
            </div>
            <dl className="reveal mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/15 pt-6" style={d(400)}>
              {([[AREAS.length, "suburbs, ABS Census data"], [FACILITIES.length, "real facilities from Vicmap"], [CROSSINGS.length, "flood-exposed road crossings"]] as const).map(([v, l]) => (
                <div key={l}><dd className="font-serif text-3xl"><CountUp to={v} /></dd><dt className="mt-1 text-sm text-white/60">{l}</dt></div>
              ))}
            </dl>
          </div>

          <div className="reveal animate-float rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/15 backdrop-blur-md" style={d(250)}>
            <div className="mb-4 flex items-baseline justify-between">
              <p className="text-sm font-semibold">Places counted, {DEMO_CREWS} crews</p>
              <p className="text-xs text-white/50">illustrative inputs, real data</p>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-white/50"><th className="pb-2 font-medium">Arrangement</th>{SCENARIO_META.map((s) => <th key={s.id} className="pb-2 text-right font-medium">{s.title}</th>)}</tr></thead>
              <tbody>
                {ARRANGEMENTS.map((a, i) => (
                  <tr key={a} className="reveal border-t border-white/10" style={d(450 + i * 100)}>
                    <td className="py-2.5">{ARRANGEMENT_LABELS[a]}</td>
                    {SCENARIO_META.map((s) => {
                      const r = total(s.id, a);
                      const pct = r.total === null ? 0 : r.total / demand(s.id);
                      return <td key={s.id} className="py-2.5 text-right font-serif tabular-nums" style={{ color: pct >= 0.6 ? "#7FD3A8" : pct > 0 ? "#F2C46B" : "#F08A6B" }}>{r.total ?? "–"}<span className="text-xs text-white/40">/{demand(s.id)}</span></td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-xs text-white/50">Scenarios are assessed separately and never added together.</p>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <p className={`reveal ${eyebrow} text-heat`}>The problem</p>
            <h2 className="reveal text-[clamp(1.9rem,4vw,2.8rem)] font-medium" style={d(100)}>Plans assume the building is open, the power is on and the road is dry.</h2>
            <p className="reveal mt-4 text-lg text-muted" style={d(200)}>
              Councils already have cooling places, flood plans and warning systems. But a plan can quietly depend on a battery that runs
              out, a crossing that floods or a crew that isn&apos;t there. Melbourne has seen both failure modes: blackouts during the January
              2009 heatwave and the October 2022 Maribyrnong River flood. As more homes and facilities run on electricity, these
              dependencies matter more.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[["Power", "Does the backup actually run the cooling for the whole outage?"], ["Access", "Can each community still reach a facility when crossings close?"], ["Staff", "Are there enough crews to open every facility the plan counts on?"]].map(([t, b], i) => (
              <div key={t} className="reveal rounded-2xl bg-white p-6 ring-1 ring-line" style={d(150 + i * 120)}>
                <p className="font-serif text-2xl text-heat">{t}</p>
                <p className="mt-3 text-sm text-muted">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Findings */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <p className={`reveal ${eyebrow} text-blue`}>What it shows on real Melbourne data</p>
          <h2 className="reveal max-w-[26ch] text-[clamp(1.9rem,4vw,2.8rem)] font-medium" style={d(100)}>Different failures need different fixes.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {FINDINGS.map((f, i) => (
              <div key={f.tag} className="reveal rounded-2xl bg-paper p-6 ring-1 ring-line" style={d(150 + i * 120)}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{f.tag}</p>
                <p className="mt-2 font-serif text-3xl">{f.value}</p>
                <p className="mt-3 text-sm text-muted">{f.text}</p>
              </div>
            ))}
          </div>
          <p className="reveal mt-6 text-xs text-muted" style={d(500)}>Sunshine, Sunshine West, Braybrook and Albion; {DEMO_CREWS} crews. Facility places, crews, backup and demand are labelled illustrative planning inputs; suburbs, facilities, flood overlays and roads are public data.</p>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <p className={`reveal ${eyebrow} text-blue`}>How it works</p>
        <h2 className="reveal text-[clamp(1.9rem,4vw,2.8rem)] font-medium" style={d(100)}>From public data to the next thing to verify.</h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-4">
          {STEPS.map(([t, b], i) => (
            <li key={t} className="reveal rounded-2xl bg-white p-6 ring-1 ring-line" style={d(150 + i * 100)}>
              <p className="font-serif text-3xl text-muted">{i + 1}</p>
              <p className="mt-2 font-semibold">{t}</p>
              <p className="mt-2 text-sm text-muted">{b}</p>
            </li>
          ))}
        </ol>
        <div className="reveal mt-10 flex flex-wrap gap-3 text-sm" style={d(300)}>
          {[["public", "official dataset", "#3E8E6A"], ["declared", "entered by the planner", "#2B6CB0"], ["illustrative", "labelled placeholder", "#B07A10"], ["unknown", "blocks the result and raises a question", "#C8402F"]].map(([s, m, c]) => (
            <span key={s} className="rounded-full bg-white px-4 py-2 ring-1 ring-line"><b style={{ color: c }}>{s}</b> · {m}</span>
          ))}
        </div>
      </section>

      {/* Users and COP31 */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <p className={`reveal ${eyebrow} text-blue`}>Who it&apos;s for</p>
          <h2 className="reveal max-w-[24ch] text-[clamp(1.9rem,4vw,2.8rem)] font-medium" style={d(100)}>Built for the people who prepare the plan.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {USERS.map(([t, b], i) => (
              <div key={t} className="reveal rounded-2xl bg-paper p-6 ring-1 ring-line" style={d(150 + i * 120)}>
                <p className="font-serif text-xl">{t}</p>
                <p className="mt-2 text-sm text-muted">{b}</p>
              </div>
            ))}
          </div>
          <div className="reveal relative mt-12 overflow-hidden rounded-2xl bg-night p-7 text-white" style={d(200)}>
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-heat/30 blur-3xl" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber">COP31 priority · Resilient Cities &amp; Buildings</p>
            <p className="mt-3 max-w-[60ch] text-white/80">
              Helping cities cope with heatwaves, floods and other extremes. CoolGrid targets the continuity of public services in those
              events, including the power and access they depend on as buildings electrify. Flood-exposed suburbs get a simple rule for
              electrification: mount heat pumps, batteries and switchboards above flood level.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="heat-bg relative overflow-hidden text-white">
        <div className="relative mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="reveal text-[clamp(2rem,4.5vw,3.2rem)] font-medium">Test an arrangement in the Continuity Lab.</h2>
          <p className="reveal mx-auto mt-4 max-w-[50ch] text-white/70" style={d(100)}>Choose an arrangement and a crew count, compare the three scenarios, and prepare a review brief.</p>
          <div className="reveal mt-8 flex flex-wrap justify-center gap-3" style={d(200)}>
            <Link href={`/continuity?arrangement=existing&crews=${DEMO_CREWS}`} className="rounded-full bg-white px-6 py-3 font-semibold text-ink no-underline transition hover:-translate-y-0.5 hover:shadow-lg">Open the Continuity Lab →</Link>
            <Link href="/validation" className="rounded-full px-6 py-3 font-semibold text-white no-underline ring-1 ring-white/30 transition hover:bg-white/10">See the validation</Link>
          </div>
          <p className="reveal mx-auto mt-12 max-w-[60ch] text-xs text-white/50" style={d(300)}>
            Prototype for Climate Hack-tion 2026. Results are conditional on labelled illustrative planning inputs and do not certify that any facility is ready, open or safe.
          </p>
        </div>
      </section>
    </main>
  );
}
