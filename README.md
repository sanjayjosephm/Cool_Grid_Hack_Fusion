# CoolGrid

Decision tool for Melbourne councils: where to electrify homes first, and what to pair it with so each retrofit also makes the neighbourhood safer in a heatwave. COP31 priority: Resilient Cities & Buildings (with Electrification).

**Prototype status:** all neighbourhood data is illustrative. See `/methodology`.

## Run
```bash
npm install
npm run dev   # http://localhost:3000
```

## Structure
- `lib/data.ts` sample neighbourhoods (replace with real layers)
- `lib/model.ts` transparent scoring and scenario rules
- `components/Dashboard.tsx` MapLibre map, area profile, scenario toggles
- `app/methodology` assumptions and validation plan

## Deploy
Push to GitHub, import in Vercel. No database or API keys needed for this version.

## Next steps
Load real GeoJSON and indicators (Postgres/PostGIS via Neon), add council feedback form, run planner review and weight sensitivity tests.
