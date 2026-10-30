(function (root) {
  "use strict";

  const namespace = root.MentorDataPhase0 = root.MentorDataPhase0 || {};

  function createDomainReport(input) {
    const status = input.status || "not_started";
    if (!namespace.MigrationStatus?.isValid(status)) {
      const error = new Error("Unknown migration status.");
      error.code = "MIGRATION_STATUS_INVALID";
      throw error;
    }
    return {
      domain: input.domain,
      status,
      migrationVersion: input.migrationVersion || 1,
      startedAt: input.startedAt || null,
      completedAt: input.completedAt || null,
      failedAt: input.failedAt || null,
      lastSuccessfulCheckpoint: input.lastSuccessfulCheckpoint || null,
      sourceChecksums: { ...(input.sourceChecksums || {}) },
      targetChecksum: input.targetChecksum || null,
      sourceRecordCount: Number(input.sourceRecordCount || 0),
      targetRecordCount: Number(input.targetRecordCount || 0),
      conflicts: (input.conflicts || []).map((conflict) => ({
        id: conflict.id || null,
        sourceKeys: (conflict.sourceKeys || []).slice(),
        candidateChecksums: { ...(conflict.candidateChecksums || {}) },
        selectedSource: conflict.selectedSource || null,
        rule: conflict.rule || null
      })),
      errorCode: input.errorCode || null
    };
  }

  function createMigrationReport(input) {
    const domains = (input.domains || []).map(createDomainReport);
    return {
      reportVersion: 1,
      migrationId: input.migrationId || "legacy-to-idb-v1",
      createdAt: input.createdAt || new Date().toISOString(),
      status: input.status || "not_started",
      domains
    };
  }

  namespace.MigrationReportModel = Object.freeze({
    createDomainReport,
    createMigrationReport
  });
})(typeof window !== "undefined" ? window : globalThis);
