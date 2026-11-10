"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function setup() {
  const root = vm.createContext({ console, URL, Intl });
  root.window = root;
  root.addEventListener = () => {};
  root.MentorI18n = { locale: "sr" };
  root.MentorNutritionComponents = {
    esc: (value) => String(value ?? ""),
    t: (_key, fallback, params = {}) => Object.entries(params).reduce((text, [key, value]) => text.replaceAll(`{{${key}}}`, value), fallback)
  };
  root.MentorNutritionIcons = { icon: () => "" };
  let nextId = 0;
  root.MentorNutritionId = { create: () => `batch-${++nextId}` };
  const foods = [
    { id: "rice", defaultName: "Rice", categoryId: "grains", referenceUnit: "g" },
    { id: "milk", defaultName: "Milk", categoryId: "beverages", referenceUnit: "ml" },
    { id: "eggs", defaultName: "Eggs", categoryId: "eggs", referenceUnit: "kom" }
  ];
  root.MentorFoodRepository = {
    getAll: () => structuredClone(foods),
    getById: (id) => structuredClone(foods.find((food) => food.id === id) || null)
  };
  let envelope = { batches: [], locations: [{ id: "location_fridge" }], allocations: [], preferences: [], recipes: [], mealPlanEntries: [] };
  root.MentorInventoryRepository = {
    mutate(callback) {
      const next = structuredClone(envelope);
      const result = callback(next);
      envelope = next;
      return Promise.resolve(structuredClone(result));
    },
    getBatches: () => structuredClone(envelope.batches),
    getBatchById: (id) => structuredClone(envelope.batches.find((row) => row.id === id) || null),
    getLocations: () => structuredClone(envelope.locations),
    getLocationById: (id) => structuredClone(envelope.locations.find((row) => row.id === id) || null),
    getPreferences: () => [],
    getAllocations: () => structuredClone(envelope.allocations)
  };
  const load = (file) => vm.runInContext(fs.readFileSync(path.join(__dirname, "../..", file), "utf8"), root, { filename: file });
  load("js/nutrition/services/unit-conversion.service.js");
  load("js/nutrition/services/inventory.service.js");
  load("js/nutrition/services/planning.service.js");
  load("js/nutrition/components/inventory-form.js");
  return { root, snapshot: () => structuredClone(envelope) };
}

test("package count and contents save as physical stock used by planning and reopen for editing", async () => {
  const { root } = setup();
  const saved = await root.MentorInventoryService.saveBatch({ foodId: "rice", locationId: "location_fridge", quantity: "2", unit: "box", packageSize: "300", packageUnit: "g" });
  assert.equal(saved.quantity, 600);
  assert.equal(saved.unit, "g");
  assert.equal(saved.packageCount, 2);
  assert.equal(saved.packageSize, 300);
  assert.equal(saved.packageType, "box");
  assert.equal(root.MentorPlanningService.available("rice", "g"), 600);

  const state = {};
  root.MentorNutritionInventoryFormUI.open(state, saved.id);
  assert.equal(state.inventoryForm.draft.quantity, 2);
  assert.equal(state.inventoryForm.draft.unit, "box");
  assert.equal(state.inventoryForm.draft.packageSize, 300);
  const html = root.MentorNutritionInventoryFormUI.render(state);
  assert.match(html, /nutrition-inventory-quantity-row/);
  assert.match(html, /data-inventory-field="packageSize"[^>]*required/);
  assert.match(html, /600 g/);

  state.inventoryForm.draft.quantity = "3";
  const updated = await root.MentorInventoryService.saveBatch(state.inventoryForm.draft, saved.id);
  assert.equal(updated.quantity, 900);
  assert.equal(updated.packageCount, 3);
  assert.equal(root.MentorPlanningService.available("rice", "g"), 900);
});

test("partly consumed packages reopen as remaining physical quantity and cannot silently refill", async () => {
  const { root } = setup();
  const saved = await root.MentorInventoryService.saveBatch({ foodId: "rice", locationId: "location_fridge", quantity: "2", unit: "box", packageSize: "300", packageUnit: "g" });
  await root.MentorInventoryService.consume(saved.id, 100, "g");
  const state = {};
  root.MentorNutritionInventoryFormUI.open(state, saved.id);
  assert.equal(state.inventoryForm.draft.unit, "g");
  assert.equal(state.inventoryForm.draft.quantity, 500);
  assert.equal(state.inventoryForm.draft.packageSize, "");
  assert.match(root.MentorNutritionInventoryFormUI.render(state), /data-inventory-field="packageSize"[^>]*disabled/);
  const updated = await root.MentorInventoryService.saveBatch(state.inventoryForm.draft, saved.id);
  assert.equal(updated.quantity, 500);
  assert.equal(root.MentorPlanningService.available("rice", "g"), 500);
});

test("package size follows food defaults for liquids and countable foods; missing size does not write", async () => {
  const { root, snapshot } = setup();
  assert.equal(root.MentorNutritionInventoryFormUI.blank("milk").packageUnit, "ml");
  assert.equal(root.MentorNutritionInventoryFormUI.blank("eggs").packageUnit, "kom");
  const milk = await root.MentorInventoryService.saveBatch({ foodId: "milk", locationId: "location_fridge", quantity: "2", unit: "bottle", packageSize: "750", packageUnit: "ml" });
  const eggs = await root.MentorInventoryService.saveBatch({ foodId: "eggs", locationId: "location_fridge", quantity: "2", unit: "box", packageSize: "6", packageUnit: "kom" });
  assert.equal(milk.quantity, 1500);
  assert.equal(eggs.quantity, 12);
  assert.equal(root.MentorPlanningService.available("milk", "ml"), 1500);
  assert.equal(root.MentorPlanningService.available("eggs", "kom"), 12);
  const before = snapshot();
  await assert.rejects(root.MentorInventoryService.saveBatch({ foodId: "rice", locationId: "location_fridge", quantity: "2", unit: "jar", packageSize: "", packageUnit: "g" }), (error) => error.code === "INVENTORY_VALIDATION_FAILED" && error.details.some((item) => item.field === "packageSize"));
  assert.deepEqual(snapshot(), before);
});
