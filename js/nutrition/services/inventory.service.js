(function () {
  "use strict";

  const repo = () => window.MentorInventoryRepository;
  const units = () => window.MentorNutritionUnitConversion;
  const ACTIVE_ALLOCATION_STATUSES = ["planned", "reserved", "partially_reserved", "missing"];
  const CONTENT_UNITS = ["g", "kg", "ml", "l", "kom"];
  const ALLOWED_PACKAGE_TYPES = ["package", "box", "bag", "jar", "can", "bottle"];
  const ALLOWED_UNITS = [...CONTENT_UNITS, ...ALLOWED_PACKAGE_TYPES];
  const round = (value) => Math.round((Number(value) + Number.EPSILON) * 1000) / 1000;
  const pad2 = (value) => String(value).padStart(2, "0");
  function dateOrNull(input) {
    if (input === "" || input == null) return null;
    const text = String(input).trim();
    if (!text) return null;
    let year, month, day;
    let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/);
    if (match) [, year, month, day] = match;
    else {
      match = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/);
      if (!match) return NaN;
      [, day, month, year] = match;
      if (String(year).length === 2) year = `20${year}`;
    }
    year = Number(year); month = Number(month); day = Number(day);
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime()) || date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) return NaN;
    return `${year}-${pad2(month)}-${pad2(day)}`;
  }
  const dateOnly = (value) => {
    const date = dateOrNull(value);
    return typeof date === "string" ? new Date(`${date}T00:00:00`) : null;
  };
  function decimalOrNull(input) {
    if (input === "" || input == null) return null;
    const text = String(input).trim().replace(/\s/g, "");
    if (!text) return null;
    const comma = text.lastIndexOf(",");
    const dot = text.lastIndexOf(".");
    let normalized = text;
    if (comma >= 0 && dot >= 0) normalized = comma > dot ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
    else if (comma >= 0) normalized = text.replace(",", ".");
    const number = Number(normalized);
    return Number.isFinite(number) ? number : NaN;
  }
  async function resyncPlanning() {
    try { return await window.MentorPlanningService?.resyncActiveReservations?.(); }
    catch (error) { console.warn("[Nutrition] Planning resync after inventory change failed.", error); return null; }
  }
  let foodCache = null;

  function foodIndex() {
    if (foodCache) return foodCache;
    foodCache = new Map((window.MentorFoodRepository?.getAll?.() || []).map((food) => [food.id, food]));
    return foodCache;
  }
  function getFood(foodId) { return foodIndex().get(foodId) || null; }
  function foodForWrite(foodId, context) {
    if (context?.foodEnvelope) return context.foodEnvelope.userFoods.find((food) => food.id === foodId)
      || window.MentorNutritionFoodSeed?.foods?.find((food) => food.id === foodId) || null;
    return window.MentorFoodRepository?.getById?.(foodId) || getFood(foodId);
  }
  function preference(foodId) { return repo().getPreferences().find((item) => item.foodId === foodId) || null; }
  function allocationsForBatch(batchId) { return repo().getAllocations().filter((item) => item.inventoryBatchId === batchId && ACTIVE_ALLOCATION_STATUSES.includes(item.status)); }
  function reservedForBatch(batchId, unit) {
    return round(allocationsForBatch(batchId).reduce((sum, item) => {
      try { return sum + units().convert(Number(item.reservedQuantity) || 0, item.unit, unit); }
      catch (_) { return sum; }
    }, 0));
  }
  function availableForBatch(batch) { return round(Math.max(0, Number(batch.quantity) - reservedForBatch(batch.id, batch.unit))); }

  function statusForBatch(batch) {
    if (Number(batch.quantity) <= 0 || batch.status === "consumed") return "consumed";
    const today = dateOnly(new Date().toISOString());
    const expiry = dateOnly(batch.expiryDate);
    if (expiry) {
      const days = Math.round((expiry - today) / 86400000);
      if (days < 0) return "expired";
      if (days === 0) return "expires_today";
      if (days <= 7) return "expiring_soon";
    }
    const pref = preference(batch.foodId);
    if (pref?.minimumQuantity != null && units().isCompatible(batch.unit, pref.unit || batch.unit)) {
      const minimum = units().convert(pref.minimumQuantity, pref.unit || batch.unit, batch.unit);
      const today = dateOnly(new Date().toISOString());
      const totalAvailable = repo().getBatches().filter((item) => item.foodId === batch.foodId && Number(item.quantity) > 0 && (!dateOnly(item.expiryDate) || dateOnly(item.expiryDate) >= today) && units().isCompatible(item.unit, batch.unit)).reduce((sum,item)=>sum+units().convert(availableForBatch(item),item.unit,batch.unit),0);
      if (totalAvailable < minimum) return "low";
    }
    if (batch.openedDate) return "opened";
    if (reservedForBatch(batch.id, batch.unit) >= Number(batch.quantity)) return "reserved";
    return batch.status === "reserved" ? "reserved" : "available";
  }

  function validateDraft(value = {}, existingId, envelope, context) {
    const errors = [];
    const food = envelope ? foodForWrite(value.foodId, context) : getFood(value.foodId);
    const location = envelope ? envelope.locations.find((item) => item.id === value.locationId && !item.deletedAt) : repo().getLocationById(value.locationId);
    if (!value.foodId) errors.push({ field: "foodId", code: "required" });
    else if (!food) errors.push({ field: "foodId", code: "foodMissing" });
    if (!value.locationId) errors.push({ field: "locationId", code: "required" });
    else if (!location) errors.push({ field: "locationId", code: "locationMissing" });
    const packageType = units().normalizeUnit(value.unit);
    const isPackage = ALLOWED_PACKAGE_TYPES.includes(packageType);
    const packageCount = decimalOrNull(isPackage ? value.quantity : value.packageCount);
    const packageSize = decimalOrNull(value.packageSize);
    let quantity = decimalOrNull(value.quantity);
    let unit = units().normalizeUnit(value.unit || value.packageUnit);
    if (isPackage || packageCount != null || packageSize != null) {
      if (!(packageCount > 0)) errors.push({ field: isPackage ? "quantity" : "packageCount", code: "positive" });
      if (!(packageSize > 0)) errors.push({ field: "packageSize", code: "positive" });
      if (!CONTENT_UNITS.includes(units().normalizeUnit(value.packageUnit))) errors.push({ field: "packageUnit", code: "unit" });
      if (!errors.some((item) => ["quantity", "packageCount", "packageSize", "packageUnit"].includes(item.field))) {
        quantity = round(packageCount * packageSize);
        unit = units().normalizeUnit(value.packageUnit);
      }
    }
    if (!Number.isFinite(quantity) || !(quantity > 0)) errors.push({ field: "quantity", code: "positive" });
    if (!ALLOWED_UNITS.includes(unit)) errors.push({ field: "unit", code: "unit" });
    const purchaseValue = dateOrNull(value.purchaseDate), expiryValue = dateOrNull(value.expiryDate), openedValue = dateOrNull(value.openedDate), addedValue = dateOrNull(value.addedAt);
    if (Number.isNaN(purchaseValue)) errors.push({ field: "purchaseDate", code: "date" });
    if (Number.isNaN(expiryValue)) errors.push({ field: "expiryDate", code: "date" });
    if (Number.isNaN(openedValue)) errors.push({ field: "openedDate", code: "date" });
    if (Number.isNaN(addedValue)) errors.push({ field: "addedAt", code: "date" });
    const purchase = dateOnly(value.purchaseDate), expiry = dateOnly(value.expiryDate);
    if (purchase && expiry && expiry < purchase) errors.push({ field: "expiryDate", code: "expiryBeforePurchase" });
    const totalPrice = decimalOrNull(value.totalPrice);
    if (totalPrice != null) {
      if (!Number.isFinite(totalPrice)) errors.push({ field: "totalPrice", code: "number" });
      else if (totalPrice < 0) errors.push({ field: "totalPrice", code: "negative" });
    }
    const current = existingId ? (envelope ? envelope.batches.find((item) => item.id === existingId) : repo().getBatchById(existingId)) : null;
    if (existingId && !current) errors.push({ field: "id", code: "missing" });
    if (existingId) {
      const active = current ? (envelope ? envelope.allocations.filter((item) => item.inventoryBatchId === existingId && ACTIVE_ALLOCATION_STATUSES.includes(item.status)) : allocationsForBatch(existingId)) : [];
      const reserved = current ? round(active.reduce((sum, item) => sum + units().convert(Number(item.reservedQuantity) || 0, item.unit, current.unit), 0)) : 0;
      if (current && active.length && unit !== current.unit) errors.push({ field: "unit", code: "activeReservation" });
      if (current && active.length && unit === current.unit && quantity < reserved) errors.push({ field: "quantity", code: "reservedMinimum" });
    }
    return { valid: !errors.length, errors, quantity, unit, food, packageCount: isPackage ? packageCount : decimalOrNull(value.packageCount), packageType: isPackage ? packageType : value.packageType || null };
  }

  function normalizeDraft(value, validation, current) {
    const stamp = new Date().toISOString();
    const numberOrNull = (input) => {
      const number = decimalOrNull(input);
      return Number.isFinite(number) ? number : null;
    };
    return {
      foodId: value.foodId, locationId: value.locationId, quantity: validation.quantity,
      initialQuantity: current?.initialQuantity ?? validation.quantity, unit: validation.unit,
      packageCount: validation.packageCount, packageSize: numberOrNull(value.packageSize),
      packageUnit: value.packageUnit || null, packageType: validation.packageType,
      purchaseDate: dateOrNull(value.purchaseDate), addedAt: dateOrNull(value.addedAt) || current?.addedAt || stamp,
      expiryDate: dateOrNull(value.expiryDate), openedDate: dateOrNull(value.openedDate),
      storageState: value.storageState || null, sourceType: value.sourceType || null,
      storeId: value.storeId || null, storeName: value.storeName?.trim?.() || null,
      totalPrice: numberOrNull(value.totalPrice), currency: value.currency || "EUR",
      note: value.note?.trim?.() || null, status: value.status || "available",
      needsFoodLink: false, legacyFoodName: null
    };
  }

  async function saveBatch(value, id) {
    const draft = { ...value };
    const saved = await repo().mutate((envelope, context) => {
      const validation = validateDraft(draft, id, envelope, context);
      if (!validation.valid) {
        const error = new Error("INVENTORY_VALIDATION_FAILED"); error.code = "INVENTORY_VALIDATION_FAILED"; error.details = validation.errors; throw error;
      }
      const current = id ? envelope.batches.find((item) => item.id === id) : null;
      const stamp = new Date().toISOString();
      const record = { ...current, ...normalizeDraft(draft, validation, current), id: id || window.MentorNutritionId.create("inventory_batch"), createdAt: current?.createdAt || stamp, updatedAt: stamp };
      if (current) envelope.batches[envelope.batches.indexOf(current)] = record;
      else {
        if (envelope.batches.some((item) => item.id === record.id)) throw new Error("INVENTORY_BATCH_ALREADY_EXISTS");
        envelope.batches.push(record);
      }
      return record;
    });
    await resyncPlanning();
    return saved;
  }

  async function consume(batchId, amount, unit) {
    const saved = await repo().mutate((envelope, context) => {
      const batch = envelope.batches.find((item) => item.id === batchId);
      if (!batch) throw new Error("INVENTORY_BATCH_NOT_FOUND");
      const converted = units().convertForFood(Number(amount), unit || batch.unit, batch.unit, foodForWrite(batch.foodId, context));
      const reserved = round(envelope.allocations.filter((item) => item.inventoryBatchId === batchId && ACTIVE_ALLOCATION_STATUSES.includes(item.status))
        .reduce((sum, item) => sum + units().convert(Number(item.reservedQuantity) || 0, item.unit, batch.unit), 0));
      if (!Number.isFinite(converted) || !(converted > 0) || converted > round(Math.max(0, Number(batch.quantity) - reserved))) throw new Error("QUANTITY_EXCEEDS_AVAILABLE");
      batch.quantity = round(Number(batch.quantity) - converted);
      if (batch.quantity === 0) batch.status = "consumed";
      batch.updatedAt = new Date().toISOString();
      return batch;
    });
    await resyncPlanning();
    return saved;
  }

  async function restock(batchId, amount, unit, expected) {
    const saved = await repo().mutate((envelope, context) => {
      const batch = envelope.batches.find((item) => item.id === batchId);
      if (!batch) throw new Error("INVENTORY_BATCH_NOT_FOUND");
      if (expected && (batch.quantity !== expected.expectedQuantity || batch.updatedAt !== expected.expectedUpdatedAt || batch.foodId !== expected.foodId || batch.locationId !== expected.locationId)) {
        const error = new Error("INVENTORY_CHANGED"); error.code = "INVENTORY_CHANGED"; throw error;
      }
      const food = foodForWrite(batch.foodId, context);
      if (expected && (!food || food.status !== "active")) throw new Error("FOOD_NOT_FOUND");
      const converted = units().convertForFood(Number(amount), unit || batch.unit, batch.unit, food);
      const quantity = round(Number(batch.quantity) + converted);
      if (!Number.isFinite(converted) || !(converted > 0) || !Number.isFinite(quantity)) throw new Error("INVALID_QUANTITY");
      batch.quantity = quantity; batch.status = "available"; batch.updatedAt = new Date().toISOString();
      return batch;
    });
    await resyncPlanning();
    return saved;
  }

  // Synchronous domain operation: callers already hold the inventory transaction.
  // Both direct reservations and meal planning must use exactly these rules.
  function reserveInto(envelope, request, stamp, context) {
    const required = round(Number(request.requiredQuantity)), requestedUnit = units().normalizeUnit(request.unit);
    if (!Number.isFinite(required) || !(required > 0) || !ALLOWED_UNITS.includes(requestedUnit)) throw new Error("INVALID_QUANTITY");
    const food = foodForWrite(request.foodId, context);
    if (!food) throw new Error("FOOD_NOT_FOUND");
    const now = new Date();
    const today = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    const plannedDate = typeof request.plannedDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(request.plannedDate) && dateOrNull(request.plannedDate) === request.plannedDate ? request.plannedDate : null;
    const cutoff = plannedDate && plannedDate > today ? plannedDate : today;
    const batchById = new Map(envelope.batches.map((batch) => [batch.id, batch]));
    const reservedByBatch = new Map();
    envelope.allocations.filter((item) => ACTIVE_ALLOCATION_STATUSES.includes(item.status) && item.inventoryBatchId).forEach((item) => {
      const batch = batchById.get(item.inventoryBatchId);
      if (!batch || batch.foodId !== request.foodId) return;
      let quantity;
      try { quantity = units().convertForFood(Number(item.reservedQuantity || 0), item.unit, batch.unit, food); }
      catch (_) { quantity = Number(batch.quantity); } // Unknown reservations cannot make stock available.
      reservedByBatch.set(batch.id, round((reservedByBatch.get(batch.id) || 0) + quantity));
    });
    const batches = envelope.batches.map((batch) => ({
      batch,
      expiry: batch.expiryDate && String(batch.expiryDate).includes("T") && !Number.isFinite(Date.parse(batch.expiryDate)) ? NaN : dateOrNull(batch.expiryDate)
    }))
      .filter(({ batch, expiry }) => batch.foodId === request.foodId && Number.isFinite(Number(batch.quantity)) && Number(batch.quantity) > 0 && batch.status !== "consumed"
        && !Number.isNaN(expiry) && (expiry === null || expiry >= cutoff) && units().isCompatibleForFood(batch.unit, requestedUnit, food))
      .sort((a, b) => (a.expiry || "9999-12-31").localeCompare(b.expiry || "9999-12-31") || String(a.batch.addedAt).localeCompare(String(b.batch.addedAt)));
    let remaining = required;
    const created = [];
    batches.forEach(({ batch }) => {
      if (remaining <= 0) return;
      const freeBatchUnit = round(Math.max(0, Number(batch.quantity) - (reservedByBatch.get(batch.id) || 0)));
      const freeRequested = units().convertForFood(freeBatchUnit, batch.unit, requestedUnit, food);
      const takeRequested = Math.min(remaining, freeRequested);
      if (!(takeRequested > 0)) return;
      const takeBatch = Math.min(freeBatchUnit, round(units().convertForFood(takeRequested, requestedUnit, batch.unit, food)));
      if (!(takeBatch > 0)) return;
      const allocation = {
        id: window.MentorNutritionId.create("inventory_allocation"), mealPlanId: request.mealPlanId || null,
        mealPlanEntryId: request.mealPlanEntryId, recipeId: request.recipeId || null, foodId: request.foodId,
        inventoryBatchId: batch.id, plannedDate: request.plannedDate || null, mealType: request.mealType || null,
        requiredQuantity: takeBatch, reservedQuantity: takeBatch, consumedQuantity: 0, unit: batch.unit,
        status: "reserved", createdAt: stamp, updatedAt: stamp, consumedAt: null
      };
      envelope.allocations.push(allocation); created.push(allocation);
      reservedByBatch.set(batch.id, round((reservedByBatch.get(batch.id) || 0) + takeBatch));
      const supplied = Math.min(takeRequested, units().convertForFood(takeBatch, batch.unit, requestedUnit, food));
      remaining = round(Math.max(0, remaining - supplied));
    });
    if (remaining > 0) {
      const missing = { id: window.MentorNutritionId.create("inventory_allocation"), mealPlanId: request.mealPlanId || null, mealPlanEntryId: request.mealPlanEntryId,
        recipeId: request.recipeId || null, foodId: request.foodId, inventoryBatchId: null, plannedDate: request.plannedDate || null, mealType: request.mealType || null,
        requiredQuantity: remaining, reservedQuantity: 0, consumedQuantity: 0, unit: requestedUnit, status: created.length ? "partially_reserved" : "missing",
        createdAt: stamp, updatedAt: stamp, consumedAt: null };
      envelope.allocations.push(missing); created.push(missing);
    }
    return { allocations: created, requiredQuantity: required, reservedQuantity: round(required - remaining), missingQuantity: remaining, unit: requestedUnit,
      status: remaining <= 0 ? "reserved" : created.some((item) => item.reservedQuantity > 0) ? "partially_reserved" : "missing" };
  }

  function reserve(request) {
    return repo().mutate((envelope, context) => {
      const stamp = new Date().toISOString();
      envelope.allocations = envelope.allocations.map((item) => item.mealPlanEntryId === request.mealPlanEntryId && item.foodId === request.foodId && ACTIVE_ALLOCATION_STATUSES.includes(item.status) ? { ...item, status: "released", updatedAt: stamp } : item);
      return reserveInto(envelope, request, stamp, context);
    });
  }

  function releaseMealPlanEntry(mealPlanEntryId) {
    return repo().mutate((envelope) => {
      const stamp = new Date().toISOString(); let count = 0;
      envelope.allocations = envelope.allocations.map((item) => {
        if (item.mealPlanEntryId !== mealPlanEntryId || !ACTIVE_ALLOCATION_STATUSES.includes(item.status)) return item;
        count += 1; return { ...item, status: "released", updatedAt: stamp };
      });
      return count;
    });
  }

  function consumeMealPlanEntry(mealPlanEntryId) {
    return repo().mutate((envelope) => {
      const stamp = new Date().toISOString();
      const affected = envelope.allocations.filter((item) => item.mealPlanEntryId === mealPlanEntryId && ACTIVE_ALLOCATION_STATUSES.includes(item.status) && item.inventoryBatchId);
      affected.forEach((allocation) => {
        const batch = envelope.batches.find((item) => item.id === allocation.inventoryBatchId);
        if (!batch) { allocation.status = "released"; allocation.updatedAt = stamp; return; }
        let requested = 0;
        try { requested = units().convert(Number(allocation.reservedQuantity), allocation.unit, batch.unit); }
        catch (_) { allocation.status = "released"; allocation.updatedAt = stamp; return; }
        const consumed = Math.min(Number(batch.quantity), requested);
        batch.quantity = round(Number(batch.quantity) - consumed); batch.status = batch.quantity <= 0 ? "consumed" : batch.status; batch.updatedAt = stamp;
        allocation.consumedQuantity = consumed; allocation.status = "consumed"; allocation.consumedAt = stamp; allocation.updatedAt = stamp;
      });
      const unfulfilled = envelope.allocations.filter((item) => item.mealPlanEntryId === mealPlanEntryId && ACTIVE_ALLOCATION_STATUSES.includes(item.status) && !item.inventoryBatchId);
      unfulfilled.forEach((allocation) => { allocation.status = "skipped"; allocation.updatedAt = stamp; });
      return affected.length + unfulfilled.length;
    });
  }

  function defaultsForFood(foodId) {
    const food = getFood(foodId), pref = preference(foodId);
    let unit = food?.referenceUnit || "g";
    if (food?.categoryId === "eggs") unit = "kom";
    if (food?.categoryId === "beverages") unit = "ml";
    const locationId = repo().getLocationById(pref?.preferredLocationId)?.id || repo().getLocationById("location_fridge")?.id || repo().getLocations()[0]?.id || "";
    return { unit: ALLOWED_UNITS.includes(unit) ? unit : "g", locationId, trackingType: unit === "kom" ? "count" : ["ml", "l"].includes(unit) ? "volume" : "weight" };
  }
  window.addEventListener?.("mentor:nutrition-foodschange", () => { foodCache = null; });

  window.MentorInventoryService = {
    ALLOWED_UNITS, CONTENT_UNITS, ALLOWED_PACKAGE_TYPES, validateDraft, saveBatch, consume, restock,
    move: (id, locationId) => repo().updateBatch(id, (_batch, envelope) => { if (!envelope.locations.some((item) => item.id === locationId && !item.deletedAt)) throw new Error("LOCATION_NOT_FOUND"); return { locationId }; }),
    remove: async (id) => { const removed=await repo().removeBatch(id);await resyncPlanning();return removed; }, createLocation: (value) => repo().createLocation(value),
    getFood, getDefaultsForFood: defaultsForFood, reservedForBatch, availableForBatch, statusForBatch,
    reserve, reserveInto, releaseMealPlanEntry, consumeMealPlanEntry,
    getLinkedAllocations(batch) { return repo().getAllocations().filter((item) => item.inventoryBatchId === batch.id && ACTIVE_ALLOCATION_STATUSES.includes(item.status)); },
    getLinkedAllocationsForFood(foodId) { return repo().getAllocations().filter((item) => item.foodId === foodId && ACTIVE_ALLOCATION_STATUSES.includes(item.status)); },
    getBatchesForFood(foodId) { return repo().getBatches().filter((item) => item.foodId === foodId); }
  };
})();
