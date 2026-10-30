(function attachMigrationStateMachine(root) {
  "use strict";

  const namespace = root.MentorIndexedDB = root.MentorIndexedDB || {};
  const statusSource = root.MentorDataPhase0 &&
    root.MentorDataPhase0.MigrationStatusConstants;

  const STATUS = statusSource && statusSource.STATUS
    ? statusSource.STATUS
    : Object.freeze({
      NOT_STARTED: "not_started",
      BACKUP_IN_PROGRESS: "backup_in_progress",
      BACKED_UP: "backed_up",
      IMPORT_IN_PROGRESS: "import_in_progress",
      IMPORTED: "imported",
      VERIFICATION_IN_PROGRESS: "verification_in_progress",
      VERIFIED: "verified",
      ACTIVE: "active",
      FAILED: "failed",
      RECOVERY_REQUIRED: "recoveryRequired"
    });

  const transitions = Object.freeze({
    [STATUS.NOT_STARTED]: Object.freeze([
      STATUS.BACKUP_IN_PROGRESS,
      STATUS.FAILED,
      STATUS.RECOVERY_REQUIRED
    ]),
    [STATUS.BACKUP_IN_PROGRESS]: Object.freeze([
      STATUS.BACKED_UP,
      STATUS.FAILED,
      STATUS.RECOVERY_REQUIRED
    ]),
    [STATUS.BACKED_UP]: Object.freeze([
      STATUS.IMPORT_IN_PROGRESS,
      STATUS.FAILED,
      STATUS.RECOVERY_REQUIRED
    ]),
    [STATUS.IMPORT_IN_PROGRESS]: Object.freeze([
      STATUS.IMPORTED,
      STATUS.FAILED,
      STATUS.RECOVERY_REQUIRED
    ]),
    [STATUS.IMPORTED]: Object.freeze([
      STATUS.VERIFICATION_IN_PROGRESS,
      STATUS.FAILED,
      STATUS.RECOVERY_REQUIRED
    ]),
    [STATUS.VERIFICATION_IN_PROGRESS]: Object.freeze([
      STATUS.VERIFIED,
      STATUS.FAILED,
      STATUS.RECOVERY_REQUIRED
    ]),
    [STATUS.VERIFIED]: Object.freeze([
      STATUS.ACTIVE,
      STATUS.FAILED,
      STATUS.RECOVERY_REQUIRED
    ]),
    [STATUS.ACTIVE]: Object.freeze([
      STATUS.RECOVERY_REQUIRED
    ]),
    [STATUS.FAILED]: Object.freeze([
      STATUS.BACKUP_IN_PROGRESS,
      STATUS.IMPORT_IN_PROGRESS,
      STATUS.VERIFICATION_IN_PROGRESS,
      STATUS.RECOVERY_REQUIRED
    ]),
    [STATUS.RECOVERY_REQUIRED]: Object.freeze([
      STATUS.NOT_STARTED
    ])
  });

  const successfulCheckpoints = new Set([
    STATUS.BACKED_UP,
    STATUS.IMPORTED,
    STATUS.VERIFIED,
    STATUS.ACTIVE
  ]);

  function isKnownStatus(status) {
    return Object.prototype.hasOwnProperty.call(transitions, status);
  }

  function canTransition(fromStatus, toStatus) {
    if (!isKnownStatus(fromStatus) || !isKnownStatus(toStatus)) {
      return false;
    }

    return fromStatus === toStatus ||
      transitions[fromStatus].includes(toStatus);
  }

  function createTransitionError(fromStatus, toStatus) {
    const error = new Error(
      `Invalid migration transition: ${String(fromStatus)} -> ${String(toStatus)}`
    );
    error.code = "INVALID_MIGRATION_TRANSITION";
    error.fromStatus = fromStatus;
    error.toStatus = toStatus;
    return error;
  }

  function assertTransition(fromStatus, toStatus) {
    if (!canTransition(fromStatus, toStatus)) {
      throw createTransitionError(fromStatus, toStatus);
    }
  }

  function createInitial(key, details, now) {
    const input = details || {};
    const timestamp = now || new Date().toISOString();

    return Object.assign({}, input, {
      key,
      status: STATUS.NOT_STARTED,
      createdAt: input.createdAt || timestamp,
      updatedAt: timestamp
    });
  }

  function createNext(current, nextStatus, details, now) {
    if (!current || !current.key) {
      throw new TypeError("A persisted migration checkpoint with a key is required.");
    }

    assertTransition(current.status, nextStatus);

    const timestamp = now || new Date().toISOString();
    const next = Object.assign({}, current, details || {}, {
      key: current.key,
      status: nextStatus,
      updatedAt: timestamp
    });

    if (successfulCheckpoints.has(nextStatus)) {
      next.lastSuccessfulCheckpoint = nextStatus;
      next.lastSuccessfulCheckpointAt = timestamp;
    }

    if (nextStatus === STATUS.FAILED) {
      next.failedAt = timestamp;
    }

    if (nextStatus === STATUS.RECOVERY_REQUIRED) {
      next.recoveryRequiredAt = timestamp;
    }

    return next;
  }

  namespace.MigrationStateMachine = Object.freeze({
    STATUS,
    transitions,
    isKnownStatus,
    canTransition,
    assertTransition,
    createInitial,
    createNext
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
