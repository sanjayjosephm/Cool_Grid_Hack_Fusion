import Link from "next/link";
import type { CSSProperties } from "react";
import { NEIGHBOURHOODS } from "@/lib/data";
import { applyMeasures, categorise, NO_MEASURES, WEIGHTS } from "@/lib/model";
import Reveal from "@/components/landing/Reveal";
import CountUp from "@/components/landing/CountUp";
import TryIt from "@/components/landing/TryIt";

// Stagger delay for .reveal elements.
const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

const FACTORS = [
  ["Heat exposure", WEIGHTS.heat, "How hot the area gets on extreme days"],
  ["Social vulnerability", WEIGHTS.vulnerability, "Older, low-income or isolated residents"],
  ["Building inefficiency", WEIGHTS.building, "Older homes that trap heat and leak energy"],
  ["Grid stress", WEIGHTS.grid, "How close the local network is to its limit"],
  ["Existing resilience", WEIGHTS.resilience, "Cooling hubs and backup power already nearby. Lowers the score."],
] as const;

// One representative score per band gives the four categories in order.
const CATEGORIES = [10, 50, 70, 90].map(categorise);

const HEATWAVE = [
  ["45.1°C", "Melbourne's top temperature on 30 January 2009, the third day in a row above 43°C."],
  ["374", "Estimated excess deaths in Victoria during that heatwave week."],
  ["~500,000", "Properties left without power on 30 January as the network failed."],
] as const;

const PACKAGE = ["Heat pump", "Insulation", "Shade", "Cooling hub"];

const USERS = [
  ["Council sustainability officers", "Decide which suburbs get electrification support first, and what to bundle with it."],
  ["Heat-health and emergency planners", "See where vulnerable residents lack a backup-powered place to cool down."],
  ["Program and grant leads", "Compare the cost of each package against the residents it protects."],
] as const;

const eyebrow = "mb-3 text-xs font-semibold uppercase tracking-[0.16em]";

export default function Home() {
  const scored = NEIGHBOURHOODS.map((n) => ({ n, r: applyMeasures(n, NO_MEASURES) })).sort((a, b) => b.r.score - a.r.score);
  const high = scored.filter((x) => x.r.score >= 60);
  const residents = high.reduce((s, x) => s + x.n.population, 0);
  const homes = high.reduce((s, x) => s + x.n.homes, 0);

  return (
    <main>
      <Reveal />

      {/* Hero */}
      <section className="heat-bg relative overflow-hidden text-white">
        <div className="grid-lines pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 py-20 lg:grid-cols-[1.15fr_1fr] lg:py-28">
          <div>
            <p className={`reveal ${eyebrow} text-amber`}>COP31 · Resilient Cities & Buildings × Electrification</p>
            <h1 className="reveal mb-6 text-[clamp(2.5rem,6vw,4.4rem)] font-medium leading-[1.04] tracking-tight" style={d(100)}>
              Electrify homes <em className="text-heat">without</em> making heatwaves more dangerous.
            </h1>
            <p className="reveal max-w-[52ch] text-lg text-white/75" style={d(200)}>
              CoolGrid shows Melbourne councils where to switch homes off gas first, and what to pair it with so every retrofit
              also keeps people safe on the hottest days.
            </p>
            <div className="reveal mt-8 flex flex-wrap gap-3" style={d(300)}>
              <Link href="/dashboard" className="rounded-full bg-white px-6 py-3 font-semibold text-ink no-underline transition hover:-translate-y-0.5 hover:shadow-lg">
                Explore the resilience map →
              </Link>
              <a href="#try" className="rounded-full px-6 py-3 font-semibold text-white no-underline ring-1 ring-white/30 transition hover:bg-white/10">
                Try it in 10 seconds
              </a>
            </div>
            <dl className="reveal mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/15 pt-6" style={d(400)}>
              {([[NEIGHBOURHOODS.length, "areas assessed"], [residents, "residents in high-priority areas"], [homes, "homes needing a resilience package"]] as const).map(([v, l]) => (
                <div key={l}><dd className="font-serif text-3xl"><CountUp to={v} /></dd><dt className="mt-1 text-sm text-white/60">{l}</dt></div>
              ))}
            </dl>
          </div>

          <div className="reveal animate-float rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/15 backdrop-blur-md" style={d(250)}>
            <div className="mb-4 flex items-baseline justify-between">
              <p className="text-sm font-semibold">Priority ranking</p>
              <p className="text-xs text-white/50">sample data</p>
            </div>
            <ol className="space-y-2">
              {scored.map(({ n, r }, i) => (
                <li key={n.id} className="reveal flex items-center gap-3 rounded-lg bg-white/[0.04] px-3 py-2" style={d(400 + i * 70)}>
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${r.score >= 60 ? "animate-glow" : ""}`} style={{ background: r.category.color, color: r.category.color }} />
                  <span className="min-w-0 flex-1 truncate text-sm">{n.name} <span className="text-white/45">· {n.council}</span></span>
                  <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-white/10 sm:block">
                    <span className="bar block h-full rounded-full" style={{ "--w": `${r.score}%`, background: r.category.color, ...d(600 + i * 70) } as CSSProperties} />
                  </span>
                  <span className="w-7 text-right font-serif tabular-nums">{r.score}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Why it matters */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <p className={`reveal ${eyebrow} text-heat`}>The problem</p>
            <h2 className="reveal text-[clamp(1.9rem,4vw,2.8rem)] font-medium" style={d(100)}>The hottest day is when the grid is weakest.</h2>
            <p className="reveal mt-4 text-lg text-muted" style={d(200)}>
              Moving homes off gas is essential. But every all-electric home leans on the grid, and demand peaks during heatwaves,
              exactly when the network is most likely to fail. In poorly insulated homes, a blackout during a heatwave becomes a
              health emergency for older and low-income residents.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {HEATWAVE.map(([v, l], i) => (
              <div key={v} className="reveal rounded-2xl bg-white p-5 ring-1 ring-line" style={d(150 + i * 120)}>
                <p className="whitespace-nowrap font-serif text-3xl text-heat">{v}</p>
                <p className="mt-3 text-sm text-muted">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The idea */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <p className={`reveal ${eyebrow} text-blue`}>Our approach</p>
          <h2 className="reveal mx-auto max-w-[24ch] text-[clamp(1.9rem,4vw,2.8rem)] font-medium" style={d(100)}>
            Most programs ask <span className="text-muted">who can switch?</span> CoolGrid asks <span className="text-heat">who is safe to switch</span>, and what they need first.
          </h2>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            {PACKAGE.map((p, i) => (
              <span key={p} className="reveal flex items-center gap-3" style={d(200 + i * 120)}>
                {i > 0 && <span className="text-2xl text-muted">+</span>}
                <span className="rounded-full bg-paper px-5 py-2.5 font-medium ring-1 ring-line">{p}</span>
              </span>
            ))}
            <span className="reveal flex items-center gap-3" style={d(200 + PACKAGE.length * 120)}>
              <span className="text-2xl text-muted">=</span>
              <span className="rounded-full bg-ink px-5 py-2.5 font-semibold text-white">A safer, all-electric street</span>
            </span>
          </div>
        </div>
      </section>

      {/* How it scores */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-14 lg:grid-cols-2">
          <div>
            <p className={`reveal ${eyebrow} text-blue`}>How it works</p>
            <h2 className="reveal text-[clamp(1.9rem,4vw,2.8rem)] font-medium" style={d(100)}>One transparent score per neighbourhood.</h2>
            <p className="reveal mt-4 text-muted" style={d(200)}>No black box. Five factors, fixed weights, published formula. Planners can see exactly why an area ranks where it does.</p>
            <div className="reveal mt-8 space-y-5" style={d(250)}>
              {FACTORS.map(([name, w, note], i) => (
                <div key={name}>
                  <div className="flex justify-between text-sm"><span className="font-medium">{name}</span><span className="tabular-nums text-muted">{i === FACTORS.length - 1 ? "−" : ""}{Math.round(w * 100)}%</span></div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line/60">
                    <span className={`bar block h-full rounded-full ${i === FACTORS.length - 1 ? "bg-blue" : "bg-heat"}`} style={{ "--w": `${(w / WEIGHTS.heat) * 100}%`, ...d(300 + i * 120) } as CSSProperties} />
                  </div>
                  <p className="mt-1 text-xs text-muted">{note}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid content-center gap-3">
            {CATEGORIES.map((c, i) => (
              <div key={c.key} className="reveal flex items-center gap-4 rounded-2xl bg-white p-5 ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-md" style={d(150 + i * 120)}>
                <span className="h-12 w-1.5 shrink-0 rounded-full" style={{ background: c.color }} />
                <div><p className="font-semibold" style={{ color: c.color }}>{c.label}</p><p className="text-sm text-muted">{c.meaning}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Try it */}
      <section id="try" className="scroll-mt-6 bg-gradient-to-b from-paper to-white">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-10 text-center">
            <p className={`reveal ${eyebrow} text-heat`}>Try it</p>
            <h2 className="reveal text-[clamp(1.9rem,4vw,2.8rem)] font-medium" style={d(100)}>Build a package. Watch the risk fall.</h2>
          </div>
          <div className="reveal" style={d(200)}><TryIt /></div>
        </div>
      </section>

      {/* Users and COP31 */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <p className={`reveal ${eyebrow} text-blue`}>Who it's for</p>
        <h2 className="reveal max-w-[22ch] text-[clamp(1.9rem,4vw,2.8rem)] font-medium" style={d(100)}>Built for the people who decide where the money goes.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {USERS.map(([t, b], i) => (
            <div key={t} className="reveal rounded-2xl bg-white p-6 ring-1 ring-line" style={d(150 + i * 120)}>
              <p className="font-serif text-xl">{t}</p>
              <p className="mt-2 text-sm text-muted">{b}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-2">
          {([
            ["Resilient Cities & Buildings", "25%", "cut in building-sector energy use by 2035", "Targets insulation and shading where they cut the most energy and heat risk."],
            ["Electrification", "35%", "electrification by 2035", "Sequences the switch so the grid and residents can absorb it safely."],
          ] as const).map(([p, v, target, how], i) => (
            <div key={p} className="reveal relative overflow-hidden rounded-2xl bg-night p-7 text-white" style={d(150 + i * 120)}>
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-heat/30 blur-3xl" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber">COP31 priority · {p}</p>
              <p className="mt-4 font-serif text-5xl">{v}</p>
              <p className="text-white/70">{target}</p>
              <p className="mt-4 border-t border-white/15 pt-4 text-sm">{how}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">Targets as stated in the Climate Hack-tion 2026 challenge materials.</p>
      </section>

      {/* CTA */}
      <section className="heat-bg relative overflow-hidden text-white">
        <div className="relative mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="reveal text-[clamp(2rem,4.5vw,3.2rem)] font-medium">See every neighbourhood on the map.</h2>
          <p className="reveal mx-auto mt-4 max-w-[50ch] text-white/70" style={d(100)}>Click an area, switch measures on and off, and compare cost against the residents each plan protects.</p>
          <div className="reveal mt-8 flex flex-wrap justify-center gap-3" style={d(200)}>
            <Link href="/dashboard" className="rounded-full bg-white px-6 py-3 font-semibold text-ink no-underline transition hover:-translate-y-0.5 hover:shadow-lg">Open the resilience map →</Link>
            <Link href="/methodology" className="rounded-full px-6 py-3 font-semibold text-white no-underline ring-1 ring-white/30 transition hover:bg-white/10">Method and limits</Link>
          </div>
          <p className="reveal mx-auto mt-12 max-w-[60ch] text-xs text-white/50" style={d(300)}>
            Prototype for Climate Hack-tion 2026. Neighbourhood figures are illustrative sample data, not measured values or a live electricity-network model.
          </p>
        </div>
      </section>
    </main>
  );
}
