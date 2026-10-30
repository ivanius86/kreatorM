(function (root) {
  "use strict";

  class LocalStorageAdapter {
    constructor(storage) {
      this.storage = storage || root.localStorage;
      this.updateQueue = Promise.resolve();
    }

    _requireStorage() {
      if (!this.storage) throw new root.MentorDataError("STORAGE_UNAVAILABLE", "localStorage is unavailable.");
      return this.storage;
    }

    async readRaw(key) {
      return this._requireStorage().getItem(String(key));
    }

    async read(key) {
      const raw = await this.readRaw(key);
      if (raw === null || raw === "") return null;
      try { return JSON.parse(raw); }
      catch (_) {
        throw new root.MentorDataError("INVALID_JSON", `Stored value for ${key} is not valid JSON.`, { key: String(key) });
      }
    }

    async write(key, value) {
      const serialized = JSON.stringify(value);
      if (serialized === undefined) throw new root.MentorDataError("UNSERIALIZABLE_VALUE", `Value for ${key} cannot be serialized.`);
      this._requireStorage().setItem(String(key), serialized);
    }

    async writeRaw(key, value) {
      this._requireStorage().setItem(String(key), String(value));
    }

    async remove(key) {
      this._requireStorage().removeItem(String(key));
    }

    update(key, updater, fallback) {
      const operation = this.updateQueue.then(async () => {
        let current = fallback;
        const raw = await this.readRaw(key);
        if (raw !== null && raw !== "") {
          try { current = JSON.parse(raw); }
          catch (_) {
            throw new root.MentorDataError("INVALID_JSON", `Stored value for ${key} is not valid JSON.`, { key: String(key) });
          }
        }
        const next = await updater(current);
        await this.write(key, next);
        return next;
      });
      this.updateQueue = operation.catch(() => undefined);
      return operation;
    }
  }

  root.MentorLocalStorageAdapter = LocalStorageAdapter;
})(typeof window !== "undefined" ? window : globalThis);
