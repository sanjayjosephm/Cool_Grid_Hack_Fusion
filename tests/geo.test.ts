import { describe, expect, it } from "vitest";
import flood from "../lib/data/flood.json";
import fac from "../lib/data/facilities.json";
import cross from "../lib/data/crossings.json";
import { SAL_CODES } from "../lib/ids";

describe("P1-D3 flood exposure (Vicmap Planning overlays)", () => {
  it("covers every study area", () => {
    expect(flood.areas.map((a) => a.sal).sort()).toEqual([...SAL_CODES].sort());
  });

  it("polygon-clipped % agrees with an independent ~40 m grid sample within 2 percentage points", () => {
    for (const a of flood.areas) {
      expect(Math.abs(a.pctRiverine.value - a.check.pctRiverineSampled), `${a.name} riverine`).toBeLessThanOrEqual(2);
      expect(Math.abs(a.pctStormwater.value - a.check.pctStormwaterSampled), `${a.name} stormwater`).toBeLessThanOrEqual(2);
    }
  });

  it("keeps percentages within 0-100 and labels them as public Vicmap data", () => {
    for (const a of flood.areas)
      for (const v of [a.pctRiverine, a.pctStormwater]) {
        expect(v.value).toBeGreaterThanOrEqual(0);
        expect(v.value).toBeLessThanOrEqual(100);
        expect(v.status).toBe("public");
        expect(v.source).toMatch(/^Vicmap Planning/);
      }
  });

  it("finds riverine flood land in suburbs on the Maribyrnong River", () => {
    for (const name of ["Maidstone", "Footscray"]) expect(flood.areas.find((a) => a.name === name)!.pctRiverine.value, name).toBeGreaterThan(0);
  });
});

// Suburb each facility must fall in, checked against the ABS boundary (not the facility's name).
const EXPECTED_SAL: Record<string, string> = {
  "fac-sunshine-library": "22395", "fac-st-albans-library": "22330", "fac-deer-park-library": "20729",
  "fac-footscray-library": "20935", "fac-broadmeadows-library": "20346", "fac-brunswick-west-library": "20363",
  "fac-braybrook-cc": "20324", "fac-maidstone-cc": "21575", "fac-west-sunshine-cc": "22397",
};

describe("P1-D4 facilities (Vicmap Features of Interest + declared inputs)", () => {
  it("has unique stable IDs", () => {
    const ids = fac.facilities.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("places every facility inside the expected ABS suburb boundary", () => {
    for (const f of fac.facilities) expect(f.sal, f.id).toBe(EXPECTED_SAL[f.id]);
  });

  it("labels locations as public and planning inputs as illustrative or unknown, never public", () => {
    for (const f of fac.facilities) {
      expect(f.location.status).toBe("public");
      const declared = [f.crews, f.services.coolingRespite.places, f.services.floodRelief.places, ...Object.values(f.backup)];
      for (const d of declared) {
        expect(["illustrative", "unknown"], f.id).toContain(d.status);
        expect(d.status === "unknown", f.id).toBe(d.value === null);
      }
    }
  });

  it("leaves some backup facts unknown so the review raises real questions", () => {
    expect(fac.facilities.some((f) => Object.values(f.backup).some((v) => v.status === "unknown"))).toBe(true);
  });
});

describe("P1-D5 flood-exposed crossings (Vicmap Transport × riverine overlays)", () => {
  it("has unique IDs built from road and overlay, not display order", () => {
    const ids = cross.crossings.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^x-[a-z0-9-]+-\d+$/);
  });

  it("gives every crossing a public location inside the study window", () => {
    for (const c of cross.crossings) {
      expect(c.location.status).toBe("public");
      const [lng, lat] = c.location.value;
      expect(lng).toBeGreaterThan(144.7);
      expect(lng).toBeLessThan(145.0);
      expect(lat).toBeGreaterThan(-37.85);
      expect(lat).toBeLessThan(-37.6);
    }
  });

  it("finds at least one crossing", () => {
    expect(cross.crossings.length).toBeGreaterThan(0);
  });
});
