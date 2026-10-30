(function(){
  "use strict";

  const components = () => window.MentorNutritionComponents;
  const esc = (value) => components().esc(value);
  const t = (key, fallback) => components().t(`planning.${key}`, fallback);
  const foodName = (food) => window.MentorNutritionInventoryFormUI.foodName(food);
  const option = (value, label, current) => `<option value="${esc(value)}" ${String(value) === String(current) ? "selected" : ""}>${esc(label)}</option>`;
  const mealOptions = (current) => ["breakfast", "lunch", "dinner", "snack"].map((value) => option(value, t(value, value), current)).join("");
  const imageValue = (recipe) => recipe?.image || { imageType: "none", imageUrl: null, localImageId: null, thumbnailId: null };
  const metadataValue = (recipe) => window.MentorRecipeFilterService.normalizeMetadata(recipe?.filterMetadata);

  function imageError(form) {
    const error = (form.errors || []).find((item) => item.field === "image" || item.field === "imageUrl");
    if (!error) return "";
    const key = error.code === "type" ? "imageTypeError" : error.code === "size" ? "imageSizeError" : error.code === "required" ? "imageRequiredError" : "imageUrlError";
    return `<small class="nutrition-field-error">${esc(t(key, "Invalid image."))}</small>`;
  }

  function openRecipe(state, id) {
    const recipe = id ? window.MentorPlanningRepository.getRecipeById(id) : null;
    state.recipeForm = {
      originalId: recipe?.id || null,
      draft: recipe ? { ...JSON.parse(JSON.stringify(recipe)), image: imageValue(recipe), filterMetadata: metadataValue(recipe) } : {
        name: "",
        description: "",
        videoUrl: "",
        servings: 1,
        mealType: "breakfast",
        image: imageValue(null),
        imageMeta: null,
        filterMetadata: metadataValue(null),
        ingredients: [{ foodId: "", quantity: "", unit: "g" }]
      },
      errors: [],
      saving: false,
      previewUrl: null,
      originalImage: JSON.parse(JSON.stringify(imageValue(recipe)))
    };
    state.recipeFormFile = null;
    state.modal = { type: "recipe-form" };
  }

  function renderRecipe(state) {
    const form = state.recipeForm;
    const d = form.draft;
    const image = imageValue(d), imageMode = image.imageType || "none";
    const imageSource = form.previewUrl || (imageMode === "url" ? image.imageUrl : "");
    const foods = window.MentorFoodRepository.getAll()
      .filter((food) => food.status !== "archived")
      .sort((a, b) => foodName(a).localeCompare(foodName(b)));

    return `<div class="nutrition-modal-backdrop" data-action="recipe-form-cancel"></div>
      <section class="nutrition-inventory-dialog nutrition-planning-dialog" role="dialog" aria-modal="true">
        <button type="button" class="nutrition-modal-x" data-action="recipe-form-cancel">${window.MentorNutritionIcons.icon("close")}</button>
        <form data-recipe-form novalidate>
          <header>
            <span>${esc(t("recipes", "Recipes"))}</span>
            <h2>${esc(t(form.originalId ? "editRecipe" : "addRecipe", "Recipe"))}</h2>
          </header>
          ${form.errors.length ? `<div class="nutrition-notice nutrition-notice-error">${esc(t("validation", "Check the form."))}</div>` : ""}
          <div class="nutrition-form-body nutrition-inventory-form-body">
            <div class="nutrition-inventory-form-grid">
              <label class="nutrition-form-field"><span>${esc(t("recipeName", "Recipe name"))}</span><input data-recipe-field="name" value="${esc(d.name)}" required></label>
              <label class="nutrition-form-field"><span>${esc(t("servings", "Servings"))}</span><input type="number" min="0" step="1" data-recipe-field="servings" value="${esc(d.servings)}" required></label>
              <label class="nutrition-form-field"><span>${esc(t("mealType", "Meal type"))}</span><select data-recipe-field="mealType">${mealOptions(d.mealType)}</select></label>
            </div>
            <label class="nutrition-form-field"><span>${esc(t("description", "Description"))}</span><textarea rows="2" data-recipe-field="description">${esc(d.description || "")}</textarea></label>
            <label class="nutrition-form-field"><span>${esc(t("videoUrl", "Video link"))}</span><input type="url" data-recipe-field="videoUrl" value="${esc(d.videoUrl || "")}" placeholder="https://www.youtube.com/watch?v=..."></label>
            ${(form.errors || []).some((item) => item.field === "videoUrl") ? `<small class="nutrition-field-error">${esc(t("videoUrlError", "Enter a valid HTTP or HTTPS video link."))}</small>` : ""}
            <fieldset class="nutrition-recipe-metadata-fieldset">
              <legend>${esc(t("preparation", "Preparation"))}</legend>
              <div class="nutrition-recipe-metadata-grid">
                <label class="nutrition-form-field"><span>${esc(t("preparationMinutes", "Preparation time (minutes)"))}</span><input type="number" min="1" step="1" data-recipe-metadata-minutes value="${esc(d.filterMetadata.preparationMinutes || "")}"></label>
              </div>
            </fieldset>
            <fieldset class="nutrition-recipe-image-fieldset">
              <legend>${esc(t("recipeImage", "Recipe image"))}</legend>
              <div class="nutrition-image-form">
                <div class="nutrition-image-modes" role="group" aria-label="${esc(t("recipeImage", "Recipe image"))}">
                  ${["none", "url", "local"].map((mode) => `<button type="button" class="${imageMode === mode ? "active" : ""}" data-action="recipe-image-mode" data-image-mode="${mode}" aria-pressed="${imageMode === mode}">${esc(t(`image${mode[0].toUpperCase()}${mode.slice(1)}`, mode))}</button>`).join("")}
                </div>
                ${imageMode === "url" ? `<label class="nutrition-form-field"><span>${esc(t("imageUrl", "Image URL"))}</span><input type="url" data-recipe-field="imageUrl" value="${esc(image.imageUrl || "")}" placeholder="https://…"></label>` : ""}
                ${imageMode === "local" ? `<label class="nutrition-upload-zone">${window.MentorNutritionIcons.icon("upload")}<strong>${esc(t("uploadImage", "Upload image"))}</strong><small>${esc(t("imageHint", "JPG, PNG or WEBP, up to 5 MB"))}</small><input type="file" data-recipe-image-file accept="image/jpeg,image/png,image/webp"></label>` : ""}
                <div class="nutrition-image-preview ${imageSource || imageMode === "local" && d.imageMeta ? "has-image" : ""}">${imageSource ? `<img src="${esc(imageSource)}" data-image-fallback alt=""><span>${esc(t("noImage", "No image"))}</span>` : imageMode === "local" && d.id ? `<img data-recipe-image-id="${esc(d.id)}" data-recipe-image-size="preview" alt=""><span>${esc(t("noImage", "No image"))}</span>` : `${window.MentorNutritionIcons.icon("image")}<span>${esc(t("noImage", "No image"))}</span>`}</div>
                ${imageError(form)}
              </div>
            </fieldset>
            <fieldset>
              <legend>${esc(t("ingredients", "Ingredients"))}</legend>
              <div class="nutrition-planning-ingredients">
                ${d.ingredients.map((item, index) => `<div class="nutrition-planning-ingredient">
                  <select data-recipe-ingredient-field="foodId" data-index="${index}">
                    <option value="">&mdash;</option>
                    ${foods.map((food) => option(food.id, foodName(food), item.foodId)).join("")}
                  </select>
                  <input type="number" min="0" step="any" data-recipe-ingredient-field="quantity" data-index="${index}" value="${esc(item.quantity)}">
                  <select data-recipe-ingredient-field="unit" data-index="${index}">
                    ${window.MentorInventoryService.ALLOWED_UNITS.map((unit) => option(unit, window.MentorInventoryService.ALLOWED_PACKAGE_TYPES.includes(unit) ? components().t(`inventory.packageTypes.${unit}`, unit) : unit, item.unit)).join("")}
                  </select>
                  <button type="button" class="nutrition-icon-btn" data-action="recipe-ingredient-remove" data-index="${index}" aria-label="${esc(t("remove", "Remove"))}">${window.MentorNutritionIcons.icon("trash")}</button>
                </div>`).join("")}
              </div>
              <button type="button" class="nutrition-btn" data-action="recipe-ingredient-add">${esc(t("addIngredient", "Add ingredient"))}</button>
            </fieldset>
          </div>
          <footer class="nutrition-inventory-form-actions">
            <button type="button" class="nutrition-btn" data-action="recipe-form-cancel">${esc(t("cancel", "Cancel"))}</button>
            <button type="submit" class="nutrition-btn nutrition-btn-primary" data-action="recipe-form-save">${esc(t("saveRecipe", "Save recipe"))}</button>
          </footer>
        </form>
      </section>`;
  }

  function openMeal(state, id, defaults = {}) {
    const entry = id ? window.MentorPlanningRepository.getMealPlanEntryById(id) : null;
    state.mealPlanForm = {
      originalId: entry?.id || null,
      copySourceId: entry ? null : defaults.copySourceId || null,
      draft: entry ? JSON.parse(JSON.stringify(entry)) : {
        recipeId: defaults.recipeId || "",
        plannedDate: defaults.plannedDate || new Date().toISOString().slice(0, 10),
        mealType: defaults.mealType || "breakfast",
        servings: defaults.servings || 1,
        status: "planned"
      },
      errors: [],
      copyError: null,
      saving: false
    };
    state.modal = { type: "meal-plan-form" };
  }

  function renderMeal(state) {
    const form = state.mealPlanForm;
    const d = form.draft;
    const recipes = window.MentorPlanningRepository.getRecipes();

    return `<div class="nutrition-modal-backdrop" data-action="meal-form-cancel"></div>
      <section class="nutrition-simple-dialog" role="dialog" aria-modal="true">
        <form data-meal-plan-form novalidate>
          <h2>${esc(t(form.originalId ? "editMeal" : "addMeal", "Add meal"))}</h2>
          ${form.copyError ? `<div class="nutrition-notice nutrition-notice-error">${esc(t("copyTargetRequired", "Choose a different date or meal type for the copy."))}</div>` : form.errors.length ? `<div class="nutrition-notice nutrition-notice-error">${esc(t("validation", "Check the form."))}</div>` : ""}
          <label class="nutrition-form-field"><span>${esc(t("chooseRecipe", "Choose a recipe"))}</span><select data-meal-field="recipeId"><option value="">&mdash;</option>${recipes.map((recipe) => option(recipe.id, recipe.name, d.recipeId)).join("")}</select></label>
          <label class="nutrition-form-field"><span>${esc(t("plannedDate", "Meal date"))}</span><input type="date" data-meal-field="plannedDate" value="${esc(d.plannedDate)}"></label>
          <label class="nutrition-form-field"><span>${esc(t("mealType", "Meal type"))}</span><select data-meal-field="mealType">${mealOptions(d.mealType)}</select></label>
          <label class="nutrition-form-field"><span>${esc(t("servings", "Servings"))}</span><input type="number" min="0" step="1" data-meal-field="servings" value="${esc(d.servings)}"></label>
          <div>
            <button type="button" class="nutrition-btn" data-action="meal-form-cancel">${esc(t("cancel", "Cancel"))}</button>
            <button type="submit" class="nutrition-btn nutrition-btn-primary" data-action="meal-form-save">${esc(t("saveMeal", "Save meal"))}</button>
          </div>
        </form>
      </section>`;
  }

  window.MentorNutritionPlanningForms = { openRecipe, renderRecipe, openMeal, renderMeal };
})();
