// Animated header illustrations for the inner pages (pure SVG + CSS, decorative only).
import type { CSSProperties } from "react";

export type Art = "continuity" | "investment" | "regional" | "validation" | "method" | "resident" | "brief";
const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
const S = { className: "h-44 w-full max-w-[340px] md:h-52", "aria-hidden": true as const };

export default function HeaderArt({ art }: { art: Art }) {
  if (art === "continuity") return (
    <svg viewBox="0 0 300 200" {...S}>
      <circle cx="150" cy="100" r="70" fill="none" stroke="#fff" strokeOpacity="0.12" strokeDasharray="4 6" className="flow" />
      {[["☀", "#E2562F", 150, 30, 0], ["⚡", "#E0A030", 211, 135, 600], ["≈", "#2B6CB0", 89, 135, 1200]].map(([icon, c, x, y, delay]) => (
        <g key={String(icon)}>
          <circle cx={Number(x)} cy={Number(y)} r="22" fill={String(c)} className="pulse-ring" style={d(Number(delay))} />
          <circle cx={Number(x)} cy={Number(y)} r="22" fill={String(c)} />
          <text x={Number(x)} y={Number(y) + 7} textAnchor="middle" fontSize="20" fill="#fff">{icon}</text>
        </g>
      ))}
      <circle cx="150" cy="100" r="16" fill="#fff" /><circle cx="150" cy="100" r="7" fill="#E2562F" className="twinkle" />
    </svg>
  );
  if (art === "investment") return (
    <svg viewBox="0 0 300 200" {...S}>
      <line x1="30" y1="170" x2="280" y2="170" stroke="#fff" strokeOpacity="0.3" />
      {[60, 95, 75, 130, 110, 150].map((h, i) => (
        <rect key={i} x={45 + i * 38} y={170 - h} width="24" height={h} rx="4" fill={i % 2 ? "#7FD3A8" : "#F2C46B"} className="rise" style={{ animationDelay: `${i * 0.25}s` }} />
      ))}
      <text x="270" y="40" textAnchor="end" fontSize="34" fill="#fff" fillOpacity="0.85" className="twinkle">$</text>
    </svg>
  );
  if (art === "regional") return (
    <svg viewBox="0 0 300 200" {...S}>
      <defs><linearGradient id="river" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2B6CB0" stopOpacity="0.9" /><stop offset="100%" stopColor="#2B6CB0" stopOpacity="0" /></linearGradient></defs>
      <path className="wave" d="M0 120 Q40 105 80 120 T160 120 T240 120 T320 120 V200 H0 Z" fill="url(#river)" />
      <rect x="40" y="96" width="220" height="10" rx="3" fill="#fff" fillOpacity="0.85" />
      {[70, 130, 190, 240].map((x) => <rect key={x} x={x} y="106" width="6" height="40" fill="#fff" fillOpacity="0.5" />)}
      <circle cx="150" cy="101" r="5" fill="#F08A6B" className="blink" />
      <text x="40" y="80" fontSize="13" fill="#fff" fillOpacity="0.8">Mooroopna</text>
      <text x="260" y="80" textAnchor="end" fontSize="13" fill="#fff" fillOpacity="0.8">Shepparton</text>
    </svg>
  );
  if (art === "validation") return (
    <svg viewBox="0 0 300 200" {...S}>
      {[0, 1, 2, 3].map((i) => (
        <g key={i} className="reveal-tick" style={d(300 + i * 350)}>
          <rect x="60" y={30 + i * 38} width="180" height="28" rx="8" fill="#fff" fillOpacity="0.08" />
          <circle cx="80" cy={44 + i * 38} r="9" fill="#3E8E6A" />
          <path d={`M75 ${44 + i * 38} l4 4 l7 -8`} stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <rect x="98" y={40 + i * 38} width={[110, 80, 120, 95][i]} height="8" rx="4" fill="#fff" fillOpacity="0.35" />
        </g>
      ))}
    </svg>
  );
  if (art === "method") return (
    <svg viewBox="0 0 300 200" {...S}>
      {["ABS", "Vicmap", "Engine", "Brief"].map((t, i) => (
        <g key={t}>
          <rect x={10 + i * 74} y="80" width="60" height="40" rx="10" fill={["#2B6CB0", "#3E8E6A", "#E2562F", "#E0A030"][i]} fillOpacity="0.85" className="twinkle" style={d(i * 400)} />
          <text x={40 + i * 74} y="105" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">{t}</text>
          {i < 3 && <line x1={70 + i * 74} y1="100" x2={84 + i * 74} y2="100" stroke="#fff" strokeWidth="2" className="flow" />}
        </g>
      ))}
    </svg>
  );
  if (art === "brief") return (
    <svg viewBox="0 0 300 200" {...S}>
      <rect x="90" y="20" width="120" height="160" rx="10" fill="#fff" fillOpacity="0.92" />
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x="108" y={48 + i * 24} width={[84, 64, 76, 52, 70][i]} height="8" rx="4" fill="#1B2430" fillOpacity="0.25" className="grow-x" style={d(300 + i * 200)} />)}
      <circle cx="200" cy="160" r="18" fill="#3E8E6A" className="pulse-ring" />
      <circle cx="200" cy="160" r="18" fill="#3E8E6A" /><path d="M192 160 l6 6 l10 -12" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
  return (
    <svg viewBox="0 0 300 200" {...S}>
      <g className="sun"><circle cx="220" cy="55" r="22" fill="#F2C46B" />{Array.from({ length: 8 }, (_, i) => <rect key={i} x="218" y="20" width="4" height="10" rx="2" fill="#F2C46B" transform={`rotate(${i * 45} 220 55)`} />)}</g>
      <path d="M70 120 L130 75 L190 120 Z" fill="#E2562F" /><rect x="85" y="120" width="90" height="60" fill="#fff" fillOpacity="0.9" />
      <rect x="120" y="140" width="22" height="40" fill="#2B6CB0" /><rect x="95" y="132" width="18" height="16" fill="#7FB2DD" />
      <path className="wave" d="M0 185 Q40 175 80 185 T160 185 T240 185 T320 185 V200 H0 Z" fill="#2B6CB0" fillOpacity="0.6" />
    </svg>
  );
}
