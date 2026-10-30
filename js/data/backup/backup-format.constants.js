(function (root) {
  "use strict";

  const namespace = root.MentorDataPhase0 = root.MentorDataPhase0 || {};
  namespace.BackupFormat = Object.freeze({
    id: "kreatorm-backup",
    version: 1,
    extension: ".zip",
    manifestPath: "manifest.json",
    rawLocalStoragePath: "localstorage/raw.json",
    validationReportPath: "reports/validation.json",
    conflictReportPath: "reports/conflicts.json",
    migrationReportPath: "reports/migration.json",
    sourceMode: "legacy-pre-indexeddb"
  });
})(typeof window !== "undefined" ? window : globalThis);
