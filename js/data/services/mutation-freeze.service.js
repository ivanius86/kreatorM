(function (root) {
  "use strict";

  const namespace = root.MentorIndexedDB = root.MentorIndexedDB || {};
  let frozen = false;
  let freezeReason = null;
  let activeMutations = 0;
  let freezeQueue = Promise.resolve();
  const idleWaiters = new Set();

  function signalIdle() {
    if (activeMutations !== 0) return;
    for (const resolve of idleWaiters) resolve();
    idleWaiters.clear();
  }

  function dispatch(type, detail) {
    if (typeof root.dispatchEvent !== "function" || typeof root.CustomEvent !== "function") return;
    root.dispatchEvent(new root.CustomEvent(type, { detail }));
  }

  function createFrozenError(reason) {
    const error = new Error("IndexedDB mutations are temporarily frozen.");
    error.code = "INDEXEDDB_MUTATIONS_FROZEN";
    error.details = { reason: reason || freezeReason || "administrative-operation" };
    return error;
  }

  async function beginMutation() {
    if (frozen) throw createFrozenError();
    activeMutations += 1;
    let released = false;
    return Object.freeze({
      release() {
        if (released) return;
        released = true;
        activeMutations = Math.max(0, activeMutations - 1);
        signalIdle();
      }
    });
  }

  function whenIdle() {
    if (activeMutations === 0) return Promise.resolve();
    return new Promise((resolve) => idleWaiters.add(resolve));
  }

  function withFreeze(reason, operation) {
    if (typeof operation !== "function") {
      const error = new Error("A frozen operation is required.");
      error.code = "INDEXEDDB_FROZEN_OPERATION_REQUIRED";
      return Promise.reject(error);
    }
    const run = freezeQueue.then(async () => {
      frozen = true;
      freezeReason = String(reason || "administrative-operation");
      dispatch("mentor:indexeddb-mutations-frozen", {
        reason: freezeReason,
        activeMutations
      });
      await whenIdle();
      try {
        return await operation();
      } finally {
        const completedReason = freezeReason;
        frozen = false;
        freezeReason = null;
        dispatch("mentor:indexeddb-mutations-resumed", {
          reason: completedReason
        });
      }
    });
    freezeQueue = run.catch(() => undefined);
    return run;
  }

  function getState() {
    return Object.freeze({
      frozen,
      reason: freezeReason,
      activeMutations
    });
  }

  namespace.MutationFreezeService = Object.freeze({
    beginMutation,
    withFreeze,
    whenIdle,
    getState
  });
})(typeof window !== "undefined" ? window : globalThis);
