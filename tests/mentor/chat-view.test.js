"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");

// DOM boundary double for rendering/scroll/focus checks, without a user browser.
function fixture() {
  const document = { activeElement: null };
  class Node {
    constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {}; this.className = ""; this.scrollTop = 0; this.scrollHeight = 1000; this.clientHeight = 100; this.attributes = {}; this.style = {}; this.listeners = new Map(); }
    get textContent() { return (this.text || "") + this.children.map(child => child.textContent).join(""); }
    set textContent(value) { this.text = String(value); this.children = []; }
    get classList() { return { contains: value => this.className.split(" ").includes(value), toggle: (value, on) => { const classes = new Set(this.className.split(" ").filter(Boolean)); if (on) classes.add(value); else classes.delete(value); this.className = [...classes].join(" "); } }; }
    append(...nodes) { for (const node of nodes) { if (node.tagName === "fragment") this.append(...node.children); else { node.parent = this; this.children.push(node); } } }
    replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    addEventListener(type, listener) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(listener); }
    removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
    emit(type, event) { for (const listener of this.listeners.get(type) || []) listener(event); }
    setPointerCapture(id) { this.capturedPointer = id; }
    getBoundingClientRect() { return { height: Number.parseFloat(this.style.height) || 200 }; }
    querySelectorAll(selector) {
      return this.children.flatMap(child => {
        const match = selector.startsWith("#") ? child.id === selector.slice(1)
          : selector.includes("fill-choice") ? child.dataset.mentorAction === "fill-choice"
          : selector.includes("mentor-approvals") ? child.dataset.panel === "mentor-approvals"
          : selector.includes("approve-write") ? child.dataset.mentorAction === "approve-write"
          : selector.includes("approve-action") ? child.dataset.mentorAction === "approve-action" : false;
        return [...(match ? [child] : []), ...child.querySelectorAll(selector)];
      });
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); this.parent = null; }
    contains(node) { return node === this || this.children.some(child => child.contains(node)); }
    focus(options) { document.activeElement = this; this.focusOptions = options; }
    get firstElementChild() { return this.children[0]; }
    get lastElementChild() { return this.children.at(-1); }
  }
  document.createElement = tag => new Node(tag); document.createDocumentFragment = () => new Node("fragment");
  const refs = Object.fromEntries(["panel", "chatPanel", "input", "sendButton", "cancelButton", "history", "goals", "messageList", "status", "setup", "clarification", "clarificationContent", "overviewToggle", "historySurface", "historyResizeGrip", "overviewResizeGrip"].map(key => [key, new Node(key)]));
  refs.overviewToggle.append(new Node("span"));
  refs.clarification.append(refs.overviewResizeGrip, refs.clarificationContent);
  refs.historySurface.append(refs.overviewToggle, refs.historyResizeGrip, refs.messageList);
  refs.panel.append(refs.chatPanel); refs.chatPanel.append(refs.clarification, refs.historySurface, refs.input);
  const state = { activeId: "chat", ready: true, error: null, rows: [], conversation: {}, proposalBusy: new Set(), run: null };
  const root = { MentorI18n: { t: (key, values) => key + (values ? JSON.stringify(values) : "") }, MentorActionAdapters: { history: () => [] } };
  const context = vm.createContext({ window: root, document, Intl, Date, Set, Map });
  for (const file of ["mentor-nutrition-inventory-resolver.js", "mentor-chat-view.js"]) vm.runInContext(fs.readFileSync(path.join(__dirname, "../../js/mentor", file), "utf8"), context);
  const view = root.MentorChatView.create({ state, refs, protocol: {}, proposals: {}, safeCode: () => "ERROR", reportFailure: error => { throw error; }, getLastDiagnostic: () => null, locked: () => false, language: () => "sr" });
  const task = { id: "task", version: 1, status: "collecting", pendingItemId: "bread", items: [
    { id: "eggs", foodName: "Jaja", quantity: 10, unit: "kom", status: "proposed", preview: "10 kom Jaja / Frižider" },
    { id: "bread", foodName: "Hleb", quantity: 400, unit: "g", foodChoices: [{ id: "whole", name: "Integralni hleb" }, { id: "rye", name: "Ražani hleb" }] }
  ] };
  state.conversation.activeTask = task;
  state.rows = [{ id: "user", role: "user", status: "complete", text: "Add stock" }, { id: "question", role: "assistant", text: "Which bread?", writeTask: task }];
  return { state, refs, document, view, task, root };
}

test("clarification renders in the left overview with scoped choices and independent item summaries", () => {
  const f = fixture(); f.refs.input.value = "Draft"; f.view.renderMessages();
  assert.equal(f.refs.clarification.classList.contains("hidden"), false);
  assert.ok(f.refs.clarification.textContent.includes("clarification.title"));
  assert.ok(f.refs.clarification.textContent.includes("Jaja"));
  const choices = f.refs.clarification.querySelectorAll("button[fill-choice]");
  assert.equal(choices.length, 2);
  assert.equal(choices[0].dataset.taskVersion, "1");
  assert.equal(choices[0].dataset.mentorQuestionId, "bread");
  assert.equal(choices[0].dataset.mentorChoiceKind, "write");
  assert.equal(f.refs.messageList.querySelectorAll("button[fill-choice]").length, 0);
  assert.ok(f.refs.messageList.textContent.includes("clarification.inSidePanel"));
  assert.equal(f.refs.input.value, "Draft");
  f.view.renderMessages();
  assert.equal(f.refs.clarification.querySelectorAll("button[fill-choice]")[0], choices[0]);
  assert.equal(f.refs.clarification.querySelector("#mentorClarificationQuestion").attributes["aria-live"], "polite");
  f.state.choiceBusy = true; f.view.renderControls(); assert.equal(choices[0].disabled, true);
});

test("new content follows the latest turn even after scrolling up, while identical refresh preserves scroll", () => {
  const f = fixture(); f.view.renderMessages(); f.refs.messageList.scrollTop = 40;
  f.view.renderMessages(); assert.equal(f.refs.messageList.scrollTop, 40);
  f.state.rows.push({ id: "next-turn", role: "user", status: "complete", text: "Choice" });
  f.view.renderMessages(); assert.equal(f.refs.messageList.scrollTop, f.refs.messageList.scrollHeight);
  f.refs.clarification.scrollTop = 80; f.task.version++;
  f.state.focusClarification = true; f.view.renderMessages();
  assert.equal(f.refs.clarification.scrollTop, 0);
  assert.equal(f.document.activeElement.id, "mentorClarificationQuestion");
  assert.equal(f.document.activeElement.focusOptions.preventScroll, true);
});

test("a newly displayed question does not steal focus while the user is editing the draft", () => {
  const f = fixture(); f.view.renderMessages();
  f.root.MentorUIEvents = { isTextEditingTarget: target => target === f.refs.input };
  f.refs.input.value = "Still typing"; f.refs.input.focus();
  f.state.focusClarification = true; f.task.version++; f.view.renderMessages();
  assert.equal(f.document.activeElement, f.refs.input);
  assert.equal(f.refs.input.value, "Still typing");
  assert.equal(f.state.focusClarification, false);
});

test("resolved clarification moves the inventory approval into the left overview", () => {
  const f = fixture(); f.view.renderMessages();
  f.task.status = "proposed"; f.task.pendingItemId = null; f.task.version++;
  f.state.focusClarification = true; f.view.renderMessages();
  assert.equal(f.refs.clarification.classList.contains("hidden"), false);
  assert.equal(f.refs.clarification.inert, false);
  const actions = f.refs.clarification.querySelectorAll("button[approve-write]");
  assert.equal(actions.length, 1); assert.equal(actions[0].dataset.taskVersion, "2");
  assert.equal(f.refs.messageList.querySelectorAll("button[approve-write]").length, 0);
  assert.equal(f.document.activeElement, f.refs.messageList.lastElementChild);
});

test("active recipe approval stays in the left overview without duplicating on refresh", () => {
  const f = fixture();
  f.root.MentorActionCards = { create: message => {
    const card = f.document.createElement("section");
    card.dataset.panel = "mentor-action-batch";
    const approve = f.document.createElement("button"); approve.dataset.mentorAction = "approve-action";
    card.append(approve);
    return card;
  } };
  f.state.conversation.activeTask = null;
  f.state.rows = [{ id: "user", role: "user", status: "complete", text: "Recipe" }, { id: "recipe", role: "assistant", text: "Review", proposals: [{ id: "r", action: "createRecipe" }] }];
  f.view.renderMessages();
  assert.equal(f.refs.clarification.querySelectorAll("button[approve-action]").length, 1);
  assert.equal(f.refs.messageList.querySelectorAll("button[approve-action]").length, 0);
  f.view.renderMessages();
  assert.equal(f.refs.clarification.querySelectorAll("button[approve-action]").length, 1);
  f.state.rows[1].actionStates = { r: { status: "approved" } };
  f.view.renderMessages();
  assert.equal(f.refs.clarification.classList.contains("hidden"), true);
  assert.equal(f.refs.messageList.querySelectorAll("button[approve-action]").length, 1);
});

test("overview toggle collapses and expands the same approval panel", () => {
  const f = fixture();
  f.task.status = "proposed"; f.task.pendingItemId = null;
  f.view.renderMessages();
  assert.equal(f.refs.overviewToggle.attributes["aria-expanded"], "true");
  f.state.overviewCollapsed = true; f.view.renderMessages();
  assert.equal(f.refs.clarification.classList.contains("hidden"), true);
  assert.equal(f.refs.clarification.inert, true);
  assert.equal(f.refs.overviewToggle.attributes["aria-expanded"], "false");
  assert.equal(f.refs.overviewToggle.classList.contains("hidden"), false);
  f.state.overviewCollapsed = false; f.view.renderMessages();
  assert.equal(f.refs.clarification.classList.contains("hidden"), false);
  assert.equal(f.refs.clarification.querySelectorAll("button[approve-write]").length, 1);
});

test("both panels grow upward from their bottom edge using drag or keyboard", () => {
  const f = fixture(); f.view.renderMessages();
  const drag = (grip, y) => {
    grip.emit("pointerdown", { button: 0, pointerId: 1, clientY: 200, preventDefault() {} });
    grip.emit("pointermove", { pointerId: 1, clientY: y });
    grip.emit("pointerup", { pointerId: 1 });
  };
  drag(f.refs.historyResizeGrip, 150);
  assert.equal(f.refs.historySurface.style.height, "250px");
  drag(f.refs.overviewResizeGrip, 175);
  assert.equal(f.refs.clarification.style.height, "225px");
  f.refs.overviewResizeGrip.emit("keydown", { key: "ArrowUp", preventDefault() {} });
  assert.equal(f.refs.clarification.style.height, "249px");
  f.state.conversation.activeTask = null; f.state.rows = [];
  f.view.renderMessages();
  assert.equal(f.refs.overviewResizeGrip.classList.contains("hidden"), true);
});

test("correction target buttons select items instead of candidates belonging to another question", () => {
  const f = fixture(); f.task.pendingCorrectionText = "Ispravi na 4 l"; f.view.renderMessages();
  const choices = f.refs.clarification.querySelectorAll("button[fill-choice]");
  assert.equal(choices.length, 2);
  assert.equal(choices[1].dataset.mentorChoiceValue, "item 2");
  assert.equal(choices[1].dataset.mentorQuestionId, "correction");
  assert.ok(f.refs.clarification.textContent.includes("clarification.chooseItem"));
});

test("location question offers only current Nutrition locations in the left panel", () => {
  const f = fixture();
  f.root.MentorInventoryRepository = { getLocations: () => [{ id: "location_fridge", name: "Frižider" }, { id: "custom-1", name: "Podrum" }] };
  f.task.capabilityId = "nutrition.inventory.add";
  Object.assign(f.task.items[1], { foodId: "bread", foodChoices: null, clarificationStatus: "location", locationId: null });
  f.view.renderMessages();
  const choices = f.refs.clarification.querySelectorAll("button[fill-choice]");
  assert.equal(choices.length, 2);
  assert.equal(choices[1].dataset.mentorChoiceValue, "__mentor_location__:custom-1");
  assert.equal(choices[1].dataset.mentorQuestionId, "bread");
  assert.ok(f.refs.clarification.textContent.includes("clarification.chooseLocation"));
});

test("read-only disambiguation uses the same overview without a write approval", () => {
  const f = fixture(); f.state.rows = [{ id: "read", role: "assistant", text: "Which egg?", readTask: { capabilityId: "nutrition.inventory.getAvailability", candidates: [{ id: "egg", name: "Jaja" }] } }];
  f.view.renderMessages();
  const choices = f.refs.clarification.querySelectorAll("button[fill-choice]");
  assert.equal(choices.length, 1); assert.equal(choices[0].dataset.mentorChoiceKind, "read");
  assert.equal(choices[0].dataset.mentorReadCapability, "nutrition.inventory.getAvailability");
});
