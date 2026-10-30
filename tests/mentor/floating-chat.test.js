"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = file => fs.readFileSync(path.resolve(__dirname, "../..", file), "utf8");

test("HTML mounts one global chat outside module views and retains the Creator and SR/EN controls", () => {
  const html = source("index.html"), stack = [], ids = new Map();
  const voids = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  for (const match of html.matchAll(/<\/?([a-z][\w-]*)\b[^>]*>/gi)) {
    const tag = match[1].toLowerCase();
    if (match[0].startsWith("</")) { const index = stack.map(item => item.tag).lastIndexOf(tag); if (index >= 0) stack.length = index; continue; }
    const id = match[0].match(/\bid="([^"]+)"/)?.[1];
    if (id) { assert.ok(!ids.has(id), "duplicate ID " + id); ids.set(id, { ancestors: stack.map(item => item.id || item.tag), markup: match[0] }); }
    if (!voids.has(tag) && !match[0].endsWith("/>")) stack.push({ tag, id });
  }
  assert.deepEqual(ids.get("mentorFloatingRoot").ancestors, ["html", "body"]);
  assert.ok(ids.get("mentorMessageInput").ancestors.includes("mentorFloatingRoot"));
  assert.ok(!ids.get("mentorMessageInput").ancestors.includes("builderView"));
  assert.ok(ids.get("mentorManualCreator").ancestors.includes("builderView"));
  assert.ok(!/\bhidden\b/.test(ids.get("mentorManualCreator").markup));
  const i18n = vm.createContext({ window: {} });
  for (const file of ["js/i18n/sr-core.js", "js/i18n/en-core.js", "js/i18n/mentor.js"]) vm.runInContext(source(file), i18n);
  for (const locale of ["sr", "en"]) {
    const resources = i18n.window.MentorI18nResources[locale];
    assert.ok(resources.nav.goalCreator && resources.nav.goalCreator !== "Mentor");
    for (const key of ["open", "close", "minimizeHistory", "showHistory", "creator", "tools"]) assert.ok(resources.mentor.floating[key]);
  }
});

// Small DOM boundary double: these checks exercise controller/view lifecycle,
// not layout or browser acceptance (which remains a manual user check).
function dom() {
  const nodes = new Map();
  const document = { body: { dataset: { activeView: "dashboard" } }, activeElement: null };
  function node(id) {
    const listeners = new Map(), attributes = new Map(), classes = new Set();
    const value = {
      id, dataset: {}, value: "", disabled: false, open: false, style: { setProperty() {} },
      classList: { toggle(key, yes) { if (yes) classes.add(key); else classes.delete(key); }, contains: key => classes.has(key) },
      setAttribute: (key, value) => attributes.set(key, value), getAttribute: key => attributes.get(key), removeAttribute: key => attributes.delete(key),
      contains(target) { return target === value || target?.parent === value || (target?.parent && value.contains(target.parent)); },
      querySelector(selector) { if (selector !== "summary") return nodes.get(selector.slice(1)); const summary = node("tools-summary"); summary.parent = value; return summary; },
      querySelectorAll: () => [],
      focus() { document.activeElement = value; },
      closest(selector) { return selector === "button[data-mentor-action]" && value.dataset.mentorAction ? value : null; },
      addEventListener(type, callback) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(callback); },
      emit(type, event = {}) { event.target ||= value; event.preventDefault ||= () => {}; event.stopPropagation ||= () => {}; for (const callback of listeners.get(type) || []) callback(event); },
      getBoundingClientRect: () => ({ top: 0 })
    };
    nodes.set(id, value); return value;
  }
  for (const id of ["mentorFloatingRoot", "mentorChatPanel", "mentorHistoryPanel", "mentorLauncher", "mentorMinimizeButton", "mentorChatTools", "mentorMessageInput", "mentorSendButton", "mentorCancelButton", "mentorConversationSelect", "mentorGoalContext", "mentorMessages", "mentorRequestStatus", "mentorSetupStatus", "mentorComposer", "mentorClarificationPanel"]) node(id);
  const panel = nodes.get("mentorChatPanel"), root = nodes.get("mentorFloatingRoot");
  panel.parent = root;
  for (const value of nodes.values()) if (![root, panel, nodes.get("mentorLauncher")].includes(value)) value.parent = panel;
  for (const id of ["mentorMinimizeButton", "mentorChatTools", "mentorMessages", "mentorRequestStatus", "mentorSetupStatus", "mentorClarificationPanel"]) nodes.get(id).parent = nodes.get("mentorHistoryPanel");
  nodes.get("mentorLauncher").parent = root;
  document.getElementById = id => nodes.get(id);
  document.querySelector = selector => selector === "[data-panel='mentor-history']" ? nodes.get("mentorHistoryPanel") : null;
  return { document, nodes, node };
}

async function fixture({ inventoryTask = null, explicitMatches = [], initialRows = [] } = {}) {
  const ui = dom(), listeners = new Map(), rows = initialRows.slice(), counters = { instances: 0, releases: 0, calls: 0, routed: 0, prepared: [] };
  const conversation = { id: "conversation-1", activeTask: inventoryTask };
  let finish, started;
  const providerStarted = new Promise(resolve => { started = resolve; });
  const provider = new Promise(resolve => { finish = resolve; });
  class Repository {
    constructor() { counters.instances++; counters.repository = this; }
    async initialize() { return this; }
    async list() { return [conversation]; }
    async get() { return conversation; }
    async messages() { return rows.slice(); }
    async reserve(_id, _owner, { text, localOnly, localChoice }) { counters.reservedChoice = localChoice; const row = { id: "user-1", text, role: "user", sequence: 1, ...(localOnly ? { contextPolicy: "local-only" } : {}) }; rows.push(row); return row; }
    async context() { return rows.slice(); }
    async setRequestSnapshot(_id, request) { return request; }
    async complete(_id, _user, _owner, response) { rows.push({ id: "reply-1", role: "assistant", text: response.reply, sequence: 2 }); }
    async release() { counters.releases++; }
    async setActiveTask(_id, task, expectedVersion) {
      assert.equal(expectedVersion, conversation.activeTask?.version ?? null);
      conversation.activeTask = { ...task, version: (conversation.activeTask?.version || 0) + 1 };
      return conversation.activeTask;
    }
  }
  const context = vm.createContext({ document: ui.document, console, setTimeout, clearTimeout, AbortController, Map, Set, Date, fetch: async () => ({}) });
  context.window = context;
  context.addEventListener = (type, callback) => listeners.set(type, callback);
  context.MentorI18n = { t: key => key, getLanguage: () => "en", hasTranslation: () => true };
  context.MentorChatProtocol = { localDateISO: () => "2026-10-29", conversationConstraints: () => ({}), validateRequest: value => value, validateResponse: value => value };
  context.MentorGoalProposals = { readGoalContext: () => null };
  context.MentorUIEvents = { isTextEditingEvent: event => event.target === ui.nodes.get("mentorMessageInput") };
  context.MentorConversationsRepository = Repository;
  context.MentorCapabilityRegistry = { matches: () => explicitMatches, get: id => ({ id }) };
  context.MentorIntelligenceRouter = { continueRead: () => null, decide: async () => { counters.routed++; return { mode: "chat" }; } };
  context.MentorWritePipeline = {
    prepare: async (text, prior) => { counters.prepared.push({ text, prior }); return { task: prior, reply: "Retained local items" }; },
    confirm: async (_repo, _id, taskId, version) => { counters.confirmed = { taskId, version }; }
  };
  context.confirm = () => true;
  context.MentorActionAdapters = { cloudRows: rows => rows, prepareContext: async () => [], prepareFoodContext: async () => [], history: () => [], mealPlanContext: () => null, lastSavedPlan: () => null };
  context.MentorChatClient = { status: async () => ({ configured: true }), chat: async (_request, signal) => { counters.calls++; counters.signal = signal; started(); return provider; } };
  context.setView = async name => { ui.document.body.dataset.activeView = name; };
  vm.runInContext(source("js/mentor/mentor-nutrition-inventory-resolver.js"), context);
  vm.runInContext(source("js/mentor/mentor-chat-view.js"), context);
  const actualView = context.MentorChatView;
  context.MentorChatView = { create(options) {
    const view = actualView.create(options);
    return { ...view, renderHistory() {}, renderGoals() {}, renderMessages() {} };
  } };
  vm.runInContext(source("js/mentor/mentor-chat.js"), context);
  await context.MentorChatReadyPromise;
  return { ...ui, context, listeners, rows, counters, providerStarted, finish, conversation };
}

function choiceButton(f, { messageId, value, kind = "write", taskId, version, questionId, capabilityId }) {
  const button = f.node("auto-choice"); button.parent = f.nodes.get("mentorClarificationPanel");
  Object.assign(button.dataset, { mentorAction: "fill-choice", messageId, mentorChoiceValue: value, mentorChoiceKind: kind, taskId, taskVersion: String(version), mentorQuestionId: questionId, mentorReadCapability: capabilityId });
  return button;
}

test("one choice click immediately submits a bound local continuation without touching the draft or calling the model", async () => {
  const task = { id: "multi", version: 4, capabilityId: "nutrition.inventory.add", status: "collecting", pendingItemId: "food-one", items: [{ id: "food-one", foodChoices: [{ id: "pancake", name: "Palačinke" }] }] };
  const f = await fixture({ inventoryTask: task, initialRows: [{ id: "old-user", role: "user" }, { id: "question", role: "assistant", writeTask: task }] });
  f.nodes.get("mentorMessageInput").value = "Keep my unsent draft";
  f.context.confirm = () => { throw new Error("Bound local choice must not require another read-permission click"); };
  const button = choiceButton(f, { messageId: "question", value: "1. Palačinke", taskId: task.id, version: task.version, questionId: "food-one" });
  f.nodes.get("mentorFloatingRoot").emit("click", { target: button });
  f.nodes.get("mentorFloatingRoot").emit("click", { target: button });
  for (let i = 0; i < 30 && f.rows.length < 4; i++) await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.nodes.get("mentorMessageInput").value, "Keep my unsent draft");
  assert.equal(f.counters.prepared.length, 1);
  assert.equal(f.counters.prepared[0].text, "1. Palačinke");
  assert.equal(f.counters.prepared[0].prior.id, task.id);
  assert.equal(f.rows[2].text, "1. Palačinke");
  assert.equal(f.rows[2].contextPolicy, "local-only");
  assert.equal(f.counters.calls, 0); assert.equal(f.counters.routed, 0);
  assert.equal(f.counters.reservedChoice.taskVersion, 4);
  assert.equal(f.counters.confirmed, undefined);
});

test("stale choice version is rejected before reserving a message or changing a task", async () => {
  const task = { id: "multi", version: 4, capabilityId: "nutrition.inventory.add", status: "collecting", pendingItemId: "food-one", items: [{ id: "food-one", foodChoices: [{ id: "whole", name: "Integralni hleb" }] }] };
  const f = await fixture({ inventoryTask: task, initialRows: [{ id: "question", role: "assistant", writeTask: task }] });
  const button = choiceButton(f, { messageId: "question", value: "1. Integralni hleb", taskId: task.id, version: 3, questionId: "food-one" });
  f.nodes.get("mentorMessageInput").value = "Unsent draft";
  f.nodes.get("mentorFloatingRoot").emit("click", { target: button });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.rows.length, 1); assert.equal(f.counters.prepared.length, 0);
  assert.equal(f.nodes.get("mentorMessageInput").value, "Unsent draft");
  assert.ok(f.nodes.get("mentorRequestStatus").textContent.includes("STALE_REQUEST"));
});

test("read disambiguation choice uses its bound local read without sending the composer draft", async () => {
  const readTask = { capabilityId: "nutrition.inventory.getAvailability", input: { text: "Which eggs?" }, candidates: [{ id: "egg", name: "Jaja" }] };
  const f = await fixture({ initialRows: [{ id: "read-question", role: "assistant", readTask }] });
  let readInput;
  const capability = { id: readTask.capabilityId, format: () => "Local stock answer" };
  f.context.MentorIntelligenceRouter.continueRead = () => ({ mode: "local", capability, input: { foodId: "egg" } });
  f.context.MentorCapabilityRegistry.execute = async (_id, input, { authorize }) => { assert.equal(authorize(capability), true); readInput = input; return {}; };
  f.nodes.get("mentorMessageInput").value = "Do not send this";
  f.context.confirm = () => { throw new Error("Bound local read choice must not request another permission click"); };
  const button = choiceButton(f, { kind: "read", messageId: "read-question", value: "1. Jaja", capabilityId: readTask.capabilityId });
  f.nodes.get("mentorFloatingRoot").emit("click", { target: button });
  for (let i = 0; i < 30 && f.rows.length < 3; i++) await new Promise(resolve => setImmediate(resolve));
  assert.equal(readInput.foodId, "egg");
  assert.equal(f.rows[2].text, "Local stock answer");
  assert.equal(f.nodes.get("mentorMessageInput").value, "Do not send this");
  assert.equal(f.counters.calls, 0); assert.equal(f.counters.routed, 0);
});

test("controller sends short choices and targeted corrections to the existing multi-item task before new intent routing", async () => {
  for (const text of ["prvi", "Integralni hleb", "Mleko ipak 3 l u frižider"]) {
    const task = { id: "write-multi", capabilityId: "nutrition.inventory.add", version: 4, status: "collecting", pendingItemId: "bread", items: [{ id: "bread", clarificationStatus: "food", foodChoices: [{ id: "whole", name: "Integralni hleb" }] }, { id: "milk", foodName: "Mleko", sourceText: "1 l mleka" }] };
    const f = await fixture({ inventoryTask: task, explicitMatches: [{ capability: { type: "read" } }] });
    f.nodes.get("mentorMessageInput").value = text;
    f.nodes.get("mentorComposer").emit("submit");
    for (let i = 0; i < 20 && f.rows.length < 2; i++) await new Promise(resolve => setImmediate(resolve));
    assert.equal(f.counters.calls, 0); assert.equal(f.counters.routed, 0);
    assert.equal(f.counters.prepared.length, 1, text);
    assert.equal(f.counters.prepared[0].prior.id, task.id);
    assert.equal(f.counters.prepared[0].prior.pendingItemId, "bread");
    assert.equal(f.rows[0].contextPolicy, "local-only");
  }
});

test("controller does not absorb an unrelated topic into the pending multi-item task", async () => {
  const task = { id: "write-multi", capabilityId: "nutrition.inventory.add", version: 4, status: "collecting", pendingItemId: "bread", items: [{ id: "bread", clarificationStatus: "food", foodChoices: [{ id: "whole", name: "Integralni hleb" }] }] };
  const f = await fixture({ inventoryTask: task });
  f.nodes.get("mentorMessageInput").value = "Pokaži potrošnju ovog meseca";
  f.nodes.get("mentorComposer").emit("submit"); await f.providerStarted;
  assert.equal(f.counters.prepared.length, 0); assert.equal(f.counters.routed, 1);
  f.finish({ reply: "Unsupported finance context", proposal: null });
  await new Promise(resolve => setImmediate(resolve));
});

test("approval forwards the displayed task version to the existing pipeline", async () => {
  const f = await fixture();
  const approve = f.node("approve-versioned"); approve.parent = f.nodes.get("mentorChatPanel");
  approve.dataset.mentorAction = "approve-write"; approve.dataset.taskId = "task-reviewed"; approve.dataset.taskVersion = "7";
  f.nodes.get("mentorFloatingRoot").emit("click", { target: approve });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(f.counters.confirmed, { taskId: "task-reviewed", version: 7 });
});

function shellNavigation(context, ui) {
  const script = source("script.js");
  const fn = script.slice(script.indexOf("async function setView("), script.indexOf("function svgToMaskUrl("));
  const appViews = Object.fromEntries(["dashboard", "nutrition", "finance", "brainstorming", "builder", "planner"].map(key => [key, ui.node(key)]));
  Object.assign(context, { appViews, builderTab: ui.node("builderTab"), plannerTab: ui.node("plannerTab"), sidebarItems: [], updateSidebarSymbolForView() {}, activateLazyView: async () => {}, requestAnimationFrame: callback => callback() });
  vm.runInContext(fn, context);
}

test("one global controller preserves the input, draft and selection across module navigation and minimization", async () => {
  const f = await fixture(), { context, nodes } = f;
  shellNavigation(context, f);
  const input = nodes.get("mentorMessageInput"), panel = nodes.get("mentorChatPanel");
  assert.equal(panel.inert, true);
  context.MentorChat.showChat(); input.value = "unsent draft"; input.selectionStart = 4;
  for (const module of ["nutrition", "finance", "brainstorming", "builder", "dashboard"]) {
    await context.setView(module);
    context.MentorChat.deactivate(); context.MentorChat.showChat();
    assert.equal(nodes.get("mentorMessageInput"), input);
    assert.equal(input.value, "unsent draft"); assert.equal(input.selectionStart, 4);
  }
  assert.equal(f.counters.instances, 1); assert.equal(f.counters.releases, 0);
  assert.equal(f.counters.calls, 0);
});

test("an in-flight response survives module navigation, Creator access and minimized UI", async () => {
  const f = await fixture(), { context, nodes } = f;
  shellNavigation(context, f);
  context.MentorChat.showChat(); nodes.get("mentorMessageInput").value = "Help me prioritize";
  nodes.get("mentorComposer").emit("submit"); await f.providerStarted;
  await context.setView("nutrition"); await context.MentorChat.showManual();
  assert.equal(f.document.body.dataset.activeView, "builder");
  context.MentorChat.deactivate();
  assert.equal(f.counters.signal.aborted, false); assert.equal(f.counters.releases, 0);
  f.finish({ reply: "Take one practical step.", proposal: null });
  for (let i = 0; i < 20 && f.rows.length < 2; i++) await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.rows.length, 2); assert.equal(f.rows[1].text, "Take one practical step.");
  assert.equal(f.counters.calls, 1); assert.equal(f.counters.instances, 1);
});

test("minimize removes keyboard access, restores launcher focus, and does not bubble board shortcuts", async () => {
  const f = await fixture(), { context, nodes } = f, root = nodes.get("mentorFloatingRoot");
  context.MentorChat.showChat(); nodes.get("mentorChatTools").open = true;
  let stopped = 0;
  root.emit("keydown", { target: nodes.get("mentorMessageInput"), key: "Escape", stopPropagation() { stopped++; } });
  assert.equal(nodes.get("mentorChatTools").open, false);
  assert.equal(root.dataset.open, "true");
  root.emit("keydown", { target: nodes.get("mentorMessageInput"), key: "Escape", stopPropagation() { stopped++; } });
  assert.equal(nodes.get("mentorChatPanel").inert, true);
  assert.equal(nodes.get("mentorChatPanel").getAttribute("aria-hidden"), "true");
  assert.equal(nodes.get("mentorLauncher").getAttribute("aria-expanded"), "false");
  assert.equal(f.document.activeElement, nodes.get("mentorLauncher"));
  root.emit("click", { target: nodes.get("mentorMessageInput"), stopPropagation() { stopped++; } });
  root.emit("wheel", { stopPropagation() { stopped++; } });
  assert.equal(stopped, 4); assert.equal(f.counters.calls, 0);
});

test("top minimize hides only history and portrait restores it while keeping composer active", async () => {
  const f = await fixture(), { context, nodes } = f, root = nodes.get("mentorFloatingRoot");
  const input = nodes.get("mentorMessageInput"), send = nodes.get("mentorSendButton"), history = nodes.get("mentorHistoryPanel");
  nodes.get("mentorMinimizeButton").dataset.mentorAction = "minimize";
  nodes.get("mentorLauncher").dataset.mentorAction = "toggle-chat";
  context.MentorChat.showChat();
  input.value = "Sačuvan nacrt";
  input.emit("input");
  nodes.get("mentorMinimizeButton").focus();
  root.emit("click", { target: nodes.get("mentorMinimizeButton") });
  assert.equal(root.dataset.open, "true");
  assert.equal(root.dataset.historyMinimized, "true");
  assert.equal(nodes.get("mentorChatPanel").inert, false);
  assert.equal(history.inert, true);
  assert.equal(f.document.activeElement, input);
  assert.equal(input.disabled, false);
  assert.equal(input.value, "Sačuvan nacrt");
  assert.equal(send.disabled, false);
  assert.equal(nodes.get("mentorLauncher").getAttribute("aria-label"), "mentor.floating.showHistory");
  root.emit("click", { target: nodes.get("mentorLauncher") });
  assert.equal(root.dataset.historyMinimized, "false");
  assert.equal(history.inert, false);
  assert.equal(nodes.get("mentorChatPanel").inert, false);
  assert.equal(f.document.activeElement, input);
  assert.equal(input.value, "Sačuvan nacrt");
});

test("existing explicit Stop still aborts an active response", async () => {
  const f = await fixture(), { context, nodes } = f;
  context.MentorChat.showChat(); nodes.get("mentorMessageInput").value = "Help me prioritize";
  nodes.get("mentorComposer").emit("submit"); await f.providerStarted;
  const cancel = nodes.get("mentorCancelButton"); cancel.dataset.mentorAction = "cancel";
  nodes.get("mentorFloatingRoot").emit("click", { target: cancel });
  assert.equal(f.counters.signal.aborted, true);
  f.finish({ reply: "Late reply", proposal: null });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.rows.length, 1); assert.equal(f.counters.releases, 1);
});

test("captured Research connection events on Mentor cannot hit-test, save, or steal focus", () => {
  for (const type of ["pointerdown", "pointermove", "pointerup", "keydown"]) {
    const listeners = new Map(), counts = { hits: 0, writes: 0, focus: 0 };
    const context = vm.createContext({ window: {}, console });
    vm.runInContext(source("research.js"), context);
    const classes = { add() {}, remove() {} };
    const element = () => ({ classList: classes, style: {}, setAttribute() {}, remove() {}, getBoundingClientRect: () => ({ left: 400, top: 400, right: 500, bottom: 500 }) });
    const sourceCard = { key: "item:source", source: "item" }, targetCard = { key: "item:target", source: "item" };
    const sourceElement = { ...element(), dataset: { cardKey: sourceCard.key } }, targetElement = { ...element(), dataset: { cardKey: targetCard.key } };
    const viewport = { getBoundingClientRect: () => ({ left: 0, top: 0, right: 800, bottom: 600 }) };
    const canvas = { matches: () => false, querySelector: () => ({ appendChild() {} }), querySelectorAll: () => [sourceElement, targetElement], contains: () => false };
    const root = { querySelector: () => viewport };
    context.document = { createElement: element, createElementNS: element, addEventListener: (type, fn) => listeners.set(type, fn), removeEventListener: type => listeners.delete(type), elementsFromPoint: () => { counts.hits++; return []; } };
    Object.assign(context, { getResearchCanvasCards: () => [sourceCard, targetCard], getResearchCanvasGraph: () => ({ parentByKey: new Map(), childrenByKey: new Map() }), getActiveResearchDirection: () => null, getResearchCanvasConnectionRect: () => ({ x: 0, y: 0, width: 100, height: 100 }), getResearchCanvasCamera: () => ({}), getResearchCanvasConnectionIcon: () => "", getResearchCanvasPointerSide: () => "left" });
    context.window.MentorResearchGeometry = { sidePoint: () => ({ x: 0, y: 0 }), screenToWorld: () => ({ x: 0, y: 0 }), connectionPathFromAnchors: () => "" };
    const trigger = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 20, height: 20 }), isConnected: true, focus: () => { counts.focus++; } };
    context.armResearchCanvasConnection(root, canvas, { saveCanvasParent: () => { counts.writes++; } }, { kind: "source", key: sourceCard.key, side: "left" }, trigger);
    counts.hits = 0;
    listeners.get(type)({ target: { closest: selector => selector === "#mentorFloatingRoot" ? {} : null }, button: 0, key: "Escape", clientX: 200, clientY: 200, preventDefault() { throw new Error("Mentor event consumed by Research"); } });
    assert.equal(counts.hits, 0, type); assert.equal(counts.writes, 0, type); assert.equal(counts.focus, 0, type);
    assert.equal(root._researchArmedConnection, null, type);
  }
});
