(function (root) {
  "use strict";

  const namespace = root.MentorIndexedDB = root.MentorIndexedDB || {};

  function requireDexie(DexieConstructor) {
    const Dexie = DexieConstructor || root.Dexie;
    if (typeof Dexie !== "function") {
      const error = new Error("The locally installed Dexie constructor is required.");
      error.code = "DEXIE_UNAVAILABLE";
      throw error;
    }
    return Dexie;
  }

  function dispatchLifecycleSignal(type, detail) {
    if (typeof root.dispatchEvent !== "function" || typeof root.CustomEvent !== "function") return;
    root.dispatchEvent(new root.CustomEvent(type, { detail }));
  }

  function buildDatabaseClass(DexieConstructor) {
    const Dexie = requireDexie(DexieConstructor);
    return class KreatormDatabase extends Dexie {
      constructor(options = {}) {
        const schema = options.schema || namespace.SchemaV1;
        const databaseName = options.databaseName || schema.databaseName;
        super(databaseName, {
          indexedDB: options.indexedDB || root.indexedDB,
          IDBKeyRange: options.IDBKeyRange || root.IDBKeyRange,
          addons: options.addons || []
        });
        this.kreatormSchema = schema;
        this.lifecycleState = {
          blocked: false,
          versionChangeRequested: false,
          lastBlockedAt: null,
          lastVersionChangeAt: null
        };
        this.version(schema.structuralVersion).stores(schema.stores);

        this.on("blocked", (event) => {
          const detail = {
            databaseName,
            oldVersion: Number(event?.oldVersion || 0),
            newVersion: event?.newVersion === null ? null : Number(event?.newVersion || 0),
            occurredAt: new Date().toISOString()
          };
          this.lifecycleState.blocked = true;
          this.lifecycleState.lastBlockedAt = detail.occurredAt;
          try { options.onBlocked?.(detail); }
          catch (error) { root.console?.error?.("IndexedDB blocked handler failed.", error); }
          dispatchLifecycleSignal("mentor:indexeddb-blocked", detail);
        });

        this.on("versionchange", (event) => {
          const detail = {
            databaseName,
            oldVersion: Number(event?.oldVersion || 0),
            newVersion: event?.newVersion === null ? null : Number(event?.newVersion || 0),
            occurredAt: new Date().toISOString()
          };
          this.lifecycleState.versionChangeRequested = true;
          this.lifecycleState.lastVersionChangeAt = detail.occurredAt;
          try { options.onVersionChange?.(detail); }
          catch (error) { root.console?.error?.("IndexedDB versionchange handler failed.", error); }
          dispatchLifecycleSignal("mentor:indexeddb-versionchange", detail);
          if (options.closeOnVersionChange !== false) this.close();
        });
      }
    };
  }

  const DefaultKreatormDatabase = root.Dexie ? buildDatabaseClass(root.Dexie) : null;

  function createDatabase(options = {}) {
    const DatabaseClass = options.Dexie && options.Dexie !== root.Dexie
      ? buildDatabaseClass(options.Dexie)
      : DefaultKreatormDatabase || buildDatabaseClass(options.Dexie);
    return new DatabaseClass(options);
  }

  namespace.KreatormDatabase = DefaultKreatormDatabase;
  namespace.buildKreatormDatabaseClass = buildDatabaseClass;
  namespace.createDatabase = createDatabase;
})(typeof window !== "undefined" ? window : globalThis);
