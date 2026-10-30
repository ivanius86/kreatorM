(function (root) {
  "use strict";
  const sessions = new Set();
  const icons = { image: "▧", video: "▷", media: "▧", notes: "≡", link: "↗", source: "▤", unit: "▥", av: "♫" };
  const stickerIconPaths = {
    image: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />',
    video: '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" /><rect x="2" y="6" width="14" height="12" rx="2" />',
    media: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />',
    notes: '<path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4" /><path d="M2 6h4" /><path d="M2 10h4" /><path d="M2 14h4" /><path d="M2 18h4" /><path d="M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z" />',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />',
    source: '<path d="M4 12.15V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2h-3.35" /><path d="M14 2v5a1 1 0 0 0 1 1h5" /><path d="m5 16-3 3 3 3" /><path d="m9 22 3-3-3-3" />',
    av: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />'
  };
  function stickerIcon(type) {
    if (!stickerIconPaths[type]) return icons[type] || "";
    return '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + stickerIconPaths[type] + '</svg>';
  }
  const safeUrl = (value, image = false) => {
    const url = String(value || "").trim();
    return /^https?:\/\//i.test(url) || /^blob:/i.test(url) || image && /^data:image\/(?:png|jpe?g|webp|gif|avif|bmp);base64,/i.test(url) ? url : "";
  };
  function text(value, format, escape) {
    let result = escape(String(value || "").trimEnd());
    if (format === "markdown") result = result.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
    return result.replace(/\n/g, "<br>");
  }
  function assetHtml(asset, settings, t, escape) {
    const id = escape(asset.id), url = safeUrl(asset.url, asset.kind === "image"), kind = asset.kind;
    if (kind === "image") return '<button type="button" class="research-sticker-image" data-sticker-drag-surface data-sticker-action="open" data-asset-id="' + id + '" aria-label="' + escape(t("designer.fullscreen")) + '"><img data-sticker-asset="' + id + '"' + (url ? ' src="' + escape(url) + '"' : '') + ' alt="' + escape(asset.name || "") + '" draggable="false" loading="lazy" style="object-fit:' + (settings?.fit === "cover" ? "cover" : "contain") + ';object-position:' + (settings?.x ?? 50) + '% ' + (settings?.y ?? 50) + '%;transform:scale(' + (settings?.zoom || 1) + ') rotate(' + (settings?.rotation || 0) + 'deg)"></button>';
    if (["audio", "video"].includes(kind)) return '<div class="research-sticker-player"><' + kind + ' data-sticker-asset="' + id + '"' + (url ? ' src="' + escape(url) + '"' : '') + ' controls playsinline preload="metadata"></' + kind + '><button type="button" data-sticker-action="open" data-asset-id="' + id + '">' + escape(t("designer.open")) + '</button></div>';
    return '<button type="button" class="research-sticker-file" data-sticker-drag-surface data-sticker-action="open" data-asset-id="' + id + '"><span aria-hidden="true">▤</span><span class="research-sticker-file-name">' + escape(asset.name || t("designer.sections.source")) + '<small>' + escape(asset.mime || asset.kind || "") + (asset.size ? ' · ' + Math.ceil(asset.size / 1024) + ' KB' : '') + '</small></span><span aria-hidden="true">↗</span></button>';
  }
  function videoThumbnail(entry, context) {
    const { t, escape } = context, url = safeUrl(entry.content?.url || entry.content?.asset?.url);
    if (!url) return "";
    let parsed;
    try { parsed = new URL(url); } catch (_) { return ""; }
    const host = parsed.hostname.toLowerCase(), parts = parsed.pathname.split("/").filter(Boolean);
    let id = "";
    if (["youtu.be", "www.youtu.be"].includes(host) && parts.length === 1) id = parts[0];
    else if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(host)) {
      id = parts[0] === "watch" && parts.length === 1 ? parsed.searchParams.get("v") : ["embed", "shorts", "live"].includes(parts[0]) && parts.length === 2 ? parts[1] : "";
    }
    const thumbnail = /^[A-Za-z0-9_-]{11}$/.test(id || "") ? "https://img.youtube.com/vi/" + id + "/hqdefault.jpg" : "";
    const direct = /\.(?:mp4|webm|ogv|ogg|mov|m4v)$/i.test(parsed.pathname) || parsed.protocol === "blob:";
    const preview = thumbnail ? '<img src="' + escape(thumbnail) + '" alt="" loading="lazy" draggable="false">' : direct ? '<video src="' + escape(url + (parsed.hash ? "" : "#t=0.1")) + '" muted playsinline preload="metadata" tabindex="-1" aria-hidden="true" disablepictureinpicture></video>' : '';
    return '<button type="button" class="research-sticker-video-thumbnail" data-sticker-action="open-url" data-section-id="' + escape(entry.sectionId) + '" aria-label="' + escape(t("designer.openVideo")) + '" title="' + escape(t("designer.openVideo")) + '">' + preview + '<span class="research-sticker-video-play" aria-hidden="true">▶</span>' + (!preview ? '<small>' + escape(host || t("designer.sections.video")) + '</small>' : '') + '</button>';
  }
  function body(entry, context) {
    const { t, escape } = context, content = entry.content || {};
    if (entry.sectionType === "notes") return '<div class="research-sticker-text">' + text(content.text, content.format, escape) + '</div>';
    if (entry.sectionType === "image") return content.asset ? assetHtml(content.asset, entry.settings, t, escape) : '<p class="research-sticker-empty">' + escape(t("designer.emptyImage")) + '</p>';
    if (entry.sectionType === "video") return content.asset && (content.asset.mediaId || /^blob:/i.test(content.asset.url || "")) ? assetHtml(content.asset, {}, t, escape) : videoThumbnail(entry, context);
    if (entry.sectionType === "link") { const url = safeUrl(content.url); return url ? '<a href="' + escape(url) + '" target="_blank" rel="noopener noreferrer">' + escape(content.title || url) + ' ↗</a>' : ''; }
    if (entry.sectionType === "unit") return (content.legacyDisplay ? '<span class="research-sticker-unit-value" data-sticker-unit-value>' + escape(content.legacyDisplay) + '</span>' : '') + (content.measurements || []).filter((measurement) => measurement.value !== "" && measurement.value != null).map((measurement) => {
      const unit = String(measurement.unit || "").trim(), displayUnit = /^EUR$/i.test(unit) ? "€" : /^(pcs|qty)$/i.test(unit) ? t("designer.quantityUnit") : unit;
      return '<span class="research-sticker-unit-value" data-sticker-unit-value data-measurement-id="' + escape(measurement.id) + '"' + (measurement.label ? ' title="' + escape(measurement.label) + '"' : '') + '>' + escape(String(measurement.value)) + (displayUnit ? ' ' + escape(displayUnit) : '') + '</span>';
    }).join("");
    const items = content.items || content.files || [];
    return '<div class="research-sticker-gallery' + (entry.sectionType === "source" ? ' is-files' : '') + '">' + items.map((asset) => '<div class="research-sticker-gallery-item' + (content.primaryId === asset.id ? ' is-primary' : '') + '">' + assetHtml(asset, {}, t, escape) + '</div>').join("") + '</div>' + (safeUrl(content.url) ? '<a href="' + escape(safeUrl(content.url)) + '" target="_blank" rel="noopener noreferrer">' + escape(t("designer.open")) + ' ↗</a>' : '');
  }
  function renderSection(entry, context) {
    const { t, escape } = context;
    const typography = Object.entries(sectionStyleProperties(entry)).map(([name, value]) => name + ":" + value).join(";");
    const typographyStyle = typography ? ' style="' + escape(typography) + '"' : '';
    if (entry.sectionType === "unit") return '<div class="research-sticker-unit-group" data-sticker-section="' + escape(entry.sectionId) + '"' + typographyStyle + '>' + body(entry, context) + '</div>';
    const count = (entry.content?.items || entry.content?.files || []).length;
    return '<section class="research-sticker-section is-' + entry.sectionType + '" data-sticker-section="' + escape(entry.sectionId) + '" data-sticker-section-type="' + entry.sectionType + '"' + typographyStyle + '><button type="button" class="research-sticker-section-toggle" data-sticker-action="toggle-section" data-section-id="' + escape(entry.sectionId) + '" aria-expanded="' + !entry.collapsed + '" aria-controls="sticker-body-' + escape(context.scope || "grid") + '-' + escape(entry.sectionId) + '"><span aria-hidden="true">' + stickerIcon(entry.sectionType) + '</span><strong>' + escape(entry.label || t("designer.sections." + entry.sectionType)) + (count ? ' (' + count + ')' : '') + '</strong><span aria-hidden="true">' + (entry.collapsed ? '⌄' : '⌃') + '</span></button><div id="sticker-body-' + escape(context.scope || "grid") + '-' + escape(entry.sectionId) + '" class="research-sticker-section-body" data-sticker-section-body' + (entry.collapsed ? ' hidden' : '') + '>' + body(entry, context) + '</div></section>';
  }
  function render(document, context) {
    const typography = Object.entries(typographyProperties(document.typography)).map(([name, value]) => name + ":" + value).join(";");
    return '<div class="research-sticker-document" data-sticker-document style="' + context.escape(typography) + '"><div class="research-sticker-document-heading" data-sticker-heading><strong data-sticker-title>' + context.escape(document.title || context.t("designer.untitled")) + '</strong><button type="button" data-sticker-action="toggle-sticker" aria-expanded="' + !document.collapsed + '" aria-label="' + context.escape(context.t(document.collapsed ? "designer.expand" : "designer.collapse")) + '">' + (document.collapsed ? '＋' : '−') + '</button></div><div class="research-sticker-sections" data-sticker-sections' + (document.collapsed ? ' hidden' : '') + '>' + document.sections.filter((entry) => entry.enabled && entry.sectionType !== "unit").map((entry) => renderSection(entry, context)).join("") + '</div><div class="research-sticker-unit-footer" data-sticker-units' + (document.collapsed ? ' hidden' : '') + '>' + document.sections.filter((entry) => entry.enabled && entry.sectionType === "unit").map((entry) => renderSection(entry, context)).join("") + '</div></div>';
  }
  function typographyProperties(value, section = false) {
    const typography = root.MentorResearchStickerCore.normalizeTypography(value);
    const font = (field) => typography[field] === "inherit" ? "var(--research-sticker-font, inherit)" : typography[field];
    const properties = {};
    if (!section || typography.sectionTitleFont !== "inherit") properties["--research-sticker-section-font"] = font("sectionTitleFont");
    if (!section || typography.descriptionFont !== "inherit") properties["--research-sticker-description-font"] = font("descriptionFont");
    for (const [field, name, suffix] of [["titleSize", "section-size", "px"], ["contentSize", "content-size", "px"], ["titleColor", "section-color", ""], ["contentColor", "content-color", ""]]) {
      if (typography[field] !== undefined) properties["--research-sticker-" + name] = typography[field] + suffix;
    }
    for (const [field, name, on, off] of [["titleBold", "section-weight", "700", "400"], ["contentBold", "content-weight", "700", "400"], ["titleItalic", "section-style", "italic", "normal"], ["contentItalic", "content-style", "italic", "normal"]]) {
      if (typeof typography[field] === "boolean") properties["--research-sticker-" + name] = typography[field] ? on : off;
    }
    return properties;
  }
  function sectionStyleProperties(entry) {
    const properties = typographyProperties(entry.typography, true);
    const appearance = root.MentorResearchStickerCore.normalizeSectionAppearance(entry.appearance);
    if (appearance.backgroundColor) {
      properties["--research-sticker-section-background"] = appearance.backgroundColor;
      const foreground = root.MentorResearchStickerStyle?.controlColor(appearance.backgroundColor);
      if (foreground) {
        properties["--research-sticker-section-contrast"] = foreground;
        if (!properties["--research-sticker-content-color"]) properties["--research-sticker-content-color"] = foreground;
      }
    }
    if (appearance.titleBackgroundColor) {
      properties["--research-sticker-section-title-background"] = appearance.titleBackgroundColor;
      const foreground = root.MentorResearchStickerStyle?.controlColor(appearance.titleBackgroundColor);
      if (foreground) properties["--research-sticker-section-title-contrast"] = foreground;
    }
    return properties;
  }
  function titleBackgroundColor(background) {
    const color = /^#[0-9a-f]{6}$/i.test(String(background || "")) ? background : "#203729";
    const channels = [1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16));
    const target = root.MentorResearchStickerStyle?.controlColor(color) === "#000000" ? 0 : 255;
    return "#" + channels.map((channel) => Math.round(channel * 0.9 + target * 0.1).toString(16).padStart(2, "0")).join("");
  }
  function applySectionStyle(container, entry) {
    if (!container) return;
    const properties = sectionStyleProperties(entry);
    ["section-font", "description-font", "section-size", "content-size", "section-color", "content-color", "section-weight", "content-weight", "section-style", "content-style", "section-background", "section-title-background", "section-contrast", "section-title-contrast"].forEach((name) => {
      const property = "--research-sticker-" + name;
      if (Object.hasOwn(properties, property)) container.style.setProperty(property, properties[property]);
      else container.style.removeProperty(property);
    });
    const document = container.closest("[data-sticker-document]");
    if (document) syncLayout(document);
  }
  function applyTypography(container, value, section = false) {
    if (!container) return;
    const properties = typographyProperties(value, section);
    if (section) ["--research-sticker-section-font", "--research-sticker-description-font"].forEach((name) => {
      if (!Object.hasOwn(properties, name)) container.style?.removeProperty(name);
    });
    Object.entries(properties).forEach(([name, font]) => container.style?.setProperty(name, font));
    const document = section ? container.closest?.("[data-sticker-document]") : container;
    if (document) syncLayout(document);
  }
  function frameHeight(container, card) {
    const style = card && root.getComputedStyle?.(card);
    const inset = ["paddingTop", "paddingBottom", "borderTopWidth", "borderBottomWidth"].reduce((height, name) => height + (parseFloat(style?.[name]) || 0), 0);
    const heading = container.querySelector("[data-sticker-heading]")?.offsetHeight || 0;
    const footer = container.querySelector("[data-sticker-units]")?.offsetHeight || 0;
    return inset + heading + footer;
  }
  function minimumHeight(container) {
    const card = container.closest?.(".research-canvas-card.has-sticker-document");
    const content = container.querySelector("[data-sticker-sections]");
    let contentHeight = content?.childElementCount ? 40 : 0;
    container.querySelectorAll('[data-sticker-section-type="image"]').forEach((section) => {
      const body = section.querySelector("[data-sticker-section-body]");
      if (body?.hidden || !body?.querySelector?.(".research-sticker-image")) return;
      const style = root.getComputedStyle?.(body);
      const padding = (parseFloat(style?.paddingTop) || 0) + (parseFloat(style?.paddingBottom) || 0);
      contentHeight = Math.max(contentHeight, section.offsetHeight - body.offsetHeight + padding + 40);
    });
    return Math.max(100, frameHeight(container, card) + contentHeight);
  }
  function syncLayout(container) {
    const card = container.closest?.(".research-canvas-card.has-sticker-document");
    const height = Number(card?.dataset.stickerManualHeight);
    const content = container.querySelector("[data-sticker-sections]");
    if (!card || content?.hidden) return;
    const sections = Array.from(container.querySelectorAll("[data-sticker-section]")).filter((section) => section.querySelector("[data-sticker-section-body]"));
    const reveal = card.dataset.stickerRevealContent === "true";
    const fitDescription = sections.some((section) => {
      const body = section.querySelector("[data-sticker-section-body]");
      return section.dataset.stickerSectionType === "notes" && !body.hidden && section.offsetHeight > 0 && Boolean(body.textContent?.trim());
    });
    // A manual resize may need a smaller image stage. Explicit expansion reveals
    // full section bodies instead, with the same saved fit/zoom/position settings.
    if (reveal || !height || fitDescription) sections.forEach((section) => {
      const body = section.querySelector("[data-sticker-section-body]");
      if (!body.hidden) body.querySelector?.(".research-sticker-image")?.style.removeProperty("--research-sticker-image-height");
    });
    let collapsedHeight = 0;
    sections.forEach((section) => {
      const body = section.querySelector("[data-sticker-section-body]");
      if (!body?.hidden) return;
      body.hidden = false; collapsedHeight += body.offsetHeight || 0; body.hidden = true;
    });
    card.dataset.stickerCollapsedSectionHeight = String(collapsedHeight);
    // Fold/expand affects only this frame. The stored manual expanded size is
    // preserved, and a deliberate resize can still make its content scroll.
    if (!height) return;
    const minimum = minimumHeight(container);
    const fullHeight = reveal || fitDescription ? frameHeight(container, card) + sections.reduce((sum, section) => sum + (section.offsetHeight || 0), 0) : 0;
    // A visible description should not retain an empty tail from an older manual
    // size. Keep deliberate smaller scroll areas and the saved dimensions intact.
    const contentHeight = fitDescription
      ? (reveal ? fullHeight : Math.min(height - collapsedHeight, fullHeight))
      : Math.max(height - collapsedHeight, fullHeight);
    const visibleHeight = Math.max(minimum, contentHeight) + "px";
    if (card.style.minHeight) card.style.minHeight = "";
    if (card.style.height !== visibleHeight) card.style.height = visibleHeight;
    if (!reveal && content?.clientHeight) sections.forEach((section) => {
      if (section.dataset.stickerSectionType !== "image") return;
      const body = section.querySelector("[data-sticker-section-body]");
      const image = !body.hidden && body.querySelector?.(".research-sticker-image");
      if (!image) return;
      const style = root.getComputedStyle?.(body);
      const padding = (parseFloat(style?.paddingTop) || 0) + (parseFloat(style?.paddingBottom) || 0);
      const header = section.offsetHeight - body.offsetHeight;
      image.style.setProperty("--research-sticker-image-height", Math.max(40, Math.min(190, content.clientHeight - header - padding)) + "px");
    });
  }
  function applyViewState(container, document, t) {
    const toggle = container.querySelector('[data-sticker-action="toggle-sticker"]');
    toggle.setAttribute("aria-expanded", String(!document.collapsed)); toggle.setAttribute("aria-label", t(document.collapsed ? "designer.expand" : "designer.collapse")); toggle.textContent = document.collapsed ? "＋" : "−";
    const content = container.querySelector("[data-sticker-sections]");
    let expanding = content.hidden && !document.collapsed;
    content.hidden = document.collapsed;
    container.querySelector("[data-sticker-units]").hidden = document.collapsed;
    container.querySelectorAll("[data-sticker-section]").forEach((node) => {
      const entry = document.sections.find((section) => section.sectionId === node.dataset.stickerSection);
      const button = node.querySelector('[data-sticker-action="toggle-section"]'), body = node.querySelector("[data-sticker-section-body]");
      if (!entry || !button || !body) return;
      if (body.hidden && !entry.collapsed) expanding = true;
      body.hidden = entry.collapsed; button.setAttribute("aria-expanded", String(!entry.collapsed)); button.lastElementChild.textContent = entry.collapsed ? "⌄" : "⌃";
    });
    if (expanding) {
      const card = container.closest?.(".research-canvas-card.has-sticker-document");
      if (card) card.dataset.stickerRevealContent = "true";
    }
    syncLayout(container);
  }
  function mount(container, options) {
    container._stickerDispose?.();
    const session = { container, alive: true, urls: [], cache: new Map(), dispose() { if (!this.alive) return; this.alive = false; this.layoutObserver?.disconnect(); this.urls.forEach((url) => URL.revokeObjectURL(url)); container.querySelectorAll("video,audio").forEach((player) => { player.pause(); player.removeAttribute("src"); player.load(); }); container.removeEventListener("click", click); container.removeEventListener("pointerdown", terminal); container.removeEventListener("wheel", scroll); sessions.delete(this); } };
    const terminal = (event) => {
      const viewport = event.target.closest?.("[data-sticker-sections]");
      const scrollbar = viewport && event.target === viewport && (event.offsetX >= viewport.clientWidth || event.offsetY >= viewport.clientHeight);
      const control = event.target.closest?.("button,a,input,textarea,select,iframe,video,audio,[contenteditable]");
      const dragSurface = event.pointerType !== "touch" && event.target.closest?.("button[data-sticker-drag-surface]");
      if (root.MentorUIEvents?.isTextEditingEvent?.(event) || control && control !== dragSurface || viewport && container.closest?.("[data-sticker-manual-height]") && (event.pointerType === "touch" || scrollbar)) event.stopPropagation();
    };
    const scroll = (event) => {
      const viewport = event.target.closest?.("[data-sticker-sections]");
      if (viewport && container.contains(viewport) && viewport.scrollHeight > viewport.clientHeight + 1) event.stopPropagation();
    };
    const click = (event) => {
      event.stopPropagation();
      if (root.MentorUIEvents?.isTextEditingEvent?.(event)) return;
      const button = event.target.closest?.("button[data-sticker-action]");
      if (!button || !container.contains(button)) return;
      const action = button.dataset.stickerAction;
      if (action === "toggle-sticker" || action === "toggle-section") options.onToggle?.(action, button.dataset.sectionId);
      else if (action === "open") options.onOpen?.(root.MentorResearchStickerCore.assets(options.getDocument()).find((asset) => asset.id === button.dataset.assetId), button);
      else if (action === "open-url") {
        const content = options.getDocument().sections.find((entry) => entry.sectionId === button.dataset.sectionId)?.content;
        options.onOpenUrl?.(content?.url || content?.asset?.url, button);
      }
    };
    container._stickerDispose = () => session.dispose(); sessions.add(session);
    if (!options.passive) {
      container.addEventListener("click", click); container.addEventListener("pointerdown", terminal); container.addEventListener("wheel", scroll, { passive: true }); syncLayout(container);
      const card = container.closest?.(".research-canvas-card.has-sticker-document");
      if (card && typeof ResizeObserver === "function") { session.layoutObserver = new ResizeObserver(() => { if (session.alive) syncLayout(container); }); session.layoutObserver.observe(card); }
    }
    hydrate(container, options.getDocument(), session, options.t);
    return { dispose: () => session.dispose(), hydrate: () => hydrate(container, options.getDocument(), session, options.t) };
  }
  async function hydrate(container, document, session, t) {
    for (const asset of root.MentorResearchStickerCore.assets(document)) {
      if (!asset.mediaId || !asset.entityType) continue;
      const cacheKey = asset.entityType + ":" + asset.mediaId;
      const nodes = Array.from(container.querySelectorAll("[data-sticker-asset]")).filter((node) => node.dataset.stickerAsset === asset.id && node.dataset.stickerMediaKey !== cacheKey);
      if (!nodes.length) continue;
      nodes.forEach((node) => { node.dataset.stickerMediaKey = cacheKey; });
      try {
        if (session.cache.has(cacheKey)) { nodes.forEach((node) => { node.src = session.cache.get(cacheKey); }); continue; }
        const record = await root.MentorData?.repositories?.media?.getEntity(asset.entityType, asset.mediaId);
        if (!session.alive || !container.isConnected) return;
        if (!record?.blob) throw new Error("Media missing.");
        const url = URL.createObjectURL(record.blob); session.urls.push(url); session.cache.set(cacheKey, url); nodes.forEach((node) => { if (node.isConnected) node.src = url; });
      } catch (_) { if (session.alive) nodes.forEach((node) => { node.setAttribute("aria-label", t("designer.mediaUnavailable")); node.classList.add("is-unavailable"); }); }
    }
  }
  if (typeof MutationObserver === "function" && root.document?.body) new MutationObserver(() => { sessions.forEach((session) => { if (!session.container.isConnected) session.dispose(); }); }).observe(root.document.body, { childList: true, subtree: true });
  function renderCreateMenu(t, escape, getIcon, attributes = "") {
    const choice = (type, key, icon) => '<button type="button" data-research-action="add-canvas-card" data-card-type="' + type + '"' + attributes + '><span aria-hidden="true">' + (icon || getIcon?.(type) || icons[type] || '★') + '</span>' + escape(t(key)) + '</button>';
    return choice("custom", "designer.templates.custom", "★") + '<span class="research-sticker-menu-separator" role="separator"></span><small class="research-sticker-menu-label">' + escape(t("designer.templatesLabel")) + '</small>' + [ ["media", "media"], ["source", "source"], ["unit", "unit"], ["note", "notes"], ["av", "av"] ].map(([type, template]) => choice(type, "designer.templates." + template, icons[template])).join("") + '<span class="research-sticker-menu-separator" role="separator"></span>' + ["link", "image", "video", "finance"].map((type) => choice(type, "canvas.types." + type)).join("");
  }
  root.MentorResearchStickerSections = { icons, renderIcon: stickerIcon, safeUrl, render, renderSection, renderCreateMenu, mount, applyViewState, applyTypography, applySectionStyle, titleBackgroundColor, syncLayout, minimumHeight };
})(window);
