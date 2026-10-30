(function (root) {
  "use strict";

  const namespace = root.MentorDataPhase0 = root.MentorDataPhase0 || {};

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.getOwnPropertyNames(value).forEach((key) => deepFreeze(value[key]));
    return Object.freeze(value);
  }

  const localStorageSources = deepFreeze([
    { key: "mentor_database", owner: "shared", format: "json", role: "central", canonicalDomain: "database", canonicalStore: null },
    { key: "mentor_brainstorming_ideas", owner: "ideas", format: "json", role: "primary", canonicalDomain: "ideas", canonicalStore: "ideas" },
    { key: "mentorFinanceStateV1", owner: "finance", format: "json", role: "primary", canonicalDomain: "finance", canonicalStore: "financeDocuments" },
    { key: "mentorTransactionImportTemplatesV1", owner: "finance-import", format: "json", role: "primary", canonicalDomain: "financeImportTemplates", canonicalStore: "financeDocuments" },
    { key: "mentorFinanceAssetsV1", owner: "assets", format: "json", role: "primary", canonicalDomain: "assets", canonicalStore: "assets" },
    { key: "mentorFinancialComparisonSnapshotsV1", owner: "comparisons", format: "json", role: "primary", canonicalDomain: "comparisonSnapshots", canonicalStore: "comparisons" },
    { key: "mentorFinancialComparisonOptionsV1", owner: "comparisons", format: "json", role: "primary", canonicalDomain: "comparisonOptions", canonicalStore: "comparisons" },
    { key: "mentorFinancialComparisonResearchCacheV1", owner: "comparisons-research", format: "json", role: "cache", canonicalDomain: "comparisonResearchCache", canonicalStore: "cache", canonical: false },
    { key: "mentor_language", owner: "settings", format: "string", role: "primary", canonicalDomain: "language", canonicalStore: "settings" },
    { key: "mentorPlanner.language", owner: "settings", format: "string", role: "legacy", canonicalDomain: "language", canonicalStore: "settings" },
    { key: "mentor_nutrition_foods_v1", owner: "nutrition-foods", format: "json", role: "primary", canonicalDomain: "nutritionFoodData", canonicalStore: "nutritionFoodData", version: 1 },
    { key: "mentor_nutrition_foods_v1_backup", owner: "nutrition-foods", format: "json", role: "backup", canonicalDomain: "nutritionFoodData", canonicalStore: "nutritionFoodData", version: 1 },
    { key: "mentor_nutrition_foods_v1_staging", owner: "nutrition-foods", format: "json", role: "staging", canonicalDomain: "nutritionFoodData", canonicalStore: "legacyBackups", version: 1, canonical: false },
    { key: "mentor_nutrition_inventory_v1", owner: "nutrition-inventory", format: "json", role: "primary", canonicalDomain: "nutritionInventoryData", canonicalStore: "nutritionInventoryData", version: 1 },
    { key: "mentor_nutrition_inventory_v1_backup", owner: "nutrition-inventory", format: "json", role: "backup", canonicalDomain: "nutritionInventoryData", canonicalStore: "nutritionInventoryData", version: 1 },
    { key: "mentor_nutrition_inventory_v1_staging", owner: "nutrition-inventory", format: "json", role: "staging", canonicalDomain: "nutritionInventoryData", canonicalStore: "legacyBackups", version: 1, canonical: false },
    { key: "mentor_nutrition_inventory_v1_legacy_backup", owner: "nutrition-inventory", format: "raw", role: "legacy-backup", canonicalDomain: "nutritionLegacyRaw", canonicalStore: "legacyBackups", canonical: false },
    { key: "mentor_nutrition_plan_favorites_v1", owner: "nutrition-inventory", format: "json", role: "legacy", canonicalDomain: "nutritionInventoryData", canonicalStore: "legacyBackups", canonical: false },
    { key: "mentor_nutrition_fridge_v1", owner: "nutrition-inventory", format: "json", role: "legacy", canonicalDomain: "nutritionInventoryData", canonicalStore: "nutritionInventoryData" },
    { key: "mentor_nutrition_stock_v1", owner: "nutrition-inventory", format: "json", role: "legacy", canonicalDomain: "nutritionInventoryData", canonicalStore: "nutritionInventoryData" }
  ]);

  const indexedDbSources = deepFreeze([
    {
      database: "mentor_nutrition_images",
      version: 1,
      store: "foodImages",
      keyPath: "id",
      owner: "nutrition-media",
      role: "primary",
      canonicalDomain: "media",
      canonicalStore: "media"
    }
  ]);

  const byLocalStorageKey = new Map(localStorageSources.map((source) => [source.key, source]));

  namespace.LegacyStorageRegistry = deepFreeze({
    localStorageSources,
    indexedDbSources,
    localStorageKeys: localStorageSources.map((source) => source.key),
    getLocalStorageSource(key) {
      return byLocalStorageKey.get(String(key)) || null;
    },
    getIndexedDbSource(database, store) {
      return indexedDbSources.find((source) => source.database === database && source.store === store) || null;
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
