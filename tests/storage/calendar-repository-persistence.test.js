const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

global.window = global;
const root = path.join(__dirname, "../..");
[
  "js/data/state/repository-state.constants.js",
  "js/data/errors/data-error.js",
  "js/data/state/data-event-bus.js",
  "js/data/contracts/storage-adapter.contract.js",
  "js/data/contracts/repository.contract.js",
  "js/data/adapters/local-storage.adapter.js",
  "js/data/repositories/repository-helpers.js",
  "js/data/repositories/goals.repository.js",
  "js/data/repositories/calendar.repository.js",
  "js/data/services/goals.service.js",
  "js/data/services/goals-calendar.service.js"
].forEach((file) => {
  vm.runInThisContext(fs.readFileSync(path.join(root, file), "utf8"), { filename: file });
});

global.CustomEvent = class CustomEvent {
  constructor(type, init) {
    this.type = type;
    this.detail = init?.detail;
  }
};

class MemoryStorage {
  constructor() {
    this.values = new Map();
    this.writes = new Map();
    this.failNextKeys = [];
  }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) {
    if (this.failNextKeys[0] === key) {
      this.failNextKeys.shift();
      throw new Error("quota");
    }
    this.values.set(key, String(value));
    this.writes.set(key, (this.writes.get(key) || 0) + 1);
  }
  removeItem(key) { this.values.delete(key); }
  writeCount(key) { return this.writes.get(key) || 0; }
  failWrites(...keys) { this.failNextKeys.push(...keys); }
}

test("Calendar hydrate, createMany single write, and goal cascade compensation", async () => {
  const persistenceSignals = [];
  global.dispatchEvent = (event) => {
    if (event.type === "mentor:calendar-persistence-error") persistenceSignals.push(event.detail);
    return true;
  };
  global.GOAL_SAMPLE_TEMPLATES = [];
  const storage = new MemoryStorage();
  const adapter = new global.MentorLocalStorageAdapter(storage);
  const goals = global.MentorDataRepositoryFactories.createGoalsRepository(adapter);
  const calendar = global.MentorDataRepositoryFactories.createCalendarRepository(adapter);
  global.MentorData = { repositories: { goals, calendar } };
  await Promise.all([goals.initialize(), calendar.initialize()]);

  const goal = { id: "goal-1", type: "habit", title: "Daily walk" };
  await goals.create(goal);
  const appState = { goals: [], calendarEvents: [] };
  await global.MentorGoalsCalendarService.hydrateAppState(appState);
  assert.deepEqual(appState.goals.map((item) => item.id), ["goal-1"]);
  assert.deepEqual(appState.calendarEvents, []);

  const events = [
    { id: "evt-1", goalId: "goal-1", date: "2026-08-01", time: "09:00", title: "Walk" },
    { id: "evt-2", goalId: "goal-1", date: "2026-08-02", time: "09:00", title: "Walk" }
  ];
  const writesBeforeBatch = storage.writeCount("mentor_calendar_events_v1");
  await global.MentorGoalsCalendarService.scheduleEvents(events, appState);
  assert.equal(storage.writeCount("mentor_calendar_events_v1") - writesBeforeBatch, 1);
  assert.deepEqual(appState.calendarEvents.map((event) => event.id), ["evt-1", "evt-2"]);

  const sampleGoal = {
    id: "sample-goal",
    type: "habit",
    title: "Sample habit",
    actions: [{
      id: "sample-task",
      title: "Sample task",
      actions: [{
        id: "sample-task-action",
        title: "Sample step",
        cadence: "Daily",
        completed: false
      }]
    }]
  };
  global.GOAL_SAMPLE_TEMPLATES = [sampleGoal];
  global.createId = () => "goal-sample-cow";
  appState.goals = [...goals.getAll(), JSON.parse(JSON.stringify(sampleGoal))];
  appState.selectedGoalId = sampleGoal.id;
  appState.selectedActionId = "sample-task";
  await global.MentorGoalsCalendarService.toggleGoalTaskAction(
    sampleGoal.id,
    "sample-task",
    "sample-task-action",
    true,
    appState
  );
  const materializedGoal = goals.getById("goal-sample-cow");
  assert.equal(materializedGoal.actions[0].actions[0].completed, true);
  assert.equal(goals.getById(sampleGoal.id), null);
  assert.equal(appState.selectedGoalId, materializedGoal.id);
  assert.equal(appState.selectedActionId, "sample-task");
  await goals.remove(materializedGoal.id);
  await global.MentorGoalsCalendarService.hydrateAppState(appState);

  await global.MentorGoalsCalendarService.toggleEventTaskAction(
    "evt-1",
    "evt-1-action-0",
    true,
    appState
  );
  assert.equal(calendar.getById("evt-1").actions[0].completed, true);
  assert.equal(appState.calendarEvents.find((event) => event.id === "evt-1").completed, true);

  const writesBeforeNoteDebounce = storage.writeCount("mentor_calendar_events_v1");
  const firstDraft = global.MentorGoalsCalendarService.queueEventNoteUpdate(
    "evt-1",
    "evt-1-note-0",
    { title: "Plan", text: "first draft" },
    appState
  );
  const latestDraft = global.MentorGoalsCalendarService.queueEventNoteUpdate(
    "evt-1",
    "evt-1-note-0",
    { text: "latest draft" },
    appState
  );
  assert.equal(storage.writeCount("mentor_calendar_events_v1"), writesBeforeNoteDebounce);
  const noteFlushResults = await global.MentorGoalsCalendarService.flushNoteUpdates();
  assert.equal(noteFlushResults.length, 1);
  assert.equal(noteFlushResults[0].ok, true);
  assert.equal((await firstDraft).ok, true);
  assert.equal((await latestDraft).ok, true);
  assert.equal(storage.writeCount("mentor_calendar_events_v1") - writesBeforeNoteDebounce, 1);
  assert.deepEqual(calendar.getById("evt-1").notesList[0], {
    id: "evt-1-note-0",
    title: "Plan",
    text: "latest draft",
    createdAt: calendar.getById("evt-1").notesList[0].createdAt,
    updatedAt: calendar.getById("evt-1").notesList[0].updatedAt
  });

  const durableNoteText = calendar.getById("evt-1").notesList[0].text;
  storage.failWrites("mentor_calendar_events_v1");
  const failedDraft = global.MentorGoalsCalendarService.queueEventNoteUpdate(
    "evt-1",
    "evt-1-note-0",
    { text: "unsaved DOM draft" },
    appState
  );
  const failedFlush = global.MentorGoalsCalendarService.flushNoteUpdates();
  const concurrentFailedFlush = global.MentorGoalsCalendarService.flushNoteUpdates();
  const failedFlushResults = await failedFlush;
  assert.equal(failedFlushResults[0].ok, false);
  assert.equal((await concurrentFailedFlush)[0].ok, false);
  assert.equal((await failedDraft).ok, false);
  assert.equal(calendar.getById("evt-1").notesList[0].text, durableNoteText);
  assert.equal(appState.calendarEvents.find((event) => event.id === "evt-1").notesList[0].text, durableNoteText);
  assert.deepEqual(persistenceSignals.at(-1), {
    domain: "event",
    targetId: "evt-1",
    noteId: "evt-1-note-0",
    code: "Error"
  });

  const failedSampleCopy = { id: "sample-copy-failed", type: "habit", title: "Sample copy" };
  await goals.create(failedSampleCopy);
  appState.goals = goals.getAll();
  storage.failWrites("mentor_calendar_events_v1");
  await assert.rejects(
    global.MentorGoalsCalendarService.scheduleEvents(
      [{ id: "evt-sample-failed", goalId: failedSampleCopy.id, date: "2026-08-03", time: "09:00" }],
      appState,
      { newlyMaterializedGoalId: failedSampleCopy.id }
    ),
    /quota/
  );
  assert.equal(goals.getById(failedSampleCopy.id), null);
  assert.equal(appState.goals.some((item) => item.id === failedSampleCopy.id), false);
  assert.equal(appState.calendarEvents.some((event) => event.id === "evt-sample-failed"), false);
  assert.ok(goals.getById("goal-1"));

  const emptySampleCopy = { id: "sample-copy-empty", type: "habit", title: "Empty sample copy" };
  await goals.create(emptySampleCopy);
  appState.goals = goals.getAll();
  const writesBeforeEmptySchedule = storage.writeCount("mentor_calendar_events_v1");
  await global.MentorGoalsCalendarService.scheduleEvents(
    [],
    appState,
    { newlyMaterializedGoalId: emptySampleCopy.id }
  );
  assert.equal(goals.getById(emptySampleCopy.id), null);
  assert.equal(appState.goals.some((item) => item.id === emptySampleCopy.id), false);
  assert.equal(storage.writeCount("mentor_calendar_events_v1"), writesBeforeEmptySchedule);
  assert.ok(goals.getById("goal-1"));

  storage.failWrites("mentor_goals_v1");
  await assert.rejects(
    global.MentorGoalsCalendarService.deleteGoalCascade("goal-1", appState),
    /quota/
  );

  const storedCalendar = JSON.parse(storage.getItem("mentor_calendar_events_v1"));
  assert.deepEqual(storedCalendar.events.map((event) => event.id).sort(), ["evt-1", "evt-2"]);
  assert.deepEqual(appState.calendarEvents.map((event) => event.id).sort(), ["evt-1", "evt-2"]);
  assert.deepEqual(appState.goals.map((item) => item.id), ["sample-goal", "goal-1"]);

  const recoverySampleCopy = { id: "sample-copy-recovery", type: "habit", title: "Recovery sample copy" };
  await goals.create(recoverySampleCopy);
  appState.goals = goals.getAll();
  storage.failWrites("mentor_calendar_events_v1", "mentor_goals_v1");
  await assert.rejects(
    global.MentorGoalsCalendarService.scheduleEvents(
      [{ id: "evt-recovery", goalId: recoverySampleCopy.id, date: "2026-08-04", time: "09:00" }],
      appState,
      { newlyMaterializedGoalId: recoverySampleCopy.id }
    ),
    (error) => {
      assert.equal(error.code, "DATA_RECOVERY_REQUIRED");
      return true;
    }
  );
  assert.ok(goals.getById(recoverySampleCopy.id));
  assert.ok(goals.getById("goal-1"));
  assert.equal(appState.calendarEvents.some((event) => event.id === "evt-recovery"), false);
});

test("Deleting one custom goal keeps sample cards visible and removes only its events", async () => {
  global.GOAL_SAMPLE_TEMPLATES = [
    { id: "seed-focus", type: "short-term", title: "Sample focus" },
    { id: "seed-training", type: "habit", title: "Sample training" }
  ];

  const storage = new MemoryStorage();
  const adapter = new global.MentorLocalStorageAdapter(storage);
  const goals = global.MentorDataRepositoryFactories.createGoalsRepository(adapter);
  const calendar = global.MentorDataRepositoryFactories.createCalendarRepository(adapter);
  global.MentorData = { repositories: { goals, calendar } };
  await Promise.all([goals.initialize(), calendar.initialize()]);

  await goals.create({ id: "goal-training", type: "habit", title: "My training" });
  await calendar.createMany([
    { id: "evt-training", goalId: "goal-training", date: "2026-09-01", time: "09:00" },
    { id: "evt-unrelated", goalId: "another-goal", date: "2026-09-01", time: "11:00" }
  ]);

  const appState = { goals: [], calendarEvents: [] };
  await global.MentorGoalsCalendarService.hydrateAppState(appState);
  assert.deepEqual(appState.goals.map((goal) => goal.id), [
    "seed-focus",
    "seed-training",
    "goal-training"
  ]);

  await global.MentorGoalsCalendarService.deleteGoalCascade("goal-training", appState);

  assert.deepEqual(appState.goals.map((goal) => goal.id), ["seed-focus", "seed-training"]);
  assert.equal(goals.getById("goal-training"), null);
  assert.equal(calendar.getById("evt-training"), null);
  assert.ok(calendar.getById("evt-unrelated"));
});
