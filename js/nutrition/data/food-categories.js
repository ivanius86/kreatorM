(function () {
  "use strict";
  const ids = ["vegetables","fruits","meat","poultry","fish-seafood","eggs","dairy","grains","bread-bakery","pasta-noodles","legumes","nuts-seeds","fats-oils","herbs-spices","beverages","prepared-foods","snacks-sweets","other"];
  window.MentorNutritionFoodCategories = Object.freeze(ids.map((id, index) => Object.freeze({ id, nameKey: `nutrition.foodCategories.${id}`, displayOrder: index + 1, status: "active" })));
})();
