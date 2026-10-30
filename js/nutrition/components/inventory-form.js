(function () {
  "use strict";
  const esc = (value) => window.MentorNutritionComponents.esc(value);
  const t = (key, fallback, params) => window.MentorNutritionComponents.t(`inventory.${key}`, fallback, params);
  const foodName = (food, lang = window.MentorI18n?.getLanguage?.() || "sr") => {
    const language = lang || window.MentorI18n?.getLanguage?.() || "sr";
    return food?.names?.[language] || (food?.nameKey ? window.MentorI18n?.t(food.nameKey, food.defaultName) : "") || food?.defaultName || t("orphan", "Unlinked food");
  };
  const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
  const categoryName = (id) => id ? window.MentorNutritionComponents.t(`foodCategories.${id}`, id) : "";
  const foodSearchText = (food) => [foodName(food), foodName(food, "en"), food.defaultName, food.slug, food.categoryId, categoryName(food.categoryId), ...(food.tags || [])].join(" ");
  const option = (value, label, current) => `<option value="${esc(value)}" ${String(value) === String(current) ? "selected" : ""}>${esc(label)}</option>`;
  const input = (field, value, type = "text", extra = "") => {
    const numeric = type === "number";
    return `<input type="${numeric ? "text" : type}" ${numeric ? 'inputmode="decimal"' : ""} data-inventory-field="${esc(field)}" value="${esc(value ?? "")}" ${extra}>`;
  };
  const dateControl = (field, value, extra = "") => `<div class="nutrition-date-control">${input(field, value, "date", extra)}<button class="nutrition-icon-btn" type="button" data-inventory-date-picker="${esc(field)}" aria-label="${esc(t("form.openDatePicker", "Open calendar"))}">${window.MentorNutritionIcons.icon("calendar")}</button></div>`;
  const label = (text, control, field) => `<label class="nutrition-form-field"><span ${field ? `data-inventory-label="${esc(field)}"` : ""}>${esc(text)}</span>${control}${field ? `<small class="nutrition-field-error" data-inventory-error="${esc(field)}"></small>` : ""}</label>`;
  const todayKey = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  function quantityLabel(unit) {
    if (unit === "g") return t("formQuantity.grams", "Weight / grams (g)");
    if (unit === "kg") return t("formQuantity.kilograms", "Weight (kg)");
    if (unit === "ml") return t("formQuantity.milliliters", "Volume (ml)");
    if (unit === "l") return t("formQuantity.liters", "Volume (l)");
    if (unit === "kom") return t("formQuantity.pieces", "Quantity / pieces");
    if (window.MentorInventoryService.ALLOWED_PACKAGE_TYPES.includes(unit)) return t("formQuantity.packages", "Package count");
    return t("formQuantity.generic", "Quantity ({{unit}})", { unit: unit || "" });
  }

  function blank(foodId) {
    const defaults = window.MentorInventoryService.getDefaultsForFood(foodId);
    const today = todayKey();
    return {
      foodId: foodId || "", locationId: defaults.locationId, quantity: "", unit: defaults.unit,
      packageCount: "", packageSize: "", packageUnit: defaults.unit, packageType: "package",
      purchaseDate: today, addedAt: today, expiryDate: "", openedDate: "",
      storageState: "", sourceType: "", storeId: "", storeName: "", totalPrice: "", currency: "EUR", note: "", status: "available"
    };
  }

  function fromBatch(batch) {
    return { ...blank(batch.foodId), ...batch, addedAt: String(batch.addedAt || "").slice(0, 10), purchaseDate: String(batch.purchaseDate || "").slice(0, 10), expiryDate: String(batch.expiryDate || "").slice(0, 10), openedDate: String(batch.openedDate || "").slice(0, 10), packageCount: batch.packageCount ?? "", packageSize: batch.packageSize ?? "", totalPrice: batch.totalPrice ?? "" };
  }

  function open(state, id, foodId) {
    const batch = id ? window.MentorInventoryRepository.getBatchById(id) : null;
    state.inventoryForm = { mode: batch ? "edit" : "create", originalId: batch?.id || null, draft: batch ? fromBatch(batch) : blank(foodId), errors: [], saving: false, intent: "close" };
    state.inventoryFoodSearch = "";
    state.inventoryMoreOpen = false;
    state.modal = { type: "inventory-form" };
  }

  function searchFoods(search) {
    const needle = normalize(search).trim();
    const allFoods = window.MentorFoodRepository.getAll().filter((food) => food.status !== "archived").sort((a, b) => foodName(a).localeCompare(foodName(b)));
    return needle ? allFoods.filter((food) => normalize(foodSearchText(food)).includes(needle)) : allFoods;
  }

  function render(state) {
    const form = state.inventoryForm, draft = form.draft;
    const allFoods = window.MentorFoodRepository.getAll().filter((food) => food.status !== "archived").sort((a, b) => foodName(a).localeCompare(foodName(b)));
    const activeSearch = String(state.inventoryFoodSearch || "").trim();
    let foods = activeSearch ? searchFoods(activeSearch) : allFoods;
    const selectedFood = draft.foodId ? allFoods.find((food) => food.id === draft.foodId) : null;
    if (!activeSearch && selectedFood && !foods.some((food) => food.id === selectedFood.id)) foods = [selectedFood, ...foods];
    const foodSelectSize = activeSearch ? Math.min(Math.max(foods.length + 1, 2), 6) : null;
    const locations = window.MentorInventoryRepository.getLocations();
    const unitLabel = (unit) => window.MentorInventoryService.ALLOWED_PACKAGE_TYPES.includes(unit) ? t(`packageTypes.${unit}`, unit) : unit;
    const unitOptions = window.MentorInventoryService.ALLOWED_UNITS.map((unit) => option(unit, unitLabel(unit), draft.unit)).join("");
    const errorSummary = form.errors?.length ? `<div class="nutrition-notice nutrition-notice-error" role="alert">${esc(t("validation.saveFailed", "Saving failed."))}</div>` : "";
    return `<div class="nutrition-modal-backdrop" data-action="inventory-form-cancel"></div><section class="nutrition-inventory-dialog" role="dialog" aria-modal="true" aria-labelledby="inventory-form-title">
      <button type="button" class="nutrition-modal-x" data-action="inventory-form-cancel" aria-label="${esc(t("form.cancel", "Cancel"))}">${window.MentorNutritionIcons.icon("close")}</button>
      <form data-inventory-form novalidate><header><span>${esc(t("title", "Inventory"))}</span><h2 id="inventory-form-title">${esc(t(form.mode === "edit" ? "form.titleEdit" : "form.titleAdd", "Add to inventory"))}</h2></header>${errorSummary}
        <div class="nutrition-form-body nutrition-inventory-form-body">
          <fieldset><legend>${esc(t("form.foodSection", "Food"))}</legend>
            ${label(t("form.foodSearch", "Search foods"), `<input type="search" data-inventory-food-search value="${esc(state.inventoryFoodSearch || "")}" placeholder="${esc(t("form.foodSearch", "Search foods"))}">`)}
            ${label(t("food", "Food"), `<select data-inventory-field="foodId" ${foodSelectSize ? `class="nutrition-inventory-food-results" size="${foodSelectSize}"` : ""} required><option value="">${esc(t("form.chooseFood", "Choose a food"))}</option>${foods.map((food) => option(food.id, foodName(food), draft.foodId)).join("")}</select>`, "foodId")}
          </fieldset>
          <div class="nutrition-inventory-form-grid"><fieldset><legend>${esc(t("form.quantitySection", "Quantity"))}</legend>
            ${label(quantityLabel(draft.unit), input("quantity", draft.quantity, "number", 'min="0" step="any" required'), "quantity")}
            ${label(t("form.unit", "Unit"), `<select data-inventory-field="unit">${unitOptions}</select>`, "unit")}
          </fieldset><fieldset><legend>${esc(t("form.storageSection", "Storage"))}</legend>
            ${label(t("location", "Location"), `<select data-inventory-field="locationId" required>${locations.map((location) => option(location.id, location.builtInKey ? t(`locations.${location.builtInKey}`, location.name) : location.name, draft.locationId)).join("")}<option value="__create__">${esc(t("createLocationOption", "+ Create new location"))}</option></select>`, "locationId")}
            ${label(t("form.storageState", "Storage state"), `<select data-inventory-field="storageState"><option value="">—</option>${["chilled","frozen","room"].map((value) => option(value, t(`storageStates.${value}`, value), draft.storageState)).join("")}</select>`)}
          </fieldset></div>
          <fieldset><legend>${esc(t("form.datesSection", "Dates"))}</legend><div class="nutrition-inventory-date-grid">
            ${label(t("purchaseDate", "Purchase date"), dateControl("purchaseDate", draft.purchaseDate), "purchaseDate")}
            ${label(t("addedAt", "Date added"), dateControl("addedAt", draft.addedAt, "required"), "addedAt")}
            ${label(t("expiryDate", "Expiry date"), dateControl("expiryDate", draft.expiryDate), "expiryDate")}
          </div></fieldset>
          <details class="nutrition-inventory-more" ${state.inventoryMoreOpen ? "open" : ""}><summary>${esc(t("form.more", "More details"))}</summary>
            <div class="nutrition-inventory-detail-grid">
              ${label(t("openedDate", "Opened date"), dateControl("openedDate", draft.openedDate), "openedDate")}
              ${label(t("form.sourceType", "Source"), `<select data-inventory-field="sourceType"><option value="">—</option>${["store","home","gift","other"].map((value) => option(value, t(`sourceTypes.${value}`, value), draft.sourceType)).join("")}</select>`)}
              ${label(t("form.storeName", "Store name"), input("storeName", draft.storeName))}
              ${label(t("form.totalPrice", "Total price"), input("totalPrice", draft.totalPrice, "number", 'min="0" step="0.01"'), "totalPrice")}
              ${label(t("form.currency", "Currency"), `<select data-inventory-field="currency">${["EUR","USD","GBP","RSD"].map((value) => option(value, value, draft.currency)).join("")}</select>`)}
            </div>${label(t("form.note", "Note"), `<textarea data-inventory-field="note" rows="3">${esc(draft.note || "")}</textarea>`)}
          </details>
        </div><footer class="nutrition-inventory-form-actions"><button class="nutrition-btn" type="button" data-action="inventory-form-cancel">${esc(t("form.cancel", "Cancel"))}</button>${form.mode === "create" ? `<button class="nutrition-btn" type="submit" data-inventory-intent="add-another" ${form.saving ? "disabled" : ""}>${esc(t("form.saveAdd", "Save and add another"))}</button>` : ""}<button class="nutrition-btn nutrition-btn-primary" type="submit" data-inventory-intent="close" ${form.saving ? "disabled" : ""}>${esc(form.saving ? t("form.saving", "Saving…") : t(form.mode === "edit" ? "form.save" : "form.submit", "Save"))}</button></footer>
      </form></section>`;
  }

  function renderLocation(state) {
    const error = state.inventoryLocationDraft?.error ? `<div class="nutrition-notice nutrition-notice-error" role="alert">${esc(t("validation.required", "This field is required."))}</div>` : "";
    return `<div class="nutrition-modal-backdrop" data-action="inventory-location-cancel"></div><section class="nutrition-simple-dialog" role="dialog" aria-modal="true"><form data-inventory-location-form novalidate><h2>${esc(t("locationForm.title", "New location"))}</h2>${error}${label(t("locationForm.name", "Location name"), `<input name="name" required maxlength="80" value="${esc(state.inventoryLocationDraft?.name || "")}">`, "name")}${label(t("locationForm.icon", "Icon"), `<select name="icon">${["box","fridge","snowflake"].map((value)=>option(value,value,state.inventoryLocationDraft?.icon || "box")).join("")}</select>`)}<div><button class="nutrition-btn" type="button" data-action="inventory-location-cancel">${esc(t("form.cancel", "Cancel"))}</button><button class="nutrition-btn nutrition-btn-primary" type="submit">${esc(t("locationForm.submit", "Create location"))}</button></div></form></section>`;
  }

  function renderAction(state) {
    const modal = state.modal, batch = window.MentorInventoryRepository.getBatchById(modal.id), locations = window.MentorInventoryRepository.getLocations();
    const title = t(`actionForm.title${modal.action === "consume" ? "Consume" : modal.action === "restock" ? "Restock" : "Move"}`, "Update inventory");
    const control = modal.action === "move" ? label(t("location", "Location"), `<select name="locationId">${locations.map((location) => option(location.id, location.builtInKey ? t(`locations.${location.builtInKey}`, location.name) : location.name, batch?.locationId)).join("")}</select>`) : `${label(t("actionForm.amount", "Quantity"), `<input name="amount" type="text" inputmode="decimal" min="0" step="any" required>`, "amount")}${label(t("form.unit", "Unit"), `<select name="unit">${window.MentorInventoryService.ALLOWED_UNITS.map((unit) => option(unit, window.MentorInventoryService.ALLOWED_PACKAGE_TYPES.includes(unit) ? t(`packageTypes.${unit}`, unit) : unit, batch?.unit)).join("")}</select>`)}`;
    const notice = state.notice?.type === "error" ? `<div class="nutrition-notice nutrition-notice-error" role="alert">${esc(state.notice.text)}</div>` : "";
    return `<div class="nutrition-modal-backdrop" data-action="inventory-action-cancel"></div><section class="nutrition-simple-dialog" role="dialog" aria-modal="true"><form data-inventory-action-form novalidate><h2>${esc(title)}</h2>${notice}${control}<div><button class="nutrition-btn" type="button" data-action="inventory-action-cancel">${esc(t("form.cancel", "Cancel"))}</button><button class="nutrition-btn nutrition-btn-primary" type="submit">${esc(t("actionForm.confirm", "Confirm"))}</button></div></form></section>`;
  }

  window.MentorNutritionInventoryFormUI = { open, blank, render, renderLocation, renderAction, foodName, searchFoods, quantityLabel };
})();
