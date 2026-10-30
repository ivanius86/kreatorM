const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");
const Dexie = require("dexie");
const fflate = require("fflate");
const { indexedDB, IDBKeyRange } = require("fake-indexeddb");
const { ROOT } = require("./test-helpers");

const DATABASE_NAME = "kreatorm_app_db";
const SCRIPTS = [
  "js/data/backup/backup-format.constants.js",
  "js/data/backup/backup-checksum.service.js",
  "js/data/backup/backup-manifest.schema.js",
  "js/data/backup/nutrition-media-export.service.js",
  "js/data/backup/backup-export.service.js",
  "js/data/backup/backup-validation.service.js",
  "js/data/backup/zip-backup.service.js",
  "js/data/backup/legacy-backup-preparation.service.js",
  "js/data/backup/goals-calendar-backup.service.js",
  "js/data/validation/legacy-payload.validators.js",
  "js/data/legacy/legacy-storage.registry.js",
  "js/data/legacy/legacy-storage.reader.js",
  "js/data/legacy/legacy-media.reader.js",
  "js/data/normalization/legacy-domain-normalizer.service.js",
  "js/data/migration/migration-status.constants.js",
  "js/data/database/schema-v1.js",
  "js/data/database/kreatorm.database.js",
  "js/data/database/transaction.helper.js",
  "js/data/adapters/dexie.adapter.js",
  "js/data/services/cross-tab-coordination.service.js",
  "js/data/migration/migration-state-machine.js",
  "js/data/migration/migration-checkpoint.service.js",
  "js/data/migration/migration-verification.service.js",
  "js/data/recovery/indexeddb-recovery.service.js",
  "js/data/migration/legacy-to-indexeddb.service.js",
  "js/data/state/repository-state.constants.js",
  "js/data/errors/data-error.js",
  "js/data/state/data-event-bus.js",
  "js/data/contracts/repository.contract.js",
  "js/data/repositories/indexeddb-core.repositories.js"
];

class ReadableStorage {
  constructor(values = {}) {
    this.values = new Map(
      Object.entries(values).map(([key, value]) => [key, String(value)])
    );
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  snapshot() {
    return Object.fromEntries(this.values);
  }
}

function goal(id = "goal-1") {
  return {
    id,
    title: "Goal",
    type: "short-term",
    actions: [{
      id: `${id}-action`,
      title: "Action",
      actions: []
    }],
    notesList: []
  };
}

function event(id = "event-1", goalId = "goal-1") {
  return {
    id,
    goalId,
    actionId: `${goalId}-action`,
    date: "2026-08-01",
    time: "09:00",
    title: "Event",
    actions: [],
    notesList: []
  };
}

function storageValues(overrides = {}) {
  return {
    mentor_language: "sr",
    mentor_goals_v1: JSON.stringify({
      version: 1,
      updatedAt: "2026-07-30T10:00:00.000Z",
      goals: [goal()]
    }),
    mentor_calendar_events_v1: JSON.stringify({
      version: 1,
      updatedAt: "2026-07-30T10:00:00.000Z",
      events: [event()]
    }),
    ...overrides
  };
}

function loadRuntime() {
  let lockQueue = Promise.resolve();
  const locks = {
    request(name, options, callback) {
      if (typeof options === "function") { callback = options; options = {}; }
      const run = lockQueue.then(() => callback({
        name,
        mode: options?.mode || "exclusive"
      }));
      lockQueue = run.catch(() => undefined);
      return run;
    }
  };
  global.window = global;
  Object.defineProperty(global, "navigator", {
    configurable: true,
    writable: true,
    value: { locks }
  });
  Object.defineProperty(global, "BroadcastChannel", {
    configurable: true,
    writable: true,
    value: undefined
  });
  global.Dexie = Dexie;
  global.fflate = fflate;
  global.indexedDB = indexedDB;
  global.IDBKeyRange = IDBKeyRange;
  global.crypto = webcrypto;
  global.MentorDataPhase0 = {};
  global.MentorIndexedDB = {};
  SCRIPTS.forEach((relativePath) => {
    const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
    vm.runInThisContext(source, { filename: relativePath });
  });
  return {
    idb: global.MentorIndexedDB,
    phase0: global.MentorDataPhase0
  };
}

function createDatabase(idb) {
  return idb.createDatabase({ Dexie, indexedDB, IDBKeyRange });
}

function deleteDatabase(name = DATABASE_NAME) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Cleanup blocked for ${name}.`));
  });
}

function seedLegacyMedia(records) {
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
      const store = transaction.objectStore("foodImages");
      records.forEach((record) => store.put(record));
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

function migrationOptions(database, storage, additions = {}) {
  return {
    database,
    storage,
    legacyIndexedDB: indexedDB,
    fflate,
    cryptoApi: webcrypto,
    checksumService: global.MentorDataPhase0.BackupChecksumService,
    appVersion: "test",
    now: () => "2026-07-30T12:00:00.000Z",
    ...additions
  };
}

test("Mentor createIfAbsent preserves goals from stale repositories and concurrent approvals", async () => {
  await deleteDatabase();
  const { idb } = loadRuntime();
  const database = createDatabase(idb);
  try {
    await idb.LegacyToIndexedDbService.migrate(migrationOptions(database, new ReadableStorage(storageValues())));
    await idb.IndexedDbCoreRepositories.readSelection(database);
    const first = idb.IndexedDbCoreRepositories.createGoalsRepository(database);
    const stale = idb.IndexedDbCoreRepositories.createGoalsRepository(database);
    await Promise.all([first.initialize(), stale.initialize()]);
    await first.createIfAbsent(goal("mentor-goal-A"));
    await stale.createIfAbsent(goal("mentor-goal-B"));
    await Promise.all([first.createIfAbsent(goal("mentor-goal-C")), stale.createIfAbsent(goal("mentor-goal-C"))]);
    assert.deepEqual((await database.table("goals").toArray()).map(row => row.id).sort(), ["goal-1", "mentor-goal-A", "mentor-goal-B", "mentor-goal-C"]);
    assert.equal((await database.table("calendarEvents").get("event-1")).goalId, "goal-1");
    await stale.createIfAbsent({ ...goal("mentor-goal-A"), title: "Must not replace existing goal" });
    assert.equal((await database.table("goals").get("mentor-goal-A")).title, "Goal");
    assert.equal(stale.getAll().length, 4);
  } finally { database.close(); await deleteDatabase(); }
});

test("food imports and manual mutations retain concurrent records across stale IndexedDB repositories", async () => {
  await deleteDatabase();
  const { idb } = loadRuntime(), database = createDatabase(idb);
  const previousValidation = global.MentorNutritionValidation;
  global.addEventListener = () => {}; global.dispatchEvent = () => {};
  global.MentorNutritionFoodSeed = { foods: [], foodNutrients: [], portions: [], sources: [] };
  for (const file of ["js/nutrition/data/food-categories.js", "js/nutrition/data/nutrient-definitions.js", "js/nutrition/services/food-filter-profile.service.js", "js/nutrition/services/id.service.js", "js/nutrition/validation/food.schema.js", "js/nutrition/validation/food-nutrient.schema.js", "js/nutrition/nutrition-storage.js"])
    vm.runInThisContext(fs.readFileSync(path.join(ROOT, file), "utf8"), { filename: file });
  try {
    await idb.LegacyToIndexedDbService.migrate(migrationOptions(database, new ReadableStorage(storageValues())));
    await idb.IndexedDbCoreRepositories.readSelection(database);
    const first = idb.IndexedDbCoreRepositories.createNutritionFoodDataRepository(database), stale = idb.IndexedDbCoreRepositories.createNutritionFoodDataRepository(database);
    await Promise.all([first.initialize(), stale.initialize()]);
    global.MentorData = { repositories: { nutritionFoodData: first } };
    vm.runInThisContext(fs.readFileSync(path.join(ROOT, "js/nutrition/repositories/food.repository.js"), "utf8"));
    const repo = global.MentorFoodRepository;
    const food = id => ({ id, slug: id, defaultName: id, categoryId: "vegetables", preparationState: "raw", referenceAmount: 100, referenceUnit: "g", status: "active" });
    await repo.createUserFood(food("manual"));
    await Promise.all([
      repo.createUserFoodIfAbsent({ ...food("imported"), sourceId: "usda_test" }, { nutrients: [{ nutrientId: "nutrient_protein", amount: 0, basisAmount: 100, basisUnit: "g" }], sources: [{ id: "usda_test", provider: "USDA FoodData Central", fdcId: 123 }] }),
      repo.updateUserFood("manual", { defaultName: "Edited manually" }),
      stale.mutateEnvelope(envelope => { envelope.userFoods.push({ ...food("other-tab"), ownership: "user" }); })
    ]);
    const persisted = (await database.table("nutritionFoodData").get("current")).envelope;
    assert.deepEqual(persisted.userFoods.map(row => row.id).sort(), ["imported", "manual", "other-tab"]);
    assert.equal(persisted.userFoods.find(row => row.id === "manual").defaultName, "Edited manually");
    assert.equal(persisted.userFoodNutrients[0].amount, 0); assert.equal(persisted.userSources[0].fdcId, 123);
    await Promise.all([repo.createUserFoodIfAbsent(food("imported")), repo.createUserFoodIfAbsent(food("imported"))]);
    assert.equal((await database.table("nutritionFoodData").get("current")).envelope.userFoods.filter(row => row.id === "imported").length, 1);
  } finally { global.MentorNutritionValidation = previousValidation; database.close(); await deleteDatabase(); }
});

test("basic migration creates one verified backup, raw audit records and idempotent cutover", async () => {
  await deleteDatabase();
  await deleteDatabase("mentor_nutrition_images");
  await seedLegacyMedia([{
    id: "food-image-1",
    foodId: "food-1",
    blob: new Blob(["original"], { type: "image/png" }),
    thumbnail: new Blob(["thumb"], { type: "image/png" }),
    updatedAt: "2026-07-30T10:00:00.000Z"
  }]);
  const { idb } = loadRuntime();
  const database = createDatabase(idb);
  const storage = new ReadableStorage(storageValues({
    "mentorPlanner.language": "en",
    mentor_database: JSON.stringify({
      version: 1,
      settings: { language: "en" }
    })
  }));
  const before = storage.snapshot();

  try {
    const first = await idb.LegacyToIndexedDbService.migrate(
      migrationOptions(database, storage)
    );
    assert.equal(first.report.status, "active");
    assert.deepEqual(await database.table("settings").toArray(), [{
      key: "language",
      value: "sr"
    }]);
    assert.deepEqual(
      (await database.table("goals").toArray()).map((record) => record.id),
      ["goal-1"]
    );
    assert.deepEqual(
      (await database.table("calendarEvents").toArray()).map((record) => record.id),
      ["event-1"]
    );

    const constants = idb.LegacyToIndexedDbService.constants;
    assert.deepEqual(
      await idb.IndexedDbCoreRepositories.readSelection(database),
      {
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
      }
    );
    for (const domain of ["settings", "goals", "calendar"]) {
      assert.equal(
        (await database.table("meta").get(constants.DOMAIN_KEYS[domain])).status,
        "active"
      );
    }
    const backupKeys = (await database.table("legacyBackups").toArray())
      .filter((record) => record.sourceType !== "migrationReport")
      .map((record) => record.key)
      .sort();
    const archive = await database.table("legacyBackups").get(first.backupId);
    assert.equal(archive.format, "versioned-zip");
    assert.ok(archive.zipBytes.byteLength > 0);
    assert.equal(archive.manifest.media.recordCount, 1);
    assert.equal(archive.manifest.media.blobCount, 2);
    assert.ok(
      archive.manifest.entries.some(
        (entry) => entry.path === "reports/migration.json"
      )
    );
    const mediaRaw = await database.table("legacyBackups").get(
      `${first.backupId}:indexedDB:mentor_nutrition_images/foodImages`
    );
    assert.equal(mediaRaw.recordCount, 1);
    assert.equal(mediaRaw.records[0].blob.size, 8);
    const settingsReport = first.report.domains.find(
      (domain) => domain.domain === "settings"
    );
    assert.equal(settingsReport.selectedSource, "mentor_language");
    assert.equal(settingsReport.conflicts.length, 2);
    const persistedReport = await database.table("legacyBackups").get(
      `${first.backupId}:migration-report`
    );
    assert.equal(persistedReport.report.status, "active");
    assert.equal(
      persistedReport.report.domains.find(
        (domain) => domain.domain === "settings"
      ).conflicts.length,
      2
    );
    assert.deepEqual(storage.snapshot(), before);

    const second = await idb.LegacyToIndexedDbService.migrate(
      migrationOptions(database, storage)
    );
    assert.equal(second.backupId, first.backupId);
    assert.deepEqual(
      (await database.table("legacyBackups").toArray())
        .filter((record) => record.sourceType !== "migrationReport")
        .map((record) => record.key)
        .sort(),
      backupKeys
    );
    assert.equal(second.status, "already-active");
  } finally {
    database.close();
    await deleteDatabase();
    await deleteDatabase("mentor_nutrition_images");
  }
});

test("interrupted import resumes from the saved backup without recapturing legacy data", async () => {
  await deleteDatabase();
  const { idb } = loadRuntime();
  const database = createDatabase(idb);
  const storage = new ReadableStorage(storageValues());
  let interrupted = false;

  try {
    await assert.rejects(
      idb.LegacyToIndexedDbService.migrate(migrationOptions(database, storage, {
        onPhase({ phase, domain }) {
          if (!interrupted && phase === "imported" && domain === "goals") {
            interrupted = true;
            throw Object.assign(new Error("Simulated interruption"), {
              code: "SIMULATED_INTERRUPTION"
            });
          }
        }
      })),
      { code: "SIMULATED_INTERRUPTION" }
    );
    const constants = idb.LegacyToIndexedDbService.constants;
    assert.equal(
      (await database.table("meta").get(constants.DOMAIN_KEYS.goals)).status,
      "imported"
    );
    const backupKeys = (await database.table("legacyBackups").toArray())
      .filter((record) => record.sourceType !== "migrationReport")
      .map((record) => record.key)
      .sort();
    storage.values.set("mentor_language", "en");

    const resumed = await idb.LegacyToIndexedDbService.migrate(
      migrationOptions(database, storage)
    );
    assert.equal(resumed.report.status, "active");
    const resumedBackupKeys = (await database.table("legacyBackups").toArray())
      .filter((record) => record.sourceType !== "migrationReport")
      .map((record) => record.key)
      .sort();
    backupKeys.forEach((key) => assert.ok(resumedBackupKeys.includes(key)));
    assert.equal((await database.table("settings").get("language")).value, "sr");
  } finally {
    database.close();
    await deleteDatabase();
  }
});

test("invalid only Goals candidate marks only Goals recovery and does not activate an empty pair", async () => {
  await deleteDatabase();
  const { idb } = loadRuntime();
  const database = createDatabase(idb);
  const storage = new ReadableStorage(storageValues({
    mentor_goals_v1: "{invalid-json"
  }));

  try {
    const result = await idb.LegacyToIndexedDbService.migrate(
      migrationOptions(database, storage)
    );
    const constants = idb.LegacyToIndexedDbService.constants;
    assert.equal(result.checkpoints.settings.status, "active");
    assert.equal(result.checkpoints.goals.status, "recoveryRequired");
    assert.notEqual(result.checkpoints.calendar.status, "recoveryRequired");
    assert.equal(result.checkpoints.calendar.dependencyBlocked, true);
    assert.equal(await database.table("goals").count(), 0);
    assert.equal(await database.table("meta").get(constants.CUTOVER_KEYS.goals), undefined);
    assert.equal(await database.table("meta").get(constants.CUTOVER_KEYS.calendar), undefined);
    assert.ok(
      await database.table("legacyBackups")
        .where("key")
        .equals(`${result.backupId}:localStorage:mentor_goals_v1`)
        .first()
    );
  } finally {
    database.close();
    await deleteDatabase();
  }
});

test("orphan Calendar reference marks only Calendar recovery while valid Goals remain verified", async () => {
  await deleteDatabase();
  const { idb } = loadRuntime();
  const database = createDatabase(idb);
  const storage = new ReadableStorage(storageValues({
    mentor_calendar_events_v1: JSON.stringify({
      version: 1,
      events: [event("orphan-event", "missing-goal")]
    })
  }));

  try {
    const result = await idb.LegacyToIndexedDbService.migrate(
      migrationOptions(database, storage)
    );
    const constants = idb.LegacyToIndexedDbService.constants;
    assert.equal(result.checkpoints.goals.status, "verified");
    assert.equal(result.checkpoints.calendar.status, "recoveryRequired");
    assert.equal(await database.table("goals").count(), 1);
    assert.equal(await database.table("calendarEvents").count(), 0);
    assert.equal(await database.table("meta").get(constants.CUTOVER_KEYS.goals), undefined);
    assert.equal(await database.table("meta").get(constants.CUTOVER_KEYS.calendar), undefined);
  } finally {
    database.close();
    await deleteDatabase();
  }
});

test("IDB repositories reload durable records and cascade rollback stays atomic", async () => {
  await deleteDatabase();
  const { idb } = loadRuntime();
  let database = createDatabase(idb);
  const storage = new ReadableStorage(storageValues());
  const before = storage.snapshot();

  try {
    await idb.LegacyToIndexedDbService.migrate(migrationOptions(database, storage));
    const repositories = idb.IndexedDbCoreRepositories;
    await repositories.readSelection(database);
    const settings = repositories.createSettingsRepository(database);
    const goals = repositories.createGoalsRepository(database);
    const calendar = repositories.createCalendarRepository(database);
    const transactions = repositories.createGoalsCalendarTransactions(
      database,
      goals,
      calendar
    );
    await Promise.all([
      settings.initialize(),
      goals.initialize(),
      calendar.initialize()
    ]);

    await settings.setLanguage("en");
    await goals.create(goal("goal-2"));
    await calendar.create(event("event-2", "goal-2"));

    database.goals.hook("deleting", () => {
      throw Object.assign(new Error("Delete blocked"), { code: "DELETE_BLOCKED" });
    });
    await assert.rejects(
      transactions.deleteGoalCascade("goal-2"),
      { code: "DELETE_BLOCKED" }
    );
    assert.ok(await database.table("goals").get("goal-2"));
    assert.ok(await database.table("calendarEvents").get("event-2"));
    database.close();

    database = createDatabase(idb);
    await database.open();
    await repositories.readSelection(database);
    const reloadedSettings = repositories.createSettingsRepository(database);
    const reloadedGoals = repositories.createGoalsRepository(database);
    const reloadedCalendar = repositories.createCalendarRepository(database);
    await Promise.all([
      reloadedSettings.initialize(),
      reloadedGoals.initialize(),
      reloadedCalendar.initialize()
    ]);
    assert.equal(reloadedSettings.getLanguage(), "en");
    assert.ok(reloadedGoals.getById("goal-2"));
    assert.ok(reloadedCalendar.getById("event-2"));
    assert.deepEqual(storage.snapshot(), before);

    const marker = await database.table("meta").get(
      idb.LegacyToIndexedDbService.constants.CUTOVER_KEYS.settings
    );
    assert.equal(marker.hasIndexedDbWrites, true);
    assert.ok(marker.firstIndexedDbWriteAt);
  } finally {
    database.close();
    await deleteDatabase();
  }
});
