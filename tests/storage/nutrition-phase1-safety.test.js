"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Dexie = require("dexie");
const { IDBFactory, IDBKeyRange } = require("fake-indexeddb");

const ROOT = path.resolve(__dirname, "../..");
const clone = (value) => JSON.parse(JSON.stringify(value));
const INVENTORY_KEY = "mentor_nutrition_inventory_v1";
let sequence = 0;

function locks() {
  const queues = new Map();
  return { request(name, options, callback) {
    if (typeof options === "function") callback = options;
    const next = (queues.get(name) || Promise.resolve()).then(() => callback());
    queues.set(name, next.catch(() => undefined));
    return next;
  } };
}

for (const kind of ["localStorage", "indexeddb"]) {
  test(`${kind}: eaten ledger is independent, persistent and scales its original snapshot after source changes`, async (t) => {
    const shared = await backend(kind); t.after(shared.close);
    const first = await app(shared), intake = first.root.MentorIntakeService;
    const savedRecipe = await first.planning.saveRecipe({ ...recipe(), servings: 2, ingredients: [{ foodId: "food", quantity: 100, unit: "g" }] });
    await first.inventory.saveBatch(draft(200));
    const savedMeal = (await first.planning.saveMealPlanEntry({ ...meal(savedRecipe.id), servings: 2 })).entry;
    const before = await shared.snapshot();
    const logged = await intake.saveForMealPlanEntry(savedMeal.id, { eatenDate: "2030-02-01", servings: 1 });
    assert.equal(intake.nutritionForEntry(logged).values.energyKcal, 100);
    const after = await shared.snapshot();
    assert.deepEqual(after.batches, before.batches);
    assert.deepEqual(after.allocations, before.allocations);
    assert.deepEqual(after.mealPlanEntries, before.mealPlanEntries);
    await first.planning.completeMealPlanEntry(savedMeal.id);
    await first.planning.uncompleteMealPlanEntry(savedMeal.id);
    assert.deepEqual(clone(intake.getForMealPlanEntry(savedMeal.id).nutritionSnapshot), clone(logged.nutritionSnapshot));
    await first.planning.saveRecipe({ ...savedRecipe, name: "Changed later", ingredients: [{ foodId: "food", quantity: 400, unit: "g" }] }, savedRecipe.id);
    const corrected = await intake.saveForMealPlanEntry(savedMeal.id, { eatenDate: "2030-02-02", servings: 3 });
    assert.equal(corrected.id, logged.id);
    assert.equal(corrected.recipeName, logged.recipeName);
    assert.deepEqual(clone(corrected.nutritionSnapshot), clone(logged.nutritionSnapshot));
    assert.equal(intake.nutritionForEntry(corrected).values.energyKcal, 300);
    const reopened = await app(shared);
    assert.equal(reopened.root.MentorIntakeService.getEntries().length, 1);
    await reopened.planning.removeMealPlanEntry(savedMeal.id);
    await reopened.root.MentorIntakeService.saveForMealPlanEntry(savedMeal.id, { eatenDate: "2030-02-03", servings: 1 });
    assert.equal(reopened.root.MentorIntakeService.nutritionForEntry(reopened.root.MentorIntakeService.getForMealPlanEntry(savedMeal.id)).values.energyKcal, 100);
    const stockBeforeDelete = clone((await shared.snapshot()).batches);
    assert.equal(await reopened.root.MentorIntakeService.removeForMealPlanEntry(savedMeal.id), true);
    assert.equal(await reopened.root.MentorIntakeService.removeForMealPlanEntry(savedMeal.id), false);
    assert.deepEqual((await shared.snapshot()).batches, stockBeforeDelete);
  });

  test(`${kind}: first intake snapshot uses fresh recipe, foods and portions even with stale UI caches`, async (t) => {
    const shared = await backend(kind); t.after(shared.close);
    const first = await app(shared);
    const savedRecipe = await first.planning.saveRecipe(recipe());
    const savedMeal = (await first.planning.saveMealPlanEntry(meal(savedRecipe.id))).entry;
    assert.equal(first.root.MentorFoodNutritionService.details("food").byCode.get("energyKcal").amount, 200);
    const second = await app(shared);
    await second.foodData.mutateEnvelope((envelope) => {
      envelope.userFoods.push({ id: "food", ownership: "user", status: "active", defaultName: "Fresh food", slug: "fresh-food" });
      envelope.userFoodNutrients.push(...[700, 10, 20, 5, 3, 50].map((amount, index) => ({ foodId: "food", nutrientId: second.root.MentorNutritionNutrients[index].id, amount, basisAmount: 100 })));
      envelope.userFoodPortions.push({ id: "fresh-portion", foodId: "food", unit: "package", amount: 1, equivalentGrams: 40 });
    });
    await second.repo.mutate((envelope) => { envelope.recipes[0].ingredients = [{ foodId: "food", quantity: 2, unit: "package" }]; });
    await Promise.all([
      first.root.MentorIntakeService.saveForMealPlanEntry(savedMeal.id, { eatenDate: "2030-02-01", servings: 1 }),
      second.root.MentorIntakeService.saveForMealPlanEntry(savedMeal.id, { eatenDate: "2030-02-01", servings: 2 })
    ]);
    const entries = (await shared.snapshot()).intakeEntries;
    assert.equal(entries.length, 1);
    assert.equal(entries[0].nutritionSnapshot.values.energyKcal, 560);
    assert.equal(entries[0].servings, 2);
    assert.equal(first.root.MentorFoodNutritionService.details("food").byCode.get("energyKcal").amount, 200);
  });

  test(`${kind}: intake preserves unknown nutrients and rejected or failed writes leave the ledger unchanged`, async (t) => {
    const shared = await backend(kind); t.after(shared.close);
    const first = await app(shared), intake = first.root.MentorIntakeService;
    const savedRecipe = await first.planning.saveRecipe({ ...recipe(), ingredients: [{ foodId: "food", quantity: 100, unit: "g" }] });
    const savedMeal = (await first.planning.saveMealPlanEntry(meal(savedRecipe.id))).entry;
    await first.foodData.mutateEnvelope((envelope) => {
      envelope.userFoods.push({ id: "food", ownership: "user", status: "active", defaultName: "Partial food", slug: "partial-food" });
      envelope.userFoodNutrients.push({ foodId: "food", nutrientId: "n-protein", amount: 10, basisAmount: 100 }, { foodId: "food", nutrientId: "n-fiber", amount: null, basisAmount: 100 });
    });
    const logged = await intake.saveForMealPlanEntry(savedMeal.id, { eatenDate: "2030-02-01", servings: 1 });
    assert.equal(logged.nutritionSnapshot.values.energyKcal, null);
    assert.equal(logged.nutritionSnapshot.partialValues.energyKcal, 40);
    assert.equal(logged.nutritionSnapshot.known.fiber, false);
    assert.equal(logged.nutritionSnapshot.micronutrients[0].amount, null);
    const before = await shared.snapshot();
    await rejectCall(() => intake.saveForMealPlanEntry(savedMeal.id, { eatenDate: "2030-02-30", servings: 1 }), /INTAKE_VALIDATION_FAILED/);
    await rejectCall(() => intake.saveForMealPlanEntry(savedMeal.id, { eatenDate: "2030-02-01", servings: Infinity }), /INTAKE_VALIDATION_FAILED/);
    assert.deepEqual(await shared.snapshot(), before);
    const fail = () => { throw new Error("SYNTHETIC_WRITE_FAILURE"); };
    if (shared.database) shared.database.table("nutritionInventoryData").hook("updating", fail); else shared.storage.failPrimary = true;
    await assert.rejects(intake.saveForMealPlanEntry(savedMeal.id, { eatenDate: "2030-02-02", servings: 2 }), /SYNTHETIC_WRITE_FAILURE/);
    assert.deepEqual(await shared.snapshot(), before);
    assert.equal(intake.getEntries().length, 1);
    if (shared.database) shared.database.table("nutritionInventoryData").hook("updating").unsubscribe(fail); else shared.storage.failPrimary = false;
    await intake.saveForMealPlanEntry(savedMeal.id, { eatenDate: "2030-02-02", servings: 2 });
    assert.equal((await shared.snapshot()).intakeEntries.length, 1);
  });
}

test("optional intake ledger preserves absent compatibility and rejects malformed raw data in runtime and legacy validation", async (t) => {
  const shared = await backend("localStorage"); t.after(shared.close);
  const first = await app(shared);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "js/data/validation/legacy-payload.validators.js"), "utf8"), first.root);
  const original = await shared.snapshot();
  delete original.intakeEntries;
  assert.deepEqual(clone(first.root.MentorNutritionInventoryStorage.normalize(original).intakeEntries), []);
  assert.equal(first.root.MentorDataPhase0.LegacyPayloadValidators.validateParsedValue(INVENTORY_KEY, original).length, 0);
  const malformed = { ...original, intakeEntries: { broken: true } };
  assert.deepEqual(clone(first.root.MentorNutritionInventoryStorage.normalize(malformed).intakeEntries), { broken: true });
  assert.ok(first.root.MentorDataPhase0.LegacyPayloadValidators.validateParsedValue(INVENTORY_KEY, malformed).length);
  const raw = JSON.stringify(malformed);
  shared.storage.setItem(INVENTORY_KEY, raw);
  shared.storage.removeItem(INVENTORY_KEY + "_backup");
  await assert.rejects(app(shared), { code: "DATA_RECOVERY_REQUIRED" });
  assert.equal(shared.storage.getItem(INVENTORY_KEY), raw);
});

function memoryStorage() {
  const rows = new Map();
  return {
    failPrimary: false,
    getItem: (key) => rows.get(key) ?? null,
    setItem(key, value) {
      if (this.failPrimary && key === INVENTORY_KEY) throw new Error("SYNTHETIC_WRITE_FAILURE");
      rows.set(key, String(value));
    },
    removeItem: (key) => rows.delete(key)
  };
}

const COMMON = [
  "js/data/validation/nutrition-intake.validator.js",
  "js/data/state/repository-state.constants.js",
  "js/data/errors/data-error.js",
  "js/data/state/data-event-bus.js",
  "js/data/contracts/storage-adapter.contract.js",
  "js/data/contracts/repository.contract.js",
  "js/data/adapters/local-storage.adapter.js",
  "js/data/repositories/nutrition-food-data.repository.js",
  "js/data/repositories/nutrition-inventory-data.repository.js",
  "js/nutrition/services/food-filter-profile.service.js",
  "js/nutrition/nutrition-storage.js",
  "js/nutrition/inventory-storage.js"
];
const IDB = [
  "js/data/database/schema-v1.js",
  "js/data/database/transaction.helper.js",
  "js/data/services/cross-tab-coordination.service.js",
  "js/data/migration/legacy-to-indexeddb.service.js",
  "js/data/repositories/indexeddb-core.repositories.js"
];

async function backend(kind) {
  const shared = { kind, storage: memoryStorage(), locks: locks(), database: null };
  if (kind === "indexeddb") {
    shared.database = new Dexie(`nutrition-phase1-test-${++sequence}`, { indexedDB: new IDBFactory(), IDBKeyRange });
    shared.database.version(1).stores({ meta: "key", nutritionFoodData: "id", nutritionInventoryData: "id" });
    await shared.database.open();
  }
  shared.snapshot = async () => kind === "indexeddb"
    ? clone((await shared.database.table("nutritionInventoryData").get("current")).envelope)
    : JSON.parse(shared.storage.getItem(INVENTORY_KEY));
  shared.close = async () => { if (shared.database) await shared.database.delete(); };
  return shared;
}

async function app(shared) {
  const root = vm.createContext({ console, URL, structuredClone, setTimeout, clearTimeout });
  root.window = root;
  root.localStorage = shared.storage;
  root.navigator = { locks: shared.locks };
  root.CustomEvent = class { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } };
  root.addEventListener = () => {};
  root.dispatchEvent = () => true;
  root.MentorNutritionId = { create: (prefix) => `${prefix}-${++sequence}` };
  root.MentorNutritionNutrients = [
    ["energyKcal", "kcal", 200], ["protein", "g", 10], ["carbohydrate", "g", 20], ["totalFat", "g", 5], ["fiber", "g", 3], ["vitaminC", "mg", 50]
  ].map(([code, unit], index) => ({ id: `n-${code}`, code, unit, group: code === "vitaminC" ? "vitamin" : "macro", dailyReference: code === "vitaminC" ? 80 : 100, displayOrder: index }));
  root.MentorNutritionFoodSeed = {
    foods: [{ id: "food", defaultName: "Test food", slug: "test-food", categoryId: "other", status: "active" }],
    foodNutrients: [200, 10, 20, 5, 3, 50].map((amount, index) => ({ foodId: "food", nutrientId: root.MentorNutritionNutrients[index].id, amount, basisAmount: 100 })), portions: [], sources: []
  };
  const load = (file) => vm.runInContext(fs.readFileSync(path.join(ROOT, file), "utf8"), root, { filename: file });
  COMMON.forEach(load);
  let foodData, inventoryData;
  if (shared.kind === "indexeddb") {
    IDB.forEach(load);
    const idb = root.MentorIndexedDB;
    idb.CrossTabCoordinationService.rememberHydratedEpoch(0);
    if (!await shared.database.table("nutritionInventoryData").get("current")) {
      await shared.database.table("nutritionInventoryData").put({ id: "current", envelope: clone(root.MentorNutritionInventoryStorage.createEmpty()) });
      await shared.database.table("nutritionFoodData").put({ id: "current", envelope: clone(root.MentorNutritionFoodStorage.createEmpty()) });
      for (const domain of ["nutritionInventoryData", "nutritionFoodData"]) await shared.database.table("meta").put({
        key: idb.LegacyToIndexedDbService.constants.CUTOVER_KEYS[domain], status: "active", adapter: "indexeddb"
      });
    }
    foodData = idb.IndexedDbCoreRepositories.createNutritionFoodDataRepository(shared.database);
    inventoryData = idb.IndexedDbCoreRepositories.createNutritionInventoryDataRepository(shared.database);
  } else {
    const adapter = new root.MentorLocalStorageAdapter(shared.storage);
    foodData = root.MentorDataRepositoryFactories.createNutritionFoodDataRepository(adapter);
    inventoryData = root.MentorDataRepositoryFactories.createNutritionInventoryDataRepository(adapter);
  }
  root.MentorData = { repositories: { nutritionFoodData: foodData, nutritionInventoryData: inventoryData, media: {
    getEntity: async () => null, removeEntity: async () => {}, restoreEntity: async () => {},
    validate: () => {}, urlMetadata: () => ({})
  } } };
  await foodData.initialize();
  load("js/nutrition/repositories/food.repository.js");
  load("js/nutrition/repositories/inventory.repository.js");
  await root.MentorInventoryRepository.initialize();
  [
    "js/nutrition/repositories/planning.repository.js",
    "js/nutrition/services/unit-conversion.service.js",
    "js/nutrition/repositories/nutrient.repository.js",
    "js/nutrition/services/recipe-filter.service.js",
    "js/nutrition/services/recipe-profile.service.js",
    "js/nutrition/services/food-nutrition.service.js",
    "js/nutrition/services/meal-plan-selectors.js",
    "js/nutrition/services/inventory.service.js",
    "js/nutrition/services/planning.service.js",
    "js/nutrition/services/intake.service.js"
  ].forEach(load);
  const capabilities = new Map();
  root.MentorCapabilityRegistry = { register: (capability) => capabilities.set(capability.id, capability) };
  root.MentorNutritionInventoryResolver = {};
  root.MentorLazy = { loadFeature: async () => {} };
  load("js/mentor/mentor-nutrition-inventory-write.js");
  return { root, repo: root.MentorInventoryRepository, inventory: root.MentorInventoryService,
    planning: root.MentorPlanningService, inventoryData, foodData, capabilities };
}

const draft = (quantity = 100) => ({ foodId: "food", locationId: "location_fridge", unit: "g", quantity });
const recipe = () => ({ name: "Test recipe", servings: 1, mealType: "lunch", ingredients: [{ foodId: "food", quantity: 20, unit: "g" }] });
const meal = (recipeId, plannedDate = "2030-02-01") => ({ recipeId, plannedDate, mealType: "lunch", servings: 1 });
const rejectCall = (call, expected) => assert.rejects(Promise.resolve().then(call), expected);

for (const kind of ["localStorage", "indexeddb"]) {
  test(`${kind}: independent batches and same-batch deltas survive stale tabs and reload`, async (t) => {
    const shared = await backend(kind); t.after(shared.close);
    const first = await app(shared), second = await app(shared);
    const [one] = await Promise.all([first.inventory.saveBatch(draft()), second.inventory.saveBatch(draft(200))]);
    assert.equal((await shared.snapshot()).batches.length, 2);
    await Promise.all([first.inventory.restock(one.id, 10, "g"), second.inventory.restock(one.id, 20, "g")]);
    assert.equal((await shared.snapshot()).batches.find((row) => row.id === one.id).quantity, 130);
    const results = await Promise.allSettled([first.inventory.consume(one.id, 100, "g"), second.inventory.consume(one.id, 100, "g")]);
    assert.equal(results.filter((row) => row.status === "fulfilled").length, 1);
    assert.match(results.find((row) => row.status === "rejected").reason.message, /QUANTITY_EXCEEDS_AVAILABLE/);
    assert.equal((await shared.snapshot()).batches.find((row) => row.id === one.id).quantity, 30);
    const reopened = await app(shared);
    assert.equal(reopened.repo.getBatches().length, 2);
    assert.equal(reopened.repo.getBatchById(one.id).quantity, 30);
  });

  test(`${kind}: manual and Mentor recipe/meal writes preserve each other`, async (t) => {
    const shared = await backend(kind); t.after(shared.close);
    const first = await app(shared), second = await app(shared);
    const [manual, mentor] = await Promise.all([
      first.planning.saveRecipe(recipe()),
      second.planning.createRecipeIfAbsent(recipe(), "mentor-recipe")
    ]);
    await Promise.all([
      first.planning.saveMealPlanEntry(meal(manual.id)),
      second.planning.createMealPlanEntryIfAbsent(meal(mentor.id, "2030-02-02"), "mentor-meal")
    ]);
    let snapshot = await shared.snapshot();
    assert.equal(snapshot.recipes.length, 2);
    assert.equal(snapshot.mealPlanEntries.length, 2);
    assert.equal(snapshot.allocations.length, 2);
    await second.planning.createMealPlanEntryIfAbsent(meal(mentor.id, "2030-02-02"), "mentor-meal");
    snapshot = await shared.snapshot();
    assert.equal(snapshot.mealPlanEntries.length, 2);
    const reopened = await app(shared);
    assert.equal(reopened.root.MentorPlanningRepository.getRecipes().length, 2);
  });

  test(`${kind}: domain validation rejects invalid writes without touching historical data`, async (t) => {
    const shared = await backend(kind); t.after(shared.close);
    const first = await app(shared);
    const saved = await first.planning.saveRecipe(recipe());
    await first.repo.mutate((envelope) => {
      // Legacy envelopes remain readable; validation applies to fresh service input.
      envelope.mealPlanEntries.push({ id: "historical", recipeId: "missing-old-recipe", plannedDate: "legacy-date" });
    });
    const before = await shared.snapshot();
    for (const invalid of [
      { ...recipe(), servings: Infinity },
      { ...recipe(), mealType: "anything" },
      { ...recipe(), ingredients: [{ foodId: "food", quantity: Infinity, unit: "g" }] },
      { ...recipe(), ingredients: [{ foodId: "food", quantity: -1, unit: "g" }] }
    ]) {
      await rejectCall(() => first.planning.saveRecipe(invalid), /RECIPE_VALIDATION_FAILED/);
      await rejectCall(() => first.planning.createRecipeIfAbsent(invalid, "invalid-recipe"), /INVALID_RECIPE/);
    }
    for (const invalid of [
      { ...meal(saved.id), plannedDate: "2030-02-30" },
      { ...meal(saved.id), plannedDate: "not-a-date" },
      { ...meal(saved.id), mealType: "anything" },
      { ...meal(saved.id), servings: Infinity },
      { ...meal(saved.id), servings: 0 }
    ]) {
      await rejectCall(() => first.planning.saveMealPlanEntry(invalid), /MEAL_PLAN_VALIDATION_FAILED/);
      await rejectCall(() => first.planning.createMealPlanEntryIfAbsent(invalid, "invalid-meal"), /INVALID_MEAL_PLAN/);
    }
    assert.deepEqual(await shared.snapshot(), before);
    assert.equal(first.root.MentorPlanningRepository.getMealPlanEntryById("historical").plannedDate, "legacy-date");
    await first.planning.saveMealPlanEntry(meal(saved.id));
    assert.equal((await shared.snapshot()).mealPlanEntries.length, 2);
  });

  test(`${kind}: fresh location and recipe references are checked inside the transaction`, async (t) => {
    const shared = await backend(kind); t.after(shared.close);
    const first = await app(shared), second = await app(shared);
    const removed = second.repo.removeLocation("location_fridge");
    const rejected = assert.rejects(first.inventory.saveBatch(draft()), /INVENTORY_VALIDATION_FAILED/);
    await removed;
    await rejected;
    assert.equal((await shared.snapshot()).batches.length, 0);
    const saved = await first.planning.saveRecipe(recipe());
    const removeRecipe = second.repo.mutate((envelope) => { envelope.recipes = []; });
    const staleMeal = assert.rejects(Promise.resolve().then(() => first.planning.saveMealPlanEntry(meal(saved.id))), /MEAL_PLAN_VALIDATION_FAILED/);
    await removeRecipe;
    await staleMeal;
    assert.equal((await shared.snapshot()).mealPlanEntries.length, 0);
    assert.equal(first.repo.getBatches().length, 0);
  });

  test(`${kind}: failed commit preserves durable snapshot, domain reads and retry`, async (t) => {
    const shared = await backend(kind); t.after(shared.close);
    const first = await app(shared);
    const saved = await first.inventory.saveBatch(draft());
    const before = await shared.snapshot();
    const fail = () => { throw new Error("SYNTHETIC_WRITE_FAILURE"); };
    if (shared.database) shared.database.table("nutritionInventoryData").hook("updating", fail);
    else shared.storage.failPrimary = true;
    await assert.rejects(first.inventory.restock(saved.id, 20, "g"), /SYNTHETIC_WRITE_FAILURE/);
    assert.deepEqual(await shared.snapshot(), before);
    assert.equal(first.repo.getBatchById(saved.id).quantity, 100);
    if (shared.database) shared.database.table("nutritionInventoryData").hook("updating").unsubscribe(fail);
    else shared.storage.failPrimary = false;
    await first.inventory.restock(saved.id, 20, "g");
    assert.equal((await shared.snapshot()).batches[0].quantity, 120);
  });

  test(`${kind}: reservations retain decimal precision and reject quantities below reserved stock`, async (t) => {
    const shared = await backend(kind); t.after(shared.close);
    const first = await app(shared);
    const saved = await first.inventory.saveBatch(draft(0.3));
    await first.repo.mutate((envelope) => {
      envelope.allocations.push({ id: "reserved-1", inventoryBatchId: saved.id, reservedQuantity: 0.1, unit: "g", status: "reserved" });
    });
    await first.inventory.consume(saved.id, 0.2, "g");
    assert.equal((await shared.snapshot()).batches[0].quantity, 0.1);
    await assert.rejects(first.inventory.saveBatch(draft(0.09), saved.id), /INVENTORY_VALIDATION_FAILED/);
    await first.inventory.restock(saved.id, 0.2, "g");
    await first.repo.mutate((envelope) => {
      envelope.allocations.push({ id: "reserved-2", inventoryBatchId: saved.id, reservedQuantity: 0.2, unit: "g", status: "reserved" });
    });
    await first.inventory.saveBatch(draft(0.3), saved.id);
    assert.equal((await shared.snapshot()).batches[0].quantity, 0.3);
  });

  test(`${kind}: Mentor rejects an interleaved stale restock before committing`, async (t) => {
    const shared = await backend(kind); t.after(shared.close);
    const first = await app(shared);
    const saved = await first.inventory.saveBatch(draft());
    const second = await app(shared);
    const otherWrite = second.inventory.restock(saved.id, 20, "g");
    const mentor = assert.rejects(first.capabilities.get("nutrition.inventory.restock").adapter({
      batchId: saved.id, foodId: "food", locationId: "location_fridge", quantity: 10, unit: "g",
      expectedQuantity: saved.quantity, expectedUpdatedAt: saved.updatedAt
    }), /INVENTORY_CHANGED/);
    await otherWrite;
    await mentor;
    assert.equal((await shared.snapshot()).batches[0].quantity, 120);
  });

  test(`${kind}: later legitimate edits do not invalidate a durable Mentor restock receipt`, async (t) => {
    const shared = await backend(kind); t.after(shared.close);
    const first = await app(shared);
    const saved = await first.inventory.saveBatch(draft());
    const second = await app(shared);
    const resync = first.planning.resyncActiveReservations;
    first.planning.resyncActiveReservations = async () => {
      await second.inventory.restock(saved.id, 20, "g");
      return resync();
    };
    const receipt = await first.capabilities.get("nutrition.inventory.restock").adapter({
      batchId: saved.id, foodId: "food", locationId: "location_fridge", quantity: 10, unit: "g",
      expectedQuantity: saved.quantity, expectedUpdatedAt: saved.updatedAt
    });
    assert.equal(receipt.quantity, 110);
    assert.equal((await shared.snapshot()).batches[0].quantity, 130);
  });
}
