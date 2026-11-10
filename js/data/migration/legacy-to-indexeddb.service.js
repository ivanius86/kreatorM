(function attachLegacyToIndexedDbService(root) {
  "use strict";

  const idb = root.MentorIndexedDB = root.MentorIndexedDB || {};
  const phase0 = root.MentorDataPhase0 = root.MentorDataPhase0 || {};
  const MIGRATION_ID = "legacy-to-idb-v1";
  const GLOBAL_KEY = `migration:${MIGRATION_ID}`;
  const REPORT_KEY = `migration-report:${MIGRATION_ID}`;
  const IDEAS_COMPARISONS_GROUP_KEY =
    `${GLOBAL_KEY}:group:ideas-comparisons`;
  const IDEAS_COMPARISONS_REPORT_KEY =
    `${REPORT_KEY}:ideas-comparisons`;
  const FINANCE_ASSETS_GROUP_KEY =
    `${GLOBAL_KEY}:group:finance-assets`;
  const FINANCE_ASSETS_REPORT_KEY =
    `${REPORT_KEY}:finance-assets`;
  const NUTRITION_ENVELOPES_GROUP_KEY =
    `${GLOBAL_KEY}:group:nutrition-envelopes`;
  const NUTRITION_ENVELOPES_REPORT_KEY =
    `${REPORT_KEY}:nutrition-envelopes`;
  const NUTRITION_MEDIA_GROUP_KEY =
    `${GLOBAL_KEY}:group:nutrition-media`;
  const NUTRITION_MEDIA_REPORT_KEY =
    `${REPORT_KEY}:nutrition-media`;
  const DOMAIN_KEYS = Object.freeze({
    settings: `${GLOBAL_KEY}:settings`,
    goals: `${GLOBAL_KEY}:goals`,
    calendar: `${GLOBAL_KEY}:calendar`,
    ideas: `${GLOBAL_KEY}:ideas`,
    comparisons: `${GLOBAL_KEY}:comparisons`,
    cache: `${GLOBAL_KEY}:cache`,
    finance: `${GLOBAL_KEY}:finance`,
    assets: `${GLOBAL_KEY}:assets`,
    nutritionFoodData: `${GLOBAL_KEY}:nutrition-food-data`,
    nutritionInventoryData: `${GLOBAL_KEY}:nutrition-inventory-data`,
    media: `${GLOBAL_KEY}:nutrition-media`
  });
  const CUTOVER_KEYS = Object.freeze({
    global: "cutover:active-adapter",
    settings: "cutover:domain:settings",
    goals: "cutover:domain:goals",
    calendar: "cutover:domain:calendar",
    ideas: "cutover:domain:ideas",
    comparisons: "cutover:domain:comparisons",
    cache: "cutover:domain:cache",
    finance: "cutover:domain:finance",
    assets: "cutover:domain:assets",
    nutritionFoodData: "cutover:domain:nutrition-food-data",
    nutritionInventoryData: "cutover:domain:nutrition-inventory-data",
    media: "cutover:domain:nutrition-media"
  });
  const DOMAIN_STORES = Object.freeze({
    settings: "settings",
    goals: "goals",
    calendar: "calendarEvents",
    ideas: "ideas",
    comparisons: "comparisons",
    cache: "cache",
    finance: "financeDocuments",
    assets: "assets",
    nutritionFoodData: "nutritionFoodData",
    nutritionInventoryData: "nutritionInventoryData",
    media: "media"
  });
  const CORE_DOMAINS = Object.freeze(["settings", "goals", "calendar"]);
  const IDEAS_COMPARISONS_DOMAINS = Object.freeze([
    "ideas",
    "comparisons",
    "cache"
  ]);
  const FINANCE_ASSETS_DOMAINS = Object.freeze(["finance", "assets"]);
  const NUTRITION_ENVELOPE_DOMAINS = Object.freeze([
    "nutritionFoodData",
    "nutritionInventoryData"
  ]);

  function clone(value) {
    if (value === undefined) return undefined;
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function requireDependencies() {
    const required = [
      ["LegacyStorageReader", phase0.LegacyStorageReader],
      ["LegacyStorageRegistry", phase0.LegacyStorageRegistry],
      ["LegacyMediaReader", phase0.LegacyMediaReader],
      ["GoalsCalendarBackupService", phase0.GoalsCalendarBackupService],
      ["BackupChecksumService", phase0.BackupChecksumService],
      ["BackupValidationService", phase0.BackupValidationService],
      ["ZipBackupService", phase0.ZipBackupService],
      ["MigrationStateMachine", idb.MigrationStateMachine],
      ["TransactionHelper", idb.TransactionHelper]
    ];
    const missing = required.filter(([, value]) => !value).map(([name]) => name);
    if (missing.length) {
      const error = new Error(`IndexedDB migration dependencies are missing: ${missing.join(", ")}`);
      error.code = "MIGRATION_DEPENDENCY_MISSING";
      throw error;
    }
  }

  function findEntry(snapshot, key) {
    return (snapshot?.entries || []).find((entry) => entry.key === key) || null;
  }

  function supportedLanguage(value) {
    return value === "sr" || value === "en";
  }

  function parseJsonEntry(entry) {
    if (!entry || entry.present === false) {
      return { present: false, valid: false, value: null, errors: [] };
    }
    if (entry.readStatus !== "ok") {
      return {
        present: true,
        valid: false,
        value: null,
        errors: [entry.errorCode || "LOCAL_STORAGE_READ_FAILED"]
      };
    }
    try {
      return { present: true, valid: true, value: JSON.parse(entry.raw), errors: [] };
    } catch (_) {
      return { present: true, valid: false, value: null, errors: ["INVALID_JSON"] };
    }
  }

  function prepareSettings(snapshot) {
    const candidates = [];
    ["mentor_language", "mentorPlanner.language"].forEach((key) => {
      const entry = findEntry(snapshot, key);
      const present = entry?.present === true;
      const value = present && entry.readStatus === "ok" ? entry.raw : null;
      candidates.push({
        key,
        present,
        valid: present && supportedLanguage(value),
        value,
        errors: present && !supportedLanguage(value)
          ? [entry?.readStatus === "ok" ? "UNSUPPORTED_LANGUAGE" : entry?.errorCode || "READ_FAILED"]
          : []
      });
    });

    const centralEntry = findEntry(snapshot, "mentor_database");
    const central = parseJsonEntry(centralEntry);
    const centralValue = central.valid ? central.value?.settings?.language : null;
    const centralPresent = central.present && (
      !central.valid ||
      centralValue !== undefined && centralValue !== null && centralValue !== ""
    );
    candidates.push({
      key: "mentor_database.settings.language",
      present: centralPresent,
      valid: central.valid && supportedLanguage(centralValue),
      value: centralValue,
      errors: centralPresent && !(central.valid && supportedLanguage(centralValue))
        ? central.errors.length ? central.errors : ["UNSUPPORTED_LANGUAGE"]
        : []
    });

    const selected = candidates.find((candidate) => candidate.valid);
    const present = candidates.filter((candidate) => candidate.present);
    if (!selected && present.length) {
      return {
        domain: "settings",
        valid: false,
        dependencyBlocked: false,
        records: null,
        sourceKeys: present.map((candidate) => candidate.key),
        selectedSource: null,
        errors: present.flatMap((candidate) =>
          candidate.errors.map((code) => `${candidate.key}:${code}`)
        ),
        candidates
      };
    }

    return {
      domain: "settings",
      valid: true,
      dependencyBlocked: false,
      records: selected ? [{ key: "language", value: selected.value }] : [],
      sourceKeys: present.map((candidate) => candidate.key),
      selectedSource: selected?.key || null,
      errors: [],
      candidates
    };
  }

  function prepareGoals(snapshot) {
    const entry = findEntry(snapshot, phase0.GoalsCalendarBackupService.keys.goals);
    if (!entry || entry.present === false) {
      return {
        domain: "goals",
        valid: true,
        dependencyBlocked: false,
        records: [],
        sourceKeys: [],
        selectedSource: null,
        errors: []
      };
    }
    const parsed = parseJsonEntry(entry);
    const normalized = parsed.valid
      ? phase0.GoalsCalendarBackupService.normalizeGoalsDocument(parsed.value)
      : { valid: false, errors: parsed.errors, value: null };
    return {
      domain: "goals",
      valid: normalized.valid,
      dependencyBlocked: false,
      records: normalized.valid ? normalized.value.goals : null,
      sourceKeys: [entry.key],
      selectedSource: normalized.valid ? entry.key : null,
      errors: normalized.errors.slice()
    };
  }

  function prepareCalendar(snapshot, goals) {
    const entry = findEntry(snapshot, phase0.GoalsCalendarBackupService.keys.calendar);
    if (!entry || entry.present === false) {
      return {
        domain: "calendar",
        valid: true,
        dependencyBlocked: false,
        records: [],
        sourceKeys: [],
        selectedSource: null,
        errors: []
      };
    }
    const parsed = parseJsonEntry(entry);
    const normalized = parsed.valid
      ? phase0.GoalsCalendarBackupService.normalizeCalendarDocument(parsed.value)
      : { valid: false, errors: parsed.errors, value: null };
    if (!normalized.valid) {
      return {
        domain: "calendar",
        valid: false,
        dependencyBlocked: false,
        records: null,
        sourceKeys: [entry.key],
        selectedSource: null,
        errors: normalized.errors.slice()
      };
    }
    if (!goals.valid) {
      return {
        domain: "calendar",
        valid: false,
        dependencyBlocked: true,
        records: normalized.value.events,
        sourceKeys: [entry.key],
        selectedSource: entry.key,
        errors: ["GOALS_VALIDATION_REQUIRED"]
      };
    }
    const references = phase0.GoalsCalendarBackupService.validateReferences(
      { version: 1, goals: goals.records },
      normalized.value
    );
    return {
      domain: "calendar",
      valid: references.valid,
      dependencyBlocked: false,
      records: references.valid ? normalized.value.events : null,
      sourceKeys: [entry.key],
      selectedSource: references.valid ? entry.key : null,
      errors: references.errors.slice()
    };
  }

  async function checksumRecords(records, checksumService, cryptoApi) {
    const sorted = (records || []).slice().sort((left, right) =>
      String(left?.id ?? left?.key ?? "").localeCompare(
        String(right?.id ?? right?.key ?? "")
      )
    );
    const checksum = await checksumService.sha256(sorted, cryptoApi);
    return checksum.hex;
  }

  function recordIds(records) {
    return (records || [])
      .map((record) => String(record?.id ?? record?.key ?? ""))
      .filter(Boolean)
      .sort();
  }

  async function buildRawBackupRecords(snapshot, mediaRead, archive, backupId, checksumService, cryptoApi) {
    const capturedAt = snapshot.capturedAt;
    const records = [];
    for (const entry of snapshot.entries || []) {
      const checksum = entry.present && entry.readStatus === "ok"
        ? await checksumService.sha256(entry.raw, cryptoApi)
        : null;
      records.push({
        key: `${backupId}:localStorage:${entry.key}`,
        backupId,
        sourceType: "localStorage",
        sourceKey: entry.key,
        owner: entry.source?.owner || null,
        role: entry.source?.role || null,
        present: entry.present,
        readStatus: entry.readStatus,
        errorCode: entry.errorCode || null,
        raw: entry.present && entry.readStatus === "ok" ? entry.raw : null,
        checksum: checksum?.hex || null,
        byteSize: checksum?.byteSize || 0,
        capturedAt
      });
    }
    records.push({
      key: `${backupId}:indexedDB:mentor_nutrition_images/foodImages`,
      backupId,
      sourceType: "indexedDB",
      database: "mentor_nutrition_images",
      store: "foodImages",
      readStatus: mediaRead.status,
      records: clone(mediaRead.records || []),
      recordCount: (mediaRead.records || []).length,
      capturedAt
    });
    const archiveChecksum = await checksumService.sha256(archive.bytes, cryptoApi);
    records.push({
      key: backupId,
      backupId,
      sourceType: "completeBackup",
      format: "versioned-zip",
      manifest: clone(archive.validated.manifest),
      zipBytes: archive.bytes,
      checksum: archiveChecksum.hex,
      byteSize: archiveChecksum.byteSize,
      capturedAt
    });
    return records;
  }

  async function prepareCompleteBackup(options) {
    const now = options.now || (() => new Date().toISOString());
    const baseSnapshot = phase0.LegacyStorageReader.readLocalStorageSnapshot(
      options.storage,
      phase0.LegacyStorageRegistry.localStorageSources,
      now
    );
    const snapshot = phase0.GoalsCalendarBackupService.captureLocalStorageSnapshot(
      options.storage,
      baseSnapshot,
      now
    );
    const mediaRead = options.mediaRead || await phase0.LegacyMediaReader.readExistingMediaDatabase(
      options.legacyIndexedDB || root.indexedDB
    );
    if (!["ok", "absent"].includes(mediaRead.status)) {
      const error = new Error("Complete backup cannot read the registered Nutrition media source.");
      error.code = "COMPLETE_BACKUP_MEDIA_READ_FAILED";
      error.details = { status: mediaRead.status, errorCode: mediaRead.errorCode || null };
      throw error;
    }

    const goals = prepareGoals(snapshot);
    const domains = {
      settings: prepareSettings(snapshot),
      goals,
      calendar: prepareCalendar(snapshot, goals)
    };
    const preflightMigrationReport = {
      reportVersion: 1,
      migrationId: MIGRATION_ID,
      status: "backed_up",
      createdAt: snapshot.capturedAt,
      domains: Object.values(domains).map((domain) => ({
        domain: domain.domain,
        status: domain.valid
          ? "backed_up"
          : domain.dependencyBlocked
            ? "backed_up"
            : "recoveryRequired",
        sourceKeys: domain.sourceKeys.slice(),
        selectedSource: domain.selectedSource,
        errors: domain.errors.slice(),
        dependencyBlocked: Boolean(domain.dependencyBlocked)
      }))
    };
    const prepared = await phase0.GoalsCalendarBackupService.prepareCompleteBackup({
      storage: options.storage,
      localStorageSnapshot: snapshot,
      mediaRecords: mediaRead.records || [],
      createdAt: snapshot.capturedAt,
      appVersion: options.appVersion || "unknown",
      migrationReport: preflightMigrationReport,
      now
    }, {
      checksumService: options.checksumService,
      cryptoApi: options.cryptoApi
    });
    const bundleValidation = await phase0.BackupValidationService.validatePreparedBundle(
      prepared.bundle,
      {
        checksumService: options.checksumService,
        cryptoApi: options.cryptoApi
      }
    );
    if (!bundleValidation.valid) {
      const error = new Error("Complete legacy backup preparation failed validation.");
      error.code = "COMPLETE_BACKUP_INVALID";
      error.details = bundleValidation.errors;
      throw error;
    }
    const packed = await phase0.ZipBackupService.packPreparedBundle(prepared.bundle, {
      fflate: options.fflate,
      checksumService: options.checksumService,
      cryptoApi: options.cryptoApi
    });
    const validated = await phase0.ZipBackupService.readAndValidateZip(packed.bytes, {
      fflate: options.fflate,
      checksumService: options.checksumService,
      cryptoApi: options.cryptoApi
    });

    const fingerprintPayload = {
      rawSources: Object.fromEntries(
        Object.entries(validated.manifest.rawSources || {})
          .sort(([left], [right]) => left.localeCompare(right))
      ),
      mediaEntries: (validated.manifest.entries || [])
        .filter((entry) =>
          entry.path.startsWith("media/") ||
          entry.path === "indexeddb/mentor_nutrition_images/foodImages.json"
        )
        .map((entry) => ({
          path: entry.path,
          byteSize: entry.byteSize,
          sha256: entry.sha256
        }))
        .sort((left, right) => left.path.localeCompare(right.path))
    };
    const sourceFingerprint = (
      await options.checksumService.sha256(
        fingerprintPayload,
        options.cryptoApi
      )
    ).hex;
    const backupScope = options.backupScope || "core";
    const backupId = [
      "backup",
      MIGRATION_ID,
      backupScope,
      snapshot.capturedAt,
      sourceFingerprint.slice(0, 16)
    ].join(":");
    const rawRecords = await buildRawBackupRecords(
      snapshot,
      mediaRead,
      { bytes: packed.bytes, validated },
      backupId,
      options.checksumService,
      options.cryptoApi
    );
    const rawBySource = new Map(
      rawRecords
        .filter((record) => record.sourceType === "localStorage")
        .map((record) => [record.sourceKey, record])
    );
    Object.values(domains).forEach((domain) => {
      domain.sourceChecksums = Object.fromEntries(
        (domain.sourceKeys || []).map((key) => [
          key,
          rawBySource.get(
            key === "mentor_database.settings.language" ? "mentor_database" : key
          )?.checksum || null
        ])
      );
    });
    const selectedLanguage = domains.settings.candidates?.find(
      (candidate) => candidate.key === domains.settings.selectedSource
    );
    domains.settings.conflicts = (domains.settings.candidates || [])
      .filter((candidate) =>
        candidate.valid &&
        candidate.key !== domains.settings.selectedSource &&
        candidate.value !== selectedLanguage?.value
      )
      .map((candidate) => ({
        sourceKey: candidate.key,
        checksum: rawBySource.get(
          candidate.key === "mentor_database.settings.language"
            ? "mentor_database"
            : candidate.key
        )?.checksum || null,
        selectedSource: domains.settings.selectedSource,
        rule: "source_priority"
      }));
    return {
      backupId,
      capturedAt: snapshot.capturedAt,
      snapshot,
      domains,
      rawRecords,
      preparedBundle: prepared.bundle,
      zipBytes: packed.bytes,
      manifest: validated.manifest,
      sourceFingerprint,
      normalization: clone(prepared.normalization)
    };
  }

  function initialCheckpoint(domain, now) {
    return idb.MigrationStateMachine.createInitial(DOMAIN_KEYS[domain], {
      domain,
      migrationId: MIGRATION_ID,
      migrationVersion: 1
    }, now);
  }

  async function saveBackup(database, backup, now) {
    const timestamp = now();
    await idb.TransactionHelper.run(
      database,
      "rw",
      ["legacyBackups", "meta"],
      async ({ table }) => {
        await table("legacyBackups").bulkPut(backup.rawRecords);
        for (const domain of CORE_DOMAINS) {
          const key = DOMAIN_KEYS[domain];
          if (!await table("meta").get(key)) {
            await table("meta").put(initialCheckpoint(domain, timestamp));
          }
        }
        await table("meta").put({
          key: GLOBAL_KEY,
          migrationId: MIGRATION_ID,
          status: "backed_up",
          backupId: backup.backupId,
          capturedAt: backup.capturedAt,
          domains: clone(backup.domains),
          updatedAt: timestamp
        });
      }
    );
  }

  async function loadSavedBackup(database, globalRecord) {
    if (!globalRecord?.backupId) return null;
    const archive = await database.table("legacyBackups").get(globalRecord.backupId);
    if (!archive?.zipBytes || !globalRecord.domains) return null;
    return {
      backupId: globalRecord.backupId,
      capturedAt: globalRecord.capturedAt,
      domains: clone(globalRecord.domains),
      zipBytes: archive.zipBytes,
      manifest: archive.manifest
    };
  }

  function sourceChecksumFor(backup, logicalKey) {
    const sourceKey = logicalKey.startsWith("mentor_database.")
      ? "mentor_database"
      : logicalKey;
    return backup.manifest?.rawSources?.[sourceKey]?.sha256 || null;
  }

  function recoveryFor(normalization, domain) {
    return (normalization?.validationReport?.recovery || [])
      .find((entry) => entry.domain === domain) || null;
  }

  function conflictsFor(normalization, domains) {
    const accepted = new Set(domains);
    return (normalization?.conflictReport?.conflicts || [])
      .filter((conflict) => accepted.has(conflict.domain))
      .map(clone);
  }

  function prepareIdeasComparisonsDomains(backup) {
    const normalization = backup.normalization || {};
    const normalized = normalization.domains || {};
    const ideasRecovery = recoveryFor(normalization, "ideas");
    const comparisonsRecovery = recoveryFor(normalization, "comparisons");
    const centralEntry = findEntry(backup.snapshot, "mentor_database");
    const centralParsed = parseJsonEntry(centralEntry);
    const centralComparisons = centralParsed.valid &&
      Array.isArray(centralParsed.value?.comparisons)
      ? centralParsed.value.comparisons
      : [];
    const validationByKey = new Map(
      (normalization.validationReport?.entries || [])
        .map((entry) => [entry.key, entry])
    );
    function invalidOnlyComparisonSubtype(recordType, directKey) {
      const centralPresent = centralComparisons.some(
        (record) => record?.recordType === recordType
      );
      const direct = validationByKey.get(directKey);
      const directPresent = direct?.present === true;
      const centralValid = centralPresent && centralParsed.valid;
      const directValid = directPresent &&
        direct.validationStatus === "valid";
      return (centralPresent || directPresent) &&
        !centralValid &&
        !directValid;
    }
    const invalidSnapshotOnly = invalidOnlyComparisonSubtype(
      "snapshot",
      "mentorFinancialComparisonSnapshotsV1"
    );
    const invalidOptionOnly = invalidOnlyComparisonSubtype(
      "option",
      "mentorFinancialComparisonOptionsV1"
    );
    const ideasSourceKeys = [
      "mentor_database.ideas",
      "mentor_brainstorming_ideas"
    ];
    const comparisonSourceKeys = [
      "mentor_database.comparisons",
      "mentorFinancialComparisonSnapshotsV1",
      "mentorFinancialComparisonOptionsV1"
    ];
    const cacheSourceKeys = [
      "mentor_database.comparisons.researchCache",
      "mentorFinancialComparisonResearchCacheV1"
    ];
    const ideaRecords = clone(normalized.ideas || []);
    const ideaIds = ideaRecords.map((record) => String(record?.id || ""));
    const ideaIdInvalid = ideaIds.some((id) => !id) ||
      ideaIds.some((id, index) => ideaIds.indexOf(id) !== index);
    const ideas = {
      domain: "ideas",
      valid: !ideasRecovery && !ideaIdInvalid,
      dependencyBlocked: false,
      records: ideasRecovery || ideaIdInvalid ? null : ideaRecords,
      sourceKeys: ideasSourceKeys,
      sourceChecksums: Object.fromEntries(ideasSourceKeys.map((key) => [
        key,
        sourceChecksumFor(backup, key)
      ])),
      selectedSource: "union-by-id",
      errors: [
        ...(ideasRecovery?.errors || []).map((entry) => entry.code || entry),
        ...(ideaIdInvalid ? ["IDEA_ID_REQUIRED_AND_UNIQUE"] : [])
      ],
      conflicts: conflictsFor(normalization, ["ideas"]),
      excludedLegacyCollections: [
        "mentor_database.tests",
        "mentor_database.references"
      ]
    };
    const comparisonRecords = clone(normalized.comparisons || []);
    const comparisonIds = comparisonRecords.map((record) => String(record?.id || ""));
    const comparisonIdCollision = comparisonIds.some(
      (id, index) => id && comparisonIds.indexOf(id) !== index
    );
    const comparisons = {
      domain: "comparisons",
      valid: !comparisonsRecovery &&
        !comparisonIdCollision &&
        !invalidSnapshotOnly &&
        !invalidOptionOnly,
      dependencyBlocked: false,
      records: comparisonsRecovery ||
        comparisonIdCollision ||
        invalidSnapshotOnly ||
        invalidOptionOnly
        ? null
        : comparisonRecords,
      sourceKeys: comparisonSourceKeys,
      sourceChecksums: Object.fromEntries(comparisonSourceKeys.map((key) => [
        key,
        sourceChecksumFor(backup, key)
      ])),
      selectedSource: "union-by-id-and-recordType",
      errors: [
        ...(comparisonsRecovery?.errors || []).map((entry) => entry.code || entry),
        ...(comparisonIdCollision ? ["COMPARISON_ID_COLLISION_ACROSS_RECORD_TYPES"] : []),
        ...(invalidSnapshotOnly ? ["COMPARISON_SNAPSHOTS_INVALID_ONLY_CANDIDATE"] : []),
        ...(invalidOptionOnly ? ["COMPARISON_OPTIONS_INVALID_ONLY_CANDIDATE"] : [])
      ],
      conflicts: conflictsFor(normalization, [
        "comparisonSnapshots",
        "comparisonOptions"
      ])
    };
    const cacheRecord = normalized.cache &&
      typeof normalized.cache === "object" &&
      !Array.isArray(normalized.cache)
      ? clone(normalized.cache)
      : { key: "financial-comparison-research", value: {} };
    const cache = {
      domain: "cache",
      valid: true,
      disposable: true,
      dependencyBlocked: false,
      records: [{
        key: "financial-comparison-research",
        value: cacheRecord.value &&
          typeof cacheRecord.value === "object" &&
          !Array.isArray(cacheRecord.value)
          ? cacheRecord.value
          : {}
      }],
      sourceKeys: cacheSourceKeys,
      sourceChecksums: Object.fromEntries(cacheSourceKeys.map((key) => [
        key,
        sourceChecksumFor(backup, key)
      ])),
      selectedSource: "direct-then-central-then-empty",
      errors: [],
      conflicts: []
    };
    return { ideas, comparisons, cache };
  }

  function prepareFinanceAssetsDomains(backup) {
    const normalization = backup.normalization || {};
    const normalized = normalization.domains || {};
    const financeRecovery = recoveryFor(normalization, "finance");
    const templatesRecovery = recoveryFor(
      normalization,
      "financeImportTemplates"
    );
    const assetsRecovery = recoveryFor(normalization, "assets");
    const financeSourceKeys = [
      "mentor_database.finances.finance-state",
      "mentorFinanceStateV1",
      "mentor_database.finances.transaction-import-templates",
      "mentorTransactionImportTemplatesV1"
    ];
    const assetSourceKeys = [
      "mentor_database.assets",
      "mentorFinanceAssetsV1"
    ];

    const normalizedFinanceDocuments = Array.isArray(
      normalized["finance-documents"]
    )
      ? clone(normalized["finance-documents"])
      : [];
    const financeDocuments = [];
    const stateDocument = normalizedFinanceDocuments.find(
      (record) => record?.id === "finance-state" ||
        record?.type === "financeState"
    );
    if (stateDocument) {
      financeDocuments.push({
        ...clone(stateDocument),
        id: "finance-state",
        type: "financeState"
      });
    }
    const templatesDocument = normalizedFinanceDocuments.find(
      (record) => record?.id === "transaction-import-templates" ||
        record?.type === "importTemplates"
    );
    if (templatesDocument) {
      const centralFinanceEnvelope = parseJsonEntry(
        findEntry(backup.snapshot, "mentor_database")
      );
      const centralTemplatesDocument =
        centralFinanceEnvelope.valid &&
        Array.isArray(centralFinanceEnvelope.value?.finances)
          ? centralFinanceEnvelope.value.finances.find(
            (record) =>
              record?.id === "transaction-import-templates" ||
              record?.type === "importTemplates"
          )
          : null;
      financeDocuments.push({
        ...(centralTemplatesDocument
          ? clone(centralTemplatesDocument)
          : {}),
        ...clone(templatesDocument),
        id: "transaction-import-templates",
        type: "importTemplates",
        templates: clone(templatesDocument.templates)
      });
    }
    const financeDocumentIds = financeDocuments.map(
      (record) => String(record?.id || "")
    );
    const financeDocumentInvalid =
      financeDocumentIds.some((id) => !id) ||
      financeDocumentIds.some(
        (id, index) => financeDocumentIds.indexOf(id) !== index
      ) ||
      Boolean(
        templatesDocument &&
        !Array.isArray(templatesDocument.templates)
      );
    const finance = {
      domain: "finance",
      valid: !financeRecovery &&
        !templatesRecovery &&
        !financeDocumentInvalid,
      dependencyBlocked: false,
      records: financeRecovery ||
        templatesRecovery ||
        financeDocumentInvalid
        ? null
        : financeDocuments,
      sourceKeys: financeSourceKeys,
      sourceChecksums: Object.fromEntries(financeSourceKeys.map((key) => [
        key,
        sourceChecksumFor(backup, key)
      ])),
      selectedSource:
        "whole-documents;savedAt-then-central;templates-union-by-id-whole-record",
      errors: [
        ...(financeRecovery?.errors || []).map((entry) => entry.code || entry),
        ...(templatesRecovery?.errors || []).map(
          (entry) => entry.code || entry
        ),
        ...(financeDocumentInvalid
          ? ["FINANCE_DOCUMENTS_INVALID"]
          : [])
      ],
      conflicts: conflictsFor(normalization, [
        "finance",
        "financeImportTemplates"
      ])
    };

    const central = parseJsonEntry(findEntry(backup.snapshot, "mentor_database"));
    const direct = parseJsonEntry(
      findEntry(backup.snapshot, "mentorFinanceAssetsV1")
    );
    const centralRows = central.valid && Array.isArray(central.value?.assets)
      ? central.value.assets
      : [];
    const directRows = direct.valid &&
      direct.value &&
      typeof direct.value === "object" &&
      Array.isArray(direct.value.assets) &&
      Array.isArray(direct.value.debts)
      ? [
        ...direct.value.assets.map((record) => ({
          ...record,
          recordType: "asset"
        })),
        ...direct.value.debts.map((record) => ({
          ...record,
          recordType: "debt"
        }))
      ]
      : [];
    function hasInvalidOrDuplicateIds(records) {
      const ids = records.map((record) => String(record?.id || ""));
      return ids.some((id) => !id) ||
        ids.some((id, index) => ids.indexOf(id) !== index);
    }
    const centralTypesById = new Map(centralRows.map((record) => [
      String(record?.id || ""),
      record?.recordType === "debt" ? "debt" : "asset"
    ]));
    const crossSourceTypeCollision = directRows.some((record) => {
      const id = String(record?.id || "");
      return id &&
        centralTypesById.has(id) &&
        centralTypesById.get(id) !== record.recordType;
    });
    const sourceAssetIdCollision =
      hasInvalidOrDuplicateIds(centralRows) ||
      hasInvalidOrDuplicateIds(directRows);
    const assetRecords = (Array.isArray(normalized.assets)
      ? clone(normalized.assets)
      : []
    ).map((record) => ({
      ...record,
      recordType: record?.recordType === "debt" ? "debt" : "asset"
    }));
    const targetAssetIdCollision = hasInvalidOrDuplicateIds(assetRecords);
    const assetsInvalid =
      sourceAssetIdCollision ||
      crossSourceTypeCollision ||
      targetAssetIdCollision;
    const assets = {
      domain: "assets",
      valid: !assetsRecovery && !assetsInvalid,
      dependencyBlocked: false,
      records: assetsRecovery || assetsInvalid ? null : assetRecords,
      sourceKeys: assetSourceKeys,
      sourceChecksums: Object.fromEntries(assetSourceKeys.map((key) => [
        key,
        sourceChecksumFor(backup, key)
      ])),
      selectedSource:
        "union-by-id;updatedAt-then-lastUpdatedAt-then-central",
      errors: [
        ...(assetsRecovery?.errors || []).map((entry) => entry.code || entry),
        ...(sourceAssetIdCollision
          ? ["ASSET_SOURCE_ID_REQUIRED_AND_UNIQUE"]
          : []),
        ...(crossSourceTypeCollision
          ? ["ASSET_ID_COLLISION_ACROSS_RECORD_TYPES"]
          : []),
        ...(targetAssetIdCollision
          ? ["ASSET_TARGET_ID_REQUIRED_AND_UNIQUE"]
          : [])
      ],
      conflicts: conflictsFor(normalization, ["assets"])
    };
    return { finance, assets };
  }

  function sortedStrings(values) {
    return Array.from(new Set(
      (values || [])
        .filter((value) => value !== undefined && value !== null && value !== "")
        .map(String)
    )).sort();
  }

  function nutritionEnvelopeMetrics(kind, envelope) {
    const collections = kind === "food"
      ? [
        "userFoods",
        "userFoodNutrients",
        "userFoodPortions",
        "userSources"
      ]
      : [
        "batches",
        "locations",
        "allocations",
        "preferences",
        "stores",
        "recipes",
        "mealPlanEntries",
        "shoppingItems",
        "recipeFavoriteIds",
        "intakeEntries",
        "migrations"
      ];
    const metrics = {
      version: Number(envelope?.version),
      collections: {}
    };
    collections.forEach((collection) => {
      const rows = Array.isArray(envelope?.[collection])
        ? envelope[collection]
        : [];
      const ids = rows.map((record) => {
        if (collection === "recipeFavoriteIds") return record;
        if (record?.id !== undefined && record?.id !== null) return record.id;
        if (
          collection === "userFoodNutrients" &&
          record?.foodId &&
          record?.nutrientId
        ) {
          return `${record.foodId}:${record.nutrientId}`;
        }
        if (collection === "preferences" && record?.foodId) {
          return record.foodId;
        }
        return null;
      });
      metrics.collections[collection] = {
        count: rows.length,
        ids: sortedStrings(ids)
      };
    });
    if (kind === "food") {
      metrics.references = {
        nutrientFoodIds: sortedStrings(
          (envelope?.userFoodNutrients || []).map((record) => record?.foodId)
        ),
        portionFoodIds: sortedStrings(
          (envelope?.userFoodPortions || []).map((record) => record?.foodId)
        )
      };
    } else {
      metrics.references = {
        batchFoodIds: sortedStrings(
          (envelope?.batches || []).map((record) => record?.foodId)
        ),
        batchLocationIds: sortedStrings(
          (envelope?.batches || []).map((record) => record?.locationId)
        ),
        allocationBatchIds: sortedStrings(
          (envelope?.allocations || []).map(
            (record) => record?.inventoryBatchId
          )
        ),
        allocationMealPlanEntryIds: sortedStrings(
          (envelope?.allocations || []).map(
            (record) => record?.mealPlanEntryId
          )
        ),
        mealPlanRecipeIds: sortedStrings(
          (envelope?.mealPlanEntries || []).map(
            (record) => record?.recipeId
          )
        ),
        recipeFoodIds: sortedStrings(
          (envelope?.recipes || []).flatMap(
            (record) => (record?.ingredients || []).map(
              (ingredient) => ingredient?.foodId
            )
          )
        ),
        shoppingFoodIds: sortedStrings(
          (envelope?.shoppingItems || []).map((record) => record?.foodId)
        ),
        intakeMealPlanEntryIds: sortedStrings(
          (envelope?.intakeEntries || []).map((record) => record?.mealPlanEntryId)
        ),
        intakeRecipeIds: sortedStrings(
          (envelope?.intakeEntries || []).map((record) => record?.recipeId)
        ),
        legacyIds: sortedStrings(
          (envelope?.batches || []).map((record) => record?.legacyId)
        )
      };
    }
    return metrics;
  }

  function nutritionEnvelopeErrors(kind, envelope) {
    const requiredCollections = kind === "food"
      ? [
        "userFoods",
        "userFoodNutrients",
        "userFoodPortions",
        "userSources"
      ]
      : [
        "batches",
        "locations",
        "allocations",
        "preferences",
        "stores",
        "recipes",
        "mealPlanEntries",
        "shoppingItems",
        "migrations"
      ];
    const errors = [];
    if (
      !envelope ||
      typeof envelope !== "object" ||
      Array.isArray(envelope) ||
      Number(envelope.version) !== 1
    ) {
      return ["NUTRITION_ENVELOPE_INVALID"];
    }
    requiredCollections.forEach((collection) => {
      if (!Array.isArray(envelope[collection])) {
        errors.push(`NUTRITION_COLLECTION_INVALID:${collection}`);
      }
    });
    if (errors.length) return errors;
    if (kind === "inventory" && Object.prototype.hasOwnProperty.call(envelope, "intakeEntries")) {
      if (!Array.isArray(envelope.intakeEntries)) errors.push("INTAKE_COLLECTION_INVALID");
      else if (envelope.intakeEntries.length) errors.push(...(root.MentorNutritionIntakeValidation?.validateEntries(envelope.intakeEntries) || ["INTAKE_VALIDATOR_UNAVAILABLE"]));
    }
    if (kind === "food") {
      envelope.userFoods.forEach((record) => {
        if (record?.ownership !== "user") {
          errors.push("NUTRITION_FOOD_OWNERSHIP_INVALID");
        }
      });
    } else {
      [
        "batches",
        "locations",
        "allocations",
        "stores",
        "shoppingItems"
      ].forEach((collection) => {
        const ids = envelope[collection].map(
          (record) => String(record?.id || "")
        );
        if (
          ids.some((id) => !id) ||
          ids.some((id, index) => ids.indexOf(id) !== index)
        ) {
          errors.push(`NUTRITION_INVENTORY_ID_INVALID:${collection}`);
        }
      });
    }
    return sortedStrings(errors);
  }

  async function prepareNutritionEnvelopeDomains(backup, options) {
    const normalization = backup.normalization || {};
    const normalized = normalization.domains || {};
    const validationByKey = new Map(
      (normalization.validationReport?.entries || [])
        .map((entry) => [entry.key, entry])
    );
    const isValid = (key) =>
      validationByKey.get(key)?.validationStatus === "valid";
    const isPresent = (key) =>
      validationByKey.get(key)?.present === true;
    const rejectedConflict = (key, selectedSource, rule) => ({
      sourceKey: key,
      sourceChecksum: sourceChecksumFor(backup, key),
      selectedSource,
      rule,
      validationErrors: clone(validationByKey.get(key)?.errors || [])
    });
    const priorityConflict = (key, selectedSource, rule) => ({
      sourceKey: key,
      sourceChecksum: sourceChecksumFor(backup, key),
      selectedSource,
      rule
    });

    const foodPrimary = "mentor_nutrition_foods_v1";
    const foodBackup = "mentor_nutrition_foods_v1_backup";
    const foodStaging = "mentor_nutrition_foods_v1_staging";
    const foodRecovery = recoveryFor(normalization, "nutritionFoodData");
    const foodStagingOnly = isPresent(foodStaging) &&
      !isPresent(foodPrimary) &&
      !isPresent(foodBackup);
    const foodRequiresRecovery = Boolean(foodRecovery || foodStagingOnly);
    const foodEnvelope = clone(normalized["nutrition-food-data"]);
    const foodErrors = foodEnvelope
      ? nutritionEnvelopeErrors("food", foodEnvelope)
      : [];
    const foodSelectedSource = isValid(foodPrimary)
      ? foodPrimary
      : isValid(foodBackup)
        ? foodBackup
        : foodRequiresRecovery
          ? "none-recovery-required"
          : "empty-version-1-envelope";
    const foodConflicts = [];
    if (isPresent(foodPrimary) && !isValid(foodPrimary)) {
      foodConflicts.push(rejectedConflict(
        foodPrimary,
        foodSelectedSource,
        "invalid-primary-rejected"
      ));
    }
    if (
      isValid(foodPrimary) &&
      isValid(foodBackup) &&
      sourceChecksumFor(backup, foodPrimary) !==
        sourceChecksumFor(backup, foodBackup)
    ) {
      foodConflicts.push(priorityConflict(
        foodBackup,
        foodPrimary,
        "primary-source-priority"
      ));
    }
    const foodValid = !foodRequiresRecovery &&
      Boolean(foodEnvelope) &&
      !foodErrors.length;
    const foodRecord = foodValid
      ? { id: "current", envelope: foodEnvelope }
      : null;
    const food = {
      domain: "nutritionFoodData",
      valid: foodValid,
      dependencyBlocked: false,
      records: foodRecord ? [foodRecord] : null,
      sourceKeys: [foodPrimary, foodBackup, foodStaging],
      sourceChecksums: Object.fromEntries(
        [foodPrimary, foodBackup, foodStaging].map((key) => [
          key,
          sourceChecksumFor(backup, key)
        ])
      ),
      selectedSource: foodSelectedSource,
      errors: [
        ...(foodRecovery?.errors || []).map((entry) => entry.code || entry),
        ...(foodStagingOnly
          ? ["NUTRITION_STAGING_REQUIRES_RECOVERY"]
          : []),
        ...foodErrors
      ],
      conflicts: foodConflicts,
      recoveryCode: foodStagingOnly
        ? "STAGING_REVIEW_REQUIRED"
        : "INVALID_ONLY_CANDIDATE",
      recoveryCandidates: isPresent(foodStaging)
        ? [{
          sourceKey: foodStaging,
          sourceChecksum: sourceChecksumFor(backup, foodStaging),
          authority: false,
          role: "staging"
        }]
        : [],
      normalizedChecksum: foodValid
        ? await checksumRecords(
          [foodEnvelope],
          options.checksumService,
          options.cryptoApi
        )
        : null,
      envelopeKind: "food",
      envelopeMetrics: foodValid
        ? nutritionEnvelopeMetrics("food", foodEnvelope)
        : null
    };

    const inventoryPrimary = "mentor_nutrition_inventory_v1";
    const inventoryBackup = "mentor_nutrition_inventory_v1_backup";
    const inventoryStaging = "mentor_nutrition_inventory_v1_staging";
    const inventoryLegacyBackup =
      "mentor_nutrition_inventory_v1_legacy_backup";
    const legacyKeys = [
      "mentor_nutrition_fridge_v1",
      "mentor_nutrition_stock_v1"
    ];
    const inventoryRecovery = recoveryFor(
      normalization,
      "nutritionInventoryData"
    );
    const inventoryRecoveryOnly = (
      isPresent(inventoryStaging) ||
      isPresent(inventoryLegacyBackup)
    ) &&
      !isPresent(inventoryPrimary) &&
      !isPresent(inventoryBackup) &&
      !legacyKeys.some(isPresent);
    const inventoryRequiresRecovery = Boolean(
      inventoryRecovery || inventoryRecoveryOnly
    );
    const inventoryEnvelope = clone(normalized["nutrition-inventory-data"]);
    const inventoryErrors = inventoryEnvelope
      ? nutritionEnvelopeErrors("inventory", inventoryEnvelope)
      : [];
    const validLegacyKeys = legacyKeys.filter(isValid);
    const baseSource = isValid(inventoryPrimary)
      ? inventoryPrimary
      : isValid(inventoryBackup)
        ? inventoryBackup
        : validLegacyKeys.length
          ? "legacy-transform"
          : inventoryRequiresRecovery
            ? "none-recovery-required"
            : "empty-version-1-envelope";
    const baseEnvelope = isValid(inventoryPrimary)
      ? parseJsonEntry(findEntry(backup.snapshot, inventoryPrimary)).value
      : isValid(inventoryBackup)
        ? parseJsonEntry(findEntry(backup.snapshot, inventoryBackup)).value
        : null;
    const hadMigrationMarker = Array.isArray(baseEnvelope?.migrations) &&
      baseEnvelope.migrations.some(
        (record) => record?.id === "legacy-fridge-v1"
      );
    const transformApplied = validLegacyKeys.length > 0 &&
      !hadMigrationMarker;
    const inventorySelectedSource = transformApplied &&
      baseSource !== "legacy-transform"
      ? `${baseSource}+legacy-transform`
      : baseSource;
    const inventoryConflicts = [];
    if (isPresent(inventoryPrimary) && !isValid(inventoryPrimary)) {
      inventoryConflicts.push(rejectedConflict(
        inventoryPrimary,
        inventorySelectedSource,
        "invalid-primary-rejected"
      ));
    }
    if (
      isValid(inventoryPrimary) &&
      isValid(inventoryBackup) &&
      sourceChecksumFor(backup, inventoryPrimary) !==
        sourceChecksumFor(backup, inventoryBackup)
    ) {
      inventoryConflicts.push(priorityConflict(
        inventoryBackup,
        inventoryPrimary,
        "primary-source-priority"
      ));
    }
    legacyKeys.forEach((key) => {
      if (isPresent(key) && !isValid(key)) {
        inventoryConflicts.push(rejectedConflict(
          key,
          inventorySelectedSource,
          "invalid-legacy-source-rejected"
        ));
      }
    });
    const inventoryValid = !inventoryRequiresRecovery &&
      Boolean(inventoryEnvelope) &&
      !inventoryErrors.length;
    const inventoryRecord = inventoryValid
      ? { id: "current", envelope: inventoryEnvelope }
      : null;
    const inventorySourceKeys = [
      inventoryPrimary,
      inventoryBackup,
      inventoryStaging,
      inventoryLegacyBackup,
      "mentor_nutrition_plan_favorites_v1",
      ...legacyKeys
    ];
    const inventory = {
      domain: "nutritionInventoryData",
      valid: inventoryValid,
      dependencyBlocked: false,
      records: inventoryRecord ? [inventoryRecord] : null,
      sourceKeys: inventorySourceKeys,
      sourceChecksums: Object.fromEntries(
        inventorySourceKeys.map((key) => [
          key,
          sourceChecksumFor(backup, key)
        ])
      ),
      selectedSource: inventorySelectedSource,
      errors: [
        ...(inventoryRecovery?.errors || []).map(
          (entry) => entry.code || entry
        ),
        ...(inventoryRecoveryOnly
          ? ["NUTRITION_RECOVERY_SOURCE_REQUIRES_REVIEW"]
          : []),
        ...inventoryErrors
      ],
      conflicts: inventoryConflicts,
      recoveryCode: inventoryRecoveryOnly
        ? "RECOVERY_SOURCE_REVIEW_REQUIRED"
        : "INVALID_ONLY_CANDIDATE",
      recoveryCandidates: [
        ...(isPresent(inventoryStaging)
          ? [{
            sourceKey: inventoryStaging,
            sourceChecksum: sourceChecksumFor(backup, inventoryStaging),
            authority: false,
            role: "staging"
          }]
          : []),
        ...(isPresent(inventoryLegacyBackup)
          ? [{
            sourceKey: inventoryLegacyBackup,
            sourceChecksum: sourceChecksumFor(backup, inventoryLegacyBackup),
            authority: false,
            role: "legacy-backup"
          }]
          : [])
      ],
      normalizedChecksum: inventoryValid
        ? await checksumRecords(
          [inventoryEnvelope],
          options.checksumService,
          options.cryptoApi
        )
        : null,
      envelopeKind: "inventory",
      envelopeMetrics: inventoryValid
        ? nutritionEnvelopeMetrics("inventory", inventoryEnvelope)
        : null
    };
    return {
      nutritionFoodData: food,
      nutritionInventoryData: inventory
    };
  }

  function mediaMetadata(record) {
    const { blob, thumbnail, ...metadata } = record || {};
    return clone(metadata);
  }

  async function mediaBinaryDescriptor(
    value,
    checksumService,
    cryptoApi
  ) {
    if (!value) return null;
    const checksum = await checksumService.sha256(value, cryptoApi);
    return {
      byteSize: Number(value.size || 0),
      contentType: value.type || "application/octet-stream",
      sha256: checksum.hex
    };
  }

  async function prepareNutritionMediaSource(backup, options) {
    const sourceRecord = (backup.rawRecords || []).find(
      (record) =>
        record.sourceType === "indexedDB" &&
        record.database === "mentor_nutrition_images" &&
        record.store === "foodImages"
    );
    const errors = [];
    if (!sourceRecord) errors.push("MEDIA_BACKUP_SOURCE_RECORD_MISSING");
    if (
      sourceRecord &&
      !["ok", "absent"].includes(sourceRecord.readStatus)
    ) {
      errors.push(
        sourceRecord.errorCode || "MEDIA_SOURCE_DISCOVERY_UNSUPPORTED"
      );
    }
    const sourceExists = sourceRecord?.readStatus === "ok";
    const records = sourceExists && Array.isArray(sourceRecord.records)
      ? sourceRecord.records
      : [];
    const ids = records.map((record) => String(record?.id || ""));
    if (
      ids.some((id) => !id) ||
      ids.some((id, index) => ids.indexOf(id) !== index)
    ) {
      errors.push("MEDIA_SOURCE_ID_REQUIRED_AND_UNIQUE");
    }

    const binaryEntries = backup.preparedBundle?.binaryEntries || [];
    const manifests = [];
    for (const record of records) {
      if (!record?.blob) {
        errors.push(`MEDIA_BLOB_REQUIRED:${record?.id || "missing-id"}`);
        continue;
      }
      const metadata = mediaMetadata(record);
      const metadataChecksum = (
        await options.checksumService.sha256(
          metadata,
          options.cryptoApi
        )
      ).hex;
      const blob = await mediaBinaryDescriptor(
        record.blob,
        options.checksumService,
        options.cryptoApi
      );
      const thumbnail = await mediaBinaryDescriptor(
        record.thumbnail,
        options.checksumService,
        options.cryptoApi
      );
      const backupBlob = binaryEntries.find(
        (entry) =>
          String(entry.recordId) === String(record.id) &&
          entry.role === "blob"
      );
      const backupThumbnail = binaryEntries.find(
        (entry) =>
          String(entry.recordId) === String(record.id) &&
          entry.role === "thumbnail"
      );
      if (
        !backupBlob ||
        Number(backupBlob.byteSize) !== blob.byteSize ||
        backupBlob.sha256 !== blob.sha256
      ) {
        errors.push(`MEDIA_BACKUP_BLOB_PARITY_FAILED:${record.id}`);
      }
      if (
        thumbnail &&
        (
          !backupThumbnail ||
          Number(backupThumbnail.byteSize) !== thumbnail.byteSize ||
          backupThumbnail.sha256 !== thumbnail.sha256
        )
      ) {
        errors.push(`MEDIA_BACKUP_THUMBNAIL_PARITY_FAILED:${record.id}`);
      }
      if (!thumbnail && backupThumbnail) {
        errors.push(`MEDIA_BACKUP_UNEXPECTED_THUMBNAIL:${record.id}`);
      }
      manifests.push({
        id: String(record.id),
        primaryKey: clone(record.id),
        metadata,
        metadataChecksum,
        blob,
        thumbnail
      });
    }
    manifests.sort((left, right) => left.id.localeCompare(right.id));
    const expectedMedia = backup.manifest?.media || {};
    const expectedBlobCount = manifests.reduce(
      (count, record) => count + 1 + (record.thumbnail ? 1 : 0),
      0
    );
    const expectedTotalBytes = manifests.reduce(
      (total, record) =>
        total +
        Number(record.blob?.byteSize || 0) +
        Number(record.thumbnail?.byteSize || 0),
      0
    );
    if (Number(expectedMedia.recordCount || 0) !== records.length) {
      errors.push("MEDIA_MANIFEST_RECORD_COUNT_MISMATCH");
    }
    if (Number(expectedMedia.blobCount || 0) !== expectedBlobCount) {
      errors.push("MEDIA_MANIFEST_BLOB_COUNT_MISMATCH");
    }
    if (Number(expectedMedia.totalBytes || 0) !== expectedTotalBytes) {
      errors.push("MEDIA_MANIFEST_TOTAL_BYTES_MISMATCH");
    }
    const manifestChecksum = (
      await options.checksumService.sha256(
        manifests,
        options.cryptoApi
      )
    ).hex;
    return {
      domain: "media",
      valid: errors.length === 0,
      dependencyBlocked: false,
      records: manifests,
      sourceExists,
      sourceDatabase: "mentor_nutrition_images",
      sourceStore: "foodImages",
      sourceKeys: ["mentor_nutrition_images/foodImages"],
      sourceChecksums: {
        "mentor_nutrition_images/foodImages":
          backup.manifest?.entries?.find(
            (entry) =>
              entry.path ===
              "indexeddb/mentor_nutrition_images/foodImages.json"
          )?.sha256 || null
      },
      selectedSource: sourceExists
        ? "mentor_nutrition_images/foodImages"
        : "source-database-absent",
      errors,
      conflicts: [],
      sourceRecordCount: records.length,
      sourceIds: ids.filter(Boolean).sort(),
      sourceManifestChecksum: manifestChecksum,
      sourceBackupRecordKey: sourceRecord?.key || null,
      expectedBlobCount,
      expectedTotalBytes,
      batchSize: 10,
      legacyRetention: {
        automaticCleanup: false,
        minimumStableDays: 30,
        requiresStableVersion: true,
        manualCleanupOnly: true
      }
    };
  }

  async function saveIdeasComparisonsBackup(
    database,
    backup,
    preparations,
    previousGroup,
    now
  ) {
    const timestamp = now();
    await idb.TransactionHelper.run(
      database,
      "rw",
      ["legacyBackups", "meta", "ideas", "comparisons", "cache"],
      async ({ table }) => {
        await table("legacyBackups").bulkPut(backup.rawRecords);
        await table("ideas").clear();
        await table("comparisons").clear();
        await table("cache").clear();
        for (const domain of IDEAS_COMPARISONS_DOMAINS) {
          await table("meta").put(Object.assign(
            initialCheckpoint(domain, timestamp),
            {
              backupId: backup.backupId,
              supersedesBackupId: previousGroup?.backupId || null
            }
          ));
        }
        await table("meta").put({
          key: IDEAS_COMPARISONS_GROUP_KEY,
          migrationId: MIGRATION_ID,
          group: "ideas-comparisons",
          status: "backed_up",
          backupId: backup.backupId,
          sourceFingerprint: backup.sourceFingerprint,
          capturedAt: backup.capturedAt,
          domains: clone(preparations),
          updatedAt: timestamp
        });
      }
    );
  }

  async function loadIdeasComparisonsBackup(database, groupRecord) {
    if (!groupRecord?.backupId || !groupRecord?.domains) return null;
    const archive = await database.table("legacyBackups").get(groupRecord.backupId);
    if (!archive?.zipBytes) return null;
    return {
      backupId: groupRecord.backupId,
      capturedAt: groupRecord.capturedAt,
      sourceFingerprint: groupRecord.sourceFingerprint,
      domains: clone(groupRecord.domains),
      manifest: clone(archive.manifest)
    };
  }

  async function saveFinanceAssetsBackup(
    database,
    backup,
    preparations,
    previousGroup,
    now
  ) {
    const timestamp = now();
    await idb.TransactionHelper.run(
      database,
      "rw",
      ["legacyBackups", "meta", "financeDocuments", "assets"],
      async ({ table }) => {
        await table("legacyBackups").bulkPut(backup.rawRecords);
        await table("financeDocuments").clear();
        await table("assets").clear();
        for (const domain of FINANCE_ASSETS_DOMAINS) {
          await table("meta").put(Object.assign(
            initialCheckpoint(domain, timestamp),
            {
              backupId: backup.backupId,
              supersedesBackupId: previousGroup?.backupId || null
            }
          ));
        }
        await table("meta").put({
          key: FINANCE_ASSETS_GROUP_KEY,
          migrationId: MIGRATION_ID,
          group: "finance-assets",
          status: "backed_up",
          backupId: backup.backupId,
          sourceFingerprint: backup.sourceFingerprint,
          capturedAt: backup.capturedAt,
          domains: clone(preparations),
          updatedAt: timestamp
        });
      }
    );
  }

  async function loadFinanceAssetsBackup(database, groupRecord) {
    if (!groupRecord?.backupId || !groupRecord?.domains) return null;
    const archive = await database.table("legacyBackups").get(
      groupRecord.backupId
    );
    if (!archive?.zipBytes) return null;
    return {
      backupId: groupRecord.backupId,
      capturedAt: groupRecord.capturedAt,
      sourceFingerprint: groupRecord.sourceFingerprint,
      domains: clone(groupRecord.domains),
      manifest: clone(archive.manifest)
    };
  }

  async function saveNutritionEnvelopeBackup(
    database,
    backup,
    preparations,
    previousGroup,
    now
  ) {
    const timestamp = now();
    await idb.TransactionHelper.run(
      database,
      "rw",
      [
        "legacyBackups",
        "meta",
        "nutritionFoodData",
        "nutritionInventoryData"
      ],
      async ({ table }) => {
        await table("legacyBackups").bulkPut(backup.rawRecords);
        await table("nutritionFoodData").clear();
        await table("nutritionInventoryData").clear();
        for (const domain of NUTRITION_ENVELOPE_DOMAINS) {
          await table("meta").put(Object.assign(
            initialCheckpoint(domain, timestamp),
            {
              backupId: backup.backupId,
              supersedesBackupId: previousGroup?.backupId || null
            }
          ));
        }
        await table("meta").put({
          key: NUTRITION_ENVELOPES_GROUP_KEY,
          migrationId: MIGRATION_ID,
          group: "nutrition-envelopes",
          status: "backed_up",
          backupId: backup.backupId,
          sourceFingerprint: backup.sourceFingerprint,
          capturedAt: backup.capturedAt,
          domains: clone(preparations),
          mediaCutoverIncluded: false,
          updatedAt: timestamp
        });
      }
    );
  }

  async function loadNutritionEnvelopeBackup(database, groupRecord) {
    if (!groupRecord?.backupId || !groupRecord?.domains) return null;
    const archive = await database.table("legacyBackups").get(
      groupRecord.backupId
    );
    if (!archive?.zipBytes) return null;
    return {
      backupId: groupRecord.backupId,
      capturedAt: groupRecord.capturedAt,
      sourceFingerprint: groupRecord.sourceFingerprint,
      domains: clone(groupRecord.domains),
      manifest: clone(archive.manifest)
    };
  }

  function mediaRecordCheckpointKey(id) {
    return `${DOMAIN_KEYS.media}:record:${encodeURIComponent(String(id))}`;
  }

  async function saveNutritionMediaBackup(
    database,
    backup,
    preparation,
    previousGroup,
    now
  ) {
    const timestamp = now();
    await idb.TransactionHelper.run(
      database,
      "rw",
      ["legacyBackups", "meta", "media"],
      async ({ table }) => {
        const meta = table("meta");
        await table("legacyBackups").bulkPut(backup.rawRecords);
        await table("media").clear();
        const oldRecordCheckpoints = (await meta.toArray())
          .filter((record) =>
            String(record?.key || "").startsWith(
              `${DOMAIN_KEYS.media}:record:`
            )
          )
          .map((record) => record.key);
        if (oldRecordCheckpoints.length) {
          await meta.bulkDelete(oldRecordCheckpoints);
        }
        await meta.put(Object.assign(
          initialCheckpoint("media", timestamp),
          {
            backupId: backup.backupId,
            supersedesBackupId: previousGroup?.backupId || null,
            sourceFingerprint: backup.sourceFingerprint,
            sourceRecordCount: preparation.sourceRecordCount,
            sourceManifestChecksum: preparation.sourceManifestChecksum,
            processedRecordCount: 0,
            verifiedRecordCount: 0,
            completedBatchCount: 0
          }
        ));
        await meta.put({
          key: NUTRITION_MEDIA_GROUP_KEY,
          migrationId: MIGRATION_ID,
          group: "nutrition-media",
          status: "backed_up",
          backupId: backup.backupId,
          sourceFingerprint: backup.sourceFingerprint,
          capturedAt: backup.capturedAt,
          domain: clone(preparation),
          processedRecordCount: 0,
          verifiedRecordCount: 0,
          completedBatchCount: 0,
          active: false,
          updatedAt: timestamp
        });
      }
    );
  }

  async function loadNutritionMediaBackup(database, groupRecord) {
    if (!groupRecord?.backupId || !groupRecord?.domain) return null;
    const archive = await database.table("legacyBackups").get(
      groupRecord.backupId
    );
    const source = groupRecord.domain.sourceBackupRecordKey
      ? await database.table("legacyBackups").get(
        groupRecord.domain.sourceBackupRecordKey
      )
      : null;
    if (!archive?.zipBytes || !source) return null;
    return {
      backupId: groupRecord.backupId,
      capturedAt: groupRecord.capturedAt,
      sourceFingerprint: groupRecord.sourceFingerprint,
      domain: clone(groupRecord.domain),
      sourceRecords: clone(source.records || []),
      manifest: clone(archive.manifest)
    };
  }

  async function putCheckpoint(database, checkpoint) {
    await database.table("meta").put(checkpoint);
    return checkpoint;
  }

  async function transition(database, checkpoint, status, details, now) {
    const next = idb.MigrationStateMachine.createNext(
      checkpoint,
      status,
      details,
      now()
    );
    await putCheckpoint(database, next);
    return next;
  }

  async function markDomainRecovery(database, domain, checkpoint, preparation, backupId, now) {
    if (preparation.dependencyBlocked) {
      const next = Object.assign({}, checkpoint, {
        status: "backed_up",
        backupId,
        dependencyBlocked: true,
        errors: preparation.errors.slice(),
        updatedAt: now()
      });
      return putCheckpoint(database, next);
    }
    return transition(
      database,
      checkpoint,
      idb.MigrationStateMachine.STATUS.RECOVERY_REQUIRED,
      {
        backupId,
        recoveryCode:
          preparation.recoveryCode || "INVALID_ONLY_CANDIDATE",
        errors: preparation.errors.slice(),
        allowsEmptyActivation: false
      },
      now
    );
  }

  async function activateDomains(database, domains, now) {
    const timestamp = now();
    await idb.TransactionHelper.run(database, "rw", ["meta"], async ({ table }) => {
      const meta = table("meta");
      const activeAdapters = await meta.get(CUTOVER_KEYS.global) || {
        key: CUTOVER_KEYS.global,
        domains: {}
      };
      for (const domain of domains) {
        const checkpoint = await meta.get(DOMAIN_KEYS[domain]);
        idb.MigrationStateMachine.assertTransition(
          checkpoint.status,
          idb.MigrationStateMachine.STATUS.ACTIVE
        );
        await meta.put(idb.MigrationStateMachine.createNext(
          checkpoint,
          idb.MigrationStateMachine.STATUS.ACTIVE,
          { activatedAt: timestamp },
          timestamp
        ));
        await meta.put({
          key: CUTOVER_KEYS[domain],
          domain,
          adapter: "indexeddb",
          status: "active",
          verifiedAt: checkpoint.verifiedAt || checkpoint.updatedAt,
          hasIndexedDbWrites: false,
          activatedAt: timestamp,
          updatedAt: timestamp
        });
        activeAdapters.domains[domain] = "indexeddb";
      }
      activeAdapters.updatedAt = timestamp;
      await meta.put(activeAdapters);
    });
  }

  async function verifyDomain(database, domain, preparation, checkpoint, options) {
    const storeName = DOMAIN_STORES[domain];
    let next = checkpoint;
    if (next.status === idb.MigrationStateMachine.STATUS.IMPORTED) {
      next = await transition(
        database,
        next,
        idb.MigrationStateMachine.STATUS.VERIFICATION_IN_PROGRESS,
        { verificationStartedAt: options.now() },
        options.now
      );
    }
    const actual = await database.table(storeName).toArray();
    const expectedIds = recordIds(preparation.records);
    const actualIds = recordIds(actual);
    const expectedChecksum = await checksumRecords(
      preparation.records,
      options.checksumService,
      options.cryptoApi
    );
    const actualChecksum = await checksumRecords(
      actual,
      options.checksumService,
      options.cryptoApi
    );
    const actualEnvelope = preparation.envelopeKind
      ? actual.find((record) => record?.id === "current")?.envelope
      : null;
    const actualNormalizedChecksum = preparation.envelopeKind &&
      actualEnvelope
      ? await checksumRecords(
        [actualEnvelope],
        options.checksumService,
        options.cryptoApi
      )
      : null;
    const actualEnvelopeMetrics = preparation.envelopeKind &&
      actualEnvelope
      ? nutritionEnvelopeMetrics(
        preparation.envelopeKind,
        actualEnvelope
      )
      : null;
    const normalizedParity = preparation.envelopeKind
      ? preparation.normalizedChecksum === actualNormalizedChecksum &&
        JSON.stringify(preparation.envelopeMetrics) ===
          JSON.stringify(actualEnvelopeMetrics)
      : true;
    const valid = preparation.records.length === actual.length &&
      JSON.stringify(expectedIds) === JSON.stringify(actualIds) &&
      expectedChecksum === actualChecksum &&
      normalizedParity;
    const verification = {
      valid,
      expectedRecordCount: preparation.records.length,
      actualRecordCount: actual.length,
      expectedIds,
      actualIds,
      expectedChecksum,
      actualChecksum,
      expectedNormalizedChecksum:
        preparation.normalizedChecksum || null,
      actualNormalizedChecksum,
      expectedEnvelopeMetrics:
        clone(preparation.envelopeMetrics || null),
      actualEnvelopeMetrics,
      normalizedParity,
      verifiedAt: options.now()
    };
    if (!valid) {
      const failed = await transition(
        database,
        next,
        idb.MigrationStateMachine.STATUS.FAILED,
        {
          errorCode: "MIGRATION_PARITY_FAILED",
          verification
        },
        options.now
      );
      return { checkpoint: failed, verification };
    }
    const verified = await transition(
      database,
      next,
      idb.MigrationStateMachine.STATUS.VERIFIED,
      { verification, verifiedAt: verification.verifiedAt },
      options.now
    );
    return { checkpoint: verified, verification };
  }

  async function migrateDomain(database, domain, preparation, backupId, options) {
    let checkpoint = await database.table("meta").get(DOMAIN_KEYS[domain]) ||
      initialCheckpoint(domain, options.now());
    if (
      checkpoint.status === idb.MigrationStateMachine.STATUS.ACTIVE ||
      checkpoint.status === idb.MigrationStateMachine.STATUS.VERIFIED ||
      checkpoint.status === idb.MigrationStateMachine.STATUS.RECOVERY_REQUIRED
    ) {
      return checkpoint;
    }
    if (!preparation.valid) {
      return markDomainRecovery(
        database,
        domain,
        checkpoint,
        preparation,
        backupId,
        options.now
      );
    }
    if (checkpoint.status === idb.MigrationStateMachine.STATUS.FAILED) {
      const resumeStatus = checkpoint.lastSuccessfulCheckpoint ===
        idb.MigrationStateMachine.STATUS.IMPORTED
        ? idb.MigrationStateMachine.STATUS.VERIFICATION_IN_PROGRESS
        : idb.MigrationStateMachine.STATUS.IMPORT_IN_PROGRESS;
      checkpoint = await transition(
        database,
        checkpoint,
        resumeStatus,
        { resumedAt: options.now() },
        options.now
      );
    }
    if (checkpoint.status === idb.MigrationStateMachine.STATUS.NOT_STARTED) {
      checkpoint = await transition(
        database,
        checkpoint,
        idb.MigrationStateMachine.STATUS.BACKUP_IN_PROGRESS,
        { backupId },
        options.now
      );
    }
    if (checkpoint.status === idb.MigrationStateMachine.STATUS.BACKUP_IN_PROGRESS) {
      checkpoint = await transition(
        database,
        checkpoint,
        idb.MigrationStateMachine.STATUS.BACKED_UP,
        { backupId },
        options.now
      );
    }
    if (checkpoint.status === idb.MigrationStateMachine.STATUS.BACKED_UP) {
      checkpoint = await transition(
        database,
        checkpoint,
        idb.MigrationStateMachine.STATUS.IMPORT_IN_PROGRESS,
        {
          sourceKeys: preparation.sourceKeys,
          selectedSource: preparation.selectedSource
        },
        options.now
      );
    }
    if (checkpoint.status === idb.MigrationStateMachine.STATUS.IMPORT_IN_PROGRESS) {
      const imported = idb.MigrationStateMachine.createNext(
        checkpoint,
        idb.MigrationStateMachine.STATUS.IMPORTED,
        {
          backupId,
          sourceRecordCount: preparation.records.length,
          importedRecordCount: preparation.records.length,
          sourceIds: recordIds(preparation.records),
          sourceChecksum: await checksumRecords(
            preparation.records,
            options.checksumService,
            options.cryptoApi
          )
        },
        options.now()
      );
      await idb.TransactionHelper.replaceStoreAndPutMeta(
        database,
        DOMAIN_STORES[domain],
        preparation.records,
        imported
      );
      checkpoint = imported;
      await options.onPhase?.({ phase: "imported", domain, checkpoint: clone(checkpoint) });
    }
    if (
      checkpoint.status === idb.MigrationStateMachine.STATUS.IMPORTED ||
      checkpoint.status === idb.MigrationStateMachine.STATUS.VERIFICATION_IN_PROGRESS
    ) {
      checkpoint = (await verifyDomain(
        database,
        domain,
        preparation,
        checkpoint,
        options
      )).checkpoint;
    }
    return checkpoint;
  }

  function domainReport(domain, checkpoint, preparation) {
    return {
      domain,
      status: checkpoint?.status || "not_started",
      backupId: checkpoint?.backupId || null,
      selectedSource: preparation?.selectedSource || null,
      sourceKeys: preparation?.sourceKeys || [],
      sourceChecksums: preparation?.sourceChecksums || {},
      conflicts: preparation?.conflicts || [],
      sourceRecordCount: checkpoint?.sourceRecordCount || 0,
      targetRecordCount: checkpoint?.verification?.actualRecordCount || 0,
      sourceIds: checkpoint?.sourceIds || [],
      targetIds: checkpoint?.verification?.actualIds || [],
      sourceChecksum: checkpoint?.sourceChecksum || null,
      targetChecksum: checkpoint?.verification?.actualChecksum || null,
      normalizedSourceChecksum:
        checkpoint?.verification?.expectedNormalizedChecksum ||
        preparation?.normalizedChecksum ||
        null,
      normalizedTargetChecksum:
        checkpoint?.verification?.actualNormalizedChecksum || null,
      envelopeMetrics: {
        source:
          checkpoint?.verification?.expectedEnvelopeMetrics ||
          preparation?.envelopeMetrics ||
          null,
        target:
          checkpoint?.verification?.actualEnvelopeMetrics || null
      },
      errors: checkpoint?.errors || [],
      dependencyBlocked: Boolean(checkpoint?.dependencyBlocked),
      disposable: Boolean(preparation?.disposable),
      excludedLegacyCollections:
        preparation?.excludedLegacyCollections || [],
      recoveryCandidates: preparation?.recoveryCandidates || []
    };
  }

  async function saveReport(
    database,
    backupId,
    checkpoints,
    domains,
    now,
    domainNames,
    reportKey
  ) {
    const selectedDomains = domainNames || CORE_DOMAINS;
    const targetReportKey = reportKey || REPORT_KEY;
    const rows = selectedDomains.map((domain) =>
      domainReport(domain, checkpoints[domain], domains[domain])
    );
    const report = {
      reportVersion: 1,
      migrationId: MIGRATION_ID,
      backupId,
      status: rows.every((row) => row.status === "active")
        ? "active"
        : rows.some((row) => row.status === "recoveryRequired")
          ? "partial"
          : "in_progress",
      createdAt: now(),
      domains: rows
    };
    const timestamp = now();
    await idb.TransactionHelper.run(
      database,
      "rw",
      ["meta", "legacyBackups"],
      async ({ table }) => {
        await table("meta").put({
          key: targetReportKey,
          report,
          updatedAt: timestamp
        });
        await table("legacyBackups").put({
          key: `${backupId}:migration-report`,
          backupId,
          sourceType: "migrationReport",
          report: clone(report),
          capturedAt: timestamp
        });
      }
    );
    return report;
  }

  async function verifyMediaRecordParity(record, manifest, options) {
    if (!record || String(record.id) !== manifest.id) {
      return {
        valid: false,
        errorCode: "MEDIA_TARGET_ID_MISMATCH",
        actualManifest: null
      };
    }
    const metadata = mediaMetadata(record);
    const metadataChecksum = (
      await options.checksumService.sha256(
        metadata,
        options.cryptoApi
      )
    ).hex;
    const blob = await mediaBinaryDescriptor(
      record.blob,
      options.checksumService,
      options.cryptoApi
    );
    const thumbnail = await mediaBinaryDescriptor(
      record.thumbnail,
      options.checksumService,
      options.cryptoApi
    );
    const actualManifest = {
      id: String(record.id),
      primaryKey: clone(record.id),
      metadata,
      metadataChecksum,
      blob,
      thumbnail
    };
    const valid = metadataChecksum === manifest.metadataChecksum &&
      Boolean(blob) &&
      blob.byteSize === manifest.blob?.byteSize &&
      blob.contentType === manifest.blob?.contentType &&
      blob.sha256 === manifest.blob?.sha256 &&
      (
        !manifest.thumbnail && !thumbnail ||
        Boolean(manifest.thumbnail) &&
          Boolean(thumbnail) &&
          thumbnail.byteSize === manifest.thumbnail.byteSize &&
          thumbnail.contentType === manifest.thumbnail.contentType &&
          thumbnail.sha256 === manifest.thumbnail.sha256
      );
    return {
      valid,
      errorCode: valid ? null : "MEDIA_BINARY_OR_METADATA_PARITY_FAILED",
      actualManifest
    };
  }

  async function verifyCompleteMediaStore(
    database,
    preparation,
    options
  ) {
    const records = await database.table("media").toArray();
    const actualIds = records.map((record) => String(record?.id || "")).sort();
    const expectedIds = preparation.sourceIds.slice().sort();
    const actualManifests = [];
    const recordResults = [];
    for (const manifest of preparation.records) {
      const target = records.find(
        (record) => String(record?.id) === manifest.id
      );
      const parity = await verifyMediaRecordParity(
        target,
        manifest,
        options
      );
      recordResults.push({
        id: manifest.id,
        valid: parity.valid,
        errorCode: parity.errorCode
      });
      if (parity.actualManifest) {
        actualManifests.push(parity.actualManifest);
      }
    }
    actualManifests.sort((left, right) => left.id.localeCompare(right.id));
    const actualManifestChecksum = (
      await options.checksumService.sha256(
        actualManifests,
        options.cryptoApi
      )
    ).hex;
    const idsMatch =
      JSON.stringify(expectedIds) === JSON.stringify(actualIds);
    const countMatches =
      preparation.sourceRecordCount === records.length;
    const nonEmptySourcePreserved = !(
      preparation.sourceExists &&
      preparation.sourceRecordCount > 0 &&
      records.length === 0
    );
    const valid = idsMatch &&
      countMatches &&
      nonEmptySourcePreserved &&
      recordResults.every((result) => result.valid) &&
      preparation.sourceManifestChecksum === actualManifestChecksum;
    return {
      valid,
      expectedRecordCount: preparation.sourceRecordCount,
      actualRecordCount: records.length,
      expectedIds,
      actualIds,
      expectedManifestChecksum: preparation.sourceManifestChecksum,
      actualManifestChecksum,
      expectedBlobCount: preparation.expectedBlobCount,
      expectedTotalBytes: preparation.expectedTotalBytes,
      nonEmptySourcePreserved,
      records: recordResults,
      verifiedAt: options.now()
    };
  }

  async function saveMediaProgress(
    database,
    checkpoint,
    backup,
    preparation,
    progress,
    now
  ) {
    const timestamp = now();
    const next = Object.assign({}, checkpoint, progress, {
      updatedAt: timestamp
    });
    await idb.TransactionHelper.run(
      database,
      "rw",
      ["meta"],
      async ({ table }) => {
        const meta = table("meta");
        await meta.put(next);
        const group = await meta.get(NUTRITION_MEDIA_GROUP_KEY) || {
          key: NUTRITION_MEDIA_GROUP_KEY
        };
        await meta.put(Object.assign({}, group, progress, {
          migrationId: MIGRATION_ID,
          group: "nutrition-media",
          status: next.status,
          backupId: backup.backupId,
          sourceFingerprint: backup.sourceFingerprint,
          capturedAt: backup.capturedAt,
          domain: clone(preparation),
          active: next.status ===
            idb.MigrationStateMachine.STATUS.ACTIVE,
          updatedAt: timestamp
        }));
      }
    );
    return next;
  }

  async function saveMediaMigrationReport(
    database,
    backup,
    preparation,
    checkpoint,
    now
  ) {
    const recordCheckpoints = (await database.table("meta").toArray())
      .filter((record) =>
        String(record?.key || "").startsWith(
          `${DOMAIN_KEYS.media}:record:`
        )
      )
      .map((record) => ({
        id: record.id,
        status: record.status,
        sourceFingerprint: record.sourceFingerprint,
        parity: clone(record.parity || null),
        errorCode: record.errorCode || null,
        updatedAt: record.updatedAt
      }))
      .sort((left, right) => String(left.id).localeCompare(String(right.id)));
    const report = {
      reportVersion: 1,
      migrationId: MIGRATION_ID,
      backupId: backup.backupId,
      status: checkpoint.status,
      createdAt: now(),
      domain: {
        domain: "media",
        status: checkpoint.status,
        sourceDatabase: preparation.sourceDatabase,
        sourceStore: preparation.sourceStore,
        sourceExists: preparation.sourceExists,
        sourceRecordCount: preparation.sourceRecordCount,
        sourceIds: preparation.sourceIds,
        sourceManifestChecksum: preparation.sourceManifestChecksum,
        sourceChecksums: preparation.sourceChecksums,
        expectedBlobCount: preparation.expectedBlobCount,
        expectedTotalBytes: preparation.expectedTotalBytes,
        processedRecordCount: checkpoint.processedRecordCount || 0,
        verifiedRecordCount: checkpoint.verifiedRecordCount || 0,
        completedBatchCount: checkpoint.completedBatchCount || 0,
        verification: clone(checkpoint.verification || null),
        errors: clone(checkpoint.errors || []),
        errorCode: checkpoint.errorCode || null,
        records: recordCheckpoints,
        legacyRetention: clone(preparation.legacyRetention)
      }
    };
    const timestamp = now();
    await idb.TransactionHelper.run(
      database,
      "rw",
      ["meta", "legacyBackups"],
      async ({ table }) => {
        await table("meta").put({
          key: NUTRITION_MEDIA_REPORT_KEY,
          report,
          updatedAt: timestamp
        });
        await table("legacyBackups").put({
          key: `${backup.backupId}:migration-report`,
          backupId: backup.backupId,
          sourceType: "migrationReport",
          report: clone(report),
          capturedAt: timestamp
        });
      }
    );
    return report;
  }

  async function migrateIdeasComparisons(options) {
    const database = options.database;
    const now = options.now;
    const existingCheckpoints = Object.fromEntries(
      await Promise.all(IDEAS_COMPARISONS_DOMAINS.map(async (domain) => [
        domain,
        await database.table("meta").get(DOMAIN_KEYS[domain])
      ]))
    );
    if (
      existingCheckpoints.ideas?.status ===
        idb.MigrationStateMachine.STATUS.ACTIVE &&
      existingCheckpoints.comparisons?.status ===
        idb.MigrationStateMachine.STATUS.ACTIVE
    ) {
      const savedReport = await database.table("meta").get(
        IDEAS_COMPARISONS_REPORT_KEY
      );
      return {
        backupId: existingCheckpoints.ideas.backupId,
        report: savedReport?.report || null,
        checkpoints: existingCheckpoints
      };
    }

    const currentCapture = options.forceRecoveryRetry
      ? options.recoveryCapture
      : await prepareCompleteBackup({
        ...options,
        backupScope: "ideas-comparisons"
      });
    const currentPreparations = options.forceRecoveryRetry
      ? options.recoveryPreparations
      : prepareIdeasComparisonsDomains(currentCapture);
    const previousGroup = await database.table("meta").get(
      IDEAS_COMPARISONS_GROUP_KEY
    );
    const savedBackup = await loadIdeasComparisonsBackup(database, previousGroup);
    let backup;
    let preparations;
    if (
      !options.forceRecoveryRetry &&
      savedBackup &&
      savedBackup.sourceFingerprint === currentCapture.sourceFingerprint
    ) {
      backup = savedBackup;
      preparations = savedBackup.domains;
    } else {
      await saveIdeasComparisonsBackup(
        database,
        currentCapture,
        currentPreparations,
        previousGroup,
        now
      );
      backup = currentCapture;
      preparations = currentPreparations;
    }

    const checkpoints = {};
    checkpoints.ideas = await migrateDomain(
      database,
      "ideas",
      preparations.ideas,
      backup.backupId,
      options
    );
    checkpoints.comparisons = await migrateDomain(
      database,
      "comparisons",
      preparations.comparisons,
      backup.backupId,
      options
    );
    try {
      checkpoints.cache = await migrateDomain(
        database,
        "cache",
        preparations.cache,
        backup.backupId,
        options
      );
    } catch (error) {
      let checkpoint = await database.table("meta").get(DOMAIN_KEYS.cache);
      if (
        checkpoint &&
        checkpoint.status !== idb.MigrationStateMachine.STATUS.FAILED &&
        checkpoint.status !== idb.MigrationStateMachine.STATUS.RECOVERY_REQUIRED
      ) {
        checkpoint = await transition(
          database,
          checkpoint,
          idb.MigrationStateMachine.STATUS.FAILED,
          {
            errorCode: error.code || "DISPOSABLE_CACHE_IMPORT_FAILED",
            errorMessage: error.message,
            disposable: true
          },
          now
        );
      }
      checkpoints.cache = checkpoint;
    }

    if (
      checkpoints.ideas.status === idb.MigrationStateMachine.STATUS.VERIFIED &&
      checkpoints.comparisons.status ===
        idb.MigrationStateMachine.STATUS.VERIFIED
    ) {
      await activateDomains(database, ["ideas", "comparisons"], now);
      checkpoints.ideas = await database.table("meta").get(DOMAIN_KEYS.ideas);
      checkpoints.comparisons = await database.table("meta").get(
        DOMAIN_KEYS.comparisons
      );
    }
    if (
      checkpoints.cache?.status === idb.MigrationStateMachine.STATUS.VERIFIED
    ) {
      await activateDomains(database, ["cache"], now);
      checkpoints.cache = await database.table("meta").get(DOMAIN_KEYS.cache);
    }

    const report = await saveReport(
      database,
      backup.backupId,
      checkpoints,
      preparations,
      now,
      IDEAS_COMPARISONS_DOMAINS,
      IDEAS_COMPARISONS_REPORT_KEY
    );
    await database.table("meta").put({
      key: IDEAS_COMPARISONS_GROUP_KEY,
      migrationId: MIGRATION_ID,
      group: "ideas-comparisons",
      status: report.status,
      backupId: backup.backupId,
      sourceFingerprint: backup.sourceFingerprint,
      capturedAt: backup.capturedAt,
      domains: clone(preparations),
      updatedAt: now()
    });
    return { backupId: backup.backupId, report, checkpoints };
  }

  async function migrateFinanceAssets(options) {
    const database = options.database;
    const now = options.now;
    const existingCheckpoints = Object.fromEntries(
      await Promise.all(FINANCE_ASSETS_DOMAINS.map(async (domain) => [
        domain,
        await database.table("meta").get(DOMAIN_KEYS[domain])
      ]))
    );
    const financeActive = existingCheckpoints.finance?.status ===
      idb.MigrationStateMachine.STATUS.ACTIVE;
    const assetsActive = existingCheckpoints.assets?.status ===
      idb.MigrationStateMachine.STATUS.ACTIVE;
    if (financeActive !== assetsActive) {
      const error = new Error(
        "Finance and Assets cutover checkpoints must be activated together."
      );
      error.code = "FINANCE_ASSETS_CUTOVER_PAIR_REQUIRED";
      throw error;
    }
    if (financeActive && assetsActive) {
      const savedReport = await database.table("meta").get(
        FINANCE_ASSETS_REPORT_KEY
      );
      return {
        backupId: existingCheckpoints.finance.backupId,
        report: savedReport?.report || null,
        checkpoints: existingCheckpoints
      };
    }

    const currentCapture = options.forceRecoveryRetry
      ? options.recoveryCapture
      : await prepareCompleteBackup({
        ...options,
        backupScope: "finance-assets"
      });
    const currentPreparations = options.forceRecoveryRetry
      ? options.recoveryPreparations
      : prepareFinanceAssetsDomains(currentCapture);
    const previousGroup = await database.table("meta").get(
      FINANCE_ASSETS_GROUP_KEY
    );
    const savedBackup = await loadFinanceAssetsBackup(
      database,
      previousGroup
    );
    let backup;
    let preparations;
    if (
      !options.forceRecoveryRetry &&
      savedBackup &&
      savedBackup.sourceFingerprint === currentCapture.sourceFingerprint
    ) {
      backup = savedBackup;
      preparations = savedBackup.domains;
    } else {
      await saveFinanceAssetsBackup(
        database,
        currentCapture,
        currentPreparations,
        previousGroup,
        now
      );
      backup = currentCapture;
      preparations = currentPreparations;
    }

    const checkpoints = {};
    checkpoints.finance = await migrateDomain(
      database,
      "finance",
      preparations.finance,
      backup.backupId,
      options
    );
    checkpoints.assets = await migrateDomain(
      database,
      "assets",
      preparations.assets,
      backup.backupId,
      options
    );

    if (
      checkpoints.finance.status ===
        idb.MigrationStateMachine.STATUS.VERIFIED &&
      checkpoints.assets.status ===
        idb.MigrationStateMachine.STATUS.VERIFIED
    ) {
      await activateDomains(database, FINANCE_ASSETS_DOMAINS, now);
      checkpoints.finance = await database.table("meta").get(
        DOMAIN_KEYS.finance
      );
      checkpoints.assets = await database.table("meta").get(
        DOMAIN_KEYS.assets
      );
    }

    const report = await saveReport(
      database,
      backup.backupId,
      checkpoints,
      preparations,
      now,
      FINANCE_ASSETS_DOMAINS,
      FINANCE_ASSETS_REPORT_KEY
    );
    await database.table("meta").put({
      key: FINANCE_ASSETS_GROUP_KEY,
      migrationId: MIGRATION_ID,
      group: "finance-assets",
      status: report.status,
      backupId: backup.backupId,
      sourceFingerprint: backup.sourceFingerprint,
      capturedAt: backup.capturedAt,
      domains: clone(preparations),
      updatedAt: now()
    });
    return { backupId: backup.backupId, report, checkpoints };
  }

  async function migrateNutritionEnvelopes(options) {
    const database = options.database;
    const now = options.now;
    const existingCheckpoints = Object.fromEntries(
      await Promise.all(NUTRITION_ENVELOPE_DOMAINS.map(async (domain) => [
        domain,
        await database.table("meta").get(DOMAIN_KEYS[domain])
      ]))
    );
    const foodActive = existingCheckpoints.nutritionFoodData?.status ===
      idb.MigrationStateMachine.STATUS.ACTIVE;
    const inventoryActive =
      existingCheckpoints.nutritionInventoryData?.status ===
        idb.MigrationStateMachine.STATUS.ACTIVE;
    if (foodActive !== inventoryActive) {
      const error = new Error(
        "Nutrition Food Data and Inventory cutover checkpoints must be activated together."
      );
      error.code = "NUTRITION_ENVELOPES_CUTOVER_PAIR_REQUIRED";
      throw error;
    }
    if (foodActive && inventoryActive) {
      const savedReport = await database.table("meta").get(
        NUTRITION_ENVELOPES_REPORT_KEY
      );
      return {
        backupId: existingCheckpoints.nutritionFoodData.backupId,
        report: savedReport?.report || null,
        checkpoints: existingCheckpoints
      };
    }

    const currentCapture = options.forceRecoveryRetry
      ? options.recoveryCapture
      : await prepareCompleteBackup({
        ...options,
        backupScope: "nutrition-envelopes"
      });
    const currentPreparations = options.forceRecoveryRetry
      ? options.recoveryPreparations
      : await prepareNutritionEnvelopeDomains(
        currentCapture,
        options
      );
    const previousGroup = await database.table("meta").get(
      NUTRITION_ENVELOPES_GROUP_KEY
    );
    const savedBackup = await loadNutritionEnvelopeBackup(
      database,
      previousGroup
    );
    let backup;
    let preparations;
    if (
      !options.forceRecoveryRetry &&
      savedBackup &&
      savedBackup.sourceFingerprint === currentCapture.sourceFingerprint
    ) {
      backup = savedBackup;
      preparations = savedBackup.domains;
    } else {
      await saveNutritionEnvelopeBackup(
        database,
        currentCapture,
        currentPreparations,
        previousGroup,
        now
      );
      backup = currentCapture;
      preparations = currentPreparations;
    }

    const checkpoints = {};
    checkpoints.nutritionFoodData = await migrateDomain(
      database,
      "nutritionFoodData",
      preparations.nutritionFoodData,
      backup.backupId,
      options
    );
    checkpoints.nutritionInventoryData = await migrateDomain(
      database,
      "nutritionInventoryData",
      preparations.nutritionInventoryData,
      backup.backupId,
      options
    );
    if (
      checkpoints.nutritionFoodData.status ===
        idb.MigrationStateMachine.STATUS.VERIFIED &&
      checkpoints.nutritionInventoryData.status ===
        idb.MigrationStateMachine.STATUS.VERIFIED
    ) {
      await activateDomains(
        database,
        NUTRITION_ENVELOPE_DOMAINS,
        now
      );
      checkpoints.nutritionFoodData = await database.table("meta").get(
        DOMAIN_KEYS.nutritionFoodData
      );
      checkpoints.nutritionInventoryData =
        await database.table("meta").get(
          DOMAIN_KEYS.nutritionInventoryData
        );
    }

    const report = await saveReport(
      database,
      backup.backupId,
      checkpoints,
      preparations,
      now,
      NUTRITION_ENVELOPE_DOMAINS,
      NUTRITION_ENVELOPES_REPORT_KEY
    );
    await database.table("meta").put({
      key: NUTRITION_ENVELOPES_GROUP_KEY,
      migrationId: MIGRATION_ID,
      group: "nutrition-envelopes",
      status: report.status,
      backupId: backup.backupId,
      sourceFingerprint: backup.sourceFingerprint,
      capturedAt: backup.capturedAt,
      domains: clone(preparations),
      mediaCutoverIncluded: false,
      updatedAt: now()
    });
    return { backupId: backup.backupId, report, checkpoints };
  }

  async function migrateNutritionMedia(options) {
    const database = options.database;
    const now = options.now;
    let checkpoint = await database.table("meta").get(DOMAIN_KEYS.media);
    if (
      checkpoint?.status === idb.MigrationStateMachine.STATUS.ACTIVE
    ) {
      const savedReport = await database.table("meta").get(
        NUTRITION_MEDIA_REPORT_KEY
      );
      return {
        backupId: checkpoint.backupId,
        report: savedReport?.report || null,
        checkpoint
      };
    }

    let currentCapture;
    let currentPreparation;
    try {
      currentCapture = await prepareCompleteBackup({
        ...options,
        backupScope: "nutrition-media"
      });
      currentPreparation = await prepareNutritionMediaSource(
        currentCapture,
        options
      );
    } catch (error) {
      checkpoint = checkpoint ||
        initialCheckpoint("media", now());
      const recoveryCodes = new Set([
        "COMPLETE_BACKUP_MEDIA_READ_FAILED",
        "MEDIA_BLOB_REQUIRED",
        "MEDIA_ID_REQUIRED"
      ]);
      const status = recoveryCodes.has(error.code)
        ? idb.MigrationStateMachine.STATUS.RECOVERY_REQUIRED
        : idb.MigrationStateMachine.STATUS.FAILED;
      checkpoint = await transition(
        database,
        checkpoint,
        status,
        {
          errorCode: error.code || "MEDIA_COMPLETE_BACKUP_FAILED",
          errorMessage: error.message,
          errors: [error.code || "MEDIA_COMPLETE_BACKUP_FAILED"],
          allowsEmptyActivation: false
        },
        now
      );
      const report = {
        reportVersion: 1,
        migrationId: MIGRATION_ID,
        backupId: null,
        status: checkpoint.status,
        createdAt: now(),
        domain: {
          domain: "media",
          status: checkpoint.status,
          sourceDatabase: "mentor_nutrition_images",
          sourceStore: "foodImages",
          errorCode: checkpoint.errorCode,
          errors: checkpoint.errors,
          allowsEmptyActivation: false
        }
      };
      await database.table("meta").bulkPut([{
        key: NUTRITION_MEDIA_REPORT_KEY,
        report,
        updatedAt: now()
      }, {
        key: NUTRITION_MEDIA_GROUP_KEY,
        migrationId: MIGRATION_ID,
        group: "nutrition-media",
        status: checkpoint.status,
        backupId: null,
        active: false,
        errorCode: checkpoint.errorCode,
        updatedAt: now()
      }]);
      return { backupId: null, report, checkpoint };
    }

    const previousGroup = await database.table("meta").get(
      NUTRITION_MEDIA_GROUP_KEY
    );
    const savedBackup = await loadNutritionMediaBackup(
      database,
      previousGroup
    );
    let backup;
    let preparation;
    if (
      savedBackup &&
      savedBackup.sourceFingerprint === currentCapture.sourceFingerprint
    ) {
      backup = savedBackup;
      preparation = savedBackup.domain;
    } else {
      await saveNutritionMediaBackup(
        database,
        currentCapture,
        currentPreparation,
        previousGroup,
        now
      );
      const sourceRecord = currentCapture.rawRecords.find(
        (record) => record.key ===
          currentPreparation.sourceBackupRecordKey
      );
      backup = {
        backupId: currentCapture.backupId,
        capturedAt: currentCapture.capturedAt,
        sourceFingerprint: currentCapture.sourceFingerprint,
        domain: clone(currentPreparation),
        sourceRecords: clone(sourceRecord?.records || []),
        manifest: clone(currentCapture.manifest)
      };
      preparation = currentPreparation;
    }
    checkpoint = await database.table("meta").get(DOMAIN_KEYS.media) ||
      initialCheckpoint("media", now());

    if (!preparation.valid) {
      checkpoint = await markDomainRecovery(
        database,
        "media",
        checkpoint,
        {
          ...preparation,
          recoveryCode: "MEDIA_SOURCE_RECOVERY_REQUIRED"
        },
        backup.backupId,
        now
      );
      await saveMediaProgress(
        database,
        checkpoint,
        backup,
        preparation,
        {},
        now
      );
      const report = await saveMediaMigrationReport(
        database,
        backup,
        preparation,
        checkpoint,
        now
      );
      return { backupId: backup.backupId, report, checkpoint };
    }

    try {
      if (checkpoint.status === idb.MigrationStateMachine.STATUS.FAILED) {
        const resumeStatus = checkpoint.lastSuccessfulCheckpoint ===
          idb.MigrationStateMachine.STATUS.IMPORTED
          ? idb.MigrationStateMachine.STATUS.VERIFICATION_IN_PROGRESS
          : checkpoint.lastSuccessfulCheckpoint ===
              idb.MigrationStateMachine.STATUS.BACKED_UP
            ? idb.MigrationStateMachine.STATUS.IMPORT_IN_PROGRESS
            : idb.MigrationStateMachine.STATUS.BACKUP_IN_PROGRESS;
        checkpoint = await transition(
          database,
          checkpoint,
          resumeStatus,
          { resumedAt: now() },
          now
        );
      }
      if (
        checkpoint.status ===
        idb.MigrationStateMachine.STATUS.NOT_STARTED
      ) {
        checkpoint = await transition(
          database,
          checkpoint,
          idb.MigrationStateMachine.STATUS.BACKUP_IN_PROGRESS,
          { backupId: backup.backupId },
          now
        );
      }
      if (
        checkpoint.status ===
        idb.MigrationStateMachine.STATUS.BACKUP_IN_PROGRESS
      ) {
        checkpoint = await transition(
          database,
          checkpoint,
          idb.MigrationStateMachine.STATUS.BACKED_UP,
          {
            backupId: backup.backupId,
            sourceRecordCount: preparation.sourceRecordCount,
            sourceManifestChecksum:
              preparation.sourceManifestChecksum
          },
          now
        );
      }
      if (
        checkpoint.status ===
        idb.MigrationStateMachine.STATUS.BACKED_UP
      ) {
        checkpoint = await transition(
          database,
          checkpoint,
          idb.MigrationStateMachine.STATUS.IMPORT_IN_PROGRESS,
          {
            importStartedAt: now(),
            batchSize: preparation.batchSize
          },
          now
        );
      }

      if (
        checkpoint.status ===
        idb.MigrationStateMachine.STATUS.IMPORT_IN_PROGRESS
      ) {
        const sourceRecordsById = new Map(
          (backup.sourceRecords || []).map(
            (record) => [String(record?.id || ""), record]
          )
        );
        let completedBatchCount =
          Number(checkpoint.completedBatchCount || 0);
        for (
          let index = 0;
          index < preparation.records.length;
          index += 1
        ) {
          const manifest = preparation.records[index];
          const sourceRecord = sourceRecordsById.get(manifest.id);
          const sourceParity = await verifyMediaRecordParity(
            sourceRecord,
            manifest,
            options
          );
          if (!sourceParity.valid) {
            const error = new Error(
              `Saved media source parity failed for ${manifest.id}.`
            );
            error.code = "MEDIA_BACKUP_SOURCE_PARITY_FAILED";
            error.recoveryRequired = true;
            throw error;
          }

          const recordKey = mediaRecordCheckpointKey(manifest.id);
          const recordCheckpoint = await database.table("meta").get(
            recordKey
          );
          const currentTarget = await database.table("media").get(
            manifest.primaryKey
          );
          const currentParity = await verifyMediaRecordParity(
            currentTarget,
            manifest,
            options
          );
          const alreadyVerified = recordCheckpoint?.status === "verified" &&
            recordCheckpoint.sourceFingerprint ===
              backup.sourceFingerprint &&
            currentParity.valid;

          if (!alreadyVerified && !currentParity.valid) {
            await idb.TransactionHelper.run(
              database,
              "rw",
              ["media", "meta"],
              async ({ table }) => {
                await table("media").put(clone(sourceRecord));
                await table("meta").put({
                  key: recordKey,
                  migrationId: MIGRATION_ID,
                  domain: "media",
                  id: manifest.id,
                  sourceFingerprint: backup.sourceFingerprint,
                  backupId: backup.backupId,
                  status: "imported",
                  metadataChecksum: manifest.metadataChecksum,
                  blob: clone(manifest.blob),
                  thumbnail: clone(manifest.thumbnail),
                  updatedAt: now()
                });
              }
            );
          }

          const target = await database.table("media").get(
            manifest.primaryKey
          );
          const parity = await verifyMediaRecordParity(
            target,
            manifest,
            options
          );
          if (!parity.valid) {
            const error = new Error(
              `Target media parity failed for ${manifest.id}.`
            );
            error.code = "MEDIA_TARGET_RECORD_PARITY_FAILED";
            throw error;
          }
          await database.table("meta").put({
            key: recordKey,
            migrationId: MIGRATION_ID,
            domain: "media",
            id: manifest.id,
            sourceFingerprint: backup.sourceFingerprint,
            backupId: backup.backupId,
            status: "verified",
            parity: {
              metadataChecksum: parity.actualManifest.metadataChecksum,
              blob: clone(parity.actualManifest.blob),
              thumbnail: clone(parity.actualManifest.thumbnail)
            },
            verifiedAt: now(),
            updatedAt: now()
          });

          const endOfBatch =
            (index + 1) % preparation.batchSize === 0 ||
            index === preparation.records.length - 1;
          if (endOfBatch) {
            completedBatchCount = Math.ceil(
              (index + 1) / preparation.batchSize
            );
            const verifiedRecordCount = (
              await database.table("meta").toArray()
            ).filter((record) =>
              String(record?.key || "").startsWith(
                `${DOMAIN_KEYS.media}:record:`
              ) &&
              record.status === "verified" &&
              record.sourceFingerprint === backup.sourceFingerprint
            ).length;
            checkpoint = await saveMediaProgress(
              database,
              checkpoint,
              backup,
              preparation,
              {
                processedRecordCount: index + 1,
                verifiedRecordCount,
                completedBatchCount,
                lastProcessedId: manifest.id,
                lastCompletedBatchIndex: completedBatchCount - 1
              },
              now
            );
          }
          await options.onPhase?.({
            phase: "media-record-verified",
            domain: "media",
            recordId: manifest.id,
            index
          });
        }
        checkpoint = await transition(
          database,
          checkpoint,
          idb.MigrationStateMachine.STATUS.IMPORTED,
          {
            sourceRecordCount: preparation.sourceRecordCount,
            importedRecordCount: preparation.sourceRecordCount,
            sourceIds: preparation.sourceIds,
            sourceChecksum: preparation.sourceManifestChecksum,
            importCompletedAt: now()
          },
          now
        );
      }

      if (
        checkpoint.status === idb.MigrationStateMachine.STATUS.IMPORTED
      ) {
        checkpoint = await transition(
          database,
          checkpoint,
          idb.MigrationStateMachine.STATUS.VERIFICATION_IN_PROGRESS,
          { verificationStartedAt: now() },
          now
        );
      }
      if (
        checkpoint.status ===
        idb.MigrationStateMachine.STATUS.VERIFICATION_IN_PROGRESS
      ) {
        const verification = await verifyCompleteMediaStore(
          database,
          preparation,
          options
        );
        if (!verification.valid) {
          const error = new Error(
            "Complete Nutrition media read-back parity failed."
          );
          error.code = "MEDIA_COMPLETE_PARITY_FAILED";
          error.verification = verification;
          throw error;
        }
        checkpoint = await transition(
          database,
          checkpoint,
          idb.MigrationStateMachine.STATUS.VERIFIED,
          {
            verification,
            verifiedAt: verification.verifiedAt
          },
          now
        );
      }
      if (
        checkpoint.status === idb.MigrationStateMachine.STATUS.VERIFIED
      ) {
        await activateDomains(database, ["media"], now);
        checkpoint = await database.table("meta").get(DOMAIN_KEYS.media);
      }
    } catch (error) {
      checkpoint = await database.table("meta").get(DOMAIN_KEYS.media) ||
        checkpoint;
      const nextStatus = error.recoveryRequired
        ? idb.MigrationStateMachine.STATUS.RECOVERY_REQUIRED
        : idb.MigrationStateMachine.STATUS.FAILED;
      if (checkpoint.status !== nextStatus) {
        checkpoint = await transition(
          database,
          checkpoint,
          nextStatus,
          {
            backupId: backup.backupId,
            errorCode: error.code || error.name ||
              "MEDIA_MIGRATION_FAILED",
            errorMessage: error.message,
            errors: [
              error.code || error.name || "MEDIA_MIGRATION_FAILED"
            ],
            verification: clone(error.verification || null),
            retryable: !error.recoveryRequired,
            allowsEmptyActivation: false
          },
          now
        );
      }
    }

    checkpoint = await saveMediaProgress(
      database,
      checkpoint,
      backup,
      preparation,
      {},
      now
    );
    const report = await saveMediaMigrationReport(
      database,
      backup,
      preparation,
      checkpoint,
      now
    );
    return { backupId: backup.backupId, report, checkpoint };
  }

  async function migrateUnlocked(options) {
    requireDependencies();
    if (!options?.database || !options?.storage) {
      throw new TypeError("database and readable localStorage are required.");
    }
    const database = options.database;
    const checksumService = options.checksumService || phase0.BackupChecksumService;
    const now = options.now || (() => new Date().toISOString());
    const runtime = {
      ...options,
      checksumService,
      cryptoApi: options.cryptoApi || root.crypto,
      fflate: options.fflate || root.fflate,
      now
    };
    await database.open();

    let globalRecord = await database.table("meta").get(GLOBAL_KEY);
    let backup = await loadSavedBackup(database, globalRecord);
    if (!backup) {
      await database.table("meta").put({
        key: GLOBAL_KEY,
        migrationId: MIGRATION_ID,
        status: "backup_in_progress",
        updatedAt: now()
      });
      try {
        backup = await prepareCompleteBackup(runtime);
        await saveBackup(database, backup, now);
      } catch (error) {
        await database.table("meta").put({
          key: GLOBAL_KEY,
          migrationId: MIGRATION_ID,
          status: "failed",
          errorCode: error.code || "COMPLETE_BACKUP_FAILED",
          errorMessage: error.message,
          updatedAt: now()
        });
        if (
          error.code === "COMPLETE_BACKUP_MEDIA_READ_FAILED" ||
          error.code === "MEDIA_BLOB_REQUIRED" ||
          error.code === "MEDIA_ID_REQUIRED"
        ) {
          let mediaCheckpoint =
            await database.table("meta").get(DOMAIN_KEYS.media) ||
            initialCheckpoint("media", now());
          mediaCheckpoint = await transition(
            database,
            mediaCheckpoint,
            idb.MigrationStateMachine.STATUS.RECOVERY_REQUIRED,
            {
              errorCode: error.code,
              errorMessage: error.message,
              errors: [error.code],
              allowsEmptyActivation: false
            },
            now
          );
          await database.table("meta").bulkPut([{
            key: NUTRITION_MEDIA_REPORT_KEY,
            report: {
              reportVersion: 1,
              migrationId: MIGRATION_ID,
              backupId: null,
              status: mediaCheckpoint.status,
              createdAt: now(),
              domain: {
                domain: "media",
                status: mediaCheckpoint.status,
                errorCode: error.code,
                errors: [error.code],
                allowsEmptyActivation: false
              }
            },
            updatedAt: now()
          }, {
            key: NUTRITION_MEDIA_GROUP_KEY,
            migrationId: MIGRATION_ID,
            group: "nutrition-media",
            status: mediaCheckpoint.status,
            backupId: null,
            active: false,
            errorCode: error.code,
            updatedAt: now()
          }]);
        }
        throw error;
      }
    }

    const checkpoints = {};
    for (const domain of ["settings", "goals", "calendar"]) {
      checkpoints[domain] = await migrateDomain(
        database,
        domain,
        backup.domains[domain],
        backup.backupId,
        runtime
      );
    }

    if (checkpoints.settings.status === idb.MigrationStateMachine.STATUS.VERIFIED) {
      await activateDomains(database, ["settings"], now);
      checkpoints.settings = await database.table("meta").get(DOMAIN_KEYS.settings);
    }
    if (
      checkpoints.goals.status === idb.MigrationStateMachine.STATUS.VERIFIED &&
      checkpoints.calendar.status === idb.MigrationStateMachine.STATUS.VERIFIED
    ) {
      await activateDomains(database, ["goals", "calendar"], now);
      checkpoints.goals = await database.table("meta").get(DOMAIN_KEYS.goals);
      checkpoints.calendar = await database.table("meta").get(DOMAIN_KEYS.calendar);
    }

    const report = await saveReport(
      database,
      backup.backupId,
      checkpoints,
      backup.domains,
      now,
      CORE_DOMAINS,
      REPORT_KEY
    );
    await database.table("meta").put({
      key: GLOBAL_KEY,
      migrationId: MIGRATION_ID,
      status: report.status,
      backupId: backup.backupId,
      capturedAt: backup.capturedAt,
      domains: clone(backup.domains),
      updatedAt: now()
    });
    const ideasComparisons = await migrateIdeasComparisons(runtime);
    const financeAssets = await migrateFinanceAssets(runtime);
    const nutritionEnvelopes = await migrateNutritionEnvelopes(runtime);
    const nutritionMedia = await migrateNutritionMedia(runtime);
    return {
      backupId: backup.backupId,
      report,
      checkpoints,
      ideasComparisons,
      financeAssets,
      nutritionEnvelopes,
      nutritionMedia
    };
  }

  async function migrate(options) {
    const coordination = idb.CrossTabCoordinationService;
    if (!coordination) {
      const error = new Error(
        "IndexedDB migration requires cross-tab coordination."
      );
      error.code = "CROSS_TAB_COORDINATION_UNAVAILABLE";
      throw error;
    }
    return coordination.withExclusive(
      "legacy-capture-migration-cutover",
      async () => {
        await options.database.open();
        const activeDomains = [
          "settings",
          "goals",
          "calendar",
          "ideas",
          "comparisons",
          "finance",
          "assets",
          "nutritionFoodData",
          "nutritionInventoryData",
          "media"
        ];
        const globalCutover = await options.database.table("meta").get(
          CUTOVER_KEYS.global
        );
        const alreadyActive = globalCutover &&
          (await Promise.all(activeDomains.map(async (domain) => {
            const marker = await options.database.table("meta").get(
              CUTOVER_KEYS[domain]
            );
            const checkpoint = await options.database.table("meta").get(
              DOMAIN_KEYS[domain]
            );
            return globalCutover.domains?.[domain] === "indexeddb" &&
              marker?.status === "active" &&
              marker?.adapter === "indexeddb" &&
              checkpoint?.status === "active";
          }))).every(Boolean);
        if (alreadyActive) {
          let epochRecord = await options.database.table("meta").get(
            coordination.EPOCH_KEY
          );
          if (!epochRecord) {
            epochRecord = await idb.TransactionHelper.run(
              options.database,
              "rw",
              ["meta"],
              ({ table }) => coordination.incrementEpoch(
                table("meta"),
                "epoch-baseline",
                options.now
              )
            );
            coordination.announceEpoch(epochRecord, {
              source: "migration-baseline",
              requireReload: false
            });
          }
          return {
            status: "already-active",
            backupId: (
              await options.database.table("meta").get(GLOBAL_KEY)
            )?.backupId || null,
            dataEpoch: epochRecord.revision
          };
        }
        const recoveryDomains = [];
        for (const domain of Object.keys(DOMAIN_KEYS)) {
          const checkpoint = await options.database.table("meta").get(
            DOMAIN_KEYS[domain]
          );
          if (
            checkpoint?.status ===
              idb.MigrationStateMachine.STATUS.RECOVERY_REQUIRED
          ) {
            recoveryDomains.push(domain);
          }
        }
        if (recoveryDomains.length) {
          let epochRecord = await options.database.table("meta").get(
            coordination.EPOCH_KEY
          );
          if (!epochRecord) {
            epochRecord = await idb.TransactionHelper.run(
              options.database,
              "rw",
              ["meta"],
              ({ table }) => coordination.incrementEpoch(
                table("meta"),
                "epoch-baseline",
                options.now
              )
            );
            coordination.announceEpoch(epochRecord, {
              source: "migration-baseline",
              requireReload: false
            });
          }
          return {
            status: "recovery-required",
            recoveryRequired: true,
            recoveryDomains,
            dataEpoch: epochRecord.revision
          };
        }
        const result = await migrateUnlocked(options);
        const epoch = await idb.TransactionHelper.run(
          options.database,
          "rw",
          ["meta"],
          ({ table }) => coordination.incrementEpoch(
            table("meta"),
            "migration-cutover",
            options.now
          )
        );
        coordination.announceEpoch(epoch, {
          source: "migration",
          requireReload: false
        });
        return { ...result, dataEpoch: epoch.revision };
      }
    );
  }

  async function validateRecoveryCandidate(options) {
    const target = options?.target;
    const allowed = [
      "settings",
      "goals-calendar",
      "ideas-comparisons",
      "finance-assets",
      "nutrition-envelopes",
      "nutrition-media"
    ];
    if (!allowed.includes(target)) {
      const error = new Error("Unsupported recovery retry target.");
      error.code = "RECOVERY_RETRY_TARGET_INVALID";
      throw error;
    }
    const runtime = {
      ...options,
      checksumService:
        options.checksumService || phase0.BackupChecksumService,
      cryptoApi: options.cryptoApi || root.crypto,
      fflate: options.fflate || root.fflate,
      now: options.now || (() => new Date().toISOString())
    };
    const backup = await prepareCompleteBackup(runtime);
    let preparations;
    if (target === "settings") {
      preparations = { settings: backup.domains.settings };
    } else if (target === "goals-calendar") {
      preparations = {
        goals: backup.domains.goals,
        calendar: backup.domains.calendar
      };
    } else if (target === "ideas-comparisons") {
      preparations = prepareIdeasComparisonsDomains(backup);
    } else if (target === "finance-assets") {
      preparations = prepareFinanceAssetsDomains(backup);
    } else if (target === "nutrition-envelopes") {
      preparations = await prepareNutritionEnvelopeDomains(
        backup,
        runtime
      );
    } else {
      preparations = {
        media: await prepareNutritionMediaSource(backup, runtime)
      };
    }
    const requiredDomains = {
      settings: ["settings"],
      "goals-calendar": ["goals", "calendar"],
      "ideas-comparisons": ["ideas", "comparisons"],
      "finance-assets": ["finance", "assets"],
      "nutrition-envelopes": [
        "nutritionFoodData",
        "nutritionInventoryData"
      ],
      "nutrition-media": ["media"]
    }[target];
    const invalid = requiredDomains.filter(
      (domain) => preparations[domain]?.valid !== true
    );
    if (invalid.length) {
      const error = new Error(
        "The repaired legacy source did not pass domain validation."
      );
      error.code = "RECOVERY_REPAIRED_SOURCE_INVALID";
      error.details = {
        target,
        invalidDomains: invalid,
        preparations: clone(preparations)
      };
      throw error;
    }
    return { target, backup, preparations, requiredDomains, runtime };
  }

  async function rerunRecoveryTarget(validation) {
    const { target, backup, preparations, runtime } = validation;
    const recoveryRuntime = {
      ...runtime,
      forceRecoveryRetry: true,
      recoveryCapture: backup,
      recoveryPreparations: preparations
    };
    if (target === "ideas-comparisons") {
      return migrateIdeasComparisons(recoveryRuntime);
    }
    if (target === "finance-assets") {
      return migrateFinanceAssets(recoveryRuntime);
    }
    if (target === "nutrition-envelopes") {
      return migrateNutritionEnvelopes(recoveryRuntime);
    }
    if (target === "nutrition-media") {
      return migrateNutritionMedia(runtime);
    }

    await saveBackup(runtime.database, backup, runtime.now);
    const domains = target === "goals-calendar"
      ? ["goals", "calendar"]
      : ["settings"];
    const checkpoints = {};
    for (const domain of domains) {
      checkpoints[domain] = await migrateDomain(
        runtime.database,
        domain,
        preparations[domain],
        backup.backupId,
        runtime
      );
    }
    if (
      domains.every((domain) =>
        checkpoints[domain].status ===
          idb.MigrationStateMachine.STATUS.VERIFIED
      )
    ) {
      await activateDomains(runtime.database, domains, runtime.now);
      for (const domain of domains) {
        checkpoints[domain] = await runtime.database.table("meta").get(
          DOMAIN_KEYS[domain]
        );
      }
    }
    await runtime.database.table("legacyBackups").put({
      key: `${backup.backupId}:recovery-retry-report:${target}`,
      backupId: backup.backupId,
      sourceType: "recoveryRetryReport",
      report: {
        reportVersion: 1,
        target,
        status: domains.every(
          (domain) => checkpoints[domain].status ===
            idb.MigrationStateMachine.STATUS.ACTIVE
        ) ? "active" : "recoveryRequired",
        domains: domains.map((domain) => ({
          domain,
          status: checkpoints[domain].status,
          sourceKeys: preparations[domain].sourceKeys,
          errors: preparations[domain].errors || [],
          dependencyBlocked: Boolean(
            preparations[domain].dependencyBlocked
          )
        }))
      },
      capturedAt: runtime.now()
    });
    return { backupId: backup.backupId, checkpoints };
  }

  idb.LegacyToIndexedDbService = Object.freeze({
    migrate,
    migrateUnlocked,
    migrateIdeasComparisons,
    migrateFinanceAssets,
    migrateNutritionEnvelopes,
    migrateNutritionMedia,
    validateRecoveryCandidate,
    rerunRecoveryTarget,
    prepareCompleteBackup,
    prepareSettings,
    prepareGoals,
    prepareCalendar,
    constants: Object.freeze({
      MIGRATION_ID,
      GLOBAL_KEY,
      REPORT_KEY,
      IDEAS_COMPARISONS_GROUP_KEY,
      IDEAS_COMPARISONS_REPORT_KEY,
      FINANCE_ASSETS_GROUP_KEY,
      FINANCE_ASSETS_REPORT_KEY,
      NUTRITION_ENVELOPES_GROUP_KEY,
      NUTRITION_ENVELOPES_REPORT_KEY,
      NUTRITION_MEDIA_GROUP_KEY,
      NUTRITION_MEDIA_REPORT_KEY,
      DOMAIN_KEYS,
      CUTOVER_KEYS,
      DOMAIN_STORES,
      CORE_DOMAINS,
      IDEAS_COMPARISONS_DOMAINS,
      FINANCE_ASSETS_DOMAINS,
      NUTRITION_ENVELOPE_DOMAINS
    })
  });
})(typeof window !== "undefined" ? window : globalThis);
