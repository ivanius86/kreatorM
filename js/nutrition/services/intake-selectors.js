(function () {
  "use strict";

  const CODES = ["energyKcal", "protein", "carbohydrate", "totalFat", "fiber"];
  const round = (value, digits) => Math.round((value + Number.EPSILON) * 10 ** digits) / 10 ** digits;

  function aggregate(entries, intake = window.MentorIntakeService) {
    const rows = (entries || []).map((entry) => ({ entry, nutrition: intake.nutritionForEntry(entry) }));
    const known = {}, values = {};
    CODES.forEach((code) => {
      known[code] = rows.length > 0 && rows.every((row) => row.nutrition.known[code]);
      values[code] = known[code] ? round(rows.reduce((sum, row) => sum + row.nutrition.values[code], 0), code === "energyKcal" ? 0 : 1) : null;
    });
    return { mealCount: rows.length, rows, known, values };
  }

  function micronutrientSummary(entries, intake = window.MentorIntakeService) {
    const rows = (entries || []).map((entry) => intake.nutritionForEntry(entry).micronutrients);
    const codes = new Set(rows.flatMap((nutrients) => nutrients.map((item) => item.code)));
    const nutrients = [...codes].map((code) => {
      const parts = rows.map((items) => items.find((item) => item.code === code));
      const reference = parts.find(Boolean);
      const compatible = parts.every((part) => part && part.unit === reference.unit && part.group === reference.group);
      const complete = compatible && parts.every((part) => part.complete && Number.isFinite(part.amount));
      const sameReference = parts.every((part) => part?.dailyReference === reference.dailyReference);
      return {
        ...reference, complete, amount: complete ? round(parts.reduce((sum, part) => sum + part.amount, 0), 2) : null,
        dailyReference: sameReference ? reference.dailyReference : null, percent: null, status: "unknown"
      };
    });
    return { nutrients };
  }

  window.MentorIntakeSelectors = Object.freeze({ aggregate, micronutrientSummary });
})();
