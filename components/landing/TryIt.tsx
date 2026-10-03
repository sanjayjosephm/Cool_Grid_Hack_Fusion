"use client";
import { useState } from "react";
import { NEIGHBOURHOODS } from "@/lib/data";
import { applyMeasures, Measures, MEASURE_INFO, NO_MEASURES } from "@/lib/model";

const fmt = (n: number) => (n === 0 ? "$0" : "$" + (n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : Math.round(n / 1000) + "k"));
const R = 54;
const C = 2 * Math.PI * R;

// Small live version of the dashboard: pick an area, switch measures on, watch the priority score fall.
export default function TryIt() {
  const ranked = [...NEIGHBOURHOODS].sort((a, b) => applyMeasures(b, NO_MEASURES).score - applyMeasures(a, NO_MEASURES).score);
  const [id, setId] = useState(ranked[0].id);
  const [m, setM] = useState<Measures>(NO_MEASURES);
  const n = NEIGHBOURHOODS.find((x) => x.id === id)!;
  const before = applyMeasures(n, NO_MEASURES);
  const after = applyMeasures(n, m);
  const drop = before.score - after.score;

  return (
    <div className="grid gap-8 rounded-2xl bg-white p-6 shadow-[0_20px_60px_-20px_rgba(14,20,28,0.35)] ring-1 ring-line md:grid-cols-[1fr_260px] md:p-8">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">1. Pick a neighbourhood</p>
        <div className="mb-6 flex flex-wrap gap-2">
          {ranked.map((x) => (
            <button key={x.id} onClick={() => { setId(x.id); setM(NO_MEASURES); }} aria-pressed={x.id === id}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors ${x.id === id ? "bg-ink text-white" : "bg-paper text-ink hover:bg-line"}`}>
              {x.name}
            </button>
          ))}
        </div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">2. Pair electrification with</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(MEASURE_INFO) as (keyof Measures)[]).map((k) => (
            <button key={k} onClick={() => setM((p) => ({ ...p, [k]: !p[k] }))} aria-pressed={m[k]}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-all ${m[k] ? "border-ink bg-ink/5" : "border-line hover:border-muted"}`}>
              <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] transition-colors ${m[k] ? "border-ink bg-ink text-white" : "border-muted"}`}>{m[k] ? "✓" : ""}</span>
              <span><span className="block font-medium">{MEASURE_INFO[k].label}</span><span className="text-muted">{MEASURE_INFO[k].note}</span></span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center text-center" aria-live="polite">
        <div className="relative h-44 w-44">
          <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="70" cy="70" r={R} fill="none" stroke="#E4E8EC" strokeWidth="12" />
            <circle cx="70" cy="70" r={R} fill="none" stroke={after.category.color} strokeWidth="12" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - after.score / 100)} className="transition-all duration-700 ease-out" />
          </svg>
          <span className="absolute inset-0 grid place-items-center font-serif text-5xl tabular-nums">{after.score}</span>
        </div>
        <p className="mt-3 text-xs uppercase tracking-[0.14em] text-muted">Priority score</p>
        <p className="mt-1 font-semibold transition-colors" style={{ color: after.category.color }}>{after.category.label}</p>
        <p className="mt-1 text-sm text-muted">{drop > 0 ? `Down ${drop} from ${before.score}` : after.category.meaning}</p>
        <dl className="mt-5 grid w-full grid-cols-2 gap-3 text-left text-sm">
          <div className="rounded-lg bg-paper px-3 py-2"><dt className="text-muted">Package cost</dt><dd className="font-semibold tabular-nums">{fmt(after.cost)}</dd></div>
          <div className="rounded-lg bg-paper px-3 py-2"><dt className="text-muted">Vulnerable covered</dt><dd className="font-semibold tabular-nums">{after.covered.toLocaleString()}</dd></div>
        </dl>
      </div>
    </div>
  );
}
