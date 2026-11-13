const appState = {
  goals: [
    {
      id: "seed-short-sql",
      type: "short-term",
      title: "Nauciti SQL osnove",
      reason: "Da brze razumem podatke i donosim bolje odluke.",
      category: "Career & Work",
      categoryName: "Karijera i posao",
      subcategory: null,
      subcategoryName: "Nije izabrana",
      customSubcategoryName: "",
      goalType: "Vestina",
      targetDate: null,
      duration: "14 dana",
      frequency: null,
      firstAction: "Prodji SELECT, WHERE i JOIN primere",
      mainMilestone: "",
      successMeasurement: "Mogu samostalno da napisem 10 korisnih SQL upita.",
      mentorAnswers: {},
      finalGoalReason: "Da ojacam tehnicku osnovu za posao.",
      createdAt: "2026-05-19T08:00:00.000Z"
    },
    {
      id: "seed-short-training",
      type: "habit",
      title: "Trening 3x nedeljno",
      reason: "Da imam vise energije i stabilniji ritam.",
      category: "Health & Energy",
      categoryName: "Zdravlje i energija",
      subcategory: null,
      subcategoryName: "Nije izabrana",
      customSubcategoryName: "",
      goalType: "Energija",
      targetDate: null,
      duration: null,
      frequency: "3x nedeljno",
      bestTime: "Popodne",
      firstAction: "Uraditi prvi trening od 30 minuta",
      mainMilestone: "",
      successMeasurement: "Tri treninga svake nedelje tokom mesec dana.",
      mentorAnswers: {},
      finalGoalReason: "Da telo moze da prati moje ambicije.",
      createdAt: "2026-05-19T08:05:00.000Z"
    },
    {
      id: "seed-long-app",
      type: "long-term",
      title: "Napraviti licnu aplikaciju",
      reason: "Da spojim znanje, disciplinu i konkretan projekat.",
      category: "Career & Work",
      categoryName: "Karijera i posao",
      subcategory: null,
      subcategoryName: "Nije izabrana",
      customSubcategoryName: "",
      goalType: "Projekat",
      targetDate: "2026-08-31",
      duration: null,
      frequency: null,
      firstAction: "Definisati funkcionalnosti aplikacije",
      mainMilestone: "Objaviti prvu upotrebljivu verziju",
      successMeasurement: "Aplikacija ima MVP, sacuvane podatke i dnevnu upotrebu.",
      mentorAnswers: {},
      finalGoalReason: "Da imam realan portfolio projekat.",
      createdAt: "2026-05-19T08:10:00.000Z",
      actions: [
        { id: "seed-long-app-action-0", title: "Definisati funkcionalnosti aplikacije", cadence: "Dnevno", completed: false },
        { id: "seed-long-app-action-1", title: "Napraviti osnovnu strukturu projekta", cadence: "Dnevno", completed: false },
        { id: "seed-long-app-action-2", title: "Implementirati prvu funkcionalnost", cadence: "Po planu", completed: false },
        { id: "seed-long-app-action-3", title: "Testirati i popraviti MVP", cadence: "Po planu", completed: false }
      ]
    },
    {
      id: "seed-long-savings",
      type: "long-term",
      title: "Ustedeti 3000 evra",
      reason: "Da napravim sigurnosni fond i mirnije donosim odluke.",
      category: "Finance",
      categoryName: "Finansije",
      subcategory: null,
      subcategoryName: "Nije izabrana",
      customSubcategoryName: "",
      goalType: "Sigurnost",
      targetDate: "2026-12-31",
      duration: null,
      frequency: null,
      firstAction: "Odvojiti prvi iznos na poseban racun",
      mainMilestone: "Dostici 1500 evra do pola puta",
      successMeasurement: "Na posebnom racunu stoji 3000 evra.",
      mentorAnswers: {},
      finalGoalReason: "Da imam stabilniju finansijsku osnovu.",
      createdAt: "2026-05-19T08:15:00.000Z",
      actions: [
        { id: "seed-long-savings-action-0", title: "Izracunati mesecni iznos stednje", cadence: "Jednom", completed: false },
        { id: "seed-long-savings-action-1", title: "Otvoriti poseban stedni prostor", cadence: "Jednom", completed: false },
        { id: "seed-long-savings-action-2", title: "Prebaciti novac prvog u mesecu", cadence: "Mesecno", completed: false },
        { id: "seed-long-savings-action-3", title: "Pregledati troskove svake nedelje", cadence: "Nedeljno", completed: false }
      ]
    }
  ],
  calendarEvents: [],
  slotNotes: {},
  currentView: "month",
  selectedDate: null,
  selectedEventId: null,
  selectedGoalId: null,
  selectedActionId: null,
  selectedGoalNoteId: null,
  selectedSlotHour: null,
  goalFocusTab: "overview",
  selectedCategory: null,
  selectedSubcategory: null,
  customSubcategoryName: "",
  expandedGoalIds: []
};

function deepFreezeGoalTemplate(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreezeGoalTemplate);
  return Object.freeze(value);
}

const GOAL_SAMPLE_TEMPLATES = deepFreezeGoalTemplate(JSON.parse(JSON.stringify(appState.goals)));
appState.goals = JSON.parse(JSON.stringify(GOAL_SAMPLE_TEMPLATES));
window.GOAL_SAMPLE_TEMPLATES = GOAL_SAMPLE_TEMPLATES;

function isTextEditingTarget(target) {
  const field = target?.closest?.("input, textarea, select, [contenteditable]");
  if (!field) return false;
  if (field.matches("textarea, select, [contenteditable]")) return true;
  if (!field.matches("input")) return false;
  const type = String(field.getAttribute("type") || "text").toLowerCase();
  return !["button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit"].includes(type);
}

window.MentorUIEvents = Object.freeze({
  isTextEditingTarget,
  isTextEditingEvent(event) {
    return isTextEditingTarget(event?.target);
  }
});

const TYPE_LABELS = {
  "long-term": "Long-term goal",
  "short-term": "Short-term goal",
  habit: "Habit"
};

const CATEGORY_LABELS = {
  "Personal Growth": "Personal Growth",
  "Health & Energy": "Health & Energy",
  "Career & Work": "Career & Work",
  Finance: "Finance",
  "Relationships & Family": "Relationships & Family",
  Other: "Other"
};

const MENTOR_INTRO_DEFAULT = {
  title: "Start your progress",
  text: "Choose one area of life and the questions, calendar, and notes will follow that focus."
};

const CATEGORY_MENTOR_INTROS = {
  "Personal Growth": {
    title: "Growth starts within",
    text: "Personal growth helps you think more clearly, choose with more confidence, and build a version of yourself you can trust each day."
  },
  "Health & Energy": {
    title: "Energy is the foundation",
    text: "Health gives strength to every other goal: better rhythm, more focus, and a body that can keep up with your ambitions."
  },
  "Career & Work": {
    title: "Direct your work",
    text: "A career grows when you know what you are building, which skills you are strengthening, and which next step has the most impact."
  },
  Finance: {
    title: "Money follows a plan",
    text: "A financial goal brings calm, clearer decisions, and a sense of control over the choices you make today and tomorrow."
  },
  "Relationships & Family": {
    title: "Relationships give strength",
    text: "Quality relationships need attention, conversation, and time; when you nurture them, life gets a steadier foundation."
  },
  Other: {
    title: "Your focus has room",
    text: "If a goal does not fit standard categories, it still deserves a clear plan, rhythm, and way to measure progress."
  }
};

const MENTOR_SYMBOL_DEFAULT = {
  image: "icons/lotus-panel-symbol.svg",
  color: "#2f2418",
  size: "min(48%, 170px)",
  yOffset: "-58px"
};

const CATEGORY_MENTOR_SYMBOLS = {
  "Personal Growth": {
    image: "icons/brain-outline-symbol.svg",
    color: "#2f2418",
    size: "min(30.1%, 230px)",
    yOffset: "-55px"
  },
  "Health & Energy": {
    image: "icons/health-panel-symbol.svg",
    color: "#2f2418",
    size: "min(27.2%, 152px)",
    yOffset: "-56px"
  },
  "Career & Work": {
    image: "icons/career-panel-symbol.svg",
    color: "#2f2418",
    size: "min(25.9%, 143.5px)",
    yOffset: "-62px"
  },
  Finance: {
    image: "icons/finance-panel-symbol.svg",
    color: "#2f2418",
    size: "min(22.2%, 123px)",
    yOffset: "-62px"
  },
  "Relationships & Family": {
    image: "icons/relationships-panel-symbol.svg",
    color: "#2f2418",
    size: "min(29.6%, 164px)",
    yOffset: "-55px"
  },
  Other: {
    image: "icons/other-panel-symbol.svg",
    color: "#2f2418",
    size: "min(29%, 196px)",
    yOffset: "-56px"
  }
};

let mentorSymbolImage = MENTOR_SYMBOL_DEFAULT.image;
let mentorSymbolTimer = null;

const TYPE_FROM_LABEL = {
  "Dugoročni cilj": "long-term",
  "Kratkoročni cilj": "short-term",
  Navika: "habit",
  "Long-term goal": "long-term",
  "Short-term goal": "short-term",
  Habit: "habit"
};

const FIRST_QUESTION = {
  key: "creationType",
  text: "Do you want to set this focus as a long-term goal, short-term goal, or habit?",
  type: "options",
  options: ["Long-term goal", "Short-term goal", "Habit"]
};

const TYPE_FOLLOW_UP_QUESTIONS = {
  "long-term": [
    { key: "targetDate", text: "Which date do you want as the deadline or main checkpoint?", type: "date" }
  ],
  "short-term": [
    { key: "duration", text: "How long do you want this first focused sprint to last?", type: "options", options: ["3 days", "5 days", "7 days", "14 days", "30 days"] }
  ],
  habit: [
    { key: "frequency", text: "How often can you realistically repeat this habit?", type: "options", options: ["Daily", "3x weekly", "Weekly"] },
    { key: "bestTime", text: "Which part of the day makes the most sense for it?", type: "options", options: ["Morning", "Afternoon", "Evening"] }
  ]
};

function q(key, text, type, placeholder) {
  return { key, text, type: type || "textarea", placeholder: placeholder || "" };
}

function createQuestionSet(config) {
  return [
    q("title", config.title, "text", config.titlePlaceholder),
    q("purpose", config.purpose),
    q("successMeasurement", config.successMeasurement),
    q("action", config.action)
  ];
}

function sub(id, name, description, icon, goalTypes, config) {
  return {
    id,
    name,
    description,
    icon,
    goalTypes: goalTypes || [],
    questions: createQuestionSet(config)
  };
}

// Add future categories, subcategories, goal types, and mentor questions here.
// The UI reads this structure directly, so no separate hardcoded flow is needed.
function getLocalizedGoalCategories() {
  return window.MentorI18n?.getBuilderCatalog?.() || [];
}

let goalCategories = getLocalizedGoalCategories();

const CUSTOM_SUBCATEGORY_ID = "custom_category_goal";

const SUBCATEGORY_SYMBOLS = {
  confidence: "★",
  discipline: "◆",
  mindset: "∞",
  learning: "A",
  emotional_balance: "~",
  spiritual_growth: "✦",
  creativity: "✎",
  gym_strength: "S",
  weight_loss: "↓",
  muscle_gain: "M",
  nutrition: "N",
  running_athletics: "R",
  mobility_flexibility: "↔",
  sleep_recovery: "☾",
  energy_management: "⚡",
  new_job: "J",
  promotion: "↑",
  skill_development: "K",
  business_idea: "B",
  productivity: "P",
  portfolio_cv: "CV",
  freelancing: "F",
  leadership: "L",
  saving_money: "$",
  investing: "%",
  debt_reduction: "-",
  budgeting: "=",
  increasing_income: "+",
  emergency_fund: "!",
  financial_freedom: "∞",
  business_revenue: "↗",
  romantic_relationship: "♥",
  family_connection: "⌂",
  parenting: "P",
  friendships: "F",
  communication: "C",
  conflict_resolution: "↔",
  boundaries: "□",
  quality_time: "T",
  travel: "✈",
  home_projects: "⌂",
  creative_projects: "✎",
  lifestyle: "L",
  hobbies: "H",
  personal_experiments: "?",
  custom_goal: "+"
};

const flowState = {
  questions: [],
  index: 0,
  answers: {},
  pendingValue: "",
  generated: false
};

const categoryStage = document.getElementById("categoryStage");
const categoryCards = Array.from(document.querySelectorAll(".category-option"));
const startGoalBuilderBtn = document.getElementById("startGoalBuilderBtn");
const backToCategoriesBtn = document.getElementById("backToCategoriesBtn");
const builderFlow = document.getElementById("builderFlow");
const chat = document.getElementById("chat");
const answerArea = document.getElementById("answerArea");
const nextBtn = document.getElementById("nextBtn");
const generateBtn = document.getElementById("generateBtn");
const goalReview = document.getElementById("goalReview");
const toggleChatBtn = document.getElementById("toggleChatBtn");
const builderTab = document.getElementById("builderTab");
const plannerTab = document.getElementById("plannerTab");
const builderView = document.getElementById("builderView");
const plannerView = document.getElementById("plannerView");
const categorySelectionCard = document.querySelector(".category-selection-card");
const mentorIntroCard = document.querySelector(".mentor-intro-card");
const subcategoryPanel = document.getElementById("subcategoryPanel");
const subcategoryGrid = document.getElementById("subcategoryGrid");
const selectedCategoryTitle = document.getElementById("selectedCategoryTitle");
const customSubcategoryWrap = document.getElementById("customSubcategoryWrap");
const customSubcategoryInput = document.getElementById("customSubcategoryInput");
const backToMainCategoriesBtn = document.getElementById("backToMainCategoriesBtn");
const mentorIntroTitle = document.getElementById("mentorIntroTitle");
const mentorIntroText = document.getElementById("mentorIntroText");
const liveGoalCardPreview = document.getElementById("liveGoalCardPreview");
const sidebarItems = Array.from(document.querySelectorAll(".sidebar-item"));
const sidebarCollapseToggle = document.getElementById("sidebarCollapseToggle");
const SIDEBAR_STATE_KEY = "mentor.sidebar.state";
const dynamicCategorySymbol = document.getElementById("dynamicCategorySymbol");
const dynamicCategoryLabel = document.getElementById("dynamicCategoryLabel");
let sidebarSymbolImage = "icons/lotus-panel-symbol.svg";
let sidebarSymbolTimer = null;
const SIDEBAR_NAV_SYMBOLS = {
  dashboard: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="black" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10.5V19h4v-5h3v5h4v-8.5"/></g></svg>',
  builder: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="black" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19h5l10-10a2.1 2.1 0 0 0-3-3L6 16z"/><path d="m14 6 4 4"/><path d="M12 19h8"/></g></svg>',
  planner: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="black" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></g></svg>',
  brainstorming: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="black" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M8 14a5 5 0 1 1 8 0c-.9.8-1.2 1.7-1.2 3H9.2c0-1.3-.3-2.2-1.2-3Z"/><path d="M9.5 20h5M10 17h4M12 3V2M19 8l1-.7M5 8l-1-.7"/></g></svg>',
  finance: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="black" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7h13a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a1 1 0 0 1 1-1Z"/><path d="M7 7V5.5A1.5 1.5 0 0 1 8.5 4H17"/><path d="M16 13h4"/><path d="M16.5 13.5h.1"/></g></svg>',
  journal: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="black" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1Z"/><path d="M8 8h7M8 12h6M8 16h4"/></g></svg>',
  statistics: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="black" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19V9M12 19V5M19 19v-7"/><path d="M4 19h16"/></g></svg>',
  achievements: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="black" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v4a4 4 0 0 1-8 0Z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 12v4M9 20h6M10 16h4"/></g></svg>',
  nutrition: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="black" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v8a3 3 0 0 0 6 0V3"/><path d="M9 3v18"/><path d="M17 3v18"/><path d="M17 3a4 4 0 0 1 0 8"/></g></svg>',
  bodyEnergy: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="black" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 8.6a5.4 5.4 0 0 0-9.2-3.8L12 5.2l.4-.4a5.4 5.4 0 0 1 7.6 7.6L12 20l-8-7.6a5.4 5.4 0 0 1 7.6-7.6l.4.4"/><path d="m13 8-3 5h4l-2 4"/></g></svg>',
  settings: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="black" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M4.2 7.5l2.6 1.5M17.2 15l2.6 1.5M19.8 7.5 17.2 9M6.8 15l-2.6 1.5"/></g></svg>'
};
const SIDEBAR_VIEW_LABELS = {
  dashboard: "Dashboard",
  builder: "",
  planner: "Kalendar",
  brainstorming: "Brainstorming",
  finance: "Finansije",
  journal: "Dnevnik",
  statistics: "Statistike",
  achievements: "Achievements",
  nutrition: "Nutrition",
  bodyEnergy: "Body and Energy",
  settings: "Podešavanja"
};
const SIDEBAR_VIEW_I18N_KEYS = {
  dashboard: "nav.dashboard",
  builder: "nav.goalCreator",
  planner: "nav.calendar",
  brainstorming: "nav.brainstorming",
  finance: "nav.finance",
  journal: "nav.journal",
  statistics: "nav.statistics",
  achievements: "nav.achievements",
  nutrition: "nav.nutrition",
  bodyEnergy: "nav.bodyEnergy",
  settings: "nav.settings"
};

function getViewLabel(viewName) {
  const labelKey = SIDEBAR_VIEW_I18N_KEYS[viewName];
  return labelKey ? uiT(labelKey, SIDEBAR_VIEW_LABELS[viewName] || "Mentor") : SIDEBAR_VIEW_LABELS[viewName] || "Mentor";
}

function renderShellLanguage() {
  sidebarItems.forEach((item) => {
    const label = Array.from(item.children).find((child) => child.tagName === "SPAN" && !child.classList.contains("sidebar-icon"));
    const viewLabel = getViewLabel(item.dataset.view);
    if (label) label.textContent = viewLabel;
    item.dataset.tooltip = viewLabel;
    item.setAttribute("aria-label", viewLabel);
  });
  updateSidebarToggleLabel();
  const overflowLabel = document.querySelector("#sidebarOverflowToggle > span:first-child");
  if (overflowLabel) overflowLabel.textContent = uiT("common.more", window.MentorI18n?.getLanguage?.() === "sr" ? "Još" : "More");
  const activeView = document.body.dataset.activeView || "dashboard";
  if (dynamicCategoryLabel) dynamicCategoryLabel.textContent = getViewLabel(activeView);
}

function updateSidebarToggleLabel() {
  if (!sidebarCollapseToggle) return;
  const collapsed = document.documentElement.dataset.sidebarState === "collapsed";
  sidebarCollapseToggle.setAttribute("aria-expanded", String(!collapsed));
  sidebarCollapseToggle.setAttribute("aria-label", collapsed
    ? uiT("nav.expandSidebar", "")
    : uiT("nav.collapseSidebar", ""));
}

let sidebarResearchSyncFrame = 0;

function syncResearchWorkspaceDuringSidebarTransition() {
  if (sidebarResearchSyncFrame) cancelAnimationFrame(sidebarResearchSyncFrame);
  sidebarResearchSyncFrame = 0;
  if (document.body.dataset.activeView !== "brainstorming") return;
  const researchView = document.querySelector("#brainstormingCanvas .research-view");
  if (!researchView) return;
  const startedAt = performance.now();
  const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 230;
  const updateBounds = () => {
    if (!researchView.isConnected) return;
    if (researchView.dataset.researchPhase === "3") {
      const bounds = researchView.getBoundingClientRect();
      researchView.style.setProperty("--research-workspace-left", Math.round(bounds.left) + "px");
      researchView.style.setProperty("--research-workspace-right", Math.round(window.innerWidth - bounds.right) + "px");
    }
    const canvas = researchView.querySelector("[data-research-canvas]");
    const connections = canvas?.querySelector("[data-research-canvas-connections]");
    if (connections && canvas.clientWidth && canvas.clientHeight) {
      connections.setAttribute("viewBox", "0 0 " + canvas.clientWidth + " " + canvas.clientHeight);
    }
    if (performance.now() - startedAt < duration) {
      sidebarResearchSyncFrame = requestAnimationFrame(updateBounds);
    } else {
      sidebarResearchSyncFrame = 0;
    }
  };
  sidebarResearchSyncFrame = requestAnimationFrame(updateBounds);
}

sidebarCollapseToggle?.addEventListener("click", () => {
  const nextState = document.documentElement.dataset.sidebarState === "collapsed" ? "expanded" : "collapsed";
  document.documentElement.dataset.sidebarState = nextState;
  updateSidebarToggleLabel();
  try {
    localStorage.setItem(SIDEBAR_STATE_KEY, nextState);
  } catch (_) {
    // The layout still works when browser storage is unavailable.
  }
  syncResearchWorkspaceDuringSidebarTransition();
});
renderShellLanguage();

function setUiText(selector, key, fallback) {
  const element = typeof selector === "string" ? document.querySelector(selector) : selector;
  if (element) element.textContent = uiT(key, fallback);
}

function setUiPlaceholder(element, key, fallback) {
  if (element) element.setAttribute("placeholder", uiT(key, fallback));
}

function setUiValue(element, key, fallback) {
  if (element && (!element.dataset.userEditedStaticValue || document.activeElement !== element)) {
    element.value = uiT(key, fallback);
  }
}

function renderAppStaticLanguage() {
  setUiText(builderTab, "nav.goalCreator", "");
  setUiText(plannerTab, "nav.calendar", "Kalendar");
  setUiText("#dashboardView .page-heading p", "dashboard.eyebrow", "DASHBOARD");
  setUiText("#dashboardView .page-heading h1", "dashboard.title", "Dobro jutro, Ivan");
  setUiText("#dashboardView .page-heading span", "dashboard.subtitle", "Tvoj miran pregled finansija, ideja i ciljeva za danas.");
  setUiText("#dashboardView .dashboard-morning-card small", "dashboard.morning.eyebrow", "Jutarnji pregled");
  setUiText("#dashboardView .dashboard-morning-card h2", "dashboard.morning.title", "Jedan miran pogled pre akcije");
  setUiText("#dashboardView .dashboard-morning-card p", "dashboard.morning.text", "Finansije pokazuju prostor, brainstorming cuva ideje, a ciljevi ti govore sta danas zasluzuje paznju.");
  const dashboardSignals = document.querySelectorAll("#dashboardView .dashboard-signal-strip span");
  if (dashboardSignals[0]) dashboardSignals[0].innerHTML = "<strong>" + uiT("dashboard.signals.budgetLabel", "Budzet") + "</strong> " + uiT("dashboard.signals.budgetText", "Hrana pod kontrolom");
  if (dashboardSignals[1]) dashboardSignals[1].innerHTML = "<strong>" + uiT("dashboard.signals.ideasLabel", "Ideje") + "</strong> " + uiT("dashboard.signals.ideasText", "Van Life ceka sledeci test");
  if (dashboardSignals[2]) dashboardSignals[2].innerHTML = "<strong>" + uiT("dashboard.signals.goalsLabel", "Ciljevi") + "</strong> " + uiT("dashboard.signals.goalsText", "3 aktivna pravca");
  setUiText("#dashboardView .progress-ring-card small", "dashboard.pulse.eyebrow", "Dnevni puls");
  setUiText("#dashboardView .progress-ring-card li:nth-child(1) span", "dashboard.pulse.goals", "Cilja");
  setUiText("#dashboardView .progress-ring-card li:nth-child(2) span", "dashboard.pulse.routines", "Rutine");
  setUiText("#dashboardView .progress-ring-card li:nth-child(3) span", "dashboard.pulse.tasks", "Zadaci");
  setUiText("#dashboardView .dashboard-connection-card:nth-of-type(3) small", "nav.finance", "Finansije");
  setUiText("#dashboardView .dashboard-connection-card:nth-of-type(3) h3", "dashboard.finance.title", "Novac kao signal, ne pritisak");
  setUiText("#dashboardView .dashboard-connection-card:nth-of-type(3) p", "dashboard.finance.text", "Danas prati da li troskovi ostaju u ritmu budzeta i da li ima prostora za sledeci mali korak.");
  setUiText("#dashboardView .dashboard-connection-card:nth-of-type(4) small", "nav.brainstorming", "Brainstorming");
  setUiText("#dashboardView .dashboard-connection-card:nth-of-type(4) h3", "dashboard.ideas.title", "Ideje koje vredi vratiti na sto");
  setUiText("#dashboardView .dashboard-connection-card:nth-of-type(4) p", "dashboard.ideas.text", "Izaberi jednu ideju i napisi sledeci test koji moze da se uradi bez velikog rizika.");
  setUiText("#dashboardView .dashboard-link-row strong", "dashboard.ideas.nextTest", "sledeci mini test");
  setUiText("#dashboardView .mentor-card:nth-of-type(5) small", "dashboard.activeGoals", "Aktivni ciljevi");
  const goalProgressLabels = document.querySelectorAll("#dashboardView .goal-progress-list label");
  if (goalProgressLabels[0]) goalProgressLabels[0].firstChild.textContent = uiT("dashboard.goalSamples.intellectual", "Intelektualni razvoj") + " ";
  if (goalProgressLabels[1]) goalProgressLabels[1].firstChild.textContent = uiT("dashboard.goalSamples.health", "Zdravlje i Energija") + " ";
  if (goalProgressLabels[2]) goalProgressLabels[2].firstChild.textContent = uiT("dashboard.goalSamples.finance", "Finansijska sloboda") + " ";

  if (!appState.selectedCategory) {
    setUiText(mentorIntroTitle, "builder.intro.title", "Start your progress");
    setUiText(mentorIntroText, "builder.intro.text", "Choose one area of life and the questions, calendar, and notes will follow that focus.");
  }
  setUiText(".category-selection-card > h2.category-copy", "builder.category.title", "Izaberi kategoriju cilja");
  setUiText(".category-selection-card > p.category-copy", "builder.category.text", "Prvo izaberi glavnu oblast. Zatim biramo uzi fokus da Mentor postavi prava pitanja.");
  categoryCards.forEach((card) => {
    const label = card.querySelector("span:last-child");
    if (label) label.textContent = categoryLabel(card.dataset.category);
  });
  setUiText(backToMainCategoriesBtn, "builder.category.back", "Nazad na kategorije");
  if (!appState.selectedCategory) setUiText(selectedCategoryTitle, "builder.subcategory.title", "Podkategorije");
  setUiText("#subcategoryPanel .subcategory-heading p", "builder.subcategory.text", "Izaberi konkretnu oblast da pitanja budu mentorska, a ne genericka.");
  setUiText("#customSubcategoryWrap span", "builder.customSubcategory.label", "Kako zelis da nazoves svoju oblast?");
  setUiPlaceholder(customSubcategoryInput, "builder.customSubcategory.placeholder", "Primer: Specifican licni projekat");
  setUiText(startGoalBuilderBtn, "builder.start", "Nastavi na kreator cilja");
  setUiText(nextBtn, "common.next", "Dalje");
  setUiText(generateBtn, "builder.generate", "Generisi cilj");

  setUiText("#journalView .page-heading p", "journal.eyebrow", "DNEVNIK");
  setUiText("#journalView .page-heading h1", "journal.title", "Dnevna refleksija");
  setUiText("#journalView .page-heading span", "journal.subtitle", "Tiha stranica za misli, energiju i fokus.");
  setUiPlaceholder(document.getElementById("journalEntry"), "journal.placeholder", "Sta danas primecujes kod sebe?");
  const journalLabels = document.querySelectorAll("#journalView .journal-inputs label span");
  if (journalLabels[0]) journalLabels[0].textContent = uiT("journal.mood", "Raspolozenje");
  if (journalLabels[1]) journalLabels[1].textContent = uiT("journal.energy", "Energija");
  if (journalLabels[2]) journalLabels[2].textContent = uiT("journal.focus", "Fokus");
  const journalInputs = document.querySelectorAll("#journalView .journal-inputs input");
  setUiValue(journalInputs[0], "journal.calm", "Mirno");
  setUiValue(journalInputs[2], "journal.deepWork", "Dubok rad");
  setUiText("#journalView .mentor-card small", "journal.previousNotes", "Prethodne beleske");
  const journalNotes = document.querySelectorAll("#journalView .mentor-card p");
  if (journalNotes[0]) journalNotes[0].innerHTML = "<strong>" + uiT("journal.monday", "Ponedeljak") + "</strong> " + uiT("journal.mondayNote", "Dobar tempo, malo vise pauza.");
  if (journalNotes[1]) journalNotes[1].innerHTML = "<strong>" + uiT("journal.sunday", "Nedelja") + "</strong> " + uiT("journal.sundayNote", "Jasniji fokus za narednu sedmicu.");
  if (journalNotes[2]) journalNotes[2].innerHTML = "<strong>" + uiT("journal.saturday", "Subota") + "</strong> " + uiT("journal.saturdayNote", "Zavrsena jedna vazna mala stvar.");
  setUiText("#bodyEnergyView .page-heading p", "bodyEnergy.eyebrow", "BODY AND ENERGY");
  setUiText("#bodyEnergyView .page-heading h1", "bodyEnergy.title", "Body and Energy");
  setUiText("#bodyEnergyView .page-heading span", "bodyEnergy.subtitle", "A clear place for training, recovery, sleep, and daily energy.");
  setUiText("#bodyEnergyView .achievement-card:nth-of-type(1) h3", "bodyEnergy.body.title", "Body");
  setUiText("#bodyEnergyView .achievement-card:nth-of-type(1) p", "bodyEnergy.body.text", "Training and movement will live here.");
  setUiText("#bodyEnergyView .achievement-card:nth-of-type(2) h3", "bodyEnergy.energy.title", "Energy");
  setUiText("#bodyEnergyView .achievement-card:nth-of-type(2) p", "bodyEnergy.energy.text", "Daily energy signals will be connected here.");
  setUiText("#bodyEnergyView .achievement-card:nth-of-type(3) h3", "bodyEnergy.recovery.title", "Recovery");
  setUiText("#bodyEnergyView .achievement-card:nth-of-type(3) p", "bodyEnergy.recovery.text", "Sleep, rest, and recovery can grow from this page.");
  setUiText("#bodyEnergyView .achievement-card:nth-of-type(4) h3", "bodyEnergy.rhythm.title", "Rhythm");
  setUiText("#bodyEnergyView .achievement-card:nth-of-type(4) p", "bodyEnergy.rhythm.text", "Body habits can be tracked without mixing them with achievements.");
  setUiText("#statisticsView .page-heading p", "statistics.eyebrow", "STATISTIKE");
  setUiText("#statisticsView .page-heading h1", "statistics.title", "Pregled napretka");
  setUiText("#statisticsView .page-heading span", "statistics.subtitle", "Nedelja, mesec i aktivni ciljevi na jednom mestu.");
  setUiText("#statisticsView .stat-card:nth-of-type(1) small", "statistics.week", "Nedelja");
  setUiText("#statisticsView .stat-card:nth-of-type(1) span", "statistics.completedTasks", "zavrsenih zadataka");
  setUiText("#statisticsView .stat-card:nth-of-type(2) small", "statistics.month", "Mesec");
  setUiText("#statisticsView .stat-card:nth-of-type(2) span", "statistics.averageProgress", "prosecan progres");
  setUiText("#statisticsView .stat-card:nth-of-type(3) small", "dashboard.activeGoals", "Aktivni ciljevi");
  setUiText("#statisticsView .stat-card:nth-of-type(3) span", "statistics.inProgress", "u toku");
  setUiText("#statisticsView .chart-card:nth-of-type(4) h3", "statistics.weeklyOverview", "Nedeljni pregled");
  setUiText("#statisticsView .chart-card:nth-of-type(5) h3", "statistics.activeGoalsChart", "Aktivni ciljevi");
  setUiText("#achievementsView .page-heading p", "achievements.eyebrow", "ACHIEVEMENTS");
  setUiText("#achievementsView .page-heading h1", "achievements.title", "Postignuca i prekretnice");
  setUiText("#achievementsView .page-heading span", "achievements.subtitle", "Mali dokazi kontinuiteta i zavrsenih ciljeva.");
  setUiText("#achievementsView .achievement-card:nth-of-type(1) h3", "achievements.focusWeek.title", "7 dana fokusa");
  setUiText("#achievementsView .achievement-card:nth-of-type(1) p", "achievements.focusWeek.text", "Streak zavrsen bez prekida.");
  setUiText("#achievementsView .achievement-card:nth-of-type(2) h3", "achievements.firstGoal.title", "Prvi zavrsen cilj");
  setUiText("#achievementsView .achievement-card:nth-of-type(2) p", "achievements.firstGoal.text", "Jedan cilj je kompletiran do kraja.");
  setUiText("#achievementsView .achievement-card:nth-of-type(3) h3", "achievements.morningRoutine.title", "Jutarnja rutina");
  setUiText("#achievementsView .achievement-card:nth-of-type(3) p", "achievements.morningRoutine.text", "Rutina se pojavila 5 puta ove nedelje.");
  setUiText("#achievementsView .achievement-card:nth-of-type(4) h3", "achievements.milestone.title", "Milestone");
  setUiText("#achievementsView .achievement-card:nth-of-type(4) p", "achievements.milestone.text", "Vazna etapa je zakljucana.");
  setUiText("#settingsView .page-heading p", "settings.eyebrow", "PODESAVANJA");
  setUiText("#settingsView .page-heading h1", "settings.title", "Mirna kontrola aplikacije");
  setUiText("#settingsView .page-heading span", "settings.subtitle", "Placeholder za buduca podesavanja profila, tema i obavestenja.");
  setUiText("#settingsView label:nth-of-type(1) span", "settings.warmLook", "Topli premium izgled");
  setUiText("#settingsView label:nth-of-type(2) span", "settings.dailyReminder", "Dnevni podsetnik");
  setUiText("#settingsView label:nth-of-type(3) span", "settings.focusMode", "Fokus rezim");
  setUiText("#databaseBackupEyebrow", "storage.backupEyebrow", "DATA BACKUP");
  setUiText("#databaseBackupTitle", "storage.backupTitle", "Backup baze podataka");
  setUiText("#databaseBackupDescription", "storage.backupDescription", "Sacuvaj kompletnu kopiju podataka ili vrati ranije sacuvan backup.");
  setUiText("#databaseExportBtn span", "storage.exportAction", "Export database backup");
  setUiText("#databaseImportBtn span", "storage.importAction", "Import database backup");
}

function renderActiveViewLanguage(viewName) {
  renderShellLanguage();
  renderAppStaticLanguage();
  if (viewName === "journal") {
    window.MentorJournalBookPrototype?.activate?.();
    return;
  }
  if (viewName === "finance") {
    window.FinanceDashboard?.activateFinanceDashboard?.();
    return;
  }
  if (viewName === "planner") {
    window.CalendarPlanner?.activateCalendarPlanner?.();
    return;
  }
  if (viewName === "brainstorming") {
    window.Brainstorming?.activateBrainstorming?.();
    return;
  }
  if (viewName === "nutrition") {
    window.MentorNutrition?.activateNutrition?.();
  }
}
const appViews = {
  dashboard: document.getElementById("dashboardView"),
  builder: builderView,
  planner: plannerView,
  brainstorming: document.getElementById("brainstormingView"),
  finance: document.getElementById("financeView"),
  journal: document.getElementById("journalView"),
  nutrition: document.getElementById("nutritionView"),
  bodyEnergy: document.getElementById("bodyEnergyView"),
  settings: document.getElementById("settingsView")
};

function resetViewDefaults(viewName) {
  if (viewName === "builder") {
    returnToMainCategories();
    showCategoryStage();
    return;
  }

  if (viewName === "planner") {
    window.CalendarPlanner?.resetPlannerView?.();
    return;
  }

  if (viewName === "brainstorming") {
    window.Brainstorming?.resetBrainstormingView?.();
  }
}

function isViewModuleReady(viewName) {
  return !window.MentorLazy?.isLazyView?.(viewName) || window.MentorLazy?.isViewLoaded?.(viewName);
}

function activateView(viewName, options, activationOptions) {
  const resetAfterRender = Boolean(activationOptions && activationOptions.resetAfterRender);
  if (options && options.reset && !resetAfterRender) resetViewDefaults(viewName);
  renderActiveViewLanguage(viewName);
  if (options && options.reset && resetAfterRender) {
    resetViewDefaults(viewName);
    renderActiveViewLanguage(viewName);
  }
}

function activateLazyView(viewName, options) {
  const resetAfterRender = Boolean(options && options.reset && !isViewModuleReady(viewName));

  if (isViewModuleReady(viewName)) {
    activateView(viewName, options);
    return Promise.resolve();
  }

  renderShellLanguage();
  renderAppStaticLanguage();
  document.body.dataset.lazyLoading = viewName;

  return window.MentorLazy.ensureView(viewName).then(() => {
    if (document.body.dataset.lazyLoading === viewName) delete document.body.dataset.lazyLoading;
    if (document.body.dataset.activeView !== viewName) return;
    activateView(viewName, options, { resetAfterRender });
  }).catch((error) => {
    if (document.body.dataset.lazyLoading === viewName) delete document.body.dataset.lazyLoading;
    if (document.body.dataset.activeView === viewName) {
      delete document.body.dataset.lazyLoading;
      document.body.dataset.lazyError = viewName;
    }
    console.error(error);
  });
}

async function setView(viewName, options) {
  const nextView = appViews[viewName] ? viewName : "dashboard";
  if (document.body.dataset.activeView === "planner" && (nextView !== "planner" || options?.reset)) {
    const notesFlushed = await window.CalendarPlanner?.deactivateCalendarPlanner?.();
    if (notesFlushed === false) return false;
  }
  if (document.body.dataset.activeView === "journal" && nextView !== "journal") {
    window.MentorJournalBookPrototype?.deactivate?.();
  }
  if (nextView !== "finance") window.Finance?.deactivateAssetRefresh?.();
  const showBuilder = nextView === "builder";
  const showPlanner = nextView === "planner";
  const appShell = document.querySelector(".app");
  const appTopBefore = appShell ? appShell.getBoundingClientRect().top : null;

  Object.keys(appViews).forEach((key) => {
    appViews[key].classList.toggle("hidden", key !== nextView);
  });

  builderTab.classList.toggle("active", showBuilder);
  plannerTab.classList.toggle("active", showPlanner);
  builderTab.setAttribute("aria-selected", String(showBuilder));
  plannerTab.setAttribute("aria-selected", String(showPlanner));
  document.body.dataset.activeView = nextView;
  if (nextView === "finance") window.Finance?.activateAssetRefresh?.();
  if (nextView === "finance" && !window.__mentorPendingFinanceTab) window.__mentorPendingFinanceTab = "dashboard";
  delete document.body.dataset.lazyError;

  sidebarItems.forEach((item) => {
    const isActive = item.dataset.view === nextView;
    item.classList.toggle("active", isActive);
    if (isActive) {
      item.setAttribute("aria-current", "page");
    } else {
      item.removeAttribute("aria-current");
    }
  });

  updateSidebarSymbolForView(nextView);
  const activation = activateLazyView(nextView, options);

  if (appTopBefore !== null) {
    requestAnimationFrame(() => {
      const appTopAfter = appShell.getBoundingClientRect().top;
      const delta = appTopAfter - appTopBefore;
      if (Math.abs(delta) > 1) {
        window.scrollBy(0, delta);
      }
    });
  }

  return activation;
}

function svgToMaskUrl(svg) {
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function setSidebarSymbol(image, options) {
  if (!dynamicCategorySymbol) return;

  const nextImage = image || "icons/lotus-panel-symbol.svg";
  const isCategory = Boolean(options && options.isCategory);
  const isNav = Boolean(options && options.isNav);
  const isImmediate = Boolean(options && options.immediate);
  dynamicCategorySymbol.classList.toggle("category-symbol", isCategory);
  dynamicCategorySymbol.classList.toggle("nav-symbol", isNav);

  if (nextImage === sidebarSymbolImage) {
    dynamicCategorySymbol.style.setProperty("--sidebar-symbol-image", 'url("' + nextImage + '")');
    return;
  }

  if (isImmediate) {
    window.clearTimeout(sidebarSymbolTimer);
    sidebarSymbolImage = nextImage;
    dynamicCategorySymbol.style.setProperty("--sidebar-symbol-image", 'url("' + nextImage + '")');
    dynamicCategorySymbol.classList.remove("symbol-zoom-out");
    dynamicCategorySymbol.classList.add("symbol-zoom-in");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        dynamicCategorySymbol.classList.remove("symbol-zoom-in");
      });
    });
    return;
  }

  window.clearTimeout(sidebarSymbolTimer);
  dynamicCategorySymbol.classList.remove("symbol-zoom-in");
  dynamicCategorySymbol.classList.add("symbol-zoom-out");

  sidebarSymbolTimer = window.setTimeout(() => {
    sidebarSymbolImage = nextImage;
    dynamicCategorySymbol.style.setProperty("--sidebar-symbol-image", 'url("' + nextImage + '")');
    dynamicCategorySymbol.classList.remove("symbol-zoom-out");
    dynamicCategorySymbol.classList.add("symbol-zoom-in");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        dynamicCategorySymbol.classList.remove("symbol-zoom-in");
      });
    });
  }, 240);
}

function updateSidebarSymbolForView(viewName) {
  const navSymbol = SIDEBAR_NAV_SYMBOLS[viewName];
  setSidebarSymbol(navSymbol ? svgToMaskUrl(navSymbol) : "icons/lotus-panel-symbol.svg", {
    isCategory: false,
    isNav: Boolean(navSymbol),
    immediate: true
  });

  if (dynamicCategoryLabel) {
    dynamicCategoryLabel.textContent = getViewLabel(viewName);
  }
}

function getCategory(value) {
  return goalCategories.find((category) => category.value === value) || null;
}

function categoryColorClass(category) {
  return category ? "category-color-" + category.id : "category-color-other";
}

function createCustomSubcategory(category) {
  const categoryName = category ? categoryLabel(category.value) : "ovu oblast";
  return {
    id: CUSTOM_SUBCATEGORY_ID,
    name: uiT("builder.customSubcategory.directName", "Nastavi bez podkategorije"),
    description: uiT("builder.customSubcategory.directDescription", "Preskoči uži fokus i napravi cilj direktno u kategoriji " + categoryName + ".", { category: categoryName }),
    symbol: "+",
    goalTypes: [],
    isCustomSubcategory: true,
    questions: createQuestionSet({
      title: uiT("builder.customSubcategory.directTitle", "Kako želiš da nazoveš svoj cilj u oblasti " + categoryName + "?", { category: categoryName }),
      titlePlaceholder: uiT("builder.customSubcategory.directTitlePlaceholder", "Primer: Moj lični cilj"),
      purpose: uiT("builder.customSubcategory.directPurpose", "Zašto ti je ova lična oblast važna baš sada?"),
      currentState: uiT("builder.customSubcategory.directCurrentState", "Gde se trenutno nalaziš u ovoj oblasti i šta je najvažniji kontekst?"),
      desiredResult: uiT("builder.customSubcategory.directDesiredResult", "Koji rezultat bi ti pokazao da je ovaj cilj uspeo?"),
      timeframe: uiT("builder.customSubcategory.directTimeframe", "Kada želiš da vidiš prvi jasan pomak ili završetak?"),
      action: uiT("builder.customSubcategory.directAction", "Koje realne akcije možeš preduzeti u prvoj nedelji?"),
      obstacle: uiT("builder.customSubcategory.directObstacle", "Šta bi moglo da te zaustavi ili odvuče pažnju?"),
      support: uiT("builder.customSubcategory.directSupport", "Koji alati, ljudi, navike ili okruženje mogu da podrže ovaj cilj?"),
      successMeasurement: uiT("builder.customSubcategory.directSuccessMeasurement", "Kako ćeš znati da napreduješ ako cilj nije standardan?"),
      motivation: uiT("builder.customSubcategory.directMotivation", "Koji lični razlog će te držati uz ovaj cilj kada početni entuzijazam padne?")
    })
  };
}

function getVisibleSubcategories(category) {
  if (!category) return [];
  return [createCustomSubcategory(category)].concat(category.subcategories);
}

function getSelectedSubcategory() {
  const category = getCategory(appState.selectedCategory);
  if (!category) return null;
  if (appState.selectedSubcategory === CUSTOM_SUBCATEGORY_ID) return createCustomSubcategory(category);
  return category.subcategories.find((subcategory) => subcategory.id === appState.selectedSubcategory) || null;
}

function isNoSubcategorySelected() {
  return appState.selectedSubcategory === CUSTOM_SUBCATEGORY_ID;
}

function updateMentorIntro() {
  const intro = appState.selectedCategory
    ? builderIntro(appState.selectedCategory)
    : {
      title: uiT("builder.intro.title", MENTOR_INTRO_DEFAULT.title),
      text: uiT("builder.intro.text", MENTOR_INTRO_DEFAULT.text)
    };
  const symbol = CATEGORY_MENTOR_SYMBOLS[appState.selectedCategory] || MENTOR_SYMBOL_DEFAULT;
  mentorIntroTitle.textContent = intro.title;
  mentorIntroText.textContent = intro.text;
  updateDynamicCategorySymbol(symbol);

  if (symbol.image === mentorSymbolImage) {
    mentorIntroCard.style.setProperty("--mentor-symbol-color", symbol.color);
    mentorIntroCard.style.setProperty("--mentor-symbol-size", symbol.size);
    mentorIntroCard.style.setProperty("--mentor-symbol-y-offset", symbol.yOffset);
    return;
  }

  window.clearTimeout(mentorSymbolTimer);
  mentorIntroCard.classList.remove("symbol-zoom-in");
  mentorIntroCard.classList.add("symbol-zoom-out");

  mentorSymbolTimer = window.setTimeout(() => {
    mentorSymbolImage = symbol.image;
    mentorIntroCard.style.setProperty("--mentor-symbol-image", 'url("' + symbol.image + '")');
    mentorIntroCard.style.setProperty("--mentor-symbol-color", symbol.color);
    mentorIntroCard.style.setProperty("--mentor-symbol-size", symbol.size);
    mentorIntroCard.style.setProperty("--mentor-symbol-y-offset", symbol.yOffset);

    mentorIntroCard.classList.remove("symbol-zoom-out");
    mentorIntroCard.classList.add("symbol-zoom-in");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        mentorIntroCard.classList.remove("symbol-zoom-in");
      });
    });
  }, 680);
}

function updateDynamicCategorySymbol(symbol) {
  if (dynamicCategoryLabel) {
    const activeView = document.body.dataset.activeView || "dashboard";
    dynamicCategoryLabel.textContent = getViewLabel(activeView);
  }
}

function canStartBuilder() {
  if (!appState.selectedCategory || !appState.selectedSubcategory) return false;
  if (appState.selectedSubcategory === "custom_goal") return Boolean(appState.customSubcategoryName.trim());
  return true;
}

function updateSelectedCategoryUI() {
  updateMentorIntro();
  startGoalBuilderBtn.disabled = !canStartBuilder();
  categorySelectionCard.classList.toggle("subcategory-mode", Boolean(appState.selectedCategory));

  const selectedSubcategory = getSelectedSubcategory();
  if (selectedSubcategory && !mentorIntroCard.classList.contains("builder-card-mode")) {
    mentorIntroTitle.textContent = getBuilderPanelTitle();
    mentorIntroText.textContent = selectedSubcategory.description || categoryLabel(appState.selectedCategory);
    mentorIntroText.classList.remove("panel-text-fade");
    void mentorIntroText.offsetWidth;
    mentorIntroText.classList.add("panel-text-fade");
  }

  categoryCards.forEach((card) => {
    const isSelected = card.dataset.category === appState.selectedCategory;
    card.classList.toggle("selected", isSelected);
    card.setAttribute("aria-selected", String(isSelected));
  });

  Array.from(subcategoryGrid.querySelectorAll(".subcategory-option")).forEach((card) => {
    const isSelected = card.dataset.subcategory === appState.selectedSubcategory;
    card.classList.toggle("selected", isSelected);
    card.setAttribute("aria-selected", String(isSelected));
  });

  customSubcategoryWrap.classList.toggle("hidden", appState.selectedSubcategory !== "custom_goal");
}

function renderSubcategories() {
  subcategoryGrid.innerHTML = "";
  const category = getCategory(appState.selectedCategory);

  if (!category) {
    subcategoryPanel.classList.add("hidden");
    return;
  }

  selectedCategoryTitle.textContent = categoryLabel(category.value);
  subcategoryPanel.classList.remove("hidden");

  getVisibleSubcategories(category).forEach((subcategory) => {
    const button = document.createElement("button");
    button.className = "subcategory-option " + categoryColorClass(category);
    button.type = "button";
    button.dataset.subcategory = subcategory.id;
    const symbol = subcategory.symbol || SUBCATEGORY_SYMBOLS[subcategory.id] || "+";
    button.innerHTML = [
      '<span class="symbol-icon" aria-hidden="true">' + escapeHtml(symbol) + "</span>",
      "<span>" + escapeHtml(subcategory.name) + "</span>",
      "<small>" + escapeHtml(subcategory.description) + "</small>"
    ].join("");

    button.addEventListener("click", () => {
      appState.selectedSubcategory = subcategory.id;
      updateSelectedCategoryUI();
    });

    subcategoryGrid.appendChild(button);
  });

  updateSelectedCategoryUI();
}

function returnToMainCategories() {
  appState.selectedCategory = null;
  appState.selectedSubcategory = null;
  appState.customSubcategoryName = "";
  customSubcategoryInput.value = "";
  subcategoryGrid.innerHTML = "";
  subcategoryPanel.classList.add("hidden");
  updateSelectedCategoryUI();
}

function showCategoryStage() {
  categoryStage.classList.remove("hidden");
  categoryStage.classList.remove("builder-flow-mode");
  categorySelectionCard.classList.remove("hidden");
  mentorIntroCard.classList.remove("builder-card-mode", "builder-card-reveal");
  liveGoalCardPreview?.classList.add("hidden");
  updateMentorIntro();
  builderFlow.classList.add("hidden");
}

function showBuilderFlow() {
  categoryStage.classList.remove("hidden");
  categoryStage.classList.add("builder-flow-mode");
  categorySelectionCard.classList.add("hidden");
  mentorIntroCard.classList.add("builder-card-mode");
  mentorIntroCard.classList.remove("builder-card-reveal");
  liveGoalCardPreview?.classList.remove("hidden");
  mentorIntroTitle.classList.remove("title-swap-out", "title-swap-in");
  mentorIntroTitle.classList.add("title-swap-out");
  window.setTimeout(() => {
    mentorIntroTitle.textContent = uiT("builder.cardTitle", "Kartica cilja");
    mentorIntroTitle.classList.remove("title-swap-out");
    mentorIntroTitle.classList.add("title-swap-in");
  }, 360);
  mentorIntroText.textContent = builderIntro(appState.selectedCategory).text;
  renderLiveGoalCardPreview();
  window.setTimeout(() => {
    mentorIntroCard.classList.add("builder-card-reveal");
  }, 600);
  builderFlow.classList.remove("hidden");
}

function addMessage(role, text) {
  const message = document.createElement("div");
  message.className = "msg " + role;
  if (role === "mentor") {
    const symbol = CATEGORY_MENTOR_SYMBOLS[appState.selectedCategory] || MENTOR_SYMBOL_DEFAULT;
    message.innerHTML = [
      '<span class="msg-symbol" aria-hidden="true"><img src="' + escapeHtml(symbol.image || "icons/lotus-panel-symbol.svg") + '" alt="" /></span>',
      '<span class="msg-text">' + escapeHtml(text) + "</span>"
    ].join("");
  } else {
    message.textContent = text;
  }
  chat.appendChild(message);
  chat.scrollTop = chat.scrollHeight;
}

function setNextEnabled(value) {
  nextBtn.disabled = !String(value || "").trim();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}

function dateHuman(isoDate) {
  const date = new Date(isoDate + "T00:00:00");
  const locale = window.MentorI18n?.locale || "sr-Latn-RS";
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(date);
}

function uiT(key, fallback, params) {
  return window.MentorI18n?.t?.(key, params, fallback) || fallback;
}

function categoryI18nKey(category) {
  const keyByCategory = {
    "Personal Growth": "categories.personalGrowth",
    "Health & Energy": "categories.healthEnergy",
    "Career & Work": "categories.careerWork",
    Finance: "categories.finance",
    "Relationships & Family": "categories.relationshipsFamily",
    Other: "categories.other"
  };
  return keyByCategory[category] || "";
}

function builderCategoryIntroKey(category) {
  const keyByCategory = {
    "Personal Growth": "personalGrowth",
    "Health & Energy": "healthEnergy",
    "Career & Work": "careerWork",
    Finance: "finance",
    "Relationships & Family": "relationshipsFamily",
    Other: "other"
  };
  return keyByCategory[category] || "other";
}

function builderIntro(category) {
  const fallback = CATEGORY_MENTOR_INTROS[category] || MENTOR_INTRO_DEFAULT;
  const key = builderCategoryIntroKey(category);
  return {
    title: uiT("builder.categoryIntros." + key + ".title", fallback.title),
    text: uiT("builder.categoryIntros." + key + ".text", fallback.text)
  };
}

function typeLabel(type) {
  if (type === "long-term") return uiT("builder.typeLabels.longTerm", TYPE_LABELS[type] || "");
  if (type === "short-term") return uiT("builder.typeLabels.shortTerm", TYPE_LABELS[type] || "");
  if (type === "habit") return uiT("builder.typeLabels.habit", TYPE_LABELS[type] || "");
  return "";
}

function getFirstQuestion() {
  return {
    key: "creationType",
    text: uiT("builder.questions.creationType", FIRST_QUESTION.text),
    type: "options",
    options: [typeLabel("long-term"), typeLabel("short-term"), typeLabel("habit")]
  };
}

function getTypeFollowUpQuestions(type) {
  if (type === "long-term") {
    return [
      { key: "targetDate", text: uiT("builder.questions.targetDate", "Which date do you want as the deadline or main checkpoint?"), type: "date" }
    ];
  }

  if (type === "short-term") {
    return [
      {
        key: "duration",
        text: uiT("builder.questions.duration", "How long do you want this first focused sprint to last?"),
        type: "options",
        options: [
          uiT("builder.questions.options.threeDays", "3 days"),
          uiT("builder.questions.options.fiveDays", "5 days"),
          uiT("builder.questions.options.sevenDays", "7 days"),
          uiT("builder.questions.options.fourteenDays", "14 days"),
          uiT("builder.questions.options.thirtyDays", "30 days")
        ]
      }
    ];
  }

  if (type === "habit") {
    return [
      {
        key: "frequency",
        text: uiT("builder.questions.frequency", "How often can you realistically repeat this habit?"),
        type: "options",
        options: [
          uiT("builder.questions.options.daily", "Daily"),
          uiT("builder.questions.options.threeWeekly", "3x weekly"),
          uiT("builder.questions.options.weekly", "Weekly")
        ]
      },
      {
        key: "bestTime",
        text: uiT("builder.questions.bestTime", "Which part of the day makes the most sense for it?"),
        type: "options",
        options: [
          uiT("builder.questions.options.morning", "Morning"),
          uiT("builder.questions.options.afternoon", "Afternoon"),
          uiT("builder.questions.options.evening", "Evening")
        ]
      }
    ];
  }

  return [];
}

function categoryLabel(category) {
  const key = categoryI18nKey(category);
  if (key) return uiT(key, CATEGORY_LABELS[category] || category);
  return category || uiT("categories.other", "Other");
}

function subcategoryLabel(goal) {
  if (!goal) return "-";
  if (goal.subcategory === null || goal.subcategory === CUSTOM_SUBCATEGORY_ID || goal.subcategoryName === "Nije izabrana") return uiT("builder.noSubcategory", "Nije izabrana");
  if (goal.customSubcategoryName) return goal.customSubcategoryName;
  return goal.subcategoryName || goal.subcategory || "-";
}

function getBuilderPanelTitle() {
  const subcategory = getSelectedSubcategory();
  if (subcategory && !isNoSubcategorySelected()) {
    return appState.selectedSubcategory === CUSTOM_SUBCATEGORY_ID && appState.customSubcategoryName
      ? appState.customSubcategoryName
      : subcategory.name;
  }

  return categoryLabel(appState.selectedCategory);
}

function getExecutionLabelFromType(type) {
  if (type === "habit") return uiT("builder.execution.habit", "Navika");
  if (type === "short-term") return uiT("builder.execution.shortTerm", "Fokus blok");
  if (type === "long-term") return uiT("builder.execution.longTerm", "Milestone");
  return "";
}

function getLiveGoalKind() {
  const keyByCategory = {
    "Personal Growth": "builder.goalKind.personalGrowth",
    "Health & Energy": "builder.goalKind.healthEnergy",
    "Career & Work": "builder.goalKind.careerWork",
    Finance: "builder.goalKind.finance",
    "Relationships & Family": "builder.goalKind.relationshipsFamily",
    Other: "builder.goalKind.other"
  };

  const key = keyByCategory[appState.selectedCategory] || "builder.goalKind.other";
  return uiT(key, "Lični cilj");
}

function getLivePreviewAnswers(pendingKey, pendingValue) {
  const answers = Object.assign({}, flowState.answers);
  if (pendingKey && pendingValue) {
    answers[pendingKey] = pendingValue;
  }
  return answers;
}

function liveField(label, value) {
  return '<div class="live-card-field' + (value ? " filled" : "") + '"><dt>' + escapeHtml(label) + '</dt><dd>' + escapeHtml(value || "") + "</dd></div>";
}

function renderLiveGoalCardPreview(pendingKey, pendingValue) {
  if (!liveGoalCardPreview) return;

  const answers = getLivePreviewAnswers(pendingKey, pendingValue);
  const type = TYPE_FROM_LABEL[answers.creationType] || "";
  const title = answers.title || getBuilderPanelTitle() || uiT("builder.titleFallback", "Naziv cilja");
  const categoryName = getLiveGoalKind();
  const focus = answers.goalType || getBuilderPanelTitle() || "";
  const frequency = answers.frequency || "";
  const timeValue = answers.bestTime || answers.targetDate || answers.duration || "";
  const description = answers.action || answers.successMeasurement || "";
  const reason = answers.purpose || "";
  const fields = [
    liveField(uiT("builder.live.goalType", "Tip cilja"), typeLabel(type)),
    liveField(uiT("builder.live.focus", "Fokus"), focus),
    liveField(uiT("builder.live.execution", "Izvršenje"), getExecutionLabelFromType(type)),
    liveField(uiT("builder.live.frequency", "Frekvencija"), frequency),
    liveField(uiT("builder.live.time", "Vreme"), timeValue)
  ].join("");

  const introText = reason || builderIntro(appState.selectedCategory).text;
  if (mentorIntroText.textContent !== introText) {
    mentorIntroText.textContent = introText;
  }

  liveGoalCardPreview.innerHTML = [
    '<div class="live-card-title' + (answers.title ? " filled" : "") + '">' + escapeHtml(title) + "</div>",
    '<div class="live-card-category filled">' + escapeHtml(categoryName) + "</div>",
    '<dl class="live-card-fields">',
    fields,
    "</dl>",
    '<div class="live-card-note' + (description ? " filled" : "") + '"><strong>' + escapeHtml(uiT("builder.live.description", "Opis cilja")) + "</strong><span>" + escapeHtml(description) + "</span></div>"
  ].join("");
}

function createId(prefix) {
  return prefix + "-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
}

function renderInputForQuestion(question) {
  answerArea.innerHTML = "";

  if (question.type === "text" || question.type === "date" || question.type === "textarea") {
    const input = question.type === "textarea" ? document.createElement("textarea") : document.createElement("input");
    input.className = question.type === "textarea" ? "text-input mentor-textarea" : "text-input";
    if (question.type !== "textarea") input.type = question.type === "date" ? "date" : "text";
    if (question.type === "textarea") input.rows = 4;
    input.placeholder = question.placeholder || uiT("builder.inputPlaceholder", "Upiši odgovor");
    input.autocomplete = "off";

    input.addEventListener("input", () => {
      flowState.pendingValue = input.value.trim();
      setNextEnabled(flowState.pendingValue);
    });

    input.addEventListener("keydown", (event) => {
      if (question.type !== "textarea" && event.key === "Enter" && !nextBtn.disabled) {
        event.preventDefault();
        handleNext();
      }
    });

    answerArea.appendChild(input);
    input.focus();
    return;
  }

  const optionsWrap = document.createElement("div");
  optionsWrap.className = "options";

  question.options.forEach((optionValue) => {
    const button = document.createElement("button");
    button.className = "option";
    button.type = "button";
    button.textContent = optionValue;

    button.addEventListener("click", () => {
      Array.from(optionsWrap.children).forEach((child) => child.classList.remove("selected"));
      button.classList.add("selected");
      flowState.pendingValue = optionValue;
      setNextEnabled(flowState.pendingValue);
    });

    optionsWrap.appendChild(button);
  });

  answerArea.appendChild(optionsWrap);
}

function renderCurrentQuestion() {
  const question = flowState.questions[flowState.index];
  if (!question) {
    nextBtn.classList.add("hidden");
    generateBtn.classList.remove("hidden");
    generateBtn.disabled = false;
    answerArea.innerHTML = "";
    addMessage("mentor", uiT("builder.messages.complete", "Odlično. Od tvojih odgovora sada mogu da napravim pregled cilja."));
    return;
  }

  addMessage("mentor", question.text);
  flowState.pendingValue = "";
  setNextEnabled(false);
  renderInputForQuestion(question);
}

function buildQuestionsForSelection() {
  const selectedType = TYPE_FROM_LABEL[flowState.answers.creationType];
  const subcategory = getSelectedSubcategory();
  const goalTypeQuestion = subcategory && subcategory.goalTypes.length
    ? [{ key: "goalType", text: uiT("builder.questions.focus", "Koji fokus najbolje opisuje ovaj cilj u oblasti: " + subcategory.name + "?", { name: subcategory.name }), type: "options", options: subcategory.goalTypes }]
    : [];

  flowState.questions = [getFirstQuestion()]
    .concat(goalTypeQuestion)
    .concat(subcategory ? subcategory.questions : [])
    .concat(getTypeFollowUpQuestions(selectedType));
}

function handleNext() {
  const question = flowState.questions[flowState.index];
  const answer = String(flowState.pendingValue || "").trim();

  if (!question || !answer) {
    return;
  }

  flowState.answers[question.key] = answer;
  addMessage("user", question.type === "date" ? dateHuman(answer) : answer);

  if (question.key === "creationType") {
    buildQuestionsForSelection();
  }

  flowState.index += 1;
  renderLiveGoalCardPreview();
  renderCurrentQuestion();
}

function buildGoalFromAnswers() {
  const answers = flowState.answers;
  const type = TYPE_FROM_LABEL[answers.creationType];
  const category = getCategory(appState.selectedCategory);
  const subcategory = getSelectedSubcategory();
  const customSubcategoryName = appState.selectedSubcategory === "custom_goal" ? appState.customSubcategoryName.trim() : "";
  const noSubcategory = isNoSubcategorySelected();
  const goal = {
    id: createId("goal"),
    type,
    title: answers.title,
    reason: answers.purpose || "",
    category: appState.selectedCategory,
    categoryName: categoryLabel(appState.selectedCategory),
    subcategory: noSubcategory ? null : (subcategory ? subcategory.id : null),
    subcategoryName: noSubcategory ? "Nije izabrana" : (customSubcategoryName || (subcategory ? subcategory.name : "")),
    customSubcategoryName,
    goalType: answers.goalType || "",
    targetDate: null,
    duration: null,
    frequency: null,
    firstAction: answers.action,
    mainMilestone: answers.mainMilestone || "",
    successMeasurement: answers.successMeasurement || "",
    mentorAnswers: Object.assign({}, answers),
    finalGoalReason: answers.purpose || "",
    createdAt: new Date().toISOString()
  };

  if (type === "long-term") {
    goal.targetDate = answers.targetDate;
  }
  if (type === "short-term") {
    goal.duration = answers.duration;
  }
  if (type === "habit") {
    goal.frequency = answers.frequency;
    goal.bestTime = answers.bestTime;
  }

  return goal;
}

function goalMetricLabel(goal) {
  if (goal.type === "long-term") return uiT("builder.metric.targetDate", "Ciljni datum");
  if (goal.type === "short-term") return uiT("builder.metric.duration", "Trajanje");
  return uiT("builder.metric.frequency", "Učestalost");
}

function goalMetricValue(goal) {
  if (goal.type === "long-term") return goal.targetDate ? dateHuman(goal.targetDate) : "-";
  if (goal.type === "short-term") return goal.duration || "-";
  return goal.frequency || "-";
}

function renderGoalReview(goal) {
  const metricLabel = goalMetricLabel(goal);
  const metricValue = goalMetricValue(goal);
  const goalTypeHtml = goal.goalType
    ? '<div class="review-item"><small>' + escapeHtml(uiT("builder.live.focus", "Fokus")) + "</small><p>" + escapeHtml(goal.goalType) + "</p></div>"
    : "";

  goalReview.innerHTML = [
    "<h3>" + escapeHtml(uiT("builder.review.title", "Pregled cilja")) + "</h3>",
    '<div class="review-grid">',
    '<div class="review-item"><small>' + escapeHtml(uiT("builder.review.type", "Tip")) + "</small><p>" + escapeHtml(typeLabel(goal.type)) + "</p></div>",
    '<div class="review-item"><small>' + escapeHtml(uiT("builder.review.category", "Kategorija")) + "</small><p>" + escapeHtml(categoryLabel(goal.category)) + "</p></div>",
    '<div class="review-item"><small>' + escapeHtml(uiT("builder.review.subcategory", "Podkategorija")) + "</small><p>" + escapeHtml(subcategoryLabel(goal)) + "</p></div>",
    goalTypeHtml,
    '<div class="review-item full"><small>' + escapeHtml(uiT("builder.review.name", "Naziv")) + "</small><p>" + escapeHtml(goal.title) + "</p></div>",
    '<div class="review-item full"><small>' + escapeHtml(uiT("builder.review.why", "Zašto")) + "</small><p>" + escapeHtml(goal.reason || "-") + "</p></div>",
    '<div class="review-item"><small>' + escapeHtml(metricLabel) + "</small><p>" + escapeHtml(metricValue) + "</p></div>",
    '<div class="review-item"><small>' + escapeHtml(uiT("builder.review.firstStep", "Prvi korak")) + "</small><p>" + escapeHtml(goal.firstAction) + "</p></div>",
    '<div class="review-item full"><small>' + escapeHtml(uiT("builder.review.successMeasure", "Merilo uspeha")) + "</small><p>" + escapeHtml(goal.successMeasurement || "-") + "</p></div>",
    "</div>",
    '<div class="review-actions">',
    '<button id="openPlannerBtn" class="ghost-btn review-action-btn" type="button"><span aria-hidden="true">▦</span>' + escapeHtml(uiT("builder.review.openCalendar", "Otvori kalendar")) + "</button>",
    '<button id="newGoalBtn" class="ghost-btn review-action-btn primary-review-action" type="button"><span aria-hidden="true">◎</span>' + escapeHtml(uiT("builder.review.newGoal", "Kreiraj novi cilj")) + "</button>",
    '<button id="changeCategoryBtn" class="ghost-btn review-action-btn" type="button"><span aria-hidden="true">↔</span>' + escapeHtml(uiT("builder.review.changeCategory", "Promeni kategoriju")) + "</button>",
    "</div>"
  ].join("");

  goalReview.classList.remove("hidden");
  builderFlow.classList.add("chat-collapsed");
  toggleChatBtn.classList.remove("hidden");
  toggleChatBtn.textContent = uiT("builder.messages.showChat", "Prikaži chat");

  document.getElementById("openPlannerBtn").addEventListener("click", () => setView("planner"));
  document.getElementById("newGoalBtn").addEventListener("click", startBuilderFlow);
  document.getElementById("changeCategoryBtn").addEventListener("click", () => {
    returnToMainCategories();
    showCategoryStage();
  });
}

function startBuilderFlow() {
  flowState.questions = [getFirstQuestion()];
  flowState.index = 0;
  flowState.answers = {};
  flowState.pendingValue = "";
  flowState.generated = false;

  chat.innerHTML = "";
  builderFlow.classList.remove("chat-collapsed");
  mentorIntroTitle.textContent = getBuilderPanelTitle();
  mentorIntroText.textContent = uiT("builder.messages.fillingCard", "Kartica cilja se popunjava dok odgovaraš na pitanja.");
  renderLiveGoalCardPreview();
  toggleChatBtn.classList.add("hidden");
  answerArea.innerHTML = "";
  goalReview.classList.add("hidden");
  goalReview.innerHTML = "";
  nextBtn.classList.remove("hidden");
  nextBtn.disabled = true;
  generateBtn.classList.add("hidden");
  generateBtn.disabled = false;

  const subcategory = getSelectedSubcategory();
  addMessage("mentor", uiT("builder.messages.intro", "Hajde da izgradimo cilj kroz pitanja koja pripadaju baš ovoj oblasti."));
  addMessage("mentor", uiT("builder.messages.selected", "Izabrano:") + " " + categoryLabel(appState.selectedCategory) + " / " + subcategoryLabel({
    subcategory: isNoSubcategorySelected() ? null : (subcategory ? subcategory.id : null),
    subcategoryName: isNoSubcategorySelected() ? "Nije izabrana" : (subcategory ? subcategory.name : ""),
    customSubcategoryName: appState.selectedSubcategory === "custom_goal" ? appState.customSubcategoryName.trim() : ""
  }));
  if (subcategory && subcategory.description) addMessage("mentor", subcategory.description);
  renderCurrentQuestion();
}

function initCategorySelection() {
  categoryCards.forEach((card) => {
    card.addEventListener("click", () => {
      appState.selectedCategory = card.dataset.category;
      appState.selectedSubcategory = null;
      appState.customSubcategoryName = "";
      customSubcategoryInput.value = "";
      renderSubcategories();
      updateSelectedCategoryUI();
    });
  });

  customSubcategoryInput.addEventListener("input", () => {
    appState.customSubcategoryName = customSubcategoryInput.value.trim();
    updateSelectedCategoryUI();
  });

  backToMainCategoriesBtn.addEventListener("click", returnToMainCategories);

  startGoalBuilderBtn.addEventListener("click", () => {
    if (!canStartBuilder()) return;
    showBuilderFlow();
    startBuilderFlow();
  });
}

nextBtn.addEventListener("click", handleNext);

generateBtn.addEventListener("click", async () => {
  if (flowState.generated || !canStartBuilder()) {
    return;
  }

  const goal = buildGoalFromAnswers();
  generateBtn.disabled = true;

  try {
    const savedGoal = await window.MentorGoalsService.createGoal(goal, appState);
    flowState.generated = true;
    window.dispatchEvent(new CustomEvent("mentor:goal-saved", { detail: { goalId: savedGoal.id } }));

    if (savedGoal.category === "Finance") {
      try {
        await window.MentorLazy?.loadFeature?.("finance");
        await window.Finance?.ensureSavingsBudgetForGoal?.(savedGoal);
      } catch (error) {
        console.warn("Finance goal bridge failed.", error);
        window.dispatchEvent(new CustomEvent("mentor:goal-finance-bridge-error", {
          detail: { goalId: savedGoal.id, code: error?.code || error?.name || "FINANCE_GOAL_BRIDGE_FAILED" }
        }));
      }
    }

    renderGoalReview(savedGoal);
    if (document.body.dataset.activeView === "planner") {
      await window.CalendarPlanner?.activateCalendarPlanner?.();
    }
    addMessage("mentor", uiT("builder.messages.saved", "Cilj je sačuvan sa kategorijom, podkategorijom, fokusom i odgovorima. Sada ga možeš zakazati u kalendaru."));
  } catch (error) {
    console.warn("Goal could not be saved.", error);
    generateBtn.disabled = false;
    addMessage("mentor", uiT("builder.messages.saveFailed", "Cilj nije trajno sačuvan. Pokušaj ponovo."));
  }
});

builderTab.addEventListener("click", () => setView("builder"));
plannerTab.addEventListener("click", () => setView("planner"));
sidebarItems.forEach((item) => {
  item.addEventListener("click", () => setView(item.dataset.view, { reset: true }));
});

backToCategoriesBtn.addEventListener("click", () => {
  setView("builder");
  returnToMainCategories();
  showCategoryStage();
});

toggleChatBtn.addEventListener("click", () => {
  const collapsed = builderFlow.classList.toggle("chat-collapsed");
  toggleChatBtn.textContent = collapsed ? uiT("builder.messages.showChat", "Prikaži chat") : uiT("builder.messages.hideChat", "Sakrij chat");
});

window.addEventListener("mentor:languagechange", () => {
  renderActiveViewLanguage(document.body.dataset.activeView || "dashboard");
  goalCategories = getLocalizedGoalCategories();
  window.goalCategories = goalCategories;

  if (document.body.dataset.activeView !== "builder") return;

  if (appState.selectedCategory && !subcategoryPanel.classList.contains("hidden")) {
    renderSubcategories();
    selectedCategoryTitle.textContent = categoryLabel(appState.selectedCategory);
  }

  if (builderFlow.classList.contains("hidden")) {
    updateSelectedCategoryUI();
  } else if (!liveGoalCardPreview.classList.contains("hidden")) {
    renderLiveGoalCardPreview();
  }

  if (!toggleChatBtn.classList.contains("hidden")) {
    const collapsed = builderFlow.classList.contains("chat-collapsed");
    toggleChatBtn.textContent = collapsed ? uiT("builder.messages.showChat", "Prikaži chat") : uiT("builder.messages.hideChat", "Sakrij chat");
  }
});

window.appState = appState;
window.TYPE_LABELS = TYPE_LABELS;
window.CATEGORY_LABELS = CATEGORY_LABELS;
window.goalCategories = goalCategories;
window.escapeHtml = escapeHtml;
window.categoryLabel = categoryLabel;
window.subcategoryLabel = subcategoryLabel;
window.createId = createId;
window.setView = setView;

startGoalBuilderBtn.disabled = true;
const mentorAppReadyPromise = Promise.resolve(window.MentorData?.coreReadyPromise)
  .then(() => window.MentorGoalsCalendarService.hydrateAppState(appState))
  .then(() => {
    initCategorySelection();
    updateSelectedCategoryUI();
    renderShellLanguage();
    setView("dashboard");
    showCategoryStage();
    startGoalBuilderBtn.disabled = false;
  })
  .catch((error) => {
    console.error("Mentor app goals bootstrap failed.", error);
    window.dispatchEvent(new CustomEvent("mentor:goals-bootstrap-failed", {
      detail: { code: error?.code || error?.name || "GOALS_BOOTSTRAP_FAILED" }
    }));
    throw error;
  });
window.MentorAppReadyPromise = mentorAppReadyPromise;


