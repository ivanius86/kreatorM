(function () {
  "use strict";

  const ALLERGEN_FILTERS = Object.freeze({
    gluten:"glutenFree", dairy:"dairyFree", lactose:"lactoseFree", egg:"eggFree", nuts:"nutFree", soy:"soyFree", sesame:"sesameFree"
  });
  const NUTRITION_THRESHOLDS = Object.freeze({
    highProteinMinGrams:20,
    lowCalorieMaxKcal:500,
    highFiberMinGrams:5,
    noAddedSugarMaxGrams:0,
    healthyFatsMinGrams:10,
    lowCarbNutritionMaxGrams:20,
    lowCarbDietMaxGrams:50,
    ketoNetCarbMaxGrams:20
  });
  const NUTRITION_REQUIREMENTS = Object.freeze({
    highProtein:["protein"],
    lowCalorie:["energyKcal"],
    highFiber:["fiber"],
    noAddedSugar:["addedSugars"],
    healthyFats:["monounsaturatedFat", "polyunsaturatedFat", "saturatedFat"],
    lowCarbNutrition:["carbohydrate"]
  });
  const ALL_NUTRIENTS = Object.freeze([...new Set(Object.values(NUTRITION_REQUIREMENTS).flat())]);

  function gramsForIngredient(ingredient, food, options = {}) {
    const amount = Number(ingredient?.quantity), unit = window.MentorNutritionUnitConversion.normalizeUnit(ingredient?.unit);
    if (!Number.isFinite(amount) || amount <= 0 || !food) return null;
    try {
      if (window.MentorNutritionUnitConversion.isCompatibleForFood(unit, "g", food)) return window.MentorNutritionUnitConversion.convertForFood(amount, unit, "g", food);
    } catch (_) { return null; }
    if (unit === "kom" && Number(food.defaultServingGrams) > 0) return amount * Number(food.defaultServingGrams);
    const portions = options.portions || window.MentorFoodRepository.getPortions(food.id);
    const portion = portions.find((item) => item.unit === unit && Number(item.amount) > 0 && Number(item.equivalentGrams) > 0);
    if (!portion) return null;
    try { return window.MentorNutritionUnitConversion.toGrams(amount, portion); }
    catch (_) { return null; }
  }

  function nutritionFor(recipe, foods) {
    const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
    const servings = Number(recipe?.servings);
    const totals = Object.fromEntries(ALL_NUTRIENTS.map((code) => [code, 0]));
    const complete = Object.fromEntries(ALL_NUTRIENTS.map((code) => [code, ingredients.length > 0 && Number.isFinite(servings) && servings > 0]));
    ingredients.forEach((ingredient, index) => {
      const food = foods[index], grams = gramsForIngredient(ingredient, food);
      if (grams === null) ALL_NUTRIENTS.forEach((code) => { complete[code] = false; });
      const nutrientMap = food ? window.MentorFoodNutritionService.details(food.id)?.byCode || new Map() : new Map();
      ALL_NUTRIENTS.forEach((code) => {
        const nutrient = nutrientMap.get(code);
        if (grams === null || !nutrient || nutrient.amount === null || nutrient.amount === undefined || !Number.isFinite(Number(nutrient.amount))) { complete[code] = false; return; }
        const basis = nutrient.basisAmount == null ? 100 : Number(nutrient.basisAmount);
        if (!(basis > 0)) { complete[code] = false; return; }
        totals[code] += Number(nutrient.amount) * grams / basis;
      });
    });
    const sharedEnergy = window.MentorMealPlanSelectors?.recipeNutrition?.(recipe, servings);
    if (sharedEnergy) {
      complete.energyKcal = sharedEnergy.known.energyKcal;
      totals.energyKcal = sharedEnergy.values.energyKcal ?? 0;
    }
    const perServing = Object.fromEntries(ALL_NUTRIENTS.map((code) => [code, complete[code] ? totals[code] / servings : null]));
    const allKnown = (tag) => NUTRITION_REQUIREMENTS[tag].every((code) => complete[code]);
    const tags = [];
    if (allKnown("highProtein") && perServing.protein >= NUTRITION_THRESHOLDS.highProteinMinGrams) tags.push("highProtein");
    if (allKnown("lowCalorie") && perServing.energyKcal <= NUTRITION_THRESHOLDS.lowCalorieMaxKcal) tags.push("lowCalorie");
    if (allKnown("highFiber") && perServing.fiber >= NUTRITION_THRESHOLDS.highFiberMinGrams) tags.push("highFiber");
    if (allKnown("noAddedSugar") && perServing.addedSugars <= NUTRITION_THRESHOLDS.noAddedSugarMaxGrams) tags.push("noAddedSugar");
    if (allKnown("healthyFats")) {
      const unsaturated = perServing.monounsaturatedFat + perServing.polyunsaturatedFat;
      if (unsaturated >= NUTRITION_THRESHOLDS.healthyFatsMinGrams && unsaturated > perServing.saturatedFat) tags.push("healthyFats");
    }
    if (allKnown("lowCarbNutrition") && perServing.carbohydrate <= NUTRITION_THRESHOLDS.lowCarbNutritionMaxGrams) tags.push("lowCarbNutrition");
    return { tags, perServing, complete };
  }

  function deriveRecipeProfile(recipe) {
    const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
    const foods = ingredients.map((item) => window.MentorFoodNutritionService.details(item.foodId)?.food || null);
    const profiles = foods.map((food) => food ? window.MentorFoodFilterProfile.normalize(food.filterProfile) : null);
    const all = (read, expected) => ingredients.length > 0 && profiles.length === ingredients.length && profiles.every((profile) => profile && read(profile) === expected);
    const dietaryPatterns = window.MentorFoodFilterProfile.DIETARY.filter((key) => !["lowCarb", "keto"].includes(key) && all((profile) => profile.dietary[key], "allowed"));
    const fastingTypes = window.MentorFoodFilterProfile.FASTING.filter((key) => all((profile) => profile.fasting[key], "allowed"));
    const allergenExclusions = window.MentorFoodFilterProfile.ALLERGENS.filter((key) => all((profile) => profile.allergens[key], "absent")).map((key) => ALLERGEN_FILTERS[key]);
    const nutrition = nutritionFor(recipe, foods);
    if (nutrition.complete.carbohydrate && nutrition.perServing.carbohydrate <= NUTRITION_THRESHOLDS.lowCarbDietMaxGrams) dietaryPatterns.push("lowCarb");
    if (nutrition.complete.carbohydrate && nutrition.complete.fiber) {
      const netCarbs = Math.max(0, nutrition.perServing.carbohydrate - nutrition.perServing.fiber);
      if (netCarbs <= NUTRITION_THRESHOLDS.ketoNetCarbMaxGrams) dietaryPatterns.push("keto");
    }
    return { dietaryPatterns, fastingTypes, allergenExclusions, nutritionTags:nutrition.tags, nutrition };
  }

  window.MentorRecipeProfileService = { ALLERGEN_FILTERS, NUTRITION_THRESHOLDS, NUTRITION_REQUIREMENTS, gramsForIngredient, deriveRecipeProfile };
})();
