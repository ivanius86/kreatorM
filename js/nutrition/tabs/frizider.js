(function () {
  "use strict";
  const C = window.MentorNutritionComponents;
  const icons = window.MentorNutritionIcons;
  const t = (key, fallback, params) => C.t(`inventory.${key}`, fallback, params);
  const foodName = (food) => window.MentorNutritionInventoryFormUI.foodName(food);
  const locationName = (location) => location ? (location.builtInKey ? t(`locations.${location.builtInKey}`, location.name) : location.name) : "—";
  const dateValue = (value) => value ? new Intl.DateTimeFormat(window.MentorI18n?.locale || undefined, { day:"2-digit", month:"short", year:"numeric" }).format(new Date(`${String(value).slice(0,10)}T00:00:00`)) : t("noExpiry", "No expiry");
  const formatQuantity = (value, unit) => `${new Intl.NumberFormat(window.MentorI18n?.locale || undefined, { maximumFractionDigits:3 }).format(Number(value) || 0)} ${window.MentorInventoryService.ALLOWED_PACKAGE_TYPES.includes(unit) ? t(`packageTypes.${unit}`,unit) : unit || ""}`;
  const statusLabel = (status) => status === "partially_reserved" ? t("partiallyReserved", "Partially reserved") : status === "missing" ? t("missing", "Missing") : t(`statuses.${status}`, status);
  const statusTone = (status) => ["expired","expires_today"].includes(status) ? "nutrition-tone-danger" : ["low","expiring_soon"].includes(status) ? "nutrition-tone-warning" : "";

  function expiryDays(batch) {
    if (!batch?.expiryDate) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const expiry = new Date(`${String(batch.expiryDate).slice(0,10)}T00:00:00`);
    if (Number.isNaN(expiry.getTime())) return null;
    return Math.round((expiry - today) / 86400000);
  }

  function statusLabelForBatch(batch, status) {
    const days = expiryDays(batch);
    if (days == null || status === "consumed") return statusLabel(status);
    if (days < -1) return t("expiryStatus.expiredDays", "Expired {{count}} days ago", { count: Math.abs(days) });
    if (days === -1) return t("expiryStatus.expiredYesterday", "Expired yesterday");
    if (days === 0) return t("expiryStatus.today", "Expires today");
    if (days === 1) return t("expiryStatus.tomorrow", "Expires tomorrow");
    return t("expiryStatus.inDays", "Expires in {{count}} days", { count: days });
  }

  function photo(food, size = "thumb") {
    if (!food) return `<span class="nutrition-food-icon">?</span>`;
    const image = food.image || {};
    const src = image.imageType === "url" && image.imageUrl ? `src="${C.esc(image.imageUrl)}" data-image-fallback` : image.imageType === "local" ? `data-food-image-id="${C.esc(food.id)}" data-food-image-size="${size}"` : "";
    return `<span class="nutrition-food-photo nutrition-food-photo-${size}">${src ? `<img ${src} loading="lazy" decoding="async" alt="">` : ""}<b>${C.esc(foodName(food).slice(0,1))}</b></span>`;
  }

  function matchesExpiry(batch, filter) {
    if (!filter) return true;
    if (filter === "none") return !batch.expiryDate;
    const days = expiryDays(batch);
    if (days == null) return false;
    if (filter === "expired") return days < 0;
    if (filter === "today") return days === 0;
    if (filter === "3") return days >= 0 && days <= 3;
    if (filter === "7") return days >= 0 && days <= 7;
    if (filter === "30") return days >= 0 && days <= 30;
    return true;
  }

  function allRows() {
    const service = window.MentorInventoryService, repo = window.MentorInventoryRepository;
    return repo.getBatches().map((batch) => {
      const food = service.getFood(batch.foodId), location = repo.getLocationById(batch.locationId), status = service.statusForBatch(batch);
      return { batch, food, location, status, reserved: service.reservedForBatch(batch.id, batch.unit), available: service.availableForBatch(batch) };
    });
  }

  function rows(state, source = allRows()) {
    const filters = state.inventoryFilters || {};
    const needle = String(filters.search || "").trim().toLocaleLowerCase();
    return source.filter((row) => (!needle || `${foodName(row.food)} ${row.batch.legacyFoodName || ""} ${locationName(row.location)}`.toLocaleLowerCase().includes(needle)) &&
      (!filters.locationId || row.batch.locationId === filters.locationId) && (!filters.categoryId || row.food?.categoryId === filters.categoryId) &&
      (!filters.status || row.status === filters.status) && matchesExpiry(row.batch, filters.expiry)).sort((a,b) => (a.batch.expiryDate || "9999-12-31").localeCompare(b.batch.expiryDate || "9999-12-31"));
  }

  function filters(state) {
    const current = state.inventoryFilters || {}, repo = window.MentorInventoryRepository;
    const categories = [...new Set(window.MentorFoodRepository.getAll().map((food) => food.categoryId).filter(Boolean))].sort();
    const opt = (value, label, selected) => `<option value="${C.esc(value)}" ${value === selected ? "selected" : ""}>${C.esc(label)}</option>`;
    return `<div class="nutrition-filters nutrition-inventory-filters"><label class="nutrition-search">${icons.icon("search")}<input id="nutrition-inventory-search" type="search" data-inventory-filter="search" value="${C.esc(current.search || "")}" placeholder="${C.esc(t("search", "Search inventory"))}"></label>
      <label><span class="sr-only">${C.esc(t("location", "Location"))}</span><select data-inventory-filter="locationId">${opt("",t("allLocations","All locations"),current.locationId)}${repo.getLocations().map((item)=>opt(item.id,locationName(item),current.locationId)).join("")}</select></label>
      <label><span class="sr-only">${C.esc(t("category", "Category"))}</span><select data-inventory-filter="categoryId">${opt("",t("allCategories","All categories"),current.categoryId)}${categories.map((id)=>opt(id,C.t(`foodCategories.${id}`,id),current.categoryId)).join("")}</select></label>
      <label><span class="sr-only">${C.esc(t("expiryDate", "Expiry"))}</span><select data-inventory-filter="expiry">${[["",t("allExpiries","All expiry dates")],["today",t("today","Today")],["3",t("next3","Next 3 days")],["7",t("next7","Next 7 days")],["30",t("next30","Next 30 days")],["none",t("noExpiry","No expiry")],["expired",t("expired","Expired")]].map(([v,l])=>opt(v,l,current.expiry)).join("")}</select></label>
      <label><span class="sr-only">${C.esc(t("status", "Status"))}</span><select data-inventory-filter="status">${opt("",t("allStatuses","All statuses"),current.status)}${["available","low","expiring_soon","expires_today","expired","consumed","opened","reserved"].map((id)=>opt(id,statusLabel(id),current.status)).join("")}</select></label>
      <button class="nutrition-btn nutrition-btn-primary" type="button" data-action="inventory-add">${C.esc(t("add", "Add to inventory"))}</button></div>`;
  }

  function actionMenu(batch) {
    return `<details class="nutrition-row-menu"><summary data-action="inventory-menu-toggle" aria-label="${C.esc(t("actions","Actions"))}">${icons.icon("dots")}</summary><div>${[["consume","consume"],["restock","restock"],["move","move"],["edit","edit"],["remove","remove"]].map(([action,key])=>`<button type="button" data-action="inventory-${action}" data-id="${C.esc(batch.id)}">${C.esc(t(key,key))}</button>`).join("")}</div></details>`;
  }

  function table(state, list) {
    if (!list.length) return `<div class="nutrition-table-empty"><div>${icons.icon("box")}<strong>${C.esc(t("emptyTitle","Inventory is empty"))}</strong><span>${C.esc(t("emptyText","Add your first item."))}</span><button class="nutrition-btn nutrition-btn-primary" type="button" data-action="inventory-add">${C.esc(t("add","Add to inventory"))}</button></div></div>`;
    return `<div class="nutrition-table-wrap nutrition-inventory-table is-scrollable"><table><thead><tr><th>${C.esc(t("food","Food"))}</th><th>${C.esc(t("location","Location"))}</th><th>${C.esc(t("remaining","Remaining"))}</th><th>${C.esc(t("expiryDate","Expiry date"))}</th><th>${C.esc(t("status","Status"))}</th><th><span class="sr-only">${C.esc(t("actions","Actions"))}</span></th></tr></thead><tbody>${list.map(({batch,food,location,status})=>`<tr class="${state.selectedStock === batch.id ? "selected" : ""}" data-action="inventory-select" data-id="${C.esc(batch.id)}"><td><div class="nutrition-name">${photo(food)}<div><strong>${C.esc(food ? foodName(food) : batch.legacyFoodName || t("orphan","Unlinked food"))}</strong>${!food ? `<small>${C.esc(t("needsLink","Manual linking required"))}</small>` : ""}</div></div></td><td>${C.esc(locationName(location))}</td><td>${C.esc(formatQuantity(batch.quantity,batch.unit))}</td><td>${C.esc(dateValue(batch.expiryDate))}</td><td><span class="nutrition-badge ${statusTone(status)}">${C.esc(statusLabelForBatch(batch,status))}</span></td><td>${actionMenu(batch)}</td></tr>`).join("")}</tbody></table></div>`;
  }

  function locationPanels(state, source) {
    const current = state.inventoryFilters?.locationId || "";
    const assets = { fridge:"fridge", freezer:"freezer", pantry:"pantry" };
    const cards = window.MentorInventoryRepository.getLocations().map((location) => {
      const items = source.filter((row) => row.batch.locationId === location.id);
      const expiring = items.filter((row) => {
        const days = expiryDays(row.batch);
        return days != null && days >= 0 && days <= 7;
      }).length;
      const tone = expiring ? t("locationPanel.expiring", "{{count}} expiring soon", { count: expiring }) : t("locationPanel.allGood", "All good");
      return `<div class="nutrition-location-card"><button type="button" class="${current === location.id ? "active" : ""}" data-action="inventory-location-filter" data-location-id="${C.esc(location.id)}" aria-pressed="${current === location.id}">
        <span class="nutrition-location-icon">${icons.icon(location.icon || "box")}</span><span class="nutrition-location-copy"><strong>${C.esc(locationName(location))}</strong><small>${C.esc(t("locationPanel.products", "{{count}} products", { count: items.length }))}</small><em>${icons.icon(expiring ? "clock" : "check")} ${C.esc(tone)}</em></span>${assets[location.builtInKey] ? `<img class="nutrition-location-image" src="assets/nutrition/${assets[location.builtInKey]}.png" alt="" decoding="async">` : ""}
      </button><button type="button" class="nutrition-location-delete" data-action="inventory-location-delete" data-location-id="${C.esc(location.id)}" title="${C.esc(t("locationPanel.remove", "Delete location"))}" aria-label="${C.esc(t("locationPanel.removeNamed", "Delete location: {{name}}", { name:locationName(location) }))}">${icons.icon("trash")}</button></div>`;
    }).join("");
    return `<section class="nutrition-inventory-locations-panel" data-panel="inventory-locations" aria-label="${C.esc(t("locationPanel.title", "Locations"))}"><div class="nutrition-inventory-locations">${cards}</div><div class="nutrition-inventory-panel-action"><button type="button" class="nutrition-btn" data-action="inventory-location-create" title="${C.esc(t("locationPanel.create", "Create location"))}">${icons.icon("plus")}<span class="nutrition-location-create-text">${C.esc(t("locationPanel.create", "Create location"))}</span></button></div></section>`;
  }

  function expiringPanel(source) {
    const list = source.map((row) => ({ ...row, days: expiryDays(row.batch) })).filter((row) => row.days != null && row.days >= 0 && row.days <= 7).sort((a,b) => a.days - b.days || String(a.batch.expiryDate || "").localeCompare(String(b.batch.expiryDate || ""))).slice(0, 6);
    const body = list.length ? `<div class="nutrition-inventory-expiring-list">${list.map(({batch,food,location,status,available})=>`<button type="button" data-action="inventory-select" data-id="${C.esc(batch.id)}">
      ${photo(food)}<span><strong>${C.esc(food ? foodName(food) : batch.legacyFoodName || t("orphan","Unlinked food"))}</strong><small>${C.esc(formatQuantity(available,batch.unit))} · ${C.esc(locationName(location))}</small><em class="${statusTone(status)}">${C.esc(dateValue(batch.expiryDate))}</em></span>
    </button>`).join("")}</div>` : `<div class="nutrition-table-empty nutrition-inventory-small-empty"><div>${icons.icon("clock")}<strong>${C.esc(t("expiringPanel.empty", "No items expiring soon."))}</strong></div></div>`;
    return C.panel(t("expiringPanel.title", "Expiring soon"), body, "nutrition-inventory-expiring-panel");
  }

  function details(state, list) {
    let batch = list.find((item) => item.batch.id === state.selectedStock)?.batch || null;
    if (!batch && list[0]) { batch = list[0].batch; state.selectedStock = batch.id; }
    if (!batch) state.selectedStock = null;
    if (!batch) return `<div class="nutrition-detail nutrition-inventory-detail-empty">${C.esc(t("selectHint","Select an item to see details."))}</div>`;
    const service = window.MentorInventoryService, food = service.getFood(batch.foodId), location = window.MentorInventoryRepository.getLocationById(batch.locationId), status = service.statusForBatch(batch);
    const nutrition = food ? window.MentorFoodNutritionService.details(food.id) : null;
    const macros = nutrition ? `<div class="nutrition-stock-macros" aria-label="${C.esc(C.t("foodsUi.per100", "per 100 g"))}">${[["energyKcal","calories","kcal"],["protein","protein","g"],["totalFat","fat","g"],["carbohydrate","carbs","g"]].map(([code,key,unit]) => {
      const amount = nutrition.byCode.get(code)?.amount;
      const formatted = amount == null ? C.t("foodsUi.noData", "No data") : `${new Intl.NumberFormat(window.MentorI18n?.locale || undefined, { maximumFractionDigits:1 }).format(amount)} ${unit}`;
      return `<div><span>${C.esc(C.t(`foodsUi.${key}`, key))}</span><strong>${C.esc(formatted)}</strong></div>`;
    }).join("")}<small>${C.esc(C.t("foodsUi.per100", "per 100 g"))}</small></div>` : "";
    const relatedBatches = service.getBatchesForFood(batch.foodId), compatibleBatches = relatedBatches.filter((item)=>window.MentorNutritionUnitConversion.isCompatible(item.unit,batch.unit));
    const total = compatibleBatches.reduce((sum,item)=>sum+window.MentorNutritionUnitConversion.convert(item.quantity,item.unit,batch.unit),0), reserved = compatibleBatches.reduce((sum,item)=>sum+window.MentorNutritionUnitConversion.convert(service.reservedForBatch(item.id,item.unit),item.unit,batch.unit),0), available = Math.max(0,total-reserved);
    return `<div class="nutrition-detail nutrition-inventory-detail">${photo(food,"preview")}<h3>${C.esc(food ? foodName(food) : batch.legacyFoodName || t("orphan","Unlinked food"))}</h3><span class="nutrition-badge ${statusTone(status)}">${C.esc(statusLabelForBatch(batch,status))}</span>
      ${macros}<div class="nutrition-summary-grid">${C.summary(t("total","Total"),formatQuantity(total,batch.unit))}${C.summary(t("reserved","Reserved"),formatQuantity(reserved,batch.unit),"purple")}${C.summary(t("free","Available"),formatQuantity(available,batch.unit))}${C.summary(t("batches","Batches"),relatedBatches.length)}</div>
      <dl><dt>${C.esc(t("location","Location"))}</dt><dd>${C.esc(locationName(location))}</dd><dt>${C.esc(t("purchaseDate","Purchase date"))}</dt><dd>${C.esc(batch.purchaseDate ? dateValue(batch.purchaseDate) : "—")}</dd><dt>${C.esc(t("expiryDate","Expiry date"))}</dt><dd>${C.esc(dateValue(batch.expiryDate))}</dd><dt>${C.esc(t("openedDate","Opened date"))}</dt><dd>${C.esc(batch.openedDate ? dateValue(batch.openedDate) : "—")}</dd><dt>${C.esc(t("store","Store"))}</dt><dd>${C.esc(batch.storeName || "—")}</dd><dt>${C.esc(t("price","Price"))}</dt><dd>${C.esc(batch.totalPrice != null ? `${batch.totalPrice} ${batch.currency || "EUR"}` : "—")}</dd></dl>
      <div class="nutrition-inventory-detail-actions">${[["consume","consume"],["edit","edit"],["move","move"],["remove","remove"]].map(([action,key])=>`<button type="button" class="nutrition-btn" data-action="inventory-${action}" data-id="${C.esc(batch.id)}">${C.esc(t(key,key))}</button>`).join("")}</div>
      </div>`;
  }

  function fridge(state) {
    window.MentorInventoryRepository.initialize();
    const source = allRows();
    const list = rows(state, source);
    return `${state.notice ? `<div class="nutrition-notice nutrition-notice-${C.esc(state.notice.type)}" role="status">${C.esc(state.notice.text)}</div>` : ""}${filters(state)}${locationPanels(state,source)}<div class="nutrition-dashboard-grid nutrition-inventory-layout"><div data-panel="inventory-main">${C.panel(t("allFoods","All foods"),table(state,list),"nutrition-inventory-stock-panel")}${expiringPanel(list)}</div><aside data-panel="inventory-details">${C.panel(t("details","Food details"),details(state,list),"nutrition-inventory-overview-panel")}</aside></div>`;
  }

  window.MentorNutritionTabs = window.MentorNutritionTabs || {};
  window.MentorNutritionTabs.fridge = fridge;
})();
