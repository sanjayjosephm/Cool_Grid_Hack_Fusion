# CoolGrid — implementation plan

**3 October 2026.** The team's working plan for building CoolGrid today. It implements the Continuity Lab direction from [04](04-coolgrid-elevation-and-judging.md) and [05](05-team-discussion-brief.md) on real public data. It covers implementation only; presentation, video and submission are planned separately. Nothing is assumed to be built yet.

## What we are building

A planning tool for a **council emergency/relief planning officer**. It answers:

> Does our service arrangement still work when heat, a power outage or a flood-related access loss disrupts our facilities, and what should we verify or exercise next?

Flow: **real area data → facilities → backup check → three separate scenarios → gaps and their cause → review brief.**

## Priorities

| Level | Meaning | Rule |
|---|---|---|
| **P1** | Must-have. Without it the project does not work or cannot be shown | Everyone works on P1 until the P1 checkpoint passes |
| **P2** | Strengthens the project | Start only after the P1 checkpoint |
| **P3** | Roadmap | Do not build today; record as next steps |

## Rules for every screen and every number

1. **Every value is labelled** with its status, source, date and licence (see Step 0).
2. **Unknown is never guessed.** A missing required fact blocks the result and produces a question with an owner.
3. **Scenarios are never added together.** Heat, outage and flood results are shown side by side, never summed into one score.
4. **No "open centre", "safe refuge" or evacuation-route labels.** Facilities are planning arrangements, not a public list of places to go.
5. **Capacity belongs to one service type.** Cooling respite and flood shelter capacity cannot be swapped.
6. **No made-up benefit claims.** No energy-saving, emissions or "lives protected" figures without assessed data.

## Step 0 — Setup (all three, 30 minutes)

| Task | Done when |
|---|---|
| Create the folder structure on `main`; each member branches from it | Everyone can run `npm run dev` |
| Add `vitest` and an `npm test` script | `npm test` runs an example test |
| Agree the labelled-value type in `lib/sourced.ts` | Committed before any data work starts |
| Agree IDs: ABS suburb (SAL) codes, facility IDs, crossing IDs, in `lib/ids.ts` | Committed; IDs never depend on display names |
| Agree the JSON shape of each data file | Example file for each in `lib/data/` |

```
scripts/      fetch-*.mjs        download and clean raw data
data/raw/     (gitignored)       original downloads
lib/data/     *.json             cleaned, labelled data the app reads
lib/          sourced.ts, ids.ts, score.ts, backup.ts, continuity.ts, brief.ts
tests/        *.test.ts
app/          map/, continuity/, brief/, validation/
```

```ts
// lib/sourced.ts
export type Sourced<T> = {
  value: T | null;                                        // null = unknown, never guessed
  status: "public" | "declared" | "illustrative" | "unknown";
  source: string;                                         // e.g. "ABS SEIFA 2021, IRSD by SAL"
  date: string;                                           // data date or download date
  licence?: string;                                       // e.g. "CC BY 4.0"
};
```

- **public** — downloaded from an official dataset
- **declared** — a planning input an officer would enter (capacity, staffing, backup)
- **illustrative** — a labelled placeholder for the demo
- **unknown** — blocks the result and raises a question

## P1 — Core flow (finish today)

### Data layers — Member A

| ID | Layer | Source | Output | Done when |
|---|---|---|---|---|
| P1-D0 | Suburb boundaries | ABS Suburbs and Localities 2021 (CC BY 4.0) | `suburbs.geo.json` | All study suburbs present; simplified below 50 KB |
| P1-D1 | Social disadvantage | ABS SEIFA 2021, IRSD by suburb | `areas.json` (combined with D2, one record per suburb) | All suburbs matched by code; 2 checked by hand against the ABS file |
| P1-D2 | People | ABS Census 2021 by suburb: population, % aged 65+, % living alone, top languages | `areas.json` (combined with D1) | Population matches ABS QuickStats for 3 suburbs |
| P1-D3 | Flood exposure | Vicmap Planning flood overlays (LSIO, Floodway Overlay) from data.vic | `flood.json`: % of suburb area in overlay; per-facility flag | % area hand-checked for 2 suburbs; a facility known to be in an overlay is flagged |
| P1-D4 | Facilities | 6–8 real libraries / community centres / neighbourhood houses. Location **public**; capacity, staffing, backup **declared** | `facilities.json` | Each facility lies inside its suburb polygon; every field labelled |
| P1-D5 | Access dependencies | Main roads (Vicmap Transport) crossing riverine flood overlays, with stable IDs; each community's link to each facility lists the crossings within 0.5 km of the straight line (illustrative; routing is P2) | `crossings.json`, `access-links.json` | Each community's access route lists its crossing IDs; distances re-checked independently |

**Time box:** if a dataset takes more than 90 minutes, use a labelled `illustrative` value and move on.

### Engine — Member B

| ID | Layer | What it does | Done when |
|---|---|---|---|
| P1-E1 | Backup check | Per facility: cooling on the backed-up circuit? inverter covers start-up surge plus other loads? usable battery energy lasts the outage? Unknown → "needs assessment" | ≥ 8 hand-calculated cases pass, including "unknown never passes" |
| P1-E2 | Continuity Lab engine | Facilities × three separate scenarios (heat / heat + outage / flood + crossing closed) × service type × crew and capacity limits → allocation per community, gaps, **the dependency causing each gap**, next action | Golden tests reproduce [04](04-coolgrid-elevation-and-judging.md): **8 / 0 / 4 → 8 / 8 / 4 → 8 / 8 / 8**, and the one-crew counterexample |
| P1-E3 | Required checks | Capacity and crew counted once; unknowns block; crossings by stable ID; scenarios never summed; capacity not transferred between service types | One test per rule |
| P1-E4 | Shortfalls by group | Gaps per community and per group (e.g. residents 65+, living alone) using Census data | Totals per group add up to the community total |
| P1-E5 | Flood rules | Facility in a flood overlay → warning; electrical equipment in flood-exposed areas → "mount above flood level" requirement | Tests for in-overlay, out-of-overlay and unknown |
| P1-E6 | Area context score | Ranks suburbs on real D1–D3 data as background context, not the decision | Sensitivity test (each weight ±20%) passes and results are recorded |

Start E1–E3 on fictional data immediately; real data plugs in later through the agreed JSON shapes.

### App screens — Member C

| ID | Screen | Done when |
|---|---|---|
| P1-U1 | Map: real basemap (OpenFreeMap), suburb boundaries, facility markers, area-context / flood toggle | Clicking a suburb or facility opens a panel showing values with source labels |
| P1-U2 | Continuity Lab: choose arrangement (existing / backup added / local facilities) and crew count; three scenarios side by side; gaps per community and group; the cause of each gap | Changing arrangement or crew updates results immediately |
| P1-U3 | Review brief: unresolved facts, a question and owner for each, recommended next verification or exercise; printable | Generated from engine output, not hard-coded |
| P1-U4 | Validation page: data-sources table (source, date, licence, status) and every test result, computed at build time | Shows live totals such as "N/N checks pass" |

### P1 checkpoint

Merge all branches into `main`; `npm test` and `npm run build` must both pass; deploy to Vercel; click through map → Continuity Lab → review brief → validation once. **No P2 work starts until this passes.**

## P1 status (3 October 2026)

**P1 complete.** All P1 items are built on real data with automated checks (146 tests passing, production build passing).

| Item | Status | Where |
|---|---|---|
| D0–D5 data layers | Done | `lib/data/`, `scripts/`, `tests/data.test.ts`, `tests/geo.test.ts`, `tests/access-links.test.ts` |
| E1 backup check | Done; 9 hand-calculated cases | `lib/backup.ts`, `tests/backup.test.ts` |
| E2 Continuity engine, golden test | Done (8/0/4 → 8/8/4 → 8/8/8) | `lib/review-*.ts`, `tests/review-*.test.ts` |
| E2 real-data review | Done; 4 communities, 5 facilities, 3 arrangements × 3 scenarios | `lib/demo-review.ts`, `tests/demo-review.test.ts` |
| E3 required checks | Done | `tests/review-*.test.ts` |
| E4 group context | Done as Census shares beside each gap (no per-group counts are invented) | `lib/area-context.ts` |
| E5 flood rules | Done; no real facility is in an overlay, so a fictional positive control is tested | `lib/area-context.ts`, `tests/area-context.test.ts` |
| E6 area context score + sensitivity | Done; top 3 stable in 13 of 14 weight changes | `lib/area-context.ts`, `/validation` |
| U1–U4 screens | Done and connected to the engine | `/dashboard`, `/continuity`, `/brief`, `/validation` |
| Landing page, resident card, methodology | Rewritten on real data; old sample-data model removed | `/`, `/resident/<SAL>`, `/methodology` |

P2-U5 (resident card) and P2-U6 (landing page) were brought forward and are done.

## P2 — Strengthen (after the P1 checkpoint)

| ID | Owner | Item | Source / detail | Done when |
|---|---|---|---|---|
| P2-D6 | A | Real crossings | Vicmap Transport roads × waterways | Crossings drawn on the map and used by the flood scenario |
| P2-D7 | A | Rooftop solar and batteries | Clean Energy Regulator small-scale installations by postcode | Postcode-to-suburb mapping documented |
| P2-D8 | A | Grid capacity | Network Opportunity Maps / distributor annual planning reports | Availability confirmed first; otherwise stays labelled illustrative |
| P2-D9 | A | Heat exposure | Cooling and Greening Melbourne map / Future Climate Tool | Same availability rule |
| P2-E7 | B | Operating hours | Facility service windows per scenario | A facility closed in the scenario window allocates nothing |
| P2-E8 | B | Worksheet comparison | Same inputs through a simple spreadsheet; record where results match and where CoolGrid adds an explanation | Results table on the validation page |
| P2-E9 | B | Facility input form | Edit declared facility values in the app | Edits re-run all checks and update status labels |
| P2-E10 | B | Recommended starting arrangement | Rule-based suggestion from the gaps found | Button applies it; planner can change it |
| P2-U5 | C | Resident card | Plain language; English plus the top two Census languages; no "go to this hub" wording, instead "ask council what is open" | Languages come from D2 data |
| P2-U6 | C | Landing page | Problem, user and flow, linking into the live tool | Every claim on it is supported by the app or a cited source |

## P2 and P3 status (3 October 2026)

| Item | Status | Where |
|---|---|---|
| P2-D6 real crossings and routing | Done: routes on the full Vicmap road network (69k points), 188 local-street crossings added | `scripts/build-p2.mjs`, `lib/data/access-links.json` |
| P2-D7 rooftop solar, batteries, heat-pump water heaters | Done, postcode-level per 100 dwellings | `lib/data/energy.json` |
| P2-D8 grid capacity | Not available: no open, machine-readable distributor data found (checked and recorded in SOURCES.md) | — |
| P2-D9 heat proxy | Done: mapped urban trees per hectare, added to the area context score | `lib/data/heat.json` |
| P2-E7 opening hours | Done | `lib/demo-review.ts` |
| P2-E8 worksheet comparison | Done, with CSV download | `/validation` |
| P2-E9 facility input form | Done; edits carried to the brief | `/continuity` |
| P2-E10 recommended arrangement | Done | `/continuity` |
| P3-1 Investment Gate | Done; effects from the engine, costs illustrative | `/investment` |
| P3-2 Regional expansion | Done for Greater Shepparton | `/regional`, `scripts/build-region.mjs` |
| P3-5 equity policy | Done: fair-share allocation option | `/continuity`, `/brief` |
| P3-3, P3-4, P3-6, P3-7 | Roadmap: building them would need data we do not have (climate exports, generator/water/thermal records, fleet duty logs, gas network data) | — |

## P3 — Roadmap (do not build today)

| ID | Item |
|---|---|
| P3-1 | Investment Gate: compare professionally assessed upgrade packages under a budget, including energy savings against a stated baseline and the COP31 25% building-energy target |
| P3-2 | Regional expansion: other councils (e.g. Greater Shepparton) and cross-boundary shared dependencies |
| P3-3 | Climate projections from Victoria's Future Climate Tool |
| P3-4 | Shared generators, water supply and indoor thermal conditions in the engine |
| P3-5 | Equity policy options: planners choose how scarce places are shared between communities |
| P3-6 | Heatwave mode for council EV fleet charging at facilities that also provide cooling (from FleetCharge, E1 in [02](02-research-and-debate.md)) |
| P3-7 | Street-by-street gas-network retirement and recovery of removed gas appliances |

## Schedule (hours from start)

| Hours | Member A — Data | Member B — Engine | Member C — App |
|---|---|---|---|
| 0–0.5 | **Step 0 together** | | |
| 0.5–3.5 | D0, D1, D2 | E1, E2 on fictional data | U1 map, U4 validation outline |
| 3.5–6.5 | D3, D4, D5 | E2 golden tests, E3, E4, E5, E6 on real data | U2 Continuity Lab, U3 review brief |
| 6.5–7.5 | **P1 checkpoint: merge, test, build, deploy** | | |
| 7.5–10 | P2 data (D6 → D7) | P2-E7 → E8 → E9 → E10 | P2-U5 → U6 |
| 10+ | **Freeze: bug fixes only, final deploy** | | |

## Working rules

- Branches: `data`, `engine`, `app`. Merge through pull requests at each checkpoint; never push directly to `main`.
- Do not run `npm run build` while someone's `npm run dev` uses the same folder.
- Record every dataset (name, link, licence, download date) in `lib/data/SOURCES.md` as it is added; it feeds the validation page and the required disclosure.
- Record material AI use as it happens.
