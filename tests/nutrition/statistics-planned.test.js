"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function setup() {
  const root = vm.createContext({ Date, Intl, Map, console });
  root.window = root;
  root.MentorI18n = {
    locale:"sr", resources:{}, t:(_key, fallback) => fallback,
    registerResources(language, namespace, values) {
      this.resources[language] ||= {};
      this.resources[language][namespace] = values;
    }
  };
  const translate = (key, fallback, params = {}) => {
    const words = root.MentorI18n.resources.sr?.nutrition;
    const value = key.split(".").reduce((item, part) => item?.[part], words);
    return Object.entries(params).reduce((text, [name, replacement]) => text.replaceAll(`{{${name}}}`, replacement), value || fallback);
  };
  root.MentorNutritionComponents = {
    esc:(value) => String(value ?? ""),
    t:translate,
    panel:(title, body) => `<section><h2>${title}</h2>${body}</section>`,
    summary:(label, value) => `<article>${label}: ${value}</article>`
  };
  const definitions = {
    energyKcal:{ id:"e", code:"energyKcal" }, protein:{ id:"p", code:"protein" },
    carbohydrate:{ id:"c", code:"carbohydrate" }, totalFat:{ id:"f", code:"totalFat" }, fiber:{ id:"b", code:"fiber" }
  };
  root.MentorNutrientRepository = {
    getAll:() => [], getByCode:(code) => definitions[code] || null,
    getById:(id) => Object.values(definitions).find((item) => item.id === id) || null
  };
  const food = { id:"rice" };
  const byCode = new Map([
    ["energyKcal", { amount:200 }], ["protein", { amount:10 }],
    ["carbohydrate", { amount:20 }], ["totalFat", { amount:5 }], ["fiber", { amount:3 }]
  ]);
  root.MentorFoodRepository = { getById:() => food };
  root.MentorFoodNutritionService = { details:() => ({ food, byCode }) };
  root.MentorRecipeProfileService = { gramsForIngredient:(ingredient) => Number(ingredient.quantity) };
  let entries = [];
  let intakeEntries = [];
  const recipes = [{ id:"r", name:"Pirinač", servings:1, ingredients:[{ foodId:"rice", quantity:100, unit:"g" }] }];
  root.MentorPlanningRepository = { getMealPlanEntries:() => entries, getRecipes:() => recipes };
  root.MentorIntakeService = {
    getEntries:({ startDate, endDate } = {}) => intakeEntries.filter((entry) => entry.eatenDate >= startDate && entry.eatenDate <= endDate),
    nutritionForEntry:(entry) => entry.nutrition
  };
  const load = (file) => vm.runInContext(fs.readFileSync(path.join(__dirname, "../..", file), "utf8"), root, { filename:file });
  load("js/nutrition/nutrition-data.js");
  load("js/nutrition/services/meal-plan-selectors.js");
  load("js/nutrition/services/intake-selectors.js");
  load("js/nutrition/tabs/statistika.js");
  return { root, setEntries:(value) => { entries = value; }, setIntakeEntries:(value) => { intakeEntries = value; } };
}

test("statistics shows no planned values when the selected period has no meals", () => {
  const { root } = setup();
  const html = root.MentorNutritionTabs.statistics({ period:"day", statisticsDate:new Date(2026, 10, 10) });
  assert.match(html, /Nema planiranih obroka/);
  assert.match(html, /Kalorije: Nema podataka/);
  assert.doesNotMatch(html, /1\.480 kcal|68<small>%<\/small>|2026-07-13/);
});

test("statistics calculates the selected period from saved planned meals", () => {
  const { root, setEntries } = setup();
  setEntries([{ id:"entry", recipeId:"r", plannedDate:"2026-11-10", servings:2, status:"planned" }]);
  const html = root.MentorNutritionTabs.statistics({ period:"day", statisticsDate:new Date(2026, 10, 10) });
  assert.match(html, /Kalorije: 400 kcal/);
  assert.match(html, /Proteini: 20 g/);
  assert.match(html, /Pirinač/);
  assert.match(html, /Poznato 5 od 5/);
  const otherDay = root.MentorNutritionTabs.statistics({ period:"day", statisticsDate:new Date(2026, 10, 11) });
  assert.match(otherDay, /Kalorije: Nema podataka/);
});

test("week, month and year filters include only their calendar dates", () => {
  const { root, setEntries } = setup();
  setEntries([
    { id:"november", recipeId:"r", plannedDate:"2026-11-10", servings:1, status:"planned" },
    { id:"december", recipeId:"r", plannedDate:"2026-12-05", servings:2, status:"planned" }
  ]);
  const selected = new Date(2026, 10, 10);
  assert.match(root.MentorNutritionTabs.statistics({ period:"week", statisticsDate:selected }), /Kalorije: 200 kcal/);
  assert.match(root.MentorNutritionTabs.statistics({ period:"month", statisticsDate:selected }), /Kalorije: 200 kcal/);
  assert.match(root.MentorNutritionTabs.statistics({ period:"year", statisticsDate:selected }), /Kalorije: 600 kcal/);
});

test("recorded statistics uses saved nutrition and stays empty without a log", () => {
  const { root, setIntakeEntries } = setup();
  const selected = new Date(2026, 10, 10);
  const empty = root.MentorNutritionTabs.statistics({ period:"day", statisticsDate:selected, statisticsMode:"recorded" });
  assert.match(empty, /Nema zabeleženog unosa/);
  assert.match(empty, /Kalorije: Nema podataka/);
  const values = { energyKcal:310, protein:15, carbohydrate:40, totalFat:10, fiber:null };
  const known = { energyKcal:true, protein:true, carbohydrate:true, totalFat:true, fiber:false };
  setIntakeEntries([{ mealPlanEntryId:"meal-1", recipeName:"Sačuvani recept", eatenDate:"2026-11-10", servings:1.5,
    nutrition:{ values, known, micronutrients:[] } }]);
  root.MentorPlanningRepository.getRecipes = () => { throw new Error("historical view must not read recipes"); };
  root.MentorPlanningRepository.getMealPlanEntries = () => { throw new Error("historical view must not read plan"); };
  const logged = root.MentorNutritionTabs.statistics({ period:"day", statisticsDate:selected, statisticsMode:"recorded" });
  assert.match(logged, /Kalorije: 310 kcal/);
  assert.match(logged, /Sačuvani recept/);
  assert.match(logged, /Poznato 4 od 5/);
  assert.match(logged, /data-action="intake-open"/);
  assert.match(logged, /data-action="intake-remove"/);
});

test("historical micronutrients with mixed units are not added together", () => {
  const { root } = setup();
  const records = [
    { nutrition:{ micronutrients:[{ code:"vitaminC", group:"vitamin", unit:"mg", dailyReference:80, complete:true, amount:12 }] } },
    { nutrition:{ micronutrients:[{ code:"vitaminC", group:"vitamin", unit:"µg", dailyReference:80000, complete:true, amount:100 }] } }
  ];
  const summary = root.MentorIntakeSelectors.micronutrientSummary(records);
  assert.equal(summary.nutrients[0].complete, false);
  assert.equal(summary.nutrients[0].amount, null);
  assert.equal(summary.nutrients[0].dailyReference, null);
});
