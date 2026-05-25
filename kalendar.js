const HOURS_START = 6;
const HOURS_END = 23;

const GOAL_COLUMNS = [
  { key: "personal", title: "Personalni", categories: ["Personal Growth", "Relationships & Family", "Other"] },
  { key: "intellectual", title: "Intelektualni", categories: ["Career & Work"] },
  { key: "physical", title: "Fizički", categories: ["Health & Energy"] },
  { key: "financial", title: "Finansijski", categories: ["Finance"] },
  { key: "business", title: "Poslovni", categories: [] }
];

const TYPE_FALLBACK_COLUMN = {
  "long-term": "personal",
  "short-term": "business",
  habit: "physical"
};

const CATEGORY_ICONS = {
  "Personal Growth": "icons/brain_icon.svg",
  "Health & Energy": "icons/health_energy_heart.svg",
  "Career & Work": "icons/career_business_briefcase.svg",
  Finance: "icons/finance_wallet.svg",
  "Relationships & Family": "icons/relationships_family_people.svg",
  Other: "icons/other_target.svg"
};

const GOAL_DECK_FILTERS = [
  { key: "all", label: "Svi ciljevi" },
  { key: "personal", label: "Personalni" },
  { key: "intellectual", label: "Intelektualni" },
  { key: "physical", label: "Fizički" },
  { key: "financial", label: "Finansijski" },
  { key: "business", label: "Poslovni" }
];

let calendarCursor = new Date();
calendarCursor.setDate(1);

const monthLabel = document.getElementById("monthLabel");
const monthViewBtn = document.getElementById("monthViewBtn");
const weekViewBtn = document.getElementById("weekViewBtn");
const dayViewBtn = document.getElementById("dayViewBtn");
const monthCalendarView = document.getElementById("monthCalendarView");
const weekCalendarView = document.getElementById("weekCalendarView");
const dayCalendarView = document.getElementById("dayCalendarView");
const calendarGrid = document.getElementById("calendarGrid");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const weekHeaderRow = document.getElementById("weekHeaderRow");
const weekGrid = document.getElementById("weekGrid");
const dayHeaderRow = document.getElementById("dayHeaderRow");
const dayTimeline = document.getElementById("dayTimeline");
const selectedDateLabel = document.getElementById("selectedDateLabel");
const dayEventsList = document.getElementById("dayEventsList");
const goalDetailPanel = document.getElementById("goalDetailPanel");
const goalPool = document.getElementById("goalPool");
const goalDeckFilters = document.getElementById("goalDeckFilters");
const goalTypeSelect = document.getElementById("goalTypeSelect");
const goalFocusDetails = document.getElementById("goalFocusDetails");
const goalFocusTabPanel = document.getElementById("goalFocusTabPanel");
const createGoalFromPlannerBtn = document.getElementById("createGoalFromPlannerBtn");

function dateHumanLong(isoDate) {
  const date = new Date(isoDate + "T00:00:00");
  return new Intl.DateTimeFormat("sr-Latn-RS", { weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(date);
}

function parseTimeToMinutes(time) {
  const parts = String(time || "").split(":");
  if (parts.length !== 2) return Number.POSITIVE_INFINITY;
  return Number(parts[0]) * 60 + Number(parts[1]);
}

function normalizeTime(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || "").trim());
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
}

function askExecutionTime(defaultTime) {
  let attempt = window.prompt("Vreme izvršenja (HH:MM)", defaultTime || "09:00");
  while (attempt !== null) {
    const normalized = normalizeTime(attempt);
    if (normalized) return normalized;
    attempt = window.prompt("Neispravan format. Koristi HH:MM (24h).", defaultTime || "09:00");
  }
  return null;
}

function toDateKeyFromDate(dateObj) {
  return [
    String(dateObj.getFullYear()),
    String(dateObj.getMonth() + 1).padStart(2, "0"),
    String(dateObj.getDate()).padStart(2, "0")
  ].join("-");
}

function toDateKey(year, month, day) {
  return [String(year), String(month).padStart(2, "0"), String(day).padStart(2, "0")].join("-");
}

function getTodayKey() {
  return toDateKeyFromDate(new Date());
}

function isPastDateKey(dateKey) {
  return dateKey < getTodayKey();
}

function getVisibleMonthRange() {
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  return {
    start: new Date(year, month, 1),
    end: new Date(year, month + 1, 0)
  };
}

function getWeekStart(dateObj) {
  const date = new Date(dateObj);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  date.setHours(0, 0, 0, 0);
  return date;
}

function getWeekDates(dateObj) {
  const start = getWeekStart(dateObj);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function isToday(year, month, day) {
  const now = new Date();
  return now.getFullYear() === year && now.getMonth() + 1 === month && now.getDate() === day;
}

function getTypeClass(type) {
  return "type-" + type;
}

function getGoalColumn(goal) {
  const categoryColumn = GOAL_COLUMNS.find((column) => column.categories.includes(goal.category));
  if (categoryColumn) {
    return categoryColumn;
  }

  const fallbackKey = TYPE_FALLBACK_COLUMN[goal.type] || "personal";
  return GOAL_COLUMNS.find((column) => column.key === fallbackKey) || GOAL_COLUMNS[0];
}

function getGoalColorKey(goal) {
  return getGoalColumn(goal).key;
}

function getEventColorKey(eventItem) {
  const sourceGoal = getGoalById(eventItem.goalId);
  return sourceGoal ? getGoalColorKey(sourceGoal) : eventItem.colorKey || getGoalColorKey(eventItem);
}

function getColorClass(colorKey) {
  return "color-" + (colorKey || "personal");
}

function getGoalIconSrc(item) {
  return CATEGORY_ICONS[item.category] || CATEGORY_ICONS.Other;
}

function renderGoalIcon(item, className) {
  return '<img class="' + className + '" src="' + escapeHtml(getGoalIconSrc(item)) + '" alt="" />';
}

function getEventTimeLabel(eventItem) {
  return eventItem.time || "09:00";
}

function truncateCalendarTitle(title, maxLength) {
  const cleanTitle = String(title || "");
  const visibleLength = Number.isFinite(maxLength) ? maxLength : 11;
  return cleanTitle.length > visibleLength ? cleanTitle.slice(0, visibleLength) + ".." : cleanTitle;
}

function formatDateShort(isoDate) {
  if (!isoDate) return "-";
  const date = new Date(isoDate + "T00:00:00");
  return new Intl.DateTimeFormat("sr-Latn-RS", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function getGoalTimeSummary(goal, scheduledEvents) {
  if (goal.type === "long-term") {
    const fromDate = goal.createdAt ? formatDateShort(goal.createdAt.slice(0, 10)) : "danas";
    const toDate = goal.targetDate ? formatDateShort(goal.targetDate) : "bez roka";
    return "Od " + fromDate + " do " + toDate;
  }

  if (goal.type === "short-term") {
    return goal.duration || "7 dana";
  }

  if (goal.type === "habit") {
    return goal.frequency || "Dnevno";
  }

  if (scheduledEvents.length > 0) {
    return scheduledEvents.slice(0, 2).map((item) => item.date + " " + item.time).join(" | ");
  }

  return "Nije zakazano";
}

function getEventsForDate(dateKey) {
  return appState.calendarEvents
    .filter((item) => item.date === dateKey)
    .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
}

function getEventsForDateHour(dateKey, hour) {
  return getEventsForDate(dateKey).filter((item) => Number(item.time.slice(0, 2)) === hour);
}

function getEventById(eventId) {
  return appState.calendarEvents.find((item) => item.id === eventId) || null;
}

function getGoalById(goalId) {
  return appState.goals.find((item) => item.id === goalId) || null;
}

function setCalendarMode(mode) {
  appState.currentView = mode;
  const isMonth = mode === "month";
  const isWeek = mode === "week";
  const isDay = mode === "day";

  if (isDay && !appState.selectedDate) {
    const today = new Date();
    appState.selectedDate = toDateKeyFromDate(today);
    calendarCursor = new Date(today);
    calendarCursor.setDate(1);
  }

  monthCalendarView.classList.toggle("hidden", !isMonth);
  weekCalendarView.classList.toggle("hidden", !isWeek);
  dayCalendarView.classList.toggle("hidden", !isDay);
  monthViewBtn.classList.toggle("active", isMonth);
  weekViewBtn.classList.toggle("active", isWeek);
  dayViewBtn.classList.toggle("active", isDay);
  monthViewBtn.setAttribute("aria-selected", String(isMonth));
  weekViewBtn.setAttribute("aria-selected", String(isWeek));
  dayViewBtn.setAttribute("aria-selected", String(isDay));

  renderCalendar();
}

function resetPlannerView() {
  appState.currentView = "month";
  appState.selectedDate = null;
  appState.selectedEventId = null;
  appState.selectedGoalId = null;
  appState.selectedActionId = null;
  appState.goalFocusTab = "overview";
  appState.goalDeckFilter = "all";
  if (goalTypeSelect) goalTypeSelect.value = "all";
  calendarCursor = new Date();
  calendarCursor.setDate(1);
  setCalendarMode("month");
  renderGoalPool();
  renderCalendar();
}

function setSelectedDate(dateKey, hour) {
  // Selected day logic: day clicks update the left day details and clear focused event/goal.
  appState.selectedDate = dateKey;
  appState.selectedEventId = null;
  appState.selectedGoalId = null;
  if (typeof hour === "number" && Number.isFinite(hour)) appState.selectedSlotHour = hour;
  renderCalendar();
}

function setSlotForEditing(dateKey, hour) {
  appState.selectedDate = dateKey;
  appState.selectedEventId = null;
  appState.selectedGoalId = null;
  appState.selectedSlotHour = hour;
  renderCalendar();
}

function selectEventForEditing(eventId) {
  // Selected event logic: clicking an event chip/card focuses it in the left detail editor.
  const eventItem = getEventById(eventId);
  if (!eventItem) return;

  appState.selectedDate = eventItem.date;
  appState.selectedEventId = eventItem.id;
  appState.selectedGoalId = eventItem.goalId;
  appState.selectedActionId = eventItem.actionId || null;
  appState.selectedSlotHour = Number(eventItem.time.slice(0, 2));
  renderCalendar();
  renderGoalPool();
}

function selectGoalForDetails(goalId) {
  const goal = getGoalById(goalId);
  if (!goal) return;

  appState.selectedGoalId = goal.id;
  goal.colorKey = getGoalColorKey(goal);
  appState.selectedEventId = null;
  appState.selectedActionId = null;
  renderCalendar();
  renderGoalPool();
}

function renderDayDetails() {
  dayEventsList.innerHTML = "";

  if (!appState.selectedDate) {
    selectedDateLabel.textContent = "Nijedan datum nije izabran";
    dayEventsList.innerHTML = '<div class="empty-state">Klikni dan u kalendaru da vidiš zakazane ciljeve.</div>';
    return;
  }

  selectedDateLabel.textContent = dateHumanLong(appState.selectedDate);
  const events = getEventsForDate(appState.selectedDate);

  if (events.length === 0) {
    dayEventsList.innerHTML = '<div class="empty-state">Za ovaj datum još nema zakazanih ciljeva.</div>';
    return;
  }

  events.forEach((eventItem) => {
    const card = document.createElement("article");
    card.className = "day-event-card " + getColorClass(getEventColorKey(eventItem)) + (eventItem.id === appState.selectedEventId ? " active" : "");
    card.innerHTML = [
      '<div class="day-event-head">',
      renderGoalIcon(eventItem, "day-detail-icon"),
      "<h4>" + escapeHtml(eventItem.title) + "</h4>",
      "</div>",
      '<p class="day-event-meta">Kategorija: ' + escapeHtml(categoryLabel(eventItem.category)) + "</p>",
      '<p class="day-event-meta">Podkategorija: ' + escapeHtml(subcategoryLabel(eventItem)) + "</p>",
      '<p class="day-event-time">Vreme: ' + escapeHtml(eventItem.time) + "</p>",
      '<button class="mini-delete event-delete-btn" type="button" data-event-id="' + escapeHtml(eventItem.id) + '">Ukloni iz kalendara</button>'
    ].join("");

    card.addEventListener("click", () => selectEventForEditing(eventItem.id));
    dayEventsList.appendChild(card);
  });
}

function renderGoalDetails() {
  if (!goalDetailPanel) return;

  const selectedEvent = getEventById(appState.selectedEventId);
  if (selectedEvent) {
    goalDetailPanel.innerHTML = [
      '<div class="goal-detail-form">',
      '<label>Naziv<input id="detailTitleInput" class="text-input compact-input" type="text" value="' + escapeHtml(selectedEvent.title) + '" /></label>',
      '<div class="detail-pair"><span>Tip</span><strong>' + escapeHtml(TYPE_LABELS[selectedEvent.type]) + "</strong></div>",
      '<div class="detail-pair"><span>Kategorija</span><strong>' + escapeHtml(categoryLabel(selectedEvent.category)) + "</strong></div>",
      '<div class="detail-pair subcategory-detail"><span>Podkategorija</span><strong>' + escapeHtml(subcategoryLabel(selectedEvent)) + "</strong></div>",
      '<div class="detail-pair"><span>Datum</span><strong>' + escapeHtml(dateHumanLong(selectedEvent.date)) + "</strong></div>",
      '<label>Vreme<input id="detailTimeInput" class="time-input compact-input" type="time" value="' + escapeHtml(selectedEvent.time) + '" /></label>',
      '<label>Akcija<input id="detailActionInput" class="text-input compact-input" type="text" value="' + escapeHtml(selectedEvent.firstAction || selectedEvent.title || "") + '" /></label>',
      '<div class="detail-pair full"><span>Zašto</span><p>' + escapeHtml(selectedEvent.reason || "-") + "</p></div>",
      '<div class="detail-pair full"><span>Merilo uspeha</span><p>' + escapeHtml(selectedEvent.successMeasurement || "-") + "</p></div>",
      '<label>Beleške<textarea id="eventNotesInput" class="notes-input compact-notes" rows="4" placeholder="Dodaj beleške...">' + escapeHtml(selectedEvent.notes || "") + "</textarea></label>",
      '<div class="detail-actions">',
      '<button id="saveEventChangesBtn" class="btn secondary" type="button">Sačuvaj izmene</button>',
      '<button id="deleteEventBtn" class="ghost-btn danger-btn" type="button">Obriši iz kalendara</button>',
      "</div>",
      "</div>"
    ].join("");
    return;
  }

  const selectedGoal = getGoalById(appState.selectedGoalId);
  if (selectedGoal) {
    goalDetailPanel.innerHTML = [
      '<div class="goal-detail-static">',
      "<h4>" + escapeHtml(selectedGoal.title) + "</h4>",
      '<div class="detail-pair"><span>Tip</span><strong>' + escapeHtml(TYPE_LABELS[selectedGoal.type]) + "</strong></div>",
      '<div class="detail-pair"><span>Kategorija</span><strong>' + escapeHtml(categoryLabel(selectedGoal.category)) + "</strong></div>",
      '<div class="detail-pair subcategory-detail"><span>Podkategorija</span><strong>' + escapeHtml(subcategoryLabel(selectedGoal)) + "</strong></div>",
      selectedGoal.goalType ? '<div class="detail-pair"><span>Fokus</span><strong>' + escapeHtml(selectedGoal.goalType) + "</strong></div>" : "",
      '<div class="detail-pair full"><span>Zašto</span><p>' + escapeHtml(selectedGoal.reason || "-") + "</p></div>",
      '<div class="detail-pair full"><span>Merilo uspeha</span><p>' + escapeHtml(selectedGoal.successMeasurement || "-") + "</p></div>",
      '<div class="detail-pair full"><span>Akcija</span><p>' + escapeHtml(selectedGoal.firstAction || "-") + "</p></div>",
      '<button id="deleteGoalFromDetailsBtn" class="ghost-btn danger-btn" type="button">Obriši cilj</button>',
      "</div>"
    ].join("");
    return;
  }

  goalDetailPanel.innerHTML = '<div class="empty-state">Klikni na cilj u kalendaru da vidiš detalje.</div>';
}

function addCalendarEvent(goal, dateKey, time, action) {
  const exists = appState.calendarEvents.some((item) => item.goalId === goal.id && item.actionId === (action ? action.id : null) && item.date === dateKey && item.time === time);
  if (exists) return false;

  const eventId = createId("evt");
  const eventActionTitle = action ? action.title : goal.firstAction;
  appState.calendarEvents.push({
    id: eventId,
    goalId: goal.id,
    date: dateKey,
    time,
    actionId: action ? action.id : null,
    title: action ? action.title : goal.title,
    type: goal.type,
    category: goal.category,
    subcategory: goal.subcategory,
    subcategoryName: goal.subcategoryName,
    customSubcategoryName: goal.customSubcategoryName,
    goalType: goal.goalType,
    successMeasurement: goal.successMeasurement,
    colorKey: getGoalColorKey(goal),
    reason: goal.reason,
    firstAction: eventActionTitle,
    actions: [{
      id: eventId + "-action-0",
      title: eventActionTitle || (action ? action.title : goal.title),
      cadence: action ? action.cadence || goal.frequency || "Po planu" : goal.frequency || "Po planu",
      completed: false
    }],
    notesList: [{
      id: eventId + "-note-0",
      title: "",
      text: "",
      createdAt: new Date().toISOString()
    }],
    completed: false,
    notes: ""
  });

  return true;
}

function scheduleGoal(goal, dateKey, defaultTime, actionId) {
  if (isPastDateKey(dateKey)) {
    window.alert("Cilj možeš da ubaciš samo za današnji datum ili za buduće datume.");
    return;
  }

  if (isShortGoalCapacityFull(goal)) {
    window.alert("Limit kratkoročnog cilja je popunjen. Ukloni neki prethodno zakazan unos da bi ga ponovo ubacio.");
    return;
  }
  if (isWeeklyOccurrenceLimitFull(goal, dateKey)) {
    const weeklyLimit = getWeeklyOccurrenceLimit(goal);
    window.alert("Nedeljni limit je popunjen (" + weeklyLimit + " od " + weeklyLimit + "). Ukloni neki unos iz te nedelje da bi ga ponovo ubacio.");
    return;
  }

  const selectedTime = askExecutionTime(defaultTime);
  if (!selectedTime) return;

  const action = actionId ? getGoalAction(goal, actionId) : getPrimaryGoalAction(goal);
  let scheduled = false;

  if (goal.type === "habit" && (goal.frequency === "Daily" || goal.frequency === "Dnevno")) {
    const range = getVisibleMonthRange();
    const selectedDate = new Date(dateKey + "T00:00:00");
    const cursor = new Date(Math.max(range.start.getTime(), selectedDate.getTime()));
    while (cursor <= range.end) {
      if (addCalendarEvent(goal, toDateKeyFromDate(cursor), selectedTime, action)) scheduled = true;
      cursor.setDate(cursor.getDate() + 1);
    }
  } else {
    scheduled = addCalendarEvent(goal, dateKey, selectedTime, action);
  }

  if (scheduled && action) {
    appState.selectedActionId = action.id;
    if (!Array.isArray(appState.expandedGoalIds)) {
      appState.expandedGoalIds = [];
    }
    if (!appState.expandedGoalIds.includes(goal.id)) {
      appState.expandedGoalIds.push(goal.id);
    }
  }

  appState.selectedDate = dateKey;
  appState.selectedSlotHour = Number(selectedTime.slice(0, 2));
  appState.selectedEventId = null;
  appState.selectedGoalId = goal.id;
  renderGoalPool();
  renderCalendar();
  renderGoalFocusPanel();
}

function flashDropSuccess(element) {
  element.classList.add("drop-success");
  setTimeout(() => element.classList.remove("drop-success"), 360);
}

function handleMonthDrop(event) {
  // Drag/drop logic: copy a goal card into a calendar day and ask for execution time.
  event.preventDefault();
  const goalId = event.dataTransfer.getData("text/plain");
  const actionId = event.dataTransfer.getData("application/x-goal-action");
  const date = event.currentTarget.dataset.date;
  event.currentTarget.classList.remove("drag-over");
  const goal = getGoalById(goalId);
  if (!goal || !date) return;
  scheduleGoal(goal, date, "09:00", actionId);
  flashDropSuccess(event.currentTarget);
}

function handleWeekDrop(event) {
  event.preventDefault();
  const goalId = event.dataTransfer.getData("text/plain");
  const actionId = event.dataTransfer.getData("application/x-goal-action");
  const date = event.currentTarget.dataset.date;
  const hour = Number(event.currentTarget.dataset.hour);
  event.currentTarget.classList.remove("drag-over");
  const goal = getGoalById(goalId);
  if (!goal || !date) return;
  scheduleGoal(goal, date, String(hour).padStart(2, "0") + ":00", actionId);
  flashDropSuccess(event.currentTarget);
}

function handleDayDrop(event) {
  event.preventDefault();
  const goalId = event.dataTransfer.getData("text/plain");
  const actionId = event.dataTransfer.getData("application/x-goal-action");
  const date = event.currentTarget.dataset.date;
  const hour = Number(event.currentTarget.dataset.hour);
  event.currentTarget.classList.remove("drag-over");
  const goal = getGoalById(goalId);
  if (!goal || !date) return;
  scheduleGoal(goal, date, String(hour).padStart(2, "0") + ":00", actionId);
  flashDropSuccess(event.currentTarget);
}

function deleteCalendarEvent(eventId) {
  appState.calendarEvents = appState.calendarEvents.filter((item) => item.id !== eventId);
  if (appState.selectedEventId === eventId) {
    appState.selectedEventId = null;
  }
  renderGoalPool();
  renderCalendar();
}

function deleteGoal(goalId) {
  appState.goals = appState.goals.filter((goal) => goal.id !== goalId);
  appState.calendarEvents = appState.calendarEvents.filter((eventItem) => eventItem.goalId !== goalId);
  if (appState.selectedGoalId === goalId) appState.selectedGoalId = null;
  if (appState.selectedGoalId === null) appState.selectedActionId = null;
  if (getEventById(appState.selectedEventId)?.goalId === goalId) appState.selectedEventId = null;
  renderGoalPool();
  renderCalendar();
}

function getGoalDeckDescription(goal) {
  return goal.firstAction || goal.reason || subcategoryLabel(goal) || "Prevuci cilj u kalendar.";
}

function getGoalDeckCadence(goal) {
  if (goal.type === "habit") {
    return [goal.frequency || "Dnevno", goal.bestTime || "30 min"].filter(Boolean).join(" • ");
  }

  if (goal.type === "short-term") {
    return [goal.duration || "7 dana", goal.bestTime || "fokus blok"].filter(Boolean).join(" • ");
  }

  return goal.targetDate ? "Do " + formatDateShort(goal.targetDate) : "Bez roka";
}

function getGoalExecutionLabel(goal) {
  if (goal.type === "habit") return "Navika";
  if (goal.type === "short-term") return "Fokus blok";
  return "Milestone";
}

function getGoalDeckCategoryLabel(goal) {
  const column = getGoalColumn(goal);
  return column ? column.title : categoryLabel(goal.category);
}

function getGoalDeckDuration(goal) {
  if (goal.type === "habit") return "30 min";
  if (goal.type === "short-term") return goal.duration || "30 min";
  return goal.targetDate ? formatDateShort(goal.targetDate) : "Po planu";
}

function getGoalDeckFrequency(goal) {
  if (goal.type === "habit") return goal.frequency || "Dnevno";
  if (goal.type === "short-term") return goal.duration || "Jednom";
  return "Milestone";
}

function getGoalDeckFilter() {
  return appState.goalDeckFilter || "all";
}

function renderGoalDeckFilters() {
  const activeFilter = getGoalDeckFilter();
  if (goalTypeSelect) goalTypeSelect.value = activeFilter;
  if (!goalDeckFilters) return;

  goalDeckFilters.innerHTML = GOAL_DECK_FILTERS.map((filter) => (
    '<button class="goal-filter-btn filter-' + escapeHtml(filter.key) + (filter.key === activeFilter ? " active" : "") + '" type="button" data-filter="' +
    escapeHtml(filter.key) + '">' + escapeHtml(filter.label) + "</button>"
  )).join("");
}

function getGoalFilterLabel(filterKey) {
  const filter = GOAL_DECK_FILTERS.find((item) => item.key === filterKey);
  return filter ? filter.label : "Svi ciljevi";
}

function getGoalDaysLabel(goal) {
  if (goal.type === "long-term") return goal.targetDate ? "do " + formatDateShort(goal.targetDate) : "bez roka";
  if (goal.type === "short-term") return goal.duration || "fokus";
  return goal.frequency || "dnevno";
}

function getScheduledGoalCount(goal) {
  return appState.calendarEvents.filter((eventItem) => eventItem.goalId === goal.id).length;
}

function parseLocalizedNumber(value) {
  const parsed = Number(String(value || "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function getShortGoalPlanText(goal) {
  return [
    goal.duration,
    goal.frequency,
    goal.bestTime,
    goal.title,
    goal.firstAction,
    goal.reason,
    goal.successMeasurement,
    goal.mainMilestone
  ].filter(Boolean).join(" ").toLowerCase();
}

function getPlannedWeekCount(text) {
  const weekMatch = /(\d+(?:[,.]\d+)?)\s*(?:nedelj|nedel|tjed|week)/i.exec(text);
  if (!weekMatch) return null;
  return parseLocalizedNumber(weekMatch[1]);
}

function getPlannedDayCount(goal, text) {
  const dayMatch = /(\d+(?:[,.]\d+)?)\s*(?:dan|dana|day)/i.exec(text);
  if (dayMatch) return Math.round(parseLocalizedNumber(dayMatch[1]) || 0);

  const weeks = getPlannedWeekCount(text);
  if (weeks) return Math.round(weeks * 7);

  return null;
}

function getPlannedPeriodWeekCount(text) {
  const explicitWeeks = getPlannedWeekCount(text);
  if (explicitWeeks) return explicitWeeks;

  const days = getPlannedDayCount(null, text);
  if (days) return days / 7;

  return null;
}

function getPlannedWeeklyOccurrenceCount(text) {
  const occurrenceMatch =
    /(\d+(?:[,.]\d+)?)\s*(?:x|puta|put|dan|dana|treninga|termina)\s*(?:nedelj|nedel|tjed|week)/i.exec(text) ||
    /(?:nedelj|nedel|tjed|week)[a-z\s]*(\d+(?:[,.]\d+)?)\s*(?:x|puta|put|dan|dana|treninga|termina)/i.exec(text);
  const weeks = getPlannedPeriodWeekCount(text);
  if (!weeks) return null;

  if (occurrenceMatch) {
    return Math.round((parseLocalizedNumber(occurrenceMatch[1]) || 0) * weeks);
  }

  if (
    /(?:jednom|1x|jedanput|jedan put)\s*(?:nedelj|nedel|tjed|week)/i.test(text) ||
    /jedan(?:\s+\S+){0,4}\s+(?:nedelj|nedel|tjed|week)/i.test(text) ||
    /svake\s+(?:nedelj|nedel|tjed|week)/i.test(text)
  ) {
    return Math.round(weeks);
  }

  return null;
}

function getWeeklyOccurrenceLimit(goal) {
  const text = getShortGoalPlanText(goal);
  const occurrenceMatch =
    /(\d+(?:[,.]\d+)?)\s*(?:x|puta|put|dan|dana|treninga|termina)\s*(?:nedelj|nedel|tjed|week)/i.exec(text) ||
    /(?:nedelj|nedel|tjed|week)[a-z\s]*(\d+(?:[,.]\d+)?)\s*(?:x|puta|put|dan|dana|treninga|termina)/i.exec(text);

  if (occurrenceMatch) return Math.round(parseLocalizedNumber(occurrenceMatch[1]) || 0);

  if (
    /(?:jednom|1x|jedanput|jedan put)\s*(?:nedelj|nedel|tjed|week)/i.test(text) ||
    /jedan(?:\s+\S+){0,4}\s+(?:nedelj|nedel|tjed|week)/i.test(text) ||
    /svake\s+(?:nedelj|nedel|tjed|week)/i.test(text)
  ) {
    return 1;
  }

  return null;
}

function getScheduledGoalCountInWeek(goal, dateKey) {
  const start = getWeekStart(new Date(dateKey + "T00:00:00"));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const startKey = toDateKeyFromDate(start);
  const endKey = toDateKeyFromDate(end);
  return appState.calendarEvents.filter((eventItem) => (
    eventItem.goalId === goal.id &&
    eventItem.date >= startKey &&
    eventItem.date <= endKey
  )).length;
}

function isWeeklyOccurrenceLimitFull(goal, dateKey) {
  const weeklyLimit = getWeeklyOccurrenceLimit(goal);
  if (!weeklyLimit) return false;
  return getScheduledGoalCountInWeek(goal, dateKey) >= weeklyLimit;
}

function getPlannedHourCount(text) {
  const weeklyHourMatch =
    /(\d+(?:[,.]\d+)?)\s*(?:h|sat|sati|čas|cas)[a-z\s]*(?:nedelj|nedel|tjed|week)/i.exec(text) ||
    /(?:nedelj|nedel|tjed|week)[a-z\s]*(\d+(?:[,.]\d+)?)\s*(?:h|sat|sati|čas|cas)/i.exec(text);
  const weeks = getPlannedPeriodWeekCount(text);
  if (weeklyHourMatch && weeks) {
    return Math.round((parseLocalizedNumber(weeklyHourMatch[1]) || 0) * weeks);
  }

  const totalHourMatch = /(\d+(?:[,.]\d+)?)\s*(?:h|sat|sati|čas|cas)(?![a-z\s]*(?:nedelj|nedel|tjed|week))/i.exec(text);
  if (totalHourMatch) return Math.round(parseLocalizedNumber(totalHourMatch[1]) || 0);

  return null;
}

function getShortGoalCapacity(goal) {
  if (goal.type !== "short-term") return null;
  const planText = getShortGoalPlanText(goal);
  const plannedHours = getPlannedHourCount(planText);
  const scheduledEvents = appState.calendarEvents.filter((eventItem) => eventItem.goalId === goal.id);

  if (plannedHours) {
    return {
      current: scheduledEvents.length,
      total: plannedHours,
      unit: "sati"
    };
  }

  const plannedOccurrences = getPlannedWeeklyOccurrenceCount(planText);
  if (plannedOccurrences) {
    return {
      current: scheduledEvents.length,
      total: plannedOccurrences,
      unit: "dana"
    };
  }

  const plannedDays = getPlannedDayCount(goal, planText);
  if (plannedDays) {
    const scheduledDays = new Set(scheduledEvents.map((eventItem) => eventItem.date)).size;
    return {
      current: scheduledDays,
      total: plannedDays,
      unit: "dana"
    };
  }

  return null;
}

function getShortGoalProgressBadge(goal) {
  const capacity = getShortGoalCapacity(goal);
  if (capacity) {
    return capacity.current + " od " + capacity.total + " " + capacity.unit;
  }

  const weeklyLimit = getWeeklyOccurrenceLimit(goal);
  if (weeklyLimit) {
    const dateKey = appState.selectedDate || toDateKeyFromDate(new Date());
    return getScheduledGoalCountInWeek(goal, dateKey) + " od " + weeklyLimit + " ned.";
  }

  return getScheduleBadgeLabel(getScheduledGoalCount(goal), getGoalDaysLabel(goal));
}

function isShortGoalCapacityFull(goal) {
  const capacity = getShortGoalCapacity(goal);
  return Boolean(capacity && capacity.total > 0 && capacity.current >= capacity.total);
}

function getScheduledActionCount(goal, action) {
  return appState.calendarEvents.filter((eventItem) => eventItem.goalId === goal.id && eventItem.actionId === action.id).length;
}

function getScheduleBadgeLabel(count, fallback) {
  return count > 0 ? count + "x" : fallback;
}

function getGoalActions(goal) {
  if (!goal.actions) {
    const baseActions = [];
    if (goal.firstAction) baseActions.push(goal.firstAction);
    if (goal.mainMilestone) baseActions.push(goal.mainMilestone);
    if (goal.successMeasurement) baseActions.push("Proveri merilo uspeha");
    if (!baseActions.length) baseActions.push("Definisi prvi sledeci korak");
    goal.actions = baseActions.slice(0, 5).map((title, index) => ({
      id: goal.id + "-action-" + index,
      title,
      cadence: index === 0 ? (goal.frequency || "Dnevno") : "Po planu",
      completed: false
    }));
  }

  return goal.actions;
}

function getTaskActions(task) {
  if (!task) return [];
  if (!Array.isArray(task.actions) || !task.actions.length) {
    task.actions = [{
      id: task.id + "-task-action-0",
      title: task.title || "Pocetna akcija",
      cadence: task.cadence || "Po planu",
      completed: Boolean(task.completed)
    }];
  }

  return task.actions;
}

function getGoalProgress(goal) {
  const tasks = getGoalActions(goal);
  if (!tasks.length) return 0;
  const taskWeight = 100 / tasks.length;
  const progress = tasks.reduce((total, task) => {
    const scheduledTaskEvents = appState.calendarEvents.filter((eventItem) => eventItem.goalId === goal.id && eventItem.actionId === task.id);
    if (scheduledTaskEvents.length) {
      const eventProgress = scheduledTaskEvents.reduce((eventTotal, eventItem) => eventTotal + (getEventProgress(eventItem) / 100), 0);
      return total + ((eventProgress / scheduledTaskEvents.length) * taskWeight);
    }

    const taskActions = getTaskActions(task);
    if (!taskActions.length) return total;
    const completedActions = taskActions.filter((item) => item.completed).length;
    return total + ((completedActions / taskActions.length) * taskWeight);
  }, 0);

  return Math.round(progress);
}

function getCompletedActionScore(goal) {
  const tasks = getGoalActions(goal);
  if (!tasks.length) return 0;
  return tasks.reduce((total, task) => {
    const scheduledTaskEvents = appState.calendarEvents.filter((eventItem) => eventItem.goalId === goal.id && eventItem.actionId === task.id);
    if (scheduledTaskEvents.length) {
      const eventProgress = scheduledTaskEvents.reduce((eventTotal, eventItem) => eventTotal + (getEventProgress(eventItem) / 100), 0);
      return total + (eventProgress / scheduledTaskEvents.length);
    }

    const taskActions = getTaskActions(task);
    if (!taskActions.length) return total;
    return total + (taskActions.filter((item) => item.completed).length / taskActions.length);
  }, 0);
}

function isActionFullyCompleted(goal, action) {
  const scheduledTaskEvents = appState.calendarEvents.filter((eventItem) => eventItem.goalId === goal.id && eventItem.actionId === action.id);
  if (scheduledTaskEvents.length) {
    return scheduledTaskEvents.every((eventItem) => getEventProgress(eventItem) >= 100);
  }

  const taskActions = getTaskActions(action);
  return taskActions.length > 0 && taskActions.every((item) => item.completed);
}

function getGoalAction(goal, actionId) {
  return getGoalActions(goal).find((action) => action.id === actionId) || null;
}

function getPrimaryGoalAction(goal) {
  return getGoalActions(goal)[0] || null;
}

function getSelectedGoal() {
  return getGoalById(appState.selectedGoalId) || appState.goals[0] || null;
}

function getSelectedEvent() {
  return getEventById(appState.selectedEventId);
}

function getSelectedAction(goal) {
  if (!goal) return null;
  return getGoalAction(goal, appState.selectedActionId) || getGoalActions(goal)[0] || null;
}

function getEventTaskActions(eventItem) {
  if (!eventItem) return [];
  if (!Array.isArray(eventItem.actions) || !eventItem.actions.length) {
    eventItem.actions = [{
      id: eventItem.id + "-action-0",
      title: eventItem.firstAction || eventItem.title || "Pocetna akcija",
      cadence: eventItem.frequency || "Po planu",
      completed: Boolean(eventItem.completed)
    }];
  }

  return eventItem.actions;
}

function getEventProgress(eventItem) {
  const actions = getEventTaskActions(eventItem);
  if (!actions.length) return 0;
  const completedCount = actions.filter((item) => item.completed).length;
  return Math.round((completedCount / actions.length) * 100);
}

function cleanNoteTitle(title) {
  return String(title || "").trim();
}

function normalizeNoteTitle(title) {
  return cleanNoteTitle(title).toLocaleLowerCase("sr-Latn-RS");
}

function hasDuplicateNoteTitle(notes, title, activeNoteId) {
  const normalizedTitle = normalizeNoteTitle(title);
  if (!normalizedTitle) return false;
  return notes.some((note) => note.id !== activeNoteId && normalizeNoteTitle(note.title) === normalizedTitle);
}

function clearLegacyDefaultNoteTitles(notes) {
  notes.forEach((note) => {
    if (normalizeNoteTitle(note.title) === "glavna beleska") {
      note.title = "";
    }
  });
}

function clearLegacyDefaultGoalNoteText(notes, goal) {
  const defaultText = String(goal && goal.reason ? goal.reason : "").trim();
  if (!defaultText) return;
  notes.forEach((note) => {
    if (!cleanNoteTitle(note.title) && String(note.text || "").trim() === defaultText) {
      note.text = "";
    }
  });
}

function showGoalNoteWarning(message) {
  const warning = document.getElementById("goalNoteWarning");
  if (!warning) return;
  warning.textContent = message || "";
  warning.hidden = !message;
}

function ensureGoalNotes(goal) {
  if (!Array.isArray(goal.notesList)) {
    goal.notesList = [];
  }

  if (!goal.notesList.length) {
    goal.notesList.push({
      id: goal.id + "-note-0",
      title: "",
      text: "",
      createdAt: new Date().toISOString()
    });
  }
  clearLegacyDefaultNoteTitles(goal.notesList);
  clearLegacyDefaultGoalNoteText(goal.notesList, goal);

  if (!goal.notesList.some((note) => note.id === appState.selectedGoalNoteId)) {
    appState.selectedGoalNoteId = goal.notesList[0].id;
  }

  return goal.notesList;
}

function getSelectedGoalNote(goal) {
  const notes = ensureGoalNotes(goal);
  return notes.find((note) => note.id === appState.selectedGoalNoteId) || notes[0] || null;
}

function ensureEventNotes(eventItem) {
  if (!Array.isArray(eventItem.notesList)) {
    eventItem.notesList = [];
  }

  if (!eventItem.notesList.length) {
    eventItem.notesList.push({
      id: eventItem.id + "-note-0",
      title: "",
      text: eventItem.notes || "",
      createdAt: new Date().toISOString()
    });
  }
  clearLegacyDefaultNoteTitles(eventItem.notesList);

  if (!eventItem.notesList.some((note) => note.id === appState.selectedGoalNoteId)) {
    appState.selectedGoalNoteId = eventItem.notesList[0].id;
  }

  return eventItem.notesList;
}

function getSelectedEventNote(eventItem) {
  const notes = ensureEventNotes(eventItem);
  return notes.find((note) => note.id === appState.selectedGoalNoteId) || notes[0] || null;
}

function getNoteExcerpt(note) {
  const text = String(note.text || "").trim();
  if (!text) return "Prazna beleska";
  return text.length > 64 ? text.slice(0, 64) + "..." : text;
}

function renderGoalNotesPanel(goal) {
  const notes = ensureGoalNotes(goal);
  const activeNote = getSelectedGoalNote(goal);

  return [
    '<div class="goal-notes-workspace">',
    '<section class="goal-note-editor">',
    '<label class="goal-note-title-field"><span>Ime beleske</span><input id="goalNoteTitleInput" class="compact-input" type="text" value="' + escapeHtml(activeNote ? activeNote.title : "") + '" placeholder="Ime beleske" /></label>',
    '<div id="goalNoteWarning" class="goal-note-warning" hidden></div>',
    '<textarea id="goalNoteTextInput" class="compact-notes goal-note-textarea" placeholder="Upisi belesku za cilj...">' + escapeHtml(activeNote ? activeNote.text : "") + '</textarea>',
    '<div class="goal-note-actions"><button class="btn compact-focus-btn add-goal-note-btn" type="button" data-add-goal-note="true">Dodaj belesku</button><button class="ghost-btn danger-btn compact-focus-btn delete-goal-note-btn" type="button" data-delete-goal-note="true">Obrisi belesku</button></div>',
    '</section>',
    '<aside class="goal-notes-list" aria-label="Lista beleski">',
    '<h4>Beleske</h4>',
    notes.map((note) => (
      '<button class="goal-note-list-item' + (note.id === appState.selectedGoalNoteId ? " active" : "") + '" type="button" data-goal-note-id="' + escapeHtml(note.id) + '">' +
      '<strong>' + escapeHtml(note.title || "Beleska") + '</strong><small>' + escapeHtml(getNoteExcerpt(note)) + '</small></button>'
    )).join(""),
    '</aside>',
    '</div>'
  ].join("");
}

function renderEventNotesPanel(eventItem) {
  const notes = ensureEventNotes(eventItem);
  const activeNote = getSelectedEventNote(eventItem);

  return [
    '<div class="goal-notes-workspace">',
    '<section class="goal-note-editor">',
    '<label class="goal-note-title-field"><span>Ime beleske</span><input id="goalNoteTitleInput" class="compact-input" type="text" value="' + escapeHtml(activeNote ? activeNote.title : "") + '" placeholder="Ime beleske" /></label>',
    '<div id="goalNoteWarning" class="goal-note-warning" hidden></div>',
    '<textarea id="goalNoteTextInput" class="compact-notes goal-note-textarea" placeholder="Upisi belesku za ovaj unos u kalendaru...">' + escapeHtml(activeNote ? activeNote.text : "") + '</textarea>',
    '<div class="goal-note-actions"><button class="btn compact-focus-btn add-goal-note-btn" type="button" data-add-goal-note="true">Dodaj belesku</button><button class="ghost-btn danger-btn compact-focus-btn delete-goal-note-btn" type="button" data-delete-goal-note="true">Obrisi belesku</button></div>',
    '</section>',
    '<aside class="goal-notes-list" aria-label="Lista beleski">',
    '<h4>Beleske unosa</h4>',
    notes.map((note) => (
      '<button class="goal-note-list-item' + (note.id === appState.selectedGoalNoteId ? " active" : "") + '" type="button" data-goal-note-id="' + escapeHtml(note.id) + '">' +
      '<strong>' + escapeHtml(note.title || "Beleska") + '</strong><small>' + escapeHtml(getNoteExcerpt(note)) + '</small></button>'
    )).join(""),
    '</aside>',
    '</div>'
  ].join("");
}

function renderGoalEditForm(goal, action) {
  const typeSpecificField = goal.type === "long-term"
    ? '<label><span>Ciljni datum</span><input class="compact-input" name="targetDate" type="date" value="' + escapeHtml(goal.targetDate || "") + '" /></label>'
    : goal.type === "short-term"
      ? '<label><span>Trajanje / obim</span><input class="compact-input" name="duration" type="text" value="' + escapeHtml(goal.duration || "") + '" /></label>'
      : '<label><span>Učestalost</span><input class="compact-input" name="frequency" type="text" value="' + escapeHtml(goal.frequency || "") + '" /></label>';

  return [
    '<form id="goalEditForm" class="goal-edit-form">',
    '<h4>Uredi cilj</h4>',
    '<label><span>Naziv cilja</span><input class="compact-input" name="title" type="text" value="' + escapeHtml(goal.title || "") + '" /></label>',
    '<label><span>Kategorija</span><select class="compact-input" name="category">',
    Object.keys(CATEGORY_ICONS).map((category) => '<option value="' + escapeHtml(category) + '"' + (goal.category === category ? " selected" : "") + '>' + escapeHtml(categoryLabel(category)) + '</option>').join(""),
    "</select></label>",
    '<label><span>Fokus</span><input class="compact-input" name="goalType" type="text" value="' + escapeHtml(goal.goalType || "") + '" /></label>',
    typeSpecificField,
    '<label><span>Zašto</span><textarea class="compact-notes" name="reason">' + escapeHtml(goal.reason || "") + '</textarea></label>',
    '<label><span>Akcija</span><textarea class="compact-notes" name="firstAction">' + escapeHtml(goal.firstAction || "") + '</textarea></label>',
    '<label><span>Merilo uspeha</span><textarea class="compact-notes" name="successMeasurement">' + escapeHtml(goal.successMeasurement || "") + '</textarea></label>',
    '<div class="goal-edit-actions"><button class="btn compact-focus-btn" type="submit">Sačuvaj izmene</button><button class="ghost-btn compact-focus-btn" type="button" data-goal-tab-action="overview">Otkaži</button></div>',
    "</form>"
  ].join("");
}

function renderEventEditForm(eventItem) {
  return [
    '<form id="goalEditForm" class="goal-edit-form" data-event-edit="true">',
    '<h4>Uredi unos u kalendaru</h4>',
    '<label><span>Naziv</span><input class="compact-input" name="title" type="text" value="' + escapeHtml(eventItem.title || "") + '" /></label>',
    '<label><span>Datum</span><input class="compact-input" name="date" type="date" value="' + escapeHtml(eventItem.date || "") + '" /></label>',
    '<label><span>Vreme</span><input class="compact-input" name="time" type="time" value="' + escapeHtml(eventItem.time || "09:00") + '" /></label>',
    '<label><span>Fokus</span><input class="compact-input" name="goalType" type="text" value="' + escapeHtml(eventItem.goalType || "") + '" /></label>',
    '<label><span>Zašto</span><textarea class="compact-notes" name="reason">' + escapeHtml(eventItem.reason || "") + '</textarea></label>',
    '<label><span>Akcija</span><textarea class="compact-notes" name="firstAction">' + escapeHtml(eventItem.firstAction || "") + '</textarea></label>',
    '<label><span>Merilo uspeha</span><textarea class="compact-notes" name="successMeasurement">' + escapeHtml(eventItem.successMeasurement || "") + '</textarea></label>',
    '<div class="goal-edit-actions"><button class="btn compact-focus-btn" type="submit">Sačuvaj izmene</button><button class="ghost-btn compact-focus-btn" type="button" data-goal-tab-action="overview">Otkaži</button></div>',
    "</form>"
  ].join("");
}

function renderGoalFocusPanel() {
  if (!goalFocusDetails || !goalFocusTabPanel) return;

  const goal = getSelectedGoal();
  if (!goal) {
    goalFocusDetails.innerHTML = '<div class="empty-state">Kreiraj cilj da bi ovde video pregled, akcije, beleske i statistike.</div>';
    goalFocusTabPanel.innerHTML = "";
    return;
  }

  const action = getSelectedAction(goal);
  const selectedEvent = getEventById(appState.selectedEventId);
  const displayActionTitle = selectedEvent ? (selectedEvent.firstAction || selectedEvent.title) : (action ? action.title : goal.firstAction || "Definisi sledeci korak");
  const progress = selectedEvent ? getEventProgress(selectedEvent) : getGoalProgress(goal);
  const actions = getGoalActions(goal);
  const taskActions = getTaskActions(action);
  const completedActions = getCompletedActionScore(goal);
  const scheduledEvents = appState.calendarEvents.filter((item) => item.goalId === goal.id);
  const nextScheduledEvent = scheduledEvents
    .slice()
    .sort((a, b) => (a.date + " " + a.time).localeCompare(b.date + " " + b.time))[0];
  const goalStatus = actions.length > 0 && completedActions >= actions.length ? "Zavrseno" : "U fokusu";
  goalFocusDetails.innerHTML = [
    '<div class="goal-focus-head">',
    renderGoalIcon(selectedEvent || goal, "goal-focus-icon"),
    '<div><h3>' + escapeHtml(displayActionTitle || goal.title) + '</h3></div>',
    "</div>"
  ].join("");

  const activeTab = appState.goalFocusTab || "overview";
  document.querySelectorAll(".goal-focus-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.goalTab === activeTab);
  });

  if (activeTab === "actions") {
    if (selectedEvent) {
      const eventActions = getEventTaskActions(selectedEvent);
      goalFocusTabPanel.innerHTML = [
        '<h4>Akcije ovog unosa</h4>',
        '<div class="focus-action-list">',
        eventActions.map((item) => (
          '<div class="focus-action-row' + (item.completed ? " completed" : "") + '" data-task-action-id="' + escapeHtml(item.id) + '">' +
          '<input class="focus-action-check" type="checkbox" data-task-action-check="' + escapeHtml(item.id) + '"' + (item.completed ? " checked" : "") + ' aria-label="Oznaci akciju kao zavrsenu" />' +
          '<span>' + escapeHtml(item.title) + '</span><small>' + escapeHtml(item.cadence || "Po planu") + '</small></div>'
        )).join(""),
        '<button class="focus-action-row add-focus-action-row" type="button" data-add-task-action="true"><span class="action-check">+</span><span>Dodaj akciju</span><small>ovaj unos</small></button>',
        "</div>"
      ].join("");
      return;
    }

    goalFocusTabPanel.innerHTML = [
      '<h4>Akcije za zadatak: ' + escapeHtml(action ? action.title : "Izaberi zadatak") + '</h4>',
      '<div class="focus-action-list">',
      (action ? taskActions.map((item) => (
        '<div class="focus-action-row' + (item.completed ? " completed" : "") + '" data-task-action-id="' + escapeHtml(item.id) + '">' +
        '<input class="focus-action-check" type="checkbox" data-task-action-check="' + escapeHtml(item.id) + '"' + (item.completed ? " checked" : "") + ' aria-label="Oznaci akciju kao zavrsenu" />' +
        '<span>' + escapeHtml(item.title) + '</span><small>' + escapeHtml(item.cadence || "Po planu") + '</small></div>'
      )).join("") : '<div class="empty-state compact-empty">Izaberi zadatak iz levog panela.</div>'),
      '<button class="focus-action-row add-focus-action-row" type="button" data-add-task-action="true"><span class="action-check">+</span><span>Dodaj akciju</span><small>' + escapeHtml(action ? action.title : "zadatak") + '</small></button>',
      "</div>"
    ].join("");
    return;
  }

  if (activeTab === "notes") {
    goalFocusTabPanel.innerHTML = selectedEvent ? renderEventNotesPanel(selectedEvent) : renderGoalNotesPanel(goal);
    return;
  }

  if (activeTab === "stats") {
    goalFocusTabPanel.innerHTML = [
      '<h4>Statistike</h4>',
      '<div class="stats-progress-card">',
      '<div class="stats-progress-head"><span>Ukupan napredak</span><strong>' + progress + '%</strong></div>',
      '<meter value="' + progress + '" max="100"></meter>',
      '<div class="stats-status-row"><small>Status</small><strong>' + escapeHtml(goalStatus) + '</strong></div>',
      '</div>',
      '<div class="goal-stats-grid">',
      '<span><strong>' + actions.length + '</strong><small>zadataka</small></span>',
      '<span><strong>' + Math.round(completedActions * 10) / 10 + '</strong><small>zavrseno</small></span>',
      '<span><strong>' + Math.max(Math.round((actions.length - completedActions) * 10) / 10, 0) + '</strong><small>preostalo</small></span>',
      '<span><strong>' + scheduledEvents.length + '</strong><small>u kalendaru</small></span>',
      '</div>',
      '<div class="stats-insight-grid">',
      '<div class="stats-next-card"><small>Sledeci fokus</small><strong>' + escapeHtml(displayActionTitle) + '</strong></div>',
      '<div class="stats-next-card"><small>Sledece u kalendaru</small><strong>' + escapeHtml(nextScheduledEvent ? nextScheduledEvent.date + " u " + nextScheduledEvent.time : "Nije zakazano") + '</strong></div>',
      '</div>'
    ].join("");
    return;
  }

  if (activeTab === "edit") {
    goalFocusTabPanel.innerHTML = selectedEvent ? renderEventEditForm(selectedEvent) : renderGoalEditForm(goal, action);
    return;
  }

  const overviewItem = selectedEvent || goal;
  goalFocusTabPanel.innerHTML = [
    '<article class="goal-overview-card ' + getColorClass(selectedEvent ? getEventColorKey(selectedEvent) : getGoalColorKey(goal)) + '">',
    '<div class="goal-overview-title">',
    '<div class="goal-overview-name"><h4>' + escapeHtml(selectedEvent ? "Pregled unosa" : "Pregled cilja") + '</h4></div>',
    selectedEvent ? '<button class="ghost-btn danger-btn calendar-remove-btn" type="button" data-delete-selected-event="true">Izbrisi iz kalendara</button>' : "",
    '</div>',
    '<div class="goal-overview-grid">',
    '<div class="goal-overview-info-tile goal-overview-goal-name"><small>Naziv</small><strong>' + renderGoalIcon(overviewItem, "goal-overview-icon") + '<span>' + escapeHtml(overviewItem.title || goal.title) + '</span></strong></div>',
    '<div class="goal-overview-info-tile"><small>Kategorija</small><strong>' + escapeHtml(categoryLabel(overviewItem.category)) + '</strong></div>',
    '<div><small>Tip</small><strong>' + escapeHtml(TYPE_LABELS[overviewItem.type] || "Cilj") + '</strong></div>',
    '<div><small>Fokus</small><strong>' + escapeHtml(overviewItem.goalType || "-") + '</strong></div>',
    '<div><small>Ritam</small><strong>' + escapeHtml(action ? action.cadence : getGoalDeckCadence(goal)) + '</strong></div>',
    '<div class="goal-overview-time-tile"><small>Vreme</small><strong>' + escapeHtml(selectedEvent ? selectedEvent.date + " " + selectedEvent.time : getGoalDaysLabel(goal)) + '</strong></div>',
    '<div class="goal-overview-action-tile"><small>Akcija</small><strong>' + escapeHtml(displayActionTitle) + '</strong></div>',
    '</div>',
    '<div class="goal-overview-section"><small>Zasto</small><p>' + escapeHtml(overviewItem.reason || "Ovaj unos jos nema upisan razlog.") + '</p></div>',
    '<div class="goal-overview-section"><small>Merilo uspeha</small><p>' + escapeHtml(overviewItem.successMeasurement || "-") + '</p></div>',
    '</article>'
  ].join("");
}

function renderGoalPool() {
  goalPool.innerHTML = "";
  renderGoalDeckFilters();

  const activeFilter = getGoalDeckFilter();
  const visibleGoals = appState.goals.filter((goal) => activeFilter === "all" || getGoalColorKey(goal) === activeFilter);

  if (!visibleGoals.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state goal-design-placeholder";
    empty.textContent = appState.goals.length
      ? "Nema ciljeva u ovom filteru."
      : "Kreiraj cilj u kreatoru i pojavice se ovde.";
    goalPool.appendChild(empty);
    renderGoalFocusPanel();
    return;
  }

  if (!visibleGoals.some((goal) => goal.id === appState.selectedGoalId)) {
    appState.selectedGoalId = visibleGoals[0].id;
    appState.selectedActionId = null;
  }

  const shortGoals = visibleGoals.filter((goal) => goal.type !== "long-term");
  const longGoals = visibleGoals.filter((goal) => goal.type === "long-term");

  const shortHtml = shortGoals.length
    ? shortGoals.map((goal) => (
      '<button class="short-goal-strip ' + getColorClass(getGoalColorKey(goal)) + (goal.id === appState.selectedGoalId ? " active" : "") + '" type="button" draggable="true" data-goal-id="' + escapeHtml(goal.id) + '">' +
      renderGoalIcon(goal, "short-goal-icon") +
      '<span class="short-goal-title">' + escapeHtml(goal.title || "Novi cilj") + '</span>' +
      '<span class="short-goal-days">' + escapeHtml(getShortGoalProgressBadge(goal)) + '</span>' +
      "</button>"
    )).join("")
    : '<div class="empty-state compact-empty">Nema kratkorocnih ciljeva za filter ' + escapeHtml(getGoalFilterLabel(activeFilter)) + '.</div>';

  const longHtml = longGoals.length
    ? longGoals.map((goal) => {
      const progress = getGoalProgress(goal);
      const isExpanded = Array.isArray(appState.expandedGoalIds) && appState.expandedGoalIds.includes(goal.id);
      return [
        '<article class="long-goal-card ' + getColorClass(getGoalColorKey(goal)) + (goal.id === appState.selectedGoalId ? " active" : "") + (isExpanded ? " expanded" : " collapsed") + '" data-goal-id="' + escapeHtml(goal.id) + '">',
        '<button class="long-goal-head" type="button" data-goal-id="' + escapeHtml(goal.id) + '" aria-expanded="' + String(isExpanded) + '">' +
        renderGoalIcon(goal, "long-goal-icon") + '<span>' + escapeHtml(goal.title || "Dugorocni cilj") + '</span><strong>' + progress + '%</strong><em aria-hidden="true">' + (isExpanded ? "⌃" : "⌄") + '</em></button>',
        '<div class="long-goal-progress"><span style="width:' + progress + '%"></span></div>',
        '<div class="long-action-list">',
        getGoalActions(goal).map((action) => {
          const scheduleCount = getScheduledActionCount(goal, action);
          const actionDone = isActionFullyCompleted(goal, action);
          const taskActions = getTaskActions(action);
          return (
          '<div class="long-action-row' + (actionDone ? " completed" : "") + (action.id === appState.selectedActionId ? " active" : "") + '" draggable="true" data-goal-id="' + escapeHtml(goal.id) + '" data-action-id="' + escapeHtml(action.id) + '">' +
          '<span class="action-check">' + (actionDone ? "✓" : "") + '</span>' +
          '<span>' + escapeHtml(action.title) + '</span><small>' + escapeHtml(scheduleCount > 0 ? getScheduleBadgeLabel(scheduleCount, action.cadence || "Po planu") : taskActions.length + " akc.") + '</small><b aria-hidden="true">⋮⋮</b></div>'
          );
        }).join(""),
        "</div>",
        "</article>"
      ].join("");
    }).join("")
    : '<div class="empty-state compact-empty">Dugorocni ciljevi ce se pojaviti ovde sa akcijama za drag & drop.</div>';

  goalPool.innerHTML = [
    '<section class="goal-hierarchy-section short-goals-panel"><div class="goal-section-title"><span>Kratkorocni ciljevi</span><strong>' + shortGoals.length + '</strong></div><div class="goal-panel-scroll">' + shortHtml + "</div></section>",
    '<section class="goal-hierarchy-section long-goals-panel"><div class="goal-section-title"><span>Dugorocni ciljevi</span><strong>' + longGoals.length + '</strong></div><div class="goal-panel-scroll">' + longHtml + "</div></section>"
  ].join("");

  renderGoalFocusPanel();
}

function renderMonthView() {
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  monthLabel.textContent = new Intl.DateTimeFormat("sr-Latn-RS", { month: "long", year: "numeric" }).format(calendarCursor);
  calendarGrid.innerHTML = "";

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayFirstIndex = (firstDay.getDay() + 6) % 7;

  for (let i = 0; i < mondayFirstIndex; i += 1) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "day-cell empty";
    calendarGrid.appendChild(emptyCell);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = toDateKey(year, month + 1, day);
    const cell = document.createElement("div");
    cell.className = "day-cell";
    cell.dataset.date = dateKey;
    if (dateKey === appState.selectedDate) cell.classList.add("selected");
    if (isToday(year, month + 1, day)) cell.classList.add("today");

    const dayNumber = document.createElement("div");
    dayNumber.className = "day-number";
    dayNumber.textContent = String(day);
    const eventList = document.createElement("div");
    eventList.className = "event-list";

    const events = getEventsForDate(dateKey);
    events.slice(0, 3).forEach((eventItem) => {
      const chip = document.createElement("span");
      chip.className = "event-chip " + getColorClass(getEventColorKey(eventItem));
      if (eventItem.id === appState.selectedEventId) chip.classList.add("selected-event");
      chip.title = eventItem.time + " " + eventItem.title;
      chip.innerHTML =
        renderGoalIcon(eventItem, "event-icon") +
        '<span class="event-chip-text">' +
        '<span>' + escapeHtml(truncateCalendarTitle(eventItem.title)) + '</span>' +
        "<small>" + escapeHtml(getEventTimeLabel(eventItem)) + (eventItem.notes ? " *" : "") + "</small></span>";
      chip.addEventListener("click", (clickEvent) => {
        clickEvent.stopPropagation();
        selectEventForEditing(eventItem.id);
      });
      eventList.appendChild(chip);
    });

    if (events.length > 3) {
      const moreChip = document.createElement("span");
      moreChip.className = "event-chip";
      moreChip.style.background = "#64748b";
      moreChip.textContent = "+" + String(events.length - 3) + " još";
      eventList.appendChild(moreChip);
    }

    cell.appendChild(dayNumber);
    cell.appendChild(eventList);
    cell.addEventListener("click", () => setSelectedDate(dateKey));
    cell.addEventListener("dragover", (dragEvent) => {
      dragEvent.preventDefault();
      cell.classList.add("drag-over");
    });
    cell.addEventListener("dragleave", () => cell.classList.remove("drag-over"));
    cell.addEventListener("drop", handleMonthDrop);
    calendarGrid.appendChild(cell);
  }
}

function getAnchorDate() {
  return appState.selectedDate ? new Date(appState.selectedDate + "T00:00:00") : new Date(calendarCursor);
}

function renderWeekView() {
  const weekDates = getWeekDates(getAnchorDate());
  const first = weekDates[0];
  const last = weekDates[6];
  monthLabel.textContent =
    new Intl.DateTimeFormat("sr-Latn-RS", { month: "short", day: "numeric" }).format(first) +
    " - " +
    new Intl.DateTimeFormat("sr-Latn-RS", { month: "short", day: "numeric", year: "numeric" }).format(last);

  weekHeaderRow.innerHTML = "";
  weekGrid.innerHTML = "";
  const headerRow = document.createElement("div");
  headerRow.className = "week-row week-date-row";
  headerRow.appendChild(Object.assign(document.createElement("div"), { className: "week-hour-spacer" }));

  weekDates.forEach((dateObj) => {
    const dateKey = toDateKeyFromDate(dateObj);
    const head = document.createElement("button");
    head.type = "button";
    head.className = "week-day-head" + (dateKey === appState.selectedDate ? " selected" : "");
    head.innerHTML =
      "<strong>" + new Intl.DateTimeFormat("sr-Latn-RS", { weekday: "short" }).format(dateObj) + "</strong><span>" +
      new Intl.DateTimeFormat("sr-Latn-RS", { month: "short", day: "numeric" }).format(dateObj) + "</span>";
    head.addEventListener("click", () => setSelectedDate(dateKey));
    headerRow.appendChild(head);
  });

  weekGrid.appendChild(headerRow);

  for (let hour = HOURS_START; hour <= HOURS_END; hour += 1) {
    const row = document.createElement("div");
    row.className = "week-row";
    const hourLabel = document.createElement("div");
    hourLabel.className = "week-hour-label";
    hourLabel.textContent = String(hour).padStart(2, "0") + ":00";
    row.appendChild(hourLabel);

    weekDates.forEach((dateObj) => {
      const dateKey = toDateKeyFromDate(dateObj);
      const slot = document.createElement("div");
      slot.className = "week-slot" + (dateKey === appState.selectedDate ? " selected-date" : "");
      slot.dataset.date = dateKey;
      slot.dataset.hour = String(hour);

      getEventsForDateHour(dateKey, hour).forEach((eventItem) => {
        const block = document.createElement("button");
        block.type = "button";
        block.className = "week-event " + getColorClass(getEventColorKey(eventItem));
        if (eventItem.id === appState.selectedEventId) block.classList.add("selected-event");
        block.innerHTML =
          renderGoalIcon(eventItem, "event-icon") +
          '<span class="event-chip-text">' +
          '<span>' + escapeHtml(truncateCalendarTitle(eventItem.title, 15)) + '</span>' +
          "<small>" + escapeHtml(getEventTimeLabel(eventItem)) + "</small></span>";
        block.addEventListener("click", (clickEvent) => {
          clickEvent.stopPropagation();
          selectEventForEditing(eventItem.id);
        });
        slot.appendChild(block);
      });

      slot.addEventListener("click", () => setSlotForEditing(dateKey, hour));
      slot.addEventListener("dragover", (dragEvent) => {
        dragEvent.preventDefault();
        slot.classList.add("drag-over");
      });
      slot.addEventListener("dragleave", () => slot.classList.remove("drag-over"));
      slot.addEventListener("drop", handleWeekDrop);
      row.appendChild(slot);
    });

    weekGrid.appendChild(row);
  }
}

function renderDayView() {
  const dateObj = appState.selectedDate ? new Date(appState.selectedDate + "T00:00:00") : new Date();
  const dateKey = toDateKeyFromDate(dateObj);
  if (!appState.selectedDate) appState.selectedDate = dateKey;

  monthLabel.textContent = new Intl.DateTimeFormat("sr-Latn-RS", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(dateObj);
  dayHeaderRow.textContent = "Klikni satnicu za beleške. Klikni događaj da uređuješ beleške za taj cilj.";
  dayTimeline.innerHTML = "";

  for (let hour = HOURS_START; hour <= HOURS_END; hour += 1) {
    const row = document.createElement("div");
    row.className = "day-row";
    const hourLabel = document.createElement("div");
    hourLabel.className = "day-hour-label";
    hourLabel.textContent = String(hour).padStart(2, "0") + ":00";
    const slot = document.createElement("div");
    slot.className = "day-slot";
    slot.dataset.date = dateKey;
    slot.dataset.hour = String(hour);
    if (appState.selectedDate === dateKey && appState.selectedSlotHour === hour) slot.classList.add("selected-date");

    getEventsForDateHour(dateKey, hour).forEach((eventItem) => {
      const block = document.createElement("button");
      block.type = "button";
      block.className = "day-event-block " + getColorClass(getEventColorKey(eventItem));
      if (eventItem.id === appState.selectedEventId) block.classList.add("selected-event");
      block.innerHTML =
        renderGoalIcon(eventItem, "event-icon") +
        '<span class="event-chip-text">' +
        '<span>' + escapeHtml(eventItem.title) + '</span>' +
        "<small>" + escapeHtml(getEventTimeLabel(eventItem)) + "</small></span>";
      block.addEventListener("click", (clickEvent) => {
        clickEvent.stopPropagation();
        selectEventForEditing(eventItem.id);
      });
      slot.appendChild(block);
    });

    slot.addEventListener("click", () => setSlotForEditing(dateKey, hour));
    slot.addEventListener("dragover", (dragEvent) => {
      dragEvent.preventDefault();
      slot.classList.add("drag-over");
    });
    slot.addEventListener("dragleave", () => slot.classList.remove("drag-over"));
    slot.addEventListener("drop", handleDayDrop);
    row.appendChild(hourLabel);
    row.appendChild(slot);
    dayTimeline.appendChild(row);
  }
}

function renderCalendar() {
  if (appState.currentView === "month") renderMonthView();
  else if (appState.currentView === "week") renderWeekView();
  else renderDayView();

  renderDayDetails();
  renderGoalDetails();
}

function saveSelectedEventChanges() {
  // Save edit logic: write title, time, first action, and notes back into calendarEvents.
  const eventItem = getEventById(appState.selectedEventId);
  if (!eventItem) return;

  const previousTitle = eventItem.title || "";
  const titleInput = document.getElementById("detailTitleInput");
  const timeInput = document.getElementById("detailTimeInput");
  const actionInput = document.getElementById("detailActionInput");
  const notesInput = document.getElementById("eventNotesInput");
  const normalizedTime = normalizeTime(timeInput ? timeInput.value : eventItem.time) || eventItem.time || "09:00";
  const titleValue = String(titleInput ? titleInput.value : eventItem.title).trim() || eventItem.title;
  const actionValue = String(actionInput ? actionInput.value : eventItem.firstAction).trim();

  eventItem.title = titleValue;
  eventItem.time = normalizedTime;
  eventItem.firstAction = actionValue;
  if (eventItem.actionId && actionValue && titleValue === previousTitle) {
    eventItem.title = actionValue;
  }
  eventItem.notes = String(notesInput ? notesInput.value : "").trim();
  const eventActions = getEventTaskActions(eventItem);
  if (eventActions[0] && actionValue) eventActions[0].title = actionValue;
  const eventNotes = ensureEventNotes(eventItem);
  if (eventNotes[0]) eventNotes[0].text = eventItem.notes;
  appState.selectedSlotHour = Number(normalizedTime.slice(0, 2));

  renderGoalPool();
  renderCalendar();
}

function navigateCalendar(step) {
  if (appState.currentView === "month") {
    calendarCursor.setMonth(calendarCursor.getMonth() + step);
    renderCalendar();
    return;
  }

  const anchor = getAnchorDate();
  anchor.setDate(anchor.getDate() + step * (appState.currentView === "week" ? 7 : 1));
  appState.selectedDate = toDateKeyFromDate(anchor);
  calendarCursor = new Date(anchor);
  calendarCursor.setDate(1);
  renderCalendar();
}

monthViewBtn.addEventListener("click", () => setCalendarMode("month"));
weekViewBtn.addEventListener("click", () => setCalendarMode("week"));
dayViewBtn.addEventListener("click", () => setCalendarMode("day"));
prevMonthBtn.addEventListener("click", () => navigateCalendar(-1));
nextMonthBtn.addEventListener("click", () => navigateCalendar(1));

if (goalDetailPanel) {
  goalDetailPanel.addEventListener("click", (event) => {
    if (event.target.id === "saveEventChangesBtn") saveSelectedEventChanges();
    if (event.target.id === "deleteEventBtn" && appState.selectedEventId) deleteCalendarEvent(appState.selectedEventId);
    if (event.target.id === "deleteGoalFromDetailsBtn" && appState.selectedGoalId) deleteGoal(appState.selectedGoalId);
  });
}

dayEventsList.addEventListener("click", (event) => {
  const deleteButton = event.target.closest ? event.target.closest(".event-delete-btn") : null;
  if (!deleteButton) return;
  event.stopPropagation();
  deleteCalendarEvent(deleteButton.dataset.eventId);
});

goalPool.addEventListener("click", (event) => {
  const deleteButton = event.target.closest ? event.target.closest(".goal-delete-btn") : null;
  if (deleteButton) {
    event.stopPropagation();
    deleteGoal(deleteButton.dataset.goalId);
    return;
  }

  const longGoalHead = event.target.closest ? event.target.closest(".long-goal-head") : null;
  if (longGoalHead) {
    event.stopPropagation();
    const goalId = longGoalHead.dataset.goalId;
    if (!Array.isArray(appState.expandedGoalIds)) {
      appState.expandedGoalIds = [];
    }
    appState.selectedGoalId = goalId;
    appState.selectedActionId = null;
    if (appState.expandedGoalIds.includes(goalId)) {
      appState.expandedGoalIds = appState.expandedGoalIds.filter((id) => id !== goalId);
    } else {
      appState.expandedGoalIds.push(goalId);
    }
    renderGoalPool();
    return;
  }

  const actionRow = event.target.closest ? event.target.closest(".long-action-row") : null;
  if (actionRow) {
    const goal = getGoalById(actionRow.dataset.goalId);
    if (!goal) return;
    if (!Array.isArray(appState.expandedGoalIds)) {
      appState.expandedGoalIds = [];
    }
    if (!appState.expandedGoalIds.includes(goal.id)) {
      appState.expandedGoalIds.push(goal.id);
    }
    appState.selectedGoalId = goal.id;
    appState.selectedActionId = actionRow.dataset.actionId;
    renderGoalPool();
    return;
  }

  const goalButton = event.target.closest ? event.target.closest("[data-goal-id]") : null;
  if (goalButton) {
    selectGoalForDetails(goalButton.dataset.goalId);
  }
});

goalPool.addEventListener("dragstart", (event) => {
  const actionRow = event.target.closest ? event.target.closest(".long-action-row") : null;
  const shortGoal = event.target.closest ? event.target.closest(".short-goal-strip") : null;
  if (!actionRow && !shortGoal) return;
  const goalId = actionRow ? actionRow.dataset.goalId : shortGoal.dataset.goalId;
  event.dataTransfer.setData("text/plain", goalId);
  if (actionRow) event.dataTransfer.setData("application/x-goal-action", actionRow.dataset.actionId);
  event.dataTransfer.effectAllowed = "copy";
  (actionRow || shortGoal).classList.add("dragging");
});

goalPool.addEventListener("dragend", (event) => {
  const actionRow = event.target.closest ? event.target.closest(".long-action-row") : null;
  const shortGoal = event.target.closest ? event.target.closest(".short-goal-strip") : null;
  if (actionRow) actionRow.classList.remove("dragging");
  if (shortGoal) shortGoal.classList.remove("dragging");
});

if (goalDeckFilters) {
  goalDeckFilters.addEventListener("click", (event) => {
    const filterButton = event.target.closest ? event.target.closest(".goal-filter-btn") : null;
    if (!filterButton) return;
    appState.goalDeckFilter = filterButton.dataset.filter || "all";
    if (goalTypeSelect) goalTypeSelect.value = appState.goalDeckFilter;
    renderGoalPool();
  });
}

if (goalTypeSelect) {
  goalTypeSelect.addEventListener("change", () => {
    appState.goalDeckFilter = goalTypeSelect.value || "all";
    renderGoalPool();
  });
}

if (createGoalFromPlannerBtn) {
  createGoalFromPlannerBtn.addEventListener("click", () => {
    if (typeof setView === "function") setView("builder");
  });
}

document.querySelectorAll(".goal-focus-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    appState.goalFocusTab = tab.dataset.goalTab || "overview";
    renderGoalFocusPanel();
  });
});

if (goalFocusTabPanel) {
  goalFocusTabPanel.addEventListener("click", (event) => {
    const deleteSelectedEvent = event.target.closest ? event.target.closest("[data-delete-selected-event]") : null;
    if (deleteSelectedEvent && appState.selectedEventId) {
      deleteCalendarEvent(appState.selectedEventId);
      return;
    }

    const actionCheck = event.target.closest ? event.target.closest("[data-task-action-check]") : null;
    if (actionCheck) {
      const selectedEvent = getSelectedEvent();
      if (selectedEvent) {
        const eventAction = getEventTaskActions(selectedEvent).find((item) => item.id === actionCheck.dataset.taskActionCheck);
        if (!eventAction) return;
        eventAction.completed = actionCheck.checked;
        selectedEvent.completed = getEventTaskActions(selectedEvent).every((item) => item.completed);
        renderGoalPool();
        renderCalendar();
        renderGoalFocusPanel();
        return;
      }

      const goal = getSelectedGoal();
      const task = goal ? getSelectedAction(goal) : null;
      const taskAction = task ? getTaskActions(task).find((item) => item.id === actionCheck.dataset.taskActionCheck) : null;
      if (!taskAction) return;
      taskAction.completed = actionCheck.checked;
      renderGoalPool();
      return;
    }

    const addTaskAction = event.target.closest ? event.target.closest("[data-add-task-action]") : null;
    if (addTaskAction) {
      const selectedEvent = getSelectedEvent();
      if (selectedEvent) {
        const title = window.prompt("Naziv akcije za ovaj unos", "Nova akcija");
        if (!title || !title.trim()) return;
        const cadence = window.prompt("Ritam akcije", "Po planu") || "Po planu";
        getEventTaskActions(selectedEvent).push({
          id: selectedEvent.id + "-action-" + Date.now(),
          title: title.trim(),
          cadence: cadence.trim() || "Po planu",
          completed: false
        });
        appState.goalFocusTab = "actions";
        renderCalendar();
        renderGoalFocusPanel();
        return;
      }

      const goal = getSelectedGoal();
      const task = goal ? getSelectedAction(goal) : null;
      if (!goal || !task) return;
      const title = window.prompt("Naziv akcije za ovaj zadatak", "Nova akcija");
      if (!title || !title.trim()) return;
      const cadence = window.prompt("Ritam akcije", "Po planu") || "Po planu";
      const taskAction = {
        id: task.id + "-task-action-" + Date.now(),
        title: title.trim(),
        cadence: cadence.trim() || "Po planu",
        completed: false
      };
      getTaskActions(task).push(taskAction);
      appState.selectedGoalId = goal.id;
      appState.selectedActionId = task.id;
      appState.goalFocusTab = "actions";
      renderGoalPool();
      return;
    }

    const addGoalNote = event.target.closest ? event.target.closest("[data-add-goal-note]") : null;
    if (addGoalNote) {
      const selectedEvent = getSelectedEvent();
      if (selectedEvent) {
        const notes = ensureEventNotes(selectedEvent);
        if (hasDuplicateNoteTitle(notes, "Nova beleska")) {
          showGoalNoteWarning("Vec postoji beleska sa tim imenom.");
          return;
        }
        const note = {
          id: selectedEvent.id + "-note-" + Date.now(),
          title: "Nova beleska",
          text: "",
          createdAt: new Date().toISOString()
        };
        notes.unshift(note);
        appState.selectedGoalNoteId = note.id;
        renderGoalFocusPanel();
        return;
      }

      const goal = getSelectedGoal();
      if (!goal) return;
      const notes = ensureGoalNotes(goal);
      if (hasDuplicateNoteTitle(notes, "Nova beleska")) {
        showGoalNoteWarning("Vec postoji beleska sa tim imenom.");
        return;
      }
      const note = {
        id: goal.id + "-note-" + Date.now(),
        title: "Nova beleska",
        text: "",
        createdAt: new Date().toISOString()
      };
      notes.unshift(note);
      appState.selectedGoalNoteId = note.id;
      renderGoalFocusPanel();
      return;
    }

    const deleteGoalNote = event.target.closest ? event.target.closest("[data-delete-goal-note]") : null;
    if (deleteGoalNote) {
      const selectedEvent = getSelectedEvent();
      if (selectedEvent) {
        const notes = ensureEventNotes(selectedEvent);
        if (notes.length <= 1) {
          notes[0].title = "";
          notes[0].text = "";
          appState.selectedGoalNoteId = notes[0].id;
        } else {
          const noteIndex = notes.findIndex((note) => note.id === appState.selectedGoalNoteId);
          if (noteIndex >= 0) notes.splice(noteIndex, 1);
          appState.selectedGoalNoteId = notes[Math.max(0, noteIndex - 1)].id;
        }
        selectedEvent.notes = notes.map((note) => note.text).filter(Boolean).join("\n\n");
        renderGoalFocusPanel();
        return;
      }

      const goal = getSelectedGoal();
      if (!goal) return;
      const notes = ensureGoalNotes(goal);
      if (notes.length <= 1) {
        notes[0].title = "";
        notes[0].text = "";
        appState.selectedGoalNoteId = notes[0].id;
      } else {
        const noteIndex = notes.findIndex((note) => note.id === appState.selectedGoalNoteId);
        if (noteIndex >= 0) notes.splice(noteIndex, 1);
        appState.selectedGoalNoteId = notes[Math.max(0, noteIndex - 1)].id;
      }
      renderGoalFocusPanel();
      return;
    }

    const noteButton = event.target.closest ? event.target.closest("[data-goal-note-id]") : null;
    if (noteButton) {
      appState.selectedGoalNoteId = noteButton.dataset.goalNoteId;
      renderGoalFocusPanel();
      return;
    }

    const tabAction = event.target.closest ? event.target.closest("[data-goal-tab-action]") : null;
    if (tabAction) {
      appState.goalFocusTab = tabAction.dataset.goalTabAction || "overview";
      renderGoalFocusPanel();
      return;
    }

    const actionButton = event.target.closest ? event.target.closest(".focus-action-row") : null;
    if (actionButton) {
      if (actionButton.dataset.taskActionId) return;
      renderGoalPool();
      return;
    }
  });

  goalFocusTabPanel.addEventListener("input", (event) => {
    if (!event.target.matches || (!event.target.matches("#goalNoteTitleInput") && !event.target.matches("#goalNoteTextInput"))) return;
    const selectedEvent = getSelectedEvent();
    if (selectedEvent) {
      const note = getSelectedEventNote(selectedEvent);
      if (!note) return;

      if (event.target.matches("#goalNoteTitleInput")) {
        const nextTitle = cleanNoteTitle(event.target.value);
        const notes = ensureEventNotes(selectedEvent);
        if (hasDuplicateNoteTitle(notes, nextTitle, note.id)) {
          showGoalNoteWarning("Vec postoji beleska sa tim imenom.");
          event.target.value = note.title || "";
          return;
        }
        showGoalNoteWarning("");
        note.title = nextTitle;
        const activeItemTitle = goalFocusTabPanel.querySelector(".goal-note-list-item.active strong");
        if (activeItemTitle) activeItemTitle.textContent = note.title || "Beleska";
        return;
      }

      note.text = event.target.value;
      selectedEvent.notes = ensureEventNotes(selectedEvent).map((item) => item.text).filter(Boolean).join("\n\n");
      const activeItemExcerpt = goalFocusTabPanel.querySelector(".goal-note-list-item.active small");
      if (activeItemExcerpt) activeItemExcerpt.textContent = getNoteExcerpt(note);
      return;
    }

    const goal = getSelectedGoal();
    const note = goal ? getSelectedGoalNote(goal) : null;
    if (!note) return;

    if (event.target.matches("#goalNoteTitleInput")) {
      const nextTitle = cleanNoteTitle(event.target.value);
      const notes = ensureGoalNotes(goal);
      if (hasDuplicateNoteTitle(notes, nextTitle, note.id)) {
        showGoalNoteWarning("Vec postoji beleska sa tim imenom.");
        event.target.value = note.title || "";
        return;
      }
      showGoalNoteWarning("");
      note.title = nextTitle;
      const activeItemTitle = goalFocusTabPanel.querySelector(".goal-note-list-item.active strong");
      if (activeItemTitle) activeItemTitle.textContent = note.title || "Beleska";
      return;
    }

    note.text = event.target.value;
    const activeItemExcerpt = goalFocusTabPanel.querySelector(".goal-note-list-item.active small");
    if (activeItemExcerpt) activeItemExcerpt.textContent = getNoteExcerpt(note);
  });

  goalFocusTabPanel.addEventListener("submit", (event) => {
    if (!event.target.matches || !event.target.matches("#goalEditForm")) return;
    event.preventDefault();

    const selectedEvent = getSelectedEvent();
    if (selectedEvent) {
      const formData = new FormData(event.target);
      const nextDate = String(formData.get("date") || selectedEvent.date).trim() || selectedEvent.date;
      if (isPastDateKey(nextDate)) {
        window.alert("Cilj možeš da pomeriš samo na današnji datum ili na buduće datume.");
        return;
      }

      selectedEvent.title = String(formData.get("title") || selectedEvent.title).trim() || selectedEvent.title;
      selectedEvent.date = nextDate;
      selectedEvent.time = normalizeTime(String(formData.get("time") || selectedEvent.time)) || selectedEvent.time || "09:00";
      selectedEvent.goalType = String(formData.get("goalType") || "").trim();
      selectedEvent.reason = String(formData.get("reason") || "").trim();
      selectedEvent.firstAction = String(formData.get("firstAction") || "").trim();
      selectedEvent.successMeasurement = String(formData.get("successMeasurement") || "").trim();
      const eventActions = getEventTaskActions(selectedEvent);
      if (eventActions[0] && selectedEvent.firstAction) eventActions[0].title = selectedEvent.firstAction;
      appState.selectedDate = selectedEvent.date;
      appState.selectedSlotHour = Number(selectedEvent.time.slice(0, 2));
      appState.goalFocusTab = "overview";
      renderCalendar();
      renderGoalFocusPanel();
      return;
    }

    const goal = getSelectedGoal();
    if (!goal) return;

    const formData = new FormData(event.target);
    const primaryAction = getPrimaryGoalAction(goal);
    goal.title = String(formData.get("title") || goal.title).trim() || goal.title;
    goal.category = String(formData.get("category") || goal.category);
    goal.categoryName = categoryLabel(goal.category);
    goal.goalType = String(formData.get("goalType") || "").trim();
    goal.reason = String(formData.get("reason") || "").trim();
    goal.firstAction = String(formData.get("firstAction") || "").trim();
    goal.successMeasurement = String(formData.get("successMeasurement") || "").trim();

    if (goal.type === "long-term") goal.targetDate = String(formData.get("targetDate") || "").trim() || null;
    if (goal.type === "short-term") goal.duration = String(formData.get("duration") || "").trim() || null;
    if (goal.type === "habit") goal.frequency = String(formData.get("frequency") || "").trim() || null;

    if (primaryAction && goal.firstAction) {
      primaryAction.title = goal.firstAction;
    }

    appState.goalFocusTab = "overview";
    renderGoalPool();
    renderCalendar();
  });
}

document.addEventListener("keydown", (event) => {
  if (!isDeleteKeyboardEvent(event) || isCalendarTypingTarget(event.target)) return;
  if (document.body.dataset.activeView !== "planner") return;

  if (appState.selectedEventId) {
    event.preventDefault();
    deleteCalendarEvent(appState.selectedEventId);
    return;
  }

  if (appState.selectedGoalId) {
    event.preventDefault();
    deleteGoal(appState.selectedGoalId);
  }
});

function isCalendarTypingTarget(target) {
  if (!target || !target.tagName) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
}

function isDeleteKeyboardEvent(event) {
  return event.key === "Delete" || event.key === "Del" || event.code === "Delete" || event.keyCode === 46 || event.which === 46;
}

window.CalendarPlanner = {
  renderGoalPool,
  renderCalendar,
  setCalendarMode,
  resetPlannerView,
  deleteCalendarEvent,
  deleteGoal
};

setCalendarMode("month");
renderGoalPool();
renderCalendar();
