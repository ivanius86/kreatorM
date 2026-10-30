(async function () {
  "use strict";

  const result = document.getElementById("result");
  try {
    const api = window.MentorDataPhase0;
    if (api.LegacyStorageRegistry.localStorageKeys.length !== 20) throw new Error("registry-count");
    const values = new Map([
      ["mentor_language", "sr"],
      ["mentor_brainstorming_ideas", JSON.stringify([{ id: "idea-1" }])]
    ]);
    let writes = 0;
    const storage = {
      getItem(key) { return values.has(key) ? values.get(key) : null; },
      setItem() { writes += 1; },
      removeItem() { writes += 1; }
    };
    const snapshot = api.LegacyStorageReader.readLocalStorageSnapshot(storage, api.LegacyStorageRegistry.localStorageSources);
    const audit = await api.StorageAuditService.auditLocalStorageSnapshot(snapshot);
    if (writes !== 0) throw new Error("read-only-violation");
    if (audit.totals.present !== 2) throw new Error("audit-count");
    if (JSON.stringify(audit).includes("mentor_brainstorming_ideas\":[{")) throw new Error("audit-raw-leak");

    const blob = new Blob([Uint8Array.from([1, 2, 3])], { type: "image/webp" });
    const bundle = await api.BackupExportService.prepareBackupBundle({
      localStorageSnapshot: snapshot,
      normalizedDomains: { ideas: [{ id: "idea-1" }] },
      mediaRecords: [{
        id: "food-image:food-1",
        entityType: "food",
        entityId: "food-1",
        blob,
        thumbnail: blob
      }]
    });
    if (bundle.isZip !== false || bundle.requiresZipPacker !== true) throw new Error("bundle-state");
    if (bundle.binaryEntries[0].data !== blob) throw new Error("blob-not-original");
    const validation = await api.BackupValidationService.validatePreparedBundle(bundle);
    if (!validation.valid) throw new Error(`bundle-invalid:${validation.errors.join(",")}`);

    const zip = await api.ZipBackupService.packPreparedBundle(bundle, { fflate: window.fflate, synchronous: true });
    if (String.fromCharCode(zip.bytes[0], zip.bytes[1]) !== "PK") throw new Error("zip-signature");
    const archive = await api.ZipBackupService.readAndValidateZip(zip.bytes, { fflate: window.fflate, synchronous: true });
    const target = api.IsolatedRestoreService.createMemoryRestoreTarget();
    const restored = await api.IsolatedRestoreService.restoreIntoEmptyTarget(archive, target, { fflate: window.fflate });
    const parity = await api.BackupParityService.verify({
      expectedDomains: { ideas: [{ id: "idea-1" }] },
      expectedMedia: [{
        id: "food-image:food-1",
        entityType: "food",
        entityId: "food-1",
        blob,
        thumbnail: blob
      }],
      restored
    });
    if (!parity.valid) throw new Error(`parity:${parity.errors.join(",")}`);
    result.textContent = "PHASE0_SMOKE_OK";
    document.body.dataset.status = "ok";
  } catch (error) {
    result.textContent = `PHASE0_SMOKE_FAILED:${error.message}`;
    document.body.dataset.status = "failed";
  }
})();
