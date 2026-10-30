(function () {
  "use strict";
  const slugify = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  function build(form) {
    const stamp = new Date().toISOString();
    const food = {
      id: form.id || undefined, slug: form.slug || slugify(form.defaultName), nameKey: form.nameKey || "", defaultName: String(form.defaultName || "").trim(), names: { sr: String(form.names?.sr || form.defaultName || "").trim(), en: String(form.names?.en || "").trim() },
      categoryId: form.categoryId, subcategoryId: form.subcategoryId || null, foodType: form.foodType || "generic",
      preparationState: form.preparationState || "raw", referenceAmount: 100, referenceUnit: "g",
      ediblePortionPercent: form.ediblePortionPercent ?? null, defaultServingGrams: form.defaultServingGrams ?? null,
      image: form.image || { imageType: "none", imageUrl: null, localImageId: null, thumbnailId: null }, imageMeta: form.imageMeta || null, tags: Array.isArray(form.tags) ? form.tags : [], description: form.description || "",
      filterProfile: window.MentorFoodFilterProfile.normalize(form.filterProfile),
      sourceId: form.sourceId || null, sourceFoodId: form.sourceFoodId || null, derivedFromFoodId: form.derivedFromFoodId || form.sourceFoodId || null, origin: form.origin || "manual", status: form.status || "active", usageCount: Number(form.usageCount || 0), createdAt: form.createdAt || stamp, updatedAt: stamp
    };
    const nutrients = (form.nutrients || []).map((item) => ({ foodId: "", nutrientId: item.nutrientId, amount: item.amount === null || item.amount === "" ? null : Number(item.amount), basisAmount: 100, basisUnit: "g", dataStatus: item.dataStatus || (item.amount === null || item.amount === "" ? "unknown" : "estimated"), sourceNutrientId: item.sourceNutrientId || null }));
    return { food, nutrients, portions: form.portions || [] };
  }
  function assertValid(form, options) {
    const result = window.MentorNutritionFoodFormValidation.validate(form, options);
    if (!result.valid) { const error = new Error("Food form validation failed."); error.code = "FOOD_FORM_INVALID"; error.details = result.errors; throw error; }
  }
  window.MentorNutritionFoodFormService = {
    slugify, validate: (form, options) => window.MentorNutritionFoodFormValidation.validate(form, options), build,
    async createVerified(form, source) {
      assertValid(form, { foodId: form.id });
      const built = build(form);
      return window.MentorFoodRepository.createUserFoodIfAbsent(built.food, { ...built, sources: [source] });
    },
    async create(form, options = {}) { const prepared = { ...form, id: form.id || `user_food_${slugify(form.defaultName)}_${Date.now()}`, slug: form.slug || slugify(form.defaultName) }; assertValid(prepared, options); const built = build(prepared), imageStorage = window.MentorData.repositories.media; let storedImage = false; try { if (options.imageFile) { const metadata = await imageStorage.save(prepared.id, options.imageFile); built.food.image = { imageType: "local", imageUrl: null, localImageId: metadata.imageId, thumbnailId: metadata.imageId }; built.food.imageMeta = metadata; storedImage = true; } else if (prepared.image?.imageType === "url") built.food.imageMeta = imageStorage.urlMetadata(prepared.image.imageUrl); return await window.MentorFoodRepository.createUserFood(built.food, built); } catch (error) { if (storedImage) await imageStorage.remove(prepared.id); throw error; } },
    async update(id, form, options = {}) { const prepared = { ...form, slug: form.slug || slugify(form.defaultName) }; assertValid(prepared, { ...options, foodId: id }); const built = build(prepared), imageStorage = window.MentorData.repositories.media, previousImage = await imageStorage.get(id); let replacedLocal = false; try { if (options.imageFile) { const metadata = await imageStorage.save(id, options.imageFile); built.food.image = { imageType: "local", imageUrl: null, localImageId: metadata.imageId, thumbnailId: metadata.imageId }; built.food.imageMeta = metadata; replacedLocal = true; } else if (prepared.image?.imageType === "url") built.food.imageMeta = imageStorage.urlMetadata(prepared.image.imageUrl); else if (prepared.image?.imageType === "none") built.food.imageMeta = null; const saved = await window.MentorFoodRepository.updateUserFood(id, built.food, built); if (!options.imageFile && prepared.image?.imageType !== "local" && previousImage) await imageStorage.remove(id); return saved; } catch (error) { if (replacedLocal) await imageStorage.restore(id, previousImage); throw error; } },
    copySystem(id) { return window.MentorFoodRepository.createUserCopy(id); },
    archive(id) { return window.MentorFoodRepository.archiveUserFood(id); },
    async remove(id) { const removed = await window.MentorFoodRepository.deleteUserFood(id); await window.MentorData.repositories.media.remove(id); return removed; }
  };
})();
