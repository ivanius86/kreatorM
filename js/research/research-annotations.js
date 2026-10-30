(function (root) {
  "use strict";

  const symbols = ["★", "!", "?", "✓", "💡", "⚠", "♥", "€", "$", "→", "←", "↑", "↓"];

  function read(idea, directionId) {
    const annotations = idea?.pathData?.researchCanvasAnnotations;
    return (Array.isArray(annotations) ? annotations : []).filter((annotation) => annotation?.directionId === directionId);
  }

  function add(annotations, annotation) {
    return [...annotations, annotation];
  }

  function move(annotations, id, x, y) {
    return annotations.map((annotation) => annotation.id === id ? { ...annotation, x, y } : annotation);
  }

  function remove(annotations, id) {
    return annotations.filter((annotation) => annotation.id !== id);
  }

  root.MentorResearchAnnotations = { symbols, read, add, move, remove };
})(window);
