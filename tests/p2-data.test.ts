import { describe, expect, it } from "vitest";
import routed from "../lib/data/access-links.json";
import straight from "../lib/data/access-straight.json";
import cross from "../lib/data/crossings.json";
import energy from "../lib/data/energy.json";
import heat from "../lib/data/heat.json";
import { SAL_CODES } from "../lib/ids";

describe("P2-D6 routed access links (Vicmap road network)", () => {
  it("keeps exactly the engine's link fields", () => {
    for (const l of routed.links) expect(Object.keys(l).sort()).toEqual(["dependsOn", "distanceKm", "from", "to"]);
  });

  it("finds a route for every community and facility pair", () => {
    expect(routed.links).toHaveLength(straight.links.length);
    for (const l of routed.links) expect(l.distanceKm.value, `${l.from}>${l.to}`).not.toBeNull();
  });

  it("is never shorter than the straight line, allowing for snapping to the road", () => {
    for (const l of routed.links) {
      const s = straight.links.find((x) => x.from === l.from && x.to === l.to)!;
      expect(l.distanceKm.value!, `${l.from}>${l.to}`).toBeGreaterThanOrEqual(s.distanceKm.value - 0.05);
    }
  });

  it("only depends on crossings that exist, and labels the routing method", () => {
    const ids = new Set(cross.crossings.map((c) => c.id));
    for (const l of routed.links) {
      for (const id of l.dependsOn.value!) expect(ids.has(id), id).toBe(true);
      expect(l.dependsOn.source).toMatch(/^Shortest route on the Vicmap road network/);
      expect(l.dependsOn.status).toBe("illustrative");
    }
  });

  it("adds local-street crossings alongside the main-road ones", () => {
    expect(cross.crossings.some((c) => (c as { local?: boolean }).local)).toBe(true);
    expect(cross.crossings.some((c) => !(c as { local?: boolean }).local)).toBe(true);
  });
});

describe("P2-D7 small-scale energy (Clean Energy Regulator × ABS)", () => {
  it("covers every study area with a postcode", () => {
    expect(energy.areas.map((a) => a.sal).sort()).toEqual([...SAL_CODES].sort());
    for (const a of energy.areas) expect(a.postcode).toMatch(/^3\d{3}$/);
  });

  it("each rate equals installations ÷ dwellings × 100 from the stored counts", () => {
    for (const a of energy.areas) {
      expect(a.solarPer100.value).toBeCloseTo((a.installations.solar / a.dwellings) * 100, 1);
      expect(a.batteryPer100.value).toBeCloseTo((a.installations.battery / a.dwellings) * 100, 1);
      expect(a.heatPumpPer100.value).toBeCloseTo((a.installations.heatPump / a.dwellings) * 100, 1);
    }
  });

  it("gives suburbs that share a postcode the same values", () => {
    const by = new Map<string, number>();
    for (const a of energy.areas) {
      if (by.has(a.postcode)) expect(a.solarPer100.value).toBe(by.get(a.postcode));
      by.set(a.postcode, a.solarPer100.value);
    }
  });

  it("labels the battery period and stays within plausible ranges", () => {
    for (const a of energy.areas) {
      expect(a.batteryPer100.source).toMatch(/Jul 2025 to Aug 2026/);
      expect(a.solarPer100.value).toBeGreaterThan(0);
      expect(a.solarPer100.value).toBeLessThan(100);
    }
  });
});

describe("P2-D9 heat proxy (Vicmap urban trees)", () => {
  it("reports trees per hectare for every area, labelled as a proxy", () => {
    expect(heat.areas).toHaveLength(SAL_CODES.length);
    for (const a of heat.areas) {
      expect(a.treesPerHa.value).toBeGreaterThan(0);
      expect(a.treeCount).toBeGreaterThan(0);
      expect(a.treesPerHa.source).toMatch(/heat proxy/);
    }
  });
});
