"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const protocol = require("../../js/mentor/mentor-protocol.js");
const policy = require("../../server/action-policy.js");

const food = (id, name, englishName = name) => ({ id, name, englishName, categoryId: "vegetables", vegan: "allowed", allergens: Object.fromEntries(["gluten", "dairy", "lactose", "egg", "nuts", "soy", "sesame"].map(key => [key, "absent"])) });
const onion = food("food_onion_raw", "Onion, raw", "onion_raw");
function fixture(sourceIngredients, foods = [onion], ingredient = { foodId: onion.id, name: "Onion", quantity: 100, unit: "g" }) {
  const request = protocol.validateRequest({ requestId: "recipe-resolution-test", language: "en", messages: [{ id: "user-recipe", role: "user", text: "Create one recipe" }], goalContext: null });
  const intent = policy.constrainIntent(policy.deriveCandidate(request), { evidence: "Create one recipe", requests: [{ action: "createRecipe", count: 1 }] }, request);
  const source = { id: "12345", title: "Onion dish", ingredients: sourceIngredients, originalImageUrl: "", url: "https://www.themealdb.com/meal.php?c=12345" };
  const proposal = { action: "createRecipe", name: "Onion dish", description: "Cook thoroughly.", servings: 2, mealType: "dinner", ingredients: [ingredient], sourceId: "12345", adapted: false, adaptationNote: "", unresolved: [] };
  const run = override => policy.applyPolicy({ reply: "Review", proposals: [{ ...proposal, ...override }] }, intent, request, { sources: { get: () => source }, foods }).proposals[0];
  return { run, proposal };
}

test("exact known source amounts resolve automatically, including kg and l", () => {
  const grams = fixture([{ name: "Onion", measure: "100 g" }]).run({ ingredients: [] });
  assert.deepEqual(grams.ingredients.map(({ foodId, quantity, unit }) => ({ foodId, quantity, unit })), [{ foodId: onion.id, quantity: 100, unit: "g" }]);
  assert.deepEqual(grams.unresolved, []);
  const kilograms = fixture([{ name: "Onion", measure: "0.5 kg" }]).run({ ingredients: [{ foodId: onion.id, name: "Onion", quantity: 0.5, unit: "kg" }] });
  assert.equal(kilograms.ingredients[0].quantity, 500);
  assert.equal(kilograms.ingredients[0].unit, "g");
  assert.deepEqual(kilograms.unresolved, []);
  const water = food("food_water", "Water");
  const liters = fixture([{ name: "Water", measure: "0.5 l" }], [water], { foodId: water.id, name: "Water", quantity: 0.5, unit: "l" }).run();
  assert.equal(liters.ingredients[0].quantity, 500);
  assert.equal(liters.ingredients[0].unit, "ml");
  assert.deepEqual(liters.unresolved, []);
});

test("unknown and ambiguous ingredients request a concrete user choice", () => {
  const unknown = fixture([{ name: "Secret Sauce", measure: "100 g" }]).run({ ingredients: [] });
  assert.ok(unknown.unresolved.some(issue => issue.includes("Secret Sauce") && issue.includes("missing from the catalog")));
  const a = food("milk_cow", "Cow milk", "Milk"), b = food("milk_oat", "Oat milk", "Milk");
  const ambiguous = fixture([{ name: "Milk", measure: "100 ml" }], [a, b], { foodId: "Milk", name: "Milk", quantity: 100, unit: "ml" }).run();
  assert.ok(ambiguous.unresolved.some(issue => issue.includes("choose one catalog food") && issue.includes("Cow milk") && issue.includes("Oat milk")));
});

test("unsupported source units and incomplete adapted quantities stay blocked", () => {
  const cup = fixture([{ name: "Onion", measure: "1 cup" }]).run();
  assert.ok(cup.unresolved.some(issue => issue.includes("1 cup") && issue.includes("cannot be converted exactly")));
  const adapted = fixture([{ name: "Onion", measure: "1 cup" }]);
  const invalidUnit = adapted.run({ adapted: true, adaptationNote: "Use 100 g raw onion instead of one cup.", ingredients: [{ foodId: onion.id, name: "Onion", quantity: 1, unit: "cup" }] });
  assert.ok(invalidUnit.unresolved.some(issue => issue.includes("unsupported unit cup")));
  const missing = adapted.run({ adapted: true, adaptationNote: "Use measured onion instead of a cup.", ingredients: [{ foodId: onion.id, name: "Onion", quantity: null, unit: "g" }] });
  assert.ok(missing.unresolved.some(issue => issue.includes("quantity is missing")));
  const noNote = adapted.run({ adapted: true, ingredients: [{ foodId: onion.id, name: "Onion", quantity: 100, unit: "g" }] });
  assert.ok(noNote.unresolved.some(issue => issue.includes("explain the substitutions")));
});

test("one piece or clove with an explicit metric amount resolves without guessing its weight", () => {
  const avocado = food("food_avocado_raw", "Avocado");
  const garlic = food("food_garlic_raw", "Garlic");
  for (const [item, sourceAmount, unit, grams] of [[avocado, "1 piece (150 g)", "kom (150 g)", 150], [garlic, "1 clove (4 g)", "čen (4 g)", 4]]) {
    const resolved = fixture([{ name: item.name, measure: sourceAmount }], [item], { foodId: item.id, name: item.name, quantity: 1, unit }).run();
    assert.deepEqual(resolved.ingredients, [{ foodId: item.id, name: item.name, quantity: grams, unit: "g" }]);
    assert.deepEqual(resolved.unresolved, []);
  }
});

test("ambiguous counts, conflicting measures and unsupported containers remain unresolved", () => {
  for (const measure of ["2 cloves (4 g)", "1 clove (4 g or 8 g)", "1 cup (4 g)", "1 clove (0 g)", "1 clove (4 g) (8 g)"]) {
    const result = fixture([{ name: "Onion", measure }]).run({ ingredients: [] });
    assert.ok(result.unresolved.some(issue => issue.includes("cannot be converted exactly")), measure);
  }
  const conflict = fixture([{ name: "Onion", measure: "1 piece (150 g)" }], [onion], { foodId: onion.id, name: "Onion", quantity: 1, unit: "kom (100 g)" }).run();
  assert.ok(conflict.unresolved.some(issue => issue.includes("150 g")));
  const multiple = fixture([{ name: "Onion", measure: "150 g" }], [onion], { foodId: onion.id, name: "Onion", quantity: 2, unit: "kom (150 g)" }).run();
  assert.ok(multiple.unresolved.some(issue => issue.includes("unsupported unit")));
});

test("consented user-catalog ID is valid and an unknown ID never becomes a fake food", () => {
  const userFood = food("user_food_1", "My basil", "Basil");
  const source = fixture([{ name: "Basil", measure: "30 g" }], [onion, userFood], { foodId: "Basil", name: "Basil", quantity: 30, unit: "g" });
  const resolved = source.run();
  assert.equal(resolved.ingredients[0].foodId, userFood.id);
  assert.deepEqual(resolved.unresolved, []);
  const missing = source.run({ ingredients: [{ foodId: "invented", name: "Mystery herb", quantity: 30, unit: "g" }] });
  assert.ok(missing.unresolved.length);
  assert.equal(missing.ingredients[0].foodId, "invented");
});
test("adapted chicken dish cannot cite an unrelated pancake source", () => {
  const chicken = food("food_chicken_breast_skinless_raw", "Chicken breast", "Chicken breast skinless raw");
  const pancake = fixture([{ name: "Onion", measure: "100 g" }], [onion, chicken], { foodId: chicken.id, name: "Chicken breast", quantity: 150, unit: "g" });
  const mismatched = pancake.run({ name: "Chicken karaage", adapted: true, adaptationNote: "Use 150 g chicken breast." });
  assert.ok(mismatched.unresolved.some(issue => issue.includes("source does not contain")));
  const related = fixture([{ name: "Chicken breast", measure: "150 g" }], [onion, chicken], { foodId: chicken.id, name: "Chicken breast", quantity: 150, unit: "g" }).run({ adapted: true, adaptationNote: "Use 150 g chicken breast." });
  assert.deepEqual(related.unresolved, []);
  const breast = { ...chicken, categoryId: "poultry" };
  const thigh = { ...food("food_chicken_thigh", "Chicken thigh", "Chicken thigh skinless raw"), categoryId: "poultry" };
  const substitution = fixture([{ name: "Chicken thigh", measure: "150 g" }], [breast, thigh], { foodId: breast.id, name: "Chicken breast", quantity: 150, unit: "g" }).run({ adapted: true, adaptationNote: "Use 150 g chicken breast instead of thigh." });
  assert.deepEqual(substitution.unresolved, []);
});
