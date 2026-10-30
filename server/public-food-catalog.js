"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const protocol = require("../js/mentor/mentor-protocol.js");
let catalog;
function loadCatalog() {
  if (catalog) return catalog;
  const context = vm.createContext({ window: {} });
  for (const file of ["services/food-filter-profile.service.js", "data/foods.seed.js", "data/food-filter-profiles.seed.js", "data/foods.verified-extension.js"]) vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/nutrition", file), "utf8"), context, { timeout: 2000 });
  const profiles = context.window.MentorNutritionFoodFilterProfilesSeed;
  catalog = context.window.MentorNutritionFoodSeed.foods.filter(food => food.ownership === "system" && food.status === "active" && profiles[food.id]).map(food => ({ id: food.id, name: food.defaultName, englishName: food.slug || "", categoryId: food.categoryId, preparationState: food.preparationState, vegan: profiles[food.id].dietary.vegan, allergens: { ...profiles[food.id].allergens } }));
  return catalog;
}
function eligibleFoods(constraints = {}) {
  return loadCatalog().filter(food => (!constraints.vegan || food.vegan === "allowed") && protocol.foodMatchesMeatPolicy(food, constraints.meatPolicy) && (constraints.excludedAllergens || []).every(key => food.allergens[key] === "absent"));
}
module.exports = { loadCatalog, eligibleFoods };
