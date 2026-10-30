const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");

test("Research organization scripts and language files parse", () => {
  [
    "js/research/research-selection.js", "js/research/research-groups.js",
    "js/research/research-annotations.js", "js/research/research-sticker-style.js", "js/research/research-organizer.js",
    "js/research/research-geometry.js", "js/research/research-persistence.js", "js/research/research-sticker-drag.js", "js/research/research-external-drop.js",
    "research.js", "brainstorming.js", "lazyLoader.js",
    "js/i18n/sr-brainstorming-research.js", "js/i18n/en-brainstorming-research.js"
  ].forEach((file) => assert.doesNotThrow(() => new vm.Script(fs.readFileSync(path.join(projectRoot, file), "utf8"), { filename: file })));
});

test("unsupported saved canvas records stay intact and cannot appear as editable stickers", async () => {
  const context = vm.createContext({ window: {}, console });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "js/research/research-model.js"), "utf8"), context);
  const idea = { id: "idea", pathData: {
    researchDirections: [{ id: "direction" }],
    researchCanvasItems: [
      { id: "legacy", title: "Legacy note" },
      { id: "retired", type: "retired-type", title: "Saved record" },
      { id: "child", type: "note", title: "Linked note", canvasParentKey: "item:retired" }
    ],
    researchCanvasGroups: [{ id: "group", directionId: "direction", memberKeys: ["item:retired", "item:child"] }]
  } };
  const before = JSON.stringify(idea);
  const cards = context.window.MentorResearchModel.getCanvasCards(idea, {
    directionId: "direction", getFinanceOptions: () => [], getReferenceUnitDisplay: () => "",
    formatFinancialMoney: () => "", translate: (key) => key
  });
  assert.deepEqual(JSON.parse(JSON.stringify(cards.map((card) => card.key))), ["item:legacy", "item:child"]);
  assert.equal(context.window.MentorResearchModel.getCanvasGraph(cards).parentByKey.size, 0);
  assert.equal(JSON.stringify(idea), before);
  context.window.matchMedia = () => ({ matches: false });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "brainstorming.js"), "utf8"), context);
  context.window.brainstormingState.ideas = [idea];
  assert.equal(await context.saveResearchCanvasItem("idea", { type: "retired-type", title: "New" }), false);
  assert.equal(JSON.stringify(idea), before);
});

test("external drop keeps image priority and accepts ordinary web links", () => {
  const anchor = { getAttribute: (name) => name === "href" ? "https://example.com/article" : "Article title", textContent: "Article title" };
  const imageNode = { getAttribute: (name) => name === "src" ? "https://cdn.example.com/picture.jpg" : "Image description", closest: () => anchor };
  const DOMParser = class { parseFromString() { return { querySelector: (name) => name === "img" ? imageNode : name === "a[href]" ? anchor : null }; } };
  const context = vm.createContext({ window: {}, URL, DOMParser });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "js/research/research-external-drop.js"), "utf8"), context);
  const parse = context.window.MentorResearchExternalDrop.parseTransfer;
  const transfer = (data, files = []) => ({ getData: (type) => data[type] || "", files });
  const imageUrlLink = parse(transfer({ "text/uri-list": "https://example.com/picture.jpg" }));
  assert.equal(imageUrlLink.kind, "link");
  assert.equal(imageUrlLink.sourceUrl, "https://example.com/picture.jpg");
  const fromPage = parse(transfer({ "text/html": "<a><img></a>" }));
  assert.equal(fromPage.imageUrl, "https://cdn.example.com/picture.jpg");
  assert.equal(fromPage.pageUrl, "https://example.com/article");
  assert.equal(fromPage.titleHint, "Article title");
  const firefoxLink = parse(transfer({ "text/x-moz-url": "https://example.com/other.png\nOther image" }));
  assert.equal(firefoxLink.kind, "link");
  assert.equal(firefoxLink.sourceUrl, "https://example.com/other.png");
  assert.equal(firefoxLink.titleHint, "Other image");
  const link = parse(transfer({ "text/uri-list": "# browser comment\nhttps://example.com/article" }));
  assert.equal(link.kind, "link");
  assert.equal(link.sourceUrl, "https://example.com/article");
  const file = { type: "image/png", name: "picture.png", size: 42 };
  assert.equal(parse(transfer({}, [file])).kind, "image");
  assert.equal(parse(transfer({}, [file])).file.name, "picture.png");
  assert.equal(parse(transfer({ "text/uri-list": "javascript:alert(1)" })), null);
});

test("external hyperlink formats resolve one safe link with a usable title fallback", () => {
  const DOMParser = class { parseFromString(html) {
    const href = html.match(/href="([^"]+)"/)?.[1];
    const src = html.match(/src="([^"]+)"/)?.[1];
    const anchor = href ? { getAttribute: (name) => name === "href" ? href : "", textContent: "Build a PC" } : null;
    const image = src ? { getAttribute: (name) => name === "src" ? src : "", closest: () => anchor } : null;
    return { querySelector: (name) => name === "img" ? image : name === "a[href]" ? anchor : null };
  } };
  const context = vm.createContext({ window: {}, URL, DOMParser });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "js/research/research-external-drop.js"), "utf8"), context);
  const api = context.window.MentorResearchExternalDrop;
  const transfer = (data) => ({ getData: (type) => data[type] || "", files: [] });
  const uri = api.parseTransfer(transfer({ "text/uri-list": "# comment\njavascript:alert(1)\nhttps://example.com/article" }));
  assert.equal(uri.kind, "link");
  assert.equal(uri.sourceUrl, "https://example.com/article");
  const html = api.parseTransfer(transfer({ "text/html": '<a href="https://example.com/guides/build-a-pc">Build a PC</a>' }));
  assert.equal(html.sourceUrl, "https://example.com/guides/build-a-pc");
  assert.equal(html.titleHint, "Build a PC");
  assert.equal(api.parseTransfer(transfer({ "text/html": '<a href="https://example.com/photo.png">Build a PC</a>' })).kind, "link");
  assert.equal(api.parseTransfer(transfer({ "text/uri-list": "https://example.com/photo.png" })).kind, "link");
  assert.equal(api.parseTransfer(transfer({ "text/plain": "https://example.com/photo.png" })).kind, "link");
  const plain = api.parseTransfer(transfer({ "text/plain": "https://example.com/plain-link" }));
  assert.equal(plain.kind, "link");
  assert.equal(plain.sourceUrl, "https://example.com/plain-link");
  assert.equal(api.titleFromUrl(plain.sourceUrl), "example.com · plain link");
  assert.equal(api.parseTransfer(transfer({ "text/plain": "javascript:alert(1)" })), null);
  assert.equal(api.parseTransfer(transfer({ "text/html": '<a href="javascript:alert(1)">Unsafe</a>' })), null);
  const withImage = api.parseTransfer(transfer({ "text/html": '<a href="https://example.com/article"><img src="https://example.com/photo.png"></a>',
    "text/uri-list": "https://example.com/photo.png", "text/plain": "https://example.com/article" }));
  assert.equal(withImage.kind, "image");
  assert.equal(withImage.imageUrl, "https://example.com/photo.png");
});

test("external image title uses page metadata when the site permits reading it", async () => {
  const metadata = { getAttribute: () => "Page headline" };
  const DOMParser = class { parseFromString() { return { querySelector: (name) => name === 'meta[property="og:title"]' ? metadata : null }; } };
  const fetch = async () => ({ ok: true, headers: { get: (name) => name === "content-type" ? "text/html; charset=utf-8" : "100" }, text: async () => "<html></html>" });
  const context = vm.createContext({ window: {}, URL, DOMParser, fetch, AbortController, setTimeout, clearTimeout });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "js/research/research-external-drop.js"), "utf8"), context);
  assert.equal(await context.window.MentorResearchExternalDrop.fetchPageTitle("https://example.com/article"), "Page headline");
});

test("external image drop stays inside the canvas and ignores text editing", () => {
  const context = vm.createContext({ window: { MentorUIEvents: { isTextEditingEvent: (event) => Boolean(event.editing) } }, URL });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "js/research/research-external-drop.js"), "utf8"), context);
  const listeners = {};
  const viewport = { classList: { add() {}, remove() {} } };
  const host = { addEventListener: (name, listener) => { listeners[name] = listener; }, contains: (node) => node === viewport };
  let dropped = 0;
  context.window.MentorResearchExternalDrop.bind(host, { onDrop: () => { dropped++; } });
  const event = (editing, target) => ({ editing, target, dataTransfer: { types: ["text/uri-list"], getData: (type) => type === "text/uri-list" ? "https://example.com/image.jpg" : "", files: [] }, preventDefault() {}, stopPropagation() {} });
  listeners.drop(event(true, { closest: () => viewport }));
  listeners.drop(event(false, { closest: () => null }));
  assert.equal(dropped, 0);
  listeners.drop(event(false, { closest: () => viewport }));
  assert.equal(dropped, 1);
});

test("Research loads its image storage helper before the organizer", () => {
  const loader = fs.readFileSync(path.join(projectRoot, "lazyLoader.js"), "utf8");
  const research = loader.slice(loader.indexOf("brainstorming: {"), loader.indexOf("financeDashboard: {"));
  assert.ok(research.indexOf('nutritionAsset("js/nutrition/services/food-image-storage.service.js")') > -1);
  assert.ok(research.indexOf('nutritionAsset("js/nutrition/services/food-image-storage.service.js")') < research.indexOf('"js/research/research-organizer.js'));
  assert.ok(research.indexOf('"js/research/research-external-drop.js') < research.indexOf('"research.js'));
});

test("minimized players drag and resize independently without touching playback", () => {
  const context = loadResearch();
  context.window.innerWidth = 1440;
  context.window.innerHeight = 900;
  const windowListeners = {};
  context.window.addEventListener = (type, listener) => {windowListeners[type] = listener;};
  context.window.removeEventListener = (type) => {delete windowListeners[type];};
  context.window.MentorUIEvents = {isTextEditingEvent:event=>Boolean(event.editing)};
  const handle = () => {
    const listeners = {};
    return {listeners,dataset:{},setAttribute(){},setPointerCapture(){},hasPointerCapture:()=>false,
      addEventListener(type, listener){listeners[type]=listener;},removeEventListener(type){delete listeners[type];}};
  };
  const header = handle(), resize = handle(), classes = new Set();
  let createdHandle;
  const modal = {style:{setProperty(){}},querySelector:()=>null,appendChild(node){createdHandle=node;},
    classList:{contains:key=>classes.has(key),add:key=>classes.add(key),remove:key=>classes.delete(key)},
    getBoundingClientRect(){const g=this._researchMediaPanelGeometry;return g?{left:g.x,top:g.y,width:g.width,height:g.height}:{left:40,top:50,width:400,height:270};}};
  context.document = {createElement:()=>resize};
  context.bindResearchMediaPanel(modal,header);
  assert.equal(createdHandle,resize);
  const event={button:0,pointerId:1,clientX:100,clientY:100,target:{closest:()=>null},preventDefault(){},stopPropagation(){}};
  header.listeners.pointerdown(event);
  assert.equal(header.listeners.pointermove,undefined);
  classes.add("is-minimized");
  header.listeners.pointerdown({...event,editing:true});
  assert.equal(header.listeners.pointermove,undefined);
  header.listeners.pointerdown({...event,target:{closest:()=>({})}});
  assert.equal(header.listeners.pointermove,undefined);
  header.listeners.pointerdown(event);
  header.listeners.pointermove({pointerId:1,clientX:220,clientY:160});
  assert.equal(modal._researchMediaPanelGeometry.x,160);
  assert.equal(modal._researchMediaPanelGeometry.y,110);
  header.listeners.pointerup({pointerId:1,type:"pointerup"});
  resize.listeners.pointerdown(event);
  resize.listeners.pointermove({pointerId:1,clientX:180,clientY:140});
  assert.equal(modal._researchMediaPanelGeometry.width,480);
  assert.equal(modal._researchMediaPanelGeometry.height,310);
  resize.listeners.pointerup({pointerId:1,type:"pointerup"});
  assert.equal(modal._researchMediaPanelGeometry.x,160);
  const other = {style:{setProperty(){}},querySelector:()=>null,classList:{add(){}}};
  context.applyResearchMediaPanelGeometry(other,{x:2000,y:2000,width:320,height:240});
  assert.equal(other._researchMediaPanelGeometry.x,1112);
  assert.equal(other._researchMediaPanelGeometry.y,652);
  assert.equal(modal._researchMediaPanelGeometry.width,480);
  resize.listeners.pointerdown(event);
  resize.listeners.pointermove({pointerId:1,clientX:240,clientY:180});
  resize.listeners.pointercancel({pointerId:1,type:"pointercancel"});
  assert.equal(modal._researchMediaPanelGeometry.width,480);
  assert.equal(modal._researchMediaPanelGeometry.height,310);
  classes.delete("is-minimized");
  assert.equal(modal._researchMediaPanelGeometry.width,480);
  classes.add("is-minimized");
  context.restoreResearchMediaPanelGeometry(modal);
  assert.equal(modal._researchMediaPanelGeometry.x,160);
  context.window.innerWidth = 600;
  windowListeners.resize();
  assert.equal(modal._researchMediaPanelGeometry.x,112);
  modal._researchMediaPanelCleanup();
  assert.equal(windowListeners.resize,undefined);
});

test("player minimize and restore keep media nodes intact and release modal blocking", async () => {
  const context = loadResearch();
  const classes = new Set();
  const attributes = {role:"dialog", "aria-modal":"true"};
  let onClick, mountedButton;
  const media = {playing:true};
  const button = {dataset:{},setAttribute(key,value){this[key]=value;},addEventListener(type,callback){if(type==="click")onClick=callback;}};
  const header = {querySelector:()=>null,appendChild(node){mountedButton=node;},addEventListener(){}};
  const modal = {isConnected:true,style:{setProperty(){}},querySelector:()=>null,appendChild(){},
    classList:{contains:key=>classes.has(key),toggle(key,value){if(value)classes.add(key);else classes.delete(key);},remove:key=>classes.delete(key)},
    setAttribute(key,value){attributes[key]=value;},removeAttribute(key){delete attributes[key];},media};
  let blocked = true;
  context.window.addEventListener = () => {};
  context.window.removeEventListener = () => {};
  context.document = {createElement:()=>button,querySelectorAll:()=>[],querySelector:selector=>selector.includes(":not(.is-minimized)")&&!classes.has("is-minimized")?modal:null,
    body:{classList:{toggle(name,value){blocked=value;}}},documentElement:{classList:{toggle(){}}}};
  context.bindResearchMediaMinimize(modal, header);
  assert.equal(mountedButton,button);
  await onClick({preventDefault(){},stopPropagation(){}});
  assert.equal(classes.has("is-minimized"),true);
  assert.equal(attributes.role,"region");
  assert.equal(attributes["aria-modal"],undefined);
  assert.equal(blocked,false);
  assert.equal(modal.media,media);
  assert.equal(media.playing,true);
  await onClick({preventDefault(){},stopPropagation(){}});
  assert.equal(classes.has("is-minimized"),false);
  assert.equal(attributes.role,"dialog");
  assert.equal(attributes["aria-modal"],"true");
  assert.equal(blocked,true);
  assert.equal(modal.media,media);
});

test("research refresh keeps minimized playback; explicit close pauses and releases it", () => {
  const context = loadResearch();
  let paused = 0, removed = 0, stopped = 0, released = 0, cleared = 0, reset = 0;
  const modal = {classList:{contains:()=>true},querySelector:()=>({pause(){paused++;},removeAttribute(name){assert.equal(name,"src");cleared++;},load(){reset++;}}),remove(){removed++;}};
  const session = {modal,objectUrl:"blob:playback",stopIdle(){stopped++;}};
  context.window.URL = {revokeObjectURL: () => {released++;}};
  context.document = {removeEventListener(){}};
  context.syncResearchModalLayer = () => {};
  context.playbackSession = session;
  vm.runInContext("researchCanvasMediaSessions.add(playbackSession)",context);
  context.closeResearchCanvasMedia({preserveMinimized:true});
  assert.equal(paused,0);
  assert.equal(removed,0);
  assert.equal(cleared,0);
  assert.equal(reset,0);
  assert.equal(vm.runInContext("researchCanvasMediaSessions.size",context),1);
  context.closeResearchCanvasMedia();
  assert.equal(paused,1);
  assert.equal(removed,1);
  assert.equal(stopped,1);
  assert.equal(released,1);
  assert.equal(cleared,1);
  assert.equal(reset,1);
  assert.equal(vm.runInContext("researchCanvasMediaSessions.size",context),0);
});

test("map zoom preserves the world point under the pointer and clamps at limits", () => {
  const context = loadResearch();
  const camera = { x: -120, y: 60, zoom: 1 };
  const anchor = { x: 420, y: 280 };
  const worldX = (anchor.x - camera.x) / camera.zoom;
  const worldY = (anchor.y - camera.y) / camera.zoom;
  context.zoomResearchCanvasCamera(camera, 1.8, anchor.x, anchor.y);
  assert.ok(Math.abs((anchor.x - camera.x) / camera.zoom - worldX) < 0.00001);
  assert.ok(Math.abs((anchor.y - camera.y) / camera.zoom - worldY) < 0.00001);
  context.zoomResearchCanvasCamera(camera, 100, anchor.x, anchor.y);
  assert.equal(camera.zoom, 3);
  context.zoomResearchCanvasCamera(camera, 0.001, anchor.x, anchor.y);
  assert.equal(camera.zoom, 0.25);
});

test("map camera stays independent for each idea and direction", () => {
  const context = loadResearch();
  const first = {id:"map-a",pathData:{researchDirections:[{id:"direction-a"}]}};
  const second = {id:"map-b",pathData:{researchDirections:[{id:"direction-a"}]}};
  const camera = context.getResearchCanvasCamera(first);
  camera.x = -300;
  camera.zoom = 1.6;
  assert.equal(context.getResearchCanvasCamera(first), camera);
  assert.equal(context.getResearchCanvasCamera(second).x, 0);
  first.pathData.researchDirections = [{id:"direction-b"}];
  assert.equal(context.getResearchCanvasCamera(first).zoom, 1);
});

test("group navigation centers a group without changing map zoom", () => {
  const context = loadResearch();
  const idea = { id: "group-navigation", pathData: {} };
  context.focusIdea = idea;
  vm.runInContext("researchViewState.currentIdea = focusIdea", context);
  const camera = context.getResearchCanvasCamera();
  camera.zoom = 1.5;
  const viewport = { clientWidth: 900, clientHeight: 600, querySelector: () => canvas };
  const canvas = { dataset: {}, style: {}, closest: (selector) => selector.includes("canvas-viewport") ? viewport : null };
  context.focusResearchCanvasGroup(viewport, { x: 300, y: -100, width: 200, height: 120 });
  assert.equal(camera.x, -150);
  assert.equal(camera.y, 360);
  assert.equal(camera.zoom, 1.5);
  assert.match(canvas.style.transform, /translate\(-150px,360px\) scale\(1\.5\)/);
});

test("map pan and wheel handlers keep editing controls terminal and cancel cleanly", () => {
  const context = loadResearch();
  const listeners = {};
  const view = {querySelector: () => null, querySelectorAll: () => []};
  const viewport = {dataset:{},clientLeft:0,clientTop:0,clientHeight:600,style:{setProperty(){}},classList:{add(){},remove(){}},
    closest: () => view, getBoundingClientRect: () => ({left:10,top:20}),
    setPointerCapture(){},hasPointerCapture:()=>false,
    addEventListener(type, listener) {listeners[type] = listener;}, removeEventListener(type) {delete listeners[type];},
    querySelector: () => canvas};
  const canvas = {dataset:{},style:{},closest: selector => selector === "[data-research-canvas-viewport]" ? viewport : view};
  context.closeResearchCanvasMenus = () => {};
  context.window.MentorUIEvents = {isTextEditingEvent: event => Boolean(event.editing)};
  context.bindResearchCanvasMap({}, canvas);
  const camera = context.getResearchCanvasCamera();
  let prevented = 0;
  const event = {button:0,pointerId:1,clientX:200,clientY:200,target:{closest:()=>null},preventDefault(){prevented++;},stopPropagation(){}};
  listeners.pointerdown({...event,editing:true});
  assert.equal(listeners.pointermove, undefined);
  listeners.pointerdown({...event,target:{closest:()=>({})}});
  assert.equal(listeners.pointermove, undefined);
  listeners.pointerdown(event);
  listeners.pointermove({pointerId:1,clientX:320,clientY:260});
  assert.equal(camera.x,120);
  assert.equal(camera.y,60);
  listeners.pointercancel({pointerId:1,type:"pointercancel"});
  assert.equal(camera.x,0);
  assert.equal(camera.y,0);
  assert.equal(listeners.pointermove, undefined);
  const priorZoom = camera.zoom;
  listeners.wheel({...event,editing:true,deltaY:-120,deltaMode:0});
  assert.equal(camera.zoom,priorZoom);
  for (const selector of [".research-canvas-card-menu", "[data-research-group-panel]", "[data-research-organizer-add-menu]", "[data-research-pointer-menu]"]) {
    listeners.wheel({...event,deltaY:-120,deltaMode:0,target:{closest: selectors => selectors.includes(selector) ? {} : null}});
    assert.equal(camera.zoom,priorZoom, selector + " must scroll without zooming the canvas");
  }
  listeners.wheel({...event,deltaY:-120,deltaMode:0});
  assert.ok(Math.abs(camera.zoom - priorZoom * Math.exp(0.12)) < 1e-10);
  assert.ok(Math.abs(camera.x - 190 * (1 - Math.exp(0.12))) < 1e-10);
  assert.ok(Math.abs(camera.y - 180 * (1 - Math.exp(0.12))) < 1e-10);
  assert.equal(canvas.dataset.mapScale,String(camera.zoom));
  listeners.wheel({...event,deltaY:120,deltaMode:0});
  assert.ok(Math.abs(camera.zoom - priorZoom) < 1e-10);
  assert.ok(Math.abs(camera.x) < 1e-10);
  assert.ok(Math.abs(camera.y) < 1e-10);
  assert.equal(prevented,3);
});

test("note expansion control appears only for overflow or an expanded note", () => {
  const context = loadResearch();
  const button = {expanded: "false", hidden: false, getAttribute() {return this.expanded;}};
  const text = {clientHeight: 42, scrollHeight: 42};
  const content = {clientHeight: 120, scrollHeight: 120};
  const card = {querySelector(selector) {return selector === "[data-research-card-fit]" ? button : selector === ".research-canvas-card-text" ? text : content;}};
  context.updateResearchCanvasNoteFitVisibility(card);
  assert.equal(button.hidden, true);
  text.scrollHeight = 180;
  context.updateResearchCanvasNoteFitVisibility(card);
  assert.equal(button.hidden, false);
  text.scrollHeight = 42;
  content.scrollHeight = 200;
  context.updateResearchCanvasNoteFitVisibility(card);
  assert.equal(button.hidden, false);
  content.scrollHeight = 120;
  button.expanded = "true";
  context.updateResearchCanvasNoteFitVisibility(card);
  assert.equal(button.hidden, false);
  button.expanded = "false";
  context.updateResearchCanvasNoteFitVisibility(card);
  assert.equal(button.hidden, true);
});

test("fit note grows the map, preserves width and saves its complete height", async () => {
  const context = loadResearch();
  const saved = [];
  const button = { attributes:{}, setAttribute(key, value) {this.attributes[key] = value;}, getAttribute(key) {return this.attributes[key];} };
  const card = { offsetHeight: 900, scrollHeight: 900, style: {top:"80px", removeProperty(key) {delete this[key];}}, classList: {contains: (name) => name === "is-note", add() {}, remove() {}}, querySelector: () => button };
  const canvas = { clientHeight: 640, style: {} };
  const state = {card, frame: card, canvas, preview: null, scale: 0.748, startWidth: 224, maxWidth: 200, maxHeight: 400, ideaId:"fit", key:"item:note", parentKey:"", actions:{saveCanvasSize:(...args)=>saved.push(args)}};
  context.getResearchCanvasResizeState = () => state;
  context.drawResearchCanvasConnections = () => {};
  vm.runInContext('researchViewState.currentIdea = {id:"fit",pathData:{}}', context);
  await context.fitResearchCanvasNote({}, button);
  assert.equal(card.style.width, "224px");
  assert.equal(card.style.height, "900px");
  assert.equal(parseFloat(canvas.style.height), 80 + 900 * 0.748 + 72);
  assert.deepEqual(saved[0], ["item:note", 224, 900, true]);
  assert.match(button.innerHTML, /data-lotus-state="open"/);
  assert.equal(button.getAttribute("aria-expanded"), "true");
  state.preview = {};
  await context.fitResearchCanvasNote({}, button);
  assert.equal(saved.length, 1);
  state.preview = null;
  state.maxWidth = 600;
  const resized = context.applyResearchCanvasResize(state, 416, 950);
  await context.persistResearchCanvasResize(state, resized);
  assert.match(button.innerHTML, /data-lotus-state="open"/);
  assert.equal(saved[1][3], true);
  state.startWidth = 416;
  let resetKey;
  let resetWidth;
  state.actions.resetCanvasSize = (key, width) => {resetKey = key; resetWidth = width;};
  await context.fitResearchCanvasNote({}, button);
  assert.match(button.innerHTML, /data-lotus-state="closed"/);
  assert.equal(button.getAttribute("aria-expanded"), "false");
  assert.equal(card.style.width, "416px");
  assert.equal(card.style.height, undefined);
  assert.equal(card.style.top, "80px");
  assert.equal(resetKey, "item:note");
  assert.equal(resetWidth, 416);
  assert.equal(vm.runInContext('researchViewState.currentIdea.pathData.researchCanvasSizes["item:note"].width', context), 416);
  const collapsed = context.renderResearchCanvasCard({key:"item:note", type:"note", title:"Note", text:"Long text", source:"item"});
  assert.match(collapsed, /;width:416px/);
  assert.doesNotMatch(collapsed, /has-custom-size/);
  assert.match(collapsed, /aria-expanded="false"/);
});

test("media stickers show only the entered title without a type fallback", () => {
  const context = loadResearch();
  for (const type of ["video", "image", "source", "av"]) {
    const card = { key: "item:" + type, source: "item", type, title: "", text: "Description" };
    assert.doesNotMatch(context.renderResearchCanvasCard(card), /class="research-canvas-card-title"/);
    card.title = "My <research> title";
    const html = context.renderResearchCanvasCard(card);
    assert.match(html, /class="research-canvas-card-title">My &lt;research&gt; title<\/strong>/);
    assert.match(html, /class="research-canvas-card-text">Description<\/span>/);
  }
});

test("sticker resize clamps width and height independently and saves separate workspaces", async () => {
  const context = loadResearch();
  context.layoutResearchCanvasFocusAdd = () => {};
  const classes = new Set();
  const frame = { style: {}, dataset: {} };
  const card = { style: {}, classList: { contains: (name) => classes.has(name), add: (name) => classes.add(name) } };
  const saved = [];
  const state = { frame, card, preview: {}, maxWidth: 500, maxHeight: 400, ideaId: "resize", key: "item:note", parentKey: "item:root", actions: { saveCanvasFocusSize: (...args) => saved.push(args) } };
  vm.runInContext('researchViewState.currentIdea = {id:"resize", pathData:{}}', context);
  const size = context.applyResearchCanvasResize(state, 350, 900);
  assert.equal(size.width, 350);
  assert.equal(size.height, 400);
  assert.equal(frame.style.width, "350px");
  assert.equal(card.style.height, "400px");
  assert.equal(classes.has("has-custom-size"), true);
  await context.persistResearchCanvasResize(state, size);
  assert.deepEqual(saved[0], ["item:root", "item:note", 350, 400]);
  const pathData = vm.runInContext("researchViewState.currentIdea.pathData", context);
  assert.equal(pathData.researchCanvasFocusSizes["item:root"]["item:note"].width, 350);
  assert.equal(pathData.researchCanvasSizes, undefined);
  state.parentKey = "";
  state.actions = { saveCanvasSize: (...args) => saved.push(args) };
  await context.persistResearchCanvasResize(state, {width: 220, height: 180});
  assert.equal(pathData.researchCanvasSizes["item:note"].width, 220);
  assert.equal(pathData.researchCanvasFocusSizes["item:root"]["item:note"].width, 350);
  assert.equal(context.normalizeResearchCanvasSize({width: -1, height: 80}), null);
});

test("clicking the research canvas does not trigger a language refresh", async () => {
  let onClick;
  let bodyPressed = false;
  const emitted = [];
  const body = {
    dataset: {},
    classList: { toggle() {} },
    setAttribute(name) { if (name === "aria-pressed") bodyPressed = true; }
  };
  const languageButton = {
    dataset: { language: "en" },
    classList: { toggle() {} },
    setAttribute() {}
  };
  const document = {
    body,
    documentElement: { dataset: {} },
    querySelector: () => null,
    querySelectorAll: (selector) => selector === "button.language-option[data-language]" ? [languageButton] : [body, languageButton],
    addEventListener: (type, handler) => { if (type === "click") onClick = handler; }
  };
  const window = {
    MentorI18nResources: { sr: {}, en: {} },
    MentorData: { repositories: { settings: { isReady: () => false, setLanguage: async () => {} } } },
    dispatchEvent: (event) => emitted.push(event.type),
    setTimeout: (callback) => { callback(); return 1; },
    clearTimeout() {}
  };
  const context = vm.createContext({ window, document, navigator: { languages: ["sr"] }, location: { hostname: "localhost" }, Intl, console, CustomEvent: class { constructor(type) { this.type = type; } } });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "js/i18n/provider.js"), "utf8"), context);
  assert.equal(body.dataset.language, "sr");
  assert.equal(bodyPressed, false);

  let prevented = false;
  await onClick({ target: { closest: (selector) => selector === "[data-language]" ? body : null }, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, false);
  assert.equal(emitted.filter((type) => type === "mentor:languagechange").length, 1);

  await onClick({ target: { closest: () => languageButton }, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(body.dataset.language, "en");
});

function loadResearch() {
  const context = vm.createContext({
    window: { MentorI18n: { t: (key, params, fallback) => fallback || key } },
    URL,
    Intl
  });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "js/research/research-model.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "js/research/research-geometry.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "js/research/research-selection.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "js/research/research-groups.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "js/research/research-sticker-style.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "js/research/research-annotations.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "js/research/research-persistence.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "js/research/research-organizer.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "js/research/research-sticker-drag.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "research.js"), "utf8"), context);
  return context;
}

test("Research modal lifecycle locks the document until the final blocking panel closes", () => {
  const context = loadResearch(), html = new Set(), body = new Set();
  const classList = (set) => ({ toggle(name, enabled) { if (enabled) set.add(name); else set.delete(name); } });
  let panels = ["[data-research-sticker-designer]"];
  context.document = { body: { classList: classList(body) }, documentElement: { classList: classList(html) },
    querySelector(selector) { return panels.some((panel) => selector.split(",").includes(panel + ":not(.is-minimized)")) ? {} : null; }
  };
  context.syncResearchModalLayer(); assert.equal(html.has("research-modal-open"), true); assert.equal(body.has("research-modal-open"), true);
  panels = ["[data-research-canvas-media]"]; context.syncResearchModalLayer(); assert.equal(html.has("research-modal-open"), true);
  panels = []; context.syncResearchModalLayer(); assert.equal(html.has("research-modal-open"), false); assert.equal(body.has("research-modal-open"), false);
});

test("Research modules load before the facade and persistence forwards existing callback results", async () => {
  const context = loadResearch();
  assert.equal(typeof context.window.MentorResearchModel.getCanvasCards, "function");
  assert.equal(typeof context.window.MentorResearchGeometry.zoomCamera, "function");
  for (const name of ["renderResearchView", "bindResearchView", "closeCanvasMedia", "closeCanvasFocus", "layoutCanvas", "setActiveDirection"]) {
    assert.equal(typeof context.window.MentorResearch[name], "function");
  }
  const calls = [];
  const result = Promise.resolve(true);
  const callbacks = {
    saveCanvasPosition(...args) { calls.push({ receiver: this, args }); return result; },
    deleteCanvasItem() { throw new Error("original save error"); },
    openPreviousIdea() { return this === callbacks ? "navigation" : "wrong receiver"; }
  };
  const actions = context.window.MentorResearchPersistence.bindActions(callbacks);
  assert.equal(actions.openPreviousIdea(), "navigation");
  assert.equal(actions.saveCanvasPosition("item:child", -320, 145), result);
  assert.equal(await actions.saveCanvasPosition("item:child", -320, 145), true);
  assert.equal(calls[0].receiver, callbacks);
  assert.deepEqual(Array.from(calls[0].args), ["item:child", -320, 145]);
  assert.throws(() => actions.deleteCanvasItem("item:child"), /original save error/);
});

test("selection toggles keys, adds rectangle hits, and resets when the workspace changes", () => {
  const context = loadResearch();
  const api = context.window.MentorResearchSelection;
  const state = api.createState();
  api.setWorkspace(state, "idea-a", "direction-a");
  api.select(state, "item:a");
  api.select(state, "item:b", true);
  api.select(state, "item:a", true);
  assert.deepEqual(Array.from(state.selected), ["item:b"]);
  api.selectRect(state, { left: -60, top: -20, right: 20, bottom: 40 }, [
    { key: "item:c", bounds: { left: -80, top: 0, right: -40, bottom: 30 } },
    { key: "item:d", bounds: { left: 30, top: 0, right: 60, bottom: 30 } }
  ], true);
  assert.deepEqual(Array.from(state.selected), ["item:b", "item:c"]);
  api.setWorkspace(state, "idea-a", "direction-a");
  assert.equal(state.selected.size, 2);
  api.setWorkspace(state, "idea-a", "direction-b");
  assert.equal(state.selected.size, 0);
});

test("marquee geometry accounts for pan, zoom, viewport offset and negative coordinates", () => {
  const geometry = loadResearch().window.MentorResearchGeometry;
  const camera = { x: 120, y: -75, zoom: 2 };
  const point = geometry.screenToWorld(30, 5, { left: 10, top: 20 }, 0, 0, camera);
  assert.deepEqual({ x: point.x, y: point.y }, { x: -50, y: 30 });
  const scrolled = geometry.screenToWorld(20, 20, { left: 10, top: 20 }, 0, 0, { x: 0, y: 0, zoom: 1 }, 40, 25);
  assert.deepEqual({ x: scrolled.x, y: scrolled.y }, { x: 50, y: 25 });
  assert.equal(geometry.rectsIntersect({ left: -50, top: 0, right: 10, bottom: 30 }, { left: 8, top: 20, right: 40, bottom: 60 }), true);
  assert.equal(geometry.rectsIntersect({ left: -50, top: 0, right: 10, bottom: 30 }, { left: 11, top: 20, right: 40, bottom: 60 }), false);
});

test("Research camera restores its saved pan and zoom per direction", async () => {
  const context = loadResearch();
  const idea = { id: "idea-camera", pathData: {
    researchDirections: [{ id: "d1", references: [] }],
    researchCanvasCameras: { '["d1"]': { x: 340, y: -125, zoom: 1.5 } }
  } };
  const camera = context.getResearchCanvasCamera(idea);
  assert.deepEqual({ x: camera.x, y: camera.y, zoom: camera.zoom }, { x: 340, y: -125, zoom: 1.5 });
  camera.x = 410;
  context.window.clearTimeout = () => {};
  context.cameraTestIdea = idea;
  vm.runInContext("researchViewState.currentIdea = cameraTestIdea", context);
  const saved = [];
  await context.saveResearchCanvasCamera({ _researchActions: { saveCanvasOrganization: async (patch) => { saved.push(patch); return true; } } }, true);
  assert.equal(saved[0].researchCanvasCameras['["d1"]'].x, 410);
  assert.equal(idea.pathData.researchCanvasCameras['["d1"]'].x, 410);
});

test("groups keep stable membership and move every member without changing parent relationships", () => {
  const groups = loadResearch().window.MentorResearchGroups;
  const first = { id: "g1", directionId: "d1", memberKeys: ["item:parent", "item:child"], x: -200, y: 40 };
  const second = { id: "g2", directionId: "d1", memberKeys: ["item:other"], x: 500, y: 200 };
  const assigned = groups.assign([first, second], ["item:child"], "g2");
  assert.deepEqual(Array.from(assigned[0].memberKeys), ["item:parent"]);
  assert.deepEqual(Array.from(assigned[1].memberKeys), ["item:other", "item:child"]);
  const moved = groups.move(first, { "item:parent": { x: -100, y: 70 }, "item:child": { x: -20, y: 130 } }, -30, 15);
  assert.deepEqual({ x: moved.group.x, y: moved.group.y }, { x: -230, y: 55 });
  assert.deepEqual({ ...moved.positions["item:child"] }, { x: -50, y: 145 });
  assert.equal(groups.eligible({ source: "finance", key: "finance:0" }), false);
  assert.equal(groups.eligible({ source: "item", id: "child", key: "item:child", parentKey: "item:parent" }), true);
  assert.equal(groups.eligible({ source: "direction-note", key: "direction-note:d1:note_123", direction: { id: "d1", notes: [{ id: "note_123" }] }, note: { id: "note_123" } }), true);
  assert.equal(groups.eligible({ source: "direction-note", key: "direction-note:d1:note_0", direction: { id: "d1", notes: ["legacy"] }, note: { id: "note_0" } }), false);
  assert.equal(groups.read({ pathData: {} }, "d1").length, 0);
  const raised = groups.bringToFront([first, second], first);
  assert.deepEqual(Array.from(raised, (group) => group.id), ["g2", "g1"]);
  assert.equal(raised[1], first);
});

test("group box resizing and appearance keep member positions and reject unsafe image URLs", () => {
  const context = loadResearch();
  const groups = context.window.MentorResearchGroups;
  const original = { id: "g1", directionId: "d1", name: "Group", x: -90, y: 30, width: 240, height: 180, memberKeys: ["item:a"], backgroundMode: "image", backgroundImage: "https://example.com/cover.png", borderColor: "#aabbcc", headerColor: "#223344" };
  const resized = groups.resize(original, 370.4, 240.7);
  assert.deepEqual({ width: resized.width, height: resized.height, x: resized.x, y: resized.y }, { width: 370, height: 241, x: -90, y: 30 });
  assert.deepEqual(Array.from(resized.memberKeys), ["item:a"]);
  assert.deepEqual({ width: original.width, height: original.height }, { width: 240, height: 180 });
  assert.equal(groups.resize(original, 10, 20).width, 180);
  assert.equal(groups.imageUrl("javascript:alert(1)"), "");
  const layers = context.window.MentorResearchOrganizer.renderLayers({ pathData: { researchCanvasGroups: [resized] } }, "d1", (key) => key, (value) => String(value), [{ key: "item:a" }]);
  assert.match(layers, /width:370px;height:241px/);
  assert.match(layers, /border-color:#aabbcc/);
  assert.match(layers, /--research-group-header:#223344/);
  assert.match(layers, /cover\.png/);
  assert.match(layers, /data-research-group-image-for="g1"/);
  assert.ok(layers.indexOf('data-research-group-image-for="g1"') < layers.indexOf('data-research-group-id="g1"'));
  const front = context.window.MentorResearchOrganizer.renderLayers({ pathData: { researchCanvasGroups: [{ id: "g2", directionId: "d1", memberKeys: [] }, resized] } }, "d1", (key) => key, (value) => String(value), []);
  assert.match(front, /--research-group-image-stack:7/);
  assert.match(front, /--research-group-stack:9/);
  assert.match(layers, /data-research-group-resize/);
  const styled = context.window.MentorResearchOrganizer.renderLayers({ pathData: { researchCanvasGroups: [{ ...resized, imageOpacity: 40, imageZoom: 1.6, imagePositionX: 20, imagePositionY: 80, textColor: "#ffffff", fontFamily: "Georgia", fontSize: 18 }] } }, "d1", (key) => key, (value) => String(value), []);
  assert.match(styled, /--research-group-background-opacity:0\.40/);
  assert.match(styled, /--research-group-image-zoom:1\.6/);
  assert.match(styled, /--research-group-image-x:20%/);
  assert.match(styled, /--research-group-image-y:80%/);
  assert.match(styled, /--research-group-text:#ffffff/);
  assert.match(styled, /--research-group-font:Georgia/);
  assert.match(styled, /--research-group-font-size:18px/);
  assert.equal(groups.imageOpacity(180), 100);
  assert.equal(groups.imageZoom(12), 3);
  assert.equal(groups.imageZoom(-4), .2);
  assert.equal(groups.imageZoom(.7), .7);
  assert.equal(groups.imagePosition(-20), 0);
  assert.equal(groups.imagePosition(150), 100);
  const uploaded = context.window.MentorResearchOrganizer.renderLayers({ pathData: { researchCanvasGroups: [{ ...resized, backgroundImage: "", backgroundMediaId: "saved-image" }] } }, "d1", (key) => key, (value) => String(value), []);
  assert.match(uploaded, /data-research-group-image-for="g1"/);
  const solid = context.window.MentorResearchOrganizer.renderLayers({ pathData: { researchCanvasGroups: [{ ...resized, backgroundMode: "solid", backgroundColor: "#123456", imageOpacity: 40 }] } }, "d1", (key) => key, (value) => String(value), []);
  assert.match(solid, /background-color:rgba\(18,52,86,0\.40\)/);
  assert.equal(groups.fontFamily("url(evil)"), "Inter");
});

test("group size and appearance persist in the existing optional group field", async () => {
  const context = vm.createContext({ window: { matchMedia: () => ({ matches: false }) }, console });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "brainstorming.js"), "utf8"), context);
  const idea = { id: "idea-1", pathData: { researchCanvasGroups: [{ id: "g1", directionId: "d1", memberKeys: ["item:a"], width: 240, height: 180 }] } };
  context.window.brainstormingState.ideas = [idea];
  let writes = 0;
  context.saveIdeas = async () => { writes++; return true; };
  const group = { ...idea.pathData.researchCanvasGroups[0], width: 370, height: 240, backgroundMode: "solid", backgroundColor: "#43634b", borderColor: "#aabbcc", headerColor: "#223344" };
  assert.equal(await context.saveResearchCanvasOrganization("idea-1", { researchCanvasGroups: [group] }), true);
  assert.equal(writes, 1);
  assert.equal(idea.pathData.researchCanvasGroups[0].width, 370);
  assert.equal(idea.pathData.researchCanvasGroups[0].borderColor, "#aabbcc");
  assert.equal(idea.pathData.researchCanvasGroups[0].memberKeys[0], "item:a");
});

test("sticker appearance renders from its optional style map and rejects unsafe values", async () => {
  const context = loadResearch();
  const styleApi = context.window.MentorResearchStickerStyle;
  assert.deepEqual({ ...styleApi.sanitize({ backgroundColor: "javascript:bad", borderColor: "#abcdef", fontFamily: "url(evil)", fontSize: 100 }) }, { borderColor: "#abcdef", fontSize: 24 });
  assert.equal(styleApi.controlColor("#ffffff"), "#000000"); assert.equal(styleApi.controlColor("#203729"), "#ffffff");
  assert.equal(styleApi.sanitize({ unitFillColor: "red;url(evil)" }).unitFillColor, undefined);
  const idea = { id: "idea-1", pathData: {
    researchDirections: [{ id: "d1", title: "Direction", references: [] }],
    researchCanvasItems: [{ id: "a", directionId: "d1", type: "note", title: "Note" }],
    researchCanvasStickerStyles: { "item:a": { backgroundColor: "#123456", borderColor: "#abcdef", textColor: "#ffffff", unitFillColor: "#334455", fontFamily: "Georgia", fontSize: 18 } }
  } };
  const before = JSON.stringify(idea.pathData);
  const html = context.window.MentorResearch.renderResearchView(idea);
  assert.match(html, /data-card-key="item:a"[^>]*data-research-sticker-custom[^>]*--research-sticker-background:#123456/);
  assert.match(html, /--research-sticker-font:Georgia/);
  assert.equal(JSON.stringify(idea.pathData), before);
  for (const file of ["js/research/research-sticker-core.js", "js/research/research-sticker-sections.js"]) vm.runInContext(fs.readFileSync(path.join(projectRoot, file), "utf8"), context);
  const doc = context.window.MentorResearchStickerCore.fromCard({}, "unit");
  doc.sections[0].content.measurements.push({ id: "unit", value: 30, unit: "EUR", dimension: "currency", label: "" });
  idea.pathData.researchCanvasStickerDocuments = { "item:a": doc }; idea.pathData.researchCanvasSizes = { "item:a": { width: 320, height: 480 } };
  const modular = context.window.MentorResearch.renderResearchView(idea);
  assert.match(modular, /has-sticker-document[^>]*height:480px/); assert.match(modular, /--research-sticker-unit-fill:#334455/);
  assert.match(modular, /data-research-sticker-expansion style="--research-sticker-control:#ffffff"/);
  idea.pathData.researchCanvasStickerStyles["item:a"].backgroundColor = "#ffffff";
  assert.match(context.window.MentorResearch.renderResearchView(idea), /data-research-sticker-expansion style="--research-sticker-control:#000000"/);
  const preview = context.renderResearchCanvasCard({ key: "draft:a", id: "a", type: "note", stickerDocument: doc }, null, {}, { preview: true, styleKey: "item:a" });
  assert.match(preview, /--research-sticker-unit-fill:#334455/); assert.doesNotMatch(preview, /height:480px/);
  const resized = { dataset: {}, style: {}, classList: { contains: () => true, add() {} }, querySelector: () => null };
  context.drawResearchCanvasConnections = () => {};
  context.applyResearchCanvasResize({ card: resized, frame: resized, maxWidth: Infinity, maxHeight: Infinity, preview: null, canvas: {} }, 320, 520);
  assert.equal(resized.style.height, "520px"); assert.equal(resized.style.minHeight, undefined);

  const storage = vm.createContext({ window: { matchMedia: () => ({ matches: false }) }, console });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "brainstorming.js"), "utf8"), storage);
  storage.window.brainstormingState.ideas = [idea];
  storage.saveIdeas = async () => true;
  assert.equal(await storage.saveResearchCanvasOrganization("idea-1", { researchCanvasStickerStyles: { "item:a": { backgroundColor: "#654321", unitFillColor: "#112233", fontSize: 17 } } }), true);
  assert.equal(idea.pathData.researchCanvasStickerStyles["item:a"].backgroundColor, "#654321");
  assert.equal(idea.pathData.researchCanvasStickerStyles["item:a"].unitFillColor, "#112233");
  assert.equal(await storage.saveResearchCanvasOrganization("idea-1", { researchCanvasStickerStyles: { "item:a": { unitFillColor: "url(evil)" } } }), false);
  assert.equal(idea.pathData.researchCanvasStickerStyles["item:a"].unitFillColor, "#112233");
  assert.equal(await storage.saveResearchCanvasOrganization("idea-1", { researchCanvasStickerStyles: { "item:a": { backgroundColor: "red;url(evil)" } } }), false);
  assert.equal(idea.pathData.researchCanvasStickerStyles["item:a"].backgroundColor, "#654321");
  const restore = storage.pruneResearchCanvasOrganization(idea.pathData, (key) => key === "item:a");
  assert.equal(idea.pathData.researchCanvasStickerStyles["item:a"], undefined);
  restore();
  assert.equal(idea.pathData.researchCanvasStickerStyles["item:a"].backgroundColor, "#654321");
});

test("selection controls outside the canvas handle clicks and clear the active selection", async () => {
  const context = loadResearch();
  const organizer = context.window.MentorResearchOrganizer;
  const listeners = {}, tools = [];
  const count = { textContent: "" }, picker = { innerHTML: "" }, color = { value: "#43634b", addEventListener() {} };
  const members = { hidden: true, querySelector: (selector) => selector.includes("summary") ? { textContent: "" } : { innerHTML: "" } };
  const chosen = { hidden: true, innerHTML: "", value: "", addEventListener(type, handler) { this[type] = handler; } };
  const stickerColor = { value: "#efdda9", addEventListener(type, handler) { this[type] = handler; } };
  const bar = { hidden: true, querySelector(selector) { return selector.includes("selection-count") ? count : selector.includes("selected-stickers") ? chosen : selector.includes("group-target") ? picker : selector.includes("group-members") ? members : selector.includes("group-name") ? null : color; } };
  const form = { hidden: true, value: "", addEventListener() {} }, groupSettings = { hidden: false }, stickerSettings = { hidden: true }, pointerMenu = { hidden: true, querySelectorAll: () => [] };
  const section = { classList: { toggle() {} }, contains: () => true, addEventListener(type, handler) { listeners[type] = handler; },
    querySelectorAll: () => tools, querySelector(selector) { return selector.includes("selection-bar") ? bar : selector.includes("pointer-menu") ? pointerMenu : selector.includes("selected-stickers") ? chosen : selector.includes("group-target") ? { addEventListener() {} } : selector.includes("group-settings") ? groupSettings : selector.includes("sticker-settings") ? stickerSettings : selector.includes("sticker-background") ? stickerColor : selector.includes("group-color") ? color : form; } };
  const viewport = { classList: { toggle() {} }, addEventListener() {} };
  const cardStyle = { setProperty() {}, removeProperty() {} };
  const card = { dataset: { cardKey: "item:a" }, style: cardStyle, classList: { toggle() {} }, toggleAttribute() {} }, second = { dataset: { cardKey: "item:b" }, style: cardStyle, classList: { toggle() {} }, toggleAttribute() {} };
  const canvas = { querySelectorAll: () => [card, second] };
  const view = { contains: () => true, querySelector(selector) { return selector === ".research-canvas-section" ? section : selector.includes("canvas-viewport") ? viewport : selector === "[data-research-canvas]" ? canvas : null; } };
  context.document = { addEventListener() {} };
  const idea = { id: "idea-1", pathData: {} };
  organizer.bind(view, { getIdea: () => idea, getDirectionId: () => "d1", getCards: () => [{ key: "item:a", id: "a", source: "item", type: "note", title: "First" }, { key: "item:b", id: "b", source: "item", type: "note", title: "Second" }], getActions: () => ({ saveCanvasOrganization: async () => true }), drawConnections() {}, t: (key) => key, escape: (value) => value, abortSignal: undefined });
  const tool = { dataset: { researchOrganizerTool: "select" } };
  await listeners.click({ target: { closest: (selector) => selector === "[data-research-organizer-tool]" ? tool : null }, preventDefault() {}, stopPropagation() {} });
  assert.equal(organizer.isSelectMode(), true);
  organizer.handleCardClick(view, { target: { closest: () => card } });
  assert.equal(bar.hidden, false);
  assert.match(count.textContent, /First/);
  assert.equal(stickerSettings.hidden, false);
  assert.equal(groupSettings.hidden, true);
  organizer.handleCardClick(view, { target: { closest: () => second }, ctrlKey: true });
  assert.equal(chosen.hidden, false);
  assert.match(chosen.innerHTML, /First<\/option>.*Second<\/option>/);
  assert.equal(chosen.value, "item:a");
  chosen.change({ target: { value: "item:b" } });
  assert.equal(chosen.value, "item:b");
  await stickerColor.change({ target: { value: "#123456" } });
  assert.equal(idea.pathData.researchCanvasStickerStyles["item:b"].backgroundColor, "#123456");
  assert.equal(idea.pathData.researchCanvasStickerStyles["item:a"], undefined);
  await listeners.click({ target: { closest: (selector) => selector === "[data-research-organizer-tool]" ? { dataset: { researchOrganizerTool: "pan" } } : null }, preventDefault() {}, stopPropagation() {} });
  organizer.handleCardClick(view, { target: { closest: () => card } });
  organizer.handleCardClick(view, { target: { closest: () => second }, ctrlKey: true });
  assert.equal(organizer.prepareCardDrag("item:a", {}).join(","), "item:a,item:b");
  assert.equal(organizer.prepareCardDrag("item:a", { ctrlKey: true }).length, 0);
  const clear = { dataset: { researchOrganizerAction: "clear" } };
  await listeners.click({ target: { closest: (selector) => selector === "[data-research-organizer-action]" ? clear : null } });
  assert.equal(bar.hidden, true);
});

test("both arrow and hand can start dragging a sticker", () => {
  const context = loadResearch();
  context.layoutResearchCanvas = () => {};
  context.bindResearchCanvasMap = () => {};
  context.document = { fonts: null };
  const handlers = {};
  const canvas = { contains: () => true, querySelectorAll: () => [], addEventListener(type, handler) { handlers[type] = handler; } };
  const root = { _researchCanvasResize() {}, querySelector: () => canvas };
  const card = { style: { left: "0px", top: "0px" }, dataset: { cardKey: "item:a" }, addEventListener() {}, setPointerCapture() { this.captured = true; } };
  context.bindResearchCanvas(root);
  const target = { closest: (selector) => selector === ".research-canvas-card" ? card : null };
  const event = { button: 0, pointerId: 1, clientX: 10, clientY: 10, target };
  context.window.MentorResearchOrganizer.isSelectMode = () => true;
  handlers.pointerdown(event);
  assert.equal(card.captured, true);
  context.window.MentorResearchOrganizer.isSelectMode = () => false;
  handlers.pointerdown(event);
  assert.equal(card.captured, true);
});

test("the default canvas opens a sticker on double click with either tool", () => {
  const context = loadResearch();
  context.layoutResearchCanvas = () => {};
  context.bindResearchCanvasMap = () => {};
  context.document = { fonts: null };
  const handlers = {};
  const canvas = { contains: () => true, querySelectorAll: () => [], addEventListener(type, handler) { handlers[type] = handler; } };
  const root = { _researchCanvasResize() {}, querySelector: () => canvas };
  const card = { dataset: { cardKey: "item:a" } };
  context.getResearchCanvasCards = () => [{ key: "item:a" }];
  let opened = 0, selected = 0;
  context.openResearchCanvasPreview = () => { opened++; };
  context.window.MentorResearchOrganizer.handleCardClick = () => { selected++; return false; };
  context.window.MentorResearchOrganizer.isSelectMode = () => false;
  context.bindResearchCanvas(root);
  const target = { closest: (selector) => selector === ".research-canvas-card" ? card : null };
  const event = { target, preventDefault() {} };
  handlers.click(event);
  handlers.click(event);
  assert.equal(opened, 0);
  assert.equal(selected, 2);
  handlers.dblclick(event);
  assert.equal(opened, 1);
  context.window.MentorResearchOrganizer.isSelectMode = () => true;
  handlers.dblclick(event);
  assert.equal(opened, 2);
});

test("mobile canvas skips sticker focus and opens only the media panel", async () => {
  const context = loadResearch();
  context.layoutResearchCanvas = () => {};
  context.bindResearchCanvasMap = () => {};
  context.window.matchMedia = () => ({ matches: true });
  context.document = { fonts: null };
  const handlers = {};
  const canvas = { contains: () => true, querySelectorAll: () => [], addEventListener(type, handler) { handlers[type] = handler; } };
  const root = { _researchCanvasResize() {}, querySelector: () => canvas };
  const cardElement = { dataset: { cardKey: "item:a" } };
  let card = { key: "item:a", type: "note" };
  context.getResearchCanvasCards = () => [card];
  let previews = 0;
  const media = [];
  context.openResearchCanvasPreview = () => { previews++; };
  context.openResearchCanvasMedia = async (_, item) => { media.push(item.type); };
  context.bindResearchCanvas(root);
  const event = { target: { closest: (selector) => selector === ".research-canvas-card" ? cardElement : null }, preventDefault() {} };
  await handlers.dblclick(event);
  assert.equal(previews, 0);
  assert.deepEqual(media, []);
  card = { key: "item:a", type: "source" };
  await handlers.dblclick(event);
  assert.equal(previews, 0);
  assert.deepEqual(media, ["source"]);
});

test("dragging a selected sticker moves the whole selection at canvas scale and rolls back on failed save", async () => {
  const context = loadResearch();
  context.layoutResearchCanvas = () => {};
  context.bindResearchCanvasMap = () => {};
  context.drawResearchCanvasConnections = () => {};
  context.document = { fonts: null };
  const handlers = {}, saved = [];
  const makeCard = (key, left, top) => ({ dataset: { cardKey: key }, style: { left: left + "px", top: top + "px" }, classList: { add() {}, remove() {} }, listeners: {},
    addEventListener(type, handler) { this.listeners[type] = handler; }, removeEventListener(type) { delete this.listeners[type]; }, setPointerCapture() {}, hasPointerCapture: () => false });
  const first = makeCard("item:a", -20, 30), second = makeCard("item:b", 40, 50);
  const canvas = { dataset: { mapScale: "2" }, contains: () => true, querySelectorAll: () => [first, second], addEventListener(type, handler) { handlers[type] = handler; } };
  const root = { _researchCanvasResize() {}, querySelector: () => canvas };
  context.window.MentorResearchOrganizer.prepareCardDrag = () => ["item:a", "item:b"];
  let saveAllowed = true;
  context.bindResearchCanvas(root, { saveCanvasOrganization: async (patch) => { saved.push(patch); return saveAllowed; } });
  const target = { closest: (selector) => selector === ".research-canvas-card" ? first : null };
  handlers.pointerdown({ button: 0, pointerId: 1, clientX: 0, clientY: 0, target });
  first.listeners.pointermove({ pointerId: 1, clientX: 20, clientY: -10 });
  assert.equal(first.style.left, "-10px");
  assert.equal(second.style.top, "45px");
  await first.listeners.pointerup({ pointerId: 1 });
  assert.equal(JSON.stringify(saved[0].researchCanvasPositions), JSON.stringify({ "item:a": { x: -10, y: 25 }, "item:b": { x: 50, y: 45 } }));
  saveAllowed = false;
  handlers.pointerdown({ button: 0, pointerId: 2, clientX: 0, clientY: 0, target });
  first.listeners.pointermove({ pointerId: 2, clientX: 20, clientY: 20 });
  await first.listeners.pointerup({ pointerId: 2 });
  assert.equal(first.style.left, "-10px");
  assert.equal(second.style.top, "45px");
});

test("group body and header select the top bar; pan drags while select mode only selects", async () => {
  const context = loadResearch();
  const organizer = context.window.MentorResearchOrganizer;
  const idea = { id: "idea-1", pathData: { researchCanvasGroups: [{ id: "g1", directionId: "d1", name: "Group One", memberKeys: ["item:a"], x: 12, y: 30 }] } };
  const sectionListeners = {}, viewportListeners = {}, documentListeners = {};
  const controls = Object.fromEntries(["selected-stickers", "quick-group-color", "quick-header-color", "group-settings", "sticker-settings", "settings-title", "group-color", "group-image", "group-upload", "group-upload-wrap", "group-image-opacity", "group-opacity-value", "image-controls", "image-zoom-value", "group-border-color", "group-header-color", "group-text-color", "group-font-family", "group-font-size", "sticker-background", "sticker-border", "sticker-text", "sticker-font", "sticker-size"].map((name) => [name, { value: "", textContent: "", hidden: false, addEventListener(type, handler) { this[type] = handler; } }]));
  const groupWheel = { hidden: true, innerHTML: "", addEventListener(type, handler) { this[type] = handler; } };
  const groupToggle = { hidden: false, setAttribute(key, value) { this[key] = value; } };
  const count = { textContent: "" }, groupNameInput = { hidden: true, value: "", addEventListener(type, handler) { this[type] = handler; }, blur() {} }, memberSummary = { textContent: "" }, memberOptions = { innerHTML: "" }, members = { hidden: true, querySelector(selector) { return selector.includes("summary") ? memberSummary : memberOptions; } }, panel = { hidden: true }, pointerMenu = { hidden: true, style: {}, classList: { toggle(name, value) { this[name] = value; } }, querySelectorAll: () => [], querySelector: (selector) => selector.includes("group-wheel") ? groupWheel : groupToggle };
  const toolButtons = ["select", "pan"].map((name) => ({ dataset: { researchOrganizerTool: name }, setAttribute(key, value) { this[key] = value; } }));
  const controlFor = (selector) => controls[selector.match(/^\[data-research-(.*?)\]$/)?.[1]];
  const bar = { hidden: true, querySelector(selector) { return selector.includes("group-target") ? { innerHTML: "" } : selector.includes("selection-count") ? count : selector.includes("group-members") ? members : selector.includes("group-name") ? groupNameInput : controlFor(selector); }, querySelectorAll: () => [] };
  const otherForm = { addEventListener() {} };
  const section = { contains: () => true, classList: { toggle() {} }, querySelectorAll: () => toolButtons, addEventListener(type, handler) { sectionListeners[type] = handler; },
    querySelector(selector) { return selector.includes("selection-bar") ? bar : selector.includes("group-panel") ? panel : selector.includes("pointer-menu") ? pointerMenu : selector.includes("group-name") ? groupNameInput : controlFor(selector) || otherForm; } };
  const viewport = { clientLeft: 0, clientTop: 0, classList: { toggle() {} }, querySelector: () => ({ hidden: true, style: {} }), getBoundingClientRect: () => ({ left: 0, top: 0 }), addEventListener(type, handler) { viewportListeners[type] = handler; }, removeEventListener(type) { delete viewportListeners[type]; }, setPointerCapture() {}, hasPointerCapture: () => false };
  const groupClasses = new Set();
  const groupElement = { dataset: { researchGroupId: "g1" }, style: {}, classList: { toggle() {}, add: (name) => groupClasses.add(name), remove: (name) => groupClasses.delete(name) } };
  const cardElements = [{ x: 10, y: 10, key: "item:a" }, { x: 40, y: 40, key: "item:b" }].map(({ x, y, key }) => ({ dataset: { cardKey: key }, style: { left: x + "px", top: y + "px" }, classList: { toggle() {}, add() {}, remove() {} }, getBoundingClientRect: () => ({ left: x, top: y, right: x + 20, bottom: y + 20 }) }));
  const canvas = { querySelectorAll: (selector) => selector === "[data-research-group-id]" ? [groupElement] : selector.startsWith(".research-canvas-card") ? cardElements : [], querySelector: () => ({ innerHTML: "" }) };
  const view = { querySelector(selector) { return selector === ".research-canvas-section" ? section : selector.includes("canvas-viewport") ? viewport : selector === "[data-research-canvas]" ? canvas : null; } };
  const mediaRecords = new Map();
  let saveAllowed = true;
  context.window.MentorData = { repositories: { media: { saveEntity: async (_type, id, file) => { mediaRecords.set(id, file); }, removeEntity: async (_type, id) => { mediaRecords.delete(id); }, objectUrlEntity: async (_type, id) => mediaRecords.has(id) ? "blob:test-image" : null, revokeObjectUrl() {} } } };
  context.document = { addEventListener(type, handler) { documentListeners[type] = handler; } };
  let focusedGroup;
  organizer.bind(view, { getIdea: () => idea, getDirectionId: () => "d1", getCards: () => [], getActions: () => ({ saveCanvasOrganization: async () => saveAllowed }), getCamera: () => ({ x: 0, y: 0, zoom: 1 }), focusGroup(group) { focusedGroup = group; }, placeCard(_canvas, card, x, y) { card.style.left = x + "px"; card.style.top = y + "px"; }, drawConnections() {}, t: (key) => key, escape: (value) => value });
  await sectionListeners.click({ target: { closest: (selector) => selector === "[data-research-group-id]" ? groupElement : null } });
  assert.equal(bar.hidden, false);
  assert.equal(count.textContent, "Group One");
  assert.equal(groupNameInput.hidden, false);
  assert.equal(groupNameInput.value, "Group One");
  groupNameInput.focus();
  groupNameInput.value = "Renamed Group";
  await groupNameInput.change();
  assert.equal(idea.pathData.researchCanvasGroups[0].name, "Renamed Group");
  groupNameInput.value = "   ";
  await groupNameInput.change();
  assert.equal(idea.pathData.researchCanvasGroups[0].name, "Renamed Group");
  assert.equal(groupNameInput.value, "Renamed Group");
  saveAllowed = false;
  groupNameInput.value = "Rejected Name";
  await groupNameInput.change();
  assert.equal(idea.pathData.researchCanvasGroups[0].name, "Renamed Group");
  assert.equal(groupNameInput.value, "Renamed Group");
  saveAllowed = true;
  assert.equal(memberSummary.textContent, "canvas.organizer.groupCount");
  assert.match(memberOptions.innerHTML, /data-research-remove-member="item:a"/);
  const header = { closest: (selector) => selector === "[data-research-group-id]" ? groupElement : null };
  await sectionListeners.click({ target: { closest: (selector) => selector === "[data-research-organizer-tool]" ? { dataset: { researchOrganizerTool: "select" } } : null }, preventDefault() {}, stopPropagation() {} });
  await sectionListeners.click({ target: { closest: (selector) => selector === "[data-research-group-id]" ? groupElement : null } });
  assert.equal(bar.hidden, true);
  await sectionListeners.click({ target: { closest: (selector) => selector === "[data-research-organizer-tool]" ? { dataset: { researchOrganizerTool: "pan" } } : null }, preventDefault() {}, stopPropagation() {} });
  await sectionListeners.click({ target: { closest: (selector) => selector === "[data-research-group-id]" ? groupElement : null } });
  assert.equal(bar.hidden, false);
  viewportListeners.pointerdown({ button: 0, pointerId: 7, clientX: 0, clientY: 0, target: header, preventDefault() {}, stopPropagation() {} });
  assert.equal(typeof viewportListeners.pointermove, "function");
  assert.equal(groupClasses.has("is-dragging"), true);
  viewportListeners.pointermove({ pointerId: 7, clientX: 20, clientY: 30 });
  await viewportListeners.pointerup({ pointerId: 7, type: "pointerup" });
  assert.equal(groupClasses.has("is-dragging"), false);
  assert.equal(idea.pathData.researchCanvasGroups[0].x, 32);
  assert.equal(idea.pathData.researchCanvasGroups[0].y, 60);
  assert.equal(bar.hidden, false);
  await sectionListeners.click({ target: { closest: (selector) => selector === "[data-research-remove-member]" ? { dataset: { researchRemoveMember: "item:a" } } : null } });
  assert.equal(idea.pathData.researchCanvasGroups[0].memberKeys.length, 0);
  assert.equal(bar.hidden, false);
  await controls["group-image"].change({ target: { value: "https://example.com/background.png" } });
  assert.equal(idea.pathData.researchCanvasGroups[0].backgroundMode, "image");
  assert.equal(idea.pathData.researchCanvasGroups[0].backgroundImage, "https://example.com/background.png");
  assert.equal(controls["image-controls"].hidden, false);
  await controls["image-controls"].click({ target: { closest: () => ({ dataset: { researchImageAction: "zoomIn" } }) } });
  assert.equal(idea.pathData.researchCanvasGroups[0].imageZoom, 1.1);
  await controls["image-controls"].click({ target: { closest: () => ({ dataset: { researchImageAction: "zoomOut" } }) } });
  await controls["image-controls"].click({ target: { closest: () => ({ dataset: { researchImageAction: "zoomOut" } }) } });
  assert.equal(idea.pathData.researchCanvasGroups[0].imageZoom, .9);
  await controls["image-controls"].click({ target: { closest: () => ({ dataset: { researchImageAction: "right" } }) } });
  assert.equal(idea.pathData.researchCanvasGroups[0].imagePositionX, 70);
  await controls["image-controls"].click({ target: { closest: () => ({ dataset: { researchImageAction: "up" } }) } });
  assert.equal(idea.pathData.researchCanvasGroups[0].imagePositionY, 30);
  controls["group-text-color"].input({ target: { value: "#ffffff" } });
  assert.match(groupElement.style.cssText, /--research-group-text:#ffffff/);
  await controls["group-text-color"].change({ target: { value: "#ffffff" } });
  controls["group-image-opacity"].input({ target: { value: "40" } });
  assert.equal(controls["group-opacity-value"].textContent, "40%");
  await controls["group-image-opacity"].change({ target: { value: "40" } });
  assert.equal(idea.pathData.researchCanvasGroups[0].imageOpacity, 40);
  await controls["group-upload"].change({ target: { files: [{ type: "image/png", size: 300, name: "background.png" }], value: "background.png" } });
  assert.equal(idea.pathData.researchCanvasGroups[0].backgroundMode, "image");
  assert.equal(mediaRecords.has(idea.pathData.researchCanvasGroups[0].backgroundMediaId), true);
  const uploadedId = idea.pathData.researchCanvasGroups[0].backgroundMediaId;
  controls["group-color"].input({ target: { value: "#123456" } });
  assert.match(groupElement.style.cssText, /background-color:rgba\(18,52,86,0\.40\)/);
  await controls["group-color"].change({ target: { value: "#123456" } });
  assert.equal(idea.pathData.researchCanvasGroups[0].backgroundMode, "solid");
  assert.equal(mediaRecords.has(uploadedId), false);
  saveAllowed = false;
  await controls["group-upload"].change({ target: { files: [{ type: "image/png", size: 300, name: "retry.png" }], value: "retry.png" } });
  assert.equal(idea.pathData.researchCanvasGroups[0].backgroundMode, "solid");
  assert.equal(mediaRecords.size, 0);
  saveAllowed = true;
  documentListeners.pointerdown({ target: { closest: (selector) => selector === "[data-research-group-id]" ? groupElement : null } });
  await sectionListeners.click({ target: { closest: () => null } });
  documentListeners.click({ target: { closest: () => null } });
  assert.equal(bar.hidden, false);
  documentListeners.pointerdown({ target: { closest: () => null } });
  documentListeners.click({ target: { closest: (selector) => selector.includes("input") ? {} : null } });
  assert.equal(bar.hidden, false);
  documentListeners.click({ target: { closest: () => null } });
  assert.equal(bar.hidden, true);
  viewportListeners.pointerdown({ button: 0, pointerId: 9, clientX: 0, clientY: 0, target: header, preventDefault() {}, stopPropagation() {} });
  await viewportListeners.pointerup({ pointerId: 9, type: "pointerup" });
  await sectionListeners.click({ target: { closest: (selector) => selector === "[data-research-organizer-tool]" ? { dataset: { researchOrganizerTool: "settings" } } : null }, preventDefault() {}, stopPropagation() {} });
  assert.equal(panel.hidden, false);
  await sectionListeners.click({ target: { closest: (selector) => selector === "[data-research-organizer-tool]" ? { dataset: { researchOrganizerTool: "select" } } : null }, preventDefault() {}, stopPropagation() {} });
  viewportListeners.pointerdown({ button: 0, pointerId: 8, clientX: 0, clientY: 0, target: header, preventDefault() {}, stopPropagation() {} });
  assert.equal(typeof viewportListeners.pointermove, "function");
  viewportListeners.pointermove({ pointerId: 8, clientX: 70, clientY: 70 });
  viewportListeners.pointerup({ pointerId: 8, clientX: 70, clientY: 70, type: "pointerup" });
  assert.equal(bar.hidden, false);
  assert.equal(controls["selected-stickers"].hidden, false);
  assert.match(controls["selected-stickers"].innerHTML, /item:a[\s\S]*item:b/);
  viewportListeners.pointerdown({ button: 0, pointerId: 18, clientX: 5, clientY: 5, target: header, preventDefault() {}, stopPropagation() {} });
  viewportListeners.pointerup({ pointerId: 18, clientX: 5, clientY: 5, type: "pointerup" });
  assert.equal(bar.hidden, true);
  const tabHandle = { closest: (selector) => selector === "[data-research-group-id]" ? groupElement : selector === "[data-research-group-handle]" ? {} : null };
  viewportListeners.pointerdown({ button: 0, pointerId: 10, clientX: 0, clientY: 0, target: tabHandle, preventDefault() {}, stopPropagation() {} });
  assert.equal(typeof viewportListeners.pointermove, "function");
  await viewportListeners.pointerup({ pointerId: 10, type: "pointerup" });
  assert.equal(bar.hidden, false);
  let middlePrevented = false;
  viewportListeners.pointerdown({ button: 1, clientX: 200, clientY: 220, target: { closest: () => null }, preventDefault() { middlePrevented = true; }, stopPropagation() {} });
  assert.equal(middlePrevented, true);
  assert.equal(pointerMenu.hidden, false);
  assert.equal(pointerMenu.style.left, "200px");
  assert.equal(pointerMenu.style.top, "220px");
  assert.equal(groupWheel.hidden, true);
  const groupToggleClick = () => sectionListeners.click({ target: { closest: (selector) => selector === "button[data-research-pointer-groups]" ? groupToggle : null }, preventDefault() {}, stopPropagation() {} });
  await groupToggleClick();
  assert.equal(groupWheel.hidden, false);
  assert.match(groupWheel.innerHTML, /data-research-pointer-group="g1"/);
  await groupToggleClick();
  assert.equal(groupWheel.hidden, true);
  idea.pathData.researchCanvasGroups.push(...Array.from({ length: 5 }, (_, index) => ({ id: "g" + (index + 2), directionId: "d1", name: "Group " + (index + 2), memberKeys: [], x: index * 100, y: 0 })));
  viewportListeners.pointerdown({ button: 1, clientX: 200, clientY: 220, target: { closest: () => null }, preventDefault() {}, stopPropagation() {} });
  assert.equal(groupWheel.hidden, true);
  await groupToggleClick();
  assert.equal((groupWheel.innerHTML.match(/data-research-pointer-group=/g) || []).length, 5);
  let wheelPrevented = false;
  groupWheel.wheel({ deltaY: 120, preventDefault() { wheelPrevented = true; }, stopPropagation() {} });
  assert.equal(wheelPrevented, true);
  assert.doesNotMatch(groupWheel.innerHTML, /data-research-pointer-group="g1"/);
  assert.match(groupWheel.innerHTML, /data-research-pointer-group="g6"/);
  const groupChoice = { dataset: { researchPointerGroup: "g6" } };
  await sectionListeners.click({ target: { closest: (selector) => selector === "[data-research-pointer-group]" ? groupChoice : null }, preventDefault() {}, stopPropagation() {} });
  assert.equal(focusedGroup.id, "g6");
  assert.equal(pointerMenu.hidden, true);
  viewportListeners.pointerdown({ button: 1, clientX: 20, clientY: 220, target: { closest: () => null }, preventDefault() {}, stopPropagation() {} });
  assert.equal(pointerMenu.style.left, "20px");
  assert.equal(pointerMenu.classList["is-flipped"], true);
  const panChoice = { dataset: { researchPointerChoice: "pan" } };
  await sectionListeners.click({ target: { closest: (selector) => selector === "[data-research-pointer-choice]" ? panChoice : null }, preventDefault() {}, stopPropagation() {} });
  assert.equal(pointerMenu.hidden, true);
  assert.equal(toolButtons[1]["aria-pressed"], "true");
  const selectChoice = { dataset: { researchPointerChoice: "select" } };
  await sectionListeners.click({ target: { closest: (selector) => selector === "[data-research-pointer-choice]" ? selectChoice : null }, preventDefault() {}, stopPropagation() {} });
  assert.equal(toolButtons[0]["aria-pressed"], "true");
  assert.doesNotMatch(organizer.renderToolbar((key) => key, (value) => value), /data-research-group-style-form/);
  assert.match(organizer.renderToolbar((key) => key, (value) => value), /data-research-group-image/);
  assert.match(organizer.renderToolbar((key) => key, (value) => value), /data-research-pointer-choice="pan"/);
  assert.match(organizer.renderToolbar((key) => key, (value) => value), /data-research-organizer-add-menu[^]*data-card-type="video"/);
  assert.match(organizer.renderToolbar((key) => key, (value) => value), /<div class="research-organizer-group-swatch"><span>canvas\.organizer\.borderColor<\/span><input data-research-group-border-color/);
  assert.match(organizer.renderSelectionBar((key) => key, (value) => value), /<details[^>]*data-research-group-members/);
  assert.doesNotMatch(organizer.renderSelectionBar((key) => key, (value) => value), /data-research-group-image/);
});

test("annotations default to empty, remain direction scoped and keep negative positions", () => {
  const annotations = loadResearch().window.MentorResearchAnnotations;
  assert.deepEqual(Array.from(annotations.read({ pathData: {} }, "d1")), []);
  const first = { id: "symbol-1", directionId: "d1", symbol: "★", x: -90, y: 22 };
  const second = { id: "symbol-2", directionId: "d2", symbol: "!", x: 30, y: 45 };
  const values = annotations.add([first], second);
  assert.deepEqual(Array.from(annotations.read({ pathData: { researchCanvasAnnotations: values } }, "d1"), (item) => item.id), ["symbol-1"]);
  assert.equal(annotations.move(values, "symbol-1", -140, -30)[0].x, -140);
  assert.deepEqual(Array.from(annotations.remove(values, "symbol-1"), (item) => item.id), ["symbol-2"]);
});

test("organization saves optional fields atomically and restores them on failure", async () => {
  const context = vm.createContext({ window: { matchMedia: () => ({ matches: false }) }, console });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "brainstorming.js"), "utf8"), context);
  const idea = { id: "idea-1", updatedAt: "before", pathData: { researchCanvasPositions: { "item:other": { x: -300, y: 10 } } } };
  context.window.brainstormingState.ideas = [idea];
  context.saveIdeas = async () => true;
  assert.equal(await context.saveResearchCanvasOrganization("idea-1", { researchCanvasGroups: [{ id: "g1", directionId: "d1", memberKeys: ["item:a"] }], researchCanvasPositions: { "item:a": { x: -40, y: 70 } } }), true);
  assert.deepEqual({ ...idea.pathData.researchCanvasPositions["item:other"] }, { x: -300, y: 10 });
  assert.deepEqual({ ...idea.pathData.researchCanvasPositions["item:a"] }, { x: -40, y: 70 });
  context.saveIdeas = async () => false;
  assert.equal(await context.saveResearchCanvasOrganization("idea-1", { researchCanvasKeyFindings: { "item:a": true }, researchCanvasAnnotations: [{ id: "symbol-1" }] }), false);
  assert.equal(idea.pathData.researchCanvasKeyFindings, undefined);
  assert.equal(idea.pathData.researchCanvasAnnotations, undefined);
  assert.equal(idea.pathData.researchCanvasGroups.length, 1);
});

test("camera saves merge Research directions and reject invalid zoom", async () => {
  const context = vm.createContext({ window: { matchMedia: () => ({ matches: false }) }, console });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "brainstorming.js"), "utf8"), context);
  const idea = { id: "idea-1", pathData: { researchCanvasCameras: { '["d1"]': { x: -60, y: 20, zoom: 1 } } } };
  context.window.brainstormingState.ideas = [idea];
  let writes = 0;
  context.saveIdeas = async () => { writes++; return true; };
  assert.equal(await context.saveResearchCanvasOrganization("idea-1", { researchCanvasCameras: { '["d2"]': { x: 310, y: -80, zoom: 1.4 } } }), true);
  assert.equal(idea.pathData.researchCanvasCameras['["d1"]'].x, -60);
  assert.equal(idea.pathData.researchCanvasCameras['["d2"]'].x, 310);
  assert.equal(await context.saveResearchCanvasOrganization("idea-1", { researchCanvasCameras: { '["d2"]': { x: 0, y: 0, zoom: 0 } } }), false);
  assert.equal(writes, 1);
});

test("organization markup keeps stickers in place and reads optional flags without writing", () => {
  const context = loadResearch();
  const idea = { id: "idea-1", pathData: {
    researchDirections: [{ id: "d1", title: "Direction", references: [] }],
    researchCanvasItems: [{ id: "a", directionId: "d1", type: "note", title: "Card A" }],
    researchCanvasGroups: [{ id: "g1", directionId: "d1", name: "Equipment", memberKeys: ["item:a"], x: -60, y: 40, width: 260, height: 170, collapsed: true }],
    researchCanvasAnnotations: [{ id: "s1", directionId: "d1", symbol: "!", x: -20, y: 60 }]
  } };
  const before = JSON.stringify(idea.pathData);
  const html = context.window.MentorResearch.renderResearchView(idea);
  assert.match(html, /data-research-organizer-toolbar/);
  assert.match(html, /data-research-selection-bar/);
  assert.equal(html.indexOf("data-research-selection-bar") < html.indexOf("data-research-canvas-viewport"), true);
  assert.match(html, /data-research-canvas[^>]*>[\s\S]*<\/div>\s*<span class="research-canvas-hint">[^<]*<\/span>\s*<div class="research-organizer-marquee"/);
  assert.equal(html.indexOf('class="research-canvas-hint"') > html.indexOf("data-research-canvas-viewport"), true);
  assert.equal(html.indexOf("data-research-organizer-toolbar") > html.indexOf("data-research-canvas-viewport"), true);
  assert.match(html, /data-research-group-id="g1"/);
  const layers = context.window.MentorResearchOrganizer.renderLayers(idea, "d1", (_key, params) => String(params?.count ?? ""), (value) => String(value), [{ key: "item:a" }]);
  assert.match(layers, /data-research-group-id="g1"[\s\S]*?<small>1<\/small>/);
  assert.match(html, /data-research-annotation-id="s1"/);
  assert.equal((html.match(/data-card-key="item:a"/g) || []).length > 0, true);
  assert.equal(JSON.stringify(idea.pathData), before);
  assert.equal(context.window.MentorResearchOrganizer.isSelectMode(), false);
});

test("group collapse hides members without removing cards, then restores hierarchy visibility", () => {
  const organizer = loadResearch().window.MentorResearchOrganizer;
  const group = { id: "g1", directionId: "d1", collapsed: true, memberKeys: ["item:a"] };
  const idea = { pathData: { researchCanvasGroups: [group], researchCanvasCollapsed: {} } };
  const elements = ["item:a", "item:b"].map((key) => ({ dataset: { cardKey: key }, hidden: false, tabIndex: 0 }));
  const canvas = { querySelectorAll: () => elements };
  const cards = [{ key: "item:a", source: "item" }, { key: "item:b", source: "item" }];
  organizer.applyVisibility(canvas, idea, "d1", () => {}, () => cards);
  assert.equal(elements[0].hidden, true);
  assert.equal(elements[1].hidden, false);
  group.collapsed = false;
  organizer.applyVisibility(canvas, idea, "d1", () => {}, () => cards);
  assert.equal(elements[0].hidden, false);
  assert.equal(elements[0].tabIndex, 0);
});

test("organization persists Key Finding flags and symbols through one durable write", async () => {
  const context = vm.createContext({ window: { matchMedia: () => ({ matches: false }) }, console });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "brainstorming.js"), "utf8"), context);
  const idea = { id: "idea-2", pathData: {} };
  context.window.brainstormingState.ideas = [idea];
  let saves = 0;
  context.saveIdeas = async () => { saves++; return true; };
  const patch = { researchCanvasKeyFindings: { "item:a": true }, researchCanvasAnnotations: [{ id: "s1", directionId: "d1", symbol: "!", x: -42, y: 18 }] };
  assert.equal(await context.saveResearchCanvasOrganization("idea-2", patch), true);
  assert.equal(saves, 1);
  assert.equal(idea.pathData.researchCanvasKeyFindings["item:a"], true);
  assert.deepEqual({ x: idea.pathData.researchCanvasAnnotations[0].x, y: idea.pathData.researchCanvasAnnotations[0].y }, { x: -42, y: 18 });
  assert.equal(await context.saveResearchCanvasOrganization("idea-2", { researchCanvasPositions: { "item:a": { x: NaN, y: 0 } } }), false);
  assert.equal(saves, 1);
});

test("deleting Research notes removes only their group membership and Key Finding flags", async () => {
  const context = vm.createContext({ window: { matchMedia: () => ({ matches: false }) }, console });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "brainstorming.js"), "utf8"), context);
  const linkedKey = "linked-note:d1:r1:n1";
  const directionKey = "direction-note:d1:n2";
  const idea = { id: "idea-1", pathData: {
    researchDirections: [{ id: "d1", references: [{ id: "r1", notes: [{ id: "n1", title: "Linked" }] }], notes: [{ id: "n2", title: "Direction" }] }],
    researchCanvasGroups: [{ id: "g1", directionId: "d1", memberKeys: [linkedKey, directionKey, "item:keep"] }],
    researchCanvasKeyFindings: { [linkedKey]: true, [directionKey]: true, "item:keep": true }
  } };
  context.window.brainstormingState.ideas = [idea];
  context.saveIdeas = async () => true;
  context.renderPathWorkspace = () => {};
  assert.equal(await context.deleteResearchCanvasLinkedNote("idea-1", "d1", "r1", "n1"), true);
  assert.deepEqual(Array.from(idea.pathData.researchCanvasGroups[0].memberKeys), [directionKey, "item:keep"]);
  assert.equal(idea.pathData.researchCanvasKeyFindings[linkedKey], undefined);
  assert.equal(await context.deleteResearchCanvasDirectionNote("idea-1", "d1", "n2"), true);
  assert.deepEqual(Array.from(idea.pathData.researchCanvasGroups[0].memberKeys), ["item:keep"]);
  assert.equal(idea.pathData.researchCanvasKeyFindings[directionKey], undefined);
  assert.equal(idea.pathData.researchCanvasKeyFindings["item:keep"], true);
});

test("research directions show their own stickers and keep legacy stickers on the original canvas", () => {
  const context = loadResearch();
  const idea = { id: "idea-1", pathData: {
    researchDirections: [
      { id: "first", title: "First", references: [{ id: "ref-first", title: "First link" }] },
      { id: "second", title: "Second", references: [{ id: "ref-second", title: "Second link" }] },
      { id: "exam", title: "Ispitivanje", references: [] }
    ],
    researchCanvasItems: [
      { id: "legacy", type: "note", title: "Old note" },
      { id: "second-note", directionId: "second", type: "note", title: "Second note" },
      { id: "orphan", directionId: "removed", type: "note", title: "Removed direction note" }
    ],
    researchCanvasPositions: { "item:legacy": { x: 50, y: 100 }, "item:second-note": { x: 250, y: 300 } }
  } };
  assert.deepEqual(Array.from(context.getResearchCanvasCards(idea), (card) => card.key), ["reference:first:ref-first", "item:legacy"]);
  context.window.MentorResearch.setActiveDirection("idea-1", "second");
  assert.deepEqual(Array.from(context.getResearchCanvasCards(idea), (card) => card.key), ["reference:second:ref-second", "item:second-note"]);
  const secondHtml = context.window.MentorResearch.renderResearchView(idea);
  assert.match(secondHtml, /Second note/);
  assert.doesNotMatch(secondHtml, /Old note/);
  context.window.MentorResearch.setActiveDirection("idea-1", "first");
  assert.deepEqual(Array.from(context.getResearchCanvasCards(idea), (card) => card.key), ["reference:first:ref-first", "item:legacy"]);
  assert.deepEqual(idea.pathData.researchCanvasPositions["item:legacy"], { x: 50, y: 100 });
  context.window.MentorResearch.setActiveDirection("idea-1", "exam");
  assert.deepEqual(Array.from(context.getResearchCanvasCards(idea)), []);
  const emptyHtml = context.window.MentorResearch.renderResearchView(idea);
  assert.doesNotMatch(emptyHtml, /Old note|Second note|First link|Second link/);
});

test("selecting a direction uses the current idea even when its tile lookup fails", () => {
  const context = loadResearch();
  const idea = { id: "idea-1", pathData: { researchDirections: [{ id: "first" }, { id: "second" }] } };
  context.window.MentorResearch.renderResearchView(idea);
  const root = { querySelector: () => null, querySelectorAll: () => [], closest: () => null };
  context.selectResearchDirection(root, "second");
  assert.equal(context.window.MentorResearch.getActiveDirectionId(idea), "second");
});

test("saving research stickers records their direction and keeps an existing sticker's owner", async () => {
  const context = vm.createContext({ window: { matchMedia: () => ({ matches: false }), MentorResearch: { getActiveDirectionId: () => "second" } }, console });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "brainstorming.js"), "utf8"), context);
  const idea = { id: "idea-1", pathData: { researchDirections: [{ id: "first" }, { id: "second" }], researchCanvasItems: [{ id: "old", type: "note", title: "Old" }] } };
  context.window.brainstormingState.ideas = [idea];
  context.saveIdeas = async () => true;
  context.renderPathWorkspace = () => {};
  assert.equal(await context.saveResearchCanvasItem("idea-1", { type: "note", title: "New" }), true);
  assert.equal(idea.pathData.researchCanvasItems[1].directionId, "second");
  assert.equal(await context.saveResearchCanvasItem("idea-1", { id: "old", type: "note", title: "Edited" }), true);
  assert.equal(idea.pathData.researchCanvasItems[0].directionId, "first");
});

test("adding a research direction opens its empty canvas after the save succeeds", async () => {
  let activeId = "";
  let renderedActiveId = "";
  const context = vm.createContext({ window: { matchMedia: () => ({ matches: false }), MentorResearch: { setActiveDirection: (_ideaId, directionId) => { activeId = directionId; } } }, console });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "brainstorming.js"), "utf8"), context);
  const idea = { id: "idea-1", pathData: { researchDirections: [{ id: "first" }] } };
  context.window.brainstormingState.ideas = [idea];
  context.saveIdeas = async () => true;
  context.renderPathWorkspace = () => { renderedActiveId = activeId; };
  assert.equal(await context.addResearchDirectionToIdea("idea-1", { title: "Second" }), true);
  assert.equal(idea.pathData.researchDirections.length, 2);
  assert.equal(renderedActiveId, idea.pathData.researchDirections[1].id);
});

test("note, A/V and document stickers expose readers and both add menus contain new types", () => {
  const context = loadResearch();
  for (const type of ["note", "av", "source"]) {
    const html = context.renderResearchCanvasCard({ key: "item:" + type, type, title: "<script>", text: "safe" });
    assert.match(html, /data-research-action="open-canvas-preview"/);
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /data-card-type="av"/);
    assert.match(html, /data-card-type="source"/);
  }
});

function loadAttachments(extra = {}) {
  const window = { addEventListener() {}, ...extra };
  const context = vm.createContext({ window, Blob, File, Uint8Array, TextDecoder, console });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "research-attachments.js"), "utf8"), context);
  return window.MentorResearchAttachments;
}

test("document validation rejects disguised formats, binary text and oversized files", async () => {
  const api = loadAttachments();
  assert.equal((await api.validate(new File(["%PDF-1.7\n"], "book.pdf"), "source")).kind, "pdf");
  assert.equal((await api.validate(new File(["hello <script>"], "notes.txt"), "source")).kind, "txt");
  await assert.rejects(api.validate(new File(["not a pdf"], "book.pdf"), "source"), /invalidFile/);
  await assert.rejects(api.validate(new File(["%PDF-1.7"], "book.doc"), "source"), /invalidFile/);
  await assert.rejects(api.validate(new File([new Uint8Array([0, 2, 3])], "notes.txt"), "source"), /invalidFile/);
  await assert.rejects(api.validate(new File([new Uint8Array(25 * 1024 * 1024 + 1)], "notes.txt"), "source"), /invalidFile/);
});

test("replacing an uploaded document with a URL clears former file metadata", () => {
  const api = loadAttachments();
  const old = { attachmentMediaId: "saved-docx", attachmentName: "old.docx", attachmentKind: "docx", attachmentMime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
  const replaced = api.attachmentMetadata(old, null, "https://example.com/new.pdf");
  assert.equal(replaced.attachmentMediaId, ""); assert.equal(replaced.attachmentName, ""); assert.equal(replaced.attachmentKind, ""); assert.equal(replaced.attachmentMime, "");
  const retained = api.attachmentMetadata(old, null, "");
  for (const key of Object.keys(old)) assert.equal(retained[key], old[key]);
});

test("DOCX validation refuses zip bombs before inflation and unsupported archive contents", async () => {
  let inflated = false;
  const api = loadAttachments({ fflate: { unzipSync(bytes, options) { options.filter({ name: "word/document.xml", originalSize: 9 * 1024 * 1024 }); inflated = true; } } });
  await assert.rejects(api.validate(new File([new Uint8Array([80, 75, 3, 4])], "book.docx"), "source"), /invalidFile/);
  assert.equal(inflated, false);
  const unsupported = loadAttachments({ fflate: { unzipSync: () => ({}) } });
  await assert.rejects(unsupported.validate(new File([new Uint8Array([80, 75, 3, 4])], "book.docx"), "source"), /invalidFile/);
});

test("A/V validation checks media signatures and preserves detected audio type", async () => {
  const api = loadAttachments();
  const recording = new File([new Uint8Array([26, 69, 223, 163, 1, 2])], "note.webm", { type: "audio/webm;codecs=opus" });
  assert.equal((await api.validate(recording, "av")).kind, "audio");
  await assert.rejects(api.validate(new File(["fake video"], "fake.mp4", { type: "video/mp4" }), "av"), /invalidFile/);
  await assert.rejects(api.validate(new File(["text"], "note.txt", { type: "text/plain" }), "av"), /invalidFile/);
});

test("attachment save failures restore in-memory metadata and remove only the new blob", async () => {
  const oldItem = { id: "source-1", type: "source", title: "Keep", attachmentMediaId: "old-blob" };
  const idea = { id: "idea-1", updatedAt: "old-date", pathData: { researchCanvasItems: [oldItem] } };
  const removed = [], records = [];
  const window = {
    matchMedia: () => ({ matches: false }),
    MentorResearchAttachments: { validate: async () => ({ kind: "pdf", mime: "application/pdf" }) },
    MentorData: { repositories: { media: { storageKind: "indexeddb", put: async (record) => records.push(record), removeEntity: async (type, id) => removed.push(id) } } }
  };
  const context = vm.createContext({ window, console });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "brainstorming.js"), "utf8"), context);
  window.brainstormingState.ideas = [idea]; context.renderPathWorkspace = () => { throw new Error("must not rerender failed save"); };
  context.saveIdeas = async () => false;
  assert.equal(await context.saveResearchCanvasAttachment("idea-1", { ...oldItem, title: "New" }, new Blob(["%PDF-1.7"])), false);
  assert.equal(idea.pathData.researchCanvasItems[0], oldItem); assert.equal(idea.updatedAt, "old-date");
  assert.deepEqual(removed, [records[0].entityId]);
  context.saveIdeas = async () => { throw new Error("write failed"); };
  await assert.rejects(context.saveResearchCanvasAttachment("idea-1", { ...oldItem, title: "New" }, new Blob(["%PDF-1.7"])), /write failed/);
  assert.equal(idea.pathData.researchCanvasItems[0], oldItem); assert.equal(idea.updatedAt, "old-date");
  assert.deepEqual(removed, records.map((record) => record.entityId));
  await assert.rejects(context.deleteResearchCanvasItem("idea-1", "source-1"), /write failed/);
  assert.equal(idea.pathData.researchCanvasItems[0], oldItem); assert.equal(idea.updatedAt, "old-date");
  context.saveIdeas = async () => true;
  context.console = { warn() {} };
  assert.equal(await context.saveResearchCanvasAttachment("idea-1", { ...oldItem, title: "Committed" }, new Blob(["%PDF-1.7"])), true);
  assert.equal(idea.pathData.researchCanvasItems[0].attachmentMediaId, records[2].entityId);
  assert.equal(removed.includes(records[2].entityId), false);
  assert.equal(removed.includes("old-blob"), true);
});

test("raw A/V and source records persist in canonical media storage without image conversion", async () => {
  const { IDBFactory } = require("fake-indexeddb");
  const indexedDB = new IDBFactory();
  const window = { indexedDB, MentorDataError: Error };
  const context = vm.createContext({ window, indexedDB, Blob, URL, console });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "js/nutrition/services/food-image-storage.service.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "js/data/repositories/media.repository.js"), "utf8"), context);
  const media = window.MentorDataRepositoryFactories.createMediaRepository();
  for (const [entityType, mime, content] of [["research-av", "audio/webm", "recorded message"], ["research-source", "application/pdf", "%PDF-1.7"]]) {
    const blob = new Blob([content], { type: mime });
    await media.put({ id: entityType + "-image:local", entityType, entityId: "local", blob, type: mime });
    const stored = await media.getEntity(entityType, "local");
    assert.equal(await stored.blob.text(), content); assert.equal(stored.blob.type, mime); assert.equal(stored.thumbnail, undefined);
    await media.removeEntity(entityType, "local"); assert.equal(await media.getEntity(entityType, "local"), null);
  }
});

test("top Brainstorming action switches between New idea and Research sticker Add", () => {
  const attributes = new Map();
  const label = { textContent: "" };
  let headerMenu = null;
  let onMenuClick;
  let openedSticker = false;
  const originalChoice = { dataset: { cardType: "note" }, click: () => { openedSticker = true; } };
  const copiedChoice = { dataset: { cardType: "note" }, removeAttribute() {}, setAttribute() {} };
  const copiedMenu = {
    hidden: true,
    classList: { add() {} },
    removeAttribute() {},
    setAttribute() {},
    querySelectorAll: () => [copiedChoice],
    addEventListener: (type, listener) => { if (type === "click") onMenuClick = listener; },
    contains: (node) => node === copiedChoice,
    remove: () => { headerMenu = null; }
  };
  const sourceMenu = { cloneNode: () => copiedMenu, querySelectorAll: () => [originalChoice] };
  const button = {
    disabled: false,
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: (name) => attributes.delete(name),
    querySelector: () => label
  };
  const canvas = { querySelector: (selector) => selector === ".research-view" ? {} : sourceMenu };
  const panel = { appendChild: (menu) => { headerMenu = menu; } };
  const document = {
    getElementById: (id) => id === "openIdeaModalBtn" ? button : id === "brainstormingCanvas" ? canvas : null,
    querySelector: (selector) => selector === ".brainstorming-header-add-menu" ? headerMenu : selector === "#brainstormingView .brainstorming-control-panel" ? panel : null
  };
  const context = vm.createContext({
    window: { matchMedia: () => ({ matches: false }), MentorI18n: { t: (key) => key === "research.canvas.add" ? "Add" : key === "brainstorming.actions.newIdea" ? "New idea" : key } },
    document,
    console
  });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "brainstorming.js"), "utf8"), context);
  vm.runInContext('brainstormingState.activeTab = "path"; syncBrainstormingPrimaryAction(); toggleBrainstormingResearchAddMenu();', context);
  assert.equal(label.textContent, "Add");
  assert.equal(attributes.get("aria-label"), "+ Add");
  assert.equal(attributes.get("aria-expanded"), "true");
  onMenuClick({ target: { closest: () => copiedChoice } });
  assert.equal(openedSticker, true);
  assert.equal(headerMenu, null);
  vm.runInContext('brainstormingState.activeTab = "all"; syncBrainstormingPrimaryAction();', context);
  assert.equal(label.textContent, "New idea");
  assert.equal(attributes.has("aria-haspopup"), false);
});

test("research canvas renders existing references and notes without the old panels", () => {
  const context = loadResearch();
  const idea = {
    id: "idea-1",
    title: "Research idea",
    description: "Existing description",
    status: "path",
    pathData: {
      researchDirections: [{
        id: "direction-1",
        title: "Parts",
        references: [{ id: "reference-1", title: "Part", link: "https://example.com", notes: [{ id: "note-1", title: "Check fit", body: "Measure first" }] }]
      }],
      researchCanvasItems: [{ id: "budget-1", type: "finance", title: "Budget", price: "320 EUR" }]
    }
  };
  const html = context.window.MentorResearch.renderResearchView(idea);
  const cards = context.getResearchCanvasCards(idea);

  assert.equal(cards.length, 3);
  assert.match(html, /research-hero-panel/);
  assert.match(html, /research-freeze-stack/);
  assert.match(html, /research-detail-stage/);
  assert.match(html, /data-research-action="toggle-description"/);
  assert.match(html, /data-research-nav="prev"/);
  assert.match(html, /data-research-nav="next"/);
  assert.match(html, /research-meta-card/);
  assert.doesNotMatch(html, /research-canvas-only|research-idea-summary/);
  assert.match(html, /data-panel="research-canvas-workspace"/);
  assert.match(html, /research-compact-idea-nav/);
  assert.ok(html.indexOf('class="research-compact-idea-nav"') > html.indexOf('class="research-canvas-section"'));
  assert.match(html, /data-research-canvas-viewport/);
  assert.match(html, /data-research-phase="0"/);
  assert.match(html, /research-directions-panel/);
  assert.match(html, /data-research-canvas/);
  const toolbar = html.slice(html.indexOf('class="research-canvas-toolbar"'), html.indexOf('class="research-canvas-viewport"'));
  assert.doesNotMatch(toolbar, /open-canvas-tests|financial-comparison/);
  const dockStart = html.indexOf('class="research-compact-idea-nav"');
  const dock = html.slice(dockStart, html.indexOf('</nav>', dockStart) + 6);
  assert.match(dock, /research-canvas-add-wrap/);
  assert.match(dock, /data-research-action="open-idea"/);
  assert.equal((html.match(/class="research-canvas-add-wrap"/g) || []).length, 1);
  assert.ok(html.indexOf('class="research-compact-idea-nav"') > html.indexOf('class="research-canvas-viewport"'));
  assert.ok(html.indexOf('class="research-row research-row-intro"') > html.indexOf('class="research-canvas-section"'));
  assert.match(html, /Check fit/);
  assert.match(html, /320 EUR/);
  assert.doesNotMatch(html, /research-reference-notes-row|research-scroll-stage/);
});

test("Research no longer contains the legacy dashboard fallback", () => {
  const source = fs.readFileSync(path.join(projectRoot, "brainstorming.js"), "utf8");
  assert.doesNotMatch(source, /brainstorming-workspace path-workspace/);
});

test("unified idea dock counts real note, media and link cards", () => {
  const context = loadResearch();
  const html = context.renderResearchCompactIdeaNav(
    { id: "idea-1", title: "Mentor APP" },
    { hasPrevious: true, hasNext: true },
    [{ type: "note" }, { type: "image" }, { type: "video" }, { type: "link" }, { type: "finance" }]
  );
  assert.match(html, /Mentor APP/);
  assert.match(html, /data-research-nav="prev"/);
  assert.match(html, /data-research-nav="next"/);
  assert.match(html, /data-research-dock-attach/);
  assert.match(html, /data-research-dock-resize/);
  assert.equal((html.match(/research-compact-idea-count-number/g) || []).length, 3);
  assert.equal((html.match(/research-compact-idea-count-full/g) || []).length, 3);
  assert.match(fs.readFileSync(path.join(projectRoot, "style.css"), "utf8"), /@container research-idea-dock \(max-width: 405px\)[\s\S]*?\.research-compact-idea-count-full \{ display: none; \}/);
  assert.equal((html.match(/data-research-action="zoom-canvas-cards"/g) || []).length, 2);
  assert.match(html, /data-zoom-delta="-0\.1"/);
  assert.match(html, /data-zoom-delta="0\.1"/);
  assert.ok(html.lastIndexOf('data-count="1"') < html.indexOf('data-research-dock-attach'));
  assert.ok(html.indexOf('data-research-dock-attach') < html.indexOf('data-research-action="open-idea"'));
  assert.deepEqual(Array.from(html.matchAll(/data-count="(\d+)"/g), (match) => Number(match[1])), [1, 2, 1]);
  assert.equal((html.match(/data-research-action="toggle-canvas-menu"/g) || []).length, 1);
});

test("mini idea Add menu opens beside the button and stays inside the viewport", () => {
  const context = loadResearch();
  context.window.innerWidth = 1440;
  context.window.innerHeight = 900;
  const style = { transform: "" };
  const menu = {
    hidden: false,
    style,
    getBoundingClientRect: () => ({ left: 1278, top: -4, width: 210, height: 230 })
  };
  context.positionResearchCanvasAddMenu(menu);
  assert.equal(style.transform, "translate(-56px, 12px)");
  assert.match(fs.readFileSync(path.join(projectRoot, "style.css"), "utf8"), /\.research-view \.research-compact-idea-nav \.research-canvas-menu \{ top: -12px; right: auto; left: calc\(100% \+ 8px\);/);
});

test("mini idea Add menu opens from its DOM state after the view is refreshed", () => {
  const context = loadResearch();
  context.window.innerWidth = 1440;
  context.window.innerHeight = 900;
  const menu = { hidden: true, style: { transform: "" }, getBoundingClientRect: () => ({ left: 100, top: 100, width: 210, height: 230 }) };
  const button = { closest: () => ({ querySelector: () => menu }), setAttribute(name, value) { this[name] = value; } };
  const view = { querySelector(selector) { return selector === "[data-research-canvas-menu]" ? menu : selector.includes("toggle-canvas-menu") ? button : null; }, querySelectorAll: () => [] };
  vm.runInContext("researchViewState.canvasMenuOpen = true", context);
  context.toggleResearchCanvasAddMenu(view, button);
  assert.equal(menu.hidden, false);
  assert.equal(button["aria-expanded"], "true");
  context.toggleResearchCanvasAddMenu(view, button);
  assert.equal(menu.hidden, true);
  assert.equal(button["aria-expanded"], "false");
});

test("image and video stickers expose an in-app preview and safe video embeds", () => {
  const context = loadResearch();
  const video = context.renderResearchCanvasCard({ key: "item:video-1", type: "video", title: "Clip", url: "https://youtu.be/M7lc1UVf-VE" });
  const image = context.renderResearchCanvasCard({ key: "item:image-1", type: "image", title: "Photo", image: "https://example.com/photo.jpg" });
  assert.match(video, /data-research-action="open-canvas-preview" data-card-key="item:video-1"/);
  assert.match(image, /data-research-action="open-canvas-preview" data-card-key="item:image-1"/);
  assert.equal(context.getResearchVideoEmbedUrl("https://www.youtube.com/watch?v=M7lc1UVf-VE"), "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE");
  assert.equal(context.getResearchVideoEmbedUrl("https://vimeo.com/76979871"), "https://player.vimeo.com/video/76979871");
  assert.equal(context.getResearchVideoEmbedUrl("https://example.com/video.mp4"), "");
  assert.equal(context.getResearchVideoEmbedUrl("https://youtube.com.evil.example/watch?v=M7lc1UVf-VE"), "");
});

test("media preview keeps the page undimmed and hides its controls within two seconds", () => {
  const context = loadResearch();
  const listeners = new Map();
  const classes = new Set();
  let timer;
  context.window.setTimeout = (callback, delay) => { timer = { callback, delay }; return 1; };
  context.window.clearTimeout = () => { timer = null; };
  const modal = {
    classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name), contains: (name) => classes.has(name) },
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type) => listeners.delete(type)
  };
  const stop = context.bindResearchMediaIdle(modal);
  assert.equal(timer.delay, 1800);
  timer.callback();
  assert.equal(classes.has("is-idle"), true);
  listeners.get("pointermove")();
  assert.equal(classes.has("is-idle"), false);
  stop();
  assert.equal(timer, null);
  assert.equal(context.formatResearchMediaTime(125), "2:05");
  const css = fs.readFileSync(path.join(projectRoot, "style.css"), "utf8");
  assert.match(css, /\.research-canvas-media-modal \{ background: transparent; backdrop-filter: none;/);
  assert.match(css, /\.research-canvas-media-modal\.is-video\.is-idle \.research-media-toolbar/);
});

test("uploaded research videos use media storage and roll back after a failed idea save", async () => {
  const records = [];
  const removed = [];
  const context = vm.createContext({
    window: {
      matchMedia: () => ({ matches: false }),
      MentorData: { repositories: { media: {
        storageKind: "indexeddb",
        put: async (record) => { records.push(record); },
        removeEntity: async (type, id) => { removed.push({ type, id }); }
      } } }
    },
    document: {},
    console
  });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "brainstorming.js"), "utf8"), context);
  const savedItems = [];
  context.saveResearchCanvasItem = async (ideaId, item) => { savedItems.push({ ideaId, item }); return savedItems.length === 1; };
  const file = { name: "local.mp4", type: "video/mp4", size: 1024 };
  assert.equal(await context.saveResearchCanvasVideo("idea-1", { type: "video", text: "clip" }, file), true);
  assert.equal(records.length, 1);
  assert.equal(records[0].blob, file);
  assert.equal(records[0].id, "research-video-image:" + savedItems[0].item.videoMediaId);
  assert.equal(savedItems[0].item.url, "");
  assert.equal(await context.saveResearchCanvasVideo("idea-1", { type: "video" }, file), false);
  assert.deepEqual(removed.map((entry) => entry.id), [records[1].entityId]);
});

test("legacy media storage keeps a research video blob without image conversion", async () => {
  const { IDBFactory } = require("fake-indexeddb");
  const indexedDB = new IDBFactory();
  const window = { indexedDB, MentorDataError: Error };
  const context = vm.createContext({ window, indexedDB, Blob, URL, console });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "js/nutrition/services/food-image-storage.service.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "js/data/repositories/media.repository.js"), "utf8"), context);
  const media = window.MentorDataRepositoryFactories.createMediaRepository();
  const blob = new Blob(["video bytes"], { type: "video/mp4" });
  await media.put({ id: "research-video-image:clip-1", entityType: "research-video", entityId: "clip-1", blob, type: blob.type });
  const stored = await media.getEntity("research-video", "clip-1");
  assert.equal(stored.blob.size, blob.size);
  assert.equal(stored.blob.type, "video/mp4");
  await media.removeEntity("research-video", "clip-1");
  assert.equal(await media.getEntity("research-video", "clip-1"), null);
});

test("floating idea dock stays within the viewport when moved or resized", () => {
  const context = loadResearch();
  const clamp = context.clampResearchDockRect;
  assert.equal(clamp({ left: -50, top: 900, width: 700, height: 300 }, 800, 600).left, 8);
  assert.equal(clamp({ left: -50, top: 900, width: 700, height: 300 }, 800, 600).top, 292);
  assert.equal(clamp({ left: 20, top: 20, width: 100, height: 40 }, 800, 600).width, 340);
  assert.equal(clamp({ left: 20, top: 20, width: 100, height: 40 }, 320, 600).width, 304);
  assert.equal(clamp({ left: 20, top: 20, width: 100, height: 40 }, 800, 600).height, 96);
});

test("pinned idea dock keeps its viewport position when the selected idea changes", () => {
  const context = loadResearch();
  context.window.innerWidth = 1280;
  context.window.innerHeight = 800;
  const state = vm.runInContext("researchViewState", context);
  state.compactDock = { mode: "floating", pinned: true, left: 245, top: 125, width: 400, height: 110 };
  const cssValues = new Map();
  const attach = { setAttribute() {} };
  const view = { querySelector: () => ({}) };
  const makeDock = () => ({
    parentElement: view,
    classList: { toggle() {} },
    style: {
      setProperty: (name, value) => cssValues.set(name, value),
      removeProperty: (name) => cssValues.delete(name)
    },
    querySelector: () => attach
  });

  context.applyResearchCompactDockState(view, makeDock());
  context.renderResearchView({ id: "idea-2", title: "Second idea" });
  context.applyResearchCompactDockState(view, makeDock());

  assert.equal(cssValues.get("--research-dock-left"), "245px");
  assert.equal(cssValues.get("--research-dock-top"), "125px");
  assert.equal(state.compactDock.pinned, true);
});

test("research directions render in one rail with a plus tab and arrows", () => {
  const context = loadResearch();
  const html = context.renderResearchDirectionsPanel({
    id: "idea-1",
    pathData: { researchDirections: [{ id: "direction-1", title: "Audience", icon: "people" }] }
  });

  assert.match(html, /data-research-direction-stack/);
  assert.match(html, /research-direction-grid/);
  assert.equal((html.match(/data-research-action="shift-directions"/g) || []).length, 2);
  assert.match(html, /research-direction-select/);
  assert.match(html, /aria-pressed="true"/);
  assert.doesNotMatch(html, /research-direction-add-slot/);
  assert.ok(html.indexOf('data-research-action="add-direction"') > html.indexOf('data-research-action="select-direction"'));
  assert.ok(html.indexOf('data-research-action="add-direction"') < html.indexOf('data-research-action="shift-directions" data-shift="1"'));
  assert.equal((html.match(/data-research-action="add-direction"/g) || []).length, 1);
});

test("direction rail keeps all directions in the same row", () => {
  const context = loadResearch();
  const directions = Array.from({ length: 8 }, (_, index) => ({ id: "direction-" + index, title: "Direction " + index }));
  const html = context.renderResearchDirectionsPanel({ id: "idea-1", pathData: { researchDirections: directions } });
  assert.equal((html.match(/class="research-direction-grid"/g) || []).length, 1);
  assert.equal((html.match(/class="research-direction-tile saved/g) || []).length, 8);
  assert.ok(html.indexOf('data-research-action="add-direction"') < html.indexOf('data-research-action="shift-directions" data-shift="1"'));
});

test("direction arrows appear only when the single row overflows", () => {
  const context = loadResearch();
  const stack = { scrollWidth: 480, clientWidth: 300, scrollLeft: 0 };
  const previous = { dataset: { shift: "-1" } };
  const next = { dataset: { shift: "1" } };
  const view = {
    querySelector: () => stack,
    querySelectorAll: () => [previous, next]
  };
  context.layoutResearchDirectionTabs(view);
  assert.equal(previous.hidden, false);
  assert.equal(previous.disabled, true);
  assert.equal(next.disabled, false);
  stack.scrollLeft = 180;
  context.layoutResearchDirectionTabs(view);
  assert.equal(previous.disabled, false);
  assert.equal(next.disabled, true);
  stack.scrollWidth = 300;
  stack.scrollLeft = 0;
  context.layoutResearchDirectionTabs(view);
  assert.equal(previous.hidden, true);
  assert.equal(next.hidden, true);
});

test("research scroll advances through three focus states with stable return thresholds", () => {
  const context = vm.createContext({
    window: { matchMedia: () => ({ matches: false }), MentorI18n: { t: (key, params, fallback) => fallback || key } },
    Date,
    console
  });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "brainstorming.js"), "utf8"), context);
  const phase = context.getResearchCanvasScrollPhase;
  assert.equal(context.getResearchCanvasJoinScrollY(200, 160, 14), 346);
  assert.equal(context.getResearchTabsContactScrollY(200, 305, 250), 252);
  assert.equal(phase(0, 180, 252, 0, false), 0);
  assert.equal(phase(100, 180, 252, 0, true), 1);
  assert.equal(phase(180, 180, 252, 1, true), 2);
  assert.equal(phase(251, 180, 252, 2, true), 2);
  assert.equal(phase(252, 180, 252, 2, true), 3);
  assert.equal(phase(173, 180, 252, 3, true), 3);
  assert.equal(phase(171, 180, 252, 3, true), 2);
  assert.equal(phase(161, 180, 252, 2, true), 1);
});

test("repeated panel transitions swap visibility immediately without a delayed blink", () => {
  const context = vm.createContext({
    window: {
      matchMedia: () => ({ matches: false }),
      setTimeout: () => { throw new Error("Panel visibility must not be delayed"); },
      clearTimeout: () => {}
    }
  });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "brainstorming.js"), "utf8"), context);
  const classes = new Set();
  const view = {
    dataset: { researchPhase: "3" },
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
      toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name)
    }
  };

  for (const phase of [3, 2, 3, 2, 1, 0, 3, 2]) {
    context.syncResearchHeroVisibility(view, phase);
    view.dataset.researchPhase = String(phase);
    assert.equal(classes.has("is-mini-panel-hidden"), phase < 3);
    assert.equal(classes.has("is-hero-suppressed"), phase >= 3);
    assert.equal(classes.has("is-mini-panel-exiting"), false);
  }
  assert.match(fs.readFileSync(path.join(projectRoot, "style.css"), "utf8"), /\.research-view\.is-mini-panel-hidden \.research-compact-idea-nav\s*\{[^}]*opacity:\s*0;[^}]*visibility:\s*hidden;[^}]*transition:\s*none;/);
});

test("canvas placement accepts positions outside every original map edge", () => {
  const context = loadResearch();
  const canvas = { clientWidth: 300, clientHeight: 500 };
  const card = { offsetWidth: 224, offsetHeight: 160, style: {} };

  assert.equal(context.placeResearchCanvasCard(canvas, card, -100, -100).x, -100);
  assert.equal(context.placeResearchCanvasCard(canvas, card, -100, -100).y, -100);
  assert.equal(context.placeResearchCanvasCard(canvas, card, 1000, 1000).x, 1000);
  assert.equal(context.placeResearchCanvasCard(canvas, card, 1000, 1000).y, 1000);
});

test("new canvas stickers use the visible map center and dragged screen position", async () => {
  const context = loadResearch();
  const state = vm.runInContext("researchViewState", context);
  state.currentIdea = { id: "idea-1", pathData: { researchDirections: [{ id: "direction-1", references: [] }] } };
  state.canvasCameraByWorkspace[JSON.stringify(["idea-1", "direction-1"])] = { x: 120, y: -40, zoom: 2 };
  const viewport = {
    clientLeft: 0, clientTop: 0, clientWidth: 800, clientHeight: 600, scrollLeft: 0, scrollTop: 0,
    getBoundingClientRect: () => ({ left: 100, top: 50, right: 900, bottom: 650 })
  };
  const view = { querySelector: () => null, querySelectorAll: () => [] };
  const root = { querySelector(selector) { return selector === ".research-view" ? view : selector === "[data-research-canvas-viewport]" ? viewport : null; } };
  const opened = [];
  context.openResearchCanvasItemForm = (_root, _actions, card) => opened.push(card);
  context.closeResearchCanvasMenus = () => {};
  const button = { dataset: { cardType: "note" } };
  await context.openResearchCanvasCardCreator(root, {}, button);
  // Root stickers include the existing depth and default size scales.
  assert.equal(opened[0].canvasPosition.x, 52);
  assert.equal(opened[0].canvasPosition.y, 113);
  await context.openResearchCanvasCardCreator(root, {}, button, context.getResearchCanvasPositionAtClient(root, 300, 250));
  assert.equal(opened[1].canvasPosition.x, -48);
  assert.equal(opened[1].canvasPosition.y, 63);
});

test("dragging a sticker type shows a preview and opens the form only after a canvas drop", () => {
  const context = loadResearch();
  const callbacks = {};
  const button = {
    dataset: { cardType: "source" }, listeners: {},
    closest: (selector) => selector.startsWith('button[') ? button : {}, setPointerCapture() {}, hasPointerCapture: () => false,
    addEventListener(type, listener) { this.listeners[type] = listener; },
    removeEventListener(type) { delete this.listeners[type]; }
  };
  const host = { contains: () => true, addEventListener(type, listener) { this[type] = listener; } };
  const previews = [];
  context.window.document = {
    createElement: () => ({ offsetWidth: 170, offsetHeight: 112, style: {}, classList: { toggle() {} }, remove() { this.removed = true; } }),
    body: { appendChild(preview) { previews.push(preview); } }
  };
  context.window.MentorResearchStickerDrag.bind(host, {
    isOverCanvas: (event) => event.clientX > 200,
    renderPreview: (type) => type,
    onDrop: (_button, event) => { callbacks.drop = event.clientX; }
  });
  host.pointerdown({ button: 0, pointerId: 1, clientX: 10, clientY: 10, target: button });
  button.listeners.pointermove({ pointerId: 1, clientX: 150, clientY: 80, preventDefault() {} });
  assert.equal(previews.length, 1);
  assert.equal(previews[0].innerHTML, "source");
  button.listeners.pointerup({ pointerId: 1, type: "pointerup", clientX: 300, clientY: 100 });
  assert.equal(callbacks.drop, 300);
  assert.equal(previews[0].removed, true);
  assert.equal(context.window.MentorResearchStickerDrag.consumeClick(button), true);
  assert.equal(context.window.MentorResearchStickerDrag.consumeClick(button), false);
});

test("sticker zoom defaults to 80 percent and preserves unbounded positions", () => {
  const context = loadResearch();
  const state = vm.runInContext("researchViewState", context);
  const idea = { id: "idea-1" };
  const card = { offsetWidth: 224, offsetHeight: 160, style: {} };
  const canvas = { clientWidth: 300, clientHeight: 500 };

  assert.equal(context.getResearchCanvasCardZoom(idea), 0.8);
  assert.ok(Math.abs(context.getResearchVisualCardSize(card).width - 175.9296) < 0.001);
  assert.equal(context.clampResearchCanvasCardZoom(0.1), 0.6);
  assert.equal(context.clampResearchCanvasCardZoom(2), 1.4);
  state.currentIdea = idea;
  state.cardZoomByIdea[idea.id] = 1;
  assert.equal(context.getResearchCanvasCardZoom(idea), 1);
  assert.equal(context.getResearchCanvasCardZoom({ id: "idea-2" }), 0.8);
  assert.equal(context.placeResearchCanvasCard(canvas, card, 1000, 1000).x, 1000);
  assert.equal(context.placeResearchCanvasCard(canvas, card, 1000, 1000).y, 1000);
});

test("root and first child stay equal while deeper children shrink in canvas and focus", () => {
  const context = loadResearch();
  const graph = context.getResearchCanvasGraph([
    { key: "parent" }, { key: "child", parentKey: "parent" }, { key: "grandchild", parentKey: "child" },
    { key: "third", parentKey: "grandchild" }, { key: "fourth", parentKey: "third" }
  ]);
  assert.equal(context.getResearchCanvasDepthScale("parent", graph), 1.05);
  for (const [key, depth, expectedDepthScale] of [["child", 1, 1.05], ["grandchild", 2, 1.05 * 0.975], ["third", 3, 1.05 * 0.975 ** 2], ["fourth", 4, 1.05 * 0.975 ** 3]]) {
    const depthScale = context.getResearchCanvasDepthScale(key, graph);
    assert.equal(depthScale, expectedDepthScale);
    assert.equal(depthScale, context.getResearchCanvasFocusDepthScale(depth));
    const normal = context.getResearchVisualCardSize({ offsetWidth: 224, offsetHeight: 146, dataset: { canvasDepthScale: depthScale } }, 0.8);
    const focusScale = context.getResearchCanvasFocusScale(depth);
    const focused = context.getResearchFocusCardSize({ offsetWidth: 224, offsetHeight: 146, dataset: { focusScale } });
    const expected = 1.056 * context.getResearchCanvasFocusDepthScale(depth) / (0.935 * depthScale);
    assert.ok(Math.abs(focused.width / normal.width - expected) < 0.0001);
    assert.ok(Math.abs(focused.height / normal.height - expected) < 0.0001);
  }
  assert.equal(context.getResearchCanvasFocusDepthScale(1000), 0.25);
});

test("sticker connections end at the scaled card edges", () => {
  const context = loadResearch();
  const state = vm.runInContext("researchViewState", context);
  state.currentIdea = {
    id: "idea-1",
    pathData: { researchCanvasItems: [
      { id: "parent", type: "note", title: "Parent" },
      { id: "child", type: "note", title: "Child", canvasParentKey: "item:parent" }
    ] }
  };
  const parent = { dataset: { cardKey: "item:parent", canvasDepthScale: "1.05" }, style: { left: "100px", top: "80px" }, offsetWidth: 224, offsetHeight: 160, hidden: false };
  const child = { dataset: { cardKey: "item:child", canvasDepthScale: "1.05" }, style: { left: "340px", top: "120px" }, offsetWidth: 224, offsetHeight: 160, hidden: false };
  const svg = { setAttribute() {}, innerHTML: "" };
  const canvas = {
    clientWidth: 800,
    clientHeight: 600,
    querySelector: () => svg,
    querySelectorAll: () => [parent, child]
  };

  context.drawResearchCanvasConnections(canvas);
  const start = svg.innerHTML.match(/M ([\d.]+) ([\d.]+) C/);
  assert.ok(start);
  assert.ok(Math.abs(Number(start[1]) - 275.9296) < 0.001);
  assert.ok(Math.abs(Number(start[2]) - 142.832) < 0.001);
});

test("rotated sticker anchors follow true border midpoints and edge angles", () => {
  const context = loadResearch(), geometry = context.window.MentorResearchGeometry;
  const radians = -0.6 * Math.PI / 180, scale = 0.8, width = 400, height = 1000;
  const a = Math.cos(radians) * scale, b = Math.sin(radians) * scale;
  const c = -Math.sin(radians) * scale, d = Math.cos(radians) * scale;
  const origin = { x: 120, y: 180 };
  const corners = [[0, 0], [width, 0], [width, height], [0, height]].map(([x, y]) => ({ x: origin.x + a * x + c * y, y: origin.y + b * x + d * y }));
  const left = Math.min(...corners.map((point) => point.x)), top = Math.min(...corners.map((point) => point.y));
  const rect = geometry.borderGeometry({ x: left, y: top,
    width: Math.max(...corners.map((point) => point.x)) - left,
    height: Math.max(...corners.map((point) => point.y)) - top }, [a, b, c, d], width, height);
  const point = geometry.sidePoint(rect, "right");
  assert.ok(Math.abs(point.x - (origin.x + a * width + c * height / 2)) < 1e-8);
  assert.ok(Math.abs(point.y - (origin.y + b * width + d * height / 2)) < 1e-8);
  assert.ok(Math.abs(rect.sideAngles.right + 0.6) < 1e-8);
  assert.equal(geometry.nearestAllowedConnectionSide(rect, point.x, point.y), "right");
  const anchors = geometry.connectionAnchors(rect, { x: 800, y: 200, width: 200, height: 300 }, { parent: "right", child: "left" });
  assert.deepEqual({ ...anchors.from }, { ...point });
  assert.equal(anchors.fromAngle, rect.sideAngles.right);
});

test("connection geometry uses the inner focus border and converts actual map bounds into canvas coordinates", () => {
  const context = loadResearch();
  context.window.getComputedStyle = () => ({ transform: "none" });
  const article = { getBoundingClientRect: () => ({ left: 240, top: 150, width: 280, height: 420 }) };
  const wrapper = { dataset: { focusScale: "0.7" }, style: { left: "200px", top: "100px" }, offsetWidth: 600, offsetHeight: 900, querySelector: () => article };
  const stage = { getBoundingClientRect: () => ({ left: 40, top: 50 }) };
  const focus = context.getResearchCanvasConnectionRect(wrapper, { querySelector: () => stage }, true);
  assert.deepEqual([focus.x, focus.y, focus.width, focus.height], [200, 100, 280, 420]);
  article.getBoundingClientRect = () => ({ left: 500, top: 600, width: 400, height: 800 });
  const canvas = { dataset: { mapScale: "2" }, getBoundingClientRect: () => ({ left: 100, top: 200 }) };
  const map = context.getResearchCanvasConnectionRect(article, canvas);
  assert.deepEqual([map.x, map.y, map.width, map.height], [200, 200, 200, 400]);
});

test("both connection handles follow their sticker edges without replacing buttons", () => {
  const context = loadResearch();
  const state = vm.runInContext("researchViewState", context);
  state.currentIdea = { id: "idea-1", pathData: { researchCanvasItems: [
    { id: "parent", type: "note", title: "Parent" },
    { id: "child", type: "note", title: "Child", canvasParentKey: "item:parent" }
  ] } };
  const parent = { dataset: { cardKey: "item:parent", canvasDepthScale: "1.05" }, style: { left: "100px", top: "80px" }, offsetWidth: 224, offsetHeight: 160, hidden: false };
  const child = { dataset: { cardKey: "item:child", canvasDepthScale: "1.05" }, style: { left: "340px", top: "120px" }, offsetWidth: 224, offsetHeight: 160, hidden: false };
  const svg = { setAttribute() {}, innerHTML: "" };
  const handles = [];
  const layer = { dataset: { researchConnectionHandles: "" },
    querySelectorAll: () => handles,
    appendChild(button) { handles.push(button); } };
  const canvas = { clientWidth: 800, clientHeight: 600,
    querySelector: (selector) => selector === "[data-research-connection-handles]" ? layer : svg,
    querySelectorAll: () => [parent, child] };
  context.document = { createElement: () => ({ dataset: {}, style: {}, classList: { contains: () => false, add() {}, remove() {} }, setAttribute() {}, addEventListener() {} }) };
  context.drawResearchCanvasConnections(canvas);
  const parentHandle = handles.find((button) => button.dataset.cardKey === "item:child" && button.dataset.endpoint === "parent");
  const childHandle = handles.find((button) => button.dataset.cardKey === "item:child" && button.dataset.endpoint === "child");
  assert.equal(handles.length, 2);
  assert.ok(Math.abs(parseFloat(parentHandle.style.left) - 275.9296) < 0.001);
  assert.ok(Math.abs(parseFloat(parentHandle.style.top) - 142.832) < 0.001);
  assert.equal(parentHandle.dataset.connectionSide, "right");
  assert.equal(childHandle.style.left, "340px");
  assert.equal(childHandle.style.top, "182.832px");
  assert.equal(childHandle.dataset.connectionSide, "left");
  assert.match(parentHandle.className, /is-connected-endpoint/);
  child.style.left = "100px";
  child.style.top = "350px";
  context.drawResearchCanvasConnections(canvas);
  assert.equal(handles.find((button) => button.dataset.endpoint === "parent"), parentHandle);
  assert.equal(handles.find((button) => button.dataset.endpoint === "child"), childHandle);
  assert.ok(Math.abs(parseFloat(parentHandle.style.left) - 187.9648) < 0.001);
  assert.ok(Math.abs(parseFloat(parentHandle.style.top) - 205.664) < 0.001);
  assert.equal(parentHandle.dataset.connectionSide, "bottom");
  assert.ok(Math.abs(parseFloat(childHandle.style.left) - 187.9648) < 0.001);
  assert.equal(childHandle.style.top, "350px");
  assert.equal(childHandle.dataset.connectionSide, "top");
  const graph = context.getResearchCanvasGraph(context.getResearchCanvasCards(state.currentIdea));
  assert.doesNotMatch(context.renderResearchCanvasCard(context.getResearchCanvasCards(state.currentIdea)[0], graph), /data-research-action="change-canvas-parent"/);
  assert.doesNotMatch(context.renderResearchCanvasCard(context.getResearchCanvasCards(state.currentIdea)[1], graph), /data-research-action="change-canvas-parent"/);
});

test("source ports hide only where visible connection handles occupy an edge", () => {
  const context = loadResearch();
  const element = (key) => {
    const ports = Object.fromEntries(["top", "right", "bottom", "left"].map((side) =>
      [side, { dataset: { connectionSide: side }, hidden: false }]));
    return { key, ports, querySelectorAll: () => Object.values(ports) };
  };
  const parent = element("item:parent"), first = element("item:first"), second = element("item:second");
  const elements = new Map([[parent.key, parent], [first.key, first], [second.key, second]]);
  const models = new Map([[first.key, { parentKey: parent.key }], [second.key, { parentKey: parent.key }]]);
  const anchors = new Map([[first.key, { fromSide: "top", toSide: "bottom" }],
    [second.key, { fromSide: "top", toSide: "top" }]]);
  context.updateResearchConnectionSourcePorts(elements, anchors, models);
  assert.equal(parent.ports.top.hidden, true);
  assert.equal(parent.ports.right.hidden, false);
  assert.equal(first.ports.bottom.hidden, true);
  assert.equal(second.ports.top.hidden, true);
  anchors.set(first.key, { fromSide: "right", toSide: "left" });
  anchors.set(second.key, { fromSide: "right", toSide: "top" });
  context.updateResearchConnectionSourcePorts(elements, anchors, models);
  assert.equal(parent.ports.top.hidden, false);
  assert.equal(parent.ports.right.hidden, true);
  assert.equal(first.ports.bottom.hidden, false);
  assert.equal(first.ports.left.hidden, true);
  context.updateResearchConnectionSourcePorts(elements, new Map(), models);
  assert.equal(parent.ports.right.hidden, false);
  assert.equal(first.ports.left.hidden, false);
  context.updateResearchConnectionSourcePorts(elements, new Map([[first.key, { fromSide: "left", toSide: "right" }]]),
    models, new Map([[first.key, second.key]]));
  assert.equal(second.ports.left.hidden, true);
  assert.equal(parent.ports.left.hidden, false);
});

test("sticker connectors switch to top and bottom when children move vertically", () => {
  const context = loadResearch();
  const path = context.window.MentorResearchGeometry.connectionPath;
  const anchors = context.window.MentorResearchGeometry.connectionAnchors({ x: 100, y: 100, width: 200, height: 100 }, { x: 400, y: 110, width: 200, height: 100 });
  assert.match(context.getResearchCanvasDragConnectionPath(anchors, "parent", { x: 500, y: 350 }), /^M 500 350 C .* 400 160$/);
  assert.match(context.getResearchCanvasDragConnectionPath(anchors, "child", { x: 500, y: 350 }), /^M 300 150 C .* 500 350$/);
  const parent = { x: 100, y: 100, width: 200, height: 100 };
  assert.match(path(parent, { x: 120, y: 350, width: 200, height: 100 }), /^M 200 200 C .* 220 350$/);
  assert.match(path(parent, { x: 120, y: -150, width: 200, height: 100 }), /^M 200 100 C .* 220 -50$/);
  assert.match(path(parent, { x: 400, y: 110, width: 200, height: 100 }), /^M 300 150 C .* 400 160$/);
});

test("explicit sticker connection sides use four edge ports and preserve legacy paths", () => {
  const geometry = loadResearch().window.MentorResearchGeometry;
  const parent = { x: 100, y: 100, width: 200, height: 100 };
  const child = { x: 500, y: 350, width: 100, height: 100 };
  assert.equal(geometry.connectionPath(parent, child), geometry.connectionPath(parent, child, {}));
  const endpoints = {
    top: [200, 100], right: [300, 150], bottom: [200, 200], left: [100, 150]
  };
  for (const side of Object.keys(endpoints)) {
    const anchors = geometry.connectionAnchors(parent, child, { parent: side, child: side });
    assert.deepEqual([anchors.from.x, anchors.from.y], endpoints[side]);
    assert.equal(anchors.fromSide, side);
    assert.equal(anchors.toSide, side);
    assert.match(geometry.connectionPath(parent, child, { parent: side, child: side }), /^M /);
  }
  assert.equal(geometry.nearestConnectionSide({ left: 0, top: 0, right: 200, bottom: 100, width: 200, height: 100 }, 190, 50), "right");
  const scaled = geometry.connectionAnchors({ x: 100, y: 100, width: 100, height: 50 }, { x: 260, y: 100, width: 50, height: 50 }, { parent: "bottom", child: "left" });
  assert.deepEqual([scaled.from.x, scaled.from.y, scaled.to.x, scaled.to.y], [150, 150, 260, 125]);
});

test("manual connection sides survive draws until a card crosses sectors", () => {
  const context = loadResearch();
  const state = vm.runInContext("researchViewState", context);
  const saved = { parent: "top", child: "bottom" };
  state.currentIdea = { id: "idea-route", pathData: { researchCanvasItems: [
    { id: "parent", type: "note", title: "Parent" },
    { id: "child", type: "note", title: "Child", canvasParentKey: "item:parent", canvasConnectionSides: saved }
  ] } };
  const parent = { dataset: { cardKey: "item:parent" }, style: { left: "100px", top: "100px" }, offsetWidth: 200, offsetHeight: 100, hidden: false };
  const child = { dataset: { cardKey: "item:child" }, style: { left: "420px", top: "100px" }, offsetWidth: 200, offsetHeight: 100, hidden: false };
  const svg = { setAttribute() {}, innerHTML: "" };
  const canvas = { clientWidth: 800, clientHeight: 600, querySelector: () => svg, querySelectorAll: () => [parent, child] };
  context.drawResearchCanvasConnections(canvas);
  const before = context.window.MentorResearchGeometry.connectionAnchors(
    { x: 100, y: 100, ...context.getResearchVisualCardSize(parent) },
    { x: 420, y: 100, ...context.getResearchVisualCardSize(child) }, saved);
  assert.match(svg.innerHTML, new RegExp(`M ${before.from.x} ${before.from.y} C`));
  assert.deepEqual(saved, { parent: "top", child: "bottom" });
  state.currentIdea.pathData.researchCanvasItems[1].canvasConnectionSides = { parent: "right", child: "left" };
  const rectOf = (element) => ({ x: parseFloat(element.style.left), y: parseFloat(element.style.top),
    width: element.offsetWidth, height: element.offsetHeight });
  const sectors = context.captureResearchConnectionSectors([["item:child", "item:parent"]],
    new Map([["item:child", child], ["item:parent", parent]]), rectOf, new Set(["item:child"]));
  assert.equal(Object.keys(context.changedResearchConnectionSides(sectors, rectOf)).length, 0);
  child.style.left = "100px";
  child.style.top = "-200px";
  canvas._researchConnectionSideOverrides = context.changedResearchConnectionSides(sectors, rectOf);
  assert.deepEqual({ ...canvas._researchConnectionSideOverrides["item:child"] }, { parent: "top", child: "bottom" });
  context.drawResearchCanvasConnections(canvas);
  assert.deepEqual(state.currentIdea.pathData.researchCanvasItems[1].canvasConnectionSides, { parent: "right", child: "left" });
  child.style.left = "420px";
  child.style.top = "100px";
  const parentSectors = context.captureResearchConnectionSectors([["item:child", "item:parent"]],
    new Map([["item:child", child], ["item:parent", parent]]), rectOf, new Set(["item:parent"]));
  parent.style.left = "800px";
  assert.deepEqual({ ...context.changedResearchConnectionSides(parentSectors, rectOf)["item:child"] },
    { parent: "left", child: "right" });
});

test("moved connection sides persist with position and roll back together", async () => {
  const idea = { id: "idea-move-sides", pathData: { researchDirections: [{ id: "d1", references: [] }],
    researchCanvasGroups: [{ id: "g1", directionId: "d1", memberKeys: ["item:child"], x: 0, y: 0 }],
    researchCanvasItems: [
      { id: "parent", directionId: "d1", type: "note" },
      { id: "child", directionId: "d1", type: "note", canvasParentKey: "item:parent",
        canvasConnectionSides: { parent: "right", child: "left" } }
    ], researchCanvasPositions: { "item:child": { x: 420, y: 100 } } } };
  let persisted = structuredClone(idea);
  let allowSave = true;
  const windowStub = { matchMedia: () => ({ matches: false }), MentorI18n: { t: (key, params, fallback) => fallback || key },
    MentorData: { repositories: { ideas: {} } }, MentorIdeasDurableSave: { commit: async ({ nextIdeas, onSuccess }) => {
      if (allowSave) { persisted = structuredClone(nextIdeas[0]); onSuccess(); }
      return { ok: allowSave, ideas: [structuredClone(persisted)] };
    } } };
  const context = vm.createContext({ window: windowStub, console, Date, CustomEvent: class {} });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "brainstorming.js"), "utf8"), context);
  windowStub.brainstormingState.ideas = [idea];
  context.renderPathWorkspace = () => {};
  assert.equal(await context.saveResearchCanvasMove("idea-move-sides", { "item:child": { x: 100, y: -200 } },
    { "item:child": { parent: "top", child: "bottom" } }, "",
    [{ id: "g1", directionId: "d1", memberKeys: ["item:child"], x: 100, y: -300 }]), true);
  assert.deepEqual(persisted.pathData.researchCanvasPositions["item:child"], { x: 100, y: -200 });
  assert.deepEqual(persisted.pathData.researchCanvasItems[1].canvasConnectionSides, { parent: "top", child: "bottom" });
  assert.equal(persisted.pathData.researchCanvasGroups[0].x, 100);
  const reloaded = loadResearch();
  const reloadedState = vm.runInContext("researchViewState", reloaded);
  reloadedState.currentIdea = structuredClone(persisted);
  assert.deepEqual({ ...reloaded.getResearchCanvasCards(reloadedState.currentIdea)[1].canvasConnectionSides },
    { parent: "top", child: "bottom" });
  allowSave = false;
  assert.equal(await context.saveResearchCanvasMove("idea-move-sides", { "item:child": { x: -300, y: 100 } },
    { "item:child": { parent: "left", child: "right" } }, "",
    [{ id: "g1", directionId: "d1", memberKeys: ["item:child"], x: -300, y: 0 }]), false);
  assert.deepEqual({ ...idea.pathData.researchCanvasPositions["item:child"] }, { x: 100, y: -200 });
  assert.deepEqual({ ...idea.pathData.researchCanvasItems[1].canvasConnectionSides }, { parent: "top", child: "bottom" });
  assert.equal(idea.pathData.researchCanvasGroups[0].x, 100);
});

test("connection targets never select the side opposite the fixed endpoint", () => {
  const geometry = loadResearch().window.MentorResearchGeometry;
  const rect = { left: 0, top: 0, right: 200, bottom: 100, width: 200, height: 100 };
  for (const [fixed, opposite, point] of [
    ["left", "right", [200, 50]], ["right", "left", [0, 50]],
    ["top", "bottom", [100, 100]], ["bottom", "top", [100, 0]]
  ]) {
    assert.equal(geometry.oppositeConnectionSide(fixed), opposite);
    assert.notEqual(geometry.nearestAllowedConnectionSide(rect, ...point, opposite), opposite);
  }
  assert.equal(geometry.nearestAllowedConnectionSide(rect, 200, 50, "right"), "top");
});

test("new connections can target all four sides while only the moving endpoint has a short preview tangent", () => {
  const geometry = loadResearch().window.MentorResearchGeometry;
  const rect = { left: 0, top: 0, right: 200, bottom: 100, width: 200, height: 100 };
  for (const [side, point] of Object.entries({ top: [100, 0], right: [200, 50], bottom: [100, 100], left: [0, 50] })) {
    assert.equal(geometry.nearestAllowedConnectionSide(rect, ...point, ""), side);
  }
  const anchors = {
    from: { x: 100, y: 50 }, to: { x: 600, y: 50 }, fromSide: "left", toSide: "right", explicit: true
  };
  assert.equal(geometry.connectionPathFromAnchors(anchors), "M 100 50 C -125 50, 825 50, 600 50");
  assert.equal(geometry.connectionPathFromAnchors(anchors, "parent"), "M 100 50 C 72 50, 825 50, 600 50");
  assert.equal(geometry.connectionPathFromAnchors(anchors, "child"), "M 100 50 C -125 50, 628 50, 600 50");
  const context = loadResearch();
  context.document = { elementsFromPoint: () => [] };
  const target = { getBoundingClientRect: () => rect };
  for (const [side, point] of Object.entries({ top: [100, 0], right: [200, 50], bottom: [100, 100], left: [0, 50] })) {
    assert.equal(context.getResearchCanvasPointerSide(target, ...point), side);
  }
});

test("original connection handle magnet covers its outer half but leaves blank canvas detachable", () => {
  const context = loadResearch();
  const bounds = { left: 100, top: 100, width: 40, height: 40 };
  assert.equal(context.isResearchConnectionOriginalHandleZone(120, 120, bounds), true);
  assert.equal(context.isResearchConnectionOriginalHandleZone(120, 102, bounds), true);
  assert.equal(context.isResearchConnectionOriginalHandleZone(120, 100, bounds), false);
  assert.equal(context.isResearchConnectionOriginalHandleZone(160, 120, bounds), false);
});

test("coincident parent connection handles become one child chooser", () => {
  const context = loadResearch();
  const handles = [];
  const layer = { querySelectorAll: () => handles, appendChild: (button) => handles.push(button) };
  context.document = { createElement: () => ({ dataset: {}, style: {}, classList: { contains: () => false, add() {}, remove() {} }, setAttribute() {}, addEventListener() {} }) };
  const anchors = new Map([
    ["item:first", { from: { x: 20, y: 40 }, to: { x: 80, y: 40 }, fromSide: "right", toSide: "left" }],
    ["item:second", { from: { x: 20, y: 40 }, to: { x: 80, y: 80 }, fromSide: "right", toSide: "left" }],
    ["item:third", { from: { x: 20, y: 40 }, to: { x: 80, y: 120 }, fromSide: "right", toSide: "left" }]
  ]);
  const models = new Map(Array.from(anchors.keys(), (key) => [key, { parentKey: "item:parent" }]));
  context.renderResearchConnectionHandles(layer, anchors, models);
  assert.equal(handles.length, 4);
  const stack = handles.find((button) => button.dataset.researchAction === "open-connection-stack");
  assert.deepEqual(Array.from(stack._researchChildKeys), ["item:first", "item:second", "item:third"]);
  assert.equal(stack.dataset.endpoint, "parent");
  assert.equal(stack.dataset.connectionSide, "right");
});

test("drop target lookup finds the sticker under a dragged sticker", () => {
  const context = loadResearch();
  const state = vm.runInContext("researchViewState", context);
  state.currentIdea = { pathData: { researchCanvasItems: [
    { id: "dragged", type: "note" }, { id: "target", type: "note" }
  ] } };
  const viewport = { getBoundingClientRect: () => ({ left: 0, top: 0, right: 800, bottom: 600 }) };
  const canvas = {};
  viewport.querySelector = () => canvas;
  canvas.contains = () => true;
  const element = (key) => ({ dataset: { cardKey: key }, closest: () => ({ dataset: { cardKey: key } }) });
  context.document = { elementsFromPoint: () => [element("item:dragged"), element("item:target")] };
  assert.equal(context.getResearchCanvasDropParentKey({ querySelector: () => viewport }, 200, 200, "item:dragged"), "item:target");
  context.document.elementsFromPoint = () => [];
  assert.equal(context.getResearchCanvasDropParentKey({ querySelector: () => viewport }, 200, 200), "");
});

test("resizing stickers keeps their current canvas positions", () => {
  const context = loadResearch();
  const state = vm.runInContext("researchViewState", context);
  state.currentIdea = { id: "idea-1", pathData: { researchCanvasItems: [{ id: "one", type: "note", title: "Note" }] } };
  state.cardZoomByIdea["idea-1"] = 1.2;
  const card = { dataset: { cardKey: "item:one" }, style: { left: "123px", top: "145px" }, offsetWidth: 224, offsetHeight: 160 };
  const css = new Map();
  const canvas = {
    clientWidth: 800,
    clientHeight: 1000,
    style: { setProperty: (key, value) => css.set(key, value) },
    querySelectorAll: () => [card],
    querySelector: () => ({ setAttribute() {}, innerHTML: "" })
  };

  context.layoutResearchCanvas(canvas, true);
  assert.equal(css.get("--research-card-zoom"), "1.2");
  assert.equal(card.style.left, "123px");
  assert.equal(card.style.top, "145px");
});

test("all reference links remain available, including links after the fourth", () => {
  const context = loadResearch();
  const links = ["https://example.com/a,b", "https://example.org/2", "https://example.net/3", "https://example.edu/4", "https://example.io/5"];
  const reference = { id: "reference-1", title: "Sources", link: links.join("\n") };
  const idea = { id: "idea-1", pathData: { researchDirections: [{ id: "direction-1", references: [reference] }] } };
  const card = context.getResearchCanvasCards(idea)[0];
  const modal = context.renderResearchReferenceModal(reference);
  const cardHtml = context.renderResearchCanvasCard(card);

  assert.equal(card.urls.length, 5);
  for (const link of links) {
    assert.ok(modal.includes(link));
    assert.ok(cardHtml.includes(link));
  }
});

test("canvas coordinates and new cards use the durable ideas save path", async () => {
  const idea = { id: "idea-1", description: "Existing description", pathData: { researchDirections: [] } };
  let savedIdeas;
  const windowStub = {
    matchMedia: () => ({ matches: false }),
    MentorI18n: { t: (key, params, fallback) => fallback || key },
    MentorData: { repositories: { ideas: {} } },
    MentorIdeasDurableSave: {
      commit: async ({ nextIdeas, onSuccess }) => {
        savedIdeas = structuredClone(nextIdeas);
        onSuccess();
        return { ok: true };
      }
    }
  };
  const context = vm.createContext({ window: windowStub, console, Date, CustomEvent: class {} });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "brainstorming.js"), "utf8"), context);
  windowStub.brainstormingState.ideas = [idea];

  assert.equal(await context.saveResearchCanvasPosition("idea-1", "reference:direction-1:reference-1", 83.6, 151.2), true);
  assert.equal(savedIdeas[0].pathData.researchCanvasPositions["reference:direction-1:reference-1"].x, 84);
  assert.equal(savedIdeas[0].pathData.researchCanvasPositions["reference:direction-1:reference-1"].y, 151);
  assert.equal(await context.saveResearchCanvasPosition("idea-1", "reference:direction-1:reference-1", -483.6, -351.2), true);
  assert.equal(savedIdeas[0].pathData.researchCanvasPositions["reference:direction-1:reference-1"].x, -484);
  assert.equal(savedIdeas[0].pathData.researchCanvasPositions["reference:direction-1:reference-1"].y, -351);

  context.renderPathWorkspace = () => {};
  assert.equal(await context.saveResearchCanvasItem("idea-1", { type: "note", title: "Finding", text: "Useful detail" }), true);
  assert.equal(savedIdeas[0].pathData.researchCanvasItems[0].title, "Finding");
  assert.equal(savedIdeas[0].pathData.researchCanvasItems[0].text, "Useful detail");
});

test("adding a linked note retains the reference and its existing notes", async () => {
  const idea = {
    id: "idea-1",
    description: "Existing description",
    pathData: { researchDirections: [{ id: "direction-1", references: [{ id: "reference-1", title: "Part", notes: [{ id: "note-1", title: "Old", body: "Keep this" }] }] }] }
  };
  let savedIdeas;
  const windowStub = {
    matchMedia: () => ({ matches: false }),
    MentorI18n: { t: (key, params, fallback) => fallback || key },
    MentorData: { repositories: { ideas: {} } },
    MentorIdeasDurableSave: { commit: async ({ nextIdeas, onSuccess }) => {
      savedIdeas = structuredClone(nextIdeas);
      onSuccess();
      return { ok: true };
    } }
  };
  const context = vm.createContext({ window: windowStub, console, Date, CustomEvent: class {} });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "brainstorming.js"), "utf8"), context);
  windowStub.brainstormingState.ideas = [idea];
  context.renderPathWorkspace = () => {};

  assert.equal(await context.addResearchCanvasLinkedNote("idea-1", "direction-1", "reference-1", { title: "New", body: "Add this" }), true);
  const notes = savedIdeas[0].pathData.researchDirections[0].references[0].notes;
  assert.equal(notes.length, 2);
  assert.equal(notes[0].body, "Keep this");
  assert.equal(notes[1].body, "Add this");
});

test("legacy notes receive stable IDs before canvas positions are saved", () => {
  const context = vm.createContext({
    window: { matchMedia: () => ({ matches: false }), MentorI18n: { t: (key, params, fallback) => fallback || key } },
    Date,
    console
  });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "brainstorming.js"), "utf8"), context);
  const idea = {
    description: "Existing description",
    pathData: { researchDirections: [{ id: "direction-1", notes: ["First", "Second"], references: [{ id: "reference-1", notes: ["One", "Two"] }] }] }
  };
  context.getPathData(idea);
  const direction = idea.pathData.researchDirections[0];
  const secondDirectionNoteId = direction.notes[1].id;
  const secondReferenceNoteId = direction.references[0].notes[1].id;
  direction.notes.shift();
  direction.references[0].notes.shift();
  context.getPathData(idea);
  assert.equal(direction.notes[0].id, secondDirectionNoteId);
  assert.equal(direction.references[0].notes[0].id, secondReferenceNoteId);
});

test("canvas graph counts direct children and hides the complete collapsed branch", () => {
  const context = loadResearch();
  const idea = { id: "idea-1", pathData: {
    researchDirections: [{ id: "direction-1", references: [{ id: "reference-1", title: "Source", notes: [{ id: "note-1", title: "Note", body: "Keep" }] }] }],
    researchCanvasItems: [
      { id: "child", type: "note", title: "Child", canvasParentKey: "reference:direction-1:reference-1" },
      { id: "grandchild", type: "link", title: "Grandchild", canvasParentKey: "item:child" },
      { id: "orphan", type: "note", title: "Orphan", canvasParentKey: "item:missing" }
    ],
    researchCanvasCollapsed: { "reference:direction-1:reference-1": true }
  } };
  const cards = context.getResearchCanvasCards(idea);
  const graph = context.getResearchCanvasGraph(cards, idea.pathData.researchCanvasCollapsed);
  assert.equal(graph.childrenByKey.get("reference:direction-1:reference-1").length, 2);
  assert.equal(graph.hiddenKeys.has("linked-note:direction-1:reference-1:note-1"), true);
  assert.equal(graph.hiddenKeys.has("item:child"), true);
  assert.equal(graph.hiddenKeys.has("item:grandchild"), true);
  assert.equal(graph.hiddenKeys.has("item:orphan"), false);
  const html = context.window.MentorResearch.renderResearchView(idea);
  assert.match(html, /data-research-action="toggle-canvas-children"/);
  assert.match(html, /data-card-key="item:grandchild"[^>]*tabindex="-1" hidden/);
});

test("canvas graph ignores cyclic relationships", () => {
  const context = loadResearch();
  const graph = context.getResearchCanvasGraph([
    { key: "item:a", parentKey: "item:b" },
    { key: "item:b", parentKey: "item:a" },
    { key: "item:c", parentKey: "item:c" }
  ], { "item:a": true });
  assert.equal(graph.parentByKey.size, 0);
  assert.equal(graph.hiddenKeys.size, 0);
});

test("new child cards and collapse state persist without removing card content", async () => {
  const idea = { id: "idea-1", description: "Existing description", pathData: { researchDirections: [] } };
  let savedIdeas;
  const windowStub = {
    matchMedia: () => ({ matches: false }),
    MentorI18n: { t: (key, params, fallback) => fallback || key },
    MentorData: { repositories: { ideas: {} } },
    MentorIdeasDurableSave: { commit: async ({ nextIdeas, onSuccess }) => {
      savedIdeas = structuredClone(nextIdeas);
      onSuccess();
      return { ok: true };
    } }
  };
  const context = vm.createContext({ window: windowStub, console, Date, CustomEvent: class {} });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "brainstorming.js"), "utf8"), context);
  windowStub.brainstormingState.ideas = [idea];
  context.renderPathWorkspace = () => {};
  assert.equal(await context.saveResearchCanvasItem("idea-1", { id: "parent", type: "note", title: "Parent" }), true);
  assert.equal(await context.saveResearchCanvasItem("idea-1", { id: "child", type: "note", title: "Child", canvasParentKey: "item:parent", canvasPosition: { x: 260, y: 120 } }), true);
  assert.equal(await context.saveResearchCanvasFocusPosition("idea-1", "item:parent", "item:child", 840, 260), true);
  assert.equal(await context.saveResearchCanvasFocusPosition("idea-1", "item:parent", "item:parent", 120, 190), true);
  assert.deepEqual(savedIdeas[0].pathData.researchCanvasFocusPositions["item:parent"]["item:parent"], { x: 120, y: 190 });
  assert.deepEqual(savedIdeas[0].pathData.researchCanvasFocusPositions["item:parent"]["item:child"], { x: 840, y: 260 });
  assert.deepEqual(savedIdeas[0].pathData.researchCanvasItems[1].canvasPosition, { x: 260, y: 120 });
  assert.equal(await context.saveResearchCanvasCollapsed("idea-1", "item:parent", true), true);
  assert.equal(savedIdeas[0].pathData.researchCanvasItems.length, 2);
  assert.equal(savedIdeas[0].pathData.researchCanvasItems[1].canvasParentKey, "item:parent");
  assert.equal(savedIdeas[0].pathData.researchCanvasCollapsed["item:parent"], true);
  assert.equal(await context.saveResearchCanvasCollapsed("idea-1", "item:parent", false), true);
  assert.equal(savedIdeas[0].pathData.researchCanvasCollapsed["item:parent"], undefined);
  idea.pathData.researchDirections.push({ id: "direction-1", title: "Sources", references: [] });
  assert.equal(await context.addResearchReferenceToDirection("idea-1", "direction-1", { id: "reference-1", title: "Source", canvasParentKey: "item:parent", canvasPosition: { x: 310, y: 140 } }), true);
  assert.equal(savedIdeas[0].pathData.researchDirections[0].references[0].canvasParentKey, "item:parent");
});

test("reparent and detach save one relationship, refresh focus graph, and roll back failed saves", async () => {
  const idea = { id: "idea-1", pathData: {
    researchDirections: [{ id: "d1", references: [{ id: "ref", title: "Reference" }] }, { id: "d2", references: [{ id: "other", title: "Other" }] }],
    researchCanvasItems: [
      { id: "old", directionId: "d1", type: "note", title: "Old" },
      { id: "new", directionId: "d1", type: "note", title: "New" },
      { id: "child", directionId: "d1", type: "note", title: "Child", canvasParentKey: "item:old" },
      { id: "grandchild", directionId: "d1", type: "note", title: "Grandchild", canvasParentKey: "item:child" }
    ],
    researchCanvasFocusPositions: { "item:old": { "item:child": { x: 100, y: 100 }, "item:grandchild": { x: 200, y: 200 } } },
    researchCanvasCollapsed: { "item:new": true },
    researchCanvasPositions: { "item:child": { x: 10, y: 20 } }
  } };
  let allowSave = true;
  let saves = 0;
  let persisted = structuredClone(idea);
  const windowStub = { matchMedia: () => ({ matches: false }), MentorI18n: { t: (key, params, fallback) => fallback || key },
    MentorData: { repositories: { ideas: {} } }, MentorIdeasDurableSave: { commit: async ({ nextIdeas, onSuccess }) => {
      saves++;
      if (allowSave) { persisted = structuredClone(nextIdeas[0]); onSuccess(); }
      return { ok: allowSave, ideas: [structuredClone(persisted)] };
    } } };
  const context = vm.createContext({ window: windowStub, console, Date, CustomEvent: class {} });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "brainstorming.js"), "utf8"), context);
  windowStub.brainstormingState.ideas = [idea];
  context.renderPathWorkspace = () => {};
  assert.equal(await context.saveResearchCanvasParent("idea-1", "item:child", "item:new", { x: 210, y: 220 }), true);
  assert.equal(idea.pathData.researchCanvasItems[2].canvasParentKey, "item:new");
  assert.deepEqual({ ...idea.pathData.researchCanvasPositions["item:child"] }, { x: 210, y: 220 });
  assert.equal(idea.pathData.researchCanvasCollapsed["item:new"], undefined);
  assert.equal(idea.pathData.researchCanvasFocusPositions["item:old"]["item:child"], undefined);
  assert.equal(idea.pathData.researchCanvasFocusPositions["item:old"]["item:grandchild"], undefined);
  const research = loadResearch();
  assert.deepEqual(Array.from(research.getResearchCanvasFocusDescendants(idea, "item:old"), (card) => card.key), []);
  assert.deepEqual(Array.from(research.getResearchCanvasFocusDescendants(idea, "item:new"), (card) => card.key), ["item:child", "item:grandchild"]);
  assert.equal(await context.saveResearchCanvasParent("idea-1", "item:new", "item:grandchild"), false);
  assert.equal(await context.saveResearchCanvasParent("idea-1", "item:child", "reference:d2:other"), false);
  allowSave = false;
  assert.equal(await context.saveResearchCanvasParent("idea-1", "item:child", "", { x: 500, y: 600 }), false);
  assert.equal(idea.pathData.researchCanvasItems[2].canvasParentKey, "item:new");
  assert.deepEqual({ ...idea.pathData.researchCanvasPositions["item:child"] }, { x: 210, y: 220 });
  assert.equal(saves, 2);
  allowSave = true;
  assert.equal(await context.saveResearchCanvasParent("idea-1", "item:child", ""), true);
  assert.equal(windowStub.brainstormingState.ideas[0].pathData.researchCanvasItems[2].canvasParentKey, "");
});

test("transferring a child endpoint saves both relationships atomically and rolls back on failure", async () => {
  const idea = { id: "idea-1", pathData: {
    researchDirections: [{ id: "d1", references: [] }, { id: "d2", references: [{ id: "other" }] }],
    researchCanvasItems: [
      { id: "parent", directionId: "d1", type: "note" },
      { id: "old", directionId: "d1", type: "note", canvasParentKey: "item:parent", canvasConnectionSides: { parent: "bottom", child: "top" } },
      { id: "old-child", directionId: "d1", type: "note", canvasParentKey: "item:old" },
      { id: "other-parent", directionId: "d1", type: "note" },
      { id: "target", directionId: "d1", type: "note", canvasParentKey: "item:other-parent", canvasConnectionSides: { parent: "left", child: "right" } },
      { id: "target-child", directionId: "d1", type: "note", canvasParentKey: "item:target" }
    ],
    researchCanvasFocusPositions: {
      "item:parent": { "item:old": { x: 1, y: 2 }, "item:old-child": { x: 3, y: 4 } },
      "item:other-parent": { "item:target": { x: 5, y: 6 }, "item:target-child": { x: 7, y: 8 } },
      "item:target": { "item:target-child": { x: 9, y: 10 } }
    }
  } };
  let allowSave = true;
  let saves = 0;
  let persisted = structuredClone(idea);
  const windowStub = { matchMedia: () => ({ matches: false }), MentorI18n: { t: (key, params, fallback) => fallback || key },
    MentorData: { repositories: { ideas: {} } }, MentorIdeasDurableSave: { commit: async ({ onSuccess }) => {
      saves++;
      if (allowSave) { persisted = structuredClone(idea); onSuccess(); }
      return { ok: allowSave, ideas: [structuredClone(persisted)] };
    } } };
  const context = vm.createContext({ window: windowStub, console, Date, CustomEvent: class {} });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "brainstorming.js"), "utf8"), context);
  windowStub.brainstormingState.ideas = [idea];
  context.renderPathWorkspace = () => {};
  assert.equal(await context.transferResearchCanvasChild("idea-1", "item:old", "item:target", { child: "left" }), true);
  assert.equal(saves, 1);
  assert.equal(idea.pathData.researchCanvasItems[1].canvasParentKey, "");
  assert.equal(idea.pathData.researchCanvasItems[4].canvasParentKey, "item:parent");
  assert.equal(idea.pathData.researchCanvasItems[1].canvasConnectionSides, undefined);
  assert.deepEqual({ ...idea.pathData.researchCanvasItems[4].canvasConnectionSides }, { parent: "bottom", child: "left" });
  assert.equal(idea.pathData.researchCanvasFocusPositions["item:parent"]["item:old"], undefined);
  assert.equal(idea.pathData.researchCanvasFocusPositions["item:parent"]["item:old-child"], undefined);
  assert.equal(idea.pathData.researchCanvasFocusPositions["item:other-parent"]["item:target"], undefined);
  assert.equal(idea.pathData.researchCanvasFocusPositions["item:target"]["item:target-child"].x, 9);
  assert.equal(await context.transferResearchCanvasChild("idea-1", "item:target", "item:parent"), false);
  assert.equal(await context.transferResearchCanvasChild("idea-1", "item:target", "reference:d2:other"), false);
  const beforeFailure = structuredClone(idea.pathData.researchCanvasFocusPositions);
  allowSave = false;
  assert.equal(await context.transferResearchCanvasChild("idea-1", "item:target", "item:old"), false);
  assert.equal(saves, 2);
  assert.equal(idea.pathData.researchCanvasItems[4].canvasParentKey, "item:parent");
  assert.deepEqual({ ...idea.pathData.researchCanvasItems[4].canvasConnectionSides }, { parent: "bottom", child: "left" });
  assert.equal(idea.pathData.researchCanvasItems[1].canvasParentKey, "");
  assert.deepEqual(JSON.parse(JSON.stringify(idea.pathData.researchCanvasFocusPositions)), beforeFailure);
});

test("legacy notes without saved IDs can receive a child sticker", async () => {
  const idea = { id: "idea-legacy", pathData: {
    researchDirections: [{ id: "d1", references: [{ id: "ref", notes: ["Existing note"] }], notes: ["Direction note"] }],
    researchCanvasItems: [{ id: "child", directionId: "d1", type: "note", title: "Child" }]
  } };
  const windowStub = { matchMedia: () => ({ matches: false }), MentorI18n: { t: (key, params, fallback) => fallback || key },
    MentorData: { repositories: { ideas: {} } }, MentorIdeasDurableSave: { commit: async ({ nextIdeas, onSuccess }) => {
      onSuccess();
      return { ok: true, ideas: nextIdeas };
    } } };
  const context = vm.createContext({ window: windowStub, console, Date, CustomEvent: class {} });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "brainstorming.js"), "utf8"), context);
  windowStub.brainstormingState.ideas = [idea];
  context.renderPathWorkspace = () => {};
  assert.equal(await context.saveResearchCanvasParent("idea-legacy", "item:child", "linked-note:d1:ref:note_0"), true);
  assert.equal(idea.pathData.researchCanvasItems[0].canvasParentKey, "linked-note:d1:ref:note_0");
  assert.equal(await context.saveResearchCanvasParent("idea-legacy", "item:child", "direction-note:d1:0"), true);
  assert.equal(idea.pathData.researchCanvasItems[0].canvasParentKey, "direction-note:d1:0");
});

test("stable reference notes, direction notes and finance cards can own stickers", async () => {
  const idea = { id: "idea-1", pathData: {
    researchDirections: [{ id: "d1", references: [{ id: "ref", notes: [{ id: "note-1", title: "Note" }] }], notes: [{ id: "direction-note", title: "Direction note" }] }],
    researchCanvasItems: [{ id: "child", directionId: "d1", type: "note" }]
  } };
  const windowStub = { matchMedia: () => ({ matches: false }), MentorI18n: { t: (key, params, fallback) => fallback || key },
    getFinancialResearchComparisonOptions: () => [{ id: "stable", title: "Finance" }, { title: "Unstable" }],
    MentorData: { repositories: { ideas: {} } }, MentorIdeasDurableSave: { commit: async ({ onSuccess }) => { onSuccess(); return { ok: true }; } } };
  const context = vm.createContext({ window: windowStub, console, Date, CustomEvent: class {} });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "brainstorming.js"), "utf8"), context);
  windowStub.brainstormingState.ideas = [idea];
  context.renderPathWorkspace = () => {};
  for (const parentKey of ["linked-note:d1:ref:note-1", "direction-note:d1:direction-note", "finance:stable"]) {
    assert.equal(await context.saveResearchCanvasParent("idea-1", "item:child", parentKey), true);
    assert.equal(idea.pathData.researchCanvasItems[0].canvasParentKey, parentKey);
  }
  assert.equal(await context.saveResearchCanvasParent("idea-1", "item:child", "finance:1"), false);
  assert.equal(await context.saveResearchCanvasItem("idea-1", { id: "image", type: "image", directionId: "d1", canvasParentKey: "direction-note:d1:direction-note", image: "https://example.com/image.jpg" }), true);
  assert.equal(idea.pathData.researchCanvasItems[1].canvasParentKey, "direction-note:d1:direction-note");
});

test("a child can become a parent without changing its incoming side; failed side changes roll back", async () => {
  const idea = { id: "idea-sides", pathData: { researchDirections: [{ id: "d1", references: [] }],
    researchCanvasItems: [
      { id: "root", directionId: "d1", type: "note" },
      { id: "middle", directionId: "d1", type: "note", canvasParentKey: "item:root", canvasConnectionSides: { parent: "bottom", child: "top" } },
      { id: "leaf", directionId: "d1", type: "note" }
    ] } };
  let allowSave = true;
  let persisted = structuredClone(idea);
  const windowStub = { matchMedia: () => ({ matches: false }), MentorI18n: { t: (key, params, fallback) => fallback || key },
    MentorData: { repositories: { ideas: {} } }, MentorIdeasDurableSave: { commit: async ({ nextIdeas, onSuccess }) => {
      if (allowSave) { persisted = structuredClone(nextIdeas[0]); onSuccess(); }
      return { ok: allowSave, ideas: [structuredClone(persisted)] };
    } } };
  const context = vm.createContext({ window: windowStub, console, Date, CustomEvent: class {} });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "brainstorming.js"), "utf8"), context);
  windowStub.brainstormingState.ideas = [idea];
  context.renderPathWorkspace = () => {};
  assert.equal(await context.saveResearchCanvasParent("idea-sides", "item:leaf", "item:middle", null, { parent: "left", child: "right" }), true);
  assert.equal(idea.pathData.researchCanvasItems[1].canvasParentKey, "item:root");
  assert.deepEqual({ ...idea.pathData.researchCanvasItems[1].canvasConnectionSides }, { parent: "bottom", child: "top" });
  assert.deepEqual({ ...idea.pathData.researchCanvasItems[2].canvasConnectionSides }, { parent: "left", child: "right" });
  assert.equal(await context.saveResearchCanvasParent("idea-sides", "item:middle", "item:leaf", null, { parent: "top" }), false);
  assert.equal(await context.saveResearchCanvasParent("idea-sides", "item:leaf", "item:root", null, { parent: "diagonal" }), false);
  allowSave = false;
  assert.equal(await context.saveResearchCanvasParent("idea-sides", "item:leaf", "item:root", null, { parent: "top" }), false);
  assert.equal(idea.pathData.researchCanvasItems[2].canvasParentKey, "item:middle");
  assert.deepEqual({ ...idea.pathData.researchCanvasItems[2].canvasConnectionSides }, { parent: "left", child: "right" });
});

test("Auto in the connection dialog clears explicit sides on the same parent", async () => {
  const idea = { id: "idea-auto", pathData: { researchDirections: [{ id: "d1", references: [] }],
    researchCanvasItems: [
      { id: "parent", directionId: "d1", type: "note" },
      { id: "child", directionId: "d1", type: "note", canvasParentKey: "item:parent", canvasConnectionSides: { parent: "left", child: "right" } }
    ] } };
  let persisted = structuredClone(idea);
  const windowStub = { matchMedia: () => ({ matches: false }), MentorI18n: { t: (key, params, fallback) => fallback || key },
    MentorData: { repositories: { ideas: {} } }, MentorIdeasDurableSave: { commit: async ({ nextIdeas, onSuccess }) => {
      persisted = structuredClone(nextIdeas[0]); onSuccess(); return { ok: true };
    } } };
  const context = vm.createContext({ window: windowStub, console, Date, CustomEvent: class {} });
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "brainstorming.js"), "utf8"), context);
  windowStub.brainstormingState.ideas = [idea];
  context.renderPathWorkspace = () => {};
  assert.equal(await context.saveResearchCanvasParent("idea-auto", "item:child", "item:parent", null, { parent: null, child: null }), true);
  assert.equal(persisted.pathData.researchCanvasItems[1].canvasConnectionSides, undefined);
  assert.equal(await context.saveResearchCanvasParent("idea-auto", "item:child", "item:parent", null, { parent: "top", child: "bottom" }), true);
  assert.equal(await context.saveResearchCanvasParent("idea-auto", "item:child", "item:parent", null, { parent: null }), true);
  assert.deepEqual({ ...persisted.pathData.researchCanvasItems[1].canvasConnectionSides }, { child: "bottom" });
  const research = loadResearch();
  const restored = structuredClone(persisted);
  vm.runInContext("researchViewState", research).currentIdea = restored;
  const child = research.getResearchCanvasCards(restored).find((card) => card.key === "item:child");
  assert.deepEqual({ ...child.canvasConnectionSides }, { child: "bottom" });
  assert.equal(await context.saveResearchCanvasParent("idea-auto", "item:child", "item:parent", null, { parent: "diagonal" }), false);
});

test("dragging a sticker connection changes only its parent", async () => {
  const context = loadResearch();
  const idea = { id: "idea-1", pathData: {
    researchDirections: [{ id: "d1", references: [] }],
    researchCanvasItems: [
      { id: "old", directionId: "d1", type: "note", title: "Old" },
      { id: "child", directionId: "d1", type: "note", title: "Child", canvasParentKey: "item:old" },
      { id: "next", directionId: "d1", type: "note", title: "Next" }
    ]
  } };
  context.testIdea = idea;
  vm.runInContext("researchViewState.currentIdea = testIdea", context);
  const classes = () => {
    const values = new Set();
    return {
      add(value) { values.add(value); },
      remove(value) { values.delete(value); },
      toggle(value, enabled) { if (enabled) values.add(value); else values.delete(value); },
      contains(value) { return values.has(value); }
    };
  };
  const listeners = {};
  const sourceCard = { dataset: { cardKey: "item:child", canvasDepthScale: "1" }, style: { left: "30px", top: "40px" }, offsetWidth: 224, offsetHeight: 146 };
  const parentCard = { dataset: { cardKey: "item:old", canvasDepthScale: "1" }, style: { left: "0px", top: "0px" }, offsetWidth: 224, offsetHeight: 146 };
  const nextCard = { dataset: { cardKey: "item:next", canvasDepthScale: "1" }, style: { left: "250px", top: "80px" },
    offsetWidth: 224, offsetHeight: 146, classList: classes(),
    getBoundingClientRect: () => ({ left: 300, right: 400, top: 80, bottom: 180, width: 100, height: 100 }) };
  const handle = { dataset: { cardKey: "item:child", endpoint: "parent" }, style: { left: "25px", top: "30px" }, classList: classes(),
    closest: (selector) => selector === '[data-research-action="change-canvas-parent"]' ? handle : selector.includes('research-canvas-card') ? sourceCard : null,
    getBoundingClientRect: () => ({ left: 69, top: 69, right: 91, bottom: 91, width: 22, height: 22 }),
    setPointerCapture() {}, hasPointerCapture: () => false,
    addEventListener(type, listener) { listeners[type] = listener; }, removeEventListener(type) { delete listeners[type]; } };
  const svg = { querySelectorAll: () => [], appendChild() {} };
  const handleLayer = { appendChild(node) { node.parentElement = this; } };
  const viewport = { clientLeft: 0, clientTop: 0, scrollLeft: 0, scrollTop: 0,
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 800, bottom: 600 }) };
  const canvas = { contains: () => true,
    querySelector: (selector) => selector === "[data-research-connection-handles]" ? handleLayer : svg,
    querySelectorAll: () => [sourceCard, parentCard, nextCard],
    addEventListener(type, listener) { listeners[type] = listener; } };
  const root = { querySelector: () => viewport };
  context.document = {
    elementsFromPoint: (x) => x >= 300 && x < 400 ? [{ closest: () => nextCard }] : x < 150 ? [{ closest: () => sourceCard }] : [],
    createElementNS: () => ({ classList: classes(), setAttribute() {}, remove() {} })
  };
  const saved = [];
  const transfers = [];
  context.bindResearchCanvasConnectionDrag(root, canvas, {
    saveCanvasParent: async (...args) => { saved.push(args); return true; },
    transferCanvasChild: async (...args) => { transfers.push(args); return true; }
  });
  listeners.pointerdown({ button: 0, pointerId: 1, clientX: 80, clientY: 80, target: handle });
  listeners.pointermove({ pointerId: 1, clientX: 280, clientY: 100, preventDefault() {} });
  assert.notEqual(handle.style.left, "25px");
  assert.equal(handle.classList.contains("is-connection-magnet"), true);
  assert.equal(nextCard.classList.contains("is-connection-target"), true);
  await listeners.pointerup({ pointerId: 1, clientX: 280, clientY: 100 });
  assert.deepEqual(saved.map((entry) => entry.slice(0, 2)), [["item:child", "item:next"]]);
  assert.equal(saved[0][3].parent, "top");
  assert.equal(sourceCard.style.left, "30px");
  assert.equal(sourceCard.style.top, "40px");
  assert.equal(handle.style.left, "25px");
  assert.equal(handle.classList.contains("is-connection-magnet"), false);
  assert.equal(nextCard.classList.contains("is-connection-target"), false);
  assert.equal(listeners.pointermove, undefined);
  handle.dataset.endpoint = "child";
  listeners.pointerdown({ button: 0, pointerId: 2, clientX: 80, clientY: 80, target: handle });
  listeners.pointermove({ pointerId: 2, clientX: 280, clientY: 100, preventDefault() {} });
  await listeners.pointerup({ pointerId: 2, clientX: 280, clientY: 100 });
  assert.deepEqual(transfers.map((entry) => entry.slice(0, 2)), [["item:child", "item:next"]]);
  // The fixed parent exits at bottom, so its opposite top edge is excluded.
  assert.equal(transfers[0][2].child, "left");
  listeners.pointerdown({ button: 0, pointerId: 3, clientX: 80, clientY: 80, target: handle });
  listeners.pointermove({ pointerId: 3, clientX: 700, clientY: 100, preventDefault() {} });
  await listeners.pointerup({ pointerId: 3, clientX: 700, clientY: 100 });
  assert.deepEqual(saved[1].slice(0, 2), ["item:child", ""]);
  assert.equal(transfers.length, 1);
  handle.dataset.endpoint = "parent";
  listeners.pointerdown({ button: 0, pointerId: 5, clientX: 80, clientY: 80, target: handle });
  listeners.pointermove({ pointerId: 5, clientX: 204, clientY: 130, preventDefault() {} });
  await listeners.pointerup({ pointerId: 5, clientX: 204, clientY: 130 });
  assert.deepEqual(saved[2].slice(0, 2), ["item:child", ""]);
  listeners.pointerdown({ button: 0, pointerId: 6, clientX: 80, clientY: 80, target: handle });
  listeners.pointermove({ pointerId: 6, clientX: 900, clientY: 130, preventDefault() {} });
  await listeners.pointerup({ pointerId: 6, clientX: 900, clientY: 130 });
  assert.equal(saved.length, 3);
  const originalRow = { appendChild(node) { node.parentElement = this; } };
  const rootHandle = { dataset: { cardKey: "item:old" }, style: { left: "", top: "" },
    parentElement: originalRow, nextSibling: null, classList: classes(),
    getBoundingClientRect: () => ({ left: 9, top: 9, right: 31, bottom: 31, width: 22, height: 22 }),
    setPointerCapture() {}, hasPointerCapture: () => false,
    addEventListener(type, listener) { listeners[type] = listener; }, removeEventListener(type) { delete listeners[type]; } };
  listeners.pointerdown({ button: 0, pointerId: 4, clientX: 20, clientY: 20, target: {
    closest: (selector) => selector === '[data-research-action="change-canvas-parent"]' ? rootHandle : null
  } });
  listeners.pointermove({ pointerId: 4, clientX: 280, clientY: 100, preventDefault() {} });
  assert.equal(rootHandle.parentElement, handleLayer);
  await listeners.pointerup({ pointerId: 4, clientX: 280, clientY: 100 });
  assert.equal(rootHandle.parentElement, originalRow);
  assert.deepEqual(saved[3].slice(0, 2), ["item:old", "item:next"]);
});

test("image and file drag clicks are consumed once before media actions while keyboard clicks remain available", () => {
  const context = loadResearch(), listeners = {};
  const root = { addEventListener(type, handler, capture) { assert.equal(capture, true); listeners[type] = handler; } };
  context.bindResearchStickerSurfaceClickGuard(root);
  const child = {}, surface = { contains: (target) => target === child }, card = {};
  let blocked = 0;
  const click = (target, detail, pointerId) => ({ target, detail, pointerId,
    preventDefault() { blocked++; }, stopPropagation() {}, stopImmediatePropagation() { blocked++; } });
  listeners.click(click(surface, 1, 1));
  assert.equal(blocked, 0);
  root._researchSurfaceDragClick = { surface, card, pointerId: 1 };
  listeners.click(click(surface, 0, -1));
  assert.equal(blocked, 0);
  listeners.click(click(child, 1, 1));
  assert.equal(blocked, 2);
  assert.equal(root._researchSurfaceDragClick, null);
  listeners.click(click(surface, 1, 1));
  assert.equal(blocked, 2);
  root._researchSurfaceDragClick = { surface, card, pointerId: 2 };
  listeners.pointerdown();
  listeners.click(click(surface, 1, 2));
  assert.equal(blocked, 2);
});

test("canvas sticker previews keep each type's card controls and child context", () => {
  const context = loadResearch();
  const graph = context.getResearchCanvasGraph([]);
  for (const type of ["note", "av", "source", "link", "image", "video", "finance"]) {
    const html = context.renderResearchCanvasCard({ key: "item:parent", type, title: "Original", text: "Full content", direction: { id: "direction-1" }, source: "item" }, graph);
    assert.match(html, new RegExp(`class="research-canvas-card is-${type}`));
    assert.match(html, /data-research-action="toggle-card-add-menu"/);
    assert.match(html, /data-parent-key="item:parent" data-direction-id="direction-1"/);
    assert.match(html, /data-research-action="edit-canvas-card"/);
    assert.equal((html.match(/data-research-action="start-canvas-connection"/g) || []).length, 4);
    if (["note", "av", "source", "image", "video"].includes(type)) assert.match(html, /data-research-action="open-canvas-preview"/);
    if (["image", "source"].includes(type)) assert.match(html, /data-sticker-drag-surface/);
    else assert.doesNotMatch(html, /data-sticker-drag-surface/);
  }
  const note = context.renderResearchCanvasCard({ key: "linked-note:d:r:n", type: "note", source: "linked-note", title: "Note" }, graph);
  assert.equal((note.match(/data-research-action="start-canvas-connection"/g) || []).length, 4);
});

test("focus collapse preserves nested flags and ignores ancestors outside its workspace", () => {
  const context = loadResearch();
  const idea = { id: "idea", pathData: {
    researchDirections: [{ id: "direction", references: [] }],
    researchCanvasItems: ["outside", "root", "child", "grandchild"].map((id, index, ids) => ({
      id, directionId: "direction", type: "note", canvasParentKey: index ? "item:" + ids[index - 1] : ""
    })),
    researchCanvasCollapsed: { "item:outside": true, "item:child": true },
    researchCanvasFocusPositions: { "item:root": { "item:child": { x: 900, y: 180 } } }
  } };
  vm.runInContext("researchViewState", context).currentIdea = idea;
  const wrapper = (id) => {
    const span = {}, attributes = {}, classes = new Set();
    const fold = { classList: { toggle(name, on) { on ? classes.add(name) : classes.delete(name); } },
      setAttribute(name, value) { attributes[name] = value; }, querySelector: () => span };
    return { dataset: { focusCardKey: "item:" + id }, style: { left: "900px", top: "180px" },
      attributes, span, classes, querySelector: () => fold };
  };
  const root = wrapper("root"), child = wrapper("child"), grandchild = wrapper("grandchild");
  const preview = { dataset: { cardKey: "item:root" }, querySelectorAll: () => [root, child, grandchild] };
  const positionsBefore = JSON.stringify(idea.pathData.researchCanvasFocusPositions);
  context.setResearchCanvasFocusChildrenVisibility(preview);
  assert.deepEqual([root.hidden, child.hidden, grandchild.hidden], [false, false, true]);
  assert.equal(child.attributes["aria-expanded"], "false");
  assert.equal(child.span.textContent, "◂");
  idea.pathData.researchCanvasCollapsed["item:root"] = true;
  context.setResearchCanvasFocusChildrenVisibility(preview);
  assert.deepEqual([root.hidden, child.hidden, grandchild.hidden], [false, true, true]);
  delete idea.pathData.researchCanvasCollapsed["item:root"];
  context.setResearchCanvasFocusChildrenVisibility(preview);
  assert.deepEqual([root.hidden, child.hidden, grandchild.hidden], [false, false, true]);
  delete idea.pathData.researchCanvasCollapsed["item:child"];
  context.setResearchCanvasFocusChildrenVisibility(preview);
  assert.deepEqual([root.hidden, child.hidden, grandchild.hidden], [false, false, false]);
  assert.equal(child.attributes["aria-expanded"], "true");
  assert.equal(child.style.left, "900px");
  assert.equal(JSON.stringify(idea.pathData.researchCanvasFocusPositions), positionsBefore);
});

test("focus zoom scales only stickers without changing workspace bounds, positions or the main map camera", () => {
  const context = loadResearch(), state = vm.runInContext("researchViewState", context);
  const focus = { positions: { root: { x: 120, y: 200 } } };
  state.canvasFocus = focus;
  const camera = context.getResearchCanvasCamera();
  camera.x = 300; camera.y = -90; camera.zoom = 1.2;
  const before = JSON.stringify({ positions: focus.positions, camera });
  const stage = { style: {} };
  const label = {}, minus = { dataset: { zoomDelta: "-0.1" } }, plus = { dataset: { zoomDelta: "0.1" } };
  const card = { dataset: { focusScale: "0.8" }, style: { width: "560px", left: "120px", top: "200px", setProperty(name, value) { this[name] = value; } }, querySelector: () => null };
  const preview = { dataset: {}, clientWidth: 1200, clientHeight: 800,
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
    querySelector: (selector) => selector.includes("stage") ? stage : label,
    querySelectorAll: (selector) => selector.includes("zoom-canvas-focus") ? [minus, plus] : selector === "[data-focus-card-key]" ? [card] : [] };
  assert.equal(context.getResearchCanvasFocusZoom(preview), 0.7);
  context.setResearchCanvasFocusZoom(preview, 0.1);
  assert.equal(stage.style.transform, undefined);
  assert.equal(card.dataset.focusScale, "0.4");
  assert.equal(card.dataset.focusBaseScale, "0.8");
  assert.equal(minus.disabled, true);
  assert.equal(plus.disabled, false);
  const point = context.getResearchCanvasFocusPoint(preview, 500, 350);
  assert.deepEqual({ ...point }, { x: 500, y: 350 });
  const bounds = context.getResearchCanvasFocusBounds(preview);
  assert.equal(bounds.left, 0); assert.equal(bounds.right, 1200);
  context.setResearchCanvasFocusZoom(preview, 9);
  assert.equal(plus.disabled, true);
  assert.equal(minus.disabled, false);
  assert.equal(stage.style.transform, undefined);
  assert.ok(Math.abs(Number(card.dataset.focusScale) - 1.2) < 1e-10);
  context.setResearchCanvasFocusZoom(preview, 1);
  assert.equal(stage.style.transform, undefined);
  assert.equal(card.style.width, "560px");
  assert.equal(card.style.left, "120px");
  assert.equal(card.dataset.focusScale, "0.8");
  assert.equal(JSON.stringify({ positions: focus.positions, camera }), before);
  assert.equal(focus.zoom, 1);
});

test("resizing a focus sticker uses its combined scale once within the full viewport", () => {
  const context = loadResearch();
  const preview = { dataset: { cardKey: "root", focusZoom: "0.5" }, clientWidth: 1200, clientHeight: 800 };
  const card = { offsetHeight: 300, closest: () => null };
  const wrapper = { dataset: { focusScale: "0.4", focusBaseScale: "0.8" }, offsetWidth: 560,
    style: { left: "200px", top: "150px" }, querySelector: () => card, closest: () => preview };
  const handle = { dataset: { cardKey: "child" }, closest: () => wrapper };
  const state = context.getResearchCanvasResizeState({}, handle);
  assert.equal(state.scale, 0.4);
  assert.equal(state.worldScale, 0.4);
  assert.equal(state.maxWidth, 2500);
  assert.equal(state.maxHeight, 1625);
  assert.equal(state.startWidth, 560);
  assert.equal(state.startHeight, 300);
});

test("focus workspace shows direct linked stickers without mixing other branches", () => {
  const context = loadResearch();
  const idea = { id: "idea-1", pathData: {
    researchDirections: [{ id: "direction-1", references: [] }],
    researchCanvasItems: [
      { id: "root", directionId: "direction-1", type: "note", title: "Root" },
      { id: "child", directionId: "direction-1", type: "note", title: "Child", canvasParentKey: "item:root" },
      { id: "grandchild", directionId: "direction-1", type: "note", title: "Grandchild", canvasParentKey: "item:child" },
      { id: "other", directionId: "direction-1", type: "note", title: "Other" }
    ]
  } };
  assert.deepEqual(Array.from(context.getResearchCanvasFocusChildren(idea, "item:root"), (card) => card.key), ["item:child"]);
  idea.pathData.researchCanvasFocusPositions = { "item:root": {
    "item:root": { x: 120, y: 190 },
    "item:child": { x: 920, y: 310 },
    "item:other": { x: 20, y: 20 },
    "item:grandchild": { x: 70, y: 70 }
  } };
  const positions = context.getResearchCanvasFocusPositions(idea, "item:root");
  assert.deepEqual(Object.keys(positions), ["item:root", "item:child", "item:grandchild"]);
  assert.deepEqual(Array.from(context.getResearchCanvasFocusDescendants(idea, "item:root"), (card) => [card.key, card.focusDepth]), [["item:child", 1], ["item:grandchild", 2]]);
  assert.equal(positions["item:root"].x, 120);
  assert.equal(positions["item:child"].x, 920);
  assert.equal(positions["item:child"].y, 310);
});

test("opening a deeper sticker preserves descendant hierarchy sizes in focus", () => {
  const context = loadResearch();
  const idea = { id: "idea", pathData: {
    researchDirections: [{ id: "direction", references: [] }],
    researchCanvasItems: ["root", "first", "second", "third", "fourth"].map((id, index, ids) => ({
      id, directionId: "direction", type: "note", title: id,
      canvasParentKey: index ? "item:" + ids[index - 1] : ""
    }))
  } };
  const top = context.getResearchCanvasFocusDescendants(idea, "item:root");
  assert.deepEqual(Array.from(top, (card) => context.getResearchCanvasFocusDepthScale(card.focusDepth)), [1.05, 1.05 * 0.975, 1.05 * 0.975 ** 2, 1.05 * 0.975 ** 3]);
  const deeper = context.getResearchCanvasFocusDescendants(idea, "item:second");
  assert.deepEqual(Array.from(deeper, (card) => [card.key, context.getResearchCanvasFocusDepthScale(card.focusDepth)]), [["item:third", 1.05 * 0.975 ** 2], ["item:fourth", 1.05 * 0.975 ** 3]]);
  assert.equal(context.getResearchCanvasFocusScale(top[2].focusDepth), context.getResearchCanvasFocusScale(deeper[0].focusDepth));
});

test("focus layout restores sticker positions and places visible children beside the main sticker", () => {
  const context = loadResearch();
  const main = { offsetWidth: 560, offsetHeight: 320, dataset: { focusCardKey: "item:root" }, style: {}, querySelector: () => add };
  const child = { offsetWidth: 220, offsetHeight: 150, dataset: { focusCardKey: "item:child", focusDepth: "1" }, style: { setProperty(name, value) { this[name] = value; } }, querySelector: () => null };
  const add = { offsetWidth: 42, style: {}, classList: { toggle() {} } };
  const preview = {
    clientWidth: 1200,
    clientHeight: 800,
    querySelector(selector) { return selector.includes("is-main") ? main : add; },
    querySelectorAll(selector) { return selector.includes("is-child") ? [child] : []; }
  };
  context.layoutResearchCanvasFocus(preview, { positions: { "item:root": { x: 120, y: 140 }, "item:child": { x: 850, y: 250 } } });
  assert.equal(main.style.left, "120px");
  assert.equal(main.style.top, "140px");
  assert.equal(add.style.left, "548px");
  assert.equal(add.style.top, "139px");
  assert.equal(child.style.width, "224px");
  assert.ok(Math.abs(Number(child.style["--research-focus-scale"]) - 0.88704) < 0.0001);
  assert.equal(child.style.left, "850px");
  assert.equal(child.style.top, "250px");
});

test("new focus stickers appear to the right of their own parent", () => {
  const context = loadResearch();
  const make = (key, parentKey, scale, width, height) => ({
    dataset: { focusCardKey: key, focusParentKey: parentKey, focusScale: String(scale) },
    offsetWidth: width, offsetHeight: height,
    style: { setProperty(name, value) { this[name] = value; } }, querySelector: () => null
  });
  const main = make("main", "", 0.8, 560, 320);
  const child = make("child", "main", 0.8448, 224, 146);
  const grandchild = make("grandchild", "child", 0.71808, 224, 146);
  const preview = { clientWidth: 1450, clientHeight: 900, querySelector: () => main, querySelectorAll: () => [child, grandchild] };
  context.layoutResearchCanvasFocus(preview, { positions: { main: { x: 100, y: 200 } } });
  assert.equal(child.style.left, "612px");
  assert.equal(child.style.top, "200px");
  assert.ok(Math.abs(parseFloat(grandchild.style.left) - (612 + 224 * 0.8448 + 64)) < 0.001);
  assert.equal(grandchild.style.top, "200px");
});

test("focus connections follow direct parent-child positions across multiple levels", () => {
  const context = loadResearch();
  const svg = { tagName: "svg", attributes: {}, setAttribute(name, value) { this.attributes[name] = value; }, innerHTML: "" };
  const card = (key, parent, left, top, width, height, scale = 1) => ({
    dataset: { focusCardKey: key, focusParentKey: parent, focusScale: String(scale) },
    style: { left: left + "px", top: top + "px" }, offsetWidth: width, offsetHeight: height
  });
  const main = card("main", "", 100, 100, 400, 200);
  const child = card("child", "main", 600, 200, 200, 100, 0.5);
  const grandchild = card("grandchild", "child", 850, 250, 100, 80);
  const orphan = card("orphan", "missing", 900, 400, 100, 80);
  const cards = [main, child, grandchild, orphan];
  const preview = {
    clientWidth: 1200, clientHeight: 800,
    querySelector: () => svg,
    querySelectorAll(selector) { return selector === "[data-focus-parent-key]" ? cards.slice(1) : cards; }
  };
  context.drawResearchCanvasFocusConnections(preview);
  assert.equal(svg.attributes.viewBox, "0 0 1200 800");
  assert.equal((svg.innerHTML.match(/<path /g) || []).length, 2);
  assert.match(svg.innerHTML, /M 500 200 C .* 600 225/);
  assert.match(svg.innerHTML, /M 700 225 C .* 850 290/);
  child.style.left = "650px";
  context.drawResearchCanvasFocusConnections(preview);
  assert.match(svg.innerHTML, /M 500 200 C .* 650 225/);
  assert.match(svg.innerHTML, /M 750 225 C .* 850 290/);
  child.hidden = true;
  grandchild.hidden = true;
  context.drawResearchCanvasFocusConnections(preview);
  assert.doesNotMatch(svg.innerHTML, /<path /);
});

test("adding the first child keeps the current zoom parent in place", () => {
  const context = loadResearch();
  const focus = { positions: {} };
  vm.runInContext("researchViewState", context).canvasFocus = focus;
  const main = { dataset: { focusCardKey: "main", focusScale: "0.8" }, offsetWidth: 560, offsetHeight: 320, style: { left: "500px", top: "200px" }, querySelector: () => null };
  context.snapshotResearchCanvasFocusPositions({ querySelector: () => ({ querySelectorAll: () => [main] }) });
  const child = { dataset: { focusCardKey: "child", focusParentKey: "main", focusScale: "0.8448" }, offsetWidth: 224, offsetHeight: 146, style: { setProperty() {} }, querySelector: () => null };
  context.layoutResearchCanvasFocus({ clientWidth: 1450, clientHeight: 900, querySelector: () => main, querySelectorAll: () => [child] }, focus);
  assert.equal(main.style.left, "500px");
  assert.equal(main.style.top, "200px");
  assert.equal(child.style.left, "1012px");
  assert.equal(child.style.top, "200px");
});

test("added stickers save focus coordinates after the drag ends", async () => {
  const context = loadResearch();
  const listeners = {};
  const child = {
    dataset: { focusCardKey: "item:child" },
    style: { left: "800px", top: "120px" },
    offsetWidth: 220,
    offsetHeight: 180,
    classList: { contains: () => false, add() {}, remove() {} },
    querySelector: () => null,
    setPointerCapture() {}, hasPointerCapture: () => false,
    addEventListener(type, callback) { listeners[type] = callback; },
    removeEventListener(type) { delete listeners[type]; }
  };
  let onPointerDown;
  const preview = { clientWidth: 1200, clientHeight: 800, classList: { add() {}, remove() {} }, contains: () => true, querySelectorAll: () => [],
    addEventListener(type, callback) { onPointerDown = callback; } };
  const focus = { ideaId: "idea-1", cardKey: "item:root", positions: {} };
  const saved = [];
  context.bindResearchCanvasFocusDrag(preview, focus, { saveCanvasFocusPosition: (...args) => { saved.push(args); return true; } });
  onPointerDown({ button: 0, pointerId: 1, pointerType: "mouse", clientX: 830, clientY: 150, target: { closest(selector) { return selector === "[data-focus-card-key]" ? child : null; } } });
  listeners.pointermove({ pointerId: 1, clientX: 880, clientY: 190 });
  assert.equal(child.style.left, "850px");
  assert.equal(child.style.top, "160px");
  assert.equal(focus.positions["item:child"].x, 850);
  assert.equal(focus.positions["item:child"].y, 160);
  assert.equal(saved.length, 0);
  await listeners.pointerup({ pointerId: 1, type: "pointerup" });
  assert.deepEqual(saved[0], ["item:root", "item:child", 850, 160]);
  assert.equal(listeners.pointermove, undefined);
});

test("dragging at reduced focus zoom uses viewport coordinates and never starts from editing controls", async () => {
  const context = loadResearch(), listeners = {};
  const child = { dataset: { focusCardKey: "item:child" }, style: { left: "800px", top: "120px" },
    offsetWidth: 220, offsetHeight: 180, classList: { add() {}, remove() {} }, querySelector: () => null,
    setPointerCapture() {}, hasPointerCapture: () => false,
    addEventListener(type, fn) { listeners[type] = fn; }, removeEventListener(type) { delete listeners[type]; } };
  let pointerdown;
  const preview = { dataset: { focusZoom: "0.5" }, clientWidth: 1200, clientHeight: 800,
    classList: { add() {}, remove() {} }, contains: () => true, querySelectorAll: () => [],
    addEventListener(type, fn) { pointerdown = fn; } };
  const focus = { ideaId: "idea", cardKey: "item:root", positions: {} }, saved = [];
  context.bindResearchCanvasFocusDrag(preview, focus, { saveCanvasFocusPosition: (...args) => { saved.push(args); return true; } });
  const target = { closest: (selector) => selector === "[data-focus-card-key]" ? child : null };
  pointerdown({ button: 0, pointerId: 1, clientX: 600, clientY: 300, target });
  listeners.pointermove({ pointerId: 1, clientX: 650, clientY: 320 });
  assert.equal(child.style.left, "850px");
  assert.equal(child.style.top, "140px");
  await listeners.pointerup({ pointerId: 1, type: "pointerup" });
  assert.deepEqual(saved[0], ["item:root", "item:child", 850, 140]);
  context.window.MentorUIEvents = { isTextEditingEvent: () => true };
  pointerdown({ button: 0, pointerId: 2, target });
  assert.equal(listeners.pointermove, undefined);
});

test("sticker forms drag by their header while editing controls stay terminal", () => {
  const context = loadResearch();
  context.window.innerWidth = 1200;
  context.window.innerHeight = 800;
  const listeners = {};
  const handle = {
    dataset: {}, classList: { add() {} }, setPointerCapture() {}, hasPointerCapture: () => false,
    addEventListener(type, callback) { listeners[type] = callback; },
    removeEventListener(type) { delete listeners[type]; }
  };
  const panel = { offsetWidth: 360, offsetHeight: 400, style: {}, classList: { add() {} }, querySelector: () => handle, getBoundingClientRect: () => ({ left: 300, top: 180, width: 360 }) };
  const modal = { classList: { add() {} }, setAttribute() {} };
  context.bindResearchDraggableForm(modal, panel);
  let prevented = false;
  listeners.pointerdown({ button: 0, target: { closest: () => ({ tagName: "INPUT" }) }, preventDefault() { prevented = true; } });
  assert.equal(prevented, false);
  assert.equal(panel.style.left, undefined);
  listeners.pointerdown({ button: 0, pointerId: 1, clientX: 320, clientY: 200, target: { closest: () => null }, preventDefault() {}, stopPropagation() {} });
  listeners.pointermove({ pointerId: 1, clientX: 420, clientY: 260 });
  assert.equal(panel.style.left, "400px");
  assert.equal(panel.style.top, "240px");
  listeners.pointerup({ pointerId: 1 });
  assert.equal(listeners.pointermove, undefined);
});

test("sticker add menus open outside the scaled card and return on close", () => {
  const context = loadResearch();
  context.window.innerWidth = 1200;
  context.window.innerHeight = 800;
  const classes = new Set();
  const origin = { isConnected: true, closest: () => null, appendChild(menu) { menu.parentElement = this; } };
  const overlay = { appendChild(menu) { menu.parentElement = this; } };
  const button = { isConnected: true, getBoundingClientRect: () => ({ left: 1100, right: 1120, top: 700 }), setAttribute(name, value) { this[name] = value; } };
  const menu = { parentElement: origin, hidden: true, offsetWidth: 178, offsetHeight: 260, closest: () => null,
    classList: { add(name) { classes.add(name); }, remove(name) { classes.delete(name); } },
    style: { removeProperty(name) { delete this[name]; } }
  };
  const view = {
    querySelector: (selector) => selector === "[data-research-canvas-preview]" ? overlay : null,
    querySelectorAll: (selector) => selector === ".research-canvas-card-menu" ? [menu] : [button]
  };
  context.openResearchCardAddMenu(view, button, menu);
  assert.equal(menu.parentElement, overlay);
  assert.equal(menu.style.left, "914px");
  assert.equal(menu.style.top, "532px");
  assert.equal(classes.has("is-floating-add-menu"), true);
  context.closeResearchCanvasMenus(view);
  assert.equal(menu.parentElement, origin);
  assert.equal(menu.hidden, true);
  assert.equal(menu._researchAddMenuTrigger, undefined);
  assert.equal(classes.has("is-floating-add-menu"), false);
  assert.equal(button["aria-expanded"], "false");
});

test("clicking outside Research add menus clears both menu and button state", () => {
  const context = loadResearch();
  const canvasMenu = { hidden: false };
  const cardMenu = { hidden: false, closest: () => ({ classList: { remove(name) { assert.equal(name, "has-open-menu"); } } }) };
  let collapsed = 0;
  const button = { setAttribute(name, value) { assert.equal(name, "aria-expanded"); assert.equal(value, "false"); collapsed++; } };
  const view = {
    querySelector(selector) { return selector === "[data-research-canvas-menu]" ? canvasMenu : selector.includes("toggle-canvas-menu") ? button : null; },
    querySelectorAll(selector) { return selector === ".research-canvas-card-menu" ? [cardMenu] : [button]; }
  };
  vm.runInContext("researchViewState.canvasMenuOpen = true", context);
  context.closeResearchCanvasMenus(view);
  assert.equal(vm.runInContext("researchViewState.canvasMenuOpen", context), false);
  assert.equal(canvasMenu.hidden, true);
  assert.equal(cardMenu.hidden, true);
  assert.equal(collapsed, 2);
});
