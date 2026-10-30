(function () {
  "use strict";

  const service = () => window.MentorRecipeFilterService;
  const C = () => window.MentorNutritionComponents;
  const t = (key, fallback) => C().t(`planning.filters.${key}`, fallback);
  const GROUP_LABELS = {
    mealTypes: ["meal", "Meal"], dietaryPatterns: ["diet", "Diet"], fastingTypes: ["fastingLabel", "Fasting"],
    allergenExclusions: ["allergens", "Allergens"], nutritionTags: ["nutrition", "Nutrition tags"],
    preparationTime: ["time", "Time"], availability: ["availability", "Availability"]
  };

  function optionLabel(group, value) {
    return t(`options.${value}`, value);
  }

  function groupLabel(group) {
    const config = GROUP_LABELS[group] || [group, group];
    return t(config[0], config[1]);
  }

  function optionRows(group, filters, prefix) {
    return service().OPTIONS[group].map((value) => {
      const id = `recipe-filter-${prefix}-${group}-${value}`;
      const checked = filters[group].includes(value);
      return `<label class="nutrition-recipe-filter-option ${checked ? "is-checked" : ""}" for="${C().esc(id)}"><input id="${C().esc(id)}" type="checkbox" data-recipe-filter-option data-filter-group="${C().esc(group)}" value="${C().esc(value)}" ${checked ? "checked" : ""}><span>${C().esc(optionLabel(group, value))}</span></label>`;
    }).join("");
  }

  function dropdown(group, filters, open) {
    const panelId = `nutrition-recipe-filter-panel-${group}`;
    const count = filters[group].length;
    return `<div class="nutrition-recipe-filter-dropdown nutrition-recipe-filter-desktop ${open === group ? "is-open" : ""}" data-recipe-filter-dropdown="${C().esc(group)}">
      <button id="nutrition-recipe-filter-trigger-${C().esc(group)}" class="nutrition-recipe-filter-trigger" type="button" data-action="recipe-filter-toggle" data-filter-panel="${C().esc(group)}" aria-expanded="${open === group}" aria-controls="${C().esc(panelId)}" aria-haspopup="true">${C().esc(groupLabel(group))}${count ? `<span>${count}</span>` : ""}<b aria-hidden="true">&#8964;</b></button>
      <div id="${C().esc(panelId)}" class="nutrition-recipe-filter-menu" role="group" aria-label="${C().esc(groupLabel(group))}" ${open === group ? "" : "hidden"}>${optionRows(group, filters, "desktop")}</div>
    </div>`;
  }

  function allDropdown(filters, open) {
    const group = "all";
    const panelId = "nutrition-recipe-filter-panel-all";
    return `<div class="nutrition-recipe-filter-dropdown nutrition-recipe-filter-all ${open === group ? "is-open" : ""}" data-recipe-filter-dropdown="all">
      <button id="nutrition-recipe-filter-trigger-all" class="nutrition-recipe-filter-trigger" type="button" data-action="recipe-filter-toggle" data-filter-panel="all" aria-expanded="${open === group}" aria-controls="${panelId}" aria-haspopup="true">${C().esc(t("all", "All filters"))}<b aria-hidden="true">&#8964;</b></button>
      <div id="${panelId}" class="nutrition-recipe-filter-menu nutrition-recipe-filter-menu-all" role="group" aria-label="${C().esc(t("all", "All filters"))}" ${open === group ? "" : "hidden"}>${service().GROUPS.map((item) => `<fieldset><legend>${C().esc(groupLabel(item))}</legend>${optionRows(item, filters, "all")}</fieldset>`).join("")}</div>
    </div>`;
  }

  function chips(filters) {
    const items = service().GROUPS.flatMap((group) => filters[group].map((value) => ({ group, value })));
    if (!items.length && !filters.search.trim()) return "";
    return `<div class="nutrition-recipe-filter-chips" aria-label="${C().esc(t("selected", "Selected filters"))}">${items.map(({ group, value }) => `<button type="button" class="nutrition-recipe-filter-chip" data-action="recipe-filter-remove" data-filter-group="${C().esc(group)}" data-filter-value="${C().esc(value)}" aria-label="${C().esc(t("remove", "Remove filter"))}: ${C().esc(optionLabel(group, value))}"><span>${C().esc(optionLabel(group, value))}</span><b aria-hidden="true">&times;</b></button>`).join("")}<button type="button" class="nutrition-recipe-filter-reset" data-action="recipe-filter-reset">${C().esc(t("reset", "Reset filters"))}</button></div>`;
  }

  function render(state) {
    const filters = service().normalize(state.recipeFilters);
    state.recipeFilters = filters;
    const open = state.recipeFilterOpen || null;
    return `<div class="nutrition-recipe-filter-system" data-recipe-filter-system>
      <div class="nutrition-recipe-filter-toolbar">
        <label class="nutrition-search"><span class="sr-only">${C().esc(t("searchLabel", "Search recipes"))}</span>${window.MentorNutritionIcons.icon("search")}<input id="nutrition-recipe-search" type="search" data-recipe-search value="${C().esc(filters.search)}" placeholder="${C().esc(t("search", "Search recipes..."))}"></label>
        ${allDropdown(filters, open)}
        ${service().GROUPS.map((group) => dropdown(group, filters, open)).join("")}
        <button class="nutrition-btn nutrition-btn-primary nutrition-recipe-add" type="button" data-action="recipe-add">${window.MentorNutritionIcons.icon("plus")}${C().esc(C().t("planning.addRecipe", "Add recipe"))}</button>
      </div>
      <div data-recipe-filter-chips-host>${chips(filters)}</div>
    </div>`;
  }

  window.MentorRecipeFiltersView = { render, renderChips:chips, optionLabel, groupLabel };
})();
