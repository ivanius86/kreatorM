(function (root) {
  "use strict";

  function createState() {
    return { mode: "pan", workspace: "", selected: new Set() };
  }

  function setWorkspace(state, ideaId, directionId) {
    const workspace = JSON.stringify([String(ideaId || ""), String(directionId || "")]);
    if (state.workspace !== workspace) {
      state.workspace = workspace;
      state.selected.clear();
    }
  }

  function select(state, key, additive = false) {
    if (!additive) state.selected.clear();
    if (additive && state.selected.has(key)) state.selected.delete(key);
    else if (key) state.selected.add(key);
    return state.selected;
  }

  function selectRect(state, rect, cardRects, additive = false) {
    if (!additive) state.selected.clear();
    cardRects.forEach(({ key, bounds }) => {
      if (root.MentorResearchGeometry.rectsIntersect(rect, bounds)) state.selected.add(key);
    });
    return state.selected;
  }

  root.MentorResearchSelection = { createState, setWorkspace, select, selectRect };
})(window);
