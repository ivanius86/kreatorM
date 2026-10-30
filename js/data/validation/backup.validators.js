(function (root) {
  "use strict";

  const namespace = root.MentorDataPhase0 = root.MentorDataPhase0 || {};

  function validateRawLocalStorageDocument(value, registeredKeys) {
    const errors = [];
    if (!value || typeof value !== "object" || Array.isArray(value)) return { valid: false, errors: ["RAW_DOCUMENT_REQUIRED"] };
    if (!value.sources || typeof value.sources !== "object" || Array.isArray(value.sources)) errors.push("RAW_SOURCES_REQUIRED");
    else {
      const defaultKeys = [
        ...(namespace.LegacyStorageRegistry?.localStorageKeys || []),
        ...(namespace.GoalsCalendarBackupService?.sources?.map((source) => source.key) || [])
      ];
      const allowed = new Set(registeredKeys || defaultKeys);
      Object.entries(value.sources).forEach(([key, raw]) => {
        if (!allowed.has(key)) errors.push(`RAW_SOURCE_UNREGISTERED:${key}`);
        if (typeof raw !== "string") errors.push(`RAW_SOURCE_STRING_REQUIRED:${key}`);
      });
    }
    return { valid: errors.length === 0, errors };
  }

  function validateMediaIndex(value) {
    const errors = [];
    if (!value || typeof value !== "object" || !Array.isArray(value.records)) return { valid: false, errors: ["MEDIA_INDEX_INVALID"] };
    if (value.recordCount !== value.records.length) errors.push("MEDIA_RECORD_COUNT_MISMATCH");
    value.records.forEach((record, index) => {
      if (!record?.id) errors.push(`MEDIA_ID_REQUIRED:${index}`);
      if (!record?.blob?.path) errors.push(`MEDIA_BLOB_PATH_REQUIRED:${index}`);
      if (!/^[a-f0-9]{64}$/i.test(String(record?.blob?.sha256 || ""))) errors.push(`MEDIA_BLOB_CHECKSUM_INVALID:${index}`);
    });
    return { valid: errors.length === 0, errors };
  }

  namespace.BackupValidators = Object.freeze({
    validateRawLocalStorageDocument,
    validateMediaIndex
  });
})(typeof window !== "undefined" ? window : globalThis);
