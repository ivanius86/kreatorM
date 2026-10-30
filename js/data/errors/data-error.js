(function (root) {
  "use strict";

  class MentorDataError extends Error {
    constructor(code, message, details) {
      super(message);
      this.name = "MentorDataError";
      this.code = code;
      if (details !== undefined) this.details = details;
    }
  }

  root.MentorDataError = MentorDataError;
})(typeof window !== "undefined" ? window : globalThis);
