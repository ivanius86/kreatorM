(function (root) {
  "use strict";

  const namespace = root.MentorDataPhase0 = root.MentorDataPhase0 || {};

  function fromAudit(audit, options) {
    const entries = (audit?.entries || [])
      .filter((entry) => entry.readStatus === "failed" || entry.validationStatus === "invalid")
      .map((entry) => ({
        key: entry.key,
        owner: entry.owner || null,
        status: entry.readStatus === "failed" ? "readFailed" : "invalid",
        errorCodes: entry.readStatus === "failed"
          ? [entry.errorCode || "READ_FAILED"]
          : (entry.errors || []).slice(),
        rawBackupRequired: entry.present !== false,
        checksum: entry.checksum || null
      }));

    return {
      reportVersion: 1,
      createdAt: options?.createdAt || new Date().toISOString(),
      status: entries.length ? "recoveryRequired" : "clear",
      domain: options?.domain || null,
      entries,
      allowsEmptyActivation: false
    };
  }

  function assertCutoverAllowed(report) {
    if (report?.status === "recoveryRequired") {
      const error = new Error("Recovery is required before cutover.");
      error.code = "RECOVERY_REQUIRED";
      throw error;
    }
    return true;
  }

  namespace.RecoveryReportService = Object.freeze({ fromAudit, assertCutoverAllowed });
})(typeof window !== "undefined" ? window : globalThis);
