const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "../..");
[
  "js/data/state/repository-state.constants.js",
  "js/data/errors/data-error.js",
  "js/data/state/data-event-bus.js",
  "js/data/contracts/storage-adapter.contract.js",
  "js/data/contracts/repository.contract.js",
  "js/data/adapters/local-storage.adapter.js",
  "js/data/repositories/repository-helpers.js",
  "js/data/repositories/goals.repository.js",
  "js/data/services/goals.service.js"
].forEach((file) => {
  vm.runInThisContext(fs.readFileSync(path.join(root, file), "utf8"), { filename: file });
});

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

test("Goals hydrate shows nonpersistent templates, then copy-on-write persists only the user copy", async () => {
  global.window = global;
  global.GOAL_SAMPLE_TEMPLATES = Object.freeze([
    Object.freeze({
      id: "seed-goal",
      type: "long-term",
      title: "Sample goal",
      actions: [{ id: "seed-action", title: "First step", completed: false }],
      createdAt: "2026-01-01T00:00:00.000Z"
    })
  ]);
  global.createId = () => "goal-user-copy";

  const storage = new MemoryStorage();
  const adapter = new global.MentorLocalStorageAdapter(storage);
  const goals = global.MentorDataRepositoryFactories.createGoalsRepository(adapter);
  global.MentorData = { repositories: { goals } };
  await goals.initialize();

  const appState = { goals: [] };
  await global.MentorGoalsService.hydrateAppState(appState);
  assert.equal(appState.goals[0].id, "seed-goal");
  assert.equal(storage.getItem("mentor_goals_v1"), null);

  const copy = await global.MentorGoalsService.materializeForWrite(appState.goals[0], appState);
  assert.equal(copy.id, "goal-user-copy");
  assert.equal(copy.sourceTemplateId, "seed-goal");
  assert.equal(appState.goals.length, 1);
  assert.equal(appState.goals[0].id, "goal-user-copy");
  assert.deepEqual(copy.actions, global.GOAL_SAMPLE_TEMPLATES[0].actions);
  assert.equal(Object.hasOwn(copy, "notesList"), false);

  const stored = JSON.parse(storage.getItem("mentor_goals_v1"));
  assert.equal(stored.version, 1);
  assert.deepEqual(stored.goals.map((goal) => goal.id), ["goal-user-copy"]);
  assert.equal(stored.goals.some((goal) => goal.id === "seed-goal"), false);

  const reloaded = global.MentorDataRepositoryFactories.createGoalsRepository(adapter);
  global.MentorData.repositories.goals = reloaded;
  await reloaded.initialize();
  const nextAppState = { goals: [] };
  await global.MentorGoalsService.hydrateAppState(nextAppState);
  assert.deepEqual(nextAppState.goals.map((goal) => goal.id), ["goal-user-copy"]);
});
