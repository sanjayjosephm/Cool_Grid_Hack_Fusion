import { describe, expect, it } from "vitest";
import data from "../lib/data/areas.json";
import { SAL_CODES } from "../lib/ids";

const area = (name: string) => data.areas.find((a) => a.name === name)!;
const PCT_FIELDS = ["pct65Plus", "pctNeedAssistance", "pctLowEnglish", "pctNoCar", "pctLivingAlone"] as const;

describe("P1-D1/D2 area data (ABS SEIFA + Census 2021)", () => {
  it("has exactly the study areas, matched by ABS code", () => {
    expect(data.areas.map((a) => a.sal).sort()).toEqual([...SAL_CODES].sort());
  });

  it("labels every value as public ABS data with a licence", () => {
    for (const a of data.areas)
      for (const [k, v] of Object.entries(a))
        if (typeof v === "object") {
          expect(v.status, `${a.name}.${k}`).toBe("public");
          expect(v.licence, `${a.name}.${k}`).toBe("CC BY 4.0");
          expect(v.source, `${a.name}.${k}`).toMatch(/^ABS /);
        }
  });

  it("Census population matches the population ABS published with SEIFA (independent cross-check)", () => {
    for (const a of data.areas) expect(a.population.value, a.name).toBe(a.seifaPopulation.value);
  });

  it("keeps every percentage within 0-100", () => {
    for (const a of data.areas)
      for (const f of PCT_FIELDS) {
        expect(a[f].value, `${a.name}.${f}`).toBeGreaterThanOrEqual(0);
        expect(a[f].value, `${a.name}.${f}`).toBeLessThanOrEqual(100);
      }
  });

  // Values read by hand from ABS "Suburbs and Localities, Indexes, SEIFA 2021.xlsx", Table 1.
  it("matches hand-checked SEIFA values", () => {
    expect(area("Braybrook").irsdScore.value).toBe(867.1);
    expect(area("Braybrook").irsdDecile.value).toBe(1);
    expect(area("Brunswick West").irsdScore.value).toBe(1047.8);
    expect(area("Brunswick West").irsdDecile.value).toBe(8);
    expect(area("St Albans").seifaPopulation.value).toBe(38042);
  });

  it("finds a home language for every area", () => {
    for (const a of data.areas) expect(a.topLanguages.value.length, a.name).toBe(3);
    expect(area("Broadmeadows").topLanguages.value[0].name).toBe("Arabic");
  });
});
