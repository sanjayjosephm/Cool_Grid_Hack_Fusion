import Link from "next/link";
import type { CSSProperties } from "react";
import CountUp from "@/components/landing/CountUp";
import HeroMap from "@/components/landing/HeroMap";
import Reveal from "@/components/landing/Reveal";
import ScenarioStory, { type StoryScenario } from "@/components/landing/ScenarioStory";
import energyData from "@/lib/data/energy.json";
import heatData from "@/lib/data/heat.json";
import routingData from "@/lib/data/access-routing.json";
import { backupRows, CENTRAL, facilityName, runDemoReview, SCENARIO_META } from "@/lib/demo-review";
import { AREAS, CROSSINGS, FACILITIES } from "@/lib/planning-data";
import { ARRANGEMENTS, ARRANGEMENT_LABELS } from "@/lib/planner-config";
import { recommendArrangement } from "@/lib/planning-tools";

const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
// Numbered citation linking to the sourced events on the methodology page.
const Ref = ({ n }: { n: number }) => <sup><a href={`/methodology#ref-${n}`} className="ml-0.5 text-amber no-underline hover:underline">[{n}]</a></sup>;
const eyebrow = "mb-3 text-xs font-semibold uppercase tracking-[0.16em]";
const DEMO_CREWS = 3;
const ALBION = "20021";

const SOURCES = [
  "ABS Census 2021", "ABS SEIFA 2021", "ABS suburb boundaries", "ABS postal areas", "Vicmap planning flood overlays",
  "Vicmap features of interest", "Vicmap roads", "Vicmap urban trees", "Clean Energy Regulator installations", "OpenStreetMap basemap",
];

const STEPS = [
  ["Real public data", "Who lives where, flood overlays, facilities, the full road network, solar and trees: all labelled with source and licence."],
  ["Backup and opening hours", "Each facility's battery, inverter, wiring and hours checked against the scenario. Unknown facts are never guessed."],
  ["Three separate scenarios", "Heat, heat with a power outage, and a flood that closes road crossings. Never added into one score."],
  ["Review brief", "Gaps per community, the dependency causing each, and a question for the person who can verify it."],
] as const;

const USERS = [
  ["Emergency and relief planners", "Prepare the pre-season review: which arrangement to verify or exercise next."],
  ["Asset and facility managers", "See which building facts (backup wiring, battery size, opening hours) the plan depends on."],
  ["Council committees", "Review a brief that shows its assumptions, gaps and owners, not a black-box score."],
] as const;

export default function Home() {
  const { result } = runDemoReview(DEMO_CREWS);
  const row = (s: string, a: string) => result.rows.find((r) => r.scenarioId === s && r.arrangementId === a)!;
  const demand = (s: string) => result.factsUsed.scenarios.find((x) => x.id === s)!.demand.reduce((t, x) => t + (x.amount.value ?? 0), 0);
  const allocated = (s: string, a: string, sal: string) => row(s, a).gapVectors![0].find((g) => g.communityId === sal)!.allocated;
  const central = backupRows().find((b) => b.facilityId === CENTRAL)!;
  const rec = recommendArrangement(result);
  const albionCut = allocated("flood", "existing", ALBION) === 0;
  const albionLocal = allocated("flood", "local-facilities", ALBION);

  const story: StoryScenario[] = SCENARIO_META.map((s) => ({
    id: s.id, title: s.title, demand: demand(s.id),
    bars: ARRANGEMENTS.map((a) => ({ label: ARRANGEMENT_LABELS[a], value: row(s.id, a).total ?? 0 })),
    headline: s.id === "heat" ? "On a hot afternoon, community centres that close at 17:00 can't help until 18:00."
      : s.id === "outage" ? `When the power fails, ${facilityName(CENTRAL)}'s battery ${central.existing.runtimeHours ? `runs out after ${central.existing.runtimeHours.toFixed(1)} h` : "fails the check"}, and the existing plan counts ${row("outage", "existing").total} places.`
      : `When crossings flood, extra backup changes nothing: ${row("flood", "backup-added").total} places either way.${albionCut ? ` Albion is cut off unless local facilities are used.` : ""}`,
    detail: s.note,
  }));

  const FINDINGS = [
    { tag: "Heat + outage", value: `${row("outage", "existing").total} places`, text: `The existing arrangement loses every counted place in an outage: ${facilityName(CENTRAL)}'s backup ${central.existing.detail.charAt(0).toLowerCase()}${central.existing.detail.slice(1)}` },
    { tag: "Flood", value: `${row("flood", "backup-added").total} = ${row("flood", "existing").total}`, text: "Adding backup power changes the outage result but not the flood result: when crossings close, the problem is access, not electricity." },
    { tag: "Access", value: albionCut ? `Albion: 0 → ${albionLocal}` : "Albion reachable", text: albionCut ? `Every routed trip from Albion to the central library crosses a flood-exposed road. A local facility on a dry route gives Albion ${albionLocal} of its places.` : "Albion keeps a dry route in this scenario." },
  ];

  const roadPoints = routingData.roadPoints;
  const trees = heatData.areas.reduce((t, a) => t + a.treeCount, 0);
  const installs = [...new Map(energyData.areas.map((a) => [a.postcode, a.installations.solar + a.installations.battery + a.installations.heatPump])).values()].reduce((t, v) => t + v, 0);
  const residents = AREAS.reduce((t, a) => t + (a.population.value ?? 0), 0);
  const WALL = [
    [roadPoints, "road points routed"], [trees, "urban trees counted"], [residents, "residents profiled"],
    [installs, "solar, battery and heat-pump installs"], [CROSSINGS.length, "flood-exposed road crossings"], [FACILITIES.length, "real facilities checked"],
  ] as const;

  return (
    <main>
      <Reveal />

      {/* Hero */}
      <section className="heat-bg relative overflow-hidden text-white">
        <div className="grid-lines pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1fr_1.05fr] lg:py-24">
          <div>
            <p className={`reveal ${eyebrow} text-amber`}>COP31 · Resilient Cities &amp; Buildings</p>
            <h1 className="reveal mb-6 text-[clamp(2.3rem,5.2vw,3.9rem)] font-medium leading-[1.05] tracking-tight" style={d(100)}>
              Will your heatwave plan still work when the <span className="shimmer-text">power fails</span> or the <em className="text-[#7FB2DD]">road floods</em>?
            </h1>
            <p className="reveal -mt-2 mb-5 text-sm text-white/55" style={d(150)}>
              It has happened: up to 500,000 Victorian homes and businesses lost power in the January 2009 heatwave<Ref n={1} />, and in October 2022 floods
              hit Melbourne&apos;s Maribyrnong River<Ref n={2} /> and closed the Shepparton–Mooroopna Causeway<Ref n={3} />.
            </p>
            <p className="reveal max-w-[50ch] text-lg text-white/75" style={d(200)}>
              CoolGrid tests whether the facilities a council relies on still work when the power goes out, a crossing closes or staff
              run short, on real Melbourne data, and shows exactly what to verify next.
            </p>
            <div className="reveal mt-8 flex flex-wrap gap-3" style={d(300)}>
              <Link href={`/continuity?arrangement=existing&crews=${DEMO_CREWS}`} className="group rounded-full bg-white px-6 py-3 font-semibold text-ink no-underline shadow-[0_0_40px_-8px_rgba(242,196,107,0.8)] transition hover:-translate-y-0.5 hover:shadow-[0_0_50px_-4px_rgba(242,196,107,0.95)]">
                Open the Continuity Lab <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <Link href="/dashboard" className="rounded-full px-6 py-3 font-semibold text-white no-underline ring-1 ring-white/30 transition hover:bg-white/10">Explore the planning map</Link>
            </div>
          </div>
          <div className="reveal relative rounded-3xl bg-white/[0.04] p-3 ring-1 ring-white/15 backdrop-blur-md" style={d(200)}>
            <HeroMap />
            <p className="px-2 pb-1 text-[11px] text-white/45">Real ABS suburb outlines shaded by need · Vicmap facilities and flood crossings · routes from Albion</p>
          </div>
        </div>
        {/* Data sources ticker */}
        <div className="relative overflow-hidden border-t border-white/10 py-3 text-sm text-white/55" aria-label="Data sources">
          <div className="marquee flex w-max gap-10 whitespace-nowrap">
            {[...SOURCES, ...SOURCES].map((s, i) => <span key={i} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber" />{s}</span>)}
          </div>
        </div>
      </section>

      {/* Scenario story */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <p className={`reveal ${eyebrow} text-heat`}>Three failures, one plan</p>
        <h2 className="reveal max-w-[24ch] text-[clamp(1.9rem,4vw,2.8rem)] font-medium" style={d(100)}>Watch the same plan meet a heatwave, a blackout and a flood.</h2>
        <p className="reveal mt-3 max-w-[60ch] text-muted" style={d(150)}>Live results from the review engine on real data, {DEMO_CREWS} crews. Hover to pause.</p>
        <div className="reveal mt-8" style={d(200)}><ScenarioStory scenarios={story} /></div>
      </section>

      {/* Data wall */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className={`reveal ${eyebrow} text-blue`}>Built on real data</p>
          <h2 className="reveal max-w-[22ch] text-[clamp(1.9rem,4vw,2.8rem)] font-medium" style={d(100)}>Not a mock-up. Every number has a source.</h2>
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
            {WALL.map(([v, l], i) => (
              <div key={l} className="reveal group rounded-2xl bg-paper p-6 ring-1 ring-line transition hover:-translate-y-1 hover:shadow-lg" style={d(100 + i * 90)}>
                <p className="font-serif text-[clamp(1.8rem,4vw,2.6rem)] text-ink"><CountUp to={v} /></p>
                <p className="mt-1 text-sm text-muted">{l}</p>
              </div>
            ))}
          </div>
          <div className="reveal mt-8 flex flex-wrap gap-3 text-sm" style={d(400)}>
            {[["public", "official dataset", "#3E8E6A"], ["declared", "entered by the planner", "#2B6CB0"], ["illustrative", "labelled placeholder", "#B07A10"], ["unknown", "blocks the result and raises a question", "#C8402F"]].map(([s, m, c]) => (
              <span key={s} className="rounded-full bg-paper px-4 py-2 ring-1 ring-line"><b style={{ color: c }}>{s}</b> · {m}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Findings */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <p className={`reveal ${eyebrow} text-blue`}>What it shows</p>
        <h2 className="reveal max-w-[26ch] text-[clamp(1.9rem,4vw,2.8rem)] font-medium" style={d(100)}>Different failures need different fixes.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {FINDINGS.map((f, i) => (
            <div key={f.tag} className="reveal rounded-2xl bg-white p-6 ring-1 ring-line transition hover:-translate-y-1 hover:shadow-lg" style={d(150 + i * 120)}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{f.tag}</p>
              <p className="mt-2 font-serif text-3xl">{f.value}</p>
              <p className="mt-3 text-sm text-muted">{f.text}</p>
            </div>
          ))}
        </div>
        {rec.arrangement && <p className="reveal mt-6 rounded-xl border-l-4 border-blue bg-white px-4 py-3 text-sm ring-1 ring-line" style={d(500)}>Recommended starting point: <b>{ARRANGEMENT_LABELS[rec.arrangement]}</b>. {rec.reason}</p>}
      </section>

      {/* How it works */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <p className={`reveal ${eyebrow} text-blue`}>How it works</p>
          <h2 className="reveal text-[clamp(1.9rem,4vw,2.8rem)] font-medium" style={d(100)}>From public data to the next thing to verify.</h2>
          <ol className="relative mt-12 grid gap-6 md:grid-cols-4">
            <div className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-heat via-amber to-blue md:block" aria-hidden="true" />
            {STEPS.map(([t, b], i) => (
              <li key={t} className="reveal relative" style={d(150 + i * 150)}>
                <span className="relative z-[1] grid h-12 w-12 place-items-center rounded-full bg-ink font-serif text-xl text-white ring-4 ring-white">{i + 1}</span>
                <p className="mt-4 font-semibold">{t}</p>
                <p className="mt-2 text-sm text-muted">{b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Users and COP31 */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <p className={`reveal ${eyebrow} text-blue`}>Who it&apos;s for</p>
        <h2 className="reveal max-w-[24ch] text-[clamp(1.9rem,4vw,2.8rem)] font-medium" style={d(100)}>Built for the people who prepare the plan.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {USERS.map(([t, b], i) => (
            <div key={t} className="reveal rounded-2xl bg-white p-6 ring-1 ring-line" style={d(150 + i * 120)}>
              <p className="font-serif text-xl">{t}</p>
              <p className="mt-2 text-sm text-muted">{b}</p>
            </div>
          ))}
        </div>
        <div className="reveal relative mt-12 overflow-hidden rounded-3xl bg-night p-8 text-white" style={d(200)}>
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-heat/30 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-blue/30 blur-3xl" aria-hidden="true" />
          <p className="relative text-xs font-semibold uppercase tracking-[0.16em] text-amber">COP31 priority · Resilient Cities &amp; Buildings</p>
          <p className="relative mt-3 max-w-[62ch] text-white/85">
            Helping cities cope with heatwaves, floods and other extremes. CoolGrid targets the continuity of public services in those events,
            including the power and access they depend on as buildings electrify, and gives flood-exposed suburbs a simple electrification rule:
            mount heat pumps, batteries and switchboards above flood level. The same pipeline already runs for a regional council.
          </p>
          <div className="relative mt-5 flex flex-wrap gap-3 text-sm">
            <Link href="/investment" className="rounded-full bg-white/10 px-4 py-2 text-white no-underline ring-1 ring-white/20 hover:bg-white/20">Investment Gate →</Link>
            <Link href="/regional" className="rounded-full bg-white/10 px-4 py-2 text-white no-underline ring-1 ring-white/20 hover:bg-white/20">Greater Shepparton →</Link>
            <Link href="/validation" className="rounded-full bg-white/10 px-4 py-2 text-white no-underline ring-1 ring-white/20 hover:bg-white/20">Validation →</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="heat-bg relative overflow-hidden text-white">
        <div className="relative mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="reveal text-[clamp(2rem,4.5vw,3.2rem)] font-medium">Test your plan before the next heatwave does.</h2>
          <p className="reveal mx-auto mt-4 max-w-[50ch] text-white/70" style={d(100)}>Choose an arrangement, enter your facility facts, compare the three scenarios and print a review brief.</p>
          <div className="reveal mt-8 flex flex-wrap justify-center gap-3" style={d(200)}>
            <Link href={`/continuity?arrangement=existing&crews=${DEMO_CREWS}`} className="rounded-full bg-white px-6 py-3 font-semibold text-ink no-underline shadow-[0_0_40px_-8px_rgba(242,196,107,0.8)] transition hover:-translate-y-0.5">Open the Continuity Lab →</Link>
            <Link href="/methodology" className="rounded-full px-6 py-3 font-semibold text-white no-underline ring-1 ring-white/30 transition hover:bg-white/10">Method and limits</Link>
          </div>
          <p className="reveal mx-auto mt-12 max-w-[60ch] text-xs text-white/50" style={d(300)}>
            Prototype for Climate Hack-tion 2026. Results are conditional on labelled illustrative planning inputs and do not certify that any facility is ready, open or safe.
          </p>
        </div>
      </section>
    </main>
  );
}
