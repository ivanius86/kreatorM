(function (root) {
  "use strict";

  function createComparisonsRepository(adapter) {
    const h = root.MentorRepositoryHelpers;
    const empty = { snapshots: [], options: [], researchCache: {} };
    const controller = root.MentorRepositoryContract.createController(empty);

    async function load() {
      const [central, snapshots, options, cache] = await Promise.all([
        h.jsonCandidate(adapter, "mentor_database", h.isObject),
        h.jsonCandidate(adapter, "mentorFinancialComparisonSnapshotsV1", Array.isArray),
        h.jsonCandidate(adapter, "mentorFinancialComparisonOptionsV1", Array.isArray),
        h.jsonCandidate(adapter, "mentorFinancialComparisonResearchCacheV1", h.isObject)
      ]);
      const hasCentralRows = central.valid && Array.isArray(central.value.comparisons);
      const rows = hasCentralRows ? central.value.comparisons : [];
      const centralSnapshots = rows.filter((item) => item?.recordType === "snapshot").map((item) => h.stripFields(item, ["recordType"]));
      const centralOptions = rows.filter((item) => item?.recordType === "option").map((item) => h.stripFields(item, ["recordType"]));
      const centralCache = rows.filter((item) => item?.recordType === "researchCache").reduce((result, item) => {
        if (item?.id) result[item.id] = item.value;
        return result;
      }, {});
      const snapshotCandidates = h.requireValidCandidate("comparisonSnapshots", [{
        key: "mentor_database.comparisons.snapshots", present: hasCentralRows, valid: hasCentralRows, value: centralSnapshots
      }, snapshots], []);
      const optionCandidates = h.requireValidCandidate("comparisonOptions", [{
        key: "mentor_database.comparisons.options", present: hasCentralRows, valid: hasCentralRows, value: centralOptions
      }, options], []);
      // Cache is disposable. Invalid cache never blocks canonical comparisons.
      const cacheValue = cache.valid ? cache.value : centralCache;
      return {
        snapshots: h.mergeById(snapshotCandidates[0].value, snapshotCandidates[1]?.value, ["updatedAt", "createdAt"]),
        options: h.mergeById(optionCandidates[0].value, optionCandidates[1]?.value, ["updatedAt"]),
        researchCache: h.isObject(cacheValue) ? cacheValue : {}
      };
    }

    async function persist(current) {
      await Promise.all([
        adapter.write("mentorFinancialComparisonSnapshotsV1", current.snapshots),
        adapter.write("mentorFinancialComparisonOptionsV1", current.options),
        adapter.write("mentorFinancialComparisonResearchCacheV1", current.researchCache)
      ]);
      await h.updateCentral(adapter, (database) => {
        database.comparisons = [
          ...current.snapshots.map((item) => ({ ...item, recordType: "snapshot" })),
          ...current.options.map((item) => ({ ...item, recordType: "option" })),
          ...Object.entries(current.researchCache).map(([id, value]) => ({ id, value, recordType: "researchCache" }))
        ];
        return database;
      });
      return current;
    }

    return {
      initialize: () => controller.initialize(load),
      isReady: () => controller.isReady(),
      getState: () => controller.getState(),
      getSnapshot: () => controller.getSnapshot(),
      getSnapshots(ideaId) {
        return controller.getSnapshot().snapshots.filter((item) => ideaId === undefined || String(item?.ideaId) === String(ideaId));
      },
      getOptions(ideaId) {
        return controller.getSnapshot().options.filter((item) => ideaId === undefined || String(item?.ideaId) === String(ideaId));
      },
      getResearchCache: () => controller.getSnapshot().researchCache,
      subscribe: controller.subscribe,
      saveSnapshots(items) {
        const snapshots = Array.isArray(items) ? h.clone(items) : [];
        return controller.mutate((current) => persist({ ...current, snapshots })).then((value) => value.snapshots);
      },
      saveOptions(items) {
        const options = Array.isArray(items) ? h.clone(items) : [];
        return controller.mutate((current) => persist({ ...current, options })).then((value) => value.options);
      },
      saveResearchCache(cache) {
        const researchCache = h.isObject(cache) ? h.clone(cache) : {};
        return controller.mutate((current) => persist({ ...current, researchCache })).then(() => undefined);
      },
      invalidateResearchCache(ideaId) {
        return controller.mutate((current) => {
          const researchCache = h.clone(current.researchCache);
          if (ideaId === undefined) Object.keys(researchCache).forEach((key) => delete researchCache[key]);
          else {
            delete researchCache[String(ideaId)];
            if (h.isObject(researchCache.ideas)) delete researchCache.ideas[String(ideaId)];
          }
          return persist({ ...current, researchCache });
        }).then(() => undefined);
      }
    };
  }

  root.MentorDataRepositoryFactories = root.MentorDataRepositoryFactories || {};
  root.MentorDataRepositoryFactories.createComparisonsRepository = createComparisonsRepository;
})(typeof window !== "undefined" ? window : globalThis);
