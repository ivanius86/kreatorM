"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createMentorCore } = require("../../server/mentor-core.js");
const protocol = require("../../js/mentor/mentor-protocol.js");
const mealPlanning = require("../../server/meal-planning.js");
const actionResources = require("../../js/i18n/mentor-actions.js");

const arepaCommand = "make me recipie for arepa: Prethodno kuvano belo kukuruzno brašno (P.A.N.)\t200\tg Mlaka voda\t300\tml So\t5\tg Biljno ulje\t10\tml Pileća prsa\t250\tg Avokado\t1\tkom (150 g) Majonez\t40\tg Sok limete\t15\tml Beli luk\t1\tčen (4 g) Svež korijander\t10\tg Crni biber\t1\tg";
const misleadingRecipe = "I have prepared the recipe Reina Pepiada Arepa. Ingredients: foodId: 101, quantity: 200, unit: g. I cannot directly save it. When it appears in pending approvals, approve and save it.";

const source = { id: "12345", title: "Onions", url: "https://www.themealdb.com/meal.php?c=12345", originalImageUrl: "", ingredients: [{ name: "Onion", measure: "100 g" }] };
const recipeSources = { discover: async () => [source], get: id => id === source.id ? source : null };
const cases = [
  {
    action: "createGoal", text: "Create one goal",
    group: "goals", proposal: { action: "createGoal", title: "Learn", type: "habit", category: "Personal Growth", reason: "", firstAction: "Read", mainMilestone: "", successMeasurement: "", targetDate: null, duration: "", frequency: "", bestTime: "", priority: "medium", tasks: [], milestones: [] }
  },
  {
    action: "createIdea", text: "Create one idea",
    group: "ideas", proposal: { action: "createIdea", title: "Idea", description: "Try it", type: "creative", priority: "medium", tags: [] }
  },
  {
    action: "createRecipe", text: "Create one vegan recipe",
    group: "recipes", proposal: { action: "createRecipe", name: "Onions", description: "Adapted onion recipe", servings: 1, mealType: "dinner", ingredients: [{ foodId: "food_onion_raw", name: "Onion", quantity: 100, unit: "g" }], sourceId: "12345", adapted: true, adaptationNote: "Use 100 g raw onion in this new formulation.", unresolved: [] }
  },
  {
    action: "createMealPlanEntry", text: "Create one meal",
    group: "mealPlanEntries", proposal: { action: "createMealPlanEntry", recipeId: "saved-recipe-1", plannedDate: "2028-01-15", mealType: "dinner", servings: 1 },
    recipeContext: [{ id: "saved-recipe-1", name: "Existing", servings: 1, mealType: "dinner" }]
  }
];
function request(item) {
  return protocol.validateRequest({ requestId: "core-test-1234", language: "en", messages: [{ id: "message-1", role: "user", text: item.text }], goalContext: null, ...(item.recipeContext ? { recipeContext: item.recipeContext } : {}) });
}
function providerFor(item, result = { reply: "Review", [item.group]: [item.proposal] }) {
  const calls = [];
  const provider = {
    async classify(input) { calls.push({ type: "classify", input }); return { content: { evidence: item.text, requests: [{ action: item.action, count: 1 }] }, usage: null }; },
    async generateReply(input) { calls.push({ type: "generate", input }); return { content: result, usage: null }; }
  };
  return { provider, calls };
}

test("ordinary chat uses a plain reply and proposes no action", async () => {
  const calls = [];
  const provider = { classify() { throw new Error("classification should not run"); }, async generateReply(input) { calls.push(input); return { content: "  What is your priority?  ", usage: null }; } };
  const core = createMentorCore({ provider, recipeSources });
  const response = await core.generate(request({ text: "Help me choose a priority." }));
  assert.deepEqual(response, { reply: "What is your priority?", proposal: null, proposals: [], intent: null });
  assert.equal(calls.length, 1); assert.equal(calls[0].schema, null);
  assert.deepEqual(protocol.validateResponse(response), response);
});

test("the original recipie command authorizes one structured recipe and searches the named dish", async () => {
  const item = { ...cases[2], text: arepaCommand };
  const { provider, calls } = providerFor(item);
  const sources = { ...recipeSources, discover: async options => { assert.equal(options.query, "arepa"); return [source]; } };
  const response = await createMentorCore({ provider, recipeSources: sources }).generate(request(item));
  assert.equal(calls[0].type, "classify");
  assert.deepEqual(response.intent.requests, [{ action: "createRecipe", count: 1 }]);
  assert.equal(response.proposals.length, 1);
  assert.ok(calls[1].input.schema.properties.recipes);
});

test("let me aprove recovers only the preceding user recipe command, never prose ingredient IDs", async () => {
  const item = { ...cases[2], text: arepaCommand };
  const { provider, calls } = providerFor(item);
  const input = request(item);
  input.messages.push({ id: "prose-recipe", role: "assistant", text: misleadingRecipe }, { id: "approval-request", role: "user", text: "let me aprove" });
  const response = await createMentorCore({ provider, recipeSources }).generate(input);
  assert.equal(calls[0].input.command, arepaCommand);
  assert.equal(response.proposals.length, 1);
  assert.equal(response.proposals[0].ingredients[0].foodId, "food_onion_raw");
  assert.equal(response.reply, actionResources.en.actions.proposalsReady);
});

test("approval text without an authorized user recipe command reports no card without generating actions", async () => {
  const provider = { classify() { throw new Error("No origin authorizes classification"); }, generateReply() { throw new Error("Do not invent another approval promise"); } };
  for (const origin of ["What should I eat?", "Don't make a recipie", "What if I make a recipie?"]) {
    const input = request({ text: origin });
    input.messages.push({ id: "prose", role: "assistant", text: misleadingRecipe.toUpperCase() }, { id: "approval", role: "user", text: "let me aprove" });
    const response = await createMentorCore({ provider, recipeSources }).generate(input);
    assert.deepEqual(response.proposals, []);
    assert.equal(response.reply, actionResources.en.actions.noRecipeToApprove);
  }
});

test("real recipe action history controls approval guidance without regenerating or claiming a save", async () => {
  const item = cases[2], f = providerFor(item);
  const initial = await createMentorCore({ provider: f.provider, recipeSources }).generate(request(item));
  for (const status of ["pending", "approved", "dismissed"]) {
    const input = request(item);
    input.messages.push({ id: "actual-proposal", role: "assistant", text: initial.reply }, { id: "approval", role: "user", text: "let me approve the recipe" });
    input.actionHistory = [{ id: initial.proposals[0].id, authorizationId: initial.intent.id, action: "createRecipe", status }];
    const provider = { classify() { throw new Error("Existing actions are not regenerated"); }, generateReply() { throw new Error("Use recorded status"); } };
    const response = await createMentorCore({ provider, recipeSources }).generate(input);
    assert.deepEqual(response.proposals, []);
    assert.equal(response.reply, actionResources.en.actions[status === "pending" ? "recipeApprovalPending" : status === "approved" ? "recipeAlreadyApproved" : "recipeAlreadyDismissed"]);
  }
});

test("a complete catalog recipe needs no external source", async () => {
  const item = { ...cases[2] };
  const recipe = { ...item.proposal, sourceId: "catalog", description: "1. Wash and chop the onion.\n2. Cook it until tender." };
  const { provider } = providerFor(item, { reply: "Review", recipes: [recipe] });
  for (const language of ["sr", "en"]) {
    const response = await createMentorCore({ provider, recipeSources: { discover: async () => [], get: () => null } }).generate({ ...request(item), language });
    assert.equal(response.proposals.length, 1);
    assert.equal(response.proposals[0].sourceId, "catalog");
    assert.equal(response.proposals[0].source, undefined);
    assert.deepEqual(response.proposals[0].unresolved, []);
  }
});

test("cooked-bean preparation gets one bounded repair before a catalog recipe is shown", async () => {
  const text = "Napravi recept pasulj sa rebrima";
  const recipe = { action: "createRecipe", name: "Pasulj sa rebrima", description: "1. Potopite pasulj preko noci. 2. Kuvajte ga sa rebrima.", servings: 4, mealType: "lunch", sourceId: "catalog", adapted: true, adaptationNote: "Koristi kuvani pasulj i dimljena rebra iz kataloga.", ingredients: [{ foodId: "food_beans_pinto_boiled", name: "Pasulj", quantity: 500, unit: "g" }, { foodId: "food_smoked_pork_ribs_cia_aboliv", name: "Rebra", quantity: 600, unit: "g" }], unresolved: [] };
  for (const corrected of [true, false]) {
    let calls = 0;
    const provider = { classify: async () => ({ content: { evidence: text, requests: [{ action: "createRecipe", count: 1 }] } }), generateReply: async input => {
      calls++;
      if (calls === 2) assert.ok(input.instructions.includes("UNTRUSTED_PREPARATION_FEEDBACK"));
      return { content: { reply: "Pregled", recipes: [{ ...recipe, ...(calls === 2 && corrected ? { description: "1. Kuvajte dimljena rebra dok ne omeksaju. 2. Dodajte vec kuvani pasulj i dovrsite jelo." } : {}) }] } };
    } };
    const response = await createMentorCore({ provider, recipeSources: { discover: async () => [], get: () => null } }).generate({ ...request({ text }), language: "sr" });
    assert.equal(calls, 2);
    assert.equal(response.proposals[0].unresolved.length === 0, corrected);
    assert.equal(response.proposals[0].ingredients[0].name, "Pasulj, kuvan");
  }
});

test("the typo path never creates fake catalog foods or extra unrequested recipe cards", async () => {
  const item = { ...cases[2], text: arepaCommand };
  const unknown = { ...item.proposal, ingredients: [{ foodId: "101", name: "P.A.N. precooked flour", quantity: 200, unit: "g" }] };
  const { provider } = providerFor(item, { reply: misleadingRecipe, recipes: [unknown, unknown] });
  const response = await createMentorCore({ provider, recipeSources }).generate(request(item));
  assert.equal(response.proposals.length, 1);
  assert.equal(response.proposals[0].ingredients[0].foodId, "101");
  assert.ok(response.proposals[0].unresolved.some(issue => issue.includes("missing from the catalog")));
  assert.equal(response.reply, actionResources.en.actions.proposalsReady);
});

test("a topic change prevents approval text from resurrecting an older recipe command", async () => {
  const input = request({ text: arepaCommand });
  input.messages.push({ id: "old-reply", role: "assistant", text: misleadingRecipe }, { id: "finance-question", role: "user", text: "Show spending this month" }, { id: "reply", role: "assistant", text: "No recipe proposal was created." }, { id: "approval", role: "user", text: "let me aprove" });
  const provider = { classify() { throw new Error("Do not recover across a topic change"); }, generateReply() { throw new Error("Explain missing approval locally"); } };
  const response = await createMentorCore({ provider, recipeSources }).generate(input);
  assert.equal(response.reply, actionResources.en.actions.noRecipeToApprove);
  assert.deepEqual(response.proposals, []);
});

test("plain recipe replies cannot pretend fake ingredient IDs are an approvable card", async () => {
  const provider = { classify() { throw new Error("Informational text is not authorization"); }, generateReply: async () => ({ content: misleadingRecipe, usage: null }) };
  const response = await createMentorCore({ provider, recipeSources }).generate(request({ text: "Tell me about arepas." }));
  assert.deepEqual(response.proposals, []);
  assert.equal(response.reply, actionResources.en.actions.noRecipeToApprove);
  assert.ok(!response.reply.includes("foodId"));
});

test("an empty model reply does not discard an otherwise valid authorized recipe", async () => {
  const item = cases[2], { provider } = providerFor(item, { reply: "   ", recipes: [item.proposal] });
  const response = await createMentorCore({ provider, recipeSources }).generate(request(item));
  assert.equal(response.proposals.length, 1);
  assert.equal(response.reply, actionResources.en.actions.proposalsReady);
  assert.deepEqual(protocol.validateResponse(response), response);
});

test("locally malformed recipe fields produce no unsafe card and an explicit localized explanation", async () => {
  for (const language of ["sr", "en"]) for (const invalidField of ["sourceId", "quantity"]) {
    const item = cases[2], proposal = structuredClone(item.proposal);
    if (invalidField === "sourceId") proposal.sourceId = "https://invalid.example/private-test-value";
    else proposal.ingredients[0].quantity = "250";
    const { provider } = providerFor(item, { reply: "Review this recipe", recipes: [proposal] });
    const response = await createMentorCore({ provider, recipeSources }).generate({ ...request(item), language });
    assert.deepEqual(response.proposals, []);
    assert.equal(response.reply, actionResources[language].actions.noRecipeProposal);
    assert.equal(response.intent, null);
    assert.ok(!response.reply.includes("private-test-value"));
  }
});

test("the cooked beans and ribs request discovers pork sources for its requested meat", async () => {
  const item = { ...cases[2], text: "napravi mi recept za kuvani pasulj sa rebrima, nadji sastojke bilo koje" };
  const { provider } = providerFor(item);
  const sources = { ...recipeSources, discover: async options => { assert.equal(options.query, "pork"); return [source]; } };
  const response = await createMentorCore({ provider, recipeSources: sources }).generate(request(item));
  assert.equal(response.proposals.length, 1);
});

test("recipe fallback never masks provider INVALID_RESPONSE failures", async () => {
  const item = cases[2], { provider } = providerFor(item);
  provider.generateReply = async () => { throw Object.assign(new Error("INVALID_RESPONSE"), { code: "INVALID_RESPONSE", phase: "generated-json" }); };
  await assert.rejects(createMentorCore({ provider, recipeSources }).generate(request(item)), { code: "INVALID_RESPONSE", phase: "generated-json" });
});

for (const item of cases) {
  test(`${item.action} keeps explicit intent, proposal shape and frontend protocol`, async () => {
    const { provider, calls } = providerFor(item);
    const response = await createMentorCore({ provider, recipeSources }).generate(request(item));
    assert.equal(calls.length, 2);
    assert.equal(calls[0].type, "classify"); assert.equal(calls[0].input.command, item.text);
    assert.equal(calls[1].type, "generate"); assert.ok(calls[1].input.schema.properties[item.group]);
    assert.deepEqual(response.intent.requests, [{ action: item.action, count: 1 }]);
    assert.equal(response.proposals.length, 1);
    assert.equal(response.proposals[0].action, item.action);
    if (item.action === "createRecipe") assert.deepEqual(response.proposals[0].unresolved, []);
    assert.equal(response.proposals[0].authorizationId, response.intent.id);
    assert.equal(response.proposals[0].id, response.intent.id + "_" + item.action + "_0");
    assert.deepEqual(protocol.validateResponse(response), response);
  });
}

test("five chicken recipes use catalog and sources without requesting pantry details", async () => {
  const text = "Napravi 5 recepata sa piletinom";
  const chickenSource = { ...source, title: "Chicken", ingredients: [{ name: "Chicken Breast", measure: "150 g" }] };
  const sources = { discover: async options => { assert.equal(options.query, "chicken"); return [chickenSource]; }, get: id => id === chickenSource.id ? chickenSource : null };
  const calls = [];
  const provider = {
    async classify(input) { calls.push({ type: "classify", input }); return { content: { evidence: text, requests: [{ action: "createRecipe", count: 5 }] }, usage: null }; },
    async generateReply(input) {
      calls.push({ type: "generate", input });
      return { content: { reply: "Proveri pet predloga recepata.", recipes: Array.from({ length: 5 }, (_, index) => ({
        action: "createRecipe", name: `Piletina ${index + 1}`, description: `Prilagođen recept ${index + 1}`,
        servings: 1, mealType: "lunch", ingredients: [{ foodId: "food_chicken_breast_skinless_raw", name: "Chicken Breast", quantity: 150 + index * 10, unit: "g" }],
        sourceId: chickenSource.id, adapted: true, adaptationNote: `Use ${150 + index * 10} g chicken breast.`, unresolved: []
      })) }, usage: null };
    }
  };
  const response = await createMentorCore({ provider, recipeSources: sources }).generate(protocol.validateRequest({
    requestId: "five-chicken-recipes", language: "sr", messages: [{ id: "chicken-request", role: "user", text }], goalContext: null
  }));
  assert.equal(calls.length, 2);
  assert.deepEqual(response.intent.requests, [{ action: "createRecipe", count: 5 }]);
  assert.equal(response.proposals.length, 5);
  assert.ok(response.proposals.every(item => item.unresolved.length === 0));
  assert.match(calls[1].input.instructions, /food_chicken_breast_skinless_raw/);
  assert.match(calls[1].input.instructions, /Chicken Breast/);
  assert.match(calls[1].input.instructions, /Do not ask the user to list pantry ingredients/);
  assert.deepEqual(protocol.validateResponse(response), response);
});

test("invalid parameters never expose executable proposals; malformed recipes return a safe explanation", async () => {
  const invalid = [
    { ...cases[0].proposal, targetDate: "2027-02-29" },
    { ...cases[1].proposal, title: "" },
    { ...cases[2].proposal, ingredients: [{ foodId: "food_onion_raw", quantity: -1, unit: "g" }] },
    { ...cases[3].proposal, plannedDate: "2027-02-29" }
  ];
  for (const [index, item] of cases.entries()) {
    const { provider } = providerFor(item, { reply: "Review", [item.group]: [invalid[index]] });
    if (item.action === "createRecipe") {
      const response = await createMentorCore({ provider, recipeSources }).generate(request(item));
      assert.deepEqual(response.proposals, []);
      assert.equal(response.reply, actionResources.en.actions.noRecipeProposal);
    } else await assert.rejects(createMentorCore({ provider, recipeSources }).generate(request(item)), { code: "INVALID_RESPONSE" }, item.action);
  }
});

test("unrequested action and unsupported action cannot pass the common policy", async () => {
  const item = cases[1];
  const unrequested = providerFor(item, { reply: "Review", ideas: [item.proposal], goals: [cases[0].proposal] });
  const response = await createMentorCore({ provider: unrequested.provider, recipeSources }).generate(request(item));
  assert.deepEqual(response.proposals.map(proposal => proposal.action), ["createIdea"]);
  const unsupported = providerFor(item, { reply: "Review", ideas: [{ action: "deleteAll", title: "Danger" }] });
  await assert.rejects(createMentorCore({ provider: unsupported.provider, recipeSources }).generate(request(item)), { code: "INVALID_RESPONSE" });
});

test("model classification without exact user evidence cannot authorize an action", async () => {
  const item = cases[0];
  const { provider } = providerFor(item);
  provider.classify = async () => ({ content: { evidence: "invented command", requests: [{ action: "createGoal", count: 1 }] }, usage: null });
  provider.generateReply = async input => { assert.equal(input.schema, null); return { content: "Let's discuss your goal.", usage: null }; };
  const response = await createMentorCore({ provider, recipeSources }).generate(request(item));
  assert.equal(response.intent, null); assert.deepEqual(response.proposals, []);
});

test("multi-day plan keeps every requested slot and uses the existing recipe context", async () => {
  const item = { text: "Make a meal plan for 2 days, 3 meals daily from 2028-01-15, only saved recipes", recipeContext: cases[3].recipeContext };
  const calls = [];
  const provider = {
    classify() { throw new Error("ready plans use deterministic intent"); },
    async generateReply(input) {
      calls.push(input);
      const plan = { days: 2, startDate: "2028-01-15", mealTypes: ["breakfast", "lunch", "dinner"], servings: 1, includeRecipes: false };
      return { content: { reply: "Review", mealPlanEntries: mealPlanning.slots(plan).map(slot => ({ action: "createMealPlanEntry", recipeId: "saved-recipe-1", ...slot })) }, usage: null };
    }
  };
  const response = await createMentorCore({ provider, recipeSources }).generate(request(item));
  assert.equal(calls.length, 1);
  assert.equal(response.intent.mealPlan.days, 2);
  assert.equal(response.proposals.length, 6);
  assert.deepEqual(response.proposals.map(({ plannedDate, mealType }) => `${plannedDate}/${mealType}`), [
    "2028-01-15/breakfast", "2028-01-15/lunch", "2028-01-15/dinner",
    "2028-01-16/breakfast", "2028-01-16/lunch", "2028-01-16/dinner"
  ]);
  assert.deepEqual(protocol.validateResponse(response), response);
});

test("pancake follow-up produces six approval cards from saved recipes", async () => {
  const original = "isplaniraj mi naredna 3 dana, 3 ishrane dnevno, razlicite recepte koje su sacuvani";
  const extension = "napravi mi i za dorucak i veceru";
  const messages = [
    { id: "plan-origin", role: "user", text: original }, { id: "plan-result", role: "assistant", text: "Plan je sačuvan." },
    { id: "plan-extension", role: "user", text: extension }, { id: "question", role: "assistant", text: "Da li želiš palačinke?" },
    { id: "answer", role: "user", text: "moze palacinke" }
  ];
  const recipeContext = [{ id: "saved-pancakes", name: "Palačinke", servings: 1, mealType: "breakfast" }, { id: "saved-dinner", name: "Večera", servings: 1, mealType: "dinner" }];
  const previousPlan = { sourceMessageId: "plan-origin", plan: { days: 3, startDate: "2026-10-29", mealTypes: ["lunch"], servings: 1, includeRecipes: true }, occupiedSlots: ["2026-10-29", "2026-10-30", "2026-10-31"].map(plannedDate => ({ plannedDate, mealType: "lunch" })) };
  const provider = {
    classify() { throw new Error("a plan extension uses deterministic intent"); },
    async generateReply(input) {
      assert.ok(input.schema.properties.mealPlanEntries);
      assert.equal(input.schema.properties.recipes, undefined);
      assert.match(input.instructions, /moze palacinke/);
      const entries = mealPlanning.slots({ ...previousPlan.plan, mealTypes: ["breakfast", "dinner"], includeRecipes: false }).map(slot => ({ action: "createMealPlanEntry", recipeId: slot.mealType === "breakfast" ? "saved-pancakes" : "saved-dinner", ...slot }));
      return { content: { reply: "Review", mealPlanEntries: entries }, usage: null };
    }
  };
  const response = await createMentorCore({ provider, recipeSources }).generate(protocol.validateRequest({ requestId: "pancake-plan-extension", language: "sr", messages, goalContext: null, recipeContext, previousPlan, planningDate: "2026-10-29", mealPlanContext: messages.filter(row => row.role === "user") }));
  assert.equal(response.proposals.length, 6);
  assert.deepEqual(response.proposals.map(item => item.mealType), ["breakfast", "dinner", "breakfast", "dinner", "breakfast", "dinner"]);
  assert.equal(response.proposals.filter(item => item.action === "createRecipe").length, 0);
  assert.deepEqual(protocol.validateResponse(response), response);
  const withoutPancakes = await createMentorCore({ provider: { classify() { throw new Error("no call expected"); }, generateReply() { throw new Error("no call expected"); } }, recipeSources }).generate(protocol.validateRequest({ requestId: "pancake-missing", language: "sr", messages, goalContext: null, recipeContext: recipeContext.filter(item => item.id !== "saved-pancakes"), previousPlan, planningDate: "2026-10-29", mealPlanContext: messages.filter(row => row.role === "user") }));
  assert.match(withoutPancakes.reply, /ne nalazim palačinke/);
  assert.deepEqual(withoutPancakes.proposals, []);
});

test("three saved chicken lunches must use three distinct recipe IDs", async () => {
  const text = "Isplaniraj 3 dana, 3 obroka dnevno, za rucak razlicite recepte koje su sacuvani";
  const recipeContext = ["one", "two", "three"].map((id, index) => ({ id: "saved-chicken-" + id, name: "Pileći recept " + (index + 1), servings: 1, mealType: "lunch" }));
  recipeContext.push({ id: "saved-breakfast", name: "Palačinke", servings: 1, mealType: "breakfast" }, { id: "saved-dinner", name: "Večera", servings: 1, mealType: "dinner" });
  const req = protocol.validateRequest({ requestId: "distinct-chicken-lunches", language: "sr", messages: [{ id: "plan-unique", role: "user", text }], goalContext: null, planningDate: "2026-10-29", recipeContext });
  const plan = { days: 3, startDate: "2026-10-29", mealTypes: ["breakfast", "lunch", "dinner"], servings: 1, includeRecipes: false };
  const generate = duplicate => createMentorCore({ provider: {
    classify() { throw new Error("ready plan classification is local"); },
    async generateReply() { return { content: { reply: "Review", mealPlanEntries: mealPlanning.slots(plan).map((slot, index) => ({ action: "createMealPlanEntry", recipeId: slot.mealType === "lunch" ? "saved-chicken-" + (duplicate ? "one" : ["one", "two", "three"][Math.floor(index / 3)]) : slot.mealType === "breakfast" ? "saved-breakfast" : "saved-dinner", ...slot })) }, usage: null }; }
  }, recipeSources }).generate(req);
  assert.equal((await generate(false)).proposals.length, 9);
  const rejected = await generate(true);
  assert.deepEqual(rejected.proposals, []);
  assert.equal(rejected.intent, null);
});

test("Core aggregates provider token usage on the server without changing chat response", async () => {
  const item = cases[1]; const { provider } = providerFor(item); const reports = [];
  const classify = provider.classify; const generateReply = provider.generateReply;
  provider.classify = async input => ({ ...await classify(input), usage: { inputTokens: 5, outputTokens: 2, totalTokens: 7 } });
  provider.generateReply = async input => ({ ...await generateReply(input), usage: { inputTokens: 20, outputTokens: 8, totalTokens: 28 } });
  const response = await createMentorCore({ provider, recipeSources, onUsage: report => reports.push(report) }).generate(request(item));
  assert.deepEqual(reports, [{ requestId: "core-test-1234", usage: { inputTokens: 25, outputTokens: 10, totalTokens: 35 } }]);
  assert.equal(response.usage, undefined);
});
