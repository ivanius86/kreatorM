const test = require("node:test");
const assert = require("node:assert/strict");
const { webcrypto } = require("node:crypto");
const { Blob } = require("node:buffer");
const { loadPhase0Scripts, memoryStorage } = require("./test-helpers");

function load() {
  return loadPhase0Scripts([
    "js/data/legacy/legacy-storage.registry.js",
    "js/data/legacy/legacy-storage.reader.js",
    "js/data/backup/backup-checksum.service.js",
    "js/data/backup/backup-format.constants.js",
    "js/data/backup/backup-manifest.schema.js",
    "js/data/backup/nutrition-media-export.service.js",
    "js/data/backup/backup-export.service.js",
    "js/data/backup/backup-validation.service.js"
  ]);
}

test("backup preparation keeps raw values and original media binaries without claiming to be ZIP", async () => {
  const api = load();
  const storage = memoryStorage({
    mentor_language: "sr",
    mentor_brainstorming_ideas: JSON.stringify([{ id: "idea-1", title: "Anonimno" }])
  });
  const snapshot = api.LegacyStorageReader.readLocalStorageSnapshot(
    storage,
    api.LegacyStorageRegistry.localStorageSources,
    () => "2026-01-01T00:00:00.000Z"
  );
  const blob = new Blob([Uint8Array.from([1, 2, 3, 4])], { type: "image/webp" });
  const thumbnail = new Blob([Uint8Array.from([5, 6])], { type: "image/webp" });

  const bundle = await api.BackupExportService.prepareBackupBundle({
    createdAt: "2026-01-01T00:00:00.000Z",
    localStorageSnapshot: snapshot,
    normalizedDomains: { ideas: [{ id: "idea-1", title: "Anonimno" }] },
    mediaRecords: [{
      id: "food-image:food-1",
      entityType: "food",
      entityId: "food-1",
      blob,
      thumbnail,
      updatedAt: "2026-01-01T00:00:00.000Z"
    }]
  }, { cryptoApi: webcrypto });

  assert.equal(bundle.backupFormat, "kreatorm-backup");
  assert.equal(bundle.isZip, false);
  assert.equal(bundle.requiresZipPacker, true);
  assert.equal(bundle.binaryEntries.length, 2);
  assert.strictEqual(bundle.binaryEntries[0].data, blob);
  assert.strictEqual(bundle.binaryEntries[1].data, thumbnail);
  assert.equal(bundle.manifest.media.recordCount, 1);
  assert.equal(bundle.manifest.media.blobCount, 2);

  const rawEntry = bundle.jsonEntries.find((entry) => entry.path === "localstorage/raw.json");
  assert.equal(JSON.parse(rawEntry.data).sources.mentor_language, "sr");
  const validation = await api.BackupValidationService.validatePreparedBundle(bundle, { cryptoApi: webcrypto });
  assert.deepEqual(validation, { valid: true, errors: [] });
});

test("manifest validator rejects an invalid checksum", () => {
  const api = load();
  const result = api.BackupManifestSchema.validateManifest({
    backupFormat: "kreatorm-backup",
    backupVersion: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    entries: [{ path: "data/ideas.json", byteSize: 2, sha256: "bad" }],
    media: { recordCount: 0, blobCount: 0, totalBytes: 0 }
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("ENTRY_CHECKSUM_INVALID:data/ideas.json"));
});
