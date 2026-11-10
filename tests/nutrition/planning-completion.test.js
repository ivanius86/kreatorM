const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

global.window = global;

function loadService(envelope) {
  let sequence = 0;
  window.MentorNutritionId = { create(prefix) { sequence += 1; return `${prefix}-service-${sequence}`; } };
  window.MentorPlanningRepository = {};
  window.MentorFoodRepository = { getById(id) { return { id, categoryId:id === "egg" ? "eggs" : "other" }; }, getAll() { return [{ id:"egg", categoryId:"eggs" }]; } };
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, "../../js/nutrition/services/unit-conversion.service.js"), "utf8"));
  window.MentorInventoryRepository = {
    mutate(callback) { return JSON.parse(JSON.stringify(callback(envelope))); },
    getAllocations() { return JSON.parse(JSON.stringify(envelope.allocations)); }
  };
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, "../../js/nutrition/services/inventory.service.js"), "utf8"));
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, "../../js/nutrition/services/planning.service.js"), "utf8"));
}

test("completing the same meal twice consumes inventory only once", () => {
  const envelope = {
    mealPlanEntries:[{ id:"entry-1", status:"planned" }],
    allocations:[{ id:"allocation-1", mealPlanEntryId:"entry-1", inventoryBatchId:"batch-1", reservedQuantity:3, unit:"kom", status:"reserved" }],
    batches:[{ id:"batch-1", quantity:10, unit:"kom", status:"available" }]
  };
  loadService(envelope);
  window.MentorPlanningService.completeMealPlanEntry("entry-1");
  const completedAt = envelope.mealPlanEntries[0].completedAt;
  window.MentorPlanningService.completeMealPlanEntry("entry-1");
  assert.equal(envelope.batches[0].quantity, 7);
  assert.equal(envelope.allocations[0].consumedQuantity, 3);
  assert.equal(envelope.mealPlanEntries[0].completedAt, completedAt);
});

test("removing a planned meal releases active reservations", () => {
  const envelope = {
    mealPlanEntries:[{ id:"entry-1", status:"planned" }],
    allocations:[{ id:"allocation-1", mealPlanEntryId:"entry-1", inventoryBatchId:"batch-1", reservedQuantity:2, unit:"kom", status:"reserved" }],
    batches:[{ id:"batch-1", quantity:10, unit:"kom", status:"available" }]
  };
  loadService(envelope);
  window.MentorPlanningService.removeMealPlanEntry("entry-1");
  assert.equal(envelope.mealPlanEntries.length, 0);
  assert.equal(envelope.allocations[0].status, "released");
  assert.equal(envelope.batches[0].quantity, 10);
});

test("copy target must change date or meal type", () => {
  const envelope = { mealPlanEntries:[], allocations:[], batches:[] };
  loadService(envelope);
  const source = { plannedDate:"2026-07-27", mealType:"breakfast" };
  assert.equal(window.MentorPlanningService.validateCopyTarget({ plannedDate:"2026-07-27", mealType:"breakfast" }, source).valid, false);
  assert.equal(window.MentorPlanningService.validateCopyTarget({ plannedDate:"2026-07-28", mealType:"breakfast" }, source).valid, true);
  assert.equal(window.MentorPlanningService.validateCopyTarget({ plannedDate:"2026-07-27", mealType:"lunch" }, source).valid, true);
});

test("calendar reorder keeps multiple daytime meals and inventory intact", () => {
  const date = "2026-09-14";
  const envelope = {
    mealPlanEntries:[
      { id:"lunch-1", plannedDate:date, mealType:"lunch" },
      { id:"snack-1", plannedDate:date, mealType:"snack" },
      { id:"lunch-2", plannedDate:date, mealType:"lunch" },
      { id:"breakfast-1", plannedDate:date, mealType:"breakfast" }
    ],
    allocations:[{ id:"allocation-1", mealPlanEntryId:"lunch-1", status:"reserved" }],
    batches:[{ id:"batch-1", quantity:10 }]
  };
  loadService(envelope);
  window.MentorPlanningService.reorderCalendarSegment(date, "daytime", ["lunch-2", "lunch-1", "snack-1"]);
  assert.deepEqual(envelope.mealPlanEntries.slice(0, 3).map((entry) => entry.displayOrder), [1, 2, 0]);
  assert.equal(envelope.mealPlanEntries[3].displayOrder, undefined);
  assert.deepEqual(envelope.allocations, [{ id:"allocation-1", mealPlanEntryId:"lunch-1", status:"reserved" }]);
  assert.deepEqual(envelope.batches, [{ id:"batch-1", quantity:10 }]);
  assert.throws(() => window.MentorPlanningService.reorderCalendarSegment(date, "daytime", ["breakfast-1", "lunch-1", "snack-1"]), /INVALID_CALENDAR_ORDER/);
});

test("editing a reordered meal preserves its calendar position", () => {
  const recipe = { id:"recipe-1", ingredients:[] };
  const envelope = {
    recipes:[recipe],
    mealPlanEntries:[{ id:"entry-1", recipeId:recipe.id, plannedDate:"2026-09-14", mealType:"lunch", servings:1, displayOrder:2, status:"planned" }],
    allocations:[], batches:[]
  };
  loadService(envelope);
  window.MentorPlanningRepository.getRecipeById = () => recipe;
  window.MentorPlanningService.saveMealPlanEntry({ recipeId:recipe.id, plannedDate:"2026-09-14", mealType:"lunch", servings:2 }, "entry-1");
  assert.equal(envelope.mealPlanEntries[0].displayOrder, 2);
  assert.equal(envelope.mealPlanEntries[0].servings, 2);
});

test("reservation resync does not touch completed meals", () => {
  const envelope = {
    recipes:[{ id:"r1", servings:1, ingredients:[{ foodId:"egg", quantity:1, unit:"kom" }] }],
    mealPlanEntries:[{ id:"done", recipeId:"r1", status:"completed", completedAt:"2026-07-27T10:00:00.000Z" }],
    allocations:[{ id:"consumed", mealPlanEntryId:"done", foodId:"egg", inventoryBatchId:"b1", unit:"g", reservedQuantity:50, consumedQuantity:50, status:"consumed" }],
    batches:[{ id:"b1", foodId:"egg", unit:"g", quantity:200 }]
  };
  loadService(envelope);
  window.MentorPlanningService.resyncActiveReservations();
  assert.equal(envelope.allocations.length, 1);
  assert.equal(envelope.allocations[0].status, "consumed");
  assert.equal(envelope.batches[0].quantity, 200);
});

test("repeated reservation resync stays bounded and preserves consumed and unrelated history", () => {
  const envelope = {
    recipes:[{ id:"r1", servings:1, ingredients:[{ foodId:"egg", quantity:7, unit:"kom" }] }],
    mealPlanEntries:[
      { id:"active", recipeId:"r1", plannedDate:"2026-07-27", mealType:"breakfast", servings:1, status:"planned" },
      { id:"done", recipeId:"r1", status:"completed", completedAt:"2026-07-26T10:00:00.000Z" }
    ],
    allocations:[
      { id:"old-active", mealPlanEntryId:"active", foodId:"egg", inventoryBatchId:null, requiredQuantity:7, reservedQuantity:0, unit:"kom", status:"missing" },
      { id:"consumed-history", mealPlanEntryId:"done", foodId:"egg", inventoryBatchId:"b-done", requiredQuantity:50, reservedQuantity:50, consumedQuantity:50, unit:"g", status:"consumed" },
      { id:"removed-entry-history", mealPlanEntryId:"removed-entry", foodId:"egg", inventoryBatchId:null, requiredQuantity:1, reservedQuantity:0, unit:"kom", status:"released" }
    ],
    batches:[{ id:"b1", foodId:"egg", quantity:250, unit:"g", status:"available", addedAt:"2026-07-20" }]
  };
  loadService(envelope);
  for (let index = 0; index < 6; index += 1) window.MentorPlanningService.resyncActiveReservations();
  const activeRows = envelope.allocations.filter((row) => row.mealPlanEntryId === "active");
  assert.equal(activeRows.length, 2);
  assert.equal(activeRows.filter((row) => row.status === "reserved").length, 1);
  assert.equal(activeRows.filter((row) => row.status === "partially_reserved").length, 1);
  assert.equal(envelope.allocations.some((row) => row.id === "consumed-history" && row.status === "consumed"), true);
  assert.equal(envelope.allocations.some((row) => row.id === "removed-entry-history" && row.status === "released"), true);
  assert.equal(envelope.allocations.length, 4);
});

function loadInventoryIntegration(envelope) {
  let sequence = 0;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const egg = { id:"egg", categoryId:"eggs" };
  window.MentorNutritionId = { create(prefix) { sequence += 1; return `${prefix}-${sequence}`; } };
  window.MentorFoodRepository = {
    getAll() { return [clone(egg)]; },
    getById(id) { return id === "egg" ? clone(egg) : null; }
  };
  window.MentorInventoryRepository = {
    mutate(callback) { return Promise.resolve(clone(callback(envelope))); },
    getPreferences() { return []; },
    getAllocations() { return clone(envelope.allocations); },
    getBatches() { return clone(envelope.batches); },
    getBatchById(id) { return clone(envelope.batches.find((row) => row.id === id) || null); },
    getLocationById(id) { return id === "location_fridge" ? { id } : null; },
    createBatch(record) { return this.mutate((data) => { const row={ ...record, id:window.MentorNutritionId.create("inventory_batch") };data.batches.push(row);return row; }); },
    updateBatch(id, patch) { return this.mutate((data) => { const index=data.batches.findIndex((row)=>row.id===id);data.batches[index]={ ...data.batches[index], ...patch };return data.batches[index]; }); },
    removeBatch(id) { return this.mutate((data) => { data.batches=data.batches.filter((row)=>row.id!==id);return true; }); }
  };
  window.MentorPlanningRepository = {};
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, "../../js/nutrition/services/unit-conversion.service.js"), "utf8"));
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, "../../js/nutrition/services/inventory.service.js"), "utf8"));
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, "../../js/nutrition/services/planning.service.js"), "utf8"));
}

test("inventory add and restock immediately resync planned egg reservations", async () => {
  const envelope = {
    locations:[{ id:"location_fridge" }],
    recipes:[{ id:"recipe-egg", servings:1, ingredients:[{ foodId:"egg", quantity:7, unit:"kom" }] }],
    mealPlanEntries:[{ id:"entry-egg", recipeId:"recipe-egg", plannedDate:"2026-07-27", mealType:"breakfast", servings:1, status:"planned" }],
    allocations:[{ id:"missing-old", mealPlanEntryId:"entry-egg", recipeId:"recipe-egg", foodId:"egg", inventoryBatchId:null, requiredQuantity:7, reservedQuantity:0, unit:"kom", status:"missing" }],
    batches:[]
  };
  loadInventoryIntegration(envelope);
  const batch = await window.MentorInventoryService.saveBatch({
    foodId:"egg", locationId:"location_fridge", quantity:150, unit:"g", addedAt:"2026-07-27",
    totalPrice:"", currency:"EUR", status:"available"
  });
  let active = envelope.allocations.filter((row) => row.mealPlanEntryId === "entry-egg" && ["reserved", "partially_reserved", "missing"].includes(row.status));
  assert.equal(active.find((row) => row.status === "reserved").reservedQuantity, 150);
  assert.equal(active.find((row) => row.status === "partially_reserved").requiredQuantity, 4);
  await window.MentorInventoryService.restock(batch.id, 2, "kom");
  active = envelope.allocations.filter((row) => row.mealPlanEntryId === "entry-egg" && ["reserved", "partially_reserved", "missing"].includes(row.status));
  assert.equal(active.find((row) => row.status === "reserved").reservedQuantity, 250);
  assert.equal(active.find((row) => row.status === "partially_reserved").requiredQuantity, 2);
});
