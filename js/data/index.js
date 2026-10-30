(function (root) {
  "use strict";

  const adapter = new root.MentorLocalStorageAdapter(root.localStorage);
  const factories = root.MentorDataRepositoryFactories;
  const repositories = {
    settings: factories.createSettingsRepository(adapter),
    goals: factories.createGoalsRepository(adapter),
    calendar: factories.createCalendarRepository(adapter),
    ideas: factories.createIdeasRepository(adapter),
    finance: factories.createFinanceRepository(adapter),
    assets: factories.createAssetsRepository(adapter),
    comparisons: factories.createComparisonsRepository(adapter),
    nutritionFoodData: factories.createNutritionFoodDataRepository(adapter),
    nutritionInventoryData: factories.createNutritionInventoryDataRepository(adapter),
    media: factories.createMediaRepository()
  };

  const data = root.MentorData = {
    adapter,
    repositories,
    database: null,
    adapterSelection: {
      settings: "localStorage",
      goals: "localStorage",
      calendar: "localStorage",
      ideas: "localStorage",
      comparisons: "localStorage",
      cache: "localStorage",
      finance: "localStorage",
      assets: "localStorage",
      nutritionFoodData: "localStorage",
      nutritionInventoryData: "localStorage",
      media: "legacyIndexedDB"
    },
    goalsCalendarTransactions: null,
    storageSelectionError: null
  };

  data.repositorySelectionPromise = Promise.resolve().then(async () => {
    if (!root.Dexie || !root.MentorIndexedDB?.createDatabase) {
      const error = new root.MentorDataError(
        "INDEXEDDB_RUNTIME_UNAVAILABLE",
        "The local IndexedDB runtime is unavailable."
      );
      data.storageSelectionError = error;
      throw error;
    }

    const database = root.MentorIndexedDB.createDatabase({
      Dexie: root.Dexie,
      indexedDB: root.indexedDB,
      IDBKeyRange: root.IDBKeyRange,
      onBlocked(detail) {
        root.console?.warn?.("[MentorData] IndexedDB open is blocked.", detail);
      },
      onVersionChange(detail) {
        root.console?.warn?.("[MentorData] IndexedDB version change requested.", detail);
      }
    });
    data.database = database;

    try {
      data.migrationResult = await root.MentorIndexedDB.LegacyToIndexedDbService.migrate({
        database,
        storage: root.localStorage,
        legacyIndexedDB: root.indexedDB,
        fflate: root.fflate,
        cryptoApi: root.crypto,
        appVersion: root.MENTOR_APP_VERSION || "unknown"
      });
      const selection = await root.MentorIndexedDB.IndexedDbCoreRepositories
        .readSelection(database);
      data.adapterSelection = selection;

      if (selection.settings === "indexeddb") {
        repositories.settings = root.MentorIndexedDB.IndexedDbCoreRepositories
          .createSettingsRepository(database);
      }
      if (
        selection.goals === "indexeddb" &&
        selection.calendar === "indexeddb"
      ) {
        repositories.goals = root.MentorIndexedDB.IndexedDbCoreRepositories
          .createGoalsRepository(database);
        repositories.calendar = root.MentorIndexedDB.IndexedDbCoreRepositories
          .createCalendarRepository(database);
        data.goalsCalendarTransactions =
          root.MentorIndexedDB.IndexedDbCoreRepositories.createGoalsCalendarTransactions(
            database,
            repositories.goals,
            repositories.calendar
          );
      }
      if (
        selection.ideas === "indexeddb" &&
        selection.comparisons === "indexeddb"
      ) {
        repositories.ideas = root.MentorIndexedDB.IndexedDbCoreRepositories
          .createIdeasRepository(database);
        repositories.comparisons =
          root.MentorIndexedDB.IndexedDbCoreRepositories
            .createComparisonsRepository(database, {
              cacheActive: selection.cache === "indexeddb"
            });
      }
      if (
        selection.finance === "indexeddb" &&
        selection.assets === "indexeddb"
      ) {
        repositories.finance =
          root.MentorIndexedDB.IndexedDbCoreRepositories
            .createFinanceRepository(database);
        repositories.assets =
          root.MentorIndexedDB.IndexedDbCoreRepositories
            .createAssetsRepository(database);
      }
      if (
        selection.nutritionFoodData === "indexeddb" &&
        selection.nutritionInventoryData === "indexeddb"
      ) {
        repositories.nutritionFoodData =
          root.MentorIndexedDB.IndexedDbCoreRepositories
            .createNutritionFoodDataRepository(database);
        repositories.nutritionInventoryData =
          root.MentorIndexedDB.IndexedDbCoreRepositories
            .createNutritionInventoryDataRepository(database);
      }
      if (selection.media === "indexeddb") {
        repositories.media =
          root.MentorIndexedDB.IndexedDbCoreRepositories
            .createMediaRepository(database);
      }
      return selection;
    } catch (error) {
      data.storageSelectionError = error;
      root.dispatchEvent?.(new CustomEvent("mentor:data-storage-selection-failed", {
        detail: { code: error?.code || "INDEXEDDB_SELECTION_FAILED" }
      }));
      throw error;
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
