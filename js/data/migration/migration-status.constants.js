(function (root) {
  "use strict";

  const namespace = root.MentorDataPhase0 = root.MentorDataPhase0 || {};
  const statuses = [
    "not_started",
    "backup_in_progress",
    "backed_up",
    "import_in_progress",
    "imported",
    "verification_in_progress",
    "verified",
    "active",
    "failed",
    "recoveryRequired"
  ];
  namespace.MigrationStatus = Object.freeze({
    values: Object.freeze(statuses.slice()),
    isValid(value) {
      return statuses.includes(value);
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
