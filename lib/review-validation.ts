import {
  REVIEW_LIMITS, REVIEW_VERSION, type FieldError, type ValidationResult,
  type ReviewPacket,
} from "./review-contract";

type RecordValue = Record<string, unknown>;
const UNSAFE_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const STATUSES = new Set(["public", "declared", "illustrative", "unknown"]);
const ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;

/** Strict, bounded validation at the public boundary. It never fills in facts. */
export function validateReviewPacket(input: unknown): ValidationResult {
  const errors: FieldError[] = [];
  const fail = (path: string, message: string) => {
    if (errors.length < 200) errors.push({ path, message });
  };
  function record(value: unknown, path: string, allowed?: string[]): value is RecordValue {
    if (value === null || typeof value !== "object" || Array.isArray(value) ||
        ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
      fail(path, "Must be a plain object"); return false;
    }
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") { fail(path, "Symbol fields are not permitted"); continue; }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor)) {
        fail(`${path}.${key}`, "Accessor fields are not permitted"); return false;
      }
      if (!descriptor.enumerable) {
        fail(`${path}.${key}`, "Non-enumerable fields are not permitted"); return false;
      }
      if (UNSAFE_KEYS.has(key)) fail(`${path}.${key}`, "Unsafe object key");
      else if (allowed && !allowed.includes(key)) fail(`${path}.${key}`, "Unknown field");
    }
    return true;
  }
  function text(value: unknown, path: string, max = 512): value is string {
    if (typeof value !== "string" || value.trim().length === 0 || value.length > max) {
      fail(path, `Must be nonblank text of at most ${max} characters`); return false;
    }
    return true;
  }
  function id(value: unknown, path: string): value is string {
    if (typeof value !== "string" || !ID.test(value) || UNSAFE_KEYS.has(value)) {
      fail(path, "Must be a stable ID of 1–128 characters (letters, digits, '.', '_', ':', '/', '-')");
      return false;
    }
    return true;
  }
  function array(value: unknown, path: string, min: number, max: number): unknown[] {
    if (!Array.isArray(value)) { fail(path, "Must be an array"); return []; }
    if (value.length < min || value.length > max) fail(path, `Must contain ${min}–${max} entries`);
    for (const key of Reflect.ownKeys(value)) {
      if (key !== "length" && (typeof key !== "string" || !/^(0|[1-9][0-9]*)$/.test(key))) {
        fail(path, "Arrays may contain indexed JSON entries only");
      }
    }
    const entries: unknown[] = [];
    for (let i = 0; i < Math.min(value.length, max); i += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        fail(`${path}[${i}]`, "Sparse arrays, accessor entries and non-enumerable entries are not permitted");
        entries.push(undefined);
      } else entries.push(descriptor.value);
    }
    return entries;
  }
  let contextNodes = 0;
  const active = new Set<object>();
  function json(value: unknown, path: string, depth = 0): void {
    contextNodes += 1;
    if (contextNodes > 16_384) { fail(path, "Context exceeds the JSON node limit"); return; }
    if (depth > 12) { fail(path, "Context exceeds the JSON nesting limit of 12"); return; }
    if (value === null || typeof value === "boolean") return;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) fail(path, "Context numbers must be finite");
      return;
    }
    if (typeof value === "string") {
      if (value.length > 8_192) fail(path, "Context text must be at most 8192 characters");
      return;
    }
    if (typeof value !== "object") { fail(path, "Context must contain JSON values only"); return; }
    if (active.has(value)) { fail(path, "Context cannot contain cycles"); return; }
    active.add(value);
    if (Array.isArray(value)) {
      array(value, path, 0, 256).forEach((entry, index) => json(entry, `${path}[${index}]`, depth + 1));
    } else if (record(value, path)) {
      const entries = Object.entries(value);
      if (entries.length > 256) fail(path, "Context objects must have at most 256 fields");
      entries.slice(0, 256).forEach(([key, entry]) => {
        text(key, `${path}.[key]`, 512);
        json(entry, `${path}.${key}`, depth + 1);
      });
    }
    active.delete(value);
  }
  function sourced(value: unknown, path: string, kind: "boolean" | "count" | "ids" | "context",
                   references?: Set<string>): void {
    if (!record(value, path, ["value", "status", "source", "date", "licence"])) return;
    text(value.source, `${path}.source`, 2_000);
    text(value.date, `${path}.date`, 256);
    if (value.licence !== undefined) text(value.licence, `${path}.licence`, 512);
    if (typeof value.status !== "string" || !STATUSES.has(value.status)) {
      fail(`${path}.status`, "Must be public, declared, illustrative or unknown");
    }
    if (value.status === "public" && value.licence === undefined) {
      fail(`${path}.licence`, "Public evidence requires a licence");
    }
    if (value.status === "unknown") {
      if (value.value !== null) fail(`${path}.value`, "Unknown evidence must have a null value");
      return;
    }
    if (value.value === null || value.value === undefined) {
      fail(`${path}.value`, "Known evidence must have a non-null value"); return;
    }
    if (kind === "boolean") {
      if (typeof value.value !== "boolean") fail(`${path}.value`, "Must be a boolean");
    } else if (kind === "count") {
      if (typeof value.value !== "number" || !Number.isInteger(value.value) ||
          value.value < 0 || value.value > REVIEW_LIMITS.count) {
        fail(`${path}.value`, `Must be an integer from 0 to ${REVIEW_LIMITS.count}`);
      }
    } else if (kind === "ids") {
      const seen = new Set<string>();
      array(value.value, `${path}.value`, 0, REVIEW_LIMITS.dependencies).forEach((entry, index) => {
        const entryPath = `${path}.value[${index}]`;
        if (id(entry, entryPath)) {
          if (seen.has(entry)) fail(entryPath, "Duplicate dependency reference");
          seen.add(entry);
          if (references && !references.has(entry)) fail(entryPath, "Unknown dependency ID");
        }
      });
    } else json(value.value, `${path}.value`);
  }
  function reference(value: unknown, path: string, ids: Set<string>): void {
    if (id(value, path) && !ids.has(value)) fail(path, "Unknown reference ID");
  }
  function unique(value: unknown, path: string, seen: Set<string>): void {
    if (id(value, path)) {
      if (seen.has(value)) fail(path, "Duplicate ID");
      seen.add(value);
    }
  }
  function complete(seen: Set<string>, expected: Set<string>, path: string): void {
    for (const expectedId of expected) {
      if (!seen.has(expectedId)) fail(path, `Missing ${expectedId}; supply an explicit unknown fact if unresolved`);
    }
  }
  function entities(value: unknown, path: string, min: number, max: number,
                    physicalIds: Set<string>): Set<string> {
    const ids = new Set<string>();
    array(value, path, min, max).forEach((entry, index) => {
      const entryPath = `${path}[${index}]`;
      if (!record(entry, entryPath, ["id", "name", "context"])) return;
      unique(entry.id, `${entryPath}.id`, ids);
      if (typeof entry.id === "string") {
        if (physicalIds.has(entry.id)) fail(`${entryPath}.id`, "Duplicate physical ID across entities");
        physicalIds.add(entry.id);
      }
      text(entry.name, `${entryPath}.name`);
      if (entry.context !== undefined && record(entry.context, `${entryPath}.context`)) {
        const entries = Object.entries(entry.context);
        if (entries.length > 256) fail(`${entryPath}.context`, "At most 256 context fields are permitted");
        entries.slice(0, 256).forEach(([key, fact]) => {
          text(key, `${entryPath}.context.[key]`, 1_024);
          sourced(fact, `${entryPath}.context.${key}`, "context");
        });
      }
    });
    return ids;
  }

  if (!record(input, "$", ["version", "title", "facilities", "communities", "dependencies", "arrangements", "scenarios"])) {
    return { valid: false, errors };
  }
  if (input.version !== REVIEW_VERSION) fail("$.version", `Must equal ${REVIEW_VERSION}`);
  text(input.title, "$.title");
  const physicalIds = new Set<string>();
  const facilities = entities(input.facilities, "$.facilities", 1, REVIEW_LIMITS.facilities, physicalIds);
  const communities = entities(input.communities, "$.communities", 1, REVIEW_LIMITS.communities, physicalIds);
  const dependencies = entities(input.dependencies, "$.dependencies", 0, REVIEW_LIMITS.dependencies, physicalIds);
  const arrangements = new Set<string>();
  array(input.arrangements, "$.arrangements", 1, REVIEW_LIMITS.arrangements).forEach((entry, index) => {
    const path = `$.arrangements[${index}]`;
    if (!record(entry, path, ["id", "label"])) return;
    unique(entry.id, `${path}.id`, arrangements);
    text(entry.label, `${path}.label`);
  });
  const scenarios = new Set<string>();
  array(input.scenarios, "$.scenarios", 1, REVIEW_LIMITS.scenarios).forEach((entry, index) => {
    const path = `$.scenarios[${index}]`;
    if (!record(entry, path, ["id", "label", "kind", "service", "window", "units", "demand", "crewCeiling", "arrangementFacts", "access", "dependencyStates"])) return;
    unique(entry.id, `${path}.id`, scenarios);
    text(entry.label, `${path}.label`);
    if (!["heat", "heat-outage", "flood-access-loss"].includes(entry.kind as string)) fail(`${path}.kind`, "Unsupported scenario kind");
    text(entry.service, `${path}.service`, 128);
    text(entry.window, `${path}.window`);
    text(entry.units, `${path}.units`, 128);
    sourced(entry.crewCeiling, `${path}.crewCeiling`, "count");
    const demandIds = new Set<string>();
    array(entry.demand, `${path}.demand`, communities.size, REVIEW_LIMITS.communities).forEach((fact, i) => {
      const factPath = `${path}.demand[${i}]`;
      if (!record(fact, factPath, ["communityId", "amount"])) return;
      reference(fact.communityId, `${factPath}.communityId`, communities);
      unique(fact.communityId, `${factPath}.communityId`, demandIds);
      sourced(fact.amount, `${factPath}.amount`, "count");
    });
    complete(demandIds, communities, `${path}.demand`);
    const arrangementIds = new Set<string>();
    array(entry.arrangementFacts, `${path}.arrangementFacts`, arrangements.size, REVIEW_LIMITS.arrangements).forEach((group, i) => {
      const groupPath = `${path}.arrangementFacts[${i}]`;
      if (!record(group, groupPath, ["arrangementId", "facilities"])) return;
      reference(group.arrangementId, `${groupPath}.arrangementId`, arrangements);
      unique(group.arrangementId, `${groupPath}.arrangementId`, arrangementIds);
      const facilityIds = new Set<string>();
      array(group.facilities, `${groupPath}.facilities`, facilities.size, REVIEW_LIMITS.facilities).forEach((fact, j) => {
        const factPath = `${groupPath}.facilities[${j}]`;
        if (!record(fact, factPath, ["facilityId", "nominated", "capacity", "crewsRequired", "authorised", "suitable", "backup"])) return;
        reference(fact.facilityId, `${factPath}.facilityId`, facilities);
        unique(fact.facilityId, `${factPath}.facilityId`, facilityIds);
        sourced(fact.capacity, `${factPath}.capacity`, "count");
        sourced(fact.crewsRequired, `${factPath}.crewsRequired`, "count");
        for (const field of ["nominated", "authorised", "suitable", "backup"]) sourced(fact[field], `${factPath}.${field}`, "boolean");
      });
      complete(facilityIds, facilities, `${groupPath}.facilities`);
    });
    complete(arrangementIds, arrangements, `${path}.arrangementFacts`);
    const accessIds = new Set<string>();
    array(entry.access, `${path}.access`, 0, REVIEW_LIMITS.accessPaths).forEach((access, i) => {
      const accessPath = `${path}.access[${i}]`;
      if (!record(access, accessPath, ["id", "communityId", "facilityId", "available", "dependsOn"])) return;
      unique(access.id, `${accessPath}.id`, accessIds);
      reference(access.communityId, `${accessPath}.communityId`, communities);
      reference(access.facilityId, `${accessPath}.facilityId`, facilities);
      sourced(access.available, `${accessPath}.available`, "boolean");
      sourced(access.dependsOn, `${accessPath}.dependsOn`, "ids", dependencies);
    });
    const stateIds = new Set<string>();
    array(entry.dependencyStates, `${path}.dependencyStates`, 0, REVIEW_LIMITS.dependencies).forEach((state, i) => {
      const statePath = `${path}.dependencyStates[${i}]`;
      if (!record(state, statePath, ["dependencyId", "open"])) return;
      reference(state.dependencyId, `${statePath}.dependencyId`, dependencies);
      unique(state.dependencyId, `${statePath}.dependencyId`, stateIds);
      sourced(state.open, `${statePath}.open`, "boolean");
    });
  });
  return errors.length ? { valid: false, errors } : { valid: true, packet: input as ReviewPacket };
}
