const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "../..");
const CORE_SCRIPTS = [
  "js/data/state/repository-state.constants.js",
  "js/data/errors/data-error.js",
  "js/data/state/data-event-bus.js",
  "js/data/contracts/storage-adapter.contract.js",
  "js/data/contracts/repository.contract.js",
  "js/data/adapters/local-storage.adapter.js",
  "js/data/repositories/repository-helpers.js",
  "js/data/repositories/settings.repository.js",
  "js/data/repositories/ideas.repository.js",
  "js/data/repositories/finance.repository.js",
  "js/data/repositories/assets.repository.js",
  "js/data/repositories/comparisons.repository.js"
];

function storageFixture(values = {}) {
  const rows = new Map(Object.entries(values).map(([key, value]) => [
    key,
    typeof value === "string" ? value : JSON.stringify(value)
  ]));
  return {
    rows,
    getItem(key) { return rows.has(key) ? rows.get(key) : null; },
    setItem(key, value) { rows.set(key, String(value)); },
    removeItem(key) { rows.delete(key); }
  };
}

function loadDataLayer(storage) {
  global.window = global;
  global.localStorage = storage;
  global.CustomEvent = class CustomEvent {
    constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
  };
  global.dispatchEvent = () => true;
  CORE_SCRIPTS.forEach((relativePath) => {
    vm.runInThisContext(fs.readFileSync(path.join(ROOT, relativePath), "utf8"), { filename: relativePath });
  });
  const adapter = new global.MentorLocalStorageAdapter(storage);
  return { adapter, factories: global.MentorDataRepositoryFactories };
}

function centralDatabase(overrides = {}) {
  return {
    version: 1,
    ideas: [],
    finances: [],
    assets: [],
    comparisons: [],
    settings: { language: null },
    ...overrides
  };
}

test("LocalStorageAdapter exposes Promise reads and preserves durable JSON shape", async () => {
  const storage = storageFixture();
  const { adapter } = loadDataLayer(storage);

  const writeResult = adapter.write("example", { stable: true });
  assert.equal(typeof writeResult.then, "function");
  await writeResult;
  assert.equal(storage.getItem("example"), '{"stable":true}');
  assert.deepEqual(await adapter.read("example"), { stable: true });
});

test("Ideas repository hydrates before sync reads and writes both existing durable sources", async () => {
  const storage = storageFixture({
    mentor_database: centralDatabase({ ideas: [{ id: "central", title: "Central" }] }),
    mentor_brainstorming_ideas: [{ id: "legacy", title: "Legacy" }]
  });
  const { adapter, factories } = loadDataLayer(storage);
  const repository = factories.createIdeasRepository(adapter);

  assert.throws(() => repository.getAll(), { code: "REPOSITORY_NOT_READY" });
  await repository.initialize();
  assert.deepEqual(repository.getAll().map((item) => item.id), ["central", "legacy"]);

  await repository.replaceAll([{ id: "saved", title: "Saved" }]);
  assert.deepEqual(JSON.parse(storage.getItem("mentor_brainstorming_ideas")), [{ id: "saved", title: "Saved" }]);
  assert.deepEqual(JSON.parse(storage.getItem("mentor_database")).ideas, [{ id: "saved", title: "Saved" }]);
});

test("An invalid only candidate enters recoveryRequired instead of activating an empty repository", async () => {
  const storage = storageFixture({ mentor_brainstorming_ideas: "{broken" });
  const { adapter, factories } = loadDataLayer(storage);
  const repository = factories.createIdeasRepository(adapter);

  await assert.rejects(repository.initialize(), { code: "DATA_RECOVERY_REQUIRED" });
  assert.equal(repository.getState(), "recoveryRequired");
  assert.throws(() => repository.getAll(), { code: "REPOSITORY_NOT_READY" });
});

test("Feature hydration initializes the repositories required by Finance before render", async () => {
  const storage = storageFixture({ mentor_database: centralDatabase() });
  const { adapter, factories } = loadDataLayer(storage);
  const repositories = {
    ideas: factories.createIdeasRepository(adapter),
    finance: factories.createFinanceRepository(adapter),
    assets: factories.createAssetsRepository(adapter),
    comparisons: factories.createComparisonsRepository(adapter)
  };
  global.MentorData = { repositories };
  vm.runInThisContext(
    fs.readFileSync(path.join(ROOT, "js/data/bootstrap/feature-hydration.js"), "utf8"),
    { filename: "js/data/bootstrap/feature-hydration.js" }
  );

  await global.MentorFeatureHydration.initializeFeature("finance");
  assert.equal(global.MentorFeatureHydration.isReady("finance"), true);
});

test("Finance repository selects the newer valid savedAt candidate", async () => {
  const storage = storageFixture({
    mentor_database: centralDatabase({
      finances: [{
        id: "finance-state",
        type: "financeState",
        savedAt: "2026-07-01T10:00:00.000Z",
        transactions: [{ id: "central" }]
      }]
    }),
    mentorFinanceStateV1: {
      savedAt: "2026-07-02T10:00:00.000Z",
      transactions: [{ id: "legacy-newer" }]
    }
  });
  const { adapter, factories } = loadDataLayer(storage);
  const repository = factories.createFinanceRepository(adapter);

  await repository.initialize();
  assert.equal(repository.getState().transactions[0].id, "legacy-newer");
});
