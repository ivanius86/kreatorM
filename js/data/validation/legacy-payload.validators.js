(function (root) {
  "use strict";

  const namespace = root.MentorDataPhase0 = root.MentorDataPhase0 || {};
  const FOOD_ARRAYS = ["userFoods", "userFoodNutrients", "userFoodPortions", "userSources"];
  const INVENTORY_ARRAYS = ["batches", "locations", "allocations", "preferences", "stores", "recipes", "mealPlanEntries", "shoppingItems", "migrations"];

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function parseJson(raw) {
    try {
      return { ok: true, value: JSON.parse(raw) };
    } catch (_) {
      return { ok: false, value: null, errorCode: "INVALID_JSON" };
    }
  }

  function requireArrays(value, keys, errors) {
    keys.forEach((key) => {
      if (!Array.isArray(value?.[key])) errors.push(`INVALID_ARRAY:${key}`);
    });
  }

  function validateDatabase(value, errors) {
    if (!isPlainObject(value)) return errors.push("INVALID_OBJECT");
    requireArrays(value, ["ideas", "finances", "tests", "comparisons", "assets", "references"], errors);
    if (!isPlainObject(value.settings)) errors.push("INVALID_OBJECT:settings");
  }

  function validateFinance(value, errors) {
    if (!isPlainObject(value)) return errors.push("INVALID_OBJECT");
    requireArrays(value, ["transactions", "budgets", "cashflowIncomes", "cashflowExpenses", "cashflowDebts", "importedTransactionFiles"], errors);
    if (value.categoryRules !== undefined && !isPlainObject(value.categoryRules)) errors.push("INVALID_OBJECT:categoryRules");
  }

  function validateAssets(value, errors) {
    if (!isPlainObject(value)) return errors.push("INVALID_OBJECT");
    requireArrays(value, ["assets", "debts"], errors);
  }

  function validateFoodEnvelope(value, errors) {
    if (!isPlainObject(value)) return errors.push("INVALID_OBJECT");
    if (Number(value.version) !== 1) errors.push("UNSUPPORTED_VERSION");
    requireArrays(value, FOOD_ARRAYS, errors);
    if (errors.length) return;
    const foodIds = new Set();
    const slugs = new Set();
    value.userFoods.forEach((food) => {
      if (!food?.id) errors.push("FOOD_ID_REQUIRED");
      else if (foodIds.has(String(food.id))) errors.push("FOOD_ID_DUPLICATE");
      if (food?.id) foodIds.add(String(food.id));
      if (food?.slug && slugs.has(String(food.slug))) {
        errors.push("FOOD_SLUG_DUPLICATE");
      }
      if (food?.slug) slugs.add(String(food.slug));
      if (food?.ownership !== "user") {
        errors.push("FOOD_OWNERSHIP_MUST_BE_USER");
      }
    });
    const nutrientKeys = new Set();
    value.userFoodNutrients.forEach((record) => {
      const key = `${record?.foodId || ""}:${record?.nutrientId || ""}`;
      if (!record?.foodId || !record?.nutrientId) {
        errors.push("FOOD_NUTRIENT_REFERENCE_REQUIRED");
      } else if (nutrientKeys.has(key)) {
        errors.push("FOOD_NUTRIENT_DUPLICATE");
      }
      nutrientKeys.add(key);
      if (record?.amount === undefined) {
        errors.push("FOOD_NUTRIENT_AMOUNT_REQUIRED");
      }
    });
  }

  function validateInventoryEnvelope(value, errors) {
    if (!isPlainObject(value)) return errors.push("INVALID_OBJECT");
    if (Number(value.version) !== 1) errors.push("UNSUPPORTED_VERSION");
    requireArrays(value, INVENTORY_ARRAYS, errors);
    if (value.recipeFavoriteIds !== undefined && (!Array.isArray(value.recipeFavoriteIds) || value.recipeFavoriteIds.some((id) => typeof id !== "string" || !id))) errors.push("INVALID_RECIPE_FAVORITES");
    if (errors.length) return;
    ["batches", "locations", "allocations", "stores", "shoppingItems"]
      .forEach((collection) => {
        const ids = new Set();
        value[collection].forEach((record) => {
          if (!record?.id) errors.push(`INVENTORY_ID_REQUIRED:${collection}`);
          else if (ids.has(String(record.id))) {
            errors.push(`INVENTORY_ID_DUPLICATE:${collection}`);
          }
          if (record?.id) ids.add(String(record.id));
        });
      });
  }

  function validateLegacyInventory(value, errors) {
    const rows = Array.isArray(value)
      ? value
      : Array.isArray(value?.items)
        ? value.items
        : Array.isArray(value?.stock)
          ? value.stock
          : null;
    if (!rows) errors.push("INVALID_LEGACY_INVENTORY_SHAPE");
  }

  function validateParsedValue(key, value) {
    const errors = [];
    switch (key) {
      case "mentor_database":
        validateDatabase(value, errors);
        break;
      case "mentor_brainstorming_ideas":
      case "mentorTransactionImportTemplatesV1":
      case "mentorFinancialComparisonSnapshotsV1":
      case "mentorFinancialComparisonOptionsV1":
        if (!Array.isArray(value)) errors.push("INVALID_ARRAY");
        break;
      case "mentorFinanceStateV1":
        validateFinance(value, errors);
        break;
      case "mentorFinanceAssetsV1":
        validateAssets(value, errors);
        break;
      case "mentorFinancialComparisonResearchCacheV1":
        if (!isPlainObject(value)) errors.push("INVALID_OBJECT");
        break;
      case "mentor_nutrition_foods_v1":
      case "mentor_nutrition_foods_v1_backup":
      case "mentor_nutrition_foods_v1_staging":
        validateFoodEnvelope(value, errors);
        break;
      case "mentor_nutrition_inventory_v1":
      case "mentor_nutrition_inventory_v1_backup":
      case "mentor_nutrition_inventory_v1_staging":
        validateInventoryEnvelope(value, errors);
        break;
      case "mentor_nutrition_plan_favorites_v1":
        if (!Array.isArray(value) || value.some((id) => typeof id !== "string" || !id)) errors.push("INVALID_RECIPE_FAVORITES");
        break;
      case "mentor_nutrition_fridge_v1":
      case "mentor_nutrition_stock_v1":
        validateLegacyInventory(value, errors);
        break;
      default:
        break;
    }
    return errors;
  }

  function validateSource(source, raw) {
    if (raw === null || raw === undefined) {
      return { status: "absent", parseStatus: "notAttempted", validationStatus: "notAttempted", errors: [], value: null };
    }

    if (source?.format === "raw") {
      return { status: "valid", parseStatus: "notRequired", validationStatus: "valid", errors: [], value: String(raw) };
    }

    if (source?.format === "string") {
      const value = String(raw);
      const errors = ["sr", "en"].includes(value) ? [] : ["UNSUPPORTED_LANGUAGE"];
      return {
        status: errors.length ? "invalid" : "valid",
        parseStatus: "notRequired",
        validationStatus: errors.length ? "invalid" : "valid",
        errors,
        value
      };
    }

    const parsed = parseJson(String(raw));
    if (!parsed.ok) {
      return {
        status: "invalid",
        parseStatus: "invalid",
        validationStatus: "notAttempted",
        errors: [parsed.errorCode],
        value: null
      };
    }

    const errors = validateParsedValue(source?.key, parsed.value);
    return {
      status: errors.length ? "invalid" : "valid",
      parseStatus: "valid",
      validationStatus: errors.length ? "invalid" : "valid",
      errors,
      value: parsed.value
    };
  }

  namespace.LegacyPayloadValidators = Object.freeze({
    isPlainObject,
    parseJson,
    validateParsedValue,
    validateSource
  });
})(typeof window !== "undefined" ? window : globalThis);
