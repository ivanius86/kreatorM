(function (root) {
  "use strict";

  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

  async function jsonCandidate(adapter, key, validator) {
    const raw = await adapter.readRaw(key);
    if (raw === null || raw === "") return { key, present: false, valid: false, value: null };
    try {
      const value = JSON.parse(raw);
      return { key, present: true, valid: validator(value), value };
    } catch (_) {
      return { key, present: true, valid: false, value: null };
    }
  }

  async function stringCandidate(adapter, key, validator) {
    const value = await adapter.readRaw(key);
    return {
      key,
      present: value !== null && value !== "",
      valid: value !== null && value !== "" && validator(value),
      value
    };
  }

  function requireValidCandidate(domain, candidates, emptyValue) {
    const present = candidates.filter((candidate) => candidate.present);
    const valid = candidates.filter((candidate) => candidate.valid);
    if (present.length && !valid.length) {
      throw new root.MentorDataError("DATA_RECOVERY_REQUIRED", `Stored ${domain} data requires recovery.`, {
        domain,
        invalidKeys: present.map((candidate) => candidate.key)
      });
    }
    return valid.length ? valid : [{ value: clone(emptyValue), valid: true, present: false }];
  }

  async function updateCentral(adapter, update) {
    return adapter.update("mentor_database", (current) => {
      if (!isObject(current)) {
        throw new root.MentorDataError("DATA_RECOVERY_REQUIRED", "Central database requires recovery.", { domain: "database" });
      }
      const next = update(clone(current));
      next.version = Number(next.version) || 1;
      next.updatedAt = new Date().toISOString();
      return next;
    }, null);
  }

  function stripFields(value, fields) {
    const next = { ...value };
    fields.forEach((field) => delete next[field]);
    return next;
  }

  function timestamp(value, fields) {
    for (const field of fields || []) {
      const parsed = Date.parse(value?.[field]);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  }

  function mergeById(primary, secondary, timestampFields) {
    const result = [];
    const indexes = new Map();
    (Array.isArray(primary) ? primary : []).forEach((item) => {
      const id = item?.id;
      if (id === undefined || id === null || id === "") {
        result.push(clone(item));
        return;
      }
      indexes.set(String(id), result.length);
      result.push(clone(item));
    });
    (Array.isArray(secondary) ? secondary : []).forEach((item) => {
      const id = item?.id;
      if (id === undefined || id === null || id === "") return;
      const key = String(id);
      if (!indexes.has(key)) {
        indexes.set(key, result.length);
        result.push(clone(item));
        return;
      }
      const index = indexes.get(key);
      const primaryStamp = timestamp(result[index], timestampFields);
      const secondaryStamp = timestamp(item, timestampFields);
      if (primaryStamp !== null && secondaryStamp !== null && secondaryStamp > primaryStamp) result[index] = clone(item);
    });
    return result;
  }

  root.MentorRepositoryHelpers = Object.freeze({
    clone,
    isObject,
    jsonCandidate,
    stringCandidate,
    requireValidCandidate,
    updateCentral,
    stripFields,
    mergeById
  });
})(typeof window !== "undefined" ? window : globalThis);
