"use strict";
const crypto = require("node:crypto");
const protocol = require("../js/mentor/mentor-protocol.js");
const mealPlanning = require("./meal-planning.js");
const actionResources = require("../js/i18n/mentor-actions.js");
const foodRelations = require("./recipe-food-relations.js");
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "dj").toLowerCase();
const nouns = { createGoal: /\b(goal|goals|cilj\w*)\b/, createIdea: /\b(idea\w*|idej\w*|kartic\w*)\b/, createRecipe: /\b(recipe\w*|recipies?|recep(?:t\w*|at\w*))\b/, createMealPlanEntry: /\b(meal\s*plan|meal\s*planner|meals?|obrok\w*|plan\w*\s+(?:za\s+)?(?:obrok\w*|ishran\w*)|jelovnik\w*)\b/ };
function candidateFor(message) {
  const text = mealPlanning.creationText(message.text);
  if (/\b(don'?t|do not|never|nemoj\w*|ne zelim|ne pravi|ne kreiraj|ne dodaj|bez kreiranja|if i|if you|what if|hypothetic\w*|kad bih|kada bih|ako bih|sta bi bilo)\b/.test(text)) return null;
  if (!Object.values(nouns).some(pattern => pattern.test(text)) && /^(?:please\s+)?(?:napravi|pripremi|skuvaj|make|prepare|cook)\s+(?:(?:mi|me|a|an)\s+)?(?:pasulj\w*|beans?|ribs?|rebr\w*|piletin\w*|chicken)\b/.test(text)) return { message, actions: ["createRecipe"], counts: { createRecipe: 1 }, capped: false };
  if (!/\b(create|make|add|save|prepare|generate|give|find|suggest|schedule|planir\w*|isplanir\w*|napravi\w*|kreiraj\w*|dodaj\w*|unes\w*|ubaci\w*|sacuvaj\w*|pripremi\w*|generisi\w*|daj|pronadji\w*|predlozi\w*|zelim)\b/.test(text)) return null;
  const verbs = /\b(create|make|add|save|prepare|generate|give|find|suggest|schedule|planir\w*|isplanir\w*|napravi\w*|kreiraj\w*|dodaj\w*|unes\w*|ubaci\w*|sacuvaj\w*|pripremi\w*|generisi\w*|daj|pronadji\w*|predlozi\w*|zelim)\b/g;
  const commands = [...text.matchAll(verbs)];
  const actions = Object.keys(nouns).filter(action => [...text.matchAll(new RegExp(nouns[action].source, "g"))].some(noun => {
    const command = commands.filter(item => item.index < noun.index).at(-1);
    if (!command) return false;
    const between = text.slice(command.index + command[0].length, noun.index);
    return between.length <= 100 && !/[.!?;\n]/.test(between) && !/\b(for|towards?|about|from|using|support\w*|za|uz|zbog|povodom|o|iz|sa)\b/.test(between);
  }));
  if (!actions.length) return null;
  const numbers = { one: 1, two: 2, three: 3, four: 4, five: 5, jedan: 1, jednu: 1, dva: 2, dve: 2, tri: 3, cetiri: 4, pet: 5 };
  const countMatch = text.match(/\b(\d{1,3}|one|two|three|four|five|jedan|jednu|dva|dve|tri|cetiri|pet)\b/);
  const counts = {};
  for (const action of actions) {
    const match = nouns[action].exec(text); const prefix = text.slice(Math.max(0, match.index - 45), match.index);
    const nearby = prefix.match(/\b(\d{1,3}|one|two|three|four|five|jedan|jednu|dva|dve|tri|cetiri|pet)\s+(?:\w+\s+){0,2}$/);
    counts[action] = nearby ? Number(nearby[1]) || numbers[nearby[1]] : null;
  }
  return { message, actions, counts, capped: countMatch && Number(countMatch[1]) > 5 };
}
function recipeApprovalFollowUp(request) {
  const latest = request.messages.at(-1), previous = request.messages.at(-2);
  const text = normalize(latest.text).trim().replace(/[.!?]+$/, "").trim();
  if (!/^(?:(?:please|let me|can i|may i|i want to|zelim da|dozvoli da)\s+)?(?:approve|aprove|confirm|odobri(?:m)?|potvrdi(?:m)?)(?:\s+(?:and save|i sacuvaj))?(?:\s+(?:it|this|that|(?:the |this )?(?:recipe|recipie)|(?:ovaj )?recept|to))?$/.test(text)) return null;
  const origin = request.messages.filter(message => message.role === "user").at(-2);
  const candidate = origin && candidateFor(origin);
  const recipeOnly = candidate?.actions.length === 1 && candidate.actions[0] === "createRecipe";
  if (!recipeOnly && !nouns.createRecipe.test(normalize(latest.text)) && !nouns.createRecipe.test(normalize(previous?.text))) return null;
  const authorizationId = recipeOnly ? "intent_" + crypto.createHash("sha256").update(origin.id || request.requestId).digest("hex").slice(0, 24) : null;
  let history = (request.actionHistory || []).filter(item => item.action === "createRecipe" && (!authorizationId || item.authorizationId === authorizationId));
  if (!authorizationId && history.length) history = history.filter(item => item.authorizationId === history.at(-1).authorizationId);
  if (history.length) {
    const states = new Set(history.map(item => item.status));
    return { status: states.has("pending") ? "pending" : states.size > 1 ? "handled" : states.has("approved") ? "approved" : "dismissed" };
  }
  // Only the previous USER command can authorize regeneration. Assistant prose,
  // printed food IDs and approval text are never executable proposals.
  return recipeOnly ? { status: "recover", candidate } : { status: "missing" };
}
function deriveCandidate(request) {
  const users = request.messages.filter(message => message.role === "user");
  const latest = users.at(-1);
  if (mealPlanning.cancelled(latest.text)) return null;
  const direct = candidateFor(latest);
  const answersPendingPlan = mealPlanning.answersDraft(request.mealPlanDraft, latest.text);
  let context = request.mealPlanContext?.length ? request.mealPlanContext : users;
  if (context.at(-1)?.id !== latest.id || context.at(-1)?.text !== latest.text) context = [...context, latest];
  const otherTask = context.findLastIndex(message => { const command = candidateFor(message); return command?.actions.some(action => ["createGoal", "createIdea"].includes(action)) && !mealPlanning.detectPlan(message.text); });
  context = context.slice(otherTask + 1);
  const extension = mealPlanning.extend(latest, context, request.previousPlan);
  if (extension) {
    const message = extension.source;
    const id = "intent_" + crypto.createHash("sha256").update(message.id || request.requestId).digest("hex").slice(0, 24);
    if ((request.actionHistory || []).some(item => item.authorizationId === id)) return { message, actions: ["createMealPlanEntry"], counts: {}, planning: { status: "review" } };
    return { message, actions: ["createMealPlanEntry"], counts: {}, planning: extension.planning };
  }
  const recovered = mealPlanning.recover(context, { planningDate: request.planningDate, canResume: answersPendingPlan && (!direct || direct.actions.every(action => action === "createMealPlanEntry")) });
  if (recovered) {
    const draftOrigin = request.mealPlanDraft && context.find(message => message.id === request.mealPlanDraft.sourceMessageId && message.text === request.mealPlanDraft.command);
    const origin = mealPlanning.detectPlan(latest.text) ? latest : draftOrigin || recovered.source;
    const message = { ...origin, id: origin.id || request.requestId };
    const candidate = candidateFor(message) || { message, actions: ["createMealPlanEntry"], counts: {} };
    if (recovered.planning.draft) { recovered.planning.draft.sourceMessageId = message.id; recovered.planning.draft.command = message.text; }
    const id = "intent_" + crypto.createHash("sha256").update(message.id).digest("hex").slice(0, 24);
    if (!mealPlanning.detectPlan(latest.text) && (request.actionHistory || []).some(item => item.authorizationId === id)) return { ...candidate, planning: { status: "review" } };
    return { ...candidate, planning: candidate.counts.createRecipe > 7 ? { status: "unsupported", reason: "recipes" } : recovered.planning };
  }
  const planning = mealPlanning.analyze(latest.text, { planningDate: request.planningDate, sourceMessageId: latest.id || request.requestId });
  if (planning) return { ...(direct || { message: latest, actions: ["createMealPlanEntry"], counts: {} }), planning: direct?.counts.createRecipe > 7 ? { status: "unsupported", reason: "recipes" } : planning };
  if (request.mealPlanDraft && (!direct || direct.actions.every(action => action === "createMealPlanEntry"))) {
    if (!answersPendingPlan) return direct;
    const draft = request.mealPlanDraft;
    const origin = context.find(message => message.id === draft.sourceMessageId && message.text === draft.command);
    if (origin && request.messages.at(-2)?.role === "assistant") {
      const resumed = mealPlanning.analyze(draft.command, { planningDate: request.planningDate || draft.planningDate, draft, answer: latest.text });
      return { ...(candidateFor(origin) || { message: origin, actions: ["createMealPlanEntry"], counts: {} }), planning: resumed };
    }
    return direct;
  }
  let candidate = direct;
  if (!candidate && users.length > 1 && !/\b(don'?t|do not|nemoj|ne zelim|stop|cancel|otkazi)\b/.test(normalize(users.at(-1).text))) {
    const preceding = request.messages.at(-2);
    if (preceding && preceding.role === "assistant" && /\?/.test(preceding.text) && users.at(-1).text.length < 600) candidate = candidateFor(users.at(-2));
  }
  return candidate;
}
function constraintsFor(request) {
  const recovered = protocol.conversationConstraints([...(request.mealPlanContext || []).map(item => ({...item,role:"user"})), ...request.messages]);
  return { ...recovered, ...(request.conversationConstraints || {}), ...(request.conversationConstraints?.meatPolicy || !recovered.meatPolicy ? {} : {meatPolicy:recovered.meatPolicy}) };
}
function constrainIntent(candidate, classification, request) {
  if (!candidate) return null;
  const sourceMessageId = candidate.message.id || request.requestId;
  const id = "intent_" + crypto.createHash("sha256").update(sourceMessageId).digest("hex").slice(0, 24);
  if (candidate.planning) {
    if (candidate.planning.status !== "ready") return null;
    const plan = candidate.planning.plan;
    const recipeCount = candidate.counts.createRecipe || 7;
    if (recipeCount > 7) return null;
    return protocol.validateIntent({ id, sourceMessageId, requests: [...(plan.includeRecipes ? [{ action: "createRecipe", count: recipeCount }] : []), { action: "createMealPlanEntry", count: plan.days * plan.mealTypes.length }], constraints: constraintsFor(request), evidence: candidate.message.text, mealPlan: plan });
  }
  if (!classification || typeof classification.evidence !== "string" || !candidate.message.text.includes(classification.evidence) || !candidateFor({ text: classification.evidence })) return null;
  const requests = [];
  for (const item of Array.isArray(classification.requests) ? classification.requests : []) {
    if (!candidate.actions.includes(item.action) || requests.some(existing => existing.action === item.action)) continue;
    const count = candidate.counts[item.action] || (item.action === "createRecipe" && /recipes|recipies|recep(?:t[aei]|at\w*)/.test(normalize(candidate.message.text)) ? 3 : 1);
    const available = 5 - requests.reduce((sum, item) => sum + item.count, 0);
    if (available > 0) requests.push({ action: item.action, count: Math.min(count, available) });
  }
  if (!requests.length) return null;
  return { id, sourceMessageId, requests, constraints: constraintsFor(request), evidence: classification.evidence };
}
function ingredientMatches(name, food) {
  const clean = value => normalize(value).replace(/[_-]/g, " ").replace(/\b(raw|dry|boiled|whole|skin|green|white|extra|virgin)\b/g, "").replace(/\s+/g, " ").trim();
  const source = clean(name).replace(/s$/, ""); const foodName = clean(food.englishName).replace(/s$/, "");
  return source.length > 2 && (source === foodName || foodName.startsWith(source + " "));
}
function catalogMatches(name, foods) {
  const needle = normalize(name).replace(/[_-]/g, " ").replace(/\s+/g, " ").trim();
  if (!needle) return [];
  const exact = foods.filter(food => [food.name, food.englishName].some(label => normalize(label).replace(/[_-]/g, " ").replace(/\s+/g, " ").trim() === needle));
  return exact.length ? exact : foods.filter(food => ingredientMatches(name, food));
}
function measured(value, unit) {
  if (!Number.isFinite(value) || value <= 0) return null;
  const key = normalize(unit).trim();
  const values = { g: ["g", 1], gram: ["g", 1], grams: ["g", 1], kg: ["g", 1000], kilogram: ["g", 1000], kilograms: ["g", 1000], ml: ["ml", 1], l: ["ml", 1000], liter: ["ml", 1000], liters: ["ml", 1000], litre: ["ml", 1000], litres: ["ml", 1000], kom: ["kom", 1] };
  const rule = values[key];
  if (!rule && value === 1) {
    // The parenthesis supplies an exact total for one piece, never a guessed
    // average weight or a conversion from a cup/container.
    const explicit = key.match(/^(?:kom(?:ad(?:a)?)?|pieces?|cloves?|cen)\s*\(\s*(\d+(?:[.,]\d+)?)\s*(g|grams?|kg|kilograms?|ml|l|liters?|litres?)\s*\)$/);
    if (explicit) return measured(Number(explicit[1].replace(",", ".")), explicit[2]);
  }
  return rule && value * rule[1] <= 10000 ? { quantity: value * rule[1], unit: rule[0] } : null;
}
function sourceMeasure(text) {
  const match = String(text || "").match(/^\s*(\d+(?:[.,]\d+)?)\s*(g|grams?|kg|kilograms?|ml|l|liters?|litres?)\s*$/i);
  if (match) return measured(Number(match[1].replace(",", ".")), match[2]);
  const explicit = normalize(text).match(/^1\s+((?:kom(?:ad(?:a)?)?|pieces?|cloves?|cen)\s*\(.+\))$/);
  return explicit ? measured(1, explicit[1]) : null;
}
function recipeIssue(language, key, values = {}) {
  return actionResources[language].actions.recipeIssues[key].replace(/\{\{(\w+)\}\}/g, (_, name) => String(values[name] ?? ""));
}
function resolveRecipeIngredients(proposal, source, foods, constraints, language, requestedText = "") {
  const unresolved = new Set(proposal.unresolved);
  const resolutionRequests = [];
  const requestedAnchors = foodRelations.requested(requestedText);
  const anchors = requestedAnchors.length ? requestedAnchors : foodRelations.requested(proposal.name);
  const proposed = proposal.ingredients.map(item => ({ ...item }));
  for (const anchor of anchors) if (!proposed.some(item => {
    const actual = foods.find(food => food.id === item.foodId);
    return foodRelations.compatible(anchor.key, actual ? foodRelations.foodFamily(actual) : foodRelations.family(item.name));
  })) {
    proposed.push({ foodId: "missing:" + anchor.key, name: language === "sr" ? anchor.sr : anchor.en, quantity: null, unit: "g" });
  }
  const ingredients = proposed.map((item, index) => {
    const measure = measured(item.quantity, item.unit);
    let food = foods.find(candidate => candidate.id === item.foodId);
    if (!food) {
      const matches = catalogMatches(item.name || item.foodId, foods);
      if (matches.length === 1) food = matches[0];
      else {
        const issue = recipeIssue(language, matches.length ? "chooseFood" : "missingFood", { name: item.name || item.foodId, options: matches.slice(0, 8).map(row => row.name).join(", ") });
        unresolved.add(issue);
        if (matches.length > 1) resolutionRequests.push({ sourceIndex: null, targetIndex: index, name: item.name || item.foodId, sourceMeasure: "", quantity: measure?.quantity ?? null, unit: measure?.unit ?? null, issue, candidates: matches.slice(0, 8).map(({ id, name }) => ({ id, name })) });
        else resolutionRequests.push({ kind: "missing", sourceIndex: null, targetIndex: index, name: item.name || item.foodId, sourceMeasure: "", quantity: null, unit: null, issue, candidates: foodRelations.alternatives(item.name || item.foodId, foods).map(({ id, name }) => ({ id, name })) });
      }
    }
    if (food && (!protocol.foodMatchesMeatPolicy(food, constraints.meatPolicy) || (constraints.vegan && food.vegan !== "allowed") || constraints.excludedAllergens.some(key => food.allergens[key] !== "absent"))) unresolved.add(recipeIssue(language, "dietConflict", { name: item.name || food.name }));
    return { foodId: food?.id || item.foodId, ...(food?.name || item.name ? { name: food?.name || item.name } : {}), quantity: measure?.quantity ?? item.quantity, unit: measure?.unit ?? item.unit };
  });
  if (!proposal.adapted) {
    for (const [sourceIndex, ingredient] of source.ingredients.entries()) {
      const matches = catalogMatches(ingredient.name, foods);
      if (matches.length > 1) {
        const issue = recipeIssue(language, "chooseFood", { name: ingredient.name, options: matches.slice(0, 8).map(row => row.name).join(", ") });
        unresolved.add(issue);
        const amount = sourceMeasure(ingredient.measure);
        if (amount) {
          const targetIndex = ingredients.findIndex(item => normalize(item.name) === normalize(ingredient.name) || matches.some(food => food.id === item.foodId));
          const entry = { sourceIndex, targetIndex: targetIndex < 0 ? null : targetIndex, name: ingredient.name, sourceMeasure: ingredient.measure, ...amount, issue, candidates: matches.slice(0, 8).map(({ id, name }) => ({ id, name })) };
          const previous = resolutionRequests.findIndex(item => item.issue === issue);
          if (previous >= 0) resolutionRequests[previous] = entry; else resolutionRequests.push(entry);
        }
        continue;
      }
      if (!matches.length) { unresolved.add(recipeIssue(language, "missingFood", { name: ingredient.name })); continue; }
      const expected = sourceMeasure(ingredient.measure);
      if (!expected) { unresolved.add(recipeIssue(language, "sourceAmount", { name: ingredient.name, measure: ingredient.measure || "?" })); continue; }
      const found = ingredients.find(item => item.foodId === matches[0].id);
      if (!found) ingredients.push({ foodId: matches[0].id, name: ingredient.name, ...expected });
      else if (found.quantity == null) { found.quantity = expected.quantity; found.unit = expected.unit; }
      else if (found.quantity !== expected.quantity || found.unit !== expected.unit) unresolved.add(recipeIssue(language, "amountDiffers", { name: ingredient.name, quantity: expected.quantity, unit: expected.unit }));
    }
    for (const [index, item] of ingredients.entries()) if (!resolutionRequests.some(request => request.targetIndex === index) && !source.ingredients.some(sourceItem => catalogMatches(sourceItem.name, foods).some(food => food.id === item.foodId))) unresolved.add(recipeIssue(language, "extraIngredient", { name: item.name || item.foodId }));
  } else {
    if (!proposal.adaptationNote?.trim() && !/^adapt(?:ation|ed)\s*:/i.test(proposal.description)) unresolved.add(recipeIssue(language, "adaptationNote"));
    if (source) {
      if (anchors.length) {
        for (const anchor of anchors) if (!source.ingredients.some(item => foodRelations.compatible(anchor.key, foodRelations.family(item.name)))) unresolved.add(recipeIssue(language, "unrelatedSource", { name: language === "sr" ? anchor.sr : anchor.en }));
      } else {
        const rank = { meat: 3, poultry: 3, "fish-seafood": 3, legumes: 3, eggs: 3, grains: 2, "pasta-noodles": 2, "bread-bakery": 2, dairy: 2 };
        const known = ingredients.map(item => ({ item, food: foods.find(food => food.id === item.foodId) })).filter(row => row.food);
        const highest = Math.max(0, ...known.map(row => rank[row.food.categoryId] || 1));
        for (const { item: main, food: mainFood } of known.filter(row => (rank[row.food.categoryId] || 1) === highest)) {
          const related = source.ingredients.some(item => catalogMatches(item.name, foods).some(food => food.id === main.foodId) || foodRelations.compatible(foodRelations.foodFamily(mainFood), foodRelations.family(item.name)));
          if (!related) unresolved.add(recipeIssue(language, "unrelatedSource", { name: main.name || main.foodId }));
        }
      }
    } else if ((proposal.description.match(/(?:^|\s)\d+[.)]\s+\S/g) || []).length < 2) unresolved.add(recipeIssue(language, "preparationSteps"));
    const cookedBeans = ingredients.some(item => {
      const food = foods.find(row => row.id === item.foodId);
      return foodRelations.foodFamily(food) === "beans" && (/^(?:cooked|boiled)$/.test(food.preparationState) || /\b(?:cooked|boiled)\b/.test(normalize(food.englishName).replace(/_/g, " ")));
    });
    if (cookedBeans && /\b(?:potop\w*|natop\w*|namoc\w*|soak\w*)\s+(?:the\s+)?(?:kuvan\w*\s+|cooked\s+|boiled\s+)?(?:pasulj\w*|beans?)\b/.test(normalize(proposal.description).replace(/\b(?:ne|nemoj\w*|do not|don't)\s+[^.!?\n]*/g, ""))) unresolved.add(recipeIssue(language, "cookedBeansPreparation"));
  }
  ingredients.forEach((item, index) => {
    if (measured(item.quantity, item.unit)) return;
    unresolved.add(recipeIssue(language, item.quantity == null || item.quantity <= 0 ? "missingQuantity" : "unsupportedUnit", { name: item.name || recipeIssue(language, "ingredientFallback", { index: index + 1 }), unit: item.unit || "?" }));
  });
  if (!ingredients.length) unresolved.add(recipeIssue(language, "noIngredients"));
  if (ingredients.length > 20) unresolved.add(recipeIssue(language, "tooManyIngredients"));
  return { ingredients: ingredients.slice(0, 20), unresolved: [...unresolved].slice(0, 30), resolutionRequests: resolutionRequests.slice(0, 20) };
}
function safeReply(reply, language) {
  const text = normalize(reply);
  if (/\bfoodid\s*[":=]/.test(text) || (nouns.createRecipe.test(text) && /\b(?:pending approvals?|approval cards?|approve and save|sprem\w* za (?:potvrd\w*|odobrav\w*)|ceka\w* (?:potvrd\w*|odobrav\w*))\b/.test(text))) return actionResources[language].actions.noRecipeToApprove;
  const claimsSave = (/\b(?:plan\w*|recept\w*|obrok\w*|cilj\w*|kalendar\w*|goal\w*|recipe\w*|meal\w*)\b/.test(text) && /\b(?:unet\w*|unesen\w*|upisan\w*|sacuvan\w*|dodat\w*|saved|created|added|scheduled)\b/.test(text)) || /\b(?:uneo|unela|upisao|upisala|sacuvao|sacuvala|dodao|dodala)\s+sam\b/.test(text) || /\bi(?:'ve| have)?\s+(?:saved|created|added|scheduled)\b/.test(text);
  if (claimsSave || /\$recipe:\d|\bjson\s+(?:strukt|structure)/.test(text)) return actionResources[language].actions.notSaved;
  if (/\b(?:nemam pristup (?:bazi|listi (?:tvojih )?namirnica|katalogu)|no access to (?:the )?(?:nutrition )?(?:database|food catalog))\b/.test(text)) return actionResources[language].actions.catalogOnly;
  return reply;
}
function applyPolicy(response, intent, request, { sources, foods = [] } = {}) {
  const normalized = protocol.validateResponse(intent?.mealPlan ? { ...response, intent } : response);
  const result = { reply: safeReply(normalized.reply, request.language), proposal: null, proposals: [], intent };
  if (!intent) return result;
  const histories = request.actionHistory || []; const used = new Set(); const ordinals = {};
  const original = protocol.getProposals(normalized);
  const originalRecipes = original.filter(item => item.action === "createRecipe");
  const recipeMap = new Map();
  const dependencies = new Map();
  const ordered = original.slice().sort((a, b) => Number(a.action === "createMealPlanEntry") - Number(b.action === "createMealPlanEntry"));
  for (const proposal of ordered) {
    if (result.proposals.length >= protocol.proposalLimit(intent)) break;
    const authorization = intent.requests.find(item => item.action === proposal.action); if (!authorization) continue;
    const consumed = new Set(histories.filter(item => item.authorizationId === intent.id && item.action === proposal.action && ["approved", "dismissed"].includes(item.status)).map(item => item.id));
    const remaining = Array.from({length: authorization.count}, (_, index) => intent.id + "_" + proposal.action + "_" + index).filter(id => !consumed.has(id));
    const ordinal = ordinals[proposal.action] || 0; ordinals[proposal.action] = ordinal + 1;
    if (ordinal >= remaining.length) continue;
    const id = remaining[ordinal];
    if (used.has(id) || consumed.has(id)) continue;
    if (proposal.action === "createRecipe") {
      const source = proposal.sourceId === "catalog" ? null : sources && sources.get(proposal.sourceId); if (!source && proposal.sourceId !== "catalog") continue;
      const resolved = resolveRecipeIngredients(proposal, source, foods, intent.constraints, request.language, intent.mealPlan ? proposal.name : intent.evidence);
      proposal.ingredients = resolved.ingredients;
      proposal.unresolved = resolved.unresolved;
      proposal.resolutionRequests = resolved.resolutionRequests;
      if (proposal.adapted && proposal.adaptationNote && !proposal.description.includes(proposal.adaptationNote)) proposal.description += "\n\n" + actionResources[request.language].actions.adaptationLabel + ": " + proposal.adaptationNote;
      if (source) proposal.source = { provider: "TheMealDB", id: source.id, url: source.url, title: source.title, imageUrl: "/api/mentor/recipe-images/" + source.id, originalImageUrl: source.originalImageUrl, adapted: proposal.adapted, imageIllustrative: proposal.adapted };
    }
    if (proposal.action === "createMealPlanEntry") {
      if (proposal.recipeId.startsWith("$recipe:")) { const recipe = recipeMap.get(Number(proposal.recipeId.split(":")[1])); if (!recipe) continue; dependencies.set(id, recipe.id); }
      else if (!(request.recipeContext || []).some(recipe => recipe.id === proposal.recipeId)) continue;
    }
    const accepted = { ...proposal, id, authorizationId: intent.id };
    if (proposal.action === "createRecipe") recipeMap.set(originalRecipes.indexOf(proposal), accepted);
    used.add(id); result.proposals.push(accepted);
  }
  if (intent.mealPlan) {
    const expected = new Set(mealPlanning.slots(intent.mealPlan).map(slot => slot.plannedDate + "/" + slot.mealType));
    const entries = result.proposals.filter(item => item.action === "createMealPlanEntry");
    const actual = new Set(entries.map(item => item.plannedDate + "/" + item.mealType));
    const complete = entries.length === expected.size && actual.size === expected.size && [...actual].every(key => expected.has(key)) && entries.every(item => item.servings === intent.mealPlan.servings);
    const lunchRecipes = entries.filter(item => item.mealType === "lunch").map(item => item.recipeId);
    const distinctLunchRequested = /\b(?:razlicit\w*|different|distinct)\b/.test(normalize(intent.evidence)) && /\b(?:ruc\w*|lunch)\b/.test(normalize(intent.evidence));
    const referenced = new Set(dependencies.values());
    const recipes = result.proposals.filter(item => item.action === "createRecipe" && referenced.has(item.id));
    const fingerprints = recipes.map(item => item.sourceId + "/" + JSON.stringify(item.ingredients.map(ingredient => [ingredient.foodId, ingredient.quantity / item.servings, ingredient.unit]).sort((a, b) => a[0].localeCompare(b[0]))));
    if (!complete || (distinctLunchRequested && new Set(lunchRecipes).size !== lunchRecipes.length) || new Set(fingerprints).size !== recipes.length) return { reply: actionResources[request.language].actions.incompletePlan, proposal: null, proposals: [], intent: null };
    entries.sort((a, b) => a.plannedDate.localeCompare(b.plannedDate) || intent.mealPlan.mealTypes.indexOf(a.mealType) - intent.mealPlan.mealTypes.indexOf(b.mealType));
    result.proposals = [...recipes, ...entries];
  }
  const finalRecipes = result.proposals.filter(item => item.action === "createRecipe");
  result.proposals.filter(item => dependencies.has(item.id)).forEach(item => { item.recipeId = "$recipe:" + finalRecipes.findIndex(recipe => recipe.id === dependencies.get(item.id)); });
  if (result.proposals.length) {
    const values = {recipes: finalRecipes.length, entries:result.proposals.filter(item => item.action === "createMealPlanEntry").length, days:intent.mealPlan?.days};
    result.reply = actionResources[request.language].actions[intent.mealPlan ? "weeklyReady" : "proposalsReady"].replace(/\{\{(\w+)\}\}/g, (_, key) => String(values[key]));
  } else if (intent.requests.some(item => item.action === "createRecipe")) result.reply = actionResources[request.language].actions.noRecipeProposal;
  else if (intent.requests.some(item => item.action === "createMealPlanEntry")) result.reply = actionResources[request.language].actions.notSaved;
  return result;
}
module.exports = { deriveCandidate, constrainIntent, constraintsFor, applyPolicy, recipeApprovalFollowUp };
