(function attachMigrationVerificationService(root) {
  "use strict";

  const namespace = root.MentorIndexedDB = root.MentorIndexedDB || {};
  const StateMachine = namespace.MigrationStateMachine;

  function requireChecksumService(explicitService) {
    const service = explicitService ||
      (root.MentorDataPhase0 &&
        root.MentorDataPhase0.BackupChecksumService);

    if (!service || typeof service.sha256 !== "function") {
      throw new Error("BackupChecksumService is required for migration verification.");
    }

    return service;
  }

  function stableIdentity(record) {
    if (!record || typeof record !== "object") {
      return JSON.stringify(record);
    }

    return String(
      record.id !== undefined
        ? record.id
        : record.key !== undefined
          ? record.key
          : JSON.stringify(record)
    );
  }

  function sortRecords(records) {
    return (Array.isArray(records) ? records : [])
      .slice()
      .sort((left, right) =>
        stableIdentity(left).localeCompare(stableIdentity(right))
      );
  }

  async function verifyStore(options) {
    const input = options || {};
    if (!input.database || !input.storeName) {
      throw new TypeError("database and storeName are required.");
    }

    const checksumService = requireChecksumService(input.checksumService);
    const expectedRecords = sortRecords(input.expectedRecords);
    const actualRecords = sortRecords(
      await input.database.table(input.storeName).toArray()
    );
    const expectedChecksum = await checksumService.sha256(
      expectedRecords,
      input.cryptoApi
    );
    const actualChecksum = await checksumService.sha256(
      actualRecords,
      input.cryptoApi
    );

    return {
      valid: expectedRecords.length === actualRecords.length &&
        expectedChecksum.hex === actualChecksum.hex,
      storeName: input.storeName,
      expectedRecordCount: expectedRecords.length,
      actualRecordCount: actualRecords.length,
      expectedChecksum: expectedChecksum.hex,
      actualChecksum: actualChecksum.hex,
      verifiedAt: new Date().toISOString()
    };
  }

  async function verifyAndCheckpoint(options) {
    const input = options || {};
    if (!input.checkpointService || !input.checkpointKey) {
      throw new TypeError("checkpointService and checkpointKey are required.");
    }

    await input.checkpointService.transition(
      input.checkpointKey,
      StateMachine.STATUS.VERIFICATION_IN_PROGRESS,
      { verificationStartedAt: new Date().toISOString() }
    );

    try {
      const report = await verifyStore(input);
      if (!report.valid) {
        const error = new Error(
          `Migration verification failed for store: ${input.storeName}`
        );
        error.code = "MIGRATION_VERIFICATION_FAILED";
        error.report = report;
        throw error;
      }

      const checkpoint = await input.checkpointService.transition(
        input.checkpointKey,
        StateMachine.STATUS.VERIFIED,
        {
          verification: report,
          verifiedAt: report.verifiedAt
        }
      );

      return { report, checkpoint };
    } catch (error) {
      await input.checkpointService.transition(
        input.checkpointKey,
        StateMachine.STATUS.FAILED,
        {
          errorCode: error.code || "MIGRATION_VERIFICATION_ERROR",
          errorMessage: error.message
        }
      );
      throw error;
    }
  }

  namespace.MigrationVerificationService = Object.freeze({
    stableIdentity,
    sortRecords,
    verifyStore,
    verifyAndCheckpoint
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
