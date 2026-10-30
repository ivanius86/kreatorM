(function (root) {
  "use strict";

  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));

  function repository() {
    const goals = root.MentorData?.repositories?.goals;
    if (!goals) throw new Error("GoalsRepository is unavailable.");
    return goals;
  }

  function templates() {
    return Array.isArray(root.GOAL_SAMPLE_TEMPLATES) ? root.GOAL_SAMPLE_TEMPLATES : [];
  }

  function isSampleTemplate(goal) {
    return templates().some((template) => String(template.id) === String(goal?.id));
  }

  function getSourceTemplateId(goal) {
    if (!goal) return null;
    if (goal.sourceTemplateId && templates().some((template) => String(template.id) === String(goal.sourceTemplateId))) {
      return goal.sourceTemplateId;
    }
    const comparableFields = ["type", "title", "category", "firstAction"];
    const legacyTemplate = templates().find((template) => comparableFields.every((field) => (
      String(template?.[field] || "").trim().toLocaleLowerCase()
        === String(goal?.[field] || "").trim().toLocaleLowerCase()
    )));
    return legacyTemplate?.id || null;
  }

  function composeGoalView(durableGoals) {
    const durable = clone(Array.isArray(durableGoals) ? durableGoals : []);
    const sampleTemplates = clone(templates());
    const durableByTemplateId = new Map();
    const dismissedTemplateIds = new Set();

    durable.forEach((goal) => {
      const sourceTemplateId = getSourceTemplateId(goal);
      if (!sourceTemplateId) return;
      if (goal.isTemplateDismissal) {
        dismissedTemplateIds.add(String(sourceTemplateId));
        return;
      }
      durableByTemplateId.set(String(sourceTemplateId), goal);
    });

    const consumedDurableIds = new Set();
    const visibleTemplates = sampleTemplates.flatMap((template) => {
      if (dismissedTemplateIds.has(String(template.id))) return [];
      const replacement = durableByTemplateId.get(String(template.id));
      if (!replacement) return [template];
      consumedDurableIds.add(String(replacement.id));
      return [replacement];
    });
    const customGoals = durable.filter((goal) => (
      !goal?.isTemplateDismissal && !consumedDurableIds.has(String(goal?.id))
    ));
    return visibleTemplates.concat(customGoals);
  }

  function syncAppState(appState) {
    appState.goals = composeGoalView(repository().getAll());
    return appState.goals;
  }

  async function hydrateAppState(appState) {
    await repository().initialize();
    appState.goals = composeGoalView(repository().getAll());
    return appState.goals;
  }

  async function createGoal(goal, appState) {
    const saved = await repository().create(clone(goal));
    syncAppState(appState);
    return saved;
  }

  async function createGoalIfAbsent(goal, appState) {
    const saved = await repository().createIfAbsent(clone(goal));
    syncAppState(appState);
    return saved;
  }

  function createCopy(goal) {
    const now = new Date().toISOString();
    return {
      ...clone(goal),
      id: typeof root.createId === "function"
        ? root.createId("goal")
        : "goal-" + Date.now() + "-" + Math.random().toString(16).slice(2),
      sourceTemplateId: goal.id,
      createdAt: now,
      updatedAt: now
    };
  }

  async function materializeForWrite(goal, appState) {
    if (!isSampleTemplate(goal)) return clone(goal);
    if (repository().deferMaterializedWrite === true) return createCopy(goal);
    const saved = await repository().create(createCopy(goal));
    syncAppState(appState);
    return saved;
  }

  async function saveGoal(goal, patch, appState) {
    const isSample = isSampleTemplate(goal);
    const base = isSample ? createCopy(goal) : clone(goal);
    const next = {
      ...base,
      ...clone(patch || {}),
      updatedAt: new Date().toISOString()
    };
    const saved = isSample
      ? await repository().create(next)
      : await repository().upsert(next);
    syncAppState(appState);
    return saved;
  }

  async function dismissSampleTemplate(goalOrTemplateId, appState) {
    const templateId = typeof goalOrTemplateId === "object"
      ? (getSourceTemplateId(goalOrTemplateId) || goalOrTemplateId?.id)
      : goalOrTemplateId;
    const sourceTemplate = templates().find((template) => String(template.id) === String(templateId));
    if (!sourceTemplate) return false;

    const now = new Date().toISOString();
    await repository().upsert({
      ...clone(sourceTemplate),
      id: "dismissed-template-" + String(templateId),
      sourceTemplateId: templateId,
      isTemplateDismissal: true,
      createdAt: now,
      updatedAt: now
    });
    syncAppState(appState);
    return true;
  }

  root.MentorGoalsService = Object.freeze({
    hydrateAppState,
    createGoal,
    createGoalIfAbsent,
    materializeForWrite,
    saveGoal,
    isSampleTemplate,
    composeGoalView,
    getSourceTemplateId,
    dismissSampleTemplate
  });
})(typeof window !== "undefined" ? window : globalThis);
