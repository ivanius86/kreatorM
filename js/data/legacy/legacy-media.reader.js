(function (root) {
  "use strict";

  const namespace = root.MentorDataPhase0 = root.MentorDataPhase0 || {};

  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
    });
  }

  async function readAllFromStore(store) {
    if (typeof store.getAll === "function") return requestResult(store.getAll());
    return new Promise((resolve, reject) => {
      const records = [];
      const request = store.openCursor();
      request.onerror = () => reject(request.error || new Error("IndexedDB cursor failed."));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return resolve(records);
        records.push(cursor.value);
        cursor.continue();
      };
    });
  }

  async function readExistingMediaDatabase(indexedDbApi, source) {
    const descriptor = source || namespace.LegacyStorageRegistry?.indexedDbSources?.[0];
    if (!indexedDbApi || typeof indexedDbApi.open !== "function") {
      return { status: "unavailable", records: [], errorCode: "INDEXEDDB_UNAVAILABLE" };
    }
    if (typeof indexedDbApi.databases !== "function") {
      return { status: "unsupported", records: [], errorCode: "READ_ONLY_DATABASE_DISCOVERY_UNAVAILABLE" };
    }

    let databases;
    try {
      databases = await indexedDbApi.databases();
    } catch (error) {
      return { status: "failed", records: [], errorCode: error?.name || "DATABASE_DISCOVERY_FAILED" };
    }
    if (!databases.some((item) => item?.name === descriptor.database)) {
      return { status: "absent", records: [], database: descriptor.database, store: descriptor.store };
    }

    return new Promise((resolve) => {
      const openRequest = indexedDbApi.open(descriptor.database);
      let settled = false;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };
      openRequest.onerror = () => finish({
        status: "failed",
        records: [],
        errorCode: openRequest.error?.name || "DATABASE_OPEN_FAILED"
      });
      openRequest.onupgradeneeded = () => {
        openRequest.transaction?.abort?.();
        openRequest.result?.close?.();
        finish({ status: "failed", records: [], errorCode: "UNEXPECTED_DATABASE_UPGRADE" });
      };
      openRequest.onsuccess = async () => {
        const database = openRequest.result;
        try {
          if (!database.objectStoreNames.contains(descriptor.store)) {
            finish({ status: "missingStore", records: [], database: descriptor.database, store: descriptor.store });
            return;
          }
          const transaction = database.transaction(descriptor.store, "readonly");
          const records = await readAllFromStore(transaction.objectStore(descriptor.store));
          finish({ status: "ok", records, database: descriptor.database, store: descriptor.store });
        } catch (error) {
          finish({ status: "failed", records: [], errorCode: error?.name || "MEDIA_READ_FAILED" });
        } finally {
          database.close();
        }
      };
    });
  }

  namespace.LegacyMediaReader = Object.freeze({ readExistingMediaDatabase });
})(typeof window !== "undefined" ? window : globalThis);
