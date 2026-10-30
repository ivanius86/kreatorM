(function (root) {
  "use strict";

  const idb = root.MentorIndexedDB = root.MentorIndexedDB || {};

  function fail(code, message, details) {
    const error = new Error(message);
    error.code = code;
    error.details = details || null;
    throw error;
  }

  function requireRuntime(database) {
    if (!database?.table || !database?.transaction) {
      fail("INDEXEDDB_DATABASE_REQUIRED", "An open Dexie database is required.");
    }
    if (!idb.IndexedDbBackupService || !idb.MutationFreezeService ||
        !idb.CrossTabCoordinationService) {
      fail("INDEXEDDB_RESTORE_RUNTIME_UNAVAILABLE", "IndexedDB restore services are not loaded.");
    }
    if (typeof root.Dexie?.waitFor !== "function") {
      fail("DEXIE_WAIT_FOR_UNAVAILABLE", "Dexie.waitFor is required for transactional read-back parity.");
    }
  }

  function clone(value) {
    if (value == null) return value;
    return typeof structuredClone === "function"
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  }

  async function transactionalReplace(database, stores, options) {
    const names = [...idb.SchemaV1.storeNames];
    return idb.TransactionHelper.run(
      database,
      "rw",
      names,
      async ({ table }) => {
        const coordination = idb.CrossTabCoordinationService;
        const currentEpoch = await table("meta").get(
          coordination.EPOCH_KEY
        );
        const targetEpoch = (stores.meta || []).find(
          (record) => record.key === coordination.EPOCH_KEY
        );
        if (options.requireEpochIncrement === true &&
            Number(targetEpoch?.revision) !==
              Number(currentEpoch?.revision || 0) + 1) {
          fail(
            "INDEXEDDB_EPOCH_INCREMENT_REQUIRED",
            "Coordinated replacement must increment the persisted data epoch.",
            {
              currentEpoch: Number(currentEpoch?.revision || 0),
              targetEpoch: Number(targetEpoch?.revision || 0)
            }
          );
        }
        for (const name of names) await table(name).clear();
        for (const name of names) {
          const records = stores[name] || [];
          if (records.length) await table(name).bulkPut(records);
        }
        const readBack = {};
        for (const name of names) readBack[name] = await table(name).toArray();
        const parity = await root.Dexie.waitFor(
          idb.IndexedDbBackupService.compareStores(
            stores,
            readBack,
            { cryptoApi: options.cryptoApi }
          )
        );
        if (!parity.valid) {
          fail(
            "INDEXEDDB_RESTORE_READBACK_PARITY_FAILED",
            "Restored IndexedDB data failed transactional read-back parity.",
            parity
          );
        }
        idb.IndexedDbBackupService.assertCutoverMeta(readBack);
        return parity;
      }
    );
  }

  async function restoreUnlocked(database, zipValue, options) {
    const incoming = await idb.IndexedDbBackupService.validateArchive(
      zipValue,
      options
    );

    const preActionBackup = await idb.IndexedDbBackupService.createCompleteBackup(
      database,
      {
        ...options,
        alreadyFrozen: true,
        allowRecoveryRequired: true
      }
    );
    const validatedPreAction = await idb.IndexedDbBackupService.validateArchive(
      preActionBackup.bytes,
      { ...options, allowRecoveryRequired: true }
    );
    const currentParity = await idb.IndexedDbBackupService.snapshotParity(
      database,
      validatedPreAction.stores,
      options
    );
    if (!currentParity.valid) {
      fail(
        "INDEXEDDB_PRE_ACTION_BACKUP_PARITY_FAILED",
        "The mandatory pre-action backup does not match the current database.",
        currentParity
      );
    }

    const targetStores = Object.fromEntries(
      idb.SchemaV1.storeNames.map((name) => [name, clone(incoming.stores[name])])
    );
    const currentEpoch = await idb.CrossTabCoordinationService.readEpoch(
      database
    );
    const nextEpoch = {
      key: idb.CrossTabCoordinationService.EPOCH_KEY,
      revision: currentEpoch.revision + 1,
      reason: "indexeddb-restore",
      updatedAt: new Date().toISOString()
    };
    targetStores.meta = [
      ...targetStores.meta.filter((record) =>
        record.key !== idb.CrossTabCoordinationService.EPOCH_KEY
      ),
      nextEpoch
    ];
    const parity = await transactionalReplace(database, targetStores, {
      ...options,
      requireEpochIncrement: true
    });
    const finalParity = await idb.IndexedDbBackupService.snapshotParity(
      database,
      targetStores,
      options
    );
    if (!finalParity.valid) {
      fail(
        "INDEXEDDB_RESTORE_POST_COMMIT_PARITY_FAILED",
        "Restored data changed after the coordinated transaction.",
        finalParity
      );
    }

    const result = {
      status: "restored",
      restoredAt: new Date().toISOString(),
      sourceCreatedAt: incoming.manifest.createdAt,
      sourceManifest: incoming.manifest,
      preActionBackup,
      parity,
      dataEpoch: nextEpoch.revision
    };
    idb.CrossTabCoordinationService.announceEpoch(nextEpoch, {
      source: "restore",
      requireReload: true
    });
    if (typeof root.dispatchEvent === "function" &&
        typeof root.CustomEvent === "function") {
      root.dispatchEvent(new root.CustomEvent("mentor:indexeddb-restored", {
        detail: {
          restoredAt: result.restoredAt,
          sourceCreatedAt: result.sourceCreatedAt
        }
      }));
    }
    return result;
  }

  function restore(database, zipValue, options = {}) {
    requireRuntime(database);
    return idb.CrossTabCoordinationService.withExclusive(
      options.reason || "indexeddb-import-restore",
      () => idb.MutationFreezeService.withFreeze(
        options.reason || "indexeddb-import-restore",
        () => restoreUnlocked(database, zipValue, options)
      )
    );
  }

  idb.IndexedDbRestoreService = Object.freeze({
    restore,
    transactionalReplace
  });
})(typeof window !== "undefined" ? window : globalThis);
