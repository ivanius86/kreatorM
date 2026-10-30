(function (root) {
  "use strict";

  const namespace = root.MentorDataPhase0 = root.MentorDataPhase0 || {};

  async function prepareLegacyBackup(input, options) {
    const goalsCalendarKeys = new Set(
      namespace.GoalsCalendarBackupService?.sources?.map((source) => source.key) || []
    );
    const legacySnapshot = goalsCalendarKeys.size
      ? {
        ...input.localStorageSnapshot,
        entries: (input.localStorageSnapshot?.entries || []).filter(
          (entry) => !goalsCalendarKeys.has(entry.key)
        )
      }
      : input.localStorageSnapshot;
    const normalization = await namespace.LegacyDomainNormalizer.normalize(
      legacySnapshot,
      {
        validators: options?.validators,
        checksumService: options?.checksumService,
        cryptoApi: options?.cryptoApi,
        resolveFoodId: options?.resolveFoodId
      }
    );
    const goalsCalendar = namespace.GoalsCalendarBackupService?.normalizeSnapshot
      ? namespace.GoalsCalendarBackupService.normalizeSnapshot(input.localStorageSnapshot)
      : { domains: {}, validationEntries: [], recovery: [], recoveryRequired: false };
    normalization.domains = { ...normalization.domains, ...goalsCalendar.domains };
    normalization.validationReport.entries.push(...goalsCalendar.validationEntries);
    normalization.validationReport.recovery.push(...goalsCalendar.recovery);
    normalization.validationReport.status = normalization.validationReport.recovery.length
      ? "recoveryRequired"
      : "valid";
    normalization.recoveryRequired = normalization.recoveryRequired || goalsCalendar.recoveryRequired;
    const bundle = await namespace.BackupExportService.prepareBackupBundle({
      createdAt: input.createdAt,
      appVersion: input.appVersion,
      localStorageSnapshot: input.localStorageSnapshot,
      normalizedDomains: normalization.domains,
      mediaRecords: input.mediaRecords || [],
      validationReport: normalization.validationReport,
      conflictReport: normalization.conflictReport,
      migrationReport: input.migrationReport
    }, {
      checksumService: options?.checksumService,
      cryptoApi: options?.cryptoApi
    });
    return { bundle, normalization };
  }

  namespace.LegacyBackupPreparationService = Object.freeze({ prepareLegacyBackup });
})(typeof window !== "undefined" ? window : globalThis);
