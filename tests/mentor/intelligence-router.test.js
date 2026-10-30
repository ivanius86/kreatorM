const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function fixture() {
  const foods = [
    { id: "milk", defaultName: "Mleko", status: "active" },
    { id: "rice_white", defaultName: "Pirinač, beli", status: "active" },
    { id: "rice_brown", defaultName: "Pirinač, integralni", status: "active" },
    { id: "oats", defaultName: "Ovsene pahuljice", status: "active" },
    { id: "eggs", defaultName: "Jaje", status: "active" }
  ];
  const batches = [
    { id: "milk1", foodId: "milk", locationId: "location_fridge", quantity: 2, unit: "l", status: "available" },
    { id: "milk2", foodId: "milk", locationId: "location_fridge", quantity: 1, unit: "l", expiryDate: "2020-01-01", status: "available" },
    { id: "eggs1", foodId: "eggs", locationId: "location_fridge", quantity: 6, unit: "kom", status: "available" }
  ];
  const allocations = [{ inventoryBatchId: "milk1", reservedQuantity: 500, unit: "ml", status: "reserved" }];
  const recipes = [
    { id: "pancakes", name: "Palačinke", mealType: "breakfast", ingredients: [] },
    { id: "salad", name: "Veganska salata", mealType: "lunch", ingredients: [] },
    { id: "unknown", name: "Nepoznato jelo", mealType: "lunch", ingredients: [] }
  ];
  const local = new Date(), tomorrow = new Date(local.getFullYear(), local.getMonth(), local.getDate() + 1);
  const iso = date => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  const entries = [{ id: "meal1", plannedDate: iso(tomorrow), mealType: "lunch", recipeId: "salad", servings: 2, status: "planned" }];
  let modelCalls = 0, reads = 0, writes = 0;
  const context = vm.createContext({ console, Intl, Date, Map, Set }); context.window = context;
  context.addEventListener = () => {};
  context.MentorI18n = { getLanguage: () => "sr", t: key => key };
  context.MentorLazy = { async loadFeature(name) { assert.equal(name, "nutrition"); } };
  context.MentorChatClient = { async route() { modelCalls++; return { capabilityId: "nutrition.recipe.search" }; } };
  context.MentorFoodRepository = {
    getAll: () => { reads++; return foods.map(row => ({ ...row })); },
    getById: id => foods.find(row => row.id === id),
    query: ({ search }) => foods.filter(row => row.defaultName.toLowerCase().includes(search.toLowerCase()))
  };
  context.MentorFoodNutritionService = {
    details: id => id === "oats" ? { byCode: new Map([["protein", { nutrientId: "protein-id", amount: 13, basisAmount: 100 }]]) } : { byCode: new Map() },
    scale: (id, grams) => id === "oats" ? { nutrients: [{ nutrientId: "protein-id", amount: 13 * grams / 100 }] } : null
  };
  context.MentorInventoryRepository = {
    getLocations: () => [{ id: "location_fridge", name: "Frižider" }, { id: "location_freezer", name: "Zamrzivač" }, { id: "location_pantry", name: "Ostava" }, { id: "location_custom", name: "Podrum" }],
    getBatches: () => { reads++; return batches.map(row => ({ ...row })); },
    getAllocations: () => allocations.map(row => ({ ...row })), getPreferences: () => [],
    updateBatch: () => { writes++; throw new Error("unexpected write"); }
  };
  context.MentorPlanningService = { available: (id, unit) => id === "milk" && unit === "l" ? 1.5 : 0 };
  context.MentorPlanningRepository = { getRecipes: () => { reads++; return recipes.map(row => ({ ...row })); }, getMealPlanEntries: () => { reads++; return entries.map(row => ({ ...row })); } };
  context.MentorRecipeProfileService = { deriveRecipeProfile: item => ({ dietaryPatterns: item.id === "salad" ? ["vegan"] : [] }) };
  context.MentorRecipeFilterService = { matches: (_, filters, { derivedProfile }) => filters.dietaryPatterns.every(tag => derivedProfile.dietaryPatterns.includes(tag)) };
  context.MentorMealPlanSelectors = { groupByDay: (selected, _, dates) => dates.map(date => ({ date, mealCount: selected.filter(entry => entry.plannedDate === date).length, rows: selected.filter(entry => entry.plannedDate === date).map(entry => ({ entry })) })) };
  for (const file of ["js/nutrition/services/unit-conversion.service.js", "js/nutrition/services/inventory.service.js", "js/mentor/mentor-capability-registry.js", "js/mentor/mentor-nutrition-inventory-read.js", "js/mentor/mentor-nutrition-read.js", "js/mentor/mentor-intelligence-router.js"])
    vm.runInContext(fs.readFileSync(path.join(__dirname, "../..", file), "utf8"), context);
  return { registry: context.MentorCapabilityRegistry, router: context.MentorIntelligenceRouter, nutrition: context.MentorNutritionRead, foods, batches, recipes, entries, tomorrow: iso(tomorrow), getModelCalls: () => modelCalls, getReads: () => reads, getWrites: () => writes };
}

test("ambiguous inventory food can be resolved locally by name or number without old goal context", async () => {
  const f = fixture();
  const candidates = [{ id: "eggs", name: "Jaje, celo, sirovo" }, { id: "quail", name: "Jaja japanske prepelice" }];
  assert.equal(f.nutrition.resolveFoodChoice(candidates, "jaje celo"), "eggs");
  assert.equal(f.nutrition.resolveFoodChoice(candidates, "2"), "quail");
  assert.equal(f.nutrition.resolveFoodChoice(candidates, "1. Jaje, celo, sirovo"), "eggs");
  assert.equal(f.nutrition.resolveFoodChoice(candidates, "1. Jaja japanske prepelice"), null);
  assert.equal(f.nutrition.resolveFoodChoice(candidates, "jaja"), null);
  const continued = f.router.continueRead({ capabilityId: "nutrition.inventory.getAvailability", input: { text: "Koliko jaja imam u frižideru?" }, candidates }, "jaje celo");
  assert.equal(continued.mode, "local");
  assert.equal(continued.input.foodId, "eggs");
  assert.equal(f.router.continueRead({ capabilityId: "nutrition.inventory.getAvailability", input: { text: "Koliko jaja imam u frižideru?" }, candidates }, "jaja").reason, "chooseFood");
  const result = await f.registry.execute("nutrition.inventory.getAvailability", { text: "Koliko jaja imam u frižideru?", foodId: "eggs" }, { authorize: () => true });
  assert.equal(result.status, "known");
  assert.equal(result.rows[0].total, 6);
  assert.equal(f.getModelCalls(), 0);
});

test("router selects all five read capabilities locally and preserves existing write requests", async () => {
  const f = fixture();
  const cases = [
    ["Pronađi pirinač.", "nutrition.food.search"],
    ["Koje vrste mleka imam u katalogu?", "nutrition.food.search"],
    ["Koliko proteina ima 100 g ovsenih pahuljica?", "nutrition.food.search"],
    ["Koliko mleka imam u frižideru?", "nutrition.inventory.getAvailability"],
    ["Imam li dovoljno jaja za večeru?", "nutrition.inventory.getAvailability"],
    ["Koje recepte imam?", "nutrition.recipe.search"],
    ["Imam li neki veganski recept?", "nutrition.recipe.search"],
    ["Šta imam sutra za ručak?", "nutrition.mealPlan.get"],
    ["Prikaži mi plan ishrane za ovu nedelju.", "nutrition.mealPlan.get"],
    ["Koliko obroka imam planirano za narednih sedam dana?", "nutrition.mealPlan.get"],
    ["Koliko zaliha imam u ostavi?", "nutrition.inventory.getSummary"]
  ];
  for (const [text, id] of cases) { const choice = await f.router.decide(text); assert.equal(choice.capability?.id, id, text + " routed as " + choice.mode); }
  assert.equal((await f.router.decide("Koliko mleka imam u frižideru?", { followUpInventory: true })).capability.id, "nutrition.inventory.getAvailability");
  for (const text of ["Napravi mi cilj", "Kreiraj ideju", "Predloži recept", "Pronađi mi recept za piletinu", "Dodaj obrok u plan"]) assert.equal((await f.router.decide(text)).mode, "chat", text);
  assert.equal(f.getModelCalls(), 0);
  assert.equal(f.getReads(), 0);
});

test("recipe creation in Serbian plural stays with Mentor chat", async () => {
  const f = fixture();
  assert.equal((await f.router.decide("Napravi 5 recepata sa piletinom")).mode, "chat");
  assert.equal(f.getModelCalls(), 0);
  assert.equal(f.getReads(), 0);
});

test("food search reads catalog and known protein; unknown foods stay unknown", async () => {
  const f = fixture();
  const run = text => f.registry.execute("nutrition.food.search", { text }, { authorize: () => true });
  const rice = await run("Pronađi pirinač");
  assert.equal(rice.total, 2);
  assert.equal((await run("Koje vrste mleka imam u katalogu?")).rows[0].name, "Mleko");
  const oats = await run("Koliko proteina ima 100 g ovsenih pahuljica?");
  assert.equal(oats.rows[0].protein, 13);
  assert.equal((await run("Pronađi nepostojeću namirnicu")).status, "no_food");
  assert.equal(f.getWrites(), 0);
});

test("availability separates reserved, expired and free stock, and does not guess meal needs", async () => {
  const f = fixture();
  const run = text => f.registry.execute("nutrition.inventory.getAvailability", { text }, { authorize: () => true });
  const milk = await run("Koliko mleka imam u frižideru?");
  assert.equal(milk.name, "Mleko");
  assert.equal(milk.rows[0].total, 3);
  assert.equal(milk.rows[0].reserved, 0.5);
  assert.equal(milk.rows[0].expired, 1);
  assert.equal(milk.rows[0].available, 1.5);
  const requestedInFridge = await run("Imam li dovoljno 2 l mleka u frižideru?");
  assert.deepEqual({ available: requestedInFridge.enough.available, yes: requestedInFridge.enough.yes }, { available: 1.5, yes: false });
  assert.equal((await run("Koliko mleka imam u garaži?")).status, "unknown_location");
  const customLocation = await run("Koliko mleka imam u podrumu?");
  assert.equal(customLocation.place.id, "location_custom");
  assert.equal(customLocation.rows.length, 0);
  const eggs = await run("Imam li dovoljno jaja za večeru?");
  assert.equal(eggs.asksEnough, true);
  assert.equal(eggs.enough, null);
  assert.equal((await run("Koliko pirinča imam?")).status, "ambiguous_food");
  assert.equal((await run("Koliko kefira imam?")).status, "no_food");
  assert.equal(f.getWrites(), 0);
});

test("recipe search excludes unknown vegan profiles and plan uses the requested local dates", async () => {
  const f = fixture();
  const recipes = await f.registry.execute("nutrition.recipe.search", { text: "Imam li neki veganski recept?" }, { authorize: () => true });
  assert.equal(recipes.total, 1);
  assert.equal(recipes.rows[0].name, "Veganska salata");
  assert.equal((await f.registry.execute("nutrition.recipe.search", { text: "Pronađi recept za palačinke" }, { authorize: () => true })).rows[0].name, "Palačinke");
  assert.equal((await f.registry.execute("nutrition.recipe.search", { text: "Pronađi recept za čokoladnu tortu" }, { authorize: () => true })).total, 0);
  const plan = await f.registry.execute("nutrition.mealPlan.get", { text: "Šta imam sutra za ručak?" }, { authorize: () => true });
  assert.equal(plan.rows[0].date, f.tomorrow);
  assert.equal(plan.rows[0].meals[0].recipe, "Veganska salata");
  const nextSeven = await f.registry.execute("nutrition.mealPlan.get", { text: "Koliko obroka imam planirano za narednih sedam dana?" }, { authorize: () => true });
  assert.equal(nextSeven.countOnly, true);
  assert.equal(nextSeven.rows.reduce((sum, day) => sum + day.count, 0), 1);
  const emptyDay = await f.registry.execute("nutrition.mealPlan.get", { text: "Plan ishrane za 2025-01-01" }, { authorize: () => true });
  assert.equal(emptyDay.rows[0].count, 0);
  const week = f.nutrition.dateRange("Prikaži plan ishrane za ovu nedelju");
  assert.equal((new Date(week.startDate + "T00:00:00")).getDay(), 1);
  assert.equal((await f.registry.execute("nutrition.mealPlan.get", { text: "Plan ishrane za 2026-02-30" }, { authorize: () => true })).status, "need_date");
  assert.equal(f.getWrites(), 0);
});

test("ambiguous Nutrition request needs cloud permission and never sends stored Nutrition data", async () => {
  const f = fixture();
  const text = "Pogledaj recept i zalihe?";
  assert.ok(f.registry.matches(text).length > 1);
  assert.equal((await f.router.decide(text, { authorizeCloud: () => false })).reason, "cloudDenied");
  assert.equal(f.getModelCalls(), 0);
  const routed = await f.router.decide(text, { authorizeCloud: () => true });
  assert.equal(routed.capability.id, "nutrition.recipe.search");
  assert.equal(f.getModelCalls(), 1);
  assert.equal(f.getReads(), 0);
  await assert.rejects(f.registry.execute(routed.capability.id, routed.input, { authorize: () => false }), { code: "CAPABILITY_PERMISSION_DENIED" });
  assert.equal(f.getReads(), 0);
});
