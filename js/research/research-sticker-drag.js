(function (root) {
  "use strict";

  const suppressedClicks = new WeakSet();

  function consumeClick(button) {
    if (!suppressedClicks.has(button)) return false;
    suppressedClicks.delete(button);
    return true;
  }

  function bind(host, options) {
    if (host._researchStickerDragBound) return;
    host._researchStickerDragBound = true;
    host.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || root.MentorUIEvents?.isTextEditingEvent?.(event)) return;
      const button = event.target.closest?.('button[data-research-action="add-canvas-card"][data-card-type]');
      if (!button || !host.contains(button) || !button.closest("[data-research-organizer-add-menu], [data-research-canvas-menu]")) return;
      const startX = event.clientX;
      const startY = event.clientY;
      let preview = null;
      let dragging = false;
      const pointerId = event.pointerId;
      const position = (nextEvent) => {
        preview.style.left = nextEvent.clientX - preview.offsetWidth / 2 + "px";
        preview.style.top = nextEvent.clientY - preview.offsetHeight / 2 + "px";
        preview.classList.toggle("is-over-canvas", options.isOverCanvas(nextEvent));
      };
      const move = (nextEvent) => {
        if (nextEvent.pointerId !== pointerId) return;
        if (!dragging && Math.hypot(nextEvent.clientX - startX, nextEvent.clientY - startY) < 6) return;
        if (!dragging) {
          dragging = true;
          preview = root.document.createElement("div");
          preview.className = "research-sticker-drag-preview is-" + button.dataset.cardType;
          preview.innerHTML = options.renderPreview(button.dataset.cardType);
          root.document.body.appendChild(preview);
        }
        nextEvent.preventDefault();
        position(nextEvent);
      };
      const finish = (endEvent) => {
        if (endEvent.pointerId !== pointerId) return;
        button.removeEventListener("pointermove", move);
        button.removeEventListener("pointerup", finish);
        button.removeEventListener("pointercancel", finish);
        if (button.hasPointerCapture?.(pointerId)) button.releasePointerCapture(pointerId);
        preview?.remove();
        if (!dragging) return;
        suppressedClicks.add(button);
        if (endEvent.type !== "pointercancel" && options.isOverCanvas(endEvent)) options.onDrop(button, endEvent);
      };
      button.setPointerCapture?.(pointerId);
      button.addEventListener("pointermove", move);
      button.addEventListener("pointerup", finish);
      button.addEventListener("pointercancel", finish);
    });
  }

  root.MentorResearchStickerDrag = { bind, consumeClick };
})(window);
