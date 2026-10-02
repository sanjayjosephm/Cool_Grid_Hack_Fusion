"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { NEIGHBOURHOODS, geojson } from "@/lib/data";
import { applyMeasures, Measures, MEASURE_INFO, NO_MEASURES } from "@/lib/model";

const fmt = (n: number) => "$" + (n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : Math.round(n / 1000) + "k");

export default function Dashboard() {
  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const [selected, setSelected] = useState(NEIGHBOURHOODS[0].id);
  const [m, setM] = useState<Measures>(NO_MEASURES);

  const base = useMemo(() => NEIGHBOURHOODS.map((n) => applyMeasures(n, NO_MEASURES)), []);
  const n = NEIGHBOURHOODS.find((x) => x.id === selected)!;
  const before = applyMeasures(n, NO_MEASURES);
  const after = applyMeasures(n, m);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibre = (await import("maplibre-gl")).default;
      if (cancelled || !mapEl.current) return;
      const data = geojson((x) => ({ color: base[NEIGHBOURHOODS.indexOf(x)].category.color }));
      const hubs = {
        type: "FeatureCollection" as const,
        features: NEIGHBOURHOODS.filter((x) => x.hasHub).map((x) => ({ type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: [x.lng, x.lat] } })),
      };
      const mp = new maplibre.Map({
        container: mapEl.current,
        // No online basemap: works offline and avoids tile-licence issues. Labels need glyphs, so we skip text layers.
        style: { version: 8, sources: {}, layers: [{ id: "bg", type: "background", paint: { "background-color": "#DCE3EA" } }] },
        center: [144.86, -37.77], zoom: 10.6,
      });
      map.current = mp;
      mp.on("load", () => {
        mp.addSource("areas", { type: "geojson", data, promoteId: "id" });
        mp.addLayer({ id: "fill", type: "fill", source: "areas", paint: { "fill-color": ["get", "color"], "fill-opacity": 0.8 } });
        mp.addLayer({ id: "line", type: "line", source: "areas", paint: { "line-color": "#1B2430", "line-width": ["case", ["boolean", ["feature-state", "sel"], false], 4, 1] } });
        mp.addSource("hubs", { type: "geojson", data: hubs });
        mp.addLayer({ id: "hubs", type: "circle", source: "hubs", paint: { "circle-radius": 8, "circle-color": "#2B6CB0", "circle-stroke-color": "#fff", "circle-stroke-width": 2 } });
        mp.on("click", "fill", (e) => { const id = e.features?.[0]?.properties?.id; if (id) setSelected(id); });
        mp.on("mouseenter", "fill", () => (mp.getCanvas().style.cursor = "pointer"));
        mp.on("mouseleave", "fill", () => (mp.getCanvas().style.cursor = ""));
        mp.setFeatureState({ source: "areas", id: NEIGHBOURHOODS[0].id }, { sel: true });
      });
    })();
    return () => { cancelled = true; map.current?.remove(); map.current = null; };
  }, [base]);

  useEffect(() => {
    const mp = map.current;
    if (!mp || !mp.getSource("areas")) return;
    NEIGHBOURHOODS.forEach((x) => mp.setFeatureState({ source: "areas", id: x.id }, { sel: x.id === selected }));
  }, [selected]);

  const toggle = (k: keyof Measures) => setM((p) => ({ ...p, [k]: !p[k] }));
  const drivers = [["Heat exposure", n.heat], ["Social vulnerability", n.vulnerability], ["Building inefficiency", n.building], ["Grid stress", n.grid]] as const;
  const top = [...drivers].sort((a, b) => b[1] - a[1]).slice(0, 2).map((d) => d[0].toLowerCase());
  const advice = before.score >= 35
    ? `${n.name} should not get electrification alone. High ${top[0]} and ${top[1]} are the main concerns, so pair heat pumps with the measures below.`
    : `${n.name} is ready for standard electrification support.`;

  return (
    <div className="dash">
      <div className="mapbox">
        <div id="map" ref={mapEl} aria-label="Map of sample Melbourne neighbourhoods coloured by CoolGrid priority" />
        <div className="legend">
          {[["#3E8E6A", "Ready to electrify"], ["#E0A030", "Electrify, add support"], ["#C8402F", "Resilience first"], ["#8E1F1A", "Urgent"], ["#2B6CB0", "Backup-powered cooling hub"]].map(([c, l]) => (
            <div key={l}><span style={{ background: c }} />{l}</div>
          ))}
        </div>
      </div>
      <aside className="panel">
        <h2>{n.name}</h2>
        <p className="muted">{n.council} · {n.population.toLocaleString()} residents · {n.homes.toLocaleString()} homes</p>
        <span className="badge" style={{ background: before.category.color }}>{before.category.label}: {before.score}/100</span>
        <p>{advice}</p>
        {drivers.map(([l, v]) => (<div key={l}><div className="muted">{l}: {v}</div><div className="bar"><i style={{ width: v + "%" }} /></div></div>))}

        <h3 style={{ marginTop: "1.2rem" }}>Compare options</h3>
        <p className="muted">Switch measures on to see how the plan changes. Costs assume 40% of homes take up each home-level measure.</p>
        {(Object.keys(MEASURE_INFO) as (keyof Measures)[]).map((k) => (
          <label className="toggle" key={k}>
            <input type="checkbox" checked={m[k]} onChange={() => toggle(k)} />
            <span>{MEASURE_INFO[k].label}<br /><span className="muted">{MEASURE_INFO[k].note}</span></span>
          </label>
        ))}
        <div className="cards">
          <div className="card"><span className="muted">Priority score</span><b>{after.score}</b><span className="delta">was {before.score}</span></div>
          <div className="card"><span className="muted">Heat resilience</span><b>{after.heatResilience}</b><span className="delta">was {before.heatResilience}</span></div>
          <div className="card"><span className="muted">Peak-demand pressure</span><b>{after.peakPressure}</b><span className="delta">was {before.peakPressure}</span></div>
          <div className="card"><span className="muted">Emissions cut (relative)</span><b>{after.emissions}</b><span className="delta">was {before.emissions}</span></div>
          <div className="card"><span className="muted">Vulnerable residents with hub access</span><b>{after.covered.toLocaleString()}</b><span className="delta">was {before.covered.toLocaleString()}</span></div>
          <div className="card"><span className="muted">Estimated cost</span><b>{fmt(after.cost)}</b></div>
        </div>
        <p className="note">Outcomes are modelled relative scores from stated assumptions, not predictions. Sample data only.</p>
        <button className="btn" onClick={() => setM(NO_MEASURES)}>Reset measures</button>
      </aside>
    </div>
  );
}
