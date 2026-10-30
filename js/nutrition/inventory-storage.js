(function () {
  "use strict";

  const KEY = "mentor_nutrition_inventory_v1";
  const STAGING_KEY = `${KEY}_staging`;
  const BACKUP_KEY = `${KEY}_backup`;
  const LEGACY_BACKUP_KEY = `${KEY}_legacy_backup`;
  const LEGACY_KEYS = ["mentor_nutrition_fridge_v1", "mentor_nutrition_stock_v1"];
  const VERSION = 1;
  const COLLECTIONS = ["batches", "locations", "allocations", "preferences", "stores", "recipes", "mealPlanEntries", "shoppingItems", "recipeFavoriteIds", "migrations"];
  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const empty = () => ({ version: VERSION, updatedAt: null, batches: [], locations: [], allocations: [], preferences: [], stores: [], recipes: [], mealPlanEntries: [], shoppingItems: [], recipeFavoriteIds: [], migrations: [] });

  function normalize(value) {
    const result = { ...empty(), ...(value && typeof value === "object" ? value : {}) };
    COLLECTIONS.forEach((key) => { result[key] = Array.isArray(result[key]) ? result[key] : []; });
    result.version = VERSION;
    return result;
  }

  function validate(value) {
    const errors = [];
    if (!value || typeof value !== "object") return [{ code: "inventory.storage.invalid" }];
    COLLECTIONS.forEach((key) => { if (!Array.isArray(value[key])) errors.push({ code: `inventory.storage.${key}.invalid` }); });
    if (Array.isArray(value.recipeFavoriteIds) && value.recipeFavoriteIds.some((id) => typeof id !== "string" || !id)) errors.push({ code: "inventory.storage.recipeFavoriteIds.invalid" });
    const ids = new Set();
    ["batches", "locations", "allocations", "stores", "shoppingItems"].forEach((collection) => {
      (value[collection] || []).forEach((item) => {
        if (!item?.id) errors.push({ collection, code: "inventory.id.required" });
        else if (ids.has(`${collection}:${item.id}`)) errors.push({ collection, id: item.id, code: "inventory.id.duplicate" });
        ids.add(`${collection}:${item.id}`);
      });
    });
    return errors;
  }

  function read(key) {
    try {
      const raw = window.localStorage?.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (![1].includes(Number(parsed?.version))) return null;
      const envelope = normalize(parsed);
      return validate(envelope).length ? null : envelope;
    } catch (_) { return null; }
  }

  function load() {
    const primary = read(KEY);
    if (primary) return clone(primary);
    const backup = read(BACKUP_KEY);
    if (backup) { console.warn("[Nutrition] Inventory recovered from backup."); return clone(backup); }
    if (window.localStorage?.getItem(KEY)) console.error("[Nutrition] Invalid inventory payload was preserved.");
    return empty();
  }

  function save(value) {
    const envelope = normalize(clone(value));
    envelope.updatedAt = new Date().toISOString();
    const errors = validate(envelope);
    if (errors.length) {
      const error = new Error("Inventory storage validation failed.");
      error.code = "INVENTORY_STORAGE_VALIDATION_FAILED";
      error.details = errors;
      throw error;
    }
    const serialized = JSON.stringify(envelope);
    const storage = window.localStorage;
    if (!storage) throw new Error("Inventory storage is unavailable.");
    try {
      const previous = storage.getItem(KEY);
      if (previous) storage.setItem(BACKUP_KEY, previous);
      storage.setItem(STAGING_KEY, serialized);
      if (storage.getItem(STAGING_KEY) !== serialized) throw new Error("Inventory staging verification failed.");
      storage.setItem(KEY, serialized);
      if (storage.getItem(KEY) !== serialized) throw new Error("Inventory primary verification failed.");
      storage.removeItem(STAGING_KEY);
    } catch (transactionError) {
      try { storage.removeItem(STAGING_KEY); } catch (_) { /* no-op */ }
      if (storage.getItem(KEY) !== serialized) {
        try {
          // Replacing one Web Storage value is atomic. This lower-space fallback
          // avoids requiring backup, staging, and primary copies at the same time.
          storage.setItem(KEY, serialized);
          if (storage.getItem(KEY) !== serialized) throw new Error("Inventory primary verification failed.");
        } catch (directError) {
          directError.transactionError = transactionError;
          throw directError;
        }
      }
    }
    try {
      window.dispatchEvent?.(new CustomEvent("mentor:nutrition-inventorychange", { detail: { envelope: clone(envelope) } }));
    } catch (error) {
      // Persistence already succeeded. A refresh listener must not turn a
      // successful create/update into a misleading save failure.
      console.warn("[Nutrition] Inventory refresh notification failed.", error);
    }
    return clone(envelope);
  }

  function migrateLegacy(resolveFoodId) {
    const envelope = load();
    if (envelope.migrations.some((item) => item.id === "legacy-fridge-v1")) return envelope;
    const candidates = [];
    let foundLegacyPayload = false;
    let invalidLegacyPayload = false;
    LEGACY_KEYS.forEach((key) => {
      try {
        const raw = window.localStorage?.getItem(key);
        if (!raw) return;
        foundLegacyPayload = true;
        const parsed = JSON.parse(raw);
        const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : Array.isArray(parsed?.stock) ? parsed.stock : [];
        candidates.push(...rows.map((item, index) => ({ key, item, index })));
        if (!window.localStorage?.getItem(LEGACY_BACKUP_KEY)) window.localStorage?.setItem(LEGACY_BACKUP_KEY, raw);
      } catch (error) { invalidLegacyPayload = true; console.warn("[Nutrition] Legacy inventory migration skipped invalid data.", error); }
    });
    if (!foundLegacyPayload) return envelope;
    const existingLegacyIds = new Set(envelope.batches.map((item) => item.legacyId).filter(Boolean));
    const stamp = new Date().toISOString();
    let importedCount = 0;
    candidates.forEach(({ key, item, index }) => {
      const legacyId = `${key}:${item.id ?? item.stockId ?? `index-${index}`}`;
      if (!item || existingLegacyIds.has(legacyId)) return;
      const foodId = resolveFoodId?.(item.foodId || item.food_id || item.id, item.name || item.foodName);
      const quantity = Number(item.quantity ?? item.amount);
      envelope.batches.push({
        id: window.MentorNutritionId.create("inventory_batch"), foodId: foodId || null,
        legacyFoodName: foodId ? null : String(item.name || item.foodName || "").trim() || null,
        needsFoodLink: !foodId, locationId: item.locationId || null,
        quantity: Number.isFinite(quantity) && quantity >= 0 ? quantity : 0,
        initialQuantity: Number.isFinite(quantity) && quantity >= 0 ? quantity : 0,
        unit: item.unit || "kom", addedAt: item.addedAt || stamp, expiryDate: item.expiryDate || null,
        note: item.note || null, status: item.status || "available", createdAt: item.createdAt || stamp,
        updatedAt: stamp, legacyId
      });
      existingLegacyIds.add(legacyId);
      importedCount += 1;
    });
    if (!invalidLegacyPayload) envelope.migrations.push({ id: "legacy-fridge-v1", version: 1, appliedAt: stamp, importedCount });
    return save(envelope);
  }

  window.MentorNutritionInventoryStorage = { KEY, VERSION, createEmpty: empty, normalize, validate, load, save, migrateLegacy };
})();
