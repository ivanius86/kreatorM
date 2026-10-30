(function (root) {
  "use strict";

  const namespace = root.MentorIndexedDB = root.MentorIndexedDB || {};

  function requireDatabase(database) {
    if (!database || typeof database.table !== "function" || typeof database.transaction !== "function") {
      const error = new Error("A Dexie database instance is required.");
      error.code = "DEXIE_DATABASE_REQUIRED";
      throw error;
    }
    return database;
  }

  function requireStores(database, storeNames) {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    if (!names.length || names.some((name) => !String(name || ""))) {
      const error = new Error("At least one transaction store is required.");
      error.code = "DEXIE_TRANSACTION_STORE_REQUIRED";
      throw error;
    }
    const available = new Set(database.tables.map((table) => table.name));
    names.forEach((name) => {
      if (!available.has(name)) {
        const error = new Error(`Unknown IndexedDB store: ${name}`);
        error.code = "DEXIE_STORE_UNKNOWN";
        error.details = { storeName: name };
        throw error;
      }
    });
    return names;
  }

  function run(databaseValue, mode, storeNames, operation) {
    const database = requireDatabase(databaseValue);
    if (!["r", "rw"].includes(mode)) {
      const error = new Error("Transaction mode must be r or rw.");
      error.code = "DEXIE_TRANSACTION_MODE_INVALID";
      throw error;
    }
    if (typeof operation !== "function") {
      const error = new Error("A transaction operation is required.");
      error.code = "DEXIE_TRANSACTION_OPERATION_REQUIRED";
      throw error;
    }
    const names = requireStores(database, storeNames);
    const tables = names.map((name) => database.table(name));
    return database.transaction(mode, ...tables, () => operation({
      database,
      table(name) {
        if (!names.includes(name)) {
          const error = new Error(`Store is outside this transaction: ${name}`);
          error.code = "DEXIE_TRANSACTION_STORE_OUT_OF_SCOPE";
          throw error;
        }
        return database.table(name);
      }
    }));
  }

  function replaceStore(database, storeName, records) {
    const next = Array.isArray(records) ? records : [];
    return run(database, "rw", [storeName], async ({ table }) => {
      const target = table(storeName);
      await target.clear();
      if (next.length) await target.bulkPut(next);
      return target.toArray();
    });
  }

  function replaceStoreAndPutMeta(database, storeName, records, metaRecord) {
    if (!metaRecord?.key) {
      const error = new Error("A keyed meta checkpoint is required.");
      error.code = "MIGRATION_CHECKPOINT_KEY_REQUIRED";
      throw error;
    }
    const next = Array.isArray(records) ? records : [];
    return run(database, "rw", [storeName, "meta"], async ({ table }) => {
      const target = table(storeName);
      await target.clear();
      if (next.length) await target.bulkPut(next);
      await table("meta").put(metaRecord);
      return {
        records: await target.toArray(),
        checkpoint: await table("meta").get(metaRecord.key)
      };
    });
  }

  namespace.TransactionHelper = Object.freeze({
    run,
    replaceStore,
    replaceStoreAndPutMeta
  });
})(typeof window !== "undefined" ? window : globalThis);
