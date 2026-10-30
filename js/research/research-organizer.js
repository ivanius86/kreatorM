(function (root) {
  "use strict";

  const selection = root.MentorResearchSelection.createState();
  let selectedGroupId = "";
  let activeStickerKey = "";
  let pendingSymbol = "";
  let suppressEmptyClickUntil = 0;
  const select = root.MentorResearchSelection;
  const groupsApi = root.MentorResearchGroups;
  const annotationsApi = root.MentorResearchAnnotations;
  const geometry = root.MentorResearchGeometry;
  let syncActiveSelection = null;
  const groupWheelIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M10 8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 16 14v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"/><path d="M10 8v5a1 1 0 0 0 1 1h5"/><path d="M8 4a2 2 0 0 1 2-2h6a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 22 8v6a2 2 0 0 1-2 2"/><path d="M16 2v5a1 1 0 0 0 1 1h5"/></svg>';

  function renderToolbar(t, escape, getIcon) {
    const tool = (name, icon, disabled = false, label = name) => '<button type="button" data-research-organizer-tool="' + name + '" title="' + escape(t("canvas.organizer." + label)) + '" aria-label="' + escape(t("canvas.organizer." + label)) + '"' + (name === "add" ? ' aria-expanded="false"' : '') + (disabled ? ' disabled' : '') + '>' + icon + '</button>';
    const addTypes = ["note", "av", "source", "link", "image", "video", "finance"];
    return '<div class="research-organizer-toolbar" data-research-organizer-toolbar role="toolbar" aria-label="' + escape(t("canvas.aria")) + '">' +
      tool("select", "↖") + tool("pan", "✋") + '<span class="research-organizer-separator"></span>' +
      tool("settings", "⚙") + tool("connect", "↗", true) + tool("finding", "★") + tool("symbol", "◉") +
      '<span class="research-organizer-separator"></span>' + tool("add", "+") +
      '<div class="research-organizer-add-menu" data-research-organizer-add-menu hidden>' +
      (root.MentorResearchStickerSections?.renderCreateMenu(t, escape, getIcon) || addTypes.map((type) => '<button type="button" data-research-action="add-canvas-card" data-card-type="' + type + '"><span aria-hidden="true">' + (getIcon?.(type) || "") + '</span>' + escape(t("canvas.types." + type)) + '</button>').join("")) + '</div></div>' +
      '<div class="research-organizer-pointer-menu" data-research-pointer-menu role="group" aria-label="' + escape(t("canvas.organizer.toolChoice")) + '" hidden>' +
      '<button type="button" data-research-pointer-choice="select" title="' + escape(t("canvas.organizer.select")) + '" aria-label="' + escape(t("canvas.organizer.select")) + '">↖</button>' +
      '<button type="button" data-research-pointer-choice="pan" title="' + escape(t("canvas.organizer.pan")) + '" aria-label="' + escape(t("canvas.organizer.pan")) + '">✋</button>' +
      '<button type="button" data-research-pointer-groups title="' + escape(t("canvas.organizer.chooseGroup")) + '" aria-label="' + escape(t("canvas.organizer.chooseGroup")) + '" aria-expanded="false">' + groupWheelIcon + '</button>' +
      '<div class="research-organizer-group-wheel" data-research-group-wheel role="group" aria-label="' + escape(t("canvas.organizer.chooseGroup")) + '" hidden></div></div>' +
      '<div class="research-organizer-group-panel" data-research-group-panel hidden><strong data-research-settings-title>' + escape(t("canvas.organizer.groupStyle")) + '</strong>' +
      '<div data-research-group-settings>' +
      '<button type="button" data-research-organizer-action="group">' + escape(t("canvas.organizer.createGroup")) + '</button>' +
      renderAppearanceControls(t, escape) + '</div></div>' +
      '<form class="research-organizer-form" data-research-group-form hidden><label>' + escape(t("canvas.organizer.groupName")) + '<input name="name" maxlength="80" required></label><label>' + escape(t("canvas.organizer.groupDescription")) + '<textarea name="description" maxlength="240" rows="2"></textarea></label><div><button type="submit">' + escape(t("canvas.organizer.createGroup")) + '</button><button type="button" data-research-organizer-action="cancel">' + escape(t("canvas.organizer.cancel")) + '</button></div></form>' +
      '<div class="research-organizer-symbol-picker" data-research-symbol-picker hidden aria-label="' + escape(t("canvas.organizer.symbolPicker")) + '">' +
      annotationsApi.symbols.map((symbol) => '<button type="button" data-research-symbol-choice="' + escape(symbol) + '" aria-label="' + escape(symbol) + '">' + escape(symbol) + '</button>').join("") + '</div>';
  }

  function renderSelectionBar(t, escape) {
    return '<div class="research-organizer-selection-bar" data-research-selection-bar hidden><span data-research-selection-count></span><input type="text" data-research-group-name size="1" maxlength="80" autocomplete="off" aria-label="' + escape(t("canvas.organizer.groupName")) + '" hidden><select data-research-selected-stickers hidden aria-label="' + escape(t("canvas.organizer.selectedStickers")) + '"></select>' +
      '<button type="button" data-research-organizer-action="group">' + escape(t("canvas.organizer.group")) + '</button>' +
      '<button type="button" data-research-selection-only data-research-organizer-action="finding">★</button>' +
      '<select data-research-group-target aria-label="' + escape(t("canvas.organizer.moveToGroup")) + '"><option value="">' + escape(t("canvas.organizer.chooseGroup")) + '</option></select>' +
      '<button type="button" data-research-selection-only data-research-organizer-action="leave">' + escape(t("canvas.organizer.removeFromGroup")) + '</button>' +
      '<div class="research-organizer-group-color"><span>' + escape(t("canvas.organizer.groupColor")) + '</span><input data-research-quick-group-color type="color" value="#43634b" aria-label="' + escape(t("canvas.organizer.groupColor")) + '"></div>' +
      '<div class="research-organizer-group-color"><span>' + escape(t("canvas.organizer.headerColor")) + '</span><input data-research-quick-header-color type="color" value="#223626" aria-label="' + escape(t("canvas.organizer.headerColor")) + '"></div>' +
      '<details class="research-organizer-member-list" data-research-group-members hidden><summary data-research-group-members-summary></summary><div data-research-group-members-options></div></details>' +
      '<button type="button" data-research-organizer-action="clear">' + escape(t("canvas.organizer.clear")) + '</button></div>';
  }

  function renderAppearanceControls(t, escape) {
    return '<div class="research-organizer-appearance" role="group" aria-label="' + escape(t("canvas.organizer.groupStyle")) + '">' +
      '<span class="research-organizer-appearance-label" data-research-appearance-first>' + escape(t("canvas.organizer.backgroundType")) + '</span>' +
      '<div class="research-organizer-group-color"><span>' + escape(t("canvas.organizer.solidColor")) + '</span><input data-research-group-color type="color" value="#43634b" aria-label="' + escape(t("canvas.organizer.groupColor")) + '"></div>' +
      '<label class="research-organizer-group-image">' + escape(t("canvas.organizer.imageUrl")) + '<input data-research-group-image type="url" placeholder="https://" aria-label="' + escape(t("canvas.organizer.imageUrl")) + '"></label>' +
      '<label class="research-organizer-upload" data-research-group-upload-wrap>' + escape(t("canvas.organizer.uploadImage")) + '<input data-research-group-upload type="file" accept="image/jpeg,image/png,image/webp" aria-label="' + escape(t("canvas.organizer.uploadImage")) + '"></label>' +
      '<label class="research-organizer-opacity">' + escape(t("canvas.organizer.imageOpacity")) + '<input data-research-group-image-opacity type="range" min="0" max="100" value="65" aria-label="' + escape(t("canvas.organizer.imageOpacity")) + '"><output data-research-group-opacity-value>65%</output></label>' +
      '<div class="research-organizer-image-controls" data-research-image-controls hidden role="group" aria-label="' + escape(t("canvas.organizer.imagePosition")) + '">' +
      '<div class="research-organizer-image-joystick">' +
      ['up', 'left', 'center', 'right', 'down'].map((action) => '<button type="button" class="is-' + action + '" data-research-image-action="' + action + '" aria-label="' + escape(t("canvas.organizer.imageMove" + action[0].toUpperCase() + action.slice(1))) + '" title="' + escape(t("canvas.organizer.imageMove" + action[0].toUpperCase() + action.slice(1))) + '">' + ({ up: '↑', left: '←', center: '•', right: '→', down: '↓' })[action] + '</button>').join('') +
      '</div><div class="research-organizer-image-zoom"><button type="button" data-research-image-action="zoomOut" aria-label="' + escape(t("canvas.organizer.imageZoomOut")) + '" title="' + escape(t("canvas.organizer.imageZoomOut")) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21M7.5 10.5h6"/></svg></button><output data-research-image-zoom-value>100%</output><button type="button" data-research-image-action="zoomIn" aria-label="' + escape(t("canvas.organizer.imageZoomIn")) + '" title="' + escape(t("canvas.organizer.imageZoomIn")) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21M7.5 10.5h6M10.5 7.5v6"/></svg></button></div></div>' +
      '<span class="research-organizer-appearance-label">' + escape(t("canvas.organizer.frameAndTab")) + '</span>' +
      '<div class="research-organizer-group-swatch"><span>' + escape(t("canvas.organizer.borderColor")) + '</span><input data-research-group-border-color type="color" value="#e9cb83" aria-label="' + escape(t("canvas.organizer.borderColor")) + '"></div>' +
      '<div class="research-organizer-group-swatch"><span>' + escape(t("canvas.organizer.headerColor")) + '</span><input data-research-group-header-color type="color" value="#223626" aria-label="' + escape(t("canvas.organizer.headerColor")) + '"></div>' +
      '<span class="research-organizer-appearance-label">' + escape(t("canvas.organizer.textStyle")) + '</span>' +
      '<div class="research-organizer-group-swatch"><span>' + escape(t("canvas.organizer.textColor")) + '</span><input data-research-group-text-color type="color" value="#f6e9c7" aria-label="' + escape(t("canvas.organizer.textColor")) + '"></div>' +
      '<label class="research-organizer-font">' + escape(t("canvas.organizer.fontFamily")) + '<select data-research-group-font-family aria-label="' + escape(t("canvas.organizer.fontFamily")) + '"><option value="Inter">Inter</option><option value="Georgia">Georgia</option><option value="Arial">Arial</option><option value="monospace">Monospace</option></select></label>' +
      '<label class="research-organizer-font-size">' + escape(t("canvas.organizer.fontSize")) + '<input data-research-group-font-size type="number" min="11" max="24" value="14" aria-label="' + escape(t("canvas.organizer.fontSize")) + '"></label></div>';
  }

  function groupStyle(group, imageOverride = "") {
    const style = [];
    const border = groupsApi.color(group.borderColor, "");
    const header = groupsApi.color(group.headerColor, "");
    const background = groupsApi.color(group.backgroundColor, "#2a412f");
    const image = imageOverride || groupsApi.imageUrl(group.backgroundImage);
    const text = groupsApi.color(group.textColor, "");
    const font = groupsApi.fontFamily(group.fontFamily);
    const size = groupsApi.fontSize(group.fontSize);
    if (text) style.push("--research-group-text:" + text, "--research-group-header-text:" + text);
    if (font) style.push("--research-group-font:" + font);
    if (group.fontSize !== undefined) style.push("--research-group-font-size:" + size + "px", "--research-group-description-size:" + Math.max(9, size - 3) + "px");
    if (border) style.push("border-color:" + border);
    if (header) {
      style.push("--research-group-header:" + header);
      const brightness = (parseInt(header.slice(1, 3), 16) * 299 + parseInt(header.slice(3, 5), 16) * 587 + parseInt(header.slice(5, 7), 16) * 114) / 1000;
      if (!text) style.push("--research-group-header-text:" + (brightness > 155 ? "#1d2b20" : "#f6e9c7"));
    }
    if (background) {
      const red = parseInt(background.slice(1, 3), 16), green = parseInt(background.slice(3, 5), 16), blue = parseInt(background.slice(5, 7), 16);
      style.push("background-color:rgba(" + red + "," + green + "," + blue + "," + (groupsApi.imageOpacity(group.imageOpacity) / 100).toFixed(2) + ")");
      style.push("--research-group-background-color:" + background);
    }
    if (group.backgroundMode === "image" && image) {
      style.push('--research-group-image-layer:url("' + image.replace(/[\'"()\\\s]/g, (char) => "%" + char.charCodeAt(0).toString(16).padStart(2, "0")) + '")');
      style.push('--research-group-image-x:' + groupsApi.imagePosition(group.imagePositionX) + '%', '--research-group-image-y:' + groupsApi.imagePosition(group.imagePositionY) + '%', '--research-group-image-zoom:' + groupsApi.imageZoom(group.imageZoom));
    }
    style.push('--research-group-background-opacity:' + (groupsApi.imageOpacity(group.imageOpacity) / 100).toFixed(2));
    return style.join(";");
  }

  function renderGroups(idea, directionId, t, escape, cards) {
    const visibleKeys = new Set((cards || []).map((card) => card.key));
    return groupsApi.read(idea, directionId).map((group, index) => {
      const name = escape(group.name || "");
      const count = Array.isArray(group.memberKeys) ? group.memberKeys.filter((key) => visibleKeys.has(key)).length : 0;
      const x = Number(group.x) || 0, y = Number(group.y) || 0;
      const width = Math.max(180, Number(group.width) || 240), height = Math.max(86, Number(group.height) || 160);
      const bounds = 'left:' + x + 'px;top:' + y + 'px;width:' + width + 'px;height:' + (group.collapsed ? 44 : height) + 'px;';
      const imageSurface = group.backgroundMode === 'image' && (group.backgroundImage || group.backgroundMediaId)
        ? '<div class="research-organizer-group-image-surface" data-research-group-image-for="' + escape(group.id) + '" style="' + bounds + '--research-group-image-stack:' + (3 + index * 4) + ';' + escape(groupStyle(group)) + '"><span class="research-organizer-group-image-visual" aria-hidden="true"></span></div>' : '';
      return imageSurface + '<div class="research-organizer-group' + (group.collapsed ? ' is-collapsed' : '') + (imageSurface ? ' has-background-image' : '') + '" data-research-group-id="' + escape(group.id) + '" style="' + bounds + '--research-group-stack:' + (5 + index * 4) + ';' + escape(groupStyle(group)) + '">' +
        '<div class="research-organizer-group-head" data-research-group-handle><strong>' + name + '</strong><small>' + escape(t("canvas.organizer.groupCount", { count })) + '</small>' +
        '<button type="button" data-research-group-toggle title="' + escape(t(group.collapsed ? "canvas.organizer.expand" : "canvas.organizer.collapse")) + '">' + (group.collapsed ? "▸" : "▾") + '</button>' +
        '<button type="button" data-research-group-remove title="' + escape(t("canvas.organizer.removeGroup")) + '">×</button></div>' +
        (!group.collapsed && group.description ? '<p data-research-group-handle>' + escape(group.description) + '</p>' : '') +
        (group.collapsed ? '' : '<button type="button" class="research-organizer-group-resize" data-research-group-resize aria-label="' + escape(t("canvas.organizer.resizeGroup")) + '" title="' + escape(t("canvas.organizer.resizeGroup")) + '">↘</button>') + '</div>';
    }).join("");
  }

  function renderAnnotations(idea, directionId, t, escape) {
    return annotationsApi.read(idea, directionId).map((item) => '<div class="research-organizer-annotation" data-research-annotation-id="' + escape(item.id) + '" style="left:' + (Number(item.x) || 0) + 'px;top:' + (Number(item.y) || 0) + 'px"><span data-research-annotation-handle>' + escape(item.symbol) + '</span><button type="button" data-research-annotation-delete title="' + escape(t("canvas.organizer.deleteSymbol")) + '">×</button></div>').join("");
  }

  function renderLayers(idea, directionId, t, escape, cards) {
    return '<div class="research-organizer-group-layer" data-research-group-layer>' + renderGroups(idea, directionId, t, escape, cards) + '</div>' +
      '<div class="research-organizer-annotation-layer" data-research-annotation-layer>' + renderAnnotations(idea, directionId, t, escape) + '</div>';
  }

  function bind(view, context) {
    const section = view.querySelector(".research-canvas-section");
    const viewport = view.querySelector("[data-research-canvas-viewport]");
    const canvas = view.querySelector("[data-research-canvas]");
    if (!section || !viewport || !canvas) return;
    const toolbar = section.querySelector("[data-research-organizer-toolbar]");
    const overviewButton = section.querySelector("[data-research-scroll-overview]");
    const mobileLayout = root.matchMedia?.("(max-width: 760px)");
    if (toolbar && mobileLayout) {
      let gridInView = false;
      const updateToolbarVisibility = () => {
        const visible = !mobileLayout.matches || gridInView;
        toolbar.classList.toggle("is-grid-visible", visible);
        toolbar.inert = !visible;
        toolbar.setAttribute("aria-hidden", String(!visible));
        if (!visible) {
          if (toolbar.contains(root.document.activeElement)) root.document.activeElement.blur();
          section.querySelector("[data-research-group-panel]").hidden = true;
          section.querySelector("[data-research-group-form]").hidden = true;
          section.querySelector("[data-research-symbol-picker]").hidden = true;
          section.querySelector("[data-research-organizer-add-menu]").hidden = true;
          section.querySelector('[data-research-organizer-tool="add"]')?.setAttribute("aria-expanded", "false");
        }
      };
      const checkGridPosition = () => {
        const rect = viewport.getBoundingClientRect();
        gridInView = rect.top < root.innerHeight && rect.bottom > 0;
        const deepInGrid = mobileLayout.matches && gridInView && rect.top <= root.innerHeight * .6;
        section.classList.toggle("is-grid-deep", deepInGrid);
        if (overviewButton) {
          overviewButton.inert = !deepInGrid;
          overviewButton.setAttribute("aria-hidden", String(!deepInGrid));
        }
        updateToolbarVisibility();
      };
      checkGridPosition();
      root.addEventListener("scroll", checkGridPosition, { passive: true, signal: context.abortSignal });
      root.addEventListener("resize", checkGridPosition, { passive: true, signal: context.abortSignal });
    }
    const current = () => context.getIdea();
    const directionId = () => context.getDirectionId();
    const cards = () => context.getCards(current());
    const stickerHasUnits = (card) => {
      const document = card?.stickerDocument || current()?.pathData?.researchCanvasStickerDocuments?.[card?.key];
      return Array.isArray(document?.sections) && document.sections.some((entry) => entry?.sectionType === "unit" && entry.enabled !== false);
    };
    const allGroups = () => Array.isArray(current()?.pathData?.researchCanvasGroups) ? current().pathData.researchCanvasGroups : [];
    const allAnnotations = () => Array.isArray(current()?.pathData?.researchCanvasAnnotations) ? current().pathData.researchCanvasAnnotations : [];
    const actions = () => context.getActions();
    const toWorld = (x, y, rect, camera) => geometry.screenToWorld(x, y, rect, viewport.clientLeft, viewport.clientTop, camera, viewport.scrollLeft || 0, viewport.scrollTop || 0);
    const save = async (patch) => {
      try {
        const saved = await actions().saveCanvasOrganization?.(patch) === true;
        if (saved && current()?.pathData) {
          Object.entries(patch).forEach(([key, value]) => {
            current().pathData[key] = key === "researchCanvasPositions"
              ? { ...(current().pathData[key] || {}), ...value } : value;
          });
        }
        return saved;
      } catch (error) { console.warn("Research organization save failed.", error); return false; }
    };
    const notifyFailure = () => root.alert?.(context.t("canvas.organizer.saveFailed"));
    const media = root.MentorData?.repositories?.media;
    const imageUrls = new Map();
    let imageLoadVersion = 0;
    const releaseImages = () => {
      imageLoadVersion++;
      imageUrls.forEach((url) => media?.revokeObjectUrl?.(url));
      imageUrls.clear();
    };
    const groupElement = (id) => Array.from(canvas.querySelectorAll("[data-research-group-id]")).find((element) => element.dataset.researchGroupId === id);
    const groupImageSurface = (id) => Array.from(canvas.querySelectorAll("[data-research-group-image-for]")).find((element) => element.dataset.researchGroupImageFor === id);
    const paintGroup = (group, override = "") => {
      const element = groupElement(group.id);
      if (!element) return;
      const { left, top, width, height } = element.style;
      const stack = element.style.getPropertyValue?.("--research-group-stack") || "";
      element.classList.toggle("has-background-image", group.backgroundMode === "image" && Boolean(group.backgroundImage || group.backgroundMediaId));
      element.style.cssText = "left:" + left + ";top:" + top + ";width:" + width + ";height:" + height + ";--research-group-stack:" + stack + ";" + groupStyle(group, override || imageUrls.get(group.id) || "");
      const surface = groupImageSurface(group.id);
      if (surface) {
        const imageStack = surface.style.getPropertyValue?.("--research-group-image-stack") || "";
        surface.hidden = group.backgroundMode !== "image";
        surface.style.cssText = "left:" + left + ";top:" + top + ";width:" + width + ";height:" + height + ";--research-group-image-stack:" + imageStack + ";" + groupStyle(group, override || imageUrls.get(group.id) || "");
      }
    };
    const hydrateImages = async () => {
      releaseImages();
      const version = imageLoadVersion;
      if (!media?.objectUrlEntity) return;
      for (const group of groupsApi.read(current(), directionId())) {
        if (group.backgroundMode !== "image" || !group.backgroundMediaId) continue;
        try {
          const url = await media.objectUrlEntity("research-group", group.backgroundMediaId);
          if (!url) continue;
          if (version !== imageLoadVersion || context.abortSignal?.aborted || !groupsApi.read(current(), directionId()).some((entry) => entry.id === group.id && entry.backgroundMode === "image" && entry.backgroundMediaId === group.backgroundMediaId)) { media.revokeObjectUrl?.(url); return; }
          imageUrls.set(group.id, url);
          paintGroup(group, url);
        } catch (error) { console.warn("Research group image could not be loaded.", error); }
      }
    };
    context.abortSignal?.addEventListener("abort", releaseImages, { once: true });
    const removeOldImage = async (before, after) => {
      if (!before?.backgroundMediaId || before.backgroundMediaId === after?.backgroundMediaId) return;
      try { await media?.removeEntity?.("research-group", before.backgroundMediaId); }
      catch (error) { console.warn("Old Research group image could not be removed.", error); }
    };
    const stableSelected = () => cards().filter((card) => selection.selected.has(card.key) && groupsApi.eligible(card)).map((card) => card.key);
    const activeSticker = () => cards().find((card) => card.key === activeStickerKey);
    const selectedGroup = () => allGroups().find((group) => group.id === selectedGroupId && group.directionId === directionId());
    const styleTarget = () => {
      const active = selectedGroup();
      if (active) return active;
      const keys = stableSelected();
      return keys.length ? allGroups().find((group) => group.directionId === directionId() && keys.every((key) => group.memberKeys?.includes(key))) : undefined;
    };
    let pointerStartedInGroup = false;
    const pointerMenu = section.querySelector("[data-research-pointer-menu]");
    const groupWheel = pointerMenu.querySelector?.("[data-research-group-wheel]");
    const groupToggle = pointerMenu.querySelector?.("[data-research-pointer-groups]");
    let groupWheelOffset = 0;
    let groupWheelDelta = 0;
    const closePointerMenu = () => {
      pointerMenu.hidden = true;
      if (groupWheel) groupWheel.hidden = true;
      groupToggle?.setAttribute("aria-expanded", "false");
    };
    const renderGroupWheel = () => {
      if (!groupWheel) return;
      const groups = groupsApi.read(current(), directionId());
      if (!groups.length) { groupWheel.innerHTML = ""; return; }
      groupWheelOffset %= groups.length;
      const count = Math.min(5, groups.length);
      groupWheel.innerHTML = Array.from({ length: count }, (_, index) => {
        const group = groups[(groupWheelOffset + index) % groups.length];
        const slot = index - (count - 1) / 2;
        const inset = 34 - Math.abs(slot) * 12;
        return '<button type="button" data-research-pointer-group="' + context.escape(group.id) + '" style="--wheel-y:' + (slot * 38) + 'px;--wheel-inset:' + inset + 'px" title="' + context.escape(group.name) + '">' + groupWheelIcon + '<span class="research-group-wheel-label"><span>' + context.escape(group.name) + '</span></span></button>';
      }).join("");
    };
    groupWheel?.addEventListener("wheel", (event) => {
      event.preventDefault(); event.stopPropagation();
      const count = groupsApi.read(current(), directionId()).length;
      if (count <= 5 || !event.deltaY) return;
      const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 600 : 1);
      groupWheelDelta += Math.max(-40, Math.min(40, pixels));
      if (Math.abs(groupWheelDelta) < 40) return;
      groupWheelOffset = (groupWheelOffset + (groupWheelDelta > 0 ? 1 : count - 1)) % count;
      groupWheelDelta = 0;
      renderGroupWheel();
    }, { passive: false, signal: context.abortSignal });
    const fitGroupNameInput = (input) => { input.size = Math.max(1, Math.min(80, Array.from(input.value || "").length)); };
    const sync = () => {
      if (selectedGroupId && !selectedGroup()) selectedGroupId = "";
      const available = new Set(Array.from(canvas.querySelectorAll(".research-canvas-card:not([hidden])")).map((card) => card.dataset.cardKey));
      selection.selected.forEach((key) => { if (!available.has(key)) selection.selected.delete(key); });
      if (!selection.selected.has(activeStickerKey)) activeStickerKey = selection.selected.values().next().value || "";
      const cardRanks = new Map();
      const visibleGroups = groupsApi.read(current(), directionId());
      canvas.style?.setProperty?.("--research-connections-stack", String(visibleGroups.length ? 4 + (visibleGroups.length - 1) * 4 : 1));
      visibleGroups.forEach((group, index) => (group.memberKeys || []).forEach((key) => cardRanks.set(key, 6 + index * 4)));
      canvas.querySelectorAll(".research-canvas-card").forEach((card) => {
        card.classList.toggle("is-organizer-selected", selection.selected.has(card.dataset.cardKey));
        const rank = cardRanks.get(card.dataset.cardKey);
        if (rank === undefined) card.style.removeProperty?.("--research-card-stack");
        else card.style.setProperty?.("--research-card-stack", String(rank));
      });
      canvas.querySelectorAll("[data-research-group-id]").forEach((group) => group.classList?.toggle("is-organizer-selected", group.dataset.researchGroupId === selectedGroupId));
      section.querySelectorAll("[data-research-organizer-tool]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.researchOrganizerTool === selection.mode)));
      pointerMenu.querySelectorAll("[data-research-pointer-choice]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.researchPointerChoice === selection.mode)));
      viewport.classList.toggle("is-select-mode", selection.mode === "select");
      const bar = section.querySelector("[data-research-selection-bar]");
      bar.hidden = selection.selected.size === 0 && !selectedGroupId;
      section.classList.toggle("has-organizer-selection", !bar.hidden);
      const selectedKeys = Array.from(selection.selected);
      const firstSticker = activeSticker();
      const stickerTitle = (key) => { const card = cards().find((item) => item.key === key); return card?.title || card?.name || key; };
      const shortStickerTitle = (key) => {
        const title = stickerTitle(key);
        return title.length > 30 ? title.slice(0, 29) + "…" : title;
      };
      const activeGroup = selectedGroup();
      const countLabel = bar.querySelector("[data-research-selection-count]");
      countLabel.hidden = Boolean(activeGroup);
      countLabel.textContent = activeGroup?.name || (selectedKeys.length === 1 ? context.t("canvas.organizer.selected", { count: 1 }) + ": " + shortStickerTitle(selectedKeys[0]) : context.t("canvas.organizer.selected", { count: selectedKeys.length }));
      countLabel.title = !activeGroup && selectedKeys.length === 1 ? stickerTitle(selectedKeys[0]) : "";
      const groupNameInput = bar.querySelector("[data-research-group-name]");
      if (groupNameInput) {
        groupNameInput.hidden = !activeGroup;
        if (activeGroup && document.activeElement !== groupNameInput) groupNameInput.value = activeGroup.name;
        if (activeGroup) fitGroupNameInput(groupNameInput);
      }
      const selectedPicker = bar.querySelector("[data-research-selected-stickers]");
      selectedPicker.hidden = Boolean(selectedGroupId) || selectedKeys.length < 2;
      selectedPicker.innerHTML = selectedKeys.map((key) => '<option value="' + context.escape(key) + '" title="' + context.escape(stickerTitle(key)) + '">' + context.escape(shortStickerTitle(key)) + '</option>').join("");
      if (activeStickerKey) selectedPicker.value = activeStickerKey;
      (bar.querySelectorAll?.("[data-research-selection-only]") || []).forEach((control) => { control.hidden = Boolean(selectedGroupId); });
      const createButton = bar.querySelector('[data-research-organizer-action="group"]');
      if (createButton) createButton.disabled = stableSelected().length < 2;
      const members = bar.querySelector("[data-research-group-members]");
      members.hidden = !activeGroup;
      members.querySelector("[data-research-group-members-summary]").textContent = activeGroup ? context.t("canvas.organizer.groupCount", { count: activeGroup.memberKeys?.length || 0 }) : "";
      members.querySelector("[data-research-group-members-options]").innerHTML = activeGroup ? (activeGroup.memberKeys || []).map((key) => {
        const card = cards().find((item) => item.key === key);
        const title = card?.title || card?.name || key;
        return '<div><span title="' + context.escape(title) + '">' + context.escape(title) + '</span><button type="button" data-research-remove-member="' + context.escape(key) + '" aria-label="' + context.escape(context.t("canvas.organizer.removeFromGroup") + ": " + title) + '" title="' + context.escape(context.t("canvas.organizer.removeFromGroup")) + '">×</button></div>';
      }).join("") : "";
      section.querySelector("[data-research-group-upload-wrap]").hidden = !selectedGroupId;
      const groupSettings = section.querySelector("[data-research-group-settings]");
      groupSettings.hidden = false;
      section.querySelector("[data-research-settings-title]").textContent = context.t("canvas.organizer.groupStyle");
      const picker = bar.querySelector("[data-research-group-target]");
      picker.innerHTML = '<option value="">' + context.escape(context.t("canvas.organizer.chooseGroup")) + '</option>' + groupsApi.read(current(), directionId()).map((group) => '<option value="' + context.escape(group.id) + '">' + context.escape(group.name) + '</option>').join("");
      picker.value = selectedGroupId || "";
      picker.setAttribute?.("aria-label", context.t(selectedGroupId ? "canvas.organizer.chooseGroup" : "canvas.organizer.moveToGroup"));
      const group = styleTarget();
      if (group) {
        section.querySelector("[data-research-group-color]").value = groupsApi.color(group.backgroundColor, "#43634b");
        section.querySelector("[data-research-group-image]").value = group.backgroundMode === "image" ? group.backgroundImage || "" : "";
        section.querySelector("[data-research-group-border-color]").value = groupsApi.color(group.borderColor, "#e9cb83");
        section.querySelector("[data-research-group-header-color]").value = groupsApi.color(group.headerColor, "#223626");
        section.querySelector("[data-research-group-text-color]").value = groupsApi.color(group.textColor, "#f6e9c7");
        section.querySelector("[data-research-group-font-family]").value = groupsApi.fontFamily(group.fontFamily);
        section.querySelector("[data-research-group-font-size]").value = groupsApi.fontSize(group.fontSize);
        section.querySelector("[data-research-group-image-opacity]").value = groupsApi.imageOpacity(group.imageOpacity);
        section.querySelector("[data-research-group-opacity-value]").textContent = groupsApi.imageOpacity(group.imageOpacity) + "%";
        const imageControls = section.querySelector("[data-research-image-controls]");
        if (imageControls) imageControls.hidden = group.backgroundMode !== "image" || !(group.backgroundImage || group.backgroundMediaId);
        const zoomValue = section.querySelector("[data-research-image-zoom-value]");
        if (zoomValue) zoomValue.textContent = Math.round(groupsApi.imageZoom(group.imageZoom) * 100) + "%";
        bar.querySelector("[data-research-quick-group-color]").value = groupsApi.color(group.backgroundColor, "#43634b");
        bar.querySelector("[data-research-quick-header-color]").value = groupsApi.color(group.headerColor, "#223626");
      }
    };
    const selectGroup = (id) => { selection.selected.clear(); activeStickerKey = ""; selectedGroupId = id; sync(); };
    syncActiveSelection = sync;
    const refreshLayers = () => {
      canvas.querySelector("[data-research-group-layer]").innerHTML = renderGroups(current(), directionId(), context.t, context.escape, cards());
      canvas.querySelector("[data-research-annotation-layer]").innerHTML = renderAnnotations(current(), directionId(), context.t, context.escape);
      applyVisibility(canvas, current(), directionId(), context.drawConnections, context.getCards);
      applyFindings(canvas, current());
      sync();
      hydrateImages();
    };
    const previousWorkspace = selection.workspace;
    select.setWorkspace(selection, current()?.id, directionId());
    if (selection.workspace !== previousWorkspace) { pendingSymbol = ""; selectedGroupId = ""; }
    applyVisibility(canvas, current(), directionId(), context.drawConnections, context.getCards);
    applyFindings(canvas, current());
    sync();
    hydrateImages();

    document.addEventListener("pointerdown", (event) => {
      pointerStartedInGroup = Boolean(event.target.closest?.("[data-research-group-id]"));
      if (!event.target.closest?.("[data-research-pointer-menu]")) closePointerMenu();
      if (!event.target.closest?.('[data-research-group-panel], [data-research-organizer-tool="settings"]')) {
        section.querySelector("[data-research-group-panel]").hidden = true;
      }
      if (!event.target.closest?.("[data-research-organizer-toolbar]")) {
        const addMenu = section.querySelector("[data-research-organizer-add-menu]");
        if (addMenu) addMenu.hidden = true;
        section.querySelector('[data-research-organizer-tool="add"]')?.setAttribute?.("aria-expanded", "false");
      }
    }, { capture: true, signal: context.abortSignal });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") closePointerMenu(); }, { signal: context.abortSignal });
    document.addEventListener("click", (event) => {
      const startedInGroup = pointerStartedInGroup;
      pointerStartedInGroup = false;
      if (!selectedGroupId || startedInGroup || root.MentorUIEvents?.isTextEditingEvent?.(event) || event.target.closest?.("[data-research-group-id], [data-research-selection-bar], [data-research-group-panel], [data-research-organizer-toolbar], [data-research-pointer-menu], [data-research-group-form], input, textarea, select, [contenteditable]")) return;
      selectedGroupId = "";
      sync();
    }, { signal: context.abortSignal });

    section.addEventListener("click", async (event) => {
      const returnButton = event.target.closest?.("[data-research-scroll-overview]");
      if (returnButton && section.contains(returnButton)) {
        event.preventDefault();
        event.stopPropagation();
        view.querySelector(".research-detail-stage")?.scrollIntoView({ behavior: root.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
        return;
      }
      const groupsButton = event.target.closest?.("button[data-research-pointer-groups]");
      if (groupsButton && section.contains(groupsButton)) {
        event.preventDefault(); event.stopPropagation();
        if (groupWheel) {
          const open = groupWheel.hidden && groupsApi.read(current(), directionId()).length > 0;
          if (open) renderGroupWheel();
          groupWheel.hidden = !open;
          groupsButton.setAttribute("aria-expanded", String(open));
        }
        return;
      }
      const groupChoice = event.target.closest?.("[data-research-pointer-group]");
      if (groupChoice && section.contains(groupChoice)) {
        event.preventDefault(); event.stopPropagation();
        const group = groupsApi.read(current(), directionId()).find((item) => item.id === groupChoice.dataset.researchPointerGroup);
        closePointerMenu();
        if (group) { selectGroup(group.id); context.focusGroup?.(group); }
        return;
      }
      const pointerChoice = event.target.closest?.("[data-research-pointer-choice]");
      if (pointerChoice && section.contains(pointerChoice)) {
        event.preventDefault(); event.stopPropagation();
        selection.mode = pointerChoice.dataset.researchPointerChoice;
        pendingSymbol = "";
        closePointerMenu();
        sync();
        return;
      }
      const tool = event.target.closest?.("[data-research-organizer-tool]");
      if (tool && section.contains(tool)) {
        event.preventDefault(); event.stopPropagation();
        const name = tool.dataset.researchOrganizerTool;
        if (name === "select" || name === "pan") { selection.mode = name; pendingSymbol = ""; sync(); }
        if (name === "settings") { const panel = section.querySelector("[data-research-group-panel]"); panel.hidden = !panel.hidden; sync(); }
        if (name === "finding") await toggleFindings();
        if (name === "symbol") { const picker = section.querySelector("[data-research-symbol-picker]"); picker.hidden = !picker.hidden; }
        if (name === "add") {
          const menu = section.querySelector("[data-research-organizer-add-menu]");
          menu.hidden = !menu.hidden;
          tool.setAttribute("aria-expanded", String(!menu.hidden));
        }
        return;
      }
      const chosen = event.target.closest?.("[data-research-symbol-choice]");
      if (chosen) { pendingSymbol = chosen.dataset.researchSymbolChoice; section.querySelector("[data-research-symbol-picker]").hidden = true; selection.mode = "select"; sync(); return; }
      const member = event.target.closest?.("[data-research-remove-member]");
      if (member && selectedGroup()) {
        const key = member.dataset.researchRemoveMember;
        if (!selectedGroup().memberKeys?.includes(key)) return;
        if (await save({ researchCanvasGroups: groupsApi.assign(allGroups(), [key], "") })) refreshLayers(); else notifyFailure();
        return;
      }
      const action = event.target.closest?.("[data-research-organizer-action]")?.dataset.researchOrganizerAction;
      if (action) {
        if (action === "clear") { selection.selected.clear(); selectedGroupId = ""; sync(); }
        if (action === "cancel") section.querySelector("[data-research-group-form]").hidden = true;
        if (action === "group") openGroupForm(section, stableSelected(), context);
        if (action === "finding") await toggleFindings();
        if (action === "leave") await changeMembership("");
        return;
      }
      const groupElement = event.target.closest?.("[data-research-group-id]");
      if (groupElement) {
        if (Date.now() < suppressEmptyClickUntil || root.MentorUIEvents?.isTextEditingEvent?.(event)) return;
        const id = groupElement.dataset.researchGroupId;
        const existing = allGroups().find((group) => group.id === id);
        if (!existing) return;
        if (event.target.closest("[data-research-group-toggle]")) {
          if (await save({ researchCanvasGroups: allGroups().map((group) => group.id === id ? { ...group, collapsed: !group.collapsed } : group) })) refreshLayers();
          else notifyFailure();
        } else if (event.target.closest("[data-research-group-remove]")) {
          if (await save({ researchCanvasGroups: allGroups().filter((group) => group.id !== id) })) { if (selectedGroupId === id) selectedGroupId = ""; refreshLayers(); await removeOldImage(existing); }
          else notifyFailure();
        } else if (!event.target.closest("[data-research-group-resize]")) {
          if (selection.mode !== "select" || event.target.closest("[data-research-group-handle]")) selectGroup(id);
          else { selection.selected.clear(); selectedGroupId = ""; sync(); }
        }
        return;
      }
      const annotationElement = event.target.closest?.("[data-research-annotation-id]");
      if (annotationElement) {
        if (event.target.closest("[data-research-annotation-delete]")) {
          const next = annotationsApi.remove(allAnnotations(), annotationElement.dataset.researchAnnotationId);
          if (await save({ researchCanvasAnnotations: next })) refreshLayers(); else notifyFailure();
        }
        return;
      }
      if (pointerStartedInGroup) return;
      if (!viewport.contains(event.target)) return;
      if (Date.now() < suppressEmptyClickUntil || event.target.closest?.(".research-canvas-card, button, a, input, textarea, select, [contenteditable], [data-research-group-form]")) return;
      if (pendingSymbol) {
        const camera = context.getCamera();
        const point = toWorld(event.clientX, event.clientY, viewport.getBoundingClientRect(), camera);
        const annotation = { id: "symbol_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8), directionId: directionId(), symbol: pendingSymbol, x: Math.round(point.x), y: Math.round(point.y) };
        if (await save({ researchCanvasAnnotations: annotationsApi.add(allAnnotations(), annotation) })) { pendingSymbol = ""; refreshLayers(); } else notifyFailure();
      } else if (selectedGroupId || selection.selected.size || selection.mode === "select") { selection.selected.clear(); selectedGroupId = ""; sync(); }
    });

    const groupNameInput = section.querySelector("[data-research-group-name]");
    let editingGroupId = "";
    groupNameInput?.addEventListener("focus", () => { editingGroupId = selectedGroupId; });
    groupNameInput?.addEventListener("input", () => fitGroupNameInput(groupNameInput));
    groupNameInput?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== "Escape") return;
      event.preventDefault(); event.stopPropagation();
      if (event.key === "Escape") {
        const group = allGroups().find((entry) => entry.id === (editingGroupId || selectedGroupId));
        groupNameInput.value = group?.name || "";
        fitGroupNameInput(groupNameInput);
      }
      groupNameInput.blur();
    });
    groupNameInput?.addEventListener("change", async () => {
      const groupId = editingGroupId || selectedGroupId;
      editingGroupId = "";
      const group = allGroups().find((entry) => entry.id === groupId && entry.directionId === directionId());
      if (!group) return;
      const name = groupNameInput.value.trim();
      if (!name || name === group.name) { groupNameInput.value = group.name; fitGroupNameInput(groupNameInput); return; }
      const next = allGroups().map((entry) => entry.id === groupId ? { ...entry, name } : entry);
      if (await save({ researchCanvasGroups: next })) refreshLayers();
      else { groupNameInput.value = group.name; fitGroupNameInput(groupNameInput); notifyFailure(); }
    });

    section.querySelector("[data-research-group-target]").addEventListener("change", async (event) => {
      if (selectedGroupId) { if (event.target.value) selectGroup(event.target.value); return; }
      if (event.target.value) await changeMembership(event.target.value);
      event.target.value = "";
    });
    section.querySelector("[data-research-selected-stickers]").addEventListener("change", (event) => {
      if (!selection.selected.has(event.target.value)) return;
      activeStickerKey = event.target.value;
      sync();
    });
    const previewAppearance = (changes) => { const group = styleTarget(); if (group) paintGroup({ ...group, ...changes }); };
    const persistAppearance = async (changes) => {
      const group = styleTarget();
      if (!group) return;
      const updated = { ...group, ...changes };
      const next = allGroups().map((entry) => entry.id === group.id ? updated : entry);
      if (await save({ researchCanvasGroups: next })) { refreshLayers(); await removeOldImage(group, updated); }
      else { paintGroup(group); sync(); notifyFailure(); }
    };
    const colorInput = section.querySelector("[data-research-group-color]");
    colorInput.addEventListener("input", (event) => { section.querySelector("[data-research-quick-group-color]").value = event.target.value; previewAppearance({ backgroundColor: event.target.value, backgroundMode: "solid" }); });
    colorInput.addEventListener("change", (event) => persistAppearance({ backgroundColor: event.target.value, backgroundMode: "solid", backgroundMediaId: "" }));
    section.querySelector("[data-research-quick-group-color]").addEventListener("input", (event) => {
      colorInput.value = event.target.value;
      previewAppearance({ backgroundColor: event.target.value, backgroundMode: "solid" });
    });
    section.querySelector("[data-research-quick-group-color]").addEventListener("change", (event) => persistAppearance({ backgroundColor: event.target.value, backgroundMode: "solid", backgroundMediaId: "" }));
    section.querySelector("[data-research-group-image]").addEventListener("change", async (event) => {
      const raw = event.target.value.trim();
      const image = raw ? groupsApi.imageUrl(raw) : "";
      if (raw && !image) { root.alert?.(context.t("canvas.organizer.invalidImageUrl")); sync(); return; }
      await persistAppearance({ backgroundImage: image, backgroundMediaId: "", backgroundMode: image ? "image" : "solid" });
    });
    section.querySelector("[data-research-group-upload]").addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      const group = styleTarget();
      if (!file || !group) return;
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024) { root.alert?.(context.t("canvas.organizer.invalidImageFile")); return; }
      if (!media?.saveEntity || !media?.removeEntity || !media?.objectUrlEntity) { notifyFailure(); return; }
      const mediaId = "research-group:" + current().id + ":" + group.id + ":" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
      try {
        await media.saveEntity("research-group", mediaId, file);
        const updated = { ...group, backgroundMediaId: mediaId, backgroundImage: "", backgroundMode: "image" };
        const next = allGroups().map((entry) => entry.id === group.id ? updated : entry);
        if (await save({ researchCanvasGroups: next })) { refreshLayers(); await removeOldImage(group, updated); }
        else { await media.removeEntity("research-group", mediaId); notifyFailure(); }
      } catch (error) {
        console.warn("Research group image upload failed.", error);
        try { await media.removeEntity("research-group", mediaId); } catch (_) {}
        notifyFailure();
      }
    });
    for (const [selector, field] of [["[data-research-group-border-color]", "borderColor"], ["[data-research-group-header-color]", "headerColor"]]) {
      const control = section.querySelector(selector);
      control.addEventListener("input", (event) => {
        if (field === "headerColor") section.querySelector("[data-research-quick-header-color]").value = event.target.value;
        previewAppearance({ [field]: event.target.value });
      });
      control.addEventListener("change", (event) => persistAppearance({ [field]: event.target.value }));
    }
    section.querySelector("[data-research-quick-header-color]").addEventListener("input", (event) => {
      section.querySelector("[data-research-group-header-color]").value = event.target.value;
      previewAppearance({ headerColor: event.target.value });
    });
    section.querySelector("[data-research-quick-header-color]").addEventListener("change", (event) => persistAppearance({ headerColor: event.target.value }));
    const textColor = section.querySelector("[data-research-group-text-color]");
    textColor.addEventListener("input", (event) => previewAppearance({ textColor: event.target.value }));
    textColor.addEventListener("change", (event) => persistAppearance({ textColor: event.target.value }));
    section.querySelector("[data-research-group-font-family]").addEventListener("change", (event) => {
      const fontFamily = groupsApi.fontFamily(event.target.value);
      previewAppearance({ fontFamily });
      persistAppearance({ fontFamily });
    });
    section.querySelector("[data-research-group-font-size]").addEventListener("change", (event) => {
      const fontSize = groupsApi.fontSize(event.target.value);
      previewAppearance({ fontSize });
      persistAppearance({ fontSize });
    });
    const opacity = section.querySelector("[data-research-group-image-opacity]");
    opacity.addEventListener("input", (event) => {
      const value = groupsApi.imageOpacity(event.target.value);
      section.querySelector("[data-research-group-opacity-value]").textContent = value + "%";
      previewAppearance({ imageOpacity: value });
    });
    opacity.addEventListener("change", (event) => persistAppearance({ imageOpacity: groupsApi.imageOpacity(event.target.value) }));
    section.querySelector("[data-research-image-controls]")?.addEventListener("click", async (event) => {
      const action = event.target.closest?.("button[data-research-image-action]")?.dataset.researchImageAction;
      const group = styleTarget();
      if (!action || !group || group.backgroundMode !== "image") return;
      const x = groupsApi.imagePosition(group.imagePositionX);
      const y = groupsApi.imagePosition(group.imagePositionY);
      const zoom = groupsApi.imageZoom(group.imageZoom);
      const changes = {
        up: { imagePositionY: groupsApi.imagePosition(y - 20) },
        down: { imagePositionY: groupsApi.imagePosition(y + 20) },
        left: { imagePositionX: groupsApi.imagePosition(x - 20) },
        right: { imagePositionX: groupsApi.imagePosition(x + 20) },
        center: { imagePositionX: 50, imagePositionY: 50 },
        zoomIn: { imageZoom: groupsApi.imageZoom(zoom + .1) },
        zoomOut: { imageZoom: groupsApi.imageZoom(zoom - .1) }
      }[action];
      if (!changes) return;
      const updated = { ...group, ...changes };
      paintGroup(updated);
      const next = allGroups().map((entry) => entry.id === group.id ? updated : entry);
      if (await save({ researchCanvasGroups: next })) sync();
      else { paintGroup(group); sync(); notifyFailure(); }
    });
    section.querySelector("[data-research-group-form]").addEventListener("submit", async (event) => {
      event.preventDefault(); event.stopPropagation();
      const keys = stableSelected();
      if (keys.length < 2) return;
      const form = event.currentTarget;
      const name = form.elements.name.value.trim();
      if (!name) return;
      const selectedElements = keys.map((key) => Array.from(canvas.querySelectorAll(".research-canvas-card")).find((card) => card.dataset.cardKey === key)).filter(Boolean);
      const bounds = selectedElements.map((card) => ({ x: parseFloat(card.style.left) || 0, y: parseFloat(card.style.top) || 0, size: context.getVisualSize(card) }));
      const left = Math.min(...bounds.map((item) => item.x)) - 22;
      const top = Math.min(...bounds.map((item) => item.y)) - 54;
      const right = Math.max(...bounds.map((item) => item.x + item.size.width)) + 22;
      const bottom = Math.max(...bounds.map((item) => item.y + item.size.height)) + 22;
      const rawImage = section.querySelector("[data-research-group-image]").value.trim();
      const image = rawImage ? groupsApi.imageUrl(rawImage) : "";
      if (rawImage && !image) { root.alert?.(context.t("canvas.organizer.invalidImageUrl")); return; }
      const group = { id: "group_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8), directionId: directionId(), name, description: form.elements.description.value.trim(), memberKeys: keys, x: Math.round(left), y: Math.round(top), width: Math.round(right - left), height: Math.round(bottom - top), collapsed: false, backgroundColor: section.querySelector("[data-research-quick-group-color]").value, backgroundImage: image, backgroundMode: image ? "image" : "solid", imageOpacity: groupsApi.imageOpacity(section.querySelector("[data-research-group-image-opacity]").value), borderColor: section.querySelector("[data-research-group-border-color]").value, headerColor: section.querySelector("[data-research-quick-header-color]").value, textColor: section.querySelector("[data-research-group-text-color]").value, fontFamily: groupsApi.fontFamily(section.querySelector("[data-research-group-font-family]").value), fontSize: groupsApi.fontSize(section.querySelector("[data-research-group-font-size]").value) };
      const next = [...groupsApi.assign(allGroups(), keys, ""), group];
      if (await save({ researchCanvasGroups: next })) { form.hidden = true; form.reset(); refreshLayers(); } else notifyFailure();
    });

    viewport.addEventListener("pointerdown", (event) => {
      if (event.button === 1) {
        if (root.MentorUIEvents?.isTextEditingEvent?.(event) || event.target.closest?.("button, a, input, textarea, select, [contenteditable], iframe, video, audio")) return;
        event.preventDefault(); event.stopPropagation();
        const radius = 64;
        pointerMenu.classList.toggle("is-flipped", event.clientX < radius);
        pointerMenu.style.left = event.clientX + "px";
        pointerMenu.style.top = Math.max(radius, Math.min(event.clientY, (root.innerHeight || 768) - radius)) + "px";
        pointerMenu.classList.toggle("is-wheel-flipped", event.clientX + 270 > (root.innerWidth || 1024));
        groupWheelOffset = 0;
        groupWheelDelta = 0;
        if (groupWheel) groupWheel.hidden = true;
        if (groupToggle) {
          groupToggle.hidden = groupsApi.read(current(), directionId()).length === 0;
          groupToggle.setAttribute("aria-expanded", "false");
        }
        pointerMenu.hidden = false;
        return;
      }
      if (event.button !== 0 || root.MentorUIEvents?.isTextEditingEvent?.(event)) return;
      const resize = event.target.closest?.("[data-research-group-resize]");
      if (resize) { const group = resize.closest("[data-research-group-id]"); if (group) selectGroup(group.dataset.researchGroupId); resizeGroup(event, group); return; }
      const groupElement = event.target.closest?.("[data-research-group-id]");
      if (groupElement && !event.target.closest?.("button, a, input, textarea, select, [contenteditable]")) {
        if (selection.mode !== "select" || event.target.closest?.("[data-research-group-handle]")) {
          pendingSymbol = "";
          selectGroup(groupElement.dataset.researchGroupId);
          dragGroup(event, groupElement);
          return;
        }
      }
      const symbol = event.target.closest?.("[data-research-annotation-handle]");
      if (symbol) { dragAnnotation(event, symbol.closest("[data-research-annotation-id]")); return; }
      if (selection.mode !== "select" || pendingSymbol || event.target.closest?.(".research-canvas-card, .research-organizer-annotation, button, a, input, textarea, select, [contenteditable], iframe, video, audio, [data-research-group-form], [data-research-symbol-picker]")) return;
      const start = { x: event.clientX, y: event.clientY };
      let moved = false;
      const marquee = viewport.querySelector("[data-research-marquee]");
      const move = (next) => {
        if (next.pointerId !== event.pointerId) return;
        if (!moved && Math.hypot(next.clientX - start.x, next.clientY - start.y) < 4) return;
        moved = true;
        const box = geometry.normalizeRect(start, { x: next.clientX, y: next.clientY });
        const viewportBox = viewport.getBoundingClientRect();
        marquee.hidden = false;
        marquee.style.left = box.left - viewportBox.left + "px";
        marquee.style.top = box.top - viewportBox.top + "px";
        marquee.style.width = box.right - box.left + "px";
        marquee.style.height = box.bottom - box.top + "px";
      };
      const finish = (end) => {
        if (end.pointerId !== event.pointerId) return;
        viewport.removeEventListener("pointermove", move);
        viewport.removeEventListener("pointerup", finish);
        viewport.removeEventListener("pointercancel", finish);
        marquee.hidden = true;
        if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
        if (!moved || end.type === "pointercancel") {
          if (!moved && end.type !== "pointercancel" && groupElement && !event.target.closest?.("[data-research-group-handle]")) {
            selection.selected.clear();
            selectedGroupId = "";
            sync();
          }
          return;
        }
        const viewportBox = viewport.getBoundingClientRect(), camera = context.getCamera();
        const worldRect = geometry.normalizeRect(
          toWorld(start.x, start.y, viewportBox, camera),
          toWorld(end.clientX, end.clientY, viewportBox, camera)
        );
        const visible = Array.from(canvas.querySelectorAll(".research-canvas-card:not([hidden])")).map((card) => {
          const rect = card.getBoundingClientRect();
          return { key: card.dataset.cardKey, bounds: geometry.normalizeRect(
            toWorld(rect.left, rect.top, viewportBox, camera),
            toWorld(rect.right, rect.bottom, viewportBox, camera)
          ) };
        });
        selectedGroupId = "";
        select.selectRect(selection, worldRect, visible, event.ctrlKey || event.shiftKey);
        suppressEmptyClickUntil = Date.now() + 300;
        sync();
      };
      event.preventDefault();
      viewport.setPointerCapture(event.pointerId);
      viewport.addEventListener("pointermove", move);
      viewport.addEventListener("pointerup", finish);
      viewport.addEventListener("pointercancel", finish);
    });

    const esc = (event) => {
      if (event.key !== "Escape" || root.MentorUIEvents?.isTextEditingEvent?.(event) || view.querySelector("[data-research-canvas-preview]")) return;
      pendingSymbol = ""; selection.selected.clear(); selectedGroupId = ""; sync();
      section.querySelector("[data-research-group-form]").hidden = true;
      section.querySelector("[data-research-symbol-picker]").hidden = true;
    };
    document.addEventListener("keydown", esc, { signal: context.abortSignal });

    async function changeMembership(groupId) {
      const keys = stableSelected();
      if (!keys.length) { root.alert?.(context.t("canvas.organizer.unstableCard")); return; }
      const next = groupsApi.assign(allGroups(), keys, groupId);
      if (await save({ researchCanvasGroups: next })) refreshLayers(); else notifyFailure();
    }

    async function toggleFindings() {
      const keys = stableSelected();
      if (!keys.length) { root.alert?.(context.t("canvas.organizer.unstableCard")); return; }
      const previous = current()?.pathData?.researchCanvasKeyFindings || {};
      const mark = keys.some((key) => !previous[key]);
      const next = { ...previous };
      keys.forEach((key) => { if (mark) next[key] = true; else delete next[key]; });
      if (await save({ researchCanvasKeyFindings: next })) applyFindings(canvas, current()); else notifyFailure();
    }

    viewport.addEventListener("auxclick", (event) => {
      if (event.button === 1 && !root.MentorUIEvents?.isTextEditingEvent?.(event) && !event.target.closest?.("button, a, input, textarea, select, [contenteditable], iframe, video, audio")) event.preventDefault();
    });

    function resizeGroup(event, element) {
      const group = allGroups().find((entry) => entry.id === element?.dataset.researchGroupId && entry.directionId === directionId());
      if (!group || group.collapsed) return;
      event.preventDefault(); event.stopPropagation();
      const surface = groupImageSurface(group.id);
      const width = Math.max(180, Number(group.width) || 240), height = Math.max(86, Number(group.height) || 160);
      let nextGroup = group, moved = false;
      const move = (next) => {
        if (next.pointerId !== event.pointerId) return;
        const zoom = context.getCamera().zoom || 1;
        nextGroup = groupsApi.resize(group, width + (next.clientX - event.clientX) / zoom, height + (next.clientY - event.clientY) / zoom);
        moved = true;
        element.style.width = nextGroup.width + "px";
        element.style.height = nextGroup.height + "px";
        if (surface) { surface.style.width = element.style.width; surface.style.height = element.style.height; }
      };
      const finish = async (end) => {
        if (end.pointerId !== event.pointerId) return;
        viewport.removeEventListener("pointermove", move);
        viewport.removeEventListener("pointerup", finish);
        viewport.removeEventListener("pointercancel", finish);
        if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
        if (!moved || end.type === "pointercancel") { restore(); return; }
        suppressEmptyClickUntil = Date.now() + 300;
        const next = allGroups().map((entry) => entry.id === group.id ? nextGroup : entry);
        if (await save({ researchCanvasGroups: next })) refreshLayers();
        else { restore(); notifyFailure(); }
      };
      const restore = () => {
        element.style.width = width + "px"; element.style.height = height + "px";
        if (surface) { surface.style.width = element.style.width; surface.style.height = element.style.height; }
      };
      viewport.setPointerCapture(event.pointerId);
      viewport.addEventListener("pointermove", move);
      viewport.addEventListener("pointerup", finish);
      viewport.addEventListener("pointercancel", finish);
    }

    function dragGroup(event, element) {
      const group = allGroups().find((entry) => entry.id === element?.dataset.researchGroupId && entry.directionId === directionId());
      if (!group) return;
      event.preventDefault(); event.stopPropagation();
      const surface = groupImageSurface(group.id);
      element.classList.add("is-dragging");
      surface?.classList.add("is-dragging");
      canvas.classList?.add("is-group-dragging");
      const members = (group.memberKeys || []).map((key) => Array.from(canvas.querySelectorAll(".research-canvas-card")).find((card) => card.dataset.cardKey === key)).filter(Boolean);
      const memberKeys = new Set(members.map((card) => card.dataset.cardKey));
      const cardElements = new Map(Array.from(canvas.querySelectorAll(".research-canvas-card"))
        .map((card) => [card.dataset.cardKey, card]));
      const rectOf = (card) => ({ x: parseFloat(card.style.left) || 0, y: parseFloat(card.style.top) || 0,
        ...(context.getVisualSize?.(card) || { width: card.offsetWidth || 0, height: card.offsetHeight || 0 }) });
      const edges = root.MentorResearchModel.getCanvasGraph(cards(), current()?.pathData?.researchCanvasCollapsed || {}).parentByKey;
      const externalEdges = Array.from(edges).filter(([childKey, parentKey]) => memberKeys.has(childKey) !== memberKeys.has(parentKey));
      const sectors = context.captureConnectionSectors?.(externalEdges, cardElements, rectOf, memberKeys) || [];
      members.forEach((card) => card.classList.add("is-group-drag-member"));
      const clearDragLayer = () => {
        element.classList.remove("is-dragging");
        surface?.classList.remove("is-dragging");
        canvas.classList?.remove("is-group-dragging");
        members.forEach((card) => card.classList.remove("is-group-drag-member"));
      };
      const originals = Object.fromEntries(members.map((card) => [card.dataset.cardKey, { x: parseFloat(card.style.left) || 0, y: parseFloat(card.style.top) || 0 }]));
      let dx = 0, dy = 0, moved = false;
      const move = (next) => {
        if (next.pointerId !== event.pointerId) return;
        dx = (next.clientX - event.clientX) / context.getCamera().zoom;
        dy = (next.clientY - event.clientY) / context.getCamera().zoom;
        if (!moved && Math.hypot(dx, dy) < 4) return;
        moved = true;
        element.style.left = (Number(group.x) || 0) + dx + "px";
        element.style.top = (Number(group.y) || 0) + dy + "px";
        if (surface) { surface.style.left = element.style.left; surface.style.top = element.style.top; }
        members.forEach((card) => context.placeCard(canvas, card, originals[card.dataset.cardKey].x + dx, originals[card.dataset.cardKey].y + dy));
        canvas._researchConnectionSideOverrides = context.changedConnectionSides?.(sectors, rectOf) || {};
        context.drawConnections(canvas);
      };
      const finish = async (end) => {
        if (end.pointerId !== event.pointerId) return;
        viewport.removeEventListener("pointermove", move);
        viewport.removeEventListener("pointerup", finish);
        viewport.removeEventListener("pointercancel", finish);
        if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
        if (!moved || end.type === "pointercancel") {
          restore();
          clearDragLayer();
          return;
        }
        suppressEmptyClickUntil = Date.now() + 300;
        const movedData = groupsApi.move(group, originals, Math.round(dx), Math.round(dy));
        const nextGroups = groupsApi.bringToFront(allGroups(), movedData.group);
        const positions = Object.fromEntries(Object.entries(movedData.positions).map(([key, point]) => [key, { x: Math.round(point.x), y: Math.round(point.y) }]));
        const sides = context.changedConnectionSides?.(sectors, rectOf) || {};
        let saved = false;
        if (Object.keys(sides).length) {
          try { saved = await actions().saveCanvasMove?.(positions, sides, "", nextGroups) === true; }
          catch (error) { console.warn("Research group move could not be saved.", error); }
          if (saved && current()?.pathData) {
            current().pathData.researchCanvasGroups = nextGroups;
            current().pathData.researchCanvasPositions = { ...(current().pathData.researchCanvasPositions || {}), ...positions };
          }
        } else saved = await save({ researchCanvasGroups: nextGroups, researchCanvasPositions: positions });
        if (saved) {
          members.forEach((card) => context.placeCard(canvas, card, positions[card.dataset.cardKey].x, positions[card.dataset.cardKey].y));
          delete canvas._researchConnectionSideOverrides;
          context.drawConnections(canvas);
          clearDragLayer();
          refreshLayers();
        }
        else { restore(); clearDragLayer(); notifyFailure(); }
      };
      const restore = () => {
        element.style.left = group.x + "px"; element.style.top = group.y + "px";
        if (surface) { surface.style.left = element.style.left; surface.style.top = element.style.top; }
        members.forEach((card) => context.placeCard(canvas, card, originals[card.dataset.cardKey].x, originals[card.dataset.cardKey].y));
        delete canvas._researchConnectionSideOverrides;
        context.drawConnections(canvas);
      };
      viewport.setPointerCapture(event.pointerId);
      viewport.addEventListener("pointermove", move);
      viewport.addEventListener("pointerup", finish);
      viewport.addEventListener("pointercancel", finish);
    }

    function dragAnnotation(event, element) {
      const annotation = allAnnotations().find((entry) => entry.id === element?.dataset.researchAnnotationId);
      if (!annotation) return;
      event.preventDefault(); event.stopPropagation();
      let x = annotation.x, y = annotation.y, moved = false;
      const move = (next) => {
        if (next.pointerId !== event.pointerId) return;
        x = annotation.x + (next.clientX - event.clientX) / context.getCamera().zoom;
        y = annotation.y + (next.clientY - event.clientY) / context.getCamera().zoom;
        if (!moved && Math.hypot(x - annotation.x, y - annotation.y) < 4) return;
        moved = true; element.style.left = x + "px"; element.style.top = y + "px";
      };
      const finish = async (end) => {
        if (end.pointerId !== event.pointerId) return;
        viewport.removeEventListener("pointermove", move);
        viewport.removeEventListener("pointerup", finish);
        viewport.removeEventListener("pointercancel", finish);
        if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
        suppressEmptyClickUntil = Date.now() + 300;
        if (!moved || end.type === "pointercancel") { element.style.left = annotation.x + "px"; element.style.top = annotation.y + "px"; return; }
        if (await save({ researchCanvasAnnotations: annotationsApi.move(allAnnotations(), annotation.id, Math.round(x), Math.round(y)) })) refreshLayers();
        else { element.style.left = annotation.x + "px"; element.style.top = annotation.y + "px"; notifyFailure(); }
      };
      viewport.setPointerCapture(event.pointerId);
      viewport.addEventListener("pointermove", move);
      viewport.addEventListener("pointerup", finish);
      viewport.addEventListener("pointercancel", finish);
    }
  }

  function openGroupForm(viewport, keys, context) {
    if (keys.length < 2) { root.alert?.(context.t("canvas.organizer.groupNeedsTwo")); return; }
    viewport.querySelector("[data-research-group-panel]").hidden = true;
    const form = viewport.querySelector("[data-research-group-form]");
    form.hidden = false;
    form.elements.name.focus();
  }

  function applyVisibility(canvas, idea, directionId, drawConnections, getCards) {
    if (!canvas) return;
    const collapsedGroupKeys = new Set(groupsApi.read(idea, directionId).filter((group) => group.collapsed).flatMap((group) => group.memberKeys || []));
    const graph = root.MentorResearchModel.getCanvasGraph(getCards(idea), idea?.pathData?.researchCanvasCollapsed || {});
    canvas.querySelectorAll(".research-canvas-card").forEach((card) => {
      const hidden = collapsedGroupKeys.has(card.dataset.cardKey) || graph.hiddenKeys.has(card.dataset.cardKey);
      card.hidden = hidden;
      card.tabIndex = hidden ? -1 : 0;
    });
    drawConnections(canvas);
  }

  function applyFindings(canvas, idea) {
    const flags = idea?.pathData?.researchCanvasKeyFindings || {};
    canvas.querySelectorAll(".research-canvas-card").forEach((card) => card.classList.toggle("is-key-finding", Boolean(flags[card.dataset.cardKey])));
  }

  function handleCardClick(view, event) {
    if (root.MentorUIEvents?.isTextEditingEvent?.(event)) return false;
    const card = event.target.closest?.(".research-canvas-card");
    if (!card || !view.contains(card)) return false;
    selectedGroupId = "";
    select.select(selection, card.dataset.cardKey, event.ctrlKey || event.shiftKey);
    if (!selection.selected.has(activeStickerKey)) activeStickerKey = selection.selected.values().next().value || "";
    syncActiveSelection?.();
    return true;
  }

  function prepareCardDrag(key, event) {
    if (!key || event.ctrlKey || event.shiftKey) return [];
    if (selectedGroupId || !selection.selected.has(key)) {
      selection.selected.clear();
      selection.selected.add(key);
      activeStickerKey = key;
      selectedGroupId = "";
      syncActiveSelection?.();
    }
    return Array.from(selection.selected);
  }

  root.MentorResearchOrganizer = { renderToolbar, renderSelectionBar, renderLayers, bind, applyVisibility, handleCardClick, prepareCardDrag, isSelectMode: () => selection.mode === "select" };
})(window);
