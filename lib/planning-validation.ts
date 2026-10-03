import { STUDY_AREAS } from "./ids";
import { ACCESS_LINKS, AREAS, CROSSINGS, FACILITIES, FLOOD_AREAS } from "./planning-data";
import accessData from "./data/access-links.json";
import facilityData from "./data/facilities.json";
import suburbs from "./suburbs.geo.json";
import { sourcedRows } from "./planning-data";

export type DataCheck = { name: string; passed: boolean; detail: string };

export function planningDataChecks(): DataCheck[] {
  const expectedSals = new Set(STUDY_AREAS.map((area) => area.sal));
  const areaSals = new Set(AREAS.map((area) => area.sal));
  const crossingIds = new Set(CROSSINGS.map((crossing) => crossing.id));
  const facilityIds = new Set(FACILITIES.map((facility) => facility.id));
  const linksByPair = new Set(ACCESS_LINKS.map((link) => `${link.from}>${link.to}`));
  const expectedLinkCount = STUDY_AREAS.length * FACILITIES.length;

  const sourceComplete = AREAS.every((area) =>
    sourcedRows(area, ["sal", "name", "lga", "check"]).every((row) =>
      row.status === "public" && row.source.startsWith("ABS ") && row.date.length > 0 && row.licence === "CC BY 4.0",
    ),
  );
  const populationMatches = AREAS.every((area) => area.population.value === area.seifaPopulation.value);
  const areaPercentagesValid = AREAS.every((area) =>
    [area.pct65Plus, area.pctNeedAssistance, area.pctLowEnglish, area.pctNoCar, area.pctLivingAlone]
      .every((field) => field.value >= 0 && field.value <= 100),
  );
  const floodCoverageValid = FLOOD_AREAS.length === STUDY_AREAS.length &&
    FLOOD_AREAS.every((area) => expectedSals.has(area.sal) &&
      [area.pctRiverine, area.pctStormwater].every((field) => field.value >= 0 && field.value <= 100));
  const floodSampleMatches = FLOOD_AREAS.every((area) =>
    Math.abs(area.pctRiverine.value - area.check.pctRiverineSampled) <= 2 &&
    Math.abs(area.pctStormwater.value - area.check.pctStormwaterSampled) <= 2,
  );
  const facilitiesValid = facilityIds.size === FACILITIES.length &&
    FACILITIES.every((facility) => expectedSals.has(facility.sal) &&
      facility.location.status === "public" &&
      [facility.crews, facility.services.coolingRespite.places, facility.services.coolingRespite.hours,
        facility.services.floodRelief.places, ...Object.values(facility.backup)]
        .every((field) => (field.status === "unknown" && field.value === null) || field.status === "illustrative"));
  const boundariesValid = suburbs.features.length === STUDY_AREAS.length &&
    suburbs.features.every((feature) => expectedSals.has(feature.properties.sal_code_2021));
  const crossingsValid = new Set(CROSSINGS.map((crossing) => crossing.id)).size === CROSSINGS.length &&
    CROSSINGS.every((crossing) => crossing.location.status === "public" && crossing.location.value !== null);
  const linksValid = ACCESS_LINKS.length === expectedLinkCount &&
    linksByPair.size === expectedLinkCount &&
    ACCESS_LINKS.every((link) => facilityIds.has(link.to) && expectedSals.has(link.from) &&
      link.dependsOn.value.every((id) => crossingIds.has(id)));

  return [
    { name: "Study-area coverage and SAL IDs", passed: expectedSals.size === areaSals.size && [...expectedSals].every((sal) => areaSals.has(sal)), detail: `${areaSals.size}/${expectedSals.size} expected areas are present.` },
    { name: "ABS area provenance labels", passed: sourceComplete, detail: sourceComplete ? "Area values carry public ABS source, date and CC BY 4.0 metadata." : "One or more area values are missing expected ABS provenance." },
    { name: "Census population cross-check", passed: populationMatches, detail: `${AREAS.filter((area) => area.population.value === area.seifaPopulation.value).length}/${AREAS.length} populations match the SEIFA reference.` },
    { name: "Area percentage bounds", passed: areaPercentagesValid, detail: areaPercentagesValid ? "All selected Census percentages are within 0–100." : "At least one percentage is outside 0–100." },
    { name: "Flood data coverage and bounds", passed: floodCoverageValid, detail: `${FLOOD_AREAS.length}/${STUDY_AREAS.length} areas have flood percentages in range.` },
    { name: "Flood sampling cross-check", passed: floodSampleMatches, detail: floodSampleMatches ? "Clipped overlay percentages are within 2 percentage points of the recorded independent samples." : "At least one area differs from its recorded sample by more than 2 percentage points." },
    { name: "Facility IDs, locations and planning labels", passed: facilitiesValid, detail: `${FACILITIES.length} facilities; location metadata and declared/unknown planning inputs checked.` },
    { name: "Boundary coverage", passed: boundariesValid, detail: `${suburbs.features.length}/${STUDY_AREAS.length} ABS boundary features match the study SAL IDs.` },
    { name: "Crossing identity and location metadata", passed: crossingsValid, detail: `${CROSSINGS.length} unique crossings checked for public location metadata.` },
    { name: "Community-to-facility access links", passed: linksValid, detail: `${linksByPair.size}/${expectedLinkCount} unique pairs and crossing references checked.` },
  ];
}

export const PLANNING_DATA_GENERATED = {
  accessLinks: accessData.generated,
  facilities: facilityData.generated,
};
