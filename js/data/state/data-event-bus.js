(function (root) {
  "use strict";

  function createEventBus() {
    const listeners = new Set();
    return {
      subscribe(listener) {
        if (typeof listener !== "function") throw new TypeError("Repository listener must be a function.");
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      emit(snapshot, state) {
        listeners.forEach((listener) => {
          try { listener(snapshot, state); }
          catch (error) { root.console?.warn?.("[MentorData] Repository listener failed.", error); }
        });
      },
      clear() { listeners.clear(); }
    };
  }

  root.MentorDataEventBus = Object.freeze({ create: createEventBus });
})(typeof window !== "undefined" ? window : globalThis);
