import { describe, expect, it } from "vitest";
import { parsePlannerConfig, plannerConfigUrl } from "../lib/planner-config";
import { planningDataChecks } from "../lib/planning-validation";

describe("P1 planner URL configuration", () => {
  it("parses valid arrangement and crew query values", () => {
    expect(parsePlannerConfig({ arrangement: "backup-added", crews: "2" })).toEqual({
      arrangement: "backup-added",
      crews: 2,
      errors: [],
    });
  });

  it("does not guess missing values", () => {
    expect(parsePlannerConfig({})).toEqual({ arrangement: null, crews: null, errors: [] });
  });

  it("surfaces invalid values rather than silently choosing defaults", () => {
    const config = parsePlannerConfig({ arrangement: "unknown", crews: "-2" });
    expect(config.arrangement).toBeNull();
    expect(config.crews).toBeNull();
    expect(config.errors).toHaveLength(2);
  });

  it("serializes only selected, validated inputs", () => {
    expect(plannerConfigUrl("/brief", { arrangement: "local-facilities", crews: 3, errors: [] }))
      .toBe("/brief?arrangement=local-facilities&crews=3");
    expect(plannerConfigUrl("/brief", { arrangement: null, crews: null, errors: [] })).toBe("/brief");
  });
});

describe("P1 data validation screen checks", () => {
  it("computes passing checks from the current planning data", () => {
    const checks = planningDataChecks();
    expect(checks.length).toBeGreaterThan(0);
    expect(checks.every((check) => check.passed), checks.filter((check) => !check.passed).map((check) => check.name).join(", ")).toBe(true);
  });
});
