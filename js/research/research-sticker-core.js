(function (root) {
  "use strict";
  const TYPES = ["image", "video", "media", "notes", "link", "source", "unit", "av"];
  const TEMPLATES = { custom: [], media: ["media"], source: ["source"], unit: ["unit"], notes: ["notes"], av: ["av"] };
  const FONT_FAMILIES = Object.freeze(["Inter", "Georgia", "Arial", "monospace"]);
  function normalizeTypography(value) {
    const result = Object.fromEntries(["sectionTitleFont", "descriptionFont"].map((field) => [field, FONT_FAMILIES.includes(value?.[field]) ? value[field] : "inherit"]));
    for (const field of ["titleSize", "contentSize"]) if (value?.[field] !== "" && value?.[field] != null && Number.isFinite(Number(value[field]))) result[field] = Math.max(8, Math.min(72, Math.round(Number(value[field]))));
    for (const field of ["titleBold", "contentBold", "titleItalic", "contentItalic"]) if (typeof value?.[field] === "boolean") result[field] = value[field];
    for (const field of ["titleColor", "contentColor"]) if (typeof value?.[field] === "string" && /^#[0-9a-f]{6}$/i.test(value[field])) result[field] = value[field];
    return result;
  }
  function normalizeSectionAppearance(value) {
    return Object.fromEntries(["backgroundColor", "titleBackgroundColor"].filter((field) => typeof value?.[field] === "string" && /^#[0-9a-f]{6}$/i.test(value[field])).map((field) => [field, value[field]]));
  }
  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const uid = (prefix = "section") => prefix + "_" + (root.crypto?.randomUUID?.() || Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10));
  const number = (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback;
  function section(type) {
    if (!TYPES.includes(type)) throw new TypeError("Unknown sticker section.");
    const content = type === "notes" ? { text: "", format: "plain" } : type === "link" ? { url: "", title: "" }
      : type === "image" || type === "video" ? { asset: null, url: "" }
      : type === "unit" ? { measurements: [] } : type === "source" ? { files: [], url: "" } : { items: [], primaryId: "" };
    return { sectionId: uid(), sectionType: type, order: 0, enabled: true, collapsed: false, editorCollapsed: false, content,
      settings: type === "image" ? { fit: "contain", zoom: 1, x: 50, y: 50, rotation: 0 } : {} };
  }
  function normalize(document) {
    const result = clone(document);
    if (!result || result.version !== 1 || !Array.isArray(result.sections) || result.sections.length > 100) throw new TypeError("Invalid sticker document.");
    const ids = new Set();
    result.sections.forEach((entry, index) => {
      if (!entry?.sectionId || ids.has(entry.sectionId) || !TYPES.includes(entry.sectionType) || !entry.content || typeof entry.content !== "object") throw new TypeError("Invalid sticker section.");
      ids.add(entry.sectionId); entry.order = index; entry.enabled = entry.enabled !== false; entry.collapsed = Boolean(entry.collapsed);
      entry.editorCollapsed = Boolean(entry.editorCollapsed);
      if (entry.typography !== undefined) entry.typography = normalizeTypography(entry.typography);
      if (entry.appearance !== undefined) entry.appearance = normalizeSectionAppearance(entry.appearance);
      entry.settings = entry.settings && typeof entry.settings === "object" ? entry.settings : {};
      if (Array.isArray(entry.content)) throw new TypeError("Invalid sticker content.");
      for (const field of ["items", "files"]) if (field in entry.content && !Array.isArray(entry.content[field])) throw new TypeError("Invalid sticker assets.");
      const entryAssets = [...(entry.content.asset == null ? [] : [entry.content.asset]), ...(entry.content.items || []), ...(entry.content.files || [])];
      entryAssets.forEach((asset) => { if (!asset || typeof asset !== "object" || Array.isArray(asset) || typeof asset.id !== "string" || !["image", "video", "audio", "file", "pdf", "docx", "txt", "source", "av"].includes(asset.kind)) throw new TypeError("Invalid sticker asset."); });
      if (entry.sectionType === "image") entry.settings = { fit: entry.settings.fit === "cover" ? "cover" : "contain", zoom: number(entry.settings.zoom, 1, 4, 1), x: number(entry.settings.x, 0, 100, 50), y: number(entry.settings.y, 0, 100, 50), rotation: number(entry.settings.rotation, -180, 180, 0) };
      if (entry.sectionType === "unit") {
        if (!Array.isArray(entry.content.measurements)) throw new TypeError("Invalid measurements.");
        entry.content.measurements.forEach((measurement) => {
          if (!measurement.id || measurement.value !== "" && !Number.isFinite(Number(measurement.value))) throw new TypeError("Invalid measurement.");
          if (measurement.value !== "") measurement.value = Number(measurement.value);
        });
      }
    });
    result.collapsed = Boolean(result.collapsed);
    result.template = Object.hasOwn(TEMPLATES, result.template) ? result.template : "custom";
    result.title = String(result.title || "").slice(0, 500);
    if (result.typography !== undefined) result.typography = normalizeTypography(result.typography);
    return result;
  }
  function assetFromCard(card, kind) {
    const mediaId = card.attachmentMediaId || card.videoMediaId || "";
    return { id: uid("asset"), kind: kind || card.attachmentKind || card.type, name: card.attachmentName || card.title || "", mime: card.attachmentMime || "", size: 0,
      url: card.image || card.url || "", mediaId, entityType: card.videoMediaId ? "research-video" : mediaId ? "research-" + card.type : "" };
  }
  function fromCard(card = {}, template = "custom") {
    const document = { version: 1, title: card.title || "", template, collapsed: false, sections: [] };
    const add = (type, content) => { const entry = section(type); Object.assign(entry.content, content); document.sections.push(entry); return entry; };
    if (card.image || card.type === "image") add("image", { asset: card.image ? assetFromCard({ ...card, url: "", videoMediaId: "", attachmentMediaId: "" }, "image") : null });
    if (card.type === "video") add("video", { asset: assetFromCard({ ...card, image: "" }, "video"), url: card.url || "" });
    if (card.type === "source") add("source", { files: card.attachmentMediaId ? [assetFromCard(card)] : [], url: card.url || "" });
    if (card.type === "av") add("av", { items: card.attachmentMediaId ? [assetFromCard(card)] : [] });
    if (card.source !== "reference" && (card.text || card.note?.body || card.type === "note" && (card.key || template === "notes"))) add("notes", { text: card.note?.body || card.text || "" });
    (card.urls || [card.url]).filter(Boolean).forEach((url) => { if (!["source", "av", "video"].includes(card.type)) add("link", { url }); });
    if (card.type === "link" && !document.sections.some((entry) => entry.sectionType === "link")) add("link", {});
    const legacy = card.reference || card;
    if (legacy.unitValue !== undefined && legacy.unitValue !== "" || card.price) {
      const units = { money_eur: ["currency", "EUR"], percent: ["other", "%"], quantity: ["quantity", "qty"], count: ["quantity", ""], weight_kg: ["mass", "kg"], distance_km: ["distance", "km"], area_m2: ["other", "m2"], volume_l: ["volume", "L"], minutes: ["time", "min"], hours: ["time", "h"], days: ["time", "d"] };
      const [dimension, unit] = units[legacy.unitType] || ["other", legacy.unitCustom || ""];
      const value = String(legacy.unitValue ?? card.price ?? "").trim();
      const match = value.match(/^(-?\d+(?:[.,]\d+)?)\s*([A-Z]{3})?$/);
      const entry = add("unit", {});
      if (match) entry.content.measurements.push({ id: uid("measurement"), value: Number(match[1].replace(",", ".")), unit: match[2] || unit, dimension: match[2] ? "currency" : dimension, label: legacy.unitLabel || "" });
      else entry.content.legacyDisplay = value + (unit && !/[^\d\s.,-]$/.test(value) ? " " + unit : "");
    }
    if (!document.sections.length) (TEMPLATES[template] || []).forEach((type) => add(type, {}));
    return normalize(document);
  }
  function read(idea, card, template = "custom") {
    const saved = card.key && idea?.pathData?.researchCanvasStickerDocuments?.[card.key];
    if (saved) { try { return normalize(saved); } catch (_) { /* Preserve an unreadable saved document; callers refuse to overwrite it. */ } }
    return fromCard(card, template);
  }
  function assets(document) {
    return (document?.sections || []).flatMap((entry) => [entry.content?.asset, ...(entry.content?.items || []), ...(entry.content?.files || [])]).filter(Boolean);
  }
  function mediaReferences(value, output = new Map()) {
    if (!value || typeof value !== "object") return output;
    if (value.mediaId && value.entityType) output.set(value.entityType + "\n" + value.mediaId, { entityType: value.entityType, mediaId: value.mediaId });
    if (value.videoMediaId) output.set("research-video\n" + value.videoMediaId, { entityType: "research-video", mediaId: value.videoMediaId });
    if (value.attachmentMediaId) output.set("research-" + value.type + "\n" + value.attachmentMediaId, { entityType: "research-" + value.type, mediaId: value.attachmentMediaId });
    Object.values(value).forEach((child) => { if (child && typeof child === "object") mediaReferences(child, output); });
    return output;
  }
  function compatibility(document) {
    const active = document.sections.filter((entry) => entry.enabled);
    const image = active.find((entry) => entry.sectionType === "image")?.content.asset;
    const video = active.find((entry) => entry.sectionType === "video")?.content;
    const attachment = active.find((entry) => ["source", "av"].includes(entry.sectionType));
    const file = attachment?.content.files?.[0] || attachment?.content.items?.[0];
    return { title: document.title, text: active.filter((entry) => entry.sectionType === "notes").map((entry) => entry.content.text || "").join("\n\n"),
      image: image && !image.mediaId ? image.url || "" : "", url: active.find((entry) => entry.sectionType === "link")?.content.url || video?.url || attachment?.content.url || "",
      videoMediaId: video?.asset?.mediaId || "", attachmentMediaId: file?.mediaId || "", attachmentName: file?.name || "", attachmentKind: file?.kind || "", attachmentMime: file?.mime || "" };
  }
  function apply(pathData, card, document) {
    if (card.key && pathData.researchCanvasStickerDocuments?.[card.key]) normalize(pathData.researchCanvasStickerDocuments[card.key]);
    const doc = normalize(document), fields = compatibility(doc);
    let key = card.key;
    const directions = pathData.researchDirections || pathData.directions || [];
    const direction = directions.find((entry) => entry.id === (card.direction?.id || card.directionId));
    if (card.source === "reference") {
      const reference = direction?.references?.find((entry) => entry.id === card.reference?.id);
      if (!reference) throw new Error("Sticker owner no longer exists.");
      Object.assign(reference, { title: fields.title, image: fields.image, link: doc.sections.filter((entry) => entry.enabled && entry.sectionType === "link").map((entry) => entry.content.url).filter(Boolean).join("\n") });
    } else if (["linked-note", "direction-note", "new-linked-note"].includes(card.source)) {
      const linked = card.source !== "direction-note";
      const reference = linked && direction?.references?.find((entry) => entry.id === card.reference?.id);
      const owner = linked ? reference : direction;
      if (!owner) throw new Error("Sticker owner no longer exists.");
      // Materialize the existing legacy IDs before inserting/deleting notes, so their keys never shift.
      const notes = Array.isArray(owner.notes) ? owner.notes : linked && (owner.note || owner.noteTitle) ? [{ id: "note_legacy", title: owner.noteTitle || "", body: owner.note || "" }] : [];
      owner.notes = root.MentorResearchModel?.stabilizeNotes ? root.MentorResearchModel.stabilizeNotes(notes, linked) : notes.map((note, index) => typeof note === "string" ? { id: linked ? "note_" + index : String(index), title: "", body: note } : { ...note, id: note.id || (linked ? "note_" + index : String(index)) });
      const id = card.note?.id || card.id || uid("note");
      const index = owner.notes.findIndex((note) => note.id === id);
      if (index < 0 && card.source !== "new-linked-note") throw new Error("Sticker owner no longer exists.");
      const next = { ...(owner.notes[index] || {}), id, title: fields.title, body: fields.text };
      if (index < 0) owner.notes.push(next); else owner.notes[index] = next;
      if (linked) { owner.noteTitle = owner.notes[0]?.title || ""; owner.note = owner.notes[0]?.body || ""; }
      key = linked ? "linked-note:" + direction.id + ":" + reference.id + ":" + id : "direction-note:" + direction.id + ":" + id;
    } else {
      const items = Array.isArray(pathData.researchCanvasItems) ? pathData.researchCanvasItems : [];
      const index = items.findIndex((entry) => entry.id === card.id);
      if (card.key && index < 0) throw new Error("Sticker owner no longer exists.");
      const id = card.id || uid("canvas");
      const next = { ...(items[index] || {}), id, type: items[index]?.type || card.type || "note", directionId: items[index]?.directionId || card.directionId || "", canvasParentKey: items[index]?.canvasParentKey || card.canvasParentKey || card.parentKey || "", ...fields };
      if (index < 0) { next.canvasPosition = card.canvasPosition; next.canvasConnectionSides = card.canvasConnectionSides; }
      pathData.researchCanvasItems = index < 0 ? [...items, next] : items.map((item, position) => position === index ? next : item);
      key = "item:" + id;
    }
    if (!key || /undefined/.test(key)) throw new Error("A stable sticker key is required.");
    pathData.researchCanvasStickerDocuments = { ...(pathData.researchCanvasStickerDocuments || {}), [key]: doc };
    return key;
  }
  function move(document, sectionId, targetIndex) {
    const index = document.sections.findIndex((entry) => entry.sectionId === sectionId);
    if (index < 0) return;
    const entry = document.sections.splice(index, 1)[0];
    document.sections.splice(Math.max(0, Math.min(document.sections.length, targetIndex)), 0, entry);
    document.sections.forEach((item, order) => { item.order = order; });
  }
  function syncLegacy(pathData, key, patch) {
    const saved = pathData.researchCanvasStickerDocuments?.[key];
    if (!saved) return;
    let doc; try { doc = normalize(saved); } catch (_) { return; }
    if ("title" in patch) doc.title = String(patch.title || "");
    const ensure = (type) => { let entry = doc.sections.find((item) => item.sectionType === type && item.enabled); if (!entry) { entry = section(type); doc.sections.push(entry); } return entry; };
    if ("text" in patch) {
      const entries = doc.sections.filter((entry) => entry.sectionType === "notes" && entry.enabled);
      const current = entries.map((entry) => entry.content.text || "").join("\n\n");
      if (current !== patch.text) {
        ensure("notes").content.text = String(patch.text || "");
        // The legacy editor edits the aggregate text. Keep other section bodies
        // recoverable while displaying the exact replacement the user entered.
        entries.slice(1).forEach((entry) => { entry.enabled = false; });
      }
    }
    if ("image" in patch) ensure("image").content.asset = patch.image ? assetFromCard({ image: patch.image }, "image") : null;
    if ("unit" in patch) { const entry = ensure("unit"); if (patch.unit) entry.content = clone(patch.unit); else entry.enabled = false; }
    if ("links" in patch) {
      const links = patch.links, entries = doc.sections.filter((entry) => entry.sectionType === "link" && entry.enabled);
      links.forEach((url, index) => { const entry = entries[index] || section("link"); if (!entries[index]) doc.sections.push(entry); entry.content.url = url; });
      entries.slice(links.length).forEach((entry) => { entry.enabled = false; });
    }
    pathData.researchCanvasStickerDocuments[key] = normalize(doc);
  }
  root.MentorResearchStickerCore = Object.freeze({ TYPES, TEMPLATES, FONT_FAMILIES, normalizeTypography, normalizeSectionAppearance, clone, uid, section, normalize, fromCard, read, assets, mediaReferences, compatibility, apply, move, syncLegacy });
})(window);
