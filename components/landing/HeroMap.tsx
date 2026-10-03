// Living map for the landing page: real ABS suburb outlines, Vicmap facilities and flood crossings, and routed
// dependencies from Albion. Pure SVG + CSS animation; cycles through heat, outage and flood every 15 s.
import type { CSSProperties } from "react";
import { areaScores } from "@/lib/area-context";
import { DEMO_FACILITIES } from "@/lib/demo-review";
import { ACCESS_LINKS, AREA_GEOJSON, CROSSINGS, FACILITIES } from "@/lib/planning-data";
import accessData from "@/lib/data/access-links.json";

const W = 600;
const ALBION = "20021";
const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

// Ray-casting point-in-polygon, so only crossings inside the study suburbs are drawn.
function inRing([x, y]: number[], ring: number[][]) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

export default function HeroMap() {
  const pts = AREA_GEOJSON.features.flatMap((f) => f.geometry.coordinates[0]);
  const [minX, maxX] = [Math.min(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[0]))];
  const [minY, maxY] = [Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[1]))];
  const k = Math.cos((((minY + maxY) / 2) * Math.PI) / 180); // shrink longitude to keep shapes true
  const pad = 16;
  const scale = (W - 2 * pad) / ((maxX - minX) * k);
  const H = Math.round((maxY - minY) * scale + 2 * pad);
  const xy = ([x, y]: number[]) => [pad + (x - minX) * k * scale, pad + (maxY - y) * scale] as const;

  // Shade by area context score, stretched across the study suburbs: amber (lower need) to deep red (higher need).
  const all = areaScores();
  const lo = Math.min(...all.map((a) => a.score)), hi = Math.max(...all.map((a) => a.score));
  const scores = new Map(all.map((a) => [a.sal, hi === lo ? 0.5 : (a.score - lo) / (hi - lo)]));
  const heat = (t: number) => `hsl(${Math.round(46 - t * 42)} ${Math.round(80 + t * 10)}% ${Math.round(64 - t * 26)}%)`;
  const albion = accessData.centres.find((c) => c.sal === ALBION)!.centre;
  const albionLinks = ACCESS_LINKS.filter((l) => l.from === ALBION && DEMO_FACILITIES.includes(l.to));
  const crossings = CROSSINGS.filter((c) => AREA_GEOJSON.features.some((f) => inRing(c.location.value, f.geometry.coordinates[0])));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Animated map of the ten study suburbs, their facilities and flood-exposed road crossings">
      <defs>
        <radialGradient id="glow"><stop offset="0%" stopColor="#E2562F" stopOpacity="0.55" /><stop offset="100%" stopColor="#E2562F" stopOpacity="0" /></radialGradient>
        <radialGradient id="water"><stop offset="0%" stopColor="#2B6CB0" stopOpacity="0.55" /><stop offset="100%" stopColor="#2B6CB0" stopOpacity="0" /></radialGradient>
      </defs>

      {/* Scenario washes */}
      <rect className="story-heat" x="0" y="0" width={W} height={H} fill="url(#glow)" opacity="0.6" />
      <rect className="story-flood" x="0" y="0" width={W} height={H} fill="url(#water)" opacity="0" />

      {AREA_GEOJSON.features.map((f, i) => {
        const path = "M" + f.geometry.coordinates[0].map((p) => xy(p).map((v) => v.toFixed(1)).join(",")).join("L") + "Z";
        return (
          <g key={f.properties.sal}>
            <path d={path} className="fill-in" fill={heat(scores.get(f.properties.sal) ?? 0)} style={{ ...d(900 + i * 140), "--fo": 0.5 } as CSSProperties} />
            <path d={path} pathLength={1} className="draw-in" fill="none" stroke="#fff" strokeOpacity="0.85" strokeWidth="1.2" style={d(i * 140)} />
          </g>
        );
      })}

      {/* Routed dependencies from Albion: cut in the flood phase when they cross a flooded road */}
      {albionLinks.map((l) => {
        const f = FACILITIES.find((x) => x.id === l.to)!;
        const [x1, y1] = xy(albion), [x2, y2] = xy(f.location.value);
        const cut = (l.dependsOn.value ?? []).length > 0;
        return <line key={l.to} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="1.6" stroke="#7FD3A8" className={`flow ${cut ? "story-cut" : ""}`} />;
      })}
      <circle cx={xy(albion)[0]} cy={xy(albion)[1]} r="4" fill="#fff" />
      <text x={xy(albion)[0] - 8} y={xy(albion)[1] - 8} textAnchor="end" fontSize="12" fontWeight="700" fill="#fff" paintOrder="stroke" stroke="#0E141C" strokeWidth="3">Albion</text>

      {crossings.map((c, i) => {
        const [x, y] = xy(c.location.value);
        return <circle key={c.id} cx={x} cy={y} r="3" fill="#E0A030" className="story-close twinkle" style={d((i % 7) * 300)} />;
      })}

      {FACILITIES.map((f, i) => {
        const [x, y] = xy(f.location.value);
        return (
          <g key={f.id} className="story-dim">
            <circle cx={x} cy={y} r="5" fill="#7FB2DD" className="pulse-ring" style={d(i * 260)} />
            <circle cx={x} cy={y} r="5" fill="#fff" stroke="#1d4ed8" strokeWidth="2.5" />
          </g>
        );
      })}

      {/* Captions, one per phase */}
      <g fontSize="13" fontWeight="600" fill="#fff">
        <text className="story-heat" x="16" y={H - 14}>☀ Heat: facilities open, all roads dry</text>
        <text className="story-outage" x="16" y={H - 14} opacity="0">⚡ Outage: only facilities with working backup stay on</text>
        <text className="story-flood" x="16" y={H - 14} opacity="0">≈ Flood: crossings close, routes from Albion break</text>
      </g>
    </svg>
  );
}
