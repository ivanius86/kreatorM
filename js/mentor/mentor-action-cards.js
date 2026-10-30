(function (root) {
  "use strict";
  const t = (key, values) => root.MentorI18n.t("mentor.actions." + key, values);
  const node = (tag, text, cls) => { const element = document.createElement(tag); if (text != null) element.textContent = text; if (cls) element.className = cls; return element; };
  function button(action, label, messageId, actionId) {
    const item = node("button", label, "ghost-btn"); item.type = "button"; item.dataset.mentorAction = action; item.dataset.messageId = messageId;
    if (actionId) item.dataset.actionId = actionId; return item;
  }
  function description(card, key, text) { if (text) { const row = node("p", null, "mentor-action-detail"); row.append(node("strong", key + " · "), document.createTextNode(text)); card.append(row); } }
  function errorText(error) {
    const code = error.code || error.message;
    return root.MentorI18n.hasTranslation("mentor.errors." + code) ? root.MentorI18n.t("mentor.errors." + code) : root.MentorI18n.t("mentor.errors.ACTION_SAVE");
  }
  function progressText(message) {
    const states = Object.values(message.actionStates || {});
    return t("weeklyProgress", { saved: states.filter(item => item.status === "approved").length, dismissed: states.filter(item => item.status === "dismissed").length, failed: states.filter(item => item.status === "failed").length, total: message.proposals.length });
  }
  function updateProgress(message) {
    document.querySelectorAll("[data-panel='mentor-plan-progress']").forEach(item => { if (item.dataset.messageId === message.id) item.textContent = progressText(message); });
  }
  function create(message, { busy = new Set(), history = [] } = {}) {
    const batch = node("section", null, "mentor-action-batch"); batch.dataset.panel = "mentor-action-batch";
    const plan = message.intent?.mealPlan;
    batch.append(node("h3", t(plan ? "weeklyTitle" : "batch", { days: plan?.days })), node("p", t("count", { count: message.proposals.length }), "mentor-action-caption"));
    if (plan) {
      batch.append(node("p", t("weeklySummary", {start: plan.startDate, end: root.MentorChatProtocol.addDaysISO(plan.startDate, plan.days - 1), meals: plan.mealTypes.length, servings: plan.servings}), "mentor-plan-summary"));
      batch.append(node("p", t("weeklyCounts", {recipes: message.proposals.filter(item => item.action === "createRecipe").length, entries: message.proposals.filter(item => item.action === "createMealPlanEntry").length}), "mentor-action-caption"));
      batch.append(node("p", t("weeklyReuse"), "mentor-action-caption"), node("p", t("catalogOnly"), "mentor-action-caption"), node("p", t("reservation"), "mentor-action-caption"));
      const progress = node("p", progressText(message), "mentor-plan-progress"); progress.dataset.panel = "mentor-plan-progress"; progress.dataset.messageId = message.id; progress.setAttribute("aria-live", "polite"); batch.append(progress);
    }
    if (message.proposals.length > 1) { const all = button("approve-actions", t(plan ? "approveWeek" : "approveAll"), message.id); all.disabled = busy.has(message.id) || message.proposals.every(item => history.some(row => row.id === item.id && ["approved", "dismissed"].includes(row.status))); batch.append(all); }
    const dayGroups = new Map();
    for (const action of message.proposals) {
      const card = node("section", null, "mentor-proposal mentor-action-card"); card.dataset.actionId = action.id;
      const heading = node("h3", action.title || action.name || t("createMealPlanEntry"));
      card.append(node("small", t(action.action)), heading);
      const outcome = history.find(item => item.id === action.id && ["approved", "dismissed"].includes(item.status));
      const saved = outcome?.status === "approved";
      const dismissed = outcome?.status === "dismissed";
      const constraints = message.intent?.constraints || {};
      const actions = node("div", null, "mentor-proposal-actions");
      let approve;
      if (saved || dismissed) {
        actions.append(node("strong", t(saved ? "saved" : "dismissed")));
        if (saved) actions.append(button("open-action", t("open"), message.id, action.id));
      } else {
        if (["createRecipe", "createMealPlanEntry"].includes(action.action) && constraints.meatPolicy === "chicken-fish-only") card.append(node("p", t("chickenFishOnly"), "mentor-action-badge"));
        approve = button("approve-action", t(busy.has(action.id) ? "saving" : "approve"), message.id, action.id);
        approve.className = "btn"; approve.disabled = busy.has(action.id) || busy.has(message.id);
        const dismiss = button("dismiss-action", t("dismiss"), message.id, action.id); dismiss.disabled = approve.disabled;
        actions.append(approve, dismiss);
      }
      if (action.action === "createIdea") {
        description(card, t("ideaType"), t(action.type));
        description(card, root.MentorI18n.t("mentor.priority"), t(action.priority));
        card.append(node("p", action.description)); if (action.tags.length) card.append(node("p", action.tags.join(" · "), "mentor-action-caption"));
      } else if (action.action === "createGoal") {
        description(card, root.MentorI18n.t("mentor.type"), root.MentorI18n.t("builder.typeLabels." + ({ "long-term": "longTerm", "short-term": "shortTerm", habit: "habit" })[action.type]));
        description(card, root.MentorI18n.t("mentor.category"), root.categoryLabel?.(action.category) || action.category);
        description(card, root.MentorI18n.t("mentor.priority"), t(action.priority));
        for (const field of ["reason", "firstAction", "targetDate", "mainMilestone", "successMeasurement", "duration", "frequency", "bestTime"]) description(card, root.MentorI18n.t("mentor." + field), action[field]);
        if (action.tasks.length) { const list = node("ul"); action.tasks.forEach(task => list.append(node("li", task.title + (task.cadence ? " · " + task.cadence : "")))); card.append(list); }
        if (action.milestones.length) { const list = node("ul"); action.milestones.forEach(item => list.append(node("li", item))); card.append(node("strong", root.MentorI18n.t("mentor.milestones")), list); }
      } else {
        if (constraints.training) card.append(node("p", t("training"), "mentor-action-badge"));
        if (constraints.excludedAllergens?.length) description(card, t("exclusions"), constraints.excludedAllergens.map(key => t("allergens." + key)).join(", "));
        description(card, t("servings"), String(action.servings));
        description(card, t("mealType"), t(action.mealType));
        if (action.action === "createRecipe") {
          if (action.sourceId === "catalog") card.append(node("p", t("catalogRecipe"), "mentor-action-caption"));
          if (action.source) {
            const image = node("img", null, "mentor-recipe-source-image"); image.src = action.source.imageUrl; image.alt = action.name; image.loading = "lazy"; image.referrerPolicy = "no-referrer";
            image.addEventListener("error", () => image.replaceWith(node("p", t("imageUnavailable"), "mentor-action-caption")), { once: true }); card.append(image);
            const source = node("a", t("source") + " · " + action.source.title); source.href = action.source.url; source.target = "_blank"; source.rel = "noopener noreferrer"; card.append(source, node("p", t(action.adapted ? "adapted" : "original"), "mentor-action-caption"));
          }
          const list = node("ul");
          action.ingredients.forEach(item => list.append(node("li", item.foodId + " · " + item.quantity + " " + item.unit)));
          card.append(node("strong", t("ingredients")), list, node("strong", t("instructions")), node("p", action.description, "mentor-action-instructions"));
          (action.resolutionRequests || []).forEach((request, index) => {
            if (request.kind === "missing") {
              card.append(node("p", t("missingFoodOptions", { name: request.name }), "mentor-action-caption"));
              const controls = node("div", null, "mentor-proposal-actions");
              const add = button("research-recipe-food", t("researchFood", { name: request.name }), message.id, action.id); add.dataset.requestIndex = String(index);
              add.disabled = saved || dismissed || busy.has(action.id) || busy.has(message.id); controls.append(add);
              for (const candidate of request.candidates) {
                const replace = button("substitute-recipe-food", t("substituteFood", { name: candidate.name }), message.id, action.id);
                replace.dataset.requestIndex = String(index); replace.dataset.foodId = candidate.id; replace.disabled = add.disabled; controls.append(replace);
              }
              card.append(controls); return;
            }
            const label = node("label", t("chooseFoodPrompt", { name: request.name }), "mentor-action-caption");
            const select = node("select"); select.dataset.mentorFoodChoice = ""; select.dataset.messageId = message.id; select.dataset.actionId = action.id; select.dataset.requestIndex = String(index);
            const empty = node("option", t("chooseFoodPlaceholder")); empty.value = ""; select.append(empty);
            request.candidates.forEach(candidate => { const option = node("option", candidate.name); option.value = candidate.id; select.append(option); });
            select.value = message.actionStates?.[action.id]?.choices?.[index] || "";
            select.disabled = saved || dismissed || busy.has(action.id) || busy.has(message.id);
            label.append(select); card.append(label);
          });
          root.MentorActionAdapters.ensure(action).then(() => {
            action.ingredients.forEach((item, index) => { const food = root.MentorFoodRepository.getById(item.foodId); if (food) list.children[index].textContent = food.defaultName + " · " + item.quantity + " " + item.unit; });
          }).catch(() => {});
        } else {
          description(card, t("date"), action.plannedDate); if (!plan) card.append(node("p", t("reservation"), "mentor-action-caption"));
        }
        const nutrition = node("div", t("loading"), "mentor-action-nutrition"); card.append(nutrition);
        // Approval waits for hydrated catalog choices and domain validation.
        // Update this control in place so completing the preview keeps focus.
        if (approve) approve.disabled = true;
        root.MentorActionAdapters.preview(action, message).then(value => {
          if (approve) approve.disabled = Boolean(value.pending || busy.has(action.id) || busy.has(message.id) || ["approved", "dismissed"].includes(message.actionStates?.[action.id]?.status));
          if (action.action === "createMealPlanEntry" && value.recipe) heading.textContent = value.recipe.name;
          if (value.pending) { nutrition.before(node("p", t("recipePending"), "mentor-action-caption")); if (approve) approve.disabled = true; }
          if (constraints.vegan) nutrition.before(node("p", t("vegan"), "mentor-action-badge"));
          if (!value.nutrition) return;
          const labels = { energyKcal: "energy", protein: "protein", carbohydrate: "carbs", totalFat: "fat" };
          nutrition.replaceChildren(node("strong", t("nutrients")));
          Object.entries(labels).forEach(([key, label]) => {
            const amount = value.nutrition.values[key];
            const text = value.nutrition.known[key] && amount != null ? Number(amount).toFixed(1) + (key === "energyKcal" ? " kcal" : " g") : t("unknown");
            nutrition.append(node("span", t(label) + ": " + text));
          });
        }).catch(error => {
          const issues = root.MentorActionAdapters.recipeIssues(action, message);
          nutrition.textContent = issues.length ? issues.join("; ") : error?.details?.length ? error.details.map(item => item.field + ": " + item.code).join("; ") : errorText(error);
          nutrition.classList.add("mentor-message-error");
          if (issues.length) nutrition.before(node("p", t("recipeFixHint"), "mentor-action-caption"));
          if (approve) { approve.disabled = true; approve.title = nutrition.textContent; }
        });
      }
      const failure = message.actionStates?.[action.id];
      if (failure?.status === "failed") card.append(node("p", errorText({ code: failure.errorCode }), "mentor-message-error"));
      card.append(actions);
      if (plan && action.action === "createMealPlanEntry") {
        card.classList.add("mentor-week-meal");
        if (!dayGroups.has(action.plannedDate)) { const group = node("section", null, "mentor-plan-day"); group.dataset.panel = "mentor-plan-day"; group.dataset.date = action.plannedDate; group.append(node("h4", action.plannedDate)); dayGroups.set(action.plannedDate, group); batch.append(group); }
        dayGroups.get(action.plannedDate).append(card);
      } else batch.append(card);
    }
    batch.append(node("p", t(plan ? "weeklyLimit" : "limited"), "mentor-action-caption"));
    return batch;
  }
  root.MentorActionCards = Object.freeze({ create, errorText, updateProgress });
})(window);
