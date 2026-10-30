"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const protocol = require("../../js/mentor/mentor-protocol.js"), policy = require("../../server/action-policy.js");
const relations = require("../../server/recipe-food-relations.js");
const { eligibleFoods } = require("../../server/public-food-catalog.js");
const foods = eligibleFoods();
const beans = foods.find(row => row.id === "food_beans_pinto_boiled"), ribs = foods.find(row => row.id === "food_smoked_pork_ribs_cia_aboliv"), onion = foods.find(row => row.id === "food_onion_raw");
function run({ sourceIngredients, ingredients, catalog = false, text = "NAPRAVI MI RECEPT, PASULJ SA REBRIMA", description } = {}) {
  const request = protocol.validateRequest({ requestId: "beans-ribs-catalog", language: "sr", messages: [{ id: "user-beans", role: "user", text }], goalContext: null });
  const intent = policy.constrainIntent(policy.deriveCandidate(request), { evidence: text, requests: [{ action: "createRecipe", count: 1 }] }, request);
  const source = { id: "53306", title: "Pork rib bortsch", url: "https://www.themealdb.com/meal.php?c=53306", originalImageUrl: "", ingredients: sourceIngredients || [{ name: "Dried white beans", measure: "1 tablespoon" }, { name: "Pork Back Ribs", measure: "1 kg" }] };
  const proposal = { action: "createRecipe", name: "Pasulj sa rebrima", description: description || "1. Kuvaj rebra dok ne omekšaju.\n2. Dodaj kuvani pasulj i povrće i dovrši jelo.", servings: 4, mealType: "lunch", sourceId: catalog ? "catalog" : source.id, adapted: true, adaptationNote: "Koristi 500 g kuvanog pinto pasulja umesto suvog belog; 600 g dimljenih rebara umesto svežih, sa prilagođenim postupkom.", unresolved: [], ingredients: ingredients || [beans, ribs, onion].map((food, i) => ({ foodId: food.id, name: food.name, quantity: [500, 600, 150][i], unit: "g" })) };
  return policy.applyPolicy({ reply: "Pregled", recipes: undefined, proposals: [proposal] }, intent, request, { foods, sources: { get: id => id === source.id ? source : null } }).proposals[0];
}
test("the reported dried-white-beans source accepts the real cooked-pinto catalog adaptation regardless of row order", () => {
  for (const order of [[beans,ribs,onion], [ribs,beans,onion], [onion,ribs,beans]]) {
    const result = run({ ingredients: order.map(food => ({ foodId: food.id, name: food.name, quantity: 150, unit: "g" })) });
    assert.deepEqual(result.unresolved, []);
    assert.equal(result.ingredients.find(row => row.foodId === beans.id).quantity, 150);
  }
});
test("an unrelated or partial source cannot be rescued by putting onion first", () => {
  for (const sourceIngredients of [[{ name: "Onion", measure: "100 g" }], [{ name: "White beans", measure: "500 g" }]]) {
    const result = run({ sourceIngredients, ingredients: [onion,beans,ribs].map(food => ({ foodId: food.id, name: food.name, quantity: 100, unit: "g" })) });
    assert.ok(result.unresolved.length);
  }
});

test("chicken source matching is independent of an onion placed first", () => {
  const chicken = foods.find(food => food.id === "food_chicken_breast_skinless_raw");
  const result = run({ text: "Napravi recept sa piletinom", sourceIngredients: [{ name: "Onion", measure: "100 g" }], ingredients: [onion, chicken].map(food => ({ foodId: food.id, name: food.name, quantity: 100, unit: "g" })) });
  assert.ok(result.unresolved.some(issue => issue.includes("Piletina")));
});
test("catalog beans and ribs can be proposed without TheMealDB, while real cooking steps are required", () => {
  const result = run({ catalog: true });
  assert.deepEqual(result.unresolved, []); assert.equal(result.source, undefined);
  assert.ok(run({ catalog: true, description: "Klasično jelo bogatog ukusa." }).unresolved.some(issue => issue.includes("numerisana")));
  assert.throws(() => protocol.validateProposal({ ...result, source: { provider: "TheMealDB" } }), { code: "INVALID_RESPONSE" });
});
test("missing requested foods stay blocked and offer creation or regeneration alternatives without converting weights", () => {
  const result = run({ catalog: true, ingredients: [{ foodId: "missing:cooked-white-beans", name: "Beli pasulj, kuvan", quantity: 500, unit: "g" }, { foodId: ribs.id, name: ribs.name, quantity: 600, unit: "g" }] });
  const request = result.resolutionRequests.find(row => row.kind === "missing");
  assert.ok(request); assert.ok(request.candidates.some(row => row.id === beans.id));
  assert.ok(result.unresolved.length); assert.equal(result.ingredients[0].foodId, "missing:cooked-white-beans");
  const omitted = run({ catalog: true, ingredients: [{ foodId: beans.id, name: beans.name, quantity: 500, unit: "g" }] });
  assert.ok(omitted.resolutionRequests.some(row => row.kind === "missing" && row.name === "Rebra"));
  const kilograms = run({ catalog: true, ingredients: [{ foodId: "missing:beans", name: "Pasulj posebni, kuvan", quantity: 1, unit: "kg" }, { foodId: ribs.id, name: ribs.name, quantity: 600, unit: "g" }] });
  assert.doesNotThrow(() => protocol.validateResponse({ reply: "Pregled", proposals: [kilograms], intent: null }));
  assert.equal(kilograms.ingredients[0].quantity, 1000);
  assert.equal(kilograms.resolutionRequests.find(row => row.kind === "missing").quantity, null);
});
test("culinary families never alias unrelated legumes or different animal ribs", () => {
  for (const name of ["Green beans", "Soy beans", "Broad beans", "Fava beans", "Lentils", "Chickpeas"]) assert.notEqual(relations.family(name), "beans", name);
  assert.equal(relations.compatible(relations.family("Pork ribs"), relations.family("Beef short ribs")), false);
});

test("a newly selected user food beyond twenty records is prioritized only after consent", async () => {
  const fs = require("node:fs"), vm = require("node:vm"), path = require("node:path");
  let reads = 0;
  const userFoods = Array.from({ length: 25 }, (_, i) => ({ id: "user-food-" + i, defaultName: "Food " + i, status: "active", names: { en: "Food " + i } }));
  const root = { MentorChatProtocol: protocol, MentorLazy: { loadFeature: async () => {} }, MentorFoodRepository: { getUserFoods: () => { reads++; return userFoods; } } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../../js/mentor/mentor-action-adapters.js"), "utf8"), { window: root, Map, Set });
  assert.equal((await root.MentorActionAdapters.prepareFoodContext("Create a recipe using Food 24", () => false)).length, 0); assert.equal(reads, 0);
  const shared = await root.MentorActionAdapters.prepareFoodContext("Create a recipe using Food 24", () => true);
  assert.equal(shared.length, 20); assert.ok(shared.some(food => food.id === "user-food-24"));
});
