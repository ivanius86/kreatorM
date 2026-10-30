(function (root) {
  "use strict";

  const namespace = root.MentorDataPhase0 = root.MentorDataPhase0 || {};

  const EMPTY_FOOD = Object.freeze({
    version: 1,
    updatedAt: null,
    userFoods: [],
    userFoodNutrients: [],
    userFoodPortions: [],
    userSources: []
  });
  const EMPTY_INVENTORY = Object.freeze({
    version: 1,
    updatedAt: null,
    batches: [],
    locations: [],
    allocations: [],
    preferences: [],
    stores: [],
    recipes: [],
    mealPlanEntries: [],
    shoppingItems: [],
    migrations: []
  });

  function clone(value) {
    if (value === undefined) return undefined;
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function validDate(value) {
    if (!value) return null;
    const time = Date.parse(value);
    return Number.isFinite(time) ? time : null;
  }

  function firstTimestamp(record, fields) {
    for (const field of fields) {
      const value = validDate(record?.[field]);
      if (value !== null) return value;
    }
    return null;
  }

  async function recordChecksum(record, checksumService, cryptoApi) {
    return (await checksumService.sha256(checksumService.stableStringify(record), cryptoApi)).hex;
  }

  function entryMap(snapshot, validators) {
    return new Map((snapshot?.entries || []).map((entry) => {
      const validation = entry.readStatus === "ok"
        ? validators.validateSource(entry.source, entry.raw)
        : { status: "invalid", parseStatus: "notAttempted", validationStatus: "invalid", errors: [entry.errorCode || "READ_FAILED"], value: null };
      return [entry.key, { ...entry, validation }];
    }));
  }

  function validValue(entries, key) {
    const entry = entries.get(key);
    return entry?.validation?.status === "valid" ? clone(entry.validation.value) : null;
  }

  function sourcePresent(entries, keys) {
    return keys.some((key) => entries.get(key)?.present === true);
  }

  function domainRecovery(entries, domain, keys) {
    if (!sourcePresent(entries, keys)) return null;
    const valid = keys.some((key) => entries.get(key)?.validation?.status === "valid");
    if (valid) return null;
    return {
      domain,
      status: "recoveryRequired",
      allowsEmptyActivation: false,
      sourceKeys: keys.filter((key) => entries.get(key)?.present === true),
      errors: keys.flatMap((key) => {
        const entry = entries.get(key);
        return entry?.present === true
          ? (entry.validation?.errors || [entry.errorCode || "INVALID_SOURCE"]).map((code) => ({ key, code }))
          : [];
      })
    };
  }

  function candidateRecovery(domain, candidates) {
    const present = candidates.filter((candidate) => candidate.present);
    if (!present.length || present.some((candidate) => candidate.valid)) return null;
    return {
      domain,
      status: "recoveryRequired",
      allowsEmptyActivation: false,
      sourceKeys: present.map((candidate) => candidate.key),
      errors: present.flatMap((candidate) => (candidate.errors || ["INVALID_SOURCE"]).map((code) => ({
        key: candidate.key,
        code
      })))
    };
  }

  async function mergeById(input) {
    const primary = Array.isArray(input.primary) ? input.primary : [];
    const secondary = Array.isArray(input.secondary) ? input.secondary : [];
    if (!primary.length) return { records: clone(secondary), conflicts: [] };
    if (!secondary.length) return { records: clone(primary), conflicts: [] };

    const result = clone(primary);
    const indexById = new Map();
    result.forEach((record, index) => {
      if (record?.id !== undefined && record?.id !== null && record.id !== "") indexById.set(String(record.id), index);
    });
    const conflicts = [];

    for (const candidate of secondary) {
      if (candidate?.id === undefined || candidate?.id === null || candidate.id === "") {
        if (!result.some((record) => input.checksumService.stableStringify(record) === input.checksumService.stableStringify(candidate))) {
          conflicts.push({
            id: null,
            sourceKeys: [input.primarySource, input.secondarySource],
            selectedSource: input.primarySource,
            rule: "primary-for-idless-conflict",
            candidateChecksums: {
              primaryAggregate: await recordChecksum(primary, input.checksumService, input.cryptoApi),
              secondaryRecord: await recordChecksum(candidate, input.checksumService, input.cryptoApi)
            }
          });
        }
        continue;
      }
      const id = String(candidate.id);
      if (!indexById.has(id)) {
        indexById.set(id, result.length);
        result.push(clone(candidate));
        continue;
      }
      const currentIndex = indexById.get(id);
      const current = result[currentIndex];
      const currentChecksum = await recordChecksum(current, input.checksumService, input.cryptoApi);
      const candidateChecksum = await recordChecksum(candidate, input.checksumService, input.cryptoApi);
      if (currentChecksum === candidateChecksum) continue;

      const currentTime = firstTimestamp(current, input.timestampFields || ["updatedAt"]);
      const candidateTime = firstTimestamp(candidate, input.timestampFields || ["updatedAt"]);
      let selectedSource = input.primarySource;
      let rule = "primary-without-comparable-timestamps";
      if (currentTime !== null && candidateTime !== null && candidateTime > currentTime) {
        result[currentIndex] = clone(candidate);
        selectedSource = input.secondarySource;
        rule = "newer-record-timestamp";
      } else if (currentTime !== null && candidateTime !== null) {
        rule = "newer-or-equal-primary-record-timestamp";
      }
      conflicts.push({
        id,
        sourceKeys: [input.primarySource, input.secondarySource],
        selectedSource,
        rule,
        candidateChecksums: {
          [input.primarySource]: currentChecksum,
          [input.secondarySource]: candidateChecksum
        }
      });
    }
    return { records: result, conflicts };
  }

  async function chooseAggregate(input) {
    if (input.primary === null || input.primary === undefined) return { value: clone(input.secondary), conflicts: [] };
    if (input.secondary === null || input.secondary === undefined) return { value: clone(input.primary), conflicts: [] };
    const primaryChecksum = await recordChecksum(input.primary, input.checksumService, input.cryptoApi);
    const secondaryChecksum = await recordChecksum(input.secondary, input.checksumService, input.cryptoApi);
    if (primaryChecksum === secondaryChecksum) return { value: clone(input.primary), conflicts: [] };
    const primaryTime = firstTimestamp(input.primary, input.timestampFields || []);
    const secondaryTime = firstTimestamp(input.secondary, input.timestampFields || []);
    const secondaryWins = primaryTime !== null && secondaryTime !== null && secondaryTime > primaryTime;
    return {
      value: clone(secondaryWins ? input.secondary : input.primary),
      conflicts: [{
        id: input.id || null,
        sourceKeys: [input.primarySource, input.secondarySource],
        selectedSource: secondaryWins ? input.secondarySource : input.primarySource,
        rule: secondaryWins ? "newer-aggregate-timestamp" : "primary-without-newer-secondary-timestamp",
        candidateChecksums: {
          [input.primarySource]: primaryChecksum,
          [input.secondarySource]: secondaryChecksum
        }
      }]
    };
  }

  function centralFinance(database) {
    return (Array.isArray(database?.finances) ? database.finances : [])
      .find((item) =>
        item?.id === "finance-state" ||
        item?.type === "financeState"
      ) || null;
  }

  function validFinanceState(value) {
    return Boolean(
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      [
        "transactions",
        "budgets",
        "cashflowIncomes",
        "cashflowExpenses",
        "cashflowDebts",
        "importedTransactionFiles"
      ].every((key) => Array.isArray(value[key])) &&
      (
        value.categoryRules === undefined ||
        value.categoryRules &&
          typeof value.categoryRules === "object" &&
          !Array.isArray(value.categoryRules)
      )
    );
  }

  function centralTemplates(database) {
    return (Array.isArray(database?.finances) ? database.finances : [])
      .find((item) =>
        item?.id === "transaction-import-templates" ||
        item?.type === "importTemplates"
      )?.templates ?? null;
  }

  function legacyAssets(value) {
    if (!value) return [];
    return [
      ...(value.assets || []).map((item) => ({ ...item, recordType: "asset" })),
      ...(value.debts || []).map((item) => ({ ...item, recordType: "debt" }))
    ];
  }

  function comparisonRecords(records, type) {
    return (records || []).filter((item) => item?.recordType === type).map(({ recordType, ...item }) => item);
  }

  function centralCache(records) {
    const cacheRecords = (records || []).filter((item) => item?.recordType === "researchCache");
    if (!cacheRecords.length) return null;
    return cacheRecords.reduce((result, item) => {
      if (item?.id) result[item.id] = clone(item.value);
      return result;
    }, {});
  }

  function deterministicLegacyId(value) {
    let hash = 2166136261;
    const text = String(value);
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `legacy_inventory_${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function legacyInventoryRows(value) {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.items)) return value.items;
    if (Array.isArray(value?.stock)) return value.stock;
    return [];
  }

  function mergeLegacyInventory(envelope, legacySources, capturedAt, resolveFoodId) {
    const result = clone(envelope);
    if (result.migrations.some((item) => item?.id === "legacy-fridge-v1")) return result;
    const existingLegacyIds = new Set(result.batches.map((item) => item?.legacyId).filter(Boolean));
    let importedCount = 0;
    legacySources.forEach(({ key, value }) => {
      legacyInventoryRows(value).forEach((item, index) => {
        const legacyId = `${key}:${item?.id ?? item?.stockId ?? `index-${index}`}`;
        if (!item || existingLegacyIds.has(legacyId)) return;
        const resolvedFoodId = resolveFoodId?.(item.foodId || item.food_id || item.id, item.name || item.foodName) || null;
        const quantity = Number(item.quantity ?? item.amount);
        result.batches.push({
          id: deterministicLegacyId(legacyId),
          foodId: resolvedFoodId,
          legacyFoodName: resolvedFoodId ? null : String(item.name || item.foodName || "").trim() || null,
          needsFoodLink: !resolvedFoodId,
          locationId: item.locationId || null,
          quantity: Number.isFinite(quantity) && quantity >= 0 ? quantity : 0,
          initialQuantity: Number.isFinite(quantity) && quantity >= 0 ? quantity : 0,
          unit: item.unit || "kom",
          addedAt: item.addedAt || capturedAt,
          expiryDate: item.expiryDate || null,
          note: item.note || null,
          status: item.status || "available",
          createdAt: item.createdAt || capturedAt,
          updatedAt: capturedAt,
          legacyId
        });
        existingLegacyIds.add(legacyId);
        importedCount += 1;
      });
    });
    if (legacySources.length) {
      result.migrations.push({ id: "legacy-fridge-v1", version: 1, appliedAt: capturedAt, importedCount });
      result.updatedAt = capturedAt;
    }
    return result;
  }

  function mergeLegacyPlanFavorites(envelope, ids, capturedAt) {
    const result = clone(envelope);
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string" || !id) ||
        result.migrations?.some((item) => item?.id === "legacy-plan-favorites-v1")) return result;
    const before = result.recipeFavoriteIds?.length || 0;
    result.recipeFavoriteIds = [...new Set([...(result.recipeFavoriteIds || []), ...ids])];
    result.migrations.push({ id: "legacy-plan-favorites-v1", version: 1, appliedAt: capturedAt, importedCount: result.recipeFavoriteIds.length - before });
    result.updatedAt = capturedAt;
    return result;
  }

  async function normalize(snapshot, options) {
    const validators = options?.validators || namespace.LegacyPayloadValidators;
    const checksumService = options?.checksumService || namespace.BackupChecksumService;
    const cryptoApi = options?.cryptoApi;
    const entries = entryMap(snapshot, validators);
    const databaseEntry = entries.get("mentor_database");
    let database = validValue(entries, "mentor_database");
    let databaseUnreadablePresent = false;
    if (databaseEntry?.present === true && !database) {
      if (databaseEntry.readStatus !== "ok") {
        databaseUnreadablePresent = true;
      } else {
        const parsed = validators.parseJson(String(databaseEntry.raw));
        if (
          parsed.ok &&
          validators.isPlainObject(parsed.value)
        ) {
          // Central subdomains are evaluated independently. A structurally
          // partial central document means omitted domains are missing, not
          // invalid-only candidates.
          database = parsed.value;
        } else {
          databaseUnreadablePresent = true;
        }
      }
    }
    const centralHas = (key) =>
      Boolean(database) &&
      Object.prototype.hasOwnProperty.call(database, key);
    const centralErrors = (fallback) =>
      databaseUnreadablePresent
        ? databaseEntry?.validation?.errors || ["INVALID_SOURCE"]
        : [fallback];
    const conflicts = [];
    const recovery = [];

    const validationEntries = (snapshot?.entries || []).map((entry) => {
      const evaluated = entries.get(entry.key);
      return {
        key: entry.key,
        present: entry.present,
        readStatus: entry.readStatus,
        parseStatus: evaluated.validation.parseStatus,
        validationStatus: evaluated.validation.validationStatus,
        errors: evaluated.validation.errors.slice()
      };
    });

    const directLanguage = validValue(entries, "mentor_language");
    const legacyLanguage = validValue(entries, "mentorPlanner.language");
    const databaseLanguage = ["sr", "en"].includes(database?.settings?.language) ? database.settings.language : null;
    const languageRecovery = candidateRecovery("settings", [
      {
        key: "mentor_language",
        present: entries.get("mentor_language")?.present === true,
        valid: Boolean(directLanguage),
        errors: entries.get("mentor_language")?.validation?.errors
      },
      {
        key: "mentorPlanner.language",
        present: entries.get("mentorPlanner.language")?.present === true,
        valid: Boolean(legacyLanguage),
        errors: entries.get("mentorPlanner.language")?.validation?.errors
      },
      {
        key: "mentor_database.settings.language",
        present: databaseUnreadablePresent ||
          Boolean(database?.settings) &&
            Object.prototype.hasOwnProperty.call(
              database.settings,
              "language"
            ),
        valid: Boolean(databaseLanguage),
        errors: databaseUnreadablePresent
          ? centralErrors("INVALID_SETTINGS")
          : database?.settings?.language && !databaseLanguage ? ["UNSUPPORTED_LANGUAGE"] : []
      }
    ]);
    if (languageRecovery) recovery.push(languageRecovery);
    const language = directLanguage || legacyLanguage || databaseLanguage || null;

    const ideasRecovery = candidateRecovery("ideas", [
      {
        key: "mentor_database.ideas",
        present: databaseUnreadablePresent || centralHas("ideas"),
        valid: Array.isArray(database?.ideas),
        errors: databaseUnreadablePresent
          ? centralErrors("INVALID_ARRAY:ideas")
          : centralHas("ideas") && !Array.isArray(database?.ideas)
            ? ["INVALID_ARRAY:ideas"]
            : []
      },
      {
        key: "mentor_brainstorming_ideas",
        present: entries.get("mentor_brainstorming_ideas")?.present === true,
        valid: entries.get("mentor_brainstorming_ideas")?.validation?.status === "valid",
        errors: entries.get("mentor_brainstorming_ideas")?.validation?.errors
      }
    ]);
    if (ideasRecovery) recovery.push(ideasRecovery);
    const ideasResult = await mergeById({
      primary: Array.isArray(database?.ideas) ? database.ideas : [],
      secondary: validValue(entries, "mentor_brainstorming_ideas") || [],
      primarySource: "mentor_database.ideas",
      secondarySource: "mentor_brainstorming_ideas",
      timestampFields: ["updatedAt"],
      checksumService,
      cryptoApi
    });
    conflicts.push(...ideasResult.conflicts.map((item) => ({ domain: "ideas", ...item })));

    const financeRecovery = candidateRecovery("finance", [
      {
        key: "mentor_database.finances.finance-state",
        present: databaseUnreadablePresent || centralHas("finances"),
        valid: Array.isArray(database?.finances) &&
          (
            !centralFinance(database) ||
            validFinanceState(centralFinance(database))
          ),
        errors: databaseUnreadablePresent
          ? centralErrors("INVALID_FINANCES")
          : centralHas("finances") &&
              !Array.isArray(database?.finances)
            ? ["INVALID_ARRAY:finances"]
            : centralFinance(database) &&
                !validFinanceState(centralFinance(database))
              ? ["INVALID_FINANCE_STATE"]
              : []
      },
      {
        key: "mentorFinanceStateV1",
        present: entries.get("mentorFinanceStateV1")?.present === true,
        valid: entries.get("mentorFinanceStateV1")?.validation?.status === "valid",
        errors: entries.get("mentorFinanceStateV1")?.validation?.errors
      }
    ]);
    if (financeRecovery) recovery.push(financeRecovery);
    const financeResult = await chooseAggregate({
      primary: validFinanceState(centralFinance(database))
        ? centralFinance(database)
        : null,
      secondary: validValue(entries, "mentorFinanceStateV1"),
      primarySource: "mentor_database.finances.finance-state",
      secondarySource: "mentorFinanceStateV1",
      timestampFields: ["savedAt"],
      id: "finance-state",
      checksumService,
      cryptoApi
    });
    conflicts.push(...financeResult.conflicts.map((item) => ({ domain: "finance", ...item })));

    const templateResult = await mergeById({
      primary: centralTemplates(database) || [],
      secondary: validValue(entries, "mentorTransactionImportTemplatesV1") || [],
      primarySource: "mentor_database.finances.transaction-import-templates",
      secondarySource: "mentorTransactionImportTemplatesV1",
      timestampFields: ["updatedAt"],
      checksumService,
      cryptoApi
    });
    conflicts.push(...templateResult.conflicts.map((item) => ({ domain: "financeImportTemplates", ...item })));
    const templatesRecovery = candidateRecovery("financeImportTemplates", [
      {
        key: "mentor_database.finances.transaction-import-templates",
        present: databaseUnreadablePresent || centralHas("finances"),
        valid: Array.isArray(database?.finances) &&
          (
            centralTemplates(database) === null ||
            Array.isArray(centralTemplates(database))
          ),
        errors: databaseUnreadablePresent
          ? centralErrors("INVALID_FINANCES")
          : centralHas("finances") &&
              !Array.isArray(database?.finances)
            ? ["INVALID_ARRAY:finances"]
            : centralTemplates(database) !== null &&
                !Array.isArray(centralTemplates(database))
              ? ["INVALID_IMPORT_TEMPLATES"]
              : []
      },
      {
        key: "mentorTransactionImportTemplatesV1",
        present: entries.get("mentorTransactionImportTemplatesV1")?.present === true,
        valid: entries.get("mentorTransactionImportTemplatesV1")?.validation?.status === "valid",
        errors: entries.get("mentorTransactionImportTemplatesV1")?.validation?.errors
      }
    ]);
    if (templatesRecovery) recovery.push(templatesRecovery);

    const assetsResult = await mergeById({
      primary: Array.isArray(database?.assets) ? database.assets : [],
      secondary: legacyAssets(validValue(entries, "mentorFinanceAssetsV1")),
      primarySource: "mentor_database.assets",
      secondarySource: "mentorFinanceAssetsV1",
      timestampFields: ["updatedAt", "lastUpdatedAt"],
      checksumService,
      cryptoApi
    });
    conflicts.push(...assetsResult.conflicts.map((item) => ({ domain: "assets", ...item })));
    const assetsRecovery = candidateRecovery("assets", [
      {
        key: "mentor_database.assets",
        present: databaseUnreadablePresent || centralHas("assets"),
        valid: Array.isArray(database?.assets),
        errors: databaseUnreadablePresent
          ? centralErrors("INVALID_ARRAY:assets")
          : centralHas("assets") && !Array.isArray(database?.assets)
            ? ["INVALID_ARRAY:assets"]
            : []
      },
      {
        key: "mentorFinanceAssetsV1",
        present: entries.get("mentorFinanceAssetsV1")?.present === true,
        valid: entries.get("mentorFinanceAssetsV1")?.validation?.status === "valid",
        errors: entries.get("mentorFinanceAssetsV1")?.validation?.errors
      }
    ]);
    if (assetsRecovery) recovery.push(assetsRecovery);

    const centralComparisons = Array.isArray(database?.comparisons) ? database.comparisons : [];
    const snapshotsResult = await mergeById({
      primary: comparisonRecords(centralComparisons, "snapshot"),
      secondary: validValue(entries, "mentorFinancialComparisonSnapshotsV1") || [],
      primarySource: "mentor_database.comparisons.snapshot",
      secondarySource: "mentorFinancialComparisonSnapshotsV1",
      timestampFields: ["updatedAt", "createdAt"],
      checksumService,
      cryptoApi
    });
    const optionsResult = await mergeById({
      primary: comparisonRecords(centralComparisons, "option"),
      secondary: validValue(entries, "mentorFinancialComparisonOptionsV1") || [],
      primarySource: "mentor_database.comparisons.option",
      secondarySource: "mentorFinancialComparisonOptionsV1",
      timestampFields: ["updatedAt"],
      checksumService,
      cryptoApi
    });
    conflicts.push(...snapshotsResult.conflicts.map((item) => ({ domain: "comparisonSnapshots", ...item })));
    conflicts.push(...optionsResult.conflicts.map((item) => ({ domain: "comparisonOptions", ...item })));
    const comparisonsRecovery = candidateRecovery("comparisons", [
      {
        key: "mentor_database.comparisons",
        present: databaseUnreadablePresent || centralHas("comparisons"),
        valid: Array.isArray(database?.comparisons),
        errors: databaseUnreadablePresent
          ? centralErrors("INVALID_ARRAY:comparisons")
          : centralHas("comparisons") &&
              !Array.isArray(database?.comparisons)
            ? ["INVALID_ARRAY:comparisons"]
            : []
      },
      {
        key: "mentorFinancialComparisonSnapshotsV1",
        present: entries.get("mentorFinancialComparisonSnapshotsV1")?.present === true,
        valid: entries.get("mentorFinancialComparisonSnapshotsV1")?.validation?.status === "valid",
        errors: entries.get("mentorFinancialComparisonSnapshotsV1")?.validation?.errors
      },
      {
        key: "mentorFinancialComparisonOptionsV1",
        present: entries.get("mentorFinancialComparisonOptionsV1")?.present === true,
        valid: entries.get("mentorFinancialComparisonOptionsV1")?.validation?.status === "valid",
        errors: entries.get("mentorFinancialComparisonOptionsV1")?.validation?.errors
      }
    ]);
    if (comparisonsRecovery) recovery.push(comparisonsRecovery);

    const directCache = validValue(entries, "mentorFinancialComparisonResearchCacheV1");
    const cache = directCache || centralCache(centralComparisons) || {};

    const foodKeys = ["mentor_nutrition_foods_v1", "mentor_nutrition_foods_v1_backup"];
    const foodRecovery = domainRecovery(entries, "nutritionFoodData", foodKeys);
    if (foodRecovery) recovery.push(foodRecovery);
    const foodEnvelope = validValue(entries, foodKeys[0]) || validValue(entries, foodKeys[1]) || (foodRecovery ? null : clone(EMPTY_FOOD));

    const inventoryKeys = [
      "mentor_nutrition_inventory_v1",
      "mentor_nutrition_inventory_v1_backup"
    ];
    const legacyInventoryKeys = [
      "mentor_nutrition_fridge_v1",
      "mentor_nutrition_stock_v1"
    ];
    const inventoryRecovery = domainRecovery(
      entries,
      "nutritionInventoryData",
      [...inventoryKeys, ...legacyInventoryKeys]
    );
    if (inventoryRecovery) recovery.push(inventoryRecovery);
    let inventoryEnvelope = validValue(entries, inventoryKeys[0]) || validValue(entries, inventoryKeys[1]) || (inventoryRecovery ? null : clone(EMPTY_INVENTORY));
    const legacySources = legacyInventoryKeys
      .map((key) => ({ key, value: validValue(entries, key) }))
      .filter((source) => source.value);
    if (inventoryEnvelope) {
      inventoryEnvelope = mergeLegacyInventory(
        inventoryEnvelope,
        legacySources,
        snapshot?.capturedAt || new Date().toISOString(),
        options?.resolveFoodId
      );
      inventoryEnvelope = mergeLegacyPlanFavorites(
        inventoryEnvelope,
        validValue(entries, "mentor_nutrition_plan_favorites_v1"),
        snapshot?.capturedAt || new Date().toISOString()
      );
    }

    const financeDocuments = [];
    if (financeResult.value) {
      financeDocuments.push({
        ...financeResult.value,
        id: "finance-state",
        type: "financeState"
      });
    }
    if (templateResult.records.length) {
      financeDocuments.push({
        id: "transaction-import-templates",
        type: "importTemplates",
        templates: templateResult.records
      });
    }
    const comparisons = [
      ...snapshotsResult.records.map((item) => ({ ...item, recordType: "snapshot" })),
      ...optionsResult.records.map((item) => ({ ...item, recordType: "option" }))
    ];

    const domains = {
      settings: { language },
      ideas: ideasResult.records,
      "finance-documents": financeDocuments,
      assets: assetsResult.records,
      comparisons,
      cache: { key: "financial-comparison-research", value: cache },
      "nutrition-food-data": foodEnvelope,
      "nutrition-inventory-data": inventoryEnvelope
    };

    return {
      domains,
      validationReport: {
        reportVersion: 1,
        status: recovery.length ? "recoveryRequired" : "valid",
        entries: validationEntries,
        recovery
      },
      conflictReport: {
        reportVersion: 1,
        status: conflicts.length ? "conflictsResolved" : "clear",
        conflicts
      },
      recoveryRequired: recovery.length > 0
    };
  }

  namespace.LegacyDomainNormalizer = Object.freeze({
    normalize,
    mergeById,
    chooseAggregate,
    mergeLegacyPlanFavorites,
    deterministicLegacyId
  });
})(typeof window !== "undefined" ? window : globalThis);
