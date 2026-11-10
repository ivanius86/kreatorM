(function () {
  "use strict";

  const C = () => window.MentorNutritionComponents;
  const t = (key, fallback) => C().t(`intake.${key}`, fallback);
  const esc = (value) => C().esc(value);
  const localDate = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  };

  function open(state, mealId) {
    const saved = window.MentorIntakeService.getForMealPlanEntry(mealId);
    const meal = window.MentorPlanningRepository.getMealPlanEntryById(mealId);
    const recipe = meal ? window.MentorPlanningRepository.getRecipeById(meal.recipeId) : null;
    if (!saved && (!meal || !recipe)) return false;
    state.planRecipeMoreOpen = false;
    state.intakeForm = {
      mealId, recipeName: saved?.recipeName || recipe.name,
      draft: { eatenDate: saved?.eatenDate || localDate(), servings: saved?.servings ?? meal.servings },
      error: null, saving: false
    };
    state.modal = { type: "intake-form" };
    return true;
  }

  function render(state) {
    const form = state.intakeForm;
    if (!form) return "";
    return `<div class="nutrition-modal-backdrop" data-action="intake-cancel"></div>
      <section class="nutrition-simple-dialog nutrition-intake-dialog" role="dialog" aria-modal="true" aria-labelledby="nutrition-intake-title">
        <form data-intake-form novalidate>
          <h2 id="nutrition-intake-title">${esc(t("title", "Record food intake"))}</h2>
          <p class="nutrition-intake-recipe-name">${esc(form.recipeName)}</p>
          ${form.error ? `<p class="nutrition-notice nutrition-notice-error" role="alert">${esc(t(form.error === "save" ? "error" : "validation", "Check the intake values."))}</p>` : ""}
          <label class="nutrition-form-field"><span>${esc(t("eatenDate", "Date eaten"))}</span><input type="date" data-intake-field="eatenDate" value="${esc(form.draft.eatenDate)}" required></label>
          <label class="nutrition-form-field"><span>${esc(t("servings", "Servings eaten"))}</span><input type="number" min="0.01" step="any" data-intake-field="servings" value="${esc(form.draft.servings)}" required></label>
          <p class="nutrition-statistics-note">${esc(t("inventoryNote", "Recording food intake does not change inventory."))}</p>
          <div class="nutrition-intake-form-actions"><button type="button" class="nutrition-btn" data-action="intake-cancel" ${form.saving ? "disabled" : ""}>${esc(t("cancel", "Cancel"))}</button><button type="submit" class="nutrition-btn nutrition-btn-primary" ${form.saving ? "disabled" : ""}>${esc(t("save", "Save intake"))}</button></div>
        </form>
      </section>`;
  }

  window.MentorNutritionIntakeForm = { open, render };
})();
