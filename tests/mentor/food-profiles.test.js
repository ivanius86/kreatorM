"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const { createFoodSources } = require("../../server/food-sources.js");
async function fixture() {
  const context = vm.createContext({ console, Intl, Date, Map, Set, Promise, crypto: require("node:crypto").webcrypto }); context.window = context;
  let stored = { userFoods: [], userSources: [], userFoodNutrients: [], userFoodPortions: [] }, saves = 0, queue = Promise.resolve();
  const clone = value => JSON.parse(JSON.stringify(value));
  context.addEventListener = () => {};
  context.MentorI18n = { getLanguage: () => "sr", t: (key, values = {}) => key + " " + JSON.stringify(values) };
  context.MentorLazy = { async loadFeature() {} };
  context.MentorNutritionFoodSeed = { foods: [], foodNutrients: [], portions: [], sources: [] };
  context.MentorNutritionId = { create: prefix => prefix + context.crypto.randomUUID() };
  context.MentorData = { repositories: { nutritionFoodData: { getEnvelope: () => clone(stored), mutateEnvelope(mutator) { const operation = queue.then(() => { const next = clone(stored), result = mutator(next); stored = next; saves++; return clone(result); }); queue = operation.catch(() => {}); return operation; } } } };
  const service = createFoodSources({ provider: { configured: true, classify: async ({ schema }) => ({ content: schema.properties.query ? { query: "onion raw" } : { nameSr: "Crni luk, sirov", categoryId: "vegetables", preparationState: "raw" } }) }, fetchImpl: async url => Response.json(url.includes("foods/search") ? { foods: [{ fdcId: 170000, description: "Onions, raw", dataType: "SR Legacy" }] } : { fdcId: 170000, description: "Onions, raw", dataType: "SR Legacy", foodNutrients: [{ nutrient: { id: 1003, unitName: "g" }, amount: 1.1 }, { nutrient: { id: 1178, unitName: "ug" }, amount: 0 }] }) });
  context.MentorChatClient = { food: async (operation, value) => clone(await service[operation](value)) };
  for (const file of ["js/nutrition/data/food-categories.js", "js/nutrition/data/nutrient-definitions.js", "js/nutrition/services/food-filter-profile.service.js", "js/nutrition/repositories/food.repository.js", "js/nutrition/repositories/nutrient.repository.js", "js/nutrition/validation/food-form.validation.js", "js/nutrition/services/food-form.service.js", "js/mentor/mentor-capability-registry.js", "js/mentor/mentor-nutrition-read.js", "js/mentor/mentor-nutrition-food.js", "js/mentor/mentor-write-pipeline.js", "js/mentor/mentor-intelligence-router.js"])
    vm.runInContext(fs.readFileSync(path.join(__dirname, "../..", file), "utf8"), context, { filename: file });
  let task = null;
  const repository = { get: async () => ({ activeTask: clone(task) }), setActiveTask: async (_conversation, next, expected) => { assert.equal(task?.version ?? null, expected); task = next ? { ...clone(next), version: (task?.version || 0) + 1 } : null; return clone(task); } };
  return { context, repository, saveTask: next => repository.setActiveTask("chat", next, task?.version ?? null), data: () => stored, saves: () => saves };
}
test("source selection and chat approval words never save; explicit approval saves all nutrients and source once", async () => {
  const f = await fixture(), registry = f.context.MentorCapabilityRegistry, pipeline = f.context.MentorWritePipeline;
  const first = await pipeline.prepare("Dodaj novu namirnicu crni luk u bazu namirnica", null, "nutrition.food.create");
  assert.equal(first.task.status, "collecting"); assert.equal(f.saves(), 0);
  const selected = await pipeline.prepare("1", first.task, "nutrition.food.create");
  assert.equal(selected.task.status, "proposed"); assert.equal(selected.task.snapshot.nutrients.length, 45); assert.equal(f.saves(), 0);
  const same = await pipeline.prepare("potvrdi", selected.task, "nutrition.food.create");
  assert.equal(same.task.status, "proposed"); assert.equal(f.saves(), 0);
  await assert.rejects(registry.execute("nutrition.food.create", registry.get("nutrition.food.create").inputFor(selected.task), { authorize: () => true }), { code: "CAPABILITY_CONFIRMATION_REQUIRED" });
  const task = await f.saveTask(selected.task);
  await Promise.all([pipeline.confirm(f.repository, "chat", task.id, task.version), pipeline.confirm(f.repository, "chat", task.id, task.version)]);
  assert.equal(f.data().userFoods.length, 1); assert.equal(f.data().userSources.length, 1); assert.equal(f.data().userFoodNutrients.length, 45); assert.equal(f.saves(), 1);
  const nutrients = f.data().userFoodNutrients;
  assert.equal(nutrients.find(row => row.nutrientId === "nutrient_vitaminB12").amount, 0);
  assert.equal(nutrients.find(row => row.nutrientId === "nutrient_vitaminC").amount, null);
  assert.equal(f.data().userFoods[0].image.imageType, "none");
  assert.equal(f.data().userFoods[0].filterProfile.allergens.gluten, "unknown");
  const profile = registry.get("nutrition.food.getProfile");
  const details = await profile.adapter({ text: "Prikazi nutritivne vrednosti za 200 g Onions", foodId: f.data().userFoods[0].id });
  assert.equal(details.grams, 200);
  const rows = f.context.MentorNutritionFood.rowsFor(details.snapshot, details.grams);
  assert.equal(rows.find(row => row.code === "protein").amount, 2.2);
  assert.equal(rows.find(row => row.code === "vitaminC").amount, null);
  assert.ok(profile.format(details).includes("vitaminB12"));
});
test("changed preview and dismissal prevent writes; concurrent exact-source imports create only one food", async () => {
  const f = await fixture(), capability = f.context.MentorCapabilityRegistry.get("nutrition.food.create");
  const first = await capability.prepare("Add new food onion", null), selected = await capability.prepare("1", first.task);
  const bad = JSON.parse(JSON.stringify(selected.task)); bad.snapshot.nutrients[0].amount = 999;
  await assert.rejects(capability.preflight(bad), { code: "FOOD_PROFILE_CHANGED" }); assert.equal(f.saves(), 0);
  const task = await f.saveTask(selected.task);
  await f.context.MentorWritePipeline.dismiss(f.repository, "chat", task.id, task.version);
  await assert.rejects(f.context.MentorWritePipeline.confirm(f.repository, "chat", task.id, task.version), { code: "STALE_REQUEST" });
  assert.equal(f.saves(), 0);
  const input = capability.inputFor(selected.task);
  await Promise.all([capability.adapter(input), capability.adapter(input)]);
  assert.equal(f.data().userFoods.length, 1); assert.equal(f.data().userFoodNutrients.length, 45);
});
test("catalog creation and complete profile reads route independently of inventory and recipes", async () => {
  const f = await fixture(), router = f.context.MentorIntelligenceRouter;
  assert.equal((await router.decide("Dodaj novu namirnicu beli pasulj u bazu namirnica")).capability.id, "nutrition.food.create");
  assert.equal((await router.decide("Prikazi vitamine i minerale za beli pasulj")).capability.id, "nutrition.food.getProfile");
  for (const text of ["Koliko fosfora ima u piletini?", "Koliko bakra ima u bademu?", "Koliko joda ima u mleku?", "Koliko riboflavina ima u jajetu?", "How much caffeine is in coffee?"])
    assert.equal((await router.decide(text)).capability.id, "nutrition.food.getProfile", text);
  assert.equal(f.context.MentorNutritionFood.matchCreate("Nemoj da dodas novu namirnicu"), false);
  assert.equal(f.context.MentorNutritionFood.matchCreate("Dodaj 200 g pasulja u zalihe"), false);
  assert.equal(f.context.MentorNutritionFood.matchCreate("Napravi recept za pasulj"), false);
  assert.equal((await router.decide("So what should I do next?")).mode, "chat");
  assert.equal((await router.decide("Koliko soli ima u pasulju?")).capability.id, "nutrition.food.getProfile");
  assert.equal((await router.continueRead({ capabilityId: "nutrition.food.getProfile", input: { text: "Vitamini u luku" }, candidates: [{ id: "onion", name: "Luk" }] }, "1")).input.foodId, "onion");
});

test("cancelled food preparation never returns a late proposal for persistence", async () => {
  const f = await fixture(), controller = new AbortController();
  const previous = f.context.MentorChatClient.food;
  f.context.MentorChatClient.food = async (...args) => { const result = await previous(...args); controller.abort(); return result; };
  await assert.rejects(f.context.MentorWritePipeline.prepare("Add new food onion", null, "nutrition.food.create", { signal: controller.signal }), { code: "CANCELLED" });
  assert.equal(f.saves(), 0);
});

test("food candidates expose type, preparation, brand and USDA type without selecting or saving", async () => {
  const f = await fixture(), capability = f.context.MentorCapabilityRegistry.get("nutrition.food.create");
  f.context.MentorChatClient.food = async () => ({ query: "beans cooked", candidates: [
    { id: "101", name: "White beans, cooked", foodType: "generic", preparationState: "cooked", preparation: "cooked", brand: "", dataType: "Foundation" },
    { id: "102", name: "Pinto beans, cooked", foodType: "product", preparationState: "cooked", preparation: "cooked", brand: "Example brand", dataType: "Branded" }
  ] });
  const { task } = await capability.prepare("kuvani pasulj", null);
  assert.equal(task.status, "collecting");
  assert.equal(task.snapshot, null);
  assert.equal(task.foodChoices.length, 2);
  for (const row of task.foodChoices) {
    assert.ok(row.name.includes("mentor.foods.type"));
    assert.ok(row.name.includes("mentor.foods.preparation"));
    assert.ok(row.name.includes("cooked"));
    assert.ok(row.name.includes("mentor.foods.brand"));
  }
  assert.ok(task.foodChoices[0].name.includes("Foundation"));
  assert.ok(task.foodChoices[1].name.includes("Example brand"));
  assert.equal(f.saves(), 0);
});

test("Gemini fallback quota leaves food creation collecting and offers refinement or manual entry", async () => {
  const f = await fixture(), capability = f.context.MentorCapabilityRegistry.get("nutrition.food.create");
  f.context.MentorChatClient.food = async () => ({ query: "unknown", candidates: [], warnings: [{ source: "gemini", code: "FOOD_GEMINI_QUOTA" }] });
  const { task, reply } = await capability.prepare("unknown food", null);
  assert.equal(task.status, "collecting");
  assert.equal(task.foodChoices.length, 0);
  assert.ok(reply.includes("FOOD_GEMINI_QUOTA"));
  assert.ok(reply.includes("mentor.foods.notFound"));
  assert.equal(f.saves(), 0);
  const resources = require("../../js/i18n/mentor-foods.js");
  for (const lang of ["sr", "en"]) {
    assert.ok(resources[lang].errors.FOOD_USDA_QUOTA.includes("USDA"));
    assert.ok(resources[lang].errors.FOOD_GEMINI_QUOTA.includes("Gemini"));
    assert.match(resources[lang].notFound, /ručno|manually/);
  }
});
