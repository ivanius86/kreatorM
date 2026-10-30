const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "../..");

function load(relativePath) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, relativePath), "utf8"), { filename: relativePath });
}

function memoryStorage() {
  const rows = new Map();
  return {
    rows,
    failWritesFor: null,
    getItem(key) { return rows.has(key) ? rows.get(key) : null; },
    setItem(key, value) {
      if (key === this.failWritesFor) {
        const error = new Error("Synthetic quota failure");
        error.name = "QuotaExceededError";
        throw error;
      }
      rows.set(key, String(value));
    },
    removeItem(key) { rows.delete(key); }
  };
}

test("Nutrition domain mutations resolve only after repository-backed durable saves", async () => {
  global.window = global;
  global.localStorage = memoryStorage();
  global.CustomEvent = class CustomEvent {
    constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
  };
  global.dispatchEvent = () => true;
  global.addEventListener = () => undefined;
  global.MentorFoodFilterProfile = { normalize: (value) => value || {} };
  global.MentorNutritionFoodSeed = { foods: [], foodNutrients: [], portions: [], sources: [] };
  let idSequence = 0;
  global.MentorNutritionId = { create: (prefix) => `${prefix}-generated-${++idSequence}` };

  [
    "js/data/state/repository-state.constants.js",
    "js/data/errors/data-error.js",
    "js/data/state/data-event-bus.js",
    "js/data/contracts/storage-adapter.contract.js",
    "js/data/contracts/repository.contract.js",
    "js/data/adapters/local-storage.adapter.js",
    "js/data/repositories/nutrition-food-data.repository.js",
    "js/data/repositories/nutrition-inventory-data.repository.js",
    "js/nutrition/nutrition-storage.js",
    "js/nutrition/inventory-storage.js"
  ].forEach(load);

  const adapter = new global.MentorLocalStorageAdapter(global.localStorage);
  const factories = global.MentorDataRepositoryFactories;
  const foodData = factories.createNutritionFoodDataRepository(adapter);
  const inventoryData = factories.createNutritionInventoryDataRepository(adapter);
  global.MentorData = { repositories: { nutritionFoodData: foodData, nutritionInventoryData: inventoryData } };

  await foodData.initialize();
  load("js/nutrition/repositories/food.repository.js");
  const created = await global.MentorFoodRepository.createUserFood({
    id: "food-1",
    ownership: "user",
    defaultName: "Anonymous food",
    slug: "anonymous-food"
  });
  assert.equal(created.id, "food-1");
  assert.equal(JSON.parse(global.localStorage.getItem("mentor_nutrition_foods_v1")).userFoods[0].id, "food-1");

  await global.MentorFoodRepository.updateUserFood("food-1", { defaultName: "Updated food" });
  assert.notEqual(global.localStorage.getItem("mentor_nutrition_foods_v1_backup"), null);
  assert.equal(global.localStorage.getItem("mentor_nutrition_foods_v1_staging"), null);

  global.MentorFoodRepository = { getById: () => null, getAll: () => [] };
  await inventoryData.initialize();
  load("js/nutrition/repositories/inventory.repository.js");
  await global.MentorInventoryRepository.initialize();
  const batch = await global.MentorInventoryRepository.createBatch({ foodId: null, quantity: 1, unit: "kom" });
  assert.match(batch.id, /^inventory_batch-generated-/);
  assert.equal(JSON.parse(global.localStorage.getItem("mentor_nutrition_inventory_v1")).batches[0].id, batch.id);
  assert.equal(global.localStorage.getItem("mentor_nutrition_inventory_v1_staging"), null);

  load("js/nutrition/repositories/planning.repository.js");
  const planningSave = global.MentorPlanningRepository.saveMealPlanEntry({ recipeId: "recipe-1" });
  assert.equal(typeof planningSave.then, "function");
  const entry = await planningSave;
  assert.equal(JSON.parse(global.localStorage.getItem("mentor_nutrition_inventory_v1")).mealPlanEntries[0].id, entry.id);

  const beforeFailure = inventoryData.getEnvelope();
  global.localStorage.failWritesFor = "mentor_nutrition_inventory_v1";
  await assert.rejects(
    global.MentorInventoryRepository.createBatch({ foodId: null, quantity: 2, unit: "kom" }),
    { name: "QuotaExceededError" }
  );
  assert.deepEqual(inventoryData.getEnvelope(), beforeFailure);
  assert.equal(global.localStorage.getItem("mentor_nutrition_inventory_v1_staging"), null);
});
