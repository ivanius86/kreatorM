(function attachIndexedDbRecoveryService(root) {
  "use strict";

  const namespace = root.MentorIndexedDB = root.MentorIndexedDB || {};
  const StateMachine = namespace.MigrationStateMachine;

  function createRecoveryError(message, details) {
    const error = new Error(message);
    error.code = "RECOVERY_REQUIRED";
    error.details = details || null;
    return error;
  }

  function assertActivationAllowed(checkpoint) {
    const status = checkpoint && checkpoint.status;
    if (
      status !== StateMachine.STATUS.VERIFIED &&
      status !== StateMachine.STATUS.ACTIVE
    ) {
      throw createRecoveryError(
        "Cutover is blocked until migration verification succeeds.",
        { checkpoint: checkpoint || null }
      );
    }

    return true;
  }

  async function markRecoveryRequired(
    checkpointService,
    checkpointKey,
    error,
    details
  ) {
    if (!checkpointService || !checkpointKey) {
      throw new TypeError("checkpointService and checkpointKey are required.");
    }

    return checkpointService.transition(
      checkpointKey,
      StateMachine.STATUS.RECOVERY_REQUIRED,
      Object.assign({}, details || {}, {
        recoveryCode: error && error.code
          ? error.code
          : "RECOVERY_REQUIRED",
        recoveryMessage: error && error.message
          ? error.message
          : "Manual recovery is required."
      })
    );
  }

  function createReport(checkpoint, database) {
    const lifecycleState = database && database.lifecycleState
      ? database.lifecycleState
      : {};

    return {
      recoveryRequired: Boolean(
        checkpoint &&
        checkpoint.status === StateMachine.STATUS.RECOVERY_REQUIRED
      ),
      checkpointKey: checkpoint ? checkpoint.key : null,
      migrationStatus: checkpoint ? checkpoint.status : null,
      lastSuccessfulCheckpoint: checkpoint
        ? checkpoint.lastSuccessfulCheckpoint || null
        : null,
      databaseBlocked: Boolean(lifecycleState.blocked),
      versionChangeDetected: Boolean(lifecycleState.versionChangeRequested),
      generatedAt: new Date().toISOString()
    };
  }

  function exportCurrentState(database, options) {
    if (!namespace.IndexedDbBackupService) {
      throw createRecoveryError("IndexedDB backup service is unavailable.");
    }
    return namespace.IndexedDbBackupService.createCompleteBackup(
      database,
      options || {}
    );
  }

  function restoreFromVerifiedBackup(database, zipValue, options) {
    if (!namespace.IndexedDbRestoreService) {
      throw createRecoveryError("IndexedDB restore service is unavailable.");
    }
    return namespace.IndexedDbRestoreService.restore(
      database,
      zipValue,
      Object.assign({}, options || {}, {
        reason: "explicit-indexeddb-recovery"
      })
    );
  }

  function retryRecovery(options) {
    if (!root.MentorIndexedDbAdmin?.retryRecovery) {
      throw createRecoveryError(
        "IndexedDB recovery retry admin boundary is unavailable."
      );
    }
    return root.MentorIndexedDbAdmin.retryRecovery(options || {});
  }

  namespace.IndexedDbRecoveryService = Object.freeze({
    createRecoveryError,
    assertActivationAllowed,
    markRecoveryRequired,
    createReport,
    exportCurrentState,
    restoreFromVerifiedBackup,
    retryRecovery
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
