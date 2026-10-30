(function () {
  "use strict";
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const C = {
    esc,
    t: (key, fallback, params) => window.MentorI18n?.t(`nutrition.${key}`, params, fallback) || fallback,
    panel: (title, body, extra = "") => `<section class="nutrition-panel ${extra}"><div class="nutrition-panel-head"><h2>${esc(title)}</h2></div>${body}</section>`,
    badge: (text) => `<span class="nutrition-badge">${esc(text)}</span>`,
    progress: (label, value, target, unit = "") => { const percent = Math.min(100, Math.round(value / Math.max(target, 1) * 100)); return `<div class="nutrition-progress"><div><span>${esc(label)}</span><strong>${esc(value)}${esc(unit)} / ${esc(target)}${esc(unit)} <small>${percent}%</small></strong></div><div class="nutrition-progress-track"><i style="width:${percent}%"></i></div></div>`; },
    summary: (label, value, tone = "green") => `<article class="nutrition-summary nutrition-summary-${tone}"><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`,
    button: (label, action, variant = "secondary") => `<button class="nutrition-btn nutrition-btn-${variant}" type="button" data-action="${esc(action)}">${esc(label)}</button>`,
    filters: (placeholder, selects, actionLabel, state) => `<div class="nutrition-filters"><label class="nutrition-search"><span>⌕</span><input type="search" data-filter="search" value="${esc(state?.search || "")}" placeholder="${esc(placeholder)}"></label>${selects.map((label,i)=>`<label><span class="sr-only">${esc(label)}</span><select data-filter="select-${i}"><option value="">${esc(label)}</option><option value="all">${C.t("all","Sve")}</option><option value="active">Aktivno</option></select></label>`).join("")}${C.button(actionLabel,"placeholder","primary")}</div>`,
    actions: (items) => `<div class="nutrition-action-grid">${items.map((item)=>`<button type="button" data-action="placeholder"><span>＋</span><strong>${esc(item)}</strong></button>`).join("")}</div>`,
    emptyChart: (type = "line") => type === "donut" ? `<div class="nutrition-donut"><span>42<small>%</small></span></div>` : `<div class="nutrition-chart" aria-label="Placeholder chart"><svg viewBox="0 0 500 140" role="img"><path d="M5 112 C70 92 92 105 145 65 S245 90 290 48 S390 62 495 18"/><path class="goal" d="M5 55H495"/></svg><div><span>Pon</span><span>Uto</span><span>Sre</span><span>Čet</span><span>Pet</span><span>Sub</span><span>Ned</span></div></div>`,
    foodIcon: (name) => `<span class="nutrition-food-icon" aria-hidden="true">${esc(String(name).slice(0,1))}</span>`
  };
  window.MentorNutritionComponents = C;
})();

(function () {
  "use strict";
  const NUTRITION_ASSET_VERSION = "20261029-plan-shopping-01";
  const root = document.getElementById("nutritionView");
  const tabs = ["overview","foods","fridge","recipes","plan","statistics"];
  const state = window.MentorNutritionStorage.createState();
  let favoriteSavePending = false;
  const C = window.MentorNutritionComponents;
  const t = (key, fallback, params) => C.t(key, fallback, params);
  const FOOD_FILTER_DEFAULTS = { foodCategory: "", foodUnit: "", foodOrigin: "", foodSort: "nameAsc" };
  let imageRenderToken = 0;
  let searchRenderTimer = null;
  let foodSelectInteractionTimer = null;
  let isFoodSelectInteracting = false;
  let recipeFilterClickHandled = false;
  let hasRendered = false;
  const SCROLL_RESTORE_SELECTORS = [
    ".nutrition-content",
    ".nutrition-modal.open",
    ".nutrition-form-body",
    ".nutrition-food-table",
    ".nutrition-food-detail-scroll",
    ".nutrition-food-categories",
    ".nutrition-inventory-locations",
    ".nutrition-inventory-expiring-list",
    ".nutrition-table-wrap",
    ".nutrition-plan-wrap",
    ".nutrition-tabs",
    ".nutrition-form-tabs",
    ".nutrition-periods"
  ];

  function clearSearchRenderTimer() {
    window.clearTimeout(searchRenderTimer);
    searchRenderTimer = null;
  }

  function scheduleSearchRender() {
    clearSearchRenderTimer();
    searchRenderTimer = window.setTimeout(() => {
      searchRenderTimer = null;
      refreshFoodResults();
    }, 180);
  }

  function isFoodFilterSelect(target) {
    return Boolean(target?.closest?.('[data-food-filters] select[data-filter]'));
  }

  function isFoodFormSelect(target) {
    return Boolean(target?.closest?.(".nutrition-food-form-dialog select"));
  }

  function isInventoryFilterSelect(target) {
    return Boolean(target?.closest?.(".nutrition-inventory-filters select[data-inventory-filter]"));
  }

  function isInventoryFormSelect(target) {
    const select = target?.closest?.("select");
    return Boolean(select?.closest?.("[data-inventory-form], [data-inventory-location-form], [data-inventory-action-form]"));
  }

  function isRecipeFilterSelect(target) {
    return Boolean(target?.closest?.("[data-recipe-filter-system] [data-recipe-search], [data-recipe-filter-system] [data-recipe-filter-option], [data-recipe-filter-system] .nutrition-recipe-filter-option, [data-recipe-filter-system] .nutrition-recipe-filter-trigger, [data-recipe-filter-system] .nutrition-recipe-filter-chip, [data-recipe-filter-system] .nutrition-recipe-filter-reset"));
  }

  function isPlanningFormSelect(target) {
    const select = target?.closest?.("select");
    return Boolean(select?.closest?.("[data-recipe-form], [data-meal-plan-form]"));
  }

  function isNutritionLockedSelect(target) {
    return isFoodFilterSelect(target) || isFoodFormSelect(target) || isInventoryFilterSelect(target) || isInventoryFormSelect(target) || isRecipeFilterSelect(target) || isPlanningFormSelect(target);
  }

  function markFoodSelectInteraction() {
    isFoodSelectInteracting = true;
    window.clearTimeout(foodSelectInteractionTimer);
    foodSelectInteractionTimer = window.setTimeout(() => { isFoodSelectInteracting = false; }, 4500);
  }

  function releaseFoodSelectInteraction() {
    window.clearTimeout(foodSelectInteractionTimer);
    foodSelectInteractionTimer = null;
    isFoodSelectInteracting = false;
  }

  function shouldDeferRenderForSelect() {
    if (!isFoodSelectInteracting) return false;
    return state.activeTab === "foods" || state.activeTab === "fridge" || state.activeTab === "recipes" || state.activeTab === "plan" || ["inventory-form","inventory-location","inventory-action","recipe-form","meal-plan-form"].includes(state.modal?.type);
  }

  function captureNutritionScroll(scope = root) {
    if (!scope) return [];
    return SCROLL_RESTORE_SELECTORS.flatMap((selector) => [...scope.querySelectorAll(selector)].map((node, index) => ({
      selector,
      index,
      top: node.scrollTop,
      left: node.scrollLeft
    }))).filter((item) => item.top || item.left);
  }

  function restoreNutritionScroll(snapshot, scope = root) {
    if (!scope || !snapshot?.length) return;
    snapshot.forEach(({ selector, index, top, left }) => {
      const node = scope.querySelectorAll(selector)[index];
      if (!node) return;
      node.scrollTop = top;
      node.scrollLeft = left;
    });
  }

  function selectorValue(value) {
    return String(value ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  function activeElementSelector(element) {
    if (!element) return null;
    if (element.dataset?.inventoryField) return `[data-inventory-field="${selectorValue(element.dataset.inventoryField)}"]`;
    if (element.matches?.("[data-inventory-food-search]")) return "[data-inventory-food-search]";
    if (element.matches?.("[data-recipe-search]")) return "[data-recipe-search]";
    if (element.matches?.("[data-recipe-metadata-minutes]")) return "[data-recipe-metadata-minutes]";
    if (element.dataset?.foodField) return `[data-food-field="${selectorValue(element.dataset.foodField)}"]`;
    if (element.dataset?.recipeField) return `[data-recipe-field="${selectorValue(element.dataset.recipeField)}"]`;
    if (element.dataset?.recipeIngredientField) return `[data-recipe-ingredient-field="${selectorValue(element.dataset.recipeIngredientField)}"][data-index="${selectorValue(element.dataset.index)}"]`;
    if (element.dataset?.mealField) return `[data-meal-field="${selectorValue(element.dataset.mealField)}"]`;
    if (element.name && element.closest?.("[data-inventory-location-form], [data-inventory-action-form]")) return `[name="${selectorValue(element.name)}"]`;
    return null;
  }

  function openNativePicker(control) {
    if (!control) return false;
    control.focus?.({ preventScroll: true });
    if (typeof control.showPicker === "function") {
      try { control.showPicker(); return true; }
      catch (_) { /* Fall back to a trusted click for older or restricted browsers. */ }
    }
    try { control.click?.(); return true; }
    catch (_) { return false; }
  }

  function focusCurrentPlanSelection() {
    if (state.activeTab !== "plan" || !root) return;
    const mealId = state.selectedMealPlanEntry ? selectorValue(state.selectedMealPlanEntry) : null;
    const meal = mealId ? root.querySelector(`.nutrition-plan-meal[data-id="${mealId}"]`) : null;
    const day = root.querySelector(`.nutrition-plan-day-head[data-day="${selectorValue(state.selectedDay)}"]`);
    const target = meal || day;
    if (!target) return;
    target.scrollIntoView?.({ block:"nearest", inline:"center" });
    target.focus?.({ preventScroll:true });
  }

  function recipeServingsForPlan(recipe) {
    const base = Math.max(1, Number(recipe?.servings || 1));
    const selected = Number(state.recipeServings?.[recipe?.id]);
    return Number.isFinite(selected) && selected > 0 ? selected : base;
  }

  function firstMealPlanEntryForDate(dateKey) {
    const order = ["breakfast", "lunch", "dinner", "snack"];
    return window.MentorPlanningRepository.getMealPlanEntries()
      .filter((entry) => entry.plannedDate === dateKey)
      .sort((a, b) => order.indexOf(a.mealType) - order.indexOf(b.mealType) || String(a.createdAt || a.id).localeCompare(String(b.createdAt || b.id)))[0] || null;
  }

  function normalizeFoodFilters() {
    state.filters = { ...FOOD_FILTER_DEFAULTS, ...(state.filters || {}) };
    return state.filters;
  }

  function foodFiltersHost() {
    return root?.querySelector("[data-food-filters]");
  }

  function syncFoodFilterControls() {
    if (state.activeTab !== "foods" || !root) return;
    const host = foodFiltersHost();
    if (!host) return;
    const filters = normalizeFoodFilters();
    const search = host.querySelector('[data-filter="search"]');
    if (search && search.value !== (state.search || "")) search.value = state.search || "";
    host.querySelectorAll("select[data-filter]").forEach((control) => {
      const key = control.dataset.filter;
      const value = filters[key] ?? "";
      if (control.value !== value) control.value = value;
    });
  }

  function refreshFoodFilters(options = {}) {
    if (state.activeTab !== "foods") return;
    normalizeFoodFilters();
    const host = foodFiltersHost();
    const renderFilters = window.MentorNutritionTabs?.foodFilters;
    if (host && options.render && typeof renderFilters === "function") host.outerHTML = renderFilters(state);
    syncFoodFilterControls();
  }

  function applyFoodFilters(update, options = {}) {
    const filters = normalizeFoodFilters();
    if (typeof update === "function") update(filters);
    refreshFoodFilters(options);
    refreshFoodResults();
  }

  function ensureStyle() {
    const href = `js/nutrition/nutrition.css?v=${NUTRITION_ASSET_VERSION}`;
    const existing = document.querySelector('link[data-nutrition-style]');
    if (existing) { if (existing.getAttribute("href") !== href) existing.href = href; return; }
    const link = document.createElement("link"); link.rel = "stylesheet"; link.href = href; link.dataset.nutritionStyle = ""; document.head.appendChild(link);
  }

  function placeholderModal(modal) {
    const config = modal?.kind === "import" ? ["placeholders.importTitle", "Import foods", "placeholders.importText", "Choose a CSV or JSON file."] : modal?.kind === "recipe" ? ["placeholders.recipeTitle", "Create from recipe", "placeholders.recipeText", "This flow is ready to be connected."] : modal?.kind === "fridge" ? ["placeholders.fridgeTitle", "Connect to fridge", "placeholders.fridgeText", "This flow is ready to be connected."] : ["add", "Nutrition", "placeholder", "This action is ready to be connected."];
    const file = modal?.kind === "import" ? `<label class="nutrition-upload-zone">${window.MentorNutritionIcons.icon("upload")}<strong>${C.esc(t("foodsUi.fileTypes", "CSV / JSON"))}</strong><input type="file" accept=".csv,application/json,text/csv"></label>` : "";
    return `<div class="nutrition-modal-backdrop" data-action="modal-close"></div><section class="nutrition-simple-dialog" role="dialog" aria-modal="true"><button type="button" class="nutrition-modal-x" data-action="modal-close">${window.MentorNutritionIcons.icon("close")}</button><h2>${C.esc(t(config[0], config[1]))}</h2><p>${C.esc(t(config[2], config[3]))}</p>${file}<div><button class="nutrition-btn nutrition-btn-primary" type="button" data-action="modal-close">${C.esc(t("close", "Close"))}</button></div></section>`;
  }

  function confirmModal(modal) {
    const archive = modal.action === "archive";
    return `<div class="nutrition-modal-backdrop" data-action="confirm-cancel"></div><section class="nutrition-confirm-dialog" role="alertdialog" aria-modal="true"><h2>${C.esc(t(`confirm.${archive ? "archiveTitle" : "deleteTitle"}`, "Confirm"))}</h2><p>${C.esc(t(`confirm.${archive ? "archiveText" : "deleteText"}`, "Are you sure?"))}</p><div><button class="nutrition-btn" type="button" data-action="confirm-cancel">${C.esc(t("foodForm.actions.cancel", "Cancel"))}</button><button class="nutrition-btn ${archive ? "nutrition-btn-warning" : "nutrition-btn-danger"}" type="button" data-action="confirm-food-action">${C.esc(t("confirm.confirm", "Confirm"))}</button></div></section>`;
  }

  function inventoryConfirmModal() {
    return `<div class="nutrition-modal-backdrop" data-action="inventory-confirm-cancel"></div><section class="nutrition-confirm-dialog" role="alertdialog" aria-modal="true"><h2>${C.esc(t("inventory.confirm.title", "Remove item?"))}</h2><p>${C.esc(t("inventory.confirm.text", "The item will be removed."))}</p><div><button class="nutrition-btn" type="button" data-action="inventory-confirm-cancel">${C.esc(t("inventory.form.cancel", "Cancel"))}</button><button class="nutrition-btn nutrition-btn-danger" type="button" data-action="inventory-confirm-remove">${C.esc(t("inventory.confirm.confirm", "Remove"))}</button></div></section>`;
  }

  const shoppingKey = (row) => `${row.foodId}::${row.unit}`;
  const parseDecimal = (value) => String(value ?? "").trim().replace(",", ".");

  function planWeekDateKeys() {
    const monday = new Date();
    monday.setHours(12, 0, 0, 0);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + Number(state.weekOffset || 0) * 7);
    return Array.from({ length:7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    });
  }

  function shoppingRowsForWeek() {
    const dateKeys = planWeekDateKeys(), dateSet = new Set(dateKeys);
    const recipes = window.MentorPlanningRepository.getRecipes();
    const entries = window.MentorPlanningRepository.getMealPlanEntries().filter((entry) => dateSet.has(entry.plannedDate));
    return window.MentorMealPlanSelectors.missingIngredients(entries, window.MentorInventoryRepository.getAllocations(), { recipes });
  }

  function shoppingPurchaseHistory(row) {
    const batches = window.MentorInventoryService.getBatchesForFood(row.foodId)
      .filter((batch) => batch.storeName || (batch.totalPrice !== null && batch.totalPrice !== undefined && String(batch.totalPrice).trim() !== ""))
      .sort((a, b) => String(b.purchaseDate || b.addedAt || b.createdAt || "").localeCompare(String(a.purchaseDate || a.addedAt || a.createdAt || "")));
    const batch = batches[0] || null;
    if (!batch) return null;
    let estimatedPrice = "";
    const hasSavedPrice = batch.totalPrice !== null && batch.totalPrice !== undefined && String(batch.totalPrice).trim() !== "";
    const price = Number(batch.totalPrice), initialQuantity = Number(batch.initialQuantity);
    if (hasSavedPrice && Number.isFinite(price) && price >= 0 && initialQuantity > 0) {
      try {
        const food = window.MentorInventoryService.getFood(row.foodId);
        const quantityInBatchUnit = window.MentorNutritionUnitConversion.convertForFood(Number(row.missing), row.unit, batch.unit, food);
        estimatedPrice = String(Math.round((price * quantityInBatchUnit / initialQuantity + Number.EPSILON) * 100) / 100);
      } catch (_) { /* A price is not shown when saved units cannot be compared safely. */ }
    }
    return {
      storeName: batch.storeName || "",
      estimatedPrice,
      currency: batch.currency || "EUR"
    };
  }

  function shoppingDraft(row) {
    state.shoppingDrafts = state.shoppingDrafts || {};
    const key = shoppingKey(row);
    if (!state.shoppingDrafts[key]) {
      const history = shoppingPurchaseHistory(row);
      state.shoppingDrafts[key] = {
        quantity: row.missing,
        baseMissing: row.missing,
        totalPrice: history?.estimatedPrice || "",
        storeName: history?.storeName || "",
        currency: history?.currency || "EUR"
      };
    }
    const draft = state.shoppingDrafts[key];
    if (draft.baseMissing != null && Number(draft.baseMissing) !== Number(row.missing)) {
      if (Number(draft.quantity) === Number(draft.baseMissing)) draft.quantity = row.missing;
      draft.baseMissing = row.missing;
    }
    return draft;
  }

  function hasFoodImage(food) {
    const image = food?.image || {};
    return Boolean((image.imageType === "url" && image.imageUrl) || (image.imageType === "local" && food?.id));
  }

  function foodImage(food, size = "thumb") {
    const image = food?.image || {};
    const name = food ? window.MentorNutritionInventoryFormUI.foodName(food) : t("inventory.orphan", "Unlinked food");
    const src = image.imageType === "url" && image.imageUrl
      ? `src="${C.esc(image.imageUrl)}" data-image-fallback`
      : image.imageType === "local" && food?.id
        ? `data-food-image-id="${C.esc(food.id)}" data-food-image-size="${C.esc(size)}"`
        : "";
    return `<span class="nutrition-food-photo nutrition-food-photo-${size}">${src ? `<img ${src} loading="lazy" decoding="async" alt="">` : ""}<b>${C.esc(name.slice(0, 1).toUpperCase())}</b></span>`;
  }

  function shoppingExportRows() {
    return shoppingRowsForWeek().map((row) => {
      const food = window.MentorInventoryService.getFood(row.foodId), draft = shoppingDraft(row);
      return {
        key: shoppingKey(row),
        foodId: row.foodId,
        name: food ? window.MentorNutritionInventoryFormUI.foodName(food) : t("inventory.orphan", "Unlinked food"),
        unit: row.unit,
        missing: row.missing,
        quantity: draft.quantity ?? row.missing,
        totalPrice: draft.totalPrice,
        storeName: draft.storeName,
        currency: draft.currency || "EUR"
      };
    });
  }

  function shoppingFileName(extension) {
    const dateKeys = planWeekDateKeys();
    return `lista-namirnica-${dateKeys[0]}-${dateKeys[6]}.${extension}`;
  }

  function exportShoppingPdf() {
    const rows = shoppingExportRows(), dateKeys = planWeekDateKeys(), rangeLabel = `${dateKeys[0]} - ${dateKeys[6]}`;
    if (!rows.length) { state.shoppingError = t("planning.shoppingExportEmpty", "Shopping list is empty."); render(); return; }
    const popup = window.open("", "_blank", "width=860,height=900");
    if (!popup) { state.shoppingError = t("planning.shoppingExportBlocked", "The browser blocked the export window."); render(); return; }
    const table = rows.map((row) => `<tr><td>${C.esc(row.name)}</td><td>${C.esc(`${row.quantity} ${row.unit}`)}</td><td>${C.esc(row.totalPrice ? `${row.totalPrice} ${row.currency}` : "-")}</td><td>${C.esc(row.storeName || "-")}</td></tr>`).join("");
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${C.esc(t("planning.shoppingListTitle", "Shopping list"))}</title><style>
      body{font-family:Arial,sans-serif;margin:32px;color:#302b25}h1{margin:0 0 4px;font-size:24px}p{margin:0 0 20px;color:#66715f}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #e1ded6;padding:10px 8px;text-align:left;font-size:13px}th{background:#f5f7f1;color:#4d6747;font-size:11px;text-transform:uppercase}.meta{display:flex;justify-content:space-between;gap:16px;margin-bottom:18px}.badge{border:1px solid #dce5d8;border-radius:999px;padding:5px 10px;color:#4d6747;font-size:12px}@media print{body{margin:18mm}.no-print{display:none}}
    </style></head><body><div class="meta"><div><h1>${C.esc(t("planning.shoppingListTitle", "Shopping list"))}</h1><p>${C.esc(rangeLabel)}</p></div><span class="badge">${C.esc(t("planning.openShoppingList", "Shopping list"))}</span></div><table><thead><tr><th>${C.esc(t("inventory.food", "Food"))}</th><th>${C.esc(t("planning.shoppingQuantity", "Qty"))}</th><th>${C.esc(t("planning.shoppingPrice", "Price"))}</th><th>${C.esc(t("planning.shoppingStore", "Store"))}</th></tr></thead><tbody>${table}</tbody></table><script>setTimeout(()=>{window.focus();window.print();},250);<\/script></body></html>`);
    popup.document.close();
  }

  function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    let line = "", lines = [];
    words.forEach((word) => {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && line) { lines.push(line); line = word; }
      else line = next;
    });
    if (line) lines.push(line);
    lines.slice(0, maxLines).forEach((item, index) => ctx.fillText(index === maxLines - 1 && lines.length > maxLines ? `${item}...` : item, x, y + index * lineHeight));
    return Math.min(lines.length, maxLines) * lineHeight;
  }

  function exportShoppingImage() {
    const rows = shoppingExportRows(), dateKeys = planWeekDateKeys(), rangeLabel = `${dateKeys[0]} - ${dateKeys[6]}`;
    if (!rows.length) { state.shoppingError = t("planning.shoppingExportEmpty", "Shopping list is empty."); render(); return; }
    const width = 1080, header = 132, rowHeight = 82, height = header + rows.length * rowHeight + 36, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
    canvas.width = width * dpr; canvas.height = height * dpr; ctx.scale(dpr, dpr);
    ctx.fillStyle = "#fffdf8"; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#4d6747"; ctx.font = "700 30px Arial"; ctx.fillText(t("planning.shoppingListTitle", "Shopping list"), 42, 52);
    ctx.fillStyle = "#6f7669"; ctx.font = "16px Arial"; ctx.fillText(rangeLabel, 42, 82);
    ctx.fillStyle = "#e8efe3"; ctx.fillRect(42, 105, width - 84, 1);
    rows.forEach((row, index) => {
      const y = header + index * rowHeight;
      ctx.fillStyle = index % 2 ? "#fbfaf5" : "#ffffff"; ctx.fillRect(32, y - 14, width - 64, rowHeight - 8);
      ctx.strokeStyle = "#e1ded6"; ctx.strokeRect(32, y - 14, width - 64, rowHeight - 8);
      ctx.fillStyle = "#e7efe1"; ctx.beginPath(); ctx.arc(70, y + 20, 24, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#4d6747"; ctx.font = "700 22px Arial"; ctx.textAlign = "center"; ctx.fillText(row.name.slice(0, 1).toUpperCase(), 70, y + 28); ctx.textAlign = "left";
      ctx.fillStyle = "#302b25"; ctx.font = "700 18px Arial"; drawWrappedText(ctx, row.name, 112, y + 10, 360, 21, 2);
      ctx.fillStyle = "#6f7669"; ctx.font = "13px Arial"; ctx.fillText(`${t("planning.missing", "Missing")}: ${row.missing} ${row.unit}`, 112, y + 58);
      ctx.fillStyle = "#302b25"; ctx.font = "700 16px Arial"; ctx.fillText(`${row.quantity} ${row.unit}`, 525, y + 23);
      ctx.fillStyle = "#6f7669"; ctx.font = "12px Arial"; ctx.fillText(t("planning.shoppingQuantity", "Qty"), 525, y + 48);
      ctx.fillStyle = "#302b25"; ctx.font = "700 16px Arial"; ctx.fillText(row.totalPrice ? `${row.totalPrice} ${row.currency}` : "-", 675, y + 23);
      ctx.fillStyle = "#6f7669"; ctx.font = "12px Arial"; ctx.fillText(t("planning.shoppingPrice", "Price"), 675, y + 48);
      ctx.fillStyle = "#302b25"; ctx.font = "700 16px Arial"; drawWrappedText(ctx, row.storeName || "-", 820, y + 23, 190, 18, 2);
      ctx.fillStyle = "#6f7669"; ctx.font = "12px Arial"; ctx.fillText(t("planning.shoppingStore", "Store"), 820, y + 48);
    });
    canvas.toBlob((blob) => {
      if (!blob) return;
      const link = document.createElement("a"), url = URL.createObjectURL(blob);
      link.href = url; link.download = shoppingFileName("png"); link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }

  function renderShoppingModal() {
    const dateKeys = planWeekDateKeys(), rangeLabel = `${dateKeys[0]} - ${dateKeys[6]}`;
    const rows = shoppingExportRows();
    const empty = `<div class="nutrition-shopping-empty">${window.MentorNutritionIcons.icon("leaf")}<strong>${C.esc(t("planning.shoppingListEmpty", "All ingredients are covered."))}</strong></div>`;
    const error = state.shoppingError ? `<div class="nutrition-notice nutrition-notice-error">${C.esc(state.shoppingError)}</div>` : "";
    const items = rows.map((row) => {
      const food = window.MentorInventoryService.getFood(row.foodId), key = row.key;
      const hasImage = hasFoodImage(food);
      return `<article class="nutrition-shopping-row ${hasImage ? "has-image" : ""}" data-shopping-row="${C.esc(key)}">
        ${hasImage ? foodImage(food) : ""}
        <div class="nutrition-shopping-food"><strong>${C.esc(row.name)}</strong><small>${C.esc(`${t("planning.missing", "Missing")}: ${row.missing} ${row.unit}`)}</small></div>
        <div class="nutrition-shopping-fields">
          <label class="nutrition-shopping-quantity"><span>${C.esc(t("planning.shoppingQuantity", "Qty"))}</span><div><input type="text" inputmode="decimal" data-shopping-field="quantity" data-key="${C.esc(key)}" value="${C.esc(row.quantity)}"><b>${C.esc(row.unit)}</b></div></label>
          <div class="nutrition-shopping-fact"><span>${C.esc(t("planning.shoppingPrice", "Price"))}</span><strong>${C.esc(row.totalPrice ? `${row.totalPrice} ${row.currency}` : "—")}</strong></div>
          <div class="nutrition-shopping-fact"><span>${C.esc(t("planning.shoppingStore", "Store"))}</span><strong>${C.esc(row.storeName || "—")}</strong></div>
        </div>
        <button class="nutrition-btn nutrition-btn-primary" type="button" data-action="shopping-bought" data-key="${C.esc(key)}">${window.MentorNutritionIcons.icon("plus")}${C.esc(t("planning.shoppingBought", "Bought"))}</button>
      </article>`;
    }).join("");
    return `<div class="nutrition-modal-backdrop" data-action="shopping-close"></div><section class="nutrition-shopping-dialog" role="dialog" aria-modal="true" aria-labelledby="nutrition-shopping-title">
      <button type="button" class="nutrition-modal-x" data-action="shopping-close" aria-label="${C.esc(t("planning.cancel", "Cancel"))}">${window.MentorNutritionIcons.icon("close")}</button>
      <header><div><span>${C.esc(rangeLabel)}</span><h2 id="nutrition-shopping-title">${C.esc(t("planning.shoppingListTitle", "Shopping list"))}</h2></div><div class="nutrition-shopping-export-actions"><button class="nutrition-btn" type="button" data-action="shopping-export-pdf">${window.MentorNutritionIcons.icon("download")}${C.esc(t("planning.shoppingExportPdf", "PDF"))}</button><button class="nutrition-btn" type="button" data-action="shopping-export-image">${window.MentorNutritionIcons.icon("image")}${C.esc(t("planning.shoppingExportImage", "Image"))}</button></div></header>
      ${error}
      ${rows.length ? `<p class="nutrition-shopping-source-note">${window.MentorNutritionIcons.icon("basket")}${C.esc(t("planning.shoppingDataSource", "Price and store are suggested from the last purchase saved in Inventory, when available. Live store availability is not tracked."))}</p>` : ""}
      <div class="nutrition-shopping-list">${rows.length ? items : empty}</div>
    </section>`;
  }

  function renderModal() {
    if (!state.modal) return "";
    if (state.modal.type === "food-form") return window.MentorNutritionFoodFormUI.render(state);
    if (state.modal.type === "confirm-food") return confirmModal(state.modal);
    if (state.modal.type === "inventory-form") return window.MentorNutritionInventoryFormUI.render(state);
    if (state.modal.type === "inventory-location") return window.MentorNutritionInventoryFormUI.renderLocation(state);
    if (state.modal.type === "confirm-inventory-location") {
      const location = window.MentorInventoryRepository.getLocationById(state.modal.id);
      const name = location?.builtInKey ? t(`inventory.locations.${location.builtInKey}`, location.name) : location?.name || "";
      return `<div class="nutrition-modal-backdrop" data-action="inventory-location-delete-cancel"></div><section class="nutrition-confirm-dialog" role="alertdialog" aria-modal="true"><h2>${C.esc(t("inventory.locationPanel.remove", "Delete location"))}</h2><p>${C.esc(t("inventory.locationPanel.removeText", "Delete {{name}}? Move any items out first.", { name }))}</p><div><button class="nutrition-btn" type="button" data-action="inventory-location-delete-cancel" ${state.modal.saving ? "disabled" : ""}>${C.esc(t("inventory.form.cancel", "Cancel"))}</button><button class="nutrition-btn nutrition-btn-danger" type="button" data-action="inventory-location-delete-confirm" ${state.modal.saving ? "disabled" : ""}>${C.esc(t("inventory.remove", "Remove"))}</button></div></section>`;
    }
    if (state.modal.type === "inventory-action") return window.MentorNutritionInventoryFormUI.renderAction(state);
    if (state.modal.type === "confirm-inventory") return inventoryConfirmModal();
    if (state.modal.type === "recipe-form") return window.MentorNutritionPlanningForms.renderRecipe(state);
    if (state.modal.type === "meal-plan-form") return window.MentorNutritionPlanningForms.renderMeal(state);
    if (state.modal.type === "shopping-list") return renderShoppingModal();
    if (state.modal.type === "confirm-meal-remove") return `<div class="nutrition-modal-backdrop" data-action="meal-remove-cancel"></div><section class="nutrition-confirm-dialog" role="alertdialog" aria-modal="true"><h2>${C.esc(t("planning.removeMeal", "Remove meal?"))}</h2><div><button class="nutrition-btn" type="button" data-action="meal-remove-cancel">${C.esc(t("planning.cancel", "Cancel"))}</button><button class="nutrition-btn nutrition-btn-danger" type="button" data-action="meal-remove-confirm">${C.esc(t("planning.remove", "Remove"))}</button></div></section>`;
    return placeholderModal(state.modal);
  }

  async function hydrateImages() {
    const token = ++imageRenderToken;
    const nodes = [...root.querySelectorAll("img[data-food-image-id]")];
    await Promise.all(nodes.map(async (node) => {
      const url = await window.MentorData.repositories.media.resolveUrl(node.dataset.foodImageId, { storage: "indexeddb" }, node.dataset.foodImageSize === "thumb");
      if (token !== imageRenderToken || !node.isConnected || !url) return;
      node.src = url; node.dataset.objectUrl = url;
      node.onerror = () => { node.removeAttribute("src"); node.classList.add("is-broken"); };
    }));
    const recipeNodes = [...root.querySelectorAll("img[data-recipe-image-id]")];
    await Promise.all(recipeNodes.map(async (node) => {
      const url = await window.MentorData.repositories.media.resolveEntityUrl("recipe", node.dataset.recipeImageId, { storage: "indexeddb" }, node.dataset.recipeImageSize === "thumb");
      if (token !== imageRenderToken || !node.isConnected || !url) return;
      node.src = url; node.dataset.objectUrl = url;
      node.onerror = () => { node.removeAttribute("src"); node.classList.add("is-broken"); };
    }));
    root.querySelectorAll("img[data-image-fallback]").forEach((node) => { node.onerror = () => { node.removeAttribute("src"); node.classList.add("is-broken"); node.closest(".nutrition-image-preview")?.classList.remove("has-image"); }; });
  }

  function render() {
    if (!root) return;
    if (shouldDeferRenderForSelect()) return;
    const renderedTab = root.querySelector(".nutrition-tabs button.active")?.dataset.tab || state.activeTab;
    const shouldRestoreScroll = renderedTab === state.activeTab;
    const scrollSnapshot = shouldRestoreScroll ? captureNutritionScroll(root) : [];
    const viewportScroll = shouldRestoreScroll ? { x: window.scrollX, y: window.scrollY } : null;
    const activeElement = root.contains(document.activeElement) ? document.activeElement : null;
    const activeId = activeElement?.id || null;
    const activeSelector = activeId ? null : activeElementSelector(activeElement);
    const selectionStart = typeof activeElement?.selectionStart === "number" ? activeElement.selectionStart : null;
    const selectionEnd = typeof activeElement?.selectionEnd === "number" ? activeElement.selectionEnd : null;
    root.querySelectorAll("img[data-object-url]").forEach((node) => window.MentorData.repositories.media?.revokeObjectUrl(node.dataset.objectUrl));
    root.innerHTML = `<div class="nutrition-page"><nav class="nutrition-tabs" role="tablist" aria-label="${C.esc(t("foodsUi.tabLabel", "Nutrition tabs"))}">${tabs.map((tab) => `<button type="button" role="tab" aria-selected="${state.activeTab === tab}" class="${state.activeTab === tab ? "active" : ""}" data-action="tab" data-tab="${tab}">${C.esc(t(`tabs.${tab}`, tab))}</button>`).join("")}</nav><main class="nutrition-content" role="tabpanel">${window.MentorNutritionTabs[state.activeTab](state)}</main><div class="nutrition-modal ${state.modal ? "open" : ""}" aria-hidden="${!state.modal}">${renderModal()}</div></div>`;
    hasRendered = true;
    hydrateImages();
    refreshFoodFilters();
    if (activeId || activeSelector) {
      const replacement = activeId ? document.getElementById(activeId) : root.querySelector(activeSelector);
      replacement?.focus({ preventScroll: true });
      if (replacement?.setSelectionRange && selectionStart !== null) replacement.setSelectionRange(selectionStart, selectionEnd);
    }
    restoreNutritionScroll(scrollSnapshot, root);
    if (viewportScroll) window.scrollTo(viewportScroll.x, viewportScroll.y);
    if (state.planAutoFocusPending) {
      state.planAutoFocusPending = false;
      window.requestAnimationFrame?.(() => focusCurrentPlanSelection()) || focusCurrentPlanSelection();
    }
  }

  function refreshModal() {
    if (!root || !hasRendered || !root.firstElementChild?.classList.contains("nutrition-page")) { render(); return; }
    const modalHost = root.querySelector(".nutrition-modal");
    if (!modalHost) { render(); return; }
    modalHost.querySelectorAll("img[data-object-url]").forEach((node) => window.MentorData.repositories.media?.revokeObjectUrl(node.dataset.objectUrl));
    modalHost.innerHTML = renderModal();
    modalHost.classList.toggle("open", Boolean(state.modal));
    modalHost.setAttribute("aria-hidden", String(!state.modal));
    hydrateImages();
  }

  function refreshFoodResults() {
    if (state.activeTab !== "foods") return;
    if (isFoodSelectInteracting) return;
    const container = root?.querySelector("[data-food-results]");
    const renderResults = window.MentorNutritionTabs?.foodResults;
    if (!container || typeof renderResults !== "function") { render(); return; }
    const scrollSnapshot = captureNutritionScroll(container);
    container.querySelectorAll("img[data-object-url]").forEach((node) => window.MentorData.repositories.media?.revokeObjectUrl(node.dataset.objectUrl));
    container.innerHTML = renderResults(state);
    restoreNutritionScroll(scrollSnapshot, container);
    hydrateImages();
    refreshFoodFilters();
  }

  function setTab(tab, options = {}) {
    if (!tabs.includes(tab)) return;
    const enteringPlan = tab === "plan" && state.activeTab !== "plan";
    clearSearchRenderTimer();
    releaseFoodSelectInteraction();
    state.recipeFilterOpen = null;
    state.activeTab = tab;
    state.modal = null;
    if (enteringPlan && !options.keepPlanSelection) {
      state.weekOffset = 0;
      state.selectedMealPlanEntry = null;
      state.selectedDay = (new Date().getDay() + 6) % 7;
      state.planDayTouched = false;
      state.planAutoFocusPending = true;
    }
    render();
  }

  function closeRecipeFilterDropdown(restoreFocus = false) {
    const open = state.recipeFilterOpen;
    if (!open) return;
    state.recipeFilterOpen = null;
    const dropdown = root?.querySelector(`[data-recipe-filter-dropdown="${selectorValue(open)}"]`);
    dropdown?.classList.remove("is-open");
    const trigger = root?.querySelector(`#nutrition-recipe-filter-trigger-${selectorValue(open)}`);
    trigger?.setAttribute("aria-expanded", "false");
    const menu = root?.querySelector(`#nutrition-recipe-filter-panel-${selectorValue(open)}`);
    if (menu) menu.hidden = true;
    if (restoreFocus) trigger?.focus({ preventScroll:true });
  }
  function toggleRecipeFilterDropdown(panel) {
    const next = String(panel || "");
    if (state.recipeFilterOpen === next) { closeRecipeFilterDropdown(false); return; }
    if (state.recipeFilterOpen) closeRecipeFilterDropdown(false);
    state.recipeFilterOpen = next || null;
    if (!state.recipeFilterOpen) return;
    const dropdown = root?.querySelector(`[data-recipe-filter-dropdown="${selectorValue(next)}"]`);
    dropdown?.classList.add("is-open");
    const trigger = root?.querySelector(`#nutrition-recipe-filter-trigger-${selectorValue(next)}`);
    trigger?.setAttribute("aria-expanded", "true");
    const menu = root?.querySelector(`#nutrition-recipe-filter-panel-${selectorValue(next)}`);
    if (menu) menu.hidden = false;
  }

  function syncRecipeFilterControls() {
    const host = root?.querySelector("[data-recipe-filter-system]");
    if (!host) return;
    const filters = window.MentorRecipeFilterService.normalize(state.recipeFilters);
    state.recipeFilters = filters;
    const search = host.querySelector("[data-recipe-search]");
    if (search && search.value !== filters.search) search.value = filters.search;
    host.querySelectorAll("[data-recipe-filter-option]").forEach((control) => {
      const checked = filters[control.dataset.filterGroup]?.includes(control.value) || false;
      control.checked = checked;
      control.closest(".nutrition-recipe-filter-option")?.classList.toggle("is-checked", checked);
    });
    window.MentorRecipeFilterService.GROUPS.forEach((group) => {
      const trigger = host.querySelector(`#nutrition-recipe-filter-trigger-${selectorValue(group)}`);
      if (!trigger) return;
      const badge = [...trigger.children].find((node) => node.tagName === "SPAN");
      const count = filters[group].length;
      if (count && badge) badge.textContent = count;
      else if (count) { const node = document.createElement("span"); node.textContent = count; trigger.insertBefore(node, trigger.querySelector("b")); }
      else badge?.remove();
    });
    const chipsHost = host.querySelector("[data-recipe-filter-chips-host]");
    if (chipsHost) chipsHost.innerHTML = window.MentorRecipeFiltersView.renderChips(filters);
  }

  function applyRecipeFilters(update) {
    state.recipeFilters = window.MentorRecipeFilterService.normalize(state.recipeFilters);
    if (typeof update === "function") update(state.recipeFilters);
    state.recipeFilters = window.MentorRecipeFilterService.normalize(state.recipeFilters);
    refreshRecipeResults();
  }

  function refreshRecipeResults() {
    if (state.activeTab !== "recipes" || !root) return;
    const currentMain = root.querySelector("[data-recipe-results]");
    const renderResults = window.MentorNutritionTabs?.recipeResults;
    if (!currentMain || typeof renderResults !== "function") { render(); return; }
    const scrollSnapshot = captureNutritionScroll(currentMain);
    currentMain.querySelectorAll("img[data-object-url]").forEach((node) => window.MentorData.repositories.media?.revokeObjectUrl(node.dataset.objectUrl));
    currentMain.innerHTML = renderResults(state);
    restoreNutritionScroll(scrollSnapshot, currentMain);
    syncRecipeFilterControls();
    hydrateImages();
  }

  function refreshRecipeDetails() {
    if (state.activeTab !== "recipes" || !root) return;
    const currentDetails = root.querySelector("[data-recipe-details]");
    const renderDetails = window.MentorNutritionTabs?.recipeDetails;
    if (!currentDetails || typeof renderDetails !== "function") { render(); return; }
    const template = document.createElement("template");
    template.innerHTML = renderDetails(state).trim();
    const nextDetails = template.content.firstElementChild;
    if (!nextDetails) { render(); return; }
    currentDetails.querySelectorAll("img[data-object-url]").forEach((node) => window.MentorData.repositories.media?.revokeObjectUrl(node.dataset.objectUrl));
    currentDetails.replaceWith(nextDetails);
    hydrateImages();
  }
  function clearPreview() { if (state.foodForm?.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(state.foodForm.previewUrl); }
  function closeFoodForm() { clearPreview(); state.foodForm = null; state.foodFormFile = null; state.modal = null; render(); }
  function clearRecipePreview() { if (state.recipeForm?.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(state.recipeForm.previewUrl); }
  function closeRecipeForm() { clearRecipePreview(); state.recipeForm = null; state.recipeFormFile = null; state.modal = null; refreshModal(); }

  function updateFoodField(target) {
    if (!state.foodForm || !target.dataset.foodField) return;
    const path = target.dataset.foodField;
    let inputValue = target.value;
    if (["amount", "equivalentGrams"].some((key) => path.endsWith(key))) inputValue = inputValue === "" ? "" : Number(inputValue);
    if (path === "tags") state.foodForm.draft.tags = inputValue.split(",").map((item) => item.trim()).filter(Boolean);
    else window.MentorNutritionFoodFormUI.setPath(state.foodForm.draft, path, inputValue);
    if (path === "names.sr") {
      state.foodForm.draft.defaultName = inputValue;
      if (!state.foodForm.slugTouched) {
        state.foodForm.draft.slug = window.MentorNutritionFoodFormService.slugify(inputValue);
        const slug = root.querySelector('[data-food-field="slug"]'); if (slug) slug.value = state.foodForm.draft.slug;
      }
    }
    if (path === "slug") state.foodForm.slugTouched = true;
    if (path === "image.imageUrl") {
      const preview = root.querySelector(".nutrition-image-preview");
      if (preview) { preview.replaceChildren(); const img = document.createElement("img"); img.alt = ""; img.src = inputValue; img.onerror = () => { img.remove(); preview.append(C.t("foodsUi.noImage", "No image")); }; preview.append(img); }
    }
    refreshSaveState();
  }

  function refreshSaveState() {
    if (!state.foodForm) return;
    const result = window.MentorNutritionFoodFormService.validate(state.foodForm.draft, { imageFile: state.foodFormFile, foodId: state.foodForm.mode === "edit" ? state.foodForm.originalId : null });
    state.foodForm.errors = result.errors;
    root.querySelectorAll(".nutrition-field-error").forEach((node) => node.remove());
    result.errors.forEach((error) => {
      const mapped = error.field === "defaultName" ? "names.sr" : error.field === "nameEn" ? "names.en" : error.field === "imageUrl" ? "image.imageUrl" : error.field;
      let field = root.querySelector(`[data-food-field="${mapped}"]`);
      if (!field && mapped.startsWith("portions.")) field = root.querySelector(`[data-food-field^="${mapped.split(".").slice(0,2).join(".")}"]`);
      if (!field && mapped.startsWith("nutrients.")) field = root.querySelector(`[data-nutrient-index="${mapped.split(".")[1]}"]`);
      const host = field?.closest(".nutrition-form-field,.nutrition-nutrient-row,.nutrition-image-form"); if (!host) return;
      const key = error.code === "duplicate" ? "duplicate" : error.code === "type" ? "imageType" : error.code === "size" ? "imageSize" : error.code === "required" ? "required" : "invalid";
      const message = document.createElement("small"); message.className = "nutrition-field-error"; message.textContent = t(`foodForm.validation.${key}`, "Invalid value"); host.append(message);
    });
    root.querySelectorAll('[data-action="food-form-save"],[data-action="food-form-save-close"]').forEach((button) => { button.disabled = !result.valid || state.foodForm.saving; });
  }

  async function saveFood(closeAfter) {
    const form = state.foodForm; if (!form || form.saving) return;
    const validation = window.MentorNutritionFoodFormService.validate(form.draft, { imageFile: state.foodFormFile, foodId: form.mode === "edit" ? form.originalId : null });
    if (!validation.valid) { form.errors = validation.errors; render(); return; }
    form.saving = true; render();
    try {
      const saved = form.mode === "edit" ? await window.MentorNutritionFoodFormService.update(form.originalId, form.draft, { imageFile: state.foodFormFile }) : await window.MentorNutritionFoodFormService.create(form.draft, { imageFile: state.foodFormFile });
      state.selectedFood = saved.id; state.notice = { type: "success", text: t("foodsUi.saved", "Food saved successfully.") }; clearPreview(); state.foodFormFile = null;
      if (closeAfter) { state.foodForm = null; state.modal = null; }
      else window.MentorNutritionFoodFormUI.open(state, saved.id);
    } catch (error) {
      console.error("[Nutrition] Food save failed", error);
      form.errors = error.details || [{ field: "defaultName", code: "invalid" }];
      state.notice = { type: "error", text: t("foodForm.validation.invalid", "Invalid value") };
    } finally { if (state.foodForm) state.foodForm.saving = false; render(); }
  }

  function setInventoryErrors(errors) {
    if (!state.inventoryForm) return;
    state.inventoryForm.errors = errors || [];
    root.querySelectorAll("[data-inventory-error]").forEach((node) => { node.textContent = ""; });
    state.inventoryForm.errors.forEach((error) => {
      const node = root.querySelector(`[data-inventory-error="${error.field}"]`);
      if (!node) return;
      const key = ["required","positive","unit","foodMissing","locationMissing","expiryBeforePurchase","negative","number","date","activeReservation","reservedMinimum"].includes(error.code) ? error.code : "saveFailed";
      node.textContent = t(`inventory.validation.${key}`, "Invalid value.");
    });
  }

  function validateInventoryForm() {
    if (!state.inventoryForm) return { valid:false, errors:[] };
    const result = window.MentorInventoryService.validateDraft(state.inventoryForm.draft, state.inventoryForm.originalId);
    setInventoryErrors(result.errors);
    root.querySelectorAll('[data-inventory-form] button[type="submit"]').forEach((button) => { button.disabled = state.inventoryForm.saving; });
    return result;
  }

  function syncInventoryQuantityLabel() {
    const label = root.querySelector('[data-inventory-label="quantity"]');
    if (label && state.inventoryForm) label.textContent = window.MentorNutritionInventoryFormUI.quantityLabel(state.inventoryForm.draft.unit);
  }

  function selectInventoryFood(foodId) {
    const form = state.inventoryForm;
    if (!form) return;
    form.draft.foodId = foodId || "";
    if (foodId) {
      const defaults = window.MentorInventoryService.getDefaultsForFood(foodId);
      form.draft.unit = defaults.unit; form.draft.packageUnit = defaults.unit;
      if (!form.draft.locationId) form.draft.locationId = defaults.locationId;
      const unit = root.querySelector('[data-inventory-field="unit"]'); if (unit) unit.value = defaults.unit;
      const packageUnit = root.querySelector('[data-inventory-field="packageUnit"]'); if (packageUnit) packageUnit.value = defaults.unit;
      syncInventoryQuantityLabel();
    }
    validateInventoryForm();
  }

  function updateInventoryField(target) {
    const form = state.inventoryForm, field = target.dataset.inventoryField;
    if (!form || !field) return;
    if (field === "foodId") { selectInventoryFood(target.value); return; }
    form.draft[field] = target.value;
    if (field === "unit") syncInventoryQuantityLabel();
    if (["packageCount","packageSize","packageUnit"].includes(field)) {
      const count = Number(form.draft.packageCount), size = Number(form.draft.packageSize);
      if (count > 0 && size > 0) {
        form.draft.quantity = Math.round((count * size + Number.EPSILON) * 1000) / 1000;
        form.draft.unit = form.draft.packageUnit;
        const quantity = root.querySelector('[data-inventory-field="quantity"]'); if (quantity) quantity.value = form.draft.quantity;
        const unit = root.querySelector('[data-inventory-field="unit"]'); if (unit) unit.value = form.draft.unit;
      }
    }
    validateInventoryForm();
  }

  async function saveInventory(intent) {
    const form = state.inventoryForm;
    if (!form || form.saving) return;
    const validation = window.MentorInventoryService.validateDraft(form.draft, form.originalId);
    if (!validation.valid) { form.errors = validation.errors; render(); return; }
    form.saving = true; render();
    try {
      const saved = await window.MentorInventoryService.saveBatch(form.draft, form.originalId);
      state.selectedStock = saved.id;
      state.notice = { type:"success", text:t("inventory.notices.saved", "Inventory item saved.") };
      if (intent === "add-another") window.MentorNutritionInventoryFormUI.open(state, null, saved.foodId);
      else { state.inventoryForm = null; state.inventoryFoodSearch = ""; state.inventoryMoreOpen = false; state.modal = null; }
    } catch (error) {
      console.error("[Nutrition] Inventory save failed", error);
      form.errors = error.details || [{ field:"quantity", code:"saveFailed" }];
      state.notice = { type:"error", text:t("inventory.validation.saveFailed", "Saving failed.") };
    } finally { if (state.inventoryForm) state.inventoryForm.saving = false; render(); }
  }

  function updateShoppingField(target) {
    const key = target.dataset.key, field = target.dataset.shoppingField;
    if (!key || !field) return;
    state.shoppingDrafts = state.shoppingDrafts || {};
    state.shoppingDrafts[key] = { ...(state.shoppingDrafts[key] || {}), [field]: target.value };
    state.shoppingError = null;
  }

  async function confirmShoppingItem(key) {
    const row = shoppingRowsForWeek().find((item) => shoppingKey(item) === key);
    if (!row) { state.shoppingError = t("planning.shoppingAlreadyCovered", "This ingredient is already covered."); render(); return; }
    const draft = shoppingDraft(row), defaults = window.MentorInventoryService.getDefaultsForFood(row.foodId), today = new Date().toISOString().slice(0, 10);
    try {
      const saved = await window.MentorInventoryService.saveBatch({
        foodId: row.foodId,
        locationId: defaults.locationId,
        quantity: parseDecimal(draft.quantity),
        unit: row.unit,
        purchaseDate: today,
        addedAt: today,
        storeName: draft.storeName || "",
        sourceType: draft.storeName ? "store" : "",
        totalPrice: draft.totalPrice === "" || draft.totalPrice == null ? "" : parseDecimal(draft.totalPrice),
        currency: draft.currency || "EUR",
        status: "available"
      });
      state.selectedStock = saved.id;
      if (state.shoppingDrafts) delete state.shoppingDrafts[key];
      state.shoppingError = null;
      state.notice = { type:"success", text:t("planning.shoppingAddedToInventory", "Ingredient added to inventory.") };
    } catch (error) {
      console.error("[Nutrition] Shopping purchase failed", error);
      state.shoppingError = t("inventory.validation.saveFailed", "Saving failed.");
    }
    render();
  }

  function inventoryErrorMessage(error) {
    if (error?.message === "QUANTITY_EXCEEDS_AVAILABLE") return t("inventory.validation.quantityExceeds", "Quantity exceeds available stock.");
    if (error?.message === "INCOMPATIBLE_UNITS") return t("inventory.validation.incompatibleUnits", "Units are incompatible.");
    return t("inventory.validation.saveFailed", "Saving failed.");
  }

  async function saveRecipeForm() {
    const form=state.recipeForm;if(!form||form.saving)return;const validation=window.MentorPlanningService.validateRecipe(form.draft,{imageFile:state.recipeFormFile});if(!validation.valid){form.errors=validation.errors;refreshModal();return;}form.saving=true;refreshModal();
    try{const saved=await window.MentorPlanningService.saveRecipe(form.draft,form.originalId,{imageFile:state.recipeFormFile});state.selectedRecipe=saved.id;clearRecipePreview();state.recipeFormFile=null;state.recipeForm=null;state.modal=null;state.notice={type:"success",text:t("planning.savedRecipe","Recipe saved.")};}
    catch(error){console.error("[Nutrition] Recipe save failed",error);form.errors=error.details||[{field:"name",code:"invalid"}];state.notice={type:"error",text:t("planning.validation","Check the form.")};}
    finally{if(state.recipeForm){state.recipeForm.saving=false;refreshModal();}else render();}
  }

  async function saveMealPlanForm() {
    const form=state.mealPlanForm;if(!form||form.saving)return;form.copyError=null;if(form.copySourceId){const source=window.MentorPlanningRepository.getMealPlanEntryById(form.copySourceId),copyValidation=window.MentorPlanningService.validateCopyTarget(form.draft,source);if(!copyValidation.valid){form.copyError="copySameSlot";form.errors=copyValidation.errors;refreshModal();return;}}const validation=window.MentorPlanningService.validateEntry(form.draft);if(!validation.valid){form.errors=validation.errors;refreshModal();return;}form.saving=true;refreshModal();
    try{const saved=await window.MentorPlanningService.saveMealPlanEntry(form.draft,form.originalId);state.selectedMealPlanEntry=saved.entry.id;state.mealPlanForm=null;state.modal=null;state.notice={type:"success",text:t("planning.savedMeal","Meal saved.")};}
    catch(error){console.error("[Nutrition] Meal plan save failed",error);form.errors=error.details||[{field:"recipeId",code:"invalid"}];state.notice={type:"error",text:t("planning.validation","Check the form.")};}
    finally{if(state.mealPlanForm){state.mealPlanForm.saving=false;refreshModal();}else render();}
  }

  async function submitInventoryActionForm(formElement) {
    const modal = { ...state.modal }, data = new FormData(formElement);
    try {
      if (modal.action === "consume") await window.MentorInventoryService.consume(modal.id, Number(data.get("amount")), data.get("unit"));
      else if (modal.action === "restock") await window.MentorInventoryService.restock(modal.id, Number(data.get("amount")), data.get("unit"));
      else await window.MentorInventoryService.move(modal.id, data.get("locationId"));
      state.notice = { type:"success", text:t(`inventory.notices.${modal.action === "consume" ? "consumed" : modal.action === "restock" ? "restocked" : "moved"}`, "Inventory updated.") };
      state.modal = null;
    } catch (error) {
      console.error("[Nutrition] Inventory action failed", error);
      state.notice = { type:"error", text:inventoryErrorMessage(error) };
    }
    render();
  }

  root?.addEventListener("click", (event) => {
    const inventoryMoreSummary = event.target.closest(".nutrition-inventory-more > summary");
    if (inventoryMoreSummary && root.contains(inventoryMoreSummary)) {
      const details = inventoryMoreSummary.closest("details");
      if (!details) return;
      event.preventDefault();
      event.stopPropagation();
      details.open = !details.open;
      state.inventoryMoreOpen = details.open;
      return;
    }
    const summary = event.target.closest(".nutrition-detail-accordions summary");
    if (!summary || !root.contains(summary)) return;
    const details = summary.closest("details");
    if (!details) return;
    event.preventDefault();
    event.stopPropagation();
    details.open = !details.open;
  }, true);

  root?.addEventListener("click", async (event) => {
    const actionTarget = event.target.closest("[data-action]");
    const formSubmitTarget = event.target.closest('[data-recipe-form] button[type="submit"], [data-meal-plan-form] button[type="submit"]');
    const recipeFilterOption = event.target.closest("[data-recipe-filter-option], .nutrition-recipe-filter-option");
    const inventoryDatePicker = event.target.closest("[data-inventory-date-picker]");
    if (inventoryDatePicker && root.contains(inventoryDatePicker)) {
      event.preventDefault();
      event.stopPropagation();
      const field = inventoryDatePicker.dataset.inventoryDatePicker;
      openNativePicker(root.querySelector(`[data-inventory-field="${selectorValue(field)}"]`));
      return;
    }
    if (recipeFilterOption && root.contains(recipeFilterOption)) {
      const control = recipeFilterOption.matches?.("[data-recipe-filter-option]") ? recipeFilterOption : recipeFilterOption.querySelector("[data-recipe-filter-option]");
      if (control) {
        event.preventDefault();
        event.stopPropagation();
        const filters = window.MentorRecipeFilterService.normalize(state.recipeFilters);
        const selected = filters[control.dataset.filterGroup]?.includes(control.value) || false;
        control.checked = !selected;
        recipeFilterClickHandled = true;
        state.recipeFilters = window.MentorRecipeFilterService.toggle(filters, control.dataset.filterGroup, control.value, !selected);
        refreshRecipeResults();
        window.setTimeout(() => { recipeFilterClickHandled = false; syncRecipeFilterControls(); }, 0);
      }
      return;
    }
    if (isNutritionLockedSelect(event.target) && !actionTarget && !formSubmitTarget) return;
    const inventoryIntentButton = event.target.closest("[data-inventory-intent]");
    if (inventoryIntentButton && root.contains(inventoryIntentButton) && state.inventoryForm) {
      event.preventDefault();
      event.stopPropagation();
      const intent = inventoryIntentButton.dataset.inventoryIntent || "close";
      state.inventoryForm.intent = intent;
      await saveInventory(intent);
      return;
    }
    const inventoryActionSubmitButton = event.target.closest('[data-inventory-action-form] button[type="submit"]');
    if (inventoryActionSubmitButton && root.contains(inventoryActionSubmitButton) && state.modal?.type === "inventory-action") {
      event.preventDefault();
      event.stopPropagation();
      await submitInventoryActionForm(inventoryActionSubmitButton.closest("[data-inventory-action-form]"));
      return;
    }
    const recipeSubmitButton = event.target.closest('[data-recipe-form] button[type="submit"]');
    if (recipeSubmitButton && root.contains(recipeSubmitButton) && state.recipeForm) {
      event.preventDefault();
      event.stopPropagation();
      await saveRecipeForm();
      return;
    }
    const mealSubmitButton = event.target.closest('[data-meal-plan-form] button[type="submit"]');
    if (mealSubmitButton && root.contains(mealSubmitButton) && state.mealPlanForm) {
      event.preventDefault();
      event.stopPropagation();
      await saveMealPlanForm();
      return;
    }
    const interactiveTarget = event.target.closest?.("button,a,input,select,textarea,label,[contenteditable='true'],[data-action]");
    if (state.activeTab === "recipes" && !interactiveTarget) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const target = actionTarget; if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    const action = target.dataset.action;
    if (action === "tab") setTab(target.dataset.tab);
    else if (action.startsWith("tab-")) setTab(action.slice(4));
    else if (action === "toggle-meal") { window.MentorNutritionStorage.toggleCompletedMeal(state, Number(target.dataset.id)); render(); }
    else if (action === "day-prev" || action === "day-next") { state.date.setDate(state.date.getDate() + (action.endsWith("next") ? 1 : -1)); render(); }
    else if (action === "week-prev" || action === "week-next") {
      state.weekOffset += action.endsWith("next") ? 1 : -1;
      state.selectedMealPlanEntry = null;
      state.selectedDay = 0;
      state.planDayTouched = false;
      render();
    }
    else if (action === "week-today") {
      state.weekOffset = 0;
      state.selectedMealPlanEntry = null;
      state.selectedDay = (new Date().getDay() + 6) % 7;
      state.planDayTouched = false;
      state.planAutoFocusPending = true;
      render();
    }
    else if (action === "select") { const rawId = target.dataset.id, id = /^\d+$/.test(rawId) ? Number(rawId) : rawId, type = target.dataset.type; state[type === "food" ? "selectedFood" : type === "stock" ? "selectedStock" : "selectedRecipe"] = id; render(); }
    else if (action === "food-nutrient-tab") {
      const group = target.closest(".nutrition-nutrient-tab-group");
      group?.querySelectorAll("button[data-nutrient-group]").forEach((button) => button.setAttribute("aria-pressed", String(button === target)));
      group?.querySelectorAll("[data-nutrient-panel]").forEach((panel) => { panel.hidden = panel.dataset.nutrientPanel !== target.dataset.nutrientGroup; });
    }
    else if (action === "food-select") { state.selectedFood = target.dataset.id; state.notice = null; refreshFoodResults(); }
    else if (action === "food-edit") { window.MentorNutritionFoodFormUI.open(state, target.dataset.id); render(); }
    else if (action === "food-form-copy-system") { const copy = await window.MentorNutritionFoodFormService.copySystem(state.foodForm.originalId); state.selectedFood = copy.id; window.MentorNutritionFoodFormUI.open(state, copy.id); render(); }
    else if (action === "food-add") { window.MentorNutritionFoodFormUI.open(state, null); render(); }
    else if (action === "food-category") {
      applyFoodFilters((filters) => { filters.foodCategory = filters.foodCategory === target.dataset.category ? "" : target.dataset.category; });
    }
    else if (action === "food-reset-filters") {
      state.search = "";
      state.filters = { ...FOOD_FILTER_DEFAULTS };
      applyFoodFilters(null, { render: true });
    }
    else if (action === "food-quick-import") { state.modal = { type:"placeholder", kind:"import" }; render(); }
    else if (action === "food-quick-recipe") { state.modal = { type:"placeholder", kind:"recipe" }; render(); }
    else if (action === "food-quick-fridge") { window.MentorNutritionInventoryFormUI.open(state, null, state.selectedFood); render(); }
    else if (action === "food-form-section") { state.foodFormSection = target.dataset.section; render(); }
    else if (action === "food-form-add-portion") { state.foodForm.draft.portions.push({ name:"", amount:1, unit:"g", equivalentGrams:"" }); render(); }
    else if (action === "food-form-remove-portion") { state.foodForm.draft.portions.splice(Number(target.dataset.index), 1); render(); }
    else if (action === "food-form-remove-nutrient") { state.foodForm.draft.nutrients.splice(Number(target.dataset.index), 1); render(); }
    else if (action === "food-image-mode") {
      if (!state.foodForm) return;
      const mode = target.dataset.imageMode || "none";
      state.foodForm.draft.image = { imageType:mode, imageUrl:null, localImageId:null, thumbnailId:null };
      if (mode !== "local") state.foodFormFile = null;
      clearPreview();
      state.foodForm.previewUrl = null;
      render();
    }
    else if (action === "food-form-cancel") closeFoodForm();
    else if (action === "food-form-save") await saveFood(false);
    else if (action === "food-form-save-close") await saveFood(true);
    else if (action === "food-form-archive") { state.modal = { type:"confirm-food", action:"archive", id:state.foodForm.originalId }; render(); }
    else if (action === "food-form-delete") { state.modal = { type:"confirm-food", action:"delete", id:state.foodForm.originalId }; render(); }
    else if (action === "confirm-cancel") { state.modal = state.foodForm ? { type:"food-form" } : null; render(); }
    else if (action === "confirm-food-action") {
      const modal = state.modal;
      try { if (modal.action === "archive") { await window.MentorNutritionFoodFormService.archive(modal.id); state.notice = { type:"success", text:t("foodsUi.archivedNotice", "Food archived.") }; state.selectedFood = modal.id; } else { await window.MentorNutritionFoodFormService.remove(modal.id); state.notice = { type:"success", text:t("foodsUi.deleted", "Food deleted.") }; state.selectedFood = null; } state.foodForm = null; state.modal = null; } catch (error) { console.error("[Nutrition] Food action failed", error); state.notice = { type:"error", text:error.code === "FOOD_IN_USE_BY_INVENTORY" ? t("foodsUi.inUseInventory", "Food is linked to inventory.") : error.code === "FOOD_IN_USE_BY_PLANNING" ? t("foodsUi.inUsePlanning", "Food is used by a recipe.") : error.message }; state.modal = null; } render();
    }
    else if (action === "inventory-add") { window.MentorNutritionInventoryFormUI.open(state, null, target.dataset.foodId || null); render(); }
    else if (action === "inventory-location-create") { state.inventoryLocationDraft = { name:"", icon:"box" }; state.modal = { type:"inventory-location" }; render(); }
    else if (action === "inventory-location-delete") { state.modal = { type:"confirm-inventory-location", id:target.dataset.locationId }; refreshModal(); }
    else if (action === "inventory-location-delete-cancel") { if (state.modal?.saving) return; state.modal = null; refreshModal(); }
    else if (action === "inventory-location-delete-confirm") {
      const modal = state.modal;
      if (modal?.type !== "confirm-inventory-location" || modal.saving) return;
      modal.saving = true; refreshModal();
      try {
        await window.MentorInventoryRepository.removeLocation(modal.id);
        if (state.inventoryFilters.locationId === modal.id) state.inventoryFilters.locationId = "";
        state.notice = { type:"success", text:t("inventory.locationPanel.removed", "Location deleted.") };
      } catch (error) {
        const key = error.message === "LOCATION_IN_USE" ? "inUse" : error.message === "LOCATION_LAST_REMAINING" ? "lastRemaining" : "removeFailed";
        state.notice = { type:"error", text:t(`inventory.locationPanel.${key}`, "Location could not be deleted.") };
      }
      state.modal = null; render();
    }
    else if (action === "inventory-location-filter") { state.inventoryFilters.locationId = state.inventoryFilters.locationId === target.dataset.locationId ? "" : target.dataset.locationId; render(); }
    else if (action === "inventory-select") { state.selectedStock = target.dataset.id; render(); }
    else if (action === "inventory-menu-toggle") { releaseFoodSelectInteraction(); const menu = target.closest("details"); if (menu) menu.open = !menu.open; }
    else if (action === "inventory-edit") { releaseFoodSelectInteraction(); window.MentorNutritionInventoryFormUI.open(state, target.dataset.id); render(); }
    else if (["inventory-consume","inventory-restock","inventory-move"].includes(action)) { releaseFoodSelectInteraction(); state.modal = { type:"inventory-action", action:action.slice(10), id:target.dataset.id }; render(); }
    else if (action === "inventory-remove") { releaseFoodSelectInteraction(); state.modal = { type:"confirm-inventory", id:target.dataset.id }; render(); }
    else if (action === "inventory-form-cancel") { state.inventoryForm = null; state.inventoryFoodSearch = ""; state.inventoryMoreOpen = false; state.modal = null; render(); }
    else if (action === "inventory-location-cancel") { state.inventoryLocationDraft = null; state.modal = state.inventoryForm ? { type:"inventory-form" } : null; render(); }
    else if (action === "inventory-action-cancel") { state.modal = null; render(); }
    else if (action === "inventory-confirm-cancel") { state.modal = null; render(); }
    else if (action === "inventory-confirm-remove") {
      try { await window.MentorInventoryService.remove(state.modal.id); state.selectedStock = null; state.notice = { type:"success", text:t("inventory.notices.deleted", "Inventory item removed.") }; }
      catch (error) { console.error("[Nutrition] Inventory delete failed", error); state.notice = { type:"error", text:inventoryErrorMessage(error) }; }
      state.modal = null; render();
    }
    else if (action === "inventory-open-plan") { state.selectedMealPlanEntry = target.dataset.entryId || null; setTab("plan", { keepPlanSelection:true }); }
    else if (action === "shopping-open") { state.shoppingError = null; state.modal = { type:"shopping-list" }; render(); }
    else if (action === "shopping-close") { state.shoppingError = null; state.modal = null; render(); }
    else if (action === "shopping-export-pdf") { exportShoppingPdf(); }
    else if (action === "shopping-export-image") { exportShoppingImage(); }
    else if (action === "shopping-bought") { await confirmShoppingItem(target.dataset.key); }
    else if (action === "recipe-add") { releaseFoodSelectInteraction(); window.MentorNutritionPlanningForms.openRecipe(state); refreshModal(); }
    else if (action === "recipe-edit") { releaseFoodSelectInteraction(); window.MentorNutritionPlanningForms.openRecipe(state,target.dataset.id); refreshModal(); }
    else if (action === "recipe-select") { if (state.selectedRecipe !== target.dataset.id) { state.selectedRecipe=target.dataset.id; render(); } }
    else if (action === "recipe-plan") { releaseFoodSelectInteraction(); const recipe=window.MentorPlanningRepository.getRecipeById(target.dataset.id); window.MentorNutritionPlanningForms.openMeal(state,null,{recipeId:target.dataset.id,mealType:recipe?.mealType||"breakfast",servings:recipeServingsForPlan(recipe)}); refreshModal(); }
    else if (action === "plan-recipe-filter") { state.planRecipeFilter = target.dataset.filter; render(); }
    else if (action === "plan-recipe-more-toggle") { state.planRecipeMoreOpen = !state.planRecipeMoreOpen; render(); }
    else if (action === "plan-recipe-favorite") {
      if (favoriteSavePending) return;
      favoriteSavePending = true;
      try { await window.MentorNutritionTabs.togglePlanFavorite(target.dataset.id); }
      catch (error) { state.notice={type:"error",text:inventoryErrorMessage(error)}; }
      finally { favoriteSavePending = false; render(); }
    }
    else if (action === "recipe-servings-dec" || action === "recipe-servings-inc") {
      const recipe = window.MentorPlanningRepository.getRecipeById(target.dataset.id);
      if (!recipe) return;
      state.recipeServings = state.recipeServings || {};
      const current = Number(state.recipeServings[recipe.id] || recipe.servings || 1);
      const next = Math.max(1, Math.round(current + (action === "recipe-servings-inc" ? 1 : -1)));
      state.recipeServings[recipe.id] = next;
      refreshRecipeDetails();
    }
    else if (action === "recipe-filter-toggle") { toggleRecipeFilterDropdown(target.dataset.filterPanel); }
    else if (action === "recipe-filter-remove") { applyRecipeFilters((filters)=>{ state.recipeFilters=window.MentorRecipeFilterService.remove(filters,target.dataset.filterGroup,target.dataset.filterValue); }); }
    else if (action === "recipe-filter-reset") { state.recipeFilters=window.MentorRecipeFilterService.empty();closeRecipeFilterDropdown(false);refreshRecipeResults(); }
    else if (action === "recipe-form-cancel") { closeRecipeForm(); }
    else if (action === "recipe-form-save") { await saveRecipeForm(); }
    else if (action === "recipe-image-mode") { if(!state.recipeForm)return;const mode=target.dataset.imageMode||"none",original=state.recipeForm.originalImage;state.recipeForm.draft.image=original?.imageType===mode?{...original}:{imageType:mode,imageUrl:null,localImageId:null,thumbnailId:null};if(mode!=="local")state.recipeFormFile=null;clearRecipePreview();state.recipeForm.previewUrl=null;state.recipeForm.errors=state.recipeForm.errors.filter((item)=>item.field!=="image"&&item.field!=="imageUrl");refreshModal(); }
    else if (action === "recipe-ingredient-add") { state.recipeForm.draft.ingredients.push({foodId:"",quantity:"",unit:"g"});refreshModal(); }
    else if (action === "recipe-ingredient-remove") { if(state.recipeForm.draft.ingredients.length>1)state.recipeForm.draft.ingredients.splice(Number(target.dataset.index),1);refreshModal(); }
    else if (action === "meal-add") { window.MentorNutritionPlanningForms.openMeal(state,null,{plannedDate:target.dataset.date,mealType:target.dataset.mealType});refreshModal(); }
    else if (action === "meal-edit") { window.MentorNutritionPlanningForms.openMeal(state,target.dataset.id);refreshModal(); }
    else if (action === "meal-select") { state.selectedMealPlanEntry=target.dataset.id;state.selectedDay=Number(target.dataset.day)||0;state.planDayTouched=true;state.mealMissingOpen=false;render(); }
    else if (action === "meal-missing-toggle") { state.mealMissingOpen=!state.mealMissingOpen;render(); }
    else if (action === "meal-copy") {
      const entry=window.MentorPlanningRepository.getMealPlanEntryById(target.dataset.id);
      if(!entry)return;
      window.MentorNutritionPlanningForms.openMeal(state,null,{recipeId:entry.recipeId,plannedDate:entry.plannedDate,mealType:entry.mealType,servings:entry.servings,copySourceId:entry.id});
      refreshModal();
    }
    else if (action === "meal-form-cancel") { state.mealPlanForm=null;state.modal=null;refreshModal(); }
    else if (action === "meal-form-save") { await saveMealPlanForm(); }
    else if (action === "meal-toggle") {
      try {
        const entry=window.MentorPlanningRepository.getMealPlanEntryById(target.dataset.id),done=entry?.status==="completed"||Boolean(entry?.completedAt);
        if(done){await window.MentorPlanningService.uncompleteMealPlanEntry(target.dataset.id);state.notice={type:"success",text:t("overview.mealUncompleted","Meal returned to planned status.")};}
        else{await window.MentorPlanningService.completeMealPlanEntry(target.dataset.id);state.notice={type:"success",text:t("planning.completedMeal","Meal completed.")};}
      }catch(error){state.notice={type:"error",text:inventoryErrorMessage(error)};}
      render();
    }
    else if (action === "meal-complete") { try{await window.MentorPlanningService.completeMealPlanEntry(target.dataset.id);state.notice={type:"success",text:t("planning.completedMeal","Meal completed.")};}catch(error){state.notice={type:"error",text:inventoryErrorMessage(error)};}render(); }
    else if (action === "meal-remove") { state.modal={type:"confirm-meal-remove",id:target.dataset.id};render(); }
    else if (action === "meal-remove-cancel") { state.modal=null;render(); }
    else if (action === "meal-remove-confirm") { try{await window.MentorPlanningService.removeMealPlanEntry(state.modal.id);state.selectedMealPlanEntry=null;state.notice={type:"success",text:t("planning.removedMeal","Meal removed.")};}catch(error){state.notice={type:"error",text:inventoryErrorMessage(error)};}state.modal=null;render(); }
    else if (action === "plan-day-select") { const dateKey=target.dataset.date||new Date().toISOString().slice(0,10),first=firstMealPlanEntryForDate(dateKey);state.selectedDay=Number(target.dataset.day)||0;state.selectedMealPlanEntry=first?.id||null;state.planDayTouched=true;state.planAutoFocusPending=true;render(); }
    else if (action === "select-day") { state.selectedDay = Number(target.dataset.day) || 0; render(); }
    else if (action === "period") { state.period = target.dataset.period; render(); }
    else if (action === "modal-close") { state.modal = null; render(); }
    else if (action === "placeholder") { state.modal = { type:"placeholder" }; render(); }
    else if (action === "filter-chip") target.classList.toggle("active");
  });

  root?.addEventListener("pointerdown", (event) => {
    if (isNutritionLockedSelect(event.target)) markFoodSelectInteraction();
    else releaseFoodSelectInteraction();
  });

  root?.addEventListener("dragstart", (event) => {
    if (state.activeTab !== "plan") return;
    if (window.MentorUIEvents?.isTextEditingEvent?.(event)) return;
    const meal = event.target.closest?.("[data-plan-meal-entry-id]");
    if (meal && root.contains(meal) && event.dataTransfer) {
      const entry = window.MentorPlanningRepository.getMealPlanEntryById(meal.dataset.planMealEntryId);
      if (!entry) { event.preventDefault(); return; }
      state.planDragMeal = { id:entry.id, date:meal.dataset.planMealDate, segment:meal.dataset.planMealSegment };
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("application/x-mentor-plan-meal", entry.id);
      meal.classList.add("is-dragging");
      return;
    }
    if (event.target.closest?.("button")) { event.preventDefault(); return; }
    const card = event.target.closest?.("[data-plan-recipe-id]");
    if (state.activeTab !== "plan" || !card || !root.contains(card) || !event.dataTransfer) return;
    if (!window.MentorPlanningRepository.getRecipeById(card.dataset.planRecipeId)) { event.preventDefault(); return; }
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-mentor-plan-recipe", card.dataset.planRecipeId);
    card.classList.add("is-dragging");
  });
  root?.addEventListener("dragend", () => {
    state.planDragMeal = null;
    root.querySelectorAll(".nutrition-plan-recipe-card.is-dragging, .nutrition-plan-meal.is-dragging, .nutrition-plan-segment-day.is-drop-target, .nutrition-plan-meal.is-reorder-before, .nutrition-plan-meal.is-reorder-after").forEach((node) => node.classList.remove("is-dragging", "is-drop-target", "is-reorder-before", "is-reorder-after"));
  });
  root?.addEventListener("dragover", (event) => {
    const cell = event.target.closest?.("[data-plan-drop-date]");
    if (state.activeTab !== "plan" || !cell || !root.contains(cell)) return;
    const types = Array.from(event.dataTransfer?.types || []);
    const movingMeal = types.includes("application/x-mentor-plan-meal") && state.planDragMeal;
    const copyingRecipe = types.includes("application/x-mentor-plan-recipe");
    if (!copyingRecipe && !(movingMeal && state.planDragMeal.date === cell.dataset.planDropDate && state.planDragMeal.segment === cell.dataset.planDropSegment)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = movingMeal ? "move" : "copy";
    root.querySelectorAll(".nutrition-plan-segment-day.is-drop-target").forEach((node) => { if (node !== cell) node.classList.remove("is-drop-target"); });
    cell.classList.add("is-drop-target");
    root.querySelectorAll(".nutrition-plan-meal.is-reorder-before, .nutrition-plan-meal.is-reorder-after").forEach((node) => node.classList.remove("is-reorder-before", "is-reorder-after"));
    if (movingMeal) {
      const targetMeal = event.target.closest?.("[data-plan-meal-entry-id]");
      if (targetMeal && targetMeal.dataset.planMealEntryId !== state.planDragMeal.id) {
        targetMeal.classList.add(event.clientY < targetMeal.getBoundingClientRect().top + targetMeal.getBoundingClientRect().height / 2 ? "is-reorder-before" : "is-reorder-after");
      }
    }
  });
  root?.addEventListener("dragleave", (event) => {
    const cell = event.target.closest?.("[data-plan-drop-date]");
    if (cell && !cell.contains(event.relatedTarget)) cell.classList.remove("is-drop-target");
  });
  root?.addEventListener("drop", async (event) => {
    const cell = event.target.closest?.("[data-plan-drop-date]");
    if (state.activeTab !== "plan" || !cell || !root.contains(cell)) return;
    const mealId = event.dataTransfer?.getData("application/x-mentor-plan-meal");
    if (mealId) {
      if (!state.planDragMeal || state.planDragMeal.id !== mealId || state.planDragMeal.date !== cell.dataset.planDropDate || state.planDragMeal.segment !== cell.dataset.planDropSegment) return;
      event.preventDefault();
      const originalIds = Array.from(cell.querySelectorAll("[data-plan-meal-entry-id]"), (node) => node.dataset.planMealEntryId);
      const targetMeal = event.target.closest?.("[data-plan-meal-entry-id]");
      if (targetMeal?.dataset.planMealEntryId === mealId) { state.planDragMeal = null; cell.classList.remove("is-drop-target"); return; }
      const nextIds = originalIds.filter((id) => id !== mealId);
      if (targetMeal && targetMeal.dataset.planMealEntryId !== mealId) {
        const index = nextIds.indexOf(targetMeal.dataset.planMealEntryId);
        const box = targetMeal.getBoundingClientRect();
        nextIds.splice(index + (event.clientY >= box.top + box.height / 2 ? 1 : 0), 0, mealId);
      } else nextIds.push(mealId);
      state.planDragMeal = null;
      if (nextIds.every((id, index) => id === originalIds[index])) { cell.classList.remove("is-drop-target"); return; }
      try { await window.MentorPlanningService.reorderCalendarSegment(cell.dataset.planDropDate, cell.dataset.planDropSegment, nextIds); }
      catch (error) { console.error("[Nutrition] Calendar reorder failed", error); state.notice = { type:"error", text:t("planning.reorderFailed", "Redosled obroka nije sačuvan.") }; }
      render();
      return;
    }
    const id = event.dataTransfer?.getData("application/x-mentor-plan-recipe");
    if (!id) return;
    event.preventDefault();
    cell.classList.remove("is-drop-target");
    const recipe = window.MentorPlanningRepository.getRecipeById(id);
    if (!recipe) return;
    const mealType = event.target.closest?.("[data-plan-drop-meal-type]")?.dataset.planDropMealType || cell.dataset.planDropMealType;
    window.MentorNutritionPlanningForms.openMeal(state, null, { recipeId:id, plannedDate:cell.dataset.planDropDate, mealType, servings:recipeServingsForPlan(recipe) });
    refreshModal();
  });

  root?.addEventListener("mousedown", (event) => {
    if (isNutritionLockedSelect(event.target)) markFoodSelectInteraction();
    else releaseFoodSelectInteraction();
  });

  root?.addEventListener("focusin", (event) => {
    if (isNutritionLockedSelect(event.target)) markFoodSelectInteraction();
  });

  root?.addEventListener("input", (event) => {
    if (event.target.matches("[data-plan-recipe-search]")) { state.planRecipeSearch = event.target.value; render(); }
    else if (event.target.matches("[data-inventory-food-search]")) {
      state.inventoryFoodSearch = event.target.value;
      const matches = window.MentorNutritionInventoryFormUI.searchFoods(state.inventoryFoodSearch);
      const activeSearch = String(state.inventoryFoodSearch || "").trim();
      const selectedFoodId = state.inventoryForm?.draft.foodId || "";
      if (activeSearch && matches.length === 1 && selectedFoodId !== matches[0].id) selectInventoryFood(matches[0].id);
      else if (activeSearch && selectedFoodId && !matches.some((food) => food.id === selectedFoodId)) selectInventoryFood("");
      render();
      if (activeSearch && matches.length) openNativePicker(root.querySelector('[data-inventory-field="foodId"]'));
    } else if (event.target.matches("[data-recipe-search]")) { applyRecipeFilters((filters)=>{ filters.search=event.target.value; }); }
    else if (event.target.matches("[data-recipe-metadata-minutes]")) { state.recipeForm.draft.filterMetadata.preparationMinutes=event.target.value; }
    else if (event.target.matches("[data-recipe-field]")) { const field=event.target.dataset.recipeField;if(field==="imageUrl"){state.recipeForm.draft.image.imageUrl=event.target.value;const preview=root.querySelector(".nutrition-recipe-image-fieldset .nutrition-image-preview");if(preview){preview.replaceChildren();const img=document.createElement("img");const empty=document.createElement("span");empty.textContent=t("planning.noImage","No image");img.alt="";img.src=event.target.value;img.onerror=()=>{img.remove();preview.classList.remove("has-image");};preview.append(img,empty);preview.classList.toggle("has-image",Boolean(event.target.value));}}else state.recipeForm.draft[field]=event.target.value; }
    else if (event.target.matches("[data-recipe-ingredient-field]")) { const item=state.recipeForm.draft.ingredients[Number(event.target.dataset.index)];if(item)item[event.target.dataset.recipeIngredientField]=event.target.value; }
    else if (event.target.matches("[data-meal-field]")) { state.mealPlanForm.draft[event.target.dataset.mealField]=event.target.value; }
    else if (event.target.matches("[data-inventory-field]")) updateInventoryField(event.target);
    else if (event.target.matches("[data-inventory-filter]")) { state.inventoryFilters[event.target.dataset.inventoryFilter] = event.target.value; if (event.target.matches("select") && isFoodSelectInteracting) return; render(); }
    else if (event.target.matches('[data-filter="search"]')) {
      state.search = event.target.value;
      scheduleSearchRender();
    } else if (event.target.matches("[data-food-field]")) updateFoodField(event.target);
    else if (event.target.matches("[data-shopping-field]")) updateShoppingField(event.target);
    else if (event.target.matches("[data-nutrient-index]")) { const item = state.foodForm?.draft.nutrients[Number(event.target.dataset.nutrientIndex)]; if (item) item.amount = event.target.value === "" ? null : Number(event.target.value); refreshSaveState(); }
  });

  root?.addEventListener("change", (event) => {
    const target = event.target;
    if (target.matches('[data-inventory-field="locationId"]') && target.value === "__create__") { releaseFoodSelectInteraction(); state.inventoryLocationDraft = { name:"", icon:"box" }; state.modal = { type:"inventory-location" }; render(); }
    else if (target.matches("[data-recipe-filter-option]")) { if (recipeFilterClickHandled) { recipeFilterClickHandled = false; return; } applyRecipeFilters((filters)=>{ state.recipeFilters=window.MentorRecipeFilterService.toggle(filters,target.dataset.filterGroup,target.value,target.checked); }); }
    else if (target.matches("[data-recipe-metadata-minutes]")) { state.recipeForm.draft.filterMetadata.preparationMinutes=target.value; }
    else if (target.matches("[data-recipe-field]")) { if (target.matches("select")) releaseFoodSelectInteraction();const field=target.dataset.recipeField;if(field==="imageUrl")state.recipeForm.draft.image.imageUrl=target.value;else state.recipeForm.draft[field]=target.value; }
    else if (target.matches("[data-recipe-ingredient-field]")) { if (target.matches("select")) releaseFoodSelectInteraction(); const item=state.recipeForm.draft.ingredients[Number(target.dataset.index)];if(item)item[target.dataset.recipeIngredientField]=target.value; }
    else if (target.matches("[data-meal-field]")) { if (target.matches("select")) releaseFoodSelectInteraction(); state.mealPlanForm.draft[target.dataset.mealField]=target.value; }
    else if (target.matches("[data-inventory-field]")) { if (target.matches("select")) releaseFoodSelectInteraction(); updateInventoryField(target); }
    else if (target.matches("[data-shopping-field]")) updateShoppingField(target);
    else if (target.matches("[data-inventory-filter]")) { if (target.matches("select")) releaseFoodSelectInteraction(); state.inventoryFilters[target.dataset.inventoryFilter] = target.value; render(); }
    else if (target.matches('[data-filter="search"]')) { clearSearchRenderTimer(); refreshFoodFilters(); refreshFoodResults(); }
    else if (target.matches("select[data-filter]")) { releaseFoodSelectInteraction(); clearSearchRenderTimer(); const key = target.dataset.filter, value = target.value; applyFoodFilters((filters) => { filters[key] = value; }); }
    else if (target.matches("select[data-add-nutrient]") && target.value) { releaseFoodSelectInteraction(); state.foodForm.draft.nutrients.push({ nutrientId:target.value, amount:null, dataStatus:"estimated", sourceNutrientId:null }); render(); }
    else if (target.matches("[data-food-field]")) { if (target.matches("select")) releaseFoodSelectInteraction(); updateFoodField(target); }
    else if (target.matches("[data-food-image-file]") && target.files?.[0]) {
      try { window.MentorData.repositories.media.validate(target.files[0]); clearPreview(); state.foodFormFile = target.files[0]; state.foodForm.draft.image.imageType = "local"; state.foodForm.previewUrl = URL.createObjectURL(target.files[0]); render(); }
      catch (error) { state.foodFormFile = target.files[0]; state.foodForm.errors = [{ field:"image", code:error.message.includes("large") ? "size" : "type" }]; render(); }
    }
    else if (target.matches("[data-recipe-image-file]") && target.files?.[0]) {
      try { window.MentorData.repositories.media.validate(target.files[0]);clearRecipePreview();state.recipeFormFile=target.files[0];state.recipeForm.draft.image.imageType="local";state.recipeForm.previewUrl=URL.createObjectURL(target.files[0]);state.recipeForm.errors=state.recipeForm.errors.filter((item)=>item.field!=="image");refreshModal(); }
      catch(error){state.recipeFormFile=target.files[0];state.recipeForm.errors=[...state.recipeForm.errors.filter((item)=>item.field!=="image"),{field:"image",code:error.message.includes("large")?"size":"type"}];refreshModal();}
    }
  });

  root?.addEventListener("submit", async (event) => {
    if (event.target.matches("[data-food-form]")) { event.preventDefault(); return; }
    if (event.target.matches("[data-recipe-form]")) { event.preventDefault();await saveRecipeForm();return; }
    if (event.target.matches("[data-meal-plan-form]")) { event.preventDefault();await saveMealPlanForm();return; }
    if (event.target.matches("[data-inventory-form]")) {
      event.preventDefault();
      const intent = event.submitter?.dataset.inventoryIntent || state.inventoryForm?.intent || "close";
      if (state.inventoryForm) state.inventoryForm.intent = "close";
      await saveInventory(intent);
      return;
    }
    if (event.target.matches("[data-inventory-location-form]")) {
      event.preventDefault();
      const data = new FormData(event.target);
      if (!String(data.get("name") || "").trim()) { state.inventoryLocationDraft = { ...(state.inventoryLocationDraft || {}), name:"", icon:data.get("icon") || "box", error:true }; render(); return; }
      try {
        const location = await window.MentorInventoryService.createLocation({ name:data.get("name"), icon:data.get("icon") || "box" });
        if (state.inventoryForm) {
          state.inventoryForm.draft.locationId = location.id; state.modal = { type:"inventory-form" };
        } else {
          state.inventoryFilters.locationId = location.id; state.modal = null;
        }
        state.inventoryLocationDraft = null;
        state.notice = { type:"success", text:t("inventory.notices.locationCreated", "Location created.") };
      } catch (error) { console.error("[Nutrition] Location create failed", error); state.inventoryLocationDraft = { ...(state.inventoryLocationDraft || {}), name:data.get("name"), icon:data.get("icon") || "box", error:true }; }
      render(); return;
    }
    if (event.target.matches("[data-inventory-action-form]")) {
      event.preventDefault();
      await submitInventoryActionForm(event.target);
    }
  });
  window.addEventListener("mentor:languagechange", () => { if (document.body.dataset.activeView === "nutrition") render(); });
  document.addEventListener("click", (event) => {
    if (state.planRecipeMoreOpen && !event.target.closest?.("[data-plan-recipe-more]")) { state.planRecipeMoreOpen = false; render(); }
    if (!state.recipeFilterOpen || event.target.closest?.("[data-recipe-filter-dropdown]")) return;
    closeRecipeFilterDropdown(false);
  }, true);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !state.recipeFilterOpen) return;
    event.preventDefault();
    closeRecipeFilterDropdown(true);
  });
  // Keep the filter controls mounted when the food collection changes. This mirrors
  // the Finance filters, which refresh only their result list after a filter change.
  window.addEventListener("mentor:nutrition-foodschange", () => {
    if (state.activeTab === "foods" && !state.foodForm?.saving) refreshFoodResults();
    else if (state.activeTab === "recipes" && !state.recipeForm?.saving) refreshRecipeResults();
  });
  window.addEventListener("mentor:nutrition-inventorychange", () => {
    if (favoriteSavePending && state.activeTab === "plan") return;
    if (state.activeTab === "recipes" && !state.inventoryForm?.saving && !state.recipeForm?.saving && !state.mealPlanForm?.saving) { refreshRecipeResults(); refreshRecipeDetails(); }
    else if (["fridge","plan"].includes(state.activeTab) && !state.inventoryForm?.saving && !state.recipeForm?.saving && !state.mealPlanForm?.saving) render();
  });
  window.MentorNutrition = {
    openMentorRecord(tab,id){
      state.activeTab=tab==="plan"?"plan":"recipes";
      if(state.activeTab==="recipes")state.selectedRecipe=id;
      state.modal=null;render();
    },
    activateNutrition(){
      ensureStyle();
      window.MentorInventoryRepository?.initialize?.();
      if (!hasRendered || !root?.firstElementChild?.classList.contains("nutrition-page")) render();
    },
    renderActiveNutritionTab:render,
    resetNutritionView(){ state.activeTab="overview"; state.modal=null; state.recipeFilterOpen=null; render(); }
  };
  ensureStyle();
})();
