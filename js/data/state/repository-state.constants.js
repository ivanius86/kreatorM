(function (root) {
  "use strict";

  root.MentorDataRepositoryState = Object.freeze({
    NOT_INITIALIZED: "notInitialized",
    LOADING: "loading",
    READY: "ready",
    SAVING: "saving",
    FAILED: "failed",
    RECOVERY_REQUIRED: "recoveryRequired"
  });
})(typeof window !== "undefined" ? window : globalThis);
