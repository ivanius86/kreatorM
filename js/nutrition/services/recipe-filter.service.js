(function () {
  "use strict";

  const GROUPS = ["mealTypes", "dietaryPatterns", "fastingTypes", "allergenExclusions", "nutritionTags", "preparationTime", "availability"];
  const OPTIONS = {
    mealTypes: ["breakfast", "lunch", "dinner", "snack"],
    dietaryPatterns: ["vegan", "vegetarian", "pescatarian", "mediterranean", "lowCarb", "keto"],
    fastingTypes: ["fasting", "waterFasting", "oilFasting", "fishFasting"],
    allergenExclusions: ["glutenFree", "dairyFree", "lactoseFree", "eggFree", "nutFree", "soyFree", "sesameFree"],
    nutritionTags: ["highProtein", "lowCalorie", "highFiber", "noAddedSugar", "healthyFats", "lowCarbNutrition"],
    preparationTime: ["15", "30", "45", "60"],
    availability: ["ready", "missingOne", "missingMany", "expiring", "shopping"]
  };

  const empty = () => ({
    search: "",
    mealTypes: [],
    dietaryPatterns: [],
    fastingTypes: [],
    allergenExclusions: [],
    nutritionTags: [],
    preparationTime: [],
    availability: []
  });

  function normalize(value) {
    const source = value && typeof value === "object" ? value : {};
    const result = empty();
    result.search = String(source.search || "");
    GROUPS.forEach((group) => {
      result[group] = Array.isArray(source[group])
        ? [...new Set(source[group].map(String).filter((item) => OPTIONS[group].includes(item)))]
        : [];
    });
    if (!result.mealTypes.length && source.mealType) result.mealTypes = [String(source.mealType)].filter((item) => OPTIONS.mealTypes.includes(item));
    if (!result.availability.length && ["ready", "missing"].includes(source.availability)) result.availability = source.availability === "ready" ? ["ready"] : ["shopping"];
    return result;
  }

  function normalizeMetadata(value) {
    const source = value && typeof value === "object" ? value : {};
    const metadata = {};
    ["dietaryPatterns", "fastingTypes", "allergenExclusions", "nutritionTags"].forEach((group) => {
      metadata[group] = Array.isArray(source[group])
        ? [...new Set(source[group].map(String).filter((item) => OPTIONS[group].includes(item)))]
        : [];
    });
    const minutes = Number(source.preparationMinutes);
    metadata.preparationMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : null;
    return metadata;
  }

  function toggle(filters, group, value, checked) {
    const result = normalize(filters);
    if (!GROUPS.includes(group) || !OPTIONS[group].includes(String(value))) return result;
    const set = new Set(result[group]);
    if (checked) set.add(String(value)); else set.delete(String(value));
    result[group] = [...set];
    return result;
  }

  function remove(filters, group, value) {
    return toggle(filters, group, value, false);
  }

  function hasActive(filters) {
    const value = normalize(filters);
    return Boolean(value.search.trim() || GROUPS.some((group) => value[group].length));
  }

  function matches(recipe, filters, context = {}) {
    const value = normalize(filters);
    const legacy = normalizeMetadata(recipe?.filterMetadata);
    const derived = context.derivedProfile || window.MentorRecipeProfileService.deriveRecipeProfile(recipe);
    const metadata = { ...derived, preparationMinutes:legacy.preparationMinutes };
    const needle = value.search.trim().toLocaleLowerCase();
    if (needle && !String(context.searchText || "").toLocaleLowerCase().includes(needle)) return false;
    if (value.mealTypes.length && !value.mealTypes.includes(String(recipe?.mealType || ""))) return false;
    if (value.dietaryPatterns.length && !value.dietaryPatterns.some((item) => metadata.dietaryPatterns.includes(item))) return false;
    if (value.fastingTypes.length && !value.fastingTypes.some((item) => metadata.fastingTypes.includes(item))) return false;
    if (value.nutritionTags.length && !value.nutritionTags.some((item) => metadata.nutritionTags.includes(item))) return false;
    if (value.allergenExclusions.length && !value.allergenExclusions.every((item) => metadata.allergenExclusions.includes(item))) return false;
    if (value.preparationTime.length && !value.preparationTime.some((item) => metadata.preparationMinutes !== null && metadata.preparationMinutes <= Number(item))) return false;
    if (value.availability.length) {
      const statuses = context.availabilityStatuses instanceof Set ? context.availabilityStatuses : new Set(context.availabilityStatuses || []);
      if (!value.availability.some((item) => statuses.has(item))) return false;
    }
    return true;
  }

  window.MentorRecipeFilterService = { GROUPS, OPTIONS, empty, normalize, normalizeMetadata, toggle, remove, hasActive, matches };
})();
