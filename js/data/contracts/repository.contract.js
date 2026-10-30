(function (root) {
  "use strict";

  const states = () => root.MentorDataRepositoryState;
  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));

  function createController(initialSnapshot) {
    let state = states().NOT_INITIALIZED;
    let snapshot = clone(initialSnapshot);
    let error = null;
    let initializePromise = null;
    let mutationQueue = Promise.resolve();
    const events = root.MentorDataEventBus.create();

    function publish() { events.emit(clone(snapshot), state); }

    return {
      initialize(loader) {
        if (state === states().READY) return Promise.resolve();
        if (initializePromise) return initializePromise;
        state = states().LOADING;
        error = null;
        initializePromise = Promise.resolve()
          .then(loader)
          .then((loaded) => {
            snapshot = clone(loaded);
            state = states().READY;
            publish();
          })
          .catch((reason) => {
            error = reason;
            state = reason?.code === "DATA_RECOVERY_REQUIRED" ? states().RECOVERY_REQUIRED : states().FAILED;
            publish();
            throw reason;
          })
          .finally(() => { initializePromise = null; });
        return initializePromise;
      },
      mutate(writer) {
        if (state !== states().READY && state !== states().SAVING && state !== states().FAILED) {
          return Promise.reject(new root.MentorDataError("REPOSITORY_NOT_READY", "Repository must be initialized before mutation."));
        }
        state = states().SAVING;
        error = null;
        publish();
        const operation = mutationQueue.then(() => {
          const previous = clone(snapshot);
          return Promise.resolve()
            .then(() => writer(clone(previous)))
          .then((next) => {
            snapshot = clone(next);
            state = states().READY;
            publish();
            return clone(snapshot);
          })
          .catch((reason) => {
            snapshot = previous;
            error = reason;
            state = reason?.code === "DATA_RECOVERY_REQUIRED" ? states().RECOVERY_REQUIRED : states().FAILED;
            publish();
            throw reason;
          });
        });
        mutationQueue = operation.catch(() => undefined);
        return operation;
      },
      requireReady() {
        if (state !== states().READY && state !== states().SAVING && state !== states().FAILED) {
          throw new root.MentorDataError("REPOSITORY_NOT_READY", "Repository snapshot is not hydrated.");
        }
      },
      getSnapshot() { this.requireReady(); return clone(snapshot); },
      setSnapshot(value) { snapshot = clone(value); },
      getState() { return state; },
      getError() { return error; },
      isReady() { return state === states().READY || state === states().SAVING; },
      subscribe: events.subscribe
    };
  }

  root.MentorRepositoryContract = Object.freeze({ createController, clone });
})(typeof window !== "undefined" ? window : globalThis);
