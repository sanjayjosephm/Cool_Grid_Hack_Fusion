import areaData from "./data/areas.json";
import facilityData from "./data/facilities.json";
import crossingData from "./data/crossings.json";
import linkData from "./data/access-links.json";
import type { Sourced } from "./sourced";
import {
  REVIEW_LIMITS, REVIEW_VERSION, ReviewContractError,
  type Context, type PlanningFacts, type ProcessedCatalogue,
  type ReviewEntity, type ReviewPacket, type ReviewSelection,
} from "./review-contract";
import { validateReviewPacket } from "./review-validation";

/** Direct labelled data imports; the adapter does not fetch or read private files. */
export const processedCatalogue: ProcessedCatalogue = {
  areas: areaData.areas, facilities: facilityData.facilities,
  crossings: crossingData.crossings, links: linkData.links,
} as unknown as ProcessedCatalogue;

const UNSAFE = new Set(["__proto__", "constructor", "prototype"]);
const ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
type Plain = Record<string, unknown>;
function reject(path: string, message: string): never {
  throw new ReviewContractError([{ path, message }]);
}
function object(value: unknown, path: string, allowed?: string[]): Plain {
  if (value === null || typeof value !== "object" || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) reject(path, "Must be a plain object");
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || UNSAFE.has(key)) reject(path, "Unsafe object key");
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) reject(`${path}.${key}`, "Accessor fields are not permitted");
    if (!descriptor.enumerable) reject(`${path}.${key}`, "Non-enumerable fields are not permitted");
    if (allowed && !allowed.includes(key)) reject(`${path}.${key}`, "Unknown field");
  }
  return value as Plain;
}
function list(value: unknown, path: string, max: number, min = 0): unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) reject(path, `Must contain ${min}–${max} entries`);
  for (const key of Reflect.ownKeys(value)) {
    if (key !== "length" && (typeof key !== "string" || !/^(0|[1-9][0-9]*)$/.test(key))) reject(path, "Arrays may contain indexed entries only");
  }
  return Array.from({ length: value.length }, (_, i) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) reject(`${path}[${i}]`, "Sparse arrays, accessor entries and non-enumerable entries are not permitted");
    return descriptor.value;
  });
}
function stableId(value: unknown, path: string): string {
  if (typeof value !== "string" || !ID.test(value) || UNSAFE.has(value)) reject(path, "Must be a stable ID of 1–128 characters");
  return value;
}
function required(record: Plain, fields: string[], path: string): void {
  for (const field of fields) if (record[field] === undefined) reject(`${path}.${field}`, "Required; supply explicit unknown evidence if unresolved");
}
function unknown<T>(description: string): Sourced<T> {
  return { value: null, status: "unknown", source: `Review adapter: ${description}`, date: "not supplied" };
}
const owns = (value: Plain, key: string) => Object.prototype.hasOwnProperty.call(value, key);
function optionalList(value: Plain, key: string, path: string, max: number): unknown[] {
  return owns(value, key) ? list(value[key], `${path}.${key}`, max) : [];
}
function evidence(value: Plain, key: string, path: string, description: string): unknown {
  return owns(value, key) ? { ...object(value[key], `${path}.${key}`, ["value", "status", "source", "date", "licence"]) } : unknown(description);
}
function labelledContext(value: unknown, path: string): Context {
  const context: Context = Object.create(null) as Context;
  const active = new Set<object>();
  function walk(item: unknown, key: string, depth: number): void {
    if (item === null || typeof item !== "object" || Array.isArray(item)) return;
    if (depth > 12 || active.has(item)) reject(path, "Catalogue context must be acyclic and bounded");
    const entry = object(item, `${path}.${key}`);
    if ("status" in entry || ("value" in entry && "source" in entry)) {
      context[key] = { ...entry } as Sourced<unknown>;
      return;
    }
    active.add(item);
    for (const [field, child] of Object.entries(entry)) walk(child, key ? `${key}.${field}` : field, depth + 1);
    active.delete(item);
  }
  walk(value, "", 0);
  return context;
}

/**
 * Joins stable IDs, keeps Census/geography as context, and labels omitted
 * operational evidence unknown. Applying nominal places needs a separate sourced
 * planning assumption for the scenario's service and window.
 */
export function buildReviewPacket(
  catalogue: ProcessedCatalogue,
  selection: ReviewSelection,
  planningFacts: PlanningFacts,
): ReviewPacket {
  const selected = object(selection, "$.selection", ["communityIds", "facilityIds"]);
  const communityIds = list(selected.communityIds, "$.selection.communityIds", REVIEW_LIMITS.communities, 1)
    .map((id, i) => stableId(id, `$.selection.communityIds[${i}]`));
  const facilityIds = list(selected.facilityIds, "$.selection.facilityIds", REVIEW_LIMITS.facilities, 1)
    .map((id, i) => stableId(id, `$.selection.facilityIds[${i}]`));
  if (new Set(communityIds).size !== communityIds.length) reject("$.selection.communityIds", "Duplicate community selection");
  if (new Set(facilityIds).size !== facilityIds.length) reject("$.selection.facilityIds", "Duplicate facility selection");
  const data = object(catalogue, "$.catalogue", ["areas", "facilities", "crossings", "links"]);
  // The complete catalogue may exceed review limits; only the explicit selection is bounded.
  function index(value: unknown, key: string, path: string): Map<string, Plain> {
    const indexed = new Map<string, Plain>();
    for (const [i, item] of list(value, path, 10_000).entries()) {
      const entry = object(item, `${path}[${i}]`);
      const id = stableId(entry[key], `${path}[${i}].${key}`);
      if (indexed.has(id)) reject(`${path}[${i}].${key}`, "Duplicate catalogue ID");
      indexed.set(id, entry);
    }
    return indexed;
  }
  const areas = index(data.areas, "sal", "$.catalogue.areas");
  const sites = index(data.facilities, "id", "$.catalogue.facilities");
  const crossings = index(data.crossings, "id", "$.catalogue.crossings");
  const links = new Map<string, Plain>();
  for (const [i, item] of list(data.links, "$.catalogue.links", 10_000).entries()) {
    const entry = object(item, `$.catalogue.links[${i}]`, ["from", "to", "distanceKm", "dependsOn"]);
    const from = stableId(entry.from, `$.catalogue.links[${i}].from`);
    const to = stableId(entry.to, `$.catalogue.links[${i}].to`);
    const key = `${from}\u0000${to}`;
    if (links.has(key)) reject(`$.catalogue.links[${i}]`, "Duplicate catalogue access pair");
    links.set(key, entry);
  }
  const communities: ReviewEntity[] = communityIds.map(id => {
    const area = areas.get(id);
    if (!area) reject("$.selection.communityIds", `Unknown SAL ID ${id}`);
    return { id, name: area.name as string, context: labelledContext(area, `$.catalogue.areas.${id}`) };
  });
  const facilities: ReviewEntity[] = facilityIds.map(id => {
    const site = sites.get(id);
    if (!site) reject("$.selection.facilityIds", `Unknown facility ID ${id}`);
    // This join checks the facility's own SAL; it need not be an entered community.
    if (!areas.has(site.sal as string)) reject(`$.catalogue.facilities.${id}.sal`, "Facility SAL is not in the area catalogue");
    return { id, name: site.name as string, context: labelledContext(site, `$.catalogue.facilities.${id}`) };
  });
  const facilitySet = new Set(facilityIds);
  const communitySet = new Set(communityIds);
  const entityByFacility = new Map(facilities.map(entity => [entity.id, entity]));
  const facts = object(planningFacts, "$.planningFacts", ["title", "arrangements", "scenarios"]);
  required(facts, ["title", "arrangements", "scenarios"], "$.planningFacts");
  const arrangementIds = new Set<string>();
  const arrangements = list(facts.arrangements, "$.planningFacts.arrangements", REVIEW_LIMITS.arrangements, 1).map((item, i) => {
    const path = `$.planningFacts.arrangements[${i}]`;
    const arrangement = object(item, path, ["id", "label"]);
    required(arrangement, ["id", "label"], path);
    const id = stableId(arrangement.id, `${path}.id`);
    if (arrangementIds.has(id)) reject(`${path}.id`, "Duplicate arrangement ID");
    arrangementIds.add(id);
    return arrangement;
  });
  const dependencies = new Set<string>();
  const scenarioIds = new Set<string>();
  const scenarios = list(facts.scenarios, "$.planningFacts.scenarios", REVIEW_LIMITS.scenarios, 1).map((item, i) => {
    const path = `$.planningFacts.scenarios[${i}]`;
    const scenario = object(item, path, ["id", "label", "kind", "service", "window", "units", "demand", "crewCeiling", "arrangementFacts", "access", "dependencyStates"]);
    required(scenario, ["id", "label", "kind", "service", "window", "units"], path);
    const scenarioId = stableId(scenario.id, `${path}.id`);
    if (scenarioIds.has(scenarioId)) reject(`${path}.id`, "Duplicate scenario ID");
    scenarioIds.add(scenarioId);
    const demandEntries = new Map<string, Plain>();
    optionalList(scenario, "demand", path, REVIEW_LIMITS.communities).forEach((item, j) => {
      const demandPath = `${path}.demand[${j}]`;
      const entry = object(item, demandPath, ["communityId", "amount"]);
      const communityId = stableId(entry.communityId, `${demandPath}.communityId`);
      if (!communitySet.has(communityId)) reject(`${demandPath}.communityId`, "Community is outside the selection");
      if (demandEntries.has(communityId)) reject(`${demandPath}.communityId`, "Duplicate community demand");
      demandEntries.set(communityId, entry);
    });
    const demand = communityIds.map(communityId => ({ communityId,
      amount: evidence(demandEntries.get(communityId) ?? {}, "amount", `${path}.demand.${communityId}`, `demand for ${communityId} not supplied`),
    }));
    const providedGroups = new Map<string, { group: Plain; path: string }>();
    optionalList(scenario, "arrangementFacts", path, REVIEW_LIMITS.arrangements).forEach((group, j) => {
      const groupPath = `${path}.arrangementFacts[${j}]`;
      const arrangement = object(group, groupPath, ["arrangementId", "facilities"]);
      const arrangementId = stableId(arrangement.arrangementId, `${groupPath}.arrangementId`);
      if (!arrangementIds.has(arrangementId)) reject(`${groupPath}.arrangementId`, "Arrangement is outside the declared arrangements");
      if (providedGroups.has(arrangementId)) reject(`${groupPath}.arrangementId`, "Duplicate arrangement facts");
      providedGroups.set(arrangementId, { group: arrangement, path: groupPath });
    });
    const arrangementFacts = arrangements.map(arrangement => {
      const arrangementId = arrangement.id as string;
      const supplied = providedGroups.get(arrangementId);
      const groupPath = supplied?.path ?? `${path}.arrangementFacts.${arrangementId}`;
      const providedFacilities = new Map<string, { fact: Plain; path: string }>();
      optionalList(supplied?.group ?? {}, "facilities", groupPath, REVIEW_LIMITS.facilities).forEach((item, k) => {
        const factPath = `${groupPath}.facilities[${k}]`;
        const fact = object(item, factPath, ["facilityId", "nominated", "capacity", "crewsRequired", "authorised", "suitable", "backup", "applyNominalCapacity"]);
        const facilityId = stableId(fact.facilityId, `${factPath}.facilityId`);
        if (!facilitySet.has(facilityId)) reject(`${factPath}.facilityId`, "Facility is outside the selection");
        if (providedFacilities.has(facilityId)) reject(`${factPath}.facilityId`, "Duplicate facility facts");
        providedFacilities.set(facilityId, { fact, path: factPath });
      });
      const facilityFacts = facilityIds.map(facilityId => {
        const supplied = providedFacilities.get(facilityId);
        const fact = supplied?.fact ?? {};
        const factPath = supplied?.path ?? `${groupPath}.facilities.${facilityId}`;
        const assumption = fact.applyNominalCapacity;
        let applyNominal = false;
        if (owns(fact, "applyNominalCapacity")) {
          const sourced = object(assumption, `${factPath}.applyNominalCapacity`, ["value", "status", "source", "date", "licence"]);
          if (sourced.status === "public") reject(`${factPath}.applyNominalCapacity.status`, "Capacity application must be a declared or illustrative planning assumption, or unknown");
          if (sourced.value !== null && typeof sourced.value !== "boolean") reject(`${factPath}.applyNominalCapacity.value`, "Must be a sourced boolean");
          applyNominal = sourced.value === true && ["declared", "illustrative"].includes(sourced.status as string);
          entityByFacility.get(facilityId)!.context![`scenario:${encodeURIComponent(scenarioId)}:arrangement:${encodeURIComponent(arrangementId)}:applyNominalCapacity`] = { ...sourced } as Sourced<unknown>;
        }
        let capacity = owns(fact, "capacity") ? evidence(fact, "capacity", factPath, "capacity not supplied") : undefined;
        if (!owns(fact, "capacity") && applyNominal) {
          const site = sites.get(facilityId)!;
          const services = owns(site, "services") ? object(site.services, `$.catalogue.facilities.${facilityId}.services`) : {};
          const service = owns(services, scenario.service as string) ? object(services[scenario.service as string], `$.catalogue.facilities.${facilityId}.services.${String(scenario.service)}`) : {};
          capacity = evidence(service, "places", `$.catalogue.facilities.${facilityId}.services.${String(scenario.service)}`, `no nominal capacity for ${String(scenario.service)}`);
        }
        if (capacity === undefined) capacity = unknown<number>("capacity not supplied or nominal application not agreed");
        return {
          facilityId, capacity,
          nominated: evidence(fact, "nominated", factPath, `nomination for ${facilityId} not supplied`),
          crewsRequired: evidence(fact, "crewsRequired", factPath, `crew requirement for ${facilityId} not supplied`),
          authorised: evidence(fact, "authorised", factPath, `authorisation for ${facilityId} not supplied`),
          suitable: evidence(fact, "suitable", factPath, `service suitability for ${facilityId} not supplied`),
          backup: evidence(fact, "backup", factPath, `backup prerequisite for ${facilityId} not supplied`),
        };
      });
      return { arrangementId, facilities: facilityFacts };
    });
    const accessPairs = new Map<string, { input: Plain; path: string }>();
    optionalList(scenario, "access", path, REVIEW_LIMITS.accessPaths).forEach((item, j) => {
      const accessPath = `${path}.access[${j}]`;
      const input = object(item, accessPath, ["communityId", "facilityId", "available"]);
      required(input, ["communityId", "facilityId"], accessPath);
      const communityId = stableId(input.communityId, `${accessPath}.communityId`);
      const facilityId = stableId(input.facilityId, `${accessPath}.facilityId`);
      if (!communitySet.has(communityId)) reject(`${accessPath}.communityId`, "Community is outside the selection");
      if (!facilitySet.has(facilityId)) reject(`${accessPath}.facilityId`, "Facility is outside the selection");
      const pair = `${communityId}\u0000${facilityId}`;
      if (accessPairs.has(pair)) reject(accessPath, "Duplicate access pair");
      accessPairs.set(pair, { input, path: accessPath });
    });
    const access = communityIds.flatMap(communityId => facilityIds.map(facilityId => {
      const pair = `${communityId}\u0000${facilityId}`;
      const supplied = accessPairs.get(pair);
      const accessPath = supplied?.path ?? `${path}.access.${communityId}.${facilityId}`;
      const link = links.get(pair);
      const topology = link && owns(link, "dependsOn") ? object(link.dependsOn, `${accessPath}.dependsOn`, ["value", "status", "source", "date", "licence"]) : unknown<string[]>(`access topology for ${communityId} to ${facilityId} not supplied`);
      if (topology.value !== null) {
        list(topology.value, `${accessPath}.dependsOn.value`, REVIEW_LIMITS.dependencies).forEach((dependency, k) => {
          const dependencyId = stableId(dependency, `${accessPath}.dependsOn.value[${k}]`);
          if (!crossings.has(dependencyId)) reject(`${accessPath}.dependsOn.value[${k}]`, "Crossing ID is absent from the catalogue");
          dependencies.add(dependencyId);
        });
      }
      if (link && owns(link, "distanceKm")) entityByFacility.get(facilityId)!.context![`scenario:${encodeURIComponent(scenarioId)}:community:${encodeURIComponent(communityId)}:distanceKm`] = { ...object(link.distanceKm, `${accessPath}.distanceKm`) } as Sourced<unknown>;
      return { id: `access-${communityIds.indexOf(communityId) * facilityIds.length + facilityIds.indexOf(facilityId) + 1}`, communityId, facilityId,
        available: evidence(supplied?.input ?? {}, "available", accessPath, `access availability for ${communityId} to ${facilityId} not supplied`), dependsOn: { ...topology } };
    }));
    const stateIds = new Set<string>();
    const dependencyStates = optionalList(scenario, "dependencyStates", path, REVIEW_LIMITS.dependencies).map((item, j) => {
      const statePath = `${path}.dependencyStates[${j}]`;
      const state = object(item, statePath, ["dependencyId", "open"]);
      const dependencyId = stableId(state.dependencyId, `${statePath}.dependencyId`);
      if (stateIds.has(dependencyId)) reject(`${statePath}.dependencyId`, "Duplicate dependency state");
      stateIds.add(dependencyId);
      return { dependencyId, open: evidence(state, "open", statePath, `state for ${dependencyId} not supplied`) };
    });
    return { ...scenario, demand, crewCeiling: evidence(scenario, "crewCeiling", path, "scenario crew ceiling not supplied"), arrangementFacts, access, dependencyStates };
  });
  if (dependencies.size > REVIEW_LIMITS.dependencies) reject("$.dependencies", "Selected access hypotheses exceed the dependency limit");
  const dependencyEntities = [...dependencies].sort().map(id => {
    const crossing = crossings.get(id)!;
    const context = labelledContext(crossing, `$.catalogue.crossings.${id}`);
    // The overlay is geographic context from the same labelled intersection source.
    // It never establishes the open/closed state used by the engine.
    if (crossing.overlay !== undefined && context.location) context.overlay = { ...context.location, value: crossing.overlay };
    return { id, name: crossing.road as string, context };
  });
  const packet = {
    version: REVIEW_VERSION, title: facts.title, facilities, communities,
    dependencies: dependencyEntities, arrangements, scenarios,
  };
  const result = validateReviewPacket(packet);
  if (!result.valid) throw new ReviewContractError(result.errors);
  return structuredClone(result.packet);
}
