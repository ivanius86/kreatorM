(function (root) {
  "use strict";

  const namespace = root.MentorDataPhase0 = root.MentorDataPhase0 || {};

  function jsonText(value) {
    return JSON.stringify(value, null, 2);
  }

  function countRecords(value) {
    if (Array.isArray(value)) return value.length;
    if (Array.isArray(value?.records)) return value.records.length;
    if (Array.isArray(value?.goals)) return value.goals.length;
    if (Array.isArray(value?.events)) return value.events.length;
    return value === null || value === undefined ? 0 : 1;
  }

  async function createJsonEntry(path, value, checksumService, cryptoApi) {
    const data = jsonText(value);
    const checksum = await checksumService.sha256(data, cryptoApi);
    return {
      path,
      contentType: "application/json",
      data,
      byteSize: checksum.byteSize,
      sha256: checksum.hex,
      recordCount: countRecords(value)
    };
  }

  async function prepareBackupBundle(input, options) {
    const checksumService = options?.checksumService || namespace.BackupChecksumService;
    const cryptoApi = options?.cryptoApi;
    const createdAt = input.createdAt || new Date().toISOString();
    const localSources = {};
    const rawSources = {};
    for (const entry of input.localStorageSnapshot?.entries || []) {
      if (entry.readStatus === "ok" && entry.present) {
        localSources[entry.key] = entry.raw;
        const checksum = await checksumService.sha256(entry.raw, cryptoApi);
        rawSources[entry.key] = { byteSize: checksum.byteSize, sha256: checksum.hex };
      }
    }

    const jsonEntries = [];
    jsonEntries.push(await createJsonEntry(
      namespace.BackupFormat.rawLocalStoragePath,
      { capturedAt: input.localStorageSnapshot?.capturedAt || createdAt, sources: localSources },
      checksumService,
      cryptoApi
    ));

    const domainEntries = {};
    for (const [domain, value] of Object.entries(input.normalizedDomains || {})) {
      const entry = await createJsonEntry(`data/${domain}.json`, value, checksumService, cryptoApi);
      jsonEntries.push(entry);
      domainEntries[domain] = entry;
    }

    const media = await namespace.NutritionMediaExportService.prepareMediaExport(
      input.mediaRecords || [],
      { checksumService, cryptoApi }
    );
    jsonEntries.push(await createJsonEntry(
      "indexeddb/mentor_nutrition_images/foodImages.json",
      media.index,
      checksumService,
      cryptoApi
    ));
    jsonEntries.push(await createJsonEntry(
      namespace.BackupFormat.validationReportPath,
      input.validationReport || { status: "notRun", entries: [] },
      checksumService,
      cryptoApi
    ));
    jsonEntries.push(await createJsonEntry(
      namespace.BackupFormat.conflictReportPath,
      input.conflictReport || { status: "notRun", conflicts: [] },
      checksumService,
      cryptoApi
    ));
    jsonEntries.push(await createJsonEntry(
      namespace.BackupFormat.migrationReportPath,
      input.migrationReport || {
        reportVersion: 1,
        migrationId: "legacy-to-idb-v1",
        status: "not_started",
        domains: []
      },
      checksumService,
      cryptoApi
    ));

    const manifest = namespace.BackupManifestSchema.createManifest({
      createdAt,
      appVersion: input.appVersion || "unknown",
      entries: [
        ...jsonEntries,
        ...media.binaryEntries
      ],
      domains: Object.fromEntries(["goals", "calendar"]
        .filter((domain) => domainEntries[domain])
        .map((domain) => [
          domain,
          {
            version: Number(input.normalizedDomains[domain]?.version),
            count: domainEntries[domain].recordCount,
            checksum: domainEntries[domain].sha256
          }
        ])),
      rawSources,
      media: media.summary
    });
    const manifestEntry = await createJsonEntry(
      namespace.BackupFormat.manifestPath,
      manifest,
      checksumService,
      cryptoApi
    );

    return {
      backupFormat: namespace.BackupFormat.id,
      backupVersion: namespace.BackupFormat.version,
      status: "prepared",
      archiveType: null,
      isZip: false,
      requiresZipPacker: true,
      createdAt,
      manifest,
      jsonEntries: [manifestEntry, ...jsonEntries],
      binaryEntries: media.binaryEntries
    };
  }

  namespace.BackupExportService = Object.freeze({ prepareBackupBundle });
})(typeof window !== "undefined" ? window : globalThis);
