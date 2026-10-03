// Builds lib/data/areas.json from official ABS sources. Run: npm run data:build
// Downloads anything missing into data/raw (gitignored), then cleans and labels every value.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as XLSX from "xlsx";

const RAW = "data/raw";
const AREAS = JSON.parse(readFileSync("lib/data/study-areas.json", "utf8"));
const CODES = AREAS.map((a) => a.sal);
const TODAY = new Date().toISOString().slice(0, 10);
const LICENCE = "CC BY 4.0";

const SEIFA_URL = "https://www.abs.gov.au/statistics/people/people-and-communities/socio-economic-indexes-areas-seifa-australia/2021/Suburbs%20and%20Localities%2C%20Indexes%2C%20SEIFA%202021.xlsx";
const CENSUS_API = "https://data.api.abs.gov.au/rest/data/ABS,C21_{T}_SAL,1.0.0/{KEY}?dimensionAtObservation=AllDimensions";
// Position of the REGION dimension in each table's key (from the ABS data structure).
const CENSUS_TABLES = { G01: 5, G13: 6, G18: 6, G34: 5, G35: 5 };
const REGION_POS = { G01: 2, G13: 3, G18: 3, G34: 2, G35: 2 };

async function download(url, file, headers = {}) {
  if (existsSync(file)) return;
  console.log("downloading", file);
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

// Minimal CSV parser that handles quoted fields containing commas.
function parseCsv(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/).filter(Boolean)) {
    const out = []; let cur = ""; let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (c === "," && !q) { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur); rows.push(out);
  }
  const [head, ...body] = rows;
  // "code: label" cells -> keep the code as the field, the label separately.
  return body.map((r) => Object.fromEntries(head.flatMap((h, i) => {
    const key = h.split(":")[0];
    const cell = r[i] ?? "";
    const j = cell.indexOf(": ");
    return j > 0 && key !== "OBS_VALUE" ? [[key, cell.slice(0, j)], [key + "_label", cell.slice(j + 2)]] : [[key, cell]];
  })));
}

async function census(table) {
  const file = `${RAW}/${table.toLowerCase()}.csv`;
  const key = Array.from({ length: CENSUS_TABLES[table] }, (_, i) => (i === REGION_POS[table] ? CODES.join("+") : "")).join(".");
  await download(CENSUS_API.replace("{T}", table).replace("{KEY}", key), file, { Accept: "application/vnd.sdmx.data+csv;labels=both" });
  return parseCsv(readFileSync(file, "utf8"));
}

const pick = (rows, sal, where) => {
  const hits = rows.filter((r) => r.REGION === sal && Object.entries(where).every(([k, v]) => r[k] === v));
  if (hits.length !== 1) throw new Error(`expected 1 row for ${sal} ${JSON.stringify(where)}, got ${hits.length}`);
  return Number(hits[0].OBS_VALUE);
};
const pct = (num, den) => (den > 0 ? Math.round((num / den) * 1000) / 10 : null);
const S = (value, source, extra = {}) => ({ value, status: value === null ? "unknown" : "public", source, date: "2021 (downloaded " + TODAY + ")", licence: LICENCE, ...extra });

mkdirSync(RAW, { recursive: true });
await download(SEIFA_URL, `${RAW}/seifa_sal.xlsx`);
const seifaRows = XLSX.utils.sheet_to_json(XLSX.read(readFileSync(`${RAW}/seifa_sal.xlsx`)).Sheets["Table 1"], { header: 1 });
const [g01, g13, g18, g34, g35] = await Promise.all(["G01", "G13", "G18", "G34", "G35"].map(census));

const areas = AREAS.map(({ sal, name, lga }) => {
  const s = seifaRows.find((r) => String(r[0]) === sal);
  if (!s) throw new Error(`SEIFA row missing for ${sal}`);

  const persons = pick(g01, sal, { SEXP: "3", PCHAR: "P_1" });
  const over65 = ["65_74", "75_84", "GE85"].reduce((t, c) => t + pick(g01, sal, { SEXP: "3", PCHAR: c }), 0);
  const assistNeed = pick(g18, sal, { SEXP: "3", AGEP: "_T", ASSNP: "1" });
  const assistAll = pick(g18, sal, { SEXP: "3", AGEP: "_T", ASSNP: "_T" });
  const lowEnglish = pick(g13, sal, { SEXP: "3", LANP: "_T", ENGLP: "3" });
  const langAll = pick(g13, sal, { SEXP: "3", LANP: "_T", ENGLP: "_T" });
  const noCar = pick(g34, sal, { VEHD: "0" });
  const dwellings = pick(g34, sal, { VEHD: "_T" });
  const alone = pick(g35, sal, { NPRD: "1", HHCD: "_T" });
  const households = pick(g35, sal, { NPRD: "_T", HHCD: "_T" });

  // Individual languages (4-digit ABS codes) other than English, ranked by speakers.
  const languages = g13
    .filter((r) => r.REGION === sal && r.SEXP === "3" && r.ENGLP === "_T" && /^\d{4}$/.test(r.LANP) && !/nfd|Total/i.test(r.LANP_label))
    .map((r) => ({ code: r.LANP, name: r.LANP_label.split(": ").pop(), persons: Number(r.OBS_VALUE) }))
    .sort((a, b) => b.persons - a.persons).slice(0, 3);

  const src = (t) => `ABS Census 2021, ${t}, Suburbs and Localities`;
  return {
    sal, name, lga,
    irsdScore: S(Math.round(s[2] * 10) / 10, "ABS SEIFA 2021, Index of Relative Socio-economic Disadvantage (IRSD), SAL"),
    irsdDecile: S(s[3], "ABS SEIFA 2021, IRSD national decile (1 = most disadvantaged), SAL"),
    seifaPopulation: S(s[10], "ABS SEIFA 2021, usual resident population, SAL"),
    population: S(persons, src("G01 total persons")),
    pct65Plus: S(pct(over65, persons), src("G01 age 65+ / total persons")),
    pctNeedAssistance: S(pct(assistNeed, assistAll), src("G18 core activity need for assistance")),
    pctLowEnglish: S(pct(lowEnglish, langAll), src("G13 speaks English not well or not at all")),
    pctNoCar: S(pct(noCar, dwellings), src("G34 occupied private dwellings with no motor vehicle")),
    pctLivingAlone: S(pct(alone, households), src("G35 one-person households / all households")),
    topLanguages: S(languages, src("G13 language used at home (excluding English)")),
  };
});

writeFileSync("lib/data/areas.json", JSON.stringify({ generated: TODAY, areas }, null, 2) + "\n");
console.log(`wrote lib/data/areas.json for ${areas.length} areas`);
for (const a of areas) console.log(a.name.padEnd(15), "pop", a.population.value, "IRSD", a.irsdScore.value, "65+", a.pct65Plus.value + "%", "assist", a.pctNeedAssistance.value + "%", "noCar", a.pctNoCar.value + "%", "alone", a.pctLivingAlone.value + "%", "lowEng", a.pctLowEnglish.value + "%", "langs", a.topLanguages.value.map((l) => l.name).join("/"));
