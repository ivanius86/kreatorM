const BRAINSTORMING_STORAGE_KEY = "mentor_brainstorming_ideas";

const brainstormingState = {
  ideas: [],
  activeTab: "all",
  searchQuery: "",
  zoom: 1,
  drag: null,
  previewIdeaId: null,
  previewCard: null,
  previewCloseTimer: null,
  previewOpenedAt: 0,
  previewResizeRaf: 0
};

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

function initBrainstorming() {
  const view = document.getElementById("brainstormingView");
  if (!view) return;

  brainstormingState.ideas = loadIdeas();

  document.getElementById("openIdeaModalBtn")?.addEventListener("click", openQuickIdeaModal);
  document.getElementById("quickIdeaForm")?.addEventListener("submit", createIdea);
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

  document.querySelectorAll(".brainstorming-tab").forEach((button) => {
    button.addEventListener("click", () => renderBrainstormingTab(button.dataset.status || "all"));
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
    if (isDeleteKeyboardEvent(event) && document.body.dataset.activeView === "brainstorming" && brainstormingState.previewIdeaId && !isTypingTarget(event.target)) {
      event.preventDefault();
      deleteIdea(brainstormingState.previewIdeaId);
    }
  });

  document.addEventListener("click", (event) => {
    const modal = document.getElementById("ideaPreviewModal");
    if (!brainstormingState.previewIdeaId || !modal || modal.classList.contains("hidden")) return;
    if (Date.now() - brainstormingState.previewOpenedAt < 80) return;
    if (event.target.closest && event.target.closest(".brainstorming-card.is-expanded")) return;
    closeIdeaPreview();
  });

  window.addEventListener("resize", syncExpandedPreviewLayout);

  renderBrainstormingTab("all");
}

function syncExpandedPreviewLayout() {
  const card = brainstormingState.previewCard;
  if (!card || !card.classList.contains("is-expanded")) return;

  window.cancelAnimationFrame(brainstormingState.previewResizeRaf);
  brainstormingState.previewResizeRaf = window.requestAnimationFrame(() => {
    positionExpandedIdeaCard(card);
    if (card.classList.contains("has-edit-open")) {
      alignExpandedEditPanel(card);
      return;
    }
    syncExpandedPanelHeight(card);
  });
}

function loadIdeas() {
  try {
    const rawIdeas = localStorage.getItem(BRAINSTORMING_STORAGE_KEY);
    if (rawIdeas !== null) {
      const savedIdeas = JSON.parse(rawIdeas);
      if (Array.isArray(savedIdeas)) return savedIdeas.map(hydrateIdea);
    }
  } catch (error) {
    console.warn("Brainstorming ideas could not be loaded.", error);
  }

  const sampleIdeas = createSampleIdeas();
  localStorage.setItem(BRAINSTORMING_STORAGE_KEY, JSON.stringify(sampleIdeas));
  return sampleIdeas;
}

function saveIdeas() {
  localStorage.setItem(BRAINSTORMING_STORAGE_KEY, JSON.stringify(brainstormingState.ideas));
}

function renderBrainstormingTab(tabName) {
  const nextTab = ["all", "path", "build", "archived"].includes(tabName) ? tabName : "all";
  brainstormingState.activeTab = nextTab;

  updateBrainstormingHeroCopy(nextTab);

  document.querySelectorAll(".brainstorming-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.status === nextTab);
  });

  if (nextTab === "all") renderAllIdeasBoard();
  if (nextTab === "path") renderPathWorkspace();
  if (nextTab === "build") renderBuildWorkspace();
  if (nextTab === "archived") renderArchiveView();
}

function updateBrainstormingHeroCopy(tabName) {
  const copy = BRAINSTORMING_TAB_COPY[tabName] || BRAINSTORMING_TAB_COPY.all;
  const title = document.getElementById("brainstormingHeroTitle");
  const text = document.getElementById("brainstormingHeroText");
  if (title) title.textContent = copy.title;
  if (text) text.textContent = copy.text;
}

function renderAllIdeasBoard() {
  const canvas = getCanvas();
  if (!canvas) return;
  setCanvasMode("board");
  applyIdeaZoom();

  const visibleIdeas = getSearchedIdeas(brainstormingState.ideas);
  canvas.innerHTML = "";

  if (!visibleIdeas.length) {
    canvas.innerHTML = renderEmptyState("Još nema ideja", "Klikni na Nova ideja i uhvati svoju prvu misao.", "+ Kreiraj ideju");
    canvas.querySelector("[data-empty-create]")?.addEventListener("click", openQuickIdeaModal);
    renderMiniMap();
    return;
  }

  let clampedAnyIdea = false;
  visibleIdeas.forEach((idea) => {
    clampedAnyIdea = clampIdeaPosition(idea) || clampedAnyIdea;
    canvas.appendChild(renderIdeaCard(idea));
  });
  if (clampedAnyIdea) saveIdeas();
  setupDragAndDrop();
  renderMiniMap();
}

function renderPathWorkspace() {
  const canvas = getCanvas();
  if (!canvas) return;
  setCanvasMode("workspace");

  const idea = pickIdeaForWorkspace("path");
  if (!idea) {
    canvas.innerHTML = renderEmptyState("Nema ideje za Istraživanje", "Premesti neku ideju u Istraživanje kroz preview modal.", "Idi na Sve ideje");
    canvas.querySelector("[data-empty-create]")?.addEventListener("click", () => renderBrainstormingTab("all"));
    return;
  }

  const pathData = getPathData(idea);
  const researchImages = pathData.researchImages.length ? pathData.researchImages : [idea.image, ...BRAINSTORMING_SAMPLE_IMAGES].slice(0, 4);
  const links = pathData.researchLinks.length ? pathData.researchLinks : idea.links || [];
  const nodes = pathData.mindMapNodes.length ? pathData.mindMapNodes : ["Publika", "Format", "Resursi", "Test", "Rizici", "Prvi korak"];
  const notes = pathData.notes.length ? pathData.notes : ["Ideja ima dobar emocionalni naboj.", "Potrebno je proveriti realnu potražnju."];
  const nextSteps = pathData.nextSteps.length ? pathData.nextSteps : ["Definiši najmanji test", "Pronađi 3 reference", "Napiši prvu hipotezu"];

  canvas.innerHTML = [
    '<section class="brainstorming-workspace path-workspace">',
    renderWorkspaceHero(idea, "Istraživanje", pathData.vision || idea.description, [
      '<button class="ghost-btn" type="button" data-open-preview="' + idea.id + '">Otvori detalje</button>',
      '<button class="btn secondary" type="button" data-set-status="build" data-idea-id="' + idea.id + '">Pretvori u Ostvarenje</button>'
    ]),
    '  <div class="path-dashboard-grid">',
    renderPanel("Vision", [
      "<h3>Zašto je ova ideja važna?</h3>",
      "<p>" + escapeHtml(pathData.whyImportant || "Ova ideja nosi energiju, priču i mogućnost da se razvije u realan projekat.") + "</p>",
      '<div class="idea-preview-tags">' + renderTags(idea.tags) + "</div>",
      renderMetricLine("Energija", idea.energy || 7, 10)
    ].join("")),
    renderPanel("Osećaj & jasnoća", [
      renderMetricLine("Energy", idea.energy || 7, 10),
      renderMetricLine("Clarity", pathData.clarity, 10),
      renderMetricLine("Fear / difficulty", pathData.fear, 10)
    ].join("")),
    renderPanel("Istraživanje & inspiracija", [
      '<div class="research-thumb-grid">' + researchImages.map((image) => '<span style="--idea-image: ' + cssImageUrl(image) + '"></span>').join("") + "</div>",
      '<div class="idea-preview-links">' + renderLinks(links) + "</div>",
      '<div class="panel-actions"><button class="ghost-btn" type="button">+ Dodaj link</button><button class="ghost-btn" type="button">+ Dodaj sliku</button></div>'
    ].join(""), "wide"),
    renderPanel("Mind Map Preview", [
      renderMindMap(idea.title, nodes),
      '<button class="ghost-btn" type="button">Otvori mind map</button>'
    ].join("")),
    renderPanel("Beleške", [
      '<div class="note-stack">' + notes.map((note) => "<p>" + escapeHtml(note) + "</p>").join("") + "</div>",
      '<button class="ghost-btn" type="button">+ Dodaj belešku</button>'
    ].join("")),
    renderPanel("Test ideje", renderIdeaTest(pathData.test), "tall"),
    renderPanel("Sledeći mini koraci", [
      '<ul class="workspace-list">' + nextSteps.map((step) => "<li>" + escapeHtml(step) + "</li>").join("") + "</ul>",
      '<button class="ghost-btn" type="button">+ Dodaj korak</button>'
    ].join("")),
    "  </div>",
    renderRelatedIdeas(idea),
    "</section>"
  ].join("");

  bindWorkspaceActions(canvas);
}

function renderBuildWorkspace() {
  const canvas = getCanvas();
  if (!canvas) return;
  setCanvasMode("workspace");

  const idea = pickIdeaForWorkspace("build");
  if (!idea) {
    canvas.innerHTML = renderEmptyState("Nema ideje u Ostvarenju", "Pretvori neku ideju u Ostvarenje kada postane ozbiljan projekat.", "Idi na Sve ideje");
    canvas.querySelector("[data-empty-create]")?.addEventListener("click", () => renderBrainstormingTab("all"));
    return;
  }

  const buildData = getBuildData(idea);

  canvas.innerHTML = [
    '<section class="brainstorming-workspace build-workspace">',
    renderWorkspaceHero(idea, "Ostvarenje / Active Goal", "Plan, ritam i izvršenje za ideju koja je spremna da postane stvarnost.", [
      '<button class="ghost-btn" type="button">Otvori u Goal sistemu</button>',
      '<button class="btn secondary" type="button" data-open-calendar>Otvori kalendar</button>'
    ], buildData.progress + "%", buildData.targetDate),
    '  <div class="build-dashboard-grid">',
    renderPanel("Roadmap / Milestones", renderMilestones(buildData.milestones), "wide"),
    renderPanel("Tasks", renderBuildTasks(buildData.tasks), "wide"),
    renderPanel("Calendar preview", renderCalendarPreview(buildData.tasks)),
    renderPanel("Habits / routines", renderHabits(buildData.habits)),
    renderPanel("Progress", renderBuildProgress(buildData.progress)),
    renderPanel("Resources", '<div class="idea-preview-links resource-links">' + renderLinks(buildData.resources) + "</div>"),
    renderPanel("Notes / motivation", '<div class="note-stack">' + buildData.notes.map((note) => "<p>" + escapeHtml(note) + "</p>").join("") + "</div>", "wide"),
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
    canvas.innerHTML = renderEmptyState("Nema arhiviranih ideja.", "Uspavane ideje će se pojaviti ovde kada ih arhiviraš.", "Idi na Sve ideje");
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
    button.addEventListener("click", () => openIdeaPreview(button.dataset.openPreview));
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

  let changedAnyIdea = false;
  document.querySelectorAll(".brainstorming-card").forEach((card) => {
    const idea = brainstormingState.ideas.find((item) => item.id === card.dataset.ideaId);
    if (!idea) return;
    changedAnyIdea = clampIdeaPosition(idea, card) || changedAnyIdea;
    card.style.setProperty("--idea-x", idea.x + "px");
    card.style.setProperty("--idea-y", idea.y + "px");
  });
  if (changedAnyIdea) saveIdeas();
}

function renderIdeaCard(idea) {
  const card = document.createElement("article");
  const status = normalizeStatus(idea.status);
  card.className = "brainstorming-card status-" + status;
  card.dataset.ideaId = idea.id;
  card.style.setProperty("--idea-x", (Number(idea.x) || 0) + "px");
  card.style.setProperty("--idea-y", (Number(idea.y) || 0) + "px");
  card.style.setProperty("--idea-rotation", getIdeaRotation(idea));
  card.style.setProperty("--idea-image", cssImageUrl(idea.image));
  card.style.zIndex = String(Number(idea.layer) || 1);

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
    '    <span class="idea-energy">Energy ' + Number(idea.energy || 1) + "/10</span>",
    "  </div>",
    "</div>"
  ].join("");

  card.addEventListener("click", () => {
    if (card.dataset.wasDragged === "true") {
      card.dataset.wasDragged = "false";
      return;
    }
    if (card.classList.contains("is-expanded")) return;
    bringIdeaToFront(idea.id, card);
    openIdeaPreview(idea.id, card);
  });

  return card;
}

function getBrainstormingStatusIcon(status) {
  return BRAINSTORMING_STATUS_ICONS[normalizeStatus(status)] || BRAINSTORMING_STATUS_ICONS.seed;
}

function getIdeaCornerSymbol(status) {
  const statusKey = normalizeStatus(status);
  return statusKey === "seed" ? "*" : getBrainstormingStatusIcon(statusKey);
}

function getIdeaExpandedStatusBadge(status) {
  const statusKey = normalizeStatus(status);
  const messages = {
    seed: "Ideja ceka obradu",
    path: "Ideja se istrazuje",
    build: "Ideja je u procesu ostvarenja",
    archived: "Ideja je sacuvana za kasnije"
  };
  if (!messages[statusKey]) return "";
  return [
    '<span class="idea-expanded-status-badge" aria-label="' + escapeHtml(messages[statusKey]) + '">',
    '  <span class="idea-expanded-status-text">' + escapeHtml(messages[statusKey]) + "</span>",
    '  <span class="idea-expanded-status-icon" aria-hidden="true">' + getBrainstormingStatusIcon(statusKey) + "</span>",
    "</span>"
  ].join("");
}

async function createIdea(event) {
  event.preventDefault();

  const title = document.getElementById("ideaTitleInput")?.value.trim();
  const description = document.getElementById("ideaDescriptionInput")?.value.trim();
  if (!title || !description) return;

  const image = document.getElementById("ideaImageInput")?.value.trim();
  const imageFile = document.getElementById("ideaImageFileInput")?.files?.[0];
  const uploadedImage = imageFile ? await readImageFile(imageFile) : "";
  const nextIndex = brainstormingState.ideas.length + 1;
  const idea = hydrateIdea({
    id: "idea_" + Date.now(),
    title,
    description,
    type: document.getElementById("ideaTypeInput")?.value || "Kreativna",
    status: "seed",
    energy: Number(document.getElementById("ideaEnergyInput")?.value || 7),
    image: uploadedImage || image || BRAINSTORMING_SAMPLE_IMAGES[nextIndex % BRAINSTORMING_SAMPLE_IMAGES.length],
    links: splitInputList(document.getElementById("ideaLinksInput")?.value),
    tags: splitInputList(document.getElementById("ideaTagsInput")?.value),
    x: 100 + ((nextIndex * 145) % 760),
    y: 120 + ((nextIndex * 95) % 420),
    layer: getNextIdeaLayer(),
    createdAt: new Date().toISOString()
  });

  brainstormingState.ideas.unshift(idea);
  saveIdeas();
  closeQuickIdeaModal();
  renderBrainstormingTab("all");
}

function deleteIdea(ideaId) {
  brainstormingState.ideas = brainstormingState.ideas.filter((idea) => idea.id !== ideaId);
  brainstormingState.previewIdeaId = null;
  brainstormingState.previewCard = null;
  saveIdeas();
  document.getElementById("ideaPreviewModal")?.classList.add("hidden");
  renderBrainstormingTab(brainstormingState.activeTab);
}

function updateIdeaStatus(ideaId, status) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea) return;

  idea.previousStatus = idea.status;
  idea.status = normalizeStatus(status);
  if (idea.status === "archived") idea.archivedAt = new Date().toISOString().slice(0, 10);
  saveIdeas();
  closeIdeaPreview();
  renderBrainstormingTab(brainstormingState.activeTab);
}

function filterIdeas(status) {
  renderBrainstormingTab(status);
}

function openQuickIdeaModal() {
  const modal = document.getElementById("quickIdeaModal");
  const form = document.getElementById("quickIdeaForm");
  if (!modal) return;

  form?.reset();
  const energyValue = document.getElementById("ideaEnergyValue");
  if (energyValue) energyValue.textContent = "7";
  modal.classList.remove("hidden");
  document.getElementById("ideaTitleInput")?.focus();
}

function closeQuickIdeaModal() {
  document.getElementById("quickIdeaModal")?.classList.add("hidden");
}

function openIdeaPreview(ideaId, sourceCard) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  const modal = document.getElementById("ideaPreviewModal");
  sourceCard = sourceCard || document.querySelector('.brainstorming-card[data-idea-id="' + cssEscape(ideaId) + '"]');
  if (!idea || !modal || !sourceCard) return;
  window.clearTimeout(brainstormingState.previewCloseTimer);
  bringIdeaToFront(idea.id, sourceCard);
  if (brainstormingState.previewCard && brainstormingState.previewCard !== sourceCard) {
    collapseExpandedIdeaCard(brainstormingState.previewCard);
  }
  brainstormingState.previewIdeaId = idea.id;
  brainstormingState.previewCard = sourceCard;
  brainstormingState.previewOpenedAt = Date.now();

  positionExpandedIdeaCard(sourceCard);
  sourceCard.classList.add("is-animating", "is-expanded");
  renderExpandedIdeaControls(sourceCard, idea);
  syncExpandedPanelHeight(sourceCard);
  window.setTimeout(() => {
    sourceCard.classList.remove("is-animating");
    if (brainstormingState.previewCard === sourceCard && sourceCard.classList.contains("is-expanded")) {
      sourceCard.querySelector(".idea-expanded-extra")?.classList.add("is-ready");
      syncExpandedPanelHeight(sourceCard);
    }
  }, 448);
  modal.classList.remove("hidden");
}

function renderExpandedIdeaControls(card, idea) {
  card.querySelector(".idea-expanded-tools")?.remove();
  card.querySelector(".idea-expanded-extra")?.remove();

  const panel = card.querySelector(".brainstorming-card-panel");
  if (!panel) return;

  panel.insertAdjacentHTML("beforeend", [
    '  <div class="idea-expanded-tools" aria-label="Uredi karticu">',
    '    <button class="idea-preview-tool" type="button" data-edit-panel="image" aria-label="Uredi sliku ideje"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2"></rect><path d="m7 16 4-4 3 3 2-2 3 3"></path><circle cx="9" cy="9" r="1.4"></circle></svg></button>',
    '    <button class="idea-preview-tool" type="button" data-edit-panel="details" aria-label="Uredi detalje ideje"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h5l10-10a2.1 2.1 0 0 0-3-3L6 17z"></path><path d="m14 7 3 3"></path></svg></button>',
    '    <button class="idea-preview-tool" type="button" data-edit-panel="links" aria-label="Uredi linkove"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"></path><path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1"></path></svg></button>',
    "  </div>",
    '<div class="idea-expanded-extra">',
    '  <div class="idea-expanded-default-content">',
    '  <div class="idea-expanded-footer">',
    '    <div class="idea-preview-links compact-links">' + renderLinks(idea.links) + "</div>",
    '    <span class="idea-expanded-energy">Energy ' + Number(idea.energy || 1) + '/10</span>',
    '  </div>',
    '  <div class="idea-expanded-actions">',
    '    <button class="idea-expanded-path-btn" type="button" data-preview-action="path">Istraživanje</button>',
    '    <button class="idea-expanded-delete-action" type="button" data-preview-action="delete">Obriši karticu</button>',
    '  </div>',
    '  </div>',
    '  <form class="idea-edit-panel image-edit-panel hidden" data-edit-form="image">',
    '    <label>Link slike<input name="image" type="text" value="' + escapeHtml(idea.image || "") + '" placeholder="https://... ili icons/natura.png" /></label>',
    '    <label>Upload slike<input name="imageFile" type="file" accept="image/*" /></label>',
    '    <div class="idea-edit-actions"><button class="btn secondary" type="submit">Sačuvaj sliku</button></div>',
    "  </form>",
    '  <form class="idea-edit-panel hidden" data-edit-form="details">',
    '    <label>Naslov<input name="title" type="text" value="' + escapeHtml(idea.title) + '" /></label>',
    '    <label>Opis<textarea name="description" rows="3">' + escapeHtml(idea.description) + "</textarea></label>",
    '    <label>Tip<input name="type" type="text" value="' + escapeHtml(idea.type || "Ideja") + '" /></label>',
    '    <label>Energija<input name="energy" type="number" min="1" max="10" value="' + Number(idea.energy || 1) + '" /></label>',
    '    <label>Tagovi<input name="tags" type="text" value="' + escapeHtml((idea.tags || []).join(", ")) + '" /></label>',
    '    <div class="idea-edit-actions"><button class="btn secondary" type="submit">Sačuvaj</button></div>',
    "  </form>",
    '  <form class="idea-edit-panel hidden" data-edit-form="links">',
    '    <label>Linkovi<input name="links" type="text" value="' + escapeHtml((idea.links || []).join(", ")) + '" /></label>',
    '    <div class="idea-edit-actions"><button class="btn secondary" type="submit">Sačuvaj linkove</button></div>',
    "  </form>",
    "</div>"
  ].join(""));

  card.querySelector('[data-preview-action="path"]')?.addEventListener("click", () => openIdeaPath(idea.id));
  card.querySelector('[data-preview-action="delete"]')?.addEventListener("click", () => {
    if (window.confirm("Obrisati ovu karticu ideje?")) deleteIdea(idea.id);
  });
  card.querySelectorAll("[data-edit-panel]").forEach((button) => {
    button.addEventListener("click", () => toggleIdeaEditPanel(card, button.dataset.editPanel));
  });
  card.querySelector('[data-edit-form="details"]')?.addEventListener("submit", (event) => saveIdeaDetailsEdit(event, idea.id));
  card.querySelector('[data-edit-form="links"]')?.addEventListener("submit", (event) => saveIdeaLinksEdit(event, idea.id));
  card.querySelector('[data-edit-form="image"]')?.addEventListener("submit", (event) => saveIdeaImageEdit(event, idea.id));

  if (card.classList.contains("is-expanded") && !card.classList.contains("is-animating")) {
    card.querySelector(".idea-expanded-extra")?.classList.add("is-ready");
  }

  syncExpandedPanelHeight(card);
}

function syncExpandedPanelHeight(card) {
  if (!card || !card.classList.contains("is-expanded") || card.classList.contains("has-edit-open")) return;

  const panel = card.querySelector(".brainstorming-card-panel");
  const descriptionFrame = card.querySelector(".idea-description-frame");
  const descriptionText = card.querySelector(".idea-description-frame p");
  if (!panel) return;

  window.requestAnimationFrame(() => {
    if (descriptionFrame && descriptionText) {
      const computedDescriptionStyles = window.getComputedStyle(descriptionText);
      const lineHeight = Number.parseFloat(computedDescriptionStyles.lineHeight) || 22;
      const maxVisibleDescriptionHeight = Math.ceil(lineHeight * 17 + 18);
      const descriptionHeight = Math.min(maxVisibleDescriptionHeight, Math.max(51, Math.ceil(descriptionText.scrollHeight) + 18));
      card.style.setProperty("--expanded-description-h", descriptionHeight + "px");
      descriptionFrame.style.height = descriptionHeight + "px";
      descriptionFrame.style.minHeight = descriptionHeight + "px";
      descriptionFrame.style.maxHeight = descriptionHeight + "px";
      descriptionText.style.height = Math.max(33, descriptionHeight - 18) + "px";
      descriptionText.style.minHeight = Math.max(33, descriptionHeight - 18) + "px";
      descriptionText.style.maxHeight = Math.max(33, descriptionHeight - 18) + "px";
    }

    window.requestAnimationFrame(() => {
      const measuredHeight = Math.min(640, Math.max(184, Math.ceil(panel.scrollHeight)));
      const previousTargetHeight = Number.parseFloat(card.style.getPropertyValue("--expanded-panel-target-h")) || 0;
      const stabilizedHeight = previousTargetHeight && Math.abs(measuredHeight - previousTargetHeight) <= 16
        ? previousTargetHeight
        : measuredHeight;
      applyExpandedPanelHeight(card, stabilizedHeight);
    });
  });
}

function applyExpandedPanelHeight(card, height) {
  const nextHeight = Math.min(640, Math.max(184, Math.round(height || 0)));
  card.style.setProperty("--expanded-panel-target-h", nextHeight + "px");
  card.style.setProperty("--expanded-panel-drop", Math.round(nextHeight * 0.5) + "px");
}

function alignExpandedEditPanel(card) {
  if (!card || !card.classList.contains("has-edit-open")) return;

  const panel = card.querySelector(".brainstorming-card-panel");
  const image = card.querySelector(".brainstorming-card-image");
  const extra = card.querySelector(".idea-expanded-extra");
  const activeForm = extra?.querySelector('[data-edit-form]:not(.hidden)');
  if (!panel || !image || !extra || !activeForm) return;

  window.requestAnimationFrame(() => {
    const panelRect = panel.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();
    const extraRect = extra.getBoundingClientRect();
    const activeFormRect = activeForm.getBoundingClientRect();
    const activeFormName = activeForm.dataset.editForm || "details";
    const panelHeight = activeFormName === "details"
      ? Math.max(620, Number.parseFloat(card.dataset.editRestorePanelHeight) || Math.round(panelRect.height))
      : Math.max(228, Math.min(380, Math.ceil((extraRect.top - panelRect.top) + activeFormRect.height + 26)));
    const imageHeight = Math.round(imageRect.height);
    const extraTopOffset = Math.round(extraRect.top - panelRect.top);
    const desiredFormTop = Math.round(imageHeight / 2) + 6;
    const panelTop = desiredFormTop - extraTopOffset;
    const panelDrop = activeFormName === "details"
      ? panelTop - imageHeight + panelHeight
      : 24;

    card.style.setProperty("--expanded-edit-panel-h", panelHeight + "px");
    card.style.setProperty("--expanded-panel-target-h", panelHeight + "px");
    card.style.setProperty("--expanded-panel-drop", Math.round(panelDrop) + "px");
  });
}

function getExpandedPanelHeight(card) {
  if (!card) return 0;
  return Number.parseFloat(card.style.getPropertyValue("--expanded-panel-target-h"))
    || Math.round(card.querySelector(".brainstorming-card-panel")?.getBoundingClientRect().height || 0);
}

function listValuesEqual(left, right) {
  if ((left || []).length !== (right || []).length) return false;
  return (left || []).every((value, index) => value === (right || [])[index]);
}

function toggleIdeaEditPanel(content, panelName) {
  const wasEditOpen = content.classList.contains("has-edit-open");
  if (!wasEditOpen) {
    content.dataset.editRestorePanelHeight = String(getExpandedPanelHeight(content));
  }

  content.classList?.remove("is-animating");
  content.querySelectorAll("[data-edit-form]").forEach((form) => {
    const isActive = form.dataset.editForm === panelName;
    form.classList.toggle("hidden", !isActive || !form.classList.contains("hidden"));
  });
  const hasOpenEditPanel = Boolean(content.querySelector('[data-edit-form]:not(.hidden)'));
  content.classList?.toggle("has-edit-open", hasOpenEditPanel);
  if (hasOpenEditPanel) {
    alignExpandedEditPanel(content);
  }
  if (!hasOpenEditPanel) {
    const restoreHeight = Number.parseFloat(content.dataset.editRestorePanelHeight) || 0;
    if (restoreHeight) {
      applyExpandedPanelHeight(content, restoreHeight);
      delete content.dataset.editRestorePanelHeight;
    } else {
      syncExpandedPanelHeight(content);
    }
  }
}

async function saveIdeaImageEdit(event, ideaId) {
  event.preventDefault();
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea) return;

  const form = event.currentTarget;
  const card = form.closest(".brainstorming-card");
  const previousPanelHeight = getExpandedPanelHeight(card);
  const image = form.elements.image?.value.trim();
  const imageFile = form.elements.imageFile?.files?.[0];
  const uploadedImage = imageFile ? await readImageFile(imageFile) : "";
  const nextImage = uploadedImage || image;
  const hasChanged = Boolean(nextImage && nextImage !== (idea.image || ""));
  if (nextImage) idea.image = nextImage;
  saveIdeas();
  refreshExpandedIdeaCard(ideaId, { preservePanelHeight: hasChanged ? 0 : previousPanelHeight });
}

function saveIdeaDetailsEdit(event, ideaId) {
  event.preventDefault();
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea) return;

  const form = event.currentTarget;
  const card = form.closest(".brainstorming-card");
  const previousPanelHeight = getExpandedPanelHeight(card);
  const nextTitle = form.elements.title?.value.trim() || idea.title;
  const nextDescription = form.elements.description?.value.trim() || idea.description;
  const nextType = form.elements.type?.value.trim() || "Ideja";
  const nextEnergy = Math.max(1, Math.min(10, Number(form.elements.energy?.value || idea.energy || 1)));
  const nextTags = splitInputList(form.elements.tags?.value);
  const hasChanged = nextTitle !== idea.title
    || nextDescription !== idea.description
    || nextType !== (idea.type || "Ideja")
    || nextEnergy !== Math.max(1, Math.min(10, Number(idea.energy || 1)))
    || !listValuesEqual(nextTags, idea.tags || []);

  idea.title = nextTitle;
  idea.description = nextDescription;
  idea.type = nextType;
  idea.energy = nextEnergy;
  idea.tags = nextTags;
  if (form.elements.links) {
    idea.links = splitInputList(form.elements.links.value);
  }
  saveIdeas();
  refreshExpandedIdeaCard(ideaId, { preservePanelHeight: hasChanged ? 0 : previousPanelHeight });
}

function saveIdeaLinksEdit(event, ideaId) {
  event.preventDefault();
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea) return;

  const form = event.currentTarget;
  const card = form.closest(".brainstorming-card");
  const previousPanelHeight = getExpandedPanelHeight(card);
  const nextLinks = splitInputList(form.elements.links?.value);
  const hasChanged = !listValuesEqual(nextLinks, idea.links || []);
  idea.links = nextLinks;
  saveIdeas();
  refreshExpandedIdeaCard(ideaId, { preservePanelHeight: hasChanged ? 0 : previousPanelHeight });
}

function refreshExpandedIdeaCard(ideaId, options = {}) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  const card = brainstormingState.previewCard || document.querySelector('.brainstorming-card[data-idea-id="' + cssEscape(ideaId) + '"]');
  if (!idea || !card) return;

  const statusKey = normalizeStatus(idea.status);
  card.className = "brainstorming-card status-" + statusKey + (card.classList.contains("is-expanded") ? " is-expanded" : "");
  card.style.setProperty("--idea-image", cssImageUrl(idea.image));
  const title = card.querySelector(".brainstorming-card-panel h3");
  const panelTags = card.querySelector(".idea-panel-tags");
  const description = card.querySelector(".idea-description-frame p");
  const typeBadge = card.querySelector(".idea-type-badge");
  const energy = card.querySelector(".idea-energy");
  const expandedEnergy = card.querySelector(".idea-expanded-energy");
  const cornerSymbol = card.querySelector(".idea-star");
  const expandedStatusBadge = card.querySelector(".idea-expanded-status-badge");
  if (title) title.textContent = idea.title;
  if (panelTags) panelTags.innerHTML = renderTags(idea.tags);
  if (description) description.textContent = idea.description;
  if (typeBadge) typeBadge.textContent = idea.type || "Ideja";
  if (energy) energy.textContent = "Energy " + Number(idea.energy || 1) + "/10";
  if (expandedEnergy) expandedEnergy.textContent = "Energy " + Number(idea.energy || 1) + "/10";
  if (cornerSymbol) cornerSymbol.innerHTML = getIdeaCornerSymbol(statusKey);
  const nextBadge = getIdeaExpandedStatusBadge(statusKey);
  if (expandedStatusBadge && nextBadge) expandedStatusBadge.outerHTML = nextBadge;
  if (expandedStatusBadge && !nextBadge) expandedStatusBadge.remove();
  if (!expandedStatusBadge && nextBadge) {
    card.querySelector(".idea-star")?.insertAdjacentHTML("afterend", nextBadge);
  }

  card.classList.remove("has-edit-open");
  delete card.dataset.editRestorePanelHeight;
  renderExpandedIdeaControls(card, idea);
  card.querySelector(".idea-expanded-extra")?.classList.add("is-ready");
  if (options.preservePanelHeight) {
    applyExpandedPanelHeight(card, options.preservePanelHeight);
  } else {
    syncExpandedPanelHeight(card);
  }
}

function closeIdeaPreview() {
  const modal = document.getElementById("ideaPreviewModal");
  if (!modal || modal.classList.contains("hidden")) return;

  modal.classList.add("is-closing");
  brainstormingState.previewIdeaId = null;
  const closingCard = brainstormingState.previewCard;
  brainstormingState.previewCard = null;
  window.clearTimeout(brainstormingState.previewCloseTimer);
  closingCard?.classList.add("is-animating");
  collapseExpandedIdeaCard(closingCard);
  brainstormingState.previewCloseTimer = window.setTimeout(() => {
    modal.classList.add("hidden");
    modal.classList.remove("is-closing");
  }, 448);
}

function positionExpandedIdeaCard(card) {
  const canvas = getCanvas();
  if (!canvas) return;

  const imageAspectRatio = 256 / 195;

  if (window.matchMedia("(max-width: 980px)").matches) {
    const expandedWidth = canvas.clientWidth;
    card.style.setProperty("--expanded-w", "100%");
    card.style.setProperty("--expanded-image-target-h", Math.round(expandedWidth / imageAspectRatio) + "px");
    card.style.setProperty("--expanded-x", "0px");
    card.style.setProperty("--expanded-y", "0px");
    window.requestAnimationFrame(() => card.scrollIntoView({ behavior: "smooth", block: "center" }));
    return;
  }

  const availableWidth = Math.max(320, canvas.clientWidth - 48);
  const expandedWidth = Math.min(691, availableWidth < 620 ? availableWidth : Math.max(504, (canvas.clientWidth - 360) * 0.9));
  const expandedImageHeight = Math.round(expandedWidth / imageAspectRatio);
  const endX = Math.max(18, (canvas.clientWidth - expandedWidth) / 2);
  const endY = 98;

  card.style.setProperty("--expanded-w", expandedWidth + "px");
  card.style.setProperty("--expanded-image-target-h", expandedImageHeight + "px");
  card.style.setProperty("--expanded-x", endX + "px");
  card.style.setProperty("--expanded-y", endY + "px");
}

function bringIdeaToFront(ideaId, card) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (!idea) return;

  idea.layer = getNextIdeaLayer();
  saveIdeas();
  if (card) card.style.zIndex = String(idea.layer);
}

function getNextIdeaLayer() {
  const maxLayer = brainstormingState.ideas.reduce((max, idea) => Math.max(max, Number(idea.layer) || 1), 1);
  return maxLayer + 1;
}

function collapseExpandedIdeaCard(card, immediate) {
  if (!card) return;
  card.querySelector(".idea-description-frame")?.style.removeProperty("height");
  card.querySelector(".idea-description-frame")?.style.removeProperty("min-height");
  card.querySelector(".idea-description-frame")?.style.removeProperty("max-height");
  card.querySelector(".idea-description-frame p")?.style.removeProperty("height");
  card.querySelector(".idea-description-frame p")?.style.removeProperty("min-height");
  card.querySelector(".idea-description-frame p")?.style.removeProperty("max-height");
  card.style.removeProperty("--expanded-description-h");
  card.style.removeProperty("--expanded-panel-target-h");
  card.style.removeProperty("--expanded-panel-drop");
  card.classList.remove("has-edit-open");
  card.classList.add("is-collapsing");
  card.classList.remove("is-expanded");
  if (immediate) {
    card.querySelector(".idea-expanded-tools")?.remove();
    card.querySelector(".idea-expanded-extra")?.remove();
    card.classList.remove("is-collapsing");
    return;
  }

  window.setTimeout(() => {
    card.querySelector(".idea-expanded-tools")?.remove();
    card.querySelector(".idea-expanded-extra")?.remove();
    card.classList.remove("is-animating", "is-collapsing");
  }, 432);
}

function isTypingTarget(target) {
  if (!target || !target.tagName) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
}

function isDeleteKeyboardEvent(event) {
  return event.key === "Delete" || event.key === "Del" || event.code === "Delete" || event.keyCode === 46 || event.which === 46;
}

function renderMiniMap() {
  const map = document.getElementById("brainstormingMiniMap");
  if (!map) return;

  map.innerHTML = "";
  getSearchedIdeas(brainstormingState.ideas).forEach((idea) => {
    const dot = document.createElement("span");
    const x = Math.min(92, Math.max(4, (Number(idea.x) || 0) / 11));
    const y = Math.min(86, Math.max(7, (Number(idea.y) || 0) / 7.2));
    dot.className = "brainstorming-map-dot status-" + normalizeStatus(idea.status);
    dot.style.left = x + "%";
    dot.style.top = y + "%";
    dot.style.background = BRAINSTORMING_STATUS_COLORS[normalizeStatus(idea.status)];
    map.appendChild(dot);
  });
}

function setupDragAndDrop() {
  document.querySelectorAll(".brainstorming-card").forEach((card) => {
    card.addEventListener("pointerdown", (event) => {
      if (card.classList.contains("is-expanded")) return;
      const idea = brainstormingState.ideas.find((item) => item.id === card.dataset.ideaId);
      if (!idea || window.matchMedia("(max-width: 980px)").matches) return;
      bringIdeaToFront(idea.id, card);

      brainstormingState.drag = {
        id: idea.id,
        startX: event.clientX,
        startY: event.clientY,
        originX: Number(idea.x) || 0,
        originY: Number(idea.y) || 0,
        moved: false
      };
      card.classList.add("dragging");
      card.setPointerCapture(event.pointerId);
    });

    card.addEventListener("pointermove", (event) => {
      const drag = brainstormingState.drag;
      if (!drag || drag.id !== card.dataset.ideaId) return;

      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;
      if (Math.abs(deltaX) + Math.abs(deltaY) > 6) drag.moved = true;
      const nextPosition = clampIdeaCoordinates(drag.originX + deltaX, drag.originY + deltaY, card);

      card.style.setProperty("--idea-x", nextPosition.x + "px");
      card.style.setProperty("--idea-y", nextPosition.y + "px");
    });

    card.addEventListener("pointerup", (event) => {
      const drag = brainstormingState.drag;
      if (!drag || drag.id !== card.dataset.ideaId) return;

      const idea = brainstormingState.ideas.find((item) => item.id === drag.id);
      if (idea) {
        const nextPosition = clampIdeaCoordinates(drag.originX + event.clientX - drag.startX, drag.originY + event.clientY - drag.startY, card);
        idea.x = nextPosition.x;
        idea.y = nextPosition.y;
        saveIdeas();
        renderMiniMap();
      }

      card.dataset.wasDragged = String(drag.moved);
      card.classList.remove("dragging");
      brainstormingState.drag = null;
    });
  });
}

function openIdeaPath(ideaId) {
  const idea = brainstormingState.ideas.find((item) => item.id === ideaId);
  if (idea && normalizeStatus(idea.status) === "seed") {
    idea.status = "path";
    idea.layer = getNextIdeaLayer();
    saveIdeas();
  }
  closeIdeaPreview();
  renderBrainstormingTab("path");
  // TODO: Connect this to a dedicated Idea Path module/page when it exists.
}

function renderWorkspaceHero(idea, statusLabel, subtitle, actions, progress, targetDate) {
  return [
    '<article class="workspace-hero" style="--idea-image: ' + cssImageUrl(idea.image) + '">',
    '  <div class="workspace-hero-copy">',
    '    <span class="idea-status">' + escapeHtml(statusLabel) + "</span>",
    "    <h2>" + escapeHtml(idea.title) + "</h2>",
    "    <p>" + escapeHtml(subtitle) + "</p>",
    '    <div class="workspace-hero-meta">',
    '      <span>Energija ' + Number(idea.energy || 1) + "/10</span>",
    progress ? "      <span>Progress " + escapeHtml(progress) + "</span>" : "",
    targetDate ? "      <span>Target " + escapeHtml(targetDate) + "</span>" : "",
    "    </div>",
    "  </div>",
    '  <div class="workspace-hero-actions">' + actions.join("") + "</div>",
    "</article>"
  ].join("");
}

function clampIdeaPosition(idea, card) {
  const nextPosition = clampIdeaCoordinates(Number(idea.x) || 0, Number(idea.y) || 0, card);
  const changed = nextPosition.x !== idea.x || nextPosition.y !== idea.y;
  idea.x = nextPosition.x;
  idea.y = nextPosition.y;
  return changed;
}

function clampIdeaCoordinates(x, y, card) {
  const canvas = getCanvas();
  const zoom = Number(brainstormingState.zoom || 1);
  const margin = 10;
  const cardWidth = (card?.offsetWidth || 256) * zoom;
  const cardHeight = (card?.offsetHeight || 194) * zoom;
  const canvasWidth = canvas?.clientWidth || 1200;
  const canvasHeight = canvas?.clientHeight || 720;
  const maxX = Math.max(margin, canvasWidth - cardWidth - margin);
  const minimap = document.querySelector(".brainstorming-canvas-wrap.is-board .brainstorming-minimap");
  const minimapLift = 50;
  let maxY = Math.max(margin, canvasHeight - cardHeight - margin);

  if (canvas && minimap && window.matchMedia("(min-width: 981px)").matches) {
    const canvasRect = canvas.getBoundingClientRect();
    const minimapRect = minimap.getBoundingClientRect();
    const minimapTopInCanvas = minimapRect.top - canvasRect.top;
    const minimapLimitY = Math.round(minimapTopInCanvas - minimapLift - cardHeight);
    maxY = Math.max(maxY, minimapLimitY);
  }

  return {
    x: Math.round(Math.min(maxX, Math.max(margin, Number(x) || margin))),
    y: Math.round(Math.min(maxY, Math.max(margin, Number(y) || margin)))
  };
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
  const tasks = test.tasks.length ? test.tasks : ["Dan 1 task", "Dan 2 task", "Dan 3 task"];
  return [
    '<div class="idea-test-box">',
    "  <strong>" + escapeHtml(test.title || "Aktivni test: 3 dana") + "</strong>",
    "  <span>Dan " + Number(test.currentDay || 1) + " od " + Number(test.days || 3) + "</span>",
    '  <div class="workspace-progress"><span style="width:' + Number(test.progress || 0) + '%"></span></div>',
    '  <ul class="workspace-checklist">' + tasks.map((task, index) => '<li><input type="checkbox" ' + (index < Number(test.currentDay || 1) - 1 ? "checked" : "") + " />" + escapeHtml(task) + "</li>").join("") + "</ul>",
    '  <div class="panel-actions"><button class="ghost-btn" type="button">Pogledaj test</button><button class="btn secondary" type="button">Napravi test</button></div>',
    "</div>"
  ].join("");
}

function renderRelatedIdeas(activeIdea) {
  const related = brainstormingState.ideas.filter((idea) => idea.id !== activeIdea.id).slice(0, 4);
  return [
    '<article class="workspace-panel related-ideas-panel">',
    "  <h2>Povezane ideje</h2>",
    '  <div class="related-ideas-row">',
    related.map((idea) => '<button type="button" data-open-preview="' + idea.id + '"><strong>' + escapeHtml(idea.title) + '</strong><span>' + escapeHtml(BRAINSTORMING_STATUS_LABELS[normalizeStatus(idea.status)]) + "</span></button>").join(""),
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
    ["Pon", "Uto", "Sre", "Čet", "Pet", "Sub", "Ned"].map((day, index) => '<span class="' + (index === 2 ? "active" : "") + '">' + day + "</span>").join(""),
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
    "    <small>Arhivirano: " + escapeHtml(idea.archivedAt || "nije zabeleženo") + " · Prethodno: " + escapeHtml(BRAINSTORMING_STATUS_LABELS[normalizeStatus(idea.previousStatus)] || "Seed") + "</small>",
    '    <div class="archive-actions">',
    '      <button class="ghost-btn" type="button" data-restore-idea="' + idea.id + '">Vrati u ideje</button>',
    '      <button class="ghost-btn" type="button" data-open-preview="' + idea.id + '">Otvori preview</button>',
    '      <button class="ghost-btn" type="button" data-delete-idea="' + idea.id + '">Obriši trajno</button>',
    "    </div>",
    "  </div>",
    "</article>"
  ].join("");
}

function bindWorkspaceActions(root) {
  root.querySelectorAll("[data-open-preview]").forEach((button) => {
    button.addEventListener("click", () => openIdeaPreview(button.dataset.openPreview));
  });
  root.querySelectorAll("[data-set-status]").forEach((button) => {
    button.addEventListener("click", () => updateIdeaStatus(button.dataset.ideaId, button.dataset.setStatus));
  });
  root.querySelector("[data-open-calendar]")?.addEventListener("click", () => {
    if (typeof setView === "function") setView("planner");
  });
}

function getPathData(idea) {
  idea.pathData = { ...createDefaultPathData(idea), ...(idea.pathData || {}) };
  return idea.pathData;
}

function getBuildData(idea) {
  idea.buildData = { ...createDefaultBuildData(idea), ...(idea.buildData || {}) };
  return idea.buildData;
}

function createDefaultPathData(idea) {
  return {
    vision: idea.description || "",
    whyImportant: "Zato što ova ideja ima dovoljno energije da zasluži istraživanje pre nego što postane plan.",
    clarity: 7,
    fear: 3,
    researchImages: [],
    researchLinks: idea.links || [],
    mindMapNodes: ["Publika", "Format", "Resursi", "Test", "Rizici", "Prvi korak"],
    notes: ["Prvo proveriti najmanji mogući dokaz interesovanja.", "Zadržati ideju laganom dok se ne pokaže smer."],
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
      { title: "Priprema", status: "Done" },
      { title: "MVP", status: "In Progress" },
      { title: "Testiranje", status: "To Do" },
      { title: "Launch", status: "To Do" }
    ],
    tasks: [
      { title: "Definisati prvi opseg", status: "Done", due: "Danas" },
      { title: "Napraviti radnu verziju", status: "In Progress", due: "Petak" },
      { title: "Zakazati test korisnika", status: "To Do", due: "Sledeća nedelja" }
    ],
    habits: [
      { title: "Deep work", streak: 4 },
      { title: "Dnevni pregled", streak: 6 },
      { title: "Učenje", streak: 3 }
    ],
    resources: ["https://notion.so", "https://drive.google.com"],
    notes: ["Ostvarenje traži ritam, ne savršenstvo.", "Najvažnije je završiti malu verziju i dobiti signal iz realnosti."]
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
    x: 80,
    y: 80,
    layer: 1,
    ...idea
  };
  nextIdea.status = normalizeStatus(nextIdea.status);
  if (nextIdea.status === "path") nextIdea.pathData = { ...createDefaultPathData(nextIdea), ...(nextIdea.pathData || {}) };
  if (nextIdea.status === "build") nextIdea.buildData = { ...createDefaultBuildData(nextIdea), ...(nextIdea.buildData || {}) };
  return nextIdea;
}

function pickIdeaForWorkspace(status) {
  const ideas = getSearchedIdeas(brainstormingState.ideas);
  return ideas.find((idea) => normalizeStatus(idea.status) === status) || null;
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
  if (!Array.isArray(tags) || !tags.length) return '<span class="idea-chip">bez tagova</span>';
  return tags.map((tag) => '<span class="idea-chip">#' + escapeHtml(tag) + "</span>").join("");
}

function renderLinks(links) {
  if (!Array.isArray(links) || !links.length) return "<span>Nema dodatih linkova.</span>";
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
  initBrainstorming,
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
  resetBrainstormingView,
  renderMiniMap,
  setupDragAndDrop
};

document.addEventListener("DOMContentLoaded", initBrainstorming);
