# CoolGrid

**Will a council's heatwave response still work if the power fails, a road floods, or staff are limited?**

CoolGrid is a planning prototype for local-government emergency and relief planners, built on a Melbourne study area (Brimbank, Maribyrnong, Merri-bek and Hume) and also run for Greater Shepparton. It helps teams examine how facilities, backup power, staffing, demand and flood-related access dependencies affect continuity plans, and makes the assumptions and facts that need verification visible.

The project supports the **Resilient Cities & Buildings** climate priority, and also supports **Electrification**: as homes and facilities go all-electric, it checks that backup power and flood-safe installation keep electrified services running. It is a decision-support prototype, not an operational emergency-management system.

## What you can do

- Explore study-area suburbs, public facilities, flood overlays and flood-exposed road crossings on the planning map.
- Review values alongside their source and evidence status: public, declared, illustrative or unknown.
- Compare three arrangements (existing, backup added and local facilities) across three separate scenarios: heat, heat with a power outage, and flood-related crossing closures.
- Enter a crew count and see calculated allocations, gaps, blockers and dependencies that should be verified.
- Replace facility inputs (places, crews, opening hours, battery, inverter, wiring), get a recommended starting arrangement, and switch between "most places" and "fair share" allocation.
- Compare affordable upgrade combinations per scenario in the Investment Gate.
- See the same pipeline and engine applied to Greater Shepparton, where the Mooroopna Causeway closed in the October 2022 flood.
- Open a printable review brief with unresolved questions and a suggested next planning exercise.
- View a plain-language resident card for each study-area suburb, translated into Vietnamese or Arabic where the Census shows that language is common.

## Try it locally

### Requirements

- Node.js 18.17 or later
- npm

### Install and start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Start with the overview, then open the Continuity Lab or planning map from the navigation.

### Checks and production

```bash
npm test       # run the automated test suite
npm run build  # create a production build
npm start      # serve the production build
```

To check a production build while `npm run dev` is running, build into a separate folder so the dev server is not affected: `NEXT_DIST_DIR=.next-build npx next build`.

The current automated suite contains 182 tests. The map uses MapLibre GL JS; if WebGL is unavailable, the study-area polygons and facility markers remain available through a non-WebGL fallback, but the street basemap is not shown.

### Rebuild the data

```bash
npm run data:build
```

This downloads and processes the ABS, Vicmap and Clean Energy Regulator sources used by the project, including routing on the Vicmap road network and the Greater Shepparton regional build. It requires network access to those public services. Raw source downloads are cached under `data/raw/` and are git-ignored; generated data is written under `lib/data/`. The app can be run using the checked-in generated data without rebuilding it.

## App pages

| Route | What it contains |
| --- | --- |
| `/` | Project overview and example engine findings |
| `/dashboard` | Planning map and area/facility context |
| `/continuity` | Continuity Lab for comparing arrangements and scenarios |
| `/brief` | Printable review brief based on the selected arrangement, crews, planner inputs and policy |
| `/investment` | Investment Gate: affordable upgrade combinations compared per scenario |
| `/regional` | The same pipeline and engine applied to Greater Shepparton |
| `/resident` | Index of resident cards with their available languages |
| `/validation` | Data provenance, integrity checks and engine-validation examples |
| `/methodology` | Methods, evidence labels and limitations |
| `/resident/<ABS SAL code>` | Resident card for a study-area suburb; for example, `/resident/20021` |

## Data, assumptions and safe use

Study-area boundaries, Census and SEIFA measures, flood overlays, facility locations, the road network and urban trees come from public Australian Bureau of Statistics (ABS) and Victorian Government Vicmap sources; small-scale solar, battery and heat-pump installations come from the Clean Energy Regulator. The events behind the scenarios (January 2009 heatwave blackouts, October 2022 Maribyrnong and Shepparton floods) are cited on the `/methodology` page. The project records source, date, status and licence information with its data. See the in-app `/methodology` and `/validation` pages and the [data source register](./lib/data/SOURCES.md) for details and calculations.

Important limitations:

- ABS Census and SEIFA inputs are from 2021; Vicmap layers are dated as recorded in the source register.
- Facility places, operating hours, crews and backup-power details include illustrative placeholders or unknown values. They are not verified facility commitments.
- Community demand and scenario conditions are illustrative planning assumptions, not council-approved requirements or forecasts.
- Community-to-facility links are shortest routes on the Vicmap road network from each suburb centre (straight-line versions are kept for comparison). They are not travel times, evacuation routes or proof that a destination is reachable, open or suitable.
- Upgrade costs in the Investment Gate are illustrative placeholders, not quotes. Grid capacity is not modelled because no open, machine-readable distributor data was found.
- Flood exposure and crossing closures are simplified representations for scenario exploration.
- A calculated place count does not certify a facility's readiness, safety, capacity or availability. Verify assumptions with the responsible data owners before relying on a plan.
- Resident-card translations are drafts and need review by native speakers.

Do not use CoolGrid as a source of live emergency instructions or as a substitute for council operational data, professional judgement or emergency services.

## Technology

- Next.js 14 and React 18
- TypeScript and Tailwind CSS
- MapLibre GL JS for the interactive map
- Turf.js and SheetJS for data-processing scripts
- Vitest for automated tests

## Project layout

```text
app/                 Next.js routes and shared layout
components/          Map, Continuity Lab, brief and other UI components
lib/                 Planning data, evidence labels and continuity-review engine
lib/data/            Generated datasets, study-area inputs and source register
scripts/               ABS and Vicmap data download and processing
tests/                 Automated tests for data, map logic and review engine
Coolgrid/              Project research, design documents and implementation plan
```

## Deployment

CoolGrid is a Next.js application and can be deployed to a host that supports Next.js 14. No database or application API keys are required for the current prototype. Follow the host's Next.js instructions and use `npm run build` as the build command.

## Third-party tools, data and AI disclosure

**Application and development tools:** The project uses Next.js, React, TypeScript, Tailwind CSS, MapLibre GL JS, Turf.js, SheetJS, Vitest and other packages listed in `package.json`. The map uses OpenFreeMap tiles and includes OpenStreetMap attribution. Fraunces and Inter are loaded using Next.js's Google Fonts integration. These tools and services retain their respective names, terms and licences.

**External data:** ABS, Victorian Government Vicmap and Clean Energy Regulator datasets are used under the licences recorded in the [data source register](./lib/data/SOURCES.md), including CC BY 4.0 for the listed public datasets. CoolGrid's illustrative facility inputs, demand assumptions, upgrade costs and derived access routes are team-created and are not official public data.

**AI tools:** AI assistants were used during project research, planning, implementation, data-processing work, test creation, translation and documentation. Tools used included Claude, Perplexity AI, and GitHub Copilot in VS Code (Copilot SDK). AI-generated or AI-assisted material should be treated as a draft; the project team remains responsible for checking factual claims, calculations, code and translations. Vietnamese and Arabic resident-card translations specifically require native-speaker review.
