(function (root) {
  "use strict";

  const KEY = "mentor_goals_v1";
  const VERSION = 1;
  const GOAL_TYPES = new Set(["long-term", "short-term", "habit"]);

  function createGoalsRepository(adapter) {
    root.MentorStorageAdapterContract.assert(adapter);
    const h = root.MentorRepositoryHelpers;
    const controller = root.MentorRepositoryContract.createController([]);

    function isGoal(goal) {
      return h.isObject(goal)
        && String(goal.id || "").trim() !== ""
        && String(goal.title || "").trim() !== ""
        && GOAL_TYPES.has(goal.type);
    }

    function isDocument(value) {
      if (!h.isObject(value) || value.version !== VERSION || !Array.isArray(value.goals)) return false;
      if (!value.goals.every(isGoal)) return false;
      const ids = value.goals.map((goal) => String(goal.id));
      return new Set(ids).size === ids.length;
    }

    async function load() {
      const candidate = await h.jsonCandidate(adapter, KEY, isDocument);
      const selected = h.requireValidCandidate("goals", [candidate], {
        version: VERSION,
        updatedAt: null,
        goals: []
      });
      return h.clone(selected[0].value.goals);
    }

    async function persist(goals) {
      const next = Array.isArray(goals) ? h.clone(goals) : [];
      if (!isDocument({ version: VERSION, goals: next })) {
        throw new root.MentorDataError("INVALID_GOALS_DOCUMENT", "Goals document is invalid.");
      }
      await adapter.write(KEY, {
        version: VERSION,
        updatedAt: new Date().toISOString(),
        goals: next
      });
      return next;
    }

    return {
      initialize: () => controller.initialize(load),
      isReady: () => controller.isReady(),
      getState: () => controller.getState(),
      getSnapshot: () => controller.getSnapshot(),
      getAll: () => controller.getSnapshot(),
      getById(id) {
        return controller.getSnapshot().find((goal) => String(goal?.id) === String(id)) || null;
      },
      subscribe: controller.subscribe,
      replaceAll(goals) {
        return controller.mutate(() => persist(goals));
      },
      create(goal) {
        return controller.mutate((current) => {
          if (current.some((item) => String(item?.id) === String(goal?.id))) {
            throw new root.MentorDataError("DUPLICATE_GOAL_ID", "Goal ID already exists.", { id: goal?.id });
          }
          return persist([h.clone(goal), ...current]);
        }).then((goals) => goals.find((item) => String(item?.id) === String(goal?.id)));
      },
      createIfAbsent(goal) {
        const write = () => controller.mutate(async () => {
          const current = await load();
          if (current.some((item) => String(item.id) === String(goal?.id))) return current;
          return persist([h.clone(goal), ...current]);
        }).then((goals) => goals.find((item) => String(item.id) === String(goal?.id)));
        return root.navigator?.locks?.request
          ? root.navigator.locks.request("mentor-goals-create-if-absent", write)
          : write();
      },
      upsert(goal) {
        return controller.mutate((current) => {
          const next = current.filter((item) => String(item?.id) !== String(goal?.id));
          return persist([h.clone(goal), ...next]);
        }).then((goals) => goals.find((item) => String(item?.id) === String(goal?.id)));
      },
      remove(id) {
        return controller.mutate((current) => persist(
          current.filter((goal) => String(goal?.id) !== String(id))
        )).then(() => undefined);
      }
    };
  }

  root.MentorDataRepositoryFactories = root.MentorDataRepositoryFactories || {};
  root.MentorDataRepositoryFactories.createGoalsRepository = createGoalsRepository;
})(typeof window !== "undefined" ? window : globalThis);
