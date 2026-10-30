"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");

function fixture({ pending = false } = {}) {
  const document = { activeElement: null, querySelectorAll: () => [] };
  class Node {
    constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {}; this.classList = { add() {} }; }
    set textContent(value) { this.text = String(value); this.children = []; }
    get textContent() { return (this.text || "") + this.children.map(child => child.textContent).join(""); }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; }
    before() {}
    setAttribute() {}
    addEventListener() {}
    focus() { document.activeElement = this; }
  }
  document.createElement = tag => new Node(tag);
  document.createTextNode = text => { const node = new Node("text"); node.textContent = text; return node; };
  const food = { id: "chosen-food", defaultName: "Chosen food", status: "active" };
  let hydrate;
  const hydration = new Promise(resolve => { hydrate = resolve; });
  const root = {
    MentorI18n: { t: key => key, hasTranslation: () => false }, MentorChatProtocol: {}, MentorAppReadyPromise: Promise.resolve(),
    MentorLazy: { loadFeature: async () => { await hydration; root.MentorFoodRepository = { getById: id => id === food.id ? food : null }; } },
    MentorPlanningService: { assertConstraints() {}, validateRecipe: () => ({ valid: true }) },
    MentorMealPlanSelectors: { recipeNutrition: () => null }, MentorRecipeProfileService: { deriveRecipeProfile: () => ({}) }
  };
  const context = vm.createContext({ window: root, document, Promise, Set, Map });
  for (const name of ["mentor-action-adapters.js", "mentor-action-cards.js"]) vm.runInContext(fs.readFileSync(path.join(__dirname, "../../js/mentor", name), "utf8"), context);
  if (pending) root.MentorActionAdapters = { ...root.MentorActionAdapters, preview: async action => { await root.MentorActionAdapters.ensure(action); return { pending: true }; } };
  const action = { id: "recipe-action", action: "createRecipe", name: "Dish", description: "Cook", servings: 1, mealType: "dinner", sourceId: "12345", source: { id: "12345" }, ingredients: [{ foodId: "unselected", quantity: 100, unit: "g" }], unresolved: ["choose-food"], resolutionRequests: [{ targetIndex: 0, name: "Food", issue: "choose-food", quantity: 100, unit: "g", candidates: [{ id: food.id, name: food.defaultName }] }] };
  const message = { id: "message", proposals: [action], actionStates: { [action.id]: { choices: { 0: food.id } } } };
  const busy = new Set();
  const batch = root.MentorActionCards.create(message, { busy });
  const descendants = node => [node, ...node.children.flatMap(descendants)];
  const nodes = descendants(batch), approve = nodes.find(node => node.dataset.mentorAction === "approve-action"), select = nodes.find(node => node.tagName === "select");
  return { root, action, message, busy, batch, approve, select, document, hydrate, settle: () => new Promise(resolve => setImmediate(resolve)) };
}

test("saved recipe choices enable approval after Nutrition hydration without replacing the focused select", async () => {
  const f = fixture();
  f.select.focus();
  assert.equal(f.approve.disabled, true, "Approval waits for validation");
  f.hydrate(); await f.settle();
  assert.deepEqual(Array.from(f.root.MentorActionAdapters.recipeIssues(f.action, f.message)), []);
  assert.equal(f.approve.disabled, false);
  assert.equal(f.document.activeElement, f.select);
  assert.equal(f.select.value, "chosen-food");
  assert.ok(!f.batch.textContent.includes("choose-food"));
});

test("hydration completion keeps busy or finalized actions disabled", async () => {
  for (const state of ["action-busy", "message-busy", "approved", "dismissed"]) {
    const f = fixture();
    if (state === "action-busy") f.busy.add(f.action.id);
    else if (state === "message-busy") f.busy.add(f.message.id);
    else f.message.actionStates[f.action.id].status = state;
    f.hydrate(); await f.settle();
    assert.equal(f.approve.disabled, true, state);
  }
});

test("unresolved ingredients and failed domain validation keep approval disabled after hydration", async () => {
  for (const invalid of ["unresolved", "validation"]) {
    const f = fixture();
    if (invalid === "unresolved") delete f.message.actionStates[f.action.id].choices[0];
    else f.root.MentorPlanningService.validateRecipe = () => ({ valid: false, errors: [{ field: "ingredients", code: "invalid" }] });
    f.hydrate(); await f.settle();
    assert.equal(f.approve.disabled, true, invalid);
    assert.ok(f.batch.textContent.includes(invalid === "unresolved" ? "choose-food" : "ingredients: invalid"));
  }
});

test("a preview with an unsaved prerequisite keeps approval disabled", async () => {
  const f = fixture({ pending: true });
  f.hydrate(); await f.settle();
  assert.equal(f.approve.disabled, true);
});

test("missing-food alternatives never clear the issue through a saved direct choice", async () => {
  const f = fixture(); f.action.resolutionRequests[0].kind = "missing";
  f.hydrate(); await f.settle();
  assert.equal(f.approve.disabled, true);
  assert.ok(f.root.MentorActionAdapters.recipeIssues(f.action, f.message).includes("choose-food"));
});
