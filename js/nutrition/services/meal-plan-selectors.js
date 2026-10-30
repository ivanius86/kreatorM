(function () {
  "use strict";

  const NUTRIENTS = Object.freeze(["energyKcal", "protein", "carbohydrate", "totalFat", "fiber"]);
  const FAT_COMPONENTS = Object.freeze(["saturatedFat", "monounsaturatedFat", "polyunsaturatedFat", "transFat"]);
  const ACTIVE_ALLOCATIONS = Object.freeze(["planned", "reserved", "partially_reserved", "missing", "consumed"]);
  const MICRONUTRIENT_GROUPS = Object.freeze(["vitamin", "mineral"]);
  const MICRONUTRIENT_THRESHOLDS = Object.freeze({ deficit:50, low:80, optimal:120, high:160 });
  const round = (value, digits = 1) => {
    const factor = 10 ** digits;
    return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
  };

  function dependencies(overrides = {}) {
    return {
      foods: overrides.foods || window.MentorFoodRepository,
      nutrients: overrides.nutrients || window.MentorNutrientRepository,
      foodNutrition: overrides.foodNutrition || window.MentorFoodNutritionService,
      recipeProfile: overrides.recipeProfile || window.MentorRecipeProfileService,
      conversion: overrides.conversion || window.MentorNutritionUnitConversion,
      recipes: overrides.recipes || null
    };
  }

  function dailyGoals(overrides = {}) {
    const nutrientRepository = overrides.nutrients || window.MentorNutrientRepository;
    const fromDefinition = (code) => {
      const value = Number(nutrientRepository?.getByCode?.(code)?.dailyReference);
      return Number.isFinite(value) && value > 0 ? value : null;
    };
    return Object.freeze({
      // There is no user calorie goal yet. Keep the neutral reference isolated here.
      energyKcal: 2000,
      protein: fromDefinition("protein"),
      carbohydrate: fromDefinition("carbohydrate"),
      totalFat: fromDefinition("totalFat"),
      fiber: fromDefinition("fiber")
    });
  }

  function recipeNutrition(recipe, plannedServings, overrides = {}) {
    const api = dependencies(overrides);
    const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
    const baseServings = Number(recipe?.servings);
    const servings = Number(plannedServings);
    const totals = Object.fromEntries(NUTRIENTS.map((code) => [code, 0]));
    const known = Object.fromEntries(NUTRIENTS.map((code) => [code, ingredients.length > 0 && baseServings > 0 && servings > 0]));
    const factor = servings / baseServings;
    let energyResolvable = known.energyKcal;
    const scaledAmount = (byCode, code, grams) => {
      const nutrient = byCode.get(code), amount = Number(nutrient?.amount), basis = Number(nutrient?.basisAmount || 100);
      if (!nutrient || nutrient.amount === null || nutrient.amount === undefined || !Number.isFinite(amount) || !(basis > 0)) return null;
      const value = amount * grams / basis * factor;
      return Number.isFinite(value) ? value : null;
    };

    ingredients.forEach((ingredient) => {
      const details = api.foodNutrition?.details?.(ingredient.foodId);
      const food = details?.food || api.foods.getById(ingredient.foodId);
      const grams = api.recipeProfile.gramsForIngredient(ingredient, food);
      if (!food || grams === null) {
        NUTRIENTS.forEach((code) => { known[code] = false; });
        energyResolvable = false;
        return;
      }
      const byCode = details?.byCode || new Map(api.foods.getNutrients(food.id).map((row) => [api.nutrients.getById(row.nutrientId)?.code, row]));
      const directEnergy = scaledAmount(byCode, "energyKcal", grams);
      NUTRIENTS.forEach((code) => {
        const nutrient = byCode.get(code), amount = Number(nutrient?.amount), basis = Number(nutrient?.basisAmount || 100);
        if (!nutrient || nutrient.amount === null || nutrient.amount === undefined || !Number.isFinite(amount) || !(basis > 0)) {
          known[code] = false;
          return;
        }
        totals[code] += amount * grams / basis * factor;
      });

      if (directEnergy !== null) return;

      const protein = scaledAmount(byCode, "protein", grams);
      const carbohydrate = scaledAmount(byCode, "carbohydrate", grams);
      const totalFat = scaledAmount(byCode, "totalFat", grams);
      const fatComponents = FAT_COMPONENTS.map((code) => scaledAmount(byCode, code, grams)).filter((value) => value !== null);
      const fat = totalFat !== null ? totalFat : fatComponents.length ? fatComponents.reduce((sum, value) => sum + value, 0) : null;
      if (protein !== null || carbohydrate !== null || fat !== null) {
        totals.energyKcal += (protein || 0) * 4 + (carbohydrate || 0) * 4 + (fat || 0) * 9;
        return;
      }
      energyResolvable = false;
    });

    known.energyKcal = energyResolvable;

    return {
      values: Object.fromEntries(NUTRIENTS.map((code) => [code, known[code] ? round(totals[code], code === "energyKcal" ? 0 : 1) : null])),
      known
    };
  }

  function aggregateEntries(entries, recipes, overrides = {}) {
    const recipeMap = recipes instanceof Map ? recipes : new Map((recipes || []).map((recipe) => [recipe.id, recipe]));
    const rows = (entries || []).map((entry) => ({
      entry,
      nutrition: recipeNutrition(recipeMap.get(entry.recipeId), entry.servings, overrides)
    }));
    const values = {}, known = {};
    NUTRIENTS.forEach((code) => {
      known[code] = rows.length > 0 && rows.every((row) => row.nutrition.known[code]);
      values[code] = known[code] ? round(rows.reduce((sum, row) => sum + row.nutrition.values[code], 0), code === "energyKcal" ? 0 : 1) : null;
    });
    return { mealCount: rows.length, values, known, rows };
  }

  function micronutrientStatus(percent) {
    if (!Number.isFinite(Number(percent))) return "unknown";
    if (percent < MICRONUTRIENT_THRESHOLDS.deficit) return "deficit";
    if (percent < MICRONUTRIENT_THRESHOLDS.low) return "low";
    if (percent <= MICRONUTRIENT_THRESHOLDS.optimal) return "optimal";
    if (percent <= MICRONUTRIENT_THRESHOLDS.high) return "high";
    return "excessive";
  }

  function micronutrientSummary(entries, recipes, overrides = {}) {
    const api = dependencies(overrides);
    const definitions = (api.nutrients?.getAll?.() || window.MentorNutritionNutrients || [])
      .filter((definition) => MICRONUTRIENT_GROUPS.includes(definition.group) && Number(definition.dailyReference) > 0);
    const totals = Object.fromEntries(definitions.map((definition) => [definition.code, 0]));
    const observations = Object.fromEntries(definitions.map((definition) => [definition.code, 0]));
    const recipeMap = recipes instanceof Map ? recipes : new Map((recipes || []).map((recipe) => [recipe.id, recipe]));
    let ingredientCount = 0;
    let resolvableIngredientCount = 0;

    (entries || []).forEach((entry) => {
      const recipe = recipeMap.get(entry.recipeId);
      const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
      const baseServings = Number(recipe?.servings);
      const plannedServings = Number(entry.servings);
      const factor = plannedServings / baseServings;
      ingredients.forEach((ingredient) => {
        ingredientCount += 1;
        const details = api.foodNutrition?.details?.(ingredient.foodId);
        const food = details?.food || api.foods?.getById?.(ingredient.foodId);
        const grams = food ? api.recipeProfile?.gramsForIngredient?.(ingredient, food) : null;
        if (!food || grams === null || !Number.isFinite(factor) || !(factor > 0)) return;
        resolvableIngredientCount += 1;
        const byCode = details?.byCode || new Map((api.foods?.getNutrients?.(food.id) || []).map((row) => [api.nutrients?.getById?.(row.nutrientId)?.code, row]));
        definitions.forEach((definition) => {
          const nutrient = byCode.get(definition.code);
          const amount = Number(nutrient?.amount);
          const basis = Number(nutrient?.basisAmount || 100);
          if (!nutrient || nutrient.amount === null || nutrient.amount === undefined || !Number.isFinite(amount) || !(basis > 0)) return;
          totals[definition.code] += amount * grams / basis * factor;
          observations[definition.code] += 1;
        });
      });
    });

    const nutrients = definitions.map((definition) => {
      const evaluated = observations[definition.code] > 0;
      const amount = evaluated ? round(totals[definition.code], 2) : null;
      const percent = evaluated ? round(amount / Number(definition.dailyReference) * 100, 0) : null;
      return {
        code: definition.code,
        group: definition.group,
        amount,
        unit: definition.unit,
        dailyReference: Number(definition.dailyReference),
        percent,
        status: micronutrientStatus(percent),
        observations: observations[definition.code]
      };
    });
    const evaluated = nutrients.filter((nutrient) => nutrient.percent !== null);
    const percent = evaluated.length
      ? round(evaluated.reduce((sum, nutrient) => sum + Math.min(250, Math.max(0, nutrient.percent)), 0) / evaluated.length, 0)
      : null;
    return {
      status: micronutrientStatus(percent),
      percent,
      coverage: definitions.length ? round(evaluated.length / definitions.length * 100, 0) : 0,
      ingredientCoverage: ingredientCount ? round(resolvableIngredientCount / ingredientCount * 100, 0) : 0,
      evaluatedCount: evaluated.length,
      totalCount: definitions.length,
      nutrients
    };
  }

  function groupByDay(entries, recipes, dates, overrides = {}) {
    return (dates || []).map((date) => {
      const dateKey = typeof date === "string" ? date : date.toISOString().slice(0, 10);
      return { date: dateKey, ...aggregateEntries((entries || []).filter((entry) => entry.plannedDate === dateKey), recipes, overrides) };
    });
  }

  function missingIngredients(entries, allocations, overrides = {}) {
    const api = dependencies(overrides), activeEntries = (entries || []).filter((entry) => entry.status !== "completed" && !entry.completedAt), entryIds = new Set(activeEntries.map((entry) => entry.id)), groups = new Map();
    const recipeMap = api.recipes instanceof Map ? api.recipes : Array.isArray(api.recipes) ? new Map(api.recipes.map((recipe) => [recipe.id, recipe])) : null;
    const add = (foodId, unit, field, quantity) => {
      const food = api.foods.getById(foodId);
      let group = groups.get(foodId);
      if (!group) {
        group = { foodId, unit, required:0, available:0, reserved:0, missing:0 };
        groups.set(foodId, group);
      }
      let value = Number(quantity || 0);
      if (unit !== group.unit) {
        try { value = api.conversion.convertForFood(value, unit, group.unit, food); }
        catch (_) {
          const splitKey = `${foodId}:${unit}`;
          group = groups.get(splitKey) || { foodId, unit, required:0, available:0, reserved:0, missing:0 };
          groups.set(splitKey, group);
        }
      }
      group[field] += value;
    };
    if (recipeMap) {
      activeEntries.forEach((entry) => {
        const recipe = recipeMap.get(entry.recipeId), factor = Number(entry.servings) / Math.max(Number(recipe?.servings), 1);
        (recipe?.ingredients || []).forEach((ingredient) => add(ingredient.foodId, ingredient.unit, "required", Number(ingredient.quantity) * factor));
      });
    } else {
      (allocations || []).filter((row) => entryIds.has(row.mealPlanEntryId) && ACTIVE_ALLOCATIONS.includes(row.status)).forEach((row) => add(row.foodId, row.unit, "required", row.requiredQuantity));
    }
    (allocations || []).filter((row) => entryIds.has(row.mealPlanEntryId) && ["planned", "reserved", "partially_reserved", "missing"].includes(row.status)).forEach((row) => {
      add(row.foodId, row.unit, "available", row.reservedQuantity);
      add(row.foodId, row.unit, "reserved", row.reservedQuantity);
    });
    return [...groups.values()].map((row) => ({
      ...row,
      required: round(row.required, 3),
      available: round(Math.min(row.required, row.available), 3),
      reserved: round(Math.min(row.required, row.reserved), 3),
      missing: round(Math.max(0, row.required - row.available), 3)
    })).filter((row) => row.missing > 0);
  }

  function estimatedCost(entries, allocations, batches, overrides = {}) {
    const entryIds = new Set((entries || []).map((entry) => entry.id));
    const relevant = (allocations || []).filter((row) => entryIds.has(row.mealPlanEntryId) && ACTIVE_ALLOCATIONS.includes(row.status));
    if (!relevant.length || relevant.some((row) => !row.inventoryBatchId || ["missing", "partially_reserved"].includes(row.status))) return null;
    const batchMap = new Map((batches || []).map((batch) => [batch.id, batch])), currencies = new Set();
    let value = 0;
    for (const allocation of relevant) {
      const batch = batchMap.get(allocation.inventoryBatchId);
      if (!batch || batch.totalPrice === null || batch.totalPrice === undefined || String(batch.totalPrice).trim() === "" || !String(batch.currency || "").trim()) return null;
      const price = Number(batch.totalPrice), initial = Number(batch.initialQuantity);
      if (!Number.isFinite(price) || price < 0 || !(initial > 0)) return null;
      currencies.add(String(batch.currency).trim());
      let quantity = Number(allocation.reservedQuantity || allocation.consumedQuantity || 0);
      const food = dependencies(overrides).foods.getById(allocation.foodId);
      try { quantity = dependencies(overrides).conversion.convertForFood(quantity, allocation.unit, batch.unit, food); }
      catch (_) { return null; }
      value += price * quantity / initial;
    }
    if (currencies.size !== 1) return null;
    return { value: round(value, 2), currency: [...currencies][0] };
  }

  function weeklySummary(days, missing, goals = dailyGoals()) {
    const plannedDays = (days || []).filter((day) => day.mealCount > 0);
    const average = (code) => {
      if (!plannedDays.length || plannedDays.some((day) => !day.known[code])) return null;
      return round(plannedDays.reduce((sum, day) => sum + day.values[code], 0) / plannedDays.length, code === "energyKcal" ? 0 : 1);
    };
    const calorieGoal = Number(goals.energyKcal);
    return {
      plannedMeals: (days || []).reduce((sum, day) => sum + day.mealCount, 0),
      capacity: (days || []).length * 4,
      averageCalories: average("energyKcal"),
      averageProtein: average("protein"),
      daysInGoal: Number.isFinite(calorieGoal) && calorieGoal > 0
        ? plannedDays.filter((day) => day.known.energyKcal && day.values.energyKcal >= calorieGoal * 0.9 && day.values.energyKcal <= calorieGoal * 1.1).length
        : null,
      missingIngredients: new Set((missing || []).map((row) => row.foodId)).size
    };
  }

  window.MentorMealPlanSelectors = {
    NUTRIENTS, MICRONUTRIENT_THRESHOLDS, dailyGoals, recipeNutrition, aggregateEntries, micronutrientStatus, micronutrientSummary, groupByDay, missingIngredients, estimatedCost, weeklySummary
  };
})();
