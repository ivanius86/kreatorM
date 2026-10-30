const researchIdea = {
  title: "Izgubiti 20 kg",
  description:
    "Istražujem kako da izgubim 20 kg na zdrav, bezbedan i održiv način kroz ishranu, trening, navike, rutinu, oporavak i doslednost. Cilj mi je da poboljšam zdravlje, povećam energiju, samopouzdanje i svakodnevnu funkcionalnost.",
  tags: ["Zdravlje", "Fizički cilj", "Istraživanje"],
  status: "U istraživanju",
  priority: "Visok",
  createdAt: "12.05.2024.",
  updatedAt: "15.05.2024."
};

function researchT(key, params) {
  const fullKey = "research." + key;
  return window.MentorI18n?.t ? window.MentorI18n.t(fullKey, params, key) : key;
}

function researchBrainT(key, params) {
  const fullKey = "brainstorming." + key;
  return window.MentorI18n?.t ? window.MentorI18n.t(fullKey, params, key) : key;
}

const researchViewState = {
  activeDirectionByIdea: {},
  activeReferenceByDirection: {},
  activeTestByIdea: {},
  activeDayByTest: {},
  renderedTestsById: {},
  activeScrollStep: 1,
  lockedScrollStep: 0,
  isReferenceFocus: false,
  focusReturnState: null,
  currentIdea: null,
  compactDock: null,
  cardZoomByIdea: {},
  canvasMenuOpen: false,
  canvasFocus: null,
  canvasCameraByWorkspace: {},
  testPanelOpen: false,
  metadataExpanded: false,
  suppressCanvasClickUntil: 0
};

const RESEARCH_CARD_ZOOM_DEFAULT = 0.8;
const RESEARCH_CARD_ZOOM_MIN = 0.6;
const RESEARCH_CARD_ZOOM_MAX = 1.4;
const RESEARCH_DEFAULT_SIZE_SCALE = 0.935;
const RESEARCH_FOCUS_SIZE_SCALE = 0.8;
const RESEARCH_FOCUS_CHILD_SIZE_SCALE = 1.056;
const RESEARCH_FOCUS_ZOOM_DEFAULT = 0.7;
const RESEARCH_FOCUS_ZOOM_MIN = 0.5;
const RESEARCH_FOCUS_ZOOM_MAX = 1.5;
const RESEARCH_MAP_ZOOM_MIN = 0.25;
const RESEARCH_MAP_ZOOM_MAX = 3;
const RESEARCH_MAP_WHEEL_ZOOM_RATE = 0.001;

function getResearchCanvasCamera(idea = researchViewState.currentIdea) {
  const directionId = getActiveResearchDirection(idea || {})?.id || "";
  const key = JSON.stringify([String(idea?.id || idea?.title || "research"), directionId]);
  if (!researchViewState.canvasCameraByWorkspace[key]) {
    const saved = idea?.pathData?.researchCanvasCameras?.[JSON.stringify([directionId])];
    researchViewState.canvasCameraByWorkspace[key] = saved && Number.isFinite(saved.x) && Number.isFinite(saved.y) && Number.isFinite(saved.zoom) && saved.zoom >= RESEARCH_MAP_ZOOM_MIN && saved.zoom <= RESEARCH_MAP_ZOOM_MAX
      ? { x: saved.x, y: saved.y, zoom: saved.zoom } : { x: 0, y: 0, zoom: 1 };
  }
  return researchViewState.canvasCameraByWorkspace[key];
}

function saveResearchCanvasCamera(root, immediate = false) {
  if (!root) return;
  const idea = researchViewState.currentIdea;
  const action = root._researchActions?.saveCanvasOrganization;
  if (!idea?.id || !action) return;
  window.clearTimeout(root._researchCanvasCameraSaveTimer);
  const directionId = getActiveResearchDirection(idea)?.id || "";
  const key = JSON.stringify([directionId]);
  const camera = { ...getResearchCanvasCamera(idea) };
  const persist = async () => {
    try {
      if (await action({ researchCanvasCameras: { [key]: camera } })) {
        idea.pathData = idea.pathData || {};
        idea.pathData.researchCanvasCameras = { ...(idea.pathData.researchCanvasCameras || {}), [key]: camera };
      }
    } catch (error) { console.warn("Research canvas view could not be saved.", error); }
  };
  if (immediate) return persist();
  else root._researchCanvasCameraSaveTimer = window.setTimeout(persist, 250);
}

function zoomResearchCanvasCamera(camera, zoom, anchorX, anchorY) {
  const next = window.MentorResearchGeometry.zoomCamera(camera, zoom, anchorX, anchorY, RESEARCH_MAP_ZOOM_MIN, RESEARCH_MAP_ZOOM_MAX);
  camera.x = next.x;
  camera.y = next.y;
  camera.zoom = next.zoom;
}

function applyResearchCanvasCamera(canvas) {
  const viewport = canvas?.closest?.("[data-research-canvas-viewport]");
  if (!viewport) return;
  const camera = getResearchCanvasCamera();
  canvas.dataset.mapScale = String(camera.zoom);
  canvas.style.transform = "translate(" + camera.x + "px," + camera.y + "px) scale(" + camera.zoom + ")";
  syncResearchCanvasZoomControls(canvas.closest(".research-view"));
}

function focusResearchCanvasGroup(viewport, group) {
  const canvas = viewport?.querySelector("[data-research-canvas]");
  if (!canvas || !group) return;
  const camera = getResearchCanvasCamera();
  const width = Math.max(180, Number(group.width) || 240);
  const height = group.collapsed ? 44 : Math.max(86, Number(group.height) || 160);
  camera.x = viewport.clientWidth / 2 - ((Number(group.x) || 0) + width / 2) * camera.zoom;
  camera.y = viewport.clientHeight / 2 - ((Number(group.y) || 0) + height / 2) * camera.zoom;
  applyResearchCanvasCamera(canvas);
  saveResearchCanvasCamera(viewport._researchCameraSaveRoot);
}

function zoomResearchCanvasMap(viewport, zoom, clientX, clientY) {
  const canvas = viewport.querySelector("[data-research-canvas]");
  if (!canvas) return;
  const rect = viewport.getBoundingClientRect();
  zoomResearchCanvasCamera(getResearchCanvasCamera(), zoom, clientX - rect.left - viewport.clientLeft, clientY - rect.top - viewport.clientTop);
  applyResearchCanvasCamera(canvas);
  saveResearchCanvasCamera(viewport._researchCameraSaveRoot);
  const view = viewport.closest(".research-view");
  view?.querySelectorAll(".research-canvas-card-menu.is-floating-add-menu").forEach(positionResearchCardAddMenu);
}

function bindResearchCanvasMap(root, canvas) {
  const viewport = canvas.closest("[data-research-canvas-viewport]");
  if (!viewport || viewport.dataset.mapBound === "true") return;
  viewport.dataset.mapBound = "true";
  viewport._researchCameraSaveRoot = root;
  viewport.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || window.MentorUIEvents?.isTextEditingEvent?.(event)) return;
    if (event.target.closest(".research-canvas-card, .research-organizer-group, .research-organizer-annotation, button, a, input, textarea, select, [contenteditable], .research-canvas-card-menu")) return;
    viewport.focus?.({ preventScroll: true });
    if (window.MentorResearchOrganizer?.isSelectMode?.()) return;
    event.preventDefault(); event.stopPropagation();
    closeResearchCanvasMenus(viewport.closest(".research-view"));
    const camera = getResearchCanvasCamera();
    const original = { x: camera.x, y: camera.y };
    const startX = event.clientX, startY = event.clientY;
    let moved = false;
    viewport.setPointerCapture(event.pointerId);
    const move = (nextEvent) => {
      if (nextEvent.pointerId !== event.pointerId) return;
      const dx = nextEvent.clientX - startX, dy = nextEvent.clientY - startY;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      moved = true;
      viewport.classList.add("is-map-panning");
      camera.x = original.x + dx; camera.y = original.y + dy;
      applyResearchCanvasCamera(canvas);
    };
    const finish = (endEvent) => {
      if (endEvent.pointerId !== event.pointerId) return;
      viewport.removeEventListener("pointermove", move);
      viewport.removeEventListener("pointerup", finish);
      viewport.removeEventListener("pointercancel", finish);
      viewport.classList.remove("is-map-panning");
      if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
      if (endEvent.type === "pointercancel") {
        camera.x = original.x; camera.y = original.y;
        applyResearchCanvasCamera(canvas);
      }
      if (moved) {
        researchViewState.suppressCanvasClickUntil = Date.now() + 300;
        if (endEvent.type !== "pointercancel") saveResearchCanvasCamera(root, true);
      }
    };
    viewport.addEventListener("pointermove", move);
    viewport.addEventListener("pointerup", finish);
    viewport.addEventListener("pointercancel", finish);
  });
  viewport.addEventListener("wheel", (event) => {
    if (window.MentorUIEvents?.isTextEditingEvent?.(event) || event.target.closest("input, textarea, select, [contenteditable], .research-canvas-card-menu, [data-research-group-panel], [data-research-organizer-add-menu], [data-research-pointer-menu]")) return;
    if (!event.deltaY) return;
    event.preventDefault(); event.stopPropagation();
    const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1);
    const factor = Math.exp(-Math.max(-240, Math.min(240, pixels)) * RESEARCH_MAP_WHEEL_ZOOM_RATE);
    zoomResearchCanvasMap(viewport, getResearchCanvasCamera().zoom * factor, event.clientX, event.clientY);
  }, { passive: false });
}

function clampResearchCanvasCardZoom(value) {
  return window.MentorResearchGeometry.clampCardZoom(value, RESEARCH_CARD_ZOOM_MIN, RESEARCH_CARD_ZOOM_MAX, RESEARCH_CARD_ZOOM_DEFAULT);
}

function getResearchCanvasCardZoom(idea = researchViewState.currentIdea) {
  const key = String(idea?.id || idea?.title || "research");
  return clampResearchCanvasCardZoom(researchViewState.cardZoomByIdea[key]);
}

function syncResearchCanvasZoomControls(view) {
  const cameraZoom = getResearchCanvasCamera().zoom;
  const zoom = getResearchCanvasCardZoom() * cameraZoom;
  const label = view?.querySelector("[data-research-card-zoom-value]");
  if (label) label.textContent = researchT("compactNav.zoomLevel", { percent: Math.round(zoom * 100) });
  view?.querySelectorAll('[data-research-action="zoom-canvas-cards"]').forEach((button) => {
    const delta = Number(button.dataset.zoomDelta || 0);
    button.disabled = delta < 0 ? cameraZoom <= RESEARCH_MAP_ZOOM_MIN : cameraZoom >= RESEARCH_MAP_ZOOM_MAX;
  });
}

const researchModalLayerSelector = [
  "[data-idea-test-modal]",
  "[data-linked-note-modal]",
  "[data-research-direction-modal]",
  "[data-research-reference-modal]",
  "[data-research-canvas-modal]",
  "[data-research-canvas-media]",
  "[data-research-canvas-preview]",
  "[data-research-attachment-modal]",
  "[data-research-sticker-designer]",
  "[data-research-canvas-tests-modal]"
].join(",");
const researchCanvasMediaSessions = new Set();
let researchCanvasMediaRequest = 0;
function setResearchModalLayer(isOpen) {
  document.body?.classList.toggle("research-modal-open", Boolean(isOpen));
  document.documentElement?.classList.toggle("research-modal-open", Boolean(isOpen));
  document.documentElement?.classList.toggle("research-canvas-focus-open", Boolean(document.querySelector("[data-research-canvas-preview]")));
}

function syncResearchModalLayer() {
  const blockingSelectors = researchModalLayerSelector.split(",").map((selector) => selector + ":not(.is-minimized)").join(",");
  setResearchModalLayer(Boolean(document.querySelector(blockingSelectors)));
}

let researchMediaPanelLayer = 3650;

function applyResearchMediaPanelGeometry(modal, geometry) {
  const margin = 8;
  const availableWidth = Math.max(1, window.innerWidth - margin * 2);
  const availableHeight = Math.max(1, window.innerHeight - margin * 2);
  const width = Math.max(Math.min(240, availableWidth), Math.min(geometry.width, availableWidth));
  const minHeight = modal.querySelector("audio") ? 160 : 200;
  const height = Math.max(Math.min(minHeight, availableHeight), Math.min(geometry.height, availableHeight));
  const next = {
    x: Math.max(margin, Math.min(geometry.x, window.innerWidth - width - margin)),
    y: Math.max(margin, Math.min(geometry.y, window.innerHeight - height - margin)),
    width, height
  };
  for (const [key, value] of Object.entries(next)) modal.style.setProperty("--research-player-" + key, value + "px");
  modal.classList.add("has-player-size");
  modal._researchMediaPanelGeometry = next;
  return next;
}

function restoreResearchMediaPanelGeometry(modal) {
  let saved = modal._researchMediaPanelGeometry;
  if (!saved && modal.getBoundingClientRect) {
    const rect = modal.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) saved = { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
  }
  if (saved) applyResearchMediaPanelGeometry(modal, saved);
}

function bindResearchMediaPanel(modal, header) {
  const iframe = modal.querySelector("iframe");
  const stage = modal.querySelector(".research-media-stage");
  const syncEmbed = () => {
    if (!iframe || !stage) return;
    if (!modal.classList.contains("is-minimized")) {
      ["width", "height", "max-height", "transform"].forEach((name) => iframe.style.removeProperty(name));
      return;
    }
    // Keep desktop controls inside the embed; scale its visual size with the panel.
    const scale = Math.min(stage.clientWidth / 480, stage.clientHeight / 270);
    if (scale <= 0) return;
    iframe.style.width = "480px";
    iframe.style.height = "270px";
    iframe.style.maxHeight = "none";
    iframe.style.transform = "scale(" + scale + ")";
  };
  const embedObserver = iframe && stage && typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncEmbed) : null;
  embedObserver?.observe(stage);
  modal._researchSyncEmbed = syncEmbed;
  const resize = document.createElement("button");
  resize.type = "button";
  resize.className = "research-media-panel-resize";
  resize.dataset.mediaPanelResize = "";
  resize.setAttribute("aria-label", researchT("canvas.resizePlayer"));
  resize.title = researchT("canvas.resizePlayer");
  resize.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M10 20 20 10M15 20l5-5M20 20h.01"/></svg>';
  modal.appendChild(resize);
  let detachInteraction;
  const start = (event, resizing) => {
    if (!modal.classList.contains("is-minimized") || event.button !== 0 || window.MentorUIEvents?.isTextEditingEvent?.(event)) return;
    if (!resizing && event.target.closest("button, a, input, textarea, select, [contenteditable]")) return;
    event.preventDefault(); event.stopPropagation();
    detachInteraction?.();
    const rect = modal.getBoundingClientRect();
    const original = { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
    const startX = event.clientX, startY = event.clientY;
    const handle = resizing ? resize : header;
    modal.style.setProperty("--research-player-z", String(++researchMediaPanelLayer));
    handle.setPointerCapture(event.pointerId);
    let moved = false;
    const move = (nextEvent) => {
      if (nextEvent.pointerId !== event.pointerId) return;
      const dx = nextEvent.clientX - startX, dy = nextEvent.clientY - startY;
      if (!moved && Math.hypot(dx, dy) < 3) return;
      moved = true;
      modal.classList.add("is-player-interacting");
      applyResearchMediaPanelGeometry(modal, resizing
        ? { ...original, width: original.width + dx, height: original.height + dy }
        : { ...original, x: original.x + dx, y: original.y + dy });
    };
    const finish = (endEvent) => {
      if (endEvent.pointerId !== event.pointerId) return;
      detachInteraction();
      if (endEvent.type === "pointercancel" && moved) applyResearchMediaPanelGeometry(modal, original);
    };
    detachInteraction = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", finish);
      handle.removeEventListener("pointercancel", finish);
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
      modal.classList.remove("is-player-interacting");
      detachInteraction = null;
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
  };
  header.addEventListener("pointerdown", (event) => start(event, false));
  resize.addEventListener("pointerdown", (event) => start(event, true));
  resize.addEventListener("keydown", (event) => {
    if (!modal.classList.contains("is-minimized") || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    if (window.MentorUIEvents?.isTextEditingEvent?.(event)) return;
    event.preventDefault(); event.stopPropagation();
    const rect = modal.getBoundingClientRect();
    const step = event.shiftKey ? 2 : 10;
    applyResearchMediaPanelGeometry(modal, {x:rect.left, y:rect.top,
      width:rect.width + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0),
      height:rect.height + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0)});
  });
  const onWindowResize = () => {
    if (modal.classList.contains("is-minimized")) restoreResearchMediaPanelGeometry(modal);
  };
  window.addEventListener("resize", onWindowResize);
  modal._researchMediaPanelCleanup = () => {
    detachInteraction?.();
    embedObserver?.disconnect();
    window.removeEventListener("resize", onWindowResize);
  };
}

function bindResearchMediaMinimize(modal, header) {
  if (!header || modal.querySelector("[data-media-minimize]")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "research-media-minimize";
  button.dataset.mediaMinimize = "";
  button.textContent = "−";
  button.setAttribute("aria-label", researchT("canvas.minimizePlayer"));
  button.title = researchT("canvas.minimizePlayer");
  (header.querySelector("div") || header).appendChild(button);
  bindResearchMediaPanel(modal, header);
  button.addEventListener("click", async (event) => {
    event.preventDefault(); event.stopPropagation();
    if (document.fullscreenElement && modal.contains(document.fullscreenElement)) {
      try { await document.exitFullscreen(); } catch (_) { return; }
    }
    if (!modal.isConnected) return;
    const minimized = !modal.classList.contains("is-minimized");
    if (minimized) modal.style.setProperty("--research-player-offset", Math.min(84, document.querySelectorAll(".research-direction-modal.is-minimized").length * 28) + "px");
    modal.classList.toggle("is-minimized", minimized);
    if (minimized) restoreResearchMediaPanelGeometry(modal);
    modal._researchSyncEmbed?.();
    modal.classList.remove("is-idle");
    modal.setAttribute("role", minimized ? "region" : "dialog");
    if (minimized) modal.removeAttribute("aria-modal");
    else modal.setAttribute("aria-modal", "true");
    const label = researchT(minimized ? "canvas.restorePlayer" : "canvas.minimizePlayer");
    button.textContent = minimized ? "↗" : "−";
    button.title = label;
    button.setAttribute("aria-label", label);
    syncResearchModalLayer();
  });
}

const researchResources = [
  ["Vreme", "1-1.5 h dnevno"],
  ["Novac", "Planirati budžet"],
  ["Oprema", "Osnovna oprema"],
  ["Znanje", "Ishrana, trening, oporavak"],
  ["Dokumenta / plan", "Plan ishrane i treninga"],
  ["Ljudi / podrška", "Porodica, trener, zajednica"]
];

const budgetRows = [
  ["Ishrana", "250-400 EUR", "350 EUR", "Realno"],
  ["Trening", "40-120 EUR", "60 EUR", "U planu"],
  ["Oprema", "50-200 EUR", "80 EUR", "Jednokratno"],
  ["Podrška", "0-150 EUR", "0 EUR", "Opcionalno"]
];

const researchReferenceUnitGroups = [
  {
    label: "Finansije",
    options: [
      { value: "money_eur", label: "Money (EUR)", suffix: "EUR", system: "finance" },
      { value: "percent", label: "Percent (%)", suffix: "%", system: "finance" }
    ]
  },
  {
    label: "Mere",
    options: [
      { value: "quantity", label: "Quantity (qty)", suffix: "qty", system: "measurement" },
      { value: "weight_kg", label: "Weight (kg)", suffix: "kg", system: "measurement" },
      { value: "distance_km", label: "Distance (km)", suffix: "km", system: "measurement" },
      { value: "count", label: "Count", suffix: "", system: "measurement" },
      { value: "area_m2", label: "Area (m2)", suffix: "m2", system: "measurement" },
      { value: "volume_l", label: "Volume (L)", suffix: "L", system: "measurement" }
    ]
  },
  {
    label: "Vreme",
    options: [
      { value: "minutes", label: "Minutes", suffix: "min", system: "time" },
      { value: "hours", label: "Hours", suffix: "h", system: "time" },
      { value: "days", label: "Days", suffix: "d", system: "time" }
    ]
  },
  {
    label: "Custom",
    options: [
      { value: "custom", label: "Custom unit", suffix: "", system: "custom" }
    ]
  }
];

const researchDirectionTypeOptions = [
  {
    value: "health",
    label: "Zdravlje",
    options: [["nutrition", "Ishrana"], ["training", "Trening"], ["sleep", "San"], ["habits", "Navike"]],
    icons: ["apple", "dumbbell", "bed", "repeat", "heart"]
  },
  {
    value: "finance",
    label: "Finansije",
    options: [["budget", "Budžet"], ["costs", "Troškovi"], ["savings", "Štednja"]],
    icons: ["wallet", "chart", "coins", "target"]
  },
  {
    value: "learning",
    label: "Učenje",
    options: [["research", "Istraživanje"], ["course", "Kurs"], ["books", "Knjige"]],
    icons: ["book", "brain", "school", "notes"]
  },
  {
    value: "general",
    label: "Opšte",
    options: [["plan", "Plan"], ["people", "Ljudi"], ["tools", "Alati"], ["risk", "Rizici"]],
    icons: ["compass", "briefcase", "home", "palette", "plane"]
  }
];

function renderResearchView(idea = researchIdea, options = {}) {
  const viewIdea = normalizeResearchIdea(idea);
  if (researchViewState.currentIdea?.id !== viewIdea.id) {
    researchViewState.testPanelOpen = false;
    researchViewState.metadataExpanded = false;
  }
  researchViewState.currentIdea = viewIdea;
  researchViewState.canvasMenuOpen = false;
  researchViewState.isReferenceFocus = false;
  researchViewState.activeScrollStep = 1;
  researchViewState.lockedScrollStep = 0;
  researchViewState.renderedTestsById = {};
  return [
    '<section class="research-view" data-panel="research-canvas-workspace" data-research-phase="0" aria-label="' + escapeResearchHtml(researchT("aria.ideaResearch")) + '">',
    '<div class="research-freeze-stack" data-panel="research-idea-panels">',
    renderResearchDetailStage(viewIdea, options.navigation || {}),
    '</div>',
    renderResearchCanvas(viewIdea, options.navigation || {}),
    "</section>"
  ].join("");
}

function renderResearchCompactIdeaNav(idea, navigation = {}, cards = [], direction = null) {
  const image = getResearchImageSrc(idea.image);
  const cardZoom = getResearchCanvasCardZoom(idea) * getResearchCanvasCamera(idea).zoom;
  const statusText = idea.status === "path" || !idea.status ? researchT("compactNav.researchStatus") : idea.statusLabel || researchT("compactNav.researchStatus");
  const counts = cards.reduce((result, card) => {
    if (card.type === "note") result.notes += 1;
    else if (["image", "video", "av"].includes(card.type)) result.media += 1;
    else if (["link", "source"].includes(card.type)) result.links += 1;
    return result;
  }, { notes: 0, media: 0, links: 0 });
  return [
    '<nav class="research-compact-idea-nav" aria-label="' + escapeResearchHtml(researchT("compactNav.aria")) + '">',
    '  <div class="research-compact-idea-main">',
    '  <button class="research-compact-idea-arrow" type="button" data-research-nav="prev" aria-label="' + escapeResearchHtml(researchT("compactNav.previous")) + '"' + (navigation.hasPrevious ? "" : " disabled") + '>‹</button>',
    '  <span class="research-compact-idea-identity"><img src="' + escapeResearchHtml(image) + '" alt="" loading="lazy" draggable="false" /><span><small>' + escapeResearchHtml(statusText) + '</small><strong>' + escapeResearchHtml(idea.title) + '</strong></span></span>',
    '  <button class="research-compact-idea-arrow" type="button" data-research-nav="next" aria-label="' + escapeResearchHtml(researchT("compactNav.next")) + '"' + (navigation.hasNext ? "" : " disabled") + '>›</button>',
    renderResearchCanvasAddControl(direction),
    '  </div>',
    '  <div class="research-compact-idea-meta">',
    '    <span class="research-compact-idea-count" data-count="' + counts.notes + '" role="group" aria-label="' + escapeResearchHtml(researchT("compactNav.notesCount", { count: counts.notes })) + '"><span class="research-compact-idea-count-icon" aria-hidden="true">✎</span><span class="research-compact-idea-count-full" aria-hidden="true">' + escapeResearchHtml(researchT("compactNav.notesCount", { count: counts.notes })) + '</span><strong class="research-compact-idea-count-number" aria-hidden="true">' + counts.notes + '</strong></span>',
    '    <span class="research-compact-idea-count" data-count="' + counts.media + '" role="group" aria-label="' + escapeResearchHtml(researchT("compactNav.mediaCount", { count: counts.media })) + '"><span class="research-compact-idea-count-icon" aria-hidden="true">▧</span><span class="research-compact-idea-count-full" aria-hidden="true">' + escapeResearchHtml(researchT("compactNav.mediaCount", { count: counts.media })) + '</span><strong class="research-compact-idea-count-number" aria-hidden="true">' + counts.media + '</strong></span>',
    '    <span class="research-compact-idea-count" data-count="' + counts.links + '" role="group" aria-label="' + escapeResearchHtml(researchT("compactNav.linksCount", { count: counts.links })) + '"><span class="research-compact-idea-count-icon" aria-hidden="true">↗</span><span class="research-compact-idea-count-full" aria-hidden="true">' + escapeResearchHtml(researchT("compactNav.linksCount", { count: counts.links })) + '</span><strong class="research-compact-idea-count-number" aria-hidden="true">' + counts.links + '</strong></span>',
    '    <span class="research-compact-card-zoom" role="group" aria-label="' + escapeResearchHtml(researchT("compactNav.zoomGroup")) + '">',
    '      <button type="button" data-research-action="zoom-canvas-cards" data-zoom-delta="-0.1" aria-label="' + escapeResearchHtml(researchT("compactNav.zoomOut")) + '" title="' + escapeResearchHtml(researchT("compactNav.zoomOut")) + '"' + (cardZoom <= RESEARCH_CARD_ZOOM_MIN ? " disabled" : "") + '><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M7.5 10.5h6"/></svg></button>',
    '      <output data-research-card-zoom-value>' + escapeResearchHtml(researchT("compactNav.zoomLevel", { percent: Math.round(cardZoom * 100) })) + '</output>',
    '      <button type="button" data-research-action="zoom-canvas-cards" data-zoom-delta="0.1" aria-label="' + escapeResearchHtml(researchT("compactNav.zoomIn")) + '" title="' + escapeResearchHtml(researchT("compactNav.zoomIn")) + '"' + (cardZoom >= RESEARCH_CARD_ZOOM_MAX ? " disabled" : "") + '><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M7.5 10.5h6M10.5 7.5v6"/></svg></button>',
    '    </span>',
    '    <button class="research-compact-idea-attach" type="button" data-research-dock-attach aria-pressed="false" aria-label="' + escapeResearchHtml(researchT("compactNav.pin")) + '" title="' + escapeResearchHtml(researchT("compactNav.pin")) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3h8l-1 5 3 3v2H6v-2l3-3-1-5Z"/><path d="M12 13v8"/></svg></button>',
    '    <button class="research-compact-idea-open" type="button" data-research-action="open-idea">' + escapeResearchHtml(researchT("compactNav.open")) + ' ↗</button>',
    '  </div>',
    '  <button class="research-compact-idea-resize" type="button" data-research-dock-resize aria-label="' + escapeResearchHtml(researchT("compactNav.resize")) + '" title="' + escapeResearchHtml(researchT("compactNav.resize")) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M10 20 20 10M15 20l5-5M20 20h.01"/></svg></button>',
    '</nav>'
  ].join("");
}

function renderResearchCanvasAddControl(direction) {
  const types = ["note", "av", "source", "link", "image", "video", "finance"];
  return [
    '<div class="research-canvas-add-wrap">',
    '  <button class="research-canvas-add" type="button" data-research-action="toggle-canvas-menu" aria-expanded="false">+ ' + escapeResearchHtml(researchT("canvas.add")) + '</button>',
    '  <div class="research-canvas-menu" data-research-canvas-menu hidden>',
    window.MentorResearchStickerSections?.renderCreateMenu(researchT, escapeResearchHtml, getResearchCanvasIcon, ' data-direction-id="' + escapeResearchHtml(direction?.id || "") + '"') || types.map((type) => '<button type="button" data-research-action="add-canvas-card" data-card-type="' + type + '" data-direction-id="' + escapeResearchHtml(direction?.id || "") + '"><span aria-hidden="true">' + getResearchCanvasIcon(type) + '</span>' + escapeResearchHtml(researchT("canvas.types." + type)) + '</button>').join(""),
    '  </div>',
    '</div>'
  ].join("");
}

function positionResearchCanvasAddMenu(menu) {
  if (!menu || menu.hidden) return;
  menu.style.transform = "";
  const rect = menu.getBoundingClientRect();
  const left = Math.min(Math.max(rect.left, 8), Math.max(8, window.innerWidth - rect.width - 8));
  const top = Math.min(Math.max(rect.top, 8), Math.max(8, window.innerHeight - rect.height - 8));
  menu.style.transform = "translate(" + Math.round(left - rect.left) + "px, " + Math.round(top - rect.top) + "px)";
}


function renderResearchScrollCounter() {
  const activeScrollStep = getSafeResearchScrollStep(researchViewState.activeScrollStep);
  const isLocked = researchViewState.lockedScrollStep === activeScrollStep;
  return [
    '<aside class="research-scroll-counter" data-current-step="' + activeScrollStep + '" aria-label="' + escapeResearchHtml(researchT("aria.scrollPhases")) + '">',
    '  <span class="research-scroll-line" aria-hidden="true"></span>',
    renderResearchScrollDot(1, activeScrollStep, isLocked),
    renderResearchScrollDot(2, activeScrollStep, isLocked),
    renderResearchScrollDot(3, activeScrollStep, isLocked),
    "</aside>"
  ].join("");
}

function renderResearchScrollDot(step, activeScrollStep, isLocked) {
  const isCurrentStep = step === activeScrollStep;
  const classes = [
    "research-scroll-dot",
    activeScrollStep === step ? "active" : "",
    isCurrentStep ? "is-current" : "",
    isCurrentStep && isLocked ? "is-locked" : ""
  ].filter(Boolean).join(" ");
  const label = isCurrentStep ? (isLocked ? "&#128274;" : "&#128275;") : String(step);
  const title = isCurrentStep ? getResearchScrollLockTitle(isLocked) : "";
  return '<button class="' + classes + '" type="button" data-scroll-step="' + step + '" aria-pressed="' + String(isCurrentStep && isLocked) + '" aria-label="' + getResearchScrollDotLabel(step, isCurrentStep, isLocked) + '" title="' + title + '"><strong>' + label + '</strong></button>';
}

function renderResearchStickyNav() {
  return [
    '<nav class="research-sticky-status-nav" aria-label="' + escapeResearchHtml(researchT("aria.quickNav")) + '">',
    '  <button type="button" data-research-quick-tab="all" aria-label="' + escapeResearchHtml(researchBrainT("tabs.all")) + '"><span class="brainstorming-tab-icon icon-lightbulb" aria-hidden="true"></span></button>',
    '  <button class="active" type="button" data-research-quick-tab="path" aria-label="' + escapeResearchHtml(researchBrainT("tabs.path")) + '"><span class="brainstorming-tab-icon icon-compass" aria-hidden="true"></span></button>',
    '  <button type="button" data-research-quick-tab="build" aria-label="' + escapeResearchHtml(researchBrainT("tabs.build")) + '"><span class="brainstorming-tab-icon icon-flag" aria-hidden="true"></span></button>',
    '  <button type="button" data-research-quick-tab="archived" aria-label="' + escapeResearchHtml(researchBrainT("tabs.archived")) + '"><span class="brainstorming-tab-icon icon-folder" aria-hidden="true"></span></button>',
    "</nav>"
  ].join("");
}

function renderResearchDetailStage(idea = researchIdea, navigation = {}) {
  return [
    '<div class="research-detail-stage">',
    renderResearchStickyNav(),
    renderResearchHeroPanel(idea),
    renderResearchMetaCard(idea),
    renderResearchNavButton("prev", researchT("nav.previousGoal"), navigation.hasPrevious),
    renderResearchNavButton("next", researchT("nav.nextGoal"), navigation.hasNext),
    renderResearchDescriptionDropdown(idea),
    "</div>"
  ].join("");
}

function renderResearchHeroPanel(idea = researchIdea) {
  const imageSrc = getResearchImageSrc(idea.image);

  return [
    '<article class="research-hero-panel">',
    '  <div class="research-hero-visual has-image" style="--research-idea-image: ' + cssResearchImageUrl(imageSrc) + '" aria-label="' + escapeResearchHtml(researchT("aria.ideaImage")) + '">',
    '    <img src="' + escapeResearchHtml(imageSrc) + '" alt="' + escapeResearchHtml(idea.title) + '" />',
    "  </div>",
    '  <div class="research-hero-copy">',
    '    <span class="research-hero-subtitle">' + escapeResearchHtml(idea.subtitle || researchT("hero.subtitle")) + "</span>",
    "    <h2>" + escapeResearchHtml(idea.title) + "</h2>",
    '    <div class="research-summary-row">',
    '      <p class="research-hero-summary"><span class="research-summary-text">' + escapeResearchHtml(idea.description) + '</span><button class="research-description-toggle" type="button" data-research-action="toggle-description" aria-expanded="false" hidden><span>' + escapeResearchHtml(researchT("hero.showMore")) + '</span></button></p>',
    "    </div>",
    '    <div class="research-tags">' + idea.tags.map(renderTagBadge).join("") + "</div>",
    "  </div>",
    '  <button class="research-meta-toggle" type="button" data-research-action="toggle-metadata" aria-controls="researchIdeaMetadata" aria-expanded="' + String(researchViewState.metadataExpanded) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg><span>' + escapeResearchHtml(researchT("metadata.details")) + '</span></button>',
    "</article>"
  ].join("");
}

function renderResearchMetaCard(idea = researchIdea) {
  return [
    '<aside id="researchIdeaMetadata" class="research-meta-card" aria-label="' + escapeResearchHtml(researchT("aria.metadata")) + '"' + (researchViewState.metadataExpanded ? "" : " hidden") + '>',
    renderMetaLine(researchT("metadata.createdAt"), formatResearchDate(idea.createdAt), "created", "research.metadata.createdAt"),
    renderMetaLine(researchT("metadata.updatedAt"), formatResearchDate(idea.updatedAt), "updated", "research.metadata.updatedAt"),
    renderMetaLine(researchT("metadata.status"), idea.statusLabel, "success status " + (idea.status === "build" ? "build" : "research"), "research.metadata.status"),
    renderMetaLine(researchT("metadata.priority"), idea.priority, "warning priority", "research.metadata.priority"),
    "</aside>"
  ].join("");
}

function renderResearchDescriptionDropdown(idea = researchIdea) {
  return [
    '<article class="research-description-dropdown" data-research-description>',
    "  <p>" + escapeResearchHtml(idea.description) + "</p>",
    "</article>"
  ].join("");
}

function renderResearchNavButton(direction, label, isEnabled) {
  return [
    '<button class="research-nav-button ' + direction + '" type="button" data-research-nav="' + direction + '" ' + (isEnabled ? "" : "disabled") + '>',
    '  <span aria-hidden="true">' + (direction === "prev" ? "&lsaquo;" : "&rsaquo;") + "</span>",
    "  <strong>" + label + "</strong>",
    "</button>"
  ].join("");
}

function renderIdeaDescriptionPanel() {
  return renderResearchPanel(
    "1. Opis ideje",
    '<p>Moj cilj je da izgubim 20 kg na zdrav i održiv način. Fokusiram se na postizanje kalorijskog deficita kroz pravilnu ishranu i uvođenje vežbanja, uz izgradnju zdravih navika, kvalitetan san i oporavak. Želim da poboljšam kondiciju, nivo energije, samopouzdanje i svakodnevnu funkcionalnost.</p>',
    "research-description-panel"
  );
}

function renderResearchDirectionsPanel() {
  const directionTiles = researchDirections
    .map((direction) => renderDirectionTile(direction, direction === "Ishrana"))
    .join("");

  return renderResearchPanel(
    "2. Pravci istraživanja",
    '<div class="research-direction-grid">' + directionTiles + renderAddDirectionTile() + "</div>",
    "research-directions-panel"
  );
}

function renderResearchDirectionsPanel(idea = researchIdea) {
  const directions = getResearchDirections(idea);
  const activeDirection = getActiveResearchDirection(idea);
  return [
    '<article class="research-directions-panel">',
    '  <button class="research-direction-page" type="button" data-research-action="shift-directions" data-shift="-1" aria-label="' + escapeResearchHtml(researchT("actions.previousDirections")) + '" hidden>‹</button>',
    '  <div class="research-direction-stack" data-research-direction-stack>',
    '    <div class="research-direction-grid">',
    directions.map((direction) => renderResearchDirectionTile(direction, activeDirection?.id === direction.id, idea)).join(""),
    renderAddDirectionTile(),
    "    </div>",
    "  </div>",
    '  <button class="research-direction-page" type="button" data-research-action="shift-directions" data-shift="1" aria-label="' + escapeResearchHtml(researchT("actions.nextDirections")) + '" hidden>›</button>',
    "</article>"
  ].join("");
}

function renderReferenceNotesPanel(idea = researchIdea) {
  const direction = getActiveResearchDirection(idea);
  const references = getDirectionReferences(direction);
  const activeReference = getActiveDirectionReference(direction);
  return [
    '<div class="research-row research-reference-notes-row">',
    '  <article class="research-panel research-reference-notes-panel">',
    '    <div class="research-reference-notes-layout">',
    '      <section class="research-reference-list-panel" aria-label="Reference">',
    '        <div class="research-reference-panel-head">',
    '          <strong>Reference</strong>',
    direction ? '          <button class="research-secondary-btn" type="button" data-research-action="add-reference" data-direction-id="' + escapeResearchHtml(direction.id || "") + '"><span>' + escapeResearchHtml(researchT("actions.addReference")) + '</span></button>' : "",
    "        </div>",
    references.length ? '<div class="research-reference-scroll"><div class="research-reference-card-grid" data-reference-list>' + references.map((reference) => renderReferenceCard(reference, direction, activeReference?.id === reference.id)).join("") + '</div><div class="research-reference-scrollbar" aria-hidden="true"><span></span></div></div>' : renderEmptyReferenceState(direction),
    "      </section>",
    '      <aside class="research-linked-note-panel" aria-label="' + escapeResearchHtml(researchT("aria.notes")) + '">',
    renderLinkedNoteEditor(activeReference, direction),
    "      </aside>",
    renderReferenceFocusToggle(),
    "    </div>",
    "  </article>",
    "</div>"
  ].join("");
}

function renderReferenceFocusToggle() {
  const label = researchViewState.isReferenceFocus ? researchT("actions.returnDetailPanel") : researchT("actions.enlargeReferencesNotes");
  const focusLetters = Array.from(researchT("actions.focus")).map((letter) => "<i>" + escapeResearchHtml(letter) + "</i>").join("");
  return [
    '<button class="research-focus-toggle" type="button" data-research-action="toggle-reference-focus" aria-label="' + escapeResearchHtml(label) + '" aria-pressed="' + (researchViewState.isReferenceFocus ? "true" : "false") + '">',
    '  <span class="research-focus-symbol" aria-hidden="true"></span>',
    '  <span class="research-focus-label" aria-hidden="true">' + focusLetters + '</span>',
    "</button>"
  ].join("");
}

function renderEmptyReferenceState(direction) {
  return [
    '<div class="research-reference-empty">',
    "  <strong>" + escapeResearchHtml(direction ? researchT("empty.noReferences") : researchT("empty.addDirectionFirst")) + "</strong>",
    "  <span>" + escapeResearchHtml(direction ? researchT("empty.addFirstReference") : researchT("empty.referencesNeedDirection")) + "</span>",
    "</div>"
  ].join("");
}

function renderReferenceCard(reference, direction, isActive) {
  const title = reference.title || getDefaultReferenceTitle(direction, 1);
  const notes = getReferenceNotes(reference);
  const firstNote = notes[0] || null;
  return [
    '<div class="research-reference-card ' + (isActive ? "active" : "") + '" role="button" tabindex="0" data-research-action="select-reference" data-direction-id="' + escapeResearchHtml(direction?.id || "") + '" data-reference-id="' + escapeResearchHtml(reference.id || "") + '" data-reference-link="' + escapeResearchHtml(reference.link || "") + '" data-reference-note-title="' + escapeResearchHtml(firstNote?.title || reference.noteTitle || "Beleska") + '" data-reference-note="' + escapeResearchHtml(firstNote?.body || reference.note || "") + '">',
    '  <button class="research-reference-edit" type="button" data-research-action="edit-reference" data-direction-id="' + escapeResearchHtml(direction?.id || "") + '" data-reference-id="' + escapeResearchHtml(reference.id || "") + '" data-reference-title="' + escapeResearchHtml(title) + '" data-reference-link="' + escapeResearchHtml(reference.link || "") + '" data-reference-image="' + escapeResearchHtml(reference.image || "") + '" data-reference-unit-type="' + escapeResearchHtml(reference.unitType || "") + '" data-reference-unit-value="' + escapeResearchHtml(reference.unitValue || "") + '" data-reference-unit-custom="' + escapeResearchHtml(reference.unitCustom || "") + '" data-reference-unit-label="' + escapeResearchHtml(reference.unitLabel || "") + '" data-reference-unit-system="' + escapeResearchHtml(reference.unitSystem || "") + '" data-reference-note-title="' + escapeResearchHtml(firstNote?.title || reference.noteTitle || researchT("labels.note")) + '" data-reference-note="' + escapeResearchHtml(firstNote?.body || reference.note || "") + '" aria-label="' + escapeResearchHtml(researchT("referenceForm.editAria")) + '">✎</button>',
    '  <button class="research-reference-delete" type="button" data-research-action="delete-reference" data-direction-id="' + escapeResearchHtml(direction?.id || "") + '" data-reference-id="' + escapeResearchHtml(reference.id || "") + '" aria-label="' + escapeResearchHtml(researchT("referenceForm.deleteAria")) + '">x</button>',
    '  <span class="research-reference-image">' + (reference.image ? '<img src="' + escapeResearchHtml(getResearchImageSrc(reference.image)) + '" alt="' + escapeResearchHtml(title) + '" />' : "") + "</span>",
    '  <span class="research-reference-copy">',
    '    <span class="research-reference-info">',
    "      <strong>" + escapeResearchHtml(title) + "</strong>",
      "      <small>" + escapeResearchHtml(reference.link || researchT("labels.noReferenceLink")) + "</small>",
    "    </span>",
    '    <span class="research-reference-meta">',
    renderReferenceUnitBadge(reference),
    "      <em>" + escapeResearchHtml(notes.length ? researchT("labels.noteCount", { count: notes.length }) : researchT("labels.noNotes")) + "</em>",
    "    </span>",
    "  </span>",
    "</div>"
  ].join("");
}

function renderReferenceUnitBadge(reference) {
  const unitDisplay = getReferenceUnitDisplay(reference);
  if (!unitDisplay) return "";
  const system = reference.unitSystem || getReferenceUnitOption(reference.unitType)?.system || "custom";
  return '<span class="research-reference-unit-badge" data-unit-system="' + escapeResearchHtml(system) + '">' + escapeResearchHtml(unitDisplay) + "</span>";
}

function renderLinkedNote(reference) {
  if (!reference) {
    return [
      '<div class="research-linked-note-empty">',
      '  <strong>' + escapeResearchHtml(researchT("labels.notes")) + "</strong>",
      '  <span>' + escapeResearchHtml(researchT("empty.chooseReference")) + "</span>",
      "</div>"
    ].join("");
  }

  return [
    '<div class="research-linked-note-content">',
    "  <strong>" + escapeResearchHtml(reference.noteTitle || researchT("labels.note")) + "</strong>",
    "  <p>" + escapeResearchHtml(reference.note || researchT("labels.noNoteDescription")) + "</p>",
    "</div>"
  ].join("");
}

function renderLinkedNoteEditor(reference, direction = null) {
  if (!reference) {
    return [
      '<div class="research-linked-note-empty">',
      '  <strong>' + escapeResearchHtml(researchT("labels.notes")) + "</strong>",
      '  <span>' + escapeResearchHtml(researchT("empty.chooseReference")) + "</span>",
      "</div>"
    ].join("");
  }

  const notes = getReferenceNotes(reference);
  return [
    '<div class="research-linked-note-content" data-linked-notes-editor data-direction-id="' + escapeResearchHtml(direction?.id || "") + '" data-reference-id="' + escapeResearchHtml(reference.id || "") + '">',
    '  <div class="research-linked-note-head">',
    '    <strong>' + escapeResearchHtml(researchT("labels.notes")) + "</strong>",
    '    <button class="research-secondary-btn" type="button" data-research-action="add-note" data-direction-id="' + escapeResearchHtml(direction?.id || "") + '" data-reference-id="' + escapeResearchHtml(reference.id || "") + '"><span>' + escapeResearchHtml(researchT("actions.addNote")) + '</span></button>',
    "  </div>",
    notes.length ? '<div class="research-linked-note-scroll"><div class="research-linked-note-list" data-linked-note-list>' + notes.map((note, index) => renderLinkedNoteItem(note, index)).join("") + '</div><div class="research-linked-note-scrollbar" aria-hidden="true"><span></span></div></div>' : '<div class="research-linked-note-empty compact"><span>' + escapeResearchHtml(researchT("empty.noReferenceNotes")) + '</span></div>',
    renderReferenceLinks(reference.link),
    "</div>"
  ].join("");
}

function renderLinkedNoteItem(note, index) {
  const title = note.title || researchT("labels.note") + " " + (index + 1);
  return [
    '<details class="research-linked-note-item" data-linked-note-editor data-note-id="' + escapeResearchHtml(note.id || "") + '" data-note-title="' + escapeResearchHtml(title) + '">',
    '  <summary>',
    "    <span>" + escapeResearchHtml(title) + "</span>",
    '    <button class="research-linked-note-edit" type="button" data-research-action="edit-note" data-note-id="' + escapeResearchHtml(note.id || "") + '" aria-label="Izmeni ime beleske">edit</button>',
    '    <button class="research-linked-note-delete" type="button" data-research-action="delete-note" data-note-id="' + escapeResearchHtml(note.id || "") + '" aria-label="Izbrisi belesku">x</button>',
    "  </summary>",
    '  <textarea class="research-linked-note-body" name="note" rows="5" aria-label="' + escapeResearchHtml(researchT("noteForm.bodyAria")) + '">' + escapeResearchHtml(note.body || "") + "</textarea>",
    "</details>"
  ].join("");
}

function renderReferenceLinks(value) {
  const links = String(value || "")
    .split(/[\n,]+/)
    .map((link) => link.trim())
    .filter(Boolean);
  if (!links.length) return '<div class="research-linked-note-links empty">' + escapeResearchHtml(researchT("labels.noLinks")) + '</div>';

  return [
    '<div class="research-linked-note-links">',
    links.map((link) => {
      const href = /^https?:\/\//i.test(link) ? link : "https://" + link;
      return '<a href="' + escapeResearchHtml(href) + '" target="_blank" rel="noopener noreferrer">' + escapeResearchHtml(getReferenceLinkLabel(href)) + "</a>";
    }).join(""),
    "</div>"
  ].join("");
}

function getReferenceLinkLabel(value) {
  try {
    return new URL(value).origin;
  } catch (error) {
    return String(value || "").split(/[/?#]/)[0] || value;
  }
}

function renderReferencesPanel() {
  const slots = Array.from({ length: 6 }, (_, index) => {
    return [
      '<div class="research-reference-slot">',
      '  <span class="research-reference-surface"></span>',
      '  <span class="research-placeholder-line short"></span>',
      '  <span class="research-placeholder-line"></span>',
      "</div>"
    ].join("");
  }).join("");

  return renderResearchPanel(
    "3. Reference",
    '<div class="research-reference-grid">' + slots + '</div><button class="research-secondary-btn" type="button">+ Dodaj referencu</button>',
    "research-references-panel"
  );
}

function renderNotesPanel() {
  return renderResearchPanel(
    "4. Beleške (Ishrana)",
    [
      '<div class="research-note-area" aria-label="Prazan prostor za beleške">',
      '  <span></span><span></span><span></span><span></span><span></span>',
      "</div>",
      '<div class="research-panel-actions">',
      '  <button class="research-secondary-btn" type="button">+ Dodaj belešku</button>',
      '  <button class="research-link-btn" type="button">Otvori sve beleške →</button>',
      "</div>"
    ].join(""),
    "research-notes-panel"
  );
}

function renderResourcesPanel() {
  const cards = researchResources
    .map(([label, text]) => {
      return [
        '<div class="research-resource-card">',
        '  <span class="research-icon-box" aria-hidden="true"></span>',
        "  <strong>" + escapeResearchHtml(label) + "</strong>",
        "  <small>" + escapeResearchHtml(text) + "</small>",
        "</div>"
      ].join("");
    })
    .join("");

  return renderResearchPanel(
    researchT("panels.resources"),
    '<div class="research-resource-grid">' + cards + '</div><button class="research-secondary-btn" type="button">' + escapeResearchHtml(researchT("actions.addResource")) + '</button>',
    "research-resources-panel",
    "research.panels.resources"
  );
}

function getResearchFinancialComparisonOptionsForIdea(ideaId) {
  if (typeof window.getFinancialResearchComparisonOptions === "function") {
    const options = window.getFinancialResearchComparisonOptions(ideaId);
    if (options.length) return options;
  }
  try {
    const cache = window.MentorData?.repositories?.comparisons?.getResearchCache?.() || {};
    const options = cache?.ideas?.[ideaId];
    return Array.isArray(options) ? options : [];
  } catch (error) {
    return [];
  }
}

function formatResearchFinancialMoney(value) {
  return new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function renderConnectedResearchFinancialMetric(label, value, tone, labelKey) {
  const labelAttr = labelKey ? '' : "";
  return '<div class="research-financial-metric"><span' + labelAttr + '>' + escapeResearchHtml(label) + '</span><strong>' + escapeResearchHtml(value) + '</strong><i class="' + escapeResearchHtml(tone || "neutral") + '"></i></div>';
}

function renderConnectedBudgetComparisonPanel(idea = researchIdea) {
  const options = getResearchFinancialComparisonOptionsForIdea(idea.id).slice(0, 3);
  const body = options.length ? [
    '<div class="research-financial-grid">',
    options.map((option) => [
      '<article class="research-financial-card">',
      "<h3>" + escapeResearchHtml(option.label + " - " + option.title) + "</h3>",
      renderConnectedResearchFinancialMetric(researchT("finance.totalCost"), formatResearchFinancialMoney(option.totalCost), option.pressureTone, "research.finance.totalCost"),
      renderConnectedResearchFinancialMetric(researchT("finance.missing"), formatResearchFinancialMoney(option.missingAmount), option.missingAmount ? option.pressureTone : "good", "research.finance.missing"),
      renderConnectedResearchFinancialMetric(researchT("finance.liquidAfter"), formatResearchFinancialMoney(option.capitalAfter), option.capitalAfter ? "good" : "medium", "research.finance.liquidAfter"),
      renderConnectedResearchFinancialMetric(researchT("finance.monthlyContribution"), formatResearchFinancialMoney(option.monthlyContribution), option.pressureTone, "research.finance.monthlyContribution"),
      renderConnectedResearchFinancialMetric(researchT("finance.monthsToRealization"), option.monthsToGoal ? String(option.monthsToGoal) : (option.missingAmount === 0 ? researchT("finance.now") : "-"), option.pressureTone, "research.finance.monthsToRealization"),
      '<div class="research-financial-status"><span>' + escapeResearchHtml(researchT("finance.budgetImpact")) + '</span><strong class="' + escapeResearchHtml(option.pressureTone || "neutral") + '">' + escapeResearchHtml(option.pressureLabel || researchT("finance.noData")) + "</strong></div>",
      "</article>"
    ].join("")).join(""),
    "</div>",
    '<button class="research-link-btn align-left" type="button" data-research-action="financial-comparison" data-idea-id="' + escapeResearchHtml(idea.id || "") + '"><span>' + escapeResearchHtml(researchT("actions.financialDetails")) + '</span></button>'
  ].join("") : [
    '<div class="research-financial-empty">',
    '<p>' + escapeResearchHtml(researchT("empty.noFinance")) + "</p>",
    '<button class="research-link-btn align-left" type="button" data-research-action="financial-comparison" data-idea-id="' + escapeResearchHtml(idea.id || "") + '"><span>' + escapeResearchHtml(researchT("actions.financialDetails")) + '</span></button>',
    "</div>"
  ].join("");

  return renderResearchPanel(researchT("panels.financial"), body, "research-budget-panel", "research.panels.financial");
}

function renderBudgetComparisonPanel() {
  const rows = budgetRows
    .map((row) => "<tr>" + row.map((cell) => "<td>" + escapeResearchHtml(cell) + "</td>").join("") + "</tr>")
    .join("");

  return renderResearchPanel(
    researchT("panels.financial"),
    [
      '<div class="research-table-wrap">',
      '  <table class="research-budget-table">',
      '    <thead><tr><th>' + escapeResearchHtml(researchT("table.category")) + '</th><th>' + escapeResearchHtml(researchT("table.averageBudget")) + '</th><th>' + escapeResearchHtml(researchT("table.myBudget")) + '</th><th>' + escapeResearchHtml(researchT("table.status")) + "</th></tr></thead>",
      "    <tbody>" + rows + "</tbody>",
      "  </table>",
      "</div>",
      '<button class="research-link-btn align-left" type="button">' + escapeResearchHtml(researchT("actions.financialDetails")) + '</button>'
    ].join(""),
    "research-budget-panel",
    "research.panels.financial"
  );
}

function renderIdeaTestPanel(idea = researchIdea) {
  const tests = getIdeaTests(idea);
  const ideaKey = getResearchIdeaKey(idea);
  const activeTest = getActiveIdeaTest(idea, tests);
  const activeDay = activeTest ? getActiveTestDay(activeTest) : null;
  const limitReached = tests.length >= 4;

  if (!tests.length) {
    return renderResearchPanel(
      researchT("panels.ideaTest"),
      [
        '<div class="research-test-empty">',
        '  <div class="research-test-empty-mark">+</div>',
        '  <strong>' + escapeResearchHtml(researchT("empty.noTestsTitle")) + "</strong>",
        '  <p>' + escapeResearchHtml(researchT("empty.noTestsText")) + "</p>",
        '  <button class="research-primary-btn" type="button" data-research-action="create-test" data-idea-id="' + escapeResearchHtml(ideaKey) + '"><span>' + escapeResearchHtml(researchT("actions.createFirstTest")) + '</span></button>',
        "</div>"
      ].join(""),
      "research-test-panel",
      "research.panels.ideaTest"
    );
  }

  const testTabs = tests.map((test) => {
    const isActive = test.id === activeTest.id;
    if (test.id) researchViewState.renderedTestsById[test.id] = test;
    return [
      '<div class="research-test-tab-wrap ' + (isActive ? "active" : "") + '">',
      '  <button class="research-test-tab ' + (isActive ? "active" : "") + '" type="button" data-research-action="select-test" data-idea-id="' + escapeResearchHtml(ideaKey) + '" data-test-id="' + escapeResearchHtml(test.id || "") + '">',
      "    <strong>" + escapeResearchHtml(test.title || researchT("panels.ideaTest")) + "</strong>",
      '    <small>' + Number(test.days?.length || test.dayCount || 0) + ' <span>' + escapeResearchHtml(researchT("test.days")) + "</span></small>",
      "  </button>",
      '  <div class="research-test-tab-actions">',
      '    <button class="research-test-tab-action" type="button" data-research-action="edit-test" data-idea-id="' + escapeResearchHtml(ideaKey) + '" data-test-id="' + escapeResearchHtml(test.id || "") + '" aria-label="Uredi test">✎</button>',
      '    <button class="research-test-tab-action danger" type="button" data-research-action="delete-test" data-idea-id="' + escapeResearchHtml(ideaKey) + '" data-test-id="' + escapeResearchHtml(test.id || "") + '" aria-label="Obrisi test">x</button>',
      "  </div>",
      "</div>"
    ].join("");
  }).join("");

  const dayCount = activeTest.days.length || 1;
  const steps = activeTest.days.map((dayData, index) => {
    const day = index + 1;
    const isActive = dayData.id === activeDay.id;
    const questionCount = (dayData.questions || []).length;
    return [
      '<button class="research-test-day ' + (isActive ? "active" : "") + '" type="button" data-research-action="select-test-day" data-idea-id="' + escapeResearchHtml(ideaKey) + '" data-test-id="' + escapeResearchHtml(activeTest.id || "") + '" data-day-id="' + escapeResearchHtml(dayData.id || "") + '">',
      '  <span class="research-test-day-number">' + day + "</span>",
      "  <small" + getResearchDayTitleAttrs(dayData.title, day) + ">" + escapeResearchHtml(getResearchDayTitleText(dayData.title, day)) + "</small>",
      '  <em>' + (questionCount ? questionCount + ' <span>' + escapeResearchHtml(researchT("test.questions")) + "</span>" : '<span>' + escapeResearchHtml(researchT("test.noQuestions")) + "</span>") + "</em>",
      "</button>"
    ].join("");
  }).join("");

  return renderResearchPanel(
    [
      '<span>' + escapeResearchHtml(researchT("panels.ideaTest")) + '</span>',
      '<button class="research-secondary-btn research-test-calendar-btn" type="button" data-research-action="calendar"><span>' + escapeResearchHtml(researchT("actions.addCalendar")) + '</span></button>'
    ].join(""),
    [
      '<div class="research-test-workspace">',
      '  <aside class="research-test-list" aria-label="' + escapeResearchHtml(researchT("aria.testList")) + '">',
      '    <button class="research-test-create" type="button" data-research-action="create-test" data-idea-id="' + escapeResearchHtml(ideaKey) + '" ' + (limitReached ? "disabled" : "") + ' aria-label="' + escapeResearchHtml(researchT("actions.newTest")) + '"><span>+</span><strong>' + escapeResearchHtml(researchT("actions.newTest")) + '</strong></button>',
      testTabs,
      limitReached ? '<p class="research-test-limit">' + escapeResearchHtml(researchT("test.maxTests")) + "</p>" : "",
      "  </aside>",
      '  <section class="research-test-overview" aria-label="' + escapeResearchHtml(researchT("aria.testOverview")) + '">',
      '    <div class="research-test-summary">',
      "      <strong>" + escapeResearchHtml(activeTest.title || researchT("test.activeTest")) + "</strong>",
      '      <span><span' + getResearchDayTitleAttrs(activeDay.title, 1) + ">" + escapeResearchHtml(getResearchDayTitleText(activeDay.title, 1)) + '</span> <span>' + escapeResearchHtml(researchT("test.of")) + "</span> " + Number(activeTest.days.length || 1) + "</span>",
      "    </div>",
      '    <div class="research-test-timeline" data-day-count="' + dayCount + '">' + steps + "</div>",
      '    <div class="research-test-goal">',
      renderDailyTestQuestions(activeTest, activeDay),
      "    </div>",
      "  </section>",
      '  <section class="research-test-daily" aria-label="' + escapeResearchHtml(researchT("aria.dailyTest")) + '">',
      '    <div class="research-test-daily-head">',
      "      <strong" + getResearchDayTitleAttrs(activeDay.title, 1) + ">" + escapeResearchHtml(getResearchDayTitleText(activeDay.title, 1)) + "</strong>",
      '      <span>' + escapeResearchHtml(researchT("test.structuredScores")) + "</span>",
      "    </div>",
      renderDailyStructuredQuestions(activeTest, activeDay),
      "  </section>",
      "</div>",
    ].join(""),
    "research-test-panel",
    "research.panels.ideaTest"
  );
}

function getIdeaTests(idea = researchIdea) {
  const tests = Array.isArray(idea.pathData?.tests) ? idea.pathData.tests : [];
  return tests.slice(0, 4).map(normalizeIdeaTest);
}

function normalizeIdeaTest(test, index = 0) {
  const dayCount = [1, 3, 5, 7, 14].includes(Number(test.dayCount)) ? Number(test.dayCount) : Number(test.days?.length || test.days || 1) || 1;
  const days = Array.isArray(test.days)
    ? test.days
    : Array.from({ length: dayCount }, (_, dayIndex) => ({ title: "Dan " + (dayIndex + 1), tasks: [] }));
  return {
    id: test.id || "test_" + index,
    title: test.title || researchT("panels.ideaTest"),
    dayCount: days.length,
    mainQuestion: test.mainQuestion || "",
    structuredQuestions: Array.isArray(test.structuredQuestions) ? test.structuredQuestions : [],
    customStructuredQuestions: normalizeTestQuestionList(test.customStructuredQuestions),
    days: days.map((day, dayIndex) => ({
      id: day.id || "day_" + (dayIndex + 1),
      title: day.title || "Dan " + (dayIndex + 1),
      result: day.result || "",
      scores: normalizeTestDayScores(day.scores),
      answers: normalizeTestDayAnswers(day.answers),
      questions: normalizeTestQuestionList(day.questions || getLegacyTaskQuestions(day.tasks)),
      tasks: Array.isArray(day.tasks) ? day.tasks.map((task, taskIndex) => ({
        id: task.id || "task_" + taskIndex,
        text: task.text || String(task || ""),
        done: Boolean(task.done)
      })).filter((task) => task.text) : []
    }))
  };
}

function normalizeTestQuestionList(questions = []) {
  return (Array.isArray(questions) ? questions : []).map((question, index) => {
    const type = ["score", "text", "checkbox"].includes(question.type) ? question.type : "text";
    const options = Array.isArray(question.options) ? question.options.map((option) => String(option || "").trim()).filter(Boolean) : [];
    return {
      id: question.id || "question_" + Date.now() + "_" + index,
      text: question.text || question.title || "",
      type,
      options: type === "checkbox" ? (options.length ? options : ["Da", "Ne"]) : []
    };
  }).filter((question) => question.text.trim());
}

function getLegacyTaskQuestions(tasks = []) {
  return (Array.isArray(tasks) ? tasks : []).map((task, index) => ({
    id: task.id || "task_question_" + index,
    text: task.text || String(task || ""),
    type: "checkbox",
    options: ["Uradjeno"]
  })).filter((question) => question.text);
}

function normalizeTestDayScores(scores = {}) {
  return Object.fromEntries(Object.entries(scores || {}).map(([question, value]) => [
    question,
    Math.min(10, Math.max(1, Number(value) || 5))
  ]));
}

function normalizeTestDayAnswers(answers = {}) {
  return Object.fromEntries(Object.entries(answers || {}).map(([key, value]) => {
    if (Array.isArray(value)) return [key, value.map(String)];
    if (typeof value === "number") return [key, Math.min(10, Math.max(1, value || 1))];
    return [key, String(value || "")];
  }));
}

function getActiveIdeaTest(idea, tests) {
  const ideaKey = getResearchIdeaKey(idea);
  const activeId = researchViewState.activeTestByIdea[ideaKey];
  return tests.find((test) => test.id === activeId) || tests[0];
}

function getActiveTestDay(test) {
  const activeDayId = researchViewState.activeDayByTest[test.id || ""];
  return test.days.find((day) => day.id === activeDayId) || test.days[0] || { id: "day_1", title: "", tasks: [] };
}

function getResearchIdeaKey(idea = researchIdea) {
  return String(idea.id || idea.title || "research");
}

function getDefaultResearchDayNumber(title, fallbackNumber = 1) {
  const match = String(title || "").trim().match(/^(dan|day)\s+(\d+)$/i);
  return match ? Number(match[2]) || fallbackNumber : fallbackNumber;
}

function isDefaultResearchDayTitle(title) {
  return !String(title || "").trim() || /^(dan|day)\s+\d+$/i.test(String(title || "").trim());
}

function getResearchDayTitleText(title, fallbackNumber = 1) {
  if (!isDefaultResearchDayTitle(title)) return String(title || "");
  return researchT("test.dayNumber", { number: getDefaultResearchDayNumber(title, fallbackNumber) });
}

function getResearchDayTitleAttrs(title, fallbackNumber = 1) {
  return "";
}

function getResearchCanvasCards(idea) {
  const directions = getResearchDirections(idea);
  const activeDirection = getActiveResearchDirection(idea);
  return window.MentorResearchModel.getCanvasCards(idea, {
    directionId: activeDirection?.id,
    getFinanceOptions: () => getResearchFinancialComparisonOptionsForIdea(idea.id),
    formatFinancialMoney: formatResearchFinancialMoney,
    getReferenceUnitDisplay,
    translate: researchT
  });
}

function getResearchCanvasGraph(cards, collapsed = {}) {
  return window.MentorResearchModel.getCanvasGraph(cards, collapsed);
}

function renderResearchCanvas(idea, navigation = {}) {
  const cards = getResearchCanvasCards(idea);
  const graph = getResearchCanvasGraph(cards, idea.pathData?.researchCanvasCollapsed || {});
  const direction = getActiveResearchDirection(idea);
  return [
    '<section class="research-canvas-section" aria-label="' + escapeResearchHtml(researchT("canvas.aria")) + '">',
    '  <div class="research-row research-row-intro">',
    renderResearchDirectionsPanel(idea),
    '    <button class="research-directions-return" type="button" data-research-scroll-overview aria-label="' + escapeResearchHtml(researchT("canvas.backToOverview")) + '" title="' + escapeResearchHtml(researchT("canvas.backToOverview")) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h14M12 20V8m-5 5 5-5 5 5"/></svg></button>',
    '  </div>',
    '  <div class="research-canvas-toolbar">',
    window.MentorResearchOrganizer.renderSelectionBar(researchT, escapeResearchHtml),
    '  </div>',
    '  <div class="research-canvas-viewport" data-research-canvas-viewport tabindex="0" role="region" aria-label="' + escapeResearchHtml(researchT("canvas.aria")) + '">',
    '  <div class="research-canvas" data-research-canvas data-idea-id="' + escapeResearchHtml(idea.id || "") + '">',
    '    <svg class="research-canvas-connections" data-research-canvas-connections aria-hidden="true"></svg>',
    '    <div class="research-canvas-connection-handles" data-research-connection-handles></div>',
    window.MentorResearchOrganizer.renderLayers(idea, direction?.id || "", researchT, escapeResearchHtml, cards),
    cards.length ? cards.map((card) => renderResearchCanvasCard(card, graph, idea.pathData?.researchCanvasCollapsed || {})).join("") : '<p class="research-canvas-empty">' + escapeResearchHtml(researchT("canvas.empty")) + '</p>',
    '  </div>',
    '  <span class="research-canvas-hint">' + escapeResearchHtml(researchT("canvas.hint")) + '</span>',
    '  <div class="research-organizer-marquee" data-research-marquee hidden></div>',
    '  </div>',
    window.MentorResearchOrganizer.renderToolbar(researchT, escapeResearchHtml, getResearchCanvasIcon),
    renderResearchCompactIdeaNav(idea, navigation, cards, direction),
    '</section>'
  ].join("");
}

function layoutResearchDirectionTabs(view) {
  const stack = view?.querySelector("[data-research-direction-stack]");
  if (!stack) return;
  const controls = view.querySelectorAll('[data-research-action="shift-directions"]');
  const maxScroll = Math.max(0, stack.scrollWidth - stack.clientWidth);
  controls.forEach((button) => {
    button.hidden = maxScroll <= 1;
    button.disabled = button.dataset.shift === "-1" ? stack.scrollLeft <= 1 : stack.scrollLeft >= maxScroll - 1;
  });
}

function clampResearchDockRect(rect, viewportWidth, viewportHeight) {
  return window.MentorResearchGeometry.clampDockRect(rect, viewportWidth, viewportHeight);
}

function applyResearchCompactDockState(view, dock) {
  const state = researchViewState.compactDock;
  const isFloating = state?.mode === "floating";
  const section = view.querySelector(".research-canvas-section");
  if (isFloating && dock.parentElement !== view) view.appendChild(dock);
  else if (!isFloating && section && dock.parentElement !== section) section.appendChild(dock);
  dock.classList.toggle("is-floating", isFloating);
  dock.classList.toggle("is-pinned", Boolean(state?.pinned));
  if (isFloating) {
    Object.assign(state, clampResearchDockRect(state, window.innerWidth, window.innerHeight));
    dock.style.setProperty("--research-dock-left", Math.round(state.left) + "px");
    dock.style.setProperty("--research-dock-top", Math.round(state.top) + "px");
  } else {
    dock.style.removeProperty("--research-dock-left");
    dock.style.removeProperty("--research-dock-top");
  }
  if (state?.width) dock.style.setProperty("--research-dock-width", Math.round(state.width) + "px");
  else dock.style.removeProperty("--research-dock-width");
  if (state?.height) dock.style.setProperty("--research-dock-height", Math.round(state.height) + "px");
  else dock.style.removeProperty("--research-dock-height");
  const attach = dock.querySelector("[data-research-dock-attach]");
  if (attach) {
    const label = researchT(state?.pinned ? "compactNav.unpin" : "compactNav.pin");
    attach.setAttribute("aria-label", label);
    attach.setAttribute("title", label);
    attach.setAttribute("aria-pressed", String(Boolean(state?.pinned)));
  }
}

function bindResearchCompactIdeaDock(root, view) {
  const dock = view.querySelector(".research-compact-idea-nav");
  if (!dock) return;
  applyResearchCompactDockState(view, dock);

  const attach = dock.querySelector("[data-research-dock-attach]");
  attach?.addEventListener("click", (event) => {
    event.stopPropagation();
    const state = researchViewState.compactDock;
    if (state?.pinned) {
      state.pinned = false;
    } else {
      const rect = dock.getBoundingClientRect();
      researchViewState.compactDock = { mode: "floating", pinned: true, left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    }
    applyResearchCompactDockState(view, dock);
    positionResearchCanvasAddMenu(dock.querySelector("[data-research-canvas-menu]"));
  });

  const startPointerInteraction = (event, kind) => {
    if (event.button !== 0 || event.isPrimary === false || window.MentorUIEvents?.isTextEditingEvent?.(event)) return;
    if (kind === "move" && event.target.closest("button, a, input, textarea, select, [contenteditable], .research-canvas-add-wrap")) return;
    if (kind === "move" && researchViewState.compactDock?.pinned) return;
    event.preventDefault();
    event.stopPropagation();
    const handle = event.currentTarget;
    const origin = dock.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    let active = false;
    handle.setPointerCapture(event.pointerId);
    const move = (moveEvent) => {
      if (moveEvent.pointerId !== event.pointerId) return;
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (!active && Math.hypot(dx, dy) < 4) return;
      if (!active) {
        active = true;
        researchViewState.compactDock = { mode: "floating", pinned: false, left: origin.left, top: origin.top, width: origin.width, height: origin.height };
        applyResearchCompactDockState(view, dock);
        handle.setPointerCapture(event.pointerId);
        dock.classList.add(kind === "move" ? "is-moving" : "is-resizing");
      }
      const next = kind === "move"
        ? { left: origin.left + dx, top: origin.top + dy, width: origin.width, height: origin.height }
        : { left: origin.left, top: origin.top, width: origin.width + dx, height: origin.height + dy };
      Object.assign(researchViewState.compactDock, clampResearchDockRect(next, window.innerWidth, window.innerHeight));
      applyResearchCompactDockState(view, dock);
      positionResearchCanvasAddMenu(dock.querySelector("[data-research-canvas-menu]"));
    };
    const finish = (endEvent) => {
      if (endEvent.pointerId !== event.pointerId) return;
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", finish);
      handle.removeEventListener("pointercancel", finish);
      dock.classList.remove("is-moving", "is-resizing");
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
  };
  dock.querySelector(".research-compact-idea-main")?.addEventListener("pointerdown", (event) => startPointerInteraction(event, "move"));
  dock.querySelector("[data-research-dock-resize]")?.addEventListener("pointerdown", (event) => startPointerInteraction(event, "resize"));

  if (!root._researchDockResizeListener) {
    root._researchDockResizeListener = () => {
      const currentView = root.querySelector(".research-view");
      const currentDock = currentView?.querySelector(".research-compact-idea-nav");
      if (currentView && currentDock) {
        applyResearchCompactDockState(currentView, currentDock);
        positionResearchCanvasAddMenu(currentDock.querySelector("[data-research-canvas-menu]"));
      }
    };
    window.addEventListener("resize", root._researchDockResizeListener);
  }
}

function getResearchCanvasIcon(type) {
  return { note: "✎", av: "♫", source: "▤", link: "↗", image: "▧", video: "▶", finance: "€" }[type] || "✎";
}

function getResearchCanvasImage(card) {
  if (card.image) return getResearchImageSrc(card.image);
  if (card.type !== "video") return "";
  const url = String(card.url || "");
  const id = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/i)?.[1];
  return id ? "https://img.youtube.com/vi/" + id + "/hqdefault.jpg" : "";
}

function getResearchCanvasFinanceDisplay(card) {
  const price = String(card.price || "").trim();
  if (!price) return researchT("finance.noData");
  const currency = String(card.currency || "").trim();
  return currency && !/(?:\b(?:EUR|USD|RSD|GBP|CHF)\b|[€$£])/i.test(price) ? price + " " + currency : price;
}

function getResearchCanvasFinanceFormValues(card) {
  const price = String(card.price || "").trim();
  const trailingCurrency = price.match(/^(.+?)\s+(EUR|USD|RSD|GBP|CHF)$/i);
  return { price: trailingCurrency ? trailingCurrency[1] : price, currency: String(card.currency || trailingCurrency?.[2] || "EUR").toUpperCase() };
}

function getSafeResearchCanvasUrl(value) {
  try {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : "https://" + raw);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch (error) {
    return "";
  }
}

function getResearchVideoEmbedUrl(value) {
  const safeUrl = getSafeResearchCanvasUrl(value);
  if (!safeUrl) return "";
  const parsed = new URL(safeUrl);
  const host = parsed.hostname.toLowerCase();
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com", "youtu.be", "www.youtu.be"].includes(host)) {
    const id = host.endsWith("youtu.be") ? parts[0] : parts[0] === "watch" ? parsed.searchParams.get("v") : ["shorts", "embed", "live"].includes(parts[0]) ? parts[1] : "";
    return /^[A-Za-z0-9_-]{11}$/.test(id || "") ? "https://www.youtube-nocookie.com/embed/" + id : "";
  }
  if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(host)) {
    const id = parts.find((part) => /^\d+$/.test(part));
    const hash = parsed.searchParams.get("h") || (parts[0] === "video" ? parts[2] : /^\d+$/.test(parts[0] || "") ? parts[1] : "");
    return id ? "https://player.vimeo.com/video/" + id + (/^[A-Za-z0-9]+$/.test(hash || "") ? "?h=" + hash : "") : "";
  }
  if (["dailymotion.com", "www.dailymotion.com", "dai.ly", "www.dai.ly"].includes(host)) {
    const id = host.endsWith("dai.ly") ? parts[0] : parts[0] === "video" ? parts[1] : "";
    return /^[A-Za-z0-9]+$/.test(id || "") ? "https://www.dailymotion.com/embed/video/" + id : "";
  }
  return "";
}

function closeResearchCanvasMedia(options = {}) {
  window.MentorResearchAttachments?.close(options);
  researchCanvasMediaRequest += 1;
  Array.from(researchCanvasMediaSessions).forEach((session) => {
    if (options.preserveMinimized && session.modal.classList.contains("is-minimized")) return;
    closeResearchMediaSession(session);
  });
}

function closeResearchMediaSession(session) {
  if (!researchCanvasMediaSessions.delete(session)) return;
  session.stopIdle?.();
  session.modal._researchMediaPanelCleanup?.();
  document.removeEventListener("keydown", session.onKeydown);
  if (document.fullscreenElement && session.modal.contains(document.fullscreenElement)) document.exitFullscreen?.().catch(() => {});
  const video = session.modal.querySelector("video");
  if (video) {
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
  session.modal.remove();
  if (session.objectUrl) window.URL.revokeObjectURL(session.objectUrl);
  syncResearchModalLayer();
  if (session.trigger?.isConnected) session.trigger.focus();
}

function formatResearchMediaTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  return minutes + ":" + String(whole % 60).padStart(2, "0");
}

function bindResearchMediaIdle(modal) {
  let timer;
  const reveal = () => {
    modal.classList.remove("is-idle");
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (!modal.classList.contains("is-minimized")) modal.classList.add("is-idle");
    }, 1800);
  };
  modal.addEventListener("pointermove", reveal);
  modal.addEventListener("pointerdown", reveal);
  modal.addEventListener("keydown", reveal);
  modal.addEventListener("focusin", reveal);
  reveal();
  return () => {
    window.clearTimeout(timer);
    ["pointermove", "pointerdown", "keydown", "focusin"].forEach((type) => modal.removeEventListener(type, reveal));
  };
}

function bindResearchNativeVideoControls(modal, video) {
  const shell = modal.querySelector("[data-media-video-shell]");
  const play = modal.querySelector("[data-media-play]");
  const mute = modal.querySelector("[data-media-mute]");
  const volume = modal.querySelector("[data-media-volume]");
  const speed = modal.querySelector("[data-media-speed]");
  const seek = modal.querySelector("[data-media-seek]");
  const time = modal.querySelector("[data-media-time]");
  const syncPlay = () => {
    const playing = !video.paused && !video.ended;
    shell.classList.toggle("is-playing", playing);
    play.textContent = playing ? "Ⅱ" : "▶";
    play.setAttribute("aria-label", researchT(playing ? "canvas.pauseVideo" : "canvas.playVideo"));
  };
  const syncMute = () => {
    mute.textContent = video.muted ? "♩" : "♫";
    mute.setAttribute("aria-label", researchT(video.muted ? "canvas.unmuteVideo" : "canvas.muteVideo"));
  };
  const syncTime = () => {
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    seek.value = duration ? String(Math.round(video.currentTime / duration * 1000)) : "0";
    time.textContent = formatResearchMediaTime(video.currentTime) + " / " + formatResearchMediaTime(duration);
  };
  const togglePlay = () => { if (video.paused || video.ended) video.play().catch(() => {}); else video.pause(); };
  play.addEventListener("click", togglePlay);
  mute.addEventListener("click", () => { video.muted = !video.muted; syncMute(); });
  volume.addEventListener("input", () => {
    video.volume = Number(volume.value) / 100;
    video.muted = video.volume === 0;
    syncMute();
  });
  speed.addEventListener("change", () => { video.playbackRate = Number(speed.value) || 1; });
  seek.addEventListener("input", () => {
    if (Number.isFinite(video.duration) && video.duration > 0) video.currentTime = video.duration * Number(seek.value) / 1000;
    syncTime();
  });
  shell.addEventListener("click", (event) => { if (!event.target.closest("[data-media-controls]")) togglePlay(); });
  video.addEventListener("keydown", (event) => {
    if (event.key === " " || event.key === "Enter") { event.preventDefault(); togglePlay(); }
  });
  ["play", "pause", "ended"].forEach((type) => video.addEventListener(type, syncPlay));
  ["loadedmetadata", "durationchange", "timeupdate", "seeked"].forEach((type) => video.addEventListener(type, syncTime));
  video.controls = false;
  syncPlay();
  syncMute();
  syncTime();
}

async function openResearchCanvasMedia(root, card, trigger) {
  if (["note", "av", "source"].includes(card?.type)) {
    closeResearchCanvasMedia({ preserveMinimized: true });
    const view = root.querySelector(".research-view") || root.closest?.(".research-view") || root;
    await window.MentorResearchAttachments?.open(view, card, trigger, researchT, escapeResearchHtml);
    return;
  }
  if (!["video", "image"].includes(card?.type)) return;
  closeResearchCanvasMedia({ preserveMinimized: true });
  const requestId = researchCanvasMediaRequest;
  const view = root.querySelector(".research-view") || root.closest?.(".research-view") || root;
  const originalUrl = card.stickerAsset ? window.MentorResearchStickerSections.safeUrl(card.stickerAsset.url) : getSafeResearchCanvasUrl(card.url);
  let objectUrl = "";
  let localFileName = "";
  if (card.stickerAsset?.mediaId || card.type === "video" && card.videoMediaId) {
    try {
      const record = await window.MentorData?.repositories?.media?.getEntity?.(card.stickerAsset?.entityType || "research-video", card.stickerAsset?.mediaId || card.videoMediaId);
      if (record?.blob) {
        objectUrl = window.URL.createObjectURL(record.blob);
        localFileName = record.originalName || researchT("canvas.types.video");
      }
    } catch (error) { console.warn("Research video could not be loaded.", error); }
  }
  if (!view.isConnected || requestId !== researchCanvasMediaRequest) {
    if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    return;
  }
  const embedUrl = !objectUrl && card.type === "video" ? getResearchVideoEmbedUrl(originalUrl) : "";
  const videoUrl = objectUrl || (!card.videoMediaId ? originalUrl : "");
  const imageUrl = card.type === "image" ? objectUrl || getResearchImageSrc(card.image) : "";
  const title = card.title || researchT("canvas.types." + card.type);
  const content = card.type === "image"
    ? '<img src="' + escapeResearchHtml(imageUrl) + '" alt="' + escapeResearchHtml(title) + '" />'
    : embedUrl ? '<iframe src="' + escapeResearchHtml(embedUrl) + '" title="' + escapeResearchHtml(title) + '" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>'
      : videoUrl ? '<div class="research-media-video-shell" data-media-video-shell><video src="' + escapeResearchHtml(videoUrl) + '" controls playsinline preload="metadata" tabindex="0"' + (card.image ? ' poster="' + escapeResearchHtml(getResearchImageSrc(card.image)) + '"' : "") + '></video><div class="research-media-video-controls" data-media-controls><button type="button" data-media-play aria-label="' + escapeResearchHtml(researchT("canvas.playVideo")) + '">▶</button><input type="range" data-media-seek min="0" max="1000" value="0" aria-label="' + escapeResearchHtml(researchT("canvas.seekVideo")) + '" /><span data-media-time>0:00 / 0:00</span><button type="button" data-media-mute aria-label="' + escapeResearchHtml(researchT("canvas.muteVideo")) + '">♫</button><input type="range" data-media-volume min="0" max="100" value="100" aria-label="' + escapeResearchHtml(researchT("canvas.volumeVideo")) + '" /><select data-media-speed aria-label="' + escapeResearchHtml(researchT("canvas.speedVideo")) + '"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></div></div>'
        : '<p class="research-media-error">' + escapeResearchHtml(researchT("canvas.playbackUnavailable")) + '</p>';
  document.body.insertAdjacentHTML("beforeend", [
    '<div class="research-direction-modal research-canvas-media-modal' + (card.type === "video" ? ' is-video' : '') + '" data-research-canvas-media role="dialog" aria-modal="true" aria-label="' + escapeResearchHtml(title) + '">',
    '  <div class="research-media-viewer">',
    '    <div class="research-media-toolbar"><strong>' + escapeResearchHtml(title) + '</strong><div><button type="button" data-media-fullscreen aria-label="' + escapeResearchHtml(researchT("canvas.fullscreen")) + '">' + escapeResearchHtml(researchT("canvas.fullscreen")) + '</button><button type="button" data-media-close aria-label="' + escapeResearchHtml(researchT("actions.close")) + '">×</button></div></div>',
    '    <div class="research-media-stage">' + content + '</div>',
    '    <p class="research-media-error" data-media-error hidden>' + escapeResearchHtml(researchT("canvas.playbackUnavailable")) + '</p>',
    originalUrl ? '    <a class="research-media-open-link" href="' + escapeResearchHtml(originalUrl) + '" target="_blank" rel="noopener noreferrer">' + escapeResearchHtml(researchT("canvas.openOriginal")) + ' ↗</a>' : "",
    objectUrl ? '    <a class="research-media-open-link" href="' + escapeResearchHtml(objectUrl) + '" download="' + escapeResearchHtml(localFileName) + '">' + escapeResearchHtml(researchT("canvas.downloadVideo")) + ' ↓</a>' : "",
    '  </div>',
    '</div>'
  ].join(""));
  const modal = Array.from(document.querySelectorAll("[data-research-canvas-media]")).at(-1);
  const onKeydown = (event) => { if (event.key === "Escape" && !modal.classList.contains("is-minimized")) closeResearchMediaSession(session); };
  const stopIdle = card.type === "video" ? bindResearchMediaIdle(modal) : null;
  const session = { modal, objectUrl, trigger, onKeydown, stopIdle };
  researchCanvasMediaSessions.add(session);
  if (card.type === "video") bindResearchMediaMinimize(modal, modal.querySelector(".research-media-toolbar"));
  document.addEventListener("keydown", onKeydown);
  const video = modal.querySelector("video");
  if (video) bindResearchNativeVideoControls(modal, video);
  modal.addEventListener("pointerdown", (event) => event.stopPropagation());
  modal.addEventListener("click", (event) => { event.stopPropagation(); if ((!modal.classList.contains("is-minimized") && event.target === modal) || event.target.closest("[data-media-close]")) closeResearchMediaSession(session); });
  modal.querySelector("[data-media-fullscreen]")?.addEventListener("click", () => modal.querySelector(".research-media-viewer")?.requestFullscreen?.().catch(() => {}));
  modal.querySelector("video, img")?.addEventListener("error", () => { const error = modal.querySelector("[data-media-error]"); if (error) error.hidden = false; });
  setResearchModalLayer(true);
  (video || modal.querySelector("[data-media-close]"))?.focus();
}

function isMobileResearchCanvas() {
  return window.matchMedia?.("(max-width: 760px)")?.matches === true;
}

function getResearchReferenceLinks(value) {
  return window.MentorResearchModel.getReferenceLinks(value);
}

function getResearchCanvasDepthScale(cardKey, graph) {
  return window.MentorResearchGeometry.canvasDepthScale(cardKey, graph);
}

function normalizeResearchCanvasSize(size) {
  return window.MentorResearchGeometry.normalizeCanvasSize(size);
}

function getResearchCanvasNoteLotus(expanded) {
  const petals = expanded
    ? '<path d="M12 19C7 15 8 9 12 4c4 5 5 11 0 15Z"/><path d="M12 19C6 19 3 15 3 9c5 1 9 5 9 10Zm0 0c6 0 9-4 9-10-5 1-9 5-9 10Z"/><path d="M12 20C6 22 2 19 1 14c5 0 9 2 11 6Zm0 0c6 2 10-1 11-6-5 0-9 2-11 6Z"/>'
    : '<path d="M12 20C7 16 8 8 12 3c4 5 5 13 0 17Z"/><path d="M12 20C6 18 5 12 7 7c4 3 5 7 5 13Zm0 0c6-2 7-8 5-13-4 3-5 7-5 13Z"/><path d="M8 21h8"/>';
  return '<svg class="research-canvas-note-lotus" data-lotus-state="' + (expanded ? 'open' : 'closed') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + petals + '</svg>';
}

function getResearchCanvasConnectionIcon() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18.84 12.25 1.72-1.72a5 5 0 0 0-7.07-7.07l-1.72 1.72"/><path d="m5.17 11.75-1.72 1.72a5 5 0 0 0 7.07 7.07l1.72-1.72"/><path d="M8 2v3M2 8h3M16 19v3M19 16h3"/></svg>';
}

function renderResearchCanvasCard(card, graph, collapsed = {}) {
  const renderOptions = arguments[3] || {};
  const savedStickerDocument = card.stickerDocument || researchViewState.currentIdea?.pathData?.researchCanvasStickerDocuments?.[card.key];
  let stickerDocument = null;
  if (savedStickerDocument) { try { stickerDocument = window.MentorResearchStickerCore?.normalize(savedStickerDocument); } catch (_) { /* Keep unreadable/newer documents intact and show the legacy card. */ } }
  const modular = Boolean(stickerDocument && window.MentorResearchStickerSections);
  const title = card.title || (["image", "video", "av", "source"].includes(card.type) ? "" : researchT("canvas.types." + card.type));
  const url = getSafeResearchCanvasUrl(card.url);
  const image = getResearchCanvasImage(card);
  const childCount = graph?.childrenByKey.get(card.key)?.length || 0;
  const isCollapsed = Boolean(collapsed[card.key]);
  const isHidden = Boolean(graph?.hiddenKeys.has(card.key));
  const directionId = card.direction?.id || getActiveResearchDirection(researchViewState.currentIdea || {})?.id || "";
  const types = ["note", "av", "source", "link", "image", "video", "finance"];
  const addCard = '<span class="research-canvas-card-add-wrap"><button class="research-canvas-card-action" type="button" data-research-action="toggle-card-add-menu" data-card-key="' + escapeResearchHtml(card.key) + '" aria-expanded="false" aria-label="' + escapeResearchHtml(researchT("canvas.addChild")) + '">+</button><span class="research-canvas-menu research-canvas-card-menu" hidden>' + (window.MentorResearchStickerSections?.renderCreateMenu(researchT, escapeResearchHtml, getResearchCanvasIcon, ' data-parent-key="' + escapeResearchHtml(card.key) + '" data-direction-id="' + escapeResearchHtml(directionId) + '"') || types.map((type) => '<button type="button" data-research-action="add-canvas-card" data-card-type="' + type + '" data-parent-key="' + escapeResearchHtml(card.key) + '" data-direction-id="' + escapeResearchHtml(directionId) + '"><span aria-hidden="true">' + getResearchCanvasIcon(type) + '</span>' + escapeResearchHtml(researchT("canvas.types." + type)) + '</button>').join("")) + '</span></span>';
  const fold = childCount ? '<button class="research-canvas-fold' + (isCollapsed ? ' is-collapsed' : '') + '" type="button" data-research-action="toggle-canvas-children" data-card-key="' + escapeResearchHtml(card.key) + '" aria-expanded="' + String(!isCollapsed) + '" aria-label="' + escapeResearchHtml(researchT(isCollapsed ? "canvas.expandChildren" : "canvas.collapseChildren", { count: childCount })) + '"><span aria-hidden="true">' + (isCollapsed ? '◂' : '▸') + '</span><strong>' + childCount + '</strong></button>' : "";
  const edit = card.source !== "finance" ? '<button class="research-canvas-card-action" type="button" data-research-action="edit-canvas-card" data-card-key="' + escapeResearchHtml(card.key) + '" aria-label="' + escapeResearchHtml(researchT("canvas.edit")) + '">✎</button>' : "";
  const ports = isResearchStableCanvasParent(card) ? '<span class="research-canvas-source-ports">' + ["top", "right", "bottom", "left"].map((side) =>
    '<button class="research-canvas-source-port is-' + side + '" type="button" data-research-action="start-canvas-connection" data-card-key="' + escapeResearchHtml(card.key) + '" data-connection-side="' + side + '" aria-label="' + escapeResearchHtml(researchT("canvas.startConnectionSide", { side: researchT("canvas.sides." + side) })) + '" title="' + escapeResearchHtml(researchT("canvas.startConnectionSide", { side: researchT("canvas.sides." + side) })) + '"><span aria-hidden="true"></span></button>').join("") + '</span>' : "";
  const remove = card.source !== "finance" ? '<button class="research-canvas-card-action" type="button" data-research-action="delete-canvas-card" data-card-key="' + escapeResearchHtml(card.key) + '" aria-label="' + escapeResearchHtml(researchT("canvas.delete")) + '" title="' + escapeResearchHtml(researchT("canvas.delete")) + '"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:block;margin:auto;pointer-events:none"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6"/></svg></button>' : "";
  const directVideo = card.type === "video" && /\.(?:mp4|m4v|webm|ogg|ogv|mov)(?:[?#]|$)/i.test(url) ? url : "";
  const visual = image ? '<img src="' + escapeResearchHtml(image) + '" alt="" loading="lazy" draggable="false" />' : directVideo ? '<video src="' + escapeResearchHtml(directVideo) + '" muted playsinline preload="metadata" aria-hidden="true"></video>' : '<span class="research-canvas-visual-placeholder" aria-hidden="true">' + getResearchCanvasIcon(card.type) + (card.type === "link" && url ? '<small>' + escapeResearchHtml(getReferenceLinkLabel(url)) + '</small>' : "") + '</span>';
  const mediaVisual = visual + (card.type === "video" ? '<span class="research-canvas-play" aria-hidden="true">▶</span>' : "");
  const media = ["image", "video", "av", "source"].includes(card.type)
    ? '<button class="research-canvas-card-visual" type="button"' + (["image", "source"].includes(card.type) ? ' data-sticker-drag-surface' : '') + ' data-research-action="open-canvas-preview" data-card-key="' + escapeResearchHtml(card.key) + '" aria-label="' + escapeResearchHtml(researchT("canvas.types." + card.type)) + '">' + mediaVisual + '</button>'
    : card.type === "note" ? '<button class="research-canvas-note-open" type="button" data-research-action="open-canvas-preview" data-card-key="' + escapeResearchHtml(card.key) + '" aria-label="' + escapeResearchHtml(researchT("canvas.types.note")) + '">↗</button>' : card.type === "link" ? '<div class="research-canvas-card-visual">' + mediaVisual + '</div>' : "";
  const description = card.type === "finance"
    ? '<strong class="research-canvas-price">' + escapeResearchHtml(card.source === "item" ? getResearchCanvasFinanceDisplay(card) : card.price || researchT("finance.noData")) + '</strong><span class="research-canvas-card-text">' + escapeResearchHtml(card.text || "") + '</span>'
    : (card.text ? '<span class="research-canvas-card-text">' + escapeResearchHtml(card.text) + '</span>' : "") + (card.price ? '<strong class="research-canvas-card-price">' + escapeResearchHtml(card.price) + '</strong>' : "");
  const info = (title ? '<strong class="research-canvas-card-title">' + escapeResearchHtml(title) + '</strong>' : "") +
    (description ? '<div class="research-canvas-card-description">' + description + '</div>' : "");
  const links = (Array.isArray(card.urls) ? card.urls : [card.url]).map(getSafeResearchCanvasUrl).filter(Boolean);
  const link = links.length ? '<div class="research-canvas-link-list">' + links.map((href, index) => '<a class="research-canvas-card-link" href="' + escapeResearchHtml(href) + '" target="_blank" rel="noopener noreferrer" title="' + escapeResearchHtml(href) + '" aria-label="' + escapeResearchHtml(researchT("canvas.openLink")) + '">' + escapeResearchHtml(getReferenceLinkLabel(href)) + (links.length > 1 ? ' ' + (index + 1) : "") + ' ↗</a>').join("") + '</div>' : "";
  const financeAction = card.source === "finance" ? '<button class="research-canvas-card-link" type="button" data-research-action="financial-comparison" data-idea-id="' + escapeResearchHtml(researchViewState.currentIdea?.id || "") + '">' + escapeResearchHtml(researchT("canvas.openFinance")) + ' ↗</button>' : "";
  const depthScale = getResearchCanvasDepthScale(card.key, graph);
  const savedSize = renderOptions.preview ? null : researchViewState.currentIdea?.pathData?.researchCanvasSizes?.[card.key];
  const size = normalizeResearchCanvasSize(savedSize);
  const savedWidth = Number.isFinite(savedSize?.width) && savedSize.width > 0 ? savedSize.width : null;
  const stickerStyle = window.MentorResearchStickerStyle?.read(researchViewState.currentIdea, renderOptions.styleKey || card.key) || {};
  const controlColor = window.MentorResearchStickerStyle?.controlColor(stickerStyle.backgroundColor) || "#ffffff";
  const resize = '<button class="research-canvas-card-resize" type="button" data-research-card-resize' + (modular ? ' data-research-sticker-expansion style="--research-sticker-control:' + controlColor + '"' : '') + ' data-card-key="' + escapeResearchHtml(card.key) + '" aria-label="' + escapeResearchHtml(researchT("canvas.resize")) + '" title="' + escapeResearchHtml(researchT("canvas.resize")) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M10 20 20 10M15 20l5-5M20 20h.01"/></svg></button>';
  const fitted = Boolean(size && researchViewState.currentIdea?.pathData?.researchCanvasSizes?.[card.key]?.expanded);
  const stickerCss = window.MentorResearchStickerStyle?.css(stickerStyle) || "";
  const fitLabel = researchT(fitted ? "canvas.resetSize" : "canvas.fitText");
  const fit = card.type === "note" && card.text ? '<button class="research-canvas-note-fit" type="button" data-research-card-fit data-card-key="' + escapeResearchHtml(card.key) + '" aria-expanded="' + fitted + '" aria-label="' + escapeResearchHtml(fitLabel) + '" title="' + escapeResearchHtml(fitLabel) + '"' + (fitted ? '' : ' hidden') + '>' + getResearchCanvasNoteLotus(fitted) + '</button>' : "";
  const modularContent = modular ? window.MentorResearchStickerSections.render(stickerDocument, { t: researchT, escape: escapeResearchHtml, scope: renderOptions.scope || card.key }) : "";
  return '<article class="research-canvas-card is-' + escapeResearchHtml(card.type) + (modular ? ' has-sticker-document' : '') + (renderOptions.preview ? ' is-designer-preview' : '') + (isHidden ? ' is-hidden-by-parent' : '') + (size ? ' has-custom-size' : '') + '" data-card-key="' + escapeResearchHtml(card.key) + '" data-canvas-depth-scale="' + depthScale + '"' + (modular && size ? ' data-sticker-manual-height="' + size.height + '"' : '') + (stickerCss ? ' data-research-sticker-custom' : '') + ' style="--research-card-depth-scale:' + depthScale + (savedWidth ? ';width:' + savedWidth + 'px' : '') + (size ? ';height:' + size.height + 'px' : '') + (stickerCss ? ';' + stickerCss : '') + '" tabindex="' + (isHidden ? '-1' : '0') + '"' + (isHidden ? ' hidden' : '') + '>' +
    '<span class="research-canvas-card-badge" aria-label="' + escapeResearchHtml(researchT("canvas.types." + card.type)) + '">' + getResearchCanvasIcon(card.type) + '</span>' +
    (renderOptions.preview ? '' : fold + ports + '<span class="research-canvas-card-actions">' + addCard + edit + remove + '</span>') + (modular ? modularContent : media + '<div class="research-canvas-card-content">' + info + link + financeAction + '</div>') + (renderOptions.preview ? '' : (modular ? '' : fit) + resize) + '</article>';
}

function getResearchVisualCardSize(card, zoom = getResearchCanvasCardZoom()) {
  const scale = zoom * (Number(card.dataset?.canvasDepthScale) || getResearchCanvasDepthScale("", null)) * RESEARCH_DEFAULT_SIZE_SCALE;
  return { width: card.offsetWidth * scale, height: card.offsetHeight * scale };
}

function getResearchCanvasConnectionRect(element, canvas, focusView = false) {
  const article = focusView ? element.querySelector?.(".research-canvas-card") || element : element;
  const host = focusView ? canvas.querySelector?.("[data-research-focus-stage]") || canvas : canvas;
  const bounds = article.getBoundingClientRect?.(), origin = host.getBoundingClientRect?.();
  if (!bounds?.width || !bounds?.height || !origin) return {
    x: parseFloat(element.style.left) || 0, y: parseFloat(element.style.top) || 0,
    ...(focusView ? getResearchFocusCardSize(element) : getResearchVisualCardSize(element))
  };
  const scale = focusView ? 1 : Number(canvas.dataset?.mapScale) || 1;
  const transform = window.getComputedStyle?.(article)?.transform || "none";
  const values = transform.startsWith("matrix(") ? transform.slice(7, -1).split(",").map(Number) : [1, 0, 0, 1];
  return window.MentorResearchGeometry.borderGeometry({
    x: (bounds.left - origin.left) / scale - (host.clientLeft || 0),
    y: (bounds.top - origin.top) / scale - (host.clientTop || 0),
    width: bounds.width / scale, height: bounds.height / scale
  }, values, article.offsetWidth, article.offsetHeight);
}

function bindResearchCanvasConnectionLayout(canvas, focusView = false) {
  if (typeof ResizeObserver === "undefined" || canvas._researchConnectionLayoutObserver) return;
  let frame = 0, pending = false;
  const schedule = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      if (!canvas.isConnected) { canvas._researchConnectionLayoutObserver.disconnect(); return; }
      if (canvas.querySelector(".is-connection-dragging, .is-connection-armed, .research-canvas-connection-preview")) { pending = true; return; }
      pending = false;
      if (focusView) drawResearchCanvasFocusConnections(canvas); else drawResearchCanvasConnections(canvas);
    });
  };
  canvas._researchConnectionLayoutObserver = new ResizeObserver(schedule);
  canvas.querySelectorAll(".research-canvas-card").forEach((card) => canvas._researchConnectionLayoutObserver.observe(card));
  canvas.addEventListener("load", schedule, true);
  canvas.addEventListener("loadedmetadata", schedule, true);
  ["pointerup", "pointercancel", "keydown"].forEach((type) => canvas.addEventListener(type, () => { if (pending) schedule(); }, true));
  document.fonts?.ready?.then(schedule);
}

function markResearchCanvasConnectionSettle(handle, childKey, endpoint) {
  const settle = researchViewState.connectionSettle;
  if (!settle || settle.ideaId !== researchViewState.currentIdea?.id || settle.childKey !== childKey ||
      settle.endpoint !== endpoint || Date.now() > settle.until || handle.classList.contains("is-connection-settling")) return;
  handle.classList.add("is-connection-settling");
  handle.addEventListener("animationend", () => {
    handle.classList.remove("is-connection-settling");
    if (researchViewState.connectionSettle === settle) researchViewState.connectionSettle = null;
  }, { once: true });
}

function layoutResearchCanvas(canvas, preserveCurrentPositions = false) {
  if (!canvas) return;
  const idea = researchViewState.currentIdea || {};
  const zoom = getResearchCanvasCardZoom(idea);
  canvas.style.setProperty("--research-card-zoom", String(zoom));
  const models = new Map(getResearchCanvasCards(idea).map((card) => [card.key, card]));
  const cards = Array.from(canvas.querySelectorAll(".research-canvas-card"));
  const width = canvas.clientWidth;
  const cardWidth = cards.reduce((value, card) => Math.max(value, getResearchVisualCardSize(card, zoom).width), 224 * zoom * getResearchCanvasDepthScale("", null) * RESEARCH_DEFAULT_SIZE_SCALE);
  const cardHeight = cards.reduce((height, card) => Math.max(height, getResearchVisualCardSize(card, zoom).height), 146 * zoom * getResearchCanvasDepthScale("", null) * RESEARCH_DEFAULT_SIZE_SCALE);
  const columnPitch = cardWidth + 28;
  const rowPitch = Math.max(165, cardHeight + 30);
  const columns = Math.max(1, Math.floor((width - 32) / columnPitch));
  const rows = Math.ceil(cards.length / columns);
  const saved = idea.pathData?.researchCanvasPositions || {};
  const highest = cards.reduce((value, card) => Math.max(value, preserveCurrentPositions ? parseFloat(card.style.top) || 0 : Number(saved[card.dataset.cardKey]?.y) || Number(models.get(card.dataset.cardKey)?.canvasPosition?.y) || 0), 0);
  canvas.style.height = Math.max(640, rows * rowPitch + 100, highest + cardHeight + 72) + "px";
  cards.forEach((card, index) => {
    const key = card.dataset.cardKey;
    const position = saved[key];
    const column = index % columns;
    const row = Math.floor(index / columns);
    const defaultX = 22 + column * Math.max(columnPitch, (width - 54) / columns) + (row % 2 ? 12 : 0);
    const defaultY = 88 + row * rowPitch + (column % 2 ? 24 : 0);
    const initial = models.get(key)?.canvasPosition;
    const parent = cards.find((entry) => entry.dataset.cardKey === models.get(key)?.parentKey);
    const siblingIndex = cards.slice(0, index).filter((entry) => models.get(entry.dataset.cardKey)?.parentKey === models.get(key)?.parentKey).length;
    const childX = parent?.style.left ? (parseFloat(parent.style.left) || 0) + getResearchVisualCardSize(parent, zoom).width + 18 : defaultX;
    const childY = parent?.style.top ? (parseFloat(parent.style.top) || 0) + siblingIndex * Math.max(30, 40 * zoom) : defaultY;
    const x = preserveCurrentPositions && Number.isFinite(parseFloat(card.style.left)) ? parseFloat(card.style.left) : Number.isFinite(Number(position?.x)) ? Number(position.x) : Number.isFinite(Number(initial?.x)) ? Number(initial.x) : parent ? childX : defaultX;
    const y = preserveCurrentPositions && Number.isFinite(parseFloat(card.style.top)) ? parseFloat(card.style.top) : Number.isFinite(Number(position?.y)) ? Number(position.y) : Number.isFinite(Number(initial?.y)) ? Number(initial.y) : parent ? childY : defaultY;
    if (parent) {
      const requiredWidth = x + getResearchVisualCardSize(card, zoom).width + 12;
      if (requiredWidth > canvas.clientWidth) canvas.style.minWidth = Math.ceil(requiredWidth) + "px";
    }
    placeResearchCanvasCard(canvas, card, x, y);
  });
  cards.forEach(updateResearchCanvasNoteFitVisibility);
  drawResearchCanvasConnections(canvas);
  applyResearchCanvasCamera(canvas);
}

function renderResearchConnectionHandles(handleLayer, connectionAnchors, models) {
  if (!handleLayer) return;
  const previous = new Map(Array.from(handleLayer.querySelectorAll('[data-research-connection-handle-key]'))
    .map((button) => [button.dataset.researchConnectionHandleKey, button]));
  const groups = new Map();
  connectionAnchors.forEach((anchors, childKey) => {
    const parentKey = models.get(childKey)?.parentKey || "";
    const groupKey = parentKey + ":" + Math.round(anchors.from.x) + ":" + Math.round(anchors.from.y);
    if (!groups.has(groupKey)) groups.set(groupKey, { anchor: anchors.from, side: anchors.fromSide, angle: anchors.fromAngle || 0, children: [] });
    groups.get(groupKey).children.push(childKey);
  });
  const entries = [];
  groups.forEach((group, groupKey) => entries.push({
    key: group.children.length > 1 ? "stack:" + groupKey : group.children[0] + ":parent",
    anchor: group.anchor, side: group.side, angle: group.angle, endpoint: "parent", childKey: group.children[0], children: group.children
  }));
  connectionAnchors.forEach((anchors, childKey) => entries.push({
    key: childKey + ":child", anchor: anchors.to, side: anchors.toSide, angle: anchors.toAngle || 0, endpoint: "child", childKey, children: null
  }));
  entries.forEach((entry) => {
    let handle = previous.get(entry.key);
    if (!handle) {
      handle = document.createElement("button");
      handle.type = "button";
      handle.className = "research-canvas-connection-handle is-connected-endpoint";
      handle.dataset.researchConnectionHandleKey = entry.key;
      handleLayer.appendChild(handle);
    }
    previous.delete(entry.key);
    handle.classList.add("is-connected-endpoint");
    handle.dataset.researchAction = entry.children?.length > 1 ? "open-connection-stack" : "change-canvas-parent";
    handle.dataset.cardKey = entry.childKey;
    handle.dataset.endpoint = entry.endpoint;
    handle.dataset.connectionSide = entry.side || "";
    handle._researchChildKeys = entry.children?.length > 1 ? entry.children : null;
    const label = entry.children?.length > 1 ? researchT("canvas.connectionStack", { count: entry.children.length })
      : researchT(entry.endpoint === "parent" ? "canvas.dragParentEnd" : "canvas.dragChildEnd");
    handle.setAttribute("aria-label", label);
    handle.title = label;
    handle.innerHTML = entry.children?.length > 1
      ? '<span class="research-connection-stack-count">' + entry.children.length + '</span>' : "";
    handle.style.left = entry.anchor.x + "px";
    handle.style.top = entry.anchor.y + "px";
    if (handle.style.setProperty) handle.style.setProperty("--research-connection-angle", entry.angle + "deg");
    handle.hidden = false;
    if (entry.children?.length === 1 || !entry.children) markResearchCanvasConnectionSettle(handle, entry.childKey, entry.endpoint);
  });
  previous.forEach((button) => button.remove());
}

function updateResearchConnectionSourcePorts(elements, connectionAnchors, models, parents = null) {
  const occupied = new Map();
  const mark = (key, side) => {
    if (!key || !side) return;
    if (!occupied.has(key)) occupied.set(key, new Set());
    occupied.get(key).add(side);
  };
  connectionAnchors.forEach((anchors, childKey) => {
    mark(parents?.get(childKey) || models.get(childKey)?.parentKey, anchors.fromSide);
    mark(childKey, anchors.toSide);
  });
  elements.forEach((element, key) => {
    const layer = element.querySelector?.(".research-canvas-source-ports");
    if (layer?.style && window.getComputedStyle) {
      const focus = Boolean(element.dataset?.focusCardKey);
      const article = focus ? element.querySelector(".research-canvas-card") : element;
      if (article) {
        if (focus) {
          const bounds = article.getBoundingClientRect(), scale = Number(element.dataset.focusScale) || 1;
          layer.style.inset = "auto";
          layer.style.left = (article.offsetLeft || 0) + "px";
          layer.style.top = (article.offsetTop || 0) + "px";
          layer.style.width = bounds.width / scale + "px";
          layer.style.height = bounds.height / scale + "px";
        } else {
          const style = window.getComputedStyle(article);
          layer.style.inset = ["borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth"]
            .map((name) => -(parseFloat(style[name]) || 0) + "px").join(" ");
        }
      }
    }
    element.querySelectorAll?.('.research-canvas-source-port[data-connection-side]').forEach((port) => {
      port.hidden = Boolean(occupied.get(key)?.has(port.dataset.connectionSide));
    });
  });
}

function captureResearchConnectionSectors(pairs, elements, rectOf, movedKeys) {
  return Array.from(pairs, ([childKey, parentKey]) => {
    if (!/^(?:item|reference):/.test(childKey) ||
        (!movedKeys.has(childKey) && !movedKeys.has(parentKey))) return null;
    const parent = elements.get(parentKey);
    const child = elements.get(childKey);
    if (!parent || !child || parent.hidden || child.hidden) return null;
    const baseline = window.MentorResearchGeometry.connectionAnchors(rectOf(parent), rectOf(child));
    return { childKey, parent, child, fromSide: baseline.fromSide, toSide: baseline.toSide };
  }).filter(Boolean);
}

function changedResearchConnectionSides(sectors, rectOf) {
  const changed = {};
  sectors.forEach(({ childKey, parent, child, fromSide, toSide }) => {
    const current = window.MentorResearchGeometry.connectionAnchors(rectOf(parent), rectOf(child));
    if (current.fromSide !== fromSide || current.toSide !== toSide)
      changed[childKey] = { parent: current.fromSide, child: current.toSide };
  });
  return changed;
}

function drawResearchCanvasConnections(canvas) {
  const svg = canvas?.querySelector("[data-research-canvas-connections]");
  if (!svg) return;
  const handleLayer = canvas.querySelector("[data-research-connection-handles]");
  const idea = researchViewState.currentIdea || {};
  const models = getResearchCanvasCards(idea);
  const modelMap = new Map(models.map((model) => [model.key, model]));
  const graph = getResearchCanvasGraph(models, idea.pathData?.researchCanvasCollapsed || {});
  const elements = new Map(Array.from(canvas.querySelectorAll(".research-canvas-card")).map((card) => [card.dataset.cardKey, card]));
  const connectionAnchors = new Map();
  svg.setAttribute("viewBox", "0 0 " + canvas.clientWidth + " " + canvas.clientHeight);
  svg.innerHTML = Array.from(graph.parentByKey, ([childKey, parentKey]) => {
    const parent = elements.get(parentKey);
    const child = elements.get(childKey);
    if (!parent || !child || parent.hidden || child.hidden) return "";
    const parentRect = getResearchCanvasConnectionRect(parent, canvas);
    const childRect = getResearchCanvasConnectionRect(child, canvas);
    const sides = canvas._researchConnectionSideOverrides?.[childKey] || modelMap.get(childKey)?.canvasConnectionSides || {};
    const anchors = window.MentorResearchGeometry.connectionAnchors(parentRect, childRect, sides);
    const path = window.MentorResearchGeometry.connectionPathFromAnchors(anchors);
    if (["item", "reference"].includes(modelMap.get(childKey)?.source))
      connectionAnchors.set(childKey, anchors);
    return '<path data-child-key="' + escapeResearchHtml(childKey) + '" d="' + path + '" />';
  }).join("");
  if (handleLayer?.dataset?.researchConnectionHandles === undefined) return;
  updateResearchConnectionSourcePorts(elements, connectionAnchors, modelMap);
  renderResearchConnectionHandles(handleLayer, connectionAnchors, modelMap);
}

function setResearchCanvasChildrenVisibility(canvas) {
  const idea = researchViewState.currentIdea || {};
  const collapsed = idea.pathData?.researchCanvasCollapsed || {};
  const graph = getResearchCanvasGraph(getResearchCanvasCards(idea), collapsed);
  canvas.querySelectorAll(".research-canvas-card").forEach((card) => {
    const hidden = graph.hiddenKeys.has(card.dataset.cardKey);
    card.hidden = hidden;
    card.tabIndex = hidden ? -1 : 0;
    card.classList.toggle("is-hidden-by-parent", hidden);
    const fold = card.querySelector(".research-canvas-fold");
    if (fold) {
      const closed = Boolean(collapsed[card.dataset.cardKey]);
      fold.classList.toggle("is-collapsed", closed);
      fold.setAttribute("aria-expanded", String(!closed));
      fold.setAttribute("aria-label", researchT(closed ? "canvas.expandChildren" : "canvas.collapseChildren", { count: graph.childrenByKey.get(card.dataset.cardKey)?.length || 0 }));
      fold.querySelector("span").textContent = closed ? "◂" : "▸";
    }
  });
  window.MentorResearchOrganizer.applyVisibility(canvas, idea, getActiveResearchDirection(idea)?.id || "", drawResearchCanvasConnections, getResearchCanvasCards);
}

function getResearchCanvasChildPosition(root, parentKey) {
  const canvas = root.querySelector("[data-research-canvas]");
  const parent = Array.from(canvas?.querySelectorAll(".research-canvas-card") || []).find((card) => card.dataset.cardKey === parentKey);
  if (!canvas || !parent) return null;
  const models = getResearchCanvasCards(researchViewState.currentIdea || {});
  const siblings = models.filter((card) => card.parentKey === parentKey);
  const left = parseFloat(parent.style.left) || 0;
  const parentWidth = getResearchVisualCardSize(parent).width;
  const x = left + parentWidth + 28;
  const elements = new Map(Array.from(canvas.querySelectorAll(".research-canvas-card")).map((element) => [element.dataset.cardKey, element]));
  const graph = getResearchCanvasGraph(models);
  const siblingHeight = siblings.reduce((height, card) => {
    const element = elements.get(card.key);
    const size = element ? getResearchVisualCardSize(element).height : 0;
    return height + (size || 146 * getResearchCanvasCardZoom() * getResearchCanvasDepthScale(card.key, graph) * RESEARCH_DEFAULT_SIZE_SCALE) + 24;
  }, 0);
  const y = (parseFloat(parent.style.top) || 0) + siblingHeight;
  return { x, y };
}

function getResearchCanvasPositionAtClient(root, clientX, clientY) {
  const viewport = root.querySelector("[data-research-canvas-viewport]");
  if (!viewport) return null;
  const world = window.MentorResearchGeometry.screenToWorld(
    clientX, clientY, viewport.getBoundingClientRect(), viewport.clientLeft, viewport.clientTop,
    getResearchCanvasCamera(), viewport.scrollLeft || 0, viewport.scrollTop || 0
  );
  const cardScale = getResearchCanvasCardZoom() * getResearchCanvasDepthScale("", null) * RESEARCH_DEFAULT_SIZE_SCALE;
  return { x: Math.round(world.x - 112 * cardScale), y: Math.round(world.y - 73 * cardScale) };
}

function isResearchStableCanvasParent(card) {
  if (!card) return false;
  if (["item", "reference", "linked-note", "direction-note"].includes(card.source)) return true;
  return card.source === "finance" && getResearchFinancialComparisonOptionsForIdea(researchViewState.currentIdea?.id)
    .some((option) => option?.id && "finance:" + option.id === card.key);
}

function getResearchCanvasDropParentKey(root, clientX, clientY, excludedKey = "", eventTarget = null) {
  const viewport = root.querySelector("[data-research-canvas-viewport]");
  const canvas = viewport?.querySelector("[data-research-canvas]");
  if (!canvas) return "";
  const rect = viewport.getBoundingClientRect();
  if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return "";
  const candidates = document.elementsFromPoint?.(clientX, clientY) || [eventTarget];
  const cards = new Map(getResearchCanvasCards(researchViewState.currentIdea || {}).map((card) => [card.key, card]));
  for (const element of candidates) {
    const target = element?.closest?.(".research-canvas-card[data-card-key]");
    const key = target?.dataset.cardKey;
    if (!target || !canvas.contains(target) || target.hidden || key === excludedKey) continue;
    if (isResearchStableCanvasParent(cards.get(key))) return key;
  }
  return "";
}

function showResearchCanvasConnectionError(root) {
  const viewport = root.querySelector("[data-research-canvas-viewport]");
  if (!viewport) return;
  const message = researchT("canvas.parentSaveFailed");
  viewport.dataset.connectionStatus = message;
  window.setTimeout(() => { if (viewport.dataset.connectionStatus === message) delete viewport.dataset.connectionStatus; }, 4000);
}

function getResearchCanvasDragConnectionPath(anchors, endpoint, point) {
  const from = endpoint === "parent" ? point : anchors.from;
  const to = endpoint === "child" ? point : anchors.to;
  return window.MentorResearchGeometry.connectionPathFromAnchors({
    ...anchors, from, to, explicit: true
  }, endpoint);
}

function getResearchCanvasPointerSide(element, clientX, clientY, excludedSide = "") {
  const port = (document.elementsFromPoint?.(clientX, clientY) || [])
    .map((entry) => entry.closest?.("[data-research-action='start-canvas-connection'][data-connection-side]"))
    .find((entry) => entry && element.contains?.(entry));
  const portSide = port?.dataset.connectionSide;
  if (portSide && portSide !== excludedSide) return portSide;
  const article = element.dataset?.focusCardKey ? element.querySelector?.(".research-canvas-card") || element : element;
  const bounds = article.getBoundingClientRect();
  const transform = window.getComputedStyle?.(article)?.transform || "none";
  const matrix = transform.startsWith("matrix(") ? transform.slice(7, -1).split(",").map(Number) : [1, 0, 0, 1];
  const border = window.MentorResearchGeometry.borderGeometry({ x: bounds.left, y: bounds.top, width: bounds.width, height: bounds.height }, matrix, article.offsetWidth, article.offsetHeight);
  return window.MentorResearchGeometry.nearestAllowedConnectionSide(border, clientX, clientY, excludedSide);
}

function isResearchConnectionOriginalHandleZone(clientX, clientY, bounds) {
  if (!bounds) return false;
  return Math.hypot(clientX - bounds.left - bounds.width / 2,
    clientY - bounds.top - bounds.height / 2) <= 18;
}

function bindResearchCanvasSourcePortDrag(root, canvas, actions, focusView) {
  canvas.addEventListener("pointerdown", (event) => {
    const port = event.target.closest?.("[data-research-action='start-canvas-connection'][data-connection-side]");
    if (event.button !== 0 || !port || !canvas.contains(port) || window.MentorUIEvents?.isTextEditingEvent?.(event)) return;
    const sourceKey = port.dataset.cardKey;
    const sourceSide = port.dataset.connectionSide;
    const cards = getResearchCanvasCards(researchViewState.currentIdea || {});
    const source = cards.find((card) => card.key === sourceKey);
    if (!isResearchStableCanvasParent(source) || !window.MentorResearchGeometry.isConnectionSide(sourceSide)) return;
    const graph = getResearchCanvasGraph(cards);
    const ancestors = new Set([sourceKey]);
    let cursor = graph.parentByKey.get(sourceKey);
    while (cursor && !ancestors.has(cursor)) { ancestors.add(cursor); cursor = graph.parentByKey.get(cursor); }
    const activeDirectionId = getActiveResearchDirection(researchViewState.currentIdea || {})?.id || "";
    const directionOf = (card) => card.direction?.id || card.directionId || activeDirectionId;
    const candidates = new Set(cards.filter((card) => ["item", "reference"].includes(card.source) &&
      directionOf(card) === directionOf(source) && !ancestors.has(card.key)).map((card) => card.key));
    const selector = focusView ? "[data-focus-card-key]" : ".research-canvas-card[data-card-key]";
    const keyOf = (element) => focusView ? element.dataset.focusCardKey : element.dataset.cardKey;
    const elements = new Map(Array.from(canvas.querySelectorAll(selector)).map((element) => [keyOf(element), element]));
    const sourceElement = elements.get(sourceKey);
    const svg = canvas.querySelector(focusView ? "[data-research-focus-connections]" : "[data-research-canvas-connections]");
    const viewport = focusView ? canvas : root.querySelector("[data-research-canvas-viewport]");
    if (!sourceElement || !svg || !viewport) return;
    const sourceRect = getResearchCanvasConnectionRect(sourceElement, canvas, focusView);
    const from = window.MentorResearchGeometry.sidePoint(sourceRect, sourceSide);
    const startX = event.clientX;
    const startY = event.clientY;
    let preview = null;
    let targetElement = null;
    let dragging = false;
    const findTarget = (clientX, clientY) => {
      const bounds = viewport.getBoundingClientRect();
      if (clientX < bounds.left || clientX > bounds.right || clientY < bounds.top || clientY > bounds.bottom) return null;
      return (document.elementsFromPoint?.(clientX, clientY) || []).map((element) => element.closest?.(selector))
        .find((element) => element && canvas.contains(element) && !element.hidden && candidates.has(keyOf(element))) || null;
    };
    const cleanup = () => {
      port.removeEventListener("pointermove", move);
      port.removeEventListener("pointerup", finish);
      port.removeEventListener("pointercancel", cancel);
      if (port.hasPointerCapture?.(event.pointerId)) port.releasePointerCapture(event.pointerId);
      targetElement?.classList.remove("is-connection-target");
      preview?.remove();
    };
    const move = (nextEvent) => {
      if (nextEvent.pointerId !== event.pointerId) return;
      if (!dragging && Math.hypot(nextEvent.clientX - startX, nextEvent.clientY - startY) < 4) return;
      if (!dragging) {
        dragging = true;
        preview = document.createElementNS("http://www.w3.org/2000/svg", "path");
        preview.classList.add("research-canvas-connection-preview");
        svg.appendChild(preview);
      }
      nextEvent.preventDefault();
      const target = findTarget(nextEvent.clientX, nextEvent.clientY);
      if (target !== targetElement) {
        targetElement?.classList.remove("is-connection-target");
        targetElement = target;
        targetElement?.classList.add("is-connection-target");
      }
      const viewRect = viewport.getBoundingClientRect();
      const free = focusView ? getResearchCanvasFocusPoint(canvas, nextEvent.clientX, nextEvent.clientY)
        : window.MentorResearchGeometry.screenToWorld(nextEvent.clientX, nextEvent.clientY, viewRect,
          viewport.clientLeft, viewport.clientTop, getResearchCanvasCamera(), viewport.scrollLeft || 0, viewport.scrollTop || 0);
      const side = target ? getResearchCanvasPointerSide(target, nextEvent.clientX, nextEvent.clientY) : sourceSide;
      const rect = target ? getResearchCanvasConnectionRect(target, canvas, focusView) : null;
      const to = rect ? window.MentorResearchGeometry.sidePoint(rect, side) : free;
      preview.setAttribute("d", window.MentorResearchGeometry.connectionPathFromAnchors({ from, to, fromSide: sourceSide, toSide: side,
        fromAngle: sourceRect.sideAngles?.[sourceSide] || 0, toAngle: rect?.sideAngles?.[side] || 0, explicit: true }, "child"));
    };
    const finish = async (endEvent) => {
      if (endEvent.pointerId !== event.pointerId) return;
      const target = dragging ? findTarget(endEvent.clientX, endEvent.clientY) : null;
      cleanup();
      if (!dragging) return;
      root._researchConnectionDragClick = { key: sourceKey, endpoint: "source", until: Date.now() + 500 };
      researchViewState.suppressCanvasClickUntil = Date.now() + 300;
      if (!target) return;
      const childKey = keyOf(target);
      const childSide = getResearchCanvasPointerSide(target, endEvent.clientX, endEvent.clientY);
      try {
        if (await actions.saveCanvasParent?.(childKey, sourceKey, null, { parent: sourceSide, child: childSide }) !== true)
          showResearchCanvasConnectionError(root);
      } catch (error) { console.warn("Research sticker connection could not be saved.", error); showResearchCanvasConnectionError(root); }
    };
    const cancel = (cancelEvent) => { if (cancelEvent.pointerId === event.pointerId) cleanup(); };
    port.setPointerCapture(event.pointerId);
    port.addEventListener("pointermove", move);
    port.addEventListener("pointerup", finish);
    port.addEventListener("pointercancel", cancel);
  });
}

function bindResearchCanvasConnectionDrag(root, canvas, actions, focusView = false) {
  bindResearchCanvasSourcePortDrag(root, canvas, actions, focusView);
  canvas.addEventListener("pointerdown", (event) => {
    if (event.target.closest?.('[data-research-action="open-connection-stack"]')) return;
    const handle = event.target.closest?.('[data-research-action="change-canvas-parent"]');
    const loose = Boolean(handle && !handle.dataset.endpoint);
    const endpoint = loose ? "parent" : handle?.dataset.endpoint;
    if (event.button !== 0 || !["parent", "child"].includes(endpoint) || (focusView && loose) ||
        !canvas.contains(handle) || window.MentorUIEvents?.isTextEditingEvent?.(event)) return;
    const key = handle.dataset.cardKey;
    const cards = getResearchCanvasCards(researchViewState.currentIdea || {});
    const source = cards.find((entry) => entry.key === key);
    const graph = getResearchCanvasGraph(cards);
    const parentKey = graph.parentByKey.get(key);
    const cardSelector = focusView ? "[data-focus-card-key]" : ".research-canvas-card[data-card-key]";
    const keyOf = (element) => focusView ? element.dataset.focusCardKey : element.dataset.cardKey;
    const cardElements = new Map(Array.from(canvas.querySelectorAll(cardSelector))
      .map((card) => [keyOf(card), card]));
    const sourceElement = cardElements.get(key);
    const parentElement = cardElements.get(parentKey);
    const svg = canvas.querySelector(focusView ? "[data-research-focus-connections]" : "[data-research-canvas-connections]");
    const handleLayer = canvas.querySelector(focusView ? "[data-research-focus-connection-handles]" : "[data-research-connection-handles]");
    const viewport = focusView ? canvas : root.querySelector("[data-research-canvas-viewport]");
    if (!source || !sourceElement || (!loose && !parentElement) || !svg || !viewport || (loose && !handleLayer)) return;
    const descendants = new Set();
    const visit = (parentKey) => (graph.childrenByKey.get(parentKey) || []).forEach((childKey) => {
      if (descendants.has(childKey)) return;
      descendants.add(childKey);
      visit(childKey);
    });
    visit(key);
    const activeDirectionId = getActiveResearchDirection(researchViewState.currentIdea || {})?.id || "";
    const directionOf = (entry) => entry.direction?.id || entry.directionId || activeDirectionId;
    const candidates = new Map(cards.filter((entry) => {
      if (directionOf(entry) !== directionOf(source) || (entry.key === key && endpoint !== "child")) return false;
      if (endpoint === "parent") return isResearchStableCanvasParent(entry) && !descendants.has(entry.key);
      if (!["item", "reference"].includes(entry.source) || entry.key === parentKey) return false;
      if (entry.key === key) return true;
      let cursor = parentKey;
      const visited = new Set();
      while (cursor && !visited.has(cursor)) {
        if (cursor === entry.key) return false;
        visited.add(cursor);
        cursor = graph.parentByKey.get(cursor);
      }
      return true;
    }).map((entry) => [entry.key, entry]));
    const startX = event.clientX;
    const startY = event.clientY;
    let dragging = false;
    let targetElement = null;
    let previewPath = null;
    let oldPath = null;
    let finishing = false;
    const originalHandlePosition = { left: handle.style.left, top: handle.style.top };
    const originalHandleSide = handle.dataset.connectionSide;
    const originalHandleAngle = handle.style.getPropertyValue?.("--research-connection-angle") || "0deg";
    const originalHandleBounds = handle.getBoundingClientRect();
    const originalHandleParent = loose ? handle.parentElement : null;
    const originalHandleNext = loose ? handle.nextSibling : null;
    const childRect = getResearchCanvasConnectionRect(sourceElement, canvas, focusView);
    const parentRect = parentElement ? getResearchCanvasConnectionRect(parentElement, canvas, focusView) : null;
    const savedSides = source.canvasConnectionSides || {};
    const anchors = parentRect ? window.MentorResearchGeometry.connectionAnchors(parentRect, childRect, savedSides) : {
      from: { x: childRect.x, y: childRect.y + childRect.height / 2 },
      to: { x: childRect.x, y: childRect.y + childRect.height / 2 }, vertical: false,
      fromSide: "right", toSide: "left", explicit: false
    };
    const getTarget = (clientX, clientY, allowNearby = false) => {
      const rect = viewport.getBoundingClientRect();
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
      const target = (document.elementsFromPoint?.(clientX, clientY) || [])
        .map((element) => element.closest?.(cardSelector))
        .find((element) => element && canvas.contains(element) && !element.hidden && candidates.has(keyOf(element)));
      if (target || !allowNearby) return target || null;
      const originalKey = endpoint === "parent" ? parentKey : key;
      const originalElement = cardElements.get(originalKey);
      if (originalElement && candidates.has(originalKey) && !originalElement.hidden &&
          isResearchConnectionOriginalHandleZone(clientX, clientY, originalHandleBounds)) return originalElement;
      let nearest = null;
      let distance = 28 * 28;
      cardElements.forEach((element, candidateKey) => {
        if (!candidates.has(candidateKey) || element.hidden) return;
        if (candidateKey === originalKey) return;
        const bounds = element.getBoundingClientRect?.();
        if (!bounds) return;
        const dx = Math.max(bounds.left - clientX, 0, clientX - bounds.right);
        const dy = Math.max(bounds.top - clientY, 0, clientY - bounds.bottom);
        const nextDistance = dx * dx + dy * dy;
        if (nextDistance < distance) { nearest = element; distance = nextDistance; }
      });
      return nearest;
    };
    const excludedSide = window.MentorResearchGeometry.oppositeConnectionSide(
      endpoint === "parent" ? anchors.toSide : anchors.fromSide);
    const targetSide = (target, clientX, clientY) => getResearchCanvasPointerSide(target, clientX, clientY,
      keyOf(target) === (endpoint === "parent" ? parentKey : key) ? "" : excludedSide);
    const snapPoint = (target, clientX, clientY) => {
      const targetRect = getResearchCanvasConnectionRect(target, canvas, focusView);
      const side = targetSide(target, clientX, clientY);
      return window.MentorResearchGeometry.sidePoint(targetRect, side);
    };
    const clear = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", finish);
      handle.removeEventListener("pointercancel", cancel);
      if (handle.hasPointerCapture?.(event.pointerId)) handle.releasePointerCapture(event.pointerId);
      handle.classList.remove("is-connection-dragging");
      handle.classList.remove("is-connection-magnet");
      targetElement?.classList.remove("is-connection-target");
      previewPath?.remove();
      if (oldPath) oldPath.style.visibility = "";
      handle.style.left = originalHandlePosition.left;
      handle.style.top = originalHandlePosition.top;
      handle.style.setProperty?.("--research-connection-angle", originalHandleAngle);
      if (originalHandleSide) handle.dataset.connectionSide = originalHandleSide;
      if (loose && dragging) {
        handle.classList.add("research-canvas-card-action");
        if (originalHandleNext?.parentElement === originalHandleParent) originalHandleParent.insertBefore(handle, originalHandleNext);
        else originalHandleParent?.appendChild(handle);
      }
    };
    const move = (moveEvent) => {
      if (moveEvent.pointerId !== event.pointerId || finishing) return;
      if (!dragging && Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) < 4) return;
      if (!dragging) {
        dragging = true;
        if (loose) {
          handle.classList.remove("research-canvas-card-action");
          handleLayer.appendChild(handle);
          handle.setPointerCapture(event.pointerId);
        }
        handle.classList.add("is-connection-dragging");
        oldPath = Array.from(svg.querySelectorAll("path[data-child-key]")).find((path) => path.dataset.childKey === key);
        if (oldPath) oldPath.style.visibility = "hidden";
        previewPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        previewPath.classList.add("research-canvas-connection-preview");
        svg.appendChild(previewPath);
      }
      moveEvent.preventDefault();
      const nextTarget = getTarget(moveEvent.clientX, moveEvent.clientY, true);
      if (nextTarget !== targetElement) {
        targetElement?.classList.remove("is-connection-target");
        targetElement = nextTarget;
        targetElement?.classList.add("is-connection-target");
      }
      const world = focusView
        ? getResearchCanvasFocusPoint(canvas, moveEvent.clientX, moveEvent.clientY)
        : window.MentorResearchGeometry.screenToWorld(
            moveEvent.clientX, moveEvent.clientY, viewport.getBoundingClientRect(), viewport.clientLeft, viewport.clientTop,
            getResearchCanvasCamera(), viewport.scrollLeft || 0, viewport.scrollTop || 0
          );
      const freePoint = nextTarget ? snapPoint(nextTarget, moveEvent.clientX, moveEvent.clientY) : world;
      const side = nextTarget ? targetSide(nextTarget, moveEvent.clientX, moveEvent.clientY) : null;
      const angle = nextTarget ? getResearchCanvasConnectionRect(nextTarget, canvas, focusView).sideAngles?.[side] || 0 : 0;
      handle.classList.toggle("is-connection-magnet", Boolean(nextTarget));
      if (side && !loose) handle.dataset.connectionSide = side;
      handle.style.left = freePoint.x + "px";
      handle.style.top = freePoint.y + "px";
      handle.style.setProperty?.("--research-connection-angle", angle + "deg");
      previewPath.setAttribute("d", getResearchCanvasDragConnectionPath({ ...anchors,
        fromSide: endpoint === "parent" ? side || anchors.fromSide : anchors.fromSide,
        toSide: endpoint === "child" ? side || anchors.toSide : anchors.toSide,
        fromAngle: endpoint === "parent" ? angle : anchors.fromAngle,
        toAngle: endpoint === "child" ? angle : anchors.toAngle,
        explicit: anchors.explicit || Boolean(side) }, endpoint, freePoint));
    };
    const finish = async (endEvent) => {
      if (endEvent.pointerId !== event.pointerId || finishing) return;
      finishing = true;
      const wasDragging = dragging;
      const target = wasDragging ? getTarget(endEvent.clientX, endEvent.clientY, true) : null;
      if (!wasDragging) { clear(); return; }
      root._researchConnectionDragClick = { key, endpoint, until: Date.now() + 500 };
      researchViewState.suppressCanvasClickUntil = Date.now() + 300;
      if (!target) {
        const bounds = viewport.getBoundingClientRect();
        const inside = endEvent.clientX >= bounds.left && endEvent.clientX <= bounds.right &&
          endEvent.clientY >= bounds.top && endEvent.clientY <= bounds.bottom;
        if (inside && parentKey && ["item", "reference"].includes(source.source)) {
          try { if (await actions.saveCanvasParent?.(key, "") !== true) showResearchCanvasConnectionError(root); }
          catch (error) { console.warn("Research sticker connection could not be removed.", error); showResearchCanvasConnectionError(root); }
        }
        clear();
        return;
      }
      const targetKey = keyOf(target);
      const selectedSide = targetSide(target, endEvent.clientX, endEvent.clientY);
      researchViewState.connectionSettle = { ideaId: researchViewState.currentIdea?.id,
        childKey: endpoint === "child" ? targetKey : key, endpoint, until: Date.now() + 800 };
      try {
        const saved = endpoint === "parent"
          ? await actions.saveCanvasParent?.(key, targetKey, null, { parent: selectedSide })
          : targetKey === key
            ? await actions.saveCanvasParent?.(key, parentKey, null, { child: selectedSide })
            : await actions.transferCanvasChild?.(key, targetKey, { child: selectedSide });
        if (saved !== true) { researchViewState.connectionSettle = null; showResearchCanvasConnectionError(root); }
      } catch (error) {
        researchViewState.connectionSettle = null;
        console.warn("Research sticker connection could not be saved.", error);
        showResearchCanvasConnectionError(root);
      } finally { clear(); }
    };
    const cancel = (cancelEvent) => {
      if (cancelEvent.pointerId !== event.pointerId) return;
      clear();
    };
    handle.setPointerCapture(event.pointerId);
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", cancel);
  });
}

function openResearchConnectionStack(root, button, actions) {
  root._researchConnectionStackClose?.(false);
  const canvas = button.closest("[data-research-canvas], [data-research-canvas-preview]");
  if (!canvas) return;
  const models = new Map(getResearchCanvasCards(researchViewState.currentIdea || {}).map((card) => [card.key, card]));
  const list = document.createElement("div");
  list.className = "research-connection-stack-list";
  list.setAttribute("role", "group");
  const childKeys = button._researchChildKeys?.length ? button._researchChildKeys : [button.dataset.cardKey];
  list.setAttribute("aria-label", researchT("canvas.connectionStack", { count: childKeys.length }));
  childKeys.forEach((key) => {
    const child = models.get(key);
    if (!child) return;
    const option = document.createElement("button");
    option.type = "button";
    option.textContent = child.title || researchT("canvas.types." + child.type);
    option.title = option.textContent;
    option.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      close(false);
      armResearchCanvasConnection(root, canvas, actions, { kind: "edge", key, endpoint: button.dataset.endpoint || "parent" }, button);
      button.focus({ preventScroll: true });
    });
    list.appendChild(option);
  });
  if (!list.children.length) return;
  const viewport = canvas.matches?.("[data-research-canvas-preview]") ? canvas : root.querySelector("[data-research-canvas-viewport]");
  const bounds = viewport?.getBoundingClientRect() || button.getBoundingClientRect();
  const buttonBounds = button.getBoundingClientRect();
  (root.querySelector(".research-view") || root).appendChild(list);
  const listLeft = buttonBounds.right + 250 <= bounds.right ? buttonBounds.right + 10
    : buttonBounds.left - 250 >= bounds.left ? buttonBounds.left - 250 : bounds.right - 248;
  list.style.left = Math.max(8, Math.min(window.innerWidth - 248, listLeft)) + "px";
  list.style.top = Math.max(8, Math.min(window.innerHeight - list.offsetHeight - 8, buttonBounds.top)) + "px";
  const close = (restore = true) => {
    list.remove();
    if (root._researchConnectionStack === list) root._researchConnectionStack = null;
    if (root._researchConnectionStackClose === close) root._researchConnectionStackClose = null;
    document.removeEventListener("pointerdown", outside, true);
    document.removeEventListener("keydown", keydown, true);
    if (restore && button.isConnected) button.focus({ preventScroll: true });
  };
  const outside = (event) => { if (!list.contains(event.target) && event.target !== button) close(false); };
  const keydown = (event) => { if (event.target.closest?.("#mentorFloatingRoot")) return; if (event.key === "Escape") { event.preventDefault(); close(); } };
  document.addEventListener("pointerdown", outside, true);
  document.addEventListener("keydown", keydown, true);
  root._researchConnectionStack = list;
  root._researchConnectionStackClose = close;
  list.querySelector("button")?.focus({ preventScroll: true });
}

function armResearchCanvasConnection(root, canvas, actions, spec, trigger) {
  root._researchArmedConnection?.cancel();
  const focusView = Boolean(canvas.matches?.("[data-research-canvas-preview]"));
  const viewport = focusView ? canvas : root.querySelector("[data-research-canvas-viewport]");
  const svg = canvas.querySelector(focusView ? "[data-research-focus-connections]" : "[data-research-canvas-connections]");
  const layer = canvas.querySelector(focusView ? "[data-research-focus-connection-handles]" : "[data-research-connection-handles]");
  const selector = focusView ? "[data-focus-card-key]" : ".research-canvas-card[data-card-key]";
  const keyOf = (element) => focusView ? element.dataset.focusCardKey : element.dataset.cardKey;
  const cards = getResearchCanvasCards(researchViewState.currentIdea || {});
  const models = new Map(cards.map((card) => [card.key, card]));
  const source = models.get(spec.key);
  const graph = getResearchCanvasGraph(cards);
  const parentKey = graph.parentByKey.get(spec.key) || "";
  const elements = new Map(Array.from(canvas.querySelectorAll(selector)).map((element) => [keyOf(element), element]));
  const sourceElement = elements.get(spec.key);
  const parentElement = elements.get(parentKey);
  if (!source || !sourceElement || !viewport || !svg || !layer ||
      (spec.kind === "edge" && spec.endpoint === "child" && !parentElement)) return;
  const rectOf = (element) => getResearchCanvasConnectionRect(element, canvas, focusView);
  const anchors = parentElement ? window.MentorResearchGeometry.connectionAnchors(rectOf(parentElement), rectOf(sourceElement), source.canvasConnectionSides || {}) : null;
  const fixedSide = spec.kind === "source" ? spec.side : spec.endpoint === "parent" ? anchors?.toSide || "left" : anchors.fromSide;
  // Armed placement can attach to every side, including the original edge.
  const excludedSide = "";
  const fixedPoint = spec.kind === "source"
    ? window.MentorResearchGeometry.sidePoint(rectOf(sourceElement), spec.side)
    : spec.endpoint === "parent" ? anchors?.to || window.MentorResearchGeometry.sidePoint(rectOf(sourceElement), "left") : anchors.from;
  const activeDirectionId = getActiveResearchDirection(researchViewState.currentIdea || {})?.id || "";
  const directionOf = (card) => card.direction?.id || card.directionId || activeDirectionId;
  const ancestors = new Set([spec.key]);
  let cursor = graph.parentByKey.get(spec.key);
  while (cursor && !ancestors.has(cursor)) { ancestors.add(cursor); cursor = graph.parentByKey.get(cursor); }
  const descendants = new Set();
  const visit = (key) => (graph.childrenByKey.get(key) || []).forEach((child) => {
    if (descendants.has(child)) return;
    descendants.add(child);
    visit(child);
  });
  visit(spec.key);
  const candidates = new Set(cards.filter((card) => {
    if (directionOf(card) !== directionOf(source)) return false;
    if (spec.kind === "source") return ["item", "reference"].includes(card.source) && !ancestors.has(card.key);
    if (spec.endpoint === "parent") return card.key !== spec.key && !descendants.has(card.key) && isResearchStableCanvasParent(card);
    if (!["item", "reference"].includes(card.source) || card.key === parentKey) return false;
    if (card.key === spec.key) return true;
    let key = parentKey;
    const seen = new Set();
    while (key && !seen.has(key)) { if (key === card.key) return false; seen.add(key); key = graph.parentByKey.get(key); }
    return true;
  }).map((card) => card.key));
  const preview = document.createElementNS("http://www.w3.org/2000/svg", "path");
  preview.classList.add("research-canvas-connection-preview");
  svg.appendChild(preview);
  const symbol = document.createElement("span");
  symbol.className = "research-canvas-connection-handle is-connection-armed";
  symbol.innerHTML = getResearchCanvasConnectionIcon();
  symbol.setAttribute("aria-hidden", "true");
  layer.appendChild(symbol);
  const originalHandleBounds = trigger.getBoundingClientRect();
  let targetElement = null;
  const inside = (x, y) => { const bounds = viewport.getBoundingClientRect();
    return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom; };
  const findTarget = (x, y) => {
    if (!inside(x, y)) return null;
    const hit = (document.elementsFromPoint?.(x, y) || []).map((element) => element.closest?.(selector))
      .find((element) => element && canvas.contains(element) && !element.hidden && candidates.has(keyOf(element)));
    if (hit) return hit;
    const originalKey = spec.kind === "edge" ? spec.endpoint === "parent" ? parentKey : spec.key : "";
    const originalElement = elements.get(originalKey);
    if (originalElement && candidates.has(originalKey) && !originalElement.hidden &&
        isResearchConnectionOriginalHandleZone(x, y, originalHandleBounds)) return originalElement;
    let closest = null;
    let distance = 28 * 28;
    elements.forEach((element, key) => {
      if (!candidates.has(key) || element.hidden) return;
      if (key === originalKey) return;
      const bounds = element.getBoundingClientRect();
      const dx = Math.max(bounds.left - x, 0, x - bounds.right);
      const dy = Math.max(bounds.top - y, 0, y - bounds.bottom);
      const d = dx * dx + dy * dy;
      if (d < distance) { closest = element; distance = d; }
    });
    return closest;
  };
  const screenPoint = (x, y) => {
    const bounds = viewport.getBoundingClientRect();
    return focusView ? getResearchCanvasFocusPoint(canvas, x, y)
      : window.MentorResearchGeometry.screenToWorld(x, y, bounds, viewport.clientLeft, viewport.clientTop,
        getResearchCanvasCamera(), viewport.scrollLeft || 0, viewport.scrollTop || 0);
  };
  const update = (x, y, forcedTarget = null) => {
    const target = forcedTarget || findTarget(x, y);
    if (target !== targetElement) {
      targetElement?.classList.remove("is-connection-target");
      targetElement = target;
      targetElement?.classList.add("is-connection-target");
    }
    const side = target ? getResearchCanvasPointerSide(target, x, y, excludedSide) : fixedSide;
    const point = target ? window.MentorResearchGeometry.sidePoint(rectOf(target), side) : screenPoint(x, y);
    symbol.style.left = point.x + "px";
    symbol.style.top = point.y + "px";
    const from = spec.kind === "source" || spec.endpoint === "child" ? fixedPoint : point;
    const to = spec.kind === "source" || spec.endpoint === "child" ? point : fixedPoint;
    preview.setAttribute("d", window.MentorResearchGeometry.connectionPathFromAnchors({ from, to,
      fromSide: spec.kind === "source" ? fixedSide : spec.endpoint === "child" ? fixedSide : side,
      toSide: spec.kind === "source" || spec.endpoint === "child" ? side : fixedSide, explicit: true },
      spec.kind === "source" || spec.endpoint === "child" ? "child" : "parent"));
    return { target, side };
  };
  const suppressNextClick = () => {
    const swallow = (event) => { if (canvas.contains(event.target) || viewport.contains(event.target)) {
      event.preventDefault(); event.stopImmediatePropagation();
    } document.removeEventListener("click", swallow, true); };
    document.addEventListener("click", swallow, true);
    window.setTimeout(() => document.removeEventListener("click", swallow, true), 350);
  };
  const cancel = (restore = true) => {
    document.removeEventListener("pointerdown", press, true);
    document.removeEventListener("pointermove", move, true);
    document.removeEventListener("pointerup", release, true);
    document.removeEventListener("pointercancel", cancelPointer, true);
    document.removeEventListener("keydown", keydown, true);
    document.removeEventListener("click", armedClick, true);
    targetElement?.classList.remove("is-connection-target");
    preview.remove(); symbol.remove();
    if (root._researchArmedConnection?.cancel === cancel) root._researchArmedConnection = null;
    if (restore && trigger?.isConnected) trigger.focus({ preventScroll: true });
  };
  const commit = async (target, side, x, y) => {
    cancel(false);
    suppressNextClick();
    researchViewState.suppressCanvasClickUntil = Date.now() + 300;
    if (!target) {
      if (spec.kind !== "edge" || !parentKey || !inside(x, y)) return;
      try { if (await actions.saveCanvasParent?.(spec.key, "") !== true) showResearchCanvasConnectionError(root); }
      catch (error) { console.warn("Research sticker connection could not be removed.", error); showResearchCanvasConnectionError(root); }
      return;
    }
    const key = keyOf(target);
    try {
      const saved = spec.kind === "source"
        ? await actions.saveCanvasParent?.(key, spec.key, null, { parent: fixedSide, child: side })
        : spec.endpoint === "parent"
          ? await actions.saveCanvasParent?.(spec.key, key, null, { parent: side })
          : key === spec.key
            ? await actions.saveCanvasParent?.(spec.key, parentKey, null, { child: side })
            : await actions.transferCanvasChild?.(spec.key, key, { child: side });
      if (saved !== true) showResearchCanvasConnectionError(root);
    } catch (error) { console.warn("Research sticker connection could not be saved.", error); showResearchCanvasConnectionError(root); }
  };
  const move = (event) => {
    if (event.target.closest?.("#mentorFloatingRoot")) { cancel(false); return; }
    update(event.clientX, event.clientY);
  };
  const press = (event) => {
    if (event.target.closest?.("#mentorFloatingRoot")) { cancel(false); return; }
    if (event.button !== 0 || (!canvas.contains(event.target) && !viewport.contains(event.target))) return;
    if (window.MentorUIEvents?.isTextEditingEvent?.(event)) { cancel(false); return; }
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  const release = (event) => {
    if (event.target.closest?.("#mentorFloatingRoot")) { cancel(false); return; }
    if (event.button !== 0) return;
    if (window.MentorUIEvents?.isTextEditingEvent?.(event)) { cancel(false); return; }
    const result = update(event.clientX, event.clientY);
    if (!inside(event.clientX, event.clientY)) { cancel(); return; }
    event.preventDefault(); event.stopImmediatePropagation();
    void commit(result.target, result.side, event.clientX, event.clientY);
  };
  const cancelPointer = () => cancel();
  const armedClick = (event) => {
    if (!canvas.contains(event.target) && !viewport.contains(event.target)) return;
    if (window.MentorUIEvents?.isTextEditingEvent?.(event)) return;
    event.preventDefault(); event.stopImmediatePropagation();
  };
  const keydown = (event) => {
    if (event.target.closest?.("#mentorFloatingRoot")) { cancel(false); return; }
    if (window.MentorUIEvents?.isTextEditingEvent?.(event)) return;
    if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); cancel(); return; }
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target.closest?.(selector);
    if (!target || !canvas.contains(target) || !candidates.has(keyOf(target))) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const bounds = target.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2, y = bounds.top + bounds.height / 2;
    const result = update(x, y, target);
    void commit(target, result.side, x, y);
  };
  root._researchArmedConnection = { cancel };
  document.addEventListener("pointerdown", press, true);
  document.addEventListener("pointermove", move, true);
  document.addEventListener("pointerup", release, true);
  document.addEventListener("pointercancel", cancelPointer, true);
  document.addEventListener("keydown", keydown, true);
  document.addEventListener("click", armedClick, true);
  const start = trigger.getBoundingClientRect();
  update(start.left + start.width / 2, start.top + start.height / 2);
}

function getResearchCanvasVisibleCenterPosition(root) {
  const viewport = root.querySelector("[data-research-canvas-viewport]");
  if (!viewport) return null;
  const rect = viewport.getBoundingClientRect();
  return getResearchCanvasPositionAtClient(root,
    rect.left + viewport.clientLeft + viewport.clientWidth / 2,
    rect.top + viewport.clientTop + viewport.clientHeight / 2);
}

function placeResearchCanvasCard(canvas, card, x, y) {
  const nextX = Number.isFinite(x) ? x : parseFloat(card.style.left) || 0;
  const nextY = Number.isFinite(y) ? y : parseFloat(card.style.top) || 0;
  card.style.left = nextX + "px";
  card.style.top = nextY + "px";
  return { x: nextX, y: nextY };
}

function positionResearchCardAddMenu(menu) {
  const trigger = menu?._researchAddMenuTrigger;
  if (!trigger?.isConnected || menu.hidden) return;
  const anchor = trigger.getBoundingClientRect();
  const width = menu.offsetWidth;
  const height = menu.offsetHeight;
  const preferredX = anchor.right + 8;
  const x = preferredX + width <= window.innerWidth - 8 ? preferredX : anchor.left - width - 8;
  menu.style.left = Math.max(8, Math.min(x, window.innerWidth - width - 8)) + "px";
  menu.style.top = Math.max(8, Math.min(anchor.top, window.innerHeight - height - 8)) + "px";
}

function openResearchCardAddMenu(view, button, menu) {
  menu._researchAddMenuOrigin = menu.parentElement;
  menu._researchAddMenuTrigger = button;
  menu.classList.add("is-floating-add-menu");
  (view.querySelector("[data-research-canvas-preview]") || view).appendChild(menu);
  menu.hidden = false;
  positionResearchCardAddMenu(menu);
}

function closeResearchCanvasMenus(view) {
  if (!view) return;
  researchViewState.canvasMenuOpen = false;
  const canvasMenu = view.querySelector("[data-research-canvas-menu]");
  if (canvasMenu) canvasMenu.hidden = true;
  view.querySelector('[data-research-action="toggle-canvas-menu"]')?.setAttribute("aria-expanded", "false");
  view.querySelectorAll(".research-canvas-card-menu").forEach((menu) => {
    menu.hidden = true;
    menu.closest(".research-canvas-card")?.classList.remove("has-open-menu");
    menu.closest("[data-focus-card-key]")?.classList.remove("has-open-menu");
    const origin = menu._researchAddMenuOrigin;
    if (origin) {
      origin.closest(".research-canvas-card")?.classList.remove("has-open-menu");
      origin.closest("[data-focus-card-key]")?.classList.remove("has-open-menu");
      menu.classList.remove("is-floating-add-menu");
      menu.style.removeProperty("left");
      menu.style.removeProperty("top");
      if (origin.isConnected) origin.appendChild(menu);
      else menu.remove();
      delete menu._researchAddMenuOrigin;
      delete menu._researchAddMenuTrigger;
    }
  });
  view.querySelectorAll('[data-research-action="toggle-card-add-menu"]').forEach((button) => button.setAttribute("aria-expanded", "false"));
}

function toggleResearchCanvasAddMenu(view, button) {
  const menu = button.closest(".research-canvas-add-wrap")?.querySelector("[data-research-canvas-menu]") || view.querySelector("[data-research-canvas-menu]");
  const open = Boolean(menu?.hidden);
  closeResearchCanvasMenus(view);
  researchViewState.canvasMenuOpen = open;
  if (menu) {
    menu.hidden = !open;
    positionResearchCanvasAddMenu(menu);
  }
  button.setAttribute("aria-expanded", String(open));
}

function closeResearchCanvasPreview(view) {
  const preview = view?.querySelector("[data-research-canvas-preview]");
  view?.parentElement?._researchArmedConnection?.cancel(false);
  view?.parentElement?._researchConnectionStackClose?.(false);
  researchViewState.canvasFocus = null;
  if (!preview) return;
  closeResearchCanvasMedia({ preserveMinimized: true });
  document.querySelectorAll(".research-direction-modal.is-preview-sidecar").forEach((modal) => {
    modal.querySelector("[data-canvas-cancel], [data-research-reference-cancel], [data-attachment-close]")?.click();
  });
  const triggerKey = preview.dataset.cardKey;
  preview.remove();
  syncResearchModalLayer();
  Array.from(view.querySelectorAll("[data-research-canvas] .research-canvas-card")).find((card) => card.dataset.cardKey === triggerKey)?.focus({ preventScroll: true });
}

function getResearchCanvasFocusChildren(idea, cardKey) {
  const cards = getResearchCanvasCards(idea);
  const graph = getResearchCanvasGraph(cards);
  return (graph.childrenByKey.get(cardKey) || []).map((key) => cards.find((item) => item.key === key)).filter(Boolean);
}

function getResearchCanvasFocusDescendants(idea, cardKey) {
  const cards = getResearchCanvasCards(idea);
  const byKey = new Map(cards.map((card) => [card.key, card]));
  const graph = getResearchCanvasGraph(cards);
  let rootDepth = 0;
  let ancestorKey = cardKey;
  const ancestors = new Set([ancestorKey]);
  while (graph.parentByKey.has(ancestorKey)) {
    ancestorKey = graph.parentByKey.get(ancestorKey);
    if (ancestors.has(ancestorKey)) break;
    ancestors.add(ancestorKey);
    rootDepth++;
  }
  const queue = (graph.childrenByKey.get(cardKey) || []).map((key) => ({ key, depth: rootDepth + 1 }));
  const descendants = [];
  const visited = new Set([cardKey]);
  for (let index = 0; index < queue.length; index++) {
    const { key, depth } = queue[index];
    if (visited.has(key) || !byKey.has(key)) continue;
    visited.add(key);
    descendants.push({ ...byKey.get(key), focusDepth: depth });
    (graph.childrenByKey.get(key) || []).forEach((childKey) => queue.push({ key: childKey, depth: depth + 1 }));
  }
  return descendants;
}

function getResearchCanvasFocusDepthScale(depth) {
  return window.MentorResearchGeometry.focusDepthScale(depth);
}

function getResearchCanvasFocusScale(depth, idea = researchViewState.currentIdea) {
  return getResearchCanvasCardZoom(idea) * RESEARCH_FOCUS_CHILD_SIZE_SCALE * getResearchCanvasFocusDepthScale(depth);
}

function getResearchCanvasFocusPositions(idea, cardKey) {
  const saved = idea.pathData?.researchCanvasFocusPositions?.[cardKey] || {};
  const positions = {};
  [cardKey, ...getResearchCanvasFocusDescendants(idea, cardKey).map((child) => child.key)].forEach((key) => {
    const position = saved[key];
    if (Number.isFinite(position?.x) && Number.isFinite(position?.y)) positions[key] = { x: position.x, y: position.y };
  });
  return positions;
}

function getResearchCanvasFocusZoom(preview) {
  return Number(preview?.dataset?.focusZoom) || RESEARCH_FOCUS_ZOOM_DEFAULT;
}

function getResearchCanvasFocusPoint(preview, clientX, clientY) {
  const bounds = preview.getBoundingClientRect();
  return { x: clientX - bounds.left, y: clientY - bounds.top };
}

function getResearchCanvasFocusBounds(preview) {
  const width = preview.clientWidth || window.innerWidth;
  const height = preview.clientHeight || window.innerHeight;
  return { left: 0, top: 0, right: width, bottom: height };
}

function setResearchCanvasFocusZoom(preview, zoom) {
  const stage = preview?.querySelector("[data-research-focus-stage]");
  if (!stage || !Number.isFinite(zoom)) return;
  const next = Math.max(RESEARCH_FOCUS_ZOOM_MIN, Math.min(RESEARCH_FOCUS_ZOOM_MAX, Math.round(zoom * 100) / 100));
  preview.dataset.focusZoom = String(next);
  if (researchViewState.canvasFocus) researchViewState.canvasFocus.zoom = next;
  preview.querySelectorAll("[data-focus-card-key]").forEach((wrapper) => {
    const baseScale = Number(wrapper.dataset.focusBaseScale) || Number(wrapper.dataset.focusScale) || 1;
    wrapper.dataset.focusBaseScale = String(baseScale);
    wrapper.dataset.focusScale = String(baseScale * next);
    wrapper.style.setProperty("--research-focus-scale", String(baseScale * next));
  });
  const label = preview.querySelector("[data-research-focus-zoom-value]");
  if (label) label.textContent = researchT("compactNav.zoomLevel", { percent: Math.round(next * 100) });
  preview.querySelectorAll('[data-research-action="zoom-canvas-focus"]').forEach((button) => {
    button.disabled = Number(button.dataset.zoomDelta) < 0 ? next <= RESEARCH_FOCUS_ZOOM_MIN : next >= RESEARCH_FOCUS_ZOOM_MAX;
  });
  preview.querySelectorAll("[data-focus-card-key]").forEach((wrapper) => layoutResearchCanvasFocusAdd(preview, wrapper));
  preview.querySelectorAll(".is-floating-add-menu").forEach(positionResearchCardAddMenu);
  drawResearchCanvasFocusConnections(preview);
}

function renderResearchCanvasFocusZoom() {
  const button = (delta, key, symbol) => '<button type="button" data-research-action="zoom-canvas-focus" data-zoom-delta="' + delta + '" aria-label="' + escapeResearchHtml(researchT(key)) + '" title="' + escapeResearchHtml(researchT(key)) + '"><span aria-hidden="true">' + symbol + '</span></button>';
  return '<div class="research-canvas-focus-zoom" role="group" aria-label="' + escapeResearchHtml(researchT("compactNav.zoomGroup")) + '">' +
    button(-0.1, "compactNav.zoomOut", '−') + '<output data-research-focus-zoom-value>' + escapeResearchHtml(researchT("compactNav.zoomLevel", { percent: Math.round(RESEARCH_FOCUS_ZOOM_DEFAULT * 100) })) + '</output>' + button(0.1, "compactNav.zoomIn", '+') + '</div>';
}

function setResearchCanvasFocusChildrenVisibility(preview) {
  if (!preview) return;
  const idea = researchViewState.currentIdea || {};
  const collapsed = idea.pathData?.researchCanvasCollapsed || {};
  const wrappers = Array.from(preview.querySelectorAll("[data-focus-card-key]"));
  const keys = new Set(wrappers.map((wrapper) => wrapper.dataset.focusCardKey));
  // Ignore collapsed ancestors outside this workspace so its main sticker always remains visible.
  const graph = getResearchCanvasGraph(getResearchCanvasCards(idea).filter((card) => keys.has(card.key)), collapsed);
  wrappers.forEach((wrapper) => {
    const key = wrapper.dataset.focusCardKey;
    wrapper.hidden = graph.hiddenKeys.has(key) && key !== preview.dataset.cardKey;
    const fold = wrapper.querySelector(".research-canvas-fold");
    if (!fold) return;
    const closed = Boolean(collapsed[key]);
    fold.classList.toggle("is-collapsed", closed);
    fold.setAttribute("aria-expanded", String(!closed));
    fold.setAttribute("aria-label", researchT(closed ? "canvas.expandChildren" : "canvas.collapseChildren", { count: graph.childrenByKey.get(key)?.length || 0 }));
    fold.querySelector("span").textContent = closed ? "◂" : "▸";
  });
}

function openResearchCanvasPreview(root, card) {
  const view = root.querySelector(".research-view") || root.closest?.(".research-view") || root;
  if (!card || !view) return;
  if (isMobileResearchCanvas()) { closeResearchCanvasPreview(view); return; }
  root._researchArmedConnection?.cancel(false);
  root._researchConnectionStackClose?.(false);
  closeResearchCanvasMenus(view);
  view.querySelector("[data-research-canvas-preview]")?.remove();
  const idea = researchViewState.currentIdea || {};
  const cards = getResearchCanvasCards(idea);
  const graph = getResearchCanvasGraph(cards);
  const children = getResearchCanvasFocusDescendants(idea, card.key);
  const focus = researchViewState.canvasFocus?.ideaId === idea.id && researchViewState.canvasFocus.cardKey === card.key
    ? researchViewState.canvasFocus
    : { ideaId: idea.id, cardKey: card.key, positions: getResearchCanvasFocusPositions(idea, card.key) };
  researchViewState.canvasFocus = focus;
  const preview = document.createElement("div");
  preview.className = "research-canvas-preview-overlay";
  preview.dataset.researchCanvasPreview = "";
  preview.dataset.cardKey = card.key;
  preview.setAttribute("role", "dialog");
  preview.setAttribute("aria-modal", "true");
  preview.setAttribute("aria-label", card.title || researchT("canvas.types." + card.type));
  preview.innerHTML = '<div class="research-canvas-focus-exit">' + renderResearchCanvasFocusZoom() + '<span class="research-canvas-focus-exit-hint">' + escapeResearchHtml(researchT("canvas.focusExitHint")) + '</span><button class="research-canvas-preview-close" type="button" data-close-canvas-preview aria-label="' + escapeResearchHtml(researchT("actions.close")) + '">×</button></div>' +
  '<div class="research-canvas-focus-stage" data-research-focus-stage><svg class="research-canvas-focus-connections" data-research-focus-connections aria-hidden="true"></svg><div class="research-canvas-focus-connection-handles" data-research-focus-connection-handles></div>' +
  '<div class="research-canvas-focus-card is-main" data-focus-card-key="' + escapeResearchHtml(card.key) + '">' + renderResearchCanvasCard(card, graph, {}, { scope: "focus-" + card.key }) + '</div>' +
    '<div class="research-canvas-focus-children" data-focus-children>' + children.map((child) => '<div class="research-canvas-focus-card is-child" data-focus-card-key="' + escapeResearchHtml(child.key) + '" data-focus-parent-key="' + escapeResearchHtml(graph.parentByKey.get(child.key) || card.key) + '" data-focus-depth="' + child.focusDepth + '">' + renderResearchCanvasCard(child, graph) + '</div>').join("") + '</div></div>';
  const expandedCard = preview.querySelector(".research-canvas-focus-card.is-main .research-canvas-card");
  expandedCard.classList.add("is-preview");
  expandedCard.removeAttribute("tabindex");
  expandedCard.removeAttribute("hidden");
  expandedCard.classList.remove("has-custom-size");
  expandedCard.style.removeProperty("width");
  expandedCard.style.removeProperty("height");
  expandedCard.style.removeProperty("min-height");
  expandedCard.removeAttribute("data-sticker-manual-height");
  const focusSizes = idea.pathData?.researchCanvasFocusSizes?.[card.key] || {};
  preview.querySelectorAll("[data-focus-card-key]").forEach((wrapper) => {
    const element = wrapper.querySelector(".research-canvas-card");
    const resize = element.querySelector("[data-research-card-resize]");
    if (resize) wrapper.appendChild(resize);
    if (wrapper.classList.contains("is-main")) {
      wrapper.dataset.focusScale = String(RESEARCH_FOCUS_SIZE_SCALE);
      wrapper.style.setProperty("--research-focus-scale", String(RESEARCH_FOCUS_SIZE_SCALE));
    }
    const badge = wrapper.querySelector(".research-canvas-card-badge");
    if (badge) wrapper.appendChild(badge);
    const ports = wrapper.querySelector(".research-canvas-source-ports");
    if (ports) wrapper.appendChild(ports);
    const fold = element.querySelector(".research-canvas-fold");
    if (fold) wrapper.appendChild(fold);
    if (wrapper.classList.contains("is-child")) {
      wrapper.dataset.focusScale = String(getResearchCanvasFocusScale(wrapper.dataset.focusDepth, idea));
      const original = Array.from(view.querySelectorAll("[data-research-canvas] .research-canvas-card")).find((element) => element.dataset.cardKey === wrapper.dataset.focusCardKey);
      wrapper.dataset.focusBaseWidth = String(original?.offsetWidth || 224);
    }
    wrapper.dataset.focusBaseScale = wrapper.dataset.focusScale;
    element.style.removeProperty("width");
    const size = normalizeResearchCanvasSize(focusSizes[wrapper.dataset.focusCardKey]);
    if (size) {
      wrapper.style.width = size.width + "px";
      wrapper.dataset.focusBaseWidth = String(size.width);
      element.style.height = size.height + "px";
      if (element.classList.contains("has-sticker-document")) element.dataset.stickerManualHeight = String(size.height);
      element.classList.add("has-custom-size");
    }
    const addWrap = wrapper.querySelector(".research-canvas-card-add-wrap");
    if (!addWrap) return;
    const add = document.createElement("div");
    add.className = "research-canvas-focus-add";
    add.dataset.focusAdd = "";
    add.appendChild(addWrap);
    wrapper.appendChild(add);
  });
  preview.querySelectorAll(".research-canvas-card").forEach((element) => {
    element.querySelectorAll('[data-research-action="open-canvas-preview"]').forEach((button) => {
      button.dataset.researchAction = "open-canvas-media";
    });
  });
  preview.addEventListener("click", (event) => {
    if (window.MentorUIEvents?.isTextEditingEvent?.(event)) return;
    if (event.target.closest("[data-close-canvas-preview]")) closeResearchCanvasPreview(view);
  });
  preview.addEventListener("dblclick", (event) => {
    if (event.target !== preview || window.MentorUIEvents?.isTextEditingEvent?.(event)) return;
    event.preventDefault();
    event.stopPropagation();
    closeResearchCanvasPreview(view);
  });
  preview.addEventListener("wheel", (event) => event.stopPropagation(), { passive: true });
  view.appendChild(preview);
  bindResearchStickerDocuments(preview, root._researchActions || {});
  setResearchCanvasFocusChildrenVisibility(preview);
  setResearchCanvasFocusZoom(preview, focus.zoom || RESEARCH_FOCUS_ZOOM_DEFAULT);
  layoutResearchCanvasFocus(preview, focus, true);
  bindResearchCanvasConnectionDrag(root, preview, root._researchActions || {}, true);
  bindResearchCanvasFocusDrag(preview, focus, root._researchActions || {});
  bindResearchCanvasConnectionLayout(preview, true);
  setResearchModalLayer(true);
  preview.querySelector("[data-close-canvas-preview]")?.focus();
}

function getResearchFocusCardSize(card) {
  const scale = Number(card.dataset?.focusScale) || 1;
  return { width: card.offsetWidth * scale, height: card.offsetHeight * scale };
}

function drawResearchCanvasFocusConnections(preview) {
  const svg = preview.querySelector?.("[data-research-focus-connections]");
  if (svg?.tagName?.toLowerCase() !== "svg") return;
  const handleLayer = preview.querySelector("[data-research-focus-connection-handles]");
  const cards = new Map(Array.from(preview.querySelectorAll("[data-focus-card-key]")).filter((card) => !card.hidden).map((card) => [card.dataset.focusCardKey, card]));
  const models = new Map(getResearchCanvasCards(researchViewState.currentIdea || {}).map((card) => [card.key, card]));
  const connectionAnchors = new Map();
  svg.setAttribute("viewBox", "0 0 " + preview.clientWidth + " " + preview.clientHeight);
  svg.innerHTML = Array.from(preview.querySelectorAll("[data-focus-parent-key]"), (child) => {
    const parent = cards.get(child.dataset.focusParentKey);
    if (!parent || child.hidden) return "";
    const parentRect = getResearchCanvasConnectionRect(parent, preview, true);
    const childRect = getResearchCanvasConnectionRect(child, preview, true);
    const sides = preview._researchConnectionSideOverrides?.[child.dataset.focusCardKey] || models.get(child.dataset.focusCardKey)?.canvasConnectionSides || {};
    const anchors = window.MentorResearchGeometry.connectionAnchors(parentRect, childRect, sides);
    const path = window.MentorResearchGeometry.connectionPathFromAnchors(anchors);
    if (["item", "reference"].includes(models.get(child.dataset.focusCardKey)?.source))
      connectionAnchors.set(child.dataset.focusCardKey, anchors);
    return '<path data-child-key="' + escapeResearchHtml(child.dataset.focusCardKey) + '" d="' + path + '" />';
  }).join("");
  if (handleLayer?.dataset?.researchFocusConnectionHandles === undefined) return;
  const parents = new Map(Array.from(preview.querySelectorAll("[data-focus-parent-key]"), (child) =>
    [child.dataset.focusCardKey, child.dataset.focusParentKey]));
  updateResearchConnectionSourcePorts(cards, connectionAnchors, models, parents);
  renderResearchConnectionHandles(handleLayer, connectionAnchors, models);
}

function layoutResearchCanvasFocus(preview, focus, fitSavedPositions = false) {
  const main = preview.querySelector(".research-canvas-focus-card.is-main");
  const children = Array.from(preview.querySelectorAll(".research-canvas-focus-card.is-child")).filter((child) => !child.hidden);
  const hasChildren = children.length > 0;
  const viewportWidth = preview.clientWidth || window.innerWidth;
  const viewportHeight = preview.clientHeight || window.innerHeight;
  const mainSize = getResearchFocusCardSize(main);
  const mainWidth = mainSize.width;
  const mainHeight = mainSize.height;
  children.forEach((child) => {
    const scale = Number(child.dataset.focusScale) || getResearchCanvasFocusScale(child.dataset.focusDepth);
    child.dataset.focusScale = String(scale);
    child.style.width = (Number(child.dataset.focusBaseWidth) || 224) + "px";
    child.style.setProperty("--research-focus-scale", String(scale));
  });
  const hasSideSpace = viewportWidth > 850;
  const mainX = Math.max(18, (viewportWidth - mainWidth) / 2 - (hasSideSpace && hasChildren ? 130 : 0));
  const mainY = hasSideSpace || !hasChildren ? Math.max(72, (viewportHeight - mainHeight) / 2) : 76;
  const position = (element, defaultX, defaultY) => {
    const saved = focus.positions[element.dataset.focusCardKey];
    const rect = saved && !fitSavedPositions ? { left: saved.x, top: saved.y } : clampPosition(element, saved?.x ?? defaultX, saved?.y ?? defaultY);
    element.style.left = rect.left + "px";
    element.style.top = rect.top + "px";
    return rect;
  };
  const clampPosition = (element, x, y) => {
    const size = getResearchFocusCardSize(element);
    const left = Math.max(0, Math.min(x, viewportWidth - size.width));
    const top = Math.max(0, Math.min(y, viewportHeight - size.height));
    return { left, top, right: left + size.width, bottom: top + size.height };
  };
  position(main, mainX, mainY);
  const byKey = new Map([main, ...children].map((wrapper) => [wrapper.dataset.focusCardKey, wrapper]));
  const placed = [main];
  const gap = 64;
  children.forEach((child) => {
    const parent = byKey.get(child.dataset.focusParentKey) || main;
    let x = (parseFloat(parent.style.left) || 0) + getResearchFocusCardSize(parent).width + gap;
    let y = parseFloat(parent.style.top) || 72;
    if (!focus.positions[child.dataset.focusCardKey]) {
      const size = getResearchFocusCardSize(child);
      const excess = x + size.width + 48 - viewportWidth;
      if (excess > 0) {
        const shift = Math.min(excess, Math.min(...placed.map((wrapper) => (parseFloat(wrapper.style.left) || 0) - 8)));
        if (shift > 0) placed.forEach((wrapper) => {
          wrapper.style.left = (parseFloat(wrapper.style.left) - shift) + "px";
          focus.positions[wrapper.dataset.focusCardKey] = { x: parseFloat(wrapper.style.left), y: parseFloat(wrapper.style.top) };
        });
        x -= Math.max(0, shift);
      }
      const siblings = placed.filter((wrapper) => wrapper !== main && wrapper.dataset.focusParentKey === child.dataset.focusParentKey);
      if (siblings.length) y = Math.max(...siblings.map((wrapper) => parseFloat(wrapper.style.top) + getResearchFocusCardSize(wrapper).height + 32));
    }
    const rect = position(child, x, y);
    focus.positions[child.dataset.focusCardKey] = { x: rect.left, y: rect.top };
    placed.push(child);
  });
  [main, ...children].forEach((wrapper) => layoutResearchCanvasFocusAdd(preview, wrapper));
  drawResearchCanvasFocusConnections(preview);
}

function layoutResearchCanvasFocusAdd(preview, main) {
  const add = main.querySelector("[data-focus-add]");
  if (!add) return;
  const x = main.offsetWidth - 12;
  add.style.left = x + "px";
  add.style.top = (main.offsetHeight - (add.offsetHeight || 42)) / 2 + "px";
  const scale = Number(main.dataset?.focusScale) || 1;
  add.classList.toggle("is-right-edge", (parseFloat(main.style.left) || 0) + (x + add.offsetWidth + 178) * scale > getResearchCanvasFocusBounds(preview).right - 18);
}

function getResearchStickerDragSurface(event) {
  if (event.pointerType === "touch") return null;
  const surface = event.target.closest?.("button[data-sticker-drag-surface]");
  const control = event.target.closest?.("button, a, input, textarea, select, [contenteditable], iframe, video, audio");
  return surface && control === surface ? surface : null;
}

function bindResearchStickerSurfaceClickGuard(root) {
  if (root._researchSurfaceClickGuard) return;
  root._researchSurfaceClickGuard = true;
  // A new pointer sequence clears any unused marker, including one left after cancellation.
  root.addEventListener("pointerdown", () => { root._researchSurfaceDragClick = null; }, true);
  root.addEventListener("click", (event) => {
    const marker = root._researchSurfaceDragClick;
    if (!marker || event.detail === 0) return;
    if (Number.isFinite(event.pointerId) && event.pointerId !== marker.pointerId) return;
    if (event.target !== marker.surface && !marker.surface.contains?.(event.target) && event.target !== marker.card) return;
    root._researchSurfaceDragClick = null;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }, true);
}

function bindResearchCanvasFocusDrag(preview, focus, actions = {}) {
  bindResearchStickerSurfaceClickGuard(preview);
  preview.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || window.MentorUIEvents?.isTextEditingEvent?.(event)) return;
    const surface = getResearchStickerDragSurface(event);
    if (!surface && event.target.closest("button, a, input, textarea, select, [contenteditable], iframe, video, audio, .research-canvas-menu")) return;
    const card = event.target.closest("[data-focus-card-key]");
    if (!card || !preview.contains(card)) return;
    if (event.pointerType === "touch" && !event.target.closest(".research-canvas-card-badge")) return;
    if (event.pointerType !== "touch") event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const bounds = getResearchCanvasFocusBounds(preview);
    const originalX = parseFloat(card.style.left) || 0;
    const originalY = parseFloat(card.style.top) || 0;
    const key = card.dataset.focusCardKey;
    const focusElements = new Map(Array.from(preview.querySelectorAll("[data-focus-card-key]"))
      .map((element) => [element.dataset.focusCardKey, element]));
    const focusRect = (element) => getResearchCanvasConnectionRect(element, preview, true);
    const sectors = captureResearchConnectionSectors(
      Array.from(preview.querySelectorAll("[data-focus-parent-key]"), (element) =>
        [element.dataset.focusCardKey, element.dataset.focusParentKey]), focusElements, focusRect, new Set([key]));
    let moved = false;
    const capture = surface || card;
    capture.setPointerCapture(event.pointerId);
    const move = (moveEvent) => {
      if (moveEvent.pointerId !== event.pointerId) return;
      if (!moved && Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) < 4) return;
      if (!moved) {
        moved = true;
        card.classList.add("is-dragging");
        preview.classList.add("is-card-dragging");
      }
      const size = getResearchFocusCardSize(card);
      const x = Math.max(bounds.left, Math.min(originalX + moveEvent.clientX - startX, bounds.right - size.width));
      const y = Math.max(bounds.top, Math.min(originalY + moveEvent.clientY - startY, bounds.bottom - size.height));
      card.style.left = x + "px";
      card.style.top = y + "px";
      focus.positions[card.dataset.focusCardKey] = { x, y };
      layoutResearchCanvasFocusAdd(preview, card);
      preview._researchConnectionSideOverrides = changedResearchConnectionSides(sectors, focusRect);
      drawResearchCanvasFocusConnections(preview);
    };
    const finish = async (endEvent) => {
      if (endEvent.pointerId !== event.pointerId) return;
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerup", finish);
      card.removeEventListener("pointercancel", finish);
      card.classList.remove("is-dragging");
      preview.classList.remove("is-card-dragging");
      if (moved && surface) preview._researchSurfaceDragClick = { surface, card, pointerId: event.pointerId };
      if (capture.hasPointerCapture(event.pointerId)) capture.releasePointerCapture(event.pointerId);
      if (endEvent.type === "pointercancel") {
        card.style.left = originalX + "px";
        card.style.top = originalY + "px";
        focus.positions[key] = { x: originalX, y: originalY };
        delete preview._researchConnectionSideOverrides;
        drawResearchCanvasFocusConnections(preview);
        return;
      }
      if (moved) {
        const position = focus.positions[key];
        const idea = researchViewState.currentIdea;
        const sides = changedResearchConnectionSides(sectors, focusRect);
        const changedSides = Object.keys(sides).length > 0;
        if (!changedSides && idea?.id === focus.ideaId && idea.pathData) {
          const workspaces = idea.pathData.researchCanvasFocusPositions || (idea.pathData.researchCanvasFocusPositions = {});
          const positions = workspaces[focus.cardKey] || (workspaces[focus.cardKey] = {});
          positions[key] = { x: Math.round(position.x), y: Math.round(position.y) };
        }
        try {
          const saved = changedSides
            ? await actions.saveCanvasMove?.({ [key]: position }, sides, focus.cardKey)
            : await actions.saveCanvasFocusPosition?.(focus.cardKey, key, position.x, position.y);
          if (saved !== true) throw new Error("Research focus position could not be saved.");
          delete preview._researchConnectionSideOverrides;
          drawResearchCanvasFocusConnections(preview);
        } catch (error) {
          console.warn("Research focus position could not be saved.", error);
          card.style.left = originalX + "px";
          card.style.top = originalY + "px";
          focus.positions[key] = { x: originalX, y: originalY };
          delete preview._researchConnectionSideOverrides;
          drawResearchCanvasFocusConnections(preview);
        }
      }
    };
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerup", finish);
    card.addEventListener("pointercancel", finish);
  });
}

function getResearchCanvasResizeState(root, handle) {
  const wrapper = handle.closest("[data-focus-card-key]");
  const card = wrapper?.querySelector(".research-canvas-card") || handle.closest(".research-canvas-card");
  const preview = wrapper?.closest("[data-research-canvas-preview]");
  const canvas = card?.closest("[data-research-canvas]");
  if (!card || (!preview && !canvas)) return null;
  const frame = wrapper || card;
  const worldScale = wrapper ? Number(wrapper.dataset.focusScale) || 1 : getResearchCanvasCardZoom() * RESEARCH_DEFAULT_SIZE_SCALE * (Number(card.dataset.canvasDepthScale) || getResearchCanvasDepthScale("", null));
  const scale = worldScale * (wrapper ? 1 : Number(canvas.dataset.mapScale) || 1);
  const bounds = preview ? getResearchCanvasFocusBounds(preview) : null;
  const left = parseFloat(frame.style.left) || 0;
  const top = parseFloat(frame.style.top) || 0;
  return {
    root, handle, card, frame, preview, canvas, scale, worldScale,
    key: handle.dataset.cardKey,
    parentKey: preview?.dataset.cardKey || "",
    ideaId: researchViewState.currentIdea?.id,
    actions: root._researchActions || {},
    startWidth: frame.offsetWidth, startHeight: card.offsetHeight,
    maxWidth: preview ? Math.max(1, (bounds.right - left) / worldScale) : Infinity,
    maxHeight: preview ? Math.max(1, (bounds.bottom - top) / worldScale) : Infinity
  };
}

function applyResearchCanvasResize(state, width, height) {
  const modular = state.card.classList.contains("has-sticker-document");
  const targetWidth = Math.max(Math.min(120, state.maxWidth), Math.min(width, state.maxWidth));
  state.frame.style.width = targetWidth + "px";
  const document = modular && state.card.querySelector("[data-sticker-document]");
  const minHeight = document && window.MentorResearchStickerSections?.minimumHeight ? window.MentorResearchStickerSections.minimumHeight(document) : 100;
  const size = {
    width: targetWidth,
    height: Math.max(Math.min(minHeight, state.maxHeight), Math.min(height, state.maxHeight))
  };
  const collapsedHeight = modular ? Number(state.card.dataset.stickerCollapsedSectionHeight) || 0 : 0;
  state.card.style.height = size.height + "px";
  if (modular && state.card.style.minHeight) state.card.style.minHeight = "";
  if (modular) {
    state.card.dataset.stickerManualHeight = String(size.height + collapsedHeight);
    delete state.card.dataset.stickerRevealContent;
  }
  state.card.classList.add("has-custom-size");
  if (state.preview) {
    state.frame.dataset.focusBaseWidth = String(size.width);
    layoutResearchCanvasFocusAdd(state.preview, state.frame);
    drawResearchCanvasFocusConnections(state.preview);
  } else {
    updateResearchCanvasNoteFitVisibility(state.card);
    drawResearchCanvasConnections(state.canvas);
  }
  return modular ? { ...size, height: size.height + collapsedHeight } : size;
}

function updateResearchCanvasNoteFitVisibility(card) {
  const button = card.querySelector?.("[data-research-card-fit]");
  if (!button) return;
  if (button.getAttribute("aria-expanded") === "true") {
    button.hidden = false;
    return;
  }
  const text = card.querySelector(".research-canvas-card-text");
  const content = card.querySelector(".research-canvas-card-content");
  if (!text || !content || !Number.isFinite(text.clientHeight) || !Number.isFinite(content.clientHeight)) return;
  button.hidden = !(text.scrollHeight > text.clientHeight + 1 || content.scrollHeight > content.clientHeight + 1);
}

function setResearchCanvasNoteFitState(card, expanded) {
  const button = card.querySelector?.("[data-research-card-fit]");
  if (!button) return;
  const label = researchT(expanded ? "canvas.resetSize" : "canvas.fitText");
  button.innerHTML = getResearchCanvasNoteLotus(expanded);
  button.setAttribute("aria-expanded", String(expanded));
  button.setAttribute("aria-label", label);
  button.title = label;
  updateResearchCanvasNoteFitVisibility(card);
}

async function persistResearchCanvasResize(state, size, expanded = !state.preview && state.card.querySelector?.("[data-research-card-fit]")?.getAttribute("aria-expanded") === "true") {
  const normalized = normalizeResearchCanvasSize(size);
  if (!normalized) return;
  if (expanded) normalized.expanded = true;
  const idea = researchViewState.currentIdea;
  if (idea?.id === state.ideaId && idea.pathData) {
    const maps = state.parentKey
      ? idea.pathData.researchCanvasFocusSizes || (idea.pathData.researchCanvasFocusSizes = {})
      : idea.pathData.researchCanvasSizes || (idea.pathData.researchCanvasSizes = {});
    const sizes = state.parentKey ? maps[state.parentKey] || (maps[state.parentKey] = {}) : maps;
    sizes[state.key] = normalized;
  }
  try {
    if (state.parentKey) await state.actions.saveCanvasFocusSize?.(state.parentKey, state.key, normalized.width, normalized.height);
    else if (expanded) await state.actions.saveCanvasSize?.(state.key, normalized.width, normalized.height, true);
    else await state.actions.saveCanvasSize?.(state.key, normalized.width, normalized.height);
  } catch (error) { console.warn("Research sticker size could not be saved.", error); }
}

async function fitResearchCanvasNote(root, button) {
  const state = getResearchCanvasResizeState(root, button);
  if (!state || state.preview || !state.card.classList.contains("is-note")) return;
  if (button.getAttribute?.("aria-expanded") === "true" || researchViewState.currentIdea?.pathData?.researchCanvasSizes?.[state.key]?.expanded) {
    state.card.style.width = state.startWidth + "px";
    state.card.style.removeProperty("height");
    state.card.classList.remove("has-custom-size");
    setResearchCanvasNoteFitState(state.card, false);
    if (researchViewState.currentIdea?.id === state.ideaId && researchViewState.currentIdea.pathData) {
      const sizes = researchViewState.currentIdea.pathData.researchCanvasSizes || (researchViewState.currentIdea.pathData.researchCanvasSizes = {});
      sizes[state.key] = { width: Math.round(state.startWidth) };
    }
    drawResearchCanvasConnections(state.canvas);
    try { await state.actions.resetCanvasSize?.(state.key, state.startWidth); }
    catch (error) { console.warn("Research sticker size could not be reset.", error); }
    return;
  }
  state.card.classList.add("has-custom-size");
  state.card.style.height = "auto";
  const height = Math.ceil(Math.max(state.card.offsetHeight, state.card.scrollHeight));
  // The map grows with the note, so fitting is not limited to the current viewport.
  state.maxWidth = Math.max(state.maxWidth, state.startWidth);
  state.maxHeight = Math.max(state.maxHeight, height);
  state.canvas.style.height = Math.max(state.canvas.clientHeight, (parseFloat(state.card.style.top) || 0) + height * (state.worldScale || state.scale) + 72) + "px";
  const size = applyResearchCanvasResize(state, state.startWidth, height);
  setResearchCanvasNoteFitState(state.card, true);
  await persistResearchCanvasResize(state, size, true);
}

function bindResearchCanvasResize(root) {
  if (root._researchResizePointerDelegate) return;
  root.addEventListener("click", (event) => {
    if (window.MentorUIEvents?.isTextEditingEvent?.(event)) return;
    const button = event.target.closest?.("[data-research-card-fit]");
    if (!button || !root.contains(button)) return;
    event.preventDefault(); event.stopPropagation();
    fitResearchCanvasNote(root, button);
  });
  root._researchResizePointerDelegate = (event) => {
    if (event.button !== 0 || window.MentorUIEvents?.isTextEditingEvent?.(event)) return;
    const handle = event.target.closest?.("[data-research-card-resize]");
    if (!handle || !root.contains(handle)) return;
    const state = getResearchCanvasResizeState(root, handle);
    if (!state) return;
    event.preventDefault(); event.stopPropagation();
    closeResearchCanvasMenus(root.querySelector(".research-view") || root);
    const startX = event.clientX, startY = event.clientY;
    const original = { width: state.frame.style.width, height: state.card.style.height, minHeight: state.card.style.minHeight, manualHeight: state.card.dataset.stickerManualHeight, revealContent: state.card.dataset.stickerRevealContent, baseWidth: state.frame.dataset.focusBaseWidth, custom: state.card.classList.contains("has-custom-size"), expanded: state.card.querySelector("[data-research-card-fit]")?.getAttribute("aria-expanded") === "true" };
    let size = null;
    handle.setPointerCapture(event.pointerId);
    const move = (moveEvent) => {
      if (moveEvent.pointerId !== event.pointerId) return;
      if (!size && Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) < 3) return;
      size = applyResearchCanvasResize(state, state.startWidth + (moveEvent.clientX - startX) / state.scale, state.startHeight + (moveEvent.clientY - startY) / state.scale);
    };
    const finish = (endEvent) => {
      if (endEvent.pointerId !== event.pointerId) return;
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", finish);
      handle.removeEventListener("pointercancel", finish);
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
      if (endEvent.type === "pointercancel") {
        state.frame.style.width = original.width;
        state.card.style.height = original.height;
        state.card.style.minHeight = original.minHeight;
        if (original.manualHeight === undefined) delete state.card.dataset.stickerManualHeight;
        else state.card.dataset.stickerManualHeight = original.manualHeight;
        if (original.revealContent === undefined) delete state.card.dataset.stickerRevealContent;
        else state.card.dataset.stickerRevealContent = original.revealContent;
        state.card.classList.toggle("has-custom-size", original.custom);
        if (!state.preview) setResearchCanvasNoteFitState(state.card, original.expanded);
        if (original.baseWidth === undefined) delete state.frame.dataset.focusBaseWidth;
        else state.frame.dataset.focusBaseWidth = original.baseWidth;
        if (state.preview) layoutResearchCanvasFocusAdd(state.preview, state.frame);
        else drawResearchCanvasConnections(state.canvas);
      } else if (size) persistResearchCanvasResize(state, size);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
  };
  root.addEventListener("pointerdown", root._researchResizePointerDelegate);
  root.addEventListener("keydown", (event) => {
    const handle = event.target.closest?.("[data-research-card-resize]");
    if (!handle || !root.contains(handle) || window.MentorUIEvents?.isTextEditingEvent?.(event)) return;
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    const state = getResearchCanvasResizeState(root, handle);
    if (!state) return;
    event.preventDefault(); event.stopPropagation();
    const step = (event.shiftKey ? 2 : 10) / state.scale;
    const size = applyResearchCanvasResize(state, state.startWidth + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0), state.startHeight + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0));
    window.clearTimeout(handle._researchSizeSaveTimer);
    handle._researchSizeSaveTimer = window.setTimeout(() => persistResearchCanvasResize(state, size), 200);
  });
}

function bindResearchCanvas(root, actions = {}) {
  const canvas = root.querySelector("[data-research-canvas]");
  if (!canvas) return;
  bindResearchStickerSurfaceClickGuard(canvas);
  layoutResearchCanvas(canvas);
  bindResearchCanvasConnectionLayout(canvas);
  bindResearchCanvasMap(root, canvas);
  bindResearchCanvasConnectionDrag(root, canvas, actions);
  if (typeof ResizeObserver !== "undefined") {
    if (!root._researchNoteOverflowObserver) {
      root._researchNoteOverflowObserver = new ResizeObserver(() => {
        root.querySelectorAll("[data-research-canvas] .research-canvas-card.is-note").forEach(updateResearchCanvasNoteFitVisibility);
      });
    }
    root._researchNoteOverflowObserver.disconnect();
    canvas.querySelectorAll(".research-canvas-card.is-note, .research-canvas-card.is-note .research-canvas-card-text, .research-canvas-card.is-note .research-canvas-card-content").forEach((element) => root._researchNoteOverflowObserver.observe(element));
  }
  if (!root._researchNoteFontsReady && document.fonts?.ready) {
    root._researchNoteFontsReady = true;
    document.fonts.ready.then(() => root.querySelectorAll("[data-research-canvas] .research-canvas-card.is-note").forEach(updateResearchCanvasNoteFitVisibility));
  }
  if (!root._researchCanvasResize) {
    root._researchCanvasResize = () => {
      layoutResearchCanvas(root.querySelector("[data-research-canvas]"));
      const preview = root.querySelector("[data-research-canvas-preview]");
      if (preview && isMobileResearchCanvas()) { closeResearchCanvasPreview(root.querySelector(".research-view") || root); return; }
      if (preview && researchViewState.canvasFocus) layoutResearchCanvasFocus(preview, researchViewState.canvasFocus);
    };
    window.addEventListener("resize", root._researchCanvasResize);
  }
  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || window.MentorUIEvents?.isTextEditingEvent?.(event)) return;
    const surface = getResearchStickerDragSurface(event);
    if (!surface && event.target.closest("button, a, input, textarea, select, [contenteditable], iframe, video, audio")) return;
    const card = event.target.closest(".research-canvas-card");
    if (!card || !canvas.contains(card)) return;
    const dragKeys = window.MentorResearchOrganizer?.prepareCardDrag?.(card.dataset.cardKey, event) || [card.dataset.cardKey];
    if (!dragKeys.length) return;
    if (event.pointerType !== "touch") event.preventDefault();
    const dragSet = new Set(dragKeys);
    const dragCards = Array.from(canvas.querySelectorAll(".research-canvas-card:not([hidden])")).filter((element) => dragSet.has(element.dataset.cardKey));
    if (!dragCards.includes(card)) dragCards.push(card);
    const connectionElements = new Map(Array.from(canvas.querySelectorAll(".research-canvas-card"))
      .map((element) => [element.dataset.cardKey, element]));
    const rectOf = (element) => getResearchCanvasConnectionRect(element, canvas);
    const idea = researchViewState.currentIdea || {};
    const sectors = captureResearchConnectionSectors(
      getResearchCanvasGraph(getResearchCanvasCards(idea), idea.pathData?.researchCanvasCollapsed || {}).parentByKey,
      connectionElements, rectOf, dragSet);
    const startX = event.clientX;
    const startY = event.clientY;
    const originals = new Map(dragCards.map((element) => [element, { x: parseFloat(element.style.left) || 0, y: parseFloat(element.style.top) || 0 }]));
    let moved = false;
    const capture = surface || card;
    capture.setPointerCapture(event.pointerId);
    const move = (moveEvent) => {
      if (moveEvent.pointerId !== event.pointerId) return;
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (Math.hypot(dx, dy) < 4 && !moved) return;
      moved = true;
      dragCards.forEach((element) => element.classList.add("is-dragging"));
      const mapScale = Number(canvas.dataset.mapScale) || 1;
      dragCards.forEach((element) => {
        const origin = originals.get(element);
        placeResearchCanvasCard(canvas, element, origin.x + dx / mapScale, origin.y + dy / mapScale);
      });
      canvas._researchConnectionSideOverrides = changedResearchConnectionSides(sectors, rectOf);
      drawResearchCanvasConnections(canvas);
    };
    const restore = () => {
      dragCards.forEach((element) => {
        const origin = originals.get(element);
        placeResearchCanvasCard(canvas, element, origin.x, origin.y);
      });
      delete canvas._researchConnectionSideOverrides;
      drawResearchCanvasConnections(canvas);
    };
    const finish = async (endEvent) => {
      if (endEvent.pointerId !== event.pointerId) return;
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerup", finish);
      card.removeEventListener("pointercancel", cancel);
      dragCards.forEach((element) => element.classList.remove("is-dragging"));
      if (moved && surface) canvas._researchSurfaceDragClick = { surface, card, pointerId: event.pointerId };
      if (capture.hasPointerCapture(event.pointerId)) capture.releasePointerCapture(event.pointerId);
      if (moved) {
        if (!surface) researchViewState.suppressCanvasClickUntil = Date.now() + 300;
        const sides = changedResearchConnectionSides(sectors, rectOf);
        const changedSides = Object.keys(sides).length > 0;
        if (dragCards.length === 1) {
          const key = card.dataset.cardKey;
          const position = { x: parseFloat(card.style.left), y: parseFloat(card.style.top) };
          try {
            const saved = changedSides
              ? await actions.saveCanvasMove?.({ [key]: position }, sides)
              : await actions.saveCanvasPosition?.(key, position.x, position.y);
            if (saved !== true) { restore(); showResearchCanvasConnectionError(root); }
            else { delete canvas._researchConnectionSideOverrides; drawResearchCanvasConnections(canvas); }
          } catch (error) { console.warn("Research sticker move could not be saved.", error); restore(); showResearchCanvasConnectionError(root); }
        }
        else {
          const positions = Object.fromEntries(dragCards.map((element) => [element.dataset.cardKey, { x: parseFloat(element.style.left), y: parseFloat(element.style.top) }]));
          try {
            const saved = changedSides
              ? await actions.saveCanvasMove?.(positions, sides)
              : await actions.saveCanvasOrganization?.({ researchCanvasPositions: positions });
            if (saved !== true) restore();
            else { delete canvas._researchConnectionSideOverrides; drawResearchCanvasConnections(canvas); }
          }
          catch (error) { console.warn("Research sticker positions could not be saved.", error); restore(); }
        }
      }
    };
    const cancel = (cancelEvent) => {
      if (cancelEvent.pointerId !== event.pointerId) return;
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerup", finish);
      card.removeEventListener("pointercancel", cancel);
      dragCards.forEach((element) => element.classList.remove("is-dragging"));
      if (moved && surface) canvas._researchSurfaceDragClick = { surface, card, pointerId: event.pointerId };
      if (capture.hasPointerCapture(event.pointerId)) capture.releasePointerCapture(event.pointerId);
      restore();
    };
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerup", finish);
    card.addEventListener("pointercancel", cancel);
  });
  canvas.addEventListener("click", (event) => {
    if (Date.now() < researchViewState.suppressCanvasClickUntil) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.target.closest("button, a, input, textarea, select, [contenteditable], .research-canvas-link-list")) return;
    const cardElement = event.target.closest(".research-canvas-card");
    if (cardElement && canvas.contains(cardElement)) {
      window.MentorResearchOrganizer.handleCardClick(canvas, event);
    }
  }, true);
  canvas.addEventListener("dblclick", async (event) => {
    if (Date.now() < researchViewState.suppressCanvasClickUntil || window.MentorUIEvents?.isTextEditingEvent?.(event)) return;
    if (event.target.closest("button, a, input, textarea, select, [contenteditable], .research-canvas-link-list")) return;
    const cardElement = event.target.closest(".research-canvas-card");
    if (!cardElement || !canvas.contains(cardElement)) return;
    event.preventDefault();
    const card = getResearchCanvasCards(researchViewState.currentIdea || {}).find((item) => item.key === cardElement.dataset.cardKey);
    if (isMobileResearchCanvas()) {
      if (["image", "video", "av", "source"].includes(card?.type)) await openResearchCanvasMedia(root, card, cardElement);
      return;
    }
    if (card) openResearchCanvasPreview(root, card);
  }, true);
  canvas.addEventListener("keydown", async (event) => {
    if (window.MentorUIEvents?.isTextEditingEvent?.(event)) return;
    if (event.key === "Enter" && event.target.matches?.(".research-canvas-card")) {
      event.preventDefault();
      const card = getResearchCanvasCards(researchViewState.currentIdea || {}).find((item) => item.key === event.target.dataset.cardKey);
      if (isMobileResearchCanvas()) {
        if (["image", "video", "av", "source", "note"].includes(card?.type)) await openResearchCanvasMedia(root, card, event.target);
        return;
      }
      if (card) openResearchCanvasPreview(root, card);
      return;
    }
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    const card = event.target.closest(".research-canvas-card");
    if (!card || event.target !== card) return;
    event.preventDefault();
    if (!card._researchKeyMove) {
      const idea = researchViewState.currentIdea || {};
      const elements = new Map(Array.from(canvas.querySelectorAll(".research-canvas-card"))
        .map((element) => [element.dataset.cardKey, element]));
      const rectOf = (element) => getResearchCanvasConnectionRect(element, canvas);
      card._researchKeyMove = { original: { x: parseFloat(card.style.left) || 0, y: parseFloat(card.style.top) || 0 }, rectOf,
        sectors: captureResearchConnectionSectors(
          getResearchCanvasGraph(getResearchCanvasCards(idea), idea.pathData?.researchCanvasCollapsed || {}).parentByKey,
          elements, rectOf, new Set([card.dataset.cardKey])) };
    }
    const step = event.shiftKey ? 1 : 10;
    const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
    const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
    const position = placeResearchCanvasCard(canvas, card, (parseFloat(card.style.left) || 0) + dx, (parseFloat(card.style.top) || 0) + dy);
    canvas._researchConnectionSideOverrides = changedResearchConnectionSides(card._researchKeyMove.sectors, card._researchKeyMove.rectOf);
    drawResearchCanvasConnections(canvas);
    window.clearTimeout(card._researchSaveTimer);
    card._researchSaveTimer = window.setTimeout(async () => {
      const session = card._researchKeyMove;
      card._researchKeyMove = null;
      const sides = changedResearchConnectionSides(session.sectors, session.rectOf);
      try {
        const saved = Object.keys(sides).length
          ? await actions.saveCanvasMove?.({ [card.dataset.cardKey]: position }, sides)
          : await actions.saveCanvasPosition?.(card.dataset.cardKey, position.x, position.y);
        if (saved !== true) throw new Error("Research sticker move could not be saved.");
        delete canvas._researchConnectionSideOverrides;
        drawResearchCanvasConnections(canvas);
      } catch (error) {
        console.warn("Research sticker move could not be saved.", error);
        placeResearchCanvasCard(canvas, card, session.original.x, session.original.y);
        delete canvas._researchConnectionSideOverrides;
        drawResearchCanvasConnections(canvas);
        showResearchCanvasConnectionError(root);
      }
    }, 180);
  });
}

function snapshotResearchCanvasFocusPositions(root) {
  const preview = root.querySelector("[data-research-canvas-preview]");
  const focus = researchViewState.canvasFocus;
  if (!preview || !focus) return;
  preview.querySelectorAll("[data-focus-card-key]").forEach((wrapper) => {
    const x = parseFloat(wrapper.style.left);
    const y = parseFloat(wrapper.style.top);
    if (Number.isFinite(x) && Number.isFinite(y)) focus.positions[wrapper.dataset.focusCardKey] = { x, y };
  });
}

function bindResearchDraggableForm(modal, panel = modal?.firstElementChild) {
  const handle = panel?.querySelector(".research-direction-modal-head");
  if (!modal || !panel || !handle || handle.dataset.researchFormDrag) return;
  modal.classList.add("is-draggable-form");
  modal.setAttribute("aria-modal", "false");
  handle.dataset.researchFormDrag = "true";
  handle.classList.add("research-form-drag-handle");
  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || window.MentorUIEvents?.isTextEditingEvent?.(event)) return;
    if (event.target.closest("button, a, input, textarea, select, [contenteditable]")) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = panel.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    panel.style.width = rect.width + "px";
    panel.style.left = rect.left + "px";
    panel.style.top = rect.top + "px";
    panel.classList.add("is-form-floating");
    handle.setPointerCapture(event.pointerId);
    const move = (moveEvent) => {
      if (moveEvent.pointerId !== event.pointerId) return;
      panel.style.left = Math.max(8, Math.min(rect.left + moveEvent.clientX - startX, window.innerWidth - panel.offsetWidth - 8)) + "px";
      panel.style.top = Math.max(8, Math.min(rect.top + moveEvent.clientY - startY, window.innerHeight - panel.offsetHeight - 8)) + "px";
    };
    const finish = (endEvent) => {
      if (endEvent.pointerId !== event.pointerId) return;
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", finish);
      handle.removeEventListener("pointercancel", finish);
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
  });
}

async function openResearchStickerAsset(root, asset, trigger, file = null) {
  if (!asset) return;
  if (["image", "video"].includes(asset.kind)) return openResearchCanvasMedia(root, { type: asset.kind, title: asset.name, image: asset.kind === "image" ? asset.url : "", url: asset.url, stickerAsset: asset }, trigger);
  const view = root.querySelector(".research-view") || root.closest?.(".research-view") || root;
  if (["audio", "video"].includes(asset.kind) && asset.mediaId || ["pdf", "docx", "txt"].includes(asset.kind) || asset.mediaId && /\.(pdf|docx|txt)$/i.test(asset.name || "")) return window.MentorResearchAttachments?.open(view, {
    type: asset.kind === "audio" || asset.kind === "video" ? "av" : "source", title: asset.name,
    attachmentMediaId: asset.mediaId, attachmentKind: asset.kind, attachmentMime: asset.mime, attachmentName: asset.name
  }, trigger, researchT, escapeResearchHtml);
  let url = "";
  try {
    const blob = file || (asset.mediaId ? (await window.MentorData?.repositories?.media?.getEntity(asset.entityType, asset.mediaId))?.blob : null);
    if (blob) url = URL.createObjectURL(blob);
    const href = url || window.MentorResearchStickerSections.safeUrl(asset.url);
    if (!href) return;
    if (asset.kind === "audio") {
      const proxy = { type: "video", title: asset.name, url: href, stickerAsset: { ...asset, url: href } };
      await openResearchCanvasMedia(root, proxy, trigger);
      if (url) { const modal = Array.from(document.querySelectorAll("[data-research-canvas-media]")).at(-1); const session = Array.from(researchCanvasMediaSessions).find((entry) => entry.modal === modal); if (session) { session.objectUrl = url; url = ""; } }
    } else {
      const download = document.createElement("a"); download.href = href; download.download = asset.name || ""; download.rel = "noopener"; download.click();
    }
  } finally { if (url) window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
}

function openResearchStickerUrl(root, url, trigger) {
  const safe = getSafeResearchCanvasUrl(url);
  if (!/^https?:\/\//i.test(url || "") || !safe) return;
  if (getResearchVideoEmbedUrl(safe) || /\.(mp4|webm|ogv|mov)(?:[?#]|$)/i.test(safe)) return openResearchCanvasMedia(root, { type: "video", url: safe }, trigger);
  window.open(safe, "_blank", "noopener,noreferrer");
}

function openResearchStickerDesigner(root, actions, card = {}, template = null, initialFile = null) {
  root._researchStickerIntent = (root._researchStickerIntent || 0) + 1;
  const view = root.querySelector(".research-view") || root.closest?.(".research-view") || root;
  snapshotResearchCanvasFocusPositions(view);
  const focus = view.querySelector("[data-research-canvas-preview]");
  if (!card.key && !card.canvasParentKey && focus) card = { ...card, canvasParentKey: focus.dataset.cardKey };
  const defaultTemplate = { note: "notes", source: "source", av: "av" }[card.type] || "custom";
  const ideaId = researchViewState.currentIdea?.id, directionId = getActiveResearchDirection(researchViewState.currentIdea || {})?.id || "";
  return window.MentorResearchStickerDesigner.open(root, {
    idea: researchViewState.currentIdea, card, template: template || defaultTemplate, actions, t: researchT, escape: escapeResearchHtml, initialFile,
    renderCard: (draft, options) => renderResearchCanvasCard(draft, null, {}, options),
    openAsset: (asset, trigger, file) => openResearchStickerAsset(root, asset, trigger, file),
    openUrl: (url, trigger) => openResearchStickerUrl(root, url, trigger),
    isContextActive: () => researchViewState.currentIdea?.id === ideaId && (getActiveResearchDirection(researchViewState.currentIdea || {})?.id || "") === directionId && (!document.body.dataset.activeView || document.body.dataset.activeView === "brainstorming")
  });
}

function bindResearchStickerDocuments(root, actions) {
  if (!window.MentorResearchStickerSections) return;
  root.querySelectorAll("[data-sticker-document]").forEach((container) => {
    const element = container.closest(".research-canvas-card"), key = element?.dataset.cardKey;
    const card = getResearchCanvasCards(researchViewState.currentIdea || {}).find((entry) => entry.key === key);
    let document = researchViewState.currentIdea?.pathData?.researchCanvasStickerDocuments?.[key];
    if (!card || !document) return;
    const ideaId = researchViewState.currentIdea.id;
    const getDocument = () => researchViewState.currentIdea?.id === ideaId ? researchViewState.currentIdea.pathData?.researchCanvasStickerDocuments?.[key] || document : document;
    let busy = false;
    window.MentorResearchStickerSections.mount(container, {
      t: researchT, getDocument,
      async onToggle(action, id) {
        if (busy) return;
        busy = true;
        const next = window.MentorResearchStickerCore.clone(getDocument());
        if (action === "toggle-sticker") next.collapsed = !next.collapsed;
        else { const entry = next.sections.find((item) => item.sectionId === id); if (entry) entry.collapsed = !entry.collapsed; }
        try {
          if (await actions.saveCanvasSticker?.({ card, document: next, preserveView: true }) !== true) return;
          document = next;
          if (researchViewState.currentIdea?.id !== ideaId || !container.isConnected) return;
          const pathData = researchViewState.currentIdea.pathData;
          pathData.researchCanvasStickerDocuments = { ...pathData.researchCanvasStickerDocuments, [key]: next };
          const view = root.closest?.(".research-view") || root.querySelector(".research-view") || root;
          view.querySelectorAll("[data-sticker-document]").forEach((target) => {
            if (target.closest(".research-canvas-card")?.dataset.cardKey === key) window.MentorResearchStickerSections.applyViewState(target, next, researchT);
          });
          const canvas = view.querySelector("[data-research-canvas]"), focus = view.querySelector("[data-research-canvas-preview]");
          if (canvas) drawResearchCanvasConnections(canvas);
          if (focus) drawResearchCanvasFocusConnections(focus);
        }
        catch (error) { console.warn("Sticker view state could not be saved.", error); }
        finally { busy = false; }
      },
      onOpen: (asset, trigger) => openResearchStickerAsset(root, asset, trigger), onOpenUrl: (url, trigger) => openResearchStickerUrl(root, url, trigger)
    });
  });
}

function openResearchCanvasItemForm(root, actions, card = {}) {
  if (window.MentorResearchStickerDesigner && card.type !== "finance") return openResearchStickerDesigner(root, actions, card);
  const view = root.querySelector(".research-view") || root.closest?.(".research-view") || root;
  const focusPreview = view.querySelector("[data-research-canvas-preview]");
  if (focusPreview && !card.key && !card.id) {
    snapshotResearchCanvasFocusPositions(view);
    card = { ...card, canvasParentKey: card.canvasParentKey || card.parentKey || focusPreview.dataset.cardKey };
  }
  if (["av", "source"].includes(card.type)) {
    window.MentorResearchAttachments?.form(view, card, actions, researchT, escapeResearchHtml);
    if (view.querySelector("[data-research-canvas-preview]")) document.querySelector("[data-research-attachment-modal]")?.classList.add("is-preview-sidecar");
    return;
  }
  view.querySelector("[data-research-canvas-modal]")?.remove();
  const type = card.type || "note";
  const isLinkedNote = card.source === "linked-note" || card.source === "direction-note";
  const item = isLinkedNote ? card.note : card;
  const requiresTitle = !["image", "video"].includes(type);
  const hasImageUrl = ["link", "image", "video"].includes(type);
  const hasImageFile = ["link", "image"].includes(type);
  const financeValues = getResearchCanvasFinanceFormValues(item || {});
  const currencies = ["EUR", "USD", "RSD", "GBP", "CHF"];
  view.insertAdjacentHTML("beforeend", [
    '<div class="research-direction-modal research-canvas-modal" data-research-canvas-modal>',
    '  <form class="research-canvas-form" data-research-canvas-form>',
    '    <div class="research-direction-modal-head"><strong>' + escapeResearchHtml(researchT(card.key ? "canvas.edit" : "canvas.new") + ": " + researchT("canvas.types." + type)) + '</strong><button class="research-direction-modal-close" type="button" data-canvas-cancel aria-label="' + escapeResearchHtml(researchT("actions.close")) + '">×</button></div>',
    '    <label><span>' + escapeResearchHtml(researchT("canvas.title")) + '</span><input name="title" type="text"' + (requiresTitle ? ' required' : '') + ' value="' + escapeResearchHtml(item?.title || "") + '" /></label>',
    '    <label><span>' + escapeResearchHtml(researchT(["image", "video"].includes(type) ? "canvas.description" : "canvas.text")) + '</span><textarea name="text" rows="4">' + escapeResearchHtml(item?.body || item?.text || "") + '</textarea></label>',
    ["link", "image", "video"].includes(type) ? '    <label><span>' + escapeResearchHtml(researchT(type === "video" ? "canvas.videoUrl" : "canvas.url")) + '</span><input name="url" type="url" placeholder="https://..." value="' + escapeResearchHtml(item?.url || "") + '" /></label>' : "",
    type === "video" ? '    <label><span>' + escapeResearchHtml(researchT("canvas.videoFile")) + '</span><input name="videoFile" type="file" accept="video/*,.mkv,.mov,.avi,.m4v,.wmv,.flv,.ts,.mpg,.mpeg,.3gp,.m2ts,.mts,.vob,.asf" /></label><small class="research-canvas-form-hint">' + escapeResearchHtml(researchT("canvas.videoSourceHint")) + '</small>' : "",
    hasImageUrl ? '    <label><span>' + escapeResearchHtml(researchT(type === "video" ? "canvas.thumbnailUrl" : "canvas.imageUrl")) + '</span><input name="image" type="url" placeholder="https://..." value="' + escapeResearchHtml(item?.image && !String(item.image).startsWith("data:") ? item.image : "") + '" /></label>' : "",
    hasImageFile ? '    <label><span>' + escapeResearchHtml(researchT("canvas.imageFile")) + '</span><input name="imageFile" type="file" accept="image/*" /></label>' : "",
    type === "finance" ? '    <div class="research-canvas-price-row"><label><span>' + escapeResearchHtml(researchT("canvas.price")) + '</span><input name="price" type="text" inputmode="decimal" required value="' + escapeResearchHtml(financeValues.price) + '" /></label><label><span>' + escapeResearchHtml(researchT("canvas.currency")) + '</span><select name="currency">' + currencies.map((currency) => '<option value="' + currency + '"' + (currency === financeValues.currency ? " selected" : "") + '>' + currency + '</option>').join("") + '</select></label></div>' : type === "link" ? '    <label><span>' + escapeResearchHtml(researchT("canvas.price")) + '</span><input name="price" type="text" value="' + escapeResearchHtml(item?.price || "") + '" /></label>' : "",
    '    <p class="research-canvas-form-error" data-research-canvas-form-error hidden></p>',
    '    <div class="research-reference-form-actions"><button class="research-secondary-btn muted" type="button" data-canvas-cancel>' + escapeResearchHtml(researchT("actions.cancel")) + '</button><button class="research-primary-btn" type="submit">' + escapeResearchHtml(researchT("actions.save")) + '</button></div>',
    '  </form>',
    '</div>'
  ].join(""));
  const modal = view.querySelector("[data-research-canvas-modal]");
  if (view.querySelector("[data-research-canvas-preview]")) modal.classList.add("is-preview-sidecar");
  const form = modal.querySelector("form");
  bindResearchDraggableForm(modal, form);
  const close = () => { modal.remove(); syncResearchModalLayer(); };
  modal.addEventListener("pointerdown", (event) => event.stopPropagation());
  modal.addEventListener("click", (event) => event.stopPropagation());
  modal.querySelectorAll("[data-canvas-cancel]").forEach((button) => button.addEventListener("click", close));
  form.elements.image?.addEventListener("input", () => form.elements.image.setCustomValidity(""));
  form.elements.imageFile?.addEventListener("change", () => form.elements.image?.setCustomValidity(""));
  form.elements.videoFile?.addEventListener("change", () => form.elements.url?.setCustomValidity(""));
  form.elements.url?.addEventListener("input", () => form.elements.url.setCustomValidity(""));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const errorMessage = form.querySelector("[data-research-canvas-form-error]");
    errorMessage.hidden = true;
    const title = form.elements.title.value.trim();
    if (requiresTitle && !title) return;
    const textValue = form.elements.text.value.trim();
    const imageFile = form.elements.imageFile?.files?.[0];
    const videoFile = form.elements.videoFile?.files?.[0];
    const videoUrl = form.elements.url?.value.trim() || "";
    const previousUpload = String(item?.image || "").startsWith("data:image/") ? item.image : "";
    if (type === "image" && !imageFile && !form.elements.image?.value.trim() && !previousUpload) {
      form.elements.image.setCustomValidity(researchT("canvas.imageRequired"));
      form.elements.image.reportValidity();
      return;
    }
    if (type === "video" && !videoFile && !videoUrl && !item?.videoMediaId) {
      form.elements.url.setCustomValidity(researchT("canvas.videoSourceRequired"));
      form.elements.url.reportValidity();
      return;
    }
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    let saved = false;
    try {
      if (card.source === "new-linked-note") saved = await actions.addCanvasLinkedNote?.(card.direction.id, card.reference.id, { title, body: textValue });
      else if (card.source === "linked-note") saved = await actions.updateCanvasLinkedNote?.(card.direction.id, card.reference.id, { id: card.note.id, title, body: textValue });
      else if (card.source === "direction-note") saved = await actions.updateCanvasDirectionNote?.(card.direction.id, { id: card.note.id, title, body: textValue });
      else {
        const image = imageFile ? await readResearchFileAsDataUrl(imageFile) : "";
        const thumbnailUrl = form.elements.image?.value.trim() || "";
        const poster = videoFile && !thumbnailUrl ? await captureResearchVideoPoster(videoFile) : "";
        const nextItem = {
          id: card.source === "item" ? card.id : undefined,
          canvasParentKey: card.canvasParentKey || card.parentKey || "",
          canvasConnectionSides: card.canvasConnectionSides || undefined,
          canvasPosition: card.canvasPosition || undefined,
          type,
          title,
          text: textValue,
          url: videoFile ? "" : form.elements.url ? videoUrl : item?.url || "",
          image: form.elements.image ? image || thumbnailUrl || poster || (videoFile || videoUrl && videoUrl !== item?.url ? "" : previousUpload) : item?.image || "",
          videoMediaId: type === "video" && (videoFile || videoUrl) ? "" : item?.videoMediaId || "",
          price: form.elements.price ? form.elements.price.value.trim() : item?.price || "",
          currency: type === "finance" ? form.elements.currency?.value || "EUR" : item?.currency || ""
        };
        saved = videoFile ? await actions.saveCanvasVideo?.(nextItem, videoFile) : await actions.saveCanvasItem?.(nextItem);
        if (videoFile && saved !== true) saved = false;
      }
      if (saved !== false) close();
      else { errorMessage.textContent = researchT("canvas.saveFailed"); errorMessage.hidden = false; }
    } catch (error) {
      console.error("Research canvas card could not be saved.", error);
      errorMessage.textContent = researchT(type === "video" ? "canvas.videoUploadFailed" : "canvas.saveFailed");
      errorMessage.hidden = false;
    } finally {
      submit.disabled = false;
    }
  });
  (form.elements.title || form.elements.text).focus();
  setResearchModalLayer(true);
}

function openResearchCanvasTests(root, actions = {}) {
  const view = root.querySelector(".research-view") || root.closest?.(".research-view") || root;
  view.querySelector("[data-research-canvas-tests-modal]")?.remove();
  researchViewState.testPanelOpen = true;
  view.insertAdjacentHTML("beforeend", '<div class="research-direction-modal research-canvas-tests-modal" data-research-canvas-tests-modal><div class="research-canvas-tests-body"><button class="research-direction-modal-close research-canvas-tests-close" type="button" data-close-canvas-tests aria-label="' + escapeResearchHtml(researchT("actions.close")) + '">×</button>' + renderIdeaTestPanel(researchViewState.currentIdea || researchIdea) + '</div></div>');
  const modal = view.querySelector("[data-research-canvas-tests-modal]");
  modal.addEventListener("pointerdown", (event) => event.stopPropagation());
  modal.querySelector("[data-close-canvas-tests]")?.addEventListener("click", closeResearchCanvasTests);
  bindResearchTestAnswerInputs(modal, actions, view);
  setResearchModalLayer(true);
}

function closeResearchCanvasTests() {
  researchViewState.testPanelOpen = false;
  document.querySelectorAll("[data-research-canvas-tests-modal]").forEach((modal) => modal.remove());
  syncResearchModalLayer();
}

function getStructuredQuestionItems(test) {
  const questions = Array.isArray(test.structuredQuestions) ? test.structuredQuestions : [];
  const presetQuestions = questions.map((question) => ({ id: question, text: question, displayText: getIdeaTestQuestionLabel(question), type: "score", isPreset: true }));
  return presetQuestions.concat(Array.isArray(test.customStructuredQuestions) ? test.customStructuredQuestions : []);
}

function renderSelectedTestQuestions(test) {
  const questions = getStructuredQuestionItems(test);
  if (!questions.length) return '<p class="research-test-muted">' + escapeResearchHtml(researchT("test.noSelectedStructuredQuestions")) + "</p>";
  const days = Array.isArray(test.days) ? test.days : [];
  return '<div class="research-test-question-list">' + questions.map((question) => {
    const values = days.map((day) => Number(getTestQuestionAnswer(day, question) || (question.type === "score" ? 5 : 0))).filter((value) => question.type === "score" && Number.isFinite(value));
    const average = values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1) : "-";
    return '<div><span>' + escapeResearchHtml(getTestQuestionDisplayText(question)) + '</span><strong>' + escapeResearchHtml(question.type === "score" ? average : getQuestionTypeLabel(question.type)) + "</strong></div>";
  }).join("") + "</div>";
}

function renderDailyStructuredQuestions(test, day) {
  const questions = getStructuredQuestionItems(test);
  if (!questions.length) return '<div class="research-test-day-empty">' + escapeResearchHtml(researchT("test.noStructuredQuestions")) + "</div>";
  return '<div class="research-test-score-list">' + questions.map((question) => {
    return renderTestAnswerControl(test, day, question, "structured");
  }).join("") + "</div>";
}

function renderDailyTestQuestions(test, day) {
  const questions = Array.isArray(day?.questions) ? day.questions : [];
  return [
    '<div class="research-test-goal-head">',
    '  <strong><span>' + escapeResearchHtml(researchT("test.questionsFor")) + "</span> <span" + getResearchDayTitleAttrs(day?.title, 1) + ">" + escapeResearchHtml(getResearchDayTitleText(day?.title, 1) || researchT("test.dayLower")) + "</span></strong>",
    "</div>",
    test.mainQuestion ? '<p>' + escapeResearchHtml(test.mainQuestion) + "</p>" : "",
    questions.length
      ? '<div class="research-test-day-question-list">' + questions.map((question) => renderTestAnswerControl(test, day, question, "daily")).join("") + "</div>"
      : '<div class="research-test-day-empty">' + escapeResearchHtml(researchT("test.noExtraQuestions")) + "</div>"
  ].join("");
}

function renderTestAnswerControl(test, day, question, scope) {
  const value = getTestQuestionAnswer(day, question);
  const baseAttrs = ' data-test-answer data-test-id="' + escapeResearchHtml(test.id || "") + '" data-day-id="' + escapeResearchHtml(day?.id || "") + '" data-question-id="' + escapeResearchHtml(question.id || question.text || "") + '" data-question-text="' + escapeResearchHtml(question.text || "") + '" data-question-type="' + escapeResearchHtml(question.type || "text") + '" data-question-scope="' + escapeResearchHtml(scope || "daily") + '"';
  if (question.type === "score") {
    const score = Math.min(10, Math.max(1, Number(value) || 5));
    return [
      '<label class="research-test-score-row">',
      '  <span>' + escapeResearchHtml(getTestQuestionDisplayText(question)) + "</span>",
      '  <div class="research-test-score-control">',
      '    <input type="range" min="1" max="10" step="1" value="' + score + '"' + baseAttrs + ' data-test-score-range />',
      '    <input type="number" min="1" max="10" step="1" value="' + score + '"' + baseAttrs + ' data-test-score-number />',
      "  </div>",
      "</label>"
    ].join("");
  }
  if (question.type === "checkbox") {
    const selected = new Set(Array.isArray(value) ? value : []);
    const options = Array.isArray(question.options) && question.options.length ? question.options : ["Da", "Ne"];
    return [
      '<div class="research-test-answer-card">',
      "  <strong>" + escapeResearchHtml(getTestQuestionDisplayText(question)) + "</strong>",
      '  <div class="research-test-answer-options">',
      options.map((option) => '<label><input type="checkbox" value="' + escapeResearchHtml(option) + '"' + baseAttrs + ' ' + (selected.has(option) ? "checked" : "") + ' /> <span>' + escapeResearchHtml(option) + "</span></label>").join(""),
      "  </div>",
      "</div>"
    ].join("");
  }
  return [
    '<label class="research-test-answer-card">',
    "  <strong>" + escapeResearchHtml(getTestQuestionDisplayText(question)) + "</strong>",
    '  <textarea rows="3" placeholder="' + escapeResearchHtml(researchT("test.answerPlaceholder")) + '"' + baseAttrs + ">" + escapeResearchHtml(value || "") + "</textarea>",
    "</label>"
  ].join("");
}

function getTestQuestionAnswer(day, question) {
  if (!day || !question) return "";
  if (question.isPreset) return day.scores?.[question.text] || 5;
  return day.answers?.[question.id] ?? (question.type === "score" ? 5 : question.type === "checkbox" ? [] : "");
}

function getTestQuestionDisplayText(question) {
  return question?.displayText || question?.text || "";
}

function getQuestionTypeLabel(type) {
  if (type === "score") return "1-10";
  if (type === "checkbox") return researchT("test.optionType");
  return researchT("test.textType");
}

const ideaTestQuestionOptions = [
  { key: "attention", value: "Da li mi ova ideja drzi paznju?" },
  { key: "motivation", value: "Da li me ova ideja i dalje motivise?" },
  { key: "energy", value: "Da li imam dovoljno energije za ovu ideju?" },
  { key: "financial", value: "Da li mogu finansijski da izdrzim ovu ideju?" },
  { key: "time", value: "Da li imam dovoljno vremena za ovu ideju?" },
  { key: "skills", value: "Da li imam potrebne vestine ili znanje?" },
  { key: "resources", value: "Da li imam potrebne resurse ili opremu?" },
  { key: "pressure", value: "Da li ova ideja stvara prevelik pritisak?" },
  { key: "fit", value: "Da li se ova ideja uklapa u moj trenutni zivot?" },
  { key: "continue", value: "Da li zelim da nastavim posle testa?" }
];

function getIdeaTestQuestionLabel(value) {
  const option = ideaTestQuestionOptions.find((item) => item.value === value || item.key === value);
  if (!option) return value;
  const key = "testQuestions." + option.key;
  const translated = researchT(key);
  return translated === key || translated === "research." + key ? option.value : translated;
}

function openIdeaTestForm(root, button, actions = {}, existingTest = null) {
  if (button.disabled) return;
  const view = button.closest(".research-view") || root.querySelector(".research-view") || document.body;
  const existingModal = view.querySelector("[data-idea-test-modal]");
  if (existingModal) {
    existingModal.remove();
    syncResearchModalLayer();
  }

  view.insertAdjacentHTML("beforeend", renderIdeaTestModal(existingTest));
  const modal = view.querySelector("[data-idea-test-modal]");
  const form = modal?.querySelector("[data-idea-test-form]");
  const daysRoot = form?.querySelector("[data-test-days-root]");
  const structuredRoot = form?.querySelector("[data-custom-structured-root]");
  const addDayButton = form?.querySelector("[data-add-test-day]");
  const addStructuredButton = form?.querySelector("[data-add-structured-question]");
  if (!modal || !form || !daysRoot) return;
  const isEditMode = Boolean(existingTest?.id);

  const stopModalEvent = (event) => {
    event.stopPropagation();
  };

  const closeModal = () => {
    modal.remove();
    syncResearchModalLayer();
  };
  const renderDays = (days = [{}]) => {
    daysRoot.innerHTML = renderIdeaTestDaySections(days.length || 1, days);
    bindIdeaTestQuestionBuilder(daysRoot);
  };

  modal.addEventListener("click", stopModalEvent);
  modal.addEventListener("mousedown", stopModalEvent);
  modal.addEventListener("pointerdown", stopModalEvent);
  form.addEventListener("click", stopModalEvent);
  form.addEventListener("mousedown", stopModalEvent);
  form.addEventListener("pointerdown", stopModalEvent);
  modal.querySelectorAll("[data-idea-test-cancel]").forEach((cancelButton) => {
    cancelButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeModal();
    });
  });
  addDayButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const days = collectIdeaTestDaysFromForm(form, existingTest);
    days.push({});
    renderDays(days);
    daysRoot.querySelector("[data-test-day-form]:last-child [data-question-text]")?.focus();
  });
  addStructuredButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    structuredRoot?.insertAdjacentHTML("beforeend", renderTestQuestionBuilderItem({ type: "score" }, "structured"));
    bindIdeaTestQuestionBuilder(structuredRoot);
    structuredRoot?.querySelector("[data-test-question-item]:last-child [data-question-text]")?.focus();
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const test = collectIdeaTestForm(form, existingTest);
    if (!test.title) return;
    const ideaId = button.dataset.ideaId || "";
    if (ideaId) researchViewState.activeTestByIdea[ideaId] = test.id;
    preserveResearchScrollStep(view, 2);
    if (isEditMode) {
      if (await actions.updateTest?.(existingTest.id, test) === false) return;
    } else {
      if (await actions.addTest?.(test) === false) return;
    }
    closeModal();
  });

  renderDays(existingTest?.days?.length ? existingTest.days : [{}]);
  bindIdeaTestQuestionBuilder(structuredRoot);
  form.elements.title?.focus();
  setResearchModalLayer(true);
}

function renderIdeaTestModal(test = null) {
  const isEditMode = Boolean(test?.id);
  const title = test?.title || "";
  const mainQuestion = test?.mainQuestion || "";
  const selectedQuestions = new Set(Array.isArray(test?.structuredQuestions) ? test.structuredQuestions : []);
  const customStructuredQuestions = normalizeTestQuestionList(test?.customStructuredQuestions || []);
  const modalTitleKey = isEditMode ? "testForm.editTitle" : "testForm.newTitle";
  const submitKey = isEditMode ? "testForm.saveChanges" : "testForm.saveTest";
  return [
    '<div class="research-direction-modal research-idea-test-modal" data-idea-test-modal>',
    '  <form class="research-idea-test-form-panel" data-idea-test-form>',
    '    <div class="research-direction-modal-head">',
    '      <strong>' + escapeResearchHtml(researchT(modalTitleKey)) + "</strong>",
    "    </div>",
    '    <label><span>' + escapeResearchHtml(researchT("testForm.titleLabel")) + '</span><input name="title" type="text" value="' + escapeResearchHtml(title) + '" placeholder="' + escapeResearchHtml(researchT("testForm.titlePlaceholder")) + '" autocomplete="off" required /></label>',
    '    <label><span>' + escapeResearchHtml(researchT("testForm.hypothesisLabel")) + '</span><textarea name="mainQuestion" rows="4" placeholder="' + escapeResearchHtml(researchT("testForm.hypothesisPlaceholder")) + '">' + escapeResearchHtml(mainQuestion) + "</textarea></label>",
    '    <fieldset class="research-idea-test-question-field">',
    '      <legend>' + escapeResearchHtml(researchT("testForm.structuredLegend")) + "</legend>",
    ideaTestQuestionOptions.map((question) => '<label><input type="checkbox" name="structuredQuestions" value="' + escapeResearchHtml(question.value) + '" ' + (selectedQuestions.has(question.value) ? "checked" : "") + ' /> <span>' + escapeResearchHtml(getIdeaTestQuestionLabel(question.value)) + "</span></label>").join(""),
    "    </fieldset>",
    '    <section class="research-idea-test-custom-questions">',
    '      <div class="research-idea-test-section-head"><strong>' + escapeResearchHtml(researchT("testForm.extraStructuredTitle")) + '</strong><button class="research-secondary-btn" type="button" data-add-structured-question><span>' + escapeResearchHtml(researchT("testForm.addQuestion")) + "</span></button></div>",
    '      <div class="research-idea-test-question-list" data-custom-structured-root>' + (customStructuredQuestions.length ? customStructuredQuestions.map((question) => renderTestQuestionBuilderItem(question, "structured")).join("") : "") + "</div>",
    "    </section>",
    '    <div class="research-idea-test-days" data-test-days-root></div>',
    '    <button class="research-idea-test-add-day" type="button" data-add-test-day><span aria-hidden="true">+</span><strong>' + escapeResearchHtml(researchT("testForm.addDay")) + "</strong></button>",
    '    <div class="research-linked-note-form-actions">',
    '      <button class="research-secondary-btn muted" type="button" data-idea-test-cancel><span>' + escapeResearchHtml(researchT("testForm.cancel")) + "</span></button>",
    '      <button class="research-primary-btn" type="submit"><span>' + escapeResearchHtml(researchT(submitKey)) + "</span></button>",
    "    </div>",
    "  </form>",
    "</div>"
  ].join("");
}

function renderIdeaTestDaySections(dayCount, existingDays = []) {
  const safeCount = Math.max(1, Math.min(30, Number(dayCount) || 1));
  return Array.from({ length: safeCount }, (_, index) => {
    const day = index + 1;
    const existingDay = existingDays[index] || {};
    const questionItems = normalizeTestQuestionList(existingDay.questions || getLegacyTaskQuestions(existingDay.tasks));
    return [
      '<section class="research-idea-test-day-form" data-test-day-form="' + day + '" data-day-id="' + escapeResearchHtml(existingDay.id || "") + '" data-day-result="' + escapeResearchHtml(existingDay.result || "") + '">',
      '  <div class="research-idea-test-section-head">',
      '    <strong>' + escapeResearchHtml(researchT("test.dayNumber", { number: day })) + "</strong>",
      '    <button class="research-secondary-btn" type="button" data-add-day-question><span>' + escapeResearchHtml(researchT("testForm.addQuestion")) + "</span></button>",
      "  </div>",
      '  <div class="research-idea-test-question-list" data-day-question-list>' + (questionItems.length ? questionItems.map((question) => renderTestQuestionBuilderItem(question, "day")).join("") : renderTestQuestionBuilderItem({ type: "text" }, "day")) + "</div>",
      "</section>"
    ].join("");
  }).join("");
}

function renderTestQuestionBuilderItem(question = {}, scope = "day") {
  const type = ["score", "text", "checkbox"].includes(question.type) ? question.type : "text";
  const options = Array.isArray(question.options) && question.options.length ? question.options : [researchT("testForm.yes"), researchT("testForm.no")];
  return [
    '<article class="research-idea-test-question-item" data-test-question-item data-question-scope="' + escapeResearchHtml(scope) + '" data-question-id="' + escapeResearchHtml(question.id || "") + '">',
    '  <div class="research-idea-test-question-top">',
    '    <input type="text" value="' + escapeResearchHtml(question.text || "") + '" placeholder="' + escapeResearchHtml(researchT("testForm.questionPlaceholder")) + '" data-question-text />',
    '    <select data-question-type>',
    '      <option value="text"' + (type === "text" ? " selected" : "") + ">" + escapeResearchHtml(researchT("testForm.typeText")) + "</option>",
    '      <option value="score"' + (type === "score" ? " selected" : "") + ">" + escapeResearchHtml(researchT("testForm.typeScore")) + "</option>",
    '      <option value="checkbox"' + (type === "checkbox" ? " selected" : "") + ">" + escapeResearchHtml(researchT("testForm.typeCheckbox")) + "</option>",
    "    </select>",
    '    <button type="button" data-delete-test-question aria-label="' + escapeResearchHtml(researchT("testForm.deleteQuestion")) + '">x</button>',
    "  </div>",
    '  <div class="research-idea-test-option-list ' + (type === "checkbox" ? "" : "hidden") + '" data-question-options>',
    options.map((option) => renderTestQuestionOptionInput(option)).join(""),
    '    <button class="research-secondary-btn" type="button" data-add-question-option><span>' + escapeResearchHtml(researchT("testForm.addOption")) + "</span></button>",
    "  </div>",
    "</article>"
  ].join("");
}

function renderTestQuestionOptionInput(option = "") {
  return [
    '<label class="research-idea-test-option-item">',
    '  <input type="text" value="' + escapeResearchHtml(option) + '" placeholder="' + escapeResearchHtml(researchT("testForm.optionPlaceholder")) + '" data-question-option />',
    '  <button type="button" data-delete-question-option aria-label="' + escapeResearchHtml(researchT("testForm.deleteOption")) + '">x</button>',
    "</label>"
  ].join("");
}

function bindIdeaTestQuestionBuilder(root) {
  if (!root) return;
  root.querySelectorAll("[data-question-type]").forEach((select) => {
    if (select.dataset.boundQuestionType) return;
    select.dataset.boundQuestionType = "true";
    select.addEventListener("change", () => {
      const item = select.closest("[data-test-question-item]");
      item?.querySelector("[data-question-options]")?.classList.toggle("hidden", select.value !== "checkbox");
    });
  });
  root.querySelectorAll("[data-add-day-question]").forEach((button) => {
    if (button.dataset.boundAddQuestion) return;
    button.dataset.boundAddQuestion = "true";
    button.addEventListener("click", () => {
      const list = button.closest("[data-test-day-form]")?.querySelector("[data-day-question-list]");
      list?.insertAdjacentHTML("beforeend", renderTestQuestionBuilderItem({ type: "text" }, "day"));
      bindIdeaTestQuestionBuilder(list);
      list?.querySelector("[data-test-question-item]:last-child [data-question-text]")?.focus();
    });
  });
  root.querySelectorAll("[data-add-question-option]").forEach((button) => {
    if (button.dataset.boundAddOption) return;
    button.dataset.boundAddOption = "true";
    button.addEventListener("click", () => {
      button.insertAdjacentHTML("beforebegin", renderTestQuestionOptionInput(""));
      bindIdeaTestQuestionBuilder(button.closest("[data-question-options]"));
      button.previousElementSibling?.querySelector("[data-question-option]")?.focus();
    });
  });
  root.querySelectorAll("[data-delete-test-question]").forEach((button) => {
    if (button.dataset.boundDeleteQuestion) return;
    button.dataset.boundDeleteQuestion = "true";
    button.addEventListener("click", () => {
      const list = button.closest("[data-day-question-list], [data-custom-structured-root]");
      button.closest("[data-test-question-item]")?.remove();
      if (list?.matches("[data-day-question-list]") && !list.querySelector("[data-test-question-item]")) {
        list.insertAdjacentHTML("beforeend", renderTestQuestionBuilderItem({ type: "text" }, "day"));
        bindIdeaTestQuestionBuilder(list);
      }
    });
  });
  root.querySelectorAll("[data-delete-question-option]").forEach((button) => {
    if (button.dataset.boundDeleteOption) return;
    button.dataset.boundDeleteOption = "true";
    button.addEventListener("click", () => button.closest(".research-idea-test-option-item")?.remove());
  });
}

function collectIdeaTestDaysFromForm(form, existingTest = null) {
  const daySections = Array.from(form.querySelectorAll("[data-test-day-form]"));
  return daySections.map((section, index) => {
    const existingDay = existingTest?.days?.[index] || {};
    const result = section.dataset.dayResult || existingDay.result || "";
    return {
      id: section.dataset.dayId || existingDay.id || "day_" + (index + 1),
      title: "Dan " + (index + 1),
      result,
      scores: normalizeTestDayScores(existingDay.scores),
      answers: normalizeTestDayAnswers(existingDay.answers),
      questions: collectTestQuestionBuilderItems(section.querySelector("[data-day-question-list]"), "day")
    };
  });
}

function collectIdeaTestForm(form, existingTest = null) {
  const days = collectIdeaTestDaysFromForm(form, existingTest);
  const structuredQuestions = Array.from(form.querySelectorAll('input[name="structuredQuestions"]:checked')).map((input) => input.value);
  const customStructuredQuestions = collectTestQuestionBuilderItems(form.querySelector("[data-custom-structured-root]"), "structured");
  days.forEach((day) => {
    const nextScores = normalizeTestDayScores(day.scores);
    structuredQuestions.forEach((question) => {
      if (!nextScores[question]) nextScores[question] = 5;
    });
    day.scores = Object.fromEntries(Object.entries(nextScores).filter(([question]) => structuredQuestions.includes(question)));
  });
  return {
    id: existingTest?.id || "test_" + Date.now(),
    title: form.elements.title?.value.trim() || "",
    dayCount: days.length || 1,
    mainQuestion: form.elements.mainQuestion?.value.trim() || "",
    structuredQuestions,
    customStructuredQuestions,
    days
  };
}

function collectTestQuestionBuilderItems(root, scope = "day") {
  return Array.from(root?.querySelectorAll("[data-test-question-item]") || []).map((item, index) => {
    const text = item.querySelector("[data-question-text]")?.value.trim() || "";
    const type = item.querySelector("[data-question-type]")?.value || "text";
    const options = Array.from(item.querySelectorAll("[data-question-option]"))
      .map((input) => input.value.trim())
      .filter(Boolean);
    return {
      id: item.dataset.questionId || scope + "_question_" + Date.now() + "_" + index,
      text,
      type: ["score", "text", "checkbox"].includes(type) ? type : "text",
      options: type === "checkbox" ? options : []
    };
  }).filter((question) => question.text);
}

function renderNextStepsPanel() {
  return renderResearchPanel(
    "8. Sledeći koraci",
    [
      "<p>Nastavi sa dodatnim pravcima istraživanja i pripremi se za ostvarenje. Tvoja istraživanja ostaju sa tobom i nakon prelaska u ostvarenje.</p>",
      '<div class="research-next-actions">',
      '  <button class="research-primary-btn" type="button">Nastavi istraživanje →</button>',
      '  <button class="research-secondary-btn" type="button" data-research-action="calendar">Dodaj u kalendar</button>',
      '  <button class="research-secondary-btn" type="button" data-research-action="build">Pretvori u ostvarenje</button>',
      '  <button class="research-secondary-btn muted" type="button" data-research-action="archive">Arhiviraj ideju</button>',
      "</div>"
    ].join(""),
    "research-next-panel"
  );
}

async function openResearchCanvasCardCreator(root, actions, button, placement = null, connectionSides = null) {
  const view = root.querySelector(".research-view") || root.closest?.(".research-view") || root;
  const type = button.dataset.cardType || "note";
  const parentKey = button.dataset.parentKey || view.querySelector("[data-research-canvas-preview]")?.dataset.cardKey || "";
  const directionId = button.dataset.directionId || getActiveResearchDirection(researchViewState.currentIdea || {})?.id || "";
  snapshotResearchCanvasFocusPositions(view);
  const canvasPosition = placement || (parentKey ? getResearchCanvasChildPosition(root, parentKey) : getResearchCanvasVisibleCenterPosition(root));
  // A draft does not change its parent. The owner expands only after Save.
  closeResearchCanvasMenus(view);
  const addMenu = view.querySelector("[data-research-organizer-add-menu]");
  if (addMenu) addMenu.hidden = true;
  view.querySelector('[data-research-organizer-tool="add"]')?.setAttribute("aria-expanded", "false");
  if (window.MentorResearchStickerDesigner && type !== "finance") {
    const template = { note: "notes", unit: "unit", media: "media", source: "source", av: "av" }[type] || "custom";
    openResearchStickerDesigner(root, actions, { type: ["custom", "media", "unit"].includes(type) ? "note" : type, directionId,
      canvasParentKey: parentKey, canvasConnectionSides: connectionSides || undefined, canvasPosition }, template);
  } else if (type === "link" && directionId) {
    openResearchReferenceForm(button, actions, null, parentKey, canvasPosition, connectionSides);
    if (view.querySelector("[data-research-canvas-preview]")) view.querySelector("[data-research-reference-modal]")?.classList.add("is-preview-sidecar");
  } else {
    openResearchCanvasItemForm(root, actions, { type, canvasParentKey: parentKey, canvasConnectionSides: connectionSides || undefined, canvasPosition });
  }
}

function bindResearchView(root, actions = {}) {
  root._researchArmedConnection?.cancel(false);
  root._researchConnectionStackClose?.(false);
  root._researchActions = window.MentorResearchPersistence.bindActions(actions);
  actions = root._researchActions;
  bindResearchSummary(root);
  bindResearchCanvasResize(root);
  window.MentorResearchStickerDrag?.bind(root, {
    isOverCanvas(event) {
      const viewport = root.querySelector("[data-research-canvas-viewport]");
      if (!viewport) return false;
      const rect = viewport.getBoundingClientRect();
      return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    },
    renderPreview(type) {
      return '<span data-drag-sticker-icon aria-hidden="true">' + getResearchCanvasIcon(type) + '</span><span data-drag-sticker-label>' + escapeResearchHtml(researchT("canvas.types." + type)) + '</span>';
    },
    onDrop(button, event) {
      const placement = getResearchCanvasPositionAtClient(root, event.clientX, event.clientY);
      if (placement) {
        const parentKey = getResearchCanvasDropParentKey(root, event.clientX, event.clientY, "", event.target);
        const parentElement = parentKey ? Array.from(root.querySelectorAll("[data-research-canvas] .research-canvas-card[data-card-key]")).find((card) => card.dataset.cardKey === parentKey) : null;
        const sides = parentElement ? { parent: getResearchCanvasPointerSide(parentElement, event.clientX, event.clientY) } : null;
        const childPlacement = parentKey ? getResearchCanvasChildPosition(root, parentKey) || placement : placement;
        openResearchCanvasCardCreator(root, root._researchActions || {}, { dataset: {
          cardType: button.dataset.cardType, directionId: button.dataset.directionId,
          parentKey: parentKey || button.dataset.parentKey || ""
        } }, childPlacement, sides).catch((error) => console.warn("Research sticker form could not open.", error));
      }
    }
  });
  window.MentorResearchExternalDrop?.bind(root, {
    async onDrop(item, event, viewport) {
      if (root._researchExternalDropPending) return;
      const ideaId = researchViewState.currentIdea?.id;
      const directionId = getActiveResearchDirection(researchViewState.currentIdea || {})?.id || "";
      const placement = getResearchCanvasPositionAtClient(root, event.clientX, event.clientY);
      const parentKey = getResearchCanvasDropParentKey(root, event.clientX, event.clientY, "", event.target);
      const parentElement = parentKey ? Array.from(root.querySelectorAll("[data-research-canvas] .research-canvas-card[data-card-key]")).find((card) => card.dataset.cardKey === parentKey) : null;
      const sides = parentElement ? { parent: getResearchCanvasPointerSide(parentElement, event.clientX, event.clientY) } : undefined;
      const canvasPosition = parentKey ? getResearchCanvasChildPosition(root, parentKey) || placement : placement;
      if (!ideaId || !placement) return;
      root._researchExternalDropPending = true;
      const intent = root._researchStickerIntent || 0;
      const actions = root._researchActions || {};
      const isLink = item.kind === "link";
      viewport.dataset.externalDropStatus = researchT(isLink ? "canvas.importingLink" : "canvas.importingImage");
      try {
        const pageTitle = await window.MentorResearchExternalDrop.fetchPageTitle(item.pageUrl);
        const title = pageTitle || item.titleHint || (isLink
          ? window.MentorResearchExternalDrop.titleFromUrl(item.sourceUrl)
          : window.MentorResearchExternalDrop.titleFromImageUrl(item.imageUrl) || item.file?.name?.replace(/\.[^.]+$/, "") || researchT("canvas.importedImageTitle"));
        if (window.MentorResearchStickerDesigner) {
          if (researchViewState.currentIdea?.id !== ideaId || getActiveResearchDirection(researchViewState.currentIdea || {})?.id !== directionId || !viewport.isConnected || (root._researchStickerIntent || 0) !== intent) { delete viewport.dataset.externalDropStatus; return; }
          const type = isLink ? "link" : item.kind === "text" ? "note" : item.kind === "file" ? item.file?.type?.startsWith("video/") ? "video" : item.file?.type?.startsWith("audio/") ? "av" : "source" : "image";
          openResearchStickerDesigner(root, actions, { type, directionId, canvasParentKey: parentKey, canvasConnectionSides: sides, canvasPosition,
            title, url: item.sourceUrl || "", text: item.text || "", ...(type === "image" && item.imageUrl ? { image: item.imageUrl } : {}) }, null, item.file || null);
          delete viewport.dataset.externalDropStatus; return;
        }
        const canStoreFile = !isLink && item.file && item.file.size <= 2 * 1024 * 1024;
        const image = canStoreFile ? await readResearchFileAsDataUrl(item.file) || item.imageUrl : item.imageUrl;
        if (researchViewState.currentIdea?.id !== ideaId) { delete viewport.dataset.externalDropStatus; return; }
        if (!isLink && !image) throw new Error("External image has no usable source.");
        const saved = await actions.saveCanvasItem?.({ type: isLink ? "link" : "image", directionId,
          canvasParentKey: parentKey, canvasConnectionSides: sides, canvasPosition, title, url: item.sourceUrl,
          ...(isLink ? {} : { image }) });
        if (!saved) throw new Error("External sticker could not be saved.");
        delete viewport.dataset.externalDropStatus;
      } catch (error) {
        console.warn("External sticker could not be saved.", error);
        const failure = researchT(isLink ? "canvas.importLinkFailed" : "canvas.importImageFailed");
        viewport.dataset.externalDropStatus = failure;
        window.setTimeout(() => { if (viewport.dataset.externalDropStatus === failure) delete viewport.dataset.externalDropStatus; }, 4000);
      } finally {
        root._researchExternalDropPending = false;
      }
    }
  });
  const boundView = root.querySelector(".research-view") || root.closest?.(".research-view") || root;
  bindResearchCompactIdeaDock(root, boundView);
  const directionStack = boundView.querySelector("[data-research-direction-stack]");
  layoutResearchDirectionTabs(boundView);
  if (directionStack) {
    directionStack.addEventListener("scroll", () => layoutResearchDirectionTabs(boundView), { passive: true });
    const activeTab = directionStack.querySelector(".research-direction-tile.active");
    if (activeTab) {
      const activeRect = activeTab.getBoundingClientRect();
      const stackRect = directionStack.getBoundingClientRect();
      if (activeRect.right > stackRect.right) directionStack.scrollLeft += activeRect.right - stackRect.right;
      else if (activeRect.left < stackRect.left) directionStack.scrollLeft -= stackRect.left - activeRect.left;
      layoutResearchDirectionTabs(boundView);
    }
  }
  if (typeof ResizeObserver !== "undefined") {
    if (!root._researchDirectionResizeObserver) {
      root._researchDirectionResizeObserver = new ResizeObserver(() => layoutResearchDirectionTabs(root.querySelector(".research-view")));
    }
    root._researchDirectionResizeObserver.disconnect();
    if (directionStack) root._researchDirectionResizeObserver.observe(directionStack);
  }
  boundView.classList.toggle("is-reference-focus", researchViewState.isReferenceFocus);
  if (!root._researchOutsideMenuHandler) {
    root._researchOutsideMenuHandler = (event) => {
      if (window.MentorUIEvents?.isTextEditingEvent?.(event)) return;
      const view = root.querySelector(".research-view") || root.closest?.(".research-view");
      if (!view || event.target.closest?.("[data-research-canvas-menu], .research-canvas-card-menu, [data-research-action='toggle-canvas-menu'], [data-research-action='toggle-card-add-menu']")) return;
      closeResearchCanvasMenus(view);
    };
    document.addEventListener("click", root._researchOutsideMenuHandler);
  }
  if (!root._researchAddMenuPositionHandler) {
    root._researchAddMenuPositionHandler = () => {
      root.querySelectorAll(".research-canvas-card-menu.is-floating-add-menu").forEach(positionResearchCardAddMenu);
    };
    window.addEventListener("scroll", root._researchAddMenuPositionHandler, { capture: true, passive: true });
    window.addEventListener("resize", root._researchAddMenuPositionHandler);
  }
  if (!root._researchFocusEscapeHandler) {
    root._researchFocusEscapeHandler = (event) => {
      if (document.querySelector("[data-research-sticker-designer]")) return;
      if (event.key !== "Escape" || !researchViewState.canvasFocus) return;
      const view = root.querySelector(".research-view") || root.closest?.(".research-view");
      if (!view?.querySelector("[data-research-canvas-preview]")) return;
      event.preventDefault();
      closeResearchCanvasPreview(view);
    };
    document.addEventListener("keydown", root._researchFocusEscapeHandler);
  }
  document.getElementById("brainstormingView")?.classList.toggle("research-reference-focus-active", researchViewState.isReferenceFocus);
  if (!root._researchVisibilityObserver && typeof MutationObserver !== "undefined") {
    const brainstormingView = document.getElementById("brainstormingView");
    if (brainstormingView) {
      root._researchVisibilityObserver = new MutationObserver(() => {
        if (brainstormingView.classList.contains("hidden")) {
          closeResearchCanvasPreview(root.querySelector(".research-view"));
          closeResearchCanvasTests();
          closeResearchCanvasMedia();
        }
      });
      root._researchVisibilityObserver.observe(brainstormingView, { attributes: true, attributeFilter: ["class"] });
    }
  }
  if (!root._researchActionDelegate) {
    root._researchActionDelegate = async (event) => {
      if (window.MentorUIEvents?.isTextEditingEvent?.(event)) {
        event.stopPropagation();
        return;
      }
      const button = event.target.closest?.("[data-research-action]");
      if (!button || !root.contains(button)) return;
      const currentActions = root._researchActions || {};
      const activeView = root.querySelector(".research-view") || root.closest?.(".research-view") || root;
      const action = button.dataset.researchAction || "";
      if (action === "add-canvas-card" && window.MentorResearchStickerDrag?.consumeClick(button)) {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        return;
      }
      const exclusiveActions = new Set([
        "open-idea",
        "zoom-canvas-cards",
        "zoom-canvas-focus",
        "shift-directions",
        "add-direction",
        "add-reference",
        "create-test",
        "edit-test",
        "delete-test",
        "select-test",
        "select-test-day",
        "toggle-description",
        "toggle-metadata",
        "financial-comparison",
        "toggle-canvas-menu",
        "toggle-card-add-menu",
        "toggle-canvas-children",
        "add-canvas-card",
        "change-canvas-parent",
        "start-canvas-connection",
        "open-connection-stack",
        "open-canvas-preview",
        "open-canvas-media",
        "open-canvas-tests",
        "add-linked-canvas-note",
        "edit-canvas-card",
        "delete-canvas-card"
      ]);
      if (exclusiveActions.has(action)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
      if (action === "toggle-description") toggleResearchDescription(button);
      if (action === "toggle-metadata") toggleResearchMetadata(button);
      if (action === "open-idea") currentActions.openIdeaOnBoard?.();
      if (action === "zoom-canvas-cards") {
        const viewport = activeView.querySelector("[data-research-canvas-viewport]");
        if (viewport) {
          const rect = viewport.getBoundingClientRect();
          const next = getResearchCanvasCamera().zoom + Number(button.dataset.zoomDelta || 0) / getResearchCanvasCardZoom();
          zoomResearchCanvasMap(viewport, next, rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
      }
      if (action === "zoom-canvas-focus") {
        const preview = button.closest("[data-research-canvas-preview]");
        if (preview) setResearchCanvasFocusZoom(preview, getResearchCanvasFocusZoom(preview) + Number(button.dataset.zoomDelta || 0));
      }
      if (action === "shift-directions") {
        const stack = activeView.querySelector("[data-research-direction-stack]");
        stack?.scrollBy({ left: Number(button.dataset.shift || 1) * 160, behavior: "smooth" });
      }
      if (button.dataset.researchAction === "toggle-reference-focus") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        toggleReferenceFocus(root, button);
      }
      if (button.dataset.researchAction === "add-direction") {
        openResearchDirectionForm(button, currentActions);
      }
      if (button.dataset.researchAction === "edit-direction") {
        event.stopPropagation();
        openResearchDirectionForm(button, currentActions, {
          id: button.dataset.directionId || "",
          title: button.dataset.directionTitle || "",
          type: button.dataset.directionType || "",
          icon: button.dataset.directionIcon || "compass"
        });
      }
      if (button.dataset.researchAction === "select-direction") {
        selectResearchDirection(root, button.dataset.directionId || "");
        currentActions.refreshResearch?.();
      }
      if (button.dataset.researchAction === "select-reference") selectResearchReference(root, button.dataset.directionId || "", button.dataset.referenceId || "");
      if (button.dataset.researchAction === "add-reference") {
        openResearchReferenceForm(button, currentActions);
      }
      if (action === "toggle-canvas-menu") {
        toggleResearchCanvasAddMenu(activeView, button);
      }
      if (action === "toggle-card-add-menu") {
        const cardElement = button.closest(".research-canvas-card");
        const focusCard = button.closest("[data-focus-card-key]");
        const menu = button.closest(".research-canvas-card-add-wrap")?.querySelector(".research-canvas-card-menu") || Array.from(activeView.querySelectorAll(".research-canvas-card-menu")).find((candidate) => candidate._researchAddMenuTrigger === button);
        const open = Boolean(menu?.hidden);
        closeResearchCanvasMenus(activeView);
        if (menu) {
          if (open) openResearchCardAddMenu(activeView, button, menu);
          cardElement?.classList.toggle("has-open-menu", open);
          focusCard?.classList.toggle("has-open-menu", open);
          button.setAttribute("aria-expanded", String(open));
        }
      }
      if (action === "open-canvas-preview") {
        const card = getResearchCanvasCards(researchViewState.currentIdea || {}).find((item) => item.key === button.dataset.cardKey);
        if (card && isMobileResearchCanvas()) await openResearchCanvasMedia(root, card, button);
        else if (card) openResearchCanvasPreview(root, card);
      }
      if (action === "toggle-canvas-children") {
        const idea = researchViewState.currentIdea;
        const key = button.dataset.cardKey;
        if (idea?.pathData && key) {
          const collapsed = idea.pathData.researchCanvasCollapsed || (idea.pathData.researchCanvasCollapsed = {});
          const previous = Boolean(collapsed[key]);
          const preview = activeView.querySelector("[data-research-canvas-preview]");
          snapshotResearchCanvasFocusPositions(activeView);
          if (previous) delete collapsed[key]; else collapsed[key] = true;
          const canvas = activeView.querySelector("[data-research-canvas]");
          const updateVisibility = () => {
            if (canvas) setResearchCanvasChildrenVisibility(canvas);
            if (preview) {
              setResearchCanvasFocusChildrenVisibility(preview);
              if (researchViewState.canvasFocus) layoutResearchCanvasFocus(preview, researchViewState.canvasFocus);
            }
          };
          updateVisibility();
          let saved = false;
          try { saved = await currentActions.saveCanvasCollapsed?.(key, !previous) === true; }
          catch (error) { console.warn("Research sticker visibility could not be saved.", error); }
          if (!saved) {
            if (previous) collapsed[key] = true; else delete collapsed[key];
            updateVisibility();
          }
        }
      }
      if (action === "open-canvas-tests") openResearchCanvasTests(root, currentActions);
      if (action === "open-canvas-media") {
        const card = getResearchCanvasCards(researchViewState.currentIdea || {}).find((item) => item.key === button.dataset.cardKey);
        if (card) await openResearchCanvasMedia(root, card, button);
      }
      if (action === "add-linked-canvas-note") {
        const card = getResearchCanvasCards(researchViewState.currentIdea || {}).find((item) => item.key === button.dataset.cardKey);
        if (card?.source === "reference") openResearchCanvasItemForm(root, currentActions, { source: "new-linked-note", type: "note", direction: card.direction, reference: card.reference });
      }
      if (action === "add-canvas-card") {
        await openResearchCanvasCardCreator(root, currentActions, button);
      }
      if (action === "change-canvas-parent") {
        const consumed = root._researchConnectionDragClick;
        if (consumed?.key === button.dataset.cardKey && Date.now() < consumed.until) {
          root._researchConnectionDragClick = null;
          return;
        }
        openResearchConnectionStack(root, button, currentActions);
      }
      if (action === "start-canvas-connection") {
        const consumed = root._researchConnectionDragClick;
        if (consumed?.key === button.dataset.cardKey && consumed.endpoint === "source" && Date.now() < consumed.until) {
          root._researchConnectionDragClick = null;
          return;
        }
        const canvas = button.closest("[data-research-canvas], [data-research-canvas-preview]");
        if (canvas) armResearchCanvasConnection(root, canvas, currentActions,
          { kind: "source", key: button.dataset.cardKey, side: button.dataset.connectionSide }, button);
      }
      if (action === "open-connection-stack") openResearchConnectionStack(root, button, currentActions);
      if (action === "edit-canvas-card" || action === "delete-canvas-card") {
        event.preventDefault();
        event.stopPropagation();
        const card = getResearchCanvasCards(researchViewState.currentIdea || {}).find((item) => item.key === button.dataset.cardKey);
        if (card && action === "edit-canvas-card") {
          if (window.MentorResearchStickerDesigner && card.type !== "finance") openResearchStickerDesigner(root, currentActions, card);
          else if (card.source === "reference") {
            const trigger = Object.assign(document.createElement("button"), { type: "button" });
            trigger.dataset.directionId = card.direction.id;
            trigger.dataset.cardType = card.type;
            activeView.appendChild(trigger);
            openResearchReferenceForm(trigger, currentActions, card.reference);
            if (activeView.querySelector("[data-research-canvas-preview]")) activeView.querySelector("[data-research-reference-modal]")?.classList.add("is-preview-sidecar");
            trigger.remove();
          } else openResearchCanvasItemForm(root, currentActions, card);
        }
        if (card && action === "delete-canvas-card" && window.confirm(researchT(card.source === "reference" ? "canvas.confirmDeleteReference" : "canvas.confirmDelete"))) {
          if (card.source === "reference") await currentActions.deleteReference?.(card.direction.id, card.reference.id);
          else if (card.source === "linked-note") await currentActions.deleteCanvasLinkedNote?.(card.direction.id, card.reference.id, card.note.id);
          else if (card.source === "direction-note") await currentActions.deleteCanvasDirectionNote?.(card.direction.id, card.note.id);
          else await currentActions.deleteCanvasItem?.(card.id);
        }
      }
      if (button.dataset.researchAction === "edit-reference") {
        event.stopPropagation();
        openResearchReferenceForm(button, currentActions, {
          id: button.dataset.referenceId || "",
          title: button.dataset.referenceTitle || "",
          link: button.dataset.referenceLink || "",
          image: button.dataset.referenceImage || "",
          unitType: button.dataset.referenceUnitType || "",
          unitValue: button.dataset.referenceUnitValue || "",
          unitCustom: button.dataset.referenceUnitCustom || "",
          unitLabel: button.dataset.referenceUnitLabel || "",
          unitSystem: button.dataset.referenceUnitSystem || "",
          noteTitle: button.dataset.referenceNoteTitle || "",
          note: button.dataset.referenceNote || ""
        });
      }
      if (button.dataset.researchAction === "delete-reference") {
        event.stopPropagation();
        const directionId = button.dataset.directionId || "";
        const referenceId = button.dataset.referenceId || "";
        if (directionId && referenceId && window.confirm(researchT("confirm.deleteReference"))) {
          await currentActions.deleteReference?.(directionId, referenceId);
        }
      }
      if (button.dataset.researchAction === "add-note") {
        event.stopPropagation();
        addLinkedNote(root, button, currentActions);
      }
      if (button.dataset.researchAction === "edit-note") {
        event.preventDefault();
        event.stopPropagation();
        editLinkedNote(root, button, currentActions);
      }
      if (button.dataset.researchAction === "delete-note") {
        event.preventDefault();
        event.stopPropagation();
        deleteLinkedNote(root, button, currentActions);
      }
      if (button.dataset.researchAction === "delete-direction") {
        event.stopPropagation();
        const directionId = button.dataset.directionId || "";
        if (directionId && window.confirm(researchT("confirm.deleteDirection"))) {
          await currentActions.deleteDirection?.(directionId);
        }
      }
      if (button.dataset.researchAction === "create-test") openIdeaTestForm(root, button, currentActions);
      if (button.dataset.researchAction === "edit-test") {
        event.preventDefault();
        event.stopPropagation();
        const test = researchViewState.renderedTestsById[button.dataset.testId || ""];
        if (test) openIdeaTestForm(root, button, currentActions, test);
      }
      if (button.dataset.researchAction === "delete-test") {
        event.preventDefault();
        event.stopPropagation();
        const testId = button.dataset.testId || "";
        const ideaId = button.dataset.ideaId || "";
        if (testId && window.confirm(researchT("confirm.deleteTest"))) {
          if (ideaId && researchViewState.activeTestByIdea[ideaId] === testId) delete researchViewState.activeTestByIdea[ideaId];
          preserveResearchScrollStep(activeView, 2);
          await currentActions.deleteTest?.(testId);
        }
      }
      if (button.dataset.researchAction === "select-test") {
        const viewIdeaId = button.dataset.ideaId || "";
        if (viewIdeaId && button.dataset.testId) researchViewState.activeTestByIdea[viewIdeaId] = button.dataset.testId;
        preserveResearchScrollStep(activeView, 2);
        currentActions.refreshResearch?.();
      }
      if (button.dataset.researchAction === "select-test-day") {
        if (button.dataset.testId && button.dataset.dayId) researchViewState.activeDayByTest[button.dataset.testId] = button.dataset.dayId;
        preserveResearchScrollStep(activeView, 2);
        currentActions.refreshResearch?.();
      }
      if (button.dataset.researchAction === "calendar") currentActions.openCalendar?.();
      if (button.dataset.researchAction === "financial-comparison") {
        currentActions.openFinancialComparison?.(button.dataset.ideaId || "");
      }
      if (button.dataset.researchAction === "build") await currentActions.openBuild?.();
      if (button.dataset.researchAction === "archive") await currentActions.openArchive?.();
    };
    root.addEventListener("click", root._researchActionDelegate);
  }
  if (!root._researchKeyboardDelegate) {
    root._researchKeyboardDelegate = (event) => {
      const button = event.target.closest?.('[data-research-action][role="button"]');
      if (!button || !root.contains(button)) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        button.click();
      }
    };
    root.addEventListener("keydown", root._researchKeyboardDelegate);
  }

  root.querySelectorAll("[data-scroll-step]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const view = root.querySelector(".research-view") || root.closest?.(".research-view") || root;
      const requestedStep = Number(button.dataset.scrollStep || 1);
      const currentStep = getResearchScrollStepFromView(view);
      if (requestedStep === currentStep) {
        researchViewState.lockedScrollStep = researchViewState.lockedScrollStep === currentStep ? 0 : currentStep;
        updateResearchScrollCounter(view, currentStep);
        return;
      }
      researchViewState.lockedScrollStep = 0;
      setResearchScrollStep(view, requestedStep);
      window.requestAnimationFrame(() => {
        setResearchScrollStep(view, requestedStep);
        updateResearchScrollCounter(view, requestedStep);
      });
    });
  });

  root.querySelectorAll("[data-research-quick-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      actions.openTab?.(button.dataset.researchQuickTab || "all");
    });
  });

  root.querySelectorAll("[data-research-direction-form]").forEach((form) => {
    bindResearchDirectionCategoryForm(form);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const title = form.elements.title?.value.trim();
      const category = form.elements.category?.value || "";
      const subcategory = form.elements.subcategory?.value || "";
      const type = category && subcategory ? category + ":" + subcategory : category;
      const icon = form.elements.icon?.value || "compass";
      if (!title) return;
      await actions.addDirection?.({ title, type, icon });
    });
  });

  bindResearchTestAnswerInputs(root, actions, boundView);

  root.querySelectorAll("[data-research-nav]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.researchNav === "prev") actions.openPreviousIdea?.();
      if (button.dataset.researchNav === "next") actions.openNextIdea?.();
    });
  });
  bindLinkedNoteAutosave(root, actions);
  bindLinkedNoteAccordion(root);
  bindReferenceFocusScroll(root);
  bindReferenceScrollbars(root);
  bindLinkedNoteScrollbars(root);
  bindResearchStickerDocuments(root, actions);
  bindResearchCanvas(root, actions);
  root._researchOrganizerAbort?.abort();
  root._researchOrganizerAbort = new AbortController();
  window.MentorResearchOrganizer.bind(boundView, {
    getIdea: () => researchViewState.currentIdea,
    getDirectionId: () => getActiveResearchDirection(researchViewState.currentIdea || {})?.id || "",
    getCards: getResearchCanvasCards,
    getCamera: getResearchCanvasCamera,
    focusGroup: (group) => focusResearchCanvasGroup(boundView.querySelector("[data-research-canvas-viewport]"), group),
    getVisualSize: getResearchVisualCardSize,
    getActions: () => root._researchActions || {},
    placeCard: placeResearchCanvasCard,
    drawConnections: drawResearchCanvasConnections,
    captureConnectionSectors: captureResearchConnectionSectors,
    changedConnectionSides: changedResearchConnectionSides,
    t: researchT,
    escape: escapeResearchHtml,
    abortSignal: root._researchOrganizerAbort.signal
  });
  const focus = researchViewState.canvasFocus;
  if (focus && focus.ideaId === researchViewState.currentIdea?.id) {
    const card = getResearchCanvasCards(researchViewState.currentIdea).find((item) => item.key === focus.cardKey);
    if (card) openResearchCanvasPreview(root, card);
    else researchViewState.canvasFocus = null;
  }
  if (researchViewState.testPanelOpen && root.querySelector("[data-research-canvas]")) openResearchCanvasTests(root, actions);
}

function bindResearchTestAnswerInputs(container, actions, boundView) {
  container.querySelectorAll("[data-test-answer]").forEach((input) => {
    if (input.dataset.answerBound === "true") return;
    input.dataset.answerBound = "true";
    const eventName = input.matches('input[type="range"], input[type="number"], textarea') ? "input" : "change";
    input.addEventListener(eventName, async () => {
      const type = input.dataset.questionType || "text";
      let value = input.value;
      if (type === "score") {
        value = Math.min(10, Math.max(1, Number(input.value) || 1));
        input.closest(".research-test-score-row")?.querySelectorAll("[data-test-score-range], [data-test-score-number]").forEach((pairedInput) => {
          pairedInput.value = String(value);
        });
      }
      if (type === "checkbox") {
        value = Array.from(input.closest(".research-test-answer-options")?.querySelectorAll('input[type="checkbox"]:checked') || []).map((checkbox) => checkbox.value);
      }
      preserveResearchScrollStep(boundView, 2);
      await actions.updateTestAnswer?.({
        testId: input.dataset.testId || "",
        dayId: input.dataset.dayId || "",
        questionId: input.dataset.questionId || "",
        questionText: input.dataset.questionText || "",
        questionType: type,
        scope: input.dataset.questionScope || "daily",
        value
      });
    });
  });

}

function selectResearchDirection(root, directionId) {
  if (!directionId) return;
  const view = root.querySelector(".research-view") || root.closest?.(".research-view") || root;
  const selectedTile = view.querySelector('.research-direction-tile[data-direction-id="' + cssEscapeResearchSelector(directionId) + '"]');
  const ideaId = researchViewState.currentIdea?.id || selectedTile?.dataset?.ideaId || "";
  setActiveResearchDirection(ideaId, directionId);
  view.querySelectorAll(".research-direction-tile.saved").forEach((tile) => {
    const isActive = tile.dataset.directionId === directionId;
    tile.classList.toggle("active", isActive);
    tile.querySelector(".research-direction-select")?.setAttribute("aria-pressed", String(isActive));
  });
}

function selectResearchReference(root, directionId, referenceId) {
  if (!directionId || !referenceId) return;
  researchViewState.activeReferenceByDirection[directionId] = referenceId;
  const actions = root._researchActions || {};
  if (actions.refreshResearch) {
    actions.refreshResearch();
    return;
  }
  const view = root.querySelector(".research-view") || root.closest?.(".research-view") || root;
  view.querySelectorAll(".research-reference-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.referenceId === referenceId);
  });
  const selectedCard = view.querySelector('.research-reference-card[data-reference-id="' + cssEscapeResearchSelector(referenceId) + '"]');
  const notePanel = view.querySelector(".research-linked-note-panel");
  if (!selectedCard || !notePanel) return;
  notePanel.innerHTML = renderLinkedNote({
    noteTitle: selectedCard.querySelector("em")?.textContent || "Beleška",
    note: selectedCard.dataset.referenceNote || ""
  });
  notePanel.innerHTML = renderLinkedNoteEditor({
    id: referenceId,
    link: selectedCard.dataset.referenceLink || "",
    noteTitle: selectedCard.dataset.referenceNoteTitle || selectedCard.querySelector("em")?.textContent || "Beleska",
    note: selectedCard.dataset.referenceNote || ""
  }, { id: directionId });
  bindLinkedNoteAutosave(view, root._researchActions || {});
  bindLinkedNoteAccordion(view);
  bindReferenceScrollbars(view);
  bindLinkedNoteScrollbars(view);
}

function bindReferenceScrollbars(root) {
  root.querySelectorAll("[data-reference-list]").forEach((list) => {
    if (list.dataset.scrollbarBound === "true") return;
    list.dataset.scrollbarBound = "true";
    const update = () => updateReferenceScrollbar(list);
    list.addEventListener("scroll", update, { passive: true });
    list.addEventListener("wheel", (event) => {
      const maxScroll = list.scrollWidth - list.clientWidth;
      if (maxScroll <= 2) return;
      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (!delta) return;
      event.preventDefault();
      const nextScrollLeft = Math.min(maxScroll, Math.max(0, list.scrollLeft + delta));
      if (nextScrollLeft === list.scrollLeft) return;
      list.scrollLeft = nextScrollLeft;
      updateReferenceScrollbar(list);
    }, { passive: false });
    update();
  });
}

function updateReferenceScrollbar(list) {
  const wrap = list.closest(".research-reference-scroll");
  if (!wrap) return;
  const maxScroll = list.scrollWidth - list.clientWidth;
  const progress = maxScroll > 0 ? Math.min(100, Math.max(0, (list.scrollLeft / maxScroll) * 100)) : 0;
  wrap.style.setProperty("--reference-scroll-progress", progress + "%");
  wrap.classList.toggle("has-reference-scroll", maxScroll > 2);
}

function bindLinkedNoteScrollbars(root) {
  root.querySelectorAll("[data-linked-note-list]").forEach((list) => {
    if (list.dataset.scrollbarBound === "true") return;
    list.dataset.scrollbarBound = "true";
    const update = () => updateLinkedNoteScrollbar(list);
    list.addEventListener("scroll", update, { passive: true });
    update();
  });
}

function bindLinkedNoteAccordion(root) {
  root.querySelectorAll("[data-linked-note-list]").forEach((list) => {
    if (list.dataset.accordionBound === "true") return;
    list.dataset.accordionBound = "true";
    list.querySelectorAll(".research-linked-note-item").forEach((item) => {
      item.addEventListener("toggle", () => {
        if (!item.open) {
          updateLinkedNoteScrollbar(list);
          return;
        }
        list.querySelectorAll(".research-linked-note-item[open]").forEach((sibling) => {
          if (sibling !== item) sibling.open = false;
        });
        window.requestAnimationFrame(() => {
          updateLinkedNoteScrollbar(list);
          const view = list.closest(".research-view");
          if (view?.classList?.contains("is-reference-focus")) updateReferenceFocusScroll(view);
          else window.dispatchEvent(new Event("scroll"));
        });
      });
    });
  });
}

function bindReferenceFocusScroll(root) {
  const view = root.querySelector(".research-view") || root.closest?.(".research-view") || root;
  const stage = view.querySelector("[data-research-scroll-stage]");
  if (!stage || stage.dataset.focusScrollBound === "true") return;
  stage.dataset.focusScrollBound = "true";
  stage.addEventListener("scroll", () => updateReferenceFocusScroll(view), { passive: true });
  view.addEventListener("wheel", (event) => {
    if (!view.classList.contains("is-reference-focus")) return;
    if (!canUseReferenceFocus()) return;
    if (event.target.closest(researchModalLayerSelector + ", .research-canvas-card-menu, [data-research-group-panel], [data-research-organizer-add-menu], [data-research-pointer-menu], .research-connection-stack-list")) return;
    if (event.target.closest("[data-reference-list], [data-linked-note-list], textarea, input, select")) return;
    if (researchViewState.lockedScrollStep) {
      event.preventDefault();
      setResearchScrollStep(view, researchViewState.lockedScrollStep);
      return;
    }
    const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    if (!delta) return;
    event.preventDefault();
    const maxFocusScroll = Math.max(stage.scrollHeight - stage.clientHeight, stage.clientHeight * 1.25, 520);
    const currentFocusScroll = Number(stage.dataset.focusScrollOffset || stage.scrollTop || 0);
    const stepDelta = Math.max(-140, Math.min(140, delta));
    const nextFocusScroll = Math.max(0, Math.min(maxFocusScroll, currentFocusScroll + stepDelta));
    stage.dataset.focusScrollOffset = String(nextFocusScroll);
    updateReferenceFocusScroll(view);
  }, { passive: false });
  updateReferenceFocusScroll(view);
}

function getResearchScrollStepFromView(view) {
  if (view?.classList?.contains("is-scroll-resources-active")) return 3;
  if (view?.classList?.contains("is-scroll-test-active")) return 2;
  return 1;
}

function getResearchScrollOffsetForStep(stage, step) {
  const maxFocusScroll = Math.max(stage.scrollHeight - stage.clientHeight, stage.clientHeight * 1.25, 520);
  if (step === 3) return maxFocusScroll * 0.78;
  if (step === 2) return maxFocusScroll * 0.42;
  return 0;
}

function getSafeResearchScrollStep(step) {
  return Math.min(3, Math.max(1, Number(step) || 1));
}

function getResearchScrollProgressForStep(step) {
  const safeStep = getSafeResearchScrollStep(step);
  if (safeStep === 3) return "1";
  if (safeStep === 2) return "0.5";
  return "0";
}

function setResearchScrollStep(view, step) {
  const safeStep = getSafeResearchScrollStep(step);
  const stage = view?.querySelector?.("[data-research-scroll-stage]");
  researchViewState.activeScrollStep = safeStep;
  if (stage) {
    const offset = getResearchScrollOffsetForStep(stage, safeStep);
    stage.dataset.focusScrollOffset = String(offset);
    stage.scrollTop = offset;
  }
  applyResearchScrollStep(view, safeStep);
}

function preserveResearchScrollStep(view, step) {
  setResearchScrollStep(view, step);
  window.requestAnimationFrame(() => {
    const nextView = document.querySelector("#brainstormingCanvas .research-view") || view;
    setResearchScrollStep(nextView, step);
  });
}

function applyResearchScrollStep(view, step, progress = getResearchScrollProgressForStep(step)) {
  const safeStep = getSafeResearchScrollStep(step);
  researchViewState.activeScrollStep = safeStep;
  if (view) {
    view.classList.toggle("is-scroll-test-active", safeStep === 2);
    view.classList.toggle("is-scroll-resources-active", safeStep === 3);
    view.style.setProperty("--research-scroll-progress", String(progress));
    updateResearchScrollCounter(view, safeStep);
  }
}

function updateResearchScrollCounter(view, step = getResearchScrollStepFromView(view)) {
  const counter = view?.querySelector(".research-scroll-counter");
  if (counter) counter.dataset.currentStep = String(step);
  view?.querySelectorAll("[data-scroll-step]").forEach((dot) => {
    const dotStep = Number(dot.dataset.scrollStep);
    const isCurrentStep = dotStep === step;
    const isLocked = researchViewState.lockedScrollStep === step;
    dot.classList.toggle("active", isCurrentStep);
    dot.classList.toggle("is-current", isCurrentStep);
    dot.classList.toggle("is-locked", isCurrentStep && isLocked);
    dot.setAttribute("aria-pressed", String(isCurrentStep && isLocked));
    dot.setAttribute("aria-label", getResearchScrollDotLabel(dotStep, isCurrentStep, isLocked));
    dot.setAttribute("title", isCurrentStep ? getResearchScrollLockTitle(isLocked) : "");
    const label = dot.querySelector("strong");
    if (label) label.innerHTML = isCurrentStep ? (isLocked ? "&#128274;" : "&#128275;") : String(dotStep);
  });
}

function getResearchScrollLockTitle(isLocked) {
  return isLocked ? researchT("scroll.unlock") : researchT("scroll.lock");
}

function getResearchScrollDotLabel(step, isCurrentStep, isLocked) {
  const names = {
    1: researchT("panels.financial"),
    2: researchT("panels.ideaTest"),
    3: researchT("panels.resources")
  };
  const name = names[step] || researchT("panels.generic", { step });
  if (!isCurrentStep) return researchT("scroll.open", { name });
  return isLocked ? researchT("scroll.unlockName", { name }) : researchT("scroll.lockName", { name });
}

window.MentorResearchScroll = {
  getStep: getResearchScrollStepFromView,
  setStep: setResearchScrollStep,
  applyStep: applyResearchScrollStep,
  updateCounter: updateResearchScrollCounter,
  getLockedStep: () => researchViewState.lockedScrollStep,
  clearLock(view) {
    researchViewState.lockedScrollStep = 0;
    updateResearchScrollCounter(view, getResearchScrollStepFromView(view));
  },
  toggleLock(view) {
    const step = getResearchScrollStepFromView(view);
    researchViewState.lockedScrollStep = researchViewState.lockedScrollStep === step ? 0 : step;
    updateResearchScrollCounter(view, step);
  }
};

function updateReferenceFocusScroll(view) {
  if (!view?.classList?.contains("is-reference-focus")) return;
  const stage = view.querySelector("[data-research-scroll-stage]");
  if (!stage) return;
  if (researchViewState.lockedScrollStep) {
    setResearchScrollStep(view, researchViewState.lockedScrollStep);
    return;
  }
  const travel = Math.max(520, stage.clientHeight * 1.25);
  const focusScrollOffset = Number(stage.dataset.focusScrollOffset || stage.scrollTop || 0);
  const progress = Math.min(1, Math.max(0, focusScrollOffset / travel));
  const step = progress >= 0.72 ? 3 : progress >= 0.34 ? 2 : 1;
  applyResearchScrollStep(view, step, progress.toFixed(3));
}

function updateLinkedNoteScrollbar(list) {
  const wrap = list.closest(".research-linked-note-scroll");
  if (!wrap) return;
  const maxScroll = list.scrollHeight - list.clientHeight;
  const progress = maxScroll > 0 ? Math.min(100, Math.max(0, (list.scrollTop / maxScroll) * 100)) : 0;
  wrap.style.setProperty("--note-scroll-progress", progress + "%");
  wrap.classList.toggle("has-note-scroll", maxScroll > 2);
}

function addLinkedNote(root, button, actions = {}) {
  const editor = button.closest("[data-linked-notes-editor]");
  const directionId = editor?.dataset.directionId || button.dataset.directionId || "";
  const referenceId = editor?.dataset.referenceId || button.dataset.referenceId || "";
  if (!directionId || !referenceId || !editor) return;
  openLinkedNoteForm(root, editor, actions);
}

function openLinkedNoteForm(root, editor, actions = {}) {
  const view = editor.closest(".research-view") || document.body;
  const directionId = editor.dataset.directionId || "";
  const referenceId = editor.dataset.referenceId || "";
  const notes = collectLinkedNotesFromEditor(editor);

  const existingModal = view.querySelector("[data-linked-note-modal]");
  if (existingModal) {
    const cancelButton = existingModal.querySelector("[data-linked-note-cancel]");
    if (cancelButton) cancelButton.click();
    else {
      existingModal.remove();
      syncResearchModalLayer();
    }
  }

  view.insertAdjacentHTML("beforeend", renderLinkedNoteModal(notes.length + 1));
  const modal = view.querySelector("[data-linked-note-modal]");
  const form = modal?.querySelector("[data-linked-note-form]");
  if (!modal || !form) return;

  const closeModal = () => {
    document.removeEventListener("keydown", handleNoteModalKeydown);
    modal.remove();
    syncResearchModalLayer();
  };

  const handleNoteModalKeydown = (event) => {
    if (event.key === "Escape") closeModal();
  };

  modal.querySelectorAll("[data-linked-note-cancel]").forEach((cancelButton) => {
    cancelButton.addEventListener("click", closeModal);
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = form.elements.title?.value.trim();
    const body = form.elements.body?.value.trim() || "";
    if (!title) return;
    const nextNotes = [...collectLinkedNotesFromEditor(editor), {
      id: "note_" + Date.now(),
      title,
      body
    }];
    const saved = await actions.updateReference?.(directionId, referenceId, {
      notes: nextNotes,
      noteTitle: nextNotes[0]?.title || "",
      note: nextNotes[0]?.body || ""
    });
    closeModal();
    actions.refreshResearch?.();
  });
  form.elements.title?.focus();
  document.addEventListener("keydown", handleNoteModalKeydown);
  setResearchModalLayer(true);
}

function renderLinkedNoteModal(nextIndex) {
  return [
    '<div class="research-direction-modal research-linked-note-modal" data-linked-note-modal>',
    '  <form class="research-linked-note-form-panel" data-linked-note-form>',
    '    <div class="research-direction-modal-head">',
    '      <strong>' + escapeResearchHtml(researchT("noteForm.newTitle")) + "</strong>",
    '      <button class="research-direction-modal-close" type="button" data-linked-note-cancel aria-label="' + escapeResearchHtml(researchT("actions.close")) + '">x</button>',
    "    </div>",
    '    <label><span>' + escapeResearchHtml(researchT("noteForm.titleLabel")) + '</span><input name="title" type="text" placeholder="' + escapeResearchHtml(researchT("noteForm.titlePlaceholder", { number: nextIndex })) + '" autocomplete="off" required /></label>',
    '    <label><span>' + escapeResearchHtml(researchT("noteForm.bodyLabel")) + '</span><textarea name="body" rows="6" placeholder="' + escapeResearchHtml(researchT("noteForm.bodyPlaceholder")) + '"></textarea></label>',
    '    <div class="research-linked-note-form-actions">',
    '      <button class="research-secondary-btn muted" type="button" data-linked-note-cancel><span>' + escapeResearchHtml(researchT("actions.cancel")) + "</span></button>",
    '      <button class="research-primary-btn" type="submit"><span>' + escapeResearchHtml(researchT("actions.save")) + "</span></button>",
    "    </div>",
    "  </form>",
    "</div>"
  ].join("");
}

async function editLinkedNote(root, button, actions = {}) {
  const editor = button.closest("[data-linked-notes-editor]");
  const noteEditor = button.closest("[data-linked-note-editor]");
  const directionId = editor?.dataset.directionId || "";
  const referenceId = editor?.dataset.referenceId || "";
  const noteId = button.dataset.noteId || "";
  if (!directionId || !referenceId || !editor || !noteEditor || !noteId) return;
  const currentTitle = noteEditor.dataset.noteTitle || noteEditor.querySelector("summary span")?.textContent || "";
  const nextTitle = window.prompt(researchT("noteForm.renamePrompt"), currentTitle);
  if (nextTitle === null) return;
  const trimmedTitle = nextTitle.trim();
  if (!trimmedTitle) return;
  noteEditor.dataset.noteTitle = trimmedTitle;
  const titleLabel = noteEditor.querySelector("summary span");
  if (titleLabel) titleLabel.textContent = trimmedTitle;
  const notes = collectLinkedNotesFromEditor(editor).map((note) => {
    return note.id === noteId ? { ...note, title: trimmedTitle } : note;
  });
  const saved = await actions.updateReference?.(directionId, referenceId, {
    notes,
    noteTitle: notes[0]?.title || "",
    note: notes[0]?.body || ""
  });
  if (saved !== false) actions.refreshResearch?.();
}

async function deleteLinkedNote(root, button, actions = {}) {
  const editor = button.closest("[data-linked-notes-editor]");
  const directionId = editor?.dataset.directionId || "";
  const referenceId = editor?.dataset.referenceId || "";
  const noteId = button.dataset.noteId || "";
  if (!directionId || !referenceId || !editor || !noteId) return;
  const notes = collectLinkedNotesFromEditor(editor).filter((note) => note.id !== noteId);
  const saved = await actions.updateReference?.(directionId, referenceId, {
    notes,
    noteTitle: notes[0]?.title || "",
    note: notes[0]?.body || ""
  });
  if (saved !== false) actions.refreshResearch?.();
}

function bindLinkedNoteAutosave(root, actions = {}) {
  root.querySelectorAll("[data-linked-notes-editor]").forEach((editor) => {
    if (editor.dataset.autosaveBound === "true") return;
    editor.dataset.autosaveBound = "true";
    let saveTimer = null;
    const save = async () => {
      const directionId = editor.dataset.directionId || "";
      const referenceId = editor.dataset.referenceId || "";
      const notes = collectLinkedNotesFromEditor(editor);
      const card = root.querySelector('.research-reference-card[data-reference-id="' + cssEscapeResearchSelector(referenceId) + '"]');
      if (card) {
        card.dataset.referenceNoteTitle = notes[0]?.title || "";
        card.dataset.referenceNote = notes[0]?.body || "";
        const cardNoteTitle = card.querySelector("em");
        if (cardNoteTitle) cardNoteTitle.textContent = notes.length ? researchT("labels.noteCount", { count: notes.length }) : researchT("labels.noNotes");
      }
      await actions.updateReference?.(directionId, referenceId, {
        notes,
        noteTitle: notes[0]?.title || "",
        note: notes[0]?.body || ""
      });
    };
    editor.addEventListener("input", () => {
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(save, 350);
    });
    editor.addEventListener("change", save);
  });
}

function collectLinkedNotesFromEditor(editor) {
  return Array.from(editor.querySelectorAll("[data-linked-note-editor]")).map((noteEditor, index) => {
    return {
      id: noteEditor.dataset.noteId || "note_" + Date.now() + "_" + index,
      title: noteEditor.dataset.noteTitle || noteEditor.querySelector("summary span")?.textContent || researchT("noteForm.defaultTitle", { number: index + 1 }),
      body: noteEditor.querySelector('[name="note"]')?.value || ""
    };
  });
}

function syncResearchSummary(scope) {
  const summary = scope.querySelector(".research-hero-summary");
  const text = summary?.querySelector(".research-summary-text");
  const button = summary?.querySelector(".research-description-toggle");
  if (!summary || !text || !button || !summary.clientWidth) return;

  const fullText = summary._researchFullDescription ?? text.textContent;
  summary._researchFullDescription = fullText;
  text.textContent = fullText;
  button.hidden = true;

  const maxHeight = parseFloat(window.getComputedStyle(summary).maxHeight);
  const visibleHeight = Math.min(Number.isFinite(maxHeight) ? maxHeight : Infinity, summary.clientHeight);
  if (summary.scrollHeight <= visibleHeight + 1) return;

  button.hidden = false;
  const words = fullText.trim().split(/\s+/).filter(Boolean);
  let lower = 0;
  let upper = words.length;
  while (lower < upper) {
    const count = Math.ceil((lower + upper) / 2);
    text.textContent = (count ? words.slice(0, count).join(" ") : "") + "... ";
    if (summary.scrollHeight <= visibleHeight + 1) lower = count;
    else upper = count - 1;
  }
  text.textContent = (lower ? words.slice(0, lower).join(" ") : "") + "... ";
}

function bindResearchSummary(root) {
  root._researchSummaryResizeObserver?.disconnect();
  const row = root.querySelector(".research-detail-stage .research-summary-row");
  if (!row) return;
  syncResearchSummary(root);
  if (typeof ResizeObserver === "undefined") return;
  root._researchSummaryResizeObserver ||= new ResizeObserver(() => {
    const currentRow = root.querySelector(".research-detail-stage .research-summary-row");
    if (!currentRow || currentRow.clientWidth === root._researchSummaryWidth) return;
    root._researchSummaryWidth = currentRow.clientWidth;
    syncResearchSummary(root);
  });
  root._researchSummaryWidth = row.clientWidth;
  root._researchSummaryResizeObserver.observe(row);
}

function toggleResearchDescription(button) {
  const stage = button.closest(".research-detail-stage");
  if (!stage) return;
  const view = stage.closest(".research-view");

  const isOpen = stage.classList.toggle("is-description-open");
  button.setAttribute("aria-expanded", String(isOpen));
  const label = button.querySelector("span");
  const labelText = isOpen ? researchT("hero.hideDescription") : researchT("hero.showMore");
  if (label) {
    label.textContent = labelText;
  } else {
    button.textContent = labelText;
  }
  syncResearchSummary(stage);

  if (isOpen) {
    const dropdown = stage.querySelector("[data-research-description]");
    const height = dropdown ? dropdown.scrollHeight : 0;
    const space = height + 18 + "px";
    stage.style.setProperty("--research-description-space", space);
    view?.style.setProperty("--research-description-space", space);
  } else {
    stage.style.removeProperty("--research-description-space");
    view?.style.removeProperty("--research-description-space");
  }
}

function toggleResearchMetadata(button) {
  const stage = button.closest(".research-detail-stage");
  const metadata = stage?.querySelector("#researchIdeaMetadata");
  if (!metadata) return;
  researchViewState.metadataExpanded = metadata.hidden;
  metadata.hidden = !researchViewState.metadataExpanded;
  button.setAttribute("aria-expanded", String(researchViewState.metadataExpanded));
  window.requestAnimationFrame(() => window.dispatchEvent(new Event("mentor:research-layout-changed")));
}

function toggleReferenceFocus(root, button) {
  const view = root.querySelector(".research-view") || button.closest(".research-view") || root;
  const isFocused = !view.classList.contains("is-reference-focus");
  if (isFocused && !canUseReferenceFocus()) return;
  setReferenceFocus(view, isFocused);
  button.setAttribute("aria-pressed", String(isFocused));
  button.setAttribute("aria-label", isFocused ? researchT("actions.returnDetailPanel") : researchT("actions.enlargeReferencesNotes"));
  window.requestAnimationFrame(() => {
    bindReferenceScrollbars(view);
    bindLinkedNoteScrollbars(view);
    bindReferenceFocusScroll(view);
    if (isFocused) {
      const stage = view.querySelector("[data-research-scroll-stage]");
      if (stage) {
        const entryStep = researchViewState.focusReturnState?.entryStep || getResearchScrollStepFromView(view);
        stage.dataset.focusScrollOffset = String(getResearchScrollOffsetForStep(stage, entryStep));
      }
      updateReferenceFocusScroll(view);
    }
    view.querySelectorAll("[data-reference-list]").forEach(updateReferenceScrollbar);
    view.querySelectorAll("[data-linked-note-list]").forEach(updateLinkedNoteScrollbar);
    if (!isFocused) updateResearchScrollCounter(view, getResearchScrollStepFromView(view));
  });
}

function canUseReferenceFocus() {
  return !window.matchMedia("(max-width: 860px), (orientation: portrait)").matches;
}

function setReferenceFocus(view, isFocused) {
  if (isFocused && !canUseReferenceFocus()) isFocused = false;
  const currentStep = getResearchScrollStepFromView(view);
  if (isFocused && !researchViewState.isReferenceFocus) rememberReferenceFocusReturnState(view, currentStep);
  const returnState = !isFocused ? researchViewState.focusReturnState : null;
  const brainstormingView = document.getElementById("brainstormingView");
  researchViewState.isReferenceFocus = isFocused;
  view.classList.toggle("is-reference-focus", isFocused);
  if (!isFocused) {
    researchViewState.lockedScrollStep = 0;
    const exitStep = currentStep;
    brainstormingView?.classList.remove("research-sticky-active");
    brainstormingView?.classList.remove("research-nav-hidden");
    view.classList.remove("is-research-sticky");
    view.style.removeProperty("--research-freeze-stack-height");
    applyResearchScrollStep(view, exitStep, getResearchScrollProgressForStep(exitStep));
    const stage = view.querySelector("[data-research-scroll-stage]");
    if (stage) {
      stage.dataset.focusScrollOffset = String(getResearchScrollOffsetForStep(stage, exitStep));
    }
    restoreReferenceFocusScrollState(view, returnState);
    researchViewState.focusReturnState = null;
  }
  brainstormingView?.classList.toggle("research-reference-focus-active", isFocused);
}

function rememberReferenceFocusReturnState(view, step) {
  researchViewState.focusReturnState = {
    entryStep: getSafeResearchScrollStep(step),
    stageScrollTop: view.querySelector("[data-research-scroll-stage]")?.scrollTop || 0,
    referenceScrolls: Array.from(view.querySelectorAll("[data-reference-list]")).map((list) => ({
      left: list.scrollLeft || 0,
      top: list.scrollTop || 0
    })),
    noteScrolls: Array.from(view.querySelectorAll("[data-linked-note-list]")).map((list) => ({
      left: list.scrollLeft || 0,
      top: list.scrollTop || 0
    }))
  };
}

function restoreReferenceFocusScrollState(view, state) {
  if (!view || !state) return;
  const stage = view.querySelector("[data-research-scroll-stage]");
  if (stage) stage.scrollTop = Number(state.stageScrollTop || 0);
  view.querySelectorAll("[data-reference-list]").forEach((list, index) => {
    const saved = state.referenceScrolls?.[index];
    if (!saved) return;
    list.scrollLeft = Number(saved.left || 0);
    list.scrollTop = Number(saved.top || 0);
    updateReferenceScrollbar(list);
  });
  view.querySelectorAll("[data-linked-note-list]").forEach((list, index) => {
    const saved = state.noteScrolls?.[index];
    if (!saved) return;
    list.scrollLeft = Number(saved.left || 0);
    list.scrollTop = Number(saved.top || 0);
    updateLinkedNoteScrollbar(list);
  });
}

function setActiveResearchDirection(ideaId, directionId) {
  if (ideaId && directionId) researchViewState.activeDirectionByIdea[ideaId] = directionId;
}

function openResearchDirectionForm(button, actions = {}, direction = null) {
  const view = button.closest(".research-view") || document.body;
  const existingModal = view.querySelector("[data-research-direction-modal]");
  if (existingModal) {
    const cancelButton = existingModal.querySelector("[data-research-direction-cancel]");
    if (cancelButton) cancelButton.click();
    else {
      existingModal.remove();
      syncResearchModalLayer();
    }
  }
  view.insertAdjacentHTML("beforeend", renderResearchDirectionModal(direction));

  const modal = view.querySelector("[data-research-direction-modal]");
  const form = modal?.querySelector("[data-research-direction-form]");
  if (!form) return;

  const stopModalEvent = (event) => {
    event.stopPropagation();
  };

  const closeModal = () => {
    modal?.remove();
    syncResearchModalLayer();
  };

  modal.addEventListener("click", stopModalEvent);
  modal.addEventListener("mousedown", stopModalEvent);
  modal.addEventListener("pointerdown", stopModalEvent);
  form.addEventListener("click", stopModalEvent);
  form.addEventListener("mousedown", stopModalEvent);
  form.addEventListener("pointerdown", stopModalEvent);
  modal.querySelector("[data-research-direction-cancel]")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeModal();
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const form = event.currentTarget;
    const title = form.elements.title?.value.trim();
    const category = form.elements.category?.value || "";
    const subcategory = form.elements.subcategory?.value || "";
    const type = category && subcategory ? category + ":" + subcategory : category;
    const icon = form.elements.icon?.value || "compass";
    if (!title) return;
    const saved = direction?.id
      ? await actions.updateDirection?.(direction.id, { title, type, icon })
      : await actions.addDirection?.({ title, type, icon });
    if (saved !== false) closeModal();
  });
  bindResearchDirectionCategoryForm(form, direction?.type || "", direction?.icon || "");
  form.elements.title?.focus();
  setResearchModalLayer(true);
}

function openResearchReferenceForm(button, actions = {}, reference = null, parentKeyOverride = "", canvasPositionOverride = null, connectionSidesOverride = null) {
  const view = button.closest(".research-view") || document.body;
  const directionId = button.dataset.directionId || getActiveResearchDirection(researchViewState.currentIdea || {})?.id || "";
  const cardType = reference?.cardType || button.dataset.cardType || "link";
  const canvasParentKey = reference?.canvasParentKey || parentKeyOverride || button.dataset.parentKey || (!reference ? view.querySelector("[data-research-canvas-preview]")?.dataset.cardKey : "") || "";
  if (!reference) snapshotResearchCanvasFocusPositions(view);
  const canvasPosition = reference?.canvasPosition || canvasPositionOverride || (canvasParentKey ? getResearchCanvasChildPosition(view, canvasParentKey) : null);
  const existingModal = view.querySelector("[data-research-reference-modal]");
  if (existingModal) {
    const cancelButton = existingModal.querySelector("[data-research-reference-cancel]");
    if (cancelButton) cancelButton.click();
    else {
      existingModal.remove();
      syncResearchModalLayer();
    }
  }
  view.insertAdjacentHTML("beforeend", renderResearchReferenceModal(reference, cardType));

  const modal = view.querySelector("[data-research-reference-modal]");
  const form = modal?.querySelector("[data-research-reference-form]");
  if (!form) return;
  bindResearchDraggableForm(modal, form);
  populateResearchReferenceForm(form, reference);

  const stopModalEvent = (event) => {
    event.stopPropagation();
  };

  const closeModal = () => {
    modal?.remove();
    syncResearchModalLayer();
  };

  modal.addEventListener("click", stopModalEvent);
  modal.addEventListener("mousedown", stopModalEvent);
  modal.addEventListener("pointerdown", stopModalEvent);
  form.addEventListener("click", stopModalEvent);
  form.addEventListener("mousedown", stopModalEvent);
  form.addEventListener("pointerdown", stopModalEvent);
  modal.querySelectorAll("[data-research-reference-cancel]").forEach((cancelButton) => {
    cancelButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeModal();
    });
  });
  bindResearchReferenceLinkInputs(form);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const imageFile = form.elements.imageFile?.files?.[0];
    const uploadedImage = imageFile ? await readResearchFileAsDataUrl(imageFile) : "";
    const referenceId = reference?.id || "reference_" + Date.now();
    const links = Array.from(form.querySelectorAll('[name="link"]'))
      .map((input) => input.value.trim())
      .filter(Boolean);
    const originalLinks = getResearchReferenceLinks(reference?.link);
    const linksUnchanged = Boolean(reference?.id) && links.length === originalLinks.length && links.every((link, index) => link === originalLinks[index]);
    researchViewState.activeReferenceByDirection[directionId] = referenceId;
    const nextReference = {
      id: referenceId,
      title: form.elements.title?.value.trim() || "",
      link: linksUnchanged ? reference.link : links.join("\n"),
      image: uploadedImage || form.elements.imageUrl?.value.trim() || reference?.image || "",
      unitType: form.elements.unitType?.value || "",
      unitValue: form.elements.unitValue?.value.trim() || "",
      unitCustom: form.elements.unitCustom?.value.trim() || "",
      unitLabel: getReferenceUnitOption(form.elements.unitType?.value || "")?.label || "",
      unitSystem: getReferenceUnitSystem(form.elements.unitType?.value || ""),
      noteTitle: form.elements.noteTitle?.value.trim() || "",
      note: form.elements.note?.value.trim() || "",
      cardType: form.elements.cardType?.value || cardType,
      canvasParentKey,
      canvasConnectionSides: reference?.canvasConnectionSides || connectionSidesOverride || undefined,
      canvasPosition
    };
    const existingNotes = getReferenceNotes(reference);
    if (reference?.id && existingNotes.length) {
      nextReference.notes = existingNotes.map((note, index) => index === 0 ? { ...note, title: nextReference.noteTitle, body: nextReference.note } : note);
    } else if (nextReference.noteTitle || nextReference.note) {
      nextReference.notes = [{
        id: "note_" + Date.now(),
        title: nextReference.noteTitle || researchT("noteForm.defaultTitle", { number: 1 }),
        body: nextReference.note || ""
      }];
    }
    let saved;
    if (reference?.id) {
      saved = await actions.updateReference?.(directionId, reference.id, nextReference);
      if (saved !== false) actions.refreshResearch?.();
    } else {
      saved = await actions.addReference?.(directionId, nextReference);
    }
    if (saved !== false) closeModal();
  });
  form.elements.title?.focus();
  setResearchModalLayer(true);
}

function bindResearchReferenceLinkInputs(form) {
  const addButton = form.querySelector("[data-add-reference-link]");
  if (!addButton) return;
  addButton.addEventListener("click", () => {
    let nextInput = form.querySelector(".research-reference-link-field.is-hidden");
    if (!nextInput) {
      const index = form.querySelectorAll(".research-reference-link-field").length + 1;
      addButton.insertAdjacentHTML("beforebegin", renderReferenceLinkInput(index, "", false));
      nextInput = addButton.previousElementSibling;
    }
    nextInput.classList.remove("is-hidden");
    nextInput.querySelector("input")?.focus();
  });
  form.querySelectorAll(".research-reference-link-field").forEach((field, index) => {
    const input = field.querySelector("input");
    if (index > 0 && input?.value) field.classList.remove("is-hidden");
  });
}

function populateResearchReferenceForm(form, reference = null) {
  if (!reference) return;
  const firstNote = getReferenceNotes(reference)[0];
  if (form.elements.title) form.elements.title.value = reference.title || "";
  if (form.elements.imageUrl && reference.image && !String(reference.image).startsWith("data:")) {
    form.elements.imageUrl.value = reference.image;
  }
  if (form.elements.unitType) form.elements.unitType.value = reference.unitType || "";
  if (form.elements.unitValue) form.elements.unitValue.value = reference.unitValue || "";
  if (form.elements.unitCustom) form.elements.unitCustom.value = reference.unitCustom || "";
  if (form.elements.noteTitle) form.elements.noteTitle.value = firstNote?.title || reference.noteTitle || "";
  if (form.elements.note) form.elements.note.value = firstNote?.body ?? reference.note ?? "";
}

function readResearchFileAsDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => resolve(""));
    reader.readAsDataURL(file);
  });
}

function bindResearchDirectionCategoryForm(form, selectedType = "", selectedIcon = "") {
  const categorySelect = form.elements.category;
  const subcategorySelect = form.elements.subcategory;
  if (!categorySelect || !subcategorySelect) return;
  const [selectedCategory, selectedSubcategory] = String(selectedType || "").split(":");
  if (selectedCategory) categorySelect.value = selectedCategory;
  if (selectedIcon) form.dataset.directionIconTouched = "true";
  else delete form.dataset.directionIconTouched;

  const renderOptions = () => {
    const category = researchDirectionTypeOptions.find((item) => item.value === categorySelect.value) || researchDirectionTypeOptions[0];
    subcategorySelect.innerHTML = category.options
      .map(([value, label]) => '<option value="' + value + '"' + (value === selectedSubcategory ? " selected" : "") + ">" + escapeResearchHtml(getResearchDirectionSubcategoryLabel(value, label)) + "</option>")
      .join("");
    const defaultIcon = normalizeResearchIconName(category.icons[0]) || "compass";
    const currentIcon = normalizeResearchIconName(form.elements.icon?.value);
    if (!currentIcon || form.dataset.directionIconTouched !== "true") setResearchDirectionIcon(form, selectedIcon || defaultIcon);
  };

  categorySelect.addEventListener("change", renderOptions);
  renderOptions();
  bindResearchDirectionIconPicker(form, selectedIcon || form.elements.icon?.value || "compass");
}

function captureResearchVideoPoster(file) {
  return new Promise((resolve) => {
    if (!file || !window.URL?.createObjectURL) return resolve("");
    const url = window.URL.createObjectURL(file);
    const video = document.createElement("video");
    let finished = false;
    const finish = (image = "") => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      window.URL.revokeObjectURL(url);
      resolve(image);
    };
    const timer = window.setTimeout(() => finish(), 6000);
    video.muted = true;
    video.preload = "auto";
    video.addEventListener("loadeddata", () => {
      try {
        const width = Math.min(480, video.videoWidth || 0);
        if (!width) return finish();
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = Math.max(1, Math.round(width * video.videoHeight / video.videoWidth));
        canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
        finish(canvas.toDataURL("image/jpeg", 0.72));
      } catch (error) { finish(); }
    }, { once: true });
    video.addEventListener("error", () => finish(), { once: true });
    video.src = url;
    video.load();
  });
}

function normalizeResearchIdea(idea) {
  const statusLabels = {
    seed: researchT("status.seed"),
    path: researchT("status.path"),
    build: researchT("status.build"),
    archived: researchT("status.archived")
  };
  const status = ["seed", "path", "build", "archived"].includes(idea.status) ? idea.status : "path";
  const tags = uniqueResearchTags([...(idea.tags || []), idea.type || "Ideja"]);

  return {
    ...researchIdea,
    ...idea,
    tags: tags.length ? tags : researchIdea.tags,
    statusLabel: statusLabels[status] || researchIdea.status,
    priority: idea.priority || researchIdea.priority,
    subtitle: idea.type ? idea.type + " " + researchT("labels.ideaSuffix") : researchT("hero.subtitle"),
    createdAt: idea.createdAt || researchIdea.createdAt,
    updatedAt: idea.pathData?.updatedAt || idea.updatedAt || researchIdea.updatedAt
  };
}

function uniqueResearchTags(tags) {
  return window.MentorResearchModel.uniqueTags(tags);
}

function formatResearchDate(value) {
  if (!value) return researchT("labels.notRecorded");
  if (/^\d{2}\.\d{2}\.\d{4}\.$/.test(String(value))) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  if (window.MentorI18n?.formatters?.date) return window.MentorI18n.formatters.date.format(date);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return day + "." + month + "." + date.getFullYear() + ".";
}

function cssResearchImageUrl(value) {
  const image = getResearchImageSrc(value).replace(/"/g, "%22");
  return 'url("' + image + '")';
}

function getResearchImageSrc(value) {
  return String(value || "icons/mentor-panel-bg.png").replace(/\\/g, "/");
}

function renderResearchPanel(title, body, className, titleKey) {
  const hasRichTitle = className === "research-test-panel" && String(title).includes("<");
  const titleHtml = hasRichTitle
    ? title
    : escapeResearchHtml(title);
  const titleAttr = titleKey && !hasRichTitle ? '' : "";
  return '<article class="research-panel ' + className + '"><h3' + titleAttr + '>' + titleHtml + "</h3>" + body + "</article>";
}

function renderTagBadge(tag) {
  return '<span class="research-tag">' + escapeResearchHtml(tag) + "</span>";
}

function getResearchDirections(idea = researchIdea) {
  return window.MentorResearchModel.getDirections(idea);
}

function getActiveResearchDirection(idea = researchIdea) {
  const directions = getResearchDirections(idea);
  if (!directions.length) return null;
  const ideaId = idea.id || idea.title || "research";
  const activeId = researchViewState.activeDirectionByIdea[ideaId];
  return directions.find((direction) => direction.id === activeId) || directions[0];
}

function getDirectionReferences(direction) {
  return window.MentorResearchModel.getDirectionReferences(direction);
}

function getReferenceNotes(reference) {
  return window.MentorResearchModel.getReferenceNotes(reference, researchT);
}

function getActiveDirectionReference(direction) {
  const references = getDirectionReferences(direction);
  if (!references.length) return null;
  const activeId = researchViewState.activeReferenceByDirection[direction?.id || ""];
  return references.find((reference) => reference.id === activeId) || references[0];
}

function getDefaultReferenceTitle(direction, index) {
  return researchT("referenceForm.defaultTitle", { direction: direction?.title || researchT("labels.directionLower"), number: index });
}

function renderResearchDirectionTile(direction, isActive = false, idea = researchIdea) {
  return [
    '<div class="research-direction-tile saved ' + (isActive ? "active" : "") + '" data-direction-id="' + escapeResearchHtml(direction.id || "") + '" data-idea-id="' + escapeResearchHtml(idea.id || idea.title || "research") + '">',
    '  <button class="research-direction-select" type="button" data-research-action="select-direction" data-direction-id="' + escapeResearchHtml(direction.id || "") + '" aria-pressed="' + String(isActive) + '" title="' + escapeResearchHtml(direction.title || researchT("labels.direction")) + '">',
    '    <span class="research-direction-tabler-icon" aria-hidden="true">' + renderResearchTablerIcon(direction.icon || "compass") + "</span>",
    "    <span class=\"research-direction-name\">" + escapeResearchHtml(direction.title || researchT("labels.direction")) + "</span>",
    "  </button>",
    '  <button class="research-direction-edit" type="button" data-research-action="edit-direction" data-direction-id="' + escapeResearchHtml(direction.id || "") + '" data-direction-title="' + escapeResearchHtml(direction.title || "") + '" data-direction-type="' + escapeResearchHtml(direction.type || "") + '" data-direction-icon="' + escapeResearchHtml(direction.icon || "compass") + '" aria-label="' + escapeResearchHtml(researchT("directionForm.editAria")) + '">✎</button>',
    '  <button class="research-direction-delete" type="button" data-research-action="delete-direction" data-direction-id="' + escapeResearchHtml(direction.id || "") + '" aria-label="' + escapeResearchHtml(researchT("directionForm.deleteAria")) + '">x</button>',
    "</div>"
  ].join("");
}

function renderResearchDirectionFormTile() {
  const defaultIcon = researchDirectionTypeOptions[0].icons[0] || "compass";
  return [
    '<form class="research-direction-form-tile" data-research-direction-form>',
    '  <div class="research-direction-form-top">',
    '    <input name="title" type="text" placeholder="' + escapeResearchHtml(researchT("directionForm.titlePlaceholder")) + '" autocomplete="off" />',
    '    <select name="category" aria-label="' + escapeResearchHtml(researchT("directionForm.categoryAria")) + '">',
    researchDirectionTypeOptions.map((item) => '<option value="' + item.value + '">' + escapeResearchHtml(getResearchDirectionCategoryLabel(item)) + "</option>").join(""),
    "    </select>",
    '    <select name="subcategory" aria-label="' + escapeResearchHtml(researchT("directionForm.subcategoryAria")) + '"></select>',
    '    <button type="submit"><span>' + escapeResearchHtml(researchT("actions.save")) + "</span></button>",
    "  </div>",
    renderResearchDirectionIconPicker(defaultIcon),
    "</form>"
  ].join("");
}

function renderResearchDirectionModal(direction = null) {
  const [categoryKey] = String(direction?.type || "").split(":");
  const selectedIcon = direction?.icon || researchDirectionTypeOptions[0].icons[0] || "compass";
  return [
    '<div class="research-direction-modal" data-research-direction-modal>',
    '  <form class="research-direction-form-tile research-direction-modal-panel" data-research-direction-form>',
    '    <div class="research-direction-modal-head">',
    "      <strong>" + escapeResearchHtml(direction?.id ? researchT("directionForm.editTitle") : researchT("directionForm.newTitle")) + "</strong>",
    '      <button class="research-direction-modal-close" type="button" data-research-direction-cancel aria-label="' + escapeResearchHtml(researchT("actions.close")) + '">x</button>',
    "    </div>",
    '    <div class="research-direction-form-top">',
    '      <input name="title" type="text" placeholder="' + escapeResearchHtml(researchT("directionForm.titlePlaceholder")) + '" autocomplete="off" value="' + escapeResearchHtml(direction?.title || "") + '" />',
    '      <select name="category" aria-label="' + escapeResearchHtml(researchT("directionForm.categoryAria")) + '">',
    researchDirectionTypeOptions.map((item) => '<option value="' + item.value + '"' + (item.value === categoryKey ? " selected" : "") + ">" + escapeResearchHtml(getResearchDirectionCategoryLabel(item)) + "</option>").join(""),
    "      </select>",
    '      <select name="subcategory" aria-label="' + escapeResearchHtml(researchT("directionForm.subcategoryAria")) + '"></select>',
    '      <button type="submit"><span>' + escapeResearchHtml(researchT("actions.save")) + "</span></button>",
    "    </div>",
    renderResearchDirectionIconPicker(selectedIcon),
    "  </form>",
    "</div>"
  ].join("");
}

function renderResearchReferenceModal(reference = null, cardType = "link") {
  const links = getResearchReferenceLinks(reference?.link);
  return [
    '<div class="research-direction-modal research-reference-modal" data-research-reference-modal>',
    '  <form class="research-reference-form-panel" data-research-reference-form>',
    '    <input type="hidden" name="cardType" value="' + escapeResearchHtml(cardType) + '" />',
    '    <div class="research-direction-modal-head">',
    "      <strong>" + escapeResearchHtml(reference?.id ? researchT("referenceForm.editTitle") : researchT("referenceForm.newTitle")) + "</strong>",
    '      <button class="research-direction-modal-close" type="button" data-research-reference-cancel aria-label="' + escapeResearchHtml(researchT("actions.close")) + '">x</button>',
    "    </div>",
    '    <div class="research-reference-form-grid">',
    '      <label><span>' + escapeResearchHtml(researchT("referenceForm.titleLabel")) + '</span><input name="title" type="text" placeholder="' + escapeResearchHtml(researchT("referenceForm.titlePlaceholder")) + '" autocomplete="off" value="' + escapeResearchHtml(reference?.title || "") + '" /></label>',
    '      <div class="research-reference-link-fields">',
    Array.from({ length: Math.max(4, links.length + 1) }, (_, index) => renderReferenceLinkInput(index + 1, links[index] || "", index > 0 && !links[index])).join(""),
    '        <button class="research-reference-add-link" type="button" data-add-reference-link><span>' + escapeResearchHtml(researchT("referenceForm.addLink")) + "</span></button>",
    "      </div>",
    '      <label><span>' + escapeResearchHtml(researchT("referenceForm.unitsLabel")) + '</span><select name="unitType">' + renderReferenceUnitOptions(reference?.unitType || "") + "</select></label>",
    '      <label><span>' + escapeResearchHtml(researchT("referenceForm.unitValueLabel")) + '</span><input name="unitValue" type="text" inputmode="decimal" placeholder="' + escapeResearchHtml(researchT("referenceForm.unitValuePlaceholder")) + '" autocomplete="off" value="' + escapeResearchHtml(reference?.unitValue || "") + '" /></label>',
    '      <label class="wide research-reference-custom-unit"><span>' + escapeResearchHtml(researchT("referenceForm.customUnitLabel")) + '</span><input name="unitCustom" type="text" placeholder="' + escapeResearchHtml(researchT("referenceForm.customUnitPlaceholder")) + '" autocomplete="off" value="' + escapeResearchHtml(reference?.unitCustom || "") + '" /></label>',
    '      <label><span>' + escapeResearchHtml(researchT("referenceForm.imageLinkLabel")) + '</span><input name="imageUrl" type="url" placeholder="https://..." autocomplete="off" value="' + escapeResearchHtml(reference?.image && !String(reference.image).startsWith("data:") ? reference.image : "") + '" /></label>',
    '      <label><span>' + escapeResearchHtml(researchT("referenceForm.imageUploadLabel")) + '</span><input name="imageFile" type="file" accept="image/*" /></label>',
    '      <label><span>' + escapeResearchHtml(researchT("referenceForm.noteTitleLabel")) + '</span><input name="noteTitle" type="text" placeholder="' + escapeResearchHtml(researchT("labels.note")) + '" autocomplete="off" /></label>',
    '      <label class="wide"><span>' + escapeResearchHtml(researchT("referenceForm.noteBodyLabel")) + '</span><textarea name="note" rows="5" placeholder="' + escapeResearchHtml(researchT("referenceForm.noteBodyPlaceholder")) + '"></textarea></label>',
    "    </div>",
    '    <div class="research-reference-form-actions">',
    '      <button class="research-secondary-btn muted" type="button" data-research-reference-cancel><span>' + escapeResearchHtml(researchT("actions.cancel")) + "</span></button>",
    '      <button class="research-primary-btn" type="submit"><span>' + escapeResearchHtml(researchT("actions.save")) + "</span></button>",
    "    </div>",
    "  </form>",
    "</div>"
  ].join("");
}

function renderReferenceUnitOptions(selectedValue = "") {
  return [
    '<option value="">' + escapeResearchHtml(researchT("referenceForm.noUnits")) + "</option>",
    researchReferenceUnitGroups.map((group) => (
      '<optgroup label="' + escapeResearchHtml(group.label) + '">' +
      group.options.map((option) => '<option value="' + escapeResearchHtml(option.value) + '"' + (option.value === selectedValue ? " selected" : "") + ">" + escapeResearchHtml(option.label) + "</option>").join("") +
      "</optgroup>"
    )).join("")
  ].join("");
}

function renderReferenceLinkInput(index, value, isHidden) {
  return '        <label class="research-reference-link-field' + (isHidden ? " is-hidden" : "") + '"><span>' + escapeResearchHtml(researchT("referenceForm.linkLabel", { number: index })) + '</span><input name="link" type="url" placeholder="https://..." autocomplete="off" value="' + escapeResearchHtml(value || "") + '" /></label>';
}

function normalizeResearchIconName(icon) {
  return String(icon || "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
}

function getResearchDirectionIconOptions() {
  const categoryIcons = researchDirectionTypeOptions.flatMap((category) => category.icons || []);
  const systemIcons = Array.isArray(window.MentorIconSystem?.allIcons) ? window.MentorIconSystem.allIcons : [];
  return Array.from(new Set([...categoryIcons, ...systemIcons, "compass", "target", "lightbulb", "map", "rocket"]
    .map(normalizeResearchIconName)
    .filter(Boolean))).sort();
}

function renderResearchDirectionIconPicker(selectedIcon = "compass") {
  const icon = normalizeResearchIconName(selectedIcon) || "compass";
  return [
    '  <label class="research-direction-symbol-field">',
    '    <span>' + escapeResearchHtml(researchT("directionForm.iconLabel")) + "</span>",
    '    <div class="research-direction-symbol-picker" data-direction-icon-picker>',
    '      <i class="research-direction-symbol-preview" data-direction-icon-preview aria-hidden="true">' + renderResearchTablerIcon(icon) + "</i>",
    '      <input name="iconSearch" type="search" placeholder="' + escapeResearchHtml(researchT("directionForm.iconSearchPlaceholder")) + '" autocomplete="off" value="' + escapeResearchHtml(icon) + '" data-direction-icon-search />',
    '      <input name="icon" type="hidden" value="' + escapeResearchHtml(icon) + '" data-direction-icon-value />',
    "    </div>",
    '    <div class="research-direction-symbol-results hidden" data-direction-icon-results role="listbox"></div>',
    "  </label>"
  ].join("");
}

function setResearchDirectionIcon(form, icon) {
  const nextIcon = normalizeResearchIconName(icon) || "compass";
  const search = form.querySelector("[data-direction-icon-search]");
  const input = form.querySelector("[data-direction-icon-value]");
  const preview = form.querySelector("[data-direction-icon-preview]");
  if (search) search.value = nextIcon;
  if (input) input.value = nextIcon;
  if (preview) preview.innerHTML = renderResearchTablerIcon(nextIcon);
}

function renderResearchDirectionIconResults(form) {
  const search = form.querySelector("[data-direction-icon-search]");
  const results = form.querySelector("[data-direction-icon-results]");
  if (!search || !results) return;
  const options = window.MentorIconSystem?.searchIcons
    ? window.MentorIconSystem.searchIcons(search.value, 48)
    : getResearchDirectionIconOptions().filter((icon) => icon.includes(normalizeResearchIconName(search.value))).slice(0, 48);

  results.innerHTML = options.map((icon) => [
    '<button type="button" role="option" data-direction-icon-option="' + escapeResearchHtml(icon) + '">',
    '  <span aria-hidden="true">' + renderResearchTablerIcon(icon) + "</span>",
    "  <small>" + escapeResearchHtml(getDirectionIconLabel(icon)) + "</small>",
    "</button>"
  ].join("")).join("");
  results.classList.toggle("hidden", !options.length);
}

function bindResearchDirectionIconPicker(form, selectedIcon = "") {
  const search = form.querySelector("[data-direction-icon-search]");
  const input = form.querySelector("[data-direction-icon-value]");
  const results = form.querySelector("[data-direction-icon-results]");
  if (!search || !input) return;

  setResearchDirectionIcon(form, selectedIcon || input.value || "compass");

  search.addEventListener("focus", () => {
    search.value = "";
    renderResearchDirectionIconResults(form);
    window.MentorIconSystem?.ensureIconIndex?.()?.then(() => {
      if (document.activeElement === search) renderResearchDirectionIconResults(form);
    });
  });
  search.addEventListener("input", () => {
    renderResearchDirectionIconResults(form);
  });
  search.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      search.value = input.value;
      results?.classList.add("hidden");
      return;
    }
    if (event.key !== "Enter") return;
    const firstResult = results?.querySelector("[data-direction-icon-option]");
    if (!firstResult) return;
    event.preventDefault();
    form.dataset.directionIconTouched = "true";
    setResearchDirectionIcon(form, firstResult.dataset.directionIconOption);
    results?.classList.add("hidden");
  });
  results?.addEventListener("mousedown", (event) => {
    event.preventDefault();
    const option = event.target.closest("[data-direction-icon-option]");
    if (!option) return;
    form.dataset.directionIconTouched = "true";
    setResearchDirectionIcon(form, option.dataset.directionIconOption);
    results.classList.add("hidden");
    search.focus();
  });
  search.addEventListener("blur", () => {
    window.setTimeout(() => {
      results?.classList.add("hidden");
      search.value = input.value;
    }, 140);
  });
}

function renderDirectionIconChoice(icon, isChecked) {
  return [
    '<label class="research-direction-icon-choice">',
    '  <input name="icon" type="radio" value="' + icon + '"' + (isChecked ? " checked" : "") + " />",
    '  <span aria-hidden="true">' + renderResearchTablerIcon(icon) + "</span>",
    "  <small>" + escapeResearchHtml(getDirectionIconLabel(icon)) + "</small>",
    "</label>"
  ].join("");
}

function getDirectionIconLabel(value) {
  const key = "directionForm.iconNames." + value;
  const translated = researchT(key);
  if (translated !== key && translated !== "research." + key) return translated;
  return window.MentorIconSystem?.labelForIcon(value) || value;
}

function getResearchDirectionCategoryLabel(category) {
  if (!category) return "";
  const key = "directionForm.categories." + category.value;
  const translated = researchT(key);
  return translated === key || translated === "research." + key ? category.label : translated;
}

function getResearchDirectionSubcategoryLabel(value, fallback = value) {
  const key = "directionForm.subcategories." + value;
  const translated = researchT(key);
  return translated === key || translated === "research." + key ? fallback : translated;
}

function getResearchDirectionTypeLabel(value) {
  const [categoryKey, subcategoryKey] = String(value || "").split(":");
  const category = researchDirectionTypeOptions.find((item) => item.value === categoryKey);
  const subcategory = category?.options.find(([key]) => key === subcategoryKey);
  return subcategory ? getResearchDirectionSubcategoryLabel(subcategory[0], subcategory[1]) : (category ? getResearchDirectionCategoryLabel(category) : value);
}

function getReferenceUnitOption(value) {
  if (!value) return null;
  for (const group of researchReferenceUnitGroups) {
    const option = group.options.find((item) => item.value === value);
    if (option) return option;
  }
  return null;
}

function getReferenceUnitDisplay(reference = {}) {
  const value = String(reference.unitValue || "").trim();
  if (!value) return "";
  const option = getReferenceUnitOption(reference.unitType);
  const custom = String(reference.unitCustom || "").trim();
  if (reference.unitType === "custom") return custom ? value + " " + custom : value;
  if (!option?.suffix) return value;
  return value.match(/[^\d\s.,-]$/) ? value : value + " " + option.suffix;
}

function getReferenceUnitSystem(unitType) {
  return getReferenceUnitOption(unitType)?.system || "";
}

function renderResearchTablerIcon(name) {
  if (window.MentorIconSystem) return window.MentorIconSystem.renderIcon(name, "research-external-icon");

  const paths = {
    apple: '<path d="M4 11.3c0 3.1 .4 5.3 2.2 8c1.4 1.8 3.2 2.2 5.1 1c.4 -.3 1 -.3 1.4 0c1.9 1.2 3.7 .8 5.1 -1c1.8 -2.7 2.2 -4.9 2.2 -8c0 -2.6 -2 -5.3 -4.4 -5.3c-1.3 0 -2.4 .7 -3.2 1.4a.5 .5 0 0 1 -.7 0c-.8 -.7 -2 -1.4 -3.2 -1.4c-2.5 0 -4.6 2.7 -4.6 5.3z"/><path d="M12 7c0 -1.2 .9 -4 3 -4"/><path d="M7 12c0 -1.5 .5 -2.3 1.5 -3"/>',
    dumbbell: '<path d="M6.5 6.5l11 11"/><path d="M21 21l-1.5 -1.5"/><path d="M3 3l1.5 1.5"/><path d="M18 22l4 -4"/><path d="M2 6l4 -4"/><path d="M3 10l7 -7"/><path d="M14 21l7 -7"/>',
    run: '<path d="M13 4a1 1 0 1 0 0 -2a1 1 0 0 0 0 2z"/><path d="M4 17l5 -1l1 -5"/><path d="M15 21l-3 -4l-3 -1"/><path d="M12 11l3 3l4 1"/><path d="M10 6l2 1l4 0"/>',
    barbell: '<path d="M2 12h20"/><path d="M6 8v8"/><path d="M9 7v10"/><path d="M15 7v10"/><path d="M18 8v8"/>',
    bed: '<path d="M4 13v-6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v6"/><path d="M4 13h16v6"/><path d="M4 19v-6"/><path d="M8 11h4"/>',
    repeat: '<path d="M4 12a8 8 0 0 1 13 -6"/><path d="M17 3v4h-4"/><path d="M20 12a8 8 0 0 1 -13 6"/><path d="M7 21v-4h4"/>',
    wallet: '<path d="M17 8v-2a2 2 0 0 0 -2 -2h-10a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2 -2v-8a2 2 0 0 0 -2 -2h-12a2 2 0 0 1 0 -4h10"/><path d="M17 14h.01"/>',
    book: '<path d="M3 19a2 2 0 0 1 2 -2h14"/><path d="M5 2h14v20h-14a2 2 0 0 1 -2 -2v-16a2 2 0 0 1 2 -2z"/>',
    briefcase: '<path d="M3 7h18v11a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z"/><path d="M8 7v-2a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>',
    heart: '<path d="M19.5 12.6l-7.5 7.4l-7.5 -7.4a5 5 0 1 1 7.5 -6.6a5 5 0 1 1 7.5 6.6"/>',
    home: '<path d="M5 12l7 -7l7 7"/><path d="M5 12v7h14v-7"/><path d="M10 19v-5h4v5"/>',
    plane: '<path d="M16 10l4 -4"/><path d="M3 21l18 -18"/><path d="M15 4l6 -1l-1 6"/><path d="M4 13l5 2l2 5l2 -7l7 -7"/>',
    palette: '<path d="M12 21a9 9 0 1 1 8.7 -6.7a2.5 2.5 0 0 1 -2.4 3.2h-1.8a2 2 0 0 0 -1.7 3a9 9 0 0 1 -2.8 .5z"/><path d="M7.5 10.5h.01"/><path d="M10.5 7.5h.01"/><path d="M14.5 7.5h.01"/><path d="M16.5 11.5h.01"/>',
    compass: '<path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M14.8 9.2l-1.8 4l-4 1.8l1.8 -4z"/>'
  };
  if (paths[name]) return '<svg viewBox="0 0 24 24" aria-hidden="true">' + paths[name] + "</svg>";
  return '<span class="research-external-tabler-icon" style="--tabler-icon-url: url(&quot;' + getTablerIconUrl(name) + '&quot;)" aria-hidden="true"></span>';
}

function getTablerIconUrl(name) {
  const safeName = String(name || "compass").replace(/[^a-z0-9-]/gi, "").toLowerCase();
  return "https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/outline/" + safeName + ".svg";
}

function renderMetaLine(label, value, tone, labelKey) {
  const labelAttr = labelKey ? '' : "";
  return [
    '<div class="research-meta-line ' + (tone || "") + '">',
    '  <span class="research-icon-box" aria-hidden="true"></span>',
    "  <small" + labelAttr + ">" + escapeResearchHtml(label) + "</small>",
    "  <strong>" + escapeResearchHtml(value) + "</strong>",
    "</div>"
  ].join("");
}

function renderDirectionTile(label, isActive) {
  return [
    '<button class="research-direction-tile ' + (isActive ? "active" : "") + '" type="button">',
    '  <span class="research-direction-icon" aria-hidden="true"></span>',
    "  <span>" + escapeResearchHtml(label) + "</span>",
    "</button>"
  ].join("");
}

function renderAddDirectionTile() {
  return [
    '<button class="research-direction-tile add" type="button" data-research-action="add-direction" aria-label="' + escapeResearchHtml(researchT("actions.addDirection")) + '">',
    '  <span class="research-plus" aria-hidden="true">+</span>',
    '  <span class="research-add-direction-label">' + escapeResearchHtml(researchT("actions.addDirection")) + "</span>",
    "</button>"
  ].join("");
}

function escapeResearchHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function cssEscapeResearchSelector(value) {
  if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(String(value));
  return String(value).replace(/["\\]/g, "\\$&");
}

window.MentorResearch = {
  getActiveDirectionId: (idea) => getActiveResearchDirection(idea)?.id || "",
  setActiveDirection: setActiveResearchDirection,
  setModalLayer: setResearchModalLayer,
  syncModalLayer: syncResearchModalLayer,
  bindDraggableForm: bindResearchDraggableForm,
  bindMediaMinimize: bindResearchMediaMinimize,
  renderResearchView,
  bindResearchView,
  layoutCanvas: (view) => layoutResearchCanvas(view?.querySelector?.("[data-research-canvas]")),
  layoutDirectionTabs: layoutResearchDirectionTabs,
  closeCanvasTests: closeResearchCanvasTests,
  closeCanvasMedia: closeResearchCanvasMedia,
  closeCanvasFocus: () => closeResearchCanvasPreview(document.querySelector(".research-view")),
  renderResearchDetailStage,
  renderResearchHeroPanel,
  renderResearchDirectionsPanel,
  renderReferencesPanel,
  renderNotesPanel,
  renderResourcesPanel,
  renderBudgetComparisonPanel,
  renderIdeaTestPanel,
  renderNextStepsPanel
};

