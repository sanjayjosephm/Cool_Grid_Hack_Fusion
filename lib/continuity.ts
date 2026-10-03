/** Public continuity-review entry points. No catalogue values become readiness facts. */
export * from "./review-contract";
export { buildReviewPacket, processedCatalogue } from "./review-adapter";
export { validateReviewPacket } from "./review-validation";

import { ReviewContractError, type ReviewPacket, type ReviewResult } from "./review-contract";
import { validateReviewPacket } from "./review-validation";
import { allocateReview } from "./review-allocation";

/** Runtime validation is required even for TypeScript callers. */
export function reviewPacket(packet: ReviewPacket): ReviewResult {
  const validated = validateReviewPacket(packet);
  if (!validated.valid) throw new ReviewContractError(validated.errors);
  return allocateReview(validated.packet);
}
