import { isKnown, type Sourced } from "./sourced";
import {
  REVIEW_VERSION, type AllocationWitness, type Blocker, type ConditionalProbe,
  type FacilityFacts, type GapVector, type ModelLimit, type ReviewPacket,
  type ReviewResult, type ReviewRow, type ReviewScenario, type VerificationQuestion,
} from "./review-contract";

const compareId = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const knownTrue = (fact: Sourced<boolean>) => isKnown(fact) && fact.value === true;
const copy = <T>(value: T): T => structuredClone(value);
const absentFact = (): Sourced<unknown> => ({
  value: null, status: "unknown", source: "Not supplied in review packet", date: "not supplied",
});

type Calculation = Pick<ReviewRow, "total" | "gapVectors" | "witnesses">;
type ProbeCandidate = { blocker: Blocker; setTrue: (packet: ReviewPacket, fact: Sourced<boolean>) => void };
type Evidence = {
  blockers: Blocker[]; excludedNominations: ReviewRow["excludedNominations"];
  candidates: ProbeCandidate[];
};

const MODEL_LIMITS: ModelLimit[] = [
  { code: "conditional-entered-facts", description: "Counts depend on entered evidence and assumptions. Excluded unknown contributions do not establish zero actual capacity." },
  { code: "bounded-integer-allocation", description: "Enumerates facility subsets within 1–6 facilities, 1–4 communities, 1–3 scenarios and 1–3 arrangements; maximises integer entered places while conserving site capacity, crews and community demand." },
  { code: "subset-witnesses", description: "Returns one deterministic maximum-flow witness for every best feasible facility subset and its distinct community-gap vectors; does not enumerate all allocations tied within a subset." },
  { code: "no-equity-policy", description: "Maximum entered places is the objective. Gap vectors expose community outcomes without an equity policy or a preferred tied outcome." },
  { code: "separate-scenarios-services", description: "Each scenario and service is calculated separately. There is no summed cross-scenario impact total." },
  { code: "window-metadata", description: "Service windows are metadata, without time scheduling, shared generators or subgroup allocation." },
  { code: "backup-prerequisite", description: "Backup is an entered prerequisite only for heat-outage, without battery or physical equipment arithmetic." },
  { code: "one-factor-probes", description: "Boolean probes change one entered eligibility, availability or dependency state to true while retaining every other fact and path topology. Zero standalone gain does not establish irrelevance when multiple blockers coexist." },
  { code: "unknown-global-counts", description: "Unknown community demand or scenario crew ceiling leaves totals and gaps null, including in boolean probes; unknown numeric values or topology are never invented." },
  { code: "access-evidence", description: "A path requires explicit availability, known declared topology and every dependency known open. Multiple paths may serve the same pair; straight-line links and overlays do not certify safe access or closures." },
  { code: "no-readiness-certification", description: "Results do not certify physical service readiness or authorisation and do not perform capital optimisation. Verification roles are hypotheses, not assigned people." },
];

/** Only nomination, applicable boolean gates and known numeric facts count a site. */
function eligible(facts: FacilityFacts, scenario: ReviewScenario): boolean {
  return knownTrue(facts.nominated) && knownTrue(facts.authorised) && knownTrue(facts.suitable)
    && (scenario.kind !== "heat-outage" || knownTrue(facts.backup))
    && isKnown(facts.capacity) && isKnown(facts.crewsRequired);
}

function accessible(scenario: ReviewScenario, communityId: string, facilityId: string): boolean {
  const states = new Map(scenario.dependencyStates.map(state => [state.dependencyId, state.open]));
  return scenario.access.some(path => path.communityId === communityId && path.facilityId === facilityId
    && knownTrue(path.available) && isKnown(path.dependsOn)
    && path.dependsOn.value.every(id => {
      const state = states.get(id);
      return state !== undefined && knownTrue(state);
    }));
}

type Edge = { to: number; reverse: number; remaining: number };

/** Edmonds–Karp on the residual network permits rerouting; a greedy fill would not. */
function maximumFlow(sites: FacilityFacts[], communityIds: string[], demands: Map<string, number>, scenario: ReviewScenario): AllocationWitness {
  const source = 0;
  const communityOffset = 1 + sites.length;
  const sink = communityOffset + communityIds.length;
  const network: Edge[][] = Array.from({ length: sink + 1 }, () => []);
  function addEdge(from: number, to: number, capacity: number): Edge {
    const forward = { to, reverse: network[to].length, remaining: capacity };
    const reverse = { to: from, reverse: network[from].length, remaining: 0 };
    network[from].push(forward);
    network[to].push(reverse);
    return forward;
  }
  const flowEdges: { facilityId: string; communityId: string; capacity: number; edge: Edge }[] = [];
  sites.forEach((site, i) => {
    const capacity = site.capacity.value as number;
    addEdge(source, i + 1, capacity);
    communityIds.forEach((id, j) => {
      if (accessible(scenario, id, site.facilityId)) {
        const bound = Math.min(capacity, demands.get(id)!);
        flowEdges.push({ facilityId: site.facilityId, communityId: id, capacity: bound,
          edge: addEdge(i + 1, communityOffset + j, bound) });
      }
    });
  });
  communityIds.forEach((id, j) => addEdge(communityOffset + j, sink, demands.get(id)!));
  let total = 0;
  while (true) {
    const parents: { node: number; edgeIndex: number }[] = Array(network.length);
    const visited = Array<boolean>(network.length).fill(false);
    const queue = [source];
    visited[source] = true;
    for (let i = 0; i < queue.length && !visited[sink]; i++) {
      const node = queue[i];
      network[node].forEach((edge, edgeIndex) => {
        if (edge.remaining > 0 && !visited[edge.to]) {
          visited[edge.to] = true;
          parents[edge.to] = { node, edgeIndex };
          queue.push(edge.to);
        }
      });
    }
    if (!visited[sink]) break;
    let amount = Number.MAX_SAFE_INTEGER;
    for (let node = sink; node !== source; node = parents[node].node) {
      const parent = parents[node];
      amount = Math.min(amount, network[parent.node][parent.edgeIndex].remaining);
    }
    for (let node = sink; node !== source; node = parents[node].node) {
      const parent = parents[node];
      const edge = network[parent.node][parent.edgeIndex];
      edge.remaining -= amount;
      network[node][edge.reverse].remaining += amount;
    }
    total += amount;
  }
  const flows = flowEdges.map(({ facilityId, communityId, capacity, edge }) => ({
    facilityId, communityId, places: capacity - edge.remaining,
  })).filter(flow => flow.places > 0);
  const allocations = new Map(communityIds.map(id => [id, 0]));
  flows.forEach(flow => allocations.set(flow.communityId, allocations.get(flow.communityId)! + flow.places));
  return {
    facilityIds: sites.map(site => site.facilityId),
    crewsUsed: sites.reduce((sum, site) => sum + (site.crewsRequired.value as number), 0), total, flows,
    gaps: communityIds.map(communityId => ({ communityId, demand: demands.get(communityId)!,
      allocated: allocations.get(communityId)!, gap: demands.get(communityId)! - allocations.get(communityId)! })),
  };
}

function compareSubsets(a: FacilityFacts[], b: FacilityFacts[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const compared = compareId(a[i].facilityId, b[i].facilityId);
    if (compared) return compared;
  }
  return a.length - b.length;
}

function compareGaps(a: GapVector, b: GapVector): number {
  for (let i = 0; i < a.length; i++) {
    const compared = compareId(a[i].communityId, b[i].communityId) || a[i].gap - b[i].gap;
    if (compared) return compared;
  }
  return 0;
}

function calculate(packet: ReviewPacket, scenarioIndex: number, arrangementIndex: number): Calculation {
  const scenario = packet.scenarios[scenarioIndex];
  if (!isKnown(scenario.crewCeiling) || scenario.demand.some(demand => !isKnown(demand.amount))) {
    return { total: null, gapVectors: null, witnesses: [] };
  }
  const communityIds = packet.communities.map(community => community.id).sort(compareId);
  const demands = new Map(scenario.demand.map(demand => [demand.communityId, demand.amount.value as number]));
  const crewCeiling = scenario.crewCeiling.value;
  const sites = scenario.arrangementFacts[arrangementIndex].facilities
    .filter(site => eligible(site, scenario)).slice().sort((a, b) => compareId(a.facilityId, b.facilityId));
  const subsets: FacilityFacts[][] = [];
  for (let mask = 0; mask < 2 ** sites.length; mask++) {
    const subset = sites.filter((_, i) => (mask & (1 << i)) !== 0);
    if (subset.reduce((sum, site) => sum + (site.crewsRequired.value as number), 0) <= crewCeiling) {
      subsets.push(subset);
    }
  }
  subsets.sort(compareSubsets);
  let best = -1;
  let witnesses: AllocationWitness[] = [];
  subsets.forEach(subset => {
    const witness = maximumFlow(subset, communityIds, demands, scenario);
    if (witness.total > best) {
      best = witness.total;
      witnesses = [witness];
    } else if (witness.total === best) witnesses.push(witness);
  });
  const unique = new Map<string, GapVector>();
  witnesses.forEach(witness => unique.set(JSON.stringify(witness.gaps), witness.gaps));
  return { total: best, witnesses, gapVectors: Array.from(unique.values()).sort(compareGaps) };
}

const roles: Record<Blocker["category"], string> = {
  nomination: "Review owner (hypothesis)", capacity: "Service or facility operations lead (hypothesis)",
  "crew-requirement": "Facility staffing lead (hypothesis)", authorisation: "Facility authorisation owner (hypothesis)",
  suitability: "Service operations lead (hypothesis)", backup: "Facility power or continuity lead (hypothesis)",
  access: "Access or transport operations lead (hypothesis)", topology: "Access planning lead (hypothesis)",
  dependency: "Road or dependency operations lead (hypothesis)", demand: "Community service planning lead (hypothesis)",
  "crew-ceiling": "Scenario staffing lead (hypothesis)",
};

function evidenceFor(packet: ReviewPacket, scenarioIndex: number, arrangementIndex: number): Evidence {
  const scenario = packet.scenarios[scenarioIndex];
  const arrangement = scenario.arrangementFacts[arrangementIndex];
  const scenarioPath = `scenarios[${scenarioIndex}]`;
  const blockers = new Map<string, Blocker>();
  const candidates = new Map<string, ProbeCandidate>();
  const excludedNominations: ReviewRow["excludedNominations"] = [];
  function add(path: string, category: Blocker["category"], fact: Sourced<unknown>, explanation: string,
    refs: Pick<Blocker, "facilityId" | "communityId" | "dependencyId"> = {},
    setTrue?: ProbeCandidate["setTrue"]): void {
    if (isKnown(fact) && fact.value !== false) return;
    const blocker: Blocker = { path, category, fact: copy(fact),
      kind: isKnown(fact) ? "false" : "unknown", explanation, roleHypothesis: roles[category], ...refs };
    if (!blockers.has(path)) blockers.set(path, blocker);
    if (setTrue && !candidates.has(path)) candidates.set(path, { blocker, setTrue });
  }
  scenario.demand.forEach((demand, i) => add(`${scenarioPath}.demand[${i}].amount`, "demand", demand.amount,
    `Demand for community ${demand.communityId} is unknown; no scenario total or gaps can be calculated.`, { communityId: demand.communityId }));
  add(`${scenarioPath}.crewCeiling`, "crew-ceiling", scenario.crewCeiling,
    "The scenario crew ceiling is unknown; no scenario total or gaps can be calculated.");
  arrangement.facilities.forEach((site, i) => {
    const path = `${scenarioPath}.arrangementFacts[${arrangementIndex}].facilities[${i}]`;
    if (isKnown(site.nominated) && !site.nominated.value) {
      excludedNominations.push({ facilityId: site.facilityId, fact: copy(site.nominated) });
      return;
    }
    const refs = { facilityId: site.facilityId };
    add(`${path}.nominated`, "nomination", site.nominated,
      `Nomination intent for facility ${site.facilityId} is unknown; it is excluded from conditional counting.`, refs,
      (changed, fact) => { changed.scenarios[scenarioIndex].arrangementFacts[arrangementIndex].facilities[i].nominated = fact; });
    const gates: { key: "authorised" | "suitable" | "backup"; category: Blocker["category"]; label: string }[] = [
      { key: "authorised", category: "authorisation", label: "Authorisation" },
      { key: "suitable", category: "suitability", label: "Service suitability" },
      ...(scenario.kind === "heat-outage" ? [{ key: "backup" as const, category: "backup" as const, label: "Backup prerequisite" }] : []),
    ];
    gates.forEach(({ key, category, label }) => add(`${path}.${key}`, category, site[key],
      `${label} for facility ${site.facilityId} is ${isKnown(site[key]) ? "false" : "unknown"}; this contribution is excluded from conditional counting.`, refs,
      (changed, fact) => { changed.scenarios[scenarioIndex].arrangementFacts[arrangementIndex].facilities[i][key] = fact; }));
    add(`${path}.capacity`, "capacity", site.capacity,
      `Capacity for facility ${site.facilityId} is unknown; no capacity is invented.`, refs);
    add(`${path}.crewsRequired`, "crew-requirement", site.crewsRequired,
      `Crew requirement for facility ${site.facilityId} is unknown; this contribution is excluded from conditional counting.`, refs);
    packet.communities.slice().sort((a, b) => compareId(a.id, b.id)).forEach(community => {
      const paths = scenario.access.map((access, accessIndex) => ({ access, accessIndex }))
        .filter(({ access }) => access.communityId === community.id && access.facilityId === site.facilityId)
        .sort((a, b) => compareId(a.access.id, b.access.id));
      if (!paths.length) {
        add(`${scenarioPath}.access[communityId=${community.id}][facilityId=${site.facilityId}]`, "access", absentFact(),
          `No path is supplied from community ${community.id} to facility ${site.facilityId}; access and topology remain unknown.`,
          { ...refs, communityId: community.id });
      }
      paths.forEach(({ access, accessIndex }) => {
        const accessPath = `${scenarioPath}.access[${accessIndex}]`;
        const accessRefs = { ...refs, communityId: community.id };
        add(`${accessPath}.available`, "access", access.available,
          `Availability of path ${access.id} is ${isKnown(access.available) ? "false" : "unknown"}; this path cannot count until all its gates are true.`, accessRefs,
          (changed, fact) => { changed.scenarios[scenarioIndex].access[accessIndex].available = fact; });
        add(`${accessPath}.dependsOn`, "topology", access.dependsOn,
          `Declared dependency topology for path ${access.id} is unknown; no dependency-free path is invented.`, accessRefs);
        if (isKnown(access.dependsOn)) access.dependsOn.value.slice().sort(compareId).forEach(dependencyId => {
          const stateIndex = scenario.dependencyStates.findIndex(state => state.dependencyId === dependencyId);
          const dependencyPath = stateIndex < 0
            ? `${scenarioPath}.dependencyStates[dependencyId=${dependencyId}].open`
            : `${scenarioPath}.dependencyStates[${stateIndex}].open`;
          const fact = stateIndex < 0 ? absentFact() : scenario.dependencyStates[stateIndex].open;
          add(dependencyPath, "dependency", fact,
            `Dependency ${dependencyId} is ${isKnown(fact) ? "closed" : "unknown"}; every path declaring it is blocked even if availability is true.`, { dependencyId },
            (changed, trueFact) => {
              if (stateIndex < 0) changed.scenarios[scenarioIndex].dependencyStates.push({ dependencyId, open: trueFact });
              else changed.scenarios[scenarioIndex].dependencyStates[stateIndex].open = trueFact;
            });
        });
      });
    });
  });
  excludedNominations.sort((a, b) => compareId(a.facilityId, b.facilityId));
  return { blockers: Array.from(blockers.values()).sort((a, b) => compareId(a.path, b.path)),
    candidates: Array.from(candidates.values()).sort((a, b) => compareId(a.blocker.path, b.blocker.path)), excludedNominations };
}

function targetedQuestion(packet: ReviewPacket, scenarioIndex: number, arrangementIndex: number, blocker: Blocker): string {
  const scenario = packet.scenarios[scenarioIndex];
  const arrangementId = scenario.arrangementFacts[arrangementIndex].arrangementId;
  const arrangement = packet.arrangements.find(item => item.id === arrangementId)!;
  const facility = packet.facilities.find(item => item.id === blocker.facilityId);
  const community = packet.communities.find(item => item.id === blocker.communityId);
  const dependency = packet.dependencies.find(item => item.id === blocker.dependencyId);
  const during = `${scenario.service}, ${scenario.window} (${scenario.label})`;
  switch (blocker.category) {
    case "nomination": return `Should ${facility?.name ?? blocker.facilityId} be nominated in ${arrangement.label} for ${during}? Confirm the review owner's intent.`;
    case "capacity": return `What sourced capacity in ${scenario.units} applies to ${facility?.name ?? blocker.facilityId} for ${during}?`;
    case "crew-requirement": return `What sourced crew requirement applies to ${facility?.name ?? blocker.facilityId} for ${during}?`;
    case "authorisation": return `What evidence establishes authorisation for ${facility?.name ?? blocker.facilityId} to provide ${during}?`;
    case "suitability": return `What evidence establishes that ${facility?.name ?? blocker.facilityId} is suitable for ${during}?`;
    case "backup": return `What evidence establishes the entered backup prerequisite for ${facility?.name ?? blocker.facilityId} for ${during}?`;
    case "access": return `What evidence establishes access from ${community?.name ?? blocker.communityId} to ${facility?.name ?? blocker.facilityId} for ${during}?`;
    case "topology": return `Which sourced dependency list applies to ${blocker.path} for ${during}?`;
    case "dependency": return `What evidence establishes that ${dependency?.name ?? blocker.dependencyId} is open for ${during}?`;
    case "demand": return `What sourced demand in ${scenario.units} applies to ${community?.name ?? blocker.communityId} for ${during}?`;
    case "crew-ceiling": return `What sourced crew ceiling is available for ${during}?`;
  }
}

function reviewRow(packet: ReviewPacket, scenarioIndex: number, arrangementIndex: number): ReviewRow {
  const baseline = calculate(packet, scenarioIndex, arrangementIndex);
  const evidence = evidenceFor(packet, scenarioIndex, arrangementIndex);
  const probes: ConditionalProbe[] = evidence.candidates.map(candidate => {
    const beforeFact = copy(candidate.blocker.fact);
    const afterFact: Sourced<boolean> = { ...beforeFact, value: true, status: "declared",
      source: "One-factor conditional probe: assume true; not verified evidence" };
    const changed = copy(packet);
    candidate.setTrue(changed, afterFact);
    const after = calculate(changed, scenarioIndex, arrangementIndex);
    const conditionalDelta = baseline.total === null || after.total === null ? null : after.total - baseline.total;
    const distributionChanged = baseline.gapVectors !== null && after.gapVectors !== null
      && JSON.stringify(baseline.gapVectors) !== JSON.stringify(after.gapVectors);
    return { path: candidate.blocker.path, beforeFact, afterFact,
      beforeTotal: baseline.total, afterTotal: after.total, conditionalDelta,
      beforeGapVectors: copy(baseline.gapVectors), afterGapVectors: copy(after.gapVectors), distributionChanged,
      interpretation: conditionalDelta === null ? "not-calculable"
        : conditionalDelta > 0 ? "individual-gain"
        : distributionChanged ? "distribution-change" : "no-standalone-gain" };
  });
  const questions: VerificationQuestion[] = evidence.blockers.flatMap(blocker => {
    const probe = probes.find(item => item.path === blocker.path);
    const reason = blocker.kind === "unknown" ? "unknown-fact"
      : probe?.interpretation === "individual-gain" ? "conditional-gain" : null;
    return reason === null ? [] : [{ path: blocker.path, roleHypothesis: blocker.roleHypothesis,
      question: targetedQuestion(packet, scenarioIndex, arrangementIndex, blocker), reason }];
  });
  return { scenarioId: packet.scenarios[scenarioIndex].id,
    arrangementId: packet.scenarios[scenarioIndex].arrangementFacts[arrangementIndex].arrangementId,
    status: baseline.total === null ? "blocked" : "conditional", ...baseline,
    blockers: evidence.blockers, excludedNominations: evidence.excludedNominations, probes, questions };
}

/** Internal entry point for a validated packet. The continuity wrapper validates input. */
export function allocateReview(packet: ReviewPacket): ReviewResult {
  const factsUsed = copy(packet);
  const rows: ReviewRow[] = [];
  factsUsed.scenarios.map((scenario, i) => ({ scenario, i }))
    .sort((a, b) => compareId(a.scenario.id, b.scenario.id)).forEach(({ scenario, i }) => {
      scenario.arrangementFacts.map((arrangement, j) => ({ arrangement, j }))
        .sort((a, b) => compareId(a.arrangement.arrangementId, b.arrangement.arrangementId))
        .forEach(({ j }) => rows.push(reviewRow(factsUsed, i, j)));
    });
  return { version: REVIEW_VERSION, title: packet.title, factsUsed, rows, modelLimits: copy(MODEL_LIMITS) };
}
