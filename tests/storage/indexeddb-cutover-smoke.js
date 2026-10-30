(async function runIndexedDbCutoverSmoke() {
  "use strict";

  const result = document.getElementById("result");
  const DATABASES = ["kreatorm_app_db", "mentor_nutrition_images"];
  const RELEASE_ID = "1.0.0+build.20260730.1";
  const EXPECTED_STORE_NAMES = [
    "meta",
    "legacyBackups",
    "settings",
    "ideas",
    "financeDocuments",
    "assets",
    "comparisons",
    "cache",
    "nutritionFoodData",
    "nutritionInventoryData",
    "media",
    "goals",
    "calendarEvents"
  ];
  const REQUIRED_REPORTS = [
    "reports/migration.json",
    "reports/validation.json",
    "reports/conflicts.json"
  ];

  function fail(error) {
    const message = error?.stack || error?.message || String(error);
    result.textContent = `INDEXEDDB_CUTOVER_SMOKE_FAILED:${message}`;
    document.body.dataset.status = "failed";
  }

  window.addEventListener("error", (event) => {
    fail(event.error || new Error(event.message));
  });
  window.addEventListener("unhandledrejection", (event) => {
    fail(event.reason || new Error("Unhandled promise rejection."));
  });

  function deleteDatabase(name) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(name);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error(`Database cleanup blocked: ${name}`));
    });
  }

  function pngBlob() {
    const base64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    const bytes = Uint8Array.from(
      atob(base64),
      (character) => character.charCodeAt(0)
    );
    return new Blob([bytes], { type: "image/png" });
  }

  function seedLegacyNutritionMedia() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("mentor_nutrition_images", 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("foodImages")) {
          request.result.createObjectStore("foodImages", { keyPath: "id" });
        }
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction("foodImages", "readwrite");
        transaction.objectStore("foodImages").put({
          id: "food-image:food-release-smoke",
          entityType: "food",
          entityId: "food-release-smoke",
          foodId: "food-release-smoke",
          name: "release-smoke.png",
          type: "image/png",
          blob: pngBlob(),
          thumbnail: pngBlob(),
          updatedAt: "2026-07-30T00:00:00.000Z"
        });
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => {
          database.close();
          reject(transaction.error);
        };
        transaction.onabort = () => {
          database.close();
          reject(transaction.error || new Error("Legacy media seed aborted."));
        };
      };
    });
  }

  function goal(id) {
    return {
      id,
      title: `Goal ${id}`,
      type: "short-term",
      actions: [{
        id: `${id}-action`,
        title: "Action",
        actions: []
      }],
      notesList: []
    };
  }

  function calendarEvent(id, goalId) {
    return {
      id,
      goalId,
      actionId: `${goalId}-action`,
      date: "2026-08-02",
      time: "10:00",
      title: `Event ${id}`,
      actions: [],
      notesList: []
    };
  }

  function storageSnapshot() {
    return Object.fromEntries(
      Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
        .filter(Boolean)
        .sort()
        .map((key) => [key, localStorage.getItem(key)])
    );
  }

  function assert(condition, code) {
    if (!condition) throw new Error(code);
  }

  async function loadRuntime(label) {
    const frame = document.createElement("iframe");
    frame.hidden = true;
    frame.src = `/tests/storage/indexeddb-cutover-runtime.html?run=${encodeURIComponent(label)}`;
    document.body.appendChild(frame);
    await new Promise((resolve, reject) => {
      frame.onload = resolve;
      frame.onerror = () => reject(new Error(`Runtime document failed to load: ${label}`));
    });
    const runtime = frame.contentWindow;
    await runtime.MentorData?.coreReadyPromise;
    if (!runtime.MentorData) throw new Error(`MENTOR_DATA_MISSING:${label}`);
    return { frame, runtime };
  }

  function verifyCoreCutover(runtime, label) {
    assert(
      runtime.KREATORM_RELEASE?.releaseId === RELEASE_ID &&
        runtime.MENTOR_APP_VERSION === RELEASE_ID,
      `RELEASE_ID_MISMATCH:${label}`
    );
    assert(
      Object.isFrozen(runtime.KREATORM_RELEASE) &&
        runtime.KREATORM_RELEASE.version === "1.0.0" &&
        runtime.KREATORM_RELEASE.build === "20260730.1",
      `RELEASE_METADATA_INVALID:${label}`
    );
    assert(
      runtime.document.querySelector('meta[name="application-version"]')?.content ===
        "1.0.0" &&
        runtime.document.querySelector('meta[name="application-build"]')?.content ===
          "20260730.1",
      `RELEASE_HTML_META_INVALID:${label}`
    );
    assert(typeof runtime.Dexie === "function", `DEXIE_LOCAL_RUNTIME_MISSING:${label}`);
    assert(Boolean(runtime.fflate?.zip && runtime.fflate?.unzip), `FFLATE_LOCAL_RUNTIME_MISSING:${label}`);
    assert(runtime.MentorData.coreReady === true, `CORE_BOOTSTRAP_NOT_READY:${label}`);
    assert(
      runtime.MentorData.database?.name === "kreatorm_app_db" &&
        runtime.MentorIndexedDB.SchemaV1.databaseName === "kreatorm_app_db" &&
        runtime.MentorIndexedDB.SchemaV1.structuralVersion === 1,
      `INDEXEDDB_RELEASE_SCHEMA_MISMATCH:${label}`
    );
    assert(
      JSON.stringify(runtime.MentorData.adapterSelection) === JSON.stringify({
        settings: "indexeddb",
        goals: "indexeddb",
        calendar: "indexeddb",
        ideas: "indexeddb",
        comparisons: "indexeddb",
        cache: "indexeddb",
        finance: "indexeddb",
        assets: "indexeddb",
        nutritionFoodData: "indexeddb",
        nutritionInventoryData: "indexeddb",
        media: "indexeddb"
      }),
      `IDB_SELECTION_NOT_ACTIVE:${label}`
    );
    assert(
      runtime.MentorData.repositories.settings.storageKind === "indexeddb",
      `SETTINGS_REPOSITORY_NOT_IDB:${label}`
    );
    assert(
      runtime.MentorData.repositories.goals.storageKind === "indexeddb",
      `GOALS_REPOSITORY_NOT_IDB:${label}`
    );
    assert(
      runtime.MentorData.repositories.calendar.storageKind === "indexeddb",
      `CALENDAR_REPOSITORY_NOT_IDB:${label}`
    );
    assert(
      runtime.MentorData.repositories.ideas.storageKind === "indexeddb",
      `IDEAS_REPOSITORY_NOT_IDB:${label}`
    );
    assert(
      runtime.MentorData.repositories.comparisons.storageKind === "indexeddb",
      `COMPARISONS_REPOSITORY_NOT_IDB:${label}`
    );
    assert(
      runtime.MentorData.repositories.finance.storageKind === "indexeddb",
      `FINANCE_REPOSITORY_NOT_IDB:${label}`
    );
    assert(
      runtime.MentorData.repositories.assets.storageKind === "indexeddb",
      `ASSETS_REPOSITORY_NOT_IDB:${label}`
    );
    assert(
      runtime.MentorData.repositories.nutritionFoodData.storageKind ===
        "indexeddb",
      `NUTRITION_FOOD_REPOSITORY_NOT_IDB:${label}`
    );
    assert(
      runtime.MentorData.repositories.nutritionInventoryData.storageKind ===
        "indexeddb",
      `NUTRITION_INVENTORY_REPOSITORY_NOT_IDB:${label}`
    );
    assert(
      runtime.MentorData.repositories.media.storageKind === "indexeddb",
      `NUTRITION_MEDIA_REPOSITORY_NOT_IDB:${label}`
    );
  }

  try {
    localStorage.clear();
    sessionStorage.clear();
    for (const name of DATABASES) await deleteDatabase(name);
    localStorage.setItem("mentor_language", "sr");
    localStorage.setItem("mentor_database", JSON.stringify({
      version: 1,
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z",
      ideas: [],
      finances: [],
      tests: [],
      comparisons: [],
      assets: [],
      references: [],
      settings: { language: "en" }
    }));
    localStorage.setItem("mentor_goals_v1", JSON.stringify({
      version: 1,
      updatedAt: "2026-07-30T00:00:00.000Z",
      goals: [goal("goal-legacy")]
    }));
    localStorage.setItem("mentor_calendar_events_v1", JSON.stringify({
      version: 1,
      updatedAt: "2026-07-30T00:00:00.000Z",
      events: [calendarEvent("event-legacy", "goal-legacy")]
    }));
    await seedLegacyNutritionMedia();
    const baseline = storageSnapshot();

    const first = await loadRuntime("first");
    verifyCoreCutover(first.runtime, "first");
    assert(
      Boolean(first.runtime.MentorData.migrationResult?.backupId) &&
        first.runtime.MentorData.migrationResult?.report?.status === "active",
      "FIRST_RUN_MIGRATION_NOT_ACTIVE"
    );
    assert(
      first.runtime.MentorData.repositories.settings.getLanguage() === "sr",
      "SETTINGS_PRIORITY_FAILED"
    );
    assert(
      Boolean(first.runtime.MentorData.repositories.goals.getById("goal-legacy")),
      "LEGACY_GOAL_NOT_MIGRATED"
    );
    assert(
      Boolean(first.runtime.MentorData.repositories.calendar.getById("event-legacy")),
      "LEGACY_EVENT_NOT_MIGRATED"
    );
    const firstRunMedia = await first.runtime.MentorData.database
      .table("media")
      .get("food-image:food-release-smoke");
    assert(
      firstRunMedia?.blob instanceof first.runtime.Blob &&
        firstRunMedia?.thumbnail instanceof first.runtime.Blob &&
        firstRunMedia.blob.size > 0 &&
        firstRunMedia.thumbnail.size > 0,
      "LEGACY_NUTRITION_MEDIA_NOT_MIGRATED"
    );
    await first.runtime.MentorData.repositories.settings.setLanguage("en");
    await first.runtime.MentorData.repositories.goals.create(goal("goal-idb"));
    await first.runtime.MentorData.repositories.calendar.create(
      calendarEvent("event-idb", "goal-idb")
    );
    assert(
      JSON.stringify(storageSnapshot()) === JSON.stringify(baseline),
      "LEGACY_CHANGED_AFTER_IDB_WRITE"
    );

    first.runtime.MentorData.database?.close?.();
    first.frame.remove();

    const second = await loadRuntime("reload");
    verifyCoreCutover(second.runtime, "reload");
    assert(
      second.runtime.MentorData.repositories.settings.getLanguage() === "en",
      "SETTINGS_IDB_RELOAD_FAILED"
    );
    assert(
      Boolean(second.runtime.MentorData.repositories.goals.getById("goal-idb")),
      "GOALS_IDB_RELOAD_FAILED"
    );
    assert(
      Boolean(second.runtime.MentorData.repositories.calendar.getById("event-idb")),
      "CALENDAR_IDB_RELOAD_FAILED"
    );
    assert(
      JSON.stringify(storageSnapshot()) === JSON.stringify(baseline),
      "LEGACY_CHANGED_AFTER_RELOAD"
    );

    const backup = await second.runtime.MentorIndexedDbAdmin.exportBackup({
      download: false
    });
    const manifest = backup.manifest;
    const entryPaths = new Set(manifest.entries.map((entry) => entry.path));
    const manifestStoreNames = [...manifest.indexeddb.storeNames].sort();
    const mediaBinaryEntries = manifest.indexeddb.binaryEntries.filter(
      (entry) => entry.store === "media"
    );
    const mediaBinaryProperties = mediaBinaryEntries
      .map((entry) => entry.propertyPath)
      .sort();
    assert(
      backup.sourceMode === "indexeddb" &&
        backup.filename.endsWith(".zip") &&
        backup.byteSize > 0 &&
        backup.parity?.valid === true &&
        backup.parity?.sourceParity === true,
      "RELEASE_BACKUP_ZIP_INVALID"
    );
    assert(
      manifest.sourceMode === "indexeddb" &&
        manifest.appVersion === RELEASE_ID &&
        manifest.database?.name === "kreatorm_app_db" &&
        manifest.database?.structuralVersion === 1 &&
        manifest.database?.dataVersion === 1,
      "RELEASE_BACKUP_MANIFEST_IDENTITY_INVALID"
    );
    assert(
      JSON.stringify(manifestStoreNames) ===
        JSON.stringify([...EXPECTED_STORE_NAMES].sort()) &&
        backup.parity.storeCount === EXPECTED_STORE_NAMES.length,
      "RELEASE_BACKUP_STORE_SET_INVALID"
    );
    assert(
      entryPaths.has("localstorage/raw.json") &&
        REQUIRED_REPORTS.every((path) => entryPaths.has(path)) &&
        REQUIRED_REPORTS.every((path) =>
          manifest.indexeddb.requiredReports.includes(path)
        ) &&
        Object.keys(manifest.rawSources).length > 0,
      "RELEASE_BACKUP_RAW_OR_REPORTS_MISSING"
    );
    assert(
      manifest.media.recordCount === 1 &&
        manifest.media.blobCount === 2 &&
        manifest.media.totalBytes > 0 &&
        manifest.indexeddb.media.recordCount === 1 &&
        manifest.indexeddb.media.binaryCount === 2 &&
        manifest.indexeddb.media.ids.includes(
          "food-image:food-release-smoke"
        ) &&
        mediaBinaryEntries.length === 2 &&
        JSON.stringify(mediaBinaryProperties) ===
          JSON.stringify(["blob", "thumbnail"]) &&
        mediaBinaryEntries.every((entry) =>
          Number(entry.byteSize) > 0 &&
          /^[a-f0-9]{64}$/i.test(String(entry.sha256 || ""))
        ) &&
        backup.parity.mediaRecordCount === 1 &&
        backup.parity.binaryCount >= manifest.indexeddb.media.binaryCount,
      "RELEASE_BACKUP_MEDIA_PARITY_INVALID"
    );

    second.runtime.MentorData.database?.close?.();
    result.textContent = "INDEXEDDB_CUTOVER_SMOKE_OK";
    document.body.dataset.status = "ok";
  } catch (error) {
    fail(error);
  }
})();
