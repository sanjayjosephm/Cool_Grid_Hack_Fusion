"use client";
// Auto-playing scenario story for the landing page. Numbers come from the review engine (passed in as props).
import { useEffect, useState } from "react";

export type StoryScenario = {
  id: string; title: string; headline: string; detail: string;
  bars: { label: string; value: number }[]; demand: number;
};

function Illustration({ id }: { id: string }) {
  if (id === "heat") return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden="true">
      <g className="sun"><circle cx="60" cy="60" r="20" fill="#F2C46B" />{Array.from({ length: 8 }, (_, i) => <rect key={i} x="58" y="18" width="4" height="12" rx="2" fill="#F2C46B" transform={`rotate(${i * 45} 60 60)`} />)}</g>
      <rect x="94" y="30" width="10" height="70" rx="5" fill="#ffffff22" stroke="#fff" strokeOpacity="0.4" />
      <rect x="96" y="40" width="6" height="58" rx="3" fill="#E2562F" className="rise" />
    </svg>
  );
  if (id === "outage") return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden="true">
      <rect x="14" y="40" width="84" height="40" rx="6" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="3" />
      <rect x="98" y="52" width="8" height="16" rx="2" fill="#fff" fillOpacity="0.7" />
      <rect key="drain" x="19" y="45" width="74" height="30" rx="3" fill="#7FD3A8" className="drain" />
      <text x="56" y="102" textAnchor="middle" fontSize="12" fill="#F08A6B" fontWeight="700" className="blink">5.2 h</text>
    </svg>
  );
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden="true">
      <rect x="10" y="58" width="100" height="8" fill="#fff" fillOpacity="0.8" />
      <rect x="20" y="66" width="6" height="30" fill="#fff" fillOpacity="0.5" /><rect x="94" y="66" width="6" height="30" fill="#fff" fillOpacity="0.5" />
      <path className="wave" d="M0 74 Q15 64 30 74 T60 74 T90 74 T120 74 V120 H0 Z" fill="#2B6CB0" fillOpacity="0.85" />
      <g stroke="#F08A6B" strokeWidth="6" strokeLinecap="round" className="blink"><line x1="48" y1="30" x2="72" y2="54" /><line x1="72" y1="30" x2="48" y2="54" /></g>
    </svg>
  );
}

export default function ScenarioStory({ scenarios }: { scenarios: StoryScenario[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [grown, setGrown] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGrown(true), 300); return () => clearTimeout(t); }, [i]);
  useEffect(() => {
    if (paused || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => { setGrown(false); setI((x) => (x + 1) % scenarios.length); }, 6000);
    return () => clearInterval(t);
  }, [paused, scenarios.length]);
  const s = scenarios[i];

  return (
    <div className="overflow-hidden rounded-3xl bg-night text-white ring-1 ring-white/10" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="flex border-b border-white/10" role="tablist" aria-label="Scenarios">
        {scenarios.map((x, j) => (
          <button key={x.id} role="tab" aria-selected={i === j} onClick={() => { setGrown(false); setI(j); }}
            className={`relative flex-1 px-4 py-3 text-sm font-semibold transition-colors ${i === j ? "text-white" : "text-white/45 hover:text-white/75"}`}>
            {x.title}
            {/* Progress bar for auto-play: grows left to right over 6 s; full while paused. */}
            {i === j && <span key={`${i}-${paused}`} className="absolute bottom-0 left-0 h-0.5 w-full bg-amber" style={{ transformOrigin: "left", animation: paused ? undefined : "drain 6s linear reverse forwards" }} />}
          </button>
        ))}
      </div>
      <div key={s.id} className="grid gap-6 p-6 md:grid-cols-[auto_1fr] md:p-8">
        <div className="flex items-center justify-center"><Illustration id={s.id} /></div>
        <div>
          <p className="font-serif text-2xl leading-snug md:text-3xl">{s.headline}</p>
          <p className="mt-2 text-sm text-white/65">{s.detail}</p>
          <div className="mt-6 space-y-3">
            {s.bars.map((b) => (
              <div key={b.label}>
                <div className="flex justify-between text-sm"><span>{b.label}</span><span className="tabular-nums text-white/70">{b.value} of {s.demand} places</span></div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full transition-[width] duration-1000 ease-out" style={{ width: grown ? `${(b.value / s.demand) * 100}%` : "0%", background: b.value / s.demand >= 0.6 ? "#7FD3A8" : b.value > 0 ? "#F2C46B" : "#F08A6B" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
