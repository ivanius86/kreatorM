(function () {
  "use strict";
  function validateDataset(dataset) {
    const foods = Array.isArray(dataset?.foods) ? dataset.foods : [];
    const values = Array.isArray(dataset?.foodNutrients) ? dataset.foodNutrients : [];
    const sources = Array.isArray(dataset?.sources) ? dataset.sources : [];
    const foodErrors = window.MentorNutritionValidation.food.validateCollection(foods, { sources: new Set(sources.map(source => source.id)) });
    sources.forEach(source => {
      if (source.provider === "USDA FoodData Central" && (!Number.isInteger(source.fdcId) || source.fdcId <= 0)) foodErrors.push({ foodId: null, code: "source.fdcId.required" });
      if (!source.dataType || !source.sourceDescription || !source.sourceUrl || !source.retrievedAt || !source.lastVerifiedAt) foodErrors.push({ foodId: null, code: "source.metadata.incomplete" });
    });
    const nutrientMap = new Map((window.MentorNutritionNutrients || []).map(item => [item.id, item]));
    const nutrientErrors = window.MentorNutritionValidation.foodNutrient.validateCollection(values, { foodIds: new Set(foods.map(food => food.id)), nutrients: nutrientMap });
    return { valid: foodErrors.length === 0 && nutrientErrors.length === 0, foodErrors, nutrientErrors };
  }
  const systemResult = validateDataset(window.MentorNutritionFoodSeed);
  window.MentorNutritionDatasetValidation = { validateDataset, systemResult };
  if (!systemResult.valid) console.error("[Nutrition] System food dataset validation failed", systemResult);
})();
