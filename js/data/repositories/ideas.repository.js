(function (root) {
  "use strict";

  function createIdeasRepository(adapter) {
    root.MentorStorageAdapterContract.assert(adapter);
    const h = root.MentorRepositoryHelpers;
    const controller = root.MentorRepositoryContract.createController([]);

    async function load() {
      const [central, legacy] = await Promise.all([
        h.jsonCandidate(adapter, "mentor_database", h.isObject),
        h.jsonCandidate(adapter, "mentor_brainstorming_ideas", Array.isArray)
      ]);
      const centralIdeas = {
        key: "mentor_database.ideas",
        present: central.valid && Object.prototype.hasOwnProperty.call(central.value, "ideas"),
        valid: central.valid && Array.isArray(central.value.ideas),
        value: central.valid ? central.value.ideas : null
      };
      const candidates = h.requireValidCandidate("ideas", [centralIdeas, legacy], []);
      return h.mergeById(candidates[0].value, candidates[1]?.value, ["updatedAt"]);
    }

    async function persist(ideas) {
      const next = Array.isArray(ideas) ? h.clone(ideas) : [];
      const keys = ["mentor_brainstorming_ideas", "mentor_database"];
      const previous = await Promise.all(keys.map((key) => adapter.readRaw(key)));
      try {
        await adapter.write(keys[0], next);
        await h.updateCentral(adapter, (database) => {
          database.ideas = next;
          return database;
        });
      } catch (error) {
        // Restore only this domain under the central adapter's queue: finance
        // or calendar may have committed while the ideas write was pending.
        const rollback = await Promise.allSettled([
          (async () => previous[0] === null ? adapter.remove(keys[0]) : typeof adapter.writeRaw === "function" ? adapter.writeRaw(keys[0], previous[0]) : adapter.write(keys[0], JSON.parse(previous[0])))(),
          adapter.update(keys[1], (current) => {
            if (!h.isObject(current) || JSON.stringify(current.ideas) !== JSON.stringify(next)) return current;
            const before = previous[1] ? JSON.parse(previous[1]) : null;
            const restored = h.clone(current);
            if (before && Object.hasOwn(before, "ideas")) restored.ideas = before.ideas;
            else delete restored.ideas;
            return restored;
          }, null)
        ]);
        if (rollback.some((result) => result.status === "rejected")) error.commitUncertain = true;
        throw error;
      }
      return next;
    }

    return {
      initialize: () => controller.initialize(load),
      isReady: () => controller.isReady(),
      getState: () => controller.getState(),
      getSnapshot: () => controller.getSnapshot(),
      getAll: () => controller.getSnapshot(),
      getById(id) { return controller.getSnapshot().find((idea) => String(idea?.id) === String(id)) || null; },
      subscribe: controller.subscribe,
      replaceAll(ideas) { return controller.mutate(() => persist(ideas)); },
      createIfAbsent(idea) {
        const write = () => controller.mutate(async () => {
          const current = await load();
          return current.some(item => item.id === idea.id) ? current : persist([h.clone(idea), ...current]);
        }).then(items => items.find(item => item.id === idea.id));
        return root.navigator?.locks?.request ? root.navigator.locks.request("mentor-ideas-create-if-absent", write) : write();
      },
      upsert(idea) {
        return controller.mutate((current) => {
          const index = current.findIndex((item) => String(item?.id) === String(idea?.id));
          const next = [...current];
          if (index >= 0) next[index] = h.clone(idea);
          else next.push(h.clone(idea));
          return persist(next);
        }).then((items) => items.find((item) => String(item?.id) === String(idea?.id)));
      },
      remove(id) {
        return controller.mutate((current) => persist(current.filter((idea) => String(idea?.id) !== String(id)))).then(() => undefined);
      }
    };
  }

  root.MentorDataRepositoryFactories = root.MentorDataRepositoryFactories || {};
  root.MentorDataRepositoryFactories.createIdeasRepository = createIdeasRepository;
})(typeof window !== "undefined" ? window : globalThis);
