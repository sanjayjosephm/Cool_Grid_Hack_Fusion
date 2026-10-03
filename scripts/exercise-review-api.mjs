// Run against a local Next production server. Uses checked-in synthetic evidence only.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const endpoint = process.argv[2] ?? "http://127.0.0.1:3215/api/continuity/review";
const packet = JSON.parse(await readFile(new URL("../examples/review-packet.json", import.meta.url), "utf8"));
async function post(body, expectedStatus) {
  const response = await fetch(endpoint, {
    method: "POST", headers: { "Content-Type": "application/json" }, body,
  });
  assert.equal(response.status, expectedStatus);
  return response.json();
}

const calculated = await post(JSON.stringify(packet), 200);
const totals = arrangementId => ["heat", "outage", "flood"].map(scenarioId =>
  calculated.result.rows.find(row => row.scenarioId === scenarioId && row.arrangementId === arrangementId).total);
assert.deepEqual(totals("existing"), [8, 0, 4]);
assert.deepEqual(totals("backup"), [8, 8, 4]);
assert.deepEqual(totals("local"), [8, 8, 8]);
assert.ok(calculated.briefMarkdown.includes("Exact facts used"));
console.log("Calculable packet: HTTP 200; existing 8/0/4, backup 8/8/4, local 8/8/8.");

const unresolved = structuredClone(packet);
const unknown = () => ({ value: null, status: "unknown", source: "Synthetic API exercise: evidence not supplied", date: "not supplied" });
for (const scenario of unresolved.scenarios) {
  scenario.crewCeiling = unknown();
  scenario.demand.forEach(demand => { demand.amount = unknown(); });
  for (const arrangement of scenario.arrangementFacts) for (const facility of arrangement.facilities) {
    for (const key of ["nominated", "capacity", "crewsRequired", "authorised", "suitable", "backup"]) facility[key] = unknown();
  }
  scenario.access.forEach(path => { path.available = unknown(); path.dependsOn = unknown(); });
  scenario.dependencyStates.forEach(state => { state.open = unknown(); });
}
const blocked = await post(JSON.stringify(unresolved), 200);
assert.equal(blocked.result.rows.length, 9);
assert.ok(blocked.result.rows.every(row => row.status === "blocked" && row.total === null && row.gapVectors === null && row.questions.length > 0));
assert.ok(blocked.result.rows.every(row => row.probes.every(probe => probe.conditionalDelta === null)));
assert.ok(blocked.briefMarkdown.includes("not calculable"));
console.log("Unknown-heavy packet: HTTP 200; nine blocked rows, null totals/gaps, evidence questions.");

const syntax = await post("{", 400);
assert.equal(syntax.errors[0].path, "$");
console.log("Invalid JSON: HTTP 400 with syntax error.");

const invalid = structuredClone(packet);
invalid.version = "unsupported";
invalid.scenarios[0].demand[0].amount.value = -1;
const contract = await post(JSON.stringify(invalid), 422);
assert.ok(contract.errors.some(error => error.path === "$.version"));
assert.ok(contract.errors.some(error => error.path === "$.scenarios[0].demand[0].amount.value"));
console.log("Invalid contract: HTTP 422 with version and demand field errors.");
