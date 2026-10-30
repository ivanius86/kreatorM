(function (root) {
  "use strict";

  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const NOTE_DEBOUNCE_MS = 500;
  let commandQueue = Promise.resolve();
  let noteFlushTimer = null;
  let noteFlushQueue = Promise.resolve([]);
  let noteFlushInFlight = null;
  const pendingNoteUpdates = new Map();

  function repositories() {
    const goals = root.MentorData?.repositories?.goals;
    const calendar = root.MentorData?.repositories?.calendar;
    if (!goals || !calendar) throw new Error("Goals and Calendar repositories are required.");
    return { goals, calendar };
  }

  function enqueue(operation) {
    const command = commandQueue.then(operation);
    commandQueue = command.catch(() => undefined);
    return command;
  }

  function syncGoals(appState, goals) {
    const durable = goals.getAll();
    const templates = Array.isArray(root.GOAL_SAMPLE_TEMPLATES) ? root.GOAL_SAMPLE_TEMPLATES : [];
    appState.goals = typeof root.MentorGoalsService?.composeGoalView === "function"
      ? root.MentorGoalsService.composeGoalView(durable)
      : (durable.length ? durable : clone(templates));
  }

  function syncCalendar(appState, calendar) {
    appState.calendarEvents = calendar.getAll();
  }

  function findGoal(goalId, appState, goals) {
    return (Array.isArray(appState?.goals)
      ? appState.goals.find((goal) => String(goal?.id) === String(goalId))
      : null) || goals.getById(goalId);
  }

  function goalTasks(goal) {
    if (Array.isArray(goal?.actions) && goal.actions.length) return clone(goal.actions);
    const titles = [];
    if (goal?.firstAction) titles.push(goal.firstAction);
    if (goal?.mainMilestone) titles.push(goal.mainMilestone);
    if (goal?.successMeasurement) titles.push("Proveri merilo uspeha");
    if (!titles.length) titles.push("Definisi prvi sledeci korak");
    return titles.slice(0, 5).map((title, index) => ({
      id: goal.id + "-action-" + index,
      title,
      cadence: index === 0 ? (goal.frequency || "Dnevno") : "Po planu",
      completed: false
    }));
  }

  function taskActions(task) {
    if (Array.isArray(task?.actions) && task.actions.length) return clone(task.actions);
    return [{
      id: task.id + "-task-action-0",
      title: task.title || "Pocetna akcija",
      cadence: task.cadence || "Po planu",
      completed: Boolean(task.completed)
    }];
  }

  function eventTaskActions(eventItem) {
    if (Array.isArray(eventItem?.actions) && eventItem.actions.length) return clone(eventItem.actions);
    return [{
      id: eventItem.id + "-action-0",
      title: eventItem.firstAction || eventItem.title || "Početna akcija",
      cadence: eventItem.frequency || "Po planu",
      completed: Boolean(eventItem.completed)
    }];
  }

  function goalNotes(goal) {
    if (Array.isArray(goal?.notesList) && goal.notesList.length) return clone(goal.notesList);
    return [{
      id: goal.id + "-note-0",
      title: "",
      text: "",
      createdAt: new Date().toISOString()
    }];
  }

  function eventNotes(eventItem) {
    if (Array.isArray(eventItem?.notesList) && eventItem.notesList.length) return clone(eventItem.notesList);
    return [{
      id: eventItem.id + "-note-0",
      title: "",
      text: eventItem.notes || "",
      createdAt: new Date().toISOString()
    }];
  }

  function assertUniqueNoteTitle(notes, noteId, title) {
    const normalized = String(title || "").trim().toLocaleLowerCase();
    if (!normalized) return;
    if (notes.some((note) => String(note.id) !== String(noteId)
      && String(note.title || "").trim().toLocaleLowerCase() === normalized)) {
      throw new root.MentorDataError(
        "DUPLICATE_NOTE_TITLE",
        "A note with this title already exists.",
        { noteId, title }
      );
    }
  }

  function mutateGoal(goalId, appState, mutation, selection = {}) {
    return enqueue(async () => {
      const { goals } = repositories();
      const source = findGoal(goalId, appState, goals);
      if (!source) {
        throw new root.MentorDataError("GOAL_NOT_FOUND", "Goal was not found.", { id: goalId });
      }

      const next = clone(source);
      const result = mutation(next);
      next.updatedAt = new Date().toISOString();
      let saved;
      if (root.MentorGoalsService?.isSampleTemplate?.(source)) {
        const patch = clone(next);
        delete patch.id;
        delete patch.createdAt;
        saved = await root.MentorGoalsService.saveGoal(source, patch, appState);
      } else {
        saved = await goals.upsert(next);
        syncGoals(appState, goals);
      }

      appState.selectedGoalId = saved.id;
      if (selection.actionId !== undefined) appState.selectedActionId = selection.actionId;
      if (selection.noteId !== undefined) appState.selectedGoalNoteId = selection.noteId;
      return { goal: clone(saved), result: clone(result) };
    });
  }

  function mutateEvent(eventId, appState, mutation, selection = {}) {
    return enqueue(async () => {
      const { calendar } = repositories();
      const source = calendar.getById(eventId);
      if (!source) {
        throw new root.MentorDataError("CALENDAR_EVENT_NOT_FOUND", "Calendar event was not found.", { id: eventId });
      }

      const next = clone(source);
      const result = mutation(next);
      next.updatedAt = new Date().toISOString();
      const saved = await calendar.upsert(next);
      syncCalendar(appState, calendar);
      appState.selectedEventId = saved.id;
      if (selection.noteId !== undefined) appState.selectedGoalNoteId = selection.noteId;
      return { event: clone(saved), result: clone(result) };
    });
  }

  async function hydrateAppState(appState) {
    const { goals, calendar } = repositories();
    await Promise.all([goals.initialize(), calendar.initialize()]);
    syncGoals(appState, goals);
    syncCalendar(appState, calendar);
    return {
      goals: clone(appState.goals),
      calendarEvents: clone(appState.calendarEvents)
    };
  }

  function scheduleEvents(events, appState, options = {}) {
    const additions = Array.isArray(events) ? clone(events) : [];
    const newlyMaterializedGoalId = options.newlyMaterializedGoalId || null;
    const newlyMaterializedGoal = options.newlyMaterializedGoal || null;
    return enqueue(async () => {
      const { goals, calendar } = repositories();
      const transactions = root.MentorData?.goalsCalendarTransactions;

      if (transactions?.scheduleEvents) {
        if (!additions.length) return [];
        const saved = await transactions.scheduleEvents(additions, newlyMaterializedGoal);
        syncGoals(appState, goals);
        syncCalendar(appState, calendar);
        return saved;
      }

      async function rollbackMaterializedGoal(triggerError, rethrowTrigger = true) {
        if (!newlyMaterializedGoalId) {
          if (rethrowTrigger) throw triggerError;
          return [];
        }
        try {
          await goals.remove(newlyMaterializedGoalId);
          syncGoals(appState, goals);
          syncCalendar(appState, calendar);
        } catch (rollbackError) {
          syncGoals(appState, goals);
          syncCalendar(appState, calendar);
          throw new root.MentorDataError(
            "DATA_RECOVERY_REQUIRED",
            "Sample goal rollback failed and requires recovery.",
            {
              domain: "goalsCalendar",
              goalId: newlyMaterializedGoalId,
              writeError: triggerError?.code || triggerError?.name || "CALENDAR_WRITE_FAILED",
              rollbackError: rollbackError?.code || rollbackError?.name || "GOAL_ROLLBACK_FAILED"
            }
          );
        }
        if (rethrowTrigger) throw triggerError;
        return [];
      }

      if (!additions.length) {
        if (!newlyMaterializedGoalId) return [];
        return rollbackMaterializedGoal(
          new root.MentorDataError("NO_CALENDAR_EVENTS_CREATED", "No calendar events were created."),
          false
        );
      }

      try {
        const saved = await calendar.createMany(additions);
        syncCalendar(appState, calendar);
        return saved;
      } catch (calendarError) {
        return rollbackMaterializedGoal(calendarError);
      }
    });
  }

  function updateEvent(id, patch, appState) {
    return enqueue(async () => {
      const { calendar } = repositories();
      const current = calendar.getById(id);
      if (!current) {
        throw new root.MentorDataError("CALENDAR_EVENT_NOT_FOUND", "Calendar event was not found.", { id });
      }
      const saved = await calendar.upsert({
        ...current,
        ...clone(patch || {}),
        id: current.id,
        createdAt: current.createdAt,
        updatedAt: new Date().toISOString()
      });
      syncCalendar(appState, calendar);
      return saved;
    });
  }

  function deleteEvent(id, appState) {
    return enqueue(async () => {
      const { calendar } = repositories();
      await calendar.remove(id);
      syncCalendar(appState, calendar);
    });
  }

  function deleteGoalCascade(goalId, appState) {
    return enqueue(async () => {
      const { goals, calendar } = repositories();
      const transactions = root.MentorData?.goalsCalendarTransactions;
      if (transactions?.deleteGoalCascade) {
        await transactions.deleteGoalCascade(goalId);
        syncGoals(appState, goals);
        syncCalendar(appState, calendar);
        return;
      }
      const previousGoals = goals.getAll();
      const previousEvents = calendar.getAll();
      const nextGoals = previousGoals.filter((goal) => String(goal?.id) !== String(goalId));
      const nextEvents = previousEvents.filter((event) => String(event?.goalId) !== String(goalId));

      await calendar.replaceAll(nextEvents);
      try {
        await goals.replaceAll(nextGoals);
      } catch (goalError) {
        try {
          await calendar.replaceAll(previousEvents);
        } catch (rollbackError) {
          syncGoals(appState, goals);
          syncCalendar(appState, calendar);
          throw new root.MentorDataError(
            "DATA_RECOVERY_REQUIRED",
            "Goal cascade rollback failed and requires recovery.",
            {
              domain: "goalsCalendar",
              goalId,
              writeError: goalError?.code || goalError?.name || "GOALS_WRITE_FAILED",
              rollbackError: rollbackError?.code || rollbackError?.name || "CALENDAR_ROLLBACK_FAILED"
            }
          );
        }
        syncGoals(appState, goals);
        syncCalendar(appState, calendar);
        throw goalError;
      }

      syncGoals(appState, goals);
      syncCalendar(appState, calendar);
    });
  }

  function toggleGoalTaskAction(goalId, taskId, taskActionId, completed, appState) {
    return mutateGoal(goalId, appState, (goal) => {
      const tasks = goalTasks(goal);
      const task = tasks.find((item) => String(item.id) === String(taskId));
      if (!task) {
        throw new root.MentorDataError("GOAL_TASK_NOT_FOUND", "Goal task was not found.", { goalId, taskId });
      }
      const actions = taskActions(task);
      const action = actions.find((item) => String(item.id) === String(taskActionId));
      if (!action) {
        throw new root.MentorDataError(
          "GOAL_TASK_ACTION_NOT_FOUND",
          "Goal task action was not found.",
          { goalId, taskId, taskActionId }
        );
      }
      action.completed = Boolean(completed);
      task.actions = actions;
      task.completed = actions.every((item) => item.completed);
      goal.actions = tasks;
      return action;
    }, { actionId: taskId });
  }

  function addGoalTaskAction(goalId, taskId, action, appState) {
    return mutateGoal(goalId, appState, (goal) => {
      const tasks = goalTasks(goal);
      const task = tasks.find((item) => String(item.id) === String(taskId));
      if (!task) {
        throw new root.MentorDataError("GOAL_TASK_NOT_FOUND", "Goal task was not found.", { goalId, taskId });
      }
      const actions = taskActions(task);
      const addition = clone(action);
      if (!addition?.id || !String(addition.title || "").trim()) {
        throw new root.MentorDataError("INVALID_GOAL_TASK_ACTION", "Goal task action is invalid.");
      }
      if (actions.some((item) => String(item.id) === String(addition.id))) {
        throw new root.MentorDataError("DUPLICATE_GOAL_TASK_ACTION_ID", "Goal task action ID already exists.");
      }
      actions.push(addition);
      task.actions = actions;
      task.completed = actions.every((item) => item.completed);
      goal.actions = tasks;
      return addition;
    }, { actionId: taskId });
  }

  function toggleEventTaskAction(eventId, taskActionId, completed, appState) {
    return mutateEvent(eventId, appState, (eventItem) => {
      const actions = eventTaskActions(eventItem);
      const action = actions.find((item) => String(item.id) === String(taskActionId));
      if (!action) {
        throw new root.MentorDataError(
          "EVENT_TASK_ACTION_NOT_FOUND",
          "Event task action was not found.",
          { eventId, taskActionId }
        );
      }
      action.completed = Boolean(completed);
      eventItem.actions = actions;
      eventItem.completed = actions.every((item) => item.completed);
      return action;
    });
  }

  function addEventTaskAction(eventId, action, appState) {
    return mutateEvent(eventId, appState, (eventItem) => {
      const actions = eventTaskActions(eventItem);
      const addition = clone(action);
      if (!addition?.id || !String(addition.title || "").trim()) {
        throw new root.MentorDataError("INVALID_EVENT_TASK_ACTION", "Event task action is invalid.");
      }
      if (actions.some((item) => String(item.id) === String(addition.id))) {
        throw new root.MentorDataError("DUPLICATE_EVENT_TASK_ACTION_ID", "Event task action ID already exists.");
      }
      actions.push(addition);
      eventItem.actions = actions;
      eventItem.completed = actions.every((item) => item.completed);
      return addition;
    });
  }

  function addGoalNote(goalId, note, appState) {
    return mutateGoal(goalId, appState, (goal) => {
      const notes = goalNotes(goal);
      const addition = clone(note);
      if (!addition?.id) throw new root.MentorDataError("INVALID_GOAL_NOTE", "Goal note is invalid.");
      assertUniqueNoteTitle(notes, addition.id, addition.title);
      notes.unshift(addition);
      goal.notesList = notes;
      return addition;
    }, { noteId: note?.id });
  }

  function updateGoalNote(goalId, noteId, patch, appState) {
    return mutateGoal(goalId, appState, (goal) => {
      const notes = goalNotes(goal);
      const note = notes.find((item) => String(item.id) === String(noteId));
      if (!note) {
        throw new root.MentorDataError("GOAL_NOTE_NOT_FOUND", "Goal note was not found.", { goalId, noteId });
      }
      if (Object.prototype.hasOwnProperty.call(patch || {}, "title")) {
        assertUniqueNoteTitle(notes, noteId, patch.title);
        note.title = String(patch.title || "").trim();
      }
      if (Object.prototype.hasOwnProperty.call(patch || {}, "text")) note.text = String(patch.text || "");
      note.updatedAt = new Date().toISOString();
      goal.notesList = notes;
      return note;
    }, { noteId });
  }

  function deleteGoalNote(goalId, noteId, appState) {
    let nextNoteId = noteId;
    return mutateGoal(goalId, appState, (goal) => {
      const notes = goalNotes(goal);
      const noteIndex = notes.findIndex((note) => String(note.id) === String(noteId));
      if (noteIndex < 0) {
        throw new root.MentorDataError("GOAL_NOTE_NOT_FOUND", "Goal note was not found.", { goalId, noteId });
      }
      if (notes.length === 1) {
        notes[0] = { ...notes[0], title: "", text: "", updatedAt: new Date().toISOString() };
        nextNoteId = notes[0].id;
      } else {
        notes.splice(noteIndex, 1);
        nextNoteId = notes[Math.max(0, noteIndex - 1)].id;
      }
      goal.notesList = notes;
      return { deletedNoteId: noteId, selectedNoteId: nextNoteId };
    }).then((saved) => {
      appState.selectedGoalNoteId = nextNoteId;
      return saved;
    });
  }

  function addEventNote(eventId, note, appState) {
    return mutateEvent(eventId, appState, (eventItem) => {
      const notes = eventNotes(eventItem);
      const addition = clone(note);
      if (!addition?.id) throw new root.MentorDataError("INVALID_EVENT_NOTE", "Event note is invalid.");
      assertUniqueNoteTitle(notes, addition.id, addition.title);
      notes.unshift(addition);
      eventItem.notesList = notes;
      eventItem.notes = notes.map((item) => item.text).filter(Boolean).join("\n\n");
      return addition;
    }, { noteId: note?.id });
  }

  function updateEventNote(eventId, noteId, patch, appState) {
    return mutateEvent(eventId, appState, (eventItem) => {
      const notes = eventNotes(eventItem);
      const note = notes.find((item) => String(item.id) === String(noteId));
      if (!note) {
        throw new root.MentorDataError("EVENT_NOTE_NOT_FOUND", "Event note was not found.", { eventId, noteId });
      }
      if (Object.prototype.hasOwnProperty.call(patch || {}, "title")) {
        assertUniqueNoteTitle(notes, noteId, patch.title);
        note.title = String(patch.title || "").trim();
      }
      if (Object.prototype.hasOwnProperty.call(patch || {}, "text")) note.text = String(patch.text || "");
      note.updatedAt = new Date().toISOString();
      eventItem.notesList = notes;
      eventItem.notes = notes.map((item) => item.text).filter(Boolean).join("\n\n");
      return note;
    }, { noteId });
  }

  function deleteEventNote(eventId, noteId, appState) {
    let nextNoteId = noteId;
    return mutateEvent(eventId, appState, (eventItem) => {
      const notes = eventNotes(eventItem);
      const noteIndex = notes.findIndex((note) => String(note.id) === String(noteId));
      if (noteIndex < 0) {
        throw new root.MentorDataError("EVENT_NOTE_NOT_FOUND", "Event note was not found.", { eventId, noteId });
      }
      if (notes.length === 1) {
        notes[0] = { ...notes[0], title: "", text: "", updatedAt: new Date().toISOString() };
        nextNoteId = notes[0].id;
      } else {
        notes.splice(noteIndex, 1);
        nextNoteId = notes[Math.max(0, noteIndex - 1)].id;
      }
      eventItem.notesList = notes;
      eventItem.notes = notes.map((item) => item.text).filter(Boolean).join("\n\n");
      return { deletedNoteId: noteId, selectedNoteId: nextNoteId };
    }).then((saved) => {
      appState.selectedGoalNoteId = nextNoteId;
      return saved;
    });
  }

  function signalNotePersistenceError(error, update) {
    root.console?.error?.("Calendar note persistence failed.", error);
    if (typeof root.dispatchEvent !== "function" || typeof root.CustomEvent !== "function") return;
    root.dispatchEvent(new root.CustomEvent("mentor:calendar-persistence-error", {
      detail: {
        domain: update.targetType,
        targetId: update.targetId,
        noteId: update.noteId,
        code: error?.code || error?.name || "NOTE_SAVE_FAILED"
      }
    }));
  }

  function scheduleNoteFlush() {
    if (noteFlushTimer !== null) root.clearTimeout(noteFlushTimer);
    noteFlushTimer = root.setTimeout(() => {
      noteFlushTimer = null;
      void flushNoteUpdates();
    }, NOTE_DEBOUNCE_MS);
  }

  function queueNoteUpdate(targetType, targetId, noteId, patch, appState) {
    const key = [targetType, targetId, noteId].map(String).join(":");
    const current = pendingNoteUpdates.get(key) || {
      targetType,
      targetId,
      noteId,
      patch: {},
      appState,
      waiters: []
    };
    current.patch = { ...current.patch, ...clone(patch || {}) };
    current.appState = appState;
    const queued = new Promise((resolve) => current.waiters.push(resolve));
    pendingNoteUpdates.set(key, current);
    scheduleNoteFlush();
    return queued;
  }

  function queueGoalNoteUpdate(goalId, noteId, patch, appState) {
    return queueNoteUpdate("goal", goalId, noteId, patch, appState);
  }

  function queueEventNoteUpdate(eventId, noteId, patch, appState) {
    return queueNoteUpdate("event", eventId, noteId, patch, appState);
  }

  function flushNoteUpdates() {
    if (noteFlushTimer !== null) {
      root.clearTimeout(noteFlushTimer);
      noteFlushTimer = null;
    }
    const updates = Array.from(pendingNoteUpdates.values());
    pendingNoteUpdates.clear();
    if (!updates.length) return noteFlushInFlight || Promise.resolve([]);

    const batch = noteFlushQueue.then(async () => {
      const results = [];
      for (const update of updates) {
        try {
          const value = update.targetType === "event"
            ? await updateEventNote(update.targetId, update.noteId, update.patch, update.appState)
            : await updateGoalNote(update.targetId, update.noteId, update.patch, update.appState);
          const result = { ok: true, value, error: null };
          update.waiters.forEach((resolve) => resolve(result));
          results.push(result);
        } catch (error) {
          const result = { ok: false, value: null, error };
          update.waiters.forEach((resolve) => resolve(result));
          signalNotePersistenceError(error, update);
          results.push(result);
        }
      }
      return results;
    }, async () => []);
    noteFlushQueue = batch;
    noteFlushInFlight = batch;
    void batch.finally(() => {
      if (noteFlushInFlight === batch) noteFlushInFlight = null;
    });
    return batch;
  }

  function hasPendingNoteUpdates() {
    return pendingNoteUpdates.size > 0;
  }

  root.MentorGoalsCalendarService = Object.freeze({
    hydrateAppState,
    scheduleEvents,
    updateEvent,
    deleteEvent,
    deleteGoalCascade,
    toggleGoalTaskAction,
    addGoalTaskAction,
    toggleEventTaskAction,
    addEventTaskAction,
    addGoalNote,
    updateGoalNote,
    deleteGoalNote,
    addEventNote,
    updateEventNote,
    deleteEventNote,
    queueGoalNoteUpdate,
    queueEventNoteUpdate,
    flushNoteUpdates,
    hasPendingNoteUpdates
  });
})(typeof window !== "undefined" ? window : globalThis);
