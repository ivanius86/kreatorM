(function () {
  "use strict";

  const dataRepository = () => window.MentorData?.repositories?.nutritionInventoryData;
  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const defaults = [
    { id: "location_fridge", name: "Frižider", icon: "fridge", builtInKey: "fridge" },
    { id: "location_freezer", name: "Zamrzivač", icon: "snowflake", builtInKey: "freezer" },
    { id: "location_pantry", name: "Ostava", icon: "box", builtInKey: "pantry" }
  ];
  let initialized = false;
  let initializePromise = null;

  function resolveLegacyFoodId(id, name) {
    const repository = window.MentorFoodRepository;
    if (id && repository?.getById(id)) return id;
    const normalized = String(name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase();
    if (!normalized) return null;
    const exact = repository?.getAll?.().filter((food) => {
      const candidates = [food.defaultName, food.names?.sr, food.names?.en].filter(Boolean);
      return candidates.some((candidate) => String(candidate).normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase() === normalized);
    }) || [];
    return exact.length === 1 ? exact[0].id : null;
  }

  function initialize() {
    if (initialized) return Promise.resolve();
    if (initializePromise) return initializePromise;
    initializePromise = Promise.resolve()
      .then(() => dataRepository().initialize())
      .then(() => dataRepository().migrateLegacyIfNeeded(resolveLegacyFoodId))
      .then(() => {
        if (defaults.every((location) => dataRepository().getEnvelope().locations.some((item) => item.id === location.id))) return;
        return dataRepository().mutateEnvelope((envelope) => {
          const stamp = new Date().toISOString();
          defaults.forEach((location) => {
            if (!envelope.locations.some((item) => item.id === location.id)) envelope.locations.push({ ...location, createdAt: stamp, updatedAt: stamp });
          });
        });
      })
      .then(async () => {
        const key = "mentor_nutrition_plan_favorites_v1";
        const envelope = dataRepository().getEnvelope();
        if (envelope.migrations.some((item) => item?.id === "legacy-plan-favorites-v1")) return;
        let raw;
        try { raw = window.localStorage?.getItem(key); } catch (_) { return; }
        if (raw === null || raw === undefined) return;
        let ids;
        try { ids = JSON.parse(raw); } catch (_) { return; }
        if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string" || !id)) return;
        await dataRepository().mutateEnvelope((current) => {
          if (current.migrations.some((item) => item?.id === "legacy-plan-favorites-v1")) return;
          const before = current.recipeFavoriteIds?.length || 0;
          current.recipeFavoriteIds = [...new Set([...(current.recipeFavoriteIds || []), ...ids])];
          current.migrations.push({ id: "legacy-plan-favorites-v1", version: 1, appliedAt: new Date().toISOString(), importedCount: current.recipeFavoriteIds.length - before });
        });
      })
      .then(() => { initialized = true; })
      .catch((error) => {
        initializePromise = null;
        console.error("[Nutrition] Inventory initialization failed.", error);
        throw error;
      });
    return initializePromise;
  }

  function read() {
    if (!initialized) throw new Error("NUTRITION_INVENTORY_REPOSITORY_NOT_READY");
    // The data repository keeps its last durable snapshot after a failed write.
    // Its own hydration guard also permits a safe read/retry in that state.
    return dataRepository().getEnvelope();
  }
  function mutate(callback) {
    read();
    return dataRepository().mutateEnvelope(callback);
  }
  const all = (collection) => clone(read()[collection]);
  const byId = (collection, id) => all(collection).find((item) => item.id === id) || null;

  function createLocation(record) {
    return mutate((envelope) => {
      const stamp = new Date().toISOString();
      const location = { id: record.id || window.MentorNutritionId.create("location"), name: String(record.name || "").trim(), icon: record.icon || "box", createdAt: stamp, updatedAt: stamp };
      if (!location.name) throw new Error("LOCATION_NAME_REQUIRED");
      if (envelope.locations.some((item) => item.id === location.id)) throw new Error("LOCATION_ALREADY_EXISTS");
      envelope.locations.push(location);
      return location;
    });
  }

  function removeLocation(id) {
    return mutate((envelope) => {
      const location = envelope.locations.find((item) => item.id === id && !item.deletedAt);
      if (!location) throw new Error("LOCATION_NOT_FOUND");
      if (envelope.batches.some((batch) => batch.locationId === id)) throw new Error("LOCATION_IN_USE");
      if (envelope.locations.filter((item) => !item.deletedAt).length <= 1) throw new Error("LOCATION_LAST_REMAINING");
      // Keep a tombstone so initialization does not recreate a removed built-in location.
      location.deletedAt = new Date().toISOString();
      location.updatedAt = location.deletedAt;
      envelope.preferences.forEach((preference) => {
        if (preference.preferredLocationId !== id) return;
        preference.preferredLocationId = null;
        preference.updatedAt = location.deletedAt;
      });
      return true;
    });
  }

  function createBatch(record) {
    return mutate((envelope) => {
      const stamp = new Date().toISOString();
      const batch = { ...clone(record), id: record.id || window.MentorNutritionId.create("inventory_batch"), createdAt: record.createdAt || stamp, updatedAt: stamp };
      if (envelope.batches.some((item) => item.id === batch.id)) throw new Error("INVENTORY_BATCH_ALREADY_EXISTS");
      envelope.batches.push(batch);
      return batch;
    });
  }

  function updateBatch(id, patch) {
    return mutate((envelope) => {
      const index = envelope.batches.findIndex((item) => item.id === id);
      if (index < 0) throw new Error("INVENTORY_BATCH_NOT_FOUND");
      const changes = typeof patch === "function" ? patch(clone(envelope.batches[index]), envelope) : patch;
      envelope.batches[index] = { ...envelope.batches[index], ...clone(changes), id, createdAt: envelope.batches[index].createdAt, updatedAt: new Date().toISOString() };
      return envelope.batches[index];
    });
  }

  function removeBatch(id) {
    return mutate((envelope) => {
      const exists = envelope.batches.some((item) => item.id === id);
      if (!exists) throw new Error("INVENTORY_BATCH_NOT_FOUND");
      envelope.batches = envelope.batches.filter((item) => item.id !== id);
      envelope.allocations = envelope.allocations.map((item) => item.inventoryBatchId === id && ["reserved", "partially_reserved", "planned"].includes(item.status) ? { ...item, status: "released", updatedAt: new Date().toISOString() } : item);
      return true;
    });
  }

  window.MentorInventoryRepository = {
    initialize, read, mutate,
    getBatches: () => all("batches"), getBatchById: (id) => byId("batches", id), createBatch, updateBatch, removeBatch,
    getLocations: () => all("locations").filter((item) => !item.deletedAt), getLocationById: (id) => all("locations").find((item) => item.id === id && !item.deletedAt) || null, createLocation, removeLocation,
    getAllocations: () => all("allocations"), getAllocationById: (id) => byId("allocations", id),
    getPreferences: () => all("preferences"), getStores: () => all("stores"),
    setPreference(preference) {
      return mutate((envelope) => {
        const index = envelope.preferences.findIndex((item) => item.foodId === preference.foodId);
        const next = { ...(index >= 0 ? envelope.preferences[index] : {}), ...clone(preference), foodId: preference.foodId, updatedAt: new Date().toISOString() };
        if (index >= 0) envelope.preferences[index] = next; else envelope.preferences.push(next);
        return next;
      });
    }
  };
})();
