const test = require("node:test");
const assert = require("node:assert/strict");
const { webcrypto } = require("node:crypto");
const { Blob } = require("node:buffer");
const fflate = require("fflate");
const { loadPhase0Scripts, memoryStorage } = require("./test-helpers");

function load() {
  return loadPhase0Scripts([
    "js/data/legacy/legacy-storage.registry.js",
    "js/data/validation/nutrition-intake.validator.js",
    "js/data/validation/legacy-payload.validators.js",
    "js/data/validation/backup.validators.js",
    "js/data/legacy/legacy-storage.reader.js",
    "js/data/backup/backup-checksum.service.js",
    "js/data/backup/backup-format.constants.js",
    "js/data/backup/backup-manifest.schema.js",
    "js/data/backup/goals-calendar-backup.service.js",
    "js/data/backup/nutrition-media-export.service.js",
    "js/data/backup/backup-export.service.js",
    "js/data/backup/backup-validation.service.js",
    "js/data/normalization/legacy-domain-normalizer.service.js",
    "js/data/backup/legacy-backup-preparation.service.js",
    "js/data/backup/zip-backup.service.js",
    "js/data/backup/isolated-restore.service.js",
    "js/data/backup/backup-parity.service.js",
    "js/data/backup/local-storage-import.service.js"
  ]);
}

function goalsDocument(id = "goal-1") {
  return {
    version: 1,
    updatedAt: "2026-01-05T00:00:00.000Z",
    goals: [{
      id,
      type: "habit",
      title: "Fixture goal",
      actions: [{
        id: `${id}-action-1`,
        title: "Fixture action",
        actions: []
      }],
      notesList: []
    }]
  };
}

function calendarDocument(goalId = "goal-1") {
  return {
    version: 1,
    updatedAt: "2026-01-05T00:00:00.000Z",
    events: [{
      id: `${goalId}-event-1`,
      goalId,
      actionId: `${goalId}-action-1`,
      date: "2026-08-01",
      time: "09:00",
      actions: [],
      notesList: []
    }]
  };
}

function writableStorage(values = {}) {
  const rows = new Map(Object.entries(values).map(([key, value]) => [key, String(value)]));
  const calls = { get: [], set: [], remove: [] };
  let failedKey = null;
  return {
    calls,
    getItem(key) {
      calls.get.push(key);
      return rows.has(key) ? rows.get(key) : null;
    },
    setItem(key, value) {
      calls.set.push([key, String(value)]);
      if (failedKey === key) {
        failedKey = null;
        throw new Error("quota");
      }
      rows.set(key, String(value));
    },
    removeItem(key) {
      calls.remove.push(key);
      rows.delete(key);
    },
    failNextWrite(key) {
      failedKey = key;
    }
  };
}

async function completeZipForStorage(api, storage, createdAt) {
  const prepared = await api.GoalsCalendarBackupService.prepareCompleteBackup({
    createdAt,
    appVersion: "goals-calendar-backup-test",
    storage,
    mediaRecords: []
  }, { cryptoApi: webcrypto });
  return api.ZipBackupService.packPreparedBundle(prepared.bundle, {
    fflate,
    cryptoApi: webcrypto,
    synchronous: true
  });
}

function emptyFood() {
  return {
    version: 1,
    updatedAt: "2026-01-02T00:00:00.000Z",
    userFoods: [{ id: "food-1", ownership: "user", defaultName: "Fixture food" }],
    userFoodNutrients: [{ foodId: "food-1", nutrientId: "n-1", amount: 1 }],
    userFoodPortions: [{ id: "portion-1", foodId: "food-1" }],
    userSources: [{ id: "source-1" }]
  };
}

function emptyInventory() {
  const values = { energyKcal:200, protein:10, carbohydrate:20, totalFat:5, fiber:3 };
  const flags = Object.fromEntries(Object.keys(values).map((code) => [code,true]));
  return {
    version: 1,
    updatedAt: "2026-01-02T00:00:00.000Z",
    batches: [],
    locations: [{ id: "location-1" }],
    allocations: [],
    preferences: [],
    stores: [],
    recipes: [{ id: "recipe-1", ingredients: [{ foodId: "food-1" }] }, { id: "recipe-2", ingredients: [] }],
    recipeFavoriteIds: ["recipe-1"],
    mealPlanEntries: [{ id: "meal-1", recipeId: "recipe-1" }],
    intakeEntries: [{
      id:"intake-1", mealPlanEntryId:"meal-1", recipeId:"recipe-1", recipeName:"Fixture recipe", mealType:"lunch",
      eatenDate:"2026-01-02", servings:1, createdAt:"2026-01-02T12:00:00.000Z", updatedAt:"2026-01-02T12:00:00.000Z",
      nutritionSnapshot:{ version:1, capturedAt:"2026-01-02T12:00:00.000Z", basisServings:1, recipeUpdatedAt:null,
        values, partialValues:{...values}, known:flags, observed:{...flags}, micronutrients:[] }
    }],
    shoppingItems: [{ id: "shopping-1", foodId: "food-1" }],
    migrations: []
  };
}

function comprehensiveStorage() {
  const central = {
    version: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ideas: [{ id: "idea-1", title: "Central", status: "seed", updatedAt: "2026-01-01T00:00:00.000Z", pathData: { tests: [], researchDirections: [] } }],
    finances: [
      {
        id: "finance-state",
        type: "financeState",
        transactions: [{ id: "transaction-1", amount: 10 }],
        budgets: [{ id: "budget-1" }],
        cashflowIncomes: [],
        cashflowExpenses: [],
        cashflowDebts: [],
        importedTransactionFiles: [],
        categoryRules: {},
        savedAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "transaction-import-templates",
        type: "importTemplates",
        templates: [{ id: "template-central", name: "Central" }]
      }
    ],
    tests: [],
    comparisons: [
      { id: "snapshot-1", recordType: "snapshot", ideaId: "idea-1", createdAt: "2026-01-01T00:00:00.000Z" },
      { id: "option-1", recordType: "option", ideaId: "idea-1", updatedAt: "2026-01-01T00:00:00.000Z" }
    ],
    assets: [{ id: "asset-1", recordType: "asset", type: "Kes", updatedAt: "2026-01-01T00:00:00.000Z" }],
    references: [],
    settings: { language: "en" }
  };
  return memoryStorage({
    mentor_database: JSON.stringify(central),
    mentor_language: "sr",
    mentor_brainstorming_ideas: JSON.stringify([
      { id: "idea-1", title: "Legacy newer", status: "path", updatedAt: "2026-01-03T00:00:00.000Z", pathData: { tests: [{ id: "test-1" }], researchDirections: [] } },
      { id: "idea-2", title: "Legacy unique", status: "seed" }
    ]),
    mentorFinanceStateV1: JSON.stringify({
      transactions: [{ id: "transaction-2", amount: 20 }],
      budgets: [{ id: "budget-2" }],
      cashflowIncomes: [],
      cashflowExpenses: [],
      cashflowDebts: [],
      importedTransactionFiles: [],
      categoryRules: {},
      savedAt: "2026-01-04T00:00:00.000Z"
    }),
    mentorTransactionImportTemplatesV1: JSON.stringify([{ id: "template-legacy", name: "Legacy" }]),
    mentorFinanceAssetsV1: JSON.stringify({
      assets: [],
      debts: [{ id: "debt-1", type: "Dug", updatedAt: "2026-01-02T00:00:00.000Z" }],
      savedAt: "2026-01-02T00:00:00.000Z"
    }),
    mentorFinancialComparisonSnapshotsV1: JSON.stringify([
      { id: "snapshot-2", ideaId: "idea-2", createdAt: "2026-01-02T00:00:00.000Z" }
    ]),
    mentorFinancialComparisonOptionsV1: JSON.stringify([
      { id: "option-1", ideaId: "idea-1", updatedAt: "2026-01-04T00:00:00.000Z" },
      { id: "option-2", ideaId: "idea-2" }
    ]),
    mentorFinancialComparisonResearchCacheV1: JSON.stringify({ ideas: { "idea-1": [{ id: "option-1" }] } }),
    mentor_goals_v1: JSON.stringify(goalsDocument()),
    mentor_calendar_events_v1: JSON.stringify(calendarDocument()),
    mentor_nutrition_foods_v1: JSON.stringify(emptyFood()),
    mentor_nutrition_inventory_v1: JSON.stringify(emptyInventory()),
    mentor_nutrition_plan_favorites_v1: JSON.stringify(["recipe-2"]),
    mentor_nutrition_fridge_v1: JSON.stringify([{ id: "old-stock-1", foodId: "food-1", quantity: 2, unit: "kom" }])
  });
}

test("complete export, ZIP validation and isolated restore preserve domain and media parity", async () => {
  const api = load();
  const storage = comprehensiveStorage();
  const snapshot = api.LegacyStorageReader.readLocalStorageSnapshot(
    storage,
    api.LegacyStorageRegistry.localStorageSources,
    () => "2026-01-05T00:00:00.000Z"
  );
  const blob = new Blob([Uint8Array.from([1, 2, 3, 4, 5])], { type: "image/webp" });
  const thumbnail = new Blob([Uint8Array.from([6, 7, 8])], { type: "image/webp" });
  const mediaRecords = [{
    id: "food-image:food-1",
    entityType: "food",
    entityId: "food-1",
    foodId: "food-1",
    type: "image/webp",
    originalName: "fixture.webp",
    size: blob.size,
    updatedAt: "2026-01-05T00:00:00.000Z",
    blob,
    thumbnail
  }];

  for (const [entityType, mime, bytes] of [["research-av", "audio/webm", [26, 69, 223, 163]], ["research-source", "application/pdf", [37, 80, 68, 70, 45]]]) {
    const raw = new Blob([Uint8Array.from(bytes)], { type: mime });
    mediaRecords.push({ id: entityType + "-image:fixture", entityType, entityId: "fixture", blob: raw, type: mime, size: raw.size, originalName: entityType + ".fixture", updatedAt: "2026-01-05T00:00:00.000Z" });
  }

  const prepared = await api.GoalsCalendarBackupService.prepareCompleteBackup({
    createdAt: "2026-01-05T00:00:00.000Z",
    appVersion: "phase0-test",
    storage,
    localStorageSnapshot: snapshot,
    mediaRecords
  }, { cryptoApi: webcrypto });

  assert.equal(prepared.normalization.recoveryRequired, false);
  assert.equal(prepared.normalization.domains.settings.language, "sr");
  assert.equal(prepared.normalization.domains.ideas.find((idea) => idea.id === "idea-1").title, "Legacy newer");
  assert.deepEqual(
    prepared.normalization.domains.ideas.map((idea) => idea.id).sort(),
    ["idea-1", "idea-2"]
  );
  assert.equal(
    prepared.normalization.domains["finance-documents"].find((item) => item.id === "finance-state").transactions[0].id,
    "transaction-2"
  );
  assert.ok(prepared.normalization.domains["nutrition-inventory-data"].batches.some((item) => item.legacyId?.includes("old-stock-1")));
  assert.deepEqual(prepared.normalization.domains["nutrition-inventory-data"].recipeFavoriteIds, ["recipe-1", "recipe-2"]);
  assert.deepEqual(prepared.normalization.domains.goals.goals.map((goal) => goal.id), ["goal-1"]);
  assert.deepEqual(prepared.normalization.domains.calendar.events.map((event) => event.id), ["goal-1-event-1"]);
  assert.deepEqual(Object.keys(prepared.bundle.manifest.domains).sort(), ["calendar", "goals"]);
  assert.equal(prepared.bundle.manifest.domains.goals.version, 1);
  assert.equal(prepared.bundle.manifest.domains.goals.count, 1);
  assert.equal(prepared.bundle.manifest.domains.calendar.count, 1);
  assert.match(prepared.bundle.manifest.domains.goals.checksum, /^[a-f0-9]{64}$/);
  assert.match(prepared.bundle.manifest.rawSources.mentor_goals_v1.sha256, /^[a-f0-9]{64}$/);
  assert.match(prepared.bundle.manifest.rawSources.mentor_calendar_events_v1.sha256, /^[a-f0-9]{64}$/);
  const rawEntry = prepared.bundle.jsonEntries.find((entry) => entry.path === "localstorage/raw.json");
  const rawSources = JSON.parse(rawEntry.data).sources;
  assert.equal(rawSources.mentor_goals_v1, JSON.stringify(goalsDocument()));
  assert.equal(rawSources.mentor_calendar_events_v1, JSON.stringify(calendarDocument()));
  assert.equal(rawSources.mentor_nutrition_plan_favorites_v1, JSON.stringify(["recipe-2"]));
  assert.equal(api.BackupValidators.validateRawLocalStorageDocument(JSON.parse(rawEntry.data)).valid, true);

  const zip = await api.ZipBackupService.packPreparedBundle(prepared.bundle, { fflate, cryptoApi: webcrypto });
  assert.equal(String.fromCharCode(zip.bytes[0], zip.bytes[1]), "PK");
  assert.ok(zip.filename.endsWith(".zip"));

  const archive = await api.ZipBackupService.readAndValidateZip(zip.bytes, { fflate, cryptoApi: webcrypto });
  assert.equal(archive.status, "valid");
  assert.equal(archive.manifest.backupFormat, "kreatorm-backup");

  const target = api.IsolatedRestoreService.createMemoryRestoreTarget();
  assert.equal(target.isEmpty(), true);
  const restored = await api.IsolatedRestoreService.restoreIntoEmptyTarget(archive, target, { fflate });
  const parity = await api.BackupParityService.verify({
    expectedDomains: prepared.normalization.domains,
    expectedMedia: mediaRecords,
    restored
  }, { cryptoApi: webcrypto });

  assert.equal(parity.valid, true, parity.errors.join(","));
  assert.deepEqual(restored.stores.nutritionInventoryData.recipeFavoriteIds, ["recipe-1", "recipe-2"]);
  assert.deepEqual(restored.stores.nutritionInventoryData.intakeEntries, emptyInventory().intakeEntries);
  assert.equal(parity.domains.length, 10);
  const goalsParity = parity.domains.find((domain) => domain.domain === "goals");
  const calendarParity = parity.domains.find((domain) => domain.domain === "calendar");
  assert.equal(goalsParity.expectedRecordCount, 1);
  assert.deepEqual(goalsParity.expectedIds, ["goal-1"]);
  assert.equal(calendarParity.expectedRecordCount, 1);
  assert.deepEqual(calendarParity.expectedIds, ["goal-1-event-1"]);
  assert.equal(parity.media.expectedRecordCount, 3);
  assert.equal(parity.media.actualRecordCount, 3);
  assert.deepEqual(parity.media.expectedIds, parity.media.actualIds);
  assert.equal(storage.calls.set.length, 0);
  assert.equal(storage.calls.remove.length, 0);
});

test("Goals and Calendar localStorage import verifies a previous ZIP and rolls both keys back on the second write failure", async () => {
  const api = load();
  const sourceStorage = writableStorage({
    mentor_goals_v1: JSON.stringify(goalsDocument("goal-imported")),
    mentor_calendar_events_v1: JSON.stringify(calendarDocument("goal-imported"))
  });
  const sourceZip = await completeZipForStorage(api, sourceStorage, "2026-02-01T00:00:00.000Z");
  const sourceArchive = await api.ZipBackupService.readAndValidateZip(sourceZip.bytes, {
    fflate,
    cryptoApi: webcrypto,
    synchronous: true
  });

  const oldGoalsRaw = JSON.stringify(goalsDocument("goal-old"));
  const oldCalendarRaw = JSON.stringify(calendarDocument("goal-old"));
  const targetStorage = writableStorage({
    mentor_goals_v1: oldGoalsRaw,
    mentor_calendar_events_v1: oldCalendarRaw
  });
  let backupCalls = 0;
  const imported = await api.LocalStorageImportService.importValidatedArchive(
    sourceArchive,
    targetStorage,
    {
      fflate,
      cryptoApi: webcrypto,
      synchronous: true,
      async backupCurrentState() {
        backupCalls += 1;
        return completeZipForStorage(api, targetStorage, "2026-02-02T00:00:00.000Z");
      }
    }
  );
  assert.equal(backupCalls, 1);
  assert.equal(imported.status, "imported");
  assert.equal(imported.parity.valid, true);
  assert.deepEqual(JSON.parse(targetStorage.getItem("mentor_goals_v1")).goals.map((goal) => goal.id), ["goal-imported"]);
  assert.deepEqual(JSON.parse(targetStorage.getItem("mentor_calendar_events_v1")).events.map((event) => event.id), ["goal-imported-event-1"]);

  const rollbackStorage = writableStorage({
    mentor_goals_v1: oldGoalsRaw,
    mentor_calendar_events_v1: oldCalendarRaw
  });
  rollbackStorage.failNextWrite("mentor_calendar_events_v1");
  await assert.rejects(
    () => api.LocalStorageImportService.importValidatedArchive(
      sourceArchive,
      rollbackStorage,
      {
        fflate,
        cryptoApi: webcrypto,
        synchronous: true,
        backupCurrentState() {
          return completeZipForStorage(api, rollbackStorage, "2026-02-03T00:00:00.000Z");
        }
      }
    ),
    (error) => error.code === "IMPORT_WRITE_FAILED"
  );
  assert.equal(rollbackStorage.getItem("mentor_goals_v1"), oldGoalsRaw);
  assert.equal(rollbackStorage.getItem("mentor_calendar_events_v1"), oldCalendarRaw);
});

test("Goals and Calendar import rejects orphan references and duplicate schedules before any target write", async () => {
  const api = load();
  const goals = goalsDocument("goal-validation");
  const calendar = calendarDocument("goal-validation");
  calendar.events[0].actionId = "missing-action";
  calendar.events.push({
    ...calendar.events[0],
    id: "duplicate-schedule-event"
  });
  const validation = api.GoalsCalendarBackupService.validateDocuments(goals, calendar);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.startsWith("CALENDAR_ACTION_ORPHAN:")));
  assert.ok(validation.errors.some((error) => error.startsWith("CALENDAR_SCHEDULE_DUPLICATE:")));

  const invalidStorage = writableStorage({
    mentor_goals_v1: JSON.stringify(goals),
    mentor_calendar_events_v1: JSON.stringify(calendar)
  });
  const invalidZip = await completeZipForStorage(api, invalidStorage, "2026-02-04T00:00:00.000Z");
  const invalidArchive = await api.ZipBackupService.readAndValidateZip(invalidZip.bytes, {
    fflate,
    cryptoApi: webcrypto,
    synchronous: true
  });
  const targetStorage = writableStorage();
  let backupCalled = false;
  await assert.rejects(
    () => api.LocalStorageImportService.importValidatedArchive(
      invalidArchive,
      targetStorage,
      {
        fflate,
        cryptoApi: webcrypto,
        synchronous: true,
        backupCurrentState() {
          backupCalled = true;
          return null;
        }
      }
    ),
    (error) => error.code === "RESTORE_GOALS_CALENDAR_INVALID"
  );
  assert.equal(backupCalled, false);
  assert.equal(targetStorage.calls.set.length, 0);
});

test("invalid only candidate remains recoveryRequired while raw data is still exportable", async () => {
  const api = load();
  const storage = memoryStorage({
    mentor_nutrition_foods_v1: "{\"version\":1,\"userFoods\":[]}"
  });
  const snapshot = api.LegacyStorageReader.readLocalStorageSnapshot(storage, api.LegacyStorageRegistry.localStorageSources);
  const prepared = await api.LegacyBackupPreparationService.prepareLegacyBackup({
    localStorageSnapshot: snapshot,
    mediaRecords: []
  }, { cryptoApi: webcrypto });

  assert.equal(prepared.normalization.recoveryRequired, true);
  assert.ok(prepared.normalization.validationReport.recovery.some((item) => item.domain === "nutritionFoodData"));
  const raw = prepared.bundle.jsonEntries.find((entry) => entry.path === "localstorage/raw.json");
  assert.equal(JSON.parse(raw.data).sources.mentor_nutrition_foods_v1, "{\"version\":1,\"userFoods\":[]}");
});

test("restore rejects a non-empty isolated target", async () => {
  const api = load();
  const target = api.IsolatedRestoreService.createMemoryRestoreTarget();
  await target.replaceAtomically({ stores: { ideas: [] }, media: [] });
  await assert.rejects(
    () => api.IsolatedRestoreService.restoreIntoEmptyTarget({ status: "valid", files: {} }, target, { fflate }),
    (error) => error.code === "RESTORE_TARGET_NOT_EMPTY"
  );
});

test("ZIP validation rejects content changed after the manifest was created", async () => {
  const api = load();
  const snapshot = api.LegacyStorageReader.readLocalStorageSnapshot(
    memoryStorage({ mentor_language: "sr" }),
    api.LegacyStorageRegistry.localStorageSources,
    () => "2026-01-05T00:00:00.000Z"
  );
  const prepared = await api.LegacyBackupPreparationService.prepareLegacyBackup({
    createdAt: "2026-01-05T00:00:00.000Z",
    appVersion: "phase0-tamper-test",
    localStorageSnapshot: snapshot,
    mediaRecords: []
  }, { cryptoApi: webcrypto });
  const zip = await api.ZipBackupService.packPreparedBundle(prepared.bundle, {
    fflate,
    cryptoApi: webcrypto,
    synchronous: true
  });
  const files = fflate.unzipSync(zip.bytes);
  const path = "data/settings.json";
  files[path] = Uint8Array.from(files[path]);
  files[path][files[path].byteLength - 2] ^= 1;
  const tamperedZip = fflate.zipSync(files);

  await assert.rejects(
    () => api.ZipBackupService.readAndValidateZip(tamperedZip, {
      fflate,
      cryptoApi: webcrypto,
      synchronous: true
    }),
    (error) => error.code === "ZIP_VALIDATION_FAILED"
      && error.details.some((detail) => detail === `ZIP_ENTRY_CHECKSUM_MISMATCH:${path}`)
  );
});
