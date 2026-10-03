# CoolGrid

Planning tool for council emergency and relief planners: does a service arrangement still work when heat, a power outage or flood-related access loss disrupts facilities, and what should be verified or exercised next? COP31 priority: Resilient Cities & Buildings.

**Prototype status:** suburbs, population, flood overlays, facility locations and roads are real public data (ABS, Vicmap; CC BY 4.0). Facility places, crews, backup power and community demand are labelled illustrative planning inputs. See `/methodology` and `/validation`.

## Run
```bash
npm install
npm run dev          # http://localhost:3000
npm test             # all automated checks
npm run data:build   # rebuild lib/data/*.json from ABS and Vicmap (about a minute)
```

To check a production build while a dev server is running, build into a separate folder so the dev server is not broken:
```bash
NEXT_DIST_DIR=.next-build npx next build
```

## Pages
| Route | Purpose |
|---|---|
| `/` | Overview, with live results from the engine |
| `/dashboard` | Planning map: suburbs, facilities, flood exposure, every value with its source |
| `/continuity` | Continuity Lab: 3 arrangements × 3 separate scenarios, gaps, causes and questions |
| `/brief` | Printable review brief for the selected arrangement and crew count |
| `/validation` | Data provenance and live checks (golden comparison, backup hand checks, sensitivity, invariants) |
| `/methodology` | Method, assumptions and limits |
| `/resident/<ABS suburb code>` | Plain-language resident card, translated where Census shows the language is common |

## Structure
- `scripts/` downloads and cleans ABS and Vicmap data into `lib/data/` (sources and calculations in `lib/data/SOURCES.md`)
- `lib/sourced.ts` labelled-value type used everywhere: public, declared, illustrative or unknown
- `lib/review-*.ts`, `lib/continuity.ts`, `lib/brief.ts` continuity review engine, contract, validation and brief
- `lib/backup.ts` backup-power check that feeds the outage scenario
- `lib/demo-review.ts` real-data review: study selection, arrangements, scenarios and labelled assumptions
- `lib/area-context.ts` area context score with sensitivity, group context and flood rules
- `tests/` automated checks for data, engine, backup check and review
- `Coolgrid/` analysis archive and implementation plan (`06-implementation-plan.md`)

## Deploy
Push to GitHub and import the repository in Vercel. No database or API keys are needed.

## Material AI use
Research, analysis, code, data processing, tests and translations were produced with substantial help from AI assistants (Claude) and reviewed by the team. Vietnamese and Arabic resident-card translations are drafts that need native-speaker review.
