"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const JournalBookAnimation = require("../../js/journal/prototype/book-animation.js");

function setup(options = {}) {
  let timestamp = 0, nextId = 0;
  const queue = new Map(), frames = [], states = [];
  const animation = new JournalBookAnimation({
    now: () => timestamp,
    requestFrame(callback) { const id = ++nextId; queue.set(id, callback); return id; },
    cancelFrame(id) { queue.delete(id); },
    onFrame(index, progress) { frames.push({ index, progress }); },
    onStateChange(snapshot) { states.push(snapshot); },
    ...options
  });
  return {
    animation, queue, frames, states,
    step(value) {
      timestamp = value;
      const callbacks = [...queue.values()];
      queue.clear();
      callbacks.forEach((callback) => callback(value));
    },
    setTime(value) { timestamp = value; }
  };
}

test("opens over 1000 ms and closes in reverse without multiple RAF loops", () => {
  const { animation, queue, step, frames } = setup();
  assert.equal(animation.getSnapshot().state, "closed");
  assert.equal(frames[0].index, 0);
  animation.open(); animation.open(); animation.open();
  assert.equal(queue.size, 1);
  step(250);
  assert.equal(animation.getSnapshot().progress, 0.25);
  step(999);
  assert.equal(animation.getSnapshot().state, "opening");
  step(1000);
  assert.equal(animation.getSnapshot().state, "open");
  assert.equal(animation.getSnapshot().frameIndex, 23);
  assert.equal(queue.size, 0);
  animation.close();
  step(1500);
  assert.equal(animation.getSnapshot().progress, 0.5);
  step(2000);
  assert.equal(animation.getSnapshot().state, "closed");
  assert.equal(frames.at(-1).index, 0);
});

test("three-image book keeps the middle image brief in both directions", () => {
  const { animation, step } = setup({ frameCount: 3, duration: 240, frameThresholds: [0.42, 0.58] });
  animation.open();
  step(100);
  assert.equal(animation.getSnapshot().frameIndex, 0);
  step(110);
  assert.equal(animation.getSnapshot().frameIndex, 1);
  step(140);
  assert.equal(animation.getSnapshot().frameIndex, 2);
  step(240);
  assert.equal(animation.getSnapshot().state, "open");
  animation.close();
  step(340);
  assert.equal(animation.getSnapshot().frameIndex, 2);
  step(350);
  assert.equal(animation.getSnapshot().frameIndex, 1);
  step(380);
  assert.equal(animation.getSnapshot().frameIndex, 0);
  step(480);
  assert.equal(animation.getSnapshot().state, "closed");
});

test("reversing advances to current time and resumes from the same position", () => {
  const { animation, step, setTime, queue } = setup();
  animation.open();
  step(300);
  setTime(400);
  animation.close();
  assert.equal(animation.getSnapshot().progress, 0.4);
  assert.equal(animation.getSnapshot().state, "closing");
  assert.equal(queue.size, 1);
  step(600);
  assert.equal(animation.getSnapshot().progress, 0.2);
  animation.toggle();
  step(900);
  assert.equal(animation.getSnapshot().progress, 0.5);
  step(1400);
  assert.equal(animation.getSnapshot().state, "open");
});

test("cancel settles to nearest endpoint or explicit endpoint and removes scheduled frames", () => {
  const { animation, queue, step } = setup();
  animation.open(); step(400); animation.cancel();
  assert.equal(animation.getSnapshot().state, "closed");
  assert.equal(queue.size, 0);
  animation.open(); step(1000); animation.cancel();
  assert.equal(animation.getSnapshot().state, "open");
  animation.cancel({ snapTo: "closed" });
  assert.equal(animation.getSnapshot().progress, 0);
  animation.open(); animation.cancel({ snapTo: "open" });
  assert.equal(animation.getSnapshot().progress, 1);
});

test("reduced motion and unavailable frames jump to endpoints, including during a transition", () => {
  const { animation, step, queue } = setup({ reducedMotion: true });
  animation.open();
  assert.equal(animation.getSnapshot().state, "open");
  assert.equal(queue.size, 0);
  animation.setReducedMotion(false);
  animation.close(); step(200);
  animation.setReducedMotion(true);
  assert.equal(animation.getSnapshot().state, "closed");
  animation.setReducedMotion(false); animation.setFramesAvailable(false); animation.open();
  assert.equal(animation.getSnapshot().state, "open");
  assert.equal(animation.getSnapshot().framesAvailable, false);
  assert.equal(queue.size, 0);
  animation.setFramesAvailable(true); animation.close(); step(400); animation.setFramesAvailable(false);
  assert.equal(animation.getSnapshot().state, "closed");
});

test("destroy cancels RAF and future commands and stale callbacks cannot render", () => {
  const { animation, queue, frames, states, step } = setup();
  animation.open();
  const staleCallback = [...queue.values()][0];
  animation.destroy();
  const count = frames.length, stateCount = states.length;
  assert.equal(queue.size, 0);
  staleCallback(1000);
  animation.open(); animation.close(); animation.toggle(); animation.cancel(); animation.setReducedMotion(true);
  step(2000);
  assert.equal(frames.length, count);
  assert.equal(states.length, stateCount);
  assert.equal(animation.getSnapshot().state, "destroyed");
});

class TestImage {
  set src(value) {
    this.url = value;
    queueMicrotask(() => value === "missing" ? this.onerror?.() : this.onload?.());
  }
  async decode() { if (this.url === "invalid") throw new Error("Invalid image."); }
}

test("loader decodes in order and reports incomplete frames without rejecting static fallback", async () => {
  const loaded = await JournalBookAnimation.loadFrames(["first", "missing", "invalid", "last"], { ImageCtor: TestImage });
  assert.equal(loaded.complete, false);
  assert.deepEqual(loaded.failedIndices, [1, 2]);
  assert.deepEqual(loaded.frames.map((image) => image?.url || null), ["first", null, null, "last"]);
  const complete = await JournalBookAnimation.loadFrames(Array.from({ length: 24 }, (_, index) => String(index)), { ImageCtor: TestImage });
  assert.equal(complete.complete, true);
  assert.equal(complete.frames.length, 24);
});

test("aborted loads settle without later async image completions replacing their results", async () => {
  const images = [];
  class SlowImage {
    constructor() { images.push(this); }
    set src(value) { this.url = value; }
    async decode() {}
  }
  const controller = new AbortController();
  const promise = JournalBookAnimation.loadFrames(["first", "last"], { ImageCtor: SlowImage, signal: controller.signal });
  const staleCompletions = images.map((image) => image.onload);
  controller.abort();
  const result = await promise;
  assert.equal(result.complete, false);
  assert.deepEqual(result.frames, [null, null]);
  await Promise.all(staleCompletions.map((onload) => onload()));
  assert.deepEqual(result.frames, [null, null]);
});
