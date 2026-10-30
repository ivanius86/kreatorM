const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

global.window = global;
global.CustomEvent = class CustomEvent {
  constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
};

const script = fs.readFileSync(path.join(__dirname, "../../js/nutrition/inventory-storage.js"), "utf8");

function envelope(note = "") {
  return {
    version: 1,
    updatedAt: null,
    batches: [{ id: "batch-1", note }],
    locations: [{ id: "location-1" }],
    allocations: [],
    preferences: [],
    stores: [],
    recipes: [],
    mealPlanEntries: [],
    shoppingItems: [],
    migrations: []
  };
}

function quotaStorage(limit) {
  const values = new Map();
  const sizeWith = (key, value) => [...values].reduce((sum, [itemKey, itemValue]) => (
    sum + (itemKey === key ? 0 : itemKey.length + itemValue.length)
  ), key.length + value.length);
  return {
    values,
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) {
      const text = String(value);
      if (sizeWith(key, text) > limit) {
        const error = new Error("Quota exceeded");
        error.name = "QuotaExceededError";
        throw error;
      }
      values.set(key, text);
    },
    removeItem(key) { values.delete(key); }
  };
}

function loadWith(storage, dispatchEvent = () => true) {
  window.localStorage = storage;
  window.dispatchEvent = dispatchEvent;
  vm.runInThisContext(script);
  return window.MentorNutritionInventoryStorage;
}

test("inventory save falls back to an atomic primary replacement when staging exceeds quota", () => {
  const storage = quotaStorage(850);
  const api = loadWith(storage);
  const previous = JSON.stringify(api.normalize(envelope("old")));
  storage.setItem(api.KEY, previous);

  const saved = api.save(envelope("new"));

  assert.equal(saved.batches[0].note, "new");
  assert.equal(JSON.parse(storage.getItem(api.KEY)).batches[0].note, "new");
  assert.equal(storage.getItem(`${api.KEY}_staging`), null);
});

test("a failing refresh listener does not report a persisted inventory save as failed", () => {
  const storage = quotaStorage(5000);
  const api = loadWith(storage, () => { throw new Error("listener failed"); });

  assert.doesNotThrow(() => api.save(envelope("persisted")));
  assert.equal(JSON.parse(storage.getItem(api.KEY)).batches[0].note, "persisted");
});
