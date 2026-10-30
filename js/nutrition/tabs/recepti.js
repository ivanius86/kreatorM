(function(){
  "use strict";

  const C = window.MentorNutritionComponents;
  const icon = (name) => window.MentorNutritionIcons.icon(name);
  const t = (key, fallback, params) => C.t(`planning.${key}`, fallback, params);
  const foodName = (food) => window.MentorNutritionInventoryFormUI.foodName(food);
  const mealTypes = ["breakfast", "lunch", "dinner", "snack"];
  const coreNutrients = ["energyKcal", "protein", "carbohydrate", "totalFat"];

  const round = (value, digits = 0) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    const factor = 10 ** digits;
    return Math.round((number + Number.EPSILON) * factor) / factor;
  };
  const iso = (date) => date.toISOString().slice(0, 10);
  const option = (value, label, current) => `<option value="${C.esc(value)}" ${String(value) === String(current || "") ? "selected" : ""}>${C.esc(label)}</option>`;
  const quantityDigits = () => 2;
  const formatQuantity = (value, unit) => `${round(value, quantityDigits(unit))} ${unit || ""}`.trim();

  function recipeImage(recipe, size) {
    const image = recipe?.image || {};
    const photo = image.imageType === "url" && image.imageUrl
      ? `<img src="${C.esc(image.imageUrl)}" loading="lazy" decoding="async" data-image-fallback alt="">`
      : image.imageType === "local" && recipe.id
        ? `<img data-recipe-image-id="${C.esc(recipe.id)}" data-recipe-image-size="${C.esc(size)}" loading="lazy" decoding="async" alt="">`
        : "";
    return `${photo}${C.foodIcon(recipe.name)}`;
  }

  function weekRange(offset = 0) {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    today.setDate(today.getDate() - ((today.getDay() + 6) % 7) + offset * 7);
    const end = new Date(today);
    end.setDate(today.getDate() + 6);
    return { start: iso(today), end: iso(end) };
  }

  function recipeFilters(state) {
    state.recipeFilters = window.MentorRecipeFilterService.normalize(state.recipeFilters);
    return state.recipeFilters;
  }

  function servingsForRecipe(recipe, state) {
    const base = Math.max(1, Number(recipe?.servings || 1));
    const value = Number(state?.recipeServings?.[recipe?.id]);
    return Number.isFinite(value) && value >= 1 ? Math.max(1, Math.round(value)) : base;
  }

  function recipeForServings(recipe, servings) {
    const base = Math.max(1, Number(recipe?.servings || 1));
    const nextServings = Math.max(1, Number(servings || base));
    const factor = nextServings / base;
    return {
      ...recipe,
      servings: nextServings,
      ingredients: (recipe.ingredients || []).map((item) => ({ ...item, quantity: round(Number(item.quantity || 0) * factor, quantityDigits(item.unit)) }))
    };
  }

  function preparationMinutes(recipe) {
    const value = window.MentorRecipeFilterService.normalizeMetadata(recipe?.filterMetadata).preparationMinutes;
    return Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0;
  }

  function ingredientRows(recipe) {
    return (recipe.ingredients || []).map((item) => {
      const food = window.MentorInventoryService.getFood(item.foodId);
      let available = 0;
      try { available = window.MentorPlanningService.available(item.foodId, item.unit); }
      catch (_) { available = 0; }
      const required = Number(item.quantity || 0);
      const missing = Math.max(0, required - available);
      return { ...item, food, required, available, missing, ok: Boolean(food) && missing <= 0 };
    });
  }

  function availabilityFor(recipe) {
    const rows = ingredientRows(recipe);
    const missingRows = rows.filter((item) => !item.ok);
    const missing = missingRows.length;
    const availabilityState = missing === 0 && rows.length > 0
      ? "available"
      : rows.some((item) => item.ok || (Number(item.available) > 0 && Number(item.required) > 0))
        ? "partial"
        : "missing";
    const ingredientIds = new Set((recipe.ingredients || []).map((item) => item.foodId));
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() + 7);
    const expiring = window.MentorInventoryRepository.getBatches().some((batch) => {
      if (!ingredientIds.has(batch.foodId) || !batch.expiryDate || Number(batch.quantity) <= 0) return false;
      let free = 0;
      try { free = window.MentorInventoryService.availableForBatch(batch); } catch (_) { free = Number(batch.quantity) || 0; }
      const expiry = new Date(`${String(batch.expiryDate).slice(0, 10)}T00:00:00`);
      return free > 0 && Number.isFinite(expiry.getTime()) && expiry >= today && expiry <= cutoff;
    });
    const statuses = new Set();
    if (rows.length > 0 && missing === 0) statuses.add("ready");
    if (missing === 1) statuses.add("missingOne");
    if (missing > 1) statuses.add("missingMany");
    if (missing > 0) statuses.add("shopping");
    if (expiring) statuses.add("expiring");
    return {
      rows,
      missingRows,
      missing,
      ready: rows.length > 0 && missing === 0,
      partial: availabilityState === "partial",
      availabilityState,
      expiring,
      statuses,
      label: availabilityState === "available" ? t("availabilityAvailable", "Available") : availabilityState === "partial" ? t("availabilityPartial", "Partially available") : t("availabilityMissing", "Missing"),
      missingLabel: missing === 0 ? t("noMissingIngredients", "All ingredients are available.") : missing === 1 ? t("missingOne", "Missing 1 ingredient") : t("missingMany", "Missing {{count}} ingredients", { count: missing })
    };
  }

  function gramsForIngredient(item, food) {
    const amount = Number(item?.quantity), unit = window.MentorNutritionUnitConversion.normalizeUnit(item?.unit);
    if (!food || !(amount > 0)) return null;
    try {
      if (window.MentorNutritionUnitConversion.isCompatibleForFood(unit, "g", food)) return window.MentorNutritionUnitConversion.convertForFood(amount, unit, "g", food);
    } catch (_) { return null; }
    if (unit === "kom" && Number(food.defaultServingGrams) > 0) return amount * Number(food.defaultServingGrams);
    const portion = window.MentorFoodRepository.getPortions(food.id).find((row) => row.unit === unit && Number(row.amount) > 0 && Number(row.equivalentGrams) > 0);
    if (portion) {
      try { return window.MentorNutritionUnitConversion.toGrams(amount, portion); }
      catch (_) { return null; }
    }
    return null;
  }

  function recipeNutrition(recipe) {
    const totals = { energyKcal: 0, protein: 0, carbohydrate: 0, totalFat: 0 };
    const hasIngredients = Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0;
    const missing = Object.fromEntries(coreNutrients.map((code) => [code, !hasIngredients]));
    const contributed = Object.fromEntries(coreNutrients.map((code) => [code, false]));
    (recipe.ingredients || []).forEach((item) => {
      const details = window.MentorFoodNutritionService.details(item.foodId);
      const food = details?.food || null;
      const grams = gramsForIngredient(item, food);
      if (!food || grams === null) { coreNutrients.forEach((code) => { missing[code] = true; }); return; }
      const nutrients = details.byCode;
      coreNutrients.forEach((code) => {
        const nutrient = nutrients.get(code);
        if (!nutrient || nutrient.amount === null || nutrient.amount === undefined || !Number.isFinite(Number(nutrient.amount))) { missing[code] = true; return; }
        contributed[code] = true;
        totals[code] += Number(nutrient.amount) * grams / Number(nutrient.basisAmount || 100);
      });
    });
    const complete = Object.fromEntries(coreNutrients.map((code) => [code, hasIngredients && !missing[code] && contributed[code]]));
    if (!complete.energyKcal && (totals.protein > 0 || totals.carbohydrate > 0 || totals.totalFat > 0)) {
      totals.energyKcal = totals.protein * 4 + totals.carbohydrate * 4 + totals.totalFat * 9;
      contributed.energyKcal = true;
      complete.energyKcal = complete.protein && complete.carbohydrate && complete.totalFat;
    }
    const servings = Math.max(Number(recipe.servings || 1), 1);
    return {
      known: complete,
      contributed,
      missing,
      total: {
        energyKcal: round(totals.energyKcal),
        protein: round(totals.protein, 1),
        carbohydrate: round(totals.carbohydrate, 1),
        totalFat: round(totals.totalFat, 1)
      },
      perServing: {
        energyKcal: round(totals.energyKcal / servings),
        protein: round(totals.protein / servings, 1),
        carbohydrate: round(totals.carbohydrate / servings, 1),
        totalFat: round(totals.totalFat / servings, 1)
      }
    };
  }

  function nutritionLabel(nutrition, code, unit) {
    const value = nutrition.total[code];
    if (nutrition.known[code]) return `${value} ${unit}`;
    if (nutrition.contributed[code] && Number(value) > 0) return t("atLeastValue", "≥ {{value}} {{unit}}", { value, unit });
    return t("nutritionIncomplete", "Missing data");
  }

  function plannedForRecipe(recipeId, entries) {
    return entries.filter((entry) => entry.recipeId === recipeId);
  }

  function recipeCard(recipe, selected) {
    const availability = availabilityFor(recipe);
    const nutrition = recipeNutrition(recipe);
    const derivedProfile = window.MentorRecipeProfileService.deriveRecipeProfile(recipe);
    const minutes = preparationMinutes(recipe);
    const statusClass = availability.availabilityState === "available" ? "is-ready" : availability.availabilityState === "partial" ? "is-partial" : "is-missing";
    return `<button class="nutrition-recipe-list-card ${selected?.id === recipe.id ? "selected" : ""}" type="button" data-action="recipe-select" data-id="${C.esc(recipe.id)}">
      <span class="nutrition-recipe-thumb">${recipeImage(recipe, "thumb")}</span>
      <span class="nutrition-recipe-card-body">
        <strong>${C.esc(recipe.name)}</strong>
        <span class="nutrition-recipe-card-meta">
          ${minutes ? `<span>${icon("clock")}${C.esc(t("minutesShort", "{{count}} min", { count: minutes }))}</span>` : ""}
          <span>${icon("box")}${C.esc(`${recipe.servings} ${t("servingsLower", "servings")}`)}</span>
          <span>${icon("recipe")}${C.esc(nutrition.known.energyKcal ? `${nutrition.perServing.energyKcal} kcal` : Number(nutrition.perServing.energyKcal) > 0 ? t("atLeastValue", "≥ {{value}} {{unit}}", { value:nutrition.perServing.energyKcal, unit:"kcal" }) : t("caloriesUnknown", "kcal unknown"))}</span>
        </span>
        <span class="nutrition-recipe-card-tags">${C.badge(t(recipe.mealType, recipe.mealType))}${derivedProfile.nutritionTags.includes("highProtein") ? C.badge(t("highProtein", "High protein")) : ""}</span>
        <span class="nutrition-recipe-status ${statusClass}">${availability.ready ? icon("leaf") : icon("dots")}${C.esc(availability.missing ? availability.missingLabel : availability.label)}</span>
      </span>
    </button>`;
  }

  function summaryPanel(recipes, entries) {
    const range = weekRange(0);
    const ready = recipes.filter((recipe) => availabilityFor(recipe).ready).length;
    const weekEntries = entries.filter((entry) => entry.plannedDate >= range.start && entry.plannedDate <= range.end);
    const missing = recipes.filter((recipe) => availabilityFor(recipe).missing > 0).length;
    const items = [
      ["recipe", t("totalRecipes", "Total recipes"), recipes.length],
      ["leaf", t("canPrepareNow", "Can prepare now"), ready],
      ["fridge", t("plannedThisWeek", "Planned this week"), weekEntries.length],
      ["dots", t("needsInventory", "Need inventory"), missing]
    ];
    return `<div class="nutrition-recipe-overview">${items.map((item) => `<article><span>${icon(item[0])}</span><small>${C.esc(item[1])}</small><strong>${C.esc(item[2])}</strong></article>`).join("")}</div>`;
  }

  function categoryPanel(recipes, filters) {
    return `<div class="nutrition-recipe-categories">${mealTypes.map((mealType) => {
      const count = recipes.filter((recipe) => recipe.mealType === mealType).length;
      return `<button type="button" class="${filters.mealType === mealType ? "active" : ""}" data-action="recipe-filter" data-filter="mealType" data-value="${C.esc(filters.mealType === mealType ? "" : mealType)}">${icon(mealType === "breakfast" ? "leaf" : mealType === "lunch" ? "recipe" : mealType === "dinner" ? "fridge" : "apple")}<span>${C.esc(t(mealType, mealType))}</span><strong>${C.esc(count)}</strong></button>`;
    }).join("")}</div>`;
  }

  function servingsControl(recipe, servings) {
    return `<div class="nutrition-recipe-servings-control" aria-label="${C.esc(t("servingsControl", "Servings"))}">
      <span>${C.esc(t("servings", "Servings"))}</span>
      <div>
        <button type="button" data-action="recipe-servings-dec" data-id="${C.esc(recipe.id)}" aria-label="${C.esc(t("decreaseServings", "Decrease servings"))}">-</button>
        <strong>${C.esc(servings)}</strong>
        <button type="button" data-action="recipe-servings-inc" data-id="${C.esc(recipe.id)}" aria-label="${C.esc(t("increaseServings", "Increase servings"))}">+</button>
      </div>
    </div>`;
  }

  function detailPanel(recipe, entries, state) {
    if (!recipe) return `<div class="nutrition-table-empty"><div><strong>${C.esc(t("noRecipes", "No saved recipes yet."))}</strong><button class="nutrition-btn nutrition-btn-primary" type="button" data-action="recipe-add">${C.esc(t("addRecipe", "Add recipe"))}</button></div></div>`;
    const servings = servingsForRecipe(recipe, state);
    const displayRecipe = recipeForServings(recipe, servings);
    const availability = availabilityFor(displayRecipe);
    const nutrition = recipeNutrition(displayRecipe);
    const metric = (label, value) => `<div><span>${C.esc(label)}</span><strong>${C.esc(value)}</strong></div>`;
    const statusClass = availability.availabilityState === "available" ? "is-ready" : availability.availabilityState === "partial" ? "is-partial" : "is-missing";
    return `<div class="nutrition-recipe-detail">
      <div class="nutrition-recipe-detail-head">
        <div class="nutrition-recipe-hero">${recipeImage(recipe, "preview")}</div>
        <div>
          <div class="nutrition-recipe-title-row"><h3>${C.esc(recipe.name)}</h3><span class="nutrition-recipe-status ${statusClass}">${availability.ready ? icon("leaf") : icon("dots")}${C.esc(availability.label)}</span></div>
          ${recipe.description ? `<p>${C.esc(recipe.description)}</p>` : ""}
          ${recipe.source?.provider === "TheMealDB" && /^https:\/\/www\.themealdb\.com\/meal\.php\?c=\d+$/.test(recipe.source.url) ? `<p><a href="${C.esc(recipe.source.url)}" target="_blank" rel="noopener noreferrer">${C.esc(window.MentorI18n.t("mentor.actions.source"))} · ${C.esc(recipe.source.title)}</a></p>${recipe.source.adapted ? `<p>${C.esc(window.MentorI18n.t("mentor.actions.adapted"))}</p>` : ""}` : ""}
          <div class="nutrition-recipe-metrics">
            ${servingsControl(recipe, servings)}
            ${metric(t("ingredients", "Ingredients"), (recipe.ingredients || []).length)}
            ${metric(t("calories", "Calories"), nutritionLabel(nutrition, "energyKcal", "kcal"))}
            ${metric(t("protein", "Protein"), nutritionLabel(nutrition, "protein", "g"))}
            ${metric(t("carbs", "Carbs"), nutritionLabel(nutrition, "carbohydrate", "g"))}
            ${metric(t("fat", "Fat"), nutritionLabel(nutrition, "totalFat", "g"))}
          </div>
        </div>
      </div>
      <div class="nutrition-recipe-detail-columns is-single">
        <section>
          <h4>${C.esc(t("ingredients", "Ingredients"))}</h4>
          ${availability.rows.map((item) => `<div class="nutrition-list-row">
            <div><strong>${C.esc(item.food ? foodName(item.food) : C.t("inventory.orphan", "Unlinked food"))}</strong><span>${C.esc(`${t("requiredQty", "Needed")}: ${formatQuantity(item.required, item.unit)} / ${t("availableQty", "Available")}: ${formatQuantity(item.available, item.unit)}`)}</span></div>
            ${C.badge(item.ok ? t("availabilityAvailable", "Available") : `${t("missingQty", "Missing")}: ${formatQuantity(item.missing, item.unit)}`)}
          </div>`).join("")}
        </section>
      </div>
      ${recipe.videoUrl ? `<a class="nutrition-btn nutrition-recipe-video-link" href="${C.esc(recipe.videoUrl)}" target="_blank" rel="noopener noreferrer">${C.esc(t("openVideo", "Open video"))}</a>` : ""}
      <div class="nutrition-recipe-detail-actions">
        <button class="nutrition-btn" type="button" data-action="recipe-edit" data-id="${C.esc(recipe.id)}">${C.esc(t("openRecipe", "Open recipe"))}</button>
        <button class="nutrition-btn nutrition-btn-primary" type="button" data-action="recipe-plan" data-id="${C.esc(recipe.id)}">${C.esc(t("planRecipe", "Plan meal"))}</button>
      </div>
    </div>`;
  }

  function suggestionsPanel(recipes) {
    const suggestions = recipes.filter((recipe) => availabilityFor(recipe).ready).slice(0, 4);
    if (!suggestions.length) return `<p>${C.esc(t("noInventorySuggestions", "No recipes are fully covered by inventory yet."))}</p>`;
    return `<div class="nutrition-recipe-suggestions">${suggestions.map((recipe) => `<button type="button" data-action="recipe-select" data-id="${C.esc(recipe.id)}"><span class="nutrition-recipe-mini-thumb">${recipeImage(recipe, "thumb")}</span><strong>${C.esc(recipe.name)}</strong><small>${C.esc(t(recipe.mealType, recipe.mealType))}</small></button>`).join("")}</div>`;
  }

  function applyFilters(recipes, filters, state) {
    return recipes.filter((recipe) => {
      const availability = availabilityFor(recipe);
      const haystack = [recipe.name, recipe.description, ...(recipe.ingredients || []).map((item) => {
        const food = window.MentorInventoryService.getFood(item.foodId);
        return food ? foodName(food) : "";
      })].join(" ").toLocaleLowerCase();
      return window.MentorRecipeFilterService.matches(recipe, filters, { searchText: haystack, availabilityStatuses: availability.statuses, derivedProfile:window.MentorRecipeProfileService.deriveRecipeProfile(recipe) });
    });
  }

  function recipeViewModel(state, options = {}) {
    const syncSelection = options.syncSelection !== false;
    const all = window.MentorPlanningRepository.getRecipes();
    const entries = window.MentorPlanningRepository.getMealPlanEntries();
    const filters = recipeFilters(state);
    const list = applyFilters(all, filters, state);
    let selected = window.MentorPlanningRepository.getRecipeById(state.selectedRecipe);
    if (syncSelection) {
      if (!list.length) selected = null;
      else if ((!selected || !list.some((recipe) => recipe.id === selected.id)) && list[0]) {
        selected = list[0];
        state.selectedRecipe = selected.id;
      }
    }
    return { all, entries, list, selected };
  }

  function recipeResultsPanel(model) {
    const { all, list, selected } = model;
    const emptyCards = !all.length
      ? `<div class="nutrition-table-empty"><div><strong>${C.esc(t("noRecipes", "No saved recipes yet."))}</strong><button class="nutrition-btn nutrition-btn-primary" type="button" data-action="recipe-add">${C.esc(t("addRecipe", "Add recipe"))}</button></div></div>`
      : `<div class="nutrition-table-empty"><div><strong>${C.esc(t("noMatchingRecipes", "No recipes match these filters."))}</strong><button class="nutrition-btn" type="button" data-action="recipe-filter-reset">${C.esc(t("clearFilters", "Clear filters"))}</button></div></div>`;
    const cards = list.length ? `<div class="nutrition-recipe-list">${list.map((recipe) => recipeCard(recipe, selected)).join("")}</div>` : emptyCards;
    return C.panel(C.t("sections.recipeList", "Recipe list"), cards, "nutrition-recipe-list-panel");
  }

  function recipeResults(state) {
    return recipeResultsPanel(recipeViewModel(state, { syncSelection: false }));
  }

  function recipeDetails(state) {
    const model = recipeViewModel(state, { syncSelection: false });
    const { selected, entries } = model;
    return `<aside class="nutrition-recipe-aside" data-recipe-details data-recipe-id="${C.esc(selected?.id || "")}">
      ${C.panel(t("selectedRecipeDetails", "Selected recipe details"), detailPanel(selected, entries, state), "nutrition-recipe-detail-panel")}
    </aside>`;
  }

  function recipes(state) {
    const model = recipeViewModel(state);
    return `${window.MentorRecipeFiltersView.render(state)}
    <div class="nutrition-recipe-layout">
      <div class="nutrition-recipe-main" data-recipe-results>
        ${recipeResultsPanel(model)}
      </div>
      ${recipeDetails(state)}
    </div>`;
  }

  window.MentorNutritionTabs = window.MentorNutritionTabs || {};
  window.MentorNutritionTabs.recipeDetails = recipeDetails;
  window.MentorNutritionTabs.recipeResults = recipeResults;
  window.MentorNutritionTabs.recipes = recipes;
})();
