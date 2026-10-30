(function () {
  "use strict";
  const seed = window.MentorNutritionFoodSeed;
  if (!seed || !window.MentorI18n?.registerResources) return;
  ["sr", "en"].forEach((language) => {
    const current = window.MentorI18n.resources?.[language]?.nutrition || {};
    window.MentorI18n.registerResources(language, "nutrition", {
      ...current,
      foods: { ...(current.foods || {}), ...(seed.translations?.[language] || {}) }
    });
  });
})();
