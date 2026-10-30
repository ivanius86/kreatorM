(function (root) {
  "use strict";

  const KEY = "mentor_calendar_events_v1";
  const VERSION = 1;
  const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
  const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

  function createCalendarRepository(adapter) {
    root.MentorStorageAdapterContract.assert(adapter);
    const h = root.MentorRepositoryHelpers;
    const controller = root.MentorRepositoryContract.createController([]);

    function isEvent(event) {
      return h.isObject(event)
        && String(event.id || "").trim() !== ""
        && String(event.goalId || "").trim() !== ""
        && DATE_PATTERN.test(String(event.date || ""))
        && TIME_PATTERN.test(String(event.time || ""));
    }

    function isDocument(value) {
      if (!h.isObject(value) || value.version !== VERSION || !Array.isArray(value.events)) return false;
      if (!value.events.every(isEvent)) return false;
      const ids = value.events.map((event) => String(event.id));
      return new Set(ids).size === ids.length;
    }

    async function load() {
      const candidate = await h.jsonCandidate(adapter, KEY, isDocument);
      const selected = h.requireValidCandidate("calendar", [candidate], {
        version: VERSION,
        updatedAt: null,
        events: []
      });
      return h.clone(selected[0].value.events);
    }

    async function persist(events) {
      const next = Array.isArray(events) ? h.clone(events) : [];
      if (!isDocument({ version: VERSION, events: next })) {
        throw new root.MentorDataError("INVALID_CALENDAR_DOCUMENT", "Calendar document is invalid.");
      }
      await adapter.write(KEY, {
        version: VERSION,
        updatedAt: new Date().toISOString(),
        events: next
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
        return controller.getSnapshot().find((event) => String(event?.id) === String(id)) || null;
      },
      getByGoalId(goalId) {
        return controller.getSnapshot().filter((event) => String(event?.goalId) === String(goalId));
      },
      getByDate(date) {
        return controller.getSnapshot().filter((event) => event?.date === date);
      },
      subscribe: controller.subscribe,
      replaceAll(events) {
        return controller.mutate(() => persist(events));
      },
      create(event) {
        return controller.mutate((current) => {
          if (current.some((item) => String(item?.id) === String(event?.id))) {
            throw new root.MentorDataError("DUPLICATE_CALENDAR_EVENT_ID", "Calendar event ID already exists.", { id: event?.id });
          }
          return persist([...current, h.clone(event)]);
        }).then((events) => events.find((item) => String(item?.id) === String(event?.id)));
      },
      createMany(events) {
        const additions = Array.isArray(events) ? h.clone(events) : [];
        return controller.mutate((current) => {
          const ids = new Set(current.map((event) => String(event?.id)));
          additions.forEach((event) => {
            const id = String(event?.id);
            if (ids.has(id)) {
              throw new root.MentorDataError("DUPLICATE_CALENDAR_EVENT_ID", "Calendar event ID already exists.", { id });
            }
            ids.add(id);
          });
          return persist([...current, ...additions]);
        }).then((snapshot) => {
          const additionIds = new Set(additions.map((event) => String(event.id)));
          return snapshot.filter((event) => additionIds.has(String(event.id)));
        });
      },
      upsert(event) {
        return controller.mutate((current) => {
          const next = current.filter((item) => String(item?.id) !== String(event?.id));
          return persist([...next, h.clone(event)]);
        }).then((events) => events.find((item) => String(item?.id) === String(event?.id)));
      },
      remove(id) {
        return controller.mutate((current) => persist(
          current.filter((event) => String(event?.id) !== String(id))
        )).then(() => undefined);
      },
      removeByGoalId(goalId) {
        return controller.mutate((current) => persist(
          current.filter((event) => String(event?.goalId) !== String(goalId))
        )).then(() => undefined);
      }
    };
  }

  root.MentorDataRepositoryFactories = root.MentorDataRepositoryFactories || {};
  root.MentorDataRepositoryFactories.createCalendarRepository = createCalendarRepository;
})(typeof window !== "undefined" ? window : globalThis);
