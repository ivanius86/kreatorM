(function (root) {
  "use strict";
  const protocol = root.MentorChatProtocol;
  const inFlight = new Map();
  function fail(code) { const error = new Error(code); error.code = code; throw error; }
  function entityId(action) { return ({ createGoal: "mentor-goal-", createIdea: "mentor-idea-", createRecipe: "mentor-recipe-", createMealPlanEntry: "mentor-meal-" })[action.action] + action.id; }
  async function ensure(action) {
    await root.MentorAppReadyPromise;
    if (action.action === "createIdea") await root.MentorLazy.loadFeature("brainstorming");
    if (["createRecipe", "createMealPlanEntry"].includes(action.action)) await root.MentorLazy.loadFeature("nutrition");
  }
  function existing(action) {
    const id = entityId(action);
    if (action.action === "createGoal") return root.MentorData.repositories.goals.getById(id);
    if (action.action === "createIdea") return root.MentorData.repositories.ideas.isReady() ? root.MentorData.repositories.ideas.getById(id) : null;
    if (action.action === "createRecipe") return root.MentorPlanningRepository?.getRecipeById(id);
    return root.MentorPlanningRepository?.getMealPlanEntryById(id);
  }
  function history(rows) {
    const result = new Map();
    rows.forEach(message => (message.proposals || []).forEach(action => {
      const status = message.actionStates?.[action.id]?.status;
      const row = { id: action.id, authorizationId: action.authorizationId, action: action.action, status: ["approved", "dismissed"].includes(status) ? status : "pending" };
      const previous = result.get(action.id);
      result.delete(action.id);
      result.set(action.id, row.status === "pending" && previous?.status !== "pending" && previous ? previous : row);
    }));
    return [...result.values()].slice(-100);
  }
  function cloudRows(rows) {
    const localUserIds = new Set(rows.filter(row => row.role === "assistant" && row.contextPolicy === "local-only").map(row => row.replyTo));
    return rows.filter(row => row.contextPolicy !== "local-only" && !localUserIds.has(row.id));
  }
  function mealPlanContext(text, rows) {
    if (!/\b(plan\w*|isplanir\w*|ishran\w*|obrok\w*|recep(?:t\w*|at\w*)|jelovnik\w*|meal\w*|doruc\w*|ruc\w*|vecer\w*|uzin\w*|palacink\w*|moze|nastavi\w*|continue|naravno|potvrd\w*|ok|da)\b/i.test(String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, ""))) return [];
    const result = []; let chars = 0;
    const cloud = cloudRows(rows), sourceId = lastSavedPlan(rows)?.sourceMessageId;
    const sourceIndex = sourceId ? cloud.findIndex(row => row.id === sourceId) : -1;
    const relevant = sourceIndex < 0 ? cloud : cloud.slice(sourceIndex);
    for (const row of relevant.filter(item => item.role === "user").slice(-16).reverse()) {
      if (chars + row.text.length > 16000) break;
      chars += row.text.length;
      const capturedDate = row.requestSnapshot?.planningDate || (row.createdAt ? protocol.localDateISO(row.createdAt) : null);
      result.unshift({id:row.id,text:row.text,...(capturedDate ? {planningDate:capturedDate} : {})});
    }
    return result;
  }
  function lastSavedPlan(rows) {
    const message = [...cloudRows(rows)].reverse().find(row => row.role === "assistant" && row.intent?.mealPlan && (row.proposals || []).some(action => action.action === "createMealPlanEntry" && row.actionStates?.[action.id]?.status === "approved"));
    if (!message) return null;
    const plan = message.intent.mealPlan;
    const occupiedSlots = message.proposals.filter(action => action.action === "createMealPlanEntry" && message.actionStates?.[action.id]?.status === "approved").map(action => ({ plannedDate: action.plannedDate, mealType: action.mealType }));
    return { sourceMessageId: message.intent.sourceMessageId, plan, occupiedSlots };
  }
  async function prepareContext(text, rows) {
    const normalized = String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const commandsMeal = /\b(meal\s*plan|plan\w*\s+(?:za\s+)?(?:obrok\w*|ishran\w*)|jelovnik\w*|obrok\w*|ishran\w*)\b/.test(normalized) && /\b(make|create|schedule|add|plan|napravi\w*|kreiraj\w*|planiraj\w*|isplaniraj\w*|dodaj\w*)\b/.test(normalized);
    const extendsPlan = /\b(napravi\w*|dodaj\w*|isplaniraj\w*|planiraj\w*|dopuni\w*)\b/.test(normalized) && /\b(doruc\w*|ruc\w*|vecer\w*|uzin\w*)\b/.test(normalized);
    const priorUser = cloudRows(rows).filter(row => row.role === "user").at(-2);
    const answersPlan = /^(?:moze|mozes|da|ok|u redu|yes|sure)\b/.test(normalized) && priorUser && /\b(napravi\w*|dodaj\w*|isplaniraj\w*|planiraj\w*|dopuni\w*)\b/.test(String(priorUser.text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()) && /\b(doruc\w*|ruc\w*|vecer\w*|uzin\w*)\b/.test(String(priorUser.text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
    if (commandsMeal || extendsPlan || answersPlan) {
      await root.MentorLazy.loadFeature("nutrition");
      const constraints = protocol.conversationConstraints(rows);
      return root.MentorPlanningRepository.getRecipes().filter(recipe => { try { root.MentorPlanningService.assertConstraints(recipe, constraints); return true; } catch (_) { return false; } }).slice(0, 20).map(recipe => ({ id: recipe.id, name: recipe.name, servings: recipe.servings, mealType: recipe.mealType }));
    }
    const last = [...rows].reverse().find(row => row.role === "user" && row.requestSnapshot?.recipeContext?.length);
    return last?.requestSnapshot?.recipeContext || [];
  }
  async function prepareFoodContext(text, authorize) {
    const value = String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (!/\b(recep(?:t\w*|at\w*)|recipe\w*|recipies?|obrok\w*|meal\w*|ishran\w*)\b/.test(value) || !/\b(napravi\w*|kreiraj\w*|dodaj\w*|pripremi\w*|generisi\w*|planiraj\w*|isplaniraj\w*|pronadji\w*|predlozi\w*|zelim|create|make|add|prepare|generate|plan|give|find|suggest|want|daj)\b/.test(value)) return [];
    if (typeof authorize !== "function" || authorize() !== true) return [];
    await root.MentorLazy.loadFeature("nutrition");
    const normalized = name => String(name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const matching = new Set((root.MentorNutritionRead?.foodCandidates?.(text) || []).map(food => food.id));
    const named = food => [food.defaultName, food.names?.sr, food.names?.en].some(name => name && value.includes(normalized(name)));
    const priority = food => Number(named(food)) * 2 + Number(matching.has(food.id));
    return root.MentorFoodRepository.getUserFoods().filter(food => food.status === "active").sort((a, b) => priority(b) - priority(a) || String(b.createdAt || "").localeCompare(String(a.createdAt || ""))).slice(0, 20).map(food => ({
      id: food.id, name: food.defaultName.slice(0, 150), englishName: (food.names?.en || food.slug || food.defaultName).slice(0, 150),
      categoryId: food.categoryId || "other", preparationState: food.preparationState || "other", vegan: food.filterProfile?.dietary?.vegan || "unknown",
      allergens: Object.fromEntries(["gluten", "dairy", "lactose", "egg", "nuts", "soy", "sesame"].map(key => [key, food.filterProfile?.allergens?.[key] || "unknown"]))
    }));
  }
  function resolveRecipe(action, message) {
    if (!action.recipeId.startsWith("$recipe:")) return action.recipeId;
    const recipe = message.proposals.filter(item => item.action === "createRecipe")[Number(action.recipeId.split(":")[1])];
    if (!recipe) fail("RECIPE_PREREQUISITE");
    return message.actionStates?.[recipe.id]?.entityId || entityId(recipe);
  }
  function checkBudget(message, action, rows) {
    const intent = protocol.validateIntent(message.intent);
    const budget = intent?.requests.find(item => item.action === action.action);
    if (!budget || action.authorizationId !== intent.id || !action.id.startsWith(intent.id + "_" + action.action + "_")) fail("ACTION_NOT_AUTHORIZED");
    const origin = rows.find(row => row.role === "user" && (row.id === intent.sourceMessageId || row.id === message.replyTo));
    if (!origin || !origin.text.includes(intent.evidence)) {
      const actual = rows.find(row => row.role === "user" && row.text.includes(intent.evidence));
      if (!actual) fail("ACTION_NOT_AUTHORIZED");
    }
    const ordinal = Number(action.id.slice((intent.id + "_" + action.action + "_").length));
    if (!Number.isInteger(ordinal) || ordinal < 0 || ordinal >= budget.count || message.proposals.length > protocol.proposalLimit(intent)) fail("ACTION_NOT_AUTHORIZED");
    const used = history(rows).filter(row => row.authorizationId === intent.id && row.action === action.action && row.id !== action.id && ["approved", "dismissed"].includes(row.status));
    if (used.length >= budget.count) fail("ACTION_LIMIT");
    if (["createRecipe", "createMealPlanEntry"].includes(action.action)) {
      const latestUser = rows.filter(row => row.role === "user").at(-1);
      if (latestUser?.id !== message.replyTo) fail("ACTION_STALE");
    }
    if (intent.mealPlan && action.action === "createMealPlanEntry") {
      const plan = intent.mealPlan;
      const dates = Array.from({length: plan.days}, (_, index) => protocol.addDaysISO(plan.startDate, index));
      if (!dates.includes(action.plannedDate) || !plan.mealTypes.includes(action.mealType) || action.servings !== plan.servings) fail("ACTION_NOT_AUTHORIZED");
    }
    return intent.constraints;
  }
  function resolvedRecipe(action, message) {
    const issues = new Set(action.unresolved || []);
    const ingredients = action.ingredients.map(item => ({ ...item }));
    const choices = message.actionStates?.[action.id]?.choices || {};
    (action.resolutionRequests || []).forEach((request, index) => {
      if (request.kind === "missing") return;
      const id = choices[index];
      if (!id) return;
      if (!request.candidates.some(candidate => candidate.id === id)) fail("UNRESOLVED_RECIPE");
      const food = root.MentorFoodRepository?.getById?.(id);
      if (!food || food.status !== "active") fail("UNRESOLVED_RECIPE");
      const selected = { foodId: id, name: food.defaultName, quantity: request.quantity, unit: request.unit };
      if (request.targetIndex == null) ingredients.push(selected);
      else if (ingredients[request.targetIndex]) ingredients[request.targetIndex] = selected;
      else fail("UNRESOLVED_RECIPE");
      issues.delete(request.issue);
    });
    return { ingredients, issues: [...issues] };
  }
  function recipeIssues(action, message) {
    if (action.action !== "createRecipe") return [];
    try { return resolvedRecipe(action, message).issues; } catch (_) { return action.unresolved || []; }
  }
  function recipeValue(action, message) {
    if (action.sourceId === "catalog" ? action.source != null || !action.adapted : !action.source || action.source.id !== action.sourceId) fail("UNRESOLVED_RECIPE");
    const resolved = resolvedRecipe(action, message);
    if (resolved.issues.length || !resolved.ingredients.length || resolved.ingredients.length > 20) fail("UNRESOLVED_RECIPE");
    return { name: action.name, description: action.description, servings: action.servings, mealType: action.mealType, ingredients: resolved.ingredients.map(item => ({ foodId: item.foodId, quantity: item.quantity, unit: item.unit })), source: action.source || { provider: "Mentor", id: "catalog", adapted: true }, mentorSource: { conversationId: message.conversationId, actionId: action.id } };
  }
  async function preview(action, message) {
    await ensure(action);
    if (action.action === "createRecipe") {
      const value = recipeValue(action, message);
      root.MentorPlanningService.assertConstraints(value, message.intent?.constraints);
      const validation = root.MentorPlanningService.validateRecipe(value);
      if (!validation.valid) { const error = new Error("INVALID_RECIPE"); error.code = "INVALID_RECIPE"; error.details = validation.errors; throw error; }
      return { recipe: value, nutrition: root.MentorMealPlanSelectors.recipeNutrition(value, 1), profile: root.MentorRecipeProfileService.deriveRecipeProfile(value) };
    }
    if (action.action === "createMealPlanEntry") {
      let recipe = root.MentorPlanningRepository.getRecipeById(resolveRecipe(action, message));
      let pending = false;
      if (!recipe && action.recipeId.startsWith("$recipe:")) {
        const proposal = message.proposals.filter(item => item.action === "createRecipe")[Number(action.recipeId.split(":")[1])];
        if (!proposal || message.actionStates?.[proposal.id]?.status === "dismissed") fail("RECIPE_PREREQUISITE");
        recipe = recipeValue(proposal, message); pending = true;
      }
      if (!recipe) fail("RECIPE_PREREQUISITE");
      root.MentorPlanningService.assertConstraints(recipe, message.intent?.constraints);
      return { recipe, pending, nutrition: root.MentorMealPlanSelectors.recipeNutrition(recipe, 1) };
    }
    return {};
  }
  async function save(action, message, constraints) {
    const id = entityId(action);
    if (action.action === "createGoal") {
      const goal = root.MentorGoalProposals.toGoal(action, action.id, message.conversationId);
      const saved = await root.MentorGoalsService.createGoalIfAbsent(goal, root.appState);
      root.dispatchEvent(new root.CustomEvent("mentor:goal-saved", { detail: { goalId: saved.id } }));
      return saved;
    }
    if (action.action === "createIdea") {
      const repository = root.MentorData.repositories.ideas;
      const count = repository.getAll().length;
      const saved = await repository.createIfAbsent({ id, title: action.title, description: action.description, type: action.type === "business" ? "Poslovna" : "Kreativna", priority: ({ low: "Nizak", medium: "Srednji", high: "Visok" })[action.priority], status: "seed", energy: 5, image: "", links: [], tags: action.tags, x: 80 + count % 4 * 180, y: 80 + Math.floor(count / 4) * 140, layer: count + 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), mentorSource: { conversationId: message.conversationId, actionId: action.id } });
      root.Brainstorming.syncIdeasFromRepository();
      return saved;
    }
    if (action.action === "createRecipe") {
      const value = recipeValue(action, message);
      root.MentorPlanningService.assertConstraints(value, constraints);
      if (existing(action)) return existing(action);
      let file = null;
      try {
        const response = action.source?.imageUrl ? await fetch(action.source.imageUrl, { signal: AbortSignal.timeout(12000) }) : null;
        if (response?.ok && /^image\/(jpeg|png|webp)$/.test(response.headers.get("content-type") || "")) {
          const blob = await response.blob();
          if (blob.size > 0 && blob.size <= 2097152) {
            const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" })[blob.type];
            if (extension) file = new File([blob], "recipe-" + action.sourceId + "." + extension, { type: blob.type });
          }
        }
      } catch (_) { /* A recipe remains valid without a source image. */ }
      if (file) {
        try {
          const metadata = await root.MentorData.repositories.media.saveEntity("recipe", id, file);
          value.image = { imageType: "local", imageUrl: null, localImageId: metadata.imageId, thumbnailId: metadata.imageId };
          value.imageMeta = metadata;
        } catch (_) { await root.MentorData.repositories.media.removeEntity("recipe", id).catch(() => {}); file = null; }
      }
      try { return await root.MentorPlanningService.createRecipeIfAbsent(value, id, constraints, file ? { imageFile: file } : {}); }
      catch (error) { if (file) await root.MentorData.repositories.media.removeEntity("recipe", id).catch(() => {}); throw error; }
    }
    const recipeId = resolveRecipe(action, message);
    return root.MentorPlanningService.createMealPlanEntryIfAbsent({ ...action, recipeId, exclusiveSlot: Boolean(message.intent?.mealPlan), mentorSource: { conversationId: message.conversationId, actionId: action.id } }, id, constraints);
  }
  async function execute(chatRepository, messageId, actionId, decision) {
    if (inFlight.has(actionId)) return inFlight.get(actionId);
    const operation = async () => {
      const message = await chatRepository.getMessage(messageId);
      const conversation = message && await chatRepository.get(message.conversationId);
      if (!conversation) fail("CONVERSATION_DELETED");
      if (conversation.lease?.expiresAt > Date.now()) fail("BUSY");
      const action = protocol.validateProposal(message.proposals?.find(item => item.id === actionId));
      if (!action?.id) fail("INVALID_REQUEST");
      await ensure(action);
      const rows = await chatRepository.messages(message.conversationId);
      const final = history(rows).find(row => row.id === actionId && ["approved", "dismissed"].includes(row.status));
      if (final) return { status: final.status, entityId: message.actionStates?.[action.id]?.entityId || entityId(action) };
      if (decision === "dismiss") {
        if (existing(action)) fail("STALE_REQUEST");
        await chatRepository.setActionState(messageId, action.id, { status: "dismissed" });
        return { status: "dismissed" };
      }
      const constraints = checkBudget(message, action, rows);
      await preview(action, message);
      await chatRepository.setActionState(messageId, action.id, { status: "executing" });
      try {
        const saved = await save(action, message, constraints);
        await chatRepository.setActionState(messageId, action.id, { status: "approved", entityId: saved.id });
        return { status: "approved", entityId: saved.id };
      } catch (error) {
        await chatRepository.setActionState(messageId, action.id, { status: "failed", errorCode: error.code || error.message }).catch(() => {});
        if (!error.code && /^(DIET_CONFLICT|RECIPE_PREREQUISITE|INVALID_RECIPE|INVALID_MEAL_PLAN)$/.test(error.message)) error.code = error.message;
        throw error;
      }
    };
    const lockedOperation = async () => { const message = await chatRepository.getMessage(messageId); if (!message) fail("CONVERSATION_DELETED"); return chatRepository.withConversationLock(message.conversationId, operation); };
    const task = Promise.resolve().then(() => root.navigator?.locks?.request ? root.navigator.locks.request("mentor-action-" + actionId, lockedOperation) : lockedOperation()).catch(error => { if (!error.code && /^(DIET_CONFLICT|RECIPE_PREREQUISITE|INVALID_RECIPE|INVALID_MEAL_PLAN)$/.test(error.message)) error.code = error.message; throw error; }).finally(() => inFlight.delete(actionId));
    inFlight.set(actionId, task); return task;
  }
  async function open(action, message) {
    await ensure(action);
    if (action.action === "createGoal") return root.setView("planner");
    if (action.action === "createIdea") { await root.setView("brainstorming"); root.Brainstorming.openIdeaPreview(entityId(action)); return; }
    await root.setView("nutrition"); root.MentorNutrition.openMentorRecord(action.action === "createRecipe" ? "recipes" : "plan", entityId(action));
  }
  async function checkPlan(message) {
    if (!message.intent?.mealPlan) return;
    const entries = message.proposals.filter(item => item.action === "createMealPlanEntry");
    if (!entries.length) fail("INVALID_MEAL_PLAN");
    await ensure(entries[0]);
    for (const recipe of message.proposals.filter(item => item.action === "createRecipe")) await preview(recipe, message);
    const saved = root.MentorPlanningRepository.getMealPlanEntries();
    for (const entry of entries) if (saved.some(item => item.id !== entityId(entry) && item.plannedDate === entry.plannedDate && item.mealType === entry.mealType)) fail("MEAL_SLOT_OCCUPIED");
  }
  root.MentorActionAdapters = Object.freeze({ entityId, ensure, existing, history, prepareContext, prepareFoodContext, preview, execute, open, checkPlan, cloudRows, mealPlanContext, lastSavedPlan, recipeIssues });
})(typeof window !== "undefined" ? window : globalThis);
