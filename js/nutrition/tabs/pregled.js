(function () {
  "use strict";

  const C = window.MentorNutritionComponents;
  const I = window.MentorNutritionIcons;
  const selectors = () => window.MentorMealPlanSelectors;
  const t = (key, fallback, params) => C.t(`overview.${key}`, fallback, params);
  const PROFILE_IMAGE_CONFIG = Object.freeze({
    male: Object.freeze({ src: "assets/nutrition-man-male.png" }),
    female: Object.freeze({ src: null })
  });
  const nutrientRows = Object.freeze([
    Object.freeze({ key: "calories", fallback: "Kalorije", code: "energyKcal", unit: "kcal", icon: "drop", digits: 0 }),
    Object.freeze({ key: "protein", fallback: "Proteini", code: "protein", unit: "g", icon: "meat", digits: 1 }),
    Object.freeze({ key: "carbohydrates", fallback: "Ugljeni hidrati", code: "carbohydrate", unit: "g", icon: "grain", digits: 1 }),
    Object.freeze({ key: "fat", fallback: "Masti", code: "totalFat", unit: "g", icon: "nut", digits: 1 }),
    Object.freeze({ key: "fiber", fallback: "Vlakna", code: "fiber", unit: "g", icon: "leaf", digits: 1 }),
    Object.freeze({ key: "micronutrients", fallback: "Vitamini / minerali", code: "micronutrients", unit: "", icon: "apple", digits: 0 })
  ]);
  const mealTypeIcons = Object.freeze({ breakfast: "leaf", snack: "apple", lunch: "recipe", dinner: "fridge" });

  function profileImageFor(state) {
    const requestedGender = String(state?.nutritionProfile?.gender || state?.profile?.gender || "male").toLowerCase();
    return PROFILE_IMAGE_CONFIG[requestedGender]?.src || PROFILE_IMAGE_CONFIG.male.src;
  }

  function percentOf(value, target) {
    return Number.isFinite(Number(value)) && Number(target) > 0
      ? Math.round(Number(value) / Number(target) * 100)
      : null;
  }

  function number(value, digits = 0) {
    return new Intl.NumberFormat(window.MentorI18n?.locale || undefined, { maximumFractionDigits: digits }).format(value);
  }

  function micronutrientMetric(row, analysis) {
    const label = t(`nutrients.${row.key}`, row.fallback);
    const status = analysis?.status || "unknown";
    const statusFallbacks = { deficit:"Ispod reference", low:"Niže od reference", optimal:"Oko reference", high:"Iznad reference", excessive:"Znatno iznad reference", unknown:"Nema podataka" };
    const statusLabel = t(`micronutrientStatus.${status}`, statusFallbacks[status] || statusFallbacks.unknown);
    return `<article class="nutrition-overview-metric nutrition-overview-metric-micronutrients is-${C.esc(status)}">
      <header>
        <span class="nutrition-overview-metric-icon">${I.icon(row.icon)}</span>
        <span>${C.esc(label)}</span>
      </header>
      <div class="nutrition-overview-metric-values nutrition-overview-micronutrient-status">
        <strong>${C.esc(statusLabel)}</strong>
      </div>
    </article>`;
  }

  function metric(row, summary, goals, micronutrients) {
    if (row.code === "micronutrients") return micronutrientMetric(row, micronutrients);
    const target = goals?.[row.code];
    const known = Boolean(summary?.known?.[row.code]) && Number(target) > 0;
    const value = known ? summary.values[row.code] : null;
    const percent = known ? percentOf(value, target) : null;
    const amount = known
      ? `${number(value, row.digits)} / ${number(target, row.digits)} ${row.unit}`
      : t("notAvailable", "N/A");
    const label = t(`nutrients.${row.key}`, row.fallback);
    const safePercent = known ? Math.min(100, Math.max(0, percent)) : 0;
    return `<article class="nutrition-overview-metric ${known ? "" : "is-unknown"}">
      <header>
        <span class="nutrition-overview-metric-icon">${I.icon(row.icon)}</span>
        <span>${C.esc(label)}</span>
      </header>
      <div class="nutrition-overview-metric-values">
        <strong>${C.esc(amount)}</strong>
        <small>${known ? C.esc(`${percent}%`) : "—"}</small>
      </div>
      <div class="nutrition-progress-track" role="progressbar" aria-label="${C.esc(label)}" aria-valuemin="0" aria-valuemax="100" ${known ? `aria-valuenow="${safePercent}"` : `aria-valuetext="${C.esc(t("noNutritionData", "Nema nutritivnih podataka"))}"`}><i style="width:${safePercent}%"></i></div>
    </article>`;
  }

  function planningLabel(key, fallback) {
    return C.t(`planning.${key}`, fallback);
  }

  function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function mealImage(recipe) {
    const image = recipe?.image || {};
    const photo = image.imageType === "url" && image.imageUrl
      ? `<img src="${C.esc(image.imageUrl)}" loading="lazy" decoding="async" data-image-fallback alt="">`
      : image.imageType === "local" && recipe?.id
        ? `<img data-recipe-image-id="${C.esc(recipe.id)}" data-recipe-image-size="thumb" loading="lazy" decoding="async" alt="">`
        : "";
    return `${photo}${C.foodIcon(recipe?.name || "?")}`;
  }

  function entriesForDate(state) {
    const selectedDate = dateKey(state.date);
    const order = new Map(["breakfast", "snack", "lunch", "dinner"].map((type, index) => [type, index]));
    return (window.MentorPlanningRepository?.getMealPlanEntries?.() || [])
      .filter((entry) => entry.plannedDate === selectedDate)
      .sort((a, b) => (order.get(a.mealType) ?? 99) - (order.get(b.mealType) ?? 99)
        || String(a.plannedTime || a.time || "").localeCompare(String(b.plannedTime || b.time || ""))
        || String(a.createdAt || a.id).localeCompare(String(b.createdAt || b.id)));
  }

  function dailyMeals(entries) {
    const recipes = window.MentorPlanningRepository?.getRecipes?.() || [];
    const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));
    if (!entries.length) return `<div class="nutrition-overview-meals-empty"><p>${C.esc(t("emptyPlan", "Nema planiranih obroka za izabrani datum."))}</p></div>`;
    return entries.map((entry) => {
      const recipe = recipeMap.get(entry.recipeId) || null;
      const done = entry.status === "completed" || Boolean(entry.completedAt);
      const name = recipe?.name || t("missingRecipe", "Recept nije dostupan");
      const mealType = planningLabel(entry.mealType, entry.mealType || "");
      const mealTime = entry.plannedTime || entry.time || "";
      const status = planningLabel(done ? "completed" : "planned", done ? "Pripremljeno" : "Planirano");
      return `<article class="nutrition-overview-meal ${done ? "done" : ""}">
        <span class="nutrition-overview-meal-period">${I.icon(mealTypeIcons[entry.mealType] || "leaf")}</span>
        <div class="nutrition-overview-meal-copy">
          <span>${C.esc([mealType, mealTime].filter(Boolean).join(" · "))}</span>
          <strong>${C.esc(name)}</strong>
          <small>${C.esc(status)}</small>
        </div>
        <span class="nutrition-overview-meal-image">${mealImage(recipe)}</span>
        <button type="button" data-action="meal-toggle" data-id="${C.esc(entry.id)}" aria-label="${C.esc(done ? t("uncompleteMeal", "Ukloni oznaku pripremljeno za obrok {{meal}}", { meal: name }) : t("completeMeal", "Označi obrok {{meal}} kao pripremljen", { meal: name }))}" aria-pressed="${done}">${done ? "✓" : ""}</button>
      </article>`;
    }).join("");
  }

  function formatDate(date) {
    return window.MentorI18n?.formatters?.date?.format(date) || date.toLocaleDateString();
  }

  function nutritionScore(summary, goals) {
    const coreRows = nutrientRows.filter((row) => row.code !== "micronutrients");
    if (!coreRows.every((row) => summary?.known?.[row.code] && Number(goals?.[row.code]) > 0)) return null;
    const percentages = coreRows
      .map((row) => percentOf(summary.values[row.code], goals[row.code]))
      .map((value) => Math.min(100, Math.max(0, value)));
    return Math.round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length);
  }

  function overviewAction(label, action) {
    return `<button class="nutrition-btn nutrition-overview-link" type="button" data-action="${C.esc(action)}"><span>${C.esc(label)}</span><span aria-hidden="true">→</span></button>`;
  }

  function panelTitle(icon, label) {
    return `<div class="nutrition-panel-head"><h2><span>${I.icon(icon)}</span>${C.esc(label)}</h2></div>`;
  }

  function overview(state) {
    const inventory = window.MentorInventoryRepository.getBatches();
    const statuses = inventory.map((batch) => window.MentorInventoryService.statusForBatch(batch));
    const available = statuses.filter((status) => status === "available").length;
    const expiring = statuses.filter((status) => ["expiring_soon", "expires_today"].includes(status)).length;
    const low = statuses.filter((status) => status === "low").length;
    const selectedEntries = entriesForDate(state);
    const recipes = window.MentorPlanningRepository?.getRecipes?.() || [];
    const dailySummary = selectors()?.aggregateEntries?.(selectedEntries, recipes) || null;
    const micronutrients = selectors()?.micronutrientSummary?.(selectedEntries, recipes) || null;
    const goals = selectors()?.dailyGoals?.() || {};
    const completedMeals = selectedEntries.filter((entry) => entry.status === "completed" || entry.completedAt).length;
    const score = nutritionScore(dailySummary, goals);
    const scoreWidth = score === null ? 0 : Math.min(100, Math.max(0, score));
    const proteinKnown = Boolean(dailySummary?.known?.protein) && Number(goals.protein) > 0;
    const proteinPercent = proteinKnown ? percentOf(dailySummary.values.protein, goals.protein) : null;
    const proteinNeedsFocus = proteinKnown && proteinPercent < 80;
    const mentorKey = !proteinKnown ? "mentorNoData" : proteinNeedsFocus ? "mentorProtein" : "mentorBalanced";
    const mentorReasonKey = !proteinKnown ? "mentorNoDataReason" : proteinNeedsFocus ? "mentorProteinReason" : "mentorBalancedReason";
    const mentorFallback = !proteinKnown ? "Nema dovoljno podataka za dnevnu preporuku." : proteinNeedsFocus ? "Fokus danas: povećaj unos proteina." : "Fokus danas: zadrži trenutni balans.";
    const mentorReasonFallback = !proteinKnown ? "Dodaj nutritivno kompletne recepte u plan za izabrani dan." : proteinNeedsFocus ? "Proteini su trenutno na {{percent}}% dnevnog cilja." : "Dnevni nutritivni ciljevi su u dobrom balansu.";
    const leftMetrics = nutrientRows.slice(0, 3).map((row) => metric(row, dailySummary, goals, micronutrients)).join("");
    const rightMetrics = nutrientRows.slice(3).map((row) => metric(row, dailySummary, goals, micronutrients)).join("");

    return `<div class="nutrition-overview">
      <section class="nutrition-panel nutrition-overview-profile-panel">
        <header class="nutrition-overview-profile-head">
          <h2>${C.esc(t("nutritionState", "Nutritivno stanje"))}</h2>
          <div class="nutrition-overview-date-nav" aria-label="${C.esc(t("dateLabel", "Datum nutritivnog pregleda"))}">
            <button data-action="day-prev" type="button" aria-label="${C.esc(t("previousDay", "Prethodni dan"))}">‹</button>
            <span>${I.icon("calendar")}<strong>${C.esc(formatDate(state.date))}</strong></span>
            <button data-action="day-next" type="button" aria-label="${C.esc(t("nextDay", "Sledeći dan"))}">›</button>
          </div>
        </header>
        <div class="nutrition-overview-profile-body">
          <div class="nutrition-overview-metrics nutrition-overview-metrics-left">${leftMetrics}</div>
          <figure class="nutrition-overview-figure">
            <span class="nutrition-overview-figure-ring" aria-hidden="true"></span>
            <img src="${C.esc(profileImageFor(state))}" alt="${C.esc(t("silhouetteAlt", "Nutrition profil korisnika"))}">
          </figure>
          <div class="nutrition-overview-metrics nutrition-overview-metrics-right">${rightMetrics}</div>
        </div>
      </section>

      <section class="nutrition-panel nutrition-overview-plan-panel">
        <header class="nutrition-overview-plan-head">
          <h2><span>${I.icon("recipe")}</span>${C.esc(t("dailyPlan", "Dnevni plan ishrane"))}</h2>
          ${overviewAction(t("viewMealPlan", "Pogledaj plan ishrane"), "tab-plan")}
        </header>
        <div class="nutrition-overview-meals ${selectedEntries.length > 5 ? "has-overflow" : ""}">${dailyMeals(selectedEntries)}</div>
      </section>

      <div class="nutrition-overview-bottom-grid">
        <section class="nutrition-panel nutrition-overview-compact-panel">
          ${panelTitle("recipe", t("statistics", "Statistika"))}
          <div class="nutrition-overview-stat">
            <strong>${C.esc(score === null ? t("notAvailable", "N/A") : `${score}%`)}</strong>
            <div><span>${C.esc(t("dailyGoal", "dnevnog nutritivnog cilja"))}</span><small>${C.esc(t("mealsCompleted", "{{completed}} od {{total}} obroka završeno", { completed: completedMeals, total: selectedEntries.length }))}</small></div>
          </div>
          <div class="nutrition-progress-track nutrition-overview-stat-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" ${score === null ? `aria-valuetext="${C.esc(t("noNutritionData", "Nema nutritivnih podataka"))}"` : `aria-valuenow="${scoreWidth}"`}><i style="width:${scoreWidth}%"></i></div>
          <div class="nutrition-overview-panel-action">${overviewAction(t("detailedStatistics", "Detaljna statistika"), "tab-statistics")}</div>
        </section>

        <section class="nutrition-panel nutrition-overview-compact-panel">
          ${panelTitle("box", t("inventoryState", "Stanje zaliha"))}
          <div class="nutrition-overview-inventory">
            <div><strong>${available}</strong><span>${C.esc(t("available", "dostupno"))}</span></div>
            <div><strong>${expiring}</strong><span>${C.esc(t("expiring", "ističe uskoro"))}</span></div>
            <div><strong>${low}</strong><span>${C.esc(t("low", "pri kraju"))}</span></div>
          </div>
          <div class="nutrition-overview-panel-action">${overviewAction(t("viewInventory", "Pregled zaliha"), "tab-fridge")}</div>
        </section>

        <section class="nutrition-panel nutrition-overview-compact-panel nutrition-overview-mentor-panel">
          ${panelTitle("leaf", t("mentorSuggestion", "Mentor predlog"))}
          <div class="nutrition-overview-mentor">
            <span aria-hidden="true">${I.icon("leaf")}</span>
            <div>
              <strong>${C.esc(t(mentorKey, mentorFallback))}</strong>
              <p>${C.esc(t(mentorReasonKey, mentorReasonFallback, { percent: proteinPercent }))}</p>
            </div>
          </div>
        </section>
      </div>
    </div>`;
  }

  window.MentorNutritionTabs = window.MentorNutritionTabs || {};
  window.MentorNutritionTabs.overview = overview;
})();
