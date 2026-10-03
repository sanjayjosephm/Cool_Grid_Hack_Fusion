// Decision tools built on the review engine's output. None of them changes the engine's allocation rules.
//   P2-E8  worksheet comparison: what a simple spreadsheet would count, and why the engine differs
//   P2-E10 recommended arrangement: the arrangement that counts the most places in the most scenarios
//   P3-5   fair-share policy: an alternative allocation that first maximises the smallest share served
//   P3-1   investment gate: affordable upgrade packages and what each changes, per scenario
import type { ReviewResult, ReviewRow } from "./continuity";
import { causes } from "./review-causes";
import { runDemoReview, SCENARIO_META, type Overrides } from "./demo-review";
import { ARRANGEMENTS, ARRANGEMENT_LABELS, type Arrangement } from "./planner-config";
import type { Sourced } from "./sourced";

const rowOf = (r: ReviewResult, s: string, a: string) => r.rows.find((x) => x.scenarioId === s && x.arrangementId === a)!;
const scenarioOf = (r: ReviewResult, s: string) => r.factsUsed.scenarios.find((x) => x.id === s)!;
const demandTotal = (r: ReviewResult, s: string) => scenarioOf(r, s).demand.reduce((t, d) => t + (d.amount.value ?? 0), 0);

// ---------- P2-E8: worksheet comparison ----------
/** A competent simple worksheet: add up the declared places of every nominated facility, capped at total demand. */
export function worksheetTotal(r: ReviewResult, scenarioId: string, arrangementId: string): number {
  const s = scenarioOf(r, scenarioId);
  const facts = s.arrangementFacts.find((a) => a.arrangementId === arrangementId)!.facilities;
  const places = facts.filter((f) => f.nominated.value === true).reduce((t, f) => t + (f.capacity.value ?? 0), 0);
  return Math.min(places, demandTotal(r, scenarioId));
}
export function worksheetComparison(r: ReviewResult) {
  return SCENARIO_META.flatMap((s) => ARRANGEMENTS.map((a) => {
    const row = rowOf(r, s.id, a);
    const sheet = worksheetTotal(r, s.id, a);
    const engine = row.total;
    return {
      scenario: s.title, arrangement: ARRANGEMENT_LABELS[a], worksheet: sheet, engine,
      differs: engine !== sheet,
      reasons: engine === sheet ? [] : [...new Set([...causes(row).map((c) => c.category), ...(engine !== null && engine < sheet && causes(row).length === 0 ? ["crews or access limit"] : [])])],
    };
  }));
}
/** Worksheet as CSV so a planner can check it in a spreadsheet. */
export function worksheetCsv(r: ReviewResult): string {
  const rows = worksheetComparison(r);
  return ["scenario,arrangement,worksheet_places,engine_places,differs,reasons", ...rows.map((x) => [x.scenario, x.arrangement, x.worksheet, x.engine ?? "blocked", x.differs, `"${x.reasons.join("; ")}"`].join(","))].join("\n");
}

// ---------- P2-E10: recommended arrangement ----------
/** Best arrangement per scenario (most places counted), then the arrangement that is best in the most scenarios.
 *  Scenario totals are compared within each scenario only and never added. Ties go to fewer nominated facilities. */
export function recommendArrangement(r: ReviewResult): { arrangement: Arrangement | null; wins: string[]; perScenario: { scenario: string; best: Arrangement[] }[]; reason: string } {
  const perScenario = SCENARIO_META.map((s) => {
    const totals = ARRANGEMENTS.map((a) => ({ a, t: rowOf(r, s.id, a).total }));
    const max = Math.max(...totals.map((x) => x.t ?? -1));
    return { scenario: s.title, best: max < 0 ? [] : totals.filter((x) => x.t === max).map((x) => x.a) };
  });
  if (perScenario.every((p) => p.best.length === 0)) return { arrangement: null, wins: [], perScenario, reason: "No scenario can be calculated yet: enter the missing inputs first." };
  const nominatedCount = (a: Arrangement) => scenarioOf(r, "heat").arrangementFacts.find((x) => x.arrangementId === a)!.facilities.filter((f) => f.nominated.value).length;
  const scored = ARRANGEMENTS.map((a) => ({ a, wins: perScenario.filter((p) => p.best.includes(a)).map((p) => p.scenario) }))
    .sort((x, y) => y.wins.length - x.wins.length || nominatedCount(x.a) - nominatedCount(y.a));
  const top = scored[0];
  return { arrangement: top.a, wins: top.wins, perScenario, reason: `${ARRANGEMENT_LABELS[top.a]} counts the most places in ${top.wins.length} of ${SCENARIO_META.length} scenarios (${top.wins.join(", ")}).` };
}

// ---------- P3-5: fair-share allocation ----------
type Edge = { to: number; rev: number; cap: number };
function maxFlow(n: number, edges: [number, number, number][], s: number, t: number): { total: number; flow: Map<string, number> } {
  const g: Edge[][] = Array.from({ length: n }, () => []);
  const refs: { u: number; i: number; key: string }[] = [];
  for (const [u, v, c] of edges) { g[u].push({ to: v, rev: g[v].length, cap: c }); g[v].push({ to: u, rev: g[u].length - 1, cap: 0 }); refs.push({ u, i: g[u].length - 1, key: `${u}>${v}` }); }
  const orig = refs.map((x) => g[x.u][x.i].cap);
  let total = 0;
  for (;;) {
    const prev: ([number, number] | null)[] = Array(n).fill(null); prev[s] = [s, -1];
    const q = [s];
    for (let k = 0; k < q.length && !prev[t]; k++) g[q[k]].forEach((e, i) => { if (e.cap > 0 && !prev[e.to]) { prev[e.to] = [q[k], i]; q.push(e.to); } });
    if (!prev[t]) break;
    let f = Infinity;
    for (let v = t; v !== s; v = prev[v]![0]) f = Math.min(f, g[prev[v]![0]][prev[v]![1]].cap);
    for (let v = t; v !== s; v = prev[v]![0]) { const e = g[prev[v]![0]][prev[v]![1]]; e.cap -= f; g[v][e.rev].cap += f; }
    total += f;
  }
  return { total, flow: new Map(refs.map((x, k) => [x.key, orig[k] - g[x.u][x.i].cap])) };
}
const accessible = (r: ReviewResult, scenarioId: string, communityId: string, facilityId: string) => {
  const s = scenarioOf(r, scenarioId);
  const path = s.access.find((p) => p.communityId === communityId && p.facilityId === facilityId);
  if (!path || path.available.value !== true || path.dependsOn.value === null) return false;
  return path.dependsOn.value.every((d) => s.dependencyStates.find((x) => x.dependencyId === d)?.open.value === true);
};

/** For each set of facilities the engine found that counts the most places, finds the largest share f such that every
 *  reachable community gets at least floor(f × demand) places, then fills remaining places by maximum flow.
 *  The set giving the largest minimum share is returned. Communities no counted facility can reach are reported
 *  separately rather than hidden in the minimum. */
export function fairShare(r: ReviewResult, scenarioId: string, arrangementId: string) {
  const row: ReviewRow = rowOf(r, scenarioId, arrangementId);
  if (row.total === null || !row.witnesses.length) return null;
  const sets = [...new Map(row.witnesses.map((w) => [w.facilityIds.join("|"), w.facilityIds])).values()];
  const results = sets.map((facIds) => fairShareFor(r, scenarioId, arrangementId, facIds, row.total!));
  // Fewest unreachable communities first, then the largest guaranteed share, then the most places.
  return results.sort((a, b) => a.unreachable.length - b.unreachable.length || b.minShare - a.minShare || b.total - a.total)[0];
}

function fairShareFor(r: ReviewResult, scenarioId: string, arrangementId: string, facIds: string[], maxTotal: number) {
  const s = scenarioOf(r, scenarioId);
  const facts = s.arrangementFacts.find((a) => a.arrangementId === arrangementId)!.facilities;
  const all = s.demand.map((d) => ({ id: d.communityId, d: d.amount.value ?? 0 }));
  const unreachable = all.filter((c) => !facIds.some((f) => accessible(r, scenarioId, c.id, f))).map((c) => c.id);
  const comms = all.map((c) => (unreachable.includes(c.id) ? { ...c, d: 0 } : c));
  const S = 0, T = 1 + facIds.length + comms.length;
  const build = (need: (c: { id: string; d: number }) => number, capLeft?: Map<string, number>) => {
    const e: [number, number, number][] = [];
    facIds.forEach((f, i) => {
      e.push([S, 1 + i, capLeft?.get(f) ?? (facts.find((x) => x.facilityId === f)!.capacity.value ?? 0)]);
      comms.forEach((c, j) => { if (accessible(r, scenarioId, c.id, f)) e.push([1 + i, 1 + facIds.length + j, 1e9]); });
    });
    comms.forEach((c, j) => e.push([1 + facIds.length + j, T, need(c)]));
    return e;
  };
  const feasible = (f: number) => { const need = (c: { d: number }) => Math.floor(f * c.d); return maxFlow(T + 1, build(need), S, T).total === comms.reduce((t, c) => t + need(c), 0); };
  let lo = 0, hi = 1;
  for (let k = 0; k < 30; k++) { const mid = (lo + hi) / 2; if (feasible(mid)) lo = mid; else hi = mid; }
  const base = (c: { d: number }) => Math.floor(lo * c.d);
  const first = maxFlow(T + 1, build(base), S, T);
  const used = new Map(facIds.map((f, i) => [f, comms.reduce((t, _, j) => t + (first.flow.get(`${1 + i}>${1 + facIds.length + j}`) ?? 0), 0)]));
  const capLeft = new Map(facIds.map((f) => [f, (facts.find((x) => x.facilityId === f)!.capacity.value ?? 0) - used.get(f)!]));
  const second = maxFlow(T + 1, build((c) => c.d - base(c), capLeft), S, T);
  const allocated = all.map((c, j) => {
    const got = facIds.reduce((t, _, i) => t + (first.flow.get(`${1 + i}>${1 + facIds.length + j}`) ?? 0) + (second.flow.get(`${1 + i}>${1 + facIds.length + j}`) ?? 0), 0);
    return { communityId: c.id, demand: c.d, allocated: got, gap: c.d - got, share: c.d ? got / c.d : 1 };
  });
  // The guaranteed share actually achieved among reachable communities (floor effects can make it lower than lo).
  const reachable = allocated.filter((a) => !unreachable.includes(a.communityId) && a.demand > 0);
  const minShare = reachable.length ? Math.min(...reachable.map((a) => a.share)) : 0;
  return { minShare, total: first.total + second.total, maxTotal, allocated, unreachable, facilityIds: facIds };
}

// ---------- P3-1: investment gate ----------
export type Package = { id: string; label: string; cost: Sourced<number>; changes: Overrides; note: string };
const cost = (v: number, what: string): Sourced<number> => ({ value: v, status: "illustrative", source: `Placeholder cost for ${what}; replace with an assessed quote`, date: "2026-10-03" });
export const PACKAGES: Package[] = [
  { id: "central-battery", label: "Larger battery at Sunshine Library (80 kWh)", cost: cost(60_000, "an 80 kWh battery"), changes: { "fac-sunshine-library": { batteryKWh: 80 } }, note: "Lets the central library run its cooling through the outage." },
  { id: "west-sunshine-backup", label: "Battery and backed-up cooling at West Sunshine Community Centre", cost: cost(45_000, "a 40 kWh battery and rewiring"), changes: { "fac-west-sunshine-cc": { batteryKWh: 40, coolingOnBackup: true } }, note: "Puts the air-conditioner on a backed-up circuit with a battery." },
  { id: "braybrook-inverter", label: "Larger inverter at Braybrook Community Centre (10 kW)", cost: cost(12_000, "a 10 kW inverter"), changes: { "fac-braybrook-cc": { inverterKW: 10 } }, note: "Lets the air-conditioner start on backup power." },
  { id: "late-hours", label: "Open both community centres until 18:00 on heat days", cost: cost(8_000, "extra staff hours each summer"), changes: { "fac-west-sunshine-cc": { hours: "09:00-18:00" }, "fac-braybrook-cc": { hours: "09:00-18:00" } }, note: "Covers the whole heatwave afternoon." },
];
const merge = (ps: Package[]): Overrides => {
  const o: Overrides = {};
  for (const p of ps) for (const [id, ch] of Object.entries(p.changes)) o[id] = { ...o[id], ...ch };
  return o;
};

/** Every affordable combination of packages, evaluated by the engine for the chosen arrangement and crews.
 *  Results stay per scenario; a combination is "not dominated" if no other affordable one is at least as good in
 *  every scenario and better in one. */
export function investmentOptions(budget: number, crews: number, arrangement: Arrangement = "local-facilities") {
  const combos = Array.from({ length: 2 ** PACKAGES.length }, (_, m) => PACKAGES.filter((_, i) => m & (1 << i)));
  const options = combos.map((ps) => {
    const total = ps.reduce((t, p) => t + (p.cost.value ?? 0), 0);
    const r = runDemoReview(crews, merge(ps)).result;
    return { packages: ps.map((p) => p.id), cost: total, totals: SCENARIO_META.map((s) => rowOf(r, s.id, arrangement).total ?? 0) };
  }).filter((o) => o.cost <= budget);
  const dominated = (o: (typeof options)[number]) => options.some((x) => x !== o && x.cost <= o.cost && x.totals.every((t, i) => t >= o.totals[i]) && (x.cost < o.cost || x.totals.some((t, i) => t > o.totals[i])));
  return options.map((o) => ({ ...o, dominated: dominated(o) })).sort((a, b) => a.cost - b.cost);
}
