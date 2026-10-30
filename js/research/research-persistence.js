(function (root) {
  "use strict";

  // Brainstorming continues to own storage, validation, rollback and media cleanup.
  // This boundary forwards Research writes without changing their arguments or results.
  const writeCallbacks = [
    "addDirection", "updateDirection", "deleteDirection",
    "addReference", "updateReference", "deleteReference",
    "saveCanvasPosition", "saveCanvasFocusPosition", "saveCanvasSize",
    "resetCanvasSize", "saveCanvasFocusSize", "saveCanvasCollapsed",
    "saveCanvasItem", "saveCanvasSticker", "saveCanvasParent", "transferCanvasChild", "saveCanvasVideo", "saveCanvasAttachment", "deleteCanvasItem",
    "updateCanvasLinkedNote", "addCanvasLinkedNote", "deleteCanvasLinkedNote",
    "updateCanvasDirectionNote", "deleteCanvasDirectionNote",
    "addTest", "updateTest", "deleteTest", "updateTestTask",
    "updateTestScore", "updateTestAnswer", "saveCanvasOrganization"
  ];

  function bindActions(callbacks = {}) {
    const actions = Object.create(callbacks);
    // Navigation and refresh callbacks must keep their original receiver too.
    new Set([...writeCallbacks, ...Object.keys(callbacks)]).forEach((name) => {
      if (typeof callbacks[name] !== "function") return;
      actions[name] = function (...args) {
        return callbacks[name].apply(callbacks, args);
      };
    });
    return actions;
  }

  root.MentorResearchPersistence = { bindActions };
})(window);
