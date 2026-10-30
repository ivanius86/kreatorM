(function (root) {
  "use strict";

  const namespace = root.MentorDataPhase0 = root.MentorDataPhase0 || {};

  function readLocalStorageSnapshot(storage, sources, now) {
    if (!storage || typeof storage.getItem !== "function") {
      const error = new Error("A readable localStorage implementation is required.");
      error.code = "LOCAL_STORAGE_UNAVAILABLE";
      throw error;
    }
    const registrySources = sources || namespace.LegacyStorageRegistry?.localStorageSources || [];
    const capturedAt = (now || (() => new Date().toISOString()))();
    return {
      sourceType: "localStorage",
      capturedAt,
      entries: registrySources.map((source) => {
        try {
          const raw = storage.getItem(source.key);
          return { source, key: source.key, present: raw !== null, raw, readStatus: "ok" };
        } catch (error) {
          return {
            source,
            key: source.key,
            present: null,
            raw: null,
            readStatus: "failed",
            errorCode: error?.name || "LOCAL_STORAGE_READ_FAILED"
          };
        }
      })
    };
  }

  namespace.LegacyStorageReader = Object.freeze({ readLocalStorageSnapshot });
})(typeof window !== "undefined" ? window : globalThis);
