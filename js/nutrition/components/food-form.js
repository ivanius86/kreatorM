(function () {
  "use strict";
  const C = () => window.MentorNutritionComponents;
  const t = (key, fallback) => window.MentorI18n?.t(`nutrition.${key}`, fallback) || fallback;
  const esc = (value) => C().esc(value);
  const languageName = (food, language) => food?.names?.[language] || (food?.nameKey ? window.MentorI18n?.t(food.nameKey, language) : "") || food?.defaultName || "";
  const nutrientName = (definition) => window.MentorI18n?.t(definition.nameKey, definition.defaultName) || definition.defaultName;
  const option = (value, label, selected) => `<option value="${esc(value)}" ${String(selected) === String(value) ? "selected" : ""}>${esc(label)}</option>`;
  const sectionKeys = ["basic", "filters", "macros", "vitamins", "minerals", "portions", "image", "source"];
  const macroGroups = new Set(["energy", "macronutrient", "carbohydrate", "fat", "other"]);
  const fieldId = (field) => `nutrition-food-${String(field).replace(/[^a-zA-Z0-9_-]+/g, "-")}`;
  const fieldAttrs = (field) => `id="${fieldId(field)}" name="${esc(field)}"`;

  function createDraft(foodId) {
    const food = foodId ? window.MentorFoodRepository.getById(foodId) : null;
    const details = food ? window.MentorFoodNutritionService.details(food.id) : null;
    const definitions = window.MentorNutrientRepository.getAll();
    const nutrients = definitions.filter((definition) => {
      const amount = details?.byCode.get(definition.code)?.amount;
      return definition.isCore || amount !== null && amount !== undefined;
    }).map((definition) => {
      const existing = details?.byCode.get(definition.code);
      return { nutrientId: definition.id, amount: existing?.amount ?? null, dataStatus: existing?.dataStatus || "estimated", sourceNutrientId: existing?.sourceNutrientId || null };
    });
    const nameSr = food ? languageName(food, "sr") : "";
    const nameEn = food ? languageName(food, "en") : "";
    return {
      id: food?.id || null,
      defaultName: nameSr,
      names: { sr: nameSr, en: nameEn },
      slug: food?.slug || "",
      categoryId: food?.categoryId || "",
      subcategoryId: food?.subcategoryId || "",
      preparationState: food?.preparationState || "raw",
      foodType: food?.foodType === "product" ? "product" : "generic",
      status: food?.status || "active",
      description: food?.description || "",
      tags: [...(food?.tags || [])],
      filterProfile: window.MentorFoodFilterProfile.clone(food?.filterProfile),
      nutrients,
      portions: (details?.portions || []).map((portion) => ({ ...portion })),
      image: food?.image || { imageType: "none", imageUrl: null, localImageId: null, thumbnailId: null },
      imageMeta: food?.imageMeta || null,
      sourceId: food?.sourceId || null,
      sourceFoodId: food?.sourceFoodId || null,
      derivedFromFoodId: food?.derivedFromFoodId || null,
      origin: food?.origin || (food?.ownership === "system" ? "usda" : "manual"),
      sourceNote: food?.sourceNote || "",
      createdAt: food?.createdAt || null,
      usageCount: food?.usageCount || 0
    };
  }

  function open(state, foodId) {
    const food = foodId ? window.MentorFoodRepository.getById(foodId) : null;
    state.foodForm = {
      mode: !food ? "create" : "edit",
      originalId: food?.id || null,
      canCopySystem: Boolean(food && window.MentorFoodRepository.getSystemFoods().some((item) => item.id === food.id)),
      draft: createDraft(foodId),
      errors: [], saving: false, slugTouched: Boolean(food), previewUrl: null
    };
    state.foodFormSection = "basic";
    state.foodFormFile = null;
    state.modal = { type: "food-form" };
  }

  function fieldError(form, field) {
    const error = (form.errors || []).find((item) => item.field === field || item.field?.startsWith(`${field}.`));
    if (!error) return "";
    const key = error.code === "duplicate" ? "duplicate" : error.code === "type" ? "imageType" : error.code === "size" ? "imageSize" : error.code === "required" ? "required" : "invalid";
    return `<small class="nutrition-field-error">${esc(t(`foodForm.validation.${key}`, "Invalid value"))}</small>`;
  }

  function label(text, field, input) { return `<label class="nutrition-form-field"><span>${esc(text)}</span>${input}${fieldError(window.__nutritionFoodFormForRender, field)}</label>`; }
  function textInput(field, value, type = "text", attrs = "") { return `<input type="${type}" ${fieldAttrs(field)} data-food-field="${field}" value="${esc(value ?? "")}" ${attrs}>`; }

  function basic(form) {
    const d = form.draft;
    const categories = window.MentorNutritionFoodCategories || [];
    const states = ["raw", "dry", "cooked", "boiled", "baked", "fried", "roasted", "drained", "other"];
    return `<div class="nutrition-form-grid">
      ${label(t("foodForm.fields.nameSr", "Serbian name"), "defaultName", textInput("names.sr", d.names.sr, "text", "required"))}
      ${label(t("foodForm.fields.nameEn", "English name"), "nameEn", textInput("names.en", d.names.en, "text", "required"))}
      ${label(t("foodForm.fields.slug", "Slug"), "slug", textInput("slug", d.slug, "text", "required"))}
      ${label(t("foodForm.fields.category", "Category"), "categoryId", `<select ${fieldAttrs("categoryId")} data-food-field="categoryId" required><option value="">—</option>${categories.map((item) => option(item.id, t(`foodCategories.${item.id}`, item.id), d.categoryId)).join("")}</select>`)}
      ${label(t("foodForm.fields.subcategory", "Subcategory"), "subcategoryId", textInput("subcategoryId", d.subcategoryId))}
      ${label(t("foodForm.fields.state", "State"), "preparationState", `<select ${fieldAttrs("preparationState")} data-food-field="preparationState">${states.map((id) => option(id, t(`foodForm.states.${id}`, id), d.preparationState)).join("")}</select>`)}
      ${label(t("foodForm.fields.type", "Type"), "foodType", `<select ${fieldAttrs("foodType")} data-food-field="foodType">${["generic", "product"].map((id) => option(id, t(`foodForm.types.${id}`, id), d.foodType)).join("")}</select>`)}
      ${label(t("foodForm.fields.status", "Status"), "status", `<select ${fieldAttrs("status")} data-food-field="status">${option("active", t("foodsUi.active", "Active"), d.status)}${option("archived", t("foodsUi.archived", "Archived"), d.status)}</select>`)}
      ${label(t("foodForm.fields.tags", "Tags"), "tags", textInput("tags", d.tags.join(", ")))}
      <label class="nutrition-form-field nutrition-form-wide"><span>${esc(t("foodForm.fields.description", "Description"))}</span><textarea ${fieldAttrs("description")} data-food-field="description" rows="4">${esc(d.description)}</textarea></label>
    </div>`;
  }

  function nutrientEditor(form, kind) {
    const definitions = window.MentorNutrientRepository.getAll().filter((definition) => kind === "vitamin" ? definition.group === "vitamin" : kind === "mineral" ? definition.group === "mineral" : macroGroups.has(definition.group));
    const ids = new Set(definitions.map((item) => item.id));
    const selected = form.draft.nutrients.map((item, index) => ({ item, index, definition: window.MentorNutrientRepository.getById(item.nutrientId) })).filter((entry) => ids.has(entry.item.nutrientId));
    const selectedIds = new Set(form.draft.nutrients.map((item) => item.nutrientId));
    const available = definitions.filter((definition) => !selectedIds.has(definition.id));
    return `<div class="nutrition-nutrient-editor"><div class="nutrition-nutrient-picker"><select id="nutrition-add-${kind}" name="addNutrient.${kind}" data-add-nutrient="${kind}"><option value="">${esc(t("foodForm.actions.addNutrient", "Add nutrition value"))}</option>${available.map((definition) => option(definition.id, `${nutrientName(definition)} (${definition.unit})`, "")).join("")}</select></div><div class="nutrition-nutrient-rows">${selected.length ? selected.map(({ item, index, definition }) => `<div class="nutrition-nutrient-row"><div><strong>${esc(nutrientName(definition))}</strong><small>${esc(definition.unit)} / 100 g</small></div><input type="number" id="nutrition-nutrient-${index}" name="nutrients.${index}.amount" min="0" step="any" data-nutrient-index="${index}" value="${item.amount === null ? "" : esc(item.amount)}" placeholder="${esc(t("foodsUi.noData", "No data"))}"><button type="button" data-action="food-form-remove-nutrient" data-index="${index}" aria-label="${esc(t("foodForm.actions.remove", "Remove"))}">${window.MentorNutritionIcons.icon("close")}</button></div>`).join("") : `<div class="nutrition-form-empty">${esc(t("foodsUi.noData", "No data"))}</div>`}</div></div>`;
  }

  function filterProfile(form) {
    const profile = window.MentorFoodFilterProfile.normalize(form.draft.filterProfile);
    const definition = [
      ["dietary", window.MentorFoodFilterProfile.DIETARY],
      ["fasting", window.MentorFoodFilterProfile.FASTING],
      ["allergens", window.MentorFoodFilterProfile.ALLERGENS]
    ];
    return `<div class="nutrition-food-filter-profile"><p>${esc(t("foodForm.filterProfile.help", "Unknown stays conservative and will not qualify a recipe for that filter."))}</p>${definition.map(([group, keys]) => `<fieldset><legend>${esc(t(`foodForm.filterProfile.groups.${group}`, group))}</legend><div class="nutrition-form-grid">${keys.map((key) => {
      const states = window.MentorFoodFilterProfile.STATES[group];
      return label(t(`foodForm.filterProfile.labels.${key}`, key), `filterProfile.${group}.${key}`, `<select ${fieldAttrs(`filterProfile.${group}.${key}`)} data-food-field="filterProfile.${group}.${key}">${states.map((state) => option(state, t(`foodForm.filterProfile.states.${state}`, state), profile[group][key])).join("")}</select>`);
    }).join("")}</div></fieldset>`).join("")}</div>`;
  }

  function portions(form) {
    const units = ["g", "kg", "ml", "l", "item", "slice", "cup", "tbsp", "tsp", "can", "package"];
    return `<div class="nutrition-portion-list">${form.draft.portions.map((portion, index) => `<div class="nutrition-portion-row">
      ${label(t("foodForm.fields.portionName", "Portion name"), `portions.${index}`, textInput(`portions.${index}.name`, portion.name || ""))}
      ${label(t("foodForm.fields.quantity", "Quantity"), `portions.${index}`, textInput(`portions.${index}.amount`, portion.amount ?? 1, "number", 'min="0.01" step="any"'))}
      ${label(t("foodForm.fields.unit", "Unit"), `portions.${index}`, `<select ${fieldAttrs(`portions.${index}.unit`)} data-food-field="portions.${index}.unit">${units.map((unit) => option(unit, t(`portionUnits.${unit}`, unit), portion.unit)).join("")}</select>`)}
      ${label(t("foodForm.fields.grams", "Equivalent grams"), `portions.${index}`, textInput(`portions.${index}.equivalentGrams`, portion.equivalentGrams ?? "", "number", 'min="0.01" step="any"'))}
      <button type="button" class="nutrition-icon-btn" data-action="food-form-remove-portion" data-index="${index}" aria-label="${esc(t("foodForm.actions.remove", "Remove"))}">${window.MentorNutritionIcons.icon("trash")}</button>
    </div>`).join("")}<button type="button" class="nutrition-btn" data-action="food-form-add-portion">${window.MentorNutritionIcons.icon("plus")} ${esc(t("foodForm.actions.addPortion", "Add portion"))}</button></div>`;
  }

  function imageSection(form) {
    const d = form.draft, mode = d.image?.imageType || "none";
    const source = form.previewUrl || (mode === "url" ? d.image.imageUrl : "");
    return `<div class="nutrition-image-form"><div class="nutrition-image-modes" role="group">${["none", "url", "local"].map((id) => `<button type="button" class="${mode === id ? "active" : ""}" data-action="food-image-mode" data-image-mode="${id}" aria-pressed="${mode === id}">${esc(t(`foodForm.image.${id}`, id))}</button>`).join("")}</div>
      ${mode === "url" ? label(t("foodForm.fields.imageUrl", "Image URL"), "imageUrl", `<input type="url" ${fieldAttrs("image.imageUrl")} data-food-field="image.imageUrl" value="${esc(d.image.imageUrl || "")}" placeholder="https://…">`) : ""}
      ${mode === "local" ? `<label class="nutrition-upload-zone">${window.MentorNutritionIcons.icon("upload")}<strong>${esc(t("foodForm.fields.uploadImage", "Upload image"))}</strong><small>${esc(t("foodForm.image.hint", "JPG, PNG or WEBP"))}</small><input type="file" id="nutrition-food-image-file" name="imageFile" data-food-image-file accept="image/jpeg,image/png,image/webp"></label>` : ""}
      <div class="nutrition-image-preview ${source || mode === "local" && d.imageMeta ? "has-image" : ""}">${source ? `<img src="${esc(source)}" data-image-fallback alt=""><span>${esc(t("foodsUi.noImage", "No image"))}</span>` : mode === "local" && d.id ? `<img data-food-image-id="${esc(d.id)}" data-food-image-size="preview" alt=""><span>${esc(t("foodsUi.noImage", "No image"))}</span>` : `${window.MentorNutritionIcons.icon("image")}<span>${esc(t("foodsUi.noImage", "No image"))}</span>`}</div>${fieldError(form, "image")}${fieldError(form, "imageUrl")}</div>`;
  }

  function source(form) {
    const d = form.draft;
    return `<div class="nutrition-form-grid">${label(t("foodForm.fields.sourceType", "Source type"), "origin", `<select ${fieldAttrs("origin")} data-food-field="origin">${["manual", "imported", "product", "usda"].map((id) => option(id, t(`filters.origins.${id}`, id), d.origin)).join("")}</select>`)}<label class="nutrition-form-field nutrition-form-wide"><span>${esc(t("foodForm.fields.sourceNote", "Source note"))}</span><textarea ${fieldAttrs("sourceNote")} data-food-field="sourceNote" rows="5">${esc(d.sourceNote || "")}</textarea></label></div>`;
  }

  function render(state) {
    const form = state.foodForm;
    if (!form) return "";
    form.errors = window.MentorNutritionFoodFormService.validate(form.draft, { imageFile: state.foodFormFile, foodId: form.mode === "edit" ? form.originalId : null }).errors;
    window.__nutritionFoodFormForRender = form;
    const title = t(`foodForm.title${form.mode === "create" ? "Create" : form.mode === "copy" ? "Copy" : "Edit"}`, "Food form");
    const content = state.foodFormSection === "basic" ? basic(form) : state.foodFormSection === "filters" ? filterProfile(form) : state.foodFormSection === "macros" ? nutrientEditor(form, "macro") : state.foodFormSection === "vitamins" ? nutrientEditor(form, "vitamin") : state.foodFormSection === "minerals" ? nutrientEditor(form, "mineral") : state.foodFormSection === "portions" ? portions(form) : state.foodFormSection === "image" ? imageSection(form) : source(form);
    const userActions = form.mode === "edit" ? `${form.canCopySystem ? `<button class="nutrition-btn" type="button" data-action="food-form-copy-system">${window.MentorNutritionIcons.icon("copy")} ${esc(t("foodForm.actions.copy", "Create copy"))}</button>` : ""}<button class="nutrition-btn nutrition-btn-warning" type="button" data-action="food-form-archive">${window.MentorNutritionIcons.icon("archive")} ${esc(t("foodForm.actions.archive", "Archive"))}</button><button class="nutrition-btn nutrition-btn-danger" type="button" data-action="food-form-delete">${window.MentorNutritionIcons.icon("trash")} ${esc(t("foodForm.actions.delete", "Delete"))}</button>` : "";
    delete window.__nutritionFoodFormForRender;
    return `<div class="nutrition-modal-backdrop" data-action="food-form-cancel"></div><section class="nutrition-food-form-dialog" role="dialog" aria-modal="true" aria-labelledby="nutritionFoodFormTitle"><header><div><small>${esc(t("title", "Nutrition"))} / ${esc(t("tabs.foods", "Foods"))}</small><h2 id="nutritionFoodFormTitle">${esc(title)}</h2></div><button type="button" class="nutrition-modal-x" data-action="food-form-cancel" aria-label="${esc(t("foodForm.actions.cancel", "Cancel"))}">${window.MentorNutritionIcons.icon("close")}</button></header><nav class="nutrition-form-tabs">${sectionKeys.map((key) => `<button type="button" class="${state.foodFormSection === key ? "active" : ""}" data-action="food-form-section" data-section="${key}">${esc(t(`foodForm.sections.${key}`, key))}</button>`).join("")}</nav><form data-food-form novalidate><div class="nutrition-form-body">${content}</div><footer><div class="nutrition-form-danger-actions">${userActions}</div><div><button class="nutrition-btn" type="button" data-action="food-form-cancel">${esc(t("foodForm.actions.cancel", "Cancel"))}</button><button class="nutrition-btn" type="button" data-action="food-form-save" ${!form.errors.length && !form.saving ? "" : "disabled"}>${esc(form.saving ? t("foodsUi.loading", "Saving…") : t("foodForm.actions.save", "Save"))}</button><button class="nutrition-btn nutrition-btn-primary" type="button" data-action="food-form-save-close" ${!form.errors.length && !form.saving ? "" : "disabled"}>${esc(form.saving ? t("foodsUi.loading", "Saving…") : t("foodForm.actions.saveClose", "Save and close"))}</button></div></footer></form></section>`;
  }

  function setPath(target, path, value) {
    const parts = path.split("."); let current = target;
    parts.forEach((part, index) => { if (index === parts.length - 1) current[part] = value; else { current[part] = current[part] || (/^\d+$/.test(parts[index + 1]) ? [] : {}); current = current[part]; } });
  }

  window.MentorNutritionFoodFormUI = { open, render, createDraft, setPath, sectionKeys };
})();
