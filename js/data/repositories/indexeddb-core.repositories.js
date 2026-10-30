(function attachIndexedDbCoreRepositories(root) {
  "use strict";

  const namespace = root.MentorIndexedDB = root.MentorIndexedDB || {};
  const constants = namespace.LegacyToIndexedDbService?.constants;
  const clone = (value) => value == null
    ? value
    : typeof structuredClone === "function"
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));

  function dataError(code, message, details) {
    if (typeof root.MentorDataError === "function") {
      return new root.MentorDataError(code, message, details);
    }
    const error = new Error(message);
    error.code = code;
    error.details = details;
    return error;
  }

  function requireRuntime() {
    if (!constants || !namespace.TransactionHelper) {
      throw new Error("IndexedDB migration and transaction infrastructure must be loaded first.");
    }
    if (!root.MentorRepositoryContract) {
      throw new Error("MentorRepositoryContract must be loaded first.");
    }
  }

  async function requireActiveMarkers(meta, domains) {
    for (const domain of domains) {
      const marker = await meta.get(constants.CUTOVER_KEYS[domain]);
      if (marker?.status !== "active" || marker?.adapter !== "indexeddb") {
        throw dataError(
          "INDEXEDDB_CUTOVER_NOT_ACTIVE",
          `IndexedDB cutover is not active for ${domain}.`,
          { domain, marker: marker || null }
        );
      }
    }
  }

  async function runDomainWrite(database, domains, stores, operation) {
    const names = Array.from(new Set([...(stores || []), "meta"]));
    const coordination = namespace.CrossTabCoordinationService;
    if (!coordination) {
      throw dataError(
        "CROSS_TAB_COORDINATION_UNAVAILABLE",
        "IndexedDB writes require cross-tab coordination."
      );
    }
    return coordination.withShared(
      `repository-write:${domains.join(",")}`,
      async () => {
        const lease = namespace.MutationFreezeService
          ? await namespace.MutationFreezeService.beginMutation()
          : null;
        try {
          return await namespace.TransactionHelper.run(
            database,
            "rw",
            names,
            async ({ table }) => {
              const meta = table("meta");
              coordination.assertWritableEpoch(
                await meta.get(coordination.EPOCH_KEY)
              );
              await requireActiveMarkers(meta, domains);
              const result = await operation({ table });
              const timestamp = new Date().toISOString();
              for (const domain of domains) {
                const marker = await meta.get(constants.CUTOVER_KEYS[domain]);
                marker.hasIndexedDbWrites = true;
                marker.firstIndexedDbWriteAt = marker.firstIndexedDbWriteAt || timestamp;
                marker.lastIndexedDbWriteAt = timestamp;
                marker.updatedAt = timestamp;
                await meta.put(marker);
              }
              return result;
            }
          );
        } finally {
          lease?.release();
        }
      }
    );
  }

  async function readSelection(database) {
    const globalMarker = await database.table("meta").get(constants.CUTOVER_KEYS.global);
    const selected = {};
    for (const domain of [
      "settings",
      "goals",
      "calendar",
      "ideas",
      "comparisons",
      "cache",
      "finance",
      "assets",
      "nutritionFoodData",
      "nutritionInventoryData",
      "media"
    ]) {
      const requested = globalMarker?.domains?.[domain] === "indexeddb";
      const marker = await database.table("meta").get(constants.CUTOVER_KEYS[domain]);
      const checkpoint = await database.table("meta").get(constants.DOMAIN_KEYS[domain]);
      if (requested) {
        if (
          marker?.status !== "active" ||
          marker?.adapter !== "indexeddb" ||
          checkpoint?.status !== "active"
        ) {
          throw dataError(
            "INDEXEDDB_CUTOVER_MARKER_INVALID",
            `IndexedDB cutover marker is inconsistent for ${domain}.`,
            { domain, marker: marker || null, checkpoint: checkpoint || null }
          );
        }
        selected[domain] = "indexeddb";
      } else {
        if (marker?.hasIndexedDbWrites === true) {
          throw dataError(
            "INDEXEDDB_WRITE_BARRIER_ACTIVE",
            `Legacy fallback is forbidden after the first IndexedDB write for ${domain}.`,
            { domain, marker }
          );
        }
        selected[domain] = domain === "media"
          ? "legacyIndexedDB"
          : "localStorage";
      }
    }
    if (selected.goals !== selected.calendar) {
      throw dataError(
        "GOALS_CALENDAR_CUTOVER_PAIR_REQUIRED",
        "Goals and Calendar must use the same active adapter."
      );
    }
    if (selected.ideas !== selected.comparisons) {
      throw dataError(
        "IDEAS_COMPARISONS_CUTOVER_PAIR_REQUIRED",
        "Ideas and Comparisons must use the same active adapter."
      );
    }
    if (selected.finance !== selected.assets) {
      throw dataError(
        "FINANCE_ASSETS_CUTOVER_PAIR_REQUIRED",
        "Finance and Assets must use the same active adapter."
      );
    }
    if (
      selected.nutritionFoodData !==
      selected.nutritionInventoryData
    ) {
      throw dataError(
        "NUTRITION_ENVELOPES_CUTOVER_PAIR_REQUIRED",
        "Nutrition Food Data and Inventory must use the same active adapter."
      );
    }
    if (
      selected.comparisons === "indexeddb" &&
      selected.cache !== "indexeddb"
    ) {
      selected.cache = "disabled";
    }
    if (!namespace.CrossTabCoordinationService) {
      throw dataError(
        "CROSS_TAB_COORDINATION_UNAVAILABLE",
        "IndexedDB hydration requires cross-tab coordination."
      );
    }
    namespace.CrossTabCoordinationService.rememberHydratedEpoch(
      await namespace.CrossTabCoordinationService.readEpoch(database)
    );
    return selected;
  }

  function validateGoals(goals) {
    const validation = root.MentorDataPhase0?.GoalsCalendarBackupService
      ?.normalizeGoalsDocument({ version: 1, goals: clone(goals || []) });
    if (!validation?.valid) {
      throw dataError(
        "INVALID_GOALS_DOCUMENT",
        "Goals document is invalid.",
        { errors: validation?.errors || ["GOALS_VALIDATOR_UNAVAILABLE"] }
      );
    }
    return validation.value.goals;
  }

  function validateCalendar(events) {
    const validation = root.MentorDataPhase0?.GoalsCalendarBackupService
      ?.normalizeCalendarDocument({ version: 1, events: clone(events || []) });
    if (!validation?.valid) {
      throw dataError(
        "INVALID_CALENDAR_DOCUMENT",
        "Calendar document is invalid.",
        { errors: validation?.errors || ["CALENDAR_VALIDATOR_UNAVAILABLE"] }
      );
    }
    return validation.value.events;
  }

  function validateReferences(goals, events) {
    const validation = root.MentorDataPhase0?.GoalsCalendarBackupService
      ?.validateReferences(
        { version: 1, goals },
        { version: 1, events }
      );
    if (!validation?.valid) {
      throw dataError(
        "INVALID_GOALS_CALENDAR_REFERENCES",
        "Goals and Calendar references are invalid.",
        { errors: validation?.errors || ["REFERENCE_VALIDATOR_UNAVAILABLE"] }
      );
    }
  }

  function createIndexedDbSettingsRepository(database) {
    requireRuntime();
    const controller = root.MentorRepositoryContract.createController({ language: null });
    return {
      storageKind: "indexeddb",
      initialize: () => controller.initialize(async () => {
        const record = await database.table("settings").get("language");
        return { language: record?.value || null };
      }),
      isReady: () => controller.isReady(),
      getState: () => controller.getState(),
      getSnapshot: () => controller.getSnapshot(),
      getLanguage: () => controller.getSnapshot().language,
      subscribe: controller.subscribe,
      setLanguage(language) {
        if (!["sr", "en"].includes(language)) {
          return Promise.reject(dataError(
            "UNSUPPORTED_LANGUAGE",
            "Language must be sr or en."
          ));
        }
        return controller.mutate(async () => {
          await runDomainWrite(
            database,
            ["settings"],
            ["settings"],
            ({ table }) => table("settings").put({
              key: "language",
              value: language,
              updatedAt: new Date().toISOString()
            })
          );
          return { language };
        }).then(() => undefined);
      }
    };
  }

  function createIndexedDbGoalsRepository(database) {
    requireRuntime();
    const controller = root.MentorRepositoryContract.createController([]);
    async function persist(goals) {
      const next = validateGoals(goals);
      await runDomainWrite(
        database,
        ["goals"],
        ["goals", "calendarEvents"],
        async ({ table }) => {
          const events = await table("calendarEvents").toArray();
          validateReferences(next, events);
          await table("goals").clear();
          if (next.length) await table("goals").bulkPut(next);
        }
      );
      return next;
    }
    const repository = {
      storageKind: "indexeddb",
      deferMaterializedWrite: true,
      initialize: () => controller.initialize(() => database.table("goals").toArray()),
      isReady: () => controller.isReady(),
      getState: () => controller.getState(),
      getSnapshot: () => controller.getSnapshot(),
      getAll: () => controller.getSnapshot(),
      getById(id) {
        return controller.getSnapshot().find(
          (goal) => String(goal?.id) === String(id)
        ) || null;
      },
      subscribe: controller.subscribe,
      replaceAll(goals) {
        return controller.mutate(() => persist(goals));
      },
      create(goal) {
        return controller.mutate((current) => {
          if (current.some((item) => String(item?.id) === String(goal?.id))) {
            throw dataError("DUPLICATE_GOAL_ID", "Goal ID already exists.", { id: goal?.id });
          }
          return persist([clone(goal), ...current]);
        }).then((goals) => goals.find(
          (item) => String(item?.id) === String(goal?.id)
        ));
      },
      createIfAbsent(goal) {
        return controller.mutate(async () => {
          let durable;
          await runDomainWrite(database, ["goals"], ["goals", "calendarEvents"], async ({ table }) => {
            const goalsTable = table("goals");
            const current = await goalsTable.toArray();
            const existing = current.find((item) => String(item.id) === String(goal?.id));
            durable = existing ? current : validateGoals([clone(goal), ...current]);
            validateReferences(durable, await table("calendarEvents").toArray());
            if (!existing) await goalsTable.add(durable.find((item) => String(item.id) === String(goal.id)));
          });
          return durable;
        }).then((goals) => goals.find((item) => String(item.id) === String(goal?.id)));
      },
      upsert(goal) {
        return controller.mutate((current) => persist([
          clone(goal),
          ...current.filter((item) => String(item?.id) !== String(goal?.id))
        ])).then((goals) => goals.find(
          (item) => String(item?.id) === String(goal?.id)
        ));
      },
      remove(id) {
        return controller.mutate((current) => persist(
          current.filter((goal) => String(goal?.id) !== String(id))
        )).then(() => undefined);
      },
      _replaceSnapshot(value) {
        controller.setSnapshot(clone(value));
      }
    };
    return repository;
  }

  function createIndexedDbCalendarRepository(database) {
    requireRuntime();
    const controller = root.MentorRepositoryContract.createController([]);
    async function persist(events) {
      const next = validateCalendar(events);
      await runDomainWrite(
        database,
        ["calendar"],
        ["calendarEvents", "goals"],
        async ({ table }) => {
          const goals = await table("goals").toArray();
          validateReferences(goals, next);
          await table("calendarEvents").clear();
          if (next.length) await table("calendarEvents").bulkPut(next);
        }
      );
      return next;
    }
    const repository = {
      storageKind: "indexeddb",
      initialize: () => controller.initialize(() => database.table("calendarEvents").toArray()),
      isReady: () => controller.isReady(),
      getState: () => controller.getState(),
      getSnapshot: () => controller.getSnapshot(),
      getAll: () => controller.getSnapshot(),
      getById(id) {
        return controller.getSnapshot().find(
          (event) => String(event?.id) === String(id)
        ) || null;
      },
      getByGoalId(goalId) {
        return controller.getSnapshot().filter(
          (event) => String(event?.goalId) === String(goalId)
        );
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
            throw dataError(
              "DUPLICATE_CALENDAR_EVENT_ID",
              "Calendar event ID already exists.",
              { id: event?.id }
            );
          }
          return persist([...current, clone(event)]);
        }).then((events) => events.find(
          (item) => String(item?.id) === String(event?.id)
        ));
      },
      createMany(events) {
        const additions = clone(Array.isArray(events) ? events : []);
        return controller.mutate((current) => {
          const ids = new Set(current.map((event) => String(event?.id)));
          additions.forEach((event) => {
            const id = String(event?.id);
            if (ids.has(id)) {
              throw dataError(
                "DUPLICATE_CALENDAR_EVENT_ID",
                "Calendar event ID already exists.",
                { id }
              );
            }
            ids.add(id);
          });
          return persist([...current, ...additions]);
        }).then((snapshot) => {
          const ids = new Set(additions.map((event) => String(event.id)));
          return snapshot.filter((event) => ids.has(String(event.id)));
        });
      },
      upsert(event) {
        return controller.mutate((current) => persist([
          ...current.filter((item) => String(item?.id) !== String(event?.id)),
          clone(event)
        ])).then((events) => events.find(
          (item) => String(item?.id) === String(event?.id)
        ));
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
      },
      _replaceSnapshot(value) {
        controller.setSnapshot(clone(value));
      }
    };
    return repository;
  }

  function createGoalsCalendarTransactions(database, goalsRepository, calendarRepository) {
    return Object.freeze({
      async scheduleEvents(events, materializedGoal) {
        const additions = validateCalendar(events);
        const goal = materializedGoal ? validateGoals([materializedGoal])[0] : null;
        const result = await runDomainWrite(
          database,
          goal ? ["goals", "calendar"] : ["calendar"],
          ["goals", "calendarEvents"],
          async ({ table }) => {
            const goals = await table("goals").toArray();
            const calendarEvents = await table("calendarEvents").toArray();
            if (goal) {
              if (goals.some((item) => String(item.id) === String(goal.id))) {
                throw dataError("DUPLICATE_GOAL_ID", "Goal ID already exists.", { id: goal.id });
              }
              goals.unshift(goal);
            }
            const eventIds = new Set(calendarEvents.map((event) => String(event.id)));
            additions.forEach((event) => {
              if (eventIds.has(String(event.id))) {
                throw dataError(
                  "DUPLICATE_CALENDAR_EVENT_ID",
                  "Calendar event ID already exists.",
                  { id: event.id }
                );
              }
              eventIds.add(String(event.id));
            });
            const nextEvents = [...calendarEvents, ...additions];
            validateReferences(goals, nextEvents);
            if (goal) await table("goals").put(goal);
            if (additions.length) await table("calendarEvents").bulkAdd(additions);
            return { goals, events: nextEvents, created: additions };
          }
        );
        goalsRepository._replaceSnapshot(result.goals);
        calendarRepository._replaceSnapshot(result.events);
        return clone(result.created);
      },
      async deleteGoalCascade(goalId) {
        const result = await runDomainWrite(
          database,
          ["goals", "calendar"],
          ["goals", "calendarEvents"],
          async ({ table }) => {
            const goals = (await table("goals").toArray()).filter(
              (goal) => String(goal.id) !== String(goalId)
            );
            const events = (await table("calendarEvents").toArray()).filter(
              (event) => String(event.goalId) !== String(goalId)
            );
            await table("goals").delete(goalId);
            await table("calendarEvents").where("goalId").equals(goalId).delete();
            return { goals, events };
          }
        );
        goalsRepository._replaceSnapshot(result.goals);
        calendarRepository._replaceSnapshot(result.events);
      }
    });
  }

  function validateIdeas(ideas) {
    if (!Array.isArray(ideas)) {
      throw dataError("INVALID_IDEAS_COLLECTION", "Ideas must be an array.");
    }
    const next = clone(ideas);
    const ids = next.map((idea) => String(idea?.id || ""));
    if (
      ids.some((id) => !id) ||
      ids.some((id, index) => ids.indexOf(id) !== index)
    ) {
      throw dataError(
        "INVALID_IDEAS_COLLECTION",
        "Every idea must have a unique ID."
      );
    }
    return next;
  }

  function validateComparisonRecords(records) {
    if (!Array.isArray(records)) {
      throw dataError(
        "INVALID_COMPARISONS_COLLECTION",
        "Comparisons must be an array."
      );
    }
    const next = clone(records);
    const ids = new Set();
    next.forEach((record) => {
      if (
        !record?.id ||
        !["snapshot", "option"].includes(record.recordType) ||
        ids.has(String(record.id))
      ) {
        throw dataError(
          "INVALID_COMPARISONS_COLLECTION",
          "Every comparison must have a unique ID and a supported recordType."
        );
      }
      ids.add(String(record.id));
    });
    return next;
  }

  function createIndexedDbIdeasRepository(database) {
    requireRuntime();
    const controller = root.MentorRepositoryContract.createController([]);
    async function persist(ideas) {
      const next = validateIdeas(ideas);
      await runDomainWrite(
        database,
        ["ideas"],
        ["ideas"],
        async ({ table }) => {
          await table("ideas").clear();
          if (next.length) await table("ideas").bulkPut(next);
        }
      );
      return next;
    }
    return {
      storageKind: "indexeddb",
      initialize: () => controller.initialize(() => database.table("ideas").toArray()),
      isReady: () => controller.isReady(),
      getState: () => controller.getState(),
      getSnapshot: () => controller.getSnapshot(),
      getAll: () => controller.getSnapshot(),
      getById(id) {
        return controller.getSnapshot().find(
          (idea) => String(idea?.id) === String(id)
        ) || null;
      },
      subscribe: controller.subscribe,
      replaceAll(ideas) {
        return controller.mutate(() => persist(ideas));
      },
      createIfAbsent(idea) {
        return controller.mutate(async () => {
          let durable;
          await runDomainWrite(database, ["ideas"], ["ideas"], async ({ table }) => {
            const current = await table("ideas").toArray();
            const existing = current.find(item => String(item.id) === String(idea?.id));
            durable = existing ? current : validateIdeas([clone(idea), ...current]);
            if (!existing) await table("ideas").add(durable.find(item => item.id === idea.id));
          });
          return durable;
        }).then(ideas => ideas.find(item => item.id === idea.id));
      },
      upsert(idea) {
        return controller.mutate((current) => {
          const index = current.findIndex(
            (item) => String(item?.id) === String(idea?.id)
          );
          const next = current.slice();
          if (index >= 0) next[index] = clone(idea);
          else next.push(clone(idea));
          return persist(next);
        }).then((ideas) => ideas.find(
          (item) => String(item?.id) === String(idea?.id)
        ));
      },
      remove(id) {
        return controller.mutate((current) => persist(
          current.filter((idea) => String(idea?.id) !== String(id))
        )).then(() => undefined);
      }
    };
  }

  function createIndexedDbComparisonsRepository(database, options) {
    requireRuntime();
    const cacheActive = options?.cacheActive === true;
    const empty = { snapshots: [], options: [], researchCache: {} };
    const controller = root.MentorRepositoryContract.createController(empty);

    async function load() {
      const records = validateComparisonRecords(
        await database.table("comparisons").toArray()
      );
      let researchCache = {};
      if (cacheActive) {
        try {
          const cache = await database.table("cache").get(
            "financial-comparison-research"
          );
          researchCache = cache?.value &&
            typeof cache.value === "object" &&
            !Array.isArray(cache.value)
            ? clone(cache.value)
            : {};
        } catch (error) {
          root.console?.warn?.(
            "[MentorData] Disposable comparison cache could not be read.",
            error
          );
        }
      }
      return {
        snapshots: records
          .filter((record) => record.recordType === "snapshot")
          .map(({ recordType, ...record }) => record),
        options: records
          .filter((record) => record.recordType === "option")
          .map(({ recordType, ...record }) => record),
        researchCache
      };
    }

    async function persistCanonical(current) {
      const records = validateComparisonRecords([
        ...current.snapshots.map((record) => ({
          ...clone(record),
          recordType: "snapshot"
        })),
        ...current.options.map((record) => ({
          ...clone(record),
          recordType: "option"
        }))
      ]);
      await runDomainWrite(
        database,
        ["comparisons"],
        ["comparisons"],
        async ({ table }) => {
          await table("comparisons").clear();
          if (records.length) await table("comparisons").bulkPut(records);
        }
      );
      return current;
    }

    async function persistCache(current) {
      if (!cacheActive) {
        throw dataError(
          "DISPOSABLE_CACHE_NOT_ACTIVE",
          "Comparison research cache is disabled and will be recomputed."
        );
      }
      await runDomainWrite(
        database,
        ["cache"],
        ["cache"],
        ({ table }) => table("cache").put({
          key: "financial-comparison-research",
          value: clone(current.researchCache),
          updatedAt: new Date().toISOString()
        })
      );
      return current;
    }

    return {
      storageKind: "indexeddb",
      cacheStorageKind: cacheActive ? "indexeddb" : "disabled",
      initialize: () => controller.initialize(load),
      isReady: () => controller.isReady(),
      getState: () => controller.getState(),
      getSnapshot: () => controller.getSnapshot(),
      getSnapshots(ideaId) {
        return controller.getSnapshot().snapshots.filter(
          (item) =>
            ideaId === undefined ||
            String(item?.ideaId) === String(ideaId)
        );
      },
      getOptions(ideaId) {
        return controller.getSnapshot().options.filter(
          (item) =>
            ideaId === undefined ||
            String(item?.ideaId) === String(ideaId)
        );
      },
      getResearchCache: () => controller.getSnapshot().researchCache,
      subscribe: controller.subscribe,
      saveSnapshots(items) {
        const snapshots = clone(Array.isArray(items) ? items : []);
        return controller.mutate((current) => persistCanonical({
          ...current,
          snapshots
        })).then((value) => value.snapshots);
      },
      saveOptions(items) {
        const comparisonOptions = clone(Array.isArray(items) ? items : []);
        return controller.mutate((current) => persistCanonical({
          ...current,
          options: comparisonOptions
        })).then((value) => value.options);
      },
      saveResearchCache(cache) {
        const researchCache = cache &&
          typeof cache === "object" &&
          !Array.isArray(cache)
          ? clone(cache)
          : {};
        return controller.mutate((current) => persistCache({
          ...current,
          researchCache
        })).then(() => undefined);
      },
      invalidateResearchCache(ideaId) {
        return controller.mutate((current) => {
          const researchCache = clone(current.researchCache);
          if (ideaId === undefined) {
            Object.keys(researchCache).forEach(
              (key) => delete researchCache[key]
            );
          } else {
            delete researchCache[String(ideaId)];
            if (
              researchCache.ideas &&
              typeof researchCache.ideas === "object"
            ) {
              delete researchCache.ideas[String(ideaId)];
            }
          }
          return persistCache({ ...current, researchCache });
        }).then(() => undefined);
      }
    };
  }

  function isRecord(value) {
    return Boolean(
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }

  function validateFinanceDocuments(records) {
    if (!Array.isArray(records)) {
      throw dataError(
        "INVALID_FINANCE_DOCUMENTS",
        "Finance documents must be an array."
      );
    }
    const documents = clone(records);
    const ids = documents.map((record) => String(record?.id || ""));
    if (
      ids.some((id) => !id) ||
      ids.some((id, index) => ids.indexOf(id) !== index) ||
      documents.some((record) =>
        ![
          "finance-state",
          "transaction-import-templates"
        ].includes(record.id)
      )
    ) {
      throw dataError(
        "INVALID_FINANCE_DOCUMENTS",
        "Finance documents must use unique canonical IDs."
      );
    }
    const state = documents.find(
      (record) => record.id === "finance-state"
    );
    const templates = documents.find(
      (record) => record.id === "transaction-import-templates"
    );
    if (
      state && state.type !== "financeState" ||
      templates && (
        templates.type !== "importTemplates" ||
        !Array.isArray(templates.templates)
      )
    ) {
      throw dataError(
        "INVALID_FINANCE_DOCUMENTS",
        "Finance documents do not match the canonical document shapes."
      );
    }
    return documents;
  }

  function createIndexedDbFinanceRepository(database) {
    requireRuntime();
    const empty = { state: {}, importTemplates: [] };
    const controller = root.MentorRepositoryContract.createController(empty);

    async function load() {
      const documents = validateFinanceDocuments(
        await database.table("financeDocuments").toArray()
      );
      const stateDocument = documents.find(
        (record) => record.id === "finance-state"
      );
      const templatesDocument = documents.find(
        (record) => record.id === "transaction-import-templates"
      );
      const state = stateDocument
        ? (({ id, type, ...value }) => value)(stateDocument)
        : {};
      return {
        state,
        importTemplates: templatesDocument
          ? clone(templatesDocument.templates)
          : []
      };
    }

    return {
      storageKind: "indexeddb",
      initialize: () => controller.initialize(load),
      isReady: () => controller.isReady(),
      getStateStatus: () => controller.getState(),
      getSnapshot: () => controller.getSnapshot(),
      getState: () => controller.getSnapshot().state,
      getImportTemplates: () =>
        controller.getSnapshot().importTemplates,
      subscribe: controller.subscribe,
      saveState(state) {
        const next = isRecord(state) ? clone(state) : {};
        return controller.mutate(async (current) => {
          await runDomainWrite(
            database,
            ["finance"],
            ["financeDocuments"],
            ({ table }) => table("financeDocuments").put({
              ...next,
              id: "finance-state",
              type: "financeState"
            })
          );
          return { ...current, state: next };
        }).then((snapshot) => snapshot.state);
      },
      saveImportTemplates(templates) {
        const next = Array.isArray(templates) ? clone(templates) : [];
        return controller.mutate(async (current) => {
          await runDomainWrite(
            database,
            ["finance"],
            ["financeDocuments"],
            async ({ table }) => {
              const existing = await table("financeDocuments").get(
                "transaction-import-templates"
              );
              await table("financeDocuments").put({
                ...(existing || {}),
                id: "transaction-import-templates",
                type: "importTemplates",
                templates: next
              });
            }
          );
          return { ...current, importTemplates: next };
        }).then((snapshot) => snapshot.importTemplates);
      }
    };
  }

  function validateAssetRecords(records) {
    if (!Array.isArray(records)) {
      throw dataError(
        "INVALID_ASSET_COLLECTION",
        "Assets must be an array."
      );
    }
    const next = clone(records);
    const ids = new Set();
    next.forEach((record) => {
      if (
        !record?.id ||
        !["asset", "debt"].includes(record.recordType) ||
        ids.has(String(record.id))
      ) {
        throw dataError(
          "INVALID_ASSET_COLLECTION",
          "Every asset or debt must have a unique ID and recordType."
        );
      }
      ids.add(String(record.id));
    });
    return next;
  }

  function createIndexedDbAssetsRepository(database) {
    requireRuntime();
    const empty = { assets: [], debts: [] };
    const controller = root.MentorRepositoryContract.createController(empty);

    async function load() {
      const records = validateAssetRecords(
        await database.table("assets").toArray()
      );
      return {
        assets: records
          .filter((record) => record.recordType === "asset")
          .map(({ recordType, ...record }) => record),
        debts: records
          .filter((record) => record.recordType === "debt")
          .map(({ recordType, ...record }) => record)
      };
    }

    async function persist(value) {
      const assets = Array.isArray(value?.assets)
        ? clone(value.assets)
        : [];
      const debts = Array.isArray(value?.debts)
        ? clone(value.debts)
        : [];
      const records = validateAssetRecords([
        ...assets.map((record) => ({
          ...record,
          recordType: "asset"
        })),
        ...debts.map((record) => ({
          ...record,
          recordType: "debt"
        }))
      ]);
      await runDomainWrite(
        database,
        ["assets"],
        ["assets"],
        async ({ table }) => {
          await table("assets").clear();
          if (records.length) await table("assets").bulkPut(records);
        }
      );
      return { assets, debts };
    }

    return {
      storageKind: "indexeddb",
      initialize: () => controller.initialize(load),
      isReady: () => controller.isReady(),
      getState: () => controller.getState(),
      getSnapshot: () => controller.getSnapshot(),
      getAssets: () => controller.getSnapshot().assets,
      getDebts: () => controller.getSnapshot().debts,
      subscribe: controller.subscribe,
      saveState(value) {
        return controller.mutate(() => persist(value));
      }
    };
  }

  function requireNutritionStorageService(kind) {
    const service = kind === "food"
      ? root.MentorNutritionFoodStorage
      : root.MentorNutritionInventoryStorage;
    if (!service) {
      throw dataError(
        "NUTRITION_STORAGE_UNAVAILABLE",
        `Nutrition ${kind} storage validation service is not loaded.`
      );
    }
    return service;
  }

  function validateNutritionEnvelope(kind, value, touchUpdatedAt) {
    const service = requireNutritionStorageService(kind);
    const envelope = service.normalize(clone(value));
    if (touchUpdatedAt) envelope.updatedAt = new Date().toISOString();
    const errors = service.validate(envelope);
    if (errors.length) {
      throw dataError(
        kind === "food"
          ? "NUTRITION_STORAGE_VALIDATION_FAILED"
          : "INVENTORY_STORAGE_VALIDATION_FAILED",
        `Nutrition ${kind} storage validation failed.`,
        errors
      );
    }
    return envelope;
  }

  async function loadNutritionEnvelope(database, storeName, kind) {
    const record = await database.table(storeName).get("current");
    if (!record || record.id !== "current" || !isRecord(record.envelope)) {
      throw dataError(
        "INDEXEDDB_NUTRITION_ENVELOPE_MISSING",
        `Verified Nutrition ${kind} envelope is missing from IndexedDB.`,
        { storeName }
      );
    }
    return validateNutritionEnvelope(kind, record.envelope, false);
  }

  function createIndexedDbNutritionFoodDataRepository(database) {
    requireRuntime();
    const controller = root.MentorRepositoryContract.createController(null);
    return {
      storageKind: "indexeddb",
      initialize: () => controller.initialize(
        () => loadNutritionEnvelope(
          database,
          "nutritionFoodData",
          "food"
        )
      ),
      isReady: () => controller.isReady(),
      getState: () => controller.getState(),
      getSnapshot: () => controller.getSnapshot(),
      getEnvelope: () => controller.getSnapshot(),
      validate(envelope) {
        return requireNutritionStorageService("food").validate(envelope);
      },
      subscribe: controller.subscribe,
      mutateEnvelope(mutator) {
        let result;
        return controller.mutate(async () => {
          let envelope;
          await runDomainWrite(database, ["nutritionFoodData"], ["nutritionFoodData"], async ({ table }) => {
            const record = await table("nutritionFoodData").get("current");
            envelope = validateNutritionEnvelope("food", record?.envelope, false);
            result = mutator(envelope);
            if (result && typeof result.then === "function") throw dataError("ASYNC_DOMAIN_MUTATION", "Domain mutation must be synchronous.");
            envelope = validateNutritionEnvelope("food", envelope, true);
            await table("nutritionFoodData").put({ id: "current", envelope });
          });
          return envelope;
        }).then(envelope => {
          try { root.dispatchEvent?.(new CustomEvent("mentor:nutrition-foodschange", { detail: { envelope: clone(envelope) } })); }
          catch (error) { root.console?.warn?.("[Nutrition] Food refresh notification failed.", error); }
          return clone(result);
        });
      },
      saveEnvelope(value) {
        return controller.mutate(async () => {
          const envelope = validateNutritionEnvelope(
            "food",
            value,
            true
          );
          await runDomainWrite(
            database,
            ["nutritionFoodData"],
            ["nutritionFoodData"],
            ({ table }) => table("nutritionFoodData").put({
              id: "current",
              envelope
            })
          );
          root.dispatchEvent?.(new CustomEvent(
            "mentor:nutrition-foodschange",
            { detail: { envelope: clone(envelope) } }
          ));
          return envelope;
        });
      }
    };
  }

  function createIndexedDbNutritionInventoryDataRepository(database) {
    requireRuntime();
    const controller = root.MentorRepositoryContract.createController(null);
    return {
      storageKind: "indexeddb",
      initialize: () => controller.initialize(
        () => loadNutritionEnvelope(
          database,
          "nutritionInventoryData",
          "inventory"
        )
      ),
      isReady: () => controller.isReady(),
      getState: () => controller.getState(),
      getSnapshot: () => controller.getSnapshot(),
      getEnvelope: () => controller.getSnapshot(),
      validate(envelope) {
        return requireNutritionStorageService("inventory")
          .validate(envelope);
      },
      subscribe: controller.subscribe,
      mutateEnvelope(mutator) {
        let result;
        return controller.mutate(async () => {
          let envelope;
          await runDomainWrite(database, ["nutritionInventoryData"], ["nutritionInventoryData", "nutritionFoodData"], async ({ table }) => {
            const record = await table("nutritionInventoryData").get("current");
            envelope = validateNutritionEnvelope("inventory", record?.envelope, true);
            const foods = await table("nutritionFoodData").get("current");
            result = mutator(envelope, { foodEnvelope: foods?.envelope });
            if (result && typeof result.then === "function") throw dataError("ASYNC_DOMAIN_MUTATION", "Domain mutation must be synchronous.");
            envelope = validateNutritionEnvelope("inventory", envelope, true);
            await table("nutritionInventoryData").put({ id: "current", envelope });
          });
          return envelope;
        }).then(envelope => {
          try { root.dispatchEvent?.(new CustomEvent("mentor:nutrition-inventorychange", { detail: { envelope: clone(envelope) } })); }
          catch (error) { root.console?.warn?.("[Nutrition] Inventory refresh notification failed.", error); }
          return clone(result);
        });
      },
      saveEnvelope(value) {
        return controller.mutate(async () => {
          const envelope = validateNutritionEnvelope(
            "inventory",
            value,
            true
          );
          await runDomainWrite(
            database,
            ["nutritionInventoryData"],
            ["nutritionInventoryData"],
            ({ table }) => table("nutritionInventoryData").put({
              id: "current",
              envelope
            })
          );
          try {
            root.dispatchEvent?.(new CustomEvent(
              "mentor:nutrition-inventorychange",
              { detail: { envelope: clone(envelope) } }
            ));
          } catch (error) {
            root.console?.warn?.(
              "[Nutrition] Inventory refresh notification failed.",
              error
            );
          }
          return envelope;
        });
      },
      migrateLegacyIfNeeded() {
        // Legacy transforms are completed and verified before this repository
        // can be selected. The active IDB path never re-reads legacy storage.
        return Promise.resolve(controller.getSnapshot());
      }
    };
  }

  function createIndexedDbMediaRepository(database) {
    requireRuntime();
    let ready = false;
    const helper = () => root.MentorNutritionFoodImageStorage;
    const requireHelper = () => {
      if (!helper()) {
        throw dataError(
          "MEDIA_STORAGE_UNAVAILABLE",
          "Nutrition media preparation service is not loaded."
        );
      }
      return helper();
    };
    const entityKey = (entityType, entityId) =>
      `${entityType}-image:${entityId}`;

    async function getEntity(entityType, entityId) {
      const byIndex = await database.table("media")
        .where("[entityType+entityId]")
        .equals([entityType, entityId])
        .first();
      return byIndex || await database.table("media").get(
        entityKey(entityType, entityId)
      ) || null;
    }

    async function put(record) {
      if (
        !record?.id ||
        !record?.entityType ||
        !record?.entityId ||
        !record?.blob
      ) {
        throw dataError(
          "INVALID_MEDIA_RECORD",
          "Media record is incomplete."
        );
      }
      const next = clone(record);
      await runDomainWrite(
        database,
        ["media"],
        ["media"],
        ({ table }) => table("media").put(next)
      );
      return next;
    }

    async function saveEntity(entityType, entityId, file) {
      const api = requireHelper();
      const record = await api.prepareEntityRecord(
        entityType,
        entityId,
        file
      );
      await put(record);
      return api.metadataForRecord(record);
    }

    async function removeEntity(entityType, entityId) {
      const existing = await getEntity(entityType, entityId);
      if (!existing) return;
      await runDomainWrite(
        database,
        ["media"],
        ["media"],
        ({ table }) => table("media").delete(existing.id)
      );
    }

    async function restoreEntity(entityType, entityId, record) {
      if (!record) {
        await removeEntity(entityType, entityId);
        return;
      }
      const restored = {
        ...clone(record),
        id: entityKey(entityType, entityId),
        entityType,
        entityId
      };
      if (entityType === "food") restored.foodId = entityId;
      await put(restored);
      return true;
    }

    async function objectUrlEntity(entityType, entityId, thumbnail) {
      const record = await getEntity(entityType, entityId);
      const blob = thumbnail ? record?.thumbnail : record?.blob;
      return blob ? root.URL.createObjectURL(blob) : null;
    }

    async function resolveEntityUrl(
      entityType,
      entityId,
      metadata,
      thumbnail
    ) {
      return metadata?.storage === "url"
        ? metadata.url
        : objectUrlEntity(entityType, entityId, thumbnail);
    }

    const repository = {
      storageKind: "indexeddb",
      async initialize() {
        requireHelper();
        ready = true;
      },
      isReady: () => ready,
      validate(file) { return requireHelper().validate(file); },
      getEntity,
      put,
      saveEntity,
      removeEntity,
      restoreEntity,
      objectUrlEntity,
      urlMetadata(url) { return requireHelper().urlMetadata(url); },
      resolveEntityUrl,
      revokeObjectUrl(url) {
        return requireHelper().revokeObjectUrl(url);
      },
      save(foodId, file) {
        return saveEntity("food", foodId, file);
      },
      get(foodId) { return getEntity("food", foodId); },
      remove(foodId) { return removeEntity("food", foodId); },
      restore(foodId, record) {
        return restoreEntity("food", foodId, record);
      },
      objectUrl(foodId, thumbnail) {
        return objectUrlEntity("food", foodId, thumbnail);
      },
      resolveUrl(foodId, metadata, thumbnail) {
        return resolveEntityUrl(
          "food",
          foodId,
          metadata,
          thumbnail
        );
      },
      async exportAll() {
        throw dataError(
          "MEDIA_EXPORT_PHASE0_ONLY",
          "Complete media export remains owned by the backup service."
        );
      }
    };
    return repository;
  }

  namespace.IndexedDbCoreRepositories = Object.freeze({
    readSelection,
    runDomainWrite,
    createSettingsRepository: createIndexedDbSettingsRepository,
    createGoalsRepository: createIndexedDbGoalsRepository,
    createCalendarRepository: createIndexedDbCalendarRepository,
    createGoalsCalendarTransactions,
    createIdeasRepository: createIndexedDbIdeasRepository,
    createComparisonsRepository: createIndexedDbComparisonsRepository,
    createFinanceRepository: createIndexedDbFinanceRepository,
    createAssetsRepository: createIndexedDbAssetsRepository,
    createNutritionFoodDataRepository:
      createIndexedDbNutritionFoodDataRepository,
    createNutritionInventoryDataRepository:
      createIndexedDbNutritionInventoryDataRepository,
    createMediaRepository: createIndexedDbMediaRepository
  });
})(typeof window !== "undefined" ? window : globalThis);
