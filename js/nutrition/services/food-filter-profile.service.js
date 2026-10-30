(function () {
  "use strict";

  const STATES = Object.freeze({
    dietary: Object.freeze(["allowed", "blocked", "unknown"]),
    fasting: Object.freeze(["allowed", "blocked", "unknown"]),
    allergens: Object.freeze(["absent", "present", "unknown"])
  });
  const DIETARY = Object.freeze(["vegan", "vegetarian", "pescatarian", "mediterranean", "lowCarb", "keto"]);
  const FASTING = Object.freeze(["fasting", "waterFasting", "oilFasting", "fishFasting"]);
  const ALLERGENS = Object.freeze(["gluten", "dairy", "lactose", "egg", "nuts", "soy", "sesame"]);

  const normalizeGroup = (source, keys, states) => Object.fromEntries(keys.map((key) => [key, states.includes(source?.[key]) ? source[key] : "unknown"]));
  function normalize(value) {
    const source = value && typeof value === "object" ? value : {};
    return {
      dietary: normalizeGroup(source.dietary, DIETARY, STATES.dietary),
      fasting: normalizeGroup(source.fasting, FASTING, STATES.fasting),
      allergens: normalizeGroup(source.allergens, ALLERGENS, STATES.allergens)
    };
  }

  const clone = (value) => JSON.parse(JSON.stringify(value));
  window.MentorFoodFilterProfile = {
    STATES, DIETARY, FASTING, ALLERGENS, normalize,
    empty: () => normalize(null),
    clone: (value) => clone(normalize(value))
  };
})();
