(function (root) {
  "use strict";
  const templateIconPaths = {
    custom: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />',
    media: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />',
    source: '<path d="M4 12.15V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2h-3.35" /><path d="M14 2v5a1 1 0 0 0 1 1h5" /><path d="m5 16-3 3 3 3" /><path d="m9 22 3-3-3-3" />',
    unit: '<path d="M18 7V5a1 1 0 0 0-1-1H6.5a.5.5 0 0 0-.4.8l4.5 6a2 2 0 0 1 0 2.4l-4.5 6a.5.5 0 0 0 .4.8H17a1 1 0 0 0 1-1v-2" />',
    notes: '<path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4" /><path d="M2 6h4" /><path d="M2 10h4" /><path d="M2 14h4" /><path d="M2 18h4" /><path d="M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z" />',
    av: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />'
  };
  function templateIcon(template) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + templateIconPaths[template] + '</svg>';
  }
  let active = null;
  const editorPreferences = new Map();
  const unsavedEditorPreferences = new Set();
  const EDITOR_APPEARANCE_KEY = "mentorResearchStickerEditorAppearanceV1";
  const DEFAULT_EDITOR_COLORS = { background: "#21392b", sections: "#3a5141", buttons: "#405d49", tabs: "#34493b" };
  let editorColors = { ...DEFAULT_EDITOR_COLORS }, unsavedEditorColors = false;
  const validEditorColor = (value) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
  function readEditorColors() {
    if (!unsavedEditorColors) try {
      const value = JSON.parse(root.localStorage?.getItem(EDITOR_APPEARANCE_KEY) || "null");
      if (value?.version === 1 && ["background", "sections", "buttons"].every((key) => validEditorColor(value.colors?.[key]))) {
        editorColors = Object.fromEntries(Object.keys(DEFAULT_EDITOR_COLORS).map((key) => [key, validEditorColor(value.colors[key]) ? value.colors[key].toLowerCase() : DEFAULT_EDITOR_COLORS[key]]));
      }
    } catch (_) { /* Appearance preferences remain usable without browser storage. */ }
    return { ...editorColors };
  }
  function writeEditorColor(key, value) {
    if (!Object.hasOwn(DEFAULT_EDITOR_COLORS, key) || !validEditorColor(value)) return false;
    editorColors = { ...editorColors, [key]: value.toLowerCase() }; unsavedEditorColors = true;
    try {
      root.localStorage?.setItem(EDITOR_APPEARANCE_KEY, JSON.stringify({ version: 1, colors: editorColors }));
      unsavedEditorColors = false;
    } catch (_) { /* Keep the selected colors in memory when persistence is unavailable. */ }
    return true;
  }
  function applyEditorColors(panel, colors) {
    Object.entries(colors).forEach(([key, color]) => {
      const rgb = [1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16));
      const luminance = rgb.map((channel) => { const value = channel / 255; return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4; });
      const light = luminance[0] * 0.2126 + luminance[1] * 0.7152 + luminance[2] * 0.0722 > 0.179;
      const foreground = light ? "#000000" : "#ffffff", contrastTarget = light ? 255 : 0;
      const shade = (amount) => "#" + rgb.map((channel) => Math.round(channel * (1 - amount) + contrastTarget * amount).toString(16).padStart(2, "0")).join("");
      const set = (suffix, value) => panel.style?.setProperty("--research-editor-" + key + suffix, value);
      set("", color); set("-text", foreground); set("-control", shade(0.2)); set("-hover", shade(0.1));
      set("-border", light ? "rgba(0,0,0,.35)" : "rgba(255,255,255,.3)");
    });
  }
  function renderEditorColors(t, escape, colors) {
    return '<div class="research-sticker-editor-colors" role="group" aria-label="' + escape(t("designer.editorColors")) + '">' +
      [["background", "editorBackground"], ["sections", "editorSections"], ["buttons", "editorButtons"], ["tabs", "editorTabs"]].map(([key, label]) =>
        '<label class="research-sticker-editor-color" title="' + escape(t("designer." + label + "Color")) + '"><span>' + escape(t("designer." + label)) + '</span><input type="color" data-designer-editor-color="' + key + '" value="' + colors[key] + '" aria-label="' + escape(t("designer." + label + "Color")) + '"></label>').join("") + '</div>';
  }
  function renderSectionOptions(t, escape) {
    const label = (key, control) => '<label><span>' + escape(t("designer." + key)) + '</span>' + control + '</label>';
    const fonts = (attribute) => '<select ' + attribute + '>' + ["inherit", ...root.MentorResearchStickerCore.FONT_FAMILIES].map((font) => '<option value="' + font + '">' + escape(t("designer.fonts." + font)) + '</option>').join("") + '</select>';
    const color = (field, key, whole = false) => label(key, '<span class="research-sticker-option-color"><input type="color" ' + (whole ? 'data-whole-option' : 'data-section-option') + '="' + field + '"><button type="button" data-reset-style-field="' + field + '"' + (whole ? ' data-reset-whole-style' : '') + ' aria-label="' + escape(t("designer.inheritStyle")) + '" title="' + escape(t("designer.inheritStyle")) + '">↶</button></span>');
    const typography = (prefix, family) => '<fieldset data-section-option-group="' + prefix + '"><legend>' + escape(t("designer." + (prefix === "title" ? "optionTitle" : "optionContent"))) + '</legend>' +
      label("optionFont", fonts('data-section-option="' + family + '"')) + label("optionSize", '<input type="number" min="8" max="72" step="1" data-section-option="' + prefix + 'Size" placeholder="' + escape(t("designer.inherited")) + '">') +
      '<div class="research-sticker-option-flags">' + [["Bold", "bold"], ["Italic", "italic"]].map(([field, key]) => '<label><input type="checkbox" data-section-option="' + prefix + field + '"><span>' + escape(t("designer." + key)) + '</span></label>').join("") + '</div>' + color(prefix + "Color", "optionTextColor") + '</fieldset>';
    return '<aside class="research-sticker-section-options-panel" data-panel="sticker-section-options" id="research-sticker-section-options" aria-label="' + escape(t("designer.sectionOptions")) + '" aria-hidden="true" inert><div class="research-sticker-section-options-heading"><strong>' + escape(t("designer.sectionOptions")) + '</strong><button type="button" data-designer-action="close-section-options" aria-label="' + escape(t("actions.close")) + '">×</button></div>' +
      label("optionsTarget", '<select data-section-options-target></select>') + '<strong class="research-sticker-options-target-name" data-section-options-name></strong>' +
      '<div data-whole-options>' + color("backgroundColor", "optionBackground", true) + color("borderColor", "optionBorder", true) + color("textColor", "optionTextColor", true) + color("unitFillColor", "unitFillColor", true) + label("optionFont", fonts('data-whole-option="fontFamily"')) + label("optionSize", '<input type="number" min="11" max="24" step="1" data-whole-option="fontSize" placeholder="' + escape(t("designer.inherited")) + '">') + '</div>' +
      '<div data-section-options-fields>' + typography("title", "sectionTitleFont") + typography("content", "descriptionFont") + '<div data-section-title-background>' + color("titleBackgroundColor", "optionTitleBackground") + '</div>' + color("backgroundColor", "optionBackground") + '<button type="button" data-designer-action="reset-section-style">' + escape(t("designer.resetSectionStyle")) + '</button></div></aside>';
  }
  function editorPreferenceKey(idea, card) {
    return idea?.id && card.key ? "mentorResearchStickerEditorV1:" + JSON.stringify([idea.id, card.key]) : null;
  }
  function readEditorPreferences(key) {
    if (!key) return {};
    if (unsavedEditorPreferences.has(key)) return editorPreferences.get(key) || {};
    try {
      const value = JSON.parse(root.localStorage?.getItem(key) || "null");
      if (value?.version === 1 && value.sections && typeof value.sections === "object" && !Array.isArray(value.sections)) {
        editorPreferences.set(key, value.sections);
      }
    } catch (_) { /* Accordion preferences remain usable when storage is unavailable. */ }
    return editorPreferences.get(key) || {};
  }
  function writeEditorPreferences(key, states) {
    if (!key) return;
    editorPreferences.set(key, states);
    unsavedEditorPreferences.add(key);
    try {
      const stored = root.localStorage?.getItem(key);
      if (stored) {
        const value = JSON.parse(stored);
        if (value?.version !== 1 || !value.sections || typeof value.sections !== "object" || Array.isArray(value.sections)) return;
      }
      root.localStorage?.setItem(key, JSON.stringify({ version: 1, sections: states }));
      unsavedEditorPreferences.delete(key);
    } catch (_) { /* Preserve malformed data and keep the current session usable. */ }
  }
  function open(host, options) {
    if (active?.saving) return;
    active?.close();
    const core = root.MentorResearchStickerCore, sections = root.MentorResearchStickerSections, editors = root.MentorResearchStickerEditors;
    const { t, escape } = options;
    const card = { ...options.card };
    if (!card.key && !card.id) card.id = core.uid(card.source === "new-linked-note" ? "note" : "canvas");
    const saved = card.key && options.idea?.pathData?.researchCanvasStickerDocuments?.[card.key];
    let draft;
    try { draft = saved ? core.normalize(saved) : core.fromCard(card, options.template || "custom"); }
    catch (_) { root.alert?.(t("designer.invalidDocument")); return null; }
    const stickerStyles = root.MentorResearchStickerStyle;
    let stickerStyle = stickerStyles?.read(options.idea, card.key) || {}, stickerStyleChanged = false;
    const preferenceKey = editorPreferenceKey(options.idea, card), preferences = readEditorPreferences(preferenceKey);
    // Legacy cards generate fresh section IDs until their first document save.
    const legacyKeys = new Map(), typeCounts = {};
    draft.sections.forEach((entry) => {
      const count = typeCounts[entry.sectionType] || 0; typeCounts[entry.sectionType] = count + 1;
      const key = saved ? entry.sectionId : "legacy:" + entry.sectionType + ":" + count;
      legacyKeys.set(entry.sectionId, key);
      if (typeof preferences[key] === "boolean") entry.editorCollapsed = preferences[key];
    });
    let optionsTarget = draft.sections.find((entry) => !entry.editorCollapsed)?.sectionId || "whole";
    const session = { alive: true, saving: false, pending: new Map(), urls: new Set(), recordings: new Set(), generation: 0, busy: 0, preview: null };
    const trigger = document.activeElement;
    const panel = document.createElement("div"); panel.className = "research-sticker-designer-overlay"; panel.dataset.researchStickerDesigner = "";
    const appearance = readEditorColors();
    applyEditorColors(panel, appearance);
    panel.setAttribute("role", "dialog"); panel.setAttribute("aria-modal", "true"); panel.setAttribute("aria-labelledby", "research-sticker-designer-title");
    const optionsToggle = '<button type="button" class="research-sticker-options-toggle" data-designer-action="toggle-section-options" aria-controls="research-sticker-section-options" aria-expanded="false" aria-label="' + escape(t("designer.sectionOptions")) + '" title="' + escape(t("designer.sectionOptions")) + '"><span aria-hidden="true">⚙</span></button>';
    panel.innerHTML = [
      '<div class="research-sticker-designer" data-panel="sticker-designer">',
      '<header class="research-sticker-designer-head"><div class="research-sticker-designer-title"><small>' + escape(t("designer.eyebrow")) + '</small><h2 id="research-sticker-designer-title">' + escape(t(card.key ? "designer.editTitle" : "designer.createTitle")) + '</h2></div><div class="research-sticker-designer-head-actions">' + renderEditorColors(t, escape, appearance) + '</div></header>',
      '<div class="research-sticker-template-strip" data-panel="sticker-templates"><div class="research-sticker-template-label">' + escape(t("designer.template")) + '</div><div class="research-sticker-templates" role="group" aria-label="' + escape(t("designer.template")) + '">' + Object.keys(core.TEMPLATES).map((template) => '<button type="button" data-designer-template="' + template + '" aria-pressed="' + (draft.template === template) + '"><span aria-hidden="true">' + templateIcon(template) + '</span>' + escape(t("designer.templates." + template)) + '</button>').join("") + '</div></div>',
      '<div class="research-sticker-designer-layout" data-panel="sticker-layout"><section class="research-sticker-designer-preview" data-panel="sticker-preview" aria-label="' + escape(t("designer.preview")) + '"><div class="research-sticker-panel-heading"><strong>◉ ' + escape(t("designer.preview")) + '</strong><p>' + escape(t("designer.previewHint")) + '</p></div><div data-designer-preview></div></section>',
      '<section class="research-sticker-designer-builder" data-panel="sticker-builder"><div class="research-sticker-panel-heading"><strong>✎ ' + escape(t("designer.builder")) + '</strong><p>' + escape(t("designer.builderHint")) + '</p></div><label class="research-sticker-title-input"><span>' + escape(t("canvas.title")) + '</span><input data-designer-title value="' + escape(draft.title) + '" maxlength="500"></label>',
      '<div class="research-sticker-section-list-heading"><strong>' + escape(t("designer.sectionList")) + '</strong><div class="research-sticker-add-wrap"><button type="button" data-designer-action="toggle-add" aria-expanded="false">+ ' + escape(t("designer.addSection")) + '</button><div class="research-sticker-add-menu" data-designer-add-menu hidden>' + core.TYPES.map((type) => '<button type="button" data-designer-add="' + type + '"><span aria-hidden="true">' + sections.renderIcon(type) + '</span>' + escape(t("designer.sections." + type)) + '</button>').join("") + '</div></div></div><div class="research-sticker-editor-list" data-designer-editors></div></section></div>',
      '<footer class="research-sticker-designer-footer"><p role="status" aria-live="polite" data-designer-status></p><button type="button" class="research-secondary-btn" data-designer-action="cancel">' + escape(t("actions.cancel")) + '</button><button type="button" class="research-primary-btn" data-designer-action="save">' + escape(t("actions.save")) + '</button></footer><span class="research-sticker-designer-resize-grip" aria-hidden="true"></span></div>',
      optionsToggle, renderSectionOptions(t, escape)
    ].join("");
    document.body.append(panel); root.MentorResearch?.setModalLayer?.(true);
    panel.querySelectorAll("input[data-designer-editor-color]").forEach((input) => input.addEventListener("input", (event) => {
      event.stopPropagation();
      if (writeEditorColor(input.dataset.designerEditorColor, input.value)) applyEditorColors(panel, editorColors);
    }));
    const preview = panel.querySelector("[data-designer-preview]"), list = panel.querySelector("[data-designer-editors]"), status = panel.querySelector("[data-designer-status]");
    const addMenu = panel.querySelector("[data-designer-add-menu]"), addButton = panel.querySelector('[data-designer-action="toggle-add"]');
    panel.appendChild(addMenu);
    function closeAddMenu() { addMenu.hidden = true; addButton.setAttribute("aria-expanded", "false"); }
    function positionAddMenu() {
      if (addMenu.hidden || !session.alive) return;
      const margin = 8, gap = 6, anchor = addButton.getBoundingClientRect();
      addMenu.style.maxHeight = Math.max(0, root.innerHeight - margin * 2) + "px";
      const below = root.innerHeight - anchor.bottom - margin - gap, above = anchor.top - margin - gap;
      const opensBelow = below >= addMenu.offsetHeight || below >= above;
      addMenu.style.maxHeight = Math.max(0, Math.min(root.innerHeight - margin * 2, opensBelow ? below : above)) + "px";
      const left = Math.max(margin, Math.min(anchor.right - addMenu.offsetWidth, root.innerWidth - addMenu.offsetWidth - margin));
      const top = opensBelow ? anchor.bottom + gap : anchor.top - gap - addMenu.offsetHeight;
      addMenu.style.left = left + "px"; addMenu.style.top = Math.max(margin, Math.min(top, root.innerHeight - addMenu.offsetHeight - margin)) + "px";
    }
    panel.addEventListener("scroll", (event) => { if (event.target !== addMenu) positionAddMenu(); }, true);
    root.addEventListener("resize", positionEditorTools);
    const menuResizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(positionEditorTools) : null;
    menuResizeObserver?.observe(panel.querySelector('[data-panel="sticker-designer"]'));
    const scope = core.uid("preview"), find = (id) => draft.sections.find((entry) => entry.sectionId === id);
    const optionsPanel = panel.querySelector('[data-panel="sticker-section-options"]');
    const optionsButton = panel.querySelector('[data-designer-action="toggle-section-options"]');
    const layout = panel.querySelector('[data-panel="sticker-layout"]');
    const designer = panel.querySelector('[data-panel="sticker-designer"]');
    let optionsOpen = false, gearAnimation = null, gearStart = 0, gearEnd = 0;
    const getMeasurementCount = () => draft.sections.filter((entry) => entry.sectionType === "unit").reduce((count, entry) => count + (entry.content.measurements || []).length, 0);
    const context = { t, escape, scope, getMeasurementCount };
    const openAsset = (asset, trigger) => options.openAsset(asset, trigger, session.pending.get(asset?.id));
    const getEditor = (id) => Array.from(list.children).find((node) => node.dataset.designerSection === id);
    const message = (key) => { status.textContent = key ? t("designer." + key) : ""; };
    const sectionName = (entry) => entry.label || t("designer.sections." + entry.sectionType);
    function positionEditorTools() { positionAddMenu(); positionOptionsDrawer(); }
    function positionOptionsDrawer() {
      const bounds = designer.getBoundingClientRect?.(); if (!bounds || !session.alive) return;
      const width = root.innerWidth, height = root.innerHeight, margin = 12, gap = 8;
      const rightSpace = width - margin - bounds.right - gap;
      const adjacent = rightSpace >= 240;
      const drawerWidth = Math.min(280, adjacent ? rightSpace : width - margin * 2);
      const drawerHeight = Math.max(0, Math.min(bounds.height, height - margin * 2));
      const left = adjacent ? bounds.right + gap : Math.max(margin, Math.min(bounds.right - drawerWidth, width - margin - drawerWidth));
      const top = Math.max(margin, Math.min(bounds.top, height - margin - drawerHeight));
      Object.entries({ left, top, width: drawerWidth, height: drawerHeight }).forEach(([name, value]) => optionsPanel.style.setProperty(name, value + "px"));
      optionsPanel.classList.toggle("is-overlay-drawer", !adjacent);
      const builder = panel.querySelector('[data-panel="sticker-builder"]');
      const builderBounds = builder.getBoundingClientRect();
      const builderStyle = root.getComputedStyle(builder);
      const insetRight = parseFloat(builderStyle.paddingRight) || 0;
      const insetTop = parseFloat(builderStyle.paddingTop) || 0;
      optionsButton.style.left = Math.max(4, Math.min(builderBounds.right - insetRight - 36, width - 40)) + "px";
      optionsButton.style.top = Math.max(4, Math.min(builderBounds.top + insetTop + 15, height - 50)) + "px";
    }
    function spinOptionsGear() {
      const progress = gearAnimation?.effect?.getComputedTiming().progress ?? 1;
      const start = gearAnimation ? gearStart + (gearEnd - gearStart) * progress : gearEnd;
      gearAnimation?.cancel(); gearAnimation = null;
      if (root.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
      const icon = optionsButton.querySelector?.("span"); if (!icon?.animate) return;
      gearStart = start; gearEnd = start + (optionsOpen ? 180 : -180);
      const animation = icon.animate([{ rotate: gearStart + "deg" }, { rotate: gearEnd + "deg" }], { duration: 280, easing: "linear" });
      gearAnimation = animation;
      animation.onfinish = () => { if (gearAnimation === animation) gearAnimation = null; };
    }
    function setOptionsOpen(open) {
      open = Boolean(open); if (open === optionsOpen) return;
      if (!open && optionsPanel.contains?.(document.activeElement)) optionsButton.focus({ preventScroll: true });
      optionsOpen = open;
      optionsPanel.inert = !open; optionsPanel.setAttribute("aria-hidden", String(!open));
      optionsPanel.classList.toggle("is-open", open); layout.classList?.toggle("has-section-options", open);
      optionsButton.setAttribute("aria-expanded", String(open));
      positionOptionsDrawer(); spinOptionsGear(); if (open) syncOptions();
    }
    function syncOptionsTargets() {
      if (!optionsPanel?.querySelector) return;
      if (optionsTarget !== "whole" && !find(optionsTarget)) optionsTarget = draft.sections.find((entry) => !entry.editorCollapsed)?.sectionId || "whole";
      const select = optionsPanel.querySelector("[data-section-options-target]");
      select.innerHTML = '<option value="whole">' + escape(t("designer.wholeSticker")) + '</option>' + draft.sections.map((entry) => '<option value="' + escape(entry.sectionId) + '">' + escape(sectionName(entry)) + '</option>').join("");
      select.value = optionsTarget;
      syncOptions();
    }
    function sectionBackground(entry) {
      if (validEditorColor(entry?.appearance?.backgroundColor)) return entry.appearance.backgroundColor;
      if (validEditorColor(stickerStyle.backgroundColor)) return stickerStyle.backgroundColor;
      const article = preview.querySelector(".research-canvas-card");
      const computed = article && root.getComputedStyle?.(article);
      const inherited = computed?.getPropertyValue("--research-sticker-background").trim();
      if (validEditorColor(inherited)) return inherited;
      const channels = computed?.backgroundColor.match(/^rgba?\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)/);
      return channels ? "#" + channels.slice(1, 4).map((channel) => Number(channel).toString(16).padStart(2, "0")).join("") : "#203729";
    }
    function syncTitleBackground(entry) {
      if (entry?.sectionId !== optionsTarget) return;
      const input = optionsPanel.querySelector('[data-section-option="titleBackgroundColor"]');
      if (input) input.value = entry.appearance?.titleBackgroundColor || sections.titleBackgroundColor(sectionBackground(entry));
    }
    function syncOptions() {
      if (!optionsPanel?.querySelector) return;
      const whole = optionsTarget === "whole", entry = find(optionsTarget);
      optionsPanel.querySelector("[data-section-options-target]").value = optionsTarget;
      optionsPanel.querySelector("[data-section-options-name]").textContent = whole ? t("designer.wholeSticker") : entry ? sectionName(entry) : "";
      optionsPanel.querySelector("[data-whole-options]").hidden = !whole;
      optionsPanel.querySelector("[data-section-options-fields]").hidden = whole || !entry;
      const defaults = stickerStyles?.defaults(card.type) || { backgroundColor: "#203729", textColor: "#f8ecd1", borderColor: "#f3dead" };
      optionsPanel.querySelectorAll("[data-whole-option]").forEach((input) => {
        const field = input.dataset.wholeOption; input.disabled = !stickerStyles;
        input.value = field === "fontFamily" ? stickerStyle[field] || "inherit" : field === "fontSize" ? stickerStyle[field] ?? "" : stickerStyle[field] || defaults[field] || "#2c4131";
      });
      optionsPanel.querySelector('[data-section-option-group="title"]').hidden = entry?.sectionType === "unit";
      optionsPanel.querySelector("[data-section-title-background]").hidden = entry?.sectionType === "unit";
      const typography = core.normalizeTypography(entry?.typography), inherited = core.normalizeTypography(draft.typography);
      optionsPanel.querySelectorAll("[data-section-option]").forEach((input) => {
        const field = input.dataset.sectionOption;
        if (input.type === "checkbox") input.checked = typography[field] ?? inherited[field] ?? false;
        else if (field === "backgroundColor") input.value = sectionBackground(entry);
        else if (field === "titleBackgroundColor") input.value = entry?.appearance?.titleBackgroundColor || sections.titleBackgroundColor(sectionBackground(entry));
        else if (input.type === "color") input.value = typography[field] || inherited[field] || stickerStyle.textColor || defaults.textColor;
        else input.value = typography[field] ?? "";
      });
      Array.from(list.children).forEach((editor) => editor.classList?.toggle("is-options-target", editor.dataset.designerSection === optionsTarget));
    }
    function setOptionsTarget(id, open = false) {
      if (id !== "whole" && !find(id)) return;
      optionsTarget = id; syncOptions(); if (open) setOptionsOpen(true);
    }
    function paintStickerStyle() {
      if (!stickerStyleChanged || !stickerStyles) return;
      const element = preview.querySelector(".research-canvas-card"); if (!element?.style) return;
      const variables = { backgroundColor: "background", borderColor: "border", textColor: "text", unitFillColor: "unit-fill", fontFamily: "font", fontSize: "size" };
      Object.entries(variables).forEach(([field, suffix]) => {
        const name = "--research-sticker-" + suffix, value = stickerStyle[field];
        if (value === undefined) element.style.removeProperty(name);
        else element.style.setProperty(name, String(value) + (field === "fontSize" ? "px" : ""));
      });
      element.style.setProperty("--research-sticker-control", stickerStyles.controlColor(stickerStyle.backgroundColor));
      const document = preview.querySelector("[data-sticker-document]"); if (document) sections.syncLayout?.(document);
      syncTitleBackground(find(optionsTarget));
    }
    function paintSectionStyle(entry) {
      const target = Array.from(preview.querySelectorAll("[data-sticker-section]")).find((node) => node.dataset.stickerSection === entry.sectionId);
      sections.applySectionStyle?.(target, entry);
      syncTitleBackground(entry);
    }
    const updateSaveButtons = () => { panel.querySelectorAll('[data-designer-action="save"]').forEach((button) => { button.disabled = session.saving || session.busy > 0; }); };
    session.close = () => {
      if (!session.alive || session.saving) return;
      session.alive = false; session.generation++; session.preview?.dispose(); session.thumbnails?.dispose(); session.recordings.forEach((recording) => recording.close()); session.urls.forEach((url) => URL.revokeObjectURL(url)); panel.remove(); document.removeEventListener("keydown", keydown); observer?.disconnect();
      root.removeEventListener("resize", positionEditorTools); menuResizeObserver?.disconnect(); gearAnimation?.cancel(); gearAnimation = null;
      if (active === session) active = null;
      root.MentorResearch?.syncModalLayer?.(); if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
    function renderPreview() {
      session.preview?.dispose();
      preview.innerHTML = options.renderCard({ ...card, key: "draft:" + card.id, stickerDocument: draft }, { preview: true, scope, styleKey: card.key });
      session.preview = sections.mount(preview.querySelector("[data-sticker-document]"), {
        t, getDocument: () => draft,
        onToggle(action, id) {
          if (action === "toggle-sticker") draft.collapsed = !draft.collapsed;
          else { const entry = find(id); if (entry) { entry.collapsed = !entry.collapsed; if (!entry.collapsed) setOptionsTarget(entry.sectionId); } }
          sections.applyViewState(preview.querySelector("[data-sticker-document]"), draft, t);
        },
        onOpen: openAsset, onOpenUrl: options.openUrl
      });
      paintStickerStyle();
    }
    function refreshSection(entry) {
      const node = Array.from(preview.querySelectorAll("[data-sticker-section]")).find((item) => item.dataset.stickerSection === entry.sectionId);
      if (!node) { renderPreview(); return; }
      const fragment = document.createElement("div"); fragment.innerHTML = sections.renderSection(entry, context); node.replaceWith(fragment.firstElementChild);
      session.preview?.hydrate();
    }
    function editorHtml(entry, index) {
      const closed = entry.editorCollapsed;
      const optionButton = '<button type="button" data-section-action="options" aria-label="' + escape(t("designer.sectionOptions")) + '" title="' + escape(t("designer.sectionOptions")) + '">⚙</button>';
      return '<section class="research-sticker-editor-section" data-designer-section="' + escape(entry.sectionId) + '"><div class="research-sticker-editor-section-head"><button type="button" class="research-sticker-reorder" data-section-drag draggable="true" aria-label="' + escape(t("designer.reorder")) + '" title="' + escape(t("designer.reorder")) + '">⠿</button><button type="button" class="research-sticker-editor-toggle" data-section-action="collapse" aria-expanded="' + !closed + '" aria-controls="editor-' + escape(entry.sectionId) + '"><span aria-hidden="true">' + sections.renderIcon(entry.sectionType) + '</span><strong>' + escape(entry.label || t("designer.sections." + entry.sectionType)) + '</strong><span aria-hidden="true">' + (closed ? '⌄' : '⌃') + '</span></button>' + optionButton + '<button type="button" data-section-action="up" aria-label="' + escape(t("designer.up")) + '"' + (!index ? ' disabled' : '') + '>↑</button><button type="button" data-section-action="down" aria-label="' + escape(t("designer.down")) + '"' + (index === draft.sections.length - 1 ? ' disabled' : '') + '>↓</button><button type="button" data-section-action="remove" aria-label="' + escape(t("designer.remove")) + '">×</button></div><div class="research-sticker-editor-section-body" id="editor-' + escape(entry.sectionId) + '"' + (closed ? ' hidden' : '') + '><div class="research-sticker-section-options"><label><input type="checkbox" data-section-enabled' + (entry.enabled ? ' checked' : '') + '><span>' + escape(t("designer.visible")) + '</span></label><label><span class="sr-only">' + escape(t("designer.sectionLabel")) + '</span><input data-section-label value="' + escape(entry.label || "") + '" placeholder="' + escape(t("designer.sectionLabel")) + '"></label></div>' + '<div data-section-editor>' + editors.render(entry, context) + '</div></div></section>';
    }
    function updateUnitButtons() { list.querySelectorAll('[data-editor-action="add-measurement"]').forEach((button) => { button.disabled = getMeasurementCount() >= editors.measurementLimit; }); }
    function renderEditors() {
      const openSection = draft.sections.find((entry) => !entry.editorCollapsed);
      draft.sections.forEach((entry) => { entry.editorCollapsed = entry !== openSection; });
      list.innerHTML = draft.sections.length ? draft.sections.map(editorHtml).join("") : '<div class="research-sticker-builder-empty">' + escape(t("designer.empty")) + '</div>'; updateUnitButtons(); session.thumbnails?.hydrate();
    }
    function setEditorSectionOpen(sectionId) {
      const states = { ...readEditorPreferences(preferenceKey) };
      draft.sections.forEach((entry) => {
        const collapsed = entry.sectionId !== sectionId;
        entry.editorCollapsed = collapsed;
        states[legacyKeys.get(entry.sectionId) || entry.sectionId] = collapsed;
        const editor = getEditor(entry.sectionId);
        const body = editor?.querySelector(".research-sticker-editor-section-body");
        const toggle = editor?.querySelector('[data-section-action="collapse"]');
        if (body) body.hidden = collapsed;
        if (toggle) { toggle.setAttribute("aria-expanded", String(!collapsed)); toggle.lastElementChild.textContent = collapsed ? "⌄" : "⌃"; }
      });
      // Remember the whole accordion state without committing draft content.
      writeEditorPreferences(preferenceKey, states);
      if (sectionId) setOptionsTarget(sectionId);
    }
    function refreshEditor(entry) {
      const node = getEditor(entry.sectionId); if (!node) return;
      node.querySelector("[data-section-editor]").innerHTML = editors.render(entry, context);
      updateUnitButtons();
      session.thumbnails?.hydrate();
    }
    function structural() { draft.sections.forEach((entry, order) => { entry.order = order; }); renderEditors(); renderPreview(); syncOptionsTargets(); }
    function focusSection(entry) {
      const editor = getEditor(entry.sectionId), content = editor?.querySelector("[data-section-editor]");
      const control = content?.querySelector("textarea, input[data-field], [data-measure-field]") || content?.querySelector("button:not([disabled]), input[type=file]:not([disabled]), select:not([disabled])");
      if (!editor) return;
      control?.focus({ preventScroll: true });
      const builder = panel.querySelector('[data-panel="sticker-builder"]');
      const scroller = root.getComputedStyle(builder).overflowY === "visible" ? panel.querySelector('[data-panel="sticker-layout"]') : builder;
      scroller.scrollTop += editor.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 8;
    }
    function add(type) {
      const entry = core.section(type), previous = draft.sections.at(-1);
      entry.order = draft.sections.length; draft.sections.push(entry);
      if (!previous) list.replaceChildren();
      const previousDown = previous && getEditor(previous.sectionId)?.querySelector('[data-section-action="down"]');
      if (previousDown) previousDown.disabled = false;
      list.insertAdjacentHTML("beforeend", editorHtml(entry, entry.order));
      setEditorSectionOpen(entry.sectionId);
      preview.querySelector(entry.sectionType === "unit" ? "[data-sticker-units]" : "[data-sticker-sections]").insertAdjacentHTML("beforeend", sections.renderSection(entry, context));
      updateUnitButtons();
      session.thumbnails?.hydrate(); session.preview?.hydrate();
      optionsTarget = entry.sectionId; syncOptionsTargets();
      focusSection(entry);
    }
    function addFiles(entry, files) {
      if (!session.alive || !find(entry.sectionId)) return;
      for (const file of Array.from(files).slice(0, 30)) {
        const extension = String(file.name || "").split(".").at(-1).toLowerCase();
        const imageMime = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", avif: "image/avif", bmp: "image/bmp" }[extension];
        const legacyVideo = /^(mkv|mov|avi|m4v|wmv|flv|ts|mpg|mpeg|3gp|m2ts|mts|vob|asf|mp4|webm|ogv)$/.test(extension);
        const mime = file.type || imageMime || (legacyVideo ? "video/" + extension : "");
        const kind = mime.startsWith("image/") ? "image" : mime.startsWith("video/") || legacyVideo && entry.sectionType === "video" ? "video" : mime.startsWith("audio/") ? "audio" : "file";
        if (!file.size || file.size > (entry.sectionType === "source" ? 25 : 100) * 1024 * 1024 || entry.sectionType === "image" && (kind !== "image" || !/^image\/(?:png|jpeg|webp|gif|avif|bmp)$/i.test(mime)) || entry.sectionType === "video" && kind !== "video" || entry.sectionType === "av" && !["audio", "video"].includes(kind) || entry.sectionType === "media" && kind === "file") { message("invalidFile"); continue; }
        const asset = { id: core.uid("asset"), kind: entry.sectionType === "source" ? "file" : kind, name: file.name || "", mime, size: file.size, url: "", mediaId: "", entityType: "" };
        if (asset.kind !== "file") { asset.url = URL.createObjectURL(file); session.urls.add(asset.url); }
        session.pending.set(asset.id, file);
        if (["image", "video"].includes(entry.sectionType)) { entry.content.asset = asset; entry.content.url = ""; }
        else if (entry.sectionType === "source") entry.content.files.push(asset);
        else { entry.content.items.push(asset); if (!entry.content.primaryId) entry.content.primaryId = asset.id; }
      }
      refreshEditor(entry); refreshSection(entry);
    }
    const editorContext = {
      t, getMeasurementCount, openAsset, openUrl: options.openUrl,
      record(entry, mode) {
        const generation = session.generation;
        const recording = root.MentorResearchAttachments?.capture(host, mode, async (file) => {
          if (!session.alive || generation !== session.generation || !find(entry.sectionId)) return;
          addFiles(entry, [file]);
        }, t, escape);
        if (recording) session.recordings.add(recording);
      }
    };
    panel.addEventListener("input", (event) => {
      if (session.saving) return;
      const input = event.target;
      if (input.dataset?.wholeOption && input.matches("[data-whole-option]")) {
        if (!stickerStyles) return;
        const field = input.dataset.wholeOption, next = { ...stickerStyle };
        if (!["backgroundColor", "borderColor", "textColor", "unitFillColor", "fontFamily", "fontSize"].includes(field)) return;
        if (input.value === "" || input.value === "inherit") delete next[field]; else next[field] = input.value;
        stickerStyle = stickerStyles.sanitize(next); stickerStyleChanged = true; paintStickerStyle(); return;
      }
      if (input.dataset?.sectionOption && input.matches("[data-section-option]")) {
        const entry = find(optionsTarget); if (!entry) return;
        const field = input.dataset.sectionOption;
        if (["backgroundColor", "titleBackgroundColor"].includes(field)) entry.appearance = core.normalizeSectionAppearance({ ...entry.appearance, [field]: input.value });
        else {
          const next = { ...entry.typography };
          if (input.value === "" && input.type === "number") delete next[field];
          else next[field] = input.type === "checkbox" ? input.checked : input.value;
          entry.typography = core.normalizeTypography(next);
        }
        paintSectionStyle(entry); return;
      }
      if (input.matches("[data-designer-title]")) { draft.title = input.value; preview.querySelector("[data-sticker-title]").textContent = draft.title || t("designer.untitled"); return; }
      const entry = find(input.closest("[data-designer-section]")?.dataset.designerSection);
      if (!entry || input.type === "file") return;
      if (input.matches("[data-section-label]")) {
        entry.label = input.value; getEditor(entry.sectionId).querySelector(".research-sticker-editor-toggle strong").textContent = sectionName(entry);
        if (optionsPanel?.querySelectorAll) {
          Array.from(optionsPanel.querySelectorAll("option")).find((option) => option.value === entry.sectionId)?.replaceChildren(document.createTextNode(sectionName(entry)));
          if (optionsTarget === entry.sectionId) optionsPanel.querySelector("[data-section-options-name]").textContent = sectionName(entry);
        }
      }
      else if (input.matches("[data-section-enabled]")) { entry.enabled = input.checked; renderPreview(); return; }
      else editors.update(entry, input, context);
      refreshSection(entry);
    });
    panel.addEventListener("change", (event) => {
      if (!session.saving && event.target.matches("[data-section-options-target]")) { setOptionsTarget(event.target.value); return; }
      if (session.saving || !event.target.matches("[data-sticker-upload]")) return;
      const entry = find(event.target.closest("[data-designer-section]").dataset.designerSection);
      addFiles(entry, event.target.files); event.target.value = "";
    });
    panel.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (root.MentorUIEvents?.isTextEditingEvent?.(event)) return;
      const button = event.target.closest("button");
      if (!button || !panel.contains(button) || session.saving) return;
      const action = button.dataset.designerAction;
      if (action === "toggle-section-options") { setOptionsOpen(!optionsOpen); return; }
      if (action === "close-section-options") { setOptionsOpen(false); optionsButton.focus({ preventScroll: true }); return; }
      if (action === "reset-section-style") {
        const entry = find(optionsTarget); if (entry) { delete entry.typography; delete entry.appearance; paintSectionStyle(entry); syncOptions(); } return;
      }
      if (button.dataset.resetStyleField) {
        const field = button.dataset.resetStyleField;
        if (button.hasAttribute("data-reset-whole-style")) {
          if (stickerStyles) { delete stickerStyle[field]; stickerStyleChanged = true; paintStickerStyle(); }
        } else {
          const entry = find(optionsTarget);
          if (entry) {
            if (["backgroundColor", "titleBackgroundColor"].includes(field)) {
              if (entry.appearance) { delete entry.appearance[field]; if (!Object.keys(entry.appearance).length) delete entry.appearance; }
            } else if (entry.typography) delete entry.typography[field];
            paintSectionStyle(entry);
          }
        }
        syncOptions(); return;
      }
      if (action === "cancel") { session.close(); return; }
      if (action === "save") { await save(); return; }
      if (action === "toggle-add") { addMenu.hidden = !addMenu.hidden; button.setAttribute("aria-expanded", String(!addMenu.hidden)); positionAddMenu(); if (!addMenu.hidden) addMenu.querySelector("button")?.focus({ preventScroll: true }); return; }
      if (button.dataset.designerAdd) { closeAddMenu(); add(button.dataset.designerAdd); return; }
      const template = button.dataset.designerTemplate;
      if (template) {
        draft.template = template;
        // Selecting a template only adds missing sections, keeping entered content.
        (core.TEMPLATES[template] || []).forEach((type) => { if (!draft.sections.some((entry) => entry.sectionType === type)) draft.sections.push(core.section(type)); });
        panel.querySelectorAll("[data-designer-template]").forEach((choice) => choice.setAttribute("aria-pressed", String(choice.dataset.designerTemplate === template))); structural(); return;
      }
      const entry = find(button.closest("[data-designer-section]")?.dataset.designerSection);
      if (!entry) return;
      const sectionAction = button.dataset.sectionAction;
      if (sectionAction === "options") { setOptionsTarget(entry.sectionId, true); return; }
      if (sectionAction === "collapse") {
        setEditorSectionOpen(entry.editorCollapsed ? entry.sectionId : null); return;
      }
      if (sectionAction === "remove") { draft.sections = draft.sections.filter((item) => item !== entry); structural(); return; }
      if (sectionAction === "up" || sectionAction === "down") { const index = draft.sections.indexOf(entry); core.move(draft, entry.sectionId, index + (sectionAction === "up" ? -1 : 1)); structural(); getEditor(entry.sectionId)?.querySelector('[data-section-action="' + sectionAction + '"]')?.focus(); return; }
      if (button.dataset.editorAction) { const result = editors.action(entry, button, editorContext); if (result) { if (result !== "preview") refreshEditor(entry); refreshSection(entry); } }
    });
    panel.addEventListener("pointerdown", (event) => event.stopPropagation());
    panel.addEventListener("wheel", (event) => event.stopPropagation(), { passive: true });
    let dragged = "";
    list.addEventListener("dragstart", (event) => {
      if (root.MentorUIEvents?.isTextEditingEvent?.(event) || !event.target.closest("[data-section-drag]") || session.saving) { event.preventDefault(); return; }
      dragged = event.target.closest("[data-designer-section]").dataset.designerSection; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("application/x-mentor-section", dragged); event.stopPropagation();
    });
    list.addEventListener("dragover", (event) => { if (dragged && !root.MentorUIEvents?.isTextEditingEvent?.(event)) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; } });
    list.addEventListener("drop", (event) => {
      if (!dragged || root.MentorUIEvents?.isTextEditingEvent?.(event)) return;
      event.preventDefault(); event.stopPropagation(); const target = event.target.closest("[data-designer-section]");
      if (target && target.dataset.designerSection !== dragged) core.move(draft, dragged, draft.sections.findIndex((entry) => entry.sectionId === target.dataset.designerSection));
      dragged = ""; structural();
    });
    list.addEventListener("dragend", () => { dragged = ""; });
    function keydown(event) {
      if (!session.alive || document.querySelector("[data-research-attachment-modal]:not(.is-minimized),[data-research-canvas-media]:not(.is-minimized)")) return;
      if (event.key === "Escape" && !addMenu.hidden) { event.preventDefault(); event.stopPropagation(); closeAddMenu(); addButton.focus({ preventScroll: true }); return; }
      if (event.key === "Escape" && optionsOpen) { event.preventDefault(); event.stopPropagation(); setOptionsOpen(false); optionsButton.focus({ preventScroll: true }); return; }
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); session.close(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); save(); }
      if (event.key === "Tab") {
        const controls = Array.from(panel.querySelectorAll("button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href]")).filter((control) => !control.closest("[inert]") && control.getClientRects().length);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }
    async function save() {
      if (session.saving || !session.alive || session.busy) return;
      if (panel.querySelector("input:invalid")) { panel.querySelector("input:invalid").reportValidity(); return; }
      try {
        const document = core.normalize(draft);
        for (const entry of document.sections) {
          if (entry.content.url && !sections.safeUrl(entry.content.url)) throw new Error("url");
          for (const asset of core.assets({ sections: [entry] })) if (asset.url && !sections.safeUrl(asset.url, asset.kind === "image")) throw new Error("url");
        }
        session.saving = true; updateSaveButtons(); message("saving");
        panel.querySelectorAll("input,textarea,select,button").forEach((control) => { control.disabled = true; });
        const ids = new Set(core.assets(document).map((asset) => asset.id));
        const pending = Array.from(session.pending, ([assetId, file]) => ({ assetId, file })).filter((file) => ids.has(file.assetId));
        const saved = await options.actions.saveCanvasSticker?.({ card, document, pending, ...(stickerStyleChanged ? { stickerStyle } : {}) });
        if (saved === true) {
          writeEditorPreferences(preferenceKey, Object.fromEntries(document.sections.map((entry) => [entry.sectionId, entry.editorCollapsed])));
          session.saving = false; session.close(); return;
        }
        message("saveFailed");
      } catch (_) { message("saveFailed"); }
      finally { session.saving = false; if (session.alive) { panel.querySelectorAll("input,textarea,select,button").forEach((control) => { control.disabled = false; }); updateSaveButtons(); } }
    }
    document.addEventListener("keydown", keydown);
    const observer = typeof MutationObserver === "function" ? new MutationObserver(() => { if ((!host.isConnected || !panel.isConnected || options.isContextActive?.() === false) && !session.saving) session.close(); }) : null;
    observer?.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-active-view"] });
    active = session; renderEditors(); renderPreview(); syncOptionsTargets(); positionEditorTools();
    session.thumbnails = sections.mount(list, { t, getDocument: () => draft, passive: true });
    if (options.initialFile) { const entry = draft.sections.find((item) => ["image", "video", "source", "av", "media"].includes(item.sectionType)); if (entry) addFiles(entry, [options.initialFile]); }
    panel.querySelector("[data-designer-title]").focus({ preventScroll: true });
    return session;
  }
  root.addEventListener("pagehide", () => active?.close());
  root.MentorResearchStickerDesigner = { open, close: () => active?.close(), isOpen: () => Boolean(active?.alive) };
})(window);
