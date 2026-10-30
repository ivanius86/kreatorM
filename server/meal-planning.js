"use strict";
const protocol = require("../js/mentor/mentor-protocol.js");
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "dj").toLowerCase().replace(/\bza(?=\d)/g, "za ").replace(/\bobro\s+k/g, "obrok").replace(/\bnpravi\w*/g, "napravi");
function creationText(value) {
  // Negating more questions does not negate the explicitly requested creation.
  return normalize(value).replace(/\b(?:nemoj|ne treba)(?:\s+mi)?(?:\s+vise)?\s+(?:postavljati|postavljaj|da\s+postavljas)(?:\s+vise)?\s+pitanj\w*/g, "").replace(/\bne\s+postavljaj(?:\s+mi)?(?:\s+vise)?\s+pitanj\w*/g, "").replace(/\b(?:don'?t|do not)\s+ask(?:\s+me)?(?:\s+any|\s+more|\s+further)*\s+questions?/g, "");
}
function cancelled(value) {
  return /\b(?:stop|cancel|otkazi|odustajem|ne zelim\s+(?:(?:ovaj|taj|novi|vise|nikakav)\s+){0,2}plan|nemoj\s+(?:mi\s+)?(?:da\s+)?(?:prav\w*|kreir\w*|unes\w*)\s+(?:ovaj\s+|taj\s+)?plan)\b/.test(creationText(value));
}
const NUMBERS = { jedan: 1, jedna: 1, jedno: 1, jednu: 1, one: 1, dva: 2, dve: 2, two: 2, tri: 3, three: 3, cetiri: 4, four: 4, pet: 5, five: 5, sest: 6, six: 6, sedam: 7, seven: 7, osam: 8, eight: 8, devet: 9, nine: 9, deset: 10, ten: 10, cetrnaest: 14, fourteen: 14 };
const NUMBER = "(?:\\d{1,3}|" + Object.keys(NUMBERS).join("|") + ")";
const MEAL_NAMES = { breakfast: /\b(?:breakfast|doruc\w*)\b/, lunch: /\b(?:lunch|ruc\w*)\b/, dinner: /\b(?:dinner|vecer\w*)\b/, snack: /\b(?:snack\w*|snak\w*|uzin\w*)\b/ };
const WEEKDAYS = [[/\b(?:sunday|nedelj[au])\b/, 0], [/\b(?:monday|ponedelj\w*)\b/, 1], [/\b(?:tuesday|utor\w*)\b/, 2], [/\b(?:wednesday|sred[aeu])\b/, 3], [/\b(?:thursday|cetvrt\w*)\b/, 4], [/\b(?:friday|petak|petka)\b/, 5], [/\b(?:saturday|subot\w*)\b/, 6]];
function numeric(value) { return /^\d+$/.test(value) ? Number(value) : NUMBERS[value]; }
function safeDate(value) { try { return protocol.addDaysISO(value, 0); } catch (_) { return null; } }
function detectPlan(text) {
  text = creationText(text);
  if (/\b(?:do not|don'?t|nemoj\w*|ne zelim|ne pravi|ne kreiraj|what if|if i|kad bih|kada bih|ako bih|hipotetic\w*)\b/.test(text)) return false;
  if (/\b(?:zelim|want|need)\s+(?:da\s+)?(?:znam|saznam|razumem|to\s+(?:know|understand|learn))\b/.test(text)) return false;
  const subject = (/\b(?:plan\w*|isplanir\w*|jelovnik\w*)\b/.test(text) && /\b(?:ishran\w*|obrok\w*|recept\w*|meals?|diet\w*|jelovnik\w*)\b/.test(text)) || /\bmeal\s*plan\w*\b/.test(text);
  const command = /\b(?:make|create|prepare|build|give|want|need|add|save|napravi\w*|kreiraj\w*|pripremi\w*|daj|zelim|treba|unes\w*|ubaci\w*|dodaj\w*|isplanir\w*|planir\w*|sastavi\w*)\b/.test(text) || /^(?:please\s+)?plan\b/.test(text);
  if (!duration(text) && /\b(?:u|in|into|to)\s+(?:(?:moj\w*|the|my)\s+)?plan\b/.test(text) && !/\b(?:make|create|napravi\w*|kreiraj\w*|sastavi\w*)\s+(?:mi\s+|a\s+)?(?:\w+\s+){0,2}(?:plan|jelovnik)\b/.test(text)) return false;
  if (/\b(?:budzet\w*|budget\w*|troskov\w*|cost\w*)\b/.test(text) && !/\b(?:jelovnik\w*|meal\s*plan)\b/.test(text) && !/\b(?:isplanir\w*|planir\w*)\s+(?:mi\s+)?(?:obrok\w*|ishran\w*)\b/.test(text)) return false;
  return subject && command;
}
function duration(text) {
  if (/\b(?:sedmodnevn\w*|sedmodnev\w*|7[ -]*dnevn\w*)\b/.test(text)) return 7;
  const match = text.match(new RegExp("\\b(" + NUMBER + ")\\s*(?:days?|dan[au]?|dnevni)\\b"));
  if (match) return numeric(match[1]);
  const weeks = text.match(new RegExp("\\b(" + NUMBER + ")\\s*(?:weeks?|nedelj\\w*|sedmic\\w*|tjed\\w*)\\b"));
  if (weeks) return numeric(weeks[1]) * 7;
  if (/\b(?:week|weekly|sedmic\w*|nedeljn\w*|tjedn\w*)\b/.test(text) || /\b(?:za|for|tokom)\s+(?:celu\s+|jednu\s+|a\s+|one\s+)?(?:nedelju|nedelji|nedelju dana)\b/.test(text)) return 7;
  return null;
}
function dateFromText(text, planningDate) {
  const iso = text.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (iso) return { found: true, value: safeDate(iso[0]) };
  const dotted = text.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\.?/);
  if (dotted) return { found: true, value: safeDate(dotted[3] + "-" + dotted[2].padStart(2, "0") + "-" + dotted[1].padStart(2, "0")) };
  if (/\b(?:tomorrow|sutra)\b/.test(text)) return { found: true, value: planningDate ? protocol.addDaysISO(planningDate, 1) : null };
  if (/\b(?:today|danas)\b/.test(text)) return { found: true, value: planningDate };
  if (/\b(?:od\s+(?:sledec\w*|naredn\w*)\s+nedelj\w*|from\s+next\s+week)\b/.test(text)) {
    if (!planningDate) return { found: true, value: null };
    const weekday = new Date(planningDate + "T00:00:00Z").getUTCDay();
    return { found: true, value: protocol.addDaysISO(planningDate, (8 - weekday) % 7 || 7) };
  }
  // "Nedelja" can mean a week or Sunday. Require a date-like preposition for Sunday.
  const weekdays = WEEKDAYS.filter(([pattern, day]) => day !== 0 || /\b(?:od|u|from|on|starting)\s+(?:nedelje|nedelju|sunday)\b/.test(text));
  for (const [pattern, weekday] of weekdays) {
    if (!pattern.test(text)) continue;
    if (!planningDate) return { found: true, value: null };
    const current = new Date(planningDate + "T00:00:00Z").getUTCDay();
    let offset = (weekday - current + 7) % 7;
    if (/\b(?:next|sledec\w*|iduc\w*)\b/.test(text) && offset === 0) offset = 7;
    return { found: true, value: protocol.addDaysISO(planningDate, offset) };
  }
  if (/\b(?:starting|pocinj\w*|pocev\w*|od|from)\b/.test(text)) return { found: true, value: null };
  return { found: false, value: null };
}
function mealSelection(text, bareAnswer, expectedCount) {
  const excluded = Object.keys(MEAL_NAMES).filter(key => new RegExp("(?:bez|without|no|necu|ne zelim|izostavi)\\s+" + MEAL_NAMES[key].source).test(text));
  const selected = Object.keys(MEAL_NAMES).filter(key => MEAL_NAMES[key].test(text) && !excluded.includes(key));
  const countMatch = text.match(new RegExp("\\b(" + NUMBER + ")\\s*(?:(?:glavn\\w*|main)\\s+)?(?:meals?|obrok\\w*|ishran\\w*)\\b")) || text.match(new RegExp("\\b(" + NUMBER + ")\\s*(?:puta|times)\\s*(?:dnevno|daily|a day|per day)\\b"));
  const bare = bareAnswer && text.trim().match(new RegExp("^(" + NUMBER + ")[.!]?$"));
  let count = countMatch ? numeric(countMatch[1]) : bare ? numeric(bare[1]) : null;
  const extraSnack = selected.includes("snack") && /\b(?:sa|s|uz|i|with|plus|and)\s+(?:\w+\s+){0,2}(?:snack\w*|snak\w*|uzin\w*)\b/.test(text);
  if (count === 3 && extraSnack && (selected.length === 1 || selected.length === 4)) return { value: ["breakfast", "lunch", "dinner", "snack"], count: 4 };
  if (count === 3 && selected.length === 1 && selected[0] === "snack") return { needsNames: true, count };
  if (count && count > 4) return { unsupported: true };
  if (selected.length) {
    const requested = count || expectedCount;
    if (requested === 3 && selected.length < 3 && !selected.includes("snack")) return { value: ["breakfast", "lunch", "dinner"], count: 3 };
    if (requested === 4 && selected.length < 4) return { value: ["breakfast", "lunch", "dinner", "snack"], count: 4 };
    return requested && requested !== selected.length ? { needsNames: true, count: requested } : { value: selected, count: requested || selected.length };
  }
  if (excluded.length) return { needsNames: true, count: count || expectedCount };
  if (count === 3) return { value: ["breakfast", "lunch", "dinner"], count };
  if (count === 4) return { value: ["breakfast", "lunch", "dinner", "snack"], count };
  if (count === 1 || count === 2) return { needsNames: true, count };
  return {};
}
function savedRecipesOnly(text) {
  return /\b(?:samo\s+(?:postojece|sacuvane)|only\s+(?:saved|existing)|no\s+new\s+recipes|bez\s+novih\s+recepata)\b/.test(text) || /\brecep(?:t\w*|at\w*)\s+(?:(?:koji|koje|sto)\s+(?:su\s+)?)?sacuvan\w*\b/.test(text);
}
function analyze(text, { planningDate, draft = null, answer, sourceMessageId } = {}) {
  const command = draft ? draft.command : String(text || "");
  const normalized = normalize(command);
  if (!draft && !detectPlan(normalized)) return null;
  const baseDate = safeDate(planningDate || (draft && draft.planningDate));
  const result = draft ? { ...draft, mealTypes: [...(draft.mealTypes || [])] } : { sourceMessageId: sourceMessageId || "", command, planningDate: baseDate, days: null, startDate: null, mealTypes: [], servings: 1, includeRecipes: true };
  result.planningDate = baseDate;
  const clarification = draft ? normalize(answer == null ? text : answer) : "";
  const samples = draft ? [clarification] : [normalized];
  let invalidDate = false; let needNames = false;
  for (const sample of samples) {
    const bareDays = draft && !result.days && sample.trim().match(new RegExp("^(" + NUMBER + ")[.!]?$", "i"));
    const days = duration(sample) ?? (bareDays ? numeric(bareDays[1]) : null);
    if (days != null) { if (days < 1 || days > 7) return { status: "unsupported", reason: "days", draft: result }; result.days = days; }
    const chosenDate = dateFromText(sample, baseDate);
    if (chosenDate.found) { if (!chosenDate.value) invalidDate = true; result.startDate = chosenDate.value; result.needsDate = !chosenDate.value; }
    const meals = bareDays ? {} : mealSelection(sample, !!draft && !result.mealTypes.length, result.mealsPerDay);
    if (meals.unsupported) return { status: "unsupported", reason: "mealTypes", draft: result };
    if (meals.value) result.mealTypes = meals.value;
    if (meals.count) result.mealsPerDay = meals.count;
    if (meals.needsNames) { result.mealTypes = []; needNames = true; }
    const servingMatch = sample.match(new RegExp("\\b(" + NUMBER + ")\\s*(?:servings?|portions?|people|persons?|porcij\\w*|osob\\w*)\\b"));
    if (servingMatch) { const servings = numeric(servingMatch[1]); if (servings < 1 || servings > 20) return { status: "unsupported", reason: "servings", draft: result }; result.servings = servings; }
    if (savedRecipesOnly(sample)) result.includeRecipes = false;
    else if (!/\b(?:nemoj\w*|ne pravi|ne kreiraj|don'?t|do not)\b/.test(creationText(sample)) && (/\b(?:include\s+new\s+recipes|new\s+recipes\s+too|ukljuci\s+nove\s+recepte|i\s+nove\s+recepte)\b/.test(sample) || /\b(?:unes\w*|ubaci\w*|dodaj\w*|napravi\w*)\s+(?:mi\s+)?(?:sve|potrebne|nove|nedostajuce)\s+recept\w*\b/.test(creationText(sample)))) result.includeRecipes = true;
  }
  if (!result.days) return { status: "pending", reason: "days", draft: result };
  if (invalidDate || result.needsDate) return { status: "pending", reason: "date", draft: result };
  if (!result.startDate) result.startDate = baseDate;
  if (!result.startDate) return { status: "pending", reason: "date", draft: result };
  if (needNames || !result.mealTypes.length) return { status: "pending", reason: result.mealsPerDay ? "mealNames" : "mealTypes", draft: result };
  let plan;
  try { plan = protocol.validateMealPlan({ days: result.days, startDate: result.startDate, mealTypes: result.mealTypes, servings: result.servings, includeRecipes: result.includeRecipes }); }
  catch (_) { return { status: "unsupported", reason: "date", draft: result }; }
  return { status: "ready", plan, draft: result };
}
function answersDraft(draft, value) {
  if (!draft) return false;
  const text = normalize(value).trim();
  if (!text || cancelled(text) || /^da\s+li\b|^(?:can|could|would)\s+you\b/.test(text)) return false;
  if (detectPlan(text)) return true;
  if (/\b(?:zalih\w*|namirnic\w*|sastoj\w*|web|internet|pretraz\w*|istraz\w*|browse|browser|pantry|inventory)\b/.test(text)) return false;
  if (/^(?:dodaj\w*|unes\w*|ubaci\w*|kreiraj\w*|napravi\w*|prikazi\w*|pokazi\w*|reci|objasni\w*|add|create|make|show|tell|explain)\b/.test(text) && !/\b(?:plan\w*|obrok\w*|recept\w*|ishran\w*|meal\w*|recipe\w*)\b/.test(text)) return false;
  if (!draft.days) return duration(text) != null || new RegExp("^(?:" + NUMBER + ")[.!]?$", "i").test(text);
  if (draft.needsDate || !draft.startDate) {
    if (!/\b(?:danas|sutra|today|tomorrow|nedelj\w*|sedmic\w*|week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|ponedelj\w*|utor\w*|sred\w*|cetvrt\w*|petak|subot\w*)\b|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\.\d{1,2}\.\d{4}\b/.test(text)) return false;
    return dateFromText(text, safeDate(draft.planningDate)).found;
  }
  if (!draft.mealTypes?.length) {
    const meals = mealSelection(text, true, draft.mealsPerDay);
    return Boolean(meals.count || meals.value || meals.needsNames || meals.unsupported);
  }
  return false;
}
function slots(value) {
  const plan = protocol.validateMealPlan(value);
  return Array.from({ length: plan.days }, (_, day) => plan.mealTypes.map(mealType => ({ plannedDate: protocol.addDaysISO(plan.startDate, day), mealType, servings: plan.servings }))).flat();
}
function recover(messages, { planningDate, canResume = false } = {}) {
  if (!messages.length) return null;
  const latest = messages.at(-1);
  if (cancelled(latest.text)) return null;
  const direct = detectPlan(latest.text);
  const continuation = canResume && /^(?:naravno|da\b|ok\b|u redu\b|nastavi\b|od (?:sutra|danas)\b|(?:ok )?daj\b|potvr\w*\b|unes\w*\b|ubaci\w*\b|sacuvaj\w*\b|yes\b|continue\b|go ahead\b)/.test(normalize(latest.text).trim());
  if (!direct && !continuation) return null;
  let boundary = 0;
  for (let index = messages.length - 2; index >= 0; index--) if (cancelled(messages[index].text)) { boundary = index + 1; break; }
  const sourceIndex = messages.findIndex((message, index) => index >= boundary && detectPlan(message.text));
  if (sourceIndex < 0) return null;
  const source = messages[sourceIndex];
  let result = analyze(source.text, { planningDate: source.planningDate || planningDate, sourceMessageId: source.id });
  for (const message of messages.slice(sourceIndex + 1)) {
    if (!result?.draft || result.status === "unsupported") break;
    result = analyze(source.text, { planningDate: message.planningDate || planningDate, draft: result.draft, answer: message.text });
  }
  return result ? { source, planning: result } : null;
}
function extend(latest, context, previousPlan) {
  if (!previousPlan || detectPlan(latest.text)) return null;
  const extensionCommand = message => {
    const text = creationText(message.text);
    return /\b(?:napravi\w*|dodaj\w*|isplanir\w*|planir\w*|dopuni\w*)\b/.test(text) && /\b(?:i za|jos|takodje|preostal\w*|ostatak|isti plan)\b/.test(text) && Object.values(MEAL_NAMES).some(pattern => pattern.test(text));
  };
  let source = extensionCommand(latest) ? latest : null;
  if (!source && /^(?:moze|mozes|da|ok|u redu|yes|sure)\b/.test(creationText(latest.text).trim())) {
    const prior = context.at(-2);
    if (prior && extensionCommand(prior)) source = prior;
  }
  if (!source) return null;
  const selected = Object.keys(MEAL_NAMES).filter(key => MEAL_NAMES[key].test(creationText(source.text)));
  if (!selected.length) return null;
  const occupied = new Set(previousPlan.occupiedSlots.map(item => item.plannedDate + "/" + item.mealType));
  const plan = { ...previousPlan.plan, mealTypes: selected };
  const requested = slots(plan);
  if (requested.some(item => occupied.has(item.plannedDate + "/" + item.mealType))) return { source, planning: { status: "occupied" } };
  const origin = context.find(item => item.id === previousPlan.sourceMessageId);
  plan.includeRecipes = !(savedRecipesOnly(creationText(source.text)) || (origin && savedRecipesOnly(creationText(origin.text)))) && previousPlan.plan.includeRecipes;
  return { source, planning: { status: "ready", plan } };
}
module.exports = { analyze, answersDraft, slots, detectPlan, creationText, cancelled, recover, extend };
