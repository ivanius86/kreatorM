(function (root) {
  "use strict";

  const namespace = root.MentorDataPhase0 = root.MentorDataPhase0 || {};
  const GOALS_KEY = "mentor_goals_v1";
  const CALENDAR_KEY = "mentor_calendar_events_v1";
  const VERSION = 1;
  const GOAL_TYPES = new Set(["long-term", "short-term", "habit"]);
  const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
  const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
  const sources = Object.freeze([
    Object.freeze({
      key: GOALS_KEY,
      owner: "goals",
      format: "json",
      role: "primary",
      canonicalDomain: "goals",
      canonicalStore: "goals",
      version: VERSION
    }),
    Object.freeze({
      key: CALENDAR_KEY,
      owner: "calendar",
      format: "json",
      role: "primary",
      canonicalDomain: "calendar",
      canonicalStore: "calendarEvents",
      version: VERSION
    })
  ]);

  function clone(value) {
    if (value === undefined) return undefined;
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function isObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function nonEmpty(value) {
    return String(value ?? "").trim() !== "";
  }

  function normalizeNotes(notes, errors, path) {
    if (notes === undefined) return [];
    if (!Array.isArray(notes)) {
      errors.push(`NOTES_ARRAY_REQUIRED:${path}`);
      return [];
    }
    const ids = new Set();
    return notes.map((note, index) => {
      const next = isObject(note) ? clone(note) : {};
      if (!isObject(note)) errors.push(`NOTE_OBJECT_REQUIRED:${path}:${index}`);
      if (!nonEmpty(next.id)) errors.push(`NOTE_ID_REQUIRED:${path}:${index}`);
      else if (ids.has(String(next.id))) errors.push(`NOTE_ID_DUPLICATE:${path}:${next.id}`);
      else ids.add(String(next.id));
      return next;
    });
  }

  function normalizeTaskActions(actions, errors, path) {
    if (actions === undefined) return [];
    if (!Array.isArray(actions)) {
      errors.push(`TASK_ACTIONS_ARRAY_REQUIRED:${path}`);
      return [];
    }
    const ids = new Set();
    return actions.map((action, index) => {
      const next = isObject(action) ? clone(action) : {};
      if (!isObject(action)) errors.push(`TASK_ACTION_OBJECT_REQUIRED:${path}:${index}`);
      if (!nonEmpty(next.id)) errors.push(`TASK_ACTION_ID_REQUIRED:${path}:${index}`);
      else if (ids.has(String(next.id))) errors.push(`TASK_ACTION_ID_DUPLICATE:${path}:${next.id}`);
      else ids.add(String(next.id));
      return next;
    });
  }

  function normalizeGoal(goal, index, errors) {
    const next = isObject(goal) ? clone(goal) : {};
    const path = `goals:${index}`;
    if (!isObject(goal)) errors.push(`GOAL_OBJECT_REQUIRED:${index}`);
    if (!nonEmpty(next.id)) errors.push(`GOAL_ID_REQUIRED:${index}`);
    if (!nonEmpty(next.title)) errors.push(`GOAL_TITLE_REQUIRED:${next.id || index}`);
    if (!GOAL_TYPES.has(next.type)) errors.push(`GOAL_TYPE_INVALID:${next.id || index}`);
    if (next.actions === undefined) next.actions = [];
    if (!Array.isArray(next.actions)) {
      errors.push(`GOAL_ACTIONS_ARRAY_REQUIRED:${next.id || index}`);
      next.actions = [];
    }
    const actionIds = new Set();
    next.actions = next.actions.map((action, actionIndex) => {
      const normalized = isObject(action) ? clone(action) : {};
      if (!isObject(action)) errors.push(`GOAL_ACTION_OBJECT_REQUIRED:${path}:${actionIndex}`);
      if (!nonEmpty(normalized.id)) errors.push(`GOAL_ACTION_ID_REQUIRED:${path}:${actionIndex}`);
      else if (actionIds.has(String(normalized.id))) errors.push(`GOAL_ACTION_ID_DUPLICATE:${next.id}:${normalized.id}`);
      else actionIds.add(String(normalized.id));
      normalized.actions = normalizeTaskActions(
        normalized.actions,
        errors,
        `${path}:actions:${normalized.id || actionIndex}`
      );
      return normalized;
    });
    next.notesList = normalizeNotes(next.notesList, errors, `${path}:notes`);
    return next;
  }

  function normalizeGoalsDocument(value) {
    const errors = [];
    if (!isObject(value)) return { valid: false, errors: ["GOALS_DOCUMENT_REQUIRED"], value: null };
    if (value.version !== VERSION) errors.push("GOALS_VERSION_UNSUPPORTED");
    if (!Array.isArray(value.goals)) errors.push("GOALS_ARRAY_REQUIRED");
    const goals = Array.isArray(value.goals)
      ? value.goals.map((goal, index) => normalizeGoal(goal, index, errors))
      : [];
    const ids = new Set();
    goals.forEach((goal, index) => {
      if (!nonEmpty(goal.id)) return;
      if (ids.has(String(goal.id))) errors.push(`GOAL_ID_DUPLICATE:${goal.id}:${index}`);
      ids.add(String(goal.id));
    });
    return {
      valid: errors.length === 0,
      errors,
      value: { ...clone(value), version: VERSION, goals }
    };
  }

  function normalizeEvent(eventItem, index, errors) {
    const next = isObject(eventItem) ? clone(eventItem) : {};
    if (!isObject(eventItem)) errors.push(`CALENDAR_EVENT_OBJECT_REQUIRED:${index}`);
    if (!nonEmpty(next.id)) errors.push(`CALENDAR_EVENT_ID_REQUIRED:${index}`);
    if (!nonEmpty(next.goalId)) errors.push(`CALENDAR_GOAL_ID_REQUIRED:${next.id || index}`);
    if (!DATE_PATTERN.test(String(next.date || ""))) errors.push(`CALENDAR_DATE_INVALID:${next.id || index}`);
    if (!TIME_PATTERN.test(String(next.time || ""))) errors.push(`CALENDAR_TIME_INVALID:${next.id || index}`);
    next.actionId = nonEmpty(next.actionId) ? next.actionId : null;
    next.actions = normalizeTaskActions(next.actions, errors, `calendar:${next.id || index}:actions`);
    next.notesList = normalizeNotes(next.notesList, errors, `calendar:${next.id || index}:notes`);
    return next;
  }

  function normalizeCalendarDocument(value) {
    const errors = [];
    if (!isObject(value)) return { valid: false, errors: ["CALENDAR_DOCUMENT_REQUIRED"], value: null };
    if (value.version !== VERSION) errors.push("CALENDAR_VERSION_UNSUPPORTED");
    if (!Array.isArray(value.events)) errors.push("CALENDAR_EVENTS_ARRAY_REQUIRED");
    const events = Array.isArray(value.events)
      ? value.events.map((eventItem, index) => normalizeEvent(eventItem, index, errors))
      : [];
    const ids = new Set();
    events.forEach((eventItem, index) => {
      if (!nonEmpty(eventItem.id)) return;
      if (ids.has(String(eventItem.id))) errors.push(`CALENDAR_EVENT_ID_DUPLICATE:${eventItem.id}:${index}`);
      ids.add(String(eventItem.id));
    });
    return {
      valid: errors.length === 0,
      errors,
      value: { ...clone(value), version: VERSION, events }
    };
  }

  function validateReferences(goalsDocument, calendarDocument) {
    const errors = [];
    const goals = new Map((goalsDocument?.goals || []).map((goal) => [String(goal.id), goal]));
    const schedules = new Set();
    (calendarDocument?.events || []).forEach((eventItem) => {
      const goal = goals.get(String(eventItem.goalId));
      if (!goal) {
        errors.push(`CALENDAR_GOAL_ORPHAN:${eventItem.id}:${eventItem.goalId}`);
      } else if (eventItem.actionId !== null) {
        const actionExists = (goal.actions || []).some(
          (action) => String(action.id) === String(eventItem.actionId)
        );
        if (!actionExists) errors.push(`CALENDAR_ACTION_ORPHAN:${eventItem.id}:${eventItem.actionId}`);
      }
      const scheduleKey = [
        String(eventItem.goalId),
        eventItem.actionId === null ? "" : String(eventItem.actionId),
        String(eventItem.date),
        String(eventItem.time)
      ].join("\u001f");
      if (schedules.has(scheduleKey)) {
        errors.push(`CALENDAR_SCHEDULE_DUPLICATE:${eventItem.id}`);
      } else {
        schedules.add(scheduleKey);
      }
    });
    return { valid: errors.length === 0, errors };
  }

  function validateDocuments(goalsValue, calendarValue) {
    const goals = normalizeGoalsDocument(goalsValue);
    const calendar = normalizeCalendarDocument(calendarValue);
    const errors = [
      ...goals.errors.map((code) => `goals:${code}`),
      ...calendar.errors.map((code) => `calendar:${code}`)
    ];
    if (goals.value && calendar.value) {
      errors.push(...validateReferences(goals.value, calendar.value).errors);
    }
    return {
      valid: errors.length === 0,
      errors,
      goals: goals.value,
      calendar: calendar.value
    };
  }

  function parseSnapshotEntry(snapshot, source, emptyValue) {
    const entry = (snapshot?.entries || []).find((item) => item.key === source.key);
    if (!entry || entry.present === false) {
      return {
        entry,
        present: false,
        parseStatus: "notAttempted",
        value: clone(emptyValue),
        errors: []
      };
    }
    if (entry.readStatus !== "ok") {
      return {
        entry,
        present: true,
        parseStatus: "notAttempted",
        value: null,
        errors: [entry.errorCode || "READ_FAILED"]
      };
    }
    try {
      return {
        entry,
        present: true,
        parseStatus: "valid",
        value: JSON.parse(entry.raw),
        errors: []
      };
    } catch (_) {
      return {
        entry,
        present: true,
        parseStatus: "invalid",
        value: null,
        errors: ["INVALID_JSON"]
      };
    }
  }

  function normalizeSnapshot(snapshot) {
    const goalsCandidate = parseSnapshotEntry(snapshot, sources[0], {
      version: VERSION,
      updatedAt: null,
      goals: []
    });
    const calendarCandidate = parseSnapshotEntry(snapshot, sources[1], {
      version: VERSION,
      updatedAt: null,
      events: []
    });
    const goalsValidation = goalsCandidate.value
      ? normalizeGoalsDocument(goalsCandidate.value)
      : { valid: false, errors: [], value: null };
    const calendarValidation = calendarCandidate.value
      ? normalizeCalendarDocument(calendarCandidate.value)
      : { valid: false, errors: [], value: null };
    const referenceValidation = goalsValidation.value && calendarValidation.value
      ? validateReferences(goalsValidation.value, calendarValidation.value)
      : { valid: false, errors: [] };
    const errors = [
      ...goalsCandidate.errors.map((code) => `goals:${code}`),
      ...calendarCandidate.errors.map((code) => `calendar:${code}`),
      ...goalsValidation.errors.map((code) => `goals:${code}`),
      ...calendarValidation.errors.map((code) => `calendar:${code}`),
      ...referenceValidation.errors
    ];
    const validationEntries = [
      {
        key: GOALS_KEY,
        present: goalsCandidate.present,
        readStatus: goalsCandidate.entry?.readStatus || "ok",
        parseStatus: goalsCandidate.parseStatus,
        validationStatus: goalsValidation.value && !errors.some((code) => code.startsWith("goals:")) ? "valid" : "invalid",
        errors: errors.filter((code) => code.startsWith("goals:") || code.startsWith("CALENDAR_"))
      },
      {
        key: CALENDAR_KEY,
        present: calendarCandidate.present,
        readStatus: calendarCandidate.entry?.readStatus || "ok",
        parseStatus: calendarCandidate.parseStatus,
        validationStatus: calendarValidation.value && !errors.some((code) => code.startsWith("calendar:") || code.startsWith("CALENDAR_")) ? "valid" : "invalid",
        errors: errors.filter((code) => code.startsWith("calendar:") || code.startsWith("CALENDAR_"))
      }
    ];
    return {
      domains: {
        ...(goalsValidation.value ? { goals: goalsValidation.value } : {}),
        ...(calendarValidation.value ? { calendar: calendarValidation.value } : {})
      },
      validationEntries,
      recovery: errors.length
        ? [{
          domain: "goalsCalendar",
          status: "recoveryRequired",
          allowsEmptyActivation: false,
          sourceKeys: sources.filter((source) => {
            const entry = (snapshot?.entries || []).find((item) => item.key === source.key);
            return entry?.present === true;
          }).map((source) => source.key),
          errors: errors.map((code) => ({ code }))
        }]
        : [],
      recoveryRequired: errors.length > 0
    };
  }

  function captureLocalStorageSnapshot(storage, baseSnapshot, now) {
    if (!storage || typeof storage.getItem !== "function") {
      const error = new Error("A readable localStorage implementation is required.");
      error.code = "LOCAL_STORAGE_UNAVAILABLE";
      throw error;
    }
    const capturedAt = baseSnapshot?.capturedAt || (now || (() => new Date().toISOString()))();
    const ownedKeys = new Set(sources.map((source) => source.key));
    const entries = (baseSnapshot?.entries || [])
      .filter((entry) => !ownedKeys.has(entry.key))
      .map(clone);
    sources.forEach((source) => {
      try {
        const raw = storage.getItem(source.key);
        entries.push({ source, key: source.key, present: raw !== null, raw, readStatus: "ok" });
      } catch (error) {
        entries.push({
          source,
          key: source.key,
          present: null,
          raw: null,
          readStatus: "failed",
          errorCode: error?.name || "LOCAL_STORAGE_READ_FAILED"
        });
      }
    });
    return {
      sourceType: "localStorage",
      capturedAt,
      entries
    };
  }

  async function prepareCompleteBackup(input, options) {
    const baseSnapshot = input.localStorageSnapshot || namespace.LegacyStorageReader.readLocalStorageSnapshot(
      input.storage,
      namespace.LegacyStorageRegistry.localStorageSources,
      input.now
    );
    const completeSnapshot = captureLocalStorageSnapshot(input.storage, baseSnapshot, input.now);
    return namespace.LegacyBackupPreparationService.prepareLegacyBackup({
      ...input,
      localStorageSnapshot: completeSnapshot
    }, options);
  }

  namespace.GoalsCalendarBackupService = Object.freeze({
    keys: Object.freeze({ goals: GOALS_KEY, calendar: CALENDAR_KEY }),
    sources,
    captureLocalStorageSnapshot,
    normalizeSnapshot,
    normalizeGoalsDocument,
    normalizeCalendarDocument,
    validateReferences,
    validateDocuments,
    prepareCompleteBackup
  });
})(typeof window !== "undefined" ? window : globalThis);
