import { describe, expect, it } from "vitest";
import { POST } from "../app/api/continuity/review/route";
import { REVIEW_VERSION, type ReviewPacket } from "../lib/review-contract";
import { reviewPacket } from "../lib/continuity";
import type { Sourced } from "../lib/sourced";

const fact = <T>(value: T): Sourced<T> => ({ value, status: "declared", source: "Synthetic API fixture", date: "2026-10-03" });
function packet(): ReviewPacket {
  return {
    version: REVIEW_VERSION, title: "API fixture",
    communities: [{ id: "c1", name: "Community" }], facilities: [{ id: "f1", name: "Facility" }], dependencies: [],
    arrangements: [{ id: "a1", label: "Entered arrangement" }],
    scenarios: [{ id: "s1", label: "Heat", kind: "heat", service: "coolingRespite", window: "10:00–14:00", units: "places",
      demand: [{ communityId: "c1", amount: fact(5) }], crewCeiling: fact(1),
      arrangementFacts: [{ arrangementId: "a1", facilities: [{ facilityId: "f1", nominated: fact(true), capacity: fact(3), crewsRequired: fact(1), authorised: fact(true), suitable: fact(true), backup: fact(false) }] }],
      access: [{ id: "p1", communityId: "c1", facilityId: "f1", available: fact(true), dependsOn: fact([]) }], dependencyStates: [],
    }],
  };
}
function request(body: string): Request {
  return new Request("http://localhost/api/continuity/review", { method: "POST", headers: { "content-type": "application/json" }, body });
}

describe("stateless continuity-review API", () => {
  it("returns a calculation and Markdown brief from a self-contained packet", async () => {
    const input = packet(); const response = await POST(request(JSON.stringify(input))); const body = await response.json();
    expect(response.status).toBe(200); expect(body.result.rows[0].total).toBe(3);
    expect(body.result.rows[0].gapVectors).toEqual([[{ communityId: "c1", demand: 5, allocated: 3, gap: 2 }]]);
    expect(body.result.factsUsed).toEqual(input); expect(body.briefMarkdown).toContain("API fixture");
    expect(body.briefMarkdown).toContain("Entered arrangement");
  });
  it("returns structured blocked results for valid unresolved facts", async () => {
    const input = packet(); input.scenarios[0].demand[0].amount = { value: null, status: "unknown", source: "Demand unresolved", date: "not supplied" };
    input.scenarios[0].crewCeiling = { value: null, status: "unknown", source: "Crew unresolved", date: "not supplied" };
    const response = await POST(request(JSON.stringify(input))); const body = await response.json();
    expect(response.status).toBe(200); expect(body.result.rows[0]).toMatchObject({ status: "blocked", total: null, gapVectors: null });
    expect(body.result.rows[0].questions.length).toBeGreaterThan(0); expect(body.briefMarkdown).toContain("API fixture");
  });
  it("distinguishes malformed JSON from field-specific contract failures", async () => {
    const syntax = await POST(request('{"version":')); expect(syntax.status).toBe(400);
    expect(await syntax.json()).toEqual({ errors: [{ path: "$", message: "Invalid JSON syntax" }] });
    const input = packet(); input.scenarios[0].crewCeiling.value = -1;
    const contract = await POST(request(JSON.stringify(input))); expect(contract.status).toBe(422);
    const body = await contract.json(); expect(body.errors).toContainEqual({ path: "$.scenarios[0].crewCeiling.value", message: "Must be an integer from 0 to 1000000" });
  });
  it("also validates runtime calls to the public review wrapper", () => {
    const input = packet(); input.scenarios[0].arrangementFacts[0].facilities[0].capacity.value = NaN;
    expect(() => reviewPacket(input)).toThrow("capacity.value");
  });
});
