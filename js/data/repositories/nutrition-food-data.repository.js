(function (root) {
  "use strict";

  function createNutritionFoodDataRepository(adapter) {
    const controller = root.MentorRepositoryContract.createController(null);
    const service = () => root.MentorNutritionFoodStorage;
    const requireService = () => {
      if (!service()) throw new root.MentorDataError("NUTRITION_STORAGE_UNAVAILABLE", "Nutrition food storage service is not loaded.");
      return service();
    };
    async function load() {
      const storage = requireService();
      const keys = ["mentor_nutrition_foods_v1", "mentor_nutrition_foods_v1_backup"];
      let present = 0;
      for (const key of keys) {
        const raw = await adapter.readRaw(key);
        if (raw === null || raw === "") continue;
        present += 1;
        try {
          const parsed = JSON.parse(raw);
          if (Number(parsed?.version) !== 1) continue;
          const normalized = storage.normalize(parsed);
          if (!storage.validate(normalized).length) return normalized;
        } catch (_) { /* raw payload remains untouched for recovery */ }
      }
      if (present) throw new root.MentorDataError("DATA_RECOVERY_REQUIRED", "Nutrition food data requires recovery.", { domain: "nutritionFoodData" });
      return storage.createEmpty();
    }

    return {
      initialize: () => controller.initialize(load),
      isReady: () => controller.isReady(),
      getState: () => controller.getState(),
      getSnapshot: () => controller.getSnapshot(),
      getEnvelope: () => controller.getSnapshot(),
      validate: (envelope) => requireService().validate(envelope),
      subscribe: controller.subscribe,
      mutateEnvelope(mutator) {
        let result;
        const write = () => controller.mutate(async () => {
          const envelope = await load();
          result = mutator(envelope);
          if (result && typeof result.then === "function") throw new root.MentorDataError("ASYNC_DOMAIN_MUTATION", "Domain mutation must be synchronous.");
          return requireService().save(envelope);
        }).then(() => result == null ? result : JSON.parse(JSON.stringify(result)));
        return root.navigator?.locks?.request ? root.navigator.locks.request("mentor-nutrition-create", write) : write();
      },
      saveEnvelope(envelope) {
        return controller.mutate(() => requireService().save(envelope));
      }
    };
  }

  root.MentorDataRepositoryFactories = root.MentorDataRepositoryFactories || {};
  root.MentorDataRepositoryFactories.createNutritionFoodDataRepository = createNutritionFoodDataRepository;
})(typeof window !== "undefined" ? window : globalThis);
