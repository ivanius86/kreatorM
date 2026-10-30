const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
function load(extra = {}) {
  const window = { matchMedia: () => ({ matches: false }), addEventListener() {}, ...extra };
  const context = vm.createContext({ window, console: { warn() {} }, Blob, File, URL, TextDecoder, ...extra.globals });
  for (const file of ["js/research/research-sticker-core.js", "js/research/research-sticker-sections.js", "js/research/research-model.js"]) vm.runInContext(read(file), context, { filename: file });
  return { context, window, core: window.MentorResearchStickerCore };
}
const json = (value) => JSON.parse(JSON.stringify(value));

function designerHarness(values = new Map(), storageUnavailable = false) {
  let panel;
  const node = () => ({ dataset: {}, hidden: false, innerHTML: "", children: [], listeners: {}, setAttribute() {}, addEventListener(type, handler) { this.listeners[type] = handler; }, querySelectorAll: () => [], focus() {} });
  const document = { activeElement: null, addEventListener() {}, removeEventListener() {}, querySelector: () => null,
    body: { append(value) { panel = value; } },
    createElement() {
      const element = node(), list = node(), preview = node(), title = node(), menu = node();
      element.isConnected = true; element.contains = () => true; element.appendChild = () => {};
      element.remove = () => { element.isConnected = false; };
      Object.defineProperty(list, "innerHTML", { set(html) {
        list.children = Array.from(html.matchAll(/data-designer-section="([^"]+)"/g), (match) => {
          const section = node(), body = node(); section.dataset.designerSection = match[1];
          section.querySelector = () => body; return section;
        });
        list.html = html;
      } });
      preview.querySelector = () => node();
      element.querySelector = (selector) => selector === "[data-designer-editors]" ? list : selector === "[data-designer-preview]" ? preview : selector === "[data-designer-title]" ? title : selector === "[data-designer-add-menu]" ? menu : selector === "input:invalid" ? null : node();
      element.editorList = list;
      return element;
    }
  };
  const localStorage = { getItem(key) { if (storageUnavailable) throw Error("denied"); return values.get(key) || null; }, setItem(key, value) { if (storageUnavailable) throw Error("quota"); values.set(key, value); } };
  const loaded = load({ localStorage, globals: { document } }), { window, context } = loaded;
  window.removeEventListener = () => {};
  window.MentorResearchStickerEditors = { render: () => "" };
  window.MentorResearchStickerSections = { icons: {}, mount: () => ({ dispose() {}, hydrate() {} }) };
  vm.runInContext(read("js/research/research-sticker-designer.js"), context);
  const open = (idea, card, actions = {}) => {
    const session = window.MentorResearchStickerDesigner.open({ isConnected: true }, { idea, card, t: (key) => key, escape: String, renderCard: () => "", actions });
    return { session, panel, html: panel.editorList.html,
      collapse(index) {
        const section = panel.editorList.children[index];
        const button = { dataset: { sectionAction: "collapse" }, closest: () => section, setAttribute() {}, lastElementChild: {} };
        panel.listeners.click({ stopPropagation() {}, target: { closest: () => button } });
      },
      save() { return panel.listeners.click({ stopPropagation() {}, target: { closest: () => ({ dataset: { designerAction: "save" } }) } }); },
      editTitle(value) { panel.listeners.input({ target: { matches: () => true, value } }); }
    };
  };
  return { ...loaded, open, values };
}

test("Editor accordions persist open and closed sections after cancel and reload, without saving content", () => {
  const harness = designerHarness(), doc = harness.core.fromCard({}, "notes");
  doc.sections.push(harness.core.section("link")); doc.sections[1].editorCollapsed = true;
  const idea = { id: "idea", pathData: { researchCanvasStickerDocuments: { "item:one": doc } } }, before = JSON.stringify(idea);
  const first = harness.open(idea, { key: "item:one" }); first.collapse(0); first.collapse(1); first.editTitle("Unsaved changes");
  first.session.close();
  assert.equal(JSON.stringify(idea), before);
  assert.equal(harness.values.size, 1);
  const prefs = JSON.parse([...harness.values.values()][0]);
  assert.deepEqual(prefs.sections, { [doc.sections[0].sectionId]: true, [doc.sections[1].sectionId]: false });
  const reloaded = designerHarness(harness.values), next = reloaded.open(idea, { key: "item:one" });
  assert.match(next.html, new RegExp('id="editor-' + doc.sections[0].sectionId + '" hidden'));
  assert.match(next.html, new RegExp('id="editor-' + doc.sections[1].sectionId + '"><'));
  next.session.close();
  const other = reloaded.open({ ...idea, id: "other" }, { key: "item:one" });
  assert.match(other.html, new RegExp('id="editor-' + doc.sections[0].sectionId + '"><'));
  other.session.close();
});

test("Legacy editor sections keep preferences despite regenerated IDs and unavailable storage", () => {
  for (const unavailable of [false, true]) {
    const harness = designerHarness(new Map(), unavailable), idea = { id: "idea" }, card = { key: "item:legacy", type: "note", text: "Keep" };
    const first = harness.open(idea, card), before = first.panel.editorList.children[0].dataset.designerSection;
    first.collapse(0); first.session.close();
    const next = harness.open(idea, card), after = next.panel.editorList.children[0].dataset.designerSection;
    assert.notEqual(before, after); assert.match(next.html, /class="research-sticker-editor-section-body"[^>]+ hidden/);
    let stopped = 0; next.panel.listeners.wheel({ stopPropagation() { stopped++; } }); assert.equal(stopped, 1);
    next.session.close();
  }
});

test("Malformed or future editor preferences are preserved while editor remains usable", () => {
  for (const value of ["{broken", '{"version":2,"sections":{}}']) {
    const key = 'mentorResearchStickerEditorV1:["idea","item:one"]', values = new Map([[key, value]]), harness = designerHarness(values);
    const first = harness.open({ id: "idea" }, { key: "item:one", type: "note" });
    first.collapse(0); first.session.close(); assert.equal(values.get(key), value);
  }
});

test("First document save retains legacy accordion preferences under stable section IDs", async () => {
  const harness = designerHarness(), idea = { id: "idea", pathData: {} }, card = { key: "item:legacy", type: "note", text: "Keep" };
  const first = harness.open(idea, card, { saveCanvasSticker({ document }) { idea.pathData.researchCanvasStickerDocuments = { [card.key]: json(document) }; return true; } });
  first.collapse(0); await first.save();
  const saved = idea.pathData.researchCanvasStickerDocuments[card.key], section = saved.sections[0];
  assert.equal(section.editorCollapsed, true);
  assert.deepEqual(JSON.parse([...harness.values.values()][0]).sections, { [section.sectionId]: true });
  const reloaded = designerHarness(harness.values), next = reloaded.open(idea, card);
  assert.match(next.html, new RegExp('id="editor-' + section.sectionId + '" hidden')); next.session.close();
});

test("Sticker Designer modules and translations parse and provide matching SR/EN keys", () => {
  for (const file of ["js/research/research-sticker-core.js", "js/research/research-sticker-sections.js", "js/research/research-sticker-editors.js", "js/research/research-sticker-designer.js", "js/i18n/research-sticker-designer.js"]) new vm.Script(read(file), { filename: file });
  const context = vm.createContext({ window: {} }); vm.runInContext(read("js/i18n/research-sticker-designer.js"), context);
  const keys = (object, prefix = "") => Object.entries(object).flatMap(([key, value]) => typeof value === "object" ? keys(value, prefix + key + ".") : [prefix + key]).sort();
  assert.deepEqual(keys(context.window.MentorI18nResources.sr.research.designer), keys(context.window.MentorI18nResources.en.research.designer));
});

test("Custom is empty and all templates use the same section model", () => {
  const { core } = load();
  assert.equal(core.fromCard({ type: "note" }, "custom").sections.length, 0);
  for (const [template, expected] of Object.entries(core.TEMPLATES)) {
    const doc = core.fromCard({}, template);
    assert.deepEqual(json(doc.sections.map((entry) => entry.sectionType)), json(expected));
    assert.equal(new Set(doc.sections.map((entry) => entry.sectionId)).size, doc.sections.length);
  }
});

test("Duplicate sections, real ordering, both collapse levels and image framing survive reload", () => {
  const { core } = load();
  const doc = core.fromCard({}, "custom");
  doc.sections.push(core.section("image"), core.section("notes"), core.section("media"), core.section("notes"));
  const notesId = doc.sections[1].sectionId;
  doc.sections[0].settings = { fit: "cover", zoom: 2, x: 20, y: 75, rotation: 90 };
  doc.sections[1].content.text = "Original <script>";
  doc.sections[1].collapsed = true; doc.collapsed = true;
  core.move(doc, doc.sections[2].sectionId, 1);
  const reload = core.normalize(json(doc));
  assert.deepEqual(json(reload.sections.map((entry) => entry.sectionType)), ["image", "media", "notes", "notes"]);
  assert.deepEqual(json(reload.sections.map((entry) => entry.order)), [0, 1, 2, 3]);
  assert.equal(reload.sections[2].sectionId, notesId); assert.equal(reload.sections[2].collapsed, true); assert.equal(reload.collapsed, true);
  assert.equal(reload.sections[0].settings.zoom, 2); assert.equal(reload.sections[0].settings.fit, "cover");
  const duplicate = json(doc); duplicate.sections[1].sectionId = duplicate.sections[0].sectionId;
  assert.throws(() => core.normalize(duplicate), /Invalid sticker section/);
});

test("Draft changes cancel independently, and editing an owner preserves graph, groups and finance fields", () => {
  const { core, window } = load();
  const idea = { pathData: { researchDirections: [{ id: "d", references: [{ id: "r", title: "Old", link: "https://example.com/", unitSystem: "finance", unitValue: 125, notes: [{ id: "n", title: "Child", body: "Keep" }] }] }], researchCanvasGroups: [{ id: "g", memberKeys: ["reference:d:r", "linked-note:d:r:n"] }], researchCanvasPositions: { "reference:d:r": { x: 42, y: 70 } } } };
  const card = { key: "reference:d:r", source: "reference", type: "link", direction: { id: "d" }, reference: { id: "r" }, title: "Old", url: "https://example.com/" };
  const before = JSON.stringify(idea); const draft = core.read(idea, card); draft.title = "New"; draft.sections.push(core.section("notes"));
  assert.equal(JSON.stringify(idea), before);
  core.apply(idea.pathData, card, draft);
  assert.equal(idea.pathData.researchDirections[0].references.length, 1); assert.equal(idea.pathData.researchDirections[0].references[0].unitValue, 125);
  assert.equal(idea.pathData.researchDirections[0].references[0].notes[0].id, "n");
  assert.deepEqual(json(idea.pathData.researchCanvasGroups[0].memberKeys), ["reference:d:r", "linked-note:d:r:n"]);
  assert.equal(idea.pathData.researchCanvasPositions["reference:d:r"].x, 42);
  const cards = window.MentorResearchModel.getCanvasCards(idea, { directionId: "d", getReferenceUnitDisplay: () => "125 EUR", getFinanceOptions: () => [], translate: (key) => key });
  assert.equal(window.MentorResearchModel.getCanvasGraph(cards).parentByKey.get("linked-note:d:r:n"), "reference:d:r");
  assert.equal(core.read(json(idea), card).title, "New");
});

test("Legacy linked and direction notes materialize their current keys without shifting siblings", () => {
  const { core } = load();
  const pathData = { researchDirections: [{ id: "d", notes: ["first", "second"], references: [{ id: "r", notes: ["first", "second"] }] }] };
  const linked = { key: "linked-note:d:r:note_1", source: "linked-note", direction: { id: "d" }, reference: { id: "r" }, note: { id: "note_1" }, type: "note", text: "second" };
  core.apply(pathData, linked, core.fromCard(linked));
  assert.deepEqual(json(pathData.researchDirections[0].references[0].notes.map((note) => note.id)), ["note_0", "note_1"]);
  const direction = { key: "direction-note:d:1", source: "direction-note", direction: { id: "d" }, note: { id: "1" }, type: "note", text: "second" };
  core.apply(pathData, direction, core.fromCard(direction));
  assert.deepEqual(json(pathData.researchDirections[0].notes.map((note) => note.id)), ["0", "1"]);
  assert.equal(Object.keys(pathData.researchCanvasStickerDocuments).length, 2);
});

test("Unit values are numeric and measurements preserve dimension, unit and stable identity", () => {
  const { core } = load(); const doc = core.fromCard({}, "unit");
  doc.sections[0].content.measurements.push({ id: "width", value: "220", unit: "cm", dimension: "length", label: "Width" });
  assert.equal(core.normalize(doc).sections[0].content.measurements[0].value, 220);
  doc.sections[0].content.measurements[0].value = "invalid"; assert.throws(() => core.normalize(doc), /Invalid measurement/);
});

test("Units editor keeps measurement defaults, limits additions across sections and renders safe footer badges", () => {
  const { core, context, window } = load();
  for (const file of ["js/research/research-sticker-editors.js", "js/i18n/research-sticker-designer.js"]) vm.runInContext(read(file), context);
  const t = (key) => key.split(".").reduce((value, part) => value?.[part], window.MentorI18nResources.sr.research) ?? key;
  const escape = (value) => String(value).replace(/[&<>\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[character]));
  const editors = window.MentorResearchStickerEditors, first = core.section("unit"), second = core.section("unit"), notes = core.section("notes");
  const document = core.fromCard({}, "custom"); document.sections = [first, notes, second]; notes.content.text = "Body before footer";
  const editorContext = { t, escape, getMeasurementCount: () => first.content.measurements.length + second.content.measurements.length };
  const add = (entry) => editors.action(entry, { dataset: { editorAction: "add-measurement" } }, editorContext);
  add(first); add(first); add(second); add(second); assert.equal(add(second), false);
  assert.equal(editorContext.getMeasurementCount(), 4); assert.equal(first.content.measurements[0].unit, "kom");
  const measurement = first.content.measurements[1], unitControls = { innerHTML: "" }, customInput = { value: "", focus() { this.focused = true; } };
  const customWrap = { hidden: true, querySelector: () => customInput };
  measurement.label = "Existing label";
  const row = { dataset: { measureId: measurement.id }, querySelector: (selector) => selector === "[data-unit-controls]" ? unitControls : customWrap };
  for (const [dimension, expected, choices] of [["currency", "EUR", ["EUR", "USD", "GBP"]], ["mass", "kg", ["g", "kg", "t", "lb"]], ["quantity", "kom", ["kom", "pcs", "pair", "pack"]], ["volume", "l", ["ml", "l", "m3"]], ["time", "min", ["s", "min", "h", "day"]], ["distance", "km", ["m", "km", "mi"]], ["length", "cm", ["mm", "cm", "m", "km"]]]) {
    editors.update(first, { dataset: { measureField: "dimension" }, value: dimension, closest: () => row }, editorContext);
    assert.equal(measurement.unit, expected); assert.ok(unitControls.innerHTML.includes('value="' + expected + '" selected'));
    for (const choice of choices) assert.ok(unitControls.innerHTML.includes('value="' + choice + '"'));
  }
  editors.update(first, { dataset: { measureField: "unit", unitChoice: "" }, value: "m", closest: () => row }, editorContext);
  assert.equal(measurement.unit, "m"); assert.equal(customWrap.hidden, true);
  editors.update(first, { dataset: { measureField: "unit", unitChoice: "" }, value: "__custom__", closest: () => row }, editorContext);
  assert.equal(measurement.unit, "m"); assert.equal(customWrap.hidden, false); assert.equal(customInput.value, "m"); assert.equal(customInput.focused, true);
  editors.update(first, { dataset: { measureField: "unit" }, value: "EUR", closest: () => row }, editorContext);
  assert.equal(measurement.label, "Existing label"); assert.equal(measurement.dimension, "length");
  first.content.measurements[0].value = 2; measurement.value = 30;
  second.content.measurements[0].value = 35; second.content.measurements[0].unit = "cm";
  const editorHtml = editors.render(first, editorContext), html = window.MentorResearchStickerSections.render(document, editorContext);
  assert.match(editorHtml, /data-measure-field="dimension"/); assert.doesNotMatch(editorHtml, /data-measure-field="label"|<datalist/);
  assert.match(editorHtml, /<select data-measure-field="unit" data-unit-choice/); assert.match(editorHtml, /value="__custom__" selected/); assert.match(editorHtml, /Druga jedinica/);
  assert.match(editorHtml, /data-editor-action="add-measurement" disabled/);
  assert.ok(html.indexOf("data-sticker-units") > html.indexOf("Body before footer"));
  for (const value of ["2 kom", "30 €", "35 cm"]) assert.ok(html.includes(value));
  document.collapsed = true; assert.match(window.MentorResearchStickerSections.render(document, editorContext), /data-sticker-units hidden/); document.collapsed = false;
  assert.doesNotMatch(window.MentorResearchStickerSections.renderSection(first, editorContext), /toggle-section|aria-expanded/);
  second.content.measurements.push({ id: "retained-old-row", value: 7, unit: '<img onerror="bad">', dimension: "other", label: "Old fifth row" });
  const otherEditor = editors.render({ ...second, content: { measurements: [second.content.measurements.at(-1)] } }, editorContext);
  assert.doesNotMatch(otherEditor, /data-unit-choice/); assert.match(otherEditor, /data-measure-field="unit" value="&lt;img/);
  const before = JSON.stringify(document); assert.equal(add(first), false); assert.equal(JSON.stringify(document), before);
  const saved = core.normalize(json(document)); assert.equal(saved.sections[2].content.measurements.length, 3);
  assert.equal(saved.sections[0].content.measurements[1].label, "Existing label"); assert.equal(saved.sections[0].content.measurements[1].unit, "EUR");
  const safe = window.MentorResearchStickerSections.render(saved, editorContext); assert.match(safe, /&lt;img/); assert.doesNotMatch(safe, /<img onerror/);
});

test("Shared section renderer escapes user text, blocks unsafe URLs and keeps the requested order", () => {
  const { core, window } = load(); const doc = core.fromCard({}, "custom");
  const notes = core.section("notes"), link = core.section("link"), media = core.section("media"); notes.content.text = "<img onerror=alert(1)> **Hello**"; notes.content.format = "markdown"; link.content.url = "javascript:alert(1)";
  doc.sections = [media, notes, link];
  const escape = (value) => String(value).replace(/[&<>\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[character]));
  const html = window.MentorResearchStickerSections.render(doc, { t: (key) => key, escape, scope: "test" });
  assert.ok(html.indexOf(media.sectionId) < html.indexOf(notes.sectionId)); assert.match(html, /&lt;img/); assert.match(html, /<strong>Hello<\/strong>/); assert.doesNotMatch(html, /href="javascript/);
});

test("Description rendering omits trailing blank lines without changing saved text or internal paragraphs", () => {
  const { core, window } = load(), notes = core.section("notes"), doc = core.fromCard({}, "custom");
  notes.content.text = "First paragraph\n\nSecond paragraph\n \n\t";
  doc.sections = [notes];
  const savedText = notes.content.text;
  const html = window.MentorResearchStickerSections.render(doc, { t: (key) => key, escape: (value) => String(value), scope: "spacing" });
  assert.match(html, /First paragraph<br><br>Second paragraph<\/div>/);
  assert.equal(notes.content.text, savedText);
});

test("Visible descriptions fit oversized frames while smaller scroll areas and stored sizes stay intact", () => {
  const { window } = load(), sections = window.MentorResearchStickerSections;
  const body = { hidden: false, textContent: "Description", offsetHeight: 180, querySelector: () => null };
  const notes = { dataset: { stickerSectionType: "notes" }, offsetHeight: 220, querySelector: () => body };
  const card = { dataset: { stickerManualHeight: "760" }, style: { height: "760px" } };
  const content = { hidden: false, childElementCount: 1, get clientHeight() { return parseFloat(card.style.height) - 130; } };
  const container = { closest: () => card,
    querySelectorAll: (selector) => selector === "[data-sticker-section]" ? [notes] : [],
    querySelector: (selector) => selector === "[data-sticker-sections]" ? content : selector === "[data-sticker-heading]" ? { offsetHeight: 46 } : { offsetHeight: 42 } };
  window.getComputedStyle = () => ({ paddingTop: "40px", paddingBottom: "0", borderTopWidth: "1px", borderBottomWidth: "1px" });
  sections.syncLayout(container);
  assert.equal(card.style.height, "350px");
  assert.equal(card.dataset.stickerManualHeight, "760");
  card.dataset.stickerManualHeight = "240";
  sections.syncLayout(container);
  assert.equal(card.style.height, "240px");
  card.dataset.stickerRevealContent = "true";
  sections.syncLayout(container);
  assert.equal(card.style.height, "350px");
  assert.equal(card.dataset.stickerManualHeight, "240");
  delete card.dataset.stickerRevealContent;
  card.dataset.stickerManualHeight = "760";
  notes.dataset.stickerSectionType = "source";
  sections.syncLayout(container);
  assert.equal(card.style.height, "760px");
});

test("Manual sticker sizing shrinks upward, persists, and keeps image folding and scroll input local", async () => {
  const writer = loadWriter({ id: "idea", pathData: { researchDirections: [{ id: "d" }], researchCanvasItems: [{ id: "one", type: "image", directionId: "d" }], researchCanvasSizes: { "item:one": { width: 320, height: 600 } } } });
  const doc = writer.core.fromCard({ type: "image", image: "https://example.com/photo.jpg" });
  const card = { key: "item:one", id: "one", source: "item", type: "image", directionId: "d" };
  let renders = 0; writer.context.renderPathWorkspace = () => { renders++; };
  assert.equal(await writer.context.saveResearchCanvasSticker("idea", { card, document: doc }), true); assert.equal(renders, 1);
  const body = { hidden: false, get offsetHeight() { return this.hidden ? 0 : 210; } }, content = { hidden: false, childElementCount: 1, scrollHeight: 1000, clientHeight: 70 }, footer = { hidden: false, offsetHeight: 42 }, heading = { offsetHeight: 46 };
  const toggle = { lastElementChild: {}, setAttribute() {} }, wholeToggle = { setAttribute() {} };
  const imageNode = { dataset: { stickerSection: doc.sections[0].sectionId }, querySelector: (selector) => selector === "[data-sticker-section-body]" ? body : toggle };
  const element = { dataset: { stickerManualHeight: "600" }, style: { height: "600px" }, classList: { contains: () => true, add() {} }, querySelector: (selector) => selector === "[data-sticker-document]" ? container : null };
  const listeners = {};
  const container = { isConnected: true, addEventListener: (name, listener) => { listeners[name] = listener; }, removeEventListener: (name) => { delete listeners[name]; }, contains: (node) => node === content, closest: () => element, querySelectorAll: (selector) => selector?.includes("data-sticker-section") ? [imageNode] : [], querySelector: (selector) => selector === "[data-sticker-sections]" ? content : selector === "[data-sticker-units]" ? footer : selector === "[data-sticker-heading]" ? heading : wholeToggle };
  writer.window.getComputedStyle = () => ({ paddingTop: "40px", paddingBottom: "0", borderTopWidth: "1px", borderBottomWidth: "1px" });
  const sections = writer.window.MentorResearchStickerSections;
  doc.sections[0].collapsed = true;
  sections.applyViewState(container, doc, (key) => key);
  assert.equal(body.hidden, true); assert.equal(element.style.height, "390px"); assert.equal(element.dataset.stickerManualHeight, "600");
  assert.equal(await writer.context.saveResearchCanvasSticker("idea", { card, document: doc, preserveView: true }), true); assert.equal(renders, 1);
  assert.equal(writer.durable()[0].pathData.researchCanvasSizes["item:one"].height, 600);
  assert.equal(writer.durable()[0].pathData.researchCanvasStickerDocuments["item:one"].sections[0].collapsed, true);
  doc.sections[0].collapsed = false;
  sections.applyViewState(container, doc, (key) => key);
  assert.equal(body.hidden, false); assert.equal(element.style.height, "600px"); assert.equal(element.dataset.stickerCollapsedSectionHeight, "0");
  for (const file of ["js/research/research-geometry.js", "research.js"]) vm.runInContext(read(file), writer.context);
  writer.context.drawResearchCanvasConnections = () => {}; writer.context.drawResearchCanvasFocusConnections = () => {}; writer.context.layoutResearchCanvasFocusAdd = () => {};
  const state = { card: element, frame: element, maxWidth: Infinity, maxHeight: Infinity, preview: null, canvas: {} };
  const smaller = writer.context.applyResearchCanvasResize(state, 320, 240);
  assert.equal(element.style.height, "240px"); assert.equal(smaller.height, 240); assert.equal(element.dataset.stickerManualHeight, "240");
  assert.equal(await writer.context.saveResearchCanvasSize("idea", card.key, smaller.width, smaller.height), true);
  const reloaded = writer.durable()[0]; assert.equal(reloaded.pathData.researchCanvasSizes[card.key].height, 240);
  writer.context.stickerResizeIdea = reloaded; vm.runInContext("researchViewState.currentIdea = stickerResizeIdea", writer.context);
  assert.match(writer.context.renderResearchCanvasCard({ ...card, stickerDocument: doc }, null), /data-sticker-manual-height="240"[^>]*height:240px/);
  doc.sections[0].collapsed = true; sections.applyViewState(container, doc, (key) => key);
  assert.equal(element.style.height, "170px"); assert.equal(element.dataset.stickerManualHeight, "240");
  doc.sections[0].collapsed = false; sections.applyViewState(container, doc, (key) => key); assert.equal(element.style.height, "240px");
  assert.equal(writer.context.applyResearchCanvasResize(state, 320, 20).height, 170);
  const focusFrame = { style: {}, dataset: {} };
  assert.equal(writer.context.applyResearchCanvasResize({ ...state, frame: focusFrame, preview: {} }, 320, 230).height, 230); assert.equal(element.style.height, "230px");
  let blocked = 0;
  const session = sections.mount(container, { getDocument: () => doc, t: (key) => key });
  const target = { closest: (selector) => selector === "[data-sticker-sections]" ? content : null };
  listeners.pointerdown({ target, pointerType: "mouse", stopPropagation: () => { blocked++; } });
  assert.equal(blocked, 0);
  listeners.pointerdown({ target, pointerType: "touch", stopPropagation: () => { blocked++; } });
  listeners.wheel({ target, stopPropagation: () => { blocked++; } });
  assert.equal(blocked, 2); session.dispose(); assert.equal(listeners.wheel, undefined);
  assert.equal(container.querySelectorAll("[data-sticker-section]")[0], imageNode); assert.equal(imageNode.querySelector("[data-sticker-section-body]"), body);
});

test("Section expansion reveals Notes and Source without changing manual size or image settings", () => {
  const { core, window } = load(), sections = window.MentorResearchStickerSections;
  const doc = core.fromCard({}, "custom"); doc.sections = [core.section("image"), core.section("notes"), core.section("source")];
  const imageStyle = { setProperty(name, value) { this[name] = value; }, removeProperty(name) { delete this[name]; } };
  const image = { style: imageStyle }, nodes = doc.sections.map((entry, index) => {
    const body = { hidden: index > 0, querySelector: () => index === 0 ? image : null, get offsetHeight() { return this.hidden ? 0 : index === 0 ? (parseFloat(imageStyle["--research-sticker-image-height"]) || 190) + 20 : index === 1 ? 400 : 120; } };
    const button = { setAttribute() {}, lastElementChild: {} };
    return { dataset: { stickerSection: entry.sectionId, stickerSectionType: entry.sectionType }, querySelector: (selector) => selector === "[data-sticker-section-body]" ? body : button, get offsetHeight() { return 40 + body.offsetHeight; } };
  });
  doc.sections[1].collapsed = true; doc.sections[2].collapsed = true;
  const card = { dataset: { stickerManualHeight: "760" }, style: { height: "240px" } };
  const pane = { hidden: false, childElementCount: 3, get clientHeight() { return parseFloat(card.style.height) - 90; } };
  const container = { closest: () => card, querySelectorAll: () => nodes, querySelector: (selector) => selector === "[data-sticker-sections]" ? pane : selector === "[data-sticker-heading]" ? { offsetHeight: 48 } : selector === "[data-sticker-units]" ? { offsetHeight: 0 } : { setAttribute() {} } };
  window.getComputedStyle = (node) => ({ paddingTop: node === card ? "40px" : "10px", paddingBottom: node === card ? "0" : "10px", borderTopWidth: node === card ? "1px" : "0", borderBottomWidth: node === card ? "1px" : "0" });
  sections.syncLayout(container);
  assert.equal(card.style.height, "240px"); assert.equal(imageStyle["--research-sticker-image-height"], "90px");
  assert.equal(card.dataset.stickerCollapsedSectionHeight, "520");
  doc.sections[1].collapsed = false; sections.applyViewState(container, doc, (key) => key);
  assert.equal(card.dataset.stickerRevealContent, "true"); assert.equal(card.style.height, "820px");
  assert.equal(card.dataset.stickerManualHeight, "760"); assert.equal(imageStyle["--research-sticker-image-height"], undefined);
  doc.sections[2].collapsed = false; sections.applyViewState(container, doc, (key) => key);
  assert.equal(card.style.height, "940px"); assert.equal(card.dataset.stickerManualHeight, "760");
  doc.sections[1].collapsed = true; sections.applyViewState(container, doc, (key) => key);
  assert.equal(card.style.height, "540px"); assert.equal(card.dataset.stickerCollapsedSectionHeight, "400");
  doc.sections[2].collapsed = true; sections.applyViewState(container, doc, (key) => key);
  assert.equal(card.style.height, "420px"); assert.equal(card.dataset.stickerManualHeight, "760");
  assert.equal(nodes[0].querySelector("[data-sticker-section-body]").querySelector(), image);
});

function loadWriter(idea, flags = {}) {
  const records = [], removed = []; let durable = json([idea]); let fail = false;
  const { context, window, core } = load({
    MentorResearch: { getActiveDirectionId: () => "d" },
    MentorResearchAttachments: { validate: async (file) => ({ kind: file.type.startsWith("audio/") ? "audio" : "video", mime: file.type }) },
    MentorData: { repositories: {
      media: { storageKind: "indexeddb", put: async (record) => records.push(record), removeEntity: async (entityType, mediaId) => removed.push({ entityType, mediaId }) },
      ideas: { getAll: () => json(durable), replaceAll: async (ideas) => { if (fail) throw Object.assign(new Error("write failed"), flags); durable = json(ideas); return durable; } }
    } }
  });
  vm.runInContext(read("js/data/services/ideas-durable-save.service.js"), context);
  vm.runInContext(read("brainstorming.js"), context);
  window.brainstormingState.ideas = json([idea]); context.renderPathWorkspace = () => {};
  return { context, window, core, records, removed, setFail: (value) => { fail = value; }, durable: () => json(durable) };
}

test("Designer saves owner and document once, preserves ID on edit, and retries after hydrated rollback", async () => {
  const writer = loadWriter({ id: "idea", pathData: { researchDirections: [{ id: "d" }] } });
  const { core, context } = writer; const card = { id: "stable", type: "note", directionId: "d" }; const document = core.fromCard({}, "notes"); document.title = "New"; document.sections[0].content.text = "first";
  const pendingAsset = { id: "file", kind: "file", name: "drawing.dwg", mime: "application/octet-stream", mediaId: "", url: "" }; const source = core.section("source"); source.content.files.push(pendingAsset); document.sections.push(source);
  const pending = [{ assetId: "file", file: new File(["drawing bytes"], "drawing.dwg") }];
  writer.setFail(true); assert.equal(await context.saveResearchCanvasSticker("idea", { card, document, pending }), false);
  assert.equal(writer.window.brainstormingState.ideas[0].pathData.researchCanvasItems, undefined); assert.equal(writer.removed.length, 1);
  writer.setFail(false); assert.equal(await context.saveResearchCanvasSticker("idea", { card, document, pending }), true);
  assert.equal(writer.durable()[0].pathData.researchCanvasItems.length, 1);
  const saved = writer.durable()[0].pathData.researchCanvasStickerDocuments["item:stable"];
  assert.equal(saved.sections[1].content.files[0].mediaId, writer.records[1].entityId); assert.equal(saved.sections[1].content.files[0].url, "");
  const editedCard = { ...card, key: "item:stable", source: "item" }; saved.title = "Edited";
  assert.equal(await context.saveResearchCanvasSticker("idea", { card: editedCard, document: saved }), true);
  assert.equal(writer.durable()[0].pathData.researchCanvasItems.length, 1); assert.equal(writer.durable()[0].pathData.researchCanvasItems[0].title, "Edited");
});

test("An uncertain partial commit retains staged media, and a normal deletion prunes documents", async () => {
  const writer = loadWriter({ id: "idea", pathData: { researchDirections: [{ id: "d" }] } }, { commitUncertain: true });
  const document = writer.core.fromCard({}, "source"); document.sections[0].content.files.push({ id: "file", kind: "file", name: "test.txt", mediaId: "", url: "" });
  writer.setFail(true);
  assert.equal(await writer.context.saveResearchCanvasSticker("idea", { card: { id: "one", type: "source", directionId: "d" }, document, pending: [{ assetId: "file", file: new File(["contents"], "test.txt") }] }), false);
  assert.equal(writer.records.length, 1); assert.equal(writer.removed.length, 0);
  writer.setFail(false);
  assert.equal(await writer.context.saveResearchCanvasSticker("idea", { card: { id: "one", type: "source", directionId: "d" }, document, pending: [{ assetId: "file", file: new File(["contents"], "test.txt") }] }), true);
  assert.equal(await writer.context.deleteResearchCanvasItem("idea", "one"), true);
  assert.equal(writer.durable()[0].pathData.researchCanvasItems.length, 0); assert.deepEqual(writer.durable()[0].pathData.researchCanvasStickerDocuments, {});
  assert.equal(writer.removed.some((record) => record.mediaId === writer.records[1].entityId), true);
});

test("A partial legacy update keeps retained attachment media and shared section references prevent deletion", async () => {
  const asset = { id: "file", kind: "file", name: "keep.pdf", entityType: "research-source", mediaId: "keep", url: "" };
  const { core } = load(); const document = core.fromCard({}, "source"); document.sections[0].content.files.push(asset);
  const writer = loadWriter({ id: "idea", pathData: { researchDirections: [{ id: "d" }], researchCanvasItems: [{ id: "one", type: "source", attachmentMediaId: "keep" }, { id: "two", type: "note" }], researchCanvasStickerDocuments: { "item:two": document } } });
  assert.equal(await writer.context.saveResearchCanvasItem("idea", { id: "one", type: "source", title: "Renamed" }), true);
  assert.equal(writer.removed.length, 0); assert.equal(writer.durable()[0].pathData.researchCanvasItems[0].attachmentMediaId, "keep");
  assert.equal(await writer.context.deleteResearchCanvasItem("idea", "one"), true); assert.equal(writer.removed.length, 0);
});

test("Unrelated preview updates never reset a hydrated media player's source", async () => {
  let assignments = 0, reads = 0;
  const { core, window } = load({ MentorData: { repositories: { media: { getEntity: async () => { reads++; return { blob: new Blob(["recording"], { type: "audio/webm" }) }; } } } } });
  const document = core.fromCard({}, "av"); document.sections[0].content.items.push({ id: "recording", kind: "audio", mediaId: "saved", entityType: "research-av" });
  const player = { dataset: { stickerAsset: "recording" }, isConnected: true, set src(value) { assignments++; this.currentSrc = value; }, pause() {}, load() {}, removeAttribute() {}, setAttribute() {}, classList: { add() {} } };
  const container = { isConnected: true, addEventListener() {}, removeEventListener() {}, querySelector: () => null, querySelectorAll: () => [player], contains: () => true };
  const session = window.MentorResearchStickerSections.mount(container, { getDocument: () => document, t: (key) => key });
  await new Promise((resolve) => setImmediate(resolve));
  await session.hydrate(); await session.hydrate();
  assert.equal(reads, 1); assert.equal(assignments, 1); session.dispose();
});

async function ideasRepository({ absentLegacy = false, rollbackFails = false, concurrentFinance = false } = {}) {
  const window = {}; const context = vm.createContext({ window });
  for (const file of ["js/data/state/repository-state.constants.js", "js/data/errors/data-error.js", "js/data/state/data-event-bus.js", "js/data/contracts/storage-adapter.contract.js", "js/data/contracts/repository.contract.js", "js/data/adapters/local-storage.adapter.js", "js/data/repositories/repository-helpers.js", "js/data/repositories/ideas.repository.js"]) vm.runInContext(read(file), context);
  const central = '{ "version": 1, "ideas": [{"id":"old"}], "finance": {"untouched":true} }';
  const legacy = '[ { "id": "old" } ]';
  const values = new Map([["mentor_database", central], ...(!absentLegacy ? [["mentor_brainstorming_ideas", legacy]] : [])]);
  let failures = [];
  const storage = { getItem: (key) => values.get(key) ?? null, removeItem: (key) => values.delete(key), setItem(key, value) { if (failures[0] === key) { failures.shift(); if (key === "mentor_database" && concurrentFinance) { concurrentFinance = false; adapter.update("mentor_database", (current) => ({ ...current, finance: { committedDuringIdeasFailure: true } })); } throw new Error("quota"); } values.set(key, value); } };
  const adapter = new window.MentorLocalStorageAdapter(storage); const repository = window.MentorDataRepositoryFactories.createIdeasRepository(adapter); await repository.initialize();
  failures = ["mentor_database", ...(rollbackFails ? ["mentor_brainstorming_ideas"] : [])];
  return { repository, values, central, legacy, reload: async () => { const next = window.MentorDataRepositoryFactories.createIdeasRepository(adapter); await next.initialize(); return json(next.getAll()); } };
}

test("Legacy ideas commit restores its exact legacy key and prior central ideas on second-write failure", async () => {
  for (const absentLegacy of [false, true]) {
    const { repository, values, central, legacy, reload } = await ideasRepository({ absentLegacy });
    await assert.rejects(repository.replaceAll([{ id: "new" }]), /quota/);
    assert.deepEqual(JSON.parse(values.get("mentor_database")), JSON.parse(central));
    assert.equal(values.get("mentor_brainstorming_ideas") ?? null, absentLegacy ? null : legacy);
    assert.deepEqual(json(repository.getAll()), [{ id: "old" }]); assert.deepEqual(await reload(), [{ id: "old" }]);
  }
});

test("A failed localStorage rollback explicitly marks commit uncertainty for staged-media protection", async () => {
  const { repository } = await ideasRepository({ rollbackFails: true });
  await assert.rejects(repository.replaceAll([{ id: "new" }]), (error) => error.commitUncertain === true);
});

test("An ideas rollback preserves a concurrently committed finance domain in the central adapter queue", async () => {
  const { repository, values } = await ideasRepository({ concurrentFinance: true });
  await assert.rejects(repository.replaceAll([{ id: "new" }]), /quota/);
  const central = JSON.parse(values.get("mentor_database"));
  assert.deepEqual(central.ideas, [{ id: "old" }]); assert.equal(central.finance.committedDuringIdeasFailure, true);
});

test("Media cleanup waits for overlapping saves and uses confirmed data after a failed optimistic removal", async () => {
  const idea = { id: "idea", pathData: { researchCanvasItems: [{ id: "one", type: "source", attachmentMediaId: "retained" }] } };
  const writer = loadWriter(idea);
  const pending = [];
  writer.window.MentorIdeasDurableSave = { commit: () => new Promise((resolve) => pending.push(resolve)) };
  const first = writer.context.saveIdeas();
  writer.window.brainstormingState.ideas[0].pathData.researchCanvasItems = [];
  const second = writer.context.saveIdeas();
  pending[0]({ ok: true, ideas: json([idea]) }); await first;
  assert.equal(writer.removed.length, 0);
  pending[1]({ ok: false, ideas: json([idea]), error: new Error("quota") }); await second;
  assert.equal(writer.removed.length, 0); assert.equal(writer.window.brainstormingState.ideas[0].pathData.researchCanvasItems[0].attachmentMediaId, "retained");
});

test("Legacy reference unit/price display and uploaded-video poster survive the adapter", () => {
  const { core, window } = load();
  const document = core.fromCard({ type: "video", key: "item:video", videoMediaId: "clip", image: "https://example.com/poster.jpg", price: "125 EUR" });
  assert.equal(document.sections.find((entry) => entry.sectionType === "image").content.asset.mediaId, "");
  assert.equal(document.sections.find((entry) => entry.sectionType === "video").content.asset.mediaId, "clip");
  assert.equal(document.sections.find((entry) => entry.sectionType === "unit").content.measurements[0].value, 125);
  const legacy = core.fromCard({ type: "link", source: "reference", reference: { unitValue: "about 125", unitType: "money_eur" } });
  const html = window.MentorResearchStickerSections.render(legacy, { t: (key) => key, escape: String });
  assert.match(html, /about 125 EUR/);
});

test("Malformed or future documents remain intact and cannot be overwritten by a save", () => {
  const { core } = load(); const future = { version: 99, sections: [{ sectionType: "future" }] };
  const pathData = { researchCanvasItems: [{ id: "one", type: "note", title: "Old" }], researchCanvasStickerDocuments: { "item:one": future } };
  const before = JSON.stringify(pathData);
  assert.throws(() => core.apply(pathData, { key: "item:one", id: "one", source: "item" }, core.fromCard({}, "notes")), /Invalid sticker document/);
  assert.equal(JSON.stringify(pathData), before);
  const malformed = core.fromCard({}, "media"); malformed.sections[0].content.items = {};
  assert.throws(() => core.normalize(malformed), /Invalid sticker assets/);
  for (const value of [null, false, 0]) { malformed.sections[0].content.items = [value]; assert.throws(() => core.normalize(malformed), /Invalid sticker asset/); }
});

test("Legacy note autosaves synchronize the document and reference note deletion prunes its media", async () => {
  const { core } = load(); const reference = { id: "r", title: "Reference", notes: [{ id: "n", title: "Note", body: "Old" }] };
  const document = core.fromCard({ key: "linked-note:d:r:n", type: "note", title: "Note", text: "Old" });
  const writer = loadWriter({ id: "idea", pathData: { researchDirections: [{ id: "d", references: [reference] }], researchCanvasStickerDocuments: { "linked-note:d:r:n": document } } });
  assert.equal(await writer.context.updateResearchCanvasLinkedNote("idea", "d", "r", { id: "n", title: "Edited", body: "New" }), true);
  assert.equal(writer.durable()[0].pathData.researchCanvasStickerDocuments["linked-note:d:r:n"].sections[0].content.text, "New");
  assert.equal(await writer.context.updateResearchReferenceInDirection("idea", "d", "r", { notes: [] }), true);
  assert.deepEqual(writer.durable()[0].pathData.researchCanvasStickerDocuments, {});
});

test("Legacy note identity materialization matches rendered keys and avoids saved-ID collisions", () => {
  const { context, window } = load(); vm.runInContext(read("brainstorming.js"), context);
  const reference = { id: "r", notes: ["missing ID", { id: "note_0", body: "saved identity" }] };
  const direction = { id: "d", references: [reference], notes: ["missing ID", { id: "0", body: "saved identity" }] };
  const linkedKeys = window.MentorResearchModel.getReferenceNotes(reference, (key) => key).map((note) => note.id);
  context.ensureResearchCanvasNoteIds({ researchDirections: [direction] });
  assert.deepEqual(json(reference.notes.map((note) => note.id)), json(linkedKeys));
  assert.equal(reference.notes[1].id, "note_0"); assert.equal(direction.notes[1].id, "0");
  assert.equal(new Set(reference.notes.map((note) => note.id)).size, 2); assert.equal(new Set(direction.notes.map((note) => note.id)).size, 2);
});

test("Standalone video files retain the existing video repository compatibility", async () => {
  const writer = loadWriter({ id: "idea", pathData: { researchDirections: [{ id: "d" }] } });
  const document = writer.core.fromCard({ type: "video" });
  document.sections[0].content.asset = { id: "video", kind: "video", name: "legacy.mkv", mime: "video/x-matroska", url: "", mediaId: "" };
  assert.equal(await writer.context.saveResearchCanvasSticker("idea", { card: { id: "video", type: "video", directionId: "d" }, document, pending: [{ assetId: "video", file: new File(["video bytes"], "legacy.mkv", { type: "video/x-matroska" }) }] }), true);
  assert.equal(writer.records[0].entityType, "research-video");
  assert.equal(writer.durable()[0].pathData.researchCanvasItems[0].videoMediaId, writer.records[0].entityId);
});
