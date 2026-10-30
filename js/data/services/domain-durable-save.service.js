(function (root) {
  "use strict";

  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));

  async function commit(options) {
    if (typeof options?.read !== "function" || typeof options?.save !== "function") {
      throw new TypeError("Durable save requires read() and save().");
    }
    const previous = clone(options.read());
    const next = clone(options.next);
    try {
      const saved = await options.save(next);
      options.onSuccess?.(saved);
      return { ok: true, value: clone(saved), previous, error: null };
    } catch (error) {
      options.onError?.(error);
      return { ok: false, value: previous, previous, error };
    }
  }

  function createQueue(options = {}) {
    let tail = Promise.resolve();

    function enqueue(label, operation) {
      if (typeof operation !== "function") {
        throw new TypeError("Background commit queue requires an operation.");
      }
      const task = tail
        .then(() => operation())
        .then(
          (value) => ({ ok: true, label, value, error: null }),
          (error) => {
            try {
              options.onError?.({ label, error });
            } catch (signalError) {
              root.console?.error?.("Background commit error signal failed.", signalError);
            }
            return { ok: false, label, value: null, error };
          }
        );
      tail = task.then(() => undefined);
      return task;
    }

    return Object.freeze({ enqueue });
  }

  root.MentorDomainDurableSave = Object.freeze({ commit, createQueue });
})(typeof window !== "undefined" ? window : globalThis);
