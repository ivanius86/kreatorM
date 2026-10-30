const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function backupSnapshot(raw, envelope) {
  const win = {
    localStorage: { getItem: () => raw },
    MentorDataPhase0: {}, MentorIndexedDB: {}
  };
  const context = vm.createContext({ window: win });
  for (const file of ["js/data/normalization/legacy-domain-normalizer.service.js", "js/data/backup/indexeddb-backup.service.js"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "../..", file), "utf8"), context);
  }
  const snapshot = { nutritionInventoryData: [{ id: "current", envelope }], legacyBackups: [] };
  const output = win.MentorIndexedDB.IndexedDbBackupService.includeUnmigratedPlanFavorites(snapshot);
  return { output: JSON.parse(JSON.stringify(output)), original: snapshot };
}

test("IndexedDB backup captures valid pre-hydration favorites without changing live records", () => {
  const { output, original } = backupSnapshot('["recipe-1"]', { version: 1, recipeFavoriteIds: [], migrations: [] });
  assert.deepEqual(output.nutritionInventoryData[0].envelope.recipeFavoriteIds, ["recipe-1"]);
  assert.equal(output.nutritionInventoryData[0].envelope.migrations[0].id, "legacy-plan-favorites-v1");
  assert.deepEqual(original.nutritionInventoryData[0].envelope.recipeFavoriteIds, []);
  assert.equal(output.legacyBackups[0].raw, '["recipe-1"]');
});

test("IndexedDB backup respects the migration marker and retains invalid legacy bytes for recovery", () => {
  const migrated = backupSnapshot('["recipe-1"]', {
    version: 1, recipeFavoriteIds: [], migrations: [{ id: "legacy-plan-favorites-v1" }]
  }).output;
  assert.deepEqual(migrated.nutritionInventoryData[0].envelope.recipeFavoriteIds, []);
  const invalid = backupSnapshot("{broken", { version: 1, recipeFavoriteIds: [], migrations: [] }).output;
  assert.deepEqual(invalid.nutritionInventoryData[0].envelope.recipeFavoriteIds, []);
  assert.equal(invalid.legacyBackups[0].raw, "{broken");
});
