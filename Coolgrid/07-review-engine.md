# Continuity review engine

The engine compares entered service places for a selected scenario and arrangement. It produces conditional allocations, community gaps, evidence blockers, one-factor probes and a Markdown brief. It does not certify service readiness or combine scenarios into an impact score.

The implementation is separate from the existing screens, processed data, backup arithmetic and scoring modules. Teams can call it in process or connect an editing screen to the HTTP endpoint.

## Public contract

The version is `coolgrid-review/v1`. The authoritative TypeScript contract is `lib/review-contract.ts`.

```ts
buildReviewPacket(catalogue, selection, planningFacts): ReviewPacket;
validateReviewPacket(input: unknown): ValidationResult;
reviewPacket(packet: ReviewPacket): ReviewResult;
renderReviewBrief(result: ReviewResult): string;
```

Packets contain 1–6 facilities, 1–4 communities, 1–3 scenarios and 1–3 arrangements. Limits are rejected rather than silently trimming the catalogue. Each physical entity has a unique stable ID; calculations use IDs and display names can change. Dependencies and access paths also have bounded counts. Count inputs, including site crew requirements, are nonnegative integers bounded by the contract.

Each scenario specifies its own `service`, `window`, `units`, demand for every community, crew ceiling, per-arrangement facility facts, access paths and dependency states. Supported kinds are `heat`, `heat-outage` and `flood-access-loss`. Windows are metadata, with no scheduling or duration arithmetic. Services and scenarios remain separate. Backup is an entered prerequisite applicable to `heat-outage`; battery size or a map overlay cannot establish that prerequisite.

Each `Sourced<T>` retains `value`, `status`, `source`, `date` and optional `licence`. Status is `public`, `declared`, `illustrative` or `unknown`. Unknown is `value: null` with `status: "unknown"`; it is never replaced by a guessed zero. Public context and illustrative planning values keep their original provenance.

An arrangement's label supplies no behaviour. Its actual per-facility `nominated` facts determine intent. A sourced false nomination means intentional exclusion and creates no default confirmation request. Unknown nomination intent excludes counting and asks the review owner to confirm intent. All applicable eligibility gates must be explicitly true. Unknown capacity or crew requirements exclude that site's conditional contribution while retaining the unresolved evidence. Unknown scenario demand or crew ceiling makes totals and gaps `null`, rather than reporting zero actual capacity.

An access path counts only if `available` is known true, `dependsOn` is known, and every declared dependency state is known open. A known empty dependency list means no declared dependencies. A failed dependency overrides an available-route fact. A referenced dependency without a state remains unknown. A probe changes only one state to known open; it retains topology, availability and every other dependency.

The allocation enumerates bounded facility subsets and uses integer maximum flow to conserve site places, site crews and community demand. `witnesses` show selected facilities, crews and positive flows. `gapVectors` retain distinct community outcomes produced by the best subsets. This does not enumerate every flow tie within a subset or implement an equity policy. A total alone is insufficient to describe a community outcome.

Each result row belongs to one scenario and arrangement. It includes conditional or blocked status, total, gaps, witnesses, false and unknown blockers, intentional exclusions, probes and targeted questions. Blockers retain original evidence. Verification roles are routing hypotheses, not assignments to real people. Probes preserve before/after facts, totals, gap vectors, conditional delta and distribution changes. A zero standalone delta creates no default extra verification work and does not prove irrelevance where multiple blockers remain. Distribution changes are available for the owner's inquiry, without adding a default question. Unknown evidence still requires a question independently of the probe's delta. Unknown scenario evidence cannot be resolved by inventing probe counts.

`factsUsed` is the exact entered packet, including context. `modelLimits` supplies machine-readable codes and descriptions. The Markdown renderer derives labels, nominations and comparisons from these facts and returned rows. It escapes entered Markdown/HTML in prose and tables, and includes the complete original packet inside a safely fenced JSON block.

## Checkout-local fictional example

`examples/review-packet.json` is wholly synthetic. Every sourced value is labelled `illustrative`, dated 2026-10-03, and attributed to a fictional example. Its source labels and licence apply to the synthetic fixture, not operational records. The fixtures and tests use checked-in files and require no remote service or Python runtime.

Two fictional communities each demand four places. Central has eight places and requires one crew. West local and East local each have four places and require one crew. The scenario ceiling is two crews. The existing and entered-backup arrangements nominate Central. The local arrangement nominates the two local facilities. Central's outage backup prerequisite is false in the existing arrangement and true in the entered-backup arrangement; both local prerequisites are true. A shared fictional crossing closes the Central-to-East path during the flood scenario while leaving each local path available.

| Entered arrangement | Heat cooling places | Outage cooling places | Flood relief places |
| --- | --- | --- | --- |
| Existing central | 8 | 0 | 4 |
| Entered central backup | 8 | 8 | 4 |
| Entered local | 8 | 8 | 8 |

These are separate scenario answers from this fixture, not a combined score or an operational benefit claim. With a one-crew outage ceiling, entered-backup Central still counts eight, while the locals count four. Both local community-gap outcomes must remain visible. Setting Central capacity to zero changes its counts and the comparison prose. Changing nominations within the entered-backup label changes both the allocation and its nomination description. No changed packet inherits an answer key based on its labels.

## Integration examples

`examples/review-integration.ts` contains executable, typed examples for the in-process call, a browser request and the processed-data adapter. `reviewFictionalExample()` returns the synthetic result and brief. A teammate can use the browser helper after maintaining an editable `ReviewPacket` in their screen:

```ts
const { result, briefMarkdown } = await requestReview(enteredPacket);
// Render result.rows for the selected scenario. Download briefMarkdown as text.
```

The in-process boundary accepts unknown input and raises `ReviewContractError` with field-specific errors when validation fails:

```ts
const { result, briefMarkdown } = reviewInProcess(enteredPacket);
```

For the labelled processed catalogue, pass a selection of actual SAL and facility IDs plus planning facts to `reviewProcessedSelection(selection, planningFacts)`. The adapter joins SAL/facility/crossing IDs directly. It retains Census and SEIFA as context; overlapping Census groups cannot be added to infer demand. Nominal places are candidates. Applying them to a particular service/window requires an explicit sourced `applyNominalCapacity: true` assumption, or supply an explicit sourced `capacity` instead. Caller-supplied demand, crew ceiling, authorisation, suitability, backup and access are required for conditional counting. Missing evidence stays unknown. Straight-line access links describe illustrative dependency hypotheses, and overlays describe geography; neither proves a closure, safe access, inundation depth or mounting requirement.

`reviewUnknownProcessedExample()` supplies a concrete SAL/facility selection and scenario metadata. It preserves the public and illustrative catalogue context, fills omitted operational evidence with sourced unknowns, and returns a blocked row with null totals and gaps. This is a useful initial state for an editing screen. To enter a facility fact, use the scenario's actual arrangement and facility IDs:

```ts
const sourced = <T>(value: T) => ({
  value, status: "declared" as const,
  source: "Replace with the responsible owner's dated record", date: "2026-10-03",
});
planningFacts.scenarios[0].arrangementFacts = [{
  arrangementId: "entered",
  facilities: [{
    facilityId: "fac-sunshine-library",
    nominated: sourced(true),
    applyNominalCapacity: sourced(true),
    // Enter sourced crewsRequired, authorised, suitable and backup here.
  }],
}];
```

This explicit nominal-capacity assumption retains the candidate's original status and source alongside the separate assumption. Demand, scenario crew ceiling, access availability and every dependency state also need supplied evidence before counting. The API requires a complete `ReviewPacket` with explicit sourced unknowns; the adapter accepts partial planning facts and constructs that packet. Supplied malformed facts still fail validation. Context keys encode ID components so punctuation in IDs cannot overwrite another scenario's assumptions.

## HTTP endpoint

Run the application from this checkout using `npm run dev`. The stateless endpoint accepts a packet and returns `{ result, briefMarkdown }`. It performs no external fetching, persistence, filesystem export or payload logging.

```sh
curl -i -X POST http://localhost:3000/api/continuity/review \
  -H 'Content-Type: application/json' \
  --data-binary @examples/review-packet.json
```

In PowerShell use `curl.exe` for the same arguments. The shell continuation shown above is for a POSIX shell; put the command on one line in PowerShell.

| Response | Meaning |
| --- | --- |
| 200 | Valid packet, including valid unknown-heavy evidence; structured blocked or conditional rows |
| 400 | Invalid JSON syntax |
| 422 | Invalid contract with field-specific errors |

An unknown-heavy 200 response is a review outcome that needs evidence, not a transport failure. Screens should distinguish null totals from counted zero and retain the scenario service, window and units when displaying either.

## Verification and limits

Use `npm test`, `npx tsc --noEmit` and `npm run build` from the checkout. Existing data/geography checks remain in place. Added tests verify allocation conservation, selection bounds, runtime validation, adapter provenance, dependency semantics, multi-community cases, probes and dynamic Markdown. Brief regressions independently check the synthetic totals, Central capacity zero, changed nominations, unknown evidence, one-crew community outcomes and untrusted labels. API exercises cover a calculable fixture, valid unknown-heavy evidence, malformed JSON and invalid contracts.

With a production server listening on port 3215 (`npm run start -- -p 3215`), run the reproducible HTTP exercises:

```sh
node scripts/exercise-review-api.mjs
```

Pass a different endpoint URL as the first argument if needed. The script reads the synthetic packet relative to its own file, checks the golden counts, then exercises unknown-heavy evidence, malformed JSON and invalid contracts. It logs compact outcomes and does not export packet data.

The engine does not implement backup arithmetic integration, time scheduling, shared generators, subgroup allocation, area ranking, capital optimisation or physical-service certification. Its results establish bounded conditional mechanics from entered evidence, without measured physical benefit claims.

AI assistance was used to implement and review this branch. The synthetic fixture is labelled as fictional, and the resulting calculations are verified by automated checks and independent acceptance review. Human teams remain responsible for supplying and verifying service evidence and for operational decisions.
