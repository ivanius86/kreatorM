(function () {
  "use strict";

  const DATABASE_KEY = "mentor_database";
  const DATABASE_VERSION = 1;
  const DATABASE_VIEWER_ROW_LIMIT = 20;
  const LEGACY_KEYS = {
    ideas: "mentor_brainstorming_ideas",
    language: "mentor_language",
    financeState: "mentorFinanceStateV1",
    importTemplates: "mentorTransactionImportTemplatesV1",
    assets: "mentorFinanceAssetsV1",
    comparisonSnapshots: "mentorFinancialComparisonSnapshotsV1",
    comparisonOptions: "mentorFinancialComparisonOptionsV1",
    researchCache: "mentorFinancialComparisonResearchCacheV1"
  };
  const COLLECTIONS = ["ideas", "finances", "tests", "comparisons", "assets", "references"];

  function storageT(key, fallback, params) {
    const fullKey = "storage." + key;
    const translated = window.MentorI18n?.t?.(fullKey, params, fallback);
    return translated && translated !== fullKey ? translated : fallback;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function createDefaultDatabase() {
    const createdAt = nowIso();
    return {
      version: DATABASE_VERSION,
      createdAt,
      updatedAt: createdAt,
      ideas: [],
      finances: [],
      tests: [],
      comparisons: [],
      assets: [],
      references: [],
      settings: {
        language: null
      }
    };
  }

  function readJson(key, fallback) {
    try {
      const raw = window.localStorage?.getItem(key);
      if (raw === null || raw === undefined || raw === "") return fallback;
      return JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    window.localStorage?.setItem(key, JSON.stringify(value));
  }

  function clone(value) {
    if (value === undefined) return undefined;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  function normalizeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function extractTestsFromIdeas(ideas) {
    return normalizeArray(ideas).flatMap((idea) => {
      const tests = normalizeArray(idea?.research?.tests);
      return tests.map((test) => ({
        ...test,
        id: test.id || `${idea.id || "idea"}-test-${Date.now()}`,
        ideaId: idea?.id || "",
        ideaTitle: idea?.title || idea?.name || ""
      }));
    });
  }

  function extractReferencesFromIdeas(ideas) {
    return normalizeArray(ideas).flatMap((idea) => {
      const directions = normalizeArray(idea?.research?.directions);
      return directions.flatMap((direction) => normalizeArray(direction?.references).map((reference) => ({
        ...reference,
        id: reference.id || `${idea.id || "idea"}-${direction.id || "direction"}-${Date.now()}`,
        ideaId: idea?.id || "",
        ideaTitle: idea?.title || idea?.name || "",
        directionId: direction?.id || "",
        directionName: direction?.name || direction?.label || ""
      })));
    });
  }

  function createFinanceCollectionFromLegacy() {
    const financeState = readJson(LEGACY_KEYS.financeState, null);
    const importTemplates = readJson(LEGACY_KEYS.importTemplates, []);
    const items = [];
    if (isPlainObject(financeState)) {
      items.push({
        id: "finance-state",
        type: "financeState",
        ...financeState
      });
    }
    if (Array.isArray(importTemplates) && importTemplates.length) {
      items.push({
        id: "transaction-import-templates",
        type: "importTemplates",
        templates: importTemplates
      });
    }
    return items;
  }

  function createAssetCollectionFromLegacy() {
    const assetState = readJson(LEGACY_KEYS.assets, null);
    if (!isPlainObject(assetState)) return [];
    return [
      ...normalizeArray(assetState.assets).map((asset) => ({ ...asset, recordType: "asset" })),
      ...normalizeArray(assetState.debts).map((debt) => ({ ...debt, recordType: "debt" }))
    ];
  }

  function createComparisonCollectionFromLegacy() {
    const snapshots = readJson(LEGACY_KEYS.comparisonSnapshots, []);
    const options = readJson(LEGACY_KEYS.comparisonOptions, []);
    const researchCache = readJson(LEGACY_KEYS.researchCache, {});
    const items = [];
    if (Array.isArray(snapshots) && snapshots.length) {
      items.push(...snapshots.map((snapshot) => ({ ...snapshot, recordType: "snapshot" })));
    }
    if (Array.isArray(options) && options.length) {
      items.push(...options.map((option) => ({ ...option, recordType: "option" })));
    }
    if (isPlainObject(researchCache) && Object.keys(researchCache).length) {
      items.push(...Object.entries(researchCache).map(([id, value]) => ({
        id,
        recordType: "researchCache",
        value
      })));
    }
    return items;
  }

  function createDatabaseFromLegacy() {
    const database = createDefaultDatabase();
    const ideas = readJson(LEGACY_KEYS.ideas, []);
    const language = window.localStorage?.getItem(LEGACY_KEYS.language) || window.localStorage?.getItem("mentorPlanner.language");
    database.ideas = normalizeArray(ideas);
    database.finances = createFinanceCollectionFromLegacy();
    database.tests = extractTestsFromIdeas(database.ideas);
    database.comparisons = createComparisonCollectionFromLegacy();
    database.assets = createAssetCollectionFromLegacy();
    database.references = extractReferencesFromIdeas(database.ideas);
    database.settings.language = ["sr", "en"].includes(language) ? language : null;
    return database;
  }

  function normalizeDatabase(data) {
    const defaults = createDefaultDatabase();
    const source = isPlainObject(data) ? data : {};
    const database = {
      ...defaults,
      ...source,
      version: DATABASE_VERSION,
      settings: {
        ...defaults.settings,
        ...(isPlainObject(source.settings) ? source.settings : {})
      }
    };
    COLLECTIONS.forEach((collection) => {
      database[collection] = normalizeArray(source[collection]);
    });
    database.createdAt = source.createdAt || defaults.createdAt;
    database.updatedAt = source.updatedAt || defaults.updatedAt;
    return database;
  }

  function inspectDatabaseReadState() {
    let raw = null;
    try {
      raw = window.localStorage?.getItem(DATABASE_KEY);
    } catch (error) {
      return {
        status: "unreadable",
        present: null,
        raw: null,
        value: null,
        errorCode: "LEGACY_DATABASE_READ_FAILED"
      };
    }
    if (raw === null || raw === undefined || raw === "") {
      return {
        status: "absent",
        present: false,
        raw: raw ?? null,
        value: null,
        errorCode: null
      };
    }
    try {
      const parsed = JSON.parse(raw);
      if (!isPlainObject(parsed)) {
        return {
          status: "invalid",
          present: true,
          raw,
          value: null,
          errorCode: "LEGACY_DATABASE_OBJECT_REQUIRED"
        };
      }
      const structurallyValid =
        COLLECTIONS.every((collection) => Array.isArray(parsed[collection])) &&
        isPlainObject(parsed.settings);
      if (!structurallyValid) {
        return {
          status: "invalid",
          present: true,
          raw,
          value: null,
          errorCode: "LEGACY_DATABASE_STRUCTURE_INVALID"
        };
      }
      return {
        status: "valid",
        present: true,
        raw,
        value: parsed,
        errorCode: null
      };
    } catch (_) {
      return {
        status: "invalid",
        present: true,
        raw,
        value: null,
        errorCode: "LEGACY_DATABASE_JSON_INVALID"
      };
    }
  }

  function legacyRecoveryError(state) {
    const error = new Error(
      "mentor_database payload is invalid and was preserved for recovery."
    );
    error.code = "LEGACY_DATABASE_RECOVERY_REQUIRED";
    error.details = {
      key: DATABASE_KEY,
      readStatus: state.status,
      errorCode: state.errorCode,
      rawPreserved: state.present === true
    };
    return error;
  }

  function loadDatabase() {
    const state = inspectDatabaseReadState();
    if (state.status === "valid") return normalizeDatabase(state.value);
    if (state.status === "invalid" || state.status === "unreadable") {
      throw legacyRecoveryError(state);
    }
    // Display-only projection. It is never persisted by a read path, allowing
    // migration capture to observe the original legacy sources unchanged.
    return createDatabaseFromLegacy();
  }

  function syncLegacyStorageFromDatabase(database) {
    try {
      writeJson(LEGACY_KEYS.ideas, normalizeArray(database.ideas));
      if (database.settings?.language) {
        window.localStorage?.setItem(LEGACY_KEYS.language, database.settings.language);
      }

      const financeState = normalizeArray(database.finances).find((item) => item?.id === "finance-state" || item?.type === "financeState");
      if (financeState) {
        const { id, type, ...state } = financeState;
        writeJson(LEGACY_KEYS.financeState, state);
      } else {
        window.localStorage?.removeItem(LEGACY_KEYS.financeState);
      }
      const importTemplateRecord = normalizeArray(database.finances).find((item) => item?.id === "transaction-import-templates" || item?.type === "importTemplates");
      if (importTemplateRecord) {
        writeJson(LEGACY_KEYS.importTemplates, normalizeArray(importTemplateRecord.templates));
      } else {
        window.localStorage?.removeItem(LEGACY_KEYS.importTemplates);
      }

      const assetItems = normalizeArray(database.assets);
      writeJson(LEGACY_KEYS.assets, {
        assets: assetItems.filter((item) => item?.recordType !== "debt").map(({ recordType, ...item }) => item),
        debts: assetItems.filter((item) => item?.recordType === "debt").map(({ recordType, ...item }) => item),
        savedAt: nowIso()
      });

      const comparisonItems = normalizeArray(database.comparisons);
      writeJson(LEGACY_KEYS.comparisonSnapshots, comparisonItems.filter((item) => item?.recordType === "snapshot").map(({ recordType, ...item }) => item));
      writeJson(LEGACY_KEYS.comparisonOptions, comparisonItems.filter((item) => item?.recordType === "option").map(({ recordType, ...item }) => item));
      const cache = comparisonItems.filter((item) => item?.recordType === "researchCache").reduce((acc, item) => {
        if (item.id) acc[item.id] = item.value;
        return acc;
      }, {});
      writeJson(LEGACY_KEYS.researchCache, cache);
    } catch (error) {
      console.warn("Legacy localStorage sync failed.", error);
    }
  }

  function saveDatabase(data, options = {}) {
    const readState = inspectDatabaseReadState();
    if (
      ["invalid", "unreadable"].includes(readState.status) &&
      options.allowOverwriteInvalid !== true
    ) {
      throw legacyRecoveryError(readState);
    }
    const database = normalizeDatabase(data);
    database.version = DATABASE_VERSION;
    database.updatedAt = nowIso();
    writeJson(DATABASE_KEY, database);
    if (options.syncLegacy !== false) syncLegacyStorageFromDatabase(database);
    window.dispatchEvent(new CustomEvent("mentor:databasechange", { detail: { database: clone(database) } }));
    return database;
  }

  function getCollection(collectionName) {
    const database = loadDatabase();
    return clone(database[collectionName] || []);
  }

  function setCollection(collectionName, items) {
    if (!COLLECTIONS.includes(collectionName)) return getCollection(collectionName);
    const database = loadDatabase();
    database[collectionName] = normalizeArray(items);
    if (collectionName === "ideas") {
      database.tests = extractTestsFromIdeas(database.ideas);
      database.references = extractReferencesFromIdeas(database.ideas);
    }
    return saveDatabase(database)[collectionName];
  }

  function addItem(collectionName, item) {
    const items = getCollection(collectionName);
    const nextItem = {
      id: item?.id || `${collectionName}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      ...item
    };
    setCollection(collectionName, [...items, nextItem]);
    return nextItem;
  }

  function updateItem(collectionName, id, updatedFields) {
    const items = getCollection(collectionName);
    const nextItems = items.map((item) => String(item?.id) === String(id) ? { ...item, ...updatedFields, id: item.id } : item);
    setCollection(collectionName, nextItems);
    return nextItems.find((item) => String(item?.id) === String(id)) || null;
  }

  function deleteItem(collectionName, id) {
    const items = getCollection(collectionName);
    setCollection(collectionName, items.filter((item) => String(item?.id) !== String(id)));
  }

  function isPostCutoverIndexedDbActive() {
    return Boolean(window.MentorIndexedDbAdmin?.isActive?.());
  }

  function exportDatabase() {
    if (isPostCutoverIndexedDbActive()) {
      const error = new Error("Use MentorIndexedDbAdmin.exportBackup() for the active IndexedDB database.");
      error.code = "INDEXEDDB_ADMIN_API_REQUIRED";
      throw error;
    }
    const database = loadDatabase();
    return JSON.stringify(database, null, 2);
  }

  function validateImportedDatabase(data) {
    if (!isPlainObject(data)) return false;
    return COLLECTIONS.every((collection) => Array.isArray(data[collection])) && isPlainObject(data.settings);
  }

  function importDatabase(file, options) {
    if (isPostCutoverIndexedDbActive()) {
      return window.MentorIndexedDbAdmin.importBackup(file, options || {});
    }
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error("Nije izabran fajl za import."));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result || ""));
          if (!validateImportedDatabase(parsed)) {
            reject(new Error("Backup nema validnu mentor_database strukturu."));
            return;
          }
          const saved = saveDatabase(parsed, { allowOverwriteInvalid: true });
          resolve(saved);
        } catch (error) {
          reject(new Error("JSON fajl nije validan."));
        }
      };
      reader.onerror = () => reject(new Error("Import fajl nije mogao da se procita."));
      reader.readAsText(file);
    });
  }

  function resetDatabase(options) {
    if (isPostCutoverIndexedDbActive()) {
      return window.MentorIndexedDbAdmin.resetDatabase(options || {});
    }
    window.localStorage?.removeItem(DATABASE_KEY);
    return saveDatabase(createDefaultDatabase());
  }

  function updateSettings(fields) {
    const database = loadDatabase();
    database.settings = {
      ...database.settings,
      ...fields
    };
    return saveDatabase(database).settings;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatCellValue(value) {
    if (value === null || value === undefined || value === "") return "<span class=\"database-muted\">-</span>";
    if (Array.isArray(value) || typeof value === "object") {
      const preview = JSON.stringify(value);
      const shortPreview = preview.length > 120 ? `${preview.slice(0, 117)}...` : preview;
      return `<code title="${escapeHtml(preview)}">${escapeHtml(shortPreview)}</code>`;
    }
    return escapeHtml(value);
  }

  function getTableColumns(items) {
    const columns = [];
    normalizeArray(items).forEach((item) => {
      if (!isPlainObject(item)) return;
      Object.keys(item).forEach((key) => {
        if (!columns.includes(key)) columns.push(key);
      });
    });
    return columns.slice(0, 12);
  }

  function isDatabaseViewerVisible() {
    const settingsView = document.getElementById("settingsView");
    const root = document.getElementById("databaseViewerTables");
    return Boolean(root && settingsView && !settingsView.classList.contains("hidden"));
  }

  function renderDatabaseTable(name, items) {
    const rows = normalizeArray(items);
    const visibleRows = rows.slice(0, DATABASE_VIEWER_ROW_LIMIT);
    const columns = getTableColumns(visibleRows);
    if (!rows.length) {
      return [
        `<section class="database-table-card">`,
        `  <div class="database-table-heading"><h3>${escapeHtml(name)}</h3><span>0 zapisa</span></div>`,
        `  <div class="database-empty">Nema zapisa u ovoj tabeli.</div>`,
        `</section>`
      ].join("");
    }

    return [
      `<section class="database-table-card">`,
      `  <div class="database-table-heading"><h3>${escapeHtml(name)}</h3><span>${rows.length} zapisa</span></div>`,
      `  <div class="database-table-scroll">`,
      `    <table class="database-table">`,
      `      <thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>`,
      `      <tbody>${visibleRows.map((row) => `<tr>${columns.map((column) => `<td>${formatCellValue(row?.[column])}</td>`).join("")}</tr>`).join("")}</tbody>`,
      `    </table>`,
      `  </div>`,
      rows.length > DATABASE_VIEWER_ROW_LIMIT ? `  <small class="database-column-note">Prikazano je prvih ${DATABASE_VIEWER_ROW_LIMIT} redova. Show more moze kasnije.</small>` : "",
      columns.length >= 12 ? `  <small class="database-column-note">Prikazano je prvih 12 kolona radi preglednosti.</small>` : "",
      `</section>`
    ].join("");
  }

  function setViewerStatus(message, tone = "neutral") {
    const status = document.getElementById("databaseViewerStatus");
    if (!status) return;
    status.textContent = message || "";
    status.dataset.tone = tone;
  }

  async function renderDatabaseViewer() {
    if (!isDatabaseViewerVisible()) return;
    console.time("init:databaseViewer:render");
    const root = document.getElementById("databaseViewerTables");
    if (!root) {
      console.timeEnd("init:databaseViewer:render");
      return;
    }
    let tableData;
    let metaText;
    if (isPostCutoverIndexedDbActive()) {
      try {
        const snapshot = await window.MentorIndexedDbAdmin.viewerSnapshot({
          rowLimit: DATABASE_VIEWER_ROW_LIMIT
        });
        tableData = Object.entries(snapshot.stores).map(([name, store]) => [
          name,
          store.rows
        ]);
        metaText = [
          snapshot.database.name,
          `schema v${snapshot.database.structuralVersion}`,
          `release ${window.KREATORM_RELEASE?.releaseId || window.MENTOR_APP_VERSION || "unknown"}`,
          `snapshot ${new Date(snapshot.generatedAt).toLocaleString()}`
        ].join(" | ");
      } catch (error) {
        setViewerStatus(
          error.message || "IndexedDB viewer nije mogao da učita snapshot.",
          "danger"
        );
        console.timeEnd("init:databaseViewer:render");
        return;
      }
    } else {
      const database = loadDatabase();
      tableData = [
        ["Ideas", database.ideas],
        ["Finances", database.finances],
        ["Tests", database.tests],
        ["Comparisons", database.comparisons],
        ["Assets", database.assets],
        ["References", database.references],
        ["Settings", [{ id: "settings", ...database.settings }]]
      ];
      metaText = `${DATABASE_KEY} | v${database.version} | updated ${new Date(database.updatedAt).toLocaleString()}`;
    }
    root.innerHTML = tableData.map(([name, items]) => renderDatabaseTable(name, items)).join("");
    const meta = document.getElementById("databaseViewerMeta");
    if (meta) meta.textContent = metaText;
    console.timeEnd("init:databaseViewer:render");
  }

  async function downloadDatabaseBackup() {
    if (isPostCutoverIndexedDbActive()) {
      await window.MentorIndexedDbAdmin.exportBackup({ download: true });
      setViewerStatus(
        storageT("backupReady", "Kompletan IndexedDB ZIP backup je spreman."),
        "success"
      );
      return;
    }
    const date = new Date().toISOString().slice(0, 10);
    const blob = new Blob([exportDatabase()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mentor-backup-${date}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setViewerStatus(storageT("backupReady", "Backup je spreman za preuzimanje."), "success");
  }

  function initDatabaseViewer() {
    console.time("init:databaseViewer:listeners");
    const root = document.getElementById("databaseViewerTables");
    if (!root) {
      console.timeEnd("init:databaseViewer:listeners");
      return;
    }
    document.getElementById("databaseRefreshBtn")?.addEventListener("click", async () => {
      await renderDatabaseViewer();
      setViewerStatus(storageT("viewerRefreshed", "Viewer je osvezen."), "success");
    });
    document.getElementById("databaseExportBtn")?.addEventListener("click", async () => {
      try {
        await downloadDatabaseBackup();
      } catch (error) {
        setViewerStatus(error.message || "Backup nije uspeo.", "danger");
      }
    });
    document.getElementById("databaseImportInput")?.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const indexedDbMode = isPostCutoverIndexedDbActive();
      const confirmed = window.confirm(storageT(
        "importConfirm",
        indexedDbMode
          ? "Import kompletnog IndexedDB ZIP backup-a će zameniti aktivnu bazu. Pre toga će biti napravljen bezbednosni backup. Nastaviti?"
          : "Import JSON backup-a ce zameniti trenutne lokalne podatke. Nastaviti?"
      ));
      if (!confirmed) {
        event.target.value = "";
        return;
      }
      try {
        await importDatabase(file, indexedDbMode ? {
          confirmationToken: "IMPORT_INDEXEDDB_BACKUP"
        } : undefined);
        await renderDatabaseViewer();
        setViewerStatus(
          storageT(
            "importSuccess",
            indexedDbMode
              ? "IndexedDB backup je importovan. Osvežite stranicu da svi moduli ponovo hidriraju stanje."
              : "Backup je importovan."
          ),
          "success"
        );
      } catch (error) {
        setViewerStatus(error.message || storageT("importFailed", "Import nije uspeo."), "danger");
      } finally {
        event.target.value = "";
      }
    });
    document.getElementById("databaseResetBtn")?.addEventListener("click", () => {
      if (isPostCutoverIndexedDbActive()) {
        setViewerStatus(
          "IndexedDB reset nije povezan sa UI dugmetom. Dostupan je samo kroz eksplicitni recovery/admin API uz potvrđen kompletan backup.",
          "danger"
        );
        return;
      }
      const confirmed = window.confirm(storageT("resetConfirm", "Reset ce obrisati mentor_database i vratiti praznu default strukturu. Nastaviti?"));
      if (!confirmed) return;
      resetDatabase();
      renderDatabaseViewer();
      setViewerStatus(storageT("resetSuccess", "Lokalna baza je resetovana."), "success");
    });
    window.addEventListener("mentor:databasechange", () => {
      if (isDatabaseViewerVisible()) renderDatabaseViewer();
    });
    console.timeEnd("init:databaseViewer:listeners");
  }

  function openDatabaseViewer() {
    renderDatabaseViewer();
  }

  function setBackupStatus(message, tone = "neutral") {
    const status = document.getElementById("databaseBackupStatus");
    if (!status) return;
    status.textContent = message || "";
    status.dataset.tone = tone;
  }

  function initDatabaseBackupActions() {
    const exportButton = document.getElementById("databaseExportBtn");
    const importButton = document.getElementById("databaseImportBtn");
    const importInput = document.getElementById("databaseImportInput");

    exportButton?.addEventListener("click", async () => {
      exportButton.disabled = true;
      setBackupStatus(storageT("backupPreparing", "Priprema kompletnog backup-a..."));
      try {
        await downloadDatabaseBackup();
        setBackupStatus(storageT("backupReady", "Backup je spreman za preuzimanje."), "success");
      } catch (error) {
        setBackupStatus(error.message || "Backup nije uspeo.", "danger");
      } finally {
        exportButton.disabled = false;
      }
    });

    importButton?.addEventListener("click", () => {
      importInput?.click();
    });

    importInput?.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const indexedDbMode = isPostCutoverIndexedDbActive();
      const confirmed = window.confirm(storageT(
        indexedDbMode ? "indexedDbImportConfirm" : "importConfirm",
        indexedDbMode
          ? "Import kompletnog IndexedDB ZIP backup-a će zameniti aktivnu bazu. Pre toga će biti napravljen bezbednosni backup. Nastaviti?"
          : "Import JSON backup-a ce zameniti trenutne lokalne podatke. Nastaviti?"
      ));

      if (!confirmed) {
        event.target.value = "";
        return;
      }

      importButton.disabled = true;
      event.target.disabled = true;
      setBackupStatus(storageT("importReading", "Provera i uvoz backup-a..."));
      try {
        await importDatabase(file, indexedDbMode ? {
          confirmationToken: "IMPORT_INDEXEDDB_BACKUP"
        } : undefined);
        setBackupStatus(
          storageT(
            "importSuccess",
            indexedDbMode
              ? "IndexedDB backup je importovan. Osvežite stranicu da svi moduli ponovo učitaju stanje."
              : "Backup je importovan."
          ),
          "success"
        );
      } catch (error) {
        setBackupStatus(error.message || storageT("importFailed", "Import nije uspeo."), "danger");
      } finally {
        event.target.value = "";
        event.target.disabled = false;
        importButton.disabled = false;
      }
    });
  }

  window.MentorStorage = {
    DATABASE_KEY,
    DATABASE_VERSION,
    COLLECTIONS: [...COLLECTIONS],
    LEGACY_KEYS: { ...LEGACY_KEYS },
    inspectDatabaseReadState,
    loadDatabase,
    saveDatabase,
    getCollection,
    setCollection,
    addItem,
    updateItem,
    deleteItem,
    exportDatabase,
    importDatabase,
    resetDatabase,
    updateSettings,
    syncLegacyStorageFromDatabase,
    initDatabaseBackupActions
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDatabaseBackupActions);
  } else {
    initDatabaseBackupActions();
  }
})();
