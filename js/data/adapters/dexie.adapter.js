(function (root) {
  "use strict";

  const namespace = root.MentorIndexedDB = root.MentorIndexedDB || {};

  function clone(value) {
    if (value === undefined) return undefined;
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  class DexieAdapter {
    constructor(database) {
      if (!database || typeof database.table !== "function") {
        const error = new Error("A Dexie database instance is required.");
        error.code = "DEXIE_DATABASE_REQUIRED";
        throw error;
      }
      this.database = database;
    }

    open() {
      return this.database.open();
    }

    close() {
      this.database.close();
    }

    table(storeName) {
      return this.database.table(storeName);
    }

    transaction(mode, storeNames, operation) {
      return namespace.TransactionHelper.run(this.database, mode, storeNames, operation);
    }

    async get(storeName, key) {
      return clone(await this.table(storeName).get(key));
    }

    async getAll(storeName) {
      return clone(await this.table(storeName).toArray());
    }

    async count(storeName) {
      return this.table(storeName).count();
    }

    async put(storeName, value) {
      const next = clone(value);
      await this.table(storeName).put(next);
      return next;
    }

    async add(storeName, value) {
      const next = clone(value);
      await this.table(storeName).add(next);
      return next;
    }

    async bulkPut(storeName, values) {
      const next = clone(Array.isArray(values) ? values : []);
      if (next.length) await this.table(storeName).bulkPut(next);
      return next;
    }

    async remove(storeName, key) {
      await this.table(storeName).delete(key);
    }

    async clear(storeName) {
      await this.table(storeName).clear();
    }

    async replaceAll(storeName, values) {
      return clone(await namespace.TransactionHelper.replaceStore(this.database, storeName, clone(values || [])));
    }

    async whereEquals(storeName, indexName, value) {
      return clone(await this.table(storeName).where(indexName).equals(value).toArray());
    }

    createRepository(storeName) {
      const adapter = this;
      return Object.freeze({
        initialize: () => adapter.open(),
        getAll: () => adapter.getAll(storeName),
        getById: (id) => adapter.get(storeName, id),
        count: () => adapter.count(storeName),
        create: (record) => adapter.add(storeName, record),
        upsert: (record) => adapter.put(storeName, record),
        replaceAll: (records) => adapter.replaceAll(storeName, records),
        remove: (id) => adapter.remove(storeName, id),
        whereEquals: (indexName, value) => adapter.whereEquals(storeName, indexName, value)
      });
    }
  }

  namespace.DexieAdapter = DexieAdapter;
})(typeof window !== "undefined" ? window : globalThis);
