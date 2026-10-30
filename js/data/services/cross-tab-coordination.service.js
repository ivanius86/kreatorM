(function (root) {
  "use strict";

  const idb = root.MentorIndexedDB = root.MentorIndexedDB || {};
  const LOCK_NAME = "kreatorm_app_db:data";
  const EPOCH_KEY = "data:epoch";
  const CHANNEL_NAME = "kreatorm_app_db:data-events";
  let hydratedEpoch = null;
  let reloadRequired = false;
  let lastAnnouncement = null;
  let channel = null;

  function fail(code, message, details) {
    const error = new Error(message);
    error.code = code;
    error.details = details || null;
    throw error;
  }

  function dispatch(type, detail) {
    if (typeof root.dispatchEvent !== "function" ||
        typeof root.CustomEvent !== "function") return;
    root.dispatchEvent(new root.CustomEvent(type, { detail }));
  }

  function requireLocks() {
    const locks = root.navigator?.locks;
    if (!locks?.request) {
      fail(
        "WEB_LOCKS_REQUIRED",
        "Cross-tab data coordination requires the Web Locks API."
      );
    }
    return locks;
  }

  function withLock(mode, reason, operation) {
    if (typeof operation !== "function") {
      fail("DATA_LOCK_OPERATION_REQUIRED", "A coordinated operation is required.");
    }
    return requireLocks().request(
      LOCK_NAME,
      { mode },
      () => operation({ mode, reason: reason || "data-operation" })
    );
  }

  function withShared(reason, operation) {
    return withLock("shared", reason, operation);
  }

  function withExclusive(reason, operation) {
    return withLock("exclusive", reason, operation);
  }

  function epochRevision(record) {
    const value = Number(record?.revision);
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  }

  async function readEpoch(database) {
    const record = await database.table("meta").get(EPOCH_KEY);
    return {
      key: EPOCH_KEY,
      revision: epochRevision(record),
      updatedAt: record?.updatedAt || null,
      reason: record?.reason || null
    };
  }

  function rememberHydratedEpoch(recordOrRevision) {
    hydratedEpoch = epochRevision(
      typeof recordOrRevision === "object"
        ? recordOrRevision
        : { revision: recordOrRevision }
    );
    reloadRequired = false;
    return hydratedEpoch;
  }

  function markReloadRequired(detail) {
    reloadRequired = true;
    lastAnnouncement = {
      revision: epochRevision(detail),
      reason: detail?.reason || "external-data-replacement",
      occurredAt: detail?.occurredAt || new Date().toISOString()
    };
    dispatch("mentor:indexeddb-reload-required", lastAnnouncement);
  }

  function assertWritableEpoch(record) {
    const actual = epochRevision(record);
    if (reloadRequired || hydratedEpoch === null || actual !== hydratedEpoch) {
      markReloadRequired({
        revision: actual,
        reason: reloadRequired
          ? lastAnnouncement?.reason || "reload-required"
          : "data-epoch-mismatch"
      });
      fail(
        "INDEXEDDB_EPOCH_MISMATCH",
        "The IndexedDB data epoch changed. Reload is required before another mutation.",
        { expectedEpoch: hydratedEpoch, actualEpoch: actual }
      );
    }
    return actual;
  }

  async function incrementEpoch(metaTable, reason, now) {
    const current = await metaTable.get(EPOCH_KEY);
    const record = {
      key: EPOCH_KEY,
      revision: epochRevision(current) + 1,
      reason: reason || "data-revision",
      updatedAt: typeof now === "function"
        ? now()
        : new Date().toISOString()
    };
    await metaTable.put(record);
    return record;
  }

  function announceEpoch(record, options = {}) {
    const detail = {
      revision: epochRevision(record),
      reason: record?.reason || options.reason || "data-revision",
      occurredAt: record?.updatedAt || new Date().toISOString(),
      source: options.source || "local-tab"
    };
    if (options.requireReload !== false) markReloadRequired(detail);
    try {
      channel?.postMessage(detail);
    } catch (_) {
      // Same-tab event and persisted epoch remain authoritative.
    }
    dispatch("mentor:indexeddb-epoch-changed", detail);
    return detail;
  }

  function getState() {
    return Object.freeze({
      hydratedEpoch,
      reloadRequired,
      lastAnnouncement
    });
  }

  if (typeof root.BroadcastChannel === "function") {
    channel = new root.BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener("message", (event) => {
      const detail = event?.data;
      if (!detail || epochRevision(detail) === hydratedEpoch) return;
      markReloadRequired({ ...detail, source: "broadcast" });
    });
  }

  idb.CrossTabCoordinationService = Object.freeze({
    LOCK_NAME,
    EPOCH_KEY,
    withShared,
    withExclusive,
    readEpoch,
    rememberHydratedEpoch,
    assertWritableEpoch,
    incrementEpoch,
    announceEpoch,
    markReloadRequired,
    getState
  });
})(typeof window !== "undefined" ? window : globalThis);
