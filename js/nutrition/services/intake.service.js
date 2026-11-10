(function (root) {
  "use strict";

  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const validation = () => root.MentorNutritionIntakeValidation;
  const repository = () => root.MentorInventoryRepository;
  const round = (value, digits) => { const factor = 10 ** digits; return Math.round((Number(value) + Number.EPSILON) * factor) / factor; };
  function fail(code, details) { const error = new Error(code); error.code = code; error.details = details; throw error; }

  function ledger(envelope) {
    if (!Object.prototype.hasOwnProperty.call(envelope, "intakeEntries")) return [];
    const errors = validation().validateEntries(envelope.intakeEntries);
    if (errors.length) fail("INTAKE_STORAGE_INVALID", errors);
    return envelope.intakeEntries;
  }

  // Build a read-only domain view from the food envelope held in this inventory
  // transaction. The global UI repositories and nutrition cache may be stale.
  function snapshotDependencies(context) {
    const foodEnvelope = context?.foodEnvelope;
    if (!foodEnvelope || !["userFoods", "userFoodNutrients", "userFoodPortions"].every((key) => Array.isArray(foodEnvelope[key]))) fail("INTAKE_CONTEXT_UNAVAILABLE");
    const seed = root.MentorNutritionFoodSeed || {};
    const userFoodIds = new Set(foodEnvelope.userFoods.map((food) => food.id));
    const foodById = new Map((seed.foods || []).map((food) => [food.id, food]));
    foodEnvelope.userFoods.forEach((food) => foodById.set(food.id, food));
    const nutrientRows = [...(seed.foodNutrients || []).filter((item) => !userFoodIds.has(item.foodId)), ...foodEnvelope.userFoodNutrients];
    const portionRows = [...(seed.portions || []).filter((item) => !userFoodIds.has(item.foodId)), ...foodEnvelope.userFoodPortions];
    const definitions = root.MentorNutrientRepository.getAll();
    const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));
    const foods = {
      getById: (id) => foodById.get(id) || null,
      getNutrients: (id) => nutrientRows.filter((item) => item.foodId === id),
      getPortions: (id) => portionRows.filter((item) => item.foodId === id)
    };
    const nutrients = { getAll: () => definitions, getById: (id) => definitionById.get(id) || null };
    const foodNutrition = { details(id) {
      const food = foods.getById(id);
      if (!food) return null;
      const rows = foods.getNutrients(id), byCode = new Map();
      rows.forEach((item) => { const definition = definitionById.get(item.nutrientId); if (definition) byCode.set(definition.code, { definition, ...item }); });
      return { food, nutrients: rows, portions: foods.getPortions(id), byCode };
    } };
    const recipeProfile = { gramsForIngredient: (ingredient, food) => root.MentorRecipeProfileService.gramsForIngredient(ingredient, food, { portions: food ? foods.getPortions(food.id) : [] }) };
    return { foods, nutrients, foodNutrition, recipeProfile, conversion: root.MentorNutritionUnitConversion };
  }

  function captureSnapshot(recipe, context, stamp) {
    const basisServings = Number(recipe.servings);
    if (!Number.isFinite(basisServings) || !(basisServings > 0)) fail("INTAKE_RECIPE_INVALID");
    const dependencies = snapshotDependencies(context);
    const selectors = root.MentorMealPlanSelectors;
    const macros = selectors.recipeNutrition(recipe, basisServings, dependencies);
    const micros = selectors.micronutrientSummary([{ recipeId: recipe.id, servings: basisServings }], [recipe], dependencies);
    return {
      version: 1, capturedAt: stamp, basisServings, recipeUpdatedAt: recipe.updatedAt || null,
      values: clone(macros.values), partialValues: clone(macros.partialValues), known: clone(macros.known), observed: clone(macros.observed),
      micronutrients: clone(micros.nutrients)
    };
  }

  function getEntries(options = {}) {
    return clone(ledger(repository().read()))
      .filter((entry) => (!options.eatenDate || entry.eatenDate === options.eatenDate)
        && (!options.startDate || entry.eatenDate >= options.startDate) && (!options.endDate || entry.eatenDate <= options.endDate))
      .sort((a, b) => a.eatenDate.localeCompare(b.eatenDate) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  }
  function getForMealPlanEntry(id) { return getEntries().find((entry) => entry.mealPlanEntryId === id) || null; }

  function saveForMealPlanEntry(mealPlanEntryId, value = {}) {
    const eatenDate = value?.eatenDate, servings = Number(value?.servings);
    if (typeof mealPlanEntryId !== "string" || !mealPlanEntryId.trim() || !validation().validDate(eatenDate)
      || !["number", "string"].includes(typeof value?.servings) || !Number.isFinite(servings) || !(servings > 0)) fail("INTAKE_VALIDATION_FAILED");
    return repository().mutate((envelope, context) => {
      const entries = ledger(envelope), index = entries.findIndex((entry) => entry.mealPlanEntryId === mealPlanEntryId);
      const stamp = new Date().toISOString();
      let record;
      if (index >= 0) {
        // Date and portion corrections never recapture today's recipe or foods.
        record = { ...entries[index], eatenDate, servings, updatedAt: stamp };
      } else {
        const meal = envelope.mealPlanEntries.find((entry) => entry.id === mealPlanEntryId);
        if (!meal) fail("MEAL_PLAN_ENTRY_NOT_FOUND");
        const recipe = envelope.recipes.find((entry) => entry.id === meal.recipeId);
        if (!recipe || !String(recipe.name || "").trim()) fail("RECIPE_NOT_FOUND");
        record = {
          id: root.MentorNutritionId.create("intake_entry"), mealPlanEntryId, recipeId: recipe.id, recipeName: String(recipe.name), mealType: meal.mealType,
          eatenDate, servings, nutritionSnapshot: captureSnapshot(recipe, context, stamp), createdAt: stamp, updatedAt: stamp
        };
      }
      const errors = validation().validateEntry(record);
      if (errors.length) fail("INTAKE_VALIDATION_FAILED", errors);
      if (index >= 0) entries[index] = record; else entries.push(record);
      envelope.intakeEntries = entries;
      return record;
    });
  }

  function removeForMealPlanEntry(id) {
    return repository().mutate((envelope) => {
      const entries = ledger(envelope), next = entries.filter((entry) => entry.mealPlanEntryId !== id);
      envelope.intakeEntries = next;
      return next.length !== entries.length;
    });
  }

  function nutritionForEntry(entry) {
    const errors = validation().validateEntry(entry);
    if (errors.length) fail("INTAKE_VALIDATION_FAILED", errors);
    const snapshot = entry.nutritionSnapshot, factor = entry.servings / snapshot.basisServings;
    const values = {}, partialValues = {};
    validation().MACRO_CODES.forEach((code) => {
      values[code] = snapshot.known[code] ? round(snapshot.values[code] * factor, code === "energyKcal" ? 0 : 1) : null;
      partialValues[code] = snapshot.observed[code] ? round(snapshot.partialValues[code] * factor, code === "energyKcal" ? 0 : 1) : null;
    });
    const micronutrients = snapshot.micronutrients.map((nutrient) => {
      const amount = nutrient.complete ? round(nutrient.amount * factor, 2) : null;
      const percent = amount === null ? null : round(amount / nutrient.dailyReference * 100, 0);
      return { ...clone(nutrient), amount, percent, status: root.MentorMealPlanSelectors.micronutrientStatus(percent) };
    });
    return { values, partialValues, known: clone(snapshot.known), observed: clone(snapshot.observed), micronutrients };
  }

  root.MentorIntakeService = Object.freeze({ getEntries, getForMealPlanEntry, saveForMealPlanEntry, removeForMealPlanEntry, nutritionForEntry });
})(typeof window !== "undefined" ? window : globalThis);
