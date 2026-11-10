"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const clone = (value) => JSON.parse(JSON.stringify(value));
const ROOT = path.resolve(__dirname, "../..");
const ACTIVE = ["planned", "reserved", "partially_reserved", "missing"];

// Simulate local 2030-01-01 00:30 while ISO/UTC is still 2029-12-31.
// Dates explicitly constructed for parsing keep ordinary calendar behavior.
class BoundaryDate extends Date {
  constructor(...args) { super(...(args.length ? args : ["2029-12-31T23:30:00.000Z"])); this.isClock = args.length === 0; }
  getFullYear() { return this.isClock ? 2030 : super.getFullYear(); }
  getMonth() { return this.isClock ? 0 : super.getMonth(); }
  getDate() { return this.isClock ? 1 : super.getDate(); }
}

function fixture(initial = {}) {
  const envelope = { batches: [], locations: [], allocations: [], recipes: [], mealPlanEntries: [], preferences: [], stores: [], recipeFavoriteIds: [], shoppingItems: [], ...clone(initial) };
  const root = vm.createContext({ console, Date: BoundaryDate, URL });
  root.window = root;
  root.addEventListener = () => {};
  let id = 0;
  root.MentorNutritionId = { create: (prefix) => `${prefix}-${++id}` };
  const foods = [{ id: "food", categoryId: "other" }, { id: "egg", categoryId: "eggs" }];
  root.MentorFoodRepository = { getAll: () => clone(foods), getById: (foodId) => clone(foods.find((food) => food.id === foodId) || null) };
  root.MentorInventoryRepository = {
    read: () => clone(envelope),
    mutate(callback) {
      const next = clone(envelope), result = callback(next);
      Object.assign(envelope, next);
      return Promise.resolve(clone(result));
    },
    getAllocations: () => clone(envelope.allocations),
    getBatches: () => clone(envelope.batches),
    getBatchById: (batchId) => clone(envelope.batches.find((batch) => batch.id === batchId) || null),
    getPreferences: () => []
  };
  for (const file of [
    "js/nutrition/services/unit-conversion.service.js",
    "js/nutrition/services/inventory.service.js",
    "js/nutrition/repositories/planning.repository.js",
    "js/nutrition/services/planning.service.js"
  ]) vm.runInContext(fs.readFileSync(path.join(ROOT, file), "utf8"), root, { filename: file });
  return { root, envelope, inventory: root.MentorInventoryService, planning: root.MentorPlanningService };
}

const batch = (id, expiryDate, quantity = 10, unit = "g", foodId = "food") => ({ id, expiryDate, quantity, unit, foodId, addedAt: "2029-12-01", status: "available" });
const request = (extra = {}) => ({ mealPlanEntryId: "meal", recipeId: "recipe", foodId: "food", unit: "g", requiredQuantity: 10, plannedDate: "2030-01-05", mealType: "lunch", ...extra });
const recipe = (foodId = "food", quantity = 10, unit = "g") => ({ id: "recipe", name: "Test recipe", servings: 1, mealType: "lunch", ingredients: [{ foodId, quantity, unit }] });
const active = (envelope, entryId = "meal") => envelope.allocations.filter((row) => row.mealPlanEntryId === entryId && ACTIVE.includes(row.status));

for (const route of ["inventory", "planning"]) {
  test(`${route}: future meal excludes expired, before-meal and malformed expiry; expiry day is inclusive`, async () => {
    const f = fixture({
      recipes: [recipe("food", 35)],
      batches: [batch("expired", "2029-12-31"), batch("before-meal", "2030-01-04"), batch("exact", "2030-01-05"),
        batch("valid-timestamp", "2030-01-05T12:00:00.000Z"), batch("later", "2030-01-06"), batch("no-expiry", null),
        batch("invalid-calendar", "2030-02-30"), batch("invalid-text", "not-a-date"), batch("invalid-timestamp", "2030-01-05Tgarbage")]
    });
    if (route === "inventory") await f.inventory.reserve(request({ requiredQuantity: 35 }));
    else await f.planning.saveMealPlanEntry({ recipeId: "recipe", servings: 1, plannedDate: "2030-01-05", mealType: "lunch" });
    const rows = f.envelope.allocations.filter((row) => row.status === "reserved");
    assert.deepEqual(rows.map((row) => row.inventoryBatchId), ["exact", "valid-timestamp", "later", "no-expiry"]);
    assert.deepEqual(rows.map((row) => row.reservedQuantity), [10, 10, 10, 5]);
    assert.equal(f.envelope.allocations.some((row) => ["missing", "partially_reserved"].includes(row.status)), false);
  });
}

test("reservation uses local calendar today even when UTC still names yesterday", async () => {
  for (const plannedDate of [undefined, "2029-12-30", "2030-01-01", "2030-02-30", "bad-date"]) {
    const f = fixture({ batches: [batch("utc-yesterday", "2029-12-31"), batch("today", "2030-01-01")] });
    const result = await f.inventory.reserve(request({ plannedDate }));
    assert.equal(result.reservedQuantity, 10);
    assert.deepEqual(active(f.envelope).map((row) => row.inventoryBatchId), ["today"]);
  }
});

test("FEFO keeps the oldest lot first on tied expiry and converts existing reservations", async () => {
  const f = fixture({
    batches: [batch("later-kg", "2030-01-08", 0.2, "kg"),
      { ...batch("same-new", "2030-01-05", 200), addedAt: "2029-12-02" },
      { ...batch("same-old", "2030-01-05", 200), addedAt: "2029-12-01" }],
    allocations: [
      { id: "existing", mealPlanEntryId: "other", inventoryBatchId: "same-old", unit: "kg", reservedQuantity: 0.05, status: "reserved" },
      { id: "consumed", mealPlanEntryId: "completed", inventoryBatchId: "same-old", unit: "g", reservedQuantity: 100, consumedQuantity: 100, status: "consumed" },
      { id: "released", mealPlanEntryId: "removed", inventoryBatchId: "same-old", unit: "g", reservedQuantity: 100, status: "released" }
    ]
  });
  const history = clone(f.envelope.allocations);
  const result = await f.inventory.reserve(request({ requiredQuantity: 300 }));
  assert.equal(result.missingQuantity, 0);
  assert.deepEqual(active(f.envelope).map((row) => [row.inventoryBatchId, row.reservedQuantity]), [["same-old", 150], ["same-new", 150]]);
  assert.deepEqual(f.envelope.allocations.slice(0, 3), history);
});

test("egg count/gram conversions preserve other reservations and cannot allocate stock twice", async () => {
  const f = fixture({
    batches: [batch("egg-g", "2030-01-05", 150, "g", "egg"), batch("egg-pieces", "2030-01-06", 2, "kom", "egg")],
    allocations: [{ id: "existing", mealPlanEntryId: "other", inventoryBatchId: "egg-pieces", unit: "g", reservedQuantity: 50, status: "reserved" }]
  });
  const first = await f.inventory.reserve(request({ foodId: "egg", requiredQuantity: 4, unit: "kom" }));
  assert.equal(first.reservedQuantity, 4);
  assert.deepEqual(active(f.envelope).map((row) => [row.inventoryBatchId, row.reservedQuantity, row.unit]), [["egg-g", 150, "g"], ["egg-pieces", 1, "kom"]]);
  const second = await f.inventory.reserve(request({ mealPlanEntryId: "second", foodId: "egg", requiredQuantity: 2, unit: "kom" }));
  assert.equal(second.reservedQuantity, 0);
  assert.equal(second.missingQuantity, 2);
  assert.equal(second.status, "missing");
  assert.equal(f.envelope.batches[0].quantity, 150);
});

test("replacing a direct reservation releases only its active rows and preserves completed history", async () => {
  const f = fixture({
    batches: [batch("lot", "2030-01-05", 100)],
    allocations: [{ id: "completed-history", mealPlanEntryId: "meal", inventoryBatchId: "lot", unit: "g", reservedQuantity: 20, consumedQuantity: 20, status: "consumed" }]
  });
  const history = clone(f.envelope.allocations[0]);
  await f.inventory.reserve(request({ requiredQuantity: 80 }));
  await f.inventory.reserve(request({ requiredQuantity: 80 }));
  assert.equal(active(f.envelope).length, 1);
  assert.equal(active(f.envelope)[0].reservedQuantity, 80);
  assert.deepEqual(f.envelope.allocations[0], history);
});

test("planning resync applies future cutoff repeatedly without rewriting completed history", async () => {
  const f = fixture({
    recipes: [recipe()],
    mealPlanEntries: [{ id: "meal", recipeId: "recipe", plannedDate: "2030-01-05", mealType: "lunch", servings: 1, status: "planned" },
      { id: "done", recipeId: "recipe", plannedDate: "2029-12-31", mealType: "lunch", servings: 1, status: "completed", completedAt: "done-stamp" }],
    batches: [batch("too-early", "2030-01-04"), batch("later", "2030-01-06")],
    allocations: [{ id: "old-active", mealPlanEntryId: "meal", inventoryBatchId: "too-early", unit: "g", reservedQuantity: 10, status: "reserved" },
      { id: "history", mealPlanEntryId: "done", inventoryBatchId: "too-early", unit: "g", reservedQuantity: 5, consumedQuantity: 5, status: "consumed" }]
  });
  const history = clone(f.envelope.allocations[1]);
  for (let count = 0; count < 3; count++) await f.planning.resyncActiveReservations();
  assert.deepEqual(active(f.envelope).map((row) => row.inventoryBatchId), ["later"]);
  assert.equal(f.envelope.allocations.length, 2);
  assert.deepEqual(f.envelope.allocations.find((row) => row.id === "history"), history);
  assert.equal(f.envelope.batches[0].quantity, 10);
});

test("moving a planned meal past its lot expiry releases that reservation and exposes the shortage", async () => {
  const f = fixture({ recipes: [recipe()], batches: [batch("early", "2030-01-03", 10), batch("late", "2030-01-06", 5)] });
  const first = await f.planning.saveMealPlanEntry({ recipeId: "recipe", servings: 1, plannedDate: "2030-01-02", mealType: "lunch" });
  assert.equal(first.reservations[0].inventoryBatchId, "early");
  const moved = await f.planning.saveMealPlanEntry({ recipeId: "recipe", servings: 1, plannedDate: "2030-01-05", mealType: "lunch" }, first.entry.id);
  assert.deepEqual(clone(moved.reservations).map((row) => [row.inventoryBatchId, row.requiredQuantity, row.reservedQuantity, row.status]),
    [["late", 5, 5, "reserved"], [null, 5, 0, "partially_reserved"]]);
  assert.equal(f.envelope.batches[0].quantity, 10);
});

test("decimal free quantities round consistently and unrepresentable reservations remain missing", async () => {
  const f = fixture({ batches: [batch("decimal", "2030-01-05", 0.3)], allocations: [
    { id: "taken", mealPlanEntryId: "other", inventoryBatchId: "decimal", unit: "g", reservedQuantity: 0.1, status: "reserved" }
  ] });
  const result = await f.inventory.reserve(request({ requiredQuantity: 0.2 }));
  assert.equal(result.missingQuantity, 0);
  assert.equal(active(f.envelope)[0].reservedQuantity, 0.2);
  const small = fixture({ batches: [batch("kg", "2030-01-05", 1, "kg")] });
  const missing = await small.inventory.reserve(request({ requiredQuantity: 0.001, unit: "g" }));
  assert.equal(missing.missingQuantity, 0.001);
  assert.equal(missing.allocations.some((row) => row.status === "reserved" && row.reservedQuantity === 0), false);
});
