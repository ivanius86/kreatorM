"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createFoodSources, mapNutrients } = require("../../server/food-sources.js");
const nutrient = (id, unitName, amount) => ({ nutrient: { id, unitName }, amount });
const record = () => ({ fdcId: 170000, description: "Onions, raw", dataType: "SR Legacy", foodNutrients: [nutrient(1008, "kcal", 40), nutrient(1003, "g", 1.1), nutrient(1178, "µg", 0), nutrient(1089, "mg", 0.21)] });

test("USDA mapping preserves missing versus zero, exact units and distinct vitamin A forms", () => {
  const rows = mapNutrients({ foodNutrients: [nutrient(1003, "g", 0), nutrient(1106, "UG", 5), nutrient(1104, "IU", 100), nutrient(1090, "g", 2), nutrient(2047, "KCAL", 50), nutrient(2048, "kcal", 55)] });
  const by = id => rows.find(row => row.nutrientId === "nutrient_" + id);
  assert.equal(rows.length, 45);
  assert.equal(by("protein").amount, 0);
  assert.equal(by("vitaminA_RAE").amount, 5);
  assert.equal(by("vitaminA_IU").amount, 100);
  assert.equal(by("magnesium").amount, null);
  assert.equal(by("salt").amount, null);
  assert.equal(by("energyKcal").amount, 55);
  assert.equal(by("vitaminC").dataStatus, "unknown");
  assert.equal(mapNutrients({ foodNutrients: [nutrient(1008, "kcal", 60), nutrient(2048, "kcal", 55)] }).find(row => row.nutrientId === "nutrient_energyKcal").amount, 60);
});

test("food proposals carry the exact source profile and reject changed or expired signatures", async () => {
  let time = Date.now(), calls = 0;
  const service = createFoodSources({ now: () => time, signingKey: "unit-test-private-signing-key", fetchImpl: async (url, init) => {
    calls++; assert.ok(url.startsWith("https://api.nal.usda.gov/fdc/v1/food/170000?")); assert.equal(init.redirect, "error");
    return Response.json(record());
  } });
  const proposal = await service.details("170000");
  assert.equal(proposal.snapshot.food.names.en, "Onions, raw");
  assert.equal(proposal.snapshot.source.fdcId, 170000);
  assert.equal(proposal.snapshot.nutrients.length, 45);
  assert.deepEqual(service.verify(proposal.token), proposal.snapshot);
  assert.equal(await service.details("170000"), proposal);
  assert.equal(calls, 1);
  const [payload, signature] = proposal.token.split(".");
  const changed = JSON.parse(Buffer.from(payload, "base64url")); changed.nutrients[0].amount = 999;
  assert.throws(() => service.verify(Buffer.from(JSON.stringify(changed)).toString("base64url") + "." + signature), { code: "FOOD_PROPOSAL_EXPIRED" });
  time += 86400001;
  assert.throws(() => service.verify(proposal.token), { code: "FOOD_PROPOSAL_EXPIRED" });
  await assert.rejects(service.details("https://example.com"), { code: "INVALID_REQUEST" });
});

test("local dictionary searches USDA first and details never call a model or accept model nutrients", async () => {
  let modelCalls = 0;
  const provider = { configured: true, classify: async () => { modelCalls++; throw new Error("Model must not be needed"); } };
  const urls = [];
  const service = createFoodSources({ provider, fetchImpl: async url => {
    urls.push(url);
    return Response.json(url.includes("foods/search") ? { foods: [record(), { ...record(), fdcId: "bad" }, { ...record(), fdcId: 12345, description: "Apple, raw" }, { ...record(), fdcId: 12346, description: "Onions, cooked" }] } : record());
  } });
  const search = await service.search("dodaj novu namirnicu sirovi crni luk");
  assert.equal(search.candidates.length, 1);
  assert.equal(search.query, "onion raw");
  const result = await service.details(search.candidates[0].id);
  assert.equal(result.snapshot.food.defaultName, "Crni luk, sirov");
  assert.equal(result.snapshot.nutrients.find(row => row.nutrientId === "nutrient_energyKcal").amount, 40);
  assert.equal(urls.length, 2);
  assert.equal(modelCalls, 0);
  const unavailable = createFoodSources({ fetchImpl: async () => new Response("<html/>", { headers: { "content-type": "text/html" } }) });
  await assert.rejects(unavailable.search("onion"), { code: "FOOD_SOURCE_UNAVAILABLE" });
});

test("local dictionary covers the existing 165 pairs and keeps broad beans and cured meats distinct", () => {
  const language = require("../../server/food-language.js");
  assert.equal(language.dictionarySize, 165);
  for (const [input, expected] of [["kuvani pasulj", "beans mature seeds cooked"], ["pasulj", "beans mature seeds"], ["beli pasulj", "white beans mature seeds"], ["pršuta", "prosciutto"], ["šunka", "ham"], ["slanina", "bacon"], ["sirovi beli pirinač", "white rice raw"], ["suvi beli pirinač", "white rice dry"], ["dimljena svinjska rebra", "pork ribs smoked"], ["add new food cooked beans to food catalog", "beans mature seeds cooked"]])
    assert.equal(language.search(input).query, expected, input);
  assert.equal(language.metadata("Unrecognized product with a specific cut").nameSr, "Unrecognized product with a specific cut");
  assert.equal(language.metadata("Unrecognized product").preparationState, "other");
  assert.equal(language.metadata("Unrecognized product").categoryId, "other");
  assert.equal(language.search("sušen beli pirinač").query, "white rice dry");
  assert.equal(language.search("Pasulj, kuvan").query, "beans mature seeds cooked");
  assert.equal(language.search("kuvanog pasulja").query, "beans mature seeds cooked");
  assert.deepEqual(language.preparation("oceđena namirnica").terms, ["drained"]);
  assert.deepEqual(language.preparation("OCEĐENA namirnica").terms, ["drained"]);
});

test("generic cooked beans preserve different varieties for user choice without preferring pinto", async () => {
  let modelCalls = 0;
  const service = createFoodSources({ provider: { configured: true, classify() { modelCalls++; throw new Error(); } }, fetchImpl: async url => {
    assert.equal(new URL(url).searchParams.get("query"), "beans mature seeds cooked");
    assert.equal(new URL(url).searchParams.has("dataType"), false);
    return Response.json({ foods: [
      { fdcId: 101, description: "Beans, pinto, mature seeds, cooked, boiled", dataType: "SR Legacy" },
      { fdcId: 102, description: "Beans, white, mature seeds, cooked, boiled", dataType: "Foundation" },
      { fdcId: 103, description: "Beans, white, mature seeds, raw", dataType: "SR Legacy" },
      { fdcId: 104, description: "Bean sprouts, cooked", dataType: "Survey (FNDDS)" }
    ] });
  } });
  const result = await service.search("Dodaj novu namirnicu kuvani pasulj u bazu namirnica");
  assert.deepEqual(result.candidates.map(row => row.id), ["101", "102"]);
  assert.equal(modelCalls, 0);
  assert.ok(result.candidates.every(row => row.foodType === "generic" && row.preparation.includes("cooked")));
  assert.ok(result.candidates.every(row => row.preparationState === "boiled"));
});

test("known local food with no USDA match does not spend a Gemini call", async () => {
  let modelCalls = 0;
  const service = createFoodSources({
    provider: { name: "gemini", configured: true, classify() { modelCalls++; throw new Error("not needed"); } },
    fetchImpl: async () => Response.json({ foods: [] })
  });
  const result = await service.search("kuvani pasulj");
  assert.equal(result.query, "beans mature seeds cooked");
  assert.deepEqual(result.candidates, []);
  assert.equal(modelCalls, 0);
});

test("selected cooked-boiled USDA record keeps its specific preparation without a post-selection model", async () => {
  const language = require("../../server/food-language.js");
  assert.equal(language.preparation("Beans, raw or cooked").state, "other");
  assert.equal(language.preparation("Beans, cooked, boiled").state, "boiled");
  const service = createFoodSources({ provider: { configured: true, classify() { throw new Error("Details must stay USDA-only"); } },
    fetchImpl: async () => Response.json({ ...record(), description: "Beans, pinto, mature seeds, cooked, boiled" }) });
  const { snapshot } = await service.details("170000");
  assert.equal(snapshot.food.preparationState, "boiled");
  assert.equal(snapshot.food.names.en, "Beans, pinto, mature seeds, cooked, boiled");
  assert.equal(snapshot.nutrients.length, 45);
});

test("USDA source quota is distinct from Gemini and logs only safe source/status/retry fields", async () => {
  const logs = []; let modelCalls = 0;
  const service = createFoodSources({ apiKey: "private-test-usda-key", onDiagnostic: row => logs.push(row),
    provider: { configured: true, classify() { modelCalls++; throw new Error("private-model-message"); } },
    fetchImpl: async () => new Response("private-upstream-body", { status: 429, headers: { "retry-after": "60" } }) });
  await assert.rejects(service.search("pršuta"), cause => cause.code === "FOOD_USDA_QUOTA" && cause.source === "usda" && cause.retryAfterSeconds === 60);
  assert.equal(modelCalls, 0);
  assert.deepEqual(logs, [{ source: "usda", code: "FOOD_USDA_QUOTA", upstreamStatus: 429, retryAfterSeconds: 60 }]);
  assert.ok(!JSON.stringify(logs).includes("private"));
});

test("optional Gemini fallback happens after an empty USDA result and quota stays a recoverable warning", async () => {
  const order = [], logs = [];
  const service = createFoodSources({ onDiagnostic: row => logs.push(row),
    fetchImpl: async () => { order.push("usda"); return Response.json({ foods: [] }); },
    provider: { name: "gemini", configured: true, classify: async () => { order.push("gemini"); throw Object.assign(new Error("private payload"), { code: "QUOTA", upstreamStatus: 429 }); } } });
  const result = await service.search("nepoznata namirnica");
  assert.deepEqual(order, ["usda", "gemini"]);
  assert.deepEqual(result.candidates, []);
  assert.equal(result.warnings[0].code, "FOOD_GEMINI_QUOTA");
  assert.deepEqual(logs, [{ source: "gemini", code: "FOOD_GEMINI_QUOTA", upstreamStatus: 429, retryAfterSeconds: null }]);
  assert.ok(!JSON.stringify(result).includes("private"));
});

test("optional model search translation cannot supply nutrients or erase a local preparation constraint", async () => {
  const order = [];
  const service = createFoodSources({ provider: { name: "gemini", configured: true, classify: async () => {
    order.push("gemini"); return { content: { query: "onion raw", nutrients: [{ amount: 999 }] } };
  } }, fetchImpl: async url => {
    order.push("usda");
    if (url.includes("food/170000")) return Response.json(record());
    return Response.json({ foods: order.length === 1 ? [] : [record()] });
  } });
  const found = await service.search("nepoznati crnoluk");
  assert.deepEqual(order, ["usda", "gemini", "usda"]);
  assert.equal(found.candidates.length, 1);
  const result = await service.details("170000");
  assert.equal(order.filter(row => row === "gemini").length, 1);
  assert.equal(result.snapshot.nutrients.find(row => row.nutrientId === "nutrient_energyKcal").amount, 40);
  const wrongPreparation = await service.search("kuvana nepoznatica");
  assert.deepEqual(wrongPreparation.candidates, []);
});

test("unavailable optional model and USDA-only mode keep the search recoverable", async () => {
  const fetchImpl = async () => Response.json({ foods: [] });
  const withoutModel = await createFoodSources({ fetchImpl }).search("unknown food");
  assert.deepEqual(withoutModel.candidates, []);
  const result = await createFoodSources({ fetchImpl, onDiagnostic() {}, provider: { configured: true, classify: async () => { throw new Error("not exposed"); } } }).search("unknown food");
  assert.equal(result.warnings[0].code, "FOOD_GEMINI_UNAVAILABLE");
  assert.deepEqual(result.candidates, []);
});
