(function (root) {
  "use strict";

  function read(idea, directionId) {
    const groups = idea?.pathData?.researchCanvasGroups;
    return (Array.isArray(groups) ? groups : []).filter((group) => group?.directionId === directionId);
  }

  function eligible(card) {
    const noteId = String(card?.note?.id || "");
    const stableLinkedNote = noteId && card.reference?.notes?.some((note) => note && typeof note === "object" && note.id === noteId);
    const stableDirectionNote = noteId && card.direction?.notes?.some((note) => note && typeof note === "object" && note.id === noteId);
    return Boolean(card?.key && (
      (card.source === "item" && card.id) ||
      (card.source === "reference" && card.direction?.id && card.reference?.id) ||
      (card.source === "linked-note" && card.direction?.id && card.reference?.id && stableLinkedNote) ||
      (card.source === "direction-note" && card.direction?.id && stableDirectionNote)
    ));
  }

  function assign(groups, keys, groupId) {
    const selected = new Set(keys);
    return groups.map((group) => ({ ...group, memberKeys: [
      ...(Array.isArray(group.memberKeys) ? group.memberKeys : []).filter((key) => !selected.has(key)),
      ...(group.id === groupId ? keys : [])
    ] }));
  }

  function move(group, positions, dx, dy) {
    const nextPositions = {};
    (group.memberKeys || []).forEach((key) => {
      const position = positions[key];
      if (position) nextPositions[key] = { x: position.x + dx, y: position.y + dy };
    });
    return { group: { ...group, x: (Number(group.x) || 0) + dx, y: (Number(group.y) || 0) + dy }, positions: nextPositions };
  }

  function bringToFront(groups, group) {
    return [...groups.filter((entry) => entry.id !== group.id || entry.directionId !== group.directionId), group];
  }

  function resize(group, width, height) {
    return { ...group, width: Math.max(180, Math.round(width)), height: Math.max(86, Math.round(height)) };
  }

  function color(value, fallback) {
    return /^#[0-9a-fA-F]{6}$/.test(String(value || "")) ? value : fallback;
  }

  function imageUrl(value) {
    try {
      const url = new URL(String(value || ""));
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch (_) { return ""; }
  }

  function imageOpacity(value) {
    const number = Number(value);
    return value === undefined || value === null || value === "" || !Number.isFinite(number) ? 65 : Math.max(0, Math.min(100, Math.round(number)));
  }

  function imageZoom(value) {
    const number = Number(value);
    return value === undefined || value === null || value === "" || !Number.isFinite(number) ? 1 : Math.max(.2, Math.min(3, Math.round(number * 10) / 10));
  }

  function imagePosition(value) {
    const number = Number(value);
    return value === undefined || value === null || value === "" || !Number.isFinite(number) ? 50 : Math.max(0, Math.min(100, Math.round(number)));
  }

  function fontFamily(value) {
    return ["Inter", "Georgia", "Arial", "monospace"].includes(value) ? value : "Inter";
  }

  function fontSize(value) {
    const number = Number(value);
    return value === undefined || value === null || value === "" || !Number.isFinite(number) ? 14 : Math.max(11, Math.min(24, Math.round(number)));
  }

  root.MentorResearchGroups = { read, eligible, assign, move, bringToFront, resize, color, imageUrl, imageOpacity, imageZoom, imagePosition, fontFamily, fontSize };
})(window);
