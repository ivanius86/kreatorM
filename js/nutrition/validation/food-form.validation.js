(function () {
  "use strict";
  const allowedImages = new Set(["image/jpeg", "image/png", "image/webp"]);
  const preparationStates = new Set(["raw", "dry", "cooked", "boiled", "baked", "fried", "roasted", "drained", "other"]);
  const portionUnits = new Set(["g", "kg", "ml", "l", "item", "slice", "cup", "tbsp", "tsp", "can", "package"]);
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
  function validate(form, options = {}) {
    const errors = [];
    if (!String(form?.defaultName || "").trim()) errors.push({ field: "defaultName", code: "required" });
    if (!String(form?.names?.en || "").trim()) errors.push({ field: "nameEn", code: "required" });
    if (!String(form?.slug || "").trim()) errors.push({ field: "slug", code: "required" });
    if (!(window.MentorNutritionFoodCategories || []).some((item) => item.id === form?.categoryId)) errors.push({ field: "categoryId", code: "invalid" });
    if (!preparationStates.has(form?.preparationState || "raw")) errors.push({ field: "preparationState", code: "invalid" });
    if (form?.ediblePortionPercent != null && (!Number.isFinite(Number(form.ediblePortionPercent)) || Number(form.ediblePortionPercent) < 0 || Number(form.ediblePortionPercent) > 100)) errors.push({ field: "ediblePortionPercent", code: "invalid" });
    if (form?.defaultServingGrams != null && (!Number.isFinite(Number(form.defaultServingGrams)) || Number(form.defaultServingGrams) <= 0)) errors.push({ field: "defaultServingGrams", code: "invalid" });
    const normalizedProfile = window.MentorFoodFilterProfile.normalize(form?.filterProfile);
    ["dietary", "fasting", "allergens"].forEach((group) => Object.keys(form?.filterProfile?.[group] || {}).forEach((key) => {
      if (normalizedProfile[group]?.[key] !== form.filterProfile[group][key]) errors.push({ field: `filterProfile.${group}.${key}`, code: "invalid" });
    }));
    (form?.nutrients || []).forEach((item, index) => {
      if (!window.MentorNutrientRepository?.getById(item.nutrientId)) errors.push({ field: `nutrients.${index}.nutrientId`, code: "invalid" });
      if (item.amount !== null && (!Number.isFinite(Number(item.amount)) || Number(item.amount) < 0)) errors.push({ field: `nutrients.${index}.amount`, code: "invalid" });
    });
    const ids = (form?.nutrients || []).map((item) => item.nutrientId);
    if (new Set(ids).size !== ids.length) errors.push({ field: "nutrients", code: "duplicate" });
    (form?.portions || []).forEach((item, index) => {
      if (!String(item.name || "").trim() || !portionUnits.has(item.unit) || !Number.isFinite(Number(item.amount)) || Number(item.amount) <= 0 || !Number.isFinite(Number(item.equivalentGrams)) || Number(item.equivalentGrams) <= 0) errors.push({ field: `portions.${index}`, code: "invalid" });
    });
    if (form?.image?.imageType === "url") {
      try { const parsed = new URL(String(form.image.imageUrl || "")); if (!/^https?:$/.test(parsed.protocol)) throw new Error(); }
      catch (_) { errors.push({ field: "imageUrl", code: "invalid" }); }
    }
    const slug = String(form?.slug || "").trim();
    const conflict = window.MentorFoodRepository?.getAll?.().find((item) => item.slug === slug && item.id !== options.foodId);
    if (conflict) errors.push({ field: "slug", code: "duplicate" });
    const file = options.imageFile;
    if (file && !allowedImages.has(file.type)) errors.push({ field: "image", code: "type" });
    if (file && file.size > MAX_IMAGE_BYTES) errors.push({ field: "image", code: "size" });
    return { valid: errors.length === 0, errors };
  }
  window.MentorNutritionFoodFormValidation = { MAX_IMAGE_BYTES, ALLOWED_IMAGE_TYPES: [...allowedImages], validate };
})();
