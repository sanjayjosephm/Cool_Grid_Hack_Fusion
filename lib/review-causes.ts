// Plain-language causes for review blockers, using names rather than IDs. Shared by screens and planning tools.
import type { Blocker, ReviewRow } from "./continuity";
import { areaName, crossingName, facilityName } from "./demo-review";

const detail = (b: Blocker) => b.fact.source.split(": ").slice(1).join(": ");

export function causeText(b: Blocker): string {
  const fac = b.facilityId ? facilityName(b.facilityId) : "";
  switch (b.category) {
    case "backup": return b.kind === "false" ? `${fac}: backup fails the outage check. ${detail(b)}` : `${fac}: backup not verified (${detail(b) || "inputs unknown"})`;
    case "suitability": return b.kind === "false" ? `${fac}: ${b.fact.source.replace(/^Open/, "open")}.` : `${fac}: ${b.fact.source}.`;
    case "capacity": return `${fac}: number of places is unknown.`;
    case "crew-requirement": return `${fac}: crews needed to open it are unknown.`;
    case "dependency": return `${crossingName(b.dependencyId!)} crossing is ${b.kind === "false" ? "closed" : "of unknown status"}: routes that rely on it cannot be counted.`;
    case "crew-ceiling": return "Crew count not entered, so no allocation can be calculated.";
    case "demand": return `Demand for ${b.communityId ? areaName(b.communityId) : "a community"} is unknown.`;
    default: return b.explanation;
  }
}

/** One cause per distinct fact (a closed crossing blocks many routes but is one cause). */
export function causes(row: ReviewRow): { text: string; owner: string; kind: Blocker["kind"]; category: Blocker["category"] }[] {
  const seen = new Map<string, { text: string; owner: string; kind: Blocker["kind"]; category: Blocker["category"] }>();
  for (const b of row.blockers) {
    const key = b.category === "dependency" ? `dep:${b.dependencyId}` : `${b.category}:${b.facilityId ?? ""}:${b.communityId ?? ""}`;
    if (!seen.has(key)) seen.set(key, { text: causeText(b), owner: b.roleHypothesis, kind: b.kind, category: b.category });
  }
  return [...seen.values()];
}
