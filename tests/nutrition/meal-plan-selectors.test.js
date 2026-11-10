const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

global.window = global;
vm.runInThisContext(fs.readFileSync(path.join(__dirname, "../../js/nutrition/services/meal-plan-selectors.js"), "utf8"));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, "../../js/nutrition/services/unit-conversion.service.js"), "utf8"));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, "../../js/nutrition/services/recipe-profile.service.js"), "utf8"));

const definitions = {
  energyKcal:{ id:"n-energy", code:"energyKcal" },
  protein:{ id:"n-protein", code:"protein", dailyReference:50 },
  carbohydrate:{ id:"n-carbs", code:"carbohydrate", dailyReference:260 },
  totalFat:{ id:"n-fat", code:"totalFat", dailyReference:70 },
  fiber:{ id:"n-fiber", code:"fiber", dailyReference:30 },
  saturatedFat:{ id:"n-saturated-fat", code:"saturatedFat" },
  monounsaturatedFat:{ id:"n-monounsaturated-fat", code:"monounsaturatedFat" },
  polyunsaturatedFat:{ id:"n-polyunsaturated-fat", code:"polyunsaturatedFat" },
  transFat:{ id:"n-trans-fat", code:"transFat" }
};
const nutrients = {
  getById(id) { return Object.values(definitions).find((row) => row.id === id) || null; },
  getByCode(code) { return definitions[code] || null; }
};
const foodsById = new Map([
  ["complete", { id:"complete" }],
  ["partial", { id:"partial" }],
  ["egg", { id:"egg", categoryId:"eggs" }]
]);
const foods = {
  getById(id) { return foodsById.get(id) || null; },
  getNutrients(id) {
    const complete = [
      ["energyKcal", 200], ["protein", 10], ["carbohydrate", 20], ["totalFat", 5], ["fiber", 3]
    ];
    return complete.map(([code, amount]) => ({ nutrientId:definitions[code].id, amount:id === "partial" && code === "fiber" ? null : amount, basisAmount:100 }));
  }
};
const recipeProfile = { gramsForIngredient(ingredient) { return Number(ingredient.quantity); } };
const overrides = { foods, nutrients, recipeProfile, conversion:{ convert:(value) => value, convertForFood:(value) => value } };

test("central portion conversion uses 50 g for one egg", () => {
  assert.equal(window.MentorRecipeProfileService.gramsForIngredient(
    { quantity:3, unit:"kom" },
    { id:"egg", categoryId:"eggs", defaultServingGrams:100 }
  ), 150);
});

test("recipe nutrition respects planned servings", () => {
  const recipe = { id:"r1", servings:2, ingredients:[{ foodId:"complete", quantity:100, unit:"g" }] };
  const result = window.MentorMealPlanSelectors.recipeNutrition(recipe, 3, overrides);
  assert.equal(result.values.energyKcal, 300);
  assert.equal(result.values.protein, 15);
  assert.equal(result.values.fiber, 4.5);
});

test("incomplete nutrient data stays null instead of becoming zero", () => {
  const recipe = { id:"r2", servings:1, ingredients:[{ foodId:"partial", quantity:100, unit:"g" }] };
  const result = window.MentorMealPlanSelectors.recipeNutrition(recipe, 1, overrides);
  assert.equal(result.values.energyKcal, 200);
  assert.equal(result.known.fiber, false);
  assert.equal(result.values.fiber, null);
});

test("meal plan calories fall back to macro calculation when kcal is missing", () => {
  const foodsWithoutKcal = {
    ...foods,
    getNutrients(id) {
      return foods.getNutrients(id).map((row) => (
        nutrients.getById(row.nutrientId)?.code === "energyKcal" ? { ...row, amount:null } : row
      ));
    }
  };
  const recipe = { id:"macro-recipe", servings:1, ingredients:[{ foodId:"complete", quantity:100, unit:"g" }] };
  const result = window.MentorMealPlanSelectors.recipeNutrition(recipe, 1, { ...overrides, foods:foodsWithoutKcal });
  assert.equal(result.known.energyKcal, true);
  assert.equal(result.values.energyKcal, 165);
});

test("fat components provide only a partial calorie estimate when core macros are missing", () => {
  const oilFoods = {
    getById(id) { return id === "oil" ? { id:"oil" } : null; },
    getNutrients() {
      return [
        { nutrientId:definitions.energyKcal.id, amount:null, basisAmount:100 },
        { nutrientId:definitions.protein.id, amount:null, basisAmount:100 },
        { nutrientId:definitions.carbohydrate.id, amount:null, basisAmount:100 },
        { nutrientId:definitions.totalFat.id, amount:null, basisAmount:100 },
        { nutrientId:definitions.saturatedFat.id, amount:15, basisAmount:100 },
        { nutrientId:definitions.monounsaturatedFat.id, amount:70, basisAmount:100 },
        { nutrientId:definitions.polyunsaturatedFat.id, amount:10, basisAmount:100 },
        { nutrientId:definitions.transFat.id, amount:null, basisAmount:100 }
      ];
    }
  };
  const recipe = { id:"oil-recipe", servings:1, ingredients:[{ foodId:"oil", quantity:10, unit:"g" }] };
  const result = window.MentorMealPlanSelectors.recipeNutrition(recipe, 1, { ...overrides, foods:oilFoods });
  assert.equal(result.known.energyKcal, false);
  assert.equal(result.values.energyKcal, null);
  assert.equal(result.partialValues.energyKcal, 86);
});

test("incomplete macros cannot turn missing calories into a known total", () => {
  const incomplete = { ...foods, getNutrients(id) {
    return foods.getNutrients(id).map((row) => {
      const code = nutrients.getById(row.nutrientId)?.code;
      return code === "energyKcal" || code === "carbohydrate" ? { ...row, amount:null } : row;
    });
  } };
  const recipe = { servings:1, ingredients:[{ foodId:"complete", quantity:100, unit:"g" }] };
  const result = window.MentorMealPlanSelectors.recipeNutrition(recipe, 1, { ...overrides, foods:incomplete });
  assert.equal(result.known.energyKcal, false);
  assert.equal(result.values.energyKcal, null);
  assert.equal(result.partialValues.energyKcal, 85);
});

test("zero calories remain a known zero when supplied directly", () => {
  const zero = { ...foods, getNutrients(id) { return foods.getNutrients(id).map((row) =>
    nutrients.getById(row.nutrientId)?.code === "energyKcal" ? { ...row, amount:0 } : row); } };
  const result = window.MentorMealPlanSelectors.recipeNutrition({ servings:1, ingredients:[{ foodId:"complete", quantity:100, unit:"g" }] }, 1, { ...overrides, foods:zero });
  assert.equal(result.known.energyKcal, true);
  assert.equal(result.values.energyKcal, 0);
});

test("non-finite legacy serving counts never become known zero nutrition", () => {
  const recipe = { servings:Infinity, ingredients:[{ foodId:"complete", quantity:100, unit:"g" }] };
  const result = window.MentorMealPlanSelectors.recipeNutrition(recipe, 1, overrides);
  assert.equal(result.known.energyKcal, false);
  assert.equal(result.known.protein, false);
  assert.equal(result.values.energyKcal, null);
  assert.equal(result.values.protein, null);
});

test("micronutrient status and summary remain unknown for incomplete ingredients", () => {
  const vitamin = { id:"vit-c", code:"vitaminC", group:"vitamin", unit:"mg", dailyReference:100 };
  const microNutrients = { getAll:() => [vitamin], getById:(id) => id === vitamin.id ? vitamin : null };
  const microFoods = { getById:(id) => ({ id }), getNutrients:(id) => id === "known" ? [{ nutrientId:vitamin.id, amount:80, basisAmount:100 }] : [] };
  const microOverrides = { ...overrides, foods:microFoods, nutrients:microNutrients };
  const recipes = [{ id:"r", servings:1, ingredients:[{ foodId:"known", quantity:100, unit:"g" }, { foodId:"missing", quantity:100, unit:"g" }] }];
  const entries = [{ recipeId:"r", servings:1 }];
  const result = window.MentorMealPlanSelectors.micronutrientSummary(entries, recipes, microOverrides);
  assert.equal(window.MentorMealPlanSelectors.micronutrientStatus(null), "unknown");
  assert.equal(window.MentorMealPlanSelectors.micronutrientStatus(""), "unknown");
  assert.equal(result.status, "unknown");
  assert.equal(result.percent, null);
  assert.equal(result.nutrients[0].amount, null);
  assert.equal(result.nutrients[0].complete, false);
  const complete = window.MentorMealPlanSelectors.micronutrientSummary(entries, [{ ...recipes[0], ingredients:recipes[0].ingredients.slice(0,1) }], microOverrides);
  assert.equal(complete.nutrients[0].amount, 80);
  assert.equal(complete.nutrients[0].status, "optimal");
});

test("daily and weekly aggregates include only planned days in averages", () => {
  const recipes = [{ id:"r1", servings:1, ingredients:[{ foodId:"complete", quantity:100, unit:"g" }] }];
  const entries = [
    { id:"e1", recipeId:"r1", plannedDate:"2026-07-27", servings:1 },
    { id:"e2", recipeId:"r1", plannedDate:"2026-07-27", servings:2 },
    { id:"outside", recipeId:"r1", plannedDate:"2026-08-03", servings:10 }
  ];
  const days = window.MentorMealPlanSelectors.groupByDay(entries, recipes, ["2026-07-27", "2026-07-28"], overrides);
  assert.equal(days[0].values.energyKcal, 600);
  assert.equal(days[0].values.protein, 30);
  assert.equal(days[1].values.energyKcal, null);
  const week = window.MentorMealPlanSelectors.weeklySummary(days, [], { energyKcal:600, protein:50 });
  assert.equal(week.plannedMeals, 2);
  assert.equal(week.averageCalories, 600);
  assert.equal(week.daysInGoal, 1);
});

test("mixed complete and incomplete meals preserve known totals and null unknown totals", () => {
  const recipes = [
    { id:"complete-recipe", servings:1, ingredients:[{ foodId:"complete", quantity:100, unit:"g" }] },
    { id:"partial-recipe", servings:1, ingredients:[{ foodId:"partial", quantity:100, unit:"g" }] }
  ];
  const result = window.MentorMealPlanSelectors.aggregateEntries([
    { recipeId:"complete-recipe", servings:1 },
    { recipeId:"partial-recipe", servings:1 }
  ], recipes, overrides);
  assert.equal(result.values.energyKcal, 400);
  assert.equal(result.values.protein, 20);
  assert.equal(result.known.fiber, false);
  assert.equal(result.values.fiber, null);
});

test("missing allocations are combined by food and unit", () => {
  const entries = [{ id:"e1" }, { id:"e2" }];
  const allocations = [
    { mealPlanEntryId:"e1", foodId:"egg", unit:"kom", requiredQuantity:3, reservedQuantity:2, status:"partially_reserved" },
    { mealPlanEntryId:"e2", foodId:"egg", unit:"kom", requiredQuantity:4, reservedQuantity:3, status:"partially_reserved" }
  ];
  const rows = window.MentorMealPlanSelectors.missingIngredients(entries, allocations, overrides);
  assert.deepEqual(rows, [{ foodId:"egg", unit:"kom", required:7, available:5, reserved:5, missing:2 }]);
});
test("a planned saved recipe contributes its real missing ingredients to the weekly shopping rows", () => {
  const recipes = [{ id: "saved-chicken", servings: 4, ingredients: [
    { foodId: "complete", quantity: 1200, unit: "g" },
    { foodId: "partial", quantity: 400, unit: "g" }
  ] }];
  const entries = [{ id: "planned-lunch", recipeId: "saved-chicken", plannedDate: "2026-10-29", servings: 1, status: "planned" }];
  const allocations = [
    { mealPlanEntryId: "planned-lunch", foodId: "complete", unit: "g", requiredQuantity: 100, reservedQuantity: 100, status: "reserved" },
    { mealPlanEntryId: "planned-lunch", foodId: "complete", unit: "g", requiredQuantity: 200, reservedQuantity: 0, status: "partially_reserved" },
    { mealPlanEntryId: "planned-lunch", foodId: "partial", unit: "g", requiredQuantity: 100, reservedQuantity: 0, status: "missing" }
  ];
  const rows = window.MentorMealPlanSelectors.missingIngredients(entries, allocations, { ...overrides, recipes });
  assert.deepEqual(rows.map(({ foodId, required, available, missing }) => ({ foodId, required, available, missing })), [
    { foodId: "complete", required: 300, available: 100, missing: 200 },
    { foodId: "partial", required: 100, available: 0, missing: 100 }
  ]);
  assert.deepEqual(window.MentorMealPlanSelectors.missingIngredients([], allocations, { ...overrides, recipes }), []);
});

test("egg requirements combine count recipes with inventory stored in grams", () => {
  const conversion = window.MentorNutritionUnitConversion;
  const entries = [{ id:"e1", recipeId:"egg-recipe", servings:1, status:"planned" }];
  const recipes = [{ id:"egg-recipe", servings:1, ingredients:[{ foodId:"egg", quantity:7, unit:"kom" }] }];
  const allocations = [
    { mealPlanEntryId:"e1", foodId:"egg", unit:"g", requiredQuantity:250, reservedQuantity:250, status:"reserved" },
    { mealPlanEntryId:"e1", foodId:"egg", unit:"kom", requiredQuantity:2, reservedQuantity:0, status:"partially_reserved" }
  ];
  const rows = window.MentorMealPlanSelectors.missingIngredients(entries, allocations, { ...overrides, recipes, conversion });
  assert.deepEqual(rows, [{ foodId:"egg", unit:"kom", required:7, available:5, reserved:5, missing:2 }]);
});

test("estimated cost rejects incomplete price metadata and mixed currencies", () => {
  const entries = [{ id:"e1" }], allocations = [{ mealPlanEntryId:"e1", inventoryBatchId:"b1", foodId:"complete", unit:"g", reservedQuantity:50, status:"reserved" }];
  const valid = [{ id:"b1", totalPrice:10, currency:"EUR", initialQuantity:100, unit:"g" }];
  assert.deepEqual(window.MentorMealPlanSelectors.estimatedCost(entries, allocations, valid, overrides), { value:5, currency:"EUR" });
  assert.equal(window.MentorMealPlanSelectors.estimatedCost(entries, allocations, [{ ...valid[0], totalPrice:null }], overrides), null);
  assert.equal(window.MentorMealPlanSelectors.estimatedCost(entries, allocations, [{ ...valid[0], totalPrice:"" }], overrides), null);
  assert.equal(window.MentorMealPlanSelectors.estimatedCost(entries, allocations, [{ ...valid[0], currency:"" }], overrides), null);
  assert.equal(window.MentorMealPlanSelectors.estimatedCost(entries, allocations, [], overrides), null);
  assert.equal(window.MentorMealPlanSelectors.estimatedCost(entries, [{ ...allocations[0], status:"partially_reserved" }], valid, overrides), null);
  assert.equal(window.MentorMealPlanSelectors.estimatedCost(entries, [{ ...allocations[0], inventoryBatchId:null, status:"missing" }], valid, overrides), null);
  const twoAllocations = [...allocations, { ...allocations[0], inventoryBatchId:"b2" }];
  const mixed = [...valid, { ...valid[0], id:"b2", currency:"USD" }];
  assert.equal(window.MentorMealPlanSelectors.estimatedCost(entries, twoAllocations, mixed, overrides), null);
});
