(function () {
  "use strict";
  const C = window.MentorNutritionComponents;
  const t = (key, fallback, params) => C.t(`statistics.${key}`, fallback, params);
  const periods = ["day", "week", "month", "year"];
  const main = [["energyKcal","calories","kcal",0],["protein","protein","g",1],["carbohydrate","carbohydrates","g",1],["totalFat","fat","g",1],["fiber","fiber","g",1]];
  const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  const number = (value, digits=0) => new Intl.NumberFormat(window.MentorI18n?.locale || undefined, { maximumFractionDigits:digits }).format(value);
  function range(period, selected) {
    const start = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 12), end = new Date(start);
    if (period === "week") { start.setDate(start.getDate() - (start.getDay()+6)%7); end.setTime(start.getTime()); end.setDate(end.getDate()+6); }
    else if (period === "month") { start.setDate(1); end.setFullYear(start.getFullYear(),start.getMonth()+1,0); }
    else if (period === "year") { start.setMonth(0,1); end.setFullYear(start.getFullYear(),11,31); }
    return { start:dateKey(start), end:dateKey(end) };
  }
  const value = (summary, code, unit, digits) => summary.known[code] ? `${number(summary.values[code],digits)} ${unit}` : t("unknown","No data");
  function microRows(summary, group) {
    const rows = summary.nutrients.filter((item) => item.group === group);
    return rows.length ? rows.map((item) => {
      const definition = window.MentorNutrientRepository.getByCode?.(item.code);
      const label = definition?.nameKey ? window.MentorI18n?.t?.(definition.nameKey,definition.defaultName) || definition.defaultName : item.code;
      return `<div class="nutrition-list-row"><strong>${C.esc(label)}</strong><span>${C.esc(item.complete ? `${number(item.amount,2)} ${item.unit}` : t("unknown","No data"))}</span></div>`;
    }).join("") : `<p class="nutrition-statistics-empty">${C.esc(t("unknown","No data"))}</p>`;
  }
  function plannedRows(dates) {
    const entries = window.MentorPlanningRepository.getMealPlanEntries().filter((entry) => entry.plannedDate >= dates.start && entry.plannedDate <= dates.end);
    const recipes = window.MentorPlanningRepository.getRecipes(), recipeMap = new Map(recipes.map((recipe) => [recipe.id,recipe]));
    const selectors = window.MentorMealPlanSelectors;
    const meals = entries.map((entry) => {
      const recipe = recipeMap.get(entry.recipeId), nutrition = selectors.recipeNutrition(recipe,entry.servings);
      return `<div class="nutrition-list-row"><div><strong>${C.esc(recipe?.name || t("missingRecipe","Recipe unavailable"))}</strong><span>${C.esc(entry.plannedDate)}</span></div><span>${C.esc(value(nutrition,"energyKcal","kcal",0))}</span></div>`;
    }).join("") || `<p class="nutrition-statistics-empty">${C.esc(t("noMeals","No planned meals for this period."))}</p>`;
    return { summary:selectors.aggregateEntries(entries,recipes), micronutrients:selectors.micronutrientSummary(entries,recipes), meals };
  }
  function recordedRows(dates) {
    const intake = window.MentorIntakeService, entries = intake.getEntries({startDate:dates.start,endDate:dates.end});
    const summary = window.MentorIntakeSelectors.aggregate(entries), micronutrients = window.MentorIntakeSelectors.micronutrientSummary(entries);
    const meals = entries.map((entry) => {
      const nutrition = intake.nutritionForEntry(entry);
      return `<div class="nutrition-intake-row"><div><strong>${C.esc(entry.recipeName)}</strong><span>${C.esc(entry.eatenDate)} · ${C.esc(number(entry.servings,2))} ${C.esc(t("servings","servings"))}</span></div><strong>${C.esc(value(nutrition,"energyKcal","kcal",0))}</strong><div class="nutrition-intake-row-actions"><button type="button" class="nutrition-btn" data-action="intake-open" data-id="${C.esc(entry.mealPlanEntryId)}">${C.esc(t("editIntake","Edit"))}</button><button type="button" class="nutrition-btn nutrition-btn-danger" data-action="intake-remove" data-id="${C.esc(entry.mealPlanEntryId)}">${C.esc(t("removeIntake","Delete"))}</button></div></div>`;
    }).join("") || `<p class="nutrition-statistics-empty">${C.esc(t("noIntake","No recorded intake for this period."))}</p>`;
    return { summary,micronutrients,meals };
  }
  function statistics(state) {
    const period = periods.includes(state.period) ? state.period : "day";
    const selected = state.statisticsDate instanceof Date && Number.isFinite(state.statisticsDate.getTime()) ? state.statisticsDate : new Date();
    const mode = state.statisticsMode === "recorded" ? "recorded" : "plan";
    const {summary,micronutrients,meals} = mode === "recorded" ? recordedRows(range(period,selected)) : plannedRows(range(period,selected));
    const completeCount = main.filter(([code]) => summary.known[code]).length;
    const values = main.map(([code,key,unit,digits]) => C.summary(t(key,key),value(summary,code,unit,digits))).join("");
    const macroCodes = ["protein","carbohydrate","totalFat"];
    const macroEnergy = summary.known.protein && summary.known.carbohydrate && summary.known.totalFat ? summary.values.protein*4 + summary.values.carbohydrate*4 + summary.values.totalFat*9 : 0;
    const macros = macroEnergy > 0 ? macroCodes.map((code) => {
      const label = t(code === "totalFat" ? "fat" : code === "carbohydrate" ? "carbohydrates" : code,code);
      const calories = summary.values[code] * (code === "totalFat" ? 9 : 4);
      return `<div class="nutrition-list-row"><strong>${C.esc(label)}</strong><span>${C.esc(`${number(calories/macroEnergy*100)}%`)}</span></div>`;
    }).join("") : `<p class="nutrition-statistics-empty">${C.esc(t("unknown","No data"))}</p>`;
    return `<div class="nutrition-statistics-mode" role="group" aria-label="${C.esc(t("mode","Statistics source"))}">
      ${["plan","recorded"].map((key) => `<button type="button" data-action="statistics-mode" data-mode="${key}" class="${mode===key?"active":""}" aria-pressed="${mode===key}">${C.esc(t(`modes.${key}`,key))}</button>`).join("")}
    </div><div class="nutrition-periods" role="group" aria-label="${C.esc(t("period","Period"))}">
      ${periods.map((key) => `<button type="button" data-action="period" data-period="${key}" class="${period===key?"active":""}" aria-pressed="${period===key}">${C.esc(t(`periods.${key}`,key))}</button>`).join("")}
      <input type="date" data-statistics-date value="${dateKey(selected)}" aria-label="${C.esc(t("date","Statistics date"))}">
    </div>
    <p class="nutrition-statistics-note">${C.esc(t(mode==="recorded"?"recordedNotice":"plannedNotice",""))}</p>
    <div class="nutrition-dashboard-grid"><div>
      ${C.panel(t(mode==="recorded"?"recordedValues":"values","Nutrition values"),`<div class="nutrition-summary-grid nutrition-six">${values}</div>`)}
      ${C.panel(t("vitamins","Vitamins"),microRows(micronutrients,"vitamin"))}
      ${C.panel(t("minerals","Minerals"),microRows(micronutrients,"mineral"))}
    </div><aside>
      ${C.panel(t(mode==="recorded"?"recordedMacros":"macros","Macro share"),macros)}
      ${C.panel(t(mode==="recorded"?"recordedMeals":"meals","Meals"),meals)}
      ${C.panel(t("coverage","Data completeness"),`<p class="nutrition-statistics-empty">${C.esc(t("coverageValue","{{known}} of {{total}} main values are known.",{known:completeCount,total:main.length}))}</p>`)}
    </aside></div>`;
  }
  window.MentorNutritionTabs = window.MentorNutritionTabs || {};
  window.MentorNutritionTabs.statistics = statistics;
})();
