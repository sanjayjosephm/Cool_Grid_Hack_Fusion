import { describe, expect, it } from "vitest";
import acc from "../lib/data/access-straight.json";
import fac from "../lib/data/facilities.json";
import cross from "../lib/data/crossings.json";
import { SAL_CODES } from "../lib/ids";

// Independent of Turf: flat-earth (equirectangular) distance from a point to a segment, in km.
// Accurate to a few metres over these ~10 km distances.
function kmToSegment(p: number[], a: number[], b: number[]) {
  const k = 111.32, cos = Math.cos((a[1] * Math.PI) / 180);
  const xy = (q: number[]) => [(q[0] - a[0]) * k * cos, (q[1] - a[1]) * 110.57];
  const [px, py] = xy(p), [bx, by] = xy(b);
  const t = Math.max(0, Math.min(1, (px * bx + py * by) / (bx * bx + by * by || 1)));
  return Math.hypot(px - t * bx, py - t * by);
}

const where = (id: string) => cross.crossings.find((c) => c.id === id)!.location.value;
const facAt = (id: string) => fac.facilities.find((f) => f.id === id)!.location.value;
const centre = (sal: string) => acc.centres.find((c) => c.sal === sal)!.centre;

describe("P1-D5b straight-line access links (kept for comparison with routed links)", () => {
  it("has one link for every community and facility pair", () => {
    expect(acc.links.length).toBe(SAL_CODES.length * fac.facilities.length);
    expect(new Set(acc.links.map((l) => `${l.from}>${l.to}`)).size).toBe(acc.links.length);
  });

  it("labels every link as an illustrative straight-line approximation", () => {
    for (const l of acc.links)
      for (const v of [l.distanceKm, l.dependsOn]) {
        expect(v.status).toBe("illustrative");
        expect(v.source).toMatch(/^Straight-line approximation, not a routed path/);
      }
  });

  it("only references real crossing IDs", () => {
    const ids = new Set(cross.crossings.map((c) => c.id));
    for (const l of acc.links) for (const id of l.dependsOn.value) expect(ids.has(id), id).toBe(true);
  });

  it("matches an independent distance calculation for every crossing (50 m tolerance at the 0.5 km edge)", () => {
    for (const l of acc.links) {
      const a = centre(l.from), b = facAt(l.to);
      // Straight-line links were built from the main-road crossings only (local-street crossings are added in P2).
      for (const c of cross.crossings.filter((x) => !(x as { local?: boolean }).local)) {
        const d = kmToSegment(c.location.value, a, b);
        if (l.dependsOn.value.includes(c.id)) expect(d, `${l.from}>${l.to} ${c.id}`).toBeLessThanOrEqual(acc.bufferKm + 0.05);
        else expect(d, `${l.from}>${l.to} ${c.id}`).toBeGreaterThan(acc.bufferKm - 0.05);
      }
    }
  });

  it("places every suburb centre inside the study window", () => {
    for (const c of acc.centres) {
      expect(c.centre[0]).toBeGreaterThan(144.7);
      expect(c.centre[0]).toBeLessThan(145.0);
    }
  });

  it("Albion has no facility of its own, so all its links go to other suburbs", () => {
    expect(fac.facilities.some((f) => f.sal === "20021")).toBe(false);
    const albion = acc.links.filter((l) => l.from === "20021");
    expect(albion.length).toBe(fac.facilities.length);
    expect(albion.filter((l) => l.distanceKm.value < 3).length).toBeGreaterThan(0);
  });

  it("gives the flood scenario something to test: some links depend on crossings and some do not", () => {
    expect(acc.links.some((l) => l.dependsOn.value.length > 0)).toBe(true);
    expect(acc.links.some((l) => l.dependsOn.value.length === 0)).toBe(true);
  });
});
