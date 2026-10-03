# Data sources

Every dataset used by CoolGrid, recorded as it is added. Rebuild derived files with `npm run data:build`; raw downloads go to `data/raw/` (not committed).

| Layer | Dataset | Publisher | Link | Licence | Data date | Downloaded | Output |
|---|---|---|---|---|---|---|---|
| P1-D0 | Suburbs and Localities (SAL) boundaries, ASGS 2021, simplified | Australian Bureau of Statistics | [ABS ASGS SAL map service](https://geo.abs.gov.au/arcgis/rest/services/ASGS2021/SAL/MapServer/0) | CC BY 4.0 | 2021 | 2026-10-03 | `lib/suburbs.geo.json` |
| P1-D1 | SEIFA 2021, Suburbs and Localities, Table 1 (IRSD score and decile; usual resident population) | Australian Bureau of Statistics | [SEIFA 2021 SAL spreadsheet](https://www.abs.gov.au/statistics/people/people-and-communities/socio-economic-indexes-areas-seifa-australia/2021/Suburbs%20and%20Localities%2C%20Indexes%2C%20SEIFA%202021.xlsx) | CC BY 4.0 | 2021 | 2026-10-03 | `lib/data/areas.json` |
| P1-D2 | Census 2021 General Community Profile, SAL: G01 (persons, age), G13 (language, English proficiency), G18 (need for assistance), G34 (motor vehicles), G35 (household size) | Australian Bureau of Statistics | [ABS Data API](https://data.api.abs.gov.au/rest/data/ABS,C21_G01_SAL,1.0.0/) | CC BY 4.0 | 2021 | 2026-10-03 | `lib/data/areas.json` |

| P1-D3 | Vicmap Planning, planning scheme overlays (`plan_overlay`): LSIO, FO (riverine) and SBO (stormwater) | Department of Transport and Planning, Victoria | [Vicmap open data WFS](https://opendata.maps.vic.gov.au/geoserver/wfs) | CC BY 4.0 | current | 2026-10-03 | `lib/data/flood.json` |
| P1-D4 | Vicmap Features of Interest (`foi_point`): libraries and community centres | Department of Transport and Planning, Victoria | [Vicmap open data WFS](https://opendata.maps.vic.gov.au/geoserver/wfs) | CC BY 4.0 | current | 2026-10-03 | `lib/data/facilities.json` (locations) |
| P1-D4 | Facility planning inputs (places, hours, crews, backup power) | CoolGrid team — **illustrative placeholders** | `lib/data/facilities-declared.json` | — | — | 2026-10-03 | merged into `lib/data/facilities.json` |
| P1-D5 | Vicmap Transport roads (`tr_road`, class 0–3) intersected with riverine flood overlays | Department of Transport and Planning, Victoria | [Vicmap open data WFS](https://opendata.maps.vic.gov.au/geoserver/wfs) | CC BY 4.0 | current | 2026-10-03 | `lib/data/crossings.json` |
| P1-D5b | Community-to-facility access links (straight line from suburb centre to facility; crossings within 0.5 km) | CoolGrid team — **illustrative approximation** (not a routed path; routing is P2) | derived from D0, D4, D5 | — | — | 2026-10-03 | `lib/data/access-links.json` |

| P2-D6 | Vicmap Transport roads (`tr_road`, class 0–5) as a routing network; local-street crossings of riverine overlays | Department of Transport and Planning, Victoria | [Vicmap open data WFS](https://opendata.maps.vic.gov.au/geoserver/wfs) | CC BY 4.0 | current | 2026-10-03 | `lib/data/access-links.json` (routed), `access-straight.json`, `access-routing.json`, `crossings.json` |
| P2-D7 | Small-scale installations by postcode: rooftop solar (2001–Aug 2026), batteries (Jul 2025–Aug 2026), air-source heat-pump water heaters (2001–Aug 2026) | Clean Energy Regulator | [Postcode data](https://cer.gov.au/markets/reports-and-data/small-scale-installation-postcode-data) | CC BY 4.0 | Aug 2026 | 2026-10-03 | `lib/data/energy.json` |
| P2-D7 | ABS postal areas (POA, ASGS 2021) and Census 2021 G34 dwellings by postal area | Australian Bureau of Statistics | [ABS ASGS POA map service](https://geo.abs.gov.au/arcgis/rest/services/ASGS2021/POA/MapServer/0), [ABS Data API](https://data.api.abs.gov.au/) | CC BY 4.0 | 2021 | 2026-10-03 | `lib/data/energy.json` |
| P2-D9 | Vicmap Vegetation urban trees (`tree_urban`), counted per suburb | Department of Transport and Planning, Victoria | [Vicmap open data WFS](https://opendata.maps.vic.gov.au/geoserver/wfs) | CC BY 4.0 | current | 2026-10-03 | `lib/data/heat.json` |
| P3-2 | Same ABS and Vicmap sources for Greater Shepparton (Shepparton, Mooroopna, Kialla, Shepparton North) | ABS; Department of Transport and Planning | as above | CC BY 4.0 | 2021 / current | 2026-10-03 | `lib/data/regions/shepparton.json` |
| P2-D8 | Grid capacity by zone substation | — | Not used. Checked 2026-10-03: Network Opportunity Maps did not respond; the Jemena annual planning report is an interactive web app with no downloadable data; the Powercor report page returned not found. Grid stress stays out of the model until a distributor shares data | — | — | — | — |
| P3-1 | Upgrade package costs | CoolGrid team — **illustrative placeholders** | `lib/planning-tools.ts` | — | — | 2026-10-03 | Investment Gate |

## Derived measures

| Field | Calculation |
|---|---|
| `pct65Plus` | G01 persons aged 65–74 + 75–84 + 85+ ÷ total persons |
| `pctNeedAssistance` | G18 persons with core activity need for assistance ÷ all persons (including not stated) |
| `pctLowEnglish` | G13 persons who speak English not well or not at all ÷ all persons |
| `pctNoCar` | G34 dwellings with no motor vehicle ÷ all occupied private dwellings (including not stated) |
| `pctLivingAlone` | G35 one-person households ÷ all households |
| `topLanguages` | G13 top three individual home languages other than English, by persons |
| `pctRiverine` | Area of the suburb inside any LSIO or FO polygon (overlaps merged) ÷ suburb area |
| `pctStormwater` | Area of the suburb inside any SBO polygon (overlaps merged) ÷ suburb area |
| `floodOverlay` (facility) | `riverine` if the facility point is inside LSIO/FO, else `stormwater` if inside SBO, else `none` |
| crossing | A named road passing through one riverine overlay polygon; ID = road name + overlay PFI. Main roads in P1-D5, local streets added in P2-D6 |
| routed link | Shortest path on the Vicmap road network from the suburb centre to the facility (each snapped to the nearest non-freeway road point); depends on every crossing its road segments belong to |
| `solarPer100`, `batteryPer100`, `heatPumpPer100` | Clean Energy Regulator installations in the suburb's main postcode ÷ ABS occupied private dwellings in that postcode × 100 (postcode-level: suburbs sharing a postcode share the value) |
| `treesPerHa` | Vicmap mapped urban trees inside the suburb ÷ suburb area (heat proxy, not a temperature) |

Facility planning inputs are not public data. They are labelled `illustrative` (team placeholder) or `unknown` (deliberately missing, so the review raises a question) and must be replaced with council records.

## Checks (`tests/geo.test.ts`)

- Flood % from polygon clipping agrees with an independent ~40 m grid sample within 2 percentage points, for every suburb
- Riverine flood land found in Maidstone and Footscray (Maribyrnong River)
- Every facility lies inside the expected ABS suburb boundary
- Planning inputs never labelled `public`; unknown values are always `null`
- Crossing IDs unique and built from road name + overlay ID
- Access links: one per community–facility pair; every crossing dependency re-checked with an independent flat-earth distance calculation (`tests/access-links.test.ts`)

## Checks (`tests/data.test.ts`)

- All study areas present, matched by ABS SAL code
- Every value labelled `public`, with source and licence
- Census population equals the population ABS published with SEIFA, for every area
- All percentages within 0–100
- SEIFA values for Braybrook, Brunswick West and St Albans match a hand reading of the ABS spreadsheet
