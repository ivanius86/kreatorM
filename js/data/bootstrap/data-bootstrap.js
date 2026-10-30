(function (root) {
  "use strict";

  let coreReady = false;
  let coreError = null;

  const promise = Promise.resolve(root.MentorData.repositorySelectionPromise)
    .then(() => Promise.all([
      root.MentorData.repositories.settings.initialize(),
      root.MentorData.repositories.goals.initialize(),
      root.MentorData.repositories.calendar.initialize()
    ]))
    .then(() => {
      coreReady = true;
      root.dispatchEvent?.(new CustomEvent("mentor:data-core-ready"));
    })
    .catch((error) => {
      coreError = error;
      root.console?.error?.("[MentorData] Core data bootstrap failed.", error);
      root.dispatchEvent?.(new CustomEvent("mentor:data-core-failed", { detail: { code: error?.code || "UNKNOWN" } }));
      throw error;
    });

  root.MentorData.coreReadyPromise = promise;
  Object.defineProperties(root.MentorData, {
    coreReady: { enumerable: true, get: () => coreReady },
    coreError: { enumerable: true, get: () => coreError }
  });
})(typeof window !== "undefined" ? window : globalThis);
