const test = require("node:test");
const assert = require("node:assert/strict");
const { webcrypto } = require("node:crypto");
const { loadPhase0Scripts, memoryStorage } = require("./test-helpers");

function load() {
  return loadPhase0Scripts([
    "js/data/legacy/legacy-storage.registry.js",
    "js/data/validation/legacy-payload.validators.js",
    "js/data/legacy/legacy-storage.reader.js",
    "js/data/backup/backup-checksum.service.js",
    "js/data/audit/storage-audit.service.js"
  ]);
}

test("registry contains every approved localStorage and legacy IndexedDB source", () => {
  const api = load();
  const keys = api.LegacyStorageRegistry.localStorageKeys;
  [
    "mentor_database",
    "mentor_brainstorming_ideas",
    "mentorFinanceStateV1",
    "mentorTransactionImportTemplatesV1",
    "mentorFinanceAssetsV1",
    "mentorFinancialComparisonSnapshotsV1",
    "mentorFinancialComparisonOptionsV1",
    "mentorFinancialComparisonResearchCacheV1",
    "mentor_language",
    "mentorPlanner.language",
    "mentor_nutrition_foods_v1",
    "mentor_nutrition_foods_v1_backup",
    "mentor_nutrition_foods_v1_staging",
    "mentor_nutrition_inventory_v1",
    "mentor_nutrition_inventory_v1_backup",
    "mentor_nutrition_inventory_v1_staging",
    "mentor_nutrition_inventory_v1_legacy_backup",
    "mentor_nutrition_plan_favorites_v1",
    "mentor_nutrition_fridge_v1",
    "mentor_nutrition_stock_v1"
  ].forEach((key) => assert.ok(keys.includes(key), key));
  assert.equal(api.LegacyStorageRegistry.indexedDbSources[0].database, "mentor_nutrition_images");
  assert.equal(api.LegacyStorageRegistry.indexedDbSources[0].store, "foodImages");
});

test("snapshot reader and audit are strictly read-only and audit does not expose raw payload", async () => {
  const api = load();
  const storage = memoryStorage({
    mentor_language: "sr",
    mentor_brainstorming_ideas: JSON.stringify([{ id: "idea-1", title: "Private title" }])
  });
  const snapshot = api.LegacyStorageReader.readLocalStorageSnapshot(
    storage,
    api.LegacyStorageRegistry.localStorageSources,
    () => "2026-01-01T00:00:00.000Z"
  );
  const audit = await api.StorageAuditService.auditLocalStorageSnapshot(snapshot, { cryptoApi: webcrypto });

  assert.equal(storage.calls.set.length, 0);
  assert.equal(storage.calls.remove.length, 0);
  assert.equal(storage.calls.get.length, api.LegacyStorageRegistry.localStorageKeys.length);
  assert.equal(audit.totals.present, 2);
  assert.equal(audit.entries.find((entry) => entry.key === "mentor_language").validationStatus, "valid");
  assert.equal(JSON.stringify(audit).includes("Private title"), false);
  assert.equal("raw" in audit.entries.find((entry) => entry.key === "mentor_brainstorming_ideas"), false);
});

test("invalid only candidate is reported as invalid instead of becoming empty valid data", async () => {
  const api = load();
  const storage = memoryStorage({ mentor_nutrition_foods_v1: "{\"version\":1,\"userFoods\":[]}" });
  const snapshot = api.LegacyStorageReader.readLocalStorageSnapshot(storage, api.LegacyStorageRegistry.localStorageSources);
  const audit = await api.StorageAuditService.auditLocalStorageSnapshot(snapshot, { cryptoApi: webcrypto });
  const food = audit.entries.find((entry) => entry.key === "mentor_nutrition_foods_v1");

  assert.equal(food.validationStatus, "invalid");
  assert.ok(food.errors.some((error) => error.startsWith("INVALID_ARRAY:")));
});
