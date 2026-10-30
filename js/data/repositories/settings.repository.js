(function (root) {
  "use strict";

  function createSettingsRepository(adapter) {
    root.MentorStorageAdapterContract.assert(adapter);
    const h = root.MentorRepositoryHelpers;
    const controller = root.MentorRepositoryContract.createController({ language: null });
    const supported = (value) => value === "sr" || value === "en";

    async function load() {
      const [current, legacy, central] = await Promise.all([
        h.stringCandidate(adapter, "mentor_language", supported),
        h.stringCandidate(adapter, "mentorPlanner.language", supported),
        h.jsonCandidate(adapter, "mentor_database", h.isObject)
      ]);
      const databaseLanguage = central.valid ? central.value?.settings?.language : null;
      const candidates = [current, legacy, {
        key: "mentor_database.settings.language",
        present: databaseLanguage !== null && databaseLanguage !== undefined && databaseLanguage !== "",
        valid: supported(databaseLanguage),
        value: databaseLanguage
      }];
      const valid = h.requireValidCandidate("settings", candidates, null);
      return { language: valid[0].value || null };
    }

    return {
      initialize: () => controller.initialize(load),
      isReady: () => controller.isReady(),
      getState: () => controller.getState(),
      getSnapshot: () => controller.getSnapshot(),
      getLanguage: () => controller.getSnapshot().language,
      subscribe: controller.subscribe,
      setLanguage(language) {
        if (!supported(language)) return Promise.reject(new root.MentorDataError("UNSUPPORTED_LANGUAGE", "Language must be sr or en."));
        return controller.mutate(async () => {
          await adapter.writeRaw("mentor_language", language);
          await h.updateCentral(adapter, (database) => {
            database.settings = { ...(h.isObject(database.settings) ? database.settings : {}), language };
            return database;
          });
          return { language };
        }).then(() => undefined);
      }
    };
  }

  root.MentorDataRepositoryFactories = root.MentorDataRepositoryFactories || {};
  root.MentorDataRepositoryFactories.createSettingsRepository = createSettingsRepository;
})(typeof window !== "undefined" ? window : globalThis);
