/** Checkout-local integration examples. Call these from a UI or server action. */
import areas from "../lib/data/areas.json";
import facilities from "../lib/data/facilities.json";
import crossings from "../lib/data/crossings.json";
import links from "../lib/data/access-links.json";
import fictionalPacket from "./review-packet.json";
import { buildReviewPacket, reviewPacket, validateReviewPacket } from "../lib/continuity";
import { renderReviewBrief } from "../lib/brief";
import { ReviewContractError } from "../lib/review-contract";
import type {
  PlanningFacts, ProcessedCatalogue, ReviewPacket, ReviewResult, ReviewSelection,
} from "../lib/review-contract";

export type ReviewResponse = { result: ReviewResult; briefMarkdown: string };

/** An in-process call uses the same validation boundary as the HTTP endpoint. */
export function reviewInProcess(input: unknown): ReviewResponse {
  const validated = validateReviewPacket(input);
  if (!validated.valid) throw new ReviewContractError(validated.errors);
  const result = reviewPacket(validated.packet);
  return { result, briefMarkdown: renderReviewBrief(result) };
}

/** Fictional evidence only; this call performs no fetching or persistence. */
export function reviewFictionalExample(): ReviewResponse {
  return reviewInProcess(fictionalPacket);
}

/** Browser client. Present 400/422 errors to the editing UI before retrying. */
export async function requestReview(packet: ReviewPacket): Promise<ReviewResponse> {
  const response = await fetch("/api/continuity/review", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(packet),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Review request failed (${response.status}): ${JSON.stringify(body)}`);
  return body as ReviewResponse;
}

// JSON imports widen status literals to string. These assertions describe the
// labelled repository schema; buildReviewPacket validates its produced packet.
const catalogue: ProcessedCatalogue = {
  areas: areas.areas,
  facilities: facilities.facilities as ProcessedCatalogue["facilities"],
  crossings: crossings.crossings,
  links: links.links as ProcessedCatalogue["links"],
};

/**
 * Adapter example: caller selects actual SAL/facility IDs and enters scenario
 * facts. Nominal capacity requires applyNominalCapacity with sourced true, or
 * an explicit sourced capacity. No population-to-demand inference is made.
 * Missing authorisation, suitability, backup, crew or access stays unknown.
 */
export function reviewProcessedSelection(
  selection: ReviewSelection, planningFacts: PlanningFacts,
): ReviewResponse {
  return reviewInProcess(buildReviewPacket(catalogue, selection, planningFacts));
}

/** Minimal catalogue join: no operational evidence is inferred from public context. */
export function reviewUnknownProcessedExample(): ReviewResponse {
  return reviewProcessedSelection(
    { communityIds: ["22395"], facilityIds: ["fac-sunshine-library"] },
    {
      title: "Example review awaiting service evidence",
      arrangements: [{ id: "entered", label: "Entered arrangement" }],
      scenarios: [{
        id: "outage", label: "Entered outage review", kind: "heat-outage",
        service: "coolingRespite", window: "Example 10:00–14:00 window", units: "places",
      }],
    },
  );
}
