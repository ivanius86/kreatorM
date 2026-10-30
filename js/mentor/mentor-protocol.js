(function (root, factory) {
  "use strict";
  const protocol = factory();
  if (typeof module === "object" && module.exports) module.exports = protocol;
  else root.MentorChatProtocol = protocol;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const LIMITS = Object.freeze({ MESSAGE_CHARS: 4000, REPLY_CHARS: 12000, CONTEXT_MESSAGES: 24, CONTEXT_CHARS: 24000, BODY_BYTES: 98304, OUTPUT_TOKENS: 3072 });
  const TYPES = ["long-term", "short-term", "habit"];
  const CATEGORIES = ["Personal Growth", "Health & Energy", "Career & Work", "Finance", "Relationships & Family", "Other"];
  const ACTIONS = ["createGoal", "createIdea", "createRecipe", "createMealPlanEntry"];
  const MEALS = ["breakfast", "lunch", "dinner", "snack"];
  const ALLERGENS = ["gluten", "dairy", "lactose", "egg", "nuts", "soy", "sesame"];
  function fail(code) { const error = new Error(code); error.code = code; throw error; }
  function object(value, code) { if (!value || typeof value !== "object" || Array.isArray(value)) fail(code); }
  function string(value, max, code, required) {
    if (value == null && !required) return "";
    if (typeof value !== "string" || value.length > max || (required && !value.trim())) fail(code);
    return value.trim();
  }
  function choice(value, allowed, code) { if (!allowed.includes(value)) fail(code); return value; }
  function date(value, code) {
    if (value == null || value === "") return null;
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(code);
    const parsed = new Date(value + "T00:00:00Z");
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) fail(code);
    return value;
  }
  function integer(value, min, max, code) { if (!Number.isInteger(value)) fail(code); return number(value, min, max, code); }
  function mealTypes(value, allowEmpty, code) {
    const result = boundedArray(value, 4, code).map(item => choice(item, MEALS, code));
    if ((!allowEmpty && !result.length) || new Set(result).size !== result.length) fail(code);
    return result;
  }
  function validateMealPlan(value, code = "INVALID_RESPONSE") {
    object(value, code);
    if (typeof value.includeRecipes !== "boolean") fail(code);
    const result = { days: integer(value.days, 1, 7, code), startDate: date(value.startDate, code), mealTypes: mealTypes(value.mealTypes, false, code), servings: number(value.servings, 1, 20, code), includeRecipes: value.includeRecipes };
    if (!result.startDate) fail(code);
    addDaysISO(result.startDate, result.days - 1, code);
    return result;
  }
  function validateMealPlanDraft(value, code = "INVALID_RESPONSE") {
    object(value, code);
    if (typeof value.includeRecipes !== "boolean") fail(code);
    return { sourceMessageId: string(value.sourceMessageId, 200, code, true), command: string(value.command, LIMITS.MESSAGE_CHARS, code, true), planningDate: date(value.planningDate, code), days: value.days == null ? null : integer(value.days, 1, 7, code), startDate: date(value.startDate, code), mealTypes: mealTypes(value.mealTypes, true, code), servings: number(value.servings, 1, 20, code), includeRecipes: value.includeRecipes, needsDate: value.needsDate === true, mealsPerDay: value.mealsPerDay == null ? null : integer(value.mealsPerDay, 1, 4, code) };
  }
  function addDaysISO(value, offset, code = "INVALID_RESPONSE") {
    if (!date(value, code) || !Number.isInteger(offset) || Math.abs(offset) > 3660) fail(code);
    const timestamp = new Date(value + "T00:00:00Z");
    timestamp.setUTCDate(timestamp.getUTCDate() + offset);
    const result = timestamp.toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) fail(code);
    return date(result, code);
  }
  function localDateISO(value) {
    const parsed = value == null ? new Date() : new Date(value);
    if (!Number.isFinite(parsed.getTime())) return null;
    return String(parsed.getFullYear()).padStart(4, "0") + "-" + String(parsed.getMonth() + 1).padStart(2, "0") + "-" + String(parsed.getDate()).padStart(2, "0");
  }
  function validateProposal(value) {
    const code = "INVALID_RESPONSE";
    if (value == null) return null;
    object(value, code);
    choice(value.action, ACTIONS, code);
    if (value.action !== "createGoal") return validateOtherProposal(value);
    const result = { action: "createGoal", title: string(value.title, 200, code, true), type: choice(value.type, TYPES, code), category: choice(value.category, CATEGORIES, code) };
    for (const key of ["reason", "firstAction", "mainMilestone", "successMeasurement"]) result[key] = string(value[key], 2000, code);
    result.targetDate = date(value.targetDate, code);
    for (const key of ["duration", "frequency", "bestTime"]) result[key] = string(value[key], 200, code);
    result.priority = choice(value.priority == null ? "medium" : value.priority, ["low", "medium", "high"], code);
    const tasks = value.tasks == null ? [] : value.tasks;
    const milestones = value.milestones == null ? [] : value.milestones;
    if (!Array.isArray(tasks) || tasks.length > 12 || !Array.isArray(milestones) || milestones.length > 12) fail(code);
    result.tasks = tasks.map(function (task) { object(task, code); return { title: string(task.title, 300, code, true), cadence: string(task.cadence, 200, code) }; });
    result.milestones = milestones.map(function (item) { return string(item, 300, code, true); });
    return proposalIdentity(value, result);
  }
  function boundedArray(value, max, code) { if (value == null) return []; if (!Array.isArray(value) || value.length > max) fail(code); return value; }
  function number(value, min, max, code) { if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) fail(code); return value; }
  function proposalIdentity(value, result) {
    if (value.id != null) result.id = string(value.id, 200, "INVALID_RESPONSE", true);
    if (value.authorizationId != null) result.authorizationId = string(value.authorizationId, 200, "INVALID_RESPONSE", true);
    return result;
  }
  function validateOtherProposal(value) {
    const code = "INVALID_RESPONSE"; let result;
    if (value.action === "createIdea") result = { action: value.action, title: string(value.title, 200, code, true), description: string(value.description, 4000, code), type: choice(value.type, ["business", "creative"], code), priority: choice(value.priority || "medium", ["low", "medium", "high"], code), tags: boundedArray(value.tags, 12, code).map(tag => string(tag, 80, code, true)) };
    if (value.action === "createRecipe") {
      const sourceId = string(value.sourceId, 12, code, true); if (sourceId !== "catalog" && !/^\d{1,12}$/.test(sourceId)) fail(code);
      if (sourceId === "catalog" && (value.adapted !== true || value.source != null)) fail(code);
      result = { action: value.action, name: string(value.name, 200, code, true), description: string(value.description, 6000, code, true), servings: number(value.servings, 1, 20, code), mealType: choice(value.mealType, MEALS, code), ingredients: boundedArray(value.ingredients, 20, code).map(item => { object(item, code); return { foodId: string(item.foodId || item.name, 120, code, true), ...(item.name == null ? {} : { name: string(item.name, 150, code, true) }), quantity: item.quantity == null ? null : number(item.quantity, Number.MIN_VALUE, 10000, code), unit: item.unit == null ? null : string(item.unit, 20, code, true) }; }), sourceId, adapted: value.adapted === true, adaptationNote: value.adaptationNote == null ? "" : string(value.adaptationNote, 1000, code), unresolved: boundedArray(value.unresolved, 30, code).map(item => string(item, 300, code, true)) };
      result.resolutionRequests = boundedArray(value.resolutionRequests, 20, code).map(item => { object(item, code); return { ...(item.kind == null ? {} : { kind: choice(item.kind, ["missing"], code) }), sourceIndex: item.sourceIndex == null ? null : integer(item.sourceIndex, 0, 19, code), targetIndex: item.targetIndex == null ? null : integer(item.targetIndex, 0, 19, code), name: string(item.name, 150, code, true), sourceMeasure: string(item.sourceMeasure || "", 150, code), quantity: item.quantity == null ? null : number(item.quantity, Number.MIN_VALUE, 10000, code), unit: item.unit == null ? null : choice(item.unit, ["g", "ml", "kom"], code), issue: string(item.issue, 300, code, true), candidates: boundedArray(item.candidates, 8, code).map(candidate => { object(candidate, code); return { id: string(candidate.id, 120, code, true), name: string(candidate.name, 150, code, true) }; }) }; });
      if (value.source != null) {
        object(value.source, code); const source = value.source;
        if (source.provider !== "TheMealDB" || source.id !== sourceId || source.url !== "https://www.themealdb.com/meal.php?c=" + sourceId || source.imageUrl !== "/api/mentor/recipe-images/" + sourceId) fail(code);
        if (source.originalImageUrl && !/^https:\/\/www\.themealdb\.com\/images\/media\/meals\/[a-zA-Z0-9_./-]+$/.test(source.originalImageUrl)) fail(code);
        result.source = { provider: "TheMealDB", id: sourceId, url: source.url, title: string(source.title, 200, code, true), imageUrl: source.imageUrl, originalImageUrl: string(source.originalImageUrl, 500, code), adapted: source.adapted === true, imageIllustrative: source.imageIllustrative === true };
      }
    }
    if (value.action === "createMealPlanEntry") {
      result = { action: value.action, recipeId: string(value.recipeId, 200, code, true), plannedDate: date(value.plannedDate, code), mealType: choice(value.mealType, MEALS, code), servings: number(value.servings, 1, 20, code) };
      if (!result.plannedDate || (result.recipeId.startsWith("$") && !/^\$recipe:[0-6]$/.test(result.recipeId))) fail(code);
    }
    return proposalIdentity(value, result);
  }
  function validateIntent(value) {
    if (value == null) return null; const code = "INVALID_RESPONSE"; object(value, code);
    const constraints = value.constraints || {}; object(constraints, code);
    const plan = value.mealPlan == null ? null : validateMealPlan(value.mealPlan, code);
    const requests = boundedArray(value.requests, 4, code).map(item => {
      object(item, code);
      if (plan && !["createRecipe", "createMealPlanEntry"].includes(item.action)) fail(code);
      const maximum = !plan ? 5 : item.action === "createRecipe" ? (plan.includeRecipes ? 7 : 0) : plan.days * plan.mealTypes.length;
      return { action: choice(item.action, ACTIONS, code), count: integer(item.count, 1, maximum, code) };
    });
    if (new Set(requests.map(item => item.action)).size !== requests.length || requests.reduce((sum, item) => sum + item.count, 0) > (plan ? 35 : 5)) fail(code);
    const result = { id: string(value.id, 200, code, true), sourceMessageId: string(value.sourceMessageId, 200, code, true), requests, constraints: { vegan: constraints.vegan === true, training: constraints.training === true, excludedAllergens: boundedArray(constraints.excludedAllergens, 7, code).map(item => choice(item, ALLERGENS, code)), ...(constraints.meatPolicy == null ? {} : {meatPolicy: choice(constraints.meatPolicy, ["any", "chicken-fish-only"], code)}) }, evidence: string(value.evidence, 4000, code, true) };
    if (plan) result.mealPlan = plan;
    return result;
  }
  function proposalLimit(intent) {
    if (!intent || intent.mealPlan == null) return 5;
    const validated = validateIntent(intent);
    return Math.min(35, validated.requests.reduce((sum, item) => sum + item.count, 0));
  }
  // Derived from the entire local conversation, independent of the bounded AI context.
  function conversationConstraints(rows) {
    const result = { vegan: false, training: false, excludedAllergens: [] };
    const aliases = { gluten: "gluten", dairy: "dairy|mlec|mlek|mlijec", lactose: "lactos|laktoz", egg: "egg|jaj", nuts: "nut|orasast|orah|orasi", soy: "soy|soj", sesame: "sesame|susam" };
    for (const row of rows.filter(item => item.role === "user")) {
      const text = String(row.text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      if (/vegan/.test(text)) result.vegan = !/\b(not vegan|not a vegan|nisam vegan|ne mora\w* vegan|ne treb\w* vegan)\b/.test(text);
      if (/\b(train|training|workout|treniram|trening)\b/.test(text)) result.training = !/\b(don'?t train|do not train|ne treniram)\b/.test(text);
      if (/\b(?:samo|only)\b[^.!?\n]{0,70}\b(?:piletin\w*|chicken)\b[^.!?\n]{0,35}\b(?:rib\w*|fish)\b/.test(text) || /\b(?:samo|only)\b[^.!?\n]{0,70}\b(?:rib\w*|fish)\b[^.!?\n]{0,35}\b(?:piletin\w*|chicken)\b/.test(text)) { result.meatPolicy = "chicken-fish-only"; result.vegan = false; }
      if (/\b(?:sve vrste mesa|svih vrsta mesa|all (?:types|kinds) of meat|any meat)\b/.test(text)) result.meatPolicy = "any";
      for (const [key, alias] of Object.entries(aliases)) {
        const permission = new RegExp("(?:not allergic to|can eat|nisam alergi\\w*(?: sam)? na|mogu jesti)\\s+(?:" + alias + ")\\w*");
        const stripped = text.replace(permission, "");
        if (permission.test(text)) result.excludedAllergens = result.excludedAllergens.filter(item => item !== key);
        if (new RegExp("(?:without|no|avoid|allergic to|bez|alergi\\w*(?: sam)? na)\\s+(?:\\w+\\s+){0,2}(?:" + alias + ")").test(stripped) && !result.excludedAllergens.includes(key)) result.excludedAllergens.push(key);
      }
    }
    return result;
  }
  function foodMatchesMeatPolicy(food, policy) {
    if (!policy || policy === "any") return true;
    if (policy !== "chicken-fish-only" || !food) return false;
    const name = [food.id, food.slug, food.englishName, food.name, food.defaultName].filter(Boolean).join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_-]/g, " ").toLowerCase();
    if (/\b(?:beef|pork|bacon|ham|lamb|veal|turkey|duck|goose|lard|gelatin|goved\w*|svinj\w*|junec\w*|curet\w*|curec\w*)\b/.test(name)) return false;
    if (food.categoryId === "meat") return false;
    if (food.categoryId === "poultry") return /\b(?:chicken|pilet\w*|pilec\w*|pile)\b/.test(name);
    if (food.categoryId === "fish-seafood") return /\b(?:salmon|tuna|sardine\w*|mackerel|cod|trout|hake|herring|anchov\w*|seabass|bream|tilapia|haddock|losos\w*|skusa|bakalar\w*|pastrm\w*|oslic\w*)\b/.test(name) && !/\b(?:shrimp|prawn\w*|squid|octopus|mussel\w*|shellfish)\b/.test(name);
    return food.vegan === "allowed" || food.filterProfile?.dietary?.vegan === "allowed" || ["eggs", "dairy"].includes(food.categoryId);
  }
  function messages(value) {
    if (!Array.isArray(value) || !value.length || value.length > LIMITS.CONTEXT_MESSAGES) fail("INVALID_REQUEST");
    let chars = 0;
    const result = value.map(function (item, index) {
      object(item, "INVALID_REQUEST");
      const role = choice(item.role, ["user", "assistant"], "INVALID_REQUEST");
      if (role !== (index % 2 === 0 ? "user" : "assistant")) fail("INVALID_REQUEST");
      const text = string(item.text, role === "user" ? LIMITS.MESSAGE_CHARS : LIMITS.REPLY_CHARS, "INVALID_REQUEST", true);
      chars += text.length;
      return Object.assign({ role, text }, item.id == null ? {} : { id: string(item.id, 200, "INVALID_REQUEST", true) });
    });
    if (chars > LIMITS.CONTEXT_CHARS || result[result.length - 1].role !== "user") fail("INVALID_REQUEST");
    return result;
  }
  function limitContext(value) {
    if (!Array.isArray(value) || !value.length) fail("INVALID_REQUEST");
    const last = value[value.length - 1];
    if (!last || last.role !== "user") fail("INVALID_REQUEST");
    const selected = [Object.assign({ role: "user", text: string(last.text, LIMITS.MESSAGE_CHARS, "INVALID_REQUEST", true) }, last.id == null ? {} : { id: last.id })];
    let chars = selected[0].text.length;
    for (let index = value.length - 2; index >= 1; index -= 2) {
      const user = value[index - 1]; const assistant = value[index];
      if (!user || user.role !== "user" || !assistant || assistant.role !== "assistant") break;
      const u = string(user.text, LIMITS.MESSAGE_CHARS, "INVALID_REQUEST", true);
      const a = string(assistant.text, LIMITS.REPLY_CHARS, "INVALID_REQUEST", true);
      if (selected.length + 2 > LIMITS.CONTEXT_MESSAGES || chars + u.length + a.length > LIMITS.CONTEXT_CHARS) break;
      selected.unshift(Object.assign({ role: "user", text: u }, user.id == null ? {} : { id: user.id }), Object.assign({ role: "assistant", text: a }, assistant.id == null ? {} : { id: assistant.id })); chars += u.length + a.length;
    }
    return selected;
  }
  function validateRequest(value) {
    const code = "INVALID_REQUEST"; object(value, code);
    const requestId = string(value.requestId, 100, code, true);
    if (!/^[a-zA-Z0-9_-]{8,100}$/.test(requestId)) fail(code);
    let goalContext = null;
    if (value.goalContext != null) {
      const goal = value.goalContext; object(goal, code);
      goalContext = { id: string(goal.id, 200, code, true), title: string(goal.title, 200, code, true), type: choice(goal.type, TYPES, code), category: choice(goal.category, CATEGORIES, code), firstAction: string(goal.firstAction, 2000, code), targetDate: date(goal.targetDate, code) };
    }
    const result = { requestId, language: choice(value.language, ["sr", "en"], code), messages: messages(value.messages), goalContext };
    if (value.recipeRecovery != null) {
      object(value.recipeRecovery, code);
      result.recipeRecovery = { originalText: string(value.recipeRecovery.originalText, 4000, code, true), missingName: string(value.recipeRecovery.missingName || "", 150, code), selectedName: string(value.recipeRecovery.selectedName, 250, code, true) };
    }
    if (value.actionHistory != null) result.actionHistory = boundedArray(value.actionHistory, 100, code).map(item => { object(item, code); return { id: string(item.id, 200, code, true), authorizationId: string(item.authorizationId, 200, code, true), action: choice(item.action, ACTIONS, code), status: choice(item.status, ["approved", "dismissed", "pending"], code) }; });
    if (value.recipeContext != null) result.recipeContext = boundedArray(value.recipeContext, 20, code).map(item => { object(item, code); return { id: string(item.id, 200, code, true), name: string(item.name, 200, code, true), servings: number(item.servings, 1, 20, code), mealType: choice(item.mealType, MEALS, code) }; });
    if (value.foodContext != null) result.foodContext = boundedArray(value.foodContext, 20, code).map(item => { object(item, code); const allergens = {}; for (const key of ALLERGENS) allergens[key] = choice(item.allergens?.[key], ["present", "absent", "unknown"], code); return { id: string(item.id, 120, code, true), name: string(item.name, 150, code, true), englishName: string(item.englishName || item.name, 150, code, true), categoryId: string(item.categoryId || "other", 100, code, true), preparationState: choice(item.preparationState || "other", ["raw", "dry", "cooked", "boiled", "baked", "fried", "roasted", "drained", "other"], code), vegan: choice(item.vegan, ["allowed", "blocked", "unknown"], code), allergens }; });
    if (value.conversationConstraints != null) {
      const constraints = value.conversationConstraints; object(constraints, code);
      if (typeof constraints.vegan !== "boolean" || typeof constraints.training !== "boolean") fail(code);
      result.conversationConstraints = { vegan: constraints.vegan, training: constraints.training, excludedAllergens: boundedArray(constraints.excludedAllergens, 7, code).map(item => choice(item, ALLERGENS, code)), ...(constraints.meatPolicy == null ? {} : {meatPolicy: choice(constraints.meatPolicy, ["any", "chicken-fish-only"], code)}) };
    }
    if (value.mealPlanContext != null) {
      let chars = 0;
      result.mealPlanContext = boundedArray(value.mealPlanContext, 16, code).map(item => { object(item, code); const text = string(item.text, LIMITS.MESSAGE_CHARS, code, true); chars += text.length; return { id: string(item.id, 200, code, true), text, ...(item.planningDate == null ? {} : {planningDate: date(item.planningDate, code)}) }; });
      if (chars > 16000) fail(code);
    }
    if (value.previousPlan != null) {
      object(value.previousPlan, code);
      const plan = validateMealPlan(value.previousPlan.plan, code);
      const allowed = new Set(Array.from({ length: plan.days }, (_, day) => plan.mealTypes.map(mealType => addDaysISO(plan.startDate, day, code) + "/" + mealType)).flat());
      const occupiedSlots = boundedArray(value.previousPlan.occupiedSlots, 28, code).map(item => {
        object(item, code);
        const plannedDate = date(item.plannedDate, code);
        const mealType = choice(item.mealType, MEALS, code);
        if (!allowed.has(plannedDate + "/" + mealType)) fail(code);
        return { plannedDate, mealType };
      });
      if (!occupiedSlots.length || new Set(occupiedSlots.map(item => item.plannedDate + "/" + item.mealType)).size !== occupiedSlots.length) fail(code);
      result.previousPlan = { sourceMessageId: string(value.previousPlan.sourceMessageId, 200, code, true), plan, occupiedSlots };
    }
    if (value.planningDate != null) { result.planningDate = date(value.planningDate, code); if (!result.planningDate) fail(code); }
    if (value.mealPlanDraft != null) result.mealPlanDraft = validateMealPlanDraft(value.mealPlanDraft, code);
    return result;
  }
  function validateResponse(value) {
    object(value, "INVALID_RESPONSE");
    const reply = string(value.reply, LIMITS.REPLY_CHARS, "INVALID_RESPONSE", true);
    if (value.proposals == null && value.intent == null && value.mealPlanDraft == null) return { reply, proposal: validateProposal(value.proposal) };
    const intent = validateIntent(value.intent);
    const proposals = boundedArray(value.proposals, proposalLimit(intent), "INVALID_RESPONSE").map(item => { if (!item) fail("INVALID_RESPONSE"); return validateProposal(item); });
    if (intent && intent.mealPlan) {
      for (const action of ACTIONS) {
        const count = proposals.filter(item => item.action === action).length;
        const allowance = intent.requests.find(item => item.action === action);
        if (count > (allowance ? allowance.count : 0)) fail("INVALID_RESPONSE");
      }
    }
    const result = { reply, proposal: null, proposals, intent };
    if (value.mealPlanDraft != null) result.mealPlanDraft = validateMealPlanDraft(value.mealPlanDraft);
    return result;
  }
  function getProposals(value) { return value && Array.isArray(value.proposals) ? value.proposals : value && value.proposal ? [value.proposal] : []; }
  const textSchema = { type: "string" };
  const proposalProperties = {
    action: { type: "string", enum: ["createGoal"] }, title: textSchema,
    type: { type: "string", enum: TYPES }, category: { type: "string", enum: CATEGORIES },
    reason: textSchema, firstAction: textSchema, mainMilestone: textSchema, successMeasurement: textSchema,
    targetDate: { anyOf: [{ type: "string" }, { type: "null" }] }, duration: textSchema, frequency: textSchema, bestTime: textSchema,
    priority: { type: "string", enum: ["low", "medium", "high"] },
    tasks: { type: "array", maxItems: 12, items: { type: "object", properties: { title: textSchema, cadence: textSchema }, required: ["title", "cadence"], additionalProperties: false } },
    milestones: { type: "array", maxItems: 12, items: textSchema }
  };
  const ideaProperties = { action: { type: "string", enum: ["createIdea"] }, title: textSchema, description: textSchema, type: { type: "string", enum: ["business", "creative"] }, priority: { type: "string", enum: ["low", "medium", "high"] }, tags: { type: "array", items: textSchema } };
  const recipeProperties = { action: { type: "string", enum: ["createRecipe"] }, name: textSchema, description: textSchema, servings: { type: "number" }, mealType: { type: "string", enum: MEALS }, ingredients: { type: "array", items: { type: "object", properties: { foodId: textSchema, name: textSchema, quantity: { anyOf: [{ type: "number" }, { type: "null" }] }, unit: { type: "string" } }, required: ["foodId", "name", "quantity", "unit"], additionalProperties: false } }, sourceId: textSchema, adapted: { type: "boolean" }, adaptationNote: textSchema, unresolved: { type: "array", items: textSchema } };
  const planProperties = { action: { type: "string", enum: ["createMealPlanEntry"] }, recipeId: textSchema, plannedDate: textSchema, mealType: { type: "string", enum: MEALS }, servings: { type: "number" } };
  const variants = [proposalProperties, ideaProperties, recipeProperties, planProperties].map(properties => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false }));
  const responseSchema = { type: "object", properties: { reply: textSchema, proposals: { type: "array", maxItems: 5, items: { anyOf: variants } } }, required: ["reply", "proposals"], additionalProperties: false };
  const outputGroups = { createGoal: "goals", createIdea: "ideas", createRecipe: "recipes", createMealPlanEntry: "mealPlanEntries" };
  function generationSchema(actions = []) {
    // Avoid a union of several deeply nested action objects in every array item.
    // Counts and all domain constraints are still enforced by validateResponse/policy.
    const properties = { reply: textSchema };
    ACTIONS.forEach((action, index) => {
      if (!actions.includes(action)) return;
      const item = JSON.parse(JSON.stringify(variants[index]));
      if (item.properties.tasks) delete item.properties.tasks.maxItems;
      if (item.properties.milestones) delete item.properties.milestones.maxItems;
      properties[outputGroups[action]] = { type: "array", items: item };
    });
    return { type: "object", properties, required: Object.keys(properties), additionalProperties: false };
  }
  function normalizeGenerated(value) {
    object(value, "INVALID_RESPONSE");
    if (value.proposals != null || value.proposal != null) return value;
    return { reply: value.reply, proposals: ACTIONS.flatMap(action => {
      const group = value[outputGroups[action]];
      if (group == null) return [];
      if (!Array.isArray(group)) fail("INVALID_RESPONSE");
      return group;
    }) };
  }
  return Object.freeze({ LIMITS, validateRequest, validateResponse, validateProposal, validateIntent, validateMealPlan, validateMealPlanDraft, proposalLimit, addDaysISO, localDateISO, getProposals, limitContext, responseSchema, conversationConstraints, generationSchema, normalizeGenerated, foodMatchesMeatPolicy });
});
