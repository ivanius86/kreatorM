(function attachMigrationCheckpointService(root) {
  "use strict";

  const namespace = root.MentorIndexedDB = root.MentorIndexedDB || {};
  const StateMachine = namespace.MigrationStateMachine;
  const TransactionHelper = namespace.TransactionHelper;

  if (!StateMachine || !TransactionHelper) {
    throw new Error(
      "MigrationStateMachine and TransactionHelper must be loaded before MigrationCheckpointService."
    );
  }

  const META_KEYS = Object.freeze({
    DATABASE_SCHEMA_VERSION: "database-schema-version",
    DATA_SCHEMA_VERSION: "data-schema-version",
    ROOT_MIGRATION: "migration:legacy-to-idb-v1",
    ACTIVE_ADAPTER: "cutover:active-adapter"
  });

  class MigrationCheckpointService {
    constructor(database) {
      if (!database || typeof database.table !== "function") {
        throw new TypeError("A Dexie database instance is required.");
      }

      this.database = database;
    }

    async get(key) {
      return this.database.table("meta").get(key);
    }

    async ensure(key, details) {
      if (!key) {
        throw new TypeError("Checkpoint key is required.");
      }

      return TransactionHelper.run(
        this.database,
        "rw",
        ["meta"],
        async ({ table }) => {
          const meta = table("meta");
          const existing = await meta.get(key);
          if (existing) {
            return existing;
          }

          const initial = StateMachine.createInitial(key, details);
          await meta.put(initial);
          return initial;
        }
      );
    }

    async transition(key, nextStatus, details) {
      if (!key) {
        throw new TypeError("Checkpoint key is required.");
      }

      return TransactionHelper.run(
        this.database,
        "rw",
        ["meta"],
        async ({ table }) => {
          const meta = table("meta");
          const current = await meta.get(key);
          if (!current) {
            const error = new Error(`Migration checkpoint does not exist: ${key}`);
            error.code = "MIGRATION_CHECKPOINT_NOT_FOUND";
            throw error;
          }

          const next = StateMachine.createNext(current, nextStatus, details);
          await meta.put(next);
          return next;
        }
      );
    }

    async replaceDomainAndCheckpoint(storeName, records, key, details) {
      const current = await this.get(key);
      if (!current) {
        const error = new Error(`Migration checkpoint does not exist: ${key}`);
        error.code = "MIGRATION_CHECKPOINT_NOT_FOUND";
        throw error;
      }

      StateMachine.assertTransition(
        current.status,
        StateMachine.STATUS.IMPORTED
      );

      const imported = StateMachine.createNext(
        current,
        StateMachine.STATUS.IMPORTED,
        Object.assign({}, details || {}, {
          importedRecordCount: Array.isArray(records) ? records.length : 0
        })
      );

      await TransactionHelper.replaceStoreAndPutMeta(
        this.database,
        storeName,
        records,
        imported
      );

      return imported;
    }

    async putVersionMarker(key, version, details) {
      if (!Object.values(META_KEYS).includes(key)) {
        throw new TypeError(`Unsupported metadata marker: ${String(key)}`);
      }

      const record = Object.assign({}, details || {}, {
        key,
        version,
        updatedAt: new Date().toISOString()
      });
      await this.database.table("meta").put(record);
      return record;
    }
  }

  namespace.MigrationCheckpointService = MigrationCheckpointService;
  namespace.MigrationMetaKeys = META_KEYS;
})(typeof globalThis !== "undefined" ? globalThis : window);
