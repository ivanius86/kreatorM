(function (root) {
  "use strict";

  const MACRO_CODES = Object.freeze(["energyKcal", "protein", "carbohydrate", "totalFat", "fiber"]);
  const record = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
  const text = (value) => typeof value === "string" && Boolean(value.trim());
  const positive = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;
  const amount = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;
  const timestamp = (value) => text(value) && Number.isFinite(Date.parse(value));
  function validDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + "T00:00:00Z");
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  function validateEntry(value) {
    const errors = [];
    if (!record(value)) return ["INTAKE_RECORD_INVALID"];
    for (const key of ["id", "mealPlanEntryId", "recipeId", "recipeName"]) if (!text(value[key])) errors.push(`INTAKE_FIELD_INVALID:${key}`);
    if (!["breakfast", "lunch", "dinner", "snack"].includes(value.mealType)) errors.push("INTAKE_MEAL_TYPE_INVALID");
    if (!validDate(value.eatenDate)) errors.push("INTAKE_DATE_INVALID");
    if (!positive(value.servings)) errors.push("INTAKE_SERVINGS_INVALID");
    if (!timestamp(value.createdAt) || !timestamp(value.updatedAt)) errors.push("INTAKE_TIMESTAMP_INVALID");
    const snapshot = value.nutritionSnapshot;
    if (!record(snapshot) || snapshot.version !== 1 || !positive(snapshot.basisServings) || !timestamp(snapshot.capturedAt)) return [...errors, "INTAKE_SNAPSHOT_INVALID"];
    if (!["values", "partialValues", "known", "observed"].every((key) => record(snapshot[key]))) return [...errors, "INTAKE_NUTRIENT_MAP_INVALID"];
    MACRO_CODES.forEach((code) => {
      const known = snapshot.known[code], observed = snapshot.observed[code];
      if (typeof known !== "boolean" || typeof observed !== "boolean" || (known && !observed)
        || (known ? !amount(snapshot.values[code]) : snapshot.values[code] !== null)
        || (observed ? !amount(snapshot.partialValues[code]) : snapshot.partialValues[code] !== null)) errors.push(`INTAKE_NUTRIENT_INVALID:${code}`);
    });
    if (!Array.isArray(snapshot.micronutrients)) errors.push("INTAKE_MICRONUTRIENTS_INVALID");
    else {
      const seen = new Set();
      snapshot.micronutrients.forEach((nutrient) => {
        if (!record(nutrient) || !text(nutrient.code) || !text(nutrient.unit) || !positive(nutrient.dailyReference)
          || typeof nutrient.complete !== "boolean" || (nutrient.complete ? !amount(nutrient.amount) : nutrient.amount !== null)
          || seen.has(nutrient.code)) errors.push("INTAKE_MICRONUTRIENT_INVALID");
        if (nutrient?.code) seen.add(nutrient.code);
      });
    }
    return errors;
  }

  function validateEntries(entries) {
    if (!Array.isArray(entries)) return ["INTAKE_COLLECTION_INVALID"];
    const errors = [], ids = new Set(), sources = new Set();
    entries.forEach((entry) => {
      errors.push(...validateEntry(entry));
      if (ids.has(entry?.id)) errors.push("INTAKE_ID_DUPLICATE");
      if (sources.has(entry?.mealPlanEntryId)) errors.push("INTAKE_MEAL_DUPLICATE");
      ids.add(entry?.id); sources.add(entry?.mealPlanEntryId);
    });
    return errors;
  }

  root.MentorNutritionIntakeValidation = Object.freeze({ MACRO_CODES, validDate, validateEntry, validateEntries });
})(typeof window !== "undefined" ? window : globalThis);
