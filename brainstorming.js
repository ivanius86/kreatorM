const BRAINSTORMING_MAX_CARD_LAYER = 180;
const BRAINSTORMING_POSITION_BASE_WIDTH = 1200;
const BRAINSTORMING_POSITION_BASE_HEIGHT = 720;
const BRAINSTORMING_POSITION_BASE_CARD_WIDTH = 256;
const BRAINSTORMING_POSITION_BASE_CARD_HEIGHT = 194;
const BRAINSTORMING_POSITION_MARGIN = 10;
const BRAINSTORMING_DRAG_CLICK_SUPPRESS_MS = 300;
const brainstormingMobileLayoutQuery = window.matchMedia("(max-width: 760px)");

const brainstormingState = {
  ideas: [],
  activeTab: "all",
  activeResearchIdeaId: null,
  searchQuery: "",
  zoom: 1,
  drag: null,
  previewIdeaId: null,
  previewCard: null,
  previewOpenedAt: 0,
  researchResizeTimer: null,
  persistenceError: null
};
window.brainstormingState = brainstormingState;

function brainT(key, params) {
  const fullKey = "brainstorming." + key;
  return window.MentorI18n?.t ? window.MentorI18n.t(fullKey, params, key) : key;
}

function brainResearchAddLabel() {
  return window.MentorI18n?.t?.("research.canvas.add", null, "Add") || "Add";
}

function setBrainText(target, text) {
  const element = typeof target === "string" ? document.querySelector(target) : target;
  if (element) element.textContent = text;
}

function setBrainPlaceholder(target, text) {
  const element = typeof target === "string" ? document.querySelector(target) : target;
  if (element) element.setAttribute("placeholder", text);
}

function setBrainOption(select, value, text) {
  const option = select ? Array.from(select.options).find((item) => item.value === value) : null;
  if (option) option.textContent = text;
}

function renderBrainstormingStaticLanguage() {
  const tabs = {
    all: "tabs.all",
    path: "tabs.path",
    build: "tabs.build",
    archived: "tabs.archived"
  };
  document.querySelector(".brainstorming-tabs")?.setAttribute("aria-label", brainT("tabs.label"));
  document.querySelectorAll(".brainstorming-tab").forEach((tab) => {
    const label = tab.querySelector("span:last-child");
    const key = tabs[tab.dataset.status];
    if (label && key) label.textContent = brainT(key);
  });

  document.querySelector(".brainstorming-search")?.setAttribute("aria-label", brainT("search.label"));
  setBrainPlaceholder("#brainstormingSearchInput", brainT("search.placeholder"));
  syncBrainstormingPrimaryAction();
  document.querySelector(".brainstorming-canvas-tools")?.setAttribute("aria-label", brainT("tools.boardControls"));
  document.getElementById("zoomOutIdeasBtn")?.setAttribute("aria-label", brainT("tools.zoomOut"));
  document.getElementById("zoomInIdeasBtn")?.setAttribute("aria-label", brainT("tools.zoomIn"));
  document.getElementById("resetIdeaViewBtn")?.setAttribute("aria-label", brainT("tools.resetView"));
  document.querySelector(".brainstorming-minimap")?.setAttribute("aria-label", brainT("tools.miniMap"));

  setBrainText("#quickIdeaForm .brainstorming-modal-head p", brainT("modal.eyebrow"));
  setBrainText("#quickIdeaTitle", brainT("modal.title"));
  document.querySelector('[data-close-modal="quick"]')?.setAttribute("aria-label", window.MentorI18n?.t?.("common.close", null, "Zatvori") || "Zatvori");
  document.querySelector('[data-close-modal="preview"]')?.setAttribute("aria-label", window.MentorI18n?.t?.("common.close", null, "Zatvori") || "Zatvori");
  setBrainText("#quickIdeaForm > label:nth-of-type(1) span", brainT("modal.titleLabel"));
  setBrainPlaceholder("#ideaTitleInput", brainT("modal.titlePlaceholder"));
  setBrainText("#quickIdeaForm > label:nth-of-type(2) span", brainT("modal.descriptionLabel"));
  setBrainPlaceholder("#ideaDescriptionInput", brainT("modal.descriptionPlaceholder"));
  setBrainText("#quickIdeaForm .brainstorming-form-grid label:nth-of-type(1) > span", brainT("modal.typeLabel"));
  const typeSelect = document.getElementById("ideaTypeInput");
  setBrainOption(typeSelect, "Poslovna", brainT("modal.types.business"));
  setBrainOption(typeSelect, "Kreativna", brainT("modal.types.creative"));
  setBrainOption(typeSelect, "Lifestyle", brainT("modal.types.lifestyle"));
  setBrainOption(typeSelect, "Lični razvoj", brainT("modal.types.personalGrowth"));
  setBrainOption(typeSelect, "Finansijska", brainT("modal.types.finance"));
  setBrainOption(typeSelect, "Edukacija", brainT("modal.types.education"));
  setBrainOption(typeSelect, "Projekat", brainT("modal.types.project"));
  setBrainText("#quickIdeaForm .brainstorming-form-grid label:nth-of-type(2) > span > span", brainT("modal.energyLabel"));
  setBrainText("#quickIdeaForm .brainstorming-form-grid label:nth-of-type(3) > span", brainT("modal.priorityLabel"));
  const prioritySelect = document.getElementById("ideaPriorityInput");
  setBrainOption(prioritySelect, "Srednji", brainT("edit.medium"));
  setBrainOption(prioritySelect, "Visok", brainT("edit.high"));
  setBrainOption(prioritySelect, "Nizak", brainT("edit.low"));
  setBrainText("#quickIdeaForm > label:nth-of-type(3) span", brainT("modal.imageLabel"));
  setBrainPlaceholder("#ideaImageInput", brainT("modal.imagePlaceholder"));
  setBrainText("#quickIdeaForm > label:nth-of-type(4) span", brainT("modal.uploadLabel"));
  setBrainText("#quickIdeaForm > label:nth-of-type(5) span", brainT("modal.linksLabel"));
  setBrainPlaceholder("#ideaLinksInput", brainT("modal.linksPlaceholder"));
  setBrainText("#quickIdeaForm > label:nth-of-type(6) span", brainT("modal.tagsLabel"));
  setBrainPlaceholder("#ideaTagsInput", brainT("modal.tagsPlaceholder"));
  setBrainText('#quickIdeaForm [data-close-modal="quick"] span', window.MentorI18n?.t?.("common.cancel", null, "Otkaži") || "Otkaži");
  setBrainText('#quickIdeaForm button[type="submit"] span', window.MentorI18n?.t?.("common.save", null, "Sačuvaj") || "Sačuvaj");
}

const BRAINSTORMING_STATUS_LABELS = {
  seed: "Seed",
  path: "Istraživanje",
  build: "Ostvarenje",
  archived: "Archived"
};

const BRAINSTORMING_STATUS_COLORS = {
  seed: "#d9b23e",
  path: "#65b990",
  build: "#e1c57c",
  archived: "#a8a195"
};

const BRAINSTORMING_STATUS_ICONS = {
  seed: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 14a5 5 0 1 1 8 0c-.9.8-1.2 1.7-1.2 3H9.2c0-1.3-.3-2.2-1.2-3Z"/><path d="M9.5 20h5M10 17h4M12 3V2M19 8l1-.7M5 8l-1-.7"/></svg>',
  path: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="m14.8 9.2-1.9 4.2-4.2 1.9 1.9-4.2 4.2-1.9Z"/></svg>',
  build: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 20V5"/><path d="M6 5h10l-1.6 3L16 11H6"/></svg>',
  archived: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h6l2 2h8v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M4 7V6a2 2 0 0 1 2-2h4l2 3"/></svg>'
};

const BRAINSTORMING_TAB_COPY = {
  all: {
    title: "Zabeleži, poveži i razvijaj svoje ideje",
    text: "Ideje nastaju slobodno. Uhvati ih, istraži i razvijaj ih kroz vreme."
  },
  path: {
    title: "Istraži signale pre nego što gradiš",
    text: "Poveži beleške, linkove i pitanja koja pomažu da ideja dobije jasniji pravac."
  },
  build: {
    title: "Pretvori zrelu ideju u konkretan korak",
    text: "Ostvarenje čuva ideje koje su spremne za plan, ritam i malu realnu akciju."
  },
  archived: {
    title: "Sačuvaj ideje koje čekaju bolji trenutak",
    text: "Arhiva drži uspavane misli blizu, ali van fokusa dok ne dođe pravo vreme."
  }
};

const BRAINSTORMING_SAMPLE_IMAGES = [
  "icons/mentor-panel-bg.png",
  "icons/natura.png",
  "icons/maindefault-panel.png",
  "icons/licni-razvoj-panel.png",
  "icons/lotus-panel.png",
  "icons/finansije-panel.png",
  "icons/karijera-posao-panel.png"
];
let brainstormingInitialized = false;

function initBrainstorming() {
  if (brainstormingInitialized) return;
  const view = document.getElementById("brainstormingView");
  if (!view) return;
  console.time("init:brainstorming");
  brainstormingInitialized = true;

  brainstormingState.ideas = loadIdeas();
  normalizeIdeaLayers();
  renderBrainstormingStaticLanguage();

  document.getElementById("openIdeaModalBtn")?.addEventListener("click", () => {
    if (brainstormingState.activeTab === "path") toggleBrainstormingResearchAddMenu();
    else openQuickIdeaModal();
  });
  bindQuickIdeaForm();
  document.getElementById("ideaEnergyInput")?.addEventListener("input", (event) => {
    const value = document.getElementById("ideaEnergyValue");
    if (value) value.textContent = event.target.value;
  });
  document.getElementById("brainstormingSearchInput")?.addEventListener("input", (event) => {
    brainstormingState.searchQuery = event.target.value.trim().toLowerCase();
    renderBrainstormingTab(brainstormingState.activeTab);
  });
  document.getElementById("zoomOutIdeasBtn")?.addEventListener("click", () => updateIdeaZoom(-0.1));
  document.getElementById("zoomInIdeasBtn")?.addEventListener("click", () => updateIdeaZoom(0.1));
  document.getElementById("resetIdeaViewBtn")?.addEventListener("click", () => {
    brainstormingState.zoom = 1;
    applyIdeaZoom();
  });
  window.addEventListener("resize", applyIdeaZoom);
  const ideaCanvas = getCanvas();
  if (ideaCanvas && typeof ResizeObserver !== "undefined") {
    let lastCanvasWidth = ideaCanvas.clientWidth;
    let miniMapResizeTimer = null;
    ideaCanvas._ideaCanvasResizeObserver = new ResizeObserver(() => {
      const nextWidth = ideaCanvas.clientWidth;
      if (!nextWidth || nextWidth === lastCanvasWidth) return;
      lastCanvasWidth = nextWidth;
      if (brainstormingState.activeTab !== "all") return;
      updateIdeaCardPositions();
      window.clearTimeout(miniMapResizeTimer);
      miniMapResizeTimer = window.setTimeout(() => {
        if (brainstormingState.activeTab === "all") renderMiniMap();
      }, 100);
    });
    ideaCanvas._ideaCanvasResizeObserver.observe(ideaCanvas);
  }
  window.addEventListener("resize", updateResearchStickyState);
  window.addEventListener("resize", handleResearchResizeReset);
  window.addEventListener("scroll", updateResearchStickyState, { passive: true });
  window.addEventListener("mentor:research-layout-changed", () => updateResearchStickyState({ preserveScrollStep: true }));
  window.addEventListener("financialComparisonUpdated", () => {
    if (brainstormingState.activeTab === "path") renderPathWorkspace({ preserveScroll: true });
  });
  addBrainstormingMobileLayoutListener();

  document.querySelectorAll(".brainstorming-tab").forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.status || "all";
      renderBrainstormingTab(tab, { scrollToTop: tab === "path" });
    });
  });

  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.closeModal === "quick") closeQuickIdeaModal();
      if (button.dataset.closeModal === "preview") closeIdeaPreview();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeQuickIdeaModal();
      closeIdeaPreview();
    }
    if (event.key === "Delete" && brainstormingState.previewIdeaId && !isTypingTarget(event.target)) {
      event.preventDefault();
      deleteIdea(brainstormingState.previewIdeaId);
    }
  });

  document.addEventListener("click", (event) => {
    const addMenu = document.querySelector(".brainstorming-header-add-menu");
    if (addMenu && !addMenu.contains(event.target) && !document.getElementById("openIdeaModalBtn")?.contains(event.target)) closeBrainstormingResearchAddMenu();
  });

  document.addEventListener("click", (event) => {
    const modal = document.getElementById("ideaPreviewModal");
    if (!brainstormingState.previewIdeaId || !modal || modal.classList.contains("hidden")) return;
    if (Date.now() - brainstormingState.previewOpenedAt < 80) return;
    if (modal.querySelector('[data-edit-form]:not(.hidden)')) return;
    if (event.target.closest && event.target.closest(".brainstorming-modal-backdrop")) return;
    if (event.target.closest && event.target.closest(".brainstorming-card.is-expanded")) return;
    closeIdeaPreview();
  });

  renderBrainstormingTab("all");
  console.timeEnd("init:brainstorming");
}

function activateBrainstorming() {
  const wasInitialized = brainstormingInitialized;
  initBrainstorming();
  if (brainstormingInitialized && wasInitialized) {
    console.time("render:brainstorming");
    renderBrainstormingStaticLanguage();
    renderBrainstormingTab(brainstormingState.activeTab || "all", { keepPreview: true });
    console.timeEnd("render:brainstorming");
  }
}

function loadIdeas() {
  try {
    const savedIdeas = window.MentorData?.repositories?.ideas?.getAll?.();
    if (Array.isArray(savedIdeas)) return savedIdeas.map(hydrateIdea);
  } catch (error) {
    console.warn("Brainstorming ideas could not be loaded.", error);
  }
  return [];
}

let researchStickerSaveCount = 0;
let researchStickerCleanupUncertain = false;
const researchStickerCleanupCandidates = new Map();

async function saveIdeas() {
  const repository = window.MentorData?.repositories?.ideas;
  const previousStickerMedia = window.MentorResearchStickerCore?.mediaReferences(repository?.getAll?.());
  researchStickerSaveCount++;
  try {
  const result = await window.MentorIdeasDurableSave.commit({
    repository,
    nextIdeas: brainstormingState.ideas,
    onSuccess: () => {
      brainstormingState.persistenceError = null;
      window.dispatchEvent?.(new CustomEvent("mentor:ideas-saved", { detail: { count: brainstormingState.ideas.length } }));
    },
    onError: (error) => {
      brainstormingState.persistenceError = error;
      console.warn("Brainstorming ideas could not be saved to storage.", error);
      window.dispatchEvent?.(new CustomEvent("mentor:ideas-save-error", { detail: { code: error?.code || error?.name || "IDEAS_SAVE_FAILED" } }));
    }
  });
  if (!result.ok) {
    brainstormingState.ideas = result.ideas.map(hydrateIdea);
    if (brainstormingInitialized) renderBrainstormingTab(brainstormingState.activeTab || "all", { keepPreview: true });
  }
  if (result.ok) { researchStickerCleanupUncertain = false; previousStickerMedia?.forEach((record, key) => researchStickerCleanupCandidates.set(key, record)); }
  else if (result.error?.commitUncertain) researchStickerCleanupUncertain = true;
  return result.ok;
  } finally {
    researchStickerSaveCount--;
    if (!researchStickerSaveCount && !researchStickerCleanupUncertain && window.MentorResearchStickerCore) {
      // Wait for overlapping writes and check confirmed repository state. An
      // optimistic in-memory edit may still fail and restore a referenced blob.
      for (const [key, record] of researchStickerCleanupCandidates) {
        if (researchStickerSaveCount) break;
        const retained = window.MentorResearchStickerCore.mediaReferences(repository.getAll());
        researchStickerCleanupCandidates.delete(key);
        if (!retained.has(key)) await window.MentorData?.repositories?.media?.removeEntity?.(record.entityType, record.mediaId)?.catch((error) => console.warn("Unused research media could not be removed.", error));
      }
    }
  }
}

function normalizeIdeaLayers() {
  const orderedIdeas = [...brainstormingState.ideas].sort((a, b) => (Number(a.layer) || 1) - (Number(b.layer) || 1));
  orderedIdeas.forEach((idea, index) => {
    idea.layer = Math.min(index + 1, BRAINSTORMING_MAX_CARD_LAYER);
  });
}

function renderBrainstormingTab(tabName, options = {}) {
  const nextTab = ["all", "path", "build", "archived"].includes(tabName) ? tabName : "all";
  if (nextTab !== "path") window.MentorResearchStickerDesigner?.close();
  window.MentorResearch?.closeCanvasMedia?.({ preserveMinimized: nextTab === "path" });
  closeBrainstormingResearchAddMenu();
  if (nextTab !== "path") window.MentorResearch?.closeCanvasTests?.();
  if (nextTab !== "path") window.MentorResearch?.closeCanvasFocus?.();
  const shouldScrollToResearchTop = nextTab === "path" && options.scrollToTop === true;
  brainstormingState.activeTab = nextTab;
  if (nextTab === "all" && options.keepPreview !== true) closeIdeaPreview();
  resetResearchStickyState();

  updateBrainstormingHeroCopy(nextTab);

  document.querySelectorAll(".brainstorming-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.status === nextTab);
  });
  document.getElementById("brainstormingView")?.classList.toggle("is-research-tab", nextTab === "path");

  if (nextTab === "all") renderAllIdeasBoard();
  if (nextTab === "path") renderPathWorkspace();
  if (nextTab === "build") renderBuildWorkspace();
  if (nextTab === "archived") renderArchiveView();
  syncBrainstormingPrimaryAction();
  if (shouldScrollToResearchTop) resetResearchScrollToTop();
}

function syncBrainstormingPrimaryAction() {
  const button = document.getElementById("openIdeaModalBtn");
  if (!button) return;
  const isResearch = brainstormingState.activeTab === "path";
  const label = isResearch ? brainResearchAddLabel() : brainT("actions.newIdea");
  button.setAttribute("aria-label", isResearch ? "+ " + label : label);
  setBrainText(button.querySelector(".brainstorming-primary-text"), label);
  button.disabled = isResearch && !getCanvas()?.querySelector(".research-view");
  if (isResearch) {
    button.setAttribute("aria-haspopup", "menu");
    button.setAttribute("aria-expanded", String(Boolean(document.querySelector(".brainstorming-header-add-menu"))));
  } else {
    button.removeAttribute("aria-haspopup");
    button.removeAttribute("aria-expanded");
  }
}

function closeBrainstormingResearchAddMenu() {
  document.querySelector(".brainstorming-header-add-menu")?.remove();
  document.getElementById("openIdeaModalBtn")?.setAttribute("aria-expanded", "false");
}

function toggleBrainstormingResearchAddMenu() {
  if (document.querySelector(".brainstorming-header-add-menu")) {
    closeBrainstormingResearchAddMenu();
    return;
  }
  const sourceMenu = getCanvas()?.querySelector("[data-research-canvas-menu]");
  const panel = document.querySelector("#brainstormingView .brainstorming-control-panel");
  if (!sourceMenu || !panel) return;
  const menu = sourceMenu.cloneNode(true);
  menu.removeAttribute("data-research-canvas-menu");
  menu.removeAttribute("style");
  menu.classList.add("brainstorming-header-add-menu");
  menu.hidden = false;
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", brainResearchAddLabel());
  menu.querySelectorAll("[data-research-action]").forEach((choice) => {
    choice.removeAttribute("data-research-action");
    choice.setAttribute("role", "menuitem");
  });
  menu.addEventListener("click", (event) => {
    const choice = event.target.closest("button[data-card-type]");
    if (!choice || !menu.contains(choice)) return;
    const original = Array.from(sourceMenu.querySelectorAll("button[data-card-type]")).find((button) => button.dataset.cardType === choice.dataset.cardType);
    closeBrainstormingResearchAddMenu();
    original?.click();
  });
  panel.appendChild(menu);
  document.getElementById("openIdeaModalBtn")?.setAttribute("aria-expanded", "true");
}

function updateBrainstormingHeroCopy(tabName) {
  const title = document.getElementById("brainstormingHeroTitle");
  const text = document.getElementById("brainstormingHeroText");
  if (title) {
    title.dataset.i18n = "brainstorming.copy." + tabName + ".title";
    title.textContent = brainT("copy." + tabName + ".title");
  }
  if (text) {
    text.dataset.i18n = "brainstorming.copy." + tabName + ".text";
    text.textContent = brainT("copy." + tabName + ".text");
  }
}

function renderAllIdeasBoard() {
  const canvas = getCanvas();
  if (!canvas) return;
  setCanvasMode("board");
  applyIdeaZoom();

  const visibleIdeas = getSearchedIdeas(brainstormingState.ideas);
  canvas.innerHTML = "";

  if (!visibleIdeas.length) {
    canvas.innerHTML = renderEmptyState(brainT("empty.noIdeasTitle"), brainT("empty.noIdeasText"), brainT("actions.createIdea"));
    canvas.querySelector("[data-empty-create]")?.addEventListener("click", openQuickIdeaModal);
    renderMiniMap();
    return;
  }

  visibleIdeas.forEach((idea) => {
    canvas.appendChild(renderIdeaCard(idea));
  });
  applyIdeaZoom();
  setupDragAndDrop();
  renderMiniMap();
}

function renderPathWorkspace() {
  window.MentorResearch?.closeCanvasMedia?.({ preserveMinimized: true });
  closeBrainstormingResearchAddMenu();
  const canvas = getCanvas();
  if (!canvas) return;
  setCanvasMode("workspace");
  const brainstormingView = document.getElementById("brainstormingView");
  const previousResearchView = canvas.querySelector(".research-view");
  const previousCanvas = previousResearchView?.querySelector("[data-research-canvas]");
  const previousCanvasViewport = previousResearchView?.querySelector("[data-research-canvas-viewport]");
  const previousCanvasScroll = { top: previousCanvasViewport?.scrollTop || 0, left: previousCanvasViewport?.scrollLeft || 0 };
  const shouldRestoreSticky = brainstormingView?.classList.contains("research-sticky-active") || previousResearchView?.classList.contains("is-research-sticky");
  const shouldRestoreHiddenNav = brainstormingView?.classList.contains("research-nav-hidden");
  const previousResearchPhase = previousResearchView?.dataset.researchPhase || "0";
  const previousPhaseTwoY = Number(previousResearchPhase) >= 2 ? previousResearchView?.dataset.researchPhaseTwoY || "" : "";
  const previousPhaseThreeY = Number(previousResearchPhase) >= 3 ? previousResearchView?.dataset.researchPhaseThreeY || "" : "";

  const idea = pickIdeaForWorkspace("path");
  const restoreCanvasScroll = previousCanvas?.dataset.ideaId === idea?.id;
  const researchIdeas = getResearchIdeasForWorkspace();
  const activeResearchIndex = researchIdeas.findIndex((item) => item.id === idea?.id);

  if (window.MentorResearch && typeof window.MentorResearch.renderResearchView === "function") {
    if (!idea) {
      canvas.innerHTML = renderEmptyState(brainT("empty.noResearchTitle"), brainT("empty.noResearchText"), brainT("actions.allIdeas"));
      canvas.querySelector("[data-empty-create]")?.addEventListener("click", () => renderBrainstormingTab("all"));
      return;
    }

    getPathData(idea);

    canvas.innerHTML = window.MentorResearch.renderResearchView(idea, {
      navigation: {
        hasPrevious: activeResearchIndex > 0,
        hasNext: activeResearchIndex >= 0 && activeResearchIndex < researchIdeas.length - 1
      }
    });
    const nextResearchView = canvas.querySelector(".research-view");
    if (nextResearchView && previousResearchView) {
      nextResearchView.classList.toggle("is-mini-panel-hidden", previousResearchView.classList.contains("is-mini-panel-hidden"));
      nextResearchView.dataset.researchPhase = previousResearchPhase;
      nextResearchView.classList.toggle("is-hero-suppressed", previousResearchView.classList.contains("is-hero-suppressed") || previousResearchPhase === "3");
      if (previousPhaseTwoY) {
        nextResearchView.dataset.researchPhaseTwoY = previousPhaseTwoY;
        if (!restoreCanvasScroll || Number(previousResearchPhase) >= 3 || previousResearchView.dataset.researchPhaseTwoStale === "true") nextResearchView.dataset.researchPhaseTwoStale = "true";
      }
      if (previousPhaseThreeY) nextResearchView.dataset.researchPhaseThreeY = previousPhaseThreeY;
      ["--research-workspace-left", "--research-workspace-right", "--research-nav-top", "--research-nav-bottom", "--research-switcher-width", "--research-directions-top", "--research-scroll-runway"].forEach((name) => {
        const value = previousResearchView.style.getPropertyValue(name);
        if (value) nextResearchView.style.setProperty(name, value);
      });
    }
    if (shouldRestoreHiddenNav) brainstormingView?.classList.add("research-nav-hidden");
    if (shouldRestoreSticky) {
      brainstormingView?.classList.add("research-nav-hidden");
      brainstormingView?.classList.add("research-sticky-active");
      nextResearchView?.classList.add("is-research-sticky");
    }
    window.MentorResearch.bindResearchView(canvas, {
      openAllIdeas: () => renderBrainstormingTab("all"),
      openPreviousIdea: () => openResearchIdeaAt(activeResearchIndex - 1, researchIdeas),
      openNextIdea: () => openResearchIdeaAt(activeResearchIndex + 1, researchIdeas),
      openIdeaOnBoard: () => openIdeaOnBoard(idea.id),
      addDirection: (direction) => addResearchDirectionToIdea(idea.id, direction),
      updateDirection: (directionId, direction) => updateResearchDirectionInIdea(idea.id, directionId, direction),
      deleteDirection: (directionId) => deleteResearchDirectionFromIdea(idea.id, directionId),
      addReference: (directionId, reference) => addResearchReferenceToDirection(idea.id, directionId, reference),
      updateReference: (directionId, referenceId, reference) => updateResearchReferenceInDirection(idea.id, directionId, referenceId, reference),
      deleteReference: (directionId, referenceId) => deleteResearchReferenceFromDirection(idea.id, directionId, referenceId),
      saveCanvasPosition: (key, x, y) => saveResearchCanvasPosition(idea.id, key, x, y),
      saveCanvasFocusPosition: (parentKey, key, x, y) => saveResearchCanvasFocusPosition(idea.id, parentKey, key, x, y),
      saveCanvasMove: (positions, sides, focusParentKey, groups) => saveResearchCanvasMove(idea.id, positions, sides, focusParentKey, groups),
      saveCanvasSize: (key, width, height, expanded) => saveResearchCanvasSize(idea.id, key, width, height, "", expanded),
      resetCanvasSize: (key, width) => resetResearchCanvasSize(idea.id, key, width),
      saveCanvasFocusSize: (parentKey, key, width, height) => saveResearchCanvasSize(idea.id, key, width, height, parentKey),
      saveCanvasCollapsed: (key, collapsed) => saveResearchCanvasCollapsed(idea.id, key, collapsed),
      saveCanvasItem: (item) => saveResearchCanvasItem(idea.id, item),
      saveCanvasSticker: (draft) => saveResearchCanvasSticker(idea.id, draft),
      saveCanvasParent: (key, parentKey, position, sides) => saveResearchCanvasParent(idea.id, key, parentKey, position, sides),
      transferCanvasChild: (childKey, targetKey, sides) => transferResearchCanvasChild(idea.id, childKey, targetKey, sides),
      saveCanvasVideo: (item, file) => saveResearchCanvasVideo(idea.id, item, file),
      saveCanvasAttachment: (item, file) => saveResearchCanvasAttachment(idea.id, item, file),
      saveCanvasOrganization: (patch) => saveResearchCanvasOrganization(idea.id, patch),
      deleteCanvasItem: (itemId) => deleteResearchCanvasItem(idea.id, itemId),
      updateCanvasLinkedNote: (directionId, referenceId, note) => updateResearchCanvasLinkedNote(idea.id, directionId, referenceId, note),
      addCanvasLinkedNote: (directionId, referenceId, note) => addResearchCanvasLinkedNote(idea.id, directionId, referenceId, note),
      deleteCanvasLinkedNote: (directionId, referenceId, noteId) => deleteResearchCanvasLinkedNote(idea.id, directionId, referenceId, noteId),
      updateCanvasDirectionNote: (directionId, note) => updateResearchCanvasDirectionNote(idea.id, directionId, note),
      deleteCanvasDirectionNote: (directionId, noteId) => deleteResearchCanvasDirectionNote(idea.id, directionId, noteId),
      addTest: (test) => addIdeaTestToResearchIdea(idea.id, test),
      updateTest: (testId, test) => updateIdeaTestInResearchIdea(idea.id, testId, test),
      deleteTest: (testId) => deleteIdeaTestFromResearchIdea(idea.id, testId),
      updateTestTask: (testId, dayId, taskId, done) => updateIdeaTestTaskState(idea.id, testId, dayId, taskId, done),
      updateTestScore: (testId, dayId, question, value) => updateIdeaTestScoreState(idea.id, testId, dayId, question, value),
      updateTestAnswer: (answer) => updateIdeaTestAnswerState(idea.id, answer),
      refreshResearch: () => renderPathWorkspace(),
      openBuild: async () => {
        if (await updateIdeaStatus(idea.id, "build")) renderBrainstormingTab("build");
      },
      openArchive: async () => {
        if (await updateIdeaStatus(idea.id, "archived")) renderBrainstormingTab("archived");
      },
      openCalendar: () => {
        if (typeof setView === "function") setView("planner");
      },
      openFinancialComparison: (ideaId) => {
        if (typeof setView === "function") setView("finance");
        if (typeof window.setFinanceTab === "function") window.setFinanceTab("ideas");
        if (typeof window.openFinancialComparisonForIdea === "function") window.openFinancialComparisonForIdea(ideaId || idea.id);
      },
      openTab: (tab) => renderBrainstormingTab(tab, { scrollToTop: tab === "path" })
    });
    requestAnimationFrame(() => {
      updateResearchStickyState({ preserveScrollStep: true });
      window.MentorResearch?.layoutCanvas?.(nextResearchView);
      if (restoreCanvasScroll) {
        const viewport = nextResearchView?.querySelector("[data-research-canvas-viewport]");
        if (viewport) {
          viewport.scrollTop = Math.min(previousCanvasScroll.top, Math.max(0, viewport.scrollHeight - viewport.clientHeight));
          viewport.scrollLeft = Math.min(previousCanvasScroll.left, Math.max(0, viewport.scrollWidth - viewport.clientWidth));
        }
      }
    });
    return;
  }

  if (!idea || !window.MentorResearch?.renderResearchView) {
    canvas.innerHTML = renderEmptyState(brainT("empty.noResearchTitle"), brainT("empty.noResearchPreviewText"), brainT("actions.allIdeas"));
    canvas.querySelector("[data-empty-create]")?.addEventListener("click", () => renderBrainstormingTab("all"));
    return;
  }

}

function renderBuildWorkspace() {
  const canvas = getCanvas();
  if (!canvas) return;
  setCanvasMode("workspace");

  const idea = pickIdeaForWorkspace("build");
  if (!idea) {
    canvas.innerHTML = renderEmptyState(brainT("empty.noBuildTitle"), brainT("empty.noBuildText"), brainT("actions.allIdeas"));
    canvas.querySelector("[data-empty-create]")?.addEventListener("click", () => renderBrainstormingTab("all"));
    return;
  }

  const buildData = getBuildData(idea);

  canvas.innerHTML = [
    '<section class="brainstorming-workspace build-workspace">',
    renderWorkspaceHero(idea, brainT("workspace.buildTitle"), brainT("workspace.buildSubtitle"), [
      '<button class="ghost-btn" type="button">' + escapeHtml(brainT("actions.openGoalSystem")) + '</button>',
      '<button class="btn secondary" type="button" data-open-calendar>' + escapeHtml(brainT("actions.openCalendar")) + '</button>'
    ], buildData.progress + "%", buildData.targetDate),
    '  <div class="build-dashboard-grid">',
    renderPanel(brainT("workspace.roadmap"), renderMilestones(buildData.milestones), "wide"),
    renderPanel(brainT("workspace.tasks"), renderBuildTasks(buildData.tasks), "wide"),
    renderPanel(brainT("workspace.calendarPreview"), renderCalendarPreview(buildData.tasks)),
    renderPanel(brainT("workspace.habits"), renderHabits(buildData.habits)),
    renderPanel(brainT("labels.progress"), renderBuildProgress(buildData.progress)),
    renderPanel(brainT("workspace.resources"), '<div class="idea-preview-links resource-links">' + renderLinks(buildData.resources) + "</div>"),
    renderPanel(brainT("workspace.notesMotivation"), '<div class="note-stack">' + buildData.notes.map((note) => "<p>" + escapeHtml(note) + "</p>").join("") + "</div>", "wide"),
    "  </div>",
    "</section>"
  ].join("");

  bindWorkspaceActions(canvas);
}

function renderArchiveView() {
  const canvas = getCanvas();
  if (!canvas) return;
  setCanvasMode("archive");

  const archivedIdeas = getSearchedIdeas(brainstormingState.ideas.filter((idea) => normalizeStatus(idea.status) === "archived"));
  if (!archivedIdeas.length) {
    canvas.innerHTML = renderEmptyState(brainT("empty.noArchivedTitle"), brainT("empty.noArchivedText"), brainT("actions.allIdeas"));
    canvas.querySelector("[data-empty-create]")?.addEventListener("click", () => renderBrainstormingTab("all"));
    return;
  }

  canvas.innerHTML = [
    '<section class="brainstorming-archive-view">',
    '  <div class="archive-grid">',
    archivedIdeas.map(renderArchiveCard).join(""),
    "  </div>",
    "</section>"
  ].join("");

  canvas.querySelectorAll("[data-restore-idea]").forEach((button) => {
    button.addEventListener("click", () => updateIdeaStatus(button.dataset.restoreIdea, "seed"));
  });
  canvas.querySelectorAll("[data-open-preview]").forEach((button) => {
    button.addEventListener("click", () => openIdeaOnBoard(button.dataset.openPreview));
  });
  canvas.querySelectorAll("[data-delete-idea]").forEach((button) => {
    button.addEventListener("click", () => deleteIdea(button.dataset.deleteIdea));
  });
}

function updateIdeaZoom(delta) {
  if (brainstormingState.activeTab !== "all") return;
  brainstormingState.zoom = Math.min(1.4, Math.max(0.6, Number((brainstormingState.zoom + delta).toFixed(2))));
  applyIdeaZoom();
}

function applyIdeaZoom() {
  const wrap = document.querySelector(".brainstorming-canvas-wrap");
  const label = document.getElementById("ideaZoomLabel");
  if (wrap) wrap.style.setProperty("--idea-zoom", String(brainstormingState.zoom));
  if (label) label.textContent = Math.round(brainstormingState.zoom * 100) + "%";

  if (brainstormingState.activeTab !== "all") return;

  updateIdeaCardPositions();
  renderMiniMap();
}

function updateIdeaCardPositions() {
  document.querySelectorAll(".brainstorming-card").forEach((card) => {
    const idea = brainstormingState.ideas.find((item) => item.id === card.dataset.ideaId);
    if (!idea) return;
    const position = getIdeaCanvasPosition(idea, card);
    card.style.setProperty("--idea-x", position.x + "px");
    card.style.setProperty("--idea-y", position.y + "px");
  });
}

function renderIdeaCard(idea) {
  const card = document.createElement("article");
  const status = normalizeStatus(idea.status);
  card.className = "brainstorming-card status-" + status;
  card.dataset.ideaId = idea.id;
  const position = getIdeaCanvasPosition(idea);
  card.style.setProperty("--idea-x", position.x + "px");
  card.style.setProperty("--idea-y", position.y + "px");
  card.style.setProperty("--idea-rotation", getIdeaRotation(idea));
  card.style.setProperty("--idea-image", cssImageUrl(idea.image));
  card.style.zIndex = String(getIdeaCardLayer(idea));

  card.innerHTML = [
    '<div class="brainstorming-card-image"></div>',
    '<span class="idea-type-badge">' + escapeHtml(idea.type || "Ideja") + "</span>",
    '<span class="idea-pin" aria-hidden="true"></span>',
    '<span class="idea-star" aria-hidden="true">' + getIdeaCornerSymbol(status) + "</span>",
    getIdeaExpandedStatusBadge(status),
    '<div class="brainstorming-card-panel">',
    '  <div class="idea-panel-tags">' + renderTags(idea.tags) + "</div>",
    "  <h3>" + escapeHtml(idea.title) + "</h3>",
    '  <div class="idea-description-frame"><p>' + escapeHtml(idea.description) + "</p></div>",
    '  <div class="brainstorming-card-meta">',
    '    <span class="idea-energy">' + escapeHtml(brainT("labels.energy")) + " " + Number(idea.energy || 1) + "/10</span>",
    "  </div>",
    "</div>"
  ].join("");

  card.addEventListener("click", (event) => {
    if (window.MentorUIEvents?.isTextEditingEvent?.(event) || isTypingTarget(event.target)) return;
    event.stopPropagation();
    openIdeaCardFromElement(card);
  });

  return card;
}

async function openIdeaCardFromElement(card) {
  if (!card || brainstormingState.activeTab !== "all") return;
  const dragReleasedAt = Number(card.dataset.dragReleasedAt || 0);
  const shouldIgnoreDragClick = card.dataset.wasDragged === "true"
    || (dragReleasedAt > 0 && Date.now() - dragReleasedAt < BRAINSTORMING_DRAG_CLICK_SUPPRESS_MS);
  if (shouldIgnoreDragClick) {
    card.dataset.wasDragged = "false";
    delete card.dataset.dragReleasedAt;
    return;
  }
  if (card.classList.contains("is-expanded")) return;
  const ideaId = card.dataset.ideaId;
  if (!ideaId) return;
  await openIdeaPreview(ideaId, card);
}

function getBrainstormingStatusIcon(status) {
  return BRAINSTORMING_STATUS_ICONS[normalizeStatus(status)] || BRAINSTORMING_STATUS_ICONS.seed;
}

function getBrainstormingStatusLabel(status) {
  return brainT("status." + normalizeStatus(status));
}

function getIdeaCornerSymbol(status) {
  const statusKey = normalizeStatus(status);
  return statusKey === "seed" ? "*" : getBrainstormingStatusIcon(statusKey);
}

function getIdeaExpandedStatusBadge(status) {
  const statusKey = normalizeStatus(status);
  const messages = {
    seed: brainT("actions.exploreIdea"),
    path: brainT("actions.openResearch"),
    build: brainT("actions.openResearch"),
    archived: brainT("actions.restoreResearch")
  };
  if (!messages[statusKey]) return "";
  return [
    '<button class="idea-expanded-status-badge" type="button" data-preview-action="path" aria-label="' + escapeHtml(messages[statusKey]) + '">',
    '  <span class="idea-expanded-status-text">' + escapeHtml(messages[statusKey]) + "</span>",
    '  <span class="idea-expanded-status-icon" aria-hidden="true">' + getBrainstormingStatusIcon(statusKey) + "</span>",
    "</button>"
  ].join("");
}

function setFormSubmitState(form, isSaving) {
  const submitButton = form?.querySelector('button[type="submit"]');
  const submitLabel = submitButton?.querySelector("span");
  if (!submitButton) return;
  if (form) form.dataset.saving = isSaving ? "true" : "false";
  if (!submitButton.dataset.defaultLabel && submitLabel) {
    submitButton.dataset.defaultLabel = submitLabel.textContent || "";
  }
  submitButton.disabled = Boolean(isSaving);
  submitButton.classList.toggle("is-saving", Boolean(isSaving));
  if (submitLabel) {
    submitLabel.textContent = isSaving
      ? (window.MentorI18n?.t?.("common.saving", null, "Čuvam...") || "Čuvam...")
      : (submitButton.dataset.defaultLabel || window.MentorI18n?.t?.("common.save", null, "Sačuvaj") || "Sačuvaj");
  }
}

function bindQuickIdeaForm() {
  const form = document.getElementById("quickIdeaForm");
  if (!form || form.dataset.quickIdeaBound === "click-v2") return;
  form.dataset.quickIdeaBound = "click-v2";
  form.addEventListener("submit", createIdea);
  form.querySelector('button[type="submit"]')?.addEventListener("click", (event) => {
    event.preventDefault();
    createIdea({
      preventDefault: function () {},
      currentTarget: form
    });
  });
}

function validateQuickIdeaForm(form) {
  const titleInput = document.getElementById("ideaTitleInput");
  const descriptionInput = document.getElementById("ideaDescriptionInput");
  titleInput?.setCustomValidity("");
  descriptionInput?.setCustomValidity("");
  const invalidInput = [titleInput, descriptionInput].find((input) => !String(input?.value || "").trim());
  if (!invalidInput) return true;
  invalidInput.setCustomValidity(window.MentorI18n?.t?.("common.required", null, "Ovo polje je obavezno.") || "Ovo polje je obavezno.");
  invalidInput.focus();
  form?.reportValidity?.();
  return false;
}

async function createIdea(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form || form.dataset.saving === "true") return;
  if (!validateQuickIdeaForm(form)) return;
  setFormSubmitState(form, true);

  try {
    const title = document.getElementById("ideaTitleInput")?.value.trim();
    const description = document.getElementById("ideaDescriptionInput")?.value.trim();

    const image = document.getElementById("ideaImageInput")?.value.trim();
    const imageFile = document.getElementById("ideaImageFileInput")?.files?.[0];
    const uploadedImage = imageFile ? await readImageFile(imageFile) : "";
    const nextIndex = brainstormingState.ideas.length + 1;
    const idea = hydrateIdea({
      id: "idea_" + Date.now(),
      title,
      description,
      type: document.getElementById("ideaTypeInput")?.value || "Kreativna",
      priority: document.getElementById("ideaPriorityInput")?.value || "Srednji",
      status: "seed",
      energy: Number(document.getElementById("ideaEnergyInput")?.value || 7),
      image: uploadedImage || image || BRAINSTORMING_SAMPLE_IMAGES[nextIndex % BRAINSTORMING_SAMPLE_IMAGES.length],
      links: splitInputList(document.getElementById("ideaLinksInput")?.value),
      tags: splitInputList(document.getElementById("ideaTagsInput")?.value),
      x: 100 + ((nextIndex * 145) % 760),
      y: 120 + ((nextIndex * 95) % 420),
      layer: getNextIdeaLayer(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    brainstormingState.ideas.unshift(idea);
    if (!await saveIdeas()) return;
    closeQuickIdeaModal();
    renderBrainstormingTab("all");
  } catch (error) {
    console.error("Idea could not be saved.", error);
  } finally {
    setFormSubmitState(form, false);
  }
}

function confirmIdeaDelete() {
  const message = brainT("confirm.deleteCard");
  return window.confirm(message && message !== "confirm.deleteCard" ? message : "Da li zelis da obrises ovu karticu?");
}

async function deleteIdea(ideaId) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea || !confirmIdeaDelete()) return false;
  const removedGroupImages = (idea.pathData?.researchCanvasGroups || []).map((group) => group.backgroundMediaId).filter(Boolean);

  brainstormingState.ideas = brainstormingState.ideas.filter((idea) => idea.id !== ideaId);
  brainstormingState.previewIdeaId = null;
  brainstormingState.previewCard = null;
  if (!await saveIdeas()) return false;
  removedGroupImages.forEach((id) => window.MentorData?.repositories?.media?.removeEntity?.("research-group", id).catch((error) => console.warn("Research group image could not be removed.", error)));
  document.getElementById("ideaPreviewModal")?.classList.add("hidden");
  renderBrainstormingTab(brainstormingState.activeTab);
  return true;
}

async function updateIdeaStatus(ideaId, status) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea) return;

  idea.previousStatus = idea.status;
  idea.status = normalizeStatus(status);
  idea.updatedAt = new Date().toISOString();
  if (idea.status === "path") {
    brainstormingState.activeResearchIdeaId = idea.id;
    ensureIdeaResearch(idea);
  }
  if (idea.status === "archived") idea.archivedAt = new Date().toISOString().slice(0, 10);
  if (!await saveIdeas()) return false;
  closeIdeaPreview();
  renderBrainstormingTab(brainstormingState.activeTab);
  return true;
}

function filterIdeas(status) {
  renderBrainstormingTab(status, { scrollToTop: status === "path" });
}

function openQuickIdeaModal() {
  const modal = document.getElementById("quickIdeaModal");
  const form = document.getElementById("quickIdeaForm");
  if (!modal) return;

  bindQuickIdeaForm();
  form?.reset();
  if (form) {
    form.dataset.saving = "false";
    document.getElementById("ideaTitleInput")?.setCustomValidity("");
    document.getElementById("ideaDescriptionInput")?.setCustomValidity("");
    setFormSubmitState(form, false);
  }
  const energyValue = document.getElementById("ideaEnergyValue");
  if (energyValue) energyValue.textContent = "7";
  document.body.classList.add("quick-idea-modal-open");
  modal.classList.remove("hidden");
  document.getElementById("ideaTitleInput")?.focus();
}

function closeQuickIdeaModal() {
  document.body.classList.remove("quick-idea-modal-open");
  document.getElementById("quickIdeaModal")?.classList.add("hidden");
}

async function openIdeaPreview(ideaId, sourceCard) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  const modal = document.getElementById("ideaPreviewModal");
  sourceCard = sourceCard || document.querySelector('.brainstorming-card[data-idea-id="' + cssEscape(ideaId) + '"]');
  if (!idea || !modal || !sourceCard) return;
  if (!await bringIdeaToFront(idea.id, sourceCard)) return false;
  if (brainstormingState.previewCard && brainstormingState.previewCard !== sourceCard) {
    collapseExpandedIdeaCard(brainstormingState.previewCard);
  }
  brainstormingState.previewIdeaId = idea.id;
  brainstormingState.previewCard = sourceCard;
  brainstormingState.previewOpenedAt = Date.now();

  positionExpandedIdeaCard(sourceCard);
  sourceCard.classList.add("is-expanded");
  renderExpandedIdeaControls(sourceCard, idea);
  if (window.matchMedia("(max-width: 980px)").matches) {
    requestAnimationFrame(() => sourceCard.scrollIntoView({ behavior: "auto", block: "start" }));
  }
  modal.classList.remove("hidden");
  return true;
}

function openIdeaOnBoard(ideaId) {
  if (!ideaId) return;
  renderBrainstormingTab("all", { keepPreview: true });
  requestAnimationFrame(() => openIdeaPreview(ideaId));
}

function renderExpandedIdeaControls(card, idea) {
  card.querySelector(".idea-expanded-tools")?.remove();
  card.querySelector(".idea-expanded-extra")?.remove();

  const panel = card.querySelector(".brainstorming-card-panel");
  if (!panel) return;

  panel.insertAdjacentHTML("beforeend", [
    '<div class="idea-expanded-extra">',
    '  <div class="idea-expanded-tools" aria-label="' + escapeHtml(brainT("edit.editCard")) + '">',
    '    <button class="idea-preview-tool" type="button" data-edit-panel="image" aria-label="' + escapeHtml(brainT("edit.editImage")) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2"></rect><path d="m7 16 4-4 3 3 2-2 3 3"></path><circle cx="9" cy="9" r="1.4"></circle></svg></button>',
    '    <button class="idea-preview-tool" type="button" data-edit-panel="details" aria-label="' + escapeHtml(brainT("edit.editDetails")) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h5l10-10a2.1 2.1 0 0 0-3-3L6 17z"></path><path d="m14 7 3 3"></path></svg></button>',
    '    <button class="idea-preview-tool" type="button" data-edit-panel="links" aria-label="' + escapeHtml(brainT("edit.editLinks")) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"></path><path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1"></path></svg></button>',
    "  </div>",
    '  <div class="idea-expanded-default-content"><div class="idea-preview-tags">' + renderTags(idea.tags) + "</div>",
    '  <div class="idea-preview-links compact-links">' + renderLinks(idea.links) + "</div>",
    '  <button class="idea-expanded-path-btn" type="button" data-preview-action="path">' + escapeHtml(brainT("tabs.path")) + '</button>',
    '  <button class="idea-expanded-delete-action" type="button" data-preview-action="delete">' + escapeHtml(brainT("actions.deleteCard")) + '</button>',
    '  </div>',
    '  <form class="idea-edit-panel image-edit-panel hidden" data-edit-form="image">',
    '    <label>' + escapeHtml(brainT("edit.imageLink")) + '<input name="image" type="text" value="' + escapeHtml(idea.image || "") + '" placeholder="https://... ili icons/natura.png" /></label>',
    '    <label>' + escapeHtml(brainT("edit.uploadImage")) + '<input name="imageFile" type="file" accept="image/*" /></label>',
    '    <div class="idea-edit-actions"><button class="btn secondary" type="submit">' + escapeHtml(brainT("actions.saveImage")) + '</button></div>',
    "  </form>",
    '  <form class="idea-edit-panel hidden" data-edit-form="details">',
    '    <label>' + escapeHtml(brainT("edit.title")) + '<input name="title" type="text" maxlength="38" value="' + escapeHtml(idea.title) + '" /></label>',
    '    <label>' + escapeHtml(brainT("edit.description")) + '<textarea name="description" rows="3">' + escapeHtml(idea.description) + "</textarea></label>",
    '    <label>' + escapeHtml(brainT("edit.type")) + '<input name="type" type="text" value="' + escapeHtml(idea.type || brainT("edit.ideaFallback")) + '" /></label>',
    '    <label>' + escapeHtml(brainT("edit.priority")) + '<select name="priority"><option' + (idea.priority === "Nizak" ? " selected" : "") + ' value="Nizak">' + escapeHtml(brainT("edit.low")) + '</option><option' + (!idea.priority || idea.priority === "Srednji" ? " selected" : "") + ' value="Srednji">' + escapeHtml(brainT("edit.medium")) + '</option><option' + (idea.priority === "Visok" ? " selected" : "") + ' value="Visok">' + escapeHtml(brainT("edit.high")) + '</option></select></label>',
    '    <label>' + escapeHtml(brainT("edit.energy")) + '<input name="energy" type="number" min="1" max="10" value="' + Number(idea.energy || 1) + '" /></label>',
    '    <label>' + escapeHtml(brainT("edit.tags")) + '<input name="tags" type="text" value="' + escapeHtml((idea.tags || []).join(", ")) + '" /></label>',
    '    <div class="idea-edit-actions"><button class="btn secondary" type="submit">' + escapeHtml(window.MentorI18n?.t ? window.MentorI18n.t("common.save") : "Sačuvaj") + '</button></div>',
    "  </form>",
    '  <form class="idea-edit-panel hidden" data-edit-form="links">',
    '    <label>' + escapeHtml(brainT("edit.links")) + '<input name="links" type="text" value="' + escapeHtml((idea.links || []).join(", ")) + '" /></label>',
    '    <div class="idea-edit-actions"><button class="btn secondary" type="submit">' + escapeHtml(brainT("actions.saveLinks")) + '</button></div>',
    "  </form>",
    "</div>"
  ].join(""));

  const tools = card.querySelector(".idea-expanded-tools");
  const extra = card.querySelector(".idea-expanded-extra");
  if (tools && extra) panel.insertBefore(tools, extra);

  const defaultContent = card.querySelector(".idea-expanded-default-content");
  if (defaultContent) {
    defaultContent.innerHTML = [
      '<div class="idea-expanded-footer">',
      '  <div class="idea-preview-links compact-links">' + renderLinks(idea.links) + "</div>",
      '  <span class="idea-expanded-energy">' + escapeHtml(brainT("labels.energy")) + " " + Number(idea.energy || 1) + "/10</span>",
      "</div>",
      '<div class="idea-expanded-actions">',
      '  <button class="idea-expanded-path-btn" type="button" data-preview-action="path">' + escapeHtml(getIdeaResearchActionText(idea)) + "</button>",
      '  <button class="idea-expanded-delete-action" type="button" data-preview-action="delete">' + escapeHtml(brainT("actions.deleteCard")) + '</button>',
      "</div>"
    ].join("");
  }

  const researchActionButton = card.querySelector(".idea-expanded-path-btn");
  if (researchActionButton) researchActionButton.textContent = getIdeaResearchActionText(idea);
  bindExpandedCardActions(card, idea);
  card.querySelector('[data-edit-form="details"]')?.addEventListener("submit", (event) => saveIdeaDetailsEdit(event, idea.id));
  card.querySelector('[data-edit-form="links"]')?.addEventListener("submit", (event) => saveIdeaLinksEdit(event, idea.id));
  card.querySelector('[data-edit-form="image"]')?.addEventListener("submit", (event) => saveIdeaImageEdit(event, idea.id));

  card.querySelector(".idea-expanded-extra")?.classList.add("is-ready");
}

function bindExpandedCardActions(card, idea) {
  if (card._expandedActionClickHandler) {
    card.removeEventListener("click", card._expandedActionClickHandler, true);
  }
  if (card._expandedActionPointerDownHandler) {
    card.removeEventListener("pointerdown", card._expandedActionPointerDownHandler, true);
  }
  if (card._expandedActionPointerUpHandler) {
    card.removeEventListener("pointerup", card._expandedActionPointerUpHandler, true);
  }

  const getActionButton = (event) => {
    const editButton = event.target.closest?.("[data-edit-panel]");
    const previewButton = event.target.closest?.("[data-preview-action]");
    return editButton || previewButton;
  };

  const runAction = (event) => {
    const actionButton = getActionButton(event);
    if (!actionButton || !card.contains(actionButton)) return false;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    if (actionButton.dataset.editPanel) {
      toggleIdeaEditPanel(card, actionButton.dataset.editPanel);
      return true;
    }

    if (actionButton.dataset.previewAction === "path") {
      openIdeaPath(idea.id);
      return true;
    }

    if (actionButton.dataset.previewAction === "delete") {
      deleteIdea(idea.id);
    }
    return true;
  };

  card._expandedActionPointerDownHandler = (event) => {
    const actionButton = getActionButton(event);
    if (!actionButton || !card.contains(actionButton)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
  };

  card._expandedActionPointerUpHandler = (event) => {
    if (runAction(event)) card._lastExpandedActionAt = Date.now();
  };

  card._expandedActionClickHandler = (event) => {
    if (Date.now() - (card._lastExpandedActionAt || 0) < 220) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      return;
    }
    runAction(event);
  };

  card.addEventListener("pointerdown", card._expandedActionPointerDownHandler, true);
  card.addEventListener("pointerup", card._expandedActionPointerUpHandler, true);
  card.addEventListener("click", card._expandedActionClickHandler, true);
}

function syncExpandedPanelHeight(card) {
  if (!card || !card.classList.contains("is-expanded")) return;
  if (!card.classList.contains("has-edit-open")) sizeExpandedDescription(card);
}

function sizeExpandedDescription(card) {
  const panel = card.querySelector(".brainstorming-card-panel");
  const descriptionFrame = card.querySelector(".idea-description-frame");
  const descriptionText = card.querySelector(".idea-description-frame p");
  if (!panel) return;

  if (descriptionFrame && descriptionText) {
    const computedDescriptionStyles = window.getComputedStyle(descriptionText);
    const lineHeight = Number.parseFloat(computedDescriptionStyles.lineHeight) || 22;
    const maxVisibleDescriptionHeight = Math.ceil(lineHeight * 6 + 18);
    const descriptionHeight = Math.min(maxVisibleDescriptionHeight, Math.max(51, Math.ceil(descriptionText.scrollHeight) + 18));
    card.style.setProperty("--expanded-description-h", descriptionHeight + "px");
    descriptionFrame.style.height = descriptionHeight + "px";
    descriptionFrame.style.minHeight = descriptionHeight + "px";
    descriptionFrame.style.maxHeight = descriptionHeight + "px";
    descriptionText.style.height = Math.max(33, descriptionHeight - 18) + "px";
    descriptionText.style.minHeight = Math.max(33, descriptionHeight - 18) + "px";
    descriptionText.style.maxHeight = Math.max(33, descriptionHeight - 18) + "px";
  }
}

function clearExpandedDescriptionSizing(card) {
  const descriptionFrame = card?.querySelector(".idea-description-frame");
  const descriptionText = card?.querySelector(".idea-description-frame p");
  [descriptionFrame, descriptionText].forEach((element) => {
    if (!element) return;
    element.style.removeProperty("height");
    element.style.removeProperty("min-height");
    element.style.removeProperty("max-height");
  });
  card?.style.removeProperty("--expanded-description-h");
}

function toggleIdeaEditPanel(content, panelName) {
  content.querySelectorAll("[data-edit-form]").forEach((form) => {
    const isActive = form.dataset.editForm === panelName;
    form.classList.toggle("hidden", !isActive || !form.classList.contains("hidden"));
  });
  const hasOpenEditPanel = Boolean(content.querySelector('[data-edit-form]:not(.hidden)'));
  content.classList?.toggle("has-edit-open", hasOpenEditPanel);
  if (!hasOpenEditPanel) {
    content.style.removeProperty("--expanded-edit-panel-h");
    content.style.removeProperty("--expanded-panel-drop");
    syncExpandedPanelHeight(content);
  }
}

async function saveIdeaImageEdit(event, ideaId) {
  event.preventDefault();
  const form = event.currentTarget;
  setFormSubmitState(form, true);
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea) {
    setFormSubmitState(form, false);
    return;
  }

  try {
    const image = form.elements.image?.value.trim();
    const imageFile = form.elements.imageFile?.files?.[0];
    const uploadedImage = imageFile ? await readImageFile(imageFile) : "";
    if (uploadedImage || image) {
      idea.image = uploadedImage || image;
      idea.updatedAt = new Date().toISOString();
    }
    if (!await saveIdeas()) return;
    refreshExpandedIdeaCard(ideaId);
  } catch (error) {
    console.error("Idea image could not be saved.", error);
  } finally {
    setFormSubmitState(form, false);
  }
}

async function saveIdeaDetailsEdit(event, ideaId) {
  event.preventDefault();
  const form = event.currentTarget;
  setFormSubmitState(form, true);
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea) {
    setFormSubmitState(form, false);
    return;
  }

  try {
    idea.title = form.elements.title?.value.trim() || idea.title;
    idea.description = form.elements.description?.value.trim() || idea.description;
    idea.type = form.elements.type?.value.trim() || "Ideja";
    idea.priority = form.elements.priority?.value || idea.priority || "Srednji";
    idea.energy = Math.max(1, Math.min(10, Number(form.elements.energy?.value || idea.energy || 1)));
    idea.tags = splitInputList(form.elements.tags?.value);
    idea.updatedAt = new Date().toISOString();
    if (!await saveIdeas()) return;
    refreshExpandedIdeaCard(ideaId);
  } catch (error) {
    console.error("Idea details could not be saved.", error);
  } finally {
    setFormSubmitState(form, false);
  }
}

async function saveIdeaLinksEdit(event, ideaId) {
  event.preventDefault();
  const form = event.currentTarget;
  setFormSubmitState(form, true);
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea) {
    setFormSubmitState(form, false);
    return;
  }

  try {
    idea.links = splitInputList(form.elements.links?.value);
    idea.updatedAt = new Date().toISOString();
    if (!await saveIdeas()) return;
    refreshExpandedIdeaCard(ideaId);
  } catch (error) {
    console.error("Idea links could not be saved.", error);
  } finally {
    setFormSubmitState(form, false);
  }
}

function refreshExpandedIdeaCard(ideaId) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  const card = brainstormingState.previewCard || document.querySelector('.brainstorming-card[data-idea-id="' + cssEscape(ideaId) + '"]');
  if (!idea || !card) return;

  const statusKey = normalizeStatus(idea.status);
  card.className = "brainstorming-card status-" + statusKey + (card.classList.contains("is-expanded") ? " is-expanded" : "");
  card.style.setProperty("--idea-image", cssImageUrl(idea.image));
  const title = card.querySelector(".brainstorming-card-panel h3");
  const panelTags = card.querySelector(".idea-panel-tags");
  const description = card.querySelector(".idea-description-frame p") || card.querySelector(".brainstorming-card-panel p");
  const typeBadge = card.querySelector(".idea-type-badge");
  const energy = card.querySelector(".idea-energy");
  const expandedEnergy = card.querySelector(".idea-expanded-energy");
  const cornerSymbol = card.querySelector(".idea-star");
  const expandedStatusBadge = card.querySelector(".idea-expanded-status-badge");
  if (title) title.textContent = idea.title;
  if (panelTags) panelTags.innerHTML = renderTags(idea.tags);
  if (description) description.textContent = idea.description;
  if (typeBadge) typeBadge.textContent = idea.type || "Ideja";
  if (energy) energy.textContent = brainT("labels.energy") + " " + Number(idea.energy || 1) + "/10";
  if (expandedEnergy) expandedEnergy.textContent = brainT("labels.energy") + " " + Number(idea.energy || 1) + "/10";
  if (cornerSymbol) cornerSymbol.innerHTML = getIdeaCornerSymbol(statusKey);
  const nextBadge = getIdeaExpandedStatusBadge(statusKey);
  if (expandedStatusBadge && nextBadge) expandedStatusBadge.outerHTML = nextBadge;
  if (expandedStatusBadge && !nextBadge) expandedStatusBadge.remove();
  if (!expandedStatusBadge && nextBadge) {
    card.querySelector(".idea-star")?.insertAdjacentHTML("afterend", nextBadge);
  }

  card.classList.remove("has-edit-open");
  delete card.dataset.editRestorePanelHeight;
  clearExpandedDescriptionSizing(card);
  card.style.removeProperty("--expanded-edit-panel-h");
  card.style.removeProperty("--expanded-panel-drop");
  renderExpandedIdeaControls(card, idea);
}

function closeIdeaPreview() {
  const modal = document.getElementById("ideaPreviewModal");
  const closingCard = brainstormingState.previewCard;
  brainstormingState.previewIdeaId = null;
  brainstormingState.previewCard = null;
  if (closingCard) collapseExpandedIdeaCard(closingCard);
  document.querySelectorAll(".brainstorming-card.is-expanded").forEach((card) => {
    if (card !== closingCard) collapseExpandedIdeaCard(card);
  });
  if (!modal) return;
  if (modal.classList.contains("hidden")) {
    modal.classList.remove("is-closing");
    return;
  }

  modal.classList.add("is-closing");
  modal.classList.add("hidden");
  modal.classList.remove("is-closing");
}

function positionExpandedIdeaCard(card) {
  const canvas = getCanvas();
  if (!canvas) return;

  if (window.matchMedia("(max-width: 980px)").matches) {
    card.style.setProperty("--expanded-w", "100%");
    card.style.setProperty("--expanded-h", "540px");
    card.style.setProperty("--expanded-x", "0px");
    card.style.setProperty("--expanded-y", "0px");
    return;
  }

  const availableWidth = Math.max(320, canvas.clientWidth - 48);
  const expandedWidth = Math.min(691, availableWidth < 620 ? availableWidth : Math.max(504, (canvas.clientWidth - 360) * 0.9));
  const expandedHeight = window.matchMedia("(max-width: 980px)").matches ? 468 : 524;
  const endX = Math.max(18, (canvas.clientWidth - expandedWidth) / 2);
  const endY = 98;

  card.style.setProperty("--expanded-w", expandedWidth + "px");
  card.style.setProperty("--expanded-h", expandedHeight + "px");
  card.style.setProperty("--expanded-x", endX + "px");
  card.style.setProperty("--expanded-y", endY + "px");
}

async function bringIdeaToFront(ideaId, card) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea) return;

  idea.layer = getNextIdeaLayer();
  if (!await saveIdeas()) return false;
  if (card) card.style.zIndex = String(getIdeaCardLayer(idea));
  return true;
}

function getNextIdeaLayer() {
  let maxLayer = brainstormingState.ideas.reduce((max, idea) => Math.max(max, Number(idea.layer) || 1), 1);
  if (maxLayer >= BRAINSTORMING_MAX_CARD_LAYER) {
    normalizeIdeaLayers();
    maxLayer = brainstormingState.ideas.reduce((max, idea) => Math.max(max, Number(idea.layer) || 1), 1);
  }
  return Math.min(maxLayer + 1, BRAINSTORMING_MAX_CARD_LAYER);
}

function getIdeaCardLayer(idea) {
  return Math.min(Number(idea?.layer) || 1, BRAINSTORMING_MAX_CARD_LAYER);
}

function collapseExpandedIdeaCard(card) {
  if (!card) return;
  if (card._panelLayoutFrame) {
    window.cancelAnimationFrame(card._panelLayoutFrame);
    card._panelLayoutFrame = null;
  }
  if (card._expandedActionClickHandler) {
    card.removeEventListener("click", card._expandedActionClickHandler, true);
    card._expandedActionClickHandler = null;
  }
  if (card._expandedActionPointerDownHandler) {
    card.removeEventListener("pointerdown", card._expandedActionPointerDownHandler, true);
    card._expandedActionPointerDownHandler = null;
  }
  if (card._expandedActionPointerUpHandler) {
    card.removeEventListener("pointerup", card._expandedActionPointerUpHandler, true);
    card._expandedActionPointerUpHandler = null;
  }
  card.querySelector(".idea-expanded-tools")?.remove();
  card.querySelector(".idea-expanded-extra")?.remove();
  clearExpandedDescriptionSizing(card);
  card.style.removeProperty("--expanded-panel-target-h");
  card.style.removeProperty("--expanded-edit-panel-h");
  card.style.removeProperty("--expanded-panel-drop");
  card.classList.remove("has-edit-open");
  card.classList.remove("is-expanded");
  card.classList.remove("is-animating", "is-collapsing");
}

function isTypingTarget(target) {
  if (window.MentorUIEvents?.isTextEditingTarget?.(target)) return true;
  if (!target || !target.tagName) return false;
  if (target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable) return true;
  if (target.tagName !== "INPUT") return false;
  const type = String(target.getAttribute("type") || "text").toLowerCase();
  return !["button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit"].includes(type);
}

function renderMiniMap() {
  const map = document.getElementById("brainstormingMiniMap");
  if (!map) return;

  map.innerHTML = "";
  if (isBrainstormingMobileLayout()) return;

  getSearchedIdeas(brainstormingState.ideas).forEach((idea) => {
    const dot = document.createElement("span");
    const card = document.querySelector('.brainstorming-card[data-idea-id="' + cssEscape(idea.id) + '"]');
    const position = getIdeaCanvasPosition(idea, card);
    const metrics = getIdeaCanvasMetrics(card);
    const x = metrics.canvasWidth > 0 ? (position.x / metrics.canvasWidth) * 100 : getIdeaRatio(idea, "x") * 100;
    const y = metrics.canvasHeight > 0 ? (position.y / metrics.canvasHeight) * 100 : getIdeaRatio(idea, "y") * 100;
    dot.className = "brainstorming-map-dot status-" + normalizeStatus(idea.status);
    dot.style.left = Math.min(96, Math.max(4, x)) + "%";
    dot.style.top = Math.min(93, Math.max(7, y)) + "%";
    dot.style.background = BRAINSTORMING_STATUS_COLORS[normalizeStatus(idea.status)];
    map.appendChild(dot);
  });
}

function setupDragAndDrop() {
  document.querySelectorAll(".brainstorming-card").forEach((card) => {
    card.addEventListener("pointerdown", async (event) => {
      if (window.MentorUIEvents?.isTextEditingEvent?.(event) || isTypingTarget(event.target)) return;
      if (card.classList.contains("is-expanded")) return;
      const idea = brainstormingState.ideas.find((item) => item.id === card.dataset.ideaId);
      if (!idea || isBrainstormingMobileLayout()) return;
      if (!await bringIdeaToFront(idea.id, card)) return;

      brainstormingState.drag = {
        id: idea.id,
        startX: event.clientX,
        startY: event.clientY,
        originX: getIdeaCanvasPosition(idea, card).x,
        originY: getIdeaCanvasPosition(idea, card).y,
        moved: false
      };
      card.classList.add("dragging");
      card.setPointerCapture(event.pointerId);
    });

    card.addEventListener("pointermove", (event) => {
      const drag = brainstormingState.drag;
      if (!drag || drag.id !== card.dataset.ideaId) return;
      const idea = brainstormingState.ideas.find((item) => item.id === drag.id);
      if (!idea) return;

      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;
      if (Math.abs(deltaX) + Math.abs(deltaY) > 6) drag.moved = true;
      const nextPosition = clampIdeaCoordinates(drag.originX + deltaX, drag.originY + deltaY, card);

      card.style.setProperty("--idea-x", nextPosition.x + "px");
      card.style.setProperty("--idea-y", nextPosition.y + "px");
      setIdeaRatiosFromPosition(idea, nextPosition, card);
      renderMiniMap();
    });

    card.addEventListener("pointerup", async (event) => {
      const drag = brainstormingState.drag;
      if (!drag || drag.id !== card.dataset.ideaId) return;
      const wasDragged = drag.moved === true;

      card.dataset.wasDragged = String(wasDragged);
      if (wasDragged) {
        card.dataset.dragReleasedAt = String(Date.now());
      } else {
        delete card.dataset.dragReleasedAt;
      }
      card.classList.remove("dragging");
      brainstormingState.drag = null;

      const idea = brainstormingState.ideas.find((item) => item.id === drag.id);
      if (idea) {
        const nextPosition = clampIdeaCoordinates(drag.originX + event.clientX - drag.startX, drag.originY + event.clientY - drag.startY, card);
        setIdeaRatiosFromPosition(idea, nextPosition, card);
        if (await saveIdeas()) renderMiniMap();
      }
    });
  });
}

async function openIdeaPath(ideaId) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  const status = normalizeStatus(idea?.status);
  const shouldMoveToResearch = idea && !idea.pathData && status !== "build";
  const shouldRestoreArchivedResearch = idea && status === "archived";
  if (shouldMoveToResearch || shouldRestoreArchivedResearch) {
    idea.previousStatus = idea.status;
    idea.status = "path";
    idea.layer = getNextIdeaLayer();
  }
  if (idea) {
    brainstormingState.activeResearchIdeaId = idea.id;
    idea.updatedAt = new Date().toISOString();
    ensureIdeaResearch(idea);
    if (!await saveIdeas()) return false;
  }
  closeIdeaPreview();
  renderBrainstormingTab("path", { scrollToTop: true });
  return true;
}

function ensureIdeaResearch(idea) {
  if (!idea) return null;
  getPathData(idea);
  if (!idea.pathData.createdAt) idea.pathData.createdAt = new Date().toISOString();
  idea.pathData.updatedAt = idea.updatedAt || new Date().toISOString();
  return idea.pathData;
}

function getIdeaResearchActionText(idea) {
  const status = normalizeStatus(idea?.status);
  if (status === "path" || idea?.pathData) return brainT("actions.openResearch");
  if (status === "archived") return brainT("actions.restoreResearch");
  return brainT("actions.exploreIdea");
}

function renderWorkspaceHero(idea, statusLabel, subtitle, actions, progress, targetDate) {
  return [
    '<article class="workspace-hero" style="--idea-image: ' + cssImageUrl(idea.image) + '">',
    '  <div class="workspace-hero-copy">',
    '    <span class="idea-status">' + escapeHtml(statusLabel) + "</span>",
    "    <h2>" + escapeHtml(idea.title) + "</h2>",
    "    <p>" + escapeHtml(subtitle) + "</p>",
    '    <div class="workspace-hero-meta">',
    '      <span>' + escapeHtml(brainT("labels.energy")) + " " + Number(idea.energy || 1) + "/10</span>",
    progress ? "      <span>" + escapeHtml(brainT("labels.progress")) + " " + escapeHtml(progress) + "</span>" : "",
    targetDate ? "      <span>" + escapeHtml(brainT("labels.target")) + " " + escapeHtml(targetDate) + "</span>" : "",
    "    </div>",
    "  </div>",
    '  <div class="workspace-hero-actions">' + actions.join("") + "</div>",
    "</article>"
  ].join("");
}

function clampIdeaCoordinates(x, y, card) {
  const metrics = getIdeaCanvasMetrics(card);
  const maxX = metrics.margin + metrics.availableX;
  const maxY = metrics.margin + metrics.availableY;

  return {
    x: Math.round(Math.min(maxX, Math.max(metrics.margin, Number(x) || metrics.margin))),
    y: Math.round(Math.min(maxY, Math.max(metrics.margin, Number(y) || metrics.margin)))
  };
}

function getIdeaCanvasMetrics(card) {
  const canvas = getCanvas();
  const zoom = Number(brainstormingState.zoom || 1);
  const margin = BRAINSTORMING_POSITION_MARGIN;
  const cardWidth = (card?.offsetWidth || BRAINSTORMING_POSITION_BASE_CARD_WIDTH) * zoom;
  const cardHeight = (card?.offsetHeight || BRAINSTORMING_POSITION_BASE_CARD_HEIGHT) * zoom;
  const canvasWidth = canvas?.clientWidth || BRAINSTORMING_POSITION_BASE_WIDTH;
  const canvasHeight = canvas?.clientHeight || BRAINSTORMING_POSITION_BASE_HEIGHT;

  return {
    margin,
    canvasWidth,
    canvasHeight,
    cardWidth,
    cardHeight,
    availableX: Math.max(0, canvasWidth - cardWidth - (margin * 2)),
    availableY: Math.max(0, canvasHeight - cardHeight - (margin * 2))
  };
}

function getIdeaCanvasPosition(idea, card) {
  ensureIdeaRatios(idea);
  const metrics = getIdeaCanvasMetrics(card);
  const x = metrics.margin + (getIdeaRatio(idea, "x") * metrics.availableX);
  const y = metrics.margin + (getIdeaRatio(idea, "y") * metrics.availableY);
  return clampIdeaCoordinates(x, y, card);
}

function setIdeaRatiosFromPosition(idea, position, card) {
  const metrics = getIdeaCanvasMetrics(card);
  idea.xRatio = metrics.availableX > 0 ? clampUnit((position.x - metrics.margin) / metrics.availableX) : 0;
  idea.yRatio = metrics.availableY > 0 ? clampUnit((position.y - metrics.margin) / metrics.availableY) : 0;
  idea.x = Math.round(position.x);
  idea.y = Math.round(position.y);
}

function ensureIdeaRatios(idea) {
  if (!idea) return;
  if (!Number.isFinite(Number(idea.xRatio))) {
    const availableX = Math.max(1, BRAINSTORMING_POSITION_BASE_WIDTH - BRAINSTORMING_POSITION_BASE_CARD_WIDTH - (BRAINSTORMING_POSITION_MARGIN * 2));
    idea.xRatio = clampUnit(((Number(idea.x) || BRAINSTORMING_POSITION_MARGIN) - BRAINSTORMING_POSITION_MARGIN) / availableX);
  } else {
    idea.xRatio = clampUnit(Number(idea.xRatio));
  }

  if (!Number.isFinite(Number(idea.yRatio))) {
    const availableY = Math.max(1, BRAINSTORMING_POSITION_BASE_HEIGHT - BRAINSTORMING_POSITION_BASE_CARD_HEIGHT - (BRAINSTORMING_POSITION_MARGIN * 2));
    idea.yRatio = clampUnit(((Number(idea.y) || BRAINSTORMING_POSITION_MARGIN) - BRAINSTORMING_POSITION_MARGIN) / availableY);
  } else {
    idea.yRatio = clampUnit(Number(idea.yRatio));
  }
}

function getIdeaRatio(idea, axis) {
  ensureIdeaRatios(idea);
  return axis === "x" ? Number(idea.xRatio) || 0 : Number(idea.yRatio) || 0;
}

function isBrainstormingMobileLayout() {
  return brainstormingMobileLayoutQuery.matches;
}

function addBrainstormingMobileLayoutListener() {
  const handleLayoutChange = () => {
    requestAnimationFrame(() => {
      if (brainstormingState.activeTab === "all") {
        renderBrainstormingTab("all");
      } else if (brainstormingState.activeTab === "path") {
        resetResearchViewAfterLayoutChange();
      } else {
        applyIdeaZoom();
      }
    });
  };

  if (brainstormingMobileLayoutQuery.addEventListener) {
    brainstormingMobileLayoutQuery.addEventListener("change", handleLayoutChange);
  } else if (brainstormingMobileLayoutQuery.addListener) {
    brainstormingMobileLayoutQuery.addListener(handleLayoutChange);
  }
}

function resetResearchViewAfterLayoutChange() {
  resetResearchStickyState();
  renderPathWorkspace();
  requestAnimationFrame(() => {
    scrollResearchViewToTop();
    resetResearchStickyState();
  });
}

function handleResearchResizeReset() {
  if (brainstormingState.activeTab !== "path") return;
  window.clearTimeout(brainstormingState.researchResizeTimer);
  brainstormingState.researchResizeTimer = window.setTimeout(() => {
    const researchView = document.querySelector("#brainstormingCanvas .research-view");
    if (researchView) {
      if (Number(researchView.dataset.researchPhase || 0) < 3) {
        delete researchView.dataset.researchPhaseTwoY;
        delete researchView.dataset.researchPhaseThreeY;
      } else researchView.dataset.researchPhaseTwoStale = "true";
    }
    updateResearchStickyState();
    window.MentorResearch?.layoutCanvas?.(researchView);
  }, 180);
}

function clampUnit(value) {
  return Math.min(1, Math.max(0, Number(value) || 0));
}

function renderPanel(title, body, modifier) {
  return '<article class="workspace-panel ' + (modifier || "") + '"><h2>' + escapeHtml(title) + "</h2>" + body + "</article>";
}

function renderMetricLine(label, value, max) {
  const safeValue = Number(value || 0);
  const safeMax = Number(max || 10);
  return [
    '<div class="metric-line">',
    "  <label>" + escapeHtml(label) + " <span>" + safeValue + "/" + safeMax + "</span></label>",
    '  <meter value="' + safeValue + '" max="' + safeMax + '"></meter>',
    "</div>"
  ].join("");
}

function renderMindMap(title, nodes) {
  return [
    '<div class="mini-mind-map">',
    '<span class="mind-node center">' + escapeHtml(title) + "</span>",
    nodes.map((node, index) => '<span class="mind-node node-' + index + '">' + escapeHtml(node) + "</span>").join(""),
    "</div>"
  ].join("");
}

function renderIdeaTest(test) {
  if (!test) {
    return [
      '<div class="idea-test-box">',
      "  <strong>" + escapeHtml(brainT("empty.noTestsTitle")) + "</strong>",
      "  <span>" + escapeHtml(brainT("empty.noTestsText")) + "</span>",
      "</div>"
    ].join("");
  }
  const days = Array.isArray(test.days) ? test.days : [];
  const tasks = days[0]?.tasks?.map((task) => task.text || String(task || "")).filter(Boolean) || [];
  return [
    '<div class="idea-test-box">',
    "  <strong>" + escapeHtml(test.title || brainT("workspace.ideaTest")) + "</strong>",
    "  <span>" + escapeHtml(brainT("labels.dayOneOf", { count: Number(days.length || test.dayCount || 1) })) + "</span>",
    '  <ul class="workspace-checklist">' + (tasks.length ? tasks.map((task) => '<li><input type="checkbox" />' + escapeHtml(task) + "</li>").join("") : "<li>" + escapeHtml(brainT("empty.noFirstDayTasks")) + "</li>") + "</ul>",
    "</div>"
  ].join("");
}

function getStoredFinancialSnapshotsForIdea(ideaId) {
  try {
    return window.MentorData?.repositories?.comparisons?.getSnapshots?.(ideaId) || [];
  } catch (error) {
    return [];
  }
}

function getStoredFinancialResearchOptionsForIdea(ideaId) {
  try {
    const cache = window.MentorData?.repositories?.comparisons?.getResearchCache?.() || {};
    const options = cache?.ideas?.[ideaId];
    return Array.isArray(options) ? options : [];
  } catch (error) {
    return [];
  }
}

function getResearchFinancialOptions(idea) {
  if (typeof window.getFinancialResearchComparisonOptions === "function") {
    const options = window.getFinancialResearchComparisonOptions(idea.id);
    if (options.length) return options;
  }
  const cachedOptions = getStoredFinancialResearchOptionsForIdea(idea.id);
  if (cachedOptions.length) return cachedOptions;
  const latestSnapshot = getStoredFinancialSnapshotsForIdea(idea.id)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];
  if (!latestSnapshot?.options?.length) return [];
  return latestSnapshot.options.slice(0, 3).map((option, index) => ({
    id: option.id,
    label: "OPCIJA " + String.fromCharCode(65 + index),
    title: option.name || "Opcija " + String.fromCharCode(65 + index),
    totalCost: latestSnapshot.selectedCost || 0,
    missingAmount: latestSnapshot.selectedMissing || 0,
    capitalAfter: Math.max((latestSnapshot.liquidAssets || 0) - (latestSnapshot.selectedCost || 0), 0),
    monthlyContribution: latestSnapshot.monthlyContribution || 0,
    monthsToGoal: null,
    pressureLabel: "Snimljeno poređenje",
    pressureTone: "neutral"
  }));
}

function formatResearchMoney(value) {
  return new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function renderResearchFinancialMetric(label, value, tone) {
  return '<div class="research-financial-metric"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong><i class="' + escapeHtml(tone || "neutral") + '"></i></div>';
}

function renderResearchFinancialComparison(idea) {
  const options = getResearchFinancialOptions(idea);
  if (!options.length) {
    return [
      '<div class="research-financial-empty">',
      "<p>" + escapeHtml(brainT("empty.noFinance")) + "</p>",
      '<button class="ghost-btn" type="button" data-open-financial-comparison="' + escapeHtml(idea.id) + '">' + escapeHtml(brainT("actions.openFinancialComparison")) + '</button>',
      "</div>"
    ].join("");
  }
  return [
    '<div class="research-financial-grid">',
    options.map((option) => [
      '<article class="research-financial-card">',
      "<h3>" + escapeHtml(option.label + " - " + option.title) + "</h3>",
      renderResearchFinancialMetric(window.MentorI18n?.t ? window.MentorI18n.t("research.finance.totalCost") : "Ukupan trošak", formatResearchMoney(option.totalCost), option.pressureTone),
      renderResearchFinancialMetric(window.MentorI18n?.t ? window.MentorI18n.t("research.finance.missing") : "Nedostaje", formatResearchMoney(option.missingAmount), option.missingAmount ? option.pressureTone : "good"),
      renderResearchFinancialMetric(window.MentorI18n?.t ? window.MentorI18n.t("research.finance.liquidAfter") : "Likvidno posle", formatResearchMoney(option.capitalAfter), option.capitalAfter ? "good" : "medium"),
      renderResearchFinancialMetric(window.MentorI18n?.t ? window.MentorI18n.t("research.finance.monthlyContribution") : "Mesečno izdvajanje", formatResearchMoney(option.monthlyContribution), option.pressureTone),
      renderResearchFinancialMetric(window.MentorI18n?.t ? window.MentorI18n.t("research.finance.monthsToRealization") : "Meseci do realizacije", option.monthsToGoal ? String(option.monthsToGoal) : (option.missingAmount === 0 ? (window.MentorI18n?.t ? window.MentorI18n.t("research.finance.now") : "Odmah") : "-"), option.pressureTone),
      '<div class="research-financial-status"><span>' + escapeHtml(window.MentorI18n?.t ? window.MentorI18n.t("research.finance.budgetImpact") : "Uticaj na budžet") + '</span><strong class="' + escapeHtml(option.pressureTone || "neutral") + '">' + escapeHtml(option.pressureLabel || (window.MentorI18n?.t ? window.MentorI18n.t("research.finance.noData") : "Nema podatka")) + "</strong></div>",
      "</article>"
    ].join("")).join(""),
    "</div>",
    '<button class="research-financial-link" type="button" data-open-financial-comparison="' + escapeHtml(idea.id) + '">' + escapeHtml(window.MentorI18n?.t ? window.MentorI18n.t("research.actions.financialDetails") : "Detaljnija poređenja tabela u Finansijsko poređenje") + '</button>'
  ].join("");
}

function renderRelatedIdeas(activeIdea) {
  const related = brainstormingState.ideas.filter((idea) => idea.id !== activeIdea.id).slice(0, 4);
  return [
    '<article class="workspace-panel related-ideas-panel">',
    "  <h2>" + escapeHtml(brainT("labels.relatedIdeas")) + "</h2>",
    '  <div class="related-ideas-row">',
    related.map((idea) => '<button type="button" data-open-preview="' + idea.id + '"><strong>' + escapeHtml(idea.title) + '</strong><span>' + escapeHtml(getBrainstormingStatusLabel(idea.status)) + "</span></button>").join(""),
    "  </div>",
    "</article>"
  ].join("");
}

function renderMilestones(milestones) {
  return '<div class="milestone-track">' + milestones.map((item, index) => [
    '<div class="milestone-step">',
    '  <span>' + (index + 1) + "</span>",
    "  <strong>" + escapeHtml(item.title) + "</strong>",
    "  <small>" + escapeHtml(item.status) + "</small>",
    "</div>"
  ].join("")).join("") + "</div>";
}

function renderBuildTasks(tasks) {
  return [
    '<div class="build-task-list">',
    tasks.map((task) => [
      '<label class="build-task-row">',
      '  <input type="checkbox" ' + (task.status === "Done" ? "checked" : "") + " />",
      "  <strong>" + escapeHtml(task.title) + "</strong>",
      '  <span class="task-chip">' + escapeHtml(task.status) + "</span>",
      "  <small>" + escapeHtml(task.due) + "</small>",
      "</label>"
    ].join("")).join(""),
    "</div>"
  ].join("");
}

function renderCalendarPreview(tasks) {
  return [
    '<div class="calendar-preview-strip">',
    ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day, index) => '<span class="' + (index === 2 ? "active" : "") + '">' + escapeHtml(brainT("calendarPreview." + day)) + "</span>").join(""),
    "</div>",
    '<ul class="workspace-list">' + tasks.slice(0, 3).map((task) => "<li>" + escapeHtml(task.title) + "</li>").join("") + "</ul>"
  ].join("");
}

function renderHabits(habits) {
  return habits.map((habit) => [
    '<div class="habit-row">',
    "  <strong>" + escapeHtml(habit.title) + "</strong>",
    '  <span class="habit-dots">' + Array.from({ length: 7 }, (_, index) => '<i class="' + (index < habit.streak ? "done" : "") + '"></i>').join("") + "</span>",
    "</div>"
  ].join("")).join("");
}

function renderBuildProgress(progress) {
  return [
    '<div class="build-progress-wrap">',
    '  <div class="progress-ring" style="--value: ' + Number(progress || 0) + '"><span>' + Number(progress || 0) + "%</span></div>",
    '  <div class="workspace-progress"><span style="width:' + Number(progress || 0) + '%"></span></div>',
    "</div>"
  ].join("");
}

function renderArchiveCard(idea) {
  return [
    '<article class="archive-card">',
    '  <span class="archive-thumb" style="--idea-image: ' + cssImageUrl(idea.image) + '"></span>',
    "  <div>",
    "    <h3>" + escapeHtml(idea.title) + "</h3>",
    "    <p>" + escapeHtml(idea.description) + "</p>",
    '    <div class="idea-preview-tags">' + renderTags(idea.tags) + "</div>",
    "    <small>" + escapeHtml(brainT("labels.archivedAt")) + ": " + escapeHtml(idea.archivedAt || brainT("labels.notRecorded")) + " · " + escapeHtml(brainT("labels.previous")) + ": " + escapeHtml(getBrainstormingStatusLabel(idea.previousStatus)) + "</small>",
    '    <div class="archive-actions">',
    '      <button class="ghost-btn" type="button" data-restore-idea="' + idea.id + '">' + escapeHtml(brainT("actions.restoreIdea")) + '</button>',
    '      <button class="ghost-btn" type="button" data-open-preview="' + idea.id + '">' + escapeHtml(brainT("actions.openPreview")) + '</button>',
    '      <button class="ghost-btn" type="button" data-delete-idea="' + idea.id + '">' + escapeHtml(brainT("actions.deleteForever")) + '</button>',
    "    </div>",
    "  </div>",
    "</article>"
  ].join("");
}

function bindWorkspaceActions(root) {
  root.querySelectorAll("[data-open-preview]").forEach((button) => {
    button.addEventListener("click", () => openIdeaOnBoard(button.dataset.openPreview));
  });
  root.querySelectorAll("[data-set-status]").forEach((button) => {
    button.addEventListener("click", () => updateIdeaStatus(button.dataset.ideaId, button.dataset.setStatus));
  });
  root.querySelector("[data-open-calendar]")?.addEventListener("click", () => {
    if (typeof setView === "function") setView("planner");
  });
  root.querySelectorAll("[data-open-financial-comparison]").forEach((button) => {
    button.addEventListener("click", () => {
      if (typeof setView === "function") setView("finance");
      if (typeof window.setFinanceTab === "function") window.setFinanceTab("ideas");
      if (typeof window.openFinancialComparisonForIdea === "function") {
        window.openFinancialComparisonForIdea(button.dataset.openFinancialComparison);
      }
    });
  });
}

function getPathData(idea) {
  const hadResearchDirections = Array.isArray(idea.pathData?.researchDirections);
  idea.pathData = { ...createDefaultPathData(idea), ...(idea.pathData || {}) };
  if (!hadResearchDirections && Array.isArray(idea.pathData.directions) && idea.pathData.directions.length) {
    idea.pathData.researchDirections = idea.pathData.directions;
  }
  normalizeIdeaResearchTests(idea.pathData);
  ensureResearchCanvasNoteIds(idea.pathData);
  return idea.pathData;
}

function ensureResearchCanvasNoteIds(pathData) {
  const materialize = (notes, linked) => {
    if (window.MentorResearchModel?.stabilizeNotes) return window.MentorResearchModel.stabilizeNotes(notes, linked);
    const used = new Set(notes.filter((note) => note && typeof note === "object" && note.id).map((note) => String(note.id)));
    return notes.map((note, index) => {
      if (!note || typeof note === "object" && note.id) return note;
      const base = linked ? "note_" + index : String(index); let id = base, suffix = 0;
      while (used.has(id)) id = base + "_legacy_" + ++suffix;
      used.add(id); return { ...(typeof note === "object" ? note : { body: note }), id };
    });
  };
  const directions = Array.isArray(pathData.researchDirections) ? pathData.researchDirections : [];
  directions.forEach((direction) => {
    if (Array.isArray(direction.notes)) {
      direction.notes = materialize(direction.notes, false);
    }
    (Array.isArray(direction.references) ? direction.references : []).forEach((reference) => {
      if (!Array.isArray(reference.notes)) return;
      reference.notes = materialize(reference.notes, true);
    });
  });
}

function normalizeIdeaResearchTests(pathData) {
  if (!pathData) return;
  if (!Array.isArray(pathData.tests)) pathData.tests = [];
  delete pathData.test;
}

function getBuildData(idea) {
  idea.buildData = { ...createDefaultBuildData(idea), ...(idea.buildData || {}) };
  return idea.buildData;
}

function createDefaultPathData(idea) {
  return {
    vision: idea.description || "",
    whyImportant: brainT("defaults.whyImportant"),
    clarity: 7,
    fear: 3,
    researchImages: [],
    researchLinks: idea.links || [],
    researchDirections: [],
    tests: [],
    mindMapNodes: ["Publika", "Format", "Resursi", "Test", "Rizici", "Prvi korak"],
    notes: [brainT("defaults.pathNote1"), brainT("defaults.pathNote2")],
    test: {
      title: "Test interesovanja",
      days: 3,
      currentDay: 2,
      progress: 66,
      tasks: ["Napiši hipotezu", "Podeli mini primer", "Zabeleži reakcije"]
    },
    nextSteps: ["Skupi 3 reference", "Napravi mali eksperiment", "Proceni energiju posle testa"]
  };
}

function createDefaultBuildData() {
  return {
    progress: 35,
    targetDate: "30. jun 2026.",
    milestones: [
      { title: brainT("defaults.preparation"), status: "Done" },
      { title: "MVP", status: "In Progress" },
      { title: brainT("defaults.testing"), status: "To Do" },
      { title: brainT("defaults.launch"), status: "To Do" }
    ],
    tasks: [
      { title: brainT("defaults.firstScope"), status: "Done", due: brainT("defaults.today") },
      { title: brainT("defaults.workingVersion"), status: "In Progress", due: brainT("defaults.friday") },
      { title: brainT("defaults.userTest"), status: "To Do", due: brainT("defaults.nextWeek") }
    ],
    habits: [
      { title: "Deep work", streak: 4 },
      { title: brainT("defaults.dailyReview"), streak: 6 },
      { title: brainT("defaults.learning"), streak: 3 }
    ],
    resources: ["https://notion.so", "https://drive.google.com"],
    notes: [brainT("defaults.buildNote1"), brainT("defaults.buildNote2")]
  };
}

function createSampleIdeas() {
  return [
    hydrateIdea({ id: "idea_001", title: "YouTube kanal o psihologiji", description: "Kratki video formati o navikama, emocijama i svakodnevnoj disciplini.", type: "Kreativna", status: "seed", energy: 8, image: BRAINSTORMING_SAMPLE_IMAGES[0], links: ["https://youtube.com"], tags: ["psihologija", "sadržaj", "edukacija"], x: 70, y: 78 }),
    hydrateIdea({ id: "idea_002", title: "Van life po Evropi", description: "Putovati kombijem kroz Evropu i raditi remote iz prirode.", type: "Lifestyle", status: "path", energy: 9, image: BRAINSTORMING_SAMPLE_IMAGES[1], links: [], tags: ["travel", "freedom", "remote"], x: 720, y: 112 })
  ];
}

function hydrateIdea(idea) {
  const nextIdea = {
    links: [],
    tags: [],
    priority: "Srednji",
    x: 80,
    y: 80,
    layer: 1,
    ...idea
  };
  nextIdea.status = normalizeStatus(nextIdea.status);
  nextIdea.priority = nextIdea.priority || "Srednji";
  nextIdea.createdAt = nextIdea.createdAt || new Date().toISOString();
  nextIdea.updatedAt = nextIdea.updatedAt || nextIdea.createdAt;
  ensureIdeaRatios(nextIdea);
  if (nextIdea.status === "path") {
    getPathData(nextIdea);
  }
  if (nextIdea.status === "build") nextIdea.buildData = { ...createDefaultBuildData(nextIdea), ...(nextIdea.buildData || {}) };
  return nextIdea;
}

function pickIdeaForWorkspace(status) {
  const ideas = getSearchedIdeas(brainstormingState.ideas);
  if (status === "path" && brainstormingState.activeResearchIdeaId) {
    const activeIdea = ideas.find((idea) => {
      return idea.id === brainstormingState.activeResearchIdeaId && (normalizeStatus(idea.status) === "path" || Boolean(idea.pathData));
    });
    if (activeIdea) return activeIdea;
  }
  return ideas.find((idea) => normalizeStatus(idea.status) === status) || null;
}

function getResearchIdeasForWorkspace() {
  return getSearchedIdeas(brainstormingState.ideas).filter((idea) => {
    return normalizeStatus(idea.status) === "path" || Boolean(idea.pathData);
  });
}

function openResearchIdeaAt(index, researchIdeas = getResearchIdeasForWorkspace()) {
  const idea = researchIdeas[index];
  if (!idea) return;

  brainstormingState.activeResearchIdeaId = idea.id;
  renderPathWorkspace();
}

async function openResearchIdeaById(ideaId) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea) return;

  if (normalizeStatus(idea.status) !== "path" && !idea.pathData) {
    idea.previousStatus = idea.status;
    idea.status = "path";
    idea.updatedAt = new Date().toISOString();
    ensureIdeaResearch(idea);
    if (!await saveIdeas()) return false;
    closeIdeaPreview();
  }

  brainstormingState.activeResearchIdeaId = idea.id;
  renderBrainstormingTab("path", { scrollToTop: true });
  return true;
}

async function addResearchDirectionToIdea(ideaId, direction) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea) return;

  const pathData = getPathData(idea);
  const nextDirection = {
    id: "direction_" + Date.now(),
    title: direction.title,
    type: direction.type || "",
    icon: direction.icon || "compass",
    references: [],
    notes: [],
    resources: [],
    test: {
      title: "",
      days: 7,
      currentDay: 0,
      progress: 0,
      tasks: []
    }
  };

  pathData.researchDirections = [...(pathData.researchDirections || []), nextDirection];
  idea.updatedAt = new Date().toISOString();
  if (!await saveIdeas()) return false;
  window.MentorResearch?.setActiveDirection?.(ideaId, nextDirection.id);
  renderPathWorkspace();
  return true;
}

async function deleteResearchDirectionFromIdea(ideaId, directionId) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea || !directionId) return;

  const pathData = getPathData(idea);
  const hasDirection = (pathData.researchDirections || pathData.directions || []).some((direction) => direction.id === directionId);
  const removedGroupImages = hasDirection ? (pathData.researchCanvasGroups || []).filter((group) => group.directionId === directionId && group.backgroundMediaId).map((group) => group.backgroundMediaId) : [];
  if (hasDirection) pruneResearchCanvasOrganization(pathData, (key) => key.startsWith("reference:" + directionId + ":") || key.startsWith("linked-note:" + directionId + ":") || key.startsWith("direction-note:" + directionId + ":"), directionId);
  if (Array.isArray(pathData.researchDirections)) {
    pathData.researchDirections = pathData.researchDirections.filter((direction) => direction.id !== directionId);
  }
  if (Array.isArray(pathData.directions)) {
    pathData.directions = pathData.directions.filter((direction) => direction.id !== directionId);
  }
  idea.updatedAt = new Date().toISOString();
  if (!await saveIdeas()) return false;
  removedGroupImages.forEach((id) => window.MentorData?.repositories?.media?.removeEntity?.("research-group", id).catch((error) => console.warn("Research group image could not be removed.", error)));
  renderPathWorkspace();
  return true;
}

async function updateResearchDirectionInIdea(ideaId, directionId, directionUpdate) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea || !directionId) return;

  const pathData = getPathData(idea);
  const directions = Array.isArray(pathData.researchDirections) ? pathData.researchDirections : pathData.directions;
  const direction = Array.isArray(directions) ? directions.find((item) => item.id === directionId) : null;
  if (!direction) return;

  direction.title = directionUpdate.title || direction.title;
  direction.type = directionUpdate.type || "";
  direction.icon = directionUpdate.icon || direction.icon || "compass";
  idea.updatedAt = new Date().toISOString();
  if (!await saveIdeas()) return false;
  renderPathWorkspace();
  return true;
}

async function addResearchReferenceToDirection(ideaId, directionId, reference) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea || !directionId) return;

  const pathData = getPathData(idea);
  const directions = Array.isArray(pathData.researchDirections) ? pathData.researchDirections : pathData.directions;
  const direction = Array.isArray(directions) ? directions.find((item) => item.id === directionId) : null;
  if (!direction) return;
  if (!validResearchCanvasConnectionSides(reference.canvasConnectionSides)) return false;
  if (reference.canvasParentKey) {
    const parent = getResearchCanvasParentEntities(pathData, ideaId).get(reference.canvasParentKey);
    if (!parent || parent.directionId !== directionId) return false;
  }

  const references = Array.isArray(direction.references) ? direction.references : [];
  const nextIndex = references.length + 1;
  const nextReference = {
    id: reference.id || "reference_" + Date.now(),
    title: reference.title || "Referenca (" + (direction.title || "pravac") + ") " + nextIndex,
    link: reference.link || "",
    image: reference.image || "",
    unitType: reference.unitType || "",
    unitValue: reference.unitValue || "",
    unitCustom: reference.unitCustom || "",
    unitLabel: reference.unitLabel || "",
    unitSystem: reference.unitSystem || "",
    cardType: reference.cardType || "",
    canvasParentKey: reference.canvasParentKey || "",
    canvasConnectionSides: reference.canvasConnectionSides || undefined,
    canvasPosition: reference.canvasPosition || undefined,
    noteTitle: reference.noteTitle || "Beleška " + nextIndex,
    note: reference.note || "",
    notes: Array.isArray(reference.notes) ? reference.notes : ((reference.noteTitle || reference.note) ? [{
      id: "note_" + Date.now(),
      title: reference.noteTitle || "Beleska " + nextIndex,
      body: reference.note || ""
    }] : []),
    createdAt: new Date().toISOString()
  };

  direction.references = [...references, nextReference];
  idea.updatedAt = new Date().toISOString();
  if (!await saveIdeas()) return false;
  renderPathWorkspace();
  return true;
}

async function deleteResearchReferenceFromDirection(ideaId, directionId, referenceId) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea || !directionId || !referenceId) return;

  const pathData = getPathData(idea);
  const directions = Array.isArray(pathData.researchDirections) ? pathData.researchDirections : pathData.directions;
  const direction = Array.isArray(directions) ? directions.find((item) => item.id === directionId) : null;
  if (!direction || !Array.isArray(direction.references)) return;
  if (direction.references.some((reference) => reference.id === referenceId)) {
    pruneResearchCanvasOrganization(pathData, (key) => key === "reference:" + directionId + ":" + referenceId || key.startsWith("linked-note:" + directionId + ":" + referenceId + ":"));
  }

  direction.references = direction.references.filter((reference) => reference.id !== referenceId);
  idea.updatedAt = new Date().toISOString();
  if (!await saveIdeas()) return false;
  renderPathWorkspace();
  return true;
}

async function updateResearchReferenceInDirection(ideaId, directionId, referenceId, referenceUpdate) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea || !directionId || !referenceId) return;
  if ("canvasConnectionSides" in referenceUpdate && !validResearchCanvasConnectionSides(referenceUpdate.canvasConnectionSides)) return false;

  const pathData = getPathData(idea);
  const directions = Array.isArray(pathData.researchDirections) ? pathData.researchDirections : pathData.directions;
  const direction = Array.isArray(directions) ? directions.find((item) => item.id === directionId) : null;
  const reference = direction?.references?.find((item) => item.id === referenceId);
  if (!reference) return;

  const previousReference = window.MentorResearchStickerCore?.clone(reference);
  const stableNotes = (value) => (Array.isArray(value.notes) ? value.notes : value.note || value.noteTitle ? [{ id: "note_legacy", title: value.noteTitle || "", body: value.note || "" }] : []).map((note, index) => typeof note === "string" ? { id: "note_" + index, body: note } : { ...note, id: note.id || "note_" + index });

  if ("title" in referenceUpdate) reference.title = referenceUpdate.title || reference.title;
  if ("link" in referenceUpdate) reference.link = referenceUpdate.link || "";
  if ("image" in referenceUpdate) reference.image = referenceUpdate.image || "";
  if ("unitType" in referenceUpdate) reference.unitType = referenceUpdate.unitType || "";
  if ("unitValue" in referenceUpdate) reference.unitValue = referenceUpdate.unitValue || "";
  if ("unitCustom" in referenceUpdate) reference.unitCustom = referenceUpdate.unitCustom || "";
  if ("unitLabel" in referenceUpdate) reference.unitLabel = referenceUpdate.unitLabel || "";
  if ("unitSystem" in referenceUpdate) reference.unitSystem = referenceUpdate.unitSystem || "";
  if ("cardType" in referenceUpdate) reference.cardType = referenceUpdate.cardType || "";
  if ("canvasParentKey" in referenceUpdate) reference.canvasParentKey = referenceUpdate.canvasParentKey || "";
  if ("canvasConnectionSides" in referenceUpdate) reference.canvasConnectionSides = referenceUpdate.canvasConnectionSides || undefined;
  if ("canvasPosition" in referenceUpdate) reference.canvasPosition = referenceUpdate.canvasPosition || undefined;
  if ("noteTitle" in referenceUpdate) reference.noteTitle = referenceUpdate.noteTitle || "";
  if ("note" in referenceUpdate) reference.note = referenceUpdate.note || "";
  if ("notes" in referenceUpdate) {
    reference.notes = stableNotes({ notes: Array.isArray(referenceUpdate.notes) ? referenceUpdate.notes : [] });
    reference.noteTitle = reference.notes[0]?.title || "";
    reference.note = reference.notes[0]?.body || "";
  }
  const core = window.MentorResearchStickerCore;
  if (core && previousReference) {
    const patch = {};
    if (reference.title !== previousReference.title) patch.title = reference.title;
    if (reference.image !== previousReference.image) patch.image = reference.image;
    if (reference.link !== previousReference.link) patch.links = String(reference.link || "").split(/\n|,\s*(?=https?:\/\/|www\.)/i).map((link) => link.trim()).filter(Boolean);
    if (["unitType", "unitValue", "unitCustom", "unitLabel", "unitSystem"].some((field) => reference[field] !== previousReference[field])) patch.unit = core.fromCard({ reference }).sections.find((entry) => entry.sectionType === "unit")?.content || null;
    core.syncLegacy(pathData, "reference:" + directionId + ":" + referenceId, patch);
    const beforeNotes = stableNotes(previousReference), afterNotes = stableNotes(reference);
    const remaining = new Set(afterNotes.map((note) => note.id));
    beforeNotes.forEach((note) => { if (!remaining.has(note.id)) pruneResearchCanvasOrganization(pathData, (key) => key === "linked-note:" + directionId + ":" + referenceId + ":" + note.id); });
    afterNotes.forEach((note) => {
      const old = beforeNotes.find((entry) => entry.id === note.id);
      const patch = {};
      if (old?.title !== note.title) patch.title = note.title;
      if ((old?.body || old?.text || "") !== (note.body || note.text || "")) patch.text = note.body || note.text || "";
      core.syncLegacy(pathData, "linked-note:" + directionId + ":" + referenceId + ":" + note.id, patch);
    });
  }
  idea.updatedAt = new Date().toISOString();
  return saveIdeas();
}

async function saveResearchCanvasPosition(ideaId, key, x, y) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea || !key || !Number.isFinite(x) || !Number.isFinite(y)) return false;
  const pathData = getPathData(idea);
  pathData.researchCanvasPositions = pathData.researchCanvasPositions || {};
  pathData.researchCanvasPositions[key] = { x: Math.round(x), y: Math.round(y) };
  idea.updatedAt = new Date().toISOString();
  return saveIdeas();
}

async function saveResearchCanvasMove(ideaId, positions, sides = {}, focusParentKey = "", groups = null) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea || !positions || typeof positions !== "object" || Array.isArray(positions) ||
      !Object.keys(positions).length || Object.values(positions).some((point) => !Number.isFinite(point?.x) || !Number.isFinite(point?.y)) ||
      !sides || typeof sides !== "object" || Array.isArray(sides) ||
      (groups !== null && (!Array.isArray(groups) || focusParentKey))) return false;
  const pathData = getPathData(idea);
  const entities = getResearchCanvasParentEntities(pathData, ideaId);
  if (Object.entries(sides).some(([key, value]) => !/^(?:item|reference):/.test(key) ||
      !entities.get(key)?.value || !validResearchCanvasConnectionSides(value) ||
      !["parent", "child"].every((end) => typeof value?.[end] === "string") ||
      !(entities.get(key).value.canvasParentKey || entities.get(key).parentKey))) return false;
  const previousUpdatedAt = idea.updatedAt;
  const previousPositions = pathData.researchCanvasPositions;
  const previousFocus = pathData.researchCanvasFocusPositions;
  const previousGroups = pathData.researchCanvasGroups;
  const previousSides = Object.fromEntries(Object.keys(sides).map((key) => [key, entities.get(key).value.canvasConnectionSides]));
  const rounded = Object.fromEntries(Object.entries(positions).map(([key, point]) => [key, {
    x: focusParentKey ? Math.max(0, Math.round(point.x)) : Math.round(point.x),
    y: focusParentKey ? Math.max(0, Math.round(point.y)) : Math.round(point.y)
  }]));
  if (focusParentKey) pathData.researchCanvasFocusPositions = { ...previousFocus,
    [focusParentKey]: { ...previousFocus?.[focusParentKey], ...rounded } };
  else pathData.researchCanvasPositions = { ...previousPositions, ...rounded };
  if (groups !== null) pathData.researchCanvasGroups = groups;
  Object.entries(sides).forEach(([key, value]) => { entities.get(key).value.canvasConnectionSides = { ...value }; });
  idea.updatedAt = new Date().toISOString();
  const restore = () => {
    if (previousPositions === undefined) delete pathData.researchCanvasPositions;
    else pathData.researchCanvasPositions = previousPositions;
    if (previousFocus === undefined) delete pathData.researchCanvasFocusPositions;
    else pathData.researchCanvasFocusPositions = previousFocus;
    if (previousGroups === undefined) delete pathData.researchCanvasGroups;
    else pathData.researchCanvasGroups = previousGroups;
    Object.entries(previousSides).forEach(([key, value]) => {
      if (value === undefined) delete entities.get(key).value.canvasConnectionSides;
      else entities.get(key).value.canvasConnectionSides = value;
    });
    idea.updatedAt = previousUpdatedAt;
  };
  try {
    if (await saveIdeas()) return true;
    restore();
    return false;
  } catch (error) { restore(); throw error; }
}

async function saveResearchCanvasOrganization(ideaId, patch) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea || !patch || typeof patch !== "object") return false;
  const allowed = ["researchCanvasGroups", "researchCanvasKeyFindings", "researchCanvasAnnotations", "researchCanvasPositions", "researchCanvasCameras", "researchCanvasStickerStyles"];
  const keys = allowed.filter((key) => Object.hasOwn(patch, key));
  if (!keys.length) return false;
  if (keys.includes("researchCanvasGroups") && !Array.isArray(patch.researchCanvasGroups)) return false;
  if (keys.includes("researchCanvasAnnotations") && !Array.isArray(patch.researchCanvasAnnotations)) return false;
  if (keys.includes("researchCanvasKeyFindings") && (!patch.researchCanvasKeyFindings || typeof patch.researchCanvasKeyFindings !== "object" || Array.isArray(patch.researchCanvasKeyFindings))) return false;
  if (keys.includes("researchCanvasPositions") && (!patch.researchCanvasPositions || typeof patch.researchCanvasPositions !== "object" || Array.isArray(patch.researchCanvasPositions) ||
    Object.values(patch.researchCanvasPositions).some((point) => !Number.isFinite(point?.x) || !Number.isFinite(point?.y)))) return false;
  if (keys.includes("researchCanvasCameras") && (!patch.researchCanvasCameras || typeof patch.researchCanvasCameras !== "object" || Array.isArray(patch.researchCanvasCameras) ||
    Object.values(patch.researchCanvasCameras).some((camera) => !Number.isFinite(camera?.x) || !Number.isFinite(camera?.y) || !Number.isFinite(camera?.zoom) || camera.zoom < 0.25 || camera.zoom > 3))) return false;
  if (keys.includes("researchCanvasStickerStyles") && (!patch.researchCanvasStickerStyles || typeof patch.researchCanvasStickerStyles !== "object" || Array.isArray(patch.researchCanvasStickerStyles) ||
    Object.values(patch.researchCanvasStickerStyles).some((style) => !style || typeof style !== "object" || Array.isArray(style) ||
      Object.entries(style).some(([field, value]) => ["backgroundColor", "borderColor", "textColor", "unitFillColor"].includes(field) ? !/^#[0-9a-fA-F]{6}$/.test(value) : field === "fontFamily" ? !["Inter", "Georgia", "Arial", "monospace"].includes(value) : field === "fontSize" ? !Number.isInteger(value) || value < 11 || value > 24 : true)))) return false;
  const pathData = getPathData(idea);
  const previous = Object.fromEntries(keys.map((key) => [key, { exists: Object.hasOwn(pathData, key), value: pathData[key] }]));
  const previousUpdatedAt = idea.updatedAt;
  keys.forEach((key) => {
    pathData[key] = key === "researchCanvasPositions" || key === "researchCanvasCameras"
      ? { ...(pathData[key] || {}), ...patch[key] }
      : patch[key];
  });
  idea.updatedAt = new Date().toISOString();
  const restore = () => {
    keys.forEach((key) => { if (previous[key].exists) pathData[key] = previous[key].value; else delete pathData[key]; });
    idea.updatedAt = previousUpdatedAt;
  };
  try {
    if (await saveIdeas()) return true;
    restore();
    return false;
  } catch (error) {
    restore();
    throw error;
  }
}

function pruneResearchCanvasOrganization(pathData, shouldRemoveKey, removedDirectionId = "") {
  const previous = {
    groups: pathData.researchCanvasGroups,
    findings: pathData.researchCanvasKeyFindings,
    annotations: pathData.researchCanvasAnnotations,
    cameras: pathData.researchCanvasCameras,
    stickerStyles: pathData.researchCanvasStickerStyles,
    stickerDocuments: pathData.researchCanvasStickerDocuments
  };
  if (Array.isArray(previous.groups)) {
    pathData.researchCanvasGroups = previous.groups
      .filter((group) => group.directionId !== removedDirectionId || !removedDirectionId)
      .map((group) => ({ ...group, memberKeys: (group.memberKeys || []).filter((key) => !shouldRemoveKey(key)) }));
  }
  if (previous.findings && typeof previous.findings === "object") {
    pathData.researchCanvasKeyFindings = Object.fromEntries(Object.entries(previous.findings).filter(([key]) => !shouldRemoveKey(key)));
  }
  if (removedDirectionId && Array.isArray(previous.annotations)) {
    pathData.researchCanvasAnnotations = previous.annotations.filter((item) => item.directionId !== removedDirectionId);
  }
  if (removedDirectionId && previous.cameras && typeof previous.cameras === "object") {
    const key = JSON.stringify([removedDirectionId]);
    pathData.researchCanvasCameras = Object.fromEntries(Object.entries(previous.cameras).filter(([cameraKey]) => cameraKey !== key));
  }
  if (previous.stickerStyles && typeof previous.stickerStyles === "object") {
    pathData.researchCanvasStickerStyles = Object.fromEntries(Object.entries(previous.stickerStyles).filter(([key]) => !shouldRemoveKey(key)));
  }
  if (previous.stickerDocuments && typeof previous.stickerDocuments === "object") {
    pathData.researchCanvasStickerDocuments = Object.fromEntries(Object.entries(previous.stickerDocuments).filter(([key]) => !shouldRemoveKey(key)));
  }
  return () => {
    if (previous.groups !== undefined) pathData.researchCanvasGroups = previous.groups;
    if (previous.findings !== undefined) pathData.researchCanvasKeyFindings = previous.findings;
    if (previous.annotations !== undefined) pathData.researchCanvasAnnotations = previous.annotations;
    if (previous.cameras !== undefined) pathData.researchCanvasCameras = previous.cameras;
    if (previous.stickerStyles !== undefined) pathData.researchCanvasStickerStyles = previous.stickerStyles;
    if (previous.stickerDocuments !== undefined) pathData.researchCanvasStickerDocuments = previous.stickerDocuments;
  };
}

async function saveResearchCanvasCollapsed(ideaId, key, collapsed) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea || !key) return false;
  const pathData = getPathData(idea);
  pathData.researchCanvasCollapsed = pathData.researchCanvasCollapsed || {};
  if (collapsed) pathData.researchCanvasCollapsed[key] = true;
  else delete pathData.researchCanvasCollapsed[key];
  idea.updatedAt = new Date().toISOString();
  return saveIdeas();
}

async function saveResearchCanvasFocusPosition(ideaId, parentKey, key, x, y) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea || !parentKey || !key || !Number.isFinite(x) || !Number.isFinite(y)) return false;
  const pathData = getPathData(idea);
  const workspaces = pathData.researchCanvasFocusPositions || (pathData.researchCanvasFocusPositions = {});
  const positions = workspaces[parentKey] || (workspaces[parentKey] = {});
  positions[key] = { x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)) };
  return saveIdeas();
}

async function saveResearchCanvasSize(ideaId, key, width, height, parentKey = "", expanded = false) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea || !key || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return false;
  const pathData = getPathData(idea);
  const maps = parentKey
    ? pathData.researchCanvasFocusSizes || (pathData.researchCanvasFocusSizes = {})
    : pathData.researchCanvasSizes || (pathData.researchCanvasSizes = {});
  const sizes = parentKey ? maps[parentKey] || (maps[parentKey] = {}) : maps;
  sizes[key] = { width: Math.round(width), height: Math.round(height) };
  if (expanded && !parentKey) sizes[key].expanded = true;
  return saveIdeas();
}

async function resetResearchCanvasSize(ideaId, key, width) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea || !key) return false;
  if (!Number.isFinite(width) || width <= 0) return false;
  const pathData = getPathData(idea);
  const sizes = pathData.researchCanvasSizes || (pathData.researchCanvasSizes = {});
  sizes[key] = { width: Math.round(width) };
  return saveIdeas();
}

function getResearchCanvasParentEntities(pathData, ideaId) {
  const directions = Array.isArray(pathData.researchDirections) ? pathData.researchDirections : [];
  const firstDirectionId = directions[0]?.id || "";
  const entities = new Map();
  (Array.isArray(pathData.researchCanvasItems) ? pathData.researchCanvasItems : []).forEach((item) => {
    entities.set("item:" + item.id, { value: item, directionId: item.directionId || firstDirectionId });
  });
  directions.forEach((direction) => {
    (Array.isArray(direction.references) ? direction.references : []).forEach((reference) => {
      const referenceKey = "reference:" + direction.id + ":" + reference.id;
      entities.set(referenceKey, { value: reference, directionId: direction.id });
      (Array.isArray(reference.notes) ? reference.notes : []).forEach((note, index) => {
        const noteId = note?.id || "note_" + index;
        entities.set("linked-note:" + direction.id + ":" + reference.id + ":" + noteId, { directionId: direction.id, parentKey: referenceKey });
      });
      if (!Array.isArray(reference.notes) && (reference.noteTitle || reference.note)) {
        entities.set("linked-note:" + direction.id + ":" + reference.id + ":note_legacy", { directionId: direction.id, parentKey: referenceKey });
      }
    });
    (Array.isArray(direction.notes) ? direction.notes : []).forEach((note, index) => {
      if (note == null) return;
      entities.set("direction-note:" + direction.id + ":" + (note?.id || String(index)), { directionId: direction.id });
    });
  });
  let financeOptions = [];
  try {
    if (typeof window.getFinancialResearchComparisonOptions === "function") financeOptions = window.getFinancialResearchComparisonOptions(ideaId) || [];
    if (!financeOptions.length) financeOptions = window.MentorData?.repositories?.comparisons?.getResearchCache?.()?.ideas?.[ideaId] || [];
  } catch (error) { financeOptions = []; }
  if (Array.isArray(financeOptions)) financeOptions.forEach((option) => {
    if (option?.id) entities.set("finance:" + option.id, { directionId: firstDirectionId });
  });
  return entities;
}

function validResearchCanvasConnectionSides(sides, allowReset = false) {
  return sides == null || (typeof sides === "object" && !Array.isArray(sides) &&
    Object.keys(sides).every((name) => ["parent", "child"].includes(name) &&
      (allowReset && sides[name] === null || ["top", "right", "bottom", "left"].includes(sides[name]))));
}

async function saveResearchCanvasParent(ideaId, key, parentKey = "", position = null, sides = null) {
  const idea = brainstormingState.ideas.find((entry) => entry.id === ideaId);
  if (!idea || typeof key !== "string" || typeof parentKey !== "string") return false;
  const pathData = getPathData(idea);
  const entities = getResearchCanvasParentEntities(pathData, ideaId);
  const child = entities.get(key);
  const parent = parentKey ? entities.get(parentKey) : null;
  if (!child?.value || !/^(?:item|reference):/.test(key) || (parentKey && (!parent || parentKey === key || parent.directionId !== child.directionId))) return false;
  if (position && (!Number.isFinite(position.x) || !Number.isFinite(position.y))) return false;
  if (!validResearchCanvasConnectionSides(sides, true)) return false;
  // Check the full saved chain, including data that predates this control.
  const visited = new Set([key]);
  let cursor = parentKey;
  while (cursor) {
    if (visited.has(cursor)) return false;
    visited.add(cursor);
    const entity = entities.get(cursor);
    cursor = entity?.value?.canvasParentKey || entity?.parentKey || "";
  }
  const oldParent = child.value.canvasParentKey || "";
  const parentChanged = oldParent !== parentKey;
  if (!parentChanged && !position && !sides) return true;
  const oldUpdatedAt = idea.updatedAt;
  const oldFocusPositions = pathData.researchCanvasFocusPositions;
  const oldFocusSizes = pathData.researchCanvasFocusSizes;
  const oldCollapsed = pathData.researchCanvasCollapsed;
  const oldPositions = pathData.researchCanvasPositions;
  const oldSides = child.value.canvasConnectionSides;
  child.value.canvasParentKey = parentKey;
  if (parentChanged || sides) {
    const nextSides = { ...(oldSides || {}) };
    if (parentChanged || !parentKey) delete nextSides.parent;
    if (!parentKey) delete nextSides.child;
    if (parentKey && sides) Object.entries(sides).forEach(([endpoint, side]) => {
      if (side === null) delete nextSides[endpoint];
      else nextSides[endpoint] = side;
    });
    if (Object.keys(nextSides).length) child.value.canvasConnectionSides = nextSides;
    else delete child.value.canvasConnectionSides;
  }
  if (position) pathData.researchCanvasPositions = { ...oldPositions, [key]: { x: Math.round(position.x), y: Math.round(position.y) } };
  if (parentKey && oldCollapsed?.[parentKey]) {
    pathData.researchCanvasCollapsed = { ...oldCollapsed };
    delete pathData.researchCanvasCollapsed[parentKey];
  }
  // Old zoom workspaces must not retain placement for the moved branch.
  const branch = new Set([key]);
  let changed = true;
  while (changed) {
    changed = false;
    entities.forEach((entity, entityKey) => {
      if (!branch.has(entityKey) && branch.has(entity.value?.canvasParentKey || entity.parentKey)) { branch.add(entityKey); changed = true; }
    });
  }
  for (const field of parentChanged ? ["researchCanvasFocusPositions", "researchCanvasFocusSizes"] : []) {
    const saved = pathData[field];
    if (!saved || typeof saved !== "object") continue;
    const next = { ...saved };
    Object.keys(next).forEach((workspaceKey) => {
      if (branch.has(workspaceKey)) return;
      const workspace = next[workspaceKey];
      if (!workspace || typeof workspace !== "object" || ![...branch].some((branchKey) => branchKey in workspace)) return;
      next[workspaceKey] = { ...workspace };
      branch.forEach((branchKey) => { delete next[workspaceKey][branchKey]; });
    });
    pathData[field] = next;
  }
  idea.updatedAt = new Date().toISOString();
  try {
    if (!await saveIdeas()) {
      child.value.canvasParentKey = oldParent;
      if (oldSides === undefined) delete child.value.canvasConnectionSides; else child.value.canvasConnectionSides = oldSides;
      pathData.researchCanvasFocusPositions = oldFocusPositions;
      pathData.researchCanvasFocusSizes = oldFocusSizes;
      pathData.researchCanvasCollapsed = oldCollapsed;
      pathData.researchCanvasPositions = oldPositions;
      idea.updatedAt = oldUpdatedAt;
      return false;
    }
  } catch (error) {
    child.value.canvasParentKey = oldParent;
    if (oldSides === undefined) delete child.value.canvasConnectionSides; else child.value.canvasConnectionSides = oldSides;
    pathData.researchCanvasFocusPositions = oldFocusPositions;
    pathData.researchCanvasFocusSizes = oldFocusSizes;
    pathData.researchCanvasCollapsed = oldCollapsed;
    pathData.researchCanvasPositions = oldPositions;
    idea.updatedAt = oldUpdatedAt;
    throw error;
  }
  try { renderPathWorkspace(); } catch (error) { console.warn("Saved research sticker connection could not be refreshed.", error); }
  return true;
}

async function transferResearchCanvasChild(ideaId, childKey, targetKey, sides = null) {
  const idea = brainstormingState.ideas.find((entry) => entry.id === ideaId);
  if (!idea || typeof childKey !== "string" || typeof targetKey !== "string" || childKey === targetKey) return false;
  const pathData = getPathData(idea);
  const entities = getResearchCanvasParentEntities(pathData, ideaId);
  const child = entities.get(childKey);
  const target = entities.get(targetKey);
  const parentKey = child?.value?.canvasParentKey || "";
  const parent = entities.get(parentKey);
  if (!validResearchCanvasConnectionSides(sides)) return false;
  if (!/^(?:item|reference):/.test(childKey) || !/^(?:item|reference):/.test(targetKey) ||
      !child?.value || !target?.value || !parent || targetKey === parentKey ||
      child.directionId !== target.directionId || target.directionId !== parent.directionId) return false;
  // The old child is detached before validating the new chain.
  const visited = new Set([targetKey]);
  let cursor = parentKey;
  while (cursor) {
    if (visited.has(cursor)) return false;
    visited.add(cursor);
    const entity = entities.get(cursor);
    cursor = cursor === childKey ? "" : entity?.value?.canvasParentKey || entity?.parentKey || "";
  }
  const oldChildParent = child.value.canvasParentKey;
  const oldTargetParent = target.value.canvasParentKey;
  const oldChildSides = child.value.canvasConnectionSides;
  const oldTargetSides = target.value.canvasConnectionSides;
  const oldUpdatedAt = idea.updatedAt;
  const oldFocusPositions = pathData.researchCanvasFocusPositions;
  const oldFocusSizes = pathData.researchCanvasFocusSizes;
  const oldCollapsed = pathData.researchCanvasCollapsed;
  child.value.canvasParentKey = "";
  delete child.value.canvasConnectionSides;
  target.value.canvasParentKey = parentKey;
  const nextSides = { ...(oldChildSides?.parent ? { parent: oldChildSides.parent } : {}), ...(sides || {}) };
  if (Object.keys(nextSides).length) target.value.canvasConnectionSides = nextSides;
  else delete target.value.canvasConnectionSides;
  if (oldCollapsed?.[parentKey]) {
    pathData.researchCanvasCollapsed = { ...oldCollapsed };
    delete pathData.researchCanvasCollapsed[parentKey];
  }
  const parentOf = (key) => {
    const entity = entities.get(key);
    return entity?.value?.canvasParentKey || entity?.parentKey || "";
  };
  const affected = new Set([childKey, targetKey]);
  let changed = true;
  while (changed) {
    changed = false;
    entities.forEach((entity, key) => {
      if (!affected.has(key) && affected.has(parentOf(key))) { affected.add(key); changed = true; }
    });
  }
  for (const field of ["researchCanvasFocusPositions", "researchCanvasFocusSizes"]) {
    const saved = pathData[field];
    if (!saved || typeof saved !== "object") continue;
    const next = { ...saved };
    Object.keys(next).forEach((workspaceKey) => {
      const workspace = next[workspaceKey];
      if (!workspace || typeof workspace !== "object") return;
      const nextWorkspace = { ...workspace };
      let modified = false;
      affected.forEach((key) => {
        let cursor = key;
        const seen = new Set();
        while (cursor && cursor !== workspaceKey && !seen.has(cursor)) { seen.add(cursor); cursor = parentOf(cursor); }
        if (cursor !== workspaceKey && key in nextWorkspace) { delete nextWorkspace[key]; modified = true; }
      });
      if (modified) next[workspaceKey] = nextWorkspace;
    });
    pathData[field] = next;
  }
  idea.updatedAt = new Date().toISOString();
  try {
    if (!await saveIdeas()) {
      if (oldChildParent === undefined) delete child.value.canvasParentKey; else child.value.canvasParentKey = oldChildParent;
      if (oldTargetParent === undefined) delete target.value.canvasParentKey; else target.value.canvasParentKey = oldTargetParent;
      if (oldChildSides === undefined) delete child.value.canvasConnectionSides; else child.value.canvasConnectionSides = oldChildSides;
      if (oldTargetSides === undefined) delete target.value.canvasConnectionSides; else target.value.canvasConnectionSides = oldTargetSides;
      pathData.researchCanvasFocusPositions = oldFocusPositions;
      pathData.researchCanvasFocusSizes = oldFocusSizes;
      pathData.researchCanvasCollapsed = oldCollapsed;
      idea.updatedAt = oldUpdatedAt;
      return false;
    }
  } catch (error) {
    if (oldChildParent === undefined) delete child.value.canvasParentKey; else child.value.canvasParentKey = oldChildParent;
    if (oldTargetParent === undefined) delete target.value.canvasParentKey; else target.value.canvasParentKey = oldTargetParent;
    if (oldChildSides === undefined) delete child.value.canvasConnectionSides; else child.value.canvasConnectionSides = oldChildSides;
    if (oldTargetSides === undefined) delete target.value.canvasConnectionSides; else target.value.canvasConnectionSides = oldTargetSides;
    pathData.researchCanvasFocusPositions = oldFocusPositions;
    pathData.researchCanvasFocusSizes = oldFocusSizes;
    pathData.researchCanvasCollapsed = oldCollapsed;
    idea.updatedAt = oldUpdatedAt;
    throw error;
  }
  try { renderPathWorkspace(); } catch (error) { console.warn("Transferred research sticker connection could not be refreshed.", error); }
  return true;
}

async function saveResearchCanvasItem(ideaId, item) {
  const idea = brainstormingState.ideas.find((entry) => entry.id === ideaId);
  if (!idea || !item || !["note", "av", "source", "link", "image", "video", "finance"].includes(item.type)) return false;
  if (!validResearchCanvasConnectionSides(item.canvasConnectionSides)) return false;
  const pathData = getPathData(idea);
  const items = Array.isArray(pathData.researchCanvasItems) ? pathData.researchCanvasItems : [];
  const index = items.findIndex((entry) => entry.id === item.id);
  const previousMediaId = index >= 0 ? items[index]?.videoMediaId : "";
  const previousAttachment = index >= 0 ? items[index] : null;
  const previousUpdatedAt = idea.updatedAt;
  const previousCollapsed = pathData.researchCanvasCollapsed;
  const directionId = index >= 0
    ? items[index].directionId || pathData.researchDirections?.[0]?.id || ""
    : item.directionId || window.MentorResearch?.getActiveDirectionId?.(idea) || "";
  const nextItem = { ...(index >= 0 ? items[index] : {}), ...item, directionId, id: item.id || "canvas_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7) };
  if (index < 0 && nextItem.canvasParentKey) {
    const parent = getResearchCanvasParentEntities(pathData, ideaId).get(nextItem.canvasParentKey);
    if (!parent || parent.directionId !== directionId) return false;
  }
  if (index < 0 && nextItem.canvasParentKey && previousCollapsed?.[nextItem.canvasParentKey]) {
    pathData.researchCanvasCollapsed = { ...previousCollapsed };
    delete pathData.researchCanvasCollapsed[nextItem.canvasParentKey];
  }
  pathData.researchCanvasItems = index >= 0 ? items.map((entry, position) => position === index ? { ...entry, ...nextItem } : entry) : [...items, nextItem];
  idea.updatedAt = new Date().toISOString();
  try {
    if (!await saveIdeas()) { pathData.researchCanvasItems = items; pathData.researchCanvasCollapsed = previousCollapsed; idea.updatedAt = previousUpdatedAt; return false; }
  } catch (error) { pathData.researchCanvasItems = items; pathData.researchCanvasCollapsed = previousCollapsed; idea.updatedAt = previousUpdatedAt; throw error; }
  try { renderPathWorkspace(); } catch (error) { console.warn("Saved research canvas could not be refreshed.", error); }
  if (!window.MentorResearchStickerCore && previousAttachment?.attachmentMediaId && previousAttachment.attachmentMediaId !== nextItem.attachmentMediaId) {
    window.MentorData?.repositories?.media?.removeEntity?.("research-" + previousAttachment.type, previousAttachment.attachmentMediaId).catch(console.warn);
  }
  if (!window.MentorResearchStickerCore && previousMediaId && previousMediaId !== nextItem.videoMediaId) {
    window.MentorData?.repositories?.media?.removeEntity?.("research-video", previousMediaId).catch((error) => console.warn("Old research video could not be removed.", error));
  }
  return true;
}

async function saveResearchCanvasSticker(ideaId, draft) {
  const core = window.MentorResearchStickerCore;
  if (!core || !draft?.card || !draft.document || draft.card.source === "finance") return false;
  const hasStickerStyle = Object.hasOwn(draft, "stickerStyle"), styleApi = window.MentorResearchStickerStyle;
  if (hasStickerStyle && (!styleApi?.sanitize || !draft.stickerStyle || typeof draft.stickerStyle !== "object" || Array.isArray(draft.stickerStyle))) return false;
  const staged = [];
  const media = window.MentorData?.repositories?.media;
  let uncertain = false;
  try {
    const document = core.normalize(draft.document);
    for (const pending of draft.pending || []) {
      const asset = core.assets(document).find((entry) => entry.id === pending.assetId);
      if (!asset) continue;
      const file = pending.file;
      if (!(file instanceof Blob) || !file.size || file.size > (asset.kind === "file" ? 25 : 100) * 1024 * 1024) throw new Error("Invalid sticker file.");
      if (!media?.put || !["indexeddb", "legacy-indexeddb"].includes(media.storageKind)) throw new Error("Persistent media storage is unavailable.");
      if (asset.kind === "image" && !/^image\/(?:png|jpeg|webp|gif|avif|bmp)$/i.test(file.type || asset.mime)) throw new Error("Invalid sticker image.");
      const standaloneVideo = document.sections.some((entry) => entry.sectionType === "video" && entry.content.asset === asset);
      if (["audio", "video"].includes(asset.kind) && !standaloneVideo) await window.MentorResearchAttachments.validate(file, "av");
      const entityType = standaloneVideo ? "research-video" : ["audio", "video"].includes(asset.kind) ? "research-av" : "research-source";
      const mediaId = core.uid("sticker-media");
      await media.put({ id: entityType + "-image:" + mediaId, entityType, entityId: mediaId, blob: file, type: file.type || asset.mime || "application/octet-stream", originalName: file.name || "", size: file.size, updatedAt: new Date().toISOString() });
      staged.push({ entityType, mediaId });
      Object.assign(asset, { mediaId, entityType, url: "", size: file.size, mime: file.type || asset.mime || "application/octet-stream" });
    }
    core.assets(document).forEach((asset) => { if (asset.mediaId) asset.url = ""; else if (/^blob:/i.test(asset.url || "")) throw new Error("Unsaved sticker media."); });
    // Re-resolve the current owner after asynchronous media writes and failed-save hydration.
    const idea = brainstormingState.ideas.find((entry) => entry.id === ideaId);
    if (!idea) throw new Error("Sticker idea no longer exists.");
    const previousPathData = getPathData(idea), nextPathData = core.clone(previousPathData);
    const card = { ...draft.card, directionId: draft.card.directionId || draft.card.direction?.id || window.MentorResearch?.getActiveDirectionId?.(idea) || "" };
    if (!card.key && card.canvasParentKey) {
      const parent = getResearchCanvasParentEntities(previousPathData, ideaId).get(card.canvasParentKey);
      if (!parent || parent.directionId !== card.directionId || !validResearchCanvasConnectionSides(card.canvasConnectionSides)) throw new Error("Invalid sticker parent.");
    }
    const savedKey = core.apply(nextPathData, card, document);
    if (hasStickerStyle) {
      const styles = { ...(nextPathData.researchCanvasStickerStyles || {}) }, style = styleApi.sanitize(draft.stickerStyle);
      if (Object.keys(style).length) styles[savedKey] = style; else delete styles[savedKey];
      nextPathData.researchCanvasStickerStyles = styles;
    }
    if (!card.key && card.canvasParentKey && nextPathData.researchCanvasCollapsed?.[card.canvasParentKey]) delete nextPathData.researchCanvasCollapsed[card.canvasParentKey];
    const previousUpdatedAt = idea.updatedAt;
    idea.pathData = nextPathData; idea.updatedAt = new Date().toISOString();
    let saved;
    try { saved = await saveIdeas(); }
    catch (error) { idea.pathData = previousPathData; idea.updatedAt = previousUpdatedAt; uncertain = Boolean(error.commitUncertain); throw error; }
    if (saved !== true) { uncertain = Boolean(brainstormingState.persistenceError?.commitUncertain); idea.pathData = previousPathData; idea.updatedAt = previousUpdatedAt; return false; }
    if (!draft.preserveView) try { renderPathWorkspace(); } catch (error) { console.warn("Saved sticker could not be refreshed.", error); }
    return true;
  } finally {
    if (!uncertain) {
      const retained = core.mediaReferences(window.MentorData?.repositories?.ideas?.getAll?.() || []);
      staged.forEach((record) => { if (!retained.has(record.entityType + "\n" + record.mediaId)) media.removeEntity(record.entityType, record.mediaId).catch((error) => console.warn("Staged sticker media could not be removed.", error)); });
    }
  }
}

async function saveResearchCanvasVideo(ideaId, item, file) {
  const media = window.MentorData?.repositories?.media;
  if (!file || !["indexeddb", "legacy-indexeddb"].includes(media?.storageKind) || typeof media.put !== "function") {
    throw new Error("Persistent video storage is unavailable.");
  }
  const itemId = item.id || "canvas_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  const mediaId = "research-video:" + ideaId + ":" + itemId + ":" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  await media.put({ id: "research-video-image:" + mediaId, entityType: "research-video", entityId: mediaId, blob: file, type: file.type || "application/octet-stream", originalName: file.name || "", size: file.size, updatedAt: new Date().toISOString() });
  try {
    const saved = await saveResearchCanvasItem(ideaId, { ...item, id: itemId, url: "", videoMediaId: mediaId });
    if (saved) return true;
  } catch (error) {
    await media.removeEntity("research-video", mediaId).catch(() => {});
    throw error;
  }
  await media.removeEntity("research-video", mediaId).catch(() => {});
  return false;
}

async function saveResearchCanvasAttachment(ideaId, item, file) {
  const media = window.MentorData?.repositories?.media;
  if (!["indexeddb", "legacy-indexeddb"].includes(media?.storageKind) || !media?.put) throw new Error("Persistent media storage is unavailable.");
  const info = await window.MentorResearchAttachments.validate(file, item.type);
  const itemId = item.id || "canvas_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  const entityType = "research-" + item.type;
  const mediaId = entityType + ":" + ideaId + ":" + itemId + ":" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  await media.put({ id: entityType + "-image:" + mediaId, entityType, entityId: mediaId, blob: file, type: info.mime, originalName: file.name || "", size: file.size, updatedAt: new Date().toISOString() });
  try {
    if (await saveResearchCanvasItem(ideaId, { ...item, id: itemId, url: "", attachmentMediaId: mediaId, attachmentName: file.name || "", attachmentKind: info.kind, attachmentMime: info.mime })) return true;
  } catch (error) { await media.removeEntity(entityType, mediaId).catch(() => {}); throw error; }
  await media.removeEntity(entityType, mediaId).catch(() => {});
  return false;
}

async function deleteResearchCanvasItem(ideaId, itemId) {
  const idea = brainstormingState.ideas.find((entry) => entry.id === ideaId);
  if (!idea || !itemId) return false;
  const pathData = getPathData(idea);
  const mediaId = pathData.researchCanvasItems?.find((item) => item.id === itemId)?.videoMediaId;
  const deletedItem = pathData.researchCanvasItems?.find((item) => item.id === itemId);
  const previousItems = pathData.researchCanvasItems;
  const previousUpdatedAt = idea.updatedAt;
  const restoreOrganization = pruneResearchCanvasOrganization(pathData, (key) => key === "item:" + itemId);
  pathData.researchCanvasItems = (pathData.researchCanvasItems || []).filter((item) => item.id !== itemId);
  idea.updatedAt = new Date().toISOString();
  try {
    if (!await saveIdeas()) { pathData.researchCanvasItems = previousItems; restoreOrganization(); idea.updatedAt = previousUpdatedAt; return false; }
  } catch (error) { pathData.researchCanvasItems = previousItems; restoreOrganization(); idea.updatedAt = previousUpdatedAt; throw error; }
  try { renderPathWorkspace(); } catch (error) { console.warn("Saved research canvas could not be refreshed.", error); }
  if (!window.MentorResearchStickerCore && deletedItem?.attachmentMediaId) window.MentorData?.repositories?.media?.removeEntity?.("research-" + deletedItem.type, deletedItem.attachmentMediaId).catch(console.warn);
  if (!window.MentorResearchStickerCore && mediaId) window.MentorData?.repositories?.media?.removeEntity?.("research-video", mediaId).catch((error) => console.warn("Research video could not be removed.", error));
  return true;
}

async function updateResearchCanvasLinkedNote(ideaId, directionId, referenceId, noteUpdate) {
  const idea = brainstormingState.ideas.find((entry) => entry.id === ideaId);
  const direction = getPathData(idea || {}).researchDirections?.find((entry) => entry.id === directionId);
  const reference = direction?.references?.find((entry) => entry.id === referenceId);
  if (!reference) return false;
  const notes = Array.isArray(reference.notes) ? reference.notes.slice() : [{ id: "note_legacy", title: reference.noteTitle || "", body: reference.note || "" }];
  const index = notes.findIndex((entry, position) => (entry.id || "note_" + position) === noteUpdate.id);
  if (index < 0) return false;
  notes[index] = { ...(typeof notes[index] === "object" ? notes[index] : { id: noteUpdate.id }), title: noteUpdate.title, body: noteUpdate.body };
  return updateResearchReferenceInDirection(ideaId, directionId, referenceId, { notes }).then((saved) => { if (saved) renderPathWorkspace(); return saved; });
}

async function addResearchCanvasLinkedNote(ideaId, directionId, referenceId, note) {
  const idea = brainstormingState.ideas.find((entry) => entry.id === ideaId);
  if (!idea) return false;
  const direction = getPathData(idea).researchDirections?.find((entry) => entry.id === directionId);
  const reference = direction?.references?.find((entry) => entry.id === referenceId);
  if (!reference) return false;
  const notes = Array.isArray(reference.notes) ? reference.notes.slice() : (reference.noteTitle || reference.note ? [{ id: "note_legacy", title: reference.noteTitle || "", body: reference.note || "" }] : []);
  notes.push({ id: "note_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7), title: note.title, body: note.body });
  const saved = await updateResearchReferenceInDirection(ideaId, directionId, referenceId, { notes });
  if (saved) renderPathWorkspace();
  return saved;
}

async function deleteResearchCanvasLinkedNote(ideaId, directionId, referenceId, noteId) {
  const idea = brainstormingState.ideas.find((entry) => entry.id === ideaId);
  const pathData = getPathData(idea || {});
  const direction = pathData.researchDirections?.find((entry) => entry.id === directionId);
  const reference = direction?.references?.find((entry) => entry.id === referenceId);
  if (!reference) return false;
  const previousNotes = Array.isArray(reference.notes) ? reference.notes : [{ id: "note_legacy", title: reference.noteTitle || "", body: reference.note || "" }];
  const notes = previousNotes.map((entry, index) => typeof entry === "string" ? { id: "note_" + index, body: entry } : { ...entry, id: entry.id || "note_" + index }).filter((entry) => entry.id !== noteId);
  if (notes.length === previousNotes.length) return false;
  const restoreOrganization = pruneResearchCanvasOrganization(pathData, (key) => key === "linked-note:" + directionId + ":" + referenceId + ":" + noteId);
  try {
    const saved = await updateResearchReferenceInDirection(ideaId, directionId, referenceId, { notes });
    if (!saved) restoreOrganization();
    else renderPathWorkspace();
    return saved;
  } catch (error) {
    restoreOrganization();
    throw error;
  }
}

async function updateResearchCanvasDirectionNote(ideaId, directionId, noteUpdate) {
  const idea = brainstormingState.ideas.find((entry) => entry.id === ideaId);
  if (!idea) return false;
  const direction = getPathData(idea).researchDirections?.find((entry) => entry.id === directionId);
  if (!direction) return false;
  direction.notes = (direction.notes || []).map((note, index) => ((typeof note === "object" && note.id) || String(index)) === noteUpdate.id ? { ...(typeof note === "object" ? note : {}), ...noteUpdate } : note);
  window.MentorResearchStickerCore?.syncLegacy(getPathData(idea), "direction-note:" + directionId + ":" + noteUpdate.id, { title: noteUpdate.title, text: noteUpdate.body || noteUpdate.text || "" });
  idea.updatedAt = new Date().toISOString();
  if (!await saveIdeas()) return false;
  renderPathWorkspace();
  return true;
}

async function deleteResearchCanvasDirectionNote(ideaId, directionId, noteId) {
  const idea = brainstormingState.ideas.find((entry) => entry.id === ideaId);
  if (!idea) return false;
  const pathData = getPathData(idea);
  const direction = pathData.researchDirections?.find((entry) => entry.id === directionId);
  if (!direction) return false;
  const previousNotes = direction.notes || [];
  const notes = previousNotes.map((note, index) => typeof note === "string" ? { id: String(index), body: note } : { ...note, id: note.id || String(index) }).filter((note) => note.id !== noteId);
  if (notes.length === previousNotes.length) return false;
  const restoreOrganization = pruneResearchCanvasOrganization(pathData, (key) => key === "direction-note:" + directionId + ":" + noteId);
  direction.notes = notes;
  idea.updatedAt = new Date().toISOString();
  try {
    if (!await saveIdeas()) { restoreOrganization(); return false; }
  } catch (error) {
    restoreOrganization();
    throw error;
  }
  renderPathWorkspace();
  return true;
}

async function addIdeaTestToResearchIdea(ideaId, test) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea || !test) return;

  const pathData = getPathData(idea);
  const tests = Array.isArray(pathData.tests) ? pathData.tests : [];
  if (tests.length >= 4) return;

  const nextTest = {
    id: test.id || "test_" + Date.now(),
    title: test.title || "Test ideje",
    dayCount: Number(test.dayCount || test.days?.length || 1),
    mainQuestion: test.mainQuestion || "",
    structuredQuestions: Array.isArray(test.structuredQuestions) ? test.structuredQuestions : [],
    customStructuredQuestions: Array.isArray(test.customStructuredQuestions) ? test.customStructuredQuestions : [],
    days: Array.isArray(test.days) ? test.days : []
  };

  pathData.tests = [...tests, nextTest].slice(0, 4);
  idea.updatedAt = new Date().toISOString();
  pathData.updatedAt = idea.updatedAt;
  if (!await saveIdeas()) return false;
  renderPathWorkspace();
  return true;
}

async function updateIdeaTestInResearchIdea(ideaId, testId, testUpdate) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea || !testId || !testUpdate) return;

  const pathData = getPathData(idea);
  const tests = Array.isArray(pathData.tests) ? pathData.tests : [];
  const testIndex = tests.findIndex((item) => item.id === testId);
  if (testIndex < 0) return;

  const existingTest = tests[testIndex] || {};
  tests[testIndex] = {
    ...existingTest,
    id: testId,
    title: testUpdate.title || existingTest.title || "Test ideje",
    dayCount: Number(testUpdate.dayCount || testUpdate.days?.length || existingTest.dayCount || 1),
    mainQuestion: testUpdate.mainQuestion || "",
    structuredQuestions: Array.isArray(testUpdate.structuredQuestions) ? testUpdate.structuredQuestions : [],
    customStructuredQuestions: Array.isArray(testUpdate.customStructuredQuestions) ? testUpdate.customStructuredQuestions : [],
    days: Array.isArray(testUpdate.days) ? testUpdate.days : []
  };

  pathData.tests = tests.slice(0, 4);
  idea.updatedAt = new Date().toISOString();
  pathData.updatedAt = idea.updatedAt;
  if (!await saveIdeas()) return false;
  renderPathWorkspace();
  return true;
}

async function deleteIdeaTestFromResearchIdea(ideaId, testId) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea || !testId) return;

  const pathData = getPathData(idea);
  const tests = Array.isArray(pathData.tests) ? pathData.tests : [];
  const nextTests = tests.filter((item) => item.id !== testId);
  if (nextTests.length === tests.length) return;

  pathData.tests = nextTests;
  idea.updatedAt = new Date().toISOString();
  pathData.updatedAt = idea.updatedAt;
  if (!await saveIdeas()) return false;
  renderPathWorkspace();
  return true;
}

async function updateIdeaTestTaskState(ideaId, testId, dayId, taskId, done) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea || !testId || !dayId || !taskId) return;

  const pathData = getPathData(idea);
  const test = Array.isArray(pathData.tests) ? pathData.tests.find((item) => item.id === testId) : null;
  const day = test?.days?.find((item) => item.id === dayId);
  const task = day?.tasks?.find((item) => item.id === taskId);
  if (!task) return;

  task.done = Boolean(done);
  if (String(day.result || "").startsWith("Rezultat")) day.result = "";
  idea.updatedAt = new Date().toISOString();
  pathData.updatedAt = idea.updatedAt;
  if (!await saveIdeas()) return false;
  renderPathWorkspace();
  return true;
}

async function updateIdeaTestScoreState(ideaId, testId, dayId, question, value) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea || !testId || !dayId || !question) return;

  const pathData = getPathData(idea);
  const test = Array.isArray(pathData.tests) ? pathData.tests.find((item) => item.id === testId) : null;
  const day = test?.days?.find((item) => item.id === dayId);
  if (!day) return;

  day.scores = day.scores && typeof day.scores === "object" ? day.scores : {};
  day.scores[question] = Math.min(10, Math.max(1, Number(value) || 1));
  idea.updatedAt = new Date().toISOString();
  pathData.updatedAt = idea.updatedAt;
  return saveIdeas();
}

async function updateIdeaTestAnswerState(ideaId, answer = {}) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea || !answer.testId || !answer.dayId || !answer.questionId) return;

  const pathData = getPathData(idea);
  const test = Array.isArray(pathData.tests) ? pathData.tests.find((item) => item.id === answer.testId) : null;
  const day = test?.days?.find((item) => item.id === answer.dayId);
  if (!day) return;

  if (answer.scope === "structured" && answer.questionId === answer.questionText && answer.questionType === "score") {
    day.scores = day.scores && typeof day.scores === "object" ? day.scores : {};
    day.scores[answer.questionText] = Math.min(10, Math.max(1, Number(answer.value) || 1));
  } else {
    day.answers = day.answers && typeof day.answers === "object" ? day.answers : {};
    day.answers[answer.questionId] = Array.isArray(answer.value)
      ? answer.value
      : answer.questionType === "score"
        ? Math.min(10, Math.max(1, Number(answer.value) || 1))
        : String(answer.value || "");
  }
  idea.updatedAt = new Date().toISOString();
  pathData.updatedAt = idea.updatedAt;
  return saveIdeas();
}

function getSearchedIdeas(ideas) {
  return ideas.filter((idea) => {
    const query = brainstormingState.searchQuery;
    const text = [idea.title, idea.description, idea.type, ...(idea.tags || [])].join(" ").toLowerCase();
    return !query || text.includes(query);
  });
}

function getCanvas() {
  return document.getElementById("brainstormingCanvas");
}

function setCanvasMode(mode) {
  const wrap = document.querySelector(".brainstorming-canvas-wrap");
  if (!wrap) return;
  wrap.classList.toggle("is-board", mode === "board");
  wrap.classList.toggle("is-workspace", mode !== "board");
}

function scrollResearchViewToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  if (document.scrollingElement) {
    document.scrollingElement.scrollTop = 0;
    document.scrollingElement.scrollLeft = 0;
  }
}

function resetResearchScrollToTop() {
  resetResearchStickyState();
  scrollResearchViewToTop();
  requestAnimationFrame(() => {
    resetResearchStickyState();
    scrollResearchViewToTop();
    requestAnimationFrame(() => {
      resetResearchStickyState();
      scrollResearchViewToTop();
    });
  });
}

function resetResearchStickyState() {
  const view = document.getElementById("brainstormingView");
  const researchView = document.querySelector("#brainstormingCanvas .research-view");
  const stage = researchView?.querySelector("[data-research-scroll-stage]");
  view?.classList.remove("research-nav-hidden");
  view?.classList.remove("research-sticky-active");
  view?.classList.remove("research-reference-focus-active");
  view?.classList.remove("research-focus-restoring");
  if (!researchView) return;
  window.clearTimeout(researchView._heroRevealTimer);
  researchView.classList.remove("is-hero-suppressed");
  researchView.classList.remove("is-mini-panel-hidden");
  researchView.classList.remove("is-mini-panel-exiting");
  researchView?.classList.remove("is-research-sticky");
  const wasFixedCanvas = Number(researchView.dataset.researchPhase || 0) >= 3;
  researchView.dataset.researchPhase = "0";
  delete researchView.dataset.researchPhaseTwoY;
  delete researchView.dataset.researchPhaseThreeY;
  delete researchView.dataset.researchPhaseTwoStale;
  const detailStage = researchView.querySelector(".research-detail-stage");
  const directionsRow = researchView.querySelector(".research-row-intro");
  if (detailStage) { detailStage.inert = false; detailStage.removeAttribute("aria-hidden"); }
  if (directionsRow) { directionsRow.inert = false; directionsRow.removeAttribute("aria-hidden"); }
  if (wasFixedCanvas) window.MentorResearch?.layoutCanvas?.(researchView);
  if (stage) {
    stage.dataset.focusScrollOffset = "0";
    stage.scrollTop = 0;
  }
  if (window.MentorResearchScroll?.clearLock) window.MentorResearchScroll.clearLock(researchView);
  if (window.MentorResearchScroll?.applyStep) window.MentorResearchScroll.applyStep(researchView, 1, "0");
  else {
    researchView?.classList.remove("is-scroll-test-active");
    researchView?.classList.remove("is-scroll-resources-active");
  }
  researchView?.style.removeProperty("--research-freeze-stack-height");
}

function updateResearchStickyState(options = {}) {
  const view = document.getElementById("brainstormingView");
  const researchView = document.querySelector("#brainstormingCanvas .research-view");
  const detailStage = researchView?.querySelector(".research-detail-stage");
  const freezeStack = researchView?.querySelector(".research-freeze-stack");
  const controlPanel = view?.querySelector(".brainstorming-control-panel");
  if (isResearchSimpleScrollLayout()) {
    resetResearchStickyState();
    return;
  }
  if (!view || !researchView || !detailStage || !freezeStack || !controlPanel || brainstormingState.activeTab !== "path") {
    resetResearchStickyState();
    return;
  }
  if (researchView.classList.contains("is-reference-focus")) return;

  const previousPhase = Number(researchView.dataset.researchPhase || 0);
  const cachedPhaseThreeAt = Number(researchView.dataset.researchPhaseThreeY) || Infinity;
  window.MentorResearch?.layoutDirectionTabs?.(researchView);
  const researchRect = researchView.getBoundingClientRect();
  const directionsRow = researchView.querySelector(".research-row-intro");
  const canvasSection = researchView.querySelector(".research-canvas-section");
  const sidebarRect = document.querySelector(".sidebar-shell")?.getBoundingClientRect();
  const freezeHeight = Math.ceil(freezeStack.getBoundingClientRect().height);
  const navHideLine = 14 + controlPanel.offsetHeight + 6;
  const stickyLine = 14;
  const keepFocused = previousPhase === 3 && window.scrollY >= cachedPhaseThreeAt - 80;
  const shouldHideNav = (researchRect.top <= navHideLine && researchRect.bottom > 0) || keepFocused;
  const shouldStick = (researchRect.top <= stickyLine && researchRect.bottom > 0) || keepFocused;
  if (shouldHideNav && document.querySelector(".brainstorming-header-add-menu")) closeBrainstormingResearchAddMenu();
  view.classList.toggle("research-nav-hidden", shouldHideNav);
  view.classList.toggle("research-sticky-active", shouldStick);
  researchView.classList.toggle("is-research-sticky", shouldStick);
  if (!researchView.dataset.researchPhaseTwoY && previousPhase < 3) {
    researchView.dataset.researchPhaseTwoY = String(getResearchCanvasJoinScrollY(window.scrollY, researchRect.top, stickyLine + 72));
    delete researchView.dataset.researchPhaseTwoStale;
  }
  if (shouldStick && previousPhase < 3 && directionsRow && !researchView.dataset.researchPhaseThreeY) {
    researchView.dataset.researchPhaseThreeY = String(getResearchTabsContactScrollY(window.scrollY, directionsRow.getBoundingClientRect().top, detailStage.getBoundingClientRect().bottom));
  }
  const phaseTwoAt = Number(researchView.dataset.researchPhaseTwoY) || Infinity;
  const phaseThreeAt = Number(researchView.dataset.researchPhaseThreeY) || Infinity;
  const nextPhase = getResearchCanvasScrollPhase(window.scrollY, phaseTwoAt, phaseThreeAt, previousPhase, shouldHideNav);
  syncResearchHeroVisibility(researchView, nextPhase, previousPhase);
  detailStage.inert = nextPhase >= 3;
  detailStage.setAttribute("aria-hidden", String(nextPhase >= 3));
  if (directionsRow) { directionsRow.inert = false; directionsRow.removeAttribute("aria-hidden"); }
  if (nextPhase >= 3) {
    const navTop = sidebarRect?.top ?? 14;
    const navBottom = sidebarRect?.bottom ?? window.innerHeight - 14;
    researchView.style.setProperty("--research-workspace-left", Math.round(researchRect.left) + "px");
    researchView.style.setProperty("--research-workspace-right", Math.round(window.innerWidth - researchRect.right) + "px");
    researchView.style.setProperty("--research-nav-top", Math.round(navTop) + "px");
    researchView.style.setProperty("--research-nav-bottom", Math.round(window.innerHeight - navBottom) + "px");
    researchView.style.setProperty("--research-switcher-width", Math.round(Math.min(310, Math.max(210, researchRect.width * 0.34))) + "px");
    researchView.style.setProperty("--research-directions-top", Math.round(navTop) + "px");
    const researchDocumentTop = window.scrollY + researchRect.top;
    researchView.style.setProperty("--research-scroll-runway", Math.max(260, Math.ceil(window.innerHeight + phaseThreeAt - researchDocumentTop + 48)) + "px");
  }
  if (nextPhase !== previousPhase) researchView.dataset.researchPhase = String(nextPhase);
  if (nextPhase !== previousPhase) window.MentorResearch?.layoutDirectionTabs?.(researchView);
  if (nextPhase < 3 && canvasSection) {
    const navBottom = sidebarRect?.bottom ?? window.innerHeight - 14;
    researchView.style.setProperty("--research-prefocus-canvas-height", Math.max(0, Math.ceil(navBottom - canvasSection.getBoundingClientRect().top)) + "px");
    if (previousPhase >= 3) window.setTimeout(() => {
      if (researchView.dataset.researchPhaseTwoStale === "true" && Number(researchView.dataset.researchPhase || 0) < 3) {
        delete researchView.dataset.researchPhaseTwoY;
        delete researchView.dataset.researchPhaseThreeY;
        delete researchView.dataset.researchPhaseTwoStale;
      }
      updateResearchStickyState();
    }, 160);
  }
  if (nextPhase !== previousPhase && (nextPhase >= 3 || previousPhase >= 3)) window.MentorResearch?.layoutCanvas?.(researchView);
  researchView.style.setProperty("--research-freeze-stack-height", freezeHeight + "px");
  updateResearchScrollStage(researchView, freezeHeight, shouldStick, options);
}

function isResearchSimpleScrollLayout() {
  return window.matchMedia("(max-width: 760px)").matches || window.matchMedia("(orientation: portrait) and (min-width: 761px)").matches;
}

function getResearchCanvasJoinScrollY(scrollY, canvasTop, workspaceTop) {
  return scrollY + canvasTop - workspaceTop;
}

function getResearchTabsContactScrollY(scrollY, tabsTop, heroBottom) {
  return scrollY + tabsTop - heroBottom - 3;
}

function syncResearchHeroVisibility(view, nextPhase) {
  window.clearTimeout(view._heroRevealTimer);
  view._heroRevealTimer = null;
  view.classList.toggle("is-hero-suppressed", nextPhase >= 3);
  view.classList.toggle("is-mini-panel-hidden", nextPhase < 3);
  view.classList.remove("is-mini-panel-exiting");
}

function getResearchCanvasScrollPhase(scrollY, phaseTwoAt, phaseThreeAt, previousPhase, shouldHideNav) {
  const atTwo = scrollY >= phaseTwoAt - (previousPhase >= 2 ? 18 : 0);
  const atThree = scrollY >= phaseThreeAt - (previousPhase >= 3 ? 80 : 0);
  return atThree ? 3 : atTwo ? 2 : shouldHideNav ? 1 : 0;
}

function updateResearchScrollStage(researchView, freezeHeight, isStickyActive, options = {}) {
  const stage = researchView.querySelector("[data-research-scroll-stage]");
  if (!stage) return;
  const lockedStep = window.MentorResearchScroll?.getLockedStep?.() || 0;
  if (lockedStep) {
    window.MentorResearchScroll?.setStep?.(researchView, lockedStep);
    window.MentorResearchScroll?.updateCounter?.(researchView, lockedStep);
    return;
  }
  if (!isStickyActive) {
    if (options.preserveScrollStep) return;
    window.MentorResearchScroll?.applyStep?.(researchView, 1, "0");
    return;
  }
  if (options.preserveScrollStep) {
    window.MentorResearchScroll?.updateCounter?.(researchView, window.MentorResearchScroll?.getStep?.(researchView) || 1);
    return;
  }
  const stickyTop = 14 + freezeHeight + 12;
  const stageRect = stage.getBoundingClientRect();
  const isCompactResearchScroll = window.innerHeight < 760 || window.innerWidth < 1180;
  const travel = isCompactResearchScroll
    ? Math.max(210, Math.min(330, window.innerHeight * 0.42))
    : Math.max(300, window.innerHeight * 0.58);
  const progress = Math.min(1, Math.max(0, (stickyTop - stageRect.top) / travel));
  const step = progress >= (isCompactResearchScroll ? 0.56 : 0.66)
    ? 3
    : progress >= (isCompactResearchScroll ? 0.28 : 0.33)
      ? 2
      : 1;
  if (window.MentorResearchScroll?.applyStep) window.MentorResearchScroll.applyStep(researchView, step, progress.toFixed(3));
}

function renderEmptyState(title, text, buttonText) {
  return [
    '<div class="brainstorming-empty">',
    '  <article class="brainstorming-empty-card">',
    "    <h2>" + escapeHtml(title) + "</h2>",
    "    <p>" + escapeHtml(text) + "</p>",
    '    <button class="btn" type="button" data-empty-create>' + escapeHtml(buttonText) + "</button>",
    "  </article>",
    "</div>"
  ].join("");
}

function normalizeStatus(status) {
  return ["seed", "path", "build", "archived"].includes(status) ? status : "seed";
}

function getIdeaRotation(idea) {
  const seed = String(idea.id || "").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return ((seed % 7) - 3) * 0.7 + "deg";
}

function cssImageUrl(value) {
  const image = value || "icons/natura.png";
  return 'url("' + String(image).replace(/"/g, "%22") + '")';
}

function readImageFile(file) {
  return new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith("image/")) {
      resolve("");
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => resolve(""));
    reader.readAsDataURL(file);
  });
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(String(value || ""));
  return String(value || "").replace(/"/g, '\\"');
}

function splitInputList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function resetBrainstormingView() {
  closeQuickIdeaModal();
  closeIdeaPreview();
  brainstormingState.searchQuery = "";
  brainstormingState.zoom = 1;
  const searchInput = document.getElementById("brainstormingSearchInput");
  if (searchInput) searchInput.value = "";
  renderBrainstormingTab("all");
}

function renderTags(tags) {
  if (!Array.isArray(tags) || !tags.length) return '<span class="idea-chip">' + escapeHtml(brainT("labels.noTags")) + '</span>';
  return tags.map((tag) => '<span class="idea-chip">#' + escapeHtml(tag) + "</span>").join("");
}

function renderLinks(links) {
  if (!Array.isArray(links) || !links.length) return "<span>" + escapeHtml(brainT("labels.noLinks")) + "</span>";
  return links
    .map((link) => {
      const safeLink = escapeHtml(link);
      return '<a href="' + safeLink + '" target="_blank" rel="noreferrer">' + safeLink + "</a>";
    })
    .join("");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

window.Brainstorming = {
  state: brainstormingState,
  syncIdeasFromRepository() {
    brainstormingState.ideas = loadIdeas();
    if (document.body.dataset.activeView === "brainstorming") renderBrainstormingTab(brainstormingState.activeTab);
  },
  renderStaticLanguage: renderBrainstormingStaticLanguage,
  initBrainstorming,
  activateBrainstorming,
  loadIdeas,
  saveIdeas,
  renderBrainstormingTab,
  renderAllIdeasBoard,
  renderPathWorkspace,
  renderBuildWorkspace,
  renderArchiveView,
  renderIdeas: renderAllIdeasBoard,
  renderIdeaCard,
  createIdea,
  deleteIdea,
  updateIdeaStatus,
  bringIdeaToFront,
  filterIdeas,
  openQuickIdeaModal,
  closeQuickIdeaModal,
  openIdeaPreview,
  closeIdeaPreview,
  openResearchIdeaById,
  resetBrainstormingView,
  renderMiniMap,
  setupDragAndDrop
};
