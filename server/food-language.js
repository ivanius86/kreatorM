"use strict";
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const context = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/nutrition/data/foods.seed.js"), "utf8"), context);
const seed = context.window.MentorNutritionFoodSeed;
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\u0111\u0110]/g, "dj").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const entries = Array.from(seed.foods, food => {
  const key = food.nameKey?.split(".").at(-1);
  return { sr: seed.translations.sr[key] || food.defaultName, en: seed.translations.en[key], categoryId: food.categoryId, preparationState: food.preparationState };
}).filter(row => row.en);
const aliases = new Map(), baseAliases = new Map();
const preparations = [
  { en: "raw", state: "raw", pattern: /\b(?:sirov\w*|svez\w*|raw|fresh)\b/g },
  { en: "dry", state: "dry", pattern: /\b(?:suv(?:a|o|i|og|e|om|im|ih)?|(?:o)?susen\w*|dry|dried|dehydrated)\b/g },
  { en: "boiled", state: "boiled", pattern: /\b(?:baren\w*|boiled)\b/g },
  { en: "cooked", state: "cooked", pattern: /\b(?:kuvan\w*|cooked)\b/g },
  { en: "smoked", state: "other", pattern: /\b(?:dimljen\w*|smoked)\b/g },
  { en: "cured", state: "other", pattern: /\b(?:salamuren\w*|cured)\b/g },
  { en: "baked", state: "baked", pattern: /\b(?:pecen\w*|baked)\b/g },
  { en: "roasted", state: "roasted", pattern: /\b(?:roasted)\b/g },
  { en: "fried", state: "fried", pattern: /\b(?:przen\w*|pohovan\w*|fried)\b/g },
  { en: "drained", state: "drained", pattern: /\b(?:ocedjen\w*|drained)\b/g }
];
function preparation(value) {
  const text = normalize(value);
  const found = preparations.filter(row => { row.pattern.lastIndex = 0; return row.pattern.test(text); });
  const specific = found.filter(row => row.en !== "cooked");
  const cookedSpecific = found.some(row => row.en === "cooked") && specific.length === 1 && ["boiled", "baked", "fried", "roasted", "drained"].includes(specific[0].state);
  return { state: found.length === 1 ? found[0].state : cookedSpecific ? specific[0].state : "other", terms: found.map(row => row.en) };
}
function withoutPreparation(value) {
  let text = normalize(value);
  for (const row of preparations) { row.pattern.lastIndex = 0; text = text.replace(row.pattern, " "); }
  return text.replace(/\s+/g, " ").trim();
}
for (const row of entries) {
  for (const name of [row.sr, row.en]) {
    aliases.set(normalize(name), { query: normalize(row.en), categoryId: row.categoryId });
    const base = withoutPreparation(name);
    // Keep competing dictionary meanings ambiguous instead of choosing one.
    const prior = baseAliases.get(base), query = withoutPreparation(row.en);
    if (!baseAliases.has(base)) baseAliases.set(base, { query, categoryId: row.categoryId });
    else if (!prior || prior.query !== query) baseAliases.set(base, null);
  }
}
// Broader Serbian names must not inherit an unspoken variety from the seed.
for (const [names, query, categoryId] of [
  [["pasulj", "pasulja", "pasulju", "grah", "beans"], "beans mature seeds", "legumes"],
  [["crni luk", "crnog luka", "luk", "luka", "onion"], "onion", "vegetables"],
  [["beli luk", "belog luka", "cesnjak", "garlic"], "garlic", "vegetables"],
  [["prsuta", "prsute", "prsutu", "prosciutto"], "prosciutto", "pork"],
  [["beli pasulj", "belog pasulja"], "white beans mature seeds", "legumes"],
  [["crveni pasulj", "crvenog pasulja"], "red beans mature seeds", "legumes"],
  [["beli pirinac", "belog pirinca"], "white rice", "grains"],
  [["integralni pirinac", "integralnog pirinca"], "brown rice", "grains"],
  [["pirinac", "pirinca", "riza"], "rice", "grains"],
  [["piletina", "piletine"], "chicken", "poultry"],
  [["pileca prsa", "pileci file", "pilece belo meso"], "chicken breast", "poultry"],
  [["svinjska rebra", "svinjskih rebara"], "pork ribs", "pork"],
  [["govedina", "junetina"], "beef", "beef"],
  [["svinjetina", "svinjetine"], "pork", "pork"],
  [["sunka", "sunke"], "ham", "pork"],
  [["slanina", "slanine"], "bacon", "pork"],
  [["jaja", "jaje"], "egg", "eggs"],
  [["integralni hleb", "integralnog hleba"], "whole wheat bread", "bread-bakery"]
]) for (const name of names) aliases.set(name, { query, categoryId });
function cleanRequest(value) {
  return normalize(value)
    .replace(/^(?:(?:molim te|please)\s+)?(?:dodaj|dodajte|unesi|kreiraj|napravi|uvezi|add|create|import|save)\s+(?:mi\s+)?(?:(?:a|the|new|novu|nova)\s+)*(?:(?:namirnicu|namirnica|food)\s+)?/, "")
    .replace(/\s+(?:u|in|into|to)\s+(?:bazu(?:\s+namirnica)?|katalog(?:\s+namirnica)?|(?:the\s+)?food\s+(?:catalog|database))$/, "").trim();
}
function search(value) {
  const text = cleanRequest(value), prep = preparation(text), base = withoutPreparation(text);
  const local = aliases.get(base) || baseAliases.get(base) || aliases.get(text);
  const query = local ? [withoutPreparation(local.query), ...prep.terms].filter(Boolean).join(" ") : text;
  return { query, local: Boolean(local), preparationTerms: prep.terms };
}
function metadata(description) {
  const identity = value => normalize(value).split(" ").map(word => word.replace(/ies$/, "y").replace(/s$/, "")).join(" ");
  const exact = entries.filter(row => identity(row.en) === identity(description));
  const prep = preparation(description);
  return { nameSr: exact.length === 1 ? exact[0].sr : description,
    categoryId: exact.length === 1 ? exact[0].categoryId : "other",
    preparationState: prep.state, preparation: prep.terms.join(", ") };
}
module.exports = { search, metadata, preparation, dictionarySize: entries.length };
