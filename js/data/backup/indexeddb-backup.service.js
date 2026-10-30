(function (root) {
  "use strict";

  const idb = root.MentorIndexedDB = root.MentorIndexedDB || {};
  const phase0 = root.MentorDataPhase0 = root.MentorDataPhase0 || {};
  const REPORT_PATHS = Object.freeze({
    migration: "reports/migration.json",
    validation: "reports/validation.json",
    conflicts: "reports/conflicts.json"
  });

  function fail(code, message, details) {
    const error = new Error(message);
    error.code = code;
    error.details = details || null;
    throw error;
  }

  function requireRuntime(database) {
    if (!database?.table || !database?.transaction) {
      fail("INDEXEDDB_DATABASE_REQUIRED", "An open Dexie database is required.");
    }
    if (!idb.SchemaV1 || !phase0.BackupChecksumService ||
        !phase0.BackupManifestSchema || !phase0.ZipBackupService) {
      fail("INDEXEDDB_BACKUP_RUNTIME_UNAVAILABLE", "IndexedDB backup services are not loaded.");
    }
  }

  function safeClone(value) {
    if (value == null) return value;
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function recordKey(storeName, record) {
    return String(
      ["meta", "legacyBackups", "settings", "cache"].includes(storeName)
        ? record?.key ?? ""
        : record?.id ?? ""
    );
  }

  function orderedRecords(storeName, records) {
    return [...(records || [])].sort((left, right) =>
      recordKey(storeName, left).localeCompare(recordKey(storeName, right))
    );
  }

  function isBlob(value) {
    return typeof Blob !== "undefined" && value instanceof Blob;
  }

  function isBinary(value) {
    return isBlob(value) || value instanceof ArrayBuffer ||
      (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(value));
  }

  async function binaryBytes(value) {
    if (isBlob(value)) return new Uint8Array(await value.arrayBuffer());
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }

  async function serializeValue(value, context, propertyPath) {
    if (isBinary(value)) {
      const bytes = await binaryBytes(value);
      const checksum = await phase0.BackupChecksumService.sha256(
        bytes,
        context.cryptoApi
      );
      const path = [
        "binary",
        context.storeName,
        String(context.recordIndex).padStart(8, "0"),
        String(context.binaryIndex++).padStart(4, "0") + ".bin"
      ].join("/");
      context.binaryEntries.push({
        path,
        contentType: isBlob(value) && value.type
          ? value.type
          : "application/octet-stream",
        data: bytes,
        recordCount: 1
      });
      context.binaryManifest.push({
        path,
        store: context.storeName,
        recordKey: context.recordKey,
        propertyPath,
        kind: isBlob(value)
          ? "Blob"
          : value instanceof ArrayBuffer
            ? "ArrayBuffer"
            : value.constructor?.name || "Uint8Array",
        contentType: isBlob(value) ? value.type || "" : "",
        byteSize: checksum.byteSize,
        sha256: checksum.hex
      });
      return {
        __kreatormBinary: {
          path,
          kind: context.binaryManifest.at(-1).kind,
          contentType: context.binaryManifest.at(-1).contentType,
          byteSize: checksum.byteSize,
          sha256: checksum.hex
        }
      };
    }
    if (value === undefined) return { __kreatormValue: "Undefined" };
    if (typeof value === "bigint") {
      return { __kreatormValue: "BigInt", value: String(value) };
    }
    if (typeof value === "number" && !Number.isFinite(value)) {
      return { __kreatormValue: "Number", value: String(value) };
    }
    if (value instanceof Date) {
      return { __kreatormValue: "Date", value: value.toISOString() };
    }
    if (value instanceof RegExp) {
      return {
        __kreatormValue: "RegExp",
        source: value.source,
        flags: value.flags
      };
    }
    if (value instanceof Map) {
      const entries = [];
      let index = 0;
      for (const [key, item] of value.entries()) {
        entries.push([
          await serializeValue(key, context, `${propertyPath}.mapKey[${index}]`),
          await serializeValue(item, context, `${propertyPath}.mapValue[${index}]`)
        ]);
        index += 1;
      }
      return { __kreatormValue: "Map", entries };
    }
    if (value instanceof Set) {
      const values = [];
      let index = 0;
      for (const item of value.values()) {
        values.push(await serializeValue(
          item,
          context,
          `${propertyPath}.setValue[${index}]`
        ));
        index += 1;
      }
      return { __kreatormValue: "Set", values };
    }
    if (Array.isArray(value)) {
      return Promise.all(value.map((item, index) =>
        serializeValue(item, context, `${propertyPath}[${index}]`)
      ));
    }
    if (value && typeof value === "object") {
      const result = {};
      for (const key of Object.keys(value).sort()) {
        result[key] = await serializeValue(
          value[key],
          context,
          propertyPath ? `${propertyPath}.${key}` : key
        );
      }
      return result;
    }
    return value;
  }

  async function serializeStore(storeName, records, options) {
    const binaryEntries = options.binaryEntries;
    const binaryManifest = options.binaryManifest;
    const serialized = [];
    const ordered = orderedRecords(storeName, records);
    for (let index = 0; index < ordered.length; index += 1) {
      const context = {
        storeName,
        recordIndex: index,
        recordKey: recordKey(storeName, ordered[index]),
        binaryIndex: 0,
        binaryEntries,
        binaryManifest,
        cryptoApi: options.cryptoApi
      };
      serialized.push(await serializeValue(ordered[index], context, ""));
    }
    return {
      version: 1,
      store: storeName,
      records: serialized
    };
  }

  function decodeJson(bytes, path) {
    try {
      const text = typeof TextDecoder !== "undefined"
        ? new TextDecoder().decode(bytes)
        : root.fflate.strFromU8(bytes);
      return JSON.parse(text);
    } catch (_) {
      fail("INDEXEDDB_BACKUP_JSON_INVALID", `Backup JSON is invalid: ${path}`, { path });
    }
  }

  function rawSourcesFrom(records) {
    const sources = {};
    for (const record of records || []) {
      if (record?.sourceType !== "localStorage" || typeof record.raw !== "string") continue;
      sources[`${record.backupId || "unknown"}:${record.sourceKey || record.key}`] = record.raw;
    }
    return sources;
  }

  function collectReports(meta, legacyBackups, createdAt) {
    const migration = [];
    const validation = [];
    const conflicts = [];
    for (const record of [...(meta || []), ...(legacyBackups || [])]) {
      const candidate = record?.report;
      if (!candidate) continue;
      const key = String(record.key || "");
      if (/valid/i.test(key)) validation.push(safeClone(candidate));
      else migration.push(safeClone(candidate));
      const rows = Array.isArray(candidate.domains)
        ? candidate.domains
        : candidate.domain ? [candidate.domain] : [];
      rows.forEach((row) => {
        validation.push({
          reportKey: key,
          domain: row?.domain || null,
          status: row?.status || null,
          valid: !row?.errorCode && !(row?.errors || []).length &&
            row?.verification?.valid !== false,
          verification: safeClone(row?.verification || null),
          errors: safeClone(row?.errors || []),
          errorCode: row?.errorCode || null
        });
      });
      const visitConflicts = (value, path) => {
        if (!value || typeof value !== "object") return;
        if (Array.isArray(value)) {
          value.forEach((item, index) =>
            visitConflicts(item, `${path}[${index}]`)
          );
          return;
        }
        for (const [property, nested] of Object.entries(value)) {
          if (property === "conflicts" && Array.isArray(nested)) {
            nested.forEach((conflict) => conflicts.push({
              reportKey: key,
              path: path ? `${path}.conflicts` : "conflicts",
              ...safeClone(conflict)
            }));
          } else {
            visitConflicts(nested, path ? `${path}.${property}` : property);
          }
        }
      };
      visitConflicts(candidate, "");
    }
    return {
      migration: { version: 1, createdAt, reports: migration },
      validation: { version: 1, createdAt, reports: validation },
      conflicts: { version: 1, createdAt, conflicts }
    };
  }

  async function captureSnapshot(database) {
    requireRuntime(database);
    const names = idb.SchemaV1.storeNames;
    return idb.TransactionHelper.run(database, "r", names, async ({ table }) => {
      const stores = {};
      for (const name of names) stores[name] = await table(name).toArray();
      return stores;
    });
  }

  function includeUnmigratedPlanFavorites(snapshot) {
    const key = "mentor_nutrition_plan_favorites_v1";
    let raw;
    try { raw = root.localStorage?.getItem(key); } catch (_) { return snapshot; }
    if (raw === null || raw === undefined) return snapshot;
    const result = {
      ...snapshot,
      nutritionInventoryData: (snapshot.nutritionInventoryData || []).map((record) =>
        record?.id === "current" ? { ...record } : record
      ),
      legacyBackups: [...(snapshot.legacyBackups || [])]
    };
    const current = result.nutritionInventoryData?.find((record) => record?.id === "current");
    if (current?.envelope) {
      let ids;
      try { ids = JSON.parse(raw); } catch (_) { ids = null; }
      if (phase0.LegacyDomainNormalizer?.mergeLegacyPlanFavorites) {
        current.envelope = phase0.LegacyDomainNormalizer.mergeLegacyPlanFavorites(
          current.envelope, ids, new Date().toISOString()
        );
      }
    }
    const backupKey = "nutrition-favorites-live-backup-v1";
    if (!result.legacyBackups.some((record) => record?.key === backupKey)) {
      result.legacyBackups.push({ key: backupKey, backupId: "live-at-backup", sourceType: "localStorage", sourceKey: key, raw });
    }
    return result;
  }

  async function addEntry(entries, path, contentType, data, recordCount, cryptoApi) {
    const checksum = await phase0.BackupChecksumService.sha256(data, cryptoApi);
    entries.push({
      path,
      contentType,
      data,
      byteSize: checksum.byteSize,
      sha256: checksum.hex,
      recordCount: Number(recordCount || 0)
    });
    return checksum;
  }

  async function prepareBundle(database, snapshot, options) {
    const createdAt = options.createdAt || new Date().toISOString();
    const binaryEntries = [];
    const binaryManifest = [];
    const jsonEntries = [];
    const entrySummaries = [];
    const domains = {};
    const documents = {};

    for (const storeName of idb.SchemaV1.storeNames) {
      const document = await serializeStore(storeName, snapshot[storeName], {
        binaryEntries,
        binaryManifest,
        cryptoApi: options.cryptoApi
      });
      documents[storeName] = document;
      const data = phase0.BackupChecksumService.stableStringify(document);
      const checksum = await addEntry(
        jsonEntries,
        `data/${storeName}.json`,
        "application/json",
        data,
        document.records.length,
        options.cryptoApi
      );
      domains[storeName] = {
        version: 1,
        count: document.records.length,
        checksum: checksum.hex
      };
    }

    const rawSources = rawSourcesFrom(snapshot.legacyBackups);
    const rawDocument = {
      version: 1,
      capturedAt: createdAt,
      sources: rawSources
    };
    await addEntry(
      jsonEntries,
      phase0.BackupFormat.rawLocalStoragePath,
      "application/json",
      phase0.BackupChecksumService.stableStringify(rawDocument),
      Object.keys(rawSources).length,
      options.cryptoApi
    );

    const reports = collectReports(
      snapshot.meta,
      snapshot.legacyBackups,
      createdAt
    );
    for (const [name, path] of Object.entries(REPORT_PATHS)) {
      const document = reports[name];
      const count = document.reports?.length ?? document.conflicts?.length ?? 0;
      await addEntry(
        jsonEntries,
        path,
        "application/json",
        phase0.BackupChecksumService.stableStringify(document),
        count,
        options.cryptoApi
      );
    }

    for (const entry of binaryEntries) {
      const checksum = await phase0.BackupChecksumService.sha256(
        entry.data,
        options.cryptoApi
      );
      entry.byteSize = checksum.byteSize;
      entry.sha256 = checksum.hex;
    }
    for (const entry of [...jsonEntries, ...binaryEntries]) {
      entrySummaries.push({
        path: entry.path,
        contentType: entry.contentType,
        byteSize: entry.byteSize,
        sha256: entry.sha256,
        recordCount: entry.recordCount
      });
    }
    const rawSourceSummaries = {};
    for (const [key, value] of Object.entries(rawSources)) {
      const checksum = await phase0.BackupChecksumService.sha256(
        value,
        options.cryptoApi
      );
      rawSourceSummaries[key] = {
        byteSize: checksum.byteSize,
        sha256: checksum.hex
      };
    }

    const mediaRecords = documents.media.records;
    const mediaIds = mediaRecords.map((record) => String(record.id)).sort();
    const mediaBinaries = binaryManifest.filter((entry) => entry.store === "media");
    const manifest = phase0.BackupManifestSchema.createManifest({
      createdAt,
      appVersion: options.appVersion || root.MENTOR_APP_VERSION || "unknown",
      sourceMode: "indexeddb",
      database: {
        name: idb.SchemaV1.databaseName,
        structuralVersion: idb.SchemaV1.structuralVersion,
        dataVersion: idb.SchemaV1.dataVersion
      },
      entries: entrySummaries,
      domains,
      rawSources: rawSourceSummaries,
      media: {
        recordCount: mediaRecords.length,
        blobCount: mediaBinaries.length,
        totalBytes: mediaBinaries.reduce((sum, entry) => sum + entry.byteSize, 0)
      }
    });
    manifest.indexeddb = {
      schemaVersion: 1,
      storeNames: [...idb.SchemaV1.storeNames],
      storeParity: Object.fromEntries(Object.entries(domains).map(
        ([store, summary]) => [store, {
          count: summary.count,
          ids: documents[store].records.map((record) =>
            recordKey(store, record)
          ).sort(),
          checksum: summary.checksum
        }]
      )),
      binaryEntries: binaryManifest,
      media: {
        ids: mediaIds,
        recordCount: mediaRecords.length,
        binaryCount: mediaBinaries.length
      },
      requiredReports: Object.values(REPORT_PATHS)
    };
    jsonEntries.unshift({
      path: phase0.BackupFormat.manifestPath,
      contentType: "application/json",
      data: phase0.BackupChecksumService.stableStringify(manifest),
      recordCount: 1
    });
    return {
      isZip: false,
      requiresZipPacker: true,
      createdAt,
      manifest,
      jsonEntries,
      binaryEntries,
      documents
    };
  }

  async function createCompleteBackupUnlocked(database, options) {
    const snapshot = includeUnmigratedPlanFavorites(await captureSnapshot(database));
    const bundle = await prepareBundle(database, snapshot, options);
    const validation = await phase0.BackupValidationService.validatePreparedBundle(
      bundle,
      { checksumService: options.checksumService, cryptoApi: options.cryptoApi }
    );
    if (!validation.valid) {
      fail("INDEXEDDB_BACKUP_PREPARATION_INVALID", "IndexedDB backup preparation failed.", validation.errors);
    }
    const artifact = await phase0.ZipBackupService.packPreparedBundle(bundle, {
      fflate: options.fflate,
      checksumService: options.checksumService,
      cryptoApi: options.cryptoApi
    });
    const validated = await validateArchive(artifact.bytes, options);
    const sourceParity = await compareStores(
      snapshot,
      validated.stores,
      options
    );
    if (!sourceParity.valid) {
      fail(
        "INDEXEDDB_BACKUP_SOURCE_PARITY_FAILED",
        "The validated ZIP does not reproduce the captured IndexedDB snapshot.",
        sourceParity
      );
    }
    return {
      ...artifact,
      sourceMode: "indexeddb",
      manifest: validated.manifest,
      parity: { ...validated.parity, sourceParity: true },
      createdAt: bundle.createdAt
    };
  }

  function createCompleteBackup(database, options = {}) {
    requireRuntime(database);
    if (options.alreadyFrozen) {
      return createCompleteBackupUnlocked(database, options);
    }
    return idb.MutationFreezeService.withFreeze(
      "indexeddb-complete-backup",
      () => createCompleteBackupUnlocked(database, options)
    );
  }

  function assertDescriptor(descriptor, files, binaryIndex, usedBinaries) {
    if (!descriptor?.path || !files[descriptor.path]) {
      fail("INDEXEDDB_BACKUP_BINARY_MISSING", "A referenced binary entry is missing.", descriptor);
    }
    const declared = binaryIndex.get(descriptor.path);
    if (!declared || declared.sha256 !== descriptor.sha256 ||
        declared.byteSize !== descriptor.byteSize) {
      fail("INDEXEDDB_BACKUP_BINARY_DESCRIPTOR_INVALID", "Binary descriptor parity failed.", descriptor);
    }
    usedBinaries.add(descriptor.path);
  }

  function rehydrateValue(value, files, binaryIndex, usedBinaries) {
    const descriptor = value?.__kreatormBinary;
    if (descriptor) {
      assertDescriptor(descriptor, files, binaryIndex, usedBinaries);
      const bytes = files[descriptor.path];
      if (descriptor.kind === "Blob") {
        return new Blob([bytes], { type: descriptor.contentType || "" });
      }
      if (descriptor.kind === "ArrayBuffer") {
        return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      }
      const copy = new Uint8Array(bytes);
      const Constructor = root[descriptor.kind];
      if (typeof Constructor === "function" && Constructor.BYTES_PER_ELEMENT) {
        return new Constructor(copy.buffer);
      }
      return copy;
    }
    if (value?.__kreatormValue === "Undefined") return undefined;
    if (value?.__kreatormValue === "BigInt") return BigInt(value.value);
    if (value?.__kreatormValue === "Number") return Number(value.value);
    if (value?.__kreatormValue === "Date") return new Date(value.value);
    if (value?.__kreatormValue === "RegExp") {
      return new RegExp(value.source, value.flags || "");
    }
    if (value?.__kreatormValue === "Map") {
      return new Map((value.entries || []).map(([key, item]) => [
        rehydrateValue(key, files, binaryIndex, usedBinaries),
        rehydrateValue(item, files, binaryIndex, usedBinaries)
      ]));
    }
    if (value?.__kreatormValue === "Set") {
      return new Set((value.values || []).map((item) =>
        rehydrateValue(item, files, binaryIndex, usedBinaries)
      ));
    }
    if (Array.isArray(value)) {
      return value.map((item) =>
        rehydrateValue(item, files, binaryIndex, usedBinaries)
      );
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [
        key,
        rehydrateValue(item, files, binaryIndex, usedBinaries)
      ]));
    }
    return value;
  }

  function assertCompleteStores(manifest) {
    const expected = [...idb.SchemaV1.storeNames].sort();
    const actual = [...(manifest.indexeddb?.storeNames || [])].sort();
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      fail("INDEXEDDB_BACKUP_STORE_SET_INCOMPLETE", "Backup does not contain the complete v1 store set.", { expected, actual });
    }
    if (manifest.database?.name !== idb.SchemaV1.databaseName ||
        manifest.database?.structuralVersion !== idb.SchemaV1.structuralVersion ||
        manifest.database?.dataVersion !== idb.SchemaV1.dataVersion) {
      fail("INDEXEDDB_BACKUP_DATABASE_INCOMPATIBLE", "Backup database identity or schema version is incompatible.");
    }
    for (const path of Object.values(REPORT_PATHS)) {
      if (!manifest.entries.some((entry) => entry.path === path)) {
        fail("INDEXEDDB_BACKUP_REPORT_MISSING", "A required report is missing.", { path });
      }
    }
  }

  function assertUniqueKeys(store, records) {
    const keys = records.map((record) => recordKey(store, record));
    if (keys.some((key) => !key) || new Set(keys).size !== keys.length) {
      fail("INDEXEDDB_BACKUP_PRIMARY_KEY_INVALID", "Backup contains a missing or duplicate primary key.", { store });
    }
  }

  function assertCutoverMeta(stores, options = {}) {
    const constants = idb.LegacyToIndexedDbService?.constants;
    if (!constants) fail("INDEXEDDB_CUTOVER_CONSTANTS_UNAVAILABLE", "Cutover constants are unavailable.");
    const meta = new Map(stores.meta.map((record) => [record.key, record]));
    const globalMarker = meta.get(constants.CUTOVER_KEYS.global);
    for (const [domain, adapter] of Object.entries(globalMarker?.domains || {})) {
      if (adapter !== "indexeddb") continue;
      const marker = meta.get(constants.CUTOVER_KEYS[domain]);
      const checkpoint = meta.get(constants.DOMAIN_KEYS[domain]);
      if (
        options.allowRecoveryRequired === true &&
        checkpoint?.status === "recoveryRequired"
      ) {
        continue;
      }
      if (marker?.status !== "active" || marker?.adapter !== "indexeddb" ||
          checkpoint?.status !== "active") {
        fail("INDEXEDDB_BACKUP_CUTOVER_META_INVALID", "Backup cutover metadata is inconsistent.", { domain });
      }
    }
  }

  async function validateArchive(zipValue, options = {}) {
    const validated = await phase0.ZipBackupService.readAndValidateZip(zipValue, {
      fflate: options.fflate,
      checksumService: options.checksumService,
      cryptoApi: options.cryptoApi,
      limits: options.limits
    });
    const manifest = validated.manifest;
    if (manifest.sourceMode !== "indexeddb") {
      fail("INDEXEDDB_BACKUP_SOURCE_MODE_REQUIRED", "Only a post-cutover IndexedDB backup can be restored.");
    }
    assertCompleteStores(manifest);
    const binaryIndex = new Map(
      (manifest.indexeddb?.binaryEntries || []).map((entry) => [entry.path, entry])
    );
    if (binaryIndex.size !== (manifest.indexeddb?.binaryEntries || []).length) {
      fail("INDEXEDDB_BACKUP_BINARY_PATH_DUPLICATE", "Backup binary manifest contains duplicate paths.");
    }
    const archiveEntries = new Map(
      manifest.entries.map((entry) => [entry.path, entry])
    );
    for (const descriptor of binaryIndex.values()) {
      const archiveEntry = archiveEntries.get(descriptor.path);
      if (!archiveEntry || archiveEntry.sha256 !== descriptor.sha256 ||
          archiveEntry.byteSize !== descriptor.byteSize) {
        fail(
          "INDEXEDDB_BACKUP_BINARY_ENTRY_PARITY_INVALID",
          "Binary manifest does not match the checksummed ZIP entry.",
          descriptor
        );
      }
    }
    const usedBinaries = new Set();
    const stores = {};
    for (const store of idb.SchemaV1.storeNames) {
      const path = `data/${store}.json`;
      const document = decodeJson(validated.files[path], path);
      if (document?.version !== 1 || document?.store !== store ||
          !Array.isArray(document.records)) {
        fail("INDEXEDDB_BACKUP_STORE_DOCUMENT_INVALID", "A store document is invalid.", { store });
      }
      assertUniqueKeys(store, document.records);
      stores[store] = document.records.map((record) =>
        rehydrateValue(record, validated.files, binaryIndex, usedBinaries)
      );
      const declared = manifest.indexeddb.storeParity?.[store];
      const ids = document.records.map((record) => recordKey(store, record)).sort();
      if (!declared || declared.count !== document.records.length ||
          JSON.stringify(declared.ids) !== JSON.stringify(ids) ||
          declared.checksum !== manifest.domains[store]?.checksum) {
        fail("INDEXEDDB_BACKUP_STORE_PARITY_INVALID", "Store count, ID or checksum parity failed.", { store });
      }
    }
    const mediaIds = stores.media.map((record) => String(record.id)).sort();
    if (manifest.media.recordCount !== stores.media.length ||
        JSON.stringify(manifest.indexeddb.media?.ids || []) !== JSON.stringify(mediaIds) ||
        manifest.media.blobCount !== manifest.indexeddb.media?.binaryCount ||
        usedBinaries.size !== binaryIndex.size) {
      fail("INDEXEDDB_BACKUP_MEDIA_PARITY_INVALID", "Nutrition media count or ID parity failed.");
    }
    const declaredBinaryBytes = [...binaryIndex.values()]
      .filter((entry) => entry.store === "media")
      .reduce((sum, entry) => sum + Number(entry.byteSize || 0), 0);
    if (manifest.media.totalBytes !== declaredBinaryBytes) {
      fail("INDEXEDDB_BACKUP_MEDIA_BYTES_PARITY_INVALID", "Nutrition media byte parity failed.");
    }
    for (const path of Object.values(REPORT_PATHS)) {
      const report = decodeJson(validated.files[path], path);
      if (report?.version !== 1 ||
          (!Array.isArray(report.reports) && !Array.isArray(report.conflicts))) {
        fail("INDEXEDDB_BACKUP_REPORT_INVALID", "A required backup report is invalid.", { path });
      }
    }
    assertCutoverMeta(stores, options);
    return {
      status: "valid",
      manifest,
      stores,
      files: validated.files,
      zipByteSize: validated.zipByteSize,
      parity: {
        valid: true,
        storeCount: idb.SchemaV1.storeNames.length,
        recordCount: Object.values(stores).reduce((sum, records) => sum + records.length, 0),
        mediaRecordCount: stores.media.length,
        binaryCount: binaryIndex.size
      }
    };
  }

  async function compareStores(expectedStores, actual, options = {}) {
    const mismatches = [];
    for (const store of idb.SchemaV1.storeNames) {
      const expectedBundle = await serializeStore(store, expectedStores[store], {
        binaryEntries: [],
        binaryManifest: [],
        cryptoApi: options.cryptoApi
      });
      const actualBundle = await serializeStore(store, actual[store], {
        binaryEntries: [],
        binaryManifest: [],
        cryptoApi: options.cryptoApi
      });
      if (phase0.BackupChecksumService.stableStringify(expectedBundle) !==
          phase0.BackupChecksumService.stableStringify(actualBundle)) {
        mismatches.push(store);
      }
    }
    return { valid: mismatches.length === 0, mismatches };
  }

  async function snapshotParity(database, expectedStores, options = {}) {
    const actual = await captureSnapshot(database);
    return compareStores(expectedStores, actual, options);
  }

  idb.IndexedDbBackupService = Object.freeze({
    captureSnapshot,
    includeUnmigratedPlanFavorites,
    createCompleteBackup,
    validateArchive,
    compareStores,
    snapshotParity,
    assertCutoverMeta,
    recordKey
  });
})(typeof window !== "undefined" ? window : globalThis);
