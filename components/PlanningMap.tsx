"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import Link from "next/link";
import { AREAS, AREA_GEOJSON, CROSSINGS, FACILITIES, FACILITY_GEOJSON, FLOOD_AREAS, formatSourcedValue, sourcedRows } from "@/lib/planning-data";
import energyData from "@/lib/data/energy.json";
import heatData from "@/lib/data/heat.json";

// P2-D6: road crossings inside riverine flood overlays (main roads and local streets).
const CROSSING_GEOJSON = {
  type: "FeatureCollection" as const,
  features: CROSSINGS.map((c) => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: c.location.value }, properties: { id: c.id, road: c.road, local: Boolean((c as { local?: boolean }).local) } })),
};

type Layer = "context" | "flood";
type Selection = { kind: "area"; id: string } | { kind: "facility"; id: string };

const contextColors = ["#7f1d1d", "#b45309", "#ca8a04", "#65a30d", "#15803d"];
const FALLBACK_WIDTH = 960;
const FALLBACK_HEIGHT = 640;
const FALLBACK_PADDING = 42;

const allMapPoints = [
  ...AREA_GEOJSON.features.flatMap((feature) => feature.geometry.coordinates[0]),
  ...FACILITY_GEOJSON.features.map((feature) => feature.geometry.coordinates),
];
const mapCenterLatitude = allMapPoints.reduce((sum, point) => sum + point[1], 0) / allMapPoints.length;
const longitudeScale = Math.cos((mapCenterLatitude * Math.PI) / 180);
const projectedPoints = allMapPoints.map(([lng, lat]) => [lng * longitudeScale, lat]);
const mapBounds = {
  minX: Math.min(...projectedPoints.map(([x]) => x)),
  maxX: Math.max(...projectedPoints.map(([x]) => x)),
  minY: Math.min(...projectedPoints.map(([, y]) => y)),
  maxY: Math.max(...projectedPoints.map(([, y]) => y)),
};
const mapScale = Math.min(
  (FALLBACK_WIDTH - FALLBACK_PADDING * 2) / (mapBounds.maxX - mapBounds.minX),
  (FALLBACK_HEIGHT - FALLBACK_PADDING * 2) / (mapBounds.maxY - mapBounds.minY),
);

function fallbackPoint(lng: number, lat: number) {
  const x = (lng * longitudeScale - mapBounds.minX) * mapScale;
  const y = (mapBounds.maxY - lat) * mapScale;
  const drawnWidth = (mapBounds.maxX - mapBounds.minX) * mapScale;
  const drawnHeight = (mapBounds.maxY - mapBounds.minY) * mapScale;
  return [
    FALLBACK_PADDING + (FALLBACK_WIDTH - FALLBACK_PADDING * 2 - drawnWidth) / 2 + x,
    FALLBACK_PADDING + (FALLBACK_HEIGHT - FALLBACK_PADDING * 2 - drawnHeight) / 2 + y,
  ] as const;
}

function mapFill(layer: Layer, decile: number, riverinePct: number) {
  if (layer === "context") {
    const index = decile <= 2 ? 0 : decile <= 4 ? 1 : decile <= 6 ? 2 : decile <= 8 ? 3 : 4;
    return contextColors[index];
  }
  return riverinePct >= 8 ? "#1e40af" : riverinePct >= 4 ? "#60a5fa" : riverinePct >= 1 ? "#bfdbfe" : "#eff6ff";
}

function mapFailureReason(error: unknown) {
  const detail = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /webgl|context|gpu/i.test(detail)
    ? "This browser or device could not create the WebGL graphics context MapLibre requires."
    : "MapLibre could not initialize its online basemap.";
}

function SourceRows({ rows }: { rows: ReturnType<typeof sourcedRows> }) {
  return (
    <dl className="divide-y divide-line">
      {rows.map((row) => (
        <div className="py-3" key={row.key}>
          <dt className="text-sm font-semibold capitalize">{row.label}</dt>
          <dd className="mt-1 break-words text-sm">{formatSourcedValue(row.value)}</dd>
          <dd className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted">
            <span className="rounded bg-paper px-2 py-0.5 capitalize">{row.status}</span>
            <span>{row.date}</span>
            {row.licence && <span>{row.licence}</span>}
          </dd>
          <dd className="mt-1 text-xs text-muted">{row.source}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function PlanningMap() {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [layer, setLayer] = useState<Layer>("context");
  const [selection, setSelection] = useState<Selection>({ kind: "area", id: AREAS[0].sal });
  const [mapError, setMapError] = useState<string | null>(null);
  const [useStaticMap, setUseStaticMap] = useState(false);

  const selectedArea = selection.kind === "area" ? AREAS.find((area) => area.sal === selection.id) : undefined;
  const selectedFacility = selection.kind === "facility" ? FACILITIES.find((facility) => facility.id === selection.id) : undefined;
  const selectedFlood = selectedArea ? FLOOD_AREAS.find((area) => area.sal === selectedArea.sal) : undefined;
  const detailRows = selectedArea
    ? [
        ...sourcedRows(selectedArea, ["sal", "name", "lga", "check"]),
        ...(selectedFlood ? sourcedRows(selectedFlood, ["sal", "name", "check"]).map((row) => ({ ...row, key: `flood.${row.key}`, label: `Flood · ${row.label}` })) : []),
      ]
    : selectedFacility ? sourcedRows(selectedFacility, ["id", "name", "type", "sal"]) : [];

  useEffect(() => {
    let cancelled = false;
    let loaded = false;
    let failed = false;

    void import("maplibre-gl").then(({ default: maplibre }) => {
      if (cancelled || !mapElement.current) return;
      const map = new maplibre.Map({
        container: mapElement.current,
        style: "https://tiles.openfreemap.org/styles/positron",
        center: [144.86, -37.75],
        zoom: 10,
      });
      mapRef.current = map;
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      map.on("error", (event) => {
        if (!loaded && !failed && event.error) {
          failed = true;
          setMapError(mapFailureReason(event.error));
          setUseStaticMap(true);
          map.remove();
          mapRef.current = null;
        }
      });
      map.on("load", () => {
        if (cancelled) return;
        loaded = true;
        map.addSource("study-areas", { type: "geojson", data: AREA_GEOJSON, promoteId: "sal" });
        map.addLayer({
          id: "area-fill",
          type: "fill",
          source: "study-areas",
          paint: {
            "fill-color": [
              "interpolate", ["linear"], ["get", "decile"],
              1, contextColors[0], 3, contextColors[1], 5, contextColors[2], 7, contextColors[3], 10, contextColors[4],
            ],
            "fill-opacity": ["case", ["boolean", ["feature-state", "selected"], false], 0.68, 0.42],
          },
        });
        map.addLayer({
          id: "area-outline",
          type: "line",
          source: "study-areas",
          paint: {
            "line-color": ["case", ["boolean", ["feature-state", "selected"], false], "#0e141c", "#697586"],
            "line-width": ["case", ["boolean", ["feature-state", "selected"], false], 3, 1],
          },
        });
        map.addLayer({
          id: "area-labels",
          type: "symbol",
          source: "study-areas",
          layout: { "text-field": ["get", "name"], "text-size": 12, "text-allow-overlap": false },
          paint: { "text-color": "#1B2430", "text-halo-color": "#fff", "text-halo-width": 1.5 },
        });
        map.addSource("crossings", { type: "geojson", data: CROSSING_GEOJSON });
        map.addLayer({
          id: "crossing-points",
          type: "circle",
          source: "crossings",
          paint: { "circle-radius": ["case", ["get", "local"], 3, 4.5], "circle-color": "#E0A030", "circle-stroke-color": "#7a4f00", "circle-stroke-width": 1 },
        });
        map.addSource("facilities", { type: "geojson", data: FACILITY_GEOJSON, promoteId: "id" });
        map.addLayer({
          id: "facility-points",
          type: "circle",
          source: "facilities",
          paint: { "circle-radius": 7, "circle-color": "#1d4ed8", "circle-stroke-color": "#fff", "circle-stroke-width": 2 },
        });
        map.on("click", "area-fill", (event) => {
          const sal = event.features?.[0]?.properties?.sal;
          if (typeof sal === "string") setSelection({ kind: "area", id: sal });
        });
        map.on("click", "facility-points", (event) => {
          const id = event.features?.[0]?.properties?.id;
          if (typeof id === "string") setSelection({ kind: "facility", id });
        });
        for (const layerId of ["area-fill", "facility-points"]) {
          map.on("mouseenter", layerId, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", layerId, () => { map.getCanvas().style.cursor = ""; });
        }
        const coordinates = AREAS.map((area) => {
          const boundary = AREA_GEOJSON.features.find((feature) => feature.properties.sal === area.sal);
          if (!boundary) throw new Error(`Missing boundary for ${area.name}`);
          return boundary.geometry.coordinates[0];
        }).flat();
        map.fitBounds(
          [
            [Math.min(...coordinates.map((point) => point[0])), Math.min(...coordinates.map((point) => point[1]))],
            [Math.max(...coordinates.map((point) => point[0])), Math.max(...coordinates.map((point) => point[1]))],
          ],
          { padding: 44, duration: 0 },
        );
        map.setFeatureState({ source: "study-areas", id: AREAS[0].sal }, { selected: true });
      });
    }).catch((error: unknown) => {
      if (!cancelled) {
        setMapError(mapFailureReason(error));
        setUseStaticMap(true);
      }
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer("area-fill")) return;
    if (layer === "context") {
      map.setPaintProperty("area-fill", "fill-color", [
        "interpolate", ["linear"], ["get", "decile"],
        1, contextColors[0], 3, contextColors[1], 5, contextColors[2], 7, contextColors[3], 10, contextColors[4],
      ]);
      map.setPaintProperty("area-fill", "fill-opacity", ["case", ["boolean", ["feature-state", "selected"], false], 0.68, 0.42]);
    } else {
      map.setPaintProperty("area-fill", "fill-color", [
        "interpolate", ["linear"], ["get", "riverinePct"],
        0, "#eff6ff", 1, "#bfdbfe", 4, "#60a5fa", 10, "#1e40af",
      ]);
      map.setPaintProperty("area-fill", "fill-opacity", ["case", ["boolean", ["feature-state", "selected"], false], 0.78, 0.56]);
    }
  }, [layer]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getSource("study-areas")) return;
    for (const area of AREAS) {
      map.setFeatureState(
        { source: "study-areas", id: area.sal },
        { selected: selection.kind === "area" && selection.id === area.sal },
      );
    }
  }, [selection]);

  return (
    <main className="grid h-[calc(100vh-56px)] min-h-[620px] grid-cols-[minmax(0,1fr)_390px] max-[800px]:h-auto max-[800px]:min-h-0 max-[800px]:grid-cols-1">
      <section className="relative min-h-[380px] max-[800px]:h-[55vh]">
        {useStaticMap ? (
          <svg viewBox={`0 0 ${FALLBACK_WIDTH} ${FALLBACK_HEIGHT}`} className="h-full min-h-[380px] w-full bg-[#edf1f4]" role="group" aria-label="Static study-area map. Street basemap is unavailable.">
            <title>Study-area boundaries and facility locations</title>
            <desc>Interactive suburb polygons colored by the selected data layer, with facility markers. The street basemap could not be rendered by this browser.</desc>
            {AREA_GEOJSON.features.map((feature) => {
              const coordinates = feature.geometry.coordinates[0];
              const path = coordinates.map(([lng, lat], index) => {
                const [x, y] = fallbackPoint(lng, lat);
                return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
              }).join(" ") + " Z";
              const center = coordinates.slice(0, -1).reduce(
                (sum, [lng, lat]) => [sum[0] + lng, sum[1] + lat] as [number, number],
                [0, 0] as [number, number],
              );
              const labelPoint = fallbackPoint(center[0] / (coordinates.length - 1), center[1] / (coordinates.length - 1));
              const selected = selection.kind === "area" && selection.id === feature.properties.sal;
              const onSelect = () => setSelection({ kind: "area", id: feature.properties.sal });
              return (
                <g key={feature.properties.sal}>
                  <path d={path} fill={mapFill(layer, feature.properties.decile, feature.properties.riverinePct)}
                    fillOpacity={selected ? 0.82 : 0.62} stroke={selected ? "#0e141c" : "#526171"}
                    strokeWidth={selected ? 3 : 1.4} role="button" tabIndex={0}
                    aria-label={`Select ${feature.properties.name}`} onClick={onSelect}
                    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(); } }}
                    className="cursor-pointer focus:outline-none focus:stroke-[#2B6CB0]" />
                  <text x={labelPoint[0]} y={labelPoint[1]} textAnchor="middle" dominantBaseline="middle"
                    fontSize="12" fontWeight="600" fill="#1B2430" stroke="white" strokeWidth="3" paintOrder="stroke"
                    pointerEvents="none">{feature.properties.name}</text>
                </g>
              );
            })}
            {FACILITY_GEOJSON.features.map((feature) => {
              const [lng, lat] = feature.geometry.coordinates;
              const [x, y] = fallbackPoint(lng, lat);
              const onSelect = () => setSelection({ kind: "facility", id: feature.properties.id });
              return (
                <g key={feature.properties.id} role="button" tabIndex={0} aria-label={`Select facility ${feature.properties.name}`}
                  onClick={onSelect} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(); } }}
                  className="cursor-pointer focus:outline-none">
                  <circle cx={x} cy={y} r="8" fill="#1d4ed8" stroke="white" strokeWidth="3" />
                  <circle cx={x} cy={y} r="13" fill="transparent" />
                </g>
              );
            })}
          </svg>
        ) : <div ref={mapElement} className="h-full w-full" aria-label="Study area planning map" />}
        {mapError && (
          <div role="status" className="absolute left-3 right-3 top-16 z-[3] rounded-lg border border-amber bg-white p-3 text-sm text-ink shadow">
            {mapError} Showing study-area boundaries and facility locations in a lightweight map. Street and basemap labels are unavailable.
          </div>
        )}
        <div className="absolute left-3 top-3 z-[2] flex rounded-full bg-white p-1 text-sm shadow" role="group" aria-label="Map display">
          {(["context", "flood"] as const).map((item) => (
            <button key={item} type="button" aria-pressed={layer === item} onClick={() => setLayer(item)}
              className={`rounded-full px-3 py-1.5 font-medium ${layer === item ? "bg-ink text-white" : "text-ink hover:bg-paper"}`}>
              {item === "context" ? "Area context · SEIFA" : "Riverine flood"}
            </button>
          ))}
        </div>
        <div className="absolute bottom-3 left-3 z-[2] max-w-[min(420px,calc(100%-24px))] rounded-lg bg-white/95 px-3 py-2 text-xs shadow">
          {layer === "context" ? (
            <>
              <p className="font-semibold">ABS SEIFA IRSD national decile</p>
              <p className="text-muted">1 = most disadvantaged · 10 = least disadvantaged</p>
              <div className="mt-1 flex items-center gap-1">{contextColors.map((color, index) => <span key={color} className="h-2.5 flex-1" style={{ backgroundColor: color }} />)}</div>
            </>
          ) : (
            <>
              <p className="font-semibold">Share of suburb area in riverine overlays</p>
              <p className="text-muted">Vicmap LSIO and floodway overlays · % of area (not a route or flood prediction)</p>
              <div className="mt-1 flex items-center gap-1"><span className="h-2.5 flex-1 bg-[#eff6ff]" /><span className="h-2.5 flex-1 bg-[#bfdbfe]" /><span className="h-2.5 flex-1 bg-[#60a5fa]" /><span className="h-2.5 flex-1 bg-[#1e40af]" /></div>
              <div className="flex justify-between text-muted"><span>0%</span><span>1%</span><span>4%</span><span>10%+</span></div>
            </>
          )}
          <p className="mt-2"><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-blue-700 align-middle" /> Facility location</p>
          <p className="mt-1"><span className="mr-1 inline-block h-2 w-2 rounded-full border border-[#7a4f00] bg-[#E0A030] align-middle" /> Road crossing in a flood overlay ({CROSSINGS.length})</p>
        </div>
      </section>

      <aside className="overflow-y-auto border-l border-line bg-white px-5 pb-8 pt-5 max-[800px]:border-l-0">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted">Planning data · P1 map</p>
        <label className="mb-4 block text-sm font-semibold">
          Select a study area
          <select className="mt-1 block w-full rounded-lg border border-line bg-white px-3 py-2 font-normal" value={selectedArea?.sal ?? ""}
            onChange={(event) => setSelection({ kind: "area", id: event.target.value })}>
            {!selectedArea && <option value="">Select an area…</option>}
            {AREAS.map((area) => <option key={area.sal} value={area.sal}>{area.name}</option>)}
          </select>
        </label>
        {selectedArea ? (
          <>
            <h1 className="mb-1 text-2xl">{selectedArea.name}</h1>
            <p className="text-sm text-muted">{selectedArea.lga} · ABS SAL {selectedArea.sal}</p>
            <p className="my-4 rounded-lg border-l-4 border-amber bg-paper px-3 py-2 text-sm">
              Area context supports planning review; it is not a service-continuity result.
            </p>
            <h2 className="mb-1 mt-5 text-lg">Area and population</h2>
            <SourceRows rows={sourcedRows(selectedArea, ["sal", "name", "lga", "check"])} />
            {selectedFlood && <>
              <h2 className="mb-1 mt-5 text-lg">Flood exposure</h2>
              <SourceRows rows={sourcedRows(selectedFlood, ["sal", "name", "check"])} />
            </>}
            {(() => {
              const e = energyData.areas.find((a) => a.sal === selectedArea.sal);
              const h = heatData.areas.find((a) => a.sal === selectedArea.sal);
              return <>
                {e && <><h2 className="mb-1 mt-5 text-lg">Small-scale energy (postcode {e.postcode})</h2><SourceRows rows={sourcedRows(e, ["sal", "name", "postcode", "postcodeAreaShare", "installations", "dwellings"])} /></>}
                {h && <><h2 className="mb-1 mt-5 text-lg">Heat proxy</h2><SourceRows rows={sourcedRows(h, ["sal", "name", "treeCount"])} /></>}
              </>;
            })()}
            <h2 className="mb-2 mt-5 text-lg">Facilities in this area</h2>
            <div className="space-y-2">
              {FACILITIES.filter((facility) => facility.sal === selectedArea.sal).map((facility) => (
                <button key={facility.id} type="button" onClick={() => setSelection({ kind: "facility", id: facility.id })}
                  className="block w-full rounded-lg border border-line px-3 py-2 text-left text-sm hover:bg-paper">
                  <span className="block font-semibold">{facility.name}</span>
                  <span className="text-muted">{facility.type}</span>
                </button>
              ))}
              {!FACILITIES.some((facility) => facility.sal === selectedArea.sal) && (
                <p className="text-sm text-muted">No listed facilities in this suburb; nearby-area arrangements require planner review.</p>
              )}
            </div>
            <Link href={`/resident/${selectedArea.sal}`} className="mt-5 block rounded-lg bg-paper px-3 py-2 text-sm font-semibold no-underline hover:bg-line">
              Resident card for {selectedArea.name} (plain language, Census languages) →
            </Link>
          </>
        ) : selectedFacility ? (
          <>
            <button type="button" className="mb-3 text-sm text-blue underline" onClick={() => setSelection({ kind: "area", id: selectedFacility.sal })}>
              ← Back to {AREAS.find((area) => area.sal === selectedFacility.sal)?.name ?? "area"}
            </button>
            <h1 className="mb-1 text-2xl">{selectedFacility.name}</h1>
            <p className="text-sm text-muted">{selectedFacility.type} · Facility ID {selectedFacility.id}</p>
            <p className="my-4 rounded-lg border-l-4 border-amber bg-paper px-3 py-2 text-sm">
              Service capacities and operational inputs are planning placeholders or unknowns, not confirmation that a service is operating.
            </p>
            <SourceRows rows={detailRows} />
          </>
        ) : (
          <p>Select a suburb or facility on the map to inspect its sourced planning data.</p>
        )}
        <p className="mt-6 border-t border-line pt-3 text-xs text-muted">
          Basemap © OpenStreetMap contributors via OpenFreeMap. Suburb boundaries: Australian Bureau of Statistics, ASGS 2021, CC BY 4.0.
        </p>
        <Link href="/continuity" className="mt-4 block rounded-lg bg-ink px-4 py-3 text-center text-sm font-semibold text-white no-underline hover:bg-[#344154]">
          Continue to service scenarios →
        </Link>
      </aside>
    </main>
  );
}
