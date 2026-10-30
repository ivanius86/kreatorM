(function () {
  "use strict";

  function create(prefix = "nutrition") {
    const uuid = window.crypto?.randomUUID?.();
    return uuid ? `${prefix}_${uuid}` : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  window.MentorNutritionId = { create };
})();
