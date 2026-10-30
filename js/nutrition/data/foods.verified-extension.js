(function (root) {
  "use strict";
  const seed = root.MentorNutritionFoodSeed;
  if (!seed || !root.MentorNutritionFoodFilterProfilesSeed) return;

  // Manufacturer values describe this named product, not every smoked rib product.
  const id = "food_smoked_pork_ribs_cia_aboliv";
  if (seed.foods.some(food => food.id === id)) return;
  const sourceId = "manufacturer_cia_aboliv_smoked_pork_ribs";
  const name = "Dimljena svinjska rebra (CIA Aboliv)";
  const sourceUrl = "https://cia-aboliv.ro/en/our-products/specialties/smoked-pork-ribs/";
  const stamp = "2026-10-30T00:00:00.000Z";
  const profile = root.MentorFoodFilterProfile.normalize({
    dietary: { vegan: "blocked", vegetarian: "blocked", pescatarian: "blocked" },
    fasting: { fasting: "blocked", waterFasting: "blocked", oilFasting: "blocked", fishFasting: "blocked" },
    allergens: { gluten: "unknown", dairy: "unknown", lactose: "unknown", egg: "unknown", nuts: "unknown", soy: "unknown", sesame: "unknown" }
  });
  const food = {
    id, slug: "smoked_pork_ribs_cia_aboliv", nameKey: "nutrition.foods.smoked_pork_ribs_cia_aboliv",
    defaultName: name, categoryId: "meat", subcategoryId: null, foodType: "generic",
    preparationState: "other", referenceAmount: 100, referenceUnit: "g",
    ediblePortionPercent: null, defaultServingGrams: 100, image: null,
    tags: ["smoked"], sourceId, status: "active", ownership: "system",
    createdAt: stamp, updatedAt: stamp
  };
  const source = {
    id: sourceId, provider: "CIA Aboliv", dataType: "Manufacturer product label",
    sourceDescription: "Smoked Pork Ribs", sourceUrl,
    retrievedAt: stamp, lastVerifiedAt: stamp
  };
  const nutrients = [
    ["energyKcal", 214], ["energyKj", 890], ["protein", 15.3],
    ["carbohydrate", 0.5], ["totalFat", 16.8], ["saturatedFat", 5.5], ["totalSugars", 0.5]
  ].map(([key, amount]) => ({
    foodId: id, nutrientId: "nutrient_" + key, amount, basisAmount: 100, basisUnit: "g",
    dataStatus: "measured", sourceNutrientId: "manufacturer-label-100g"
  }));

  root.MentorNutritionFoodSeed = Object.freeze({
    ...seed,
    foods: [food, ...seed.foods],
    foodNutrients: [...seed.foodNutrients, ...nutrients],
    sources: [...seed.sources, source],
    translations: {
      ...seed.translations,
      sr: { ...seed.translations?.sr, smoked_pork_ribs_cia_aboliv: name },
      en: { ...seed.translations?.en, smoked_pork_ribs_cia_aboliv: "Smoked pork ribs (CIA Aboliv)" }
    }
  });
  root.MentorNutritionFoodFilterProfilesSeed = Object.freeze({
    ...root.MentorNutritionFoodFilterProfilesSeed, [id]: Object.freeze(profile)
  });
})(typeof window !== "undefined" ? window : globalThis);
