(function (root) {
  "use strict";

  function getDirections(idea) {
    const current = idea.pathData?.researchDirections;
    const directions = Array.isArray(current) ? current : idea.pathData?.directions || [];
    return Array.isArray(directions) ? directions : [];
  }

  function getDirectionReferences(direction) {
    const references = direction?.references || [];
    return Array.isArray(references) ? references : [];
  }

  function stabilizeNotes(notes, linked = true) {
    const source = Array.isArray(notes) ? notes : [];
    const used = new Set(source.filter((note) => note && typeof note === "object" && note.id).map((note) => String(note.id)));
    return source.map((note, index) => {
      if (!note) return note;
      if (typeof note === "object" && note.id) return { ...note };
      const base = linked ? "note_" + index : String(index);
      let id = base, suffix = 0;
      while (used.has(id)) id = base + "_legacy_" + ++suffix;
      used.add(id);
      return { ...(typeof note === "object" ? note : { body: note }), id };
    });
  }

  function getReferenceNotes(reference, translate) {
    if (!reference) return [];
    if (Array.isArray(reference.notes)) {
      return stabilizeNotes(reference.notes).filter(Boolean).map((note, index) => {
        if (typeof note === "string") {
          return { id: "note_" + index, title: "Beleska " + (index + 1), body: note };
        }
        return {
          id: note.id || "note_" + index,
          title: note.title || "Beleska " + (index + 1),
          body: note.body || note.text || note.note || ""
        };
      });
    }
    if (reference.noteTitle || reference.note) {
      return [{
        id: "note_legacy",
        title: reference.noteTitle || translate("noteForm.defaultTitle", { number: 1 }),
        body: reference.note || ""
      }];
    }
    return [];
  }

  function getReferenceLinks(value) {
    return String(value || "")
      .split(/\n|,\s*(?=https?:\/\/|www\.)/i)
      .map((link) => link.trim())
      .filter(Boolean);
  }

  function uniqueTags(tags) {
    const seen = new Set();
    return tags
      .map((tag) => String(tag || "").trim())
      .filter((tag) => {
        const key = tag.toLowerCase();
        if (!tag || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 4);
  }

  function getCanvasCards(idea, context) {
    const cards = [];
    const directions = getDirections(idea);
    const activeDirection = directions.find((direction) => direction.id === context.directionId) || directions[0];
    if (activeDirection) [activeDirection].forEach((direction) => {
      getDirectionReferences(direction).forEach((reference) => {
        const links = getReferenceLinks(reference.link);
        const link = links[0] || "";
        const type = reference.cardType || (reference.image ? "image" : /(?:youtube\.com|youtu\.be|vimeo\.com)/i.test(link) ? "video" : reference.unitSystem === "finance" && !link ? "finance" : "link");
        cards.push({ key: "reference:" + direction.id + ":" + reference.id, parentKey: reference.canvasParentKey, canvasConnectionSides: reference.canvasConnectionSides, canvasPosition: reference.canvasPosition, source: "reference", type, direction, reference, title: reference.title, text: direction.title, url: link, urls: links, image: reference.image, price: reference.unitSystem === "finance" ? context.getReferenceUnitDisplay(reference) : "" });
        getReferenceNotes(reference, context.translate).forEach((note) => {
          cards.push({ key: "linked-note:" + direction.id + ":" + reference.id + ":" + note.id, parentKey: "reference:" + direction.id + ":" + reference.id, source: "linked-note", type: "note", direction, reference, note, title: note.title, text: note.body });
        });
      });
      stabilizeNotes(direction.notes, false).forEach((note, index) => {
        if (!note) return;
        const content = typeof note === "string" ? { id: String(index), title: context.translate("noteForm.defaultTitle", { number: index + 1 }), body: note } : { ...note, id: note.id || String(index) };
        cards.push({ key: "direction-note:" + direction.id + ":" + content.id, source: "direction-note", type: "note", direction, note: content, title: content.title, text: content.body || content.text });
      });
    });
    (Array.isArray(idea.pathData?.researchCanvasItems) ? idea.pathData.researchCanvasItems : []).filter((item) => {
      // Keep unsupported saved records intact, but do not expose them as editable canvas cards.
      if (!item || item.type && !["note", "av", "source", "link", "image", "video", "finance"].includes(item.type)) return false;
      // Cards saved before directions owned their canvas belong to the original first direction.
      const ownerId = item.directionId || directions[0]?.id;
      return !directions.length || ownerId === activeDirection?.id;
    }).forEach((item) => {
      cards.push({ ...item, key: "item:" + item.id, parentKey: item.canvasParentKey, source: "item", type: item.type || "note" });
    });
    if (!directions.length || activeDirection?.id === directions[0].id) context.getFinanceOptions().forEach((option, index) => {
      cards.push({ key: "finance:" + (option.id || index), source: "finance", type: "finance", title: option.title || option.label, text: option.label, price: context.formatFinancialMoney(option.totalCost) });
    });
    return cards;
  }

  function getCanvasGraph(cards, collapsed = {}) {
    const byKey = new Map(cards.map((card) => [card.key, card]));
    const parentByKey = new Map();
    const childrenByKey = new Map();
    cards.forEach((card) => {
      const parentKey = card.parentKey;
      if (!parentKey || parentKey === card.key || !byKey.has(parentKey)) return;
      const seen = new Set([card.key]);
      let cursor = parentKey;
      while (cursor && byKey.has(cursor) && !seen.has(cursor)) {
        seen.add(cursor);
        cursor = byKey.get(cursor).parentKey;
      }
      if (cursor && seen.has(cursor)) return;
      parentByKey.set(card.key, parentKey);
      if (!childrenByKey.has(parentKey)) childrenByKey.set(parentKey, []);
      childrenByKey.get(parentKey).push(card.key);
    });
    const hiddenKeys = new Set();
    const hideDescendants = (key) => {
      (childrenByKey.get(key) || []).forEach((childKey) => {
        if (hiddenKeys.has(childKey)) return;
        hiddenKeys.add(childKey);
        hideDescendants(childKey);
      });
    };
    cards.forEach((card) => { if (collapsed[card.key]) hideDescendants(card.key); });
    return { parentByKey, childrenByKey, hiddenKeys };
  }

  root.MentorResearchModel = {
    getDirections, getDirectionReferences, getReferenceNotes, getReferenceLinks, stabilizeNotes,
    uniqueTags, getCanvasCards, getCanvasGraph
  };
})(window);
