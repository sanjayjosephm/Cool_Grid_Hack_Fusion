import { describe, expect, it } from "vitest";
import { AREAS } from "../lib/planning-data";
import { cardLanguages, TEXT } from "../lib/resident-text";

const langsFor = (name: string) => cardLanguages((AREAS.find((a) => a.name === name)!.topLanguages.value ?? []).map((l) => l.name));

describe("resident card", () => {
  it("offers translations that match each suburb's Census top languages", () => {
    expect(langsFor("Footscray")).toEqual(["en", "vi"]); // Vietnamese is the top home language
    expect(langsFor("Broadmeadows")).toEqual(["en", "ar"]); // Arabic is the top home language
    expect(langsFor("Brunswick West")).toEqual(["en"]); // Italian, Greek, Mandarin: no draft translation yet
  });

  it("never names a facility as a place to go, in any language", () => {
    for (const t of Object.values(TEXT)) expect(t.where).not.toMatch(/library|community centre|hub/i);
  });

  it("has the same structure in every language", () => {
    for (const t of Object.values(TEXT)) {
      expect(t.hot).toHaveLength(TEXT.en.hot.length);
      expect(t.switchItems).toHaveLength(TEXT.en.switchItems.length);
    }
  });
});
