import areaData from "./data/areas.json";
import accessData from "./data/access-links.json";
import crossingData from "./data/crossings.json";
import facilityData from "./data/facilities.json";
import floodData from "./data/flood.json";
import suburbs from "./suburbs.geo.json";
import type { Sourced } from "./sourced";
import type { Feature, FeatureCollection, Point, Polygon } from "geojson";

export type Area = (typeof areaData.areas)[number];
export type Facility = (typeof facilityData.facilities)[number];
export type FloodArea = (typeof floodData.areas)[number];
export type Crossing = (typeof crossingData.crossings)[number];
export type AccessLink = (typeof accessData.links)[number];

export const AREAS = areaData.areas;
export const FACILITIES = facilityData.facilities;
export const FLOOD_AREAS = floodData.areas;
export const CROSSINGS = crossingData.crossings;
export const ACCESS_LINKS = accessData.links;

export type AreaMapProperties = {
  sal: string;
  name: string;
  decile: number;
  riverinePct: number;
};

export type FacilityMapProperties = {
  id: string;
  name: string;
  sal: string;
};

export const AREA_GEOJSON: FeatureCollection<Polygon, AreaMapProperties> = {
  type: "FeatureCollection",
  features: AREAS.map((area): Feature<Polygon, AreaMapProperties> => {
    const boundary = suburbs.features.find((feature) => feature.properties.sal_code_2021 === area.sal);
    if (!boundary || boundary.geometry.type !== "Polygon") {
      throw new Error(`Missing polygon boundary for study area SAL ${area.sal}`);
    }
    const flood = FLOOD_AREAS.find((entry) => entry.sal === area.sal);
    if (!flood) throw new Error(`Missing flood data for study area SAL ${area.sal}`);
    return {
      type: "Feature",
      geometry: boundary.geometry as Polygon,
      properties: {
        sal: area.sal,
        name: area.name,
        decile: area.irsdDecile.value,
        riverinePct: flood.pctRiverine.value,
      },
    };
  }),
};

export const FACILITY_GEOJSON: FeatureCollection<Point, FacilityMapProperties> = {
  type: "FeatureCollection",
  features: FACILITIES.map((facility): Feature<Point, FacilityMapProperties> => {
    const coordinates = facility.location.value;
    if (!coordinates) throw new Error(`Missing public location for facility ${facility.id}`);
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates },
      properties: { id: facility.id, name: facility.name, sal: facility.sal },
    };
  }),
};

export type SourcedValueRow = {
  key: string;
  label: string;
  value: unknown;
  status: Sourced<unknown>["status"];
  source: string;
  date: string;
  licence?: string;
};

const isSourcedValue = (value: unknown): value is Sourced<unknown> => {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return "value" in record && typeof record.status === "string" &&
    typeof record.source === "string" && typeof record.date === "string";
};

const displayLabel = (path: string) =>
  path.split(".").map((part) => part
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\bKWh\b/g, "(kWh)")
    .replace(/\bKW\b/g, "(kW)")
    .replace(/\bPct\b/g, "(%)")
    .replace(/\bID\b/g, "ID")).join(" · ");

export function sourcedRows(record: object, excluded: string[] = []): SourcedValueRow[] {
  const rows: SourcedValueRow[] = [];
  const visit = (value: unknown, path: string) => {
    if (isSourcedValue(value)) {
      rows.push({
        key: path,
        label: displayLabel(path),
        value: value.value,
        status: value.status,
        source: value.source,
        date: value.date,
        licence: value.licence,
      });
      return;
    }
    if (typeof value !== "object" || value === null || Array.isArray(value)) return;
    for (const [key, child] of Object.entries(value)) {
      if (!excluded.includes(key)) visit(child, path ? `${path}.${key}` : key);
    }
  };
  visit(record, "");
  return rows;
}

export function formatSourcedValue(value: unknown): string {
  if (value === null || value === undefined) return "Unknown";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === "object" && item !== null && "name" in item) {
        const language = item as { name: string; persons?: number };
        return language.persons === undefined ? language.name : `${language.name} (${language.persons.toLocaleString()})`;
      }
      return String(item);
    }).join(", ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export const DATA_SOURCE_ROWS = [
  {
    source: "ABS Suburbs and Localities (SAL) boundaries, ASGS 2021",
    date: "2021 (downloaded 2026-10-03)",
    licence: "CC BY 4.0",
    status: "public" as const,
  },
  ...new Map(
    [...AREAS, ...FACILITIES, ...FLOOD_AREAS, ...CROSSINGS, ...ACCESS_LINKS]
      .flatMap((record) => sourcedRows(record))
      .map((row) => [`${row.source}|${row.date}|${row.licence ?? ""}|${row.status}`, row]),
  ).values(),
];

export const GENERATED_DATA_DATES = {
  areas: areaData.generated,
  facilities: facilityData.generated,
  flood: floodData.generated,
  crossings: crossingData.generated,
  accessLinks: accessData.generated,
};
