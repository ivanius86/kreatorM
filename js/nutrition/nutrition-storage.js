(function () {
  "use strict";

  const createState = () => ({
    activeTab: "overview", date: new Date(), weekOffset: 0, selectedDay: 0,
    period: "Danas", selectedFood: 1, selectedStock: null, selectedRecipe: 1,
    search: "", filters: { foodCategory: "", foodUnit: "", foodOrigin: "", foodSort: "nameAsc" },
    inventoryFilters: { search: "", locationId: "", categoryId: "", expiry: "", status: "" },
    completedMealIds: new Set((window.MentorNutritionData?.meals || []).filter((meal) => meal.done).map((meal) => meal.id)),
    shoppingItemIds: new Set(), modal: null, foodForm: null, foodFormSection: "basic", foodFormFile: null,
    inventoryForm: null, inventoryLocationDraft: null,
    recipeFilters: { search:"", mealTypes:[], dietaryPatterns:[], fastingTypes:[], allergenExclusions:[], nutritionTags:[], preparationTime:[], availability:[] }, recipeFilterOpen: null, recipeForm: null,
    recipeServings: {},
    mealPlanForm: null, selectedMealPlanEntry: null, shoppingDrafts: {}, shoppingError: null, notice: null
  });

  window.MentorNutritionStorage = {
    createState,
    toggleCompletedMeal(state, id) { state.completedMealIds.has(id) ? state.completedMealIds.delete(id) : state.completedMealIds.add(id); },
    toggleShoppingItem(state, id) { state.shoppingItemIds.has(id) ? state.shoppingItemIds.delete(id) : state.shoppingItemIds.add(id); }
  };

  const KEY = "mentor_nutrition_foods_v1";
  const STAGING_KEY = `${KEY}_staging`;
  const BACKUP_KEY = `${KEY}_backup`;
  const VERSION = 1;
  const arrays = ["userFoods", "userFoodNutrients", "userFoodPortions", "userSources"];
  const empty = () => ({ version: VERSION, updatedAt: null, userFoods: [], userFoodNutrients: [], userFoodPortions: [], userSources: [] });
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const hasEnvelopeShape = (value) => value && typeof value === "object" && value.version === VERSION && arrays.every((key) => Array.isArray(value[key]));
  const normalize = (value) => {
    const result = { ...empty(), ...(value && typeof value === "object" ? value : {}) };
    arrays.forEach((key) => { result[key] = Array.isArray(result[key]) ? result[key] : []; });
    result.userFoods = result.userFoods.map((food) => {
      const inherited = window.MentorNutritionFoodFilterProfilesSeed?.[food.id]
        || window.MentorNutritionFoodFilterProfilesSeed?.[food.sourceFoodId]
        || window.MentorNutritionFoodFilterProfilesSeed?.[food.derivedFromFoodId];
      return { ...food, filterProfile: window.MentorFoodFilterProfile.normalize(food.filterProfile || inherited) };
    });
    result.version = VERSION;
    return result;
  };

  function validate(envelope) {
    const system = window.MentorNutritionFoodSeed || {};
    const foodsById = new Map((system.foods || []).map((item) => [item.id, item]));
    envelope.userFoods.forEach((item) => foodsById.set(item.id, item));
    const foods = [...foodsById.values()];
    const sources = new Set([...(system.sources || []), ...envelope.userSources].map((item) => item.id));
    const foodIds = new Set(foods.map((item) => item.id));
    const nutrients = new Map((window.MentorNutritionNutrients || []).map((item) => [item.id, item]));
    const errors = [];
    const foodValidation = window.MentorNutritionValidation?.food;
    const nutrientValidation = window.MentorNutritionValidation?.foodNutrient;
    if (foodValidation) errors.push(...foodValidation.validateCollection(foods, { sources }));
    if (nutrientValidation) errors.push(...nutrientValidation.validateCollection(
      [...(system.foodNutrients || []).filter((item) => !envelope.userFoods.some((food) => food.id === item.foodId)), ...envelope.userFoodNutrients], { foodIds, nutrients }
    ));
    arrays.forEach((key) => { if (!Array.isArray(envelope[key])) errors.push({ code: `storage.${key}.invalid` }); });
    envelope.userFoods.forEach((food) => {
      if (food.ownership !== "user") errors.push({ foodId: food.id, code: "food.ownership.mustBeUser" });
    });
    envelope.userFoodNutrients.forEach((item) => {
      if (item.amount === undefined) errors.push({ foodId: item.foodId, nutrientId: item.nutrientId, code: "foodNutrient.amount.required" });
    });
    return errors;
  }

  function load() {
    const readCandidate = (key) => {
      try { const raw = window.localStorage?.getItem(key); if (!raw) return null; const parsed = JSON.parse(raw); if (!hasEnvelopeShape(parsed)) return null; const envelope = normalize(parsed); return validate(envelope).length ? null : clone(envelope); }
      catch (_) { return null; }
    };
    const primary = readCandidate(KEY); if (primary) return primary;
    const backup = readCandidate(BACKUP_KEY); if (backup) { console.warn("[Nutrition] Recovered food data from backup."); return backup; }
    if (window.localStorage?.getItem(KEY)) console.error("[Nutrition] Stored food data is invalid; original payload was preserved.");
    return empty();
  }

  function save(value) {
    const envelope = normalize(clone(value));
    envelope.updatedAt = new Date().toISOString();
    const errors = validate(envelope);
    if (errors.length) {
      const error = new Error("Nutrition food storage validation failed.");
      error.code = "NUTRITION_STORAGE_VALIDATION_FAILED";
      error.details = errors;
      throw error;
    }
    const serialized = JSON.stringify(envelope);
    try {
      const previous = window.localStorage?.getItem(KEY);
      if (previous) window.localStorage?.setItem(BACKUP_KEY, previous);
      window.localStorage?.setItem(STAGING_KEY, serialized);
      if (window.localStorage?.getItem(STAGING_KEY) !== serialized) throw new Error("Nutrition staging verification failed.");
      window.localStorage?.setItem(KEY, serialized);
      window.localStorage?.removeItem(STAGING_KEY);
    } catch (error) {
      try { window.localStorage?.removeItem(STAGING_KEY); } catch (_) { /* no-op */ }
      throw error;
    }
    window.dispatchEvent?.(new CustomEvent("mentor:nutrition-foodschange", { detail: { envelope: clone(envelope) } }));
    return clone(envelope);
  }

  window.MentorNutritionFoodStorage = {
    KEY, VERSION, createEmpty: empty, normalize, validate, load, save,
    reset() { window.localStorage?.removeItem(STAGING_KEY); window.localStorage?.removeItem(BACKUP_KEY); window.localStorage?.removeItem(KEY); return empty(); }
  };
})();
