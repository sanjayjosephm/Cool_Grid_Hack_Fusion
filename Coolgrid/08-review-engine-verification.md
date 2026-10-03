# Review engine verification

Verified on 3 October 2026 for `coolgrid-review/v1`, starting at commit `9fb39507ad14850b770e92367eda7428745359d5` on the isolated `codex/coolgrid-review-engine` branch. This record covers the continuity engine, adapter, stateless API and Markdown renderer; existing screens and processed datasets were not changed.

| Check | Observed result |
| --- | --- |
| Full Vitest suite | 110 tests passed in 9 files, including the 24 original data/geography/access tests |
| TypeScript | `tsc --noEmit` passed |
| Production build | Next.js build passed; `/api/continuity/review` is a dynamic route |
| Live production API: synthetic packet | HTTP 200; existing 8/0/4, backup 8/8/4, local 8/8/8 |
| Live production API: unknown-heavy packet | HTTP 200; nine blocked rows, null totals and gaps, targeted questions |
| Live production API: malformed JSON | HTTP 400 with syntax error |
| Live production API: invalid contract | HTTP 422 with field-specific version and demand errors |
| Fixture independence | New tests use checked-in synthetic fixtures or labelled catalogue JSON, without external records or a Python runtime |
| Ownership | Changes add engine, API, examples, tests and documentation only |

The project lockfile was used without dependency changes. The existing layout downloads Google Fonts during a production build; network access was needed for that step. The review endpoint performs no external fetches.

The committed suite includes 36 independent exhaustive attainable-state comparisons for four communities with up to six facilities, and a second 12-case exhaustive allocation oracle. These verify attainable totals through a different method from maximum flow. Separate regressions cover residual rerouting, six-site bottlenecks, crew/capacity/demand conservation, tied subset community outcomes, unknowns, absent dependency states, multiple blockers and dynamic prose.

Two independent acceptance reviews also exercised 240 bounded cut-oracle cases and 96 mixed evidence cases, with 607 one-factor probe comparisons and additional invalid API inputs. These checks overlap with the committed tests and are not added into the Vitest count. Review findings led to repairs for omitted adapter evidence, zero-gain default questions, ambiguous provenance keys and non-enumerable JavaScript fields. The repaired cases were independently rechecked; no outstanding defect was found in this engineering slice.

To reproduce, install the locked dependencies, run `npm test`, `npx tsc --noEmit` and `npm run build`, then start the production server on port 3215 and run `node scripts/exercise-review-api.mjs`. The endpoint URL can be passed as the script's first argument. See [integration documentation](07-review-engine.md) and [typed examples](../examples/review-integration.ts).

AI assistance was used for implementation, test generation and independent review. All service examples are synthetic or explicitly sourced assumptions. These checks establish conditional software mechanics, without physical service certification, time scheduling, backup arithmetic integration or measured benefit claims.
