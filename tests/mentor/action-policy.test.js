"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const protocol = require("../../js/mentor/mentor-protocol.js");
const policy = require("../../server/action-policy.js");
const { createRecipeSources } = require("../../server/recipe-sources.js");
const { eligibleFoods } = require("../../server/public-food-catalog.js");
function request(text) { return protocol.validateRequest({ requestId: "request-testing", language: "en", messages: [{ id: "user-message-1", role: "user", text }], goalContext: null }); }
function intentFor(req, action) { return policy.constrainIntent(policy.deriveCandidate(req), { evidence: req.messages[0].text, requests: [{ action, count: 5 }] }, req); }
test("information, negation and hypothetical instructions grant no creation intent", () => {
  for (const text of ["What are good vegan recipes?", "Don't create any recipes", "Nemoj da napraviš cilj", "What if I create a goal?", "Kad bih napravio cilj?"]) assert.equal(policy.deriveCandidate(request(text)), null, text);
  const req = request("Create one goal"); assert.equal(policy.constrainIntent(policy.deriveCandidate(req), { evidence: "invented", requests: [{ action: "createGoal", count: 1 }] }, req), null);
});
test("counts and action authorization derive from explicit command, not model counts", () => {
  const req = request("Give me 2 vegan recipes"); const intent = intentFor(req, "createRecipe");
  assert.deepEqual(intent.requests, [{ action: "createRecipe", count: 2 }]); assert.equal(intent.constraints.vegan, true);
  assert.deepEqual(intentFor(request("Give me vegan recipes"), "createRecipe").requests, [{ action: "createRecipe", count: 3 }]);
  assert.deepEqual(intentFor(request("Give me 9 recipes"), "createRecipe").requests, [{ action: "createRecipe", count: 5 }]);
  assert.equal(policy.constrainIntent(policy.deriveCandidate(req), { evidence: req.messages[0].text, requests: [{ action: "createGoal", count: 5 }] }, req), null);
});
test("Serbian genitive plural 'recepata' authorizes the requested recipe count", () => {
  const req = request("Napravi 5 recepata sa piletinom");
  const candidate = policy.deriveCandidate(req);
  assert.deepEqual(candidate.actions, ["createRecipe"]);
  assert.equal(candidate.counts.createRecipe, 5);
  assert.deepEqual(intentFor(req, "createRecipe").requests, [{ action: "createRecipe", count: 5 }]);
  assert.equal(policy.deriveCandidate(request("Koje recepte imam?")), null);
  const inaccurate = policy.applyPolicy({ reply: "Trenutno nemam pristup listi tvojih namirnica.", proposals: [] }, null, req);
  assert.doesNotMatch(inaccurate.reply, /nemam pristup/i);
});
test("three daily meals and saved recipes preserve all nine slots without new recipes", () => {
  const text = "e sada isplaniraj mi naredna 3 dana, 3 ishrane dnevno, za rucak stavi piletinu sva tri dana, razlicite recepte koje su sacuvani";
  const req = protocol.validateRequest({ ...request(text), planningDate: "2026-10-29" });
  const candidate = policy.deriveCandidate(req);
  assert.equal(candidate.planning.status, "ready");
  assert.deepEqual(candidate.planning.plan.mealTypes, ["breakfast", "lunch", "dinner"]);
  assert.equal(candidate.planning.plan.includeRecipes, false);
  assert.deepEqual(policy.constrainIntent(candidate, null, req).requests, [{ action: "createMealPlanEntry", count: 9 }]);
});
test("a pancake answer resumes the unsaved breakfast and dinner extension only", () => {
  const original = "isplaniraj mi naredna 3 dana, 3 ishrane dnevno, razlicite recepte koje su sacuvani";
  const extension = "napravi mi i za dorucak i veceru";
  const previousPlan = { sourceMessageId: "original-plan", plan: { days: 3, startDate: "2026-10-29", mealTypes: ["lunch"], servings: 1, includeRecipes: true }, occupiedSlots: ["2026-10-29", "2026-10-30", "2026-10-31"].map(plannedDate => ({ plannedDate, mealType: "lunch" })) };
  const messages = [{ id: "original-plan", role: "user", text: original }, { id: "old-reply", role: "assistant", text: "Plan saved." }, { id: "extension", role: "user", text: extension }, { id: "question", role: "assistant", text: "Pancakes?" }, { id: "pancakes", role: "user", text: "moze palacinke" }];
  const req = protocol.validateRequest({ requestId: "pancake-follow-up", language: "sr", messages, goalContext: null, planningDate: "2026-10-29", previousPlan, mealPlanContext: messages.filter(item => item.role === "user") });
  const candidate = policy.deriveCandidate(req);
  assert.equal(candidate.message.id, "extension");
  assert.deepEqual(candidate.planning.plan.mealTypes, ["breakfast", "dinner"]);
  assert.equal(candidate.planning.plan.includeRecipes, false);
  assert.deepEqual(policy.constrainIntent(candidate, null, req).requests, [{ action: "createMealPlanEntry", count: 6 }]);
  const approved = policy.constrainIntent(candidate, null, req);
  const repeated = policy.deriveCandidate({ ...req, actionHistory: [{ id: approved.id + "_createMealPlanEntry_0", authorizationId: approved.id, action: "createMealPlanEntry", status: "approved" }] });
  assert.equal(repeated.planning.status, "review");
  const occupied = protocol.validateRequest({ ...req, previousPlan: { ...previousPlan, plan: { ...previousPlan.plan, mealTypes: ["breakfast", "lunch", "dinner"] }, occupiedSlots: [...previousPlan.occupiedSlots, { plannedDate: "2026-10-29", mealType: "breakfast" }] } });
  assert.equal(policy.deriveCandidate(occupied).planning.status, "occupied");
});
test("action ledger consumes approved/dismissed budget and IDs remain stable", () => {
  const req = request("Create 2 ideas"); const intent = intentFor(req, "createIdea");
  const idea = { action: "createIdea", title: "Idea", description: "Description", type: "creative", priority: "medium", tags: [] };
  const response = { reply: "Review these.", proposals: [idea, idea, idea] };
  const first = policy.applyPolicy(response, intent, req);
  assert.equal(first.proposals.length, 2); assert.deepEqual(policy.applyPolicy(response, intent, req), first);
  req.actionHistory = first.proposals.map(item => ({ id: item.id, authorizationId: intent.id, action: item.action, status: "approved" }));
  assert.equal(policy.applyPolicy(response, intent, req).proposals.length, 0);
  assert.equal(policy.applyPolicy(response, null, req).proposals.length, 0);
});
test("eligible public catalog honors vegan and absent-allergen requirements", () => {
  const foods = eligibleFoods({ vegan: true, excludedAllergens: ["nuts", "gluten"] });
  assert.ok(foods.length > 10);
  assert.ok(foods.every(food => food.vegan === "allowed" && food.allergens.nuts === "absent" && food.allergens.gluten === "absent"));
});
test("verified smoked pork ribs are included in the complete public catalog", () => {
  const foods = eligibleFoods();
  assert.ok(foods.length > 100);
  const ribs = foods.find(food => food.id === "food_smoked_pork_ribs_cia_aboliv");
  assert.ok(ribs);
  assert.equal(ribs.name, "Dimljena svinjska rebra (CIA Aboliv)");
  assert.equal(eligibleFoods({ meatPolicy: "chicken-fish-only" }).some(food => food.id === ribs.id), false);
});
test("real source discovery uses fixed endpoints; image MIME and magic must agree", async () => {
  const urls = []; let imageMode = "valid";
  const meal = { idMeal: "12345", strMeal: "Onions", strInstructions: "Cook.", strMealThumb: "https://www.themealdb.com/images/media/meals/test.jpg", strIngredient1: "Onion", strMeasure1: "100 g" };
  const sources = createRecipeSources({ fetchImpl: async (url, init) => {
    urls.push(url); assert.equal(init.redirect, "error");
    if (url.includes("/images/")) return new Response(imageMode === "valid" ? new Uint8Array([255,216,255,1]) : "<svg/>", { headers: { "content-type": "image/jpeg" } });
    return new Response(JSON.stringify({ meals: [meal] }), { headers: { "content-type": "application/json" } });
  } });
  const recipes = await sources.discover({ vegan: true }); assert.equal(recipes.length, 1);
  assert.ok(urls.some(url => url.endsWith("filter.php?c=Vegan")));
  assert.ok(urls.every(url => url.startsWith("https://www.themealdb.com/api/json/v1/1/")));
  assert.equal((await sources.getImage("12345")).mime, "image/jpeg"); assert.equal(await sources.getImage("99999"), null);
  const invalid = createRecipeSources({ fetchImpl: async url => url.includes("/images/") ? new Response("<svg/>", { headers: { "content-type": "image/jpeg" } }) : new Response(JSON.stringify({ meals: [meal] }), { headers: { "content-type": "application/json" } }) });
  await invalid.discover({ query: "onion" }); await assert.rejects(invalid.getImage("12345"), /INVALID_IMAGE/);
});
test("unknown ingredients and uncertain original measurements cannot be silently omitted", () => {
  const req = request("Create one vegan recipe"); const intent = intentFor(req, "createRecipe");
  const foods = eligibleFoods(intent.constraints); const onion = foods.find(food => food.id === "food_onion_raw");
  const source = { id: "12345", title: "Onions", url: "https://www.themealdb.com/meal.php?c=12345", originalImageUrl: "", ingredients: [{ name: "Onion", measure: "1 cup" }, { name: "Secret Sauce", measure: "a little" }] };
  const proposal = { action: "createRecipe", name: "Onions", description: "Cook.", servings: 1, mealType: "dinner", ingredients: [{ foodId: onion.id, quantity: 100, unit: "g" }], sourceId: "12345", adapted: false, unresolved: [] };
  const result = policy.applyPolicy({ reply: "Review", proposals: [proposal] }, intent, req, { sources: { get: () => source }, foods });
  assert.equal(result.proposals.length, 1); assert.equal(result.proposals[0].unresolved.length, 2); assert.equal(result.proposals[0].source.imageIllustrative, false);
  proposal.adapted = true;
  proposal.description = "Adaptation: omit the unknown sauce; use 100 g onion in this new formulation.";
  const adapted = policy.applyPolicy({ reply: "Review", proposals: [proposal] }, intent, req, { sources: { get: () => source }, foods });
  assert.equal(adapted.proposals[0].unresolved.length, 0);
  assert.equal(adapted.proposals[0].source.imageIllustrative, true);
  proposal.ingredients[0].foodId = "invented";
  const invalid = policy.applyPolicy({ reply: "Review", proposals: [proposal] }, intent, req, { sources: { get: () => source }, foods });
  assert.equal(invalid.proposals.length, 1);
  assert.ok(invalid.proposals[0].unresolved.some(item => item.includes("missing from the catalog")));
});
