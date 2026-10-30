(function (root) {
  "use strict";

  const idb = root.MentorIndexedDB = root.MentorIndexedDB || {};
  const RESET_TOKEN = "RESET_INDEXEDDB";
  const IMPORT_TOKEN = "IMPORT_INDEXEDDB_BACKUP";
  const RECOVERY_RETRY_TOKEN = "RETRY_INDEXEDDB_RECOVERY";
  const CANONICAL_STORES = Object.freeze(
    (idb.SchemaV1?.storeNames || []).filter((name) =>
      !["meta", "legacyBackups"].includes(name)
    )
  );

  function fail(code, message, details) {
    const error = new Error(message);
    error.code = code;
    error.details = details || null;
    throw error;
  }

  function database() {
    const value = root.MentorData?.database;
    if (!value) fail("INDEXEDDB_DATABASE_NOT_READY", "IndexedDB is not ready.");
    return value;
  }

  async function readyDatabase(options = {}) {
    if (root.MentorData?.repositorySelectionPromise) {
      try {
        await root.MentorData.repositorySelectionPromise;
      } catch (error) {
        if (options.allowRecovery !== true) throw error;
      }
    }
    return database();
  }

  function active() {
    // As soon as the v1 database runtime exists, legacy admin operations are
    // no longer a safe fallback, including while selection/migration is pending.
    return Boolean(root.MentorData?.database);
  }

  function binaryPreview(value) {
    if (typeof Blob !== "undefined" && value instanceof Blob) {
      return { kind: "Blob", type: value.type || "", byteSize: value.size };
    }
    if (value instanceof ArrayBuffer) {
      return { kind: "ArrayBuffer", byteSize: value.byteLength };
    }
    if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(value)) {
      return { kind: value.constructor?.name || "TypedArray", byteSize: value.byteLength };
    }
    if (Array.isArray(value)) return value.map(binaryPreview);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [
        key,
        binaryPreview(item)
      ]));
    }
    return value;
  }

  async function viewerSnapshot(options = {}) {
    const stores = await idb.IndexedDbBackupService.captureSnapshot(
      await readyDatabase({ allowRecovery: true })
    );
    const rowLimit = Number(options.rowLimit || 100);
    return {
      sourceMode: "indexeddb",
      database: {
        name: idb.SchemaV1.databaseName,
        structuralVersion: idb.SchemaV1.structuralVersion,
        dataVersion: idb.SchemaV1.dataVersion
      },
      generatedAt: new Date().toISOString(),
      stores: Object.fromEntries(idb.SchemaV1.storeNames.map((name) => [
        name,
        {
          count: stores[name].length,
          rows: stores[name].slice(0, rowLimit).map(binaryPreview),
          truncated: stores[name].length > rowLimit
        }
      ]))
    };
  }

  function downloadArtifact(artifact) {
    if (!artifact?.blob || !root.document) return false;
    const url = URL.createObjectURL(artifact.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = artifact.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return true;
  }

  function scheduleReload(options) {
    if (options?.reloadAfterSuccess === false ||
        typeof root.location?.reload !== "function") return false;
    root.setTimeout?.(() => root.location.reload(), 0);
    return true;
  }

  async function markVerifiedBackup(artifact) {
    const db = await readyDatabase();
    return idb.CrossTabCoordinationService.withShared(
      "record-verified-backup",
      async () => {
        const lease = await idb.MutationFreezeService.beginMutation();
        try {
          await idb.TransactionHelper.run(
            db,
            "rw",
            ["meta"],
            async ({ table }) => {
              idb.CrossTabCoordinationService.assertWritableEpoch(
                await table("meta").get(
                  idb.CrossTabCoordinationService.EPOCH_KEY
                )
              );
              await table("meta").put({
                key: "backup:indexeddb:last-verified",
                sourceMode: "indexeddb",
                createdAt: artifact.createdAt,
                verifiedAt: new Date().toISOString(),
                filename: artifact.filename,
                byteSize: artifact.byteSize,
                storeCount: artifact.parity?.storeCount || 0,
                recordCount: artifact.parity?.recordCount || 0,
                mediaRecordCount: artifact.parity?.mediaRecordCount || 0
              });
            }
          );
        } finally {
          lease.release();
        }
      }
    );
  }

  async function exportBackup(options = {}) {
    const db = await readyDatabase({ allowRecovery: true });
    const artifact = await idb.IndexedDbBackupService.createCompleteBackup(
      db,
      {
        ...options,
        allowRecoveryRequired: options.allowRecoveryRequired !== false
      }
    );
    if (
      !root.MentorData?.storageSelectionError &&
      !idb.CrossTabCoordinationService.getState().reloadRequired
    ) {
      try {
        await markVerifiedBackup(artifact);
      } catch (error) {
        if (error?.code !== "INDEXEDDB_EPOCH_MISMATCH") throw error;
      }
    }
    if (options.download !== false) downloadArtifact(artifact);
    return artifact;
  }

  async function importBackup(zipValue, options = {}) {
    if (options.confirmationToken !== IMPORT_TOKEN) {
      fail(
        "INDEXEDDB_IMPORT_CONFIRMATION_REQUIRED",
        `Import requires confirmationToken "${IMPORT_TOKEN}".`
      );
    }
    const result = await idb.IndexedDbRestoreService.restore(
      await readyDatabase({ allowRecovery: true }),
      zipValue,
      options
    );
    if (options.downloadPreActionBackup !== false) {
      downloadArtifact(result.preActionBackup);
    }
    result.reloadScheduled = scheduleReload(options);
    return result;
  }

  function emptyNutritionStores(timestamp) {
    return {
      nutritionFoodData: [{
        id: "current",
        envelope: {
          version: 1,
          updatedAt: timestamp,
          userFoods: [],
          userFoodNutrients: [],
          userFoodPortions: [],
          userSources: []
        }
      }],
      nutritionInventoryData: [{
        id: "current",
        envelope: {
          version: 1,
          updatedAt: timestamp,
          batches: [],
          locations: [],
          allocations: [],
          preferences: [],
          stores: [],
          recipes: [],
          mealPlanEntries: [],
          shoppingItems: [],
          migrations: []
        }
      }]
    };
  }

  async function resetDatabase(options = {}) {
    if (options.confirmationToken !== RESET_TOKEN ||
        options.explicitlyAllowDestructiveReset !== true) {
      fail(
        "INDEXEDDB_RESET_CONFIRMATION_REQUIRED",
        `Reset requires confirmationToken "${RESET_TOKEN}" and explicitlyAllowDestructiveReset=true.`
      );
    }
    if (typeof options.confirmPreActionBackup !== "function") {
      fail(
        "INDEXEDDB_RESET_BACKUP_ACK_REQUIRED",
        "Reset requires a confirmPreActionBackup callback."
      );
    }
    const db = await readyDatabase({ allowRecovery: true });
    return idb.CrossTabCoordinationService.withExclusive(
      "indexeddb-destructive-reset",
      () => idb.MutationFreezeService.withFreeze(
        "indexeddb-destructive-reset",
        async () => {
        const preActionBackup = await idb.IndexedDbBackupService.createCompleteBackup(
          db,
          {
            ...options,
            alreadyFrozen: true,
            allowRecoveryRequired: true
          }
        );
        await idb.IndexedDbBackupService.validateArchive(
          preActionBackup.bytes,
          { ...options, allowRecoveryRequired: true }
        );
        if (await options.confirmPreActionBackup(preActionBackup) !== true) {
          fail(
            "INDEXEDDB_RESET_BACKUP_NOT_ACKNOWLEDGED",
            "The complete pre-action backup was not acknowledged; reset was cancelled."
          );
        }

        const before = await idb.IndexedDbBackupService.captureSnapshot(db);
        const timestamp = new Date().toISOString();
        const emptyNutrition = emptyNutritionStores(timestamp);
        const target = {
          ...before,
          ideas: [],
          financeDocuments: [],
          assets: [],
          comparisons: [],
          cache: [],
          goals: [],
          calendarEvents: [],
          media: [],
          nutritionFoodData: emptyNutrition.nutritionFoodData,
          nutritionInventoryData: emptyNutrition.nutritionInventoryData,
          settings: before.settings
        };
        target.meta = [
          ...before.meta.filter((record) => record.key !== "admin:indexeddb:last-reset"),
          {
            key: "admin:indexeddb:last-reset",
            resetAt: timestamp,
            preActionBackupCreatedAt: preActionBackup.createdAt,
            sourceMode: "indexeddb",
            legacySourcesDeleted: false
          }
        ];
        const currentEpoch = await idb.CrossTabCoordinationService.readEpoch(
          db
        );
        const nextEpoch = {
          key: idb.CrossTabCoordinationService.EPOCH_KEY,
          revision: currentEpoch.revision + 1,
          reason: "indexeddb-reset",
          updatedAt: timestamp
        };
        target.meta = [
          ...target.meta.filter((record) =>
            record.key !== idb.CrossTabCoordinationService.EPOCH_KEY
          ),
          nextEpoch
        ];

        const parity = await idb.IndexedDbRestoreService.transactionalReplace(
          db,
          target,
          { ...options, requireEpochIncrement: true }
        );
        idb.CrossTabCoordinationService.announceEpoch(nextEpoch, {
          source: "reset",
          requireReload: true
        });
        const result = {
          status: "reset",
          resetAt: timestamp,
          preActionBackup,
          parity,
          legacySourcesDeleted: false,
          dataEpoch: nextEpoch.revision
        };
        result.reloadScheduled = scheduleReload(options);
        return result;
      })
    );
  }

  async function legacyCleanupEligibility(options = {}) {
    const meta = (await readyDatabase({ allowRecovery: true })).table("meta");
    const verifiedBackup = await meta.get("backup:indexeddb:last-verified");
    const stableAt = options.stableReleaseAt
      ? new Date(options.stableReleaseAt)
      : null;
    const stableDays = stableAt && !Number.isNaN(stableAt.getTime())
      ? Math.floor((Date.now() - stableAt.getTime()) / 86400000)
      : 0;
    const checks = {
      stableReleaseDeclared: Boolean(options.stableReleaseVersion && stableAt),
      stableForAtLeast30Days: stableDays >= 30,
      completeIndexedDbBackupVerified: Boolean(
        verifiedBackup?.sourceMode === "indexeddb" &&
        verifiedBackup?.verifiedAt
      ),
      manualCleanupConfirmationRequired: true,
      manualCleanupConfirmed: options.manualConfirmation === true
    };
    return {
      eligible: Object.values(checks).every(Boolean),
      checks,
      stableDays,
      verifiedBackup: verifiedBackup || null,
      actionPerformed: false,
      note: "Status only. No legacy cleanup API is exposed."
    };
  }

  function recoveryDomains(target) {
    return {
      settings: ["settings"],
      "goals-calendar": ["goals", "calendar"],
      "ideas-comparisons": ["ideas", "comparisons"],
      "finance-assets": ["finance", "assets"],
      "nutrition-envelopes": [
        "nutritionFoodData",
        "nutritionInventoryData"
      ],
      "nutrition-media": ["media"]
    }[target] || null;
  }

  function createStorageOverlay(repairedSources) {
    const repairs = repairedSources || {};
    return {
      getItem(key) {
        if (Object.prototype.hasOwnProperty.call(repairs, key)) {
          const value = repairs[key];
          return value === null || value === undefined
            ? null
            : String(value);
        }
        return root.localStorage?.getItem(key) ?? null;
      }
    };
  }

  async function retryRecovery(options = {}) {
    if (options.confirmationToken !== RECOVERY_RETRY_TOKEN) {
      fail(
        "RECOVERY_RETRY_CONFIRMATION_REQUIRED",
        `Recovery retry requires confirmationToken "${RECOVERY_RETRY_TOKEN}".`
      );
    }
    const domains = recoveryDomains(options.target);
    if (!domains) {
      fail("RECOVERY_RETRY_TARGET_INVALID", "Recovery retry target is invalid.");
    }
    if (typeof options.confirmRecoveryBackup !== "function") {
      fail(
        "RECOVERY_RETRY_BACKUP_ACK_REQUIRED",
        "Recovery retry requires confirmation of a newly exported complete raw backup."
      );
    }
    const hasRepairs = options.repairedSources &&
      Object.keys(options.repairedSources).length > 0;
    if (!hasRepairs && options.useCurrentSources !== true &&
        !options.mediaRead) {
      fail(
        "RECOVERY_REPAIRED_SOURCE_REQUIRED",
        "Provide repairedSources, mediaRead, or explicitly select useCurrentSources."
      );
    }

    const db = await readyDatabase({ allowRecovery: true });
    return idb.CrossTabCoordinationService.withExclusive(
      `recovery-retry:${options.target}`,
      () => idb.MutationFreezeService.withFreeze(
        `recovery-retry:${options.target}`,
        async () => {
          const safetyBackup =
            await idb.IndexedDbBackupService.createCompleteBackup(
              db,
              {
                ...options,
                alreadyFrozen: true,
                allowRecoveryRequired: true
              }
            );
          await idb.IndexedDbBackupService.validateArchive(
            safetyBackup.bytes,
            { ...options, allowRecoveryRequired: true }
          );
          const backupDownloaded = options.downloadRecoveryBackup !== false
            ? downloadArtifact(safetyBackup)
            : false;
          if (await options.confirmRecoveryBackup(
            safetyBackup,
            { downloaded: backupDownloaded }
          ) !== true) {
            fail(
              "RECOVERY_RETRY_BACKUP_NOT_ACKNOWLEDGED",
              "Recovery retry was cancelled because the complete raw backup was not acknowledged."
            );
          }

          const storage = createStorageOverlay(options.repairedSources);
          const validation =
            await idb.LegacyToIndexedDbService.validateRecoveryCandidate({
              ...options,
              target: options.target,
              database: db,
              storage,
              legacyIndexedDB: options.legacyIndexedDB || root.indexedDB,
              mediaRead: options.mediaRead
            });

          const constants = idb.LegacyToIndexedDbService.constants;
          const timestamp = new Date().toISOString();
          await idb.TransactionHelper.run(
            db,
            "rw",
            ["meta"],
            async ({ table }) => {
              const meta = table("meta");
              const checkpoints = await Promise.all(domains.map(
                (domain) => meta.get(constants.DOMAIN_KEYS[domain])
              ));
              const markers = await Promise.all(domains.map(
                (domain) => meta.get(constants.CUTOVER_KEYS[domain])
              ));
              const globalMarker = await meta.get(
                constants.CUTOVER_KEYS.global
              );
              const recoveryMemberCount = checkpoints.filter(
                (checkpoint) => checkpoint?.status ===
                  idb.MigrationStateMachine.STATUS.RECOVERY_REQUIRED
              ).length;
              if (recoveryMemberCount === 0) {
                fail(
                  "RECOVERY_RETRY_CHECKPOINT_NOT_REQUIRED",
                  "Atomic group retry requires at least one recoveryRequired checkpoint.",
                  {
                    target: options.target,
                    checkpoints: checkpoints.map((checkpoint) => ({
                      key: checkpoint?.key || null,
                      status: checkpoint?.status || null
                    }))
                  }
                );
              }
              const unsafeMembers = domains.flatMap((domain, index) => {
                const checkpoint = checkpoints[index];
                const marker = markers[index];
                const reasons = [];
                if (
                  !checkpoint ||
                  !idb.MigrationStateMachine.isKnownStatus(
                    checkpoint.status
                  )
                ) {
                  reasons.push("CHECKPOINT_MISSING_OR_INVALID");
                }
                if (
                  checkpoint?.status ===
                    idb.MigrationStateMachine.STATUS.ACTIVE ||
                  checkpoint?.lastSuccessfulCheckpoint ===
                    idb.MigrationStateMachine.STATUS.ACTIVE ||
                  Boolean(checkpoint?.activatedAt) ||
                  marker?.status === "active" ||
                  Boolean(marker?.activatedAt) ||
                  globalMarker?.domains?.[domain] === "indexeddb"
                ) {
                  reasons.push("DOMAIN_ACTIVE");
                }
                if (
                  checkpoint?.hasIndexedDbWrites === true ||
                  marker?.hasIndexedDbWrites === true ||
                  Boolean(checkpoint?.firstIndexedDbWriteAt) ||
                  Boolean(checkpoint?.lastIndexedDbWriteAt) ||
                  Boolean(marker?.firstIndexedDbWriteAt) ||
                  Boolean(marker?.lastIndexedDbWriteAt)
                ) {
                  reasons.push("INDEXEDDB_WRITES_PRESENT");
                }
                return reasons.length ? [{
                  domain,
                  status: checkpoint?.status || null,
                  markerStatus: marker?.status || null,
                  hasIndexedDbWrites: Boolean(
                    checkpoint?.hasIndexedDbWrites ||
                    marker?.hasIndexedDbWrites ||
                    checkpoint?.firstIndexedDbWriteAt ||
                    checkpoint?.lastIndexedDbWriteAt ||
                    marker?.firstIndexedDbWriteAt ||
                    marker?.lastIndexedDbWriteAt
                  ),
                  reasons
                }] : [];
              });
              if (unsafeMembers.length) {
                fail(
                  "RECOVERY_RETRY_ATOMIC_GROUP_UNSAFE",
                  "Atomic group retry is blocked because a partner is active, missing, or has IndexedDB writes.",
                  { target: options.target, unsafeMembers }
                );
              }
              for (let index = 0; index < domains.length; index += 1) {
                const domain = domains[index];
                const previous = checkpoints[index];
                await meta.put(idb.MigrationStateMachine.createInitial(
                  constants.DOMAIN_KEYS[domain],
                  {
                    domain,
                    migrationId: constants.MIGRATION_ID,
                    migrationVersion: 1,
                    recoveryRetryOfBackupId: previous?.backupId || null,
                    recoveryRetryStartedAt: timestamp
                  },
                  timestamp
                ));
              }
            }
          );

          const result =
            await idb.LegacyToIndexedDbService.rerunRecoveryTarget(
              validation
            );
          const finalCheckpoints = await Promise.all(domains.map(
            (domain) => db.table("meta").get(constants.DOMAIN_KEYS[domain])
          ));
          if (finalCheckpoints.some(
            (checkpoint) => checkpoint?.status !==
              idb.MigrationStateMachine.STATUS.ACTIVE
          )) {
            fail(
              "RECOVERY_RETRY_NOT_ACTIVE",
              "Recovery retry did not reach verified active state.",
              {
                target: options.target,
                checkpoints: finalCheckpoints.map((checkpoint) => ({
                  key: checkpoint?.key || null,
                  status: checkpoint?.status || null,
                  errorCode: checkpoint?.errorCode || null
                }))
              }
            );
          }
          const nextEpoch = await idb.TransactionHelper.run(
            db,
            "rw",
            ["meta"],
            ({ table }) => idb.CrossTabCoordinationService.incrementEpoch(
              table("meta"),
              `recovery-retry:${options.target}`
            )
          );
          idb.CrossTabCoordinationService.announceEpoch(nextEpoch, {
            source: "recovery-retry",
            requireReload: true
          });
          const response = {
            status: "recovery-retried",
            target: options.target,
            safetyBackup,
            safetyBackupDownloaded: backupDownloaded,
            validation: {
              requiredDomains: validation.requiredDomains,
              backupId: validation.backup.backupId
            },
            result,
            dataEpoch: nextEpoch.revision
          };
          response.reloadScheduled = scheduleReload(options);
          return response;
        }
      )
    );
  }

  root.MentorIndexedDbAdmin = Object.freeze({
    isActive: active,
    viewerSnapshot,
    exportBackup,
    importBackup,
    resetDatabase,
    retryRecovery,
    legacyCleanupEligibility,
    constants: Object.freeze({
      RESET_TOKEN,
      IMPORT_TOKEN,
      RECOVERY_RETRY_TOKEN,
      CANONICAL_STORES
    })
  });
})(typeof window !== "undefined" ? window : globalThis);
