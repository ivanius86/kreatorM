(function (root) {
  "use strict";

  function createAssetsRepository(adapter) {
    const h = root.MentorRepositoryHelpers;
    const controller = root.MentorRepositoryContract.createController({ assets: [], debts: [] });

    async function load() {
      const [central, legacy] = await Promise.all([
        h.jsonCandidate(adapter, "mentor_database", h.isObject),
        h.jsonCandidate(adapter, "mentorFinanceAssetsV1", (value) => h.isObject(value) && Array.isArray(value.assets) && Array.isArray(value.debts))
      ]);
      const centralRows = central.valid && Array.isArray(central.value.assets) ? central.value.assets : null;
      const centralCandidate = {
        key: "mentor_database.assets",
        present: centralRows !== null,
        valid: centralRows !== null,
        value: centralRows === null ? null : {
          assets: centralRows.filter((item) => item?.recordType !== "debt").map((item) => h.stripFields(item, ["recordType"])),
          debts: centralRows.filter((item) => item?.recordType === "debt").map((item) => h.stripFields(item, ["recordType"]))
        }
      };
      const candidates = h.requireValidCandidate("assets", [centralCandidate, legacy], { assets: [], debts: [] });
      const primary = candidates[0].value || { assets: [], debts: [] };
      const secondary = candidates[1]?.value || { assets: [], debts: [] };
      return {
        assets: h.mergeById(primary.assets, secondary.assets, ["updatedAt", "lastUpdatedAt"]),
        debts: h.mergeById(primary.debts, secondary.debts, ["updatedAt", "lastUpdatedAt"])
      };
    }

    return {
      initialize: () => controller.initialize(load),
      isReady: () => controller.isReady(),
      getState: () => controller.getState(),
      getSnapshot: () => controller.getSnapshot(),
      getAssets: () => controller.getSnapshot().assets,
      getDebts: () => controller.getSnapshot().debts,
      subscribe: controller.subscribe,
      saveState(value) {
        const next = {
          assets: Array.isArray(value?.assets) ? h.clone(value.assets) : [],
          debts: Array.isArray(value?.debts) ? h.clone(value.debts) : []
        };
        return controller.mutate(async () => {
          await adapter.write("mentorFinanceAssetsV1", { ...next, savedAt: new Date().toISOString() });
          await h.updateCentral(adapter, (database) => {
            database.assets = [
              ...next.assets.map((item) => ({ ...item, recordType: "asset" })),
              ...next.debts.map((item) => ({ ...item, recordType: "debt" }))
            ];
            return database;
          });
          return next;
        });
      }
    };
  }

  root.MentorDataRepositoryFactories = root.MentorDataRepositoryFactories || {};
  root.MentorDataRepositoryFactories.createAssetsRepository = createAssetsRepository;
})(typeof window !== "undefined" ? window : globalThis);
