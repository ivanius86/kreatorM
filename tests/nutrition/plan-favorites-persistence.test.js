const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadWithLegacy(raw) {
  const clone = (value) => JSON.parse(JSON.stringify(value));
  let envelope = {
    version: 1, updatedAt: null, batches: [], locations: [], allocations: [],
    preferences: [], stores: [], recipes: [{ id: "recipe-1" }, { id: "recipe-2" }],
    mealPlanEntries: [], shoppingItems: [], recipeFavoriteIds: [], migrations: []
  };
  let saves = 0;
  const dataRepository = {
    initialize: async () => {}, migrateLegacyIfNeeded: async () => {}, isReady: () => true,
    getEnvelope: () => clone(envelope),
    saveEnvelope: async (next) => { envelope = clone(next); saves += 1; return clone(envelope); }
  };
  const win = {
    localStorage: { getItem: (key) => {
      if (raw instanceof Error) throw raw;
      return key === "mentor_nutrition_plan_favorites_v1" ? raw : null;
    } },
    MentorData: { repositories: { nutritionInventoryData: dataRepository } },
    MentorFoodRepository: { getById: () => null, getAll: () => [] },
    MentorNutritionId: { create: () => "new-id" }
  };
  const context = vm.createContext({ window: win, console });
  for (const file of ["js/nutrition/repositories/inventory.repository.js", "js/nutrition/repositories/planning.repository.js"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "../..", file), "utf8"), context);
  }
  return { win, getEnvelope: () => clone(envelope), getSaves: () => saves };
}

test("legacy favorites migrate once into the planning envelope and remain removed after toggling", async () => {
  const app = loadWithLegacy('["recipe-1","recipe-1"]');
  await app.win.MentorInventoryRepository.initialize();
  assert.deepEqual(app.getEnvelope().recipeFavoriteIds, ["recipe-1"]);
  assert.equal(app.getEnvelope().migrations.filter((entry) => entry.id === "legacy-plan-favorites-v1").length, 1);
  await app.win.MentorPlanningRepository.toggleRecipeFavorite("recipe-1");
  assert.deepEqual(app.getEnvelope().recipeFavoriteIds, []);
  await app.win.MentorInventoryRepository.initialize();
  assert.deepEqual(app.getEnvelope().recipeFavoriteIds, []);
  assert.equal(app.getSaves(), 3); // defaults, migration, toggle
  await app.win.MentorPlanningRepository.toggleRecipeFavorite("missing-recipe");
  assert.equal(app.getSaves(), 3);
});

test("invalid legacy favorites are preserved without a migration marker", async () => {
  const app = loadWithLegacy("{broken");
  await app.win.MentorInventoryRepository.initialize();
  assert.equal(app.getEnvelope().migrations.some((entry) => entry.id === "legacy-plan-favorites-v1"), false);
  assert.deepEqual(app.getEnvelope().recipeFavoriteIds, []);
});

test("unavailable legacy localStorage does not block the active repository", async () => {
  const app = loadWithLegacy(new Error("storage blocked"));
  await app.win.MentorInventoryRepository.initialize();
  assert.deepEqual(app.getEnvelope().recipeFavoriteIds, []);
  await app.win.MentorPlanningRepository.toggleRecipeFavorite("recipe-1");
  assert.deepEqual(app.getEnvelope().recipeFavoriteIds, ["recipe-1"]);
});
