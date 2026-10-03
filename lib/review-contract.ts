import type { Sourced } from "./sourced";

/** Versioned boundary shared by allocation, API, adapter and Markdown export. */
export const REVIEW_VERSION = "coolgrid-review/v1" as const;
export const REVIEW_LIMITS = {
  facilities: 6, communities: 4, scenarios: 3, arrangements: 3,
  dependencies: 64, accessPaths: 48, count: 1_000_000,
} as const;
export type ScenarioKind = "heat" | "heat-outage" | "flood-access-loss";
export type Context = Record<string, Sourced<unknown>>;
export type ReviewEntity = { id: string; name: string; context?: Context };
export type Arrangement = { id: string; label: string };
export type FacilityFacts = {
  facilityId: string;
  nominated: Sourced<boolean>;
  capacity: Sourced<number>;
  crewsRequired: Sourced<number>;
  authorised: Sourced<boolean>;
  suitable: Sourced<boolean>;
  /** Entered prerequisite, applicable only to heat-outage; no battery arithmetic. */
  backup: Sourced<boolean>;
};
export type AccessPath = {
  id: string; communityId: string; facilityId: string;
  available: Sourced<boolean>;
  /** Known empty list explicitly means no declared dependencies. Null blocks access. */
  dependsOn: Sourced<string[]>;
};
export type ReviewScenario = {
  id: string; label: string; kind: ScenarioKind;
  service: string; window: string; units: string;
  demand: { communityId: string; amount: Sourced<number> }[];
  crewCeiling: Sourced<number>;
  arrangementFacts: { arrangementId: string; facilities: FacilityFacts[] }[];
  access: AccessPath[];
  /** A declared dependency with no state is unknown, never open. */
  dependencyStates: { dependencyId: string; open: Sourced<boolean> }[];
};
export type ReviewPacket = {
  version: typeof REVIEW_VERSION; title: string;
  facilities: ReviewEntity[]; communities: ReviewEntity[];
  dependencies: ReviewEntity[]; arrangements: Arrangement[];
  scenarios: ReviewScenario[];
};
export type FieldError = { path: string; message: string };
export type ValidationResult =
  | { valid: true; packet: ReviewPacket }
  | { valid: false; errors: FieldError[] };
export class ReviewContractError extends Error {
  constructor(public readonly errors: FieldError[]) {
    super(errors.map(e => `${e.path}: ${e.message}`).join("; "));
    this.name = "ReviewContractError";
  }
}
export type GapVector = { communityId: string; demand: number; allocated: number; gap: number }[];
export type AllocationWitness = {
  facilityIds: string[]; crewsUsed: number; total: number;
  flows: { facilityId: string; communityId: string; places: number }[];
  gaps: GapVector;
};
export type Blocker = {
  path: string; kind: "unknown" | "false";
  category: "nomination" | "capacity" | "crew-requirement" | "authorisation" |
    "suitability" | "backup" | "access" | "topology" | "dependency" | "demand" | "crew-ceiling";
  fact: Sourced<unknown>; facilityId?: string; communityId?: string; dependencyId?: string;
  explanation: string; roleHypothesis: string;
};
export type ConditionalProbe = {
  path: string; beforeFact: Sourced<unknown>; afterFact: Sourced<unknown>;
  beforeTotal: number | null; afterTotal: number | null; conditionalDelta: number | null;
  beforeGapVectors: GapVector[] | null; afterGapVectors: GapVector[] | null;
  distributionChanged: boolean;
  interpretation: "individual-gain" | "distribution-change" | "no-standalone-gain" | "not-calculable";
};
export type VerificationQuestion = {
  path: string; question: string; roleHypothesis: string;
  reason: "unknown-fact" | "conditional-gain" | "distribution-change";
};
export type ReviewRow = {
  scenarioId: string; arrangementId: string;
  status: "blocked" | "conditional";
  total: number | null; gapVectors: GapVector[] | null;
  witnesses: AllocationWitness[]; blockers: Blocker[];
  excludedNominations: { facilityId: string; fact: Sourced<boolean> }[];
  probes: ConditionalProbe[]; questions: VerificationQuestion[];
};
export type ModelLimit = { code: string; description: string };
export type ReviewResult = {
  version: typeof REVIEW_VERSION; title: string;
  /** Exact entered evidence, including context, retained without provenance upgrades. */
  factsUsed: ReviewPacket;
  rows: ReviewRow[]; modelLimits: ModelLimit[];
};

/** Labelled processed files, structurally compatible with the repository JSON. */
export type ProcessedCatalogue = {
  areas: { sal: string; name: string; [key: string]: unknown }[];
  facilities: { id: string; name: string; sal: string;
    services: Record<string, { places: Sourced<number>; [key: string]: unknown }>;
    [key: string]: unknown }[];
  crossings: { id: string; road: string; [key: string]: unknown }[];
  links: { from: string; to: string; dependsOn: Sourced<string[]>;
    distanceKm: Sourced<number> }[];
};
export type ReviewSelection = { communityIds: string[]; facilityIds: string[] };
/** Adapter inputs may omit operational facts; omitted evidence becomes unknown. */
export type PlannedFacilityFacts = Pick<FacilityFacts, "facilityId"> & Partial<Omit<FacilityFacts, "facilityId">> & {
  /** Explicit agreement to apply nominal places to this scenario service/window. */
  applyNominalCapacity?: Sourced<boolean>;
};
export type PlanningScenario = Pick<ReviewScenario, "id" | "label" | "kind" | "service" | "window" | "units"> & {
  demand?: { communityId: string; amount?: Sourced<number> }[];
  crewCeiling?: Sourced<number>;
  arrangementFacts?: { arrangementId: string; facilities?: PlannedFacilityFacts[] }[];
  /** Every selected pair receives catalogue topology; omitted availability is unknown. */
  access?: { communityId: string; facilityId: string; available?: Sourced<boolean> }[];
  /** Absent states remain unknown when access depends on them. */
  dependencyStates?: { dependencyId: string; open?: Sourced<boolean> }[];
};
export type PlanningFacts = {
  title: string; arrangements: Arrangement[]; scenarios: PlanningScenario[];
};
