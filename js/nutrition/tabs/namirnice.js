(function () {
  "use strict";
  const C = window.MentorNutritionComponents;
  const I = window.MentorNutritionIcons;
  const t = (key, fallback, params) => window.MentorI18n?.t(`nutrition.${key}`, params, fallback) || fallback;
  const language = () => window.MentorI18n?.getLanguage?.() || "sr";
  const foodName = (food, lang = language()) => food?.names?.[lang] || (food?.nameKey ? window.MentorI18n?.t(food.nameKey, lang) : "") || food?.defaultName || "";
  const categoryName = (id) => t(`foodCategories.${id}`, id);
  const nutrientName = (definition) => window.MentorI18n?.t(definition.nameKey, definition.defaultName) || definition.defaultName;
  const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
  const option = (value, label, selected) => `<option value="${C.esc(value)}" ${String(value) === String(selected) ? "selected" : ""}>${C.esc(label)}</option>`;
  const value = (details, code) => details?.byCode.get(code)?.amount ?? null;
  const formatListKcal = (amount) => amount === null || amount === undefined ? "n/a" : format(amount, "", 0);
  const format = (amount, unit = "", digits = 1) => amount === null || amount === undefined ? t("foodsUi.noData", "No data") : `${Number(Number(amount).toFixed(digits))}${unit ? ` ${unit}` : ""}`;
  const stateName = (id) => t(`foodForm.states.${id}`, id || "—");

  function image(food, size) {
    const url = food?.image?.imageType === "url" ? food.image.imageUrl : "";
    const local = food?.image?.imageType === "local" && food.id;
    const img = url ? `<img src="${C.esc(url)}" loading="lazy" decoding="async" alt="" data-image-fallback>` : local ? `<img data-food-image-id="${C.esc(food.id)}" data-food-image-size="${size}" loading="lazy" decoding="async" alt="">` : "";
    return `<span class="nutrition-food-photo nutrition-food-photo-${size}">${img}<b aria-hidden="true">${C.esc(foodName(food).slice(0, 1).toUpperCase())}</b></span>`;
  }

  function filters(state) {
    const current = { foodCategory: "", foodUnit: "", foodOrigin: "", foodSort: "nameAsc", ...(state.filters || {}) };
    const categories = window.MentorNutritionFoodCategories || [];
    const units = ["g", "ml", "item", "cup", "spoon", "other"];
    const origins = ["system", "user", "usda", "manual", "imported", "product"];
    const sorts = ["nameAsc", "nameDesc", "caloriesAsc", "caloriesDesc", "proteinAsc", "proteinDesc", "newest", "used"];
    return `<div class="nutrition-food-filters" data-food-filters>
      <label class="nutrition-search">${I.icon("search")}<input type="search" id="nutrition-food-search" name="foodSearch" data-filter="search" value="${C.esc(state.search || "")}" placeholder="${C.esc(t("foodsUi.search", "Search foods"))}"></label>
      <select id="nutrition-food-category-filter" name="foodCategory" data-filter="foodCategory">${option("", t("foodsUi.allCategories", "All categories"), current.foodCategory)}${categories.map((item) => option(item.id, categoryName(item.id), current.foodCategory)).join("")}</select>
      <select id="nutrition-food-unit-filter" name="foodUnit" data-filter="foodUnit">${option("", t("foodsUi.allUnits", "All units"), current.foodUnit)}${units.map((id) => option(id, t(`filters.units.${id}`, id), current.foodUnit)).join("")}</select>
      <select id="nutrition-food-origin-filter" name="foodOrigin" data-filter="foodOrigin">${option("", t("foodsUi.allOrigins", "All origins"), current.foodOrigin)}${origins.map((id) => option(id, t(`filters.origins.${id}`, id), current.foodOrigin)).join("")}</select>
      <select id="nutrition-food-sort-filter" name="foodSort" data-filter="foodSort">${sorts.map((id) => option(id, t(`filters.sort.${id}`, id), current.foodSort || "nameAsc")).join("")}</select>
      <div class="nutrition-food-filter-actions"><button class="nutrition-btn nutrition-filter-reset" type="button" data-action="food-reset-filters" title="${C.esc(t("foodsUi.reset", "Reset filters"))}">${I.icon("reset")}</button><button class="nutrition-btn nutrition-btn-primary" type="button" data-action="food-add">${I.icon("plus")} ${C.esc(t("foodsUi.addShort", "Add"))}</button></div>
    </div>`;
  }

  function matchesUnit(food, unit) {
    if (!unit) return true;
    const portions = window.MentorFoodRepository.getPortions(food.id);
    if (unit === "g") return true;
    if (unit === "spoon") return portions.some((item) => ["tbsp", "tsp"].includes(item.unit));
    if (unit === "other") return portions.some((item) => !["g", "ml", "item", "cup", "tbsp", "tsp"].includes(item.unit));
    return portions.some((item) => item.unit === unit);
  }

  function matchesOrigin(food, origin) {
    if (!origin) return true;
    const source = window.MentorFoodRepository.getSource(food.sourceId);
    if (origin === "system") return food.ownership === "system";
    if (origin === "user") return food.ownership === "user";
    if (origin === "usda") return /usda/i.test(source?.provider || "") || food.origin === "usda";
    if (origin === "product") return food.foodType === "product";
    return food.origin === origin;
  }

  function getFoods(state) {
    const needle = normalize(state.search);
    let rows = window.MentorFoodRepository.getAll().filter((food) => {
      const haystack = normalize([foodName(food), foodName(food, "en"), food.defaultName, food.slug, ...(food.tags || [])].join(" "));
      return (!needle || haystack.includes(needle)) && (!state.filters.foodCategory || food.categoryId === state.filters.foodCategory) && matchesUnit(food, state.filters.foodUnit) && matchesOrigin(food, state.filters.foodOrigin);
    });
    const nutrientValue = (food, code) => value(window.MentorFoodNutritionService.details(food.id), code);
    const compareNutrient = (a, b, code, direction) => {
      const left = nutrientValue(a, code), right = nutrientValue(b, code);
      if (left === null && right === null) return 0;
      if (left === null) return 1;
      if (right === null) return -1;
      return (left - right) * direction;
    };
    const sort = state.filters.foodSort || "nameAsc";
    rows.sort((a, b) => sort === "nameDesc" ? foodName(b).localeCompare(foodName(a), language()) : sort === "caloriesAsc" ? compareNutrient(a, b, "energyKcal", 1) : sort === "caloriesDesc" ? compareNutrient(a, b, "energyKcal", -1) : sort === "proteinAsc" ? compareNutrient(a, b, "protein", 1) : sort === "proteinDesc" ? compareNutrient(a, b, "protein", -1) : sort === "newest" ? String(b.createdAt || "").localeCompare(String(a.createdAt || "")) : sort === "used" ? Number(b.usageCount || 0) - Number(a.usageCount || 0) : foodName(a).localeCompare(foodName(b), language()));
    return rows;
  }

  function rows(state, foods) {
    if (!foods.length) return `<tr><td colspan="7" class="nutrition-table-empty"><div>${I.icon("search")}<strong>${C.esc(t("foodsUi.noResults", "No results"))}</strong></div></td></tr>`;
    return foods.map((food) => {
      const details = window.MentorFoodNutritionService.details(food.id), selected = state.selectedFood === food.id;
      return `<tr class="${selected ? "selected" : ""}" data-action="food-select" data-id="${C.esc(food.id)}" aria-selected="${selected}">
        <td><div class="nutrition-name">${image(food, "thumb")}<strong>${C.esc(foodName(food))}</strong></div></td><td>${C.esc(categoryName(food.categoryId))}</td>
        <td>${C.esc(formatListKcal(value(details, "energyKcal")))}</td><td>${C.esc(format(value(details, "protein"), "g"))}</td><td>${C.esc(format(value(details, "carbohydrate"), "g"))}</td><td>${C.esc(format(value(details, "totalFat"), "g"))}</td>
        <td><div class="nutrition-row-actions"><button type="button" data-action="food-select" data-id="${C.esc(food.id)}" title="${C.esc(t("foodsUi.view", "View"))}">${I.icon("eye")}</button><button type="button" data-action="food-edit" data-id="${C.esc(food.id)}" title="${C.esc(t("foodsUi.edit", "Edit"))}">${I.icon("edit")}</button></div></td></tr>`;
    }).join("");
  }

  function nutrientGroup(details, group) {
    const entries = details.nutrients.map((item) => ({ item, definition: window.MentorNutrientRepository.getById(item.nutrientId) })).filter((entry) => entry.item.amount !== null && entry.item.amount !== undefined && entry.definition && (group === "vitamin" ? entry.definition.group === "vitamin" : group === "mineral" ? entry.definition.group === "mineral" : !["vitamin", "mineral"].includes(entry.definition.group)));
    return `<div class="nutrition-detail-nutrients">${entries.map(({ item, definition }) => {
      const missing = item.amount === null || item.amount === undefined, target = definition.dailyReference;
      const percent = !missing && target ? Math.round(item.amount / target * 100) : null;
      return `<div class="nutrition-detail-nutrient"><div><span>${C.esc(nutrientName(definition))}</span><strong>${missing ? C.esc(t("foodsUi.noData", "No data")) : C.esc(format(item.amount, definition.unit))}</strong>${target ? `<small>${C.esc(t("foodsUi.dailyReference", "Daily reference"))}: ${C.esc(format(target, definition.unit))}${percent === null ? "" : ` · ${percent}%`}</small>` : ""}</div>${percent === null ? "" : `<i><em style="width:${Math.min(100, percent)}%"></em></i>`}</div>`;
    }).join("")}</div>`;
  }

  function detail(food) {
    if (!food) return `<div class="nutrition-form-empty">${C.esc(t("foodsUi.noResults", "No food selected"))}</div>`;
    const details = window.MentorFoodNutritionService.details(food.id), source = details.source;
    const metric = (label, code, unit) => `<div><span>${C.esc(label)}</span><strong>${C.esc(format(value(details, code), unit))}</strong></div>`;
    const groups = [["vitamin", "vitamins"], ["mineral", "minerals"], ["other", "otherValues"]];
    const nutrientTabs = `<div class="nutrition-nutrient-tab-group"><div class="nutrition-nutrient-tabs" role="group" aria-label="${C.esc(t("foodsUi.otherValues", "Nutrition values"))}">${groups.map(([group, key], index) => `<button type="button" data-action="food-nutrient-tab" data-nutrient-group="${group}" aria-pressed="${index === 0}" aria-controls="nutrition-nutrient-${group}">${C.esc(t(`foodsUi.${key}`, key))}</button>`).join("")}</div>${groups.map(([group, key], index) => `<section id="nutrition-nutrient-${group}" data-nutrient-panel="${group}" aria-label="${C.esc(t(`foodsUi.${key}`, key))}" ${index ? "hidden" : ""}>${nutrientGroup(details, group)}</section>`).join("")}</div>`;
    const portions = details.portions.length ? details.portions.map((item) => `<li><strong>${C.esc(item.name)}</strong><span>${C.esc(`${item.amount} ${t(`portionUnits.${item.unit}`, item.unit)} = ${item.equivalentGrams} g`)}</span></li>`).join("") : `<li>${C.esc(t("foodsUi.noData", "No data"))}</li>`;
    return `<div class="nutrition-food-detail-scroll"><div class="nutrition-food-detail-head">${image(food, "preview")}<div><h3>${C.esc(foodName(food))}</h3>${C.badge(food.status === "active" ? t("foodsUi.active", "Active") : t("foodsUi.archived", "Archived"))}<p>${C.esc(categoryName(food.categoryId))} · ${C.esc(stateName(food.preparationState))}</p></div></div>
      <div class="nutrition-food-metrics">${metric(t("foodsUi.calories", "Calories"), "energyKcal", "kcal")}${metric(t("foodsUi.protein", "Protein"), "protein", "g")}${metric(t("foodsUi.carbs", "Carbs"), "carbohydrate", "g")}${metric(t("foodsUi.fat", "Fat"), "totalFat", "g")}</div><small class="nutrition-food-metric-basis">${C.esc(t("foodsUi.per100", "per 100 g"))}</small>
      ${nutrientTabs}<div class="nutrition-detail-accordions"><details><summary>${C.esc(t("foodsUi.portions", "Portions"))}</summary><div class="nutrition-food-secondary-metrics"><span>${C.esc(t("foodsUi.serving", "Serving"))}: ${C.esc(`${food.defaultServingGrams || 100} g`)}</span><span>${C.esc(t("foodsUi.fiber", "Fiber"))}: ${C.esc(format(value(details, "fiber"), "g"))}</span></div><ul class="nutrition-detail-portions">${portions}</ul></details><details><summary>${C.esc(t("foodsUi.source", "Source"))}</summary><div class="nutrition-source-note"><strong>${C.esc(source?.provider || t("filters.origins.manual", "Manual entry"))}</strong><span>${C.esc(source?.sourceDescription || food.sourceNote || "—")}</span></div></details></div></div>
      <button class="nutrition-btn nutrition-btn-primary nutrition-detail-edit" type="button" data-action="food-edit" data-id="${C.esc(food.id)}">${I.icon("edit")} ${C.esc(food.ownership === "system" ? t("foodForm.titleCopy", "Create user copy") : t("foodsUi.edit", "Edit"))}</button>`;
  }

  function categoryPanel(state, allFoods) {
    const counts = new Map(); allFoods.forEach((food) => counts.set(food.categoryId, (counts.get(food.categoryId) || 0) + 1));
    const assets = {
      vegetables:"vegetables", fruits:"fruit", meat:"meat", "fish-seafood":"fish-seafood", dairy:"dairy", grains:"grains",
      poultry:"Zivina", eggs:"Jaja", "bread-bakery":"PekarskiProizvodi", "pasta-noodles":"Testenina",
      legumes:"Mahunarke", "nuts-seeds":"OrasastiPlodovi", "fats-oils":"MastiIUlja", "herbs-spices":"Zacini",
      beverages:"Pica", "prepared-foods":"GotovaJela", "snacks-sweets":"GrickaliceISlatkisi", other:"Ostalo"
    };
    const categories = window.MentorNutritionFoodCategories || [];
    const primary = Object.keys(assets).map((id) => categories.find((item) => item.id === id)).filter(Boolean);
    const remaining = categories.filter((item) => !assets[item.id]);
    const card = (id, label, count) => `<button type="button" class="${(state.filters.foodCategory || "") === id ? "active" : ""}" data-action="food-category" data-category="${C.esc(id)}" aria-pressed="${(state.filters.foodCategory || "") === id}">${assets[id] ? `<img class="nutrition-category-image" src="assets/nutrition/${assets[id]}.png" alt="" decoding="async">` : id ? I.category(id) : I.icon("grid")}<span class="nutrition-category-copy"><span>${C.esc(label)}</span><strong>${count}</strong></span></button>`;
    return `<section class="nutrition-category-strip" data-panel="food-categories" aria-label="${C.esc(t("foodsUi.categories", "Categories"))}"><div class="nutrition-food-categories">${card("", t("foodsUi.all", "All"), allFoods.length)}${[...primary, ...remaining].map((item) => card(item.id, categoryName(item.id), counts.get(item.id) || 0)).join("")}</div></section>`;
  }

  function quickPanel() {
    const actions = [["upload", "import", "food-quick-import"], ["plus", "manual", "food-add"], ["recipe", "recipe", "food-quick-recipe"], ["fridge", "fridge", "food-quick-fridge"]];
    return `<section class="nutrition-food-quick-panel" data-panel="food-quick-actions" aria-label="${C.esc(t("foodsUi.quick", "Quick actions"))}"><div class="nutrition-action-grid nutrition-food-actions">${actions.map(([icon, key, action]) => `<button type="button" data-action="${action}">${I.icon(icon)}<span><strong>${C.esc(t(`quickActions.${key}.title`, key))}</strong><small>${C.esc(t(`quickActions.${key}.description`, ""))}</small></span></button>`).join("")}</div></section>`;
  }

  function foodResults(state) {
    const visible = getFoods(state), all = window.MentorFoodRepository.getAll();
    if (!visible.some((food) => food.id === state.selectedFood)) state.selectedFood = visible[0]?.id || null;
    const selected = all.find((food) => food.id === state.selectedFood) || null;
    const count = t("foodsUi.resultCount", `${visible.length} results`, { count: visible.length });
    return `${categoryPanel(state, all)}<div class="nutrition-food-layout"><div class="nutrition-food-main"><section class="nutrition-panel nutrition-food-database-panel" data-panel="food-database"><div class="nutrition-panel-head"><h2>${I.icon("box")} ${C.esc(t("foodsUi.listTitle", "Foods"))}</h2><span>${C.esc(count)}</span></div><div class="nutrition-table-wrap nutrition-food-table"><table><thead><tr><th>${C.esc(t("foodsUi.name", "Name"))}</th><th>${C.esc(t("foodsUi.category", "Category"))}</th><th>${C.esc(t("foodsUi.per100Header", "kcal / 100 g"))}</th><th>${C.esc(t("foodsUi.protein", "Protein"))}</th><th>${C.esc(t("foodsUi.carbs", "Carbs"))}</th><th>${C.esc(t("foodsUi.fat", "Fat"))}</th><th><span class="sr-only">${C.esc(t("foodsUi.quick", "Quick actions"))}</span></th></tr></thead><tbody>${rows(state, visible)}</tbody></table></div></section>${quickPanel()}</div><aside class="nutrition-food-aside" data-panel="food-details">${C.panel(t("foodsUi.details", "Details"), detail(selected), "nutrition-food-detail")}</aside></div>`;
  }

  function foods(state) {
    return `${state.notice ? `<div class="nutrition-notice nutrition-notice-${C.esc(state.notice.type || "success")}">${C.esc(state.notice.text)}</div>` : ""}${filters(state)}<div data-food-results>${foodResults(state)}</div>`;
  }

  window.MentorNutritionTabs = window.MentorNutritionTabs || {};
  window.MentorNutritionTabs.foods = foods;
  window.MentorNutritionTabs.foodFilters = filters;
  window.MentorNutritionTabs.foodResults = foodResults;
})();
