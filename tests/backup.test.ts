import { describe, expect, it } from "vitest";
import { backupFact, checkBackup, type BackupSpec } from "../lib/backup";
import { CASES, spec } from "../lib/backup-cases";
import fac from "../lib/data/facilities.json";

describe("P1-E1 backup check against hand calculations", () => {
  for (const c of CASES)
    it(`${c.name}: ${c.why}`, () => {
      const r = checkBackup(spec(c.s));
      expect(r.status).toBe(c.expected);
      if (c.runtime !== undefined) expect(r.runtimeHours).toBeCloseTo(c.runtime, 2);
    });

  it("turns results into engine prerequisites without upgrading provenance", () => {
    expect(backupFact(spec({})).value).toBe(true);
    expect(backupFact(spec({})).status).toBe("illustrative");
    expect(backupFact(spec({ batteryKWh: 40, inverterKW: 10, coolingKW: 4, surgeKW: 8, baseKW: 1.5 })).value).toBe(false);
    const unresolved = backupFact(spec({ coolingOnBackup: null }));
    expect(unresolved.value).toBeNull();
    expect(unresolved.status).toBe("unknown");
  });
});

describe("P1-E1 backup check on the facility data", () => {
  const result = (id: string) => checkBackup(fac.facilities.find((f) => f.id === id)!.backup as BackupSpec).status;
  it("gives the expected results for the declared facilities", () => {
    expect(result("fac-sunshine-library")).toBe("fail-energy"); // 40 kWh, 5.5 kW → 5.2 h
    expect(result("fac-st-albans-library")).toBe("pass"); // 60 kWh, 7 kW → 6.2 h
    expect(result("fac-maidstone-cc")).toBe("assessment"); // nothing known
    expect(result("fac-west-sunshine-cc")).toBe("fail-circuit"); // cooling not on backup
    expect(result("fac-deer-park-library")).toBe("assessment"); // battery and wiring unknown
    expect(result("fac-footscray-library")).toBe("assessment"); // wiring unknown
    expect(result("fac-braybrook-cc")).toBe("fail-power"); // start-up 9 kW > 5 kW
  });
});
