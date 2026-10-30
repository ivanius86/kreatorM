(function (root) {
  "use strict";

  const namespace = root.MentorDataPhase0 = root.MentorDataPhase0 || {};

  function importError(code, message, details) {
    const error = new Error(message);
    error.code = code;
    if (details !== undefined) error.details = details;
    return error;
  }

  function requireStorage(storage) {
    if (!storage
      || typeof storage.getItem !== "function"
      || typeof storage.setItem !== "function"
      || typeof storage.removeItem !== "function") {
      throw importError("LOCAL_STORAGE_UNAVAILABLE", "A writable localStorage implementation is required.");
    }
    return storage;
  }

  async function validatedBackupArchive(artifact, options) {
    if (artifact?.status === "valid" && artifact.manifest && artifact.files) return artifact;
    const zipValue = artifact?.bytes || artifact?.blob || artifact;
    if (!zipValue) throw importError("PRE_IMPORT_BACKUP_REQUIRED", "A complete ZIP backup is required before import.");
    try {
      return await namespace.ZipBackupService.readAndValidateZip(zipValue, {
        fflate: options?.fflate,
        checksumService: options?.checksumService,
        cryptoApi: options?.cryptoApi,
        synchronous: options?.synchronous
      });
    } catch (error) {
      throw importError(
        "PRE_IMPORT_BACKUP_INVALID",
        "The pre-import backup is not a valid versioned ZIP.",
        { causeCode: error?.code || error?.name || "BACKUP_VALIDATION_FAILED" }
      );
    }
  }

  async function verifyRawBackup(rawState, archive, options) {
    const checksumService = options?.checksumService || namespace.BackupChecksumService;
    const cryptoApi = options?.cryptoApi;
    const summaries = archive.manifest?.rawSources || {};
    const errors = [];
    for (const [key, raw] of Object.entries(rawState)) {
      const summary = summaries[key];
      if (raw === null) {
        if (summary) errors.push(`PRE_IMPORT_BACKUP_UNEXPECTED_RAW:${key}`);
        continue;
      }
      if (!summary) {
        errors.push(`PRE_IMPORT_BACKUP_RAW_MISSING:${key}`);
        continue;
      }
      const checksum = await checksumService.sha256(raw, cryptoApi);
      if (checksum.byteSize !== summary.byteSize) errors.push(`PRE_IMPORT_BACKUP_RAW_SIZE_MISMATCH:${key}`);
      if (checksum.hex !== summary.sha256) errors.push(`PRE_IMPORT_BACKUP_RAW_CHECKSUM_MISMATCH:${key}`);
    }
    if (errors.length) {
      throw importError(
        "PRE_IMPORT_BACKUP_PARITY_FAILED",
        "The pre-import ZIP does not contain the current Goals and Calendar raw state.",
        errors
      );
    }
  }

  function restoreRawState(storage, rawState, keys) {
    const errors = [];
    for (const key of [keys.calendar, keys.goals]) {
      try {
        if (rawState[key] === null) storage.removeItem(key);
        else storage.setItem(key, rawState[key]);
      } catch (error) {
        errors.push({ key, code: error?.code || error?.name || "ROLLBACK_WRITE_FAILED" });
      }
    }
    return errors;
  }

  async function verifyReadBack(storage, expected, options) {
    let goals;
    let calendar;
    try {
      goals = JSON.parse(storage.getItem(options.keys.goals));
      calendar = JSON.parse(storage.getItem(options.keys.calendar));
    } catch (_) {
      throw importError("IMPORT_READBACK_INVALID_JSON", "Imported Goals or Calendar JSON could not be read back.");
    }
    const validation = namespace.GoalsCalendarBackupService.validateDocuments(goals, calendar);
    if (!validation.valid) {
      throw importError(
        "IMPORT_READBACK_VALIDATION_FAILED",
        "Imported Goals and Calendar failed read-back validation.",
        validation.errors
      );
    }
    const parity = await namespace.BackupParityService.verify({
      expectedDomains: { goals: expected.goals, calendar: expected.calendar },
      expectedMedia: [],
      restored: {
        stores: { goals: validation.goals, calendar: validation.calendar },
        media: []
      }
    }, {
      checksumService: options?.checksumService,
      cryptoApi: options?.cryptoApi
    });
    if (!parity.valid) {
      throw importError("IMPORT_READBACK_PARITY_FAILED", "Imported Goals and Calendar failed parity.", parity.errors);
    }
    return { goals: validation.goals, calendar: validation.calendar, parity };
  }

  async function importValidatedArchive(archive, storageValue, options) {
    const storage = requireStorage(storageValue);
    if (!archive || archive.status !== "valid") {
      throw importError("VALIDATED_ARCHIVE_REQUIRED", "A validated ZIP archive is required.");
    }
    if (typeof options?.backupCurrentState !== "function") {
      throw importError("PRE_IMPORT_BACKUP_REQUIRED", "A complete ZIP backup is required before import.");
    }

    const target = namespace.IsolatedRestoreService.createMemoryRestoreTarget();
    const restored = await namespace.IsolatedRestoreService.restoreIntoEmptyTarget(
      archive,
      target,
      { fflate: options.fflate }
    );
    const goals = restored.stores.goals;
    const calendar = restored.stores.calendar;
    if (!goals || !calendar) {
      throw importError("IMPORT_GOALS_CALENDAR_REQUIRED", "The backup must contain both Goals and Calendar domains.");
    }

    const keys = namespace.GoalsCalendarBackupService.keys;
    const previousRaw = {
      [keys.goals]: storage.getItem(keys.goals),
      [keys.calendar]: storage.getItem(keys.calendar)
    };
    const backupArtifact = await options.backupCurrentState({
      storage,
      keys,
      previousRaw: { ...previousRaw }
    });
    const previousArchive = await validatedBackupArchive(backupArtifact, options);
    await verifyRawBackup(previousRaw, previousArchive, options);

    try {
      storage.setItem(keys.goals, JSON.stringify(goals));
      storage.setItem(keys.calendar, JSON.stringify(calendar));
      const verified = await verifyReadBack(storage, { goals, calendar }, {
        ...options,
        keys
      });
      return {
        status: "imported",
        previousBackup: {
          backupFormat: previousArchive.manifest.backupFormat,
          backupVersion: previousArchive.manifest.backupVersion,
          createdAt: previousArchive.manifest.createdAt
        },
        goals: verified.goals,
        calendar: verified.calendar,
        parity: verified.parity
      };
    } catch (writeError) {
      const rollbackErrors = restoreRawState(storage, previousRaw, keys);
      if (rollbackErrors.length) {
        throw importError(
          "DATA_RECOVERY_REQUIRED",
          "Goals and Calendar import rollback failed.",
          {
            writeError: writeError?.code || writeError?.name || "IMPORT_WRITE_FAILED",
            rollbackErrors
          }
        );
      }
      throw importError(
        "IMPORT_WRITE_FAILED",
        "Goals and Calendar import failed and the previous state was restored.",
        { causeCode: writeError?.code || writeError?.name || "IMPORT_WRITE_FAILED" }
      );
    }
  }

  namespace.LocalStorageImportService = Object.freeze({
    importValidatedArchive,
    verifyRawBackup
  });
})(typeof window !== "undefined" ? window : globalThis);
