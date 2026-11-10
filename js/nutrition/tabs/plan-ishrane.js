(function () {
  "use strict";

  const C = window.MentorNutritionComponents;
  const selectors = () => window.MentorMealPlanSelectors;
  const t = (key, fallback, params) => C.t(`planning.${key}`, fallback, params);
  const foodName = (food) => window.MentorNutritionInventoryFormUI.foodName(food);
  const mealTypes = ["breakfast", "lunch", "dinner", "snack"];
  const calendarSegments = [
    { key:"morning", start:"05:00", end:"11:59", label:"morningSegment", fallback:"Jutarnji", mealTypes:["breakfast"], defaultMealType:"breakfast" },
    { key:"daytime", start:"12:00", end:"17:59", label:"daySegment", fallback:"Dnevni", mealTypes:["lunch", "snack"], defaultMealType:"lunch" },
    { key:"evening", start:"18:00", end:"23:59", label:"eveningSegment", fallback:"Večernji", mealTypes:["dinner"], defaultMealType:"dinner" }
  ];
  const favorites = () => new Set(window.MentorPlanningRepository.getRecipeFavoriteIds());
  const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const round = (value, digits = 0) => {
    const factor = 10 ** digits;
    return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
  };

  function weekDates(offset) {
    const monday = new Date();
    monday.setHours(12, 0, 0, 0);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + Number(offset || 0) * 7);
    return Array.from({ length:7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return date;
    });
  }

  function number(value, digits = 0) {
    return new Intl.NumberFormat(window.MentorI18n?.locale || undefined, { maximumFractionDigits:digits }).format(value);
  }

  function recipeImage(recipe, size = "thumb") {
    const image = recipe?.image || {};
    const photo = image.imageType === "url" && image.imageUrl
      ? `<img src="${C.esc(image.imageUrl)}" loading="lazy" decoding="async" data-image-fallback alt="">`
      : image.imageType === "local" && recipe?.id
        ? `<img data-recipe-image-id="${C.esc(recipe.id)}" data-recipe-image-size="${C.esc(size)}" loading="lazy" decoding="async" alt="">`
        : "";
    return `${photo}${C.foodIcon(recipe?.name || "?")}`;
  }

  function nutritionValue(summary, code, unit, digits = 0) {
    if (!summary?.known?.[code]) return t("notAvailable", "N/A");
    return `${number(summary.values[code], digits)} ${unit}`;
  }

  function percent(value, target) {
    return Number.isFinite(Number(value)) && Number(target) > 0 ? round(Number(value) / Number(target) * 100) : null;
  }

  function progress(label, summary, code, target, unit, digits = 0) {
    const known = summary?.known?.[code] && Number(target) > 0;
    const current = known ? summary.values[code] : null, valuePercent = known ? percent(current, target) : null;
    return `<div class="nutrition-plan-progress ${known ? "" : "is-unknown"}">
      <div><span>${C.esc(label)}</span><strong>${C.esc(known ? `${number(current, digits)} / ${number(target, digits)} ${unit}` : t("notAvailable", "N/A"))}</strong>${known ? `<small>${C.esc(`${valuePercent}%`)}</small>` : ""}</div>
      <div class="nutrition-progress-track"><i style="width:${known ? Math.min(100, valuePercent) : 0}%"></i></div>
    </div>`;
  }

  function availability(entry, allocations) {
    const rows = allocations.filter((row) => row.mealPlanEntryId === entry.id && !["released", "skipped"].includes(row.status));
    const foods = new Set(rows.map((row) => row.foodId));
    const missingFoods = new Set(rows.filter((row) => ["missing", "partially_reserved"].includes(row.status) && Number(row.requiredQuantity) > Number(row.reservedQuantity)).map((row) => row.foodId));
    const availableFoods = new Set(rows.filter((row) => Number(row.reservedQuantity) > 0 || row.status === "consumed").map((row) => row.foodId));
    const status = !rows.length || missingFoods.size === 0 ? "available" : availableFoods.size ? "partial" : "missing";
    return { rows, total:foods.size, available:availableFoods.size, missing:missingFoods.size, status };
  }

  function availabilityLabel(value) {
    return value.status === "available"
      ? t("availabilityAvailable", "Available")
      : value.status === "partial"
        ? t("availabilityPartial", "Partially available")
        : t("availabilityMissing", "Missing");
  }

  function mealCard(entry, recipe, dayIndex, selectedId, allocations, segment) {
    const nutrition = selectors().recipeNutrition(recipe, entry.servings);
    const stock = availability(entry, allocations);
    return `<button type="button" class="nutrition-plan-meal ${selectedId === entry.id ? "selected" : ""}" draggable="true" data-plan-meal-entry-id="${C.esc(entry.id)}" data-plan-meal-date="${C.esc(entry.plannedDate)}" data-plan-meal-segment="${segment}" data-action="meal-select" data-id="${C.esc(entry.id)}" data-day="${dayIndex}" aria-pressed="${selectedId === entry.id}" title="${C.esc(t(entry.mealType, entry.mealType))}">
      <span class="nutrition-plan-meal-image">${recipeImage(recipe)}</span>
      <span class="nutrition-plan-meal-copy"><strong>${C.esc(recipe?.name || "—")}</strong><small>${C.esc(nutrition.known.energyKcal ? `${number(nutrition.values.energyKcal)} kcal` : t("notAvailable", "N/A"))}</small></span>
      <span class="nutrition-plan-stock nutrition-plan-stock-${stock.status}" title="${C.esc(availabilityLabel(stock))}"></span>
    </button>`;
  }

  function orderedSegmentEntries(entries) {
    return [...entries].sort((a, b) => {
      const aOrder = Number.isFinite(Number(a.displayOrder)) && a.displayOrder != null ? Number(a.displayOrder) : Infinity;
      const bOrder = Number.isFinite(Number(b.displayOrder)) && b.displayOrder != null ? Number(b.displayOrder) : Infinity;
      if (aOrder === Infinity && bOrder !== Infinity) return -1;
      if (bOrder === Infinity && aOrder !== Infinity) return 1;
      return (aOrder === Infinity ? 0 : aOrder - bOrder) || String(a.createdAt || "").localeCompare(String(b.createdAt || "")) || String(a.id).localeCompare(String(b.id));
    });
  }

  function dailyColumnSummary(day, goals, index, isToday = false) {
    return `<button type="button" class="nutrition-plan-day-total ${isToday ? "is-today" : ""}" data-action="plan-day-select" data-plan-day-mode="select" data-day="${index}" data-date="${C.esc(day.date)}">
      ${progress(t("calories", "Calories"), day, "energyKcal", goals.energyKcal, "kcal")}
      ${progress(t("protein", "Protein"), day, "protein", goals.protein, "g", 1)}
    </button>`;
  }

  function firstMealForDay(entries, dateKey) {
    return mealTypes
      .flatMap((mealType) => entries.filter((entry) => entry.plannedDate === dateKey && entry.mealType === mealType))
      .find(Boolean) || null;
  }

  function shoppingPanel(missing) {
    const rows = missing.map((row) => {
      const food = window.MentorInventoryService.getFood(row.foodId);
      return `<div class="nutrition-plan-shopping-item"><strong>${C.esc(food ? foodName(food) : "—")}</strong><span>${C.esc(`${number(row.missing, 3)} ${row.unit}`)}</span></div>`;
    }).join("");
    return `<section class="nutrition-panel nutrition-plan-shopping-panel">
      <div class="nutrition-panel-head"><h2>${C.esc(t("shoppingPanelTitle", ""))}</h2></div>
      ${rows || `<p class="nutrition-plan-empty">${C.esc(t("allAvailable", ""))}</p>`}
      <button type="button" class="nutrition-btn nutrition-plan-shopping-button" data-action="shopping-open">${window.MentorNutritionIcons.icon("basket")}${C.esc(t("openShoppingList", ""))}</button>
    </section>`;
  }

  const recipeFilters = [
    ["all", "filterAll", "recipe"], ["breakfast", "breakfast", "leaf"],
    ["lunch", "lunch", "recipe"], ["dinner", "dinner", "fridge"],
    ["snack", "snack", "apple"], ["vegan", "filterVegan", "leaf"],
    ["vegetarian", "filterVegetarian", "leaf"],
    ["highProtein", "filterHighProtein", "meat"],
    ["lowCarb", "filterLowCarb", "grain"],
    ["mealPrep", "filterMealPrep", "box"], ["quick", "filterQuick", "clock"],
    ["drinks", "filterDrinks", "glass"], ["favorites", "filterFavorites", "star"]
  ];

  function recipeMatches(recipe, filter, favoriteIds) {
    if (filter === "all") return true;
    if (mealTypes.includes(filter)) return recipe.mealType === filter;
    if (filter === "favorites") return favoriteIds.has(recipe.id);
    if (filter === "mealPrep") return Number(recipe.servings) >= 2;
    if (filter === "quick") {
      const minutes = Number(recipe.filterMetadata?.preparationMinutes);
      return minutes > 0 && minutes <= 30;
    }
    if (filter === "drinks") return (recipe.ingredients || []).length > 0 && recipe.ingredients.every((item) => window.MentorInventoryService.getFood(item.foodId)?.categoryId === "beverages");
    const profile = window.MentorRecipeProfileService.deriveRecipeProfile(recipe);
    if (filter === "highProtein") return profile.nutritionTags.includes("highProtein");
    return profile.dietaryPatterns.includes(filter);
  }

  function recipePanel(recipes, state) {
    const favoriteIds = favorites();
    const active = recipeFilters.some(([key]) => key === state.planRecipeFilter) ? state.planRecipeFilter : "all";
    const search = String(state.planRecipeSearch || "").trim().toLocaleLowerCase(window.MentorI18n?.locale || "sr");
    const visible = recipes.filter((recipe) => recipeMatches(recipe, active, favoriteIds) && String(recipe.name || "").toLocaleLowerCase(window.MentorI18n?.locale || "sr").includes(search));
    const filterButton = ([key, label, icon]) => {
      const hint = { mealPrep:"filterMealPrepHint", quick:"filterQuickHint", drinks:"filterDrinksHint" }[key];
      return `<button type="button" class="nutrition-plan-recipe-filter ${active === key ? "active" : ""}" data-action="plan-recipe-filter" data-filter="${key}" aria-pressed="${active === key}" ${hint ? `title="${C.esc(t(hint, ""))}"` : ""}>${icon === "star" ? `<span class="nutrition-plan-filter-star" aria-hidden="true">★</span>` : window.MentorNutritionIcons.icon(icon)}<span>${C.esc(t(label, ""))}</span></button>`;
    };
    const primaryFilterKeys = new Set(["all", "breakfast", "lunch", "dinner", "snack", "favorites"]);
    const primaryFilters = recipeFilters.filter(([key]) => primaryFilterKeys.has(key));
    const secondaryFilters = recipeFilters.filter(([key]) => !primaryFilterKeys.has(key));
    const chips = primaryFilters.map(filterButton).join("");
    const selectedSecondary = secondaryFilters.some(([key]) => key === active) ? active : "";
    const moreFilters = `<div class="nutrition-plan-recipe-filter-more ${selectedSecondary ? "active" : ""}" data-plan-recipe-more><button type="button" class="nutrition-plan-recipe-more-trigger" data-action="plan-recipe-more-toggle" aria-expanded="${Boolean(state.planRecipeMoreOpen)}">${C.esc(t("moreRecipeFilters", ""))}</button>${state.planRecipeMoreOpen ? `<div class="nutrition-plan-recipe-more-menu">${secondaryFilters.map(([key, label, icon]) => `<button type="button" data-action="plan-recipe-filter" data-filter="${C.esc(key)}">${window.MentorNutritionIcons.icon(icon)}<span>${C.esc(t(label, ""))}</span></button>`).join("")}</div>` : ""}</div>`;
    const cards = visible.map((recipe) => {
      const nutrition = selectors().recipeNutrition(recipe, 1);
      const facts = [
        nutrition.known.energyKcal ? `${number(nutrition.values.energyKcal)} kcal` : null,
        nutrition.known.protein ? `${number(nutrition.values.protein, 1)} g ${t("proteinUnit", "")}` : null
      ].filter(Boolean).join(" · ") || t("noNutritionData", "");
      const favorite = favoriteIds.has(recipe.id);
      return `<article class="nutrition-plan-recipe-card" draggable="true" data-plan-recipe-id="${C.esc(recipe.id)}" aria-label="${C.esc(t("dragRecipeHint", ""))}">
        <div class="nutrition-plan-recipe-image">${recipeImage(recipe, "preview")}</div>
        <div class="nutrition-plan-recipe-copy"><strong>${C.esc(recipe.name)}</strong><span>${C.esc(facts)}</span></div>
        <div class="nutrition-plan-recipe-actions"><span class="nutrition-plan-drag-handle" title="${C.esc(t("dragRecipeHint", ""))}" aria-hidden="true">⠿</span><button type="button" class="nutrition-plan-recipe-add" data-action="recipe-plan" data-id="${C.esc(recipe.id)}">${window.MentorNutritionIcons.icon("plus")}${C.esc(t("planRecipe", ""))}</button><button type="button" class="nutrition-plan-recipe-favorite" data-action="plan-recipe-favorite" data-id="${C.esc(recipe.id)}" aria-pressed="${favorite}" aria-label="${C.esc(favorite ? t("removeFavorite", "") : t("addFavorite", ""))}">${favorite ? "★" : "☆"}</button></div>
      </article>`;
    }).join("");
    return `<section class="nutrition-panel nutrition-plan-recipes-panel"><div class="nutrition-plan-recipes-toolbar"><div class="nutrition-plan-recipe-filters" role="group" aria-label="${C.esc(t("recipeFilters", ""))}">${chips}${moreFilters}</div><label class="nutrition-plan-recipe-search">${window.MentorNutritionIcons.icon("search")}<input id="nutrition-plan-recipe-search" type="search" data-plan-recipe-search value="${C.esc(state.planRecipeSearch || "")}" placeholder="${C.esc(t("searchRecipeNames", ""))}" aria-label="${C.esc(t("searchRecipeNames", ""))}"></label></div>
      ${cards ? `<div class="nutrition-plan-recipe-grid">${cards}</div>` : `<p class="nutrition-plan-empty">${C.esc(recipes.length ? t("noMatchingRecipes", "") : t("noRecipes", ""))}</p>`}
    </section>`;
  }

  function mealDetail(entry, recipe, allocations, state) {
    if (!entry || !recipe) return `<div class="nutrition-plan-detail-empty"><span>＋</span><p>${C.esc(t("selectMealPrompt", "Select a planned meal to see details."))}</p></div>`;
    const nutrition = selectors().recipeNutrition(recipe, entry.servings);
    const stock = availability(entry, allocations);
    const done = entry.status === "completed" || Boolean(entry.completedAt);
    const intakeRecorded = Boolean(window.MentorIntakeService.getForMealPlanEntry(entry.id));
    const rows = stock.rows.filter((row) => Number(row.requiredQuantity || 0) > Number(row.reservedQuantity || 0)).map((row) => {
      const food = window.MentorInventoryService.getFood(row.foodId), missing = Math.max(0, Number(row.requiredQuantity || 0) - Number(row.reservedQuantity || 0));
      return `<div class="nutrition-plan-reservation-row">
        <strong>${C.esc(food ? foodName(food) : "—")}</strong>
        <span>${C.esc(`${number(missing, 3)} ${row.unit}`)}</span>
      </div>`;
    }).join("");
    return `<div class="nutrition-plan-detail">
      <div class="nutrition-plan-detail-image">${recipeImage(recipe, "preview")}</div>
      <div class="nutrition-plan-detail-title"><div><h3>${C.esc(recipe.name)}</h3><span>${C.esc(t(entry.status, entry.status))}</span></div><i class="nutrition-plan-stock nutrition-plan-stock-${stock.status}"></i></div>
      <dl class="nutrition-plan-detail-facts">
        <dt>${C.esc(t("plannedDate", "Meal date"))}</dt><dd>${C.esc(entry.plannedDate)}</dd>
        <dt>${C.esc(t("mealType", "Meal type"))}</dt><dd>${C.esc(t(entry.mealType, entry.mealType))}</dd>
        <dt>${C.esc(t("servings", "Servings"))}</dt><dd>${C.esc(entry.servings)}</dd>
        <dt>${C.esc(t("calories", "Calories"))}</dt><dd>${C.esc(nutritionValue(nutrition, "energyKcal", "kcal"))}</dd>
        <dt>${C.esc(t("protein", "Protein"))}</dt><dd>${C.esc(nutritionValue(nutrition, "protein", "g", 1))}</dd>
        <dt>${C.esc(t("availability", "Availability"))}</dt><dd>${C.esc(availabilityLabel(stock))}</dd>
        <dt>${C.esc(t("ingredients", "Ingredients"))}</dt><dd>${C.esc(`${stock.available} ${t("available", "available")} · ${stock.missing} ${t("missing", "missing")}`)}</dd>
      </dl>
      <div class="nutrition-plan-missing-ingredients">${rows ? `<button type="button" class="nutrition-plan-missing-trigger" data-action="meal-missing-toggle" data-tooltip="${C.esc(t("clickToSeeMissing", "Click to view"))}" aria-expanded="${Boolean(state?.mealMissingOpen)}">${C.esc(t("missingIngredients", "Missing ingredients"))}</button>${state?.mealMissingOpen ? `<div>${rows}</div>` : ""}` : `<button type="button" class="nutrition-plan-missing-trigger is-ready" aria-disabled="true">${C.esc(t("availableIngredients", "Ingredients available"))}</button>`}</div>
      <div class="nutrition-plan-detail-actions">
        <button class="nutrition-btn" type="button" data-action="intake-open" data-id="${C.esc(entry.id)}">${C.esc(C.t(intakeRecorded ? "intake.edit" : "intake.record", intakeRecorded ? "Edit recorded intake" : "Record eaten meal"))}</button>
        ${!done ? `<button class="nutrition-btn" type="button" data-action="meal-edit" data-id="${C.esc(entry.id)}">${C.esc(t("editMeal", "Edit"))}</button>` : ""}
        <button class="nutrition-btn" type="button" data-action="meal-copy" data-id="${C.esc(entry.id)}">${C.esc(t("copyMeal", "Copy"))}</button>
        <button class="nutrition-btn nutrition-btn-danger" type="button" data-action="meal-remove" data-id="${C.esc(entry.id)}">${C.esc(t("remove", "Remove"))}</button>
        <button class="nutrition-btn nutrition-btn-primary" type="button" data-action="meal-toggle" data-id="${C.esc(entry.id)}" aria-pressed="${done}">${C.esc(done ? t("markPlanned", "Mark as planned") : t("markPrepared", "Mark as prepared"))}</button>
      </div>
    </div>`;
  }

  function plan(state) {
    const dates = weekDates(state.weekOffset || 0), dateKeys = dates.map(iso), dateSet = new Set(dateKeys);
    const allEntries = window.MentorPlanningRepository.getMealPlanEntries();
    const entries = allEntries.filter((entry) => dateSet.has(entry.plannedDate));
    const recipes = window.MentorPlanningRepository.getRecipes(), recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));
    const allocations = window.MentorInventoryRepository.getAllocations(), goals = selectors().dailyGoals();
    const days = selectors().groupByDay(entries, recipes, dates);
    const weekMissing = selectors().missingIngredients(entries, allocations, { recipes });

    let selected = window.MentorPlanningRepository.getMealPlanEntryById(state.selectedMealPlanEntry);
    if (selected && !dateSet.has(selected.plannedDate)) {
      selected = null;
      state.selectedMealPlanEntry = null;
    }
    if (selected) state.selectedDay = Math.max(0, dateKeys.indexOf(selected.plannedDate));
    if (!Number.isInteger(state.selectedDay) || state.selectedDay < 0 || state.selectedDay > 6) state.selectedDay = 0;
    if (Number(state.weekOffset || 0) === 0 && !selected && !state.planDayTouched) {
      state.selectedDay = Math.max(0, dateKeys.indexOf(iso(new Date())));
      const todayMeal = firstMealForDay(entries, dateKeys[state.selectedDay]);
      if (todayMeal) {
        state.selectedMealPlanEntry = todayMeal.id;
        selected = todayMeal;
      }
    }
    const todayKey = Number(state.weekOffset || 0) === 0 ? iso(new Date()) : null;
    const headers = dates.map((date, index) => {
      const dateKey = iso(date), isToday = dateKey === todayKey;
      return `<button type="button" class="nutrition-plan-day-head ${index === state.selectedDay ? "selected" : ""} ${isToday ? "is-today" : ""}" data-action="plan-day-select" data-plan-day-mode="select" data-day="${index}" data-date="${C.esc(dateKey)}"><span>${C.esc(new Intl.DateTimeFormat(window.MentorI18n?.locale || undefined, { weekday:"short" }).format(date))}</span><strong>${C.esc(new Intl.DateTimeFormat(window.MentorI18n?.locale || undefined, { day:"numeric", month:"short" }).format(date))}</strong></button>`;
    }).join("");
    const segmentRows = calendarSegments.map((segment) => {
      const cells = dates.map((date, dayIndex) => {
        const dateKey = iso(date);
        const items = orderedSegmentEntries(entries.filter((entry) => entry.plannedDate === dateKey && segment.mealTypes.includes(entry.mealType)));
        const addLabel = t("addMeal", "Dodaj obrok");
        const snackAction = segment.key === "daytime" ? `<button type="button" class="nutrition-plan-add-snack" data-action="meal-add" data-date="${dateKey}" data-meal-type="snack" data-plan-drop-meal-type="snack" data-day="${dayIndex}">${C.esc(t("snack", "Užina"))} +</button>` : "";
        return `<div class="nutrition-plan-segment-day ${dayIndex === state.selectedDay ? "selected-day" : ""} ${dateKey === todayKey ? "is-today" : ""}" data-plan-drop-date="${dateKey}" data-plan-drop-segment="${segment.key}" data-plan-drop-meal-type="${segment.defaultMealType}">
          <div class="nutrition-plan-segment-meals">${items.map((entry) => mealCard(entry, recipeMap.get(entry.recipeId), dayIndex, state.selectedMealPlanEntry, allocations, segment.key)).join("")}</div>
          <div class="nutrition-plan-add-actions"><button type="button" class="nutrition-plan-add" data-action="meal-add" data-date="${dateKey}" data-meal-type="${segment.defaultMealType}" data-day="${dayIndex}" aria-label="${C.esc(`${addLabel} — ${t(segment.label, segment.fallback)}`)}">+</button>${snackAction}</div>
        </div>`;
      }).join("");
      return `<section class="nutrition-plan-segment nutrition-plan-segment-${segment.key}" aria-label="${C.esc(t(segment.label, segment.fallback))}"><div class="nutrition-plan-segment-label"><span class="nutrition-plan-segment-icon" aria-hidden="true"></span><strong>${C.esc(t(segment.label, segment.fallback))}</strong><span class="nutrition-plan-segment-times" aria-label="${C.esc(`${segment.start}–${segment.end}`)}"><small>${segment.start}</small><i aria-hidden="true">–</i><small>${segment.end}</small></span></div>${cells}</section>`;
    }).join("");
    const dayTotals = `<details class="nutrition-plan-summary-disclosure"><summary>${C.esc(t("dailySummary", "Dnevni rezime"))}</summary><div class="nutrition-plan-summary-columns"><span aria-hidden="true"></span>${days.map((day, index) => dailyColumnSummary(day, goals, index, day.date === todayKey)).join("")}</div></details>`;
    const grid = `<div class="nutrition-plan-wrap"><div class="nutrition-plan-segments"><div class="nutrition-plan-date-heads"><span aria-hidden="true"></span>${headers}</div>${segmentRows}</div></div>`;
    const weekControls = `<div class="nutrition-plan-week-actions">
      <button type="button" data-action="week-prev" aria-label="${C.esc(t("previousWeek", "Previous week"))}">← ${C.esc(t("previousWeek", "Previous week"))}</button>
      <button type="button" class="nutrition-btn" data-action="week-today">${C.esc(t("today", "Today"))}</button>
      <button type="button" data-action="week-next" aria-label="${C.esc(t("nextWeek", "Next week"))}">${C.esc(t("nextWeek", "Next week"))} →</button>
    </div>`;

    return `<div class="nutrition-plan-layout">
      <div class="nutrition-plan-content"><section class="nutrition-panel nutrition-plan-main-panel"><div class="nutrition-panel-head nutrition-plan-week-head">${weekControls}</div>${grid}</section>${recipePanel(recipes, state)}</div>
      <aside class="nutrition-plan-aside"><section class="nutrition-panel nutrition-plan-detail-panel"><div class="nutrition-panel-head"><h2>${C.esc(t("mealDetails", "Meal details"))}</h2></div>${mealDetail(selected, selected ? recipeMap.get(selected.recipeId) : null, allocations, state)}</section>${shoppingPanel(weekMissing)}</aside>
    </div>`;
  }

  function toggleFavorite(id) {
    return window.MentorPlanningRepository.toggleRecipeFavorite(id);
  }

  window.MentorNutritionTabs = window.MentorNutritionTabs || {};
  window.MentorNutritionTabs.plan = plan;
  window.MentorNutritionTabs.togglePlanFavorite = toggleFavorite;
})();
