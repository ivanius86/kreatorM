(function (root) {
  "use strict";

  const ASSET_ROOT = "assets/journal/book-prototype/knjigice/";
  const FRAME_URLS = ["closed.png", "half-open.png", "open.png"].map((name) => ASSET_ROOT + name);
  const LAST_FRAME_INDEX = FRAME_URLS.length - 1;
  const t = (key) => root.MentorI18n.t("journalBookPrototype." + key);
  let mounted = false;
  let host, stage, canvas, context, editor, cover, status, toggle, stop, download, retry, staticImage, motionImage;
  let left, right, animation, mediaQuery;
  let frames = [], loading = true, loadPromise = null, abortLoad = null;
  let lastExport = "\u0000", exportedMessage = false;
  let pageMeasure, pendingEdit = null, lastTransfer = null;

  const textSnapshot = () => left.value + "\u0000" + right.value;
  const hasText = () => Boolean(left.value || right.value);

  function selectPage(side) {
    stage.dataset.mobilePage = side;
    host.querySelectorAll('.journal-book-page-tabs button').forEach((tab) => {
      tab.setAttribute("aria-pressed", String(tab.dataset.journalAction === "page-" + side));
    });
  }

  function editSnapshot() {
    return { left: left.value, right: right.value, start: left.selectionStart, end: left.selectionEnd };
  }

  function continueOnRight(before) {
    if (!left.clientHeight || left.scrollHeight <= left.clientHeight + 1) return;
    const text = left.value;
    let low = 0, high = text.length;
    // Measure an invisible twin, never the live editor, so fitting a page does
    // not repeatedly replace the user's text, focus, or selection.
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      pageMeasure.value = text.slice(0, middle);
      if (pageMeasure.scrollHeight <= pageMeasure.clientHeight + 1) low = middle;
      else high = middle - 1;
    }
    let split = low;
    if (!split) return;
    if (root.Intl?.Segmenter) {
      for (const part of new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)) {
        if (part.index >= split) break;
        if (part.index + part.segment.length > split) { split = part.index; break; }
      }
    } else if (/[\uD800-\uDBFF]/.test(text.charAt(split - 1))) split--;
    // Keep a word together when possible, retaining all original whitespace.
    if (split && /\S/u.test(text.charAt(split - 1)) && /\S/u.test(text.charAt(split))) {
      const whitespace = Array.from(text.slice(0, split).matchAll(/\s+/gu)).at(-1);
      if (whitespace) split = whitespace.index + whitespace[0].length;
    }
    if (!split) return;
    const start = left.selectionStart, end = left.selectionEnd;
    const direction = left.selectionDirection;
    const moveCaret = document.activeElement === left && end > split;
    left.value = text.slice(0, split);
    right.value = text.slice(split) + right.value;
    left.setSelectionRange(Math.min(start, split), Math.min(end, split), direction);
    left.scrollTop = 0;
    if (moveCaret) {
      selectPage("right");
      right.focus({ preventScroll: true });
      right.setSelectionRange(Math.max(0, start - split), Math.max(0, end - split), direction);
    }
    lastTransfer = before ? { before, left: left.value, right: right.value } : null;
  }

  function imageBounds(image, index) {
    const boxes = [
      { x: 260, y: 45, width: 760, height: 760 },
      { x: 80, y: 25, width: 1120, height: 800 },
      { x: 0, y: 0, width: 1280, height: 850 }
    ];
    const box = boxes[index];
    const scale = Math.min(box.width / image.naturalWidth, box.height / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    return { x: box.x + (box.width - width) / 2, y: box.y + (box.height - height) / 2, width, height };
  }

  function draw(index) {
    const endpoint = index < FRAME_URLS.length / 2 ? 0 : LAST_FRAME_INDEX;
    const selected = frames[index] ? index : frames[endpoint] ? endpoint : frames[0] ? 0 : LAST_FRAME_INDEX;
    const image = frames[selected];
    stage.dataset.bookFrame = String(selected);
    if (!context) {
      staticImage.hidden = !image;
      if (image) {
        const bounds = imageBounds(image, selected);
        staticImage.src = image.src;
        Object.assign(staticImage.style, {
          inset: "auto", left: `${bounds.x / 1280 * 100}%`, top: `${bounds.y / 850 * 100}%`,
          width: `${bounds.width / 1280 * 100}%`, height: `${bounds.height / 850 * 100}%`
        });
      }
      return;
    }
    context.clearRect(0, 0, 1280, 850);
    motionImage.hidden = !image;
    if (!image) return;
    const bounds = imageBounds(image, selected);
    context.drawImage(image, bounds.x, bounds.y, bounds.width, bounds.height);
    if (motionImage.getAttribute("src") !== image.src) motionImage.src = image.src;
    Object.assign(motionImage.style, {
      left: `${bounds.x / 1280 * 100}%`, top: `${bounds.y / 850 * 100}%`,
      width: `${bounds.width / 1280 * 100}%`, height: `${bounds.height / 850 * 100}%`
    });
  }

  function statusKey(snapshot) {
    if (loading) return "loading";
    if (snapshot.animating) return snapshot.state;
    if (exportedMessage) return "downloadDone";
    if (!frames.some(Boolean)) return "unavailable";
    if (!snapshot.framesAvailable) return "fallback";
    if (snapshot.reducedMotion) return "reduced";
    return snapshot.state;
  }

  function renderStatus(snapshot) {
    const key = statusKey(snapshot);
    status.textContent = t(key);
    status.hidden = !["loading", "fallback", "unavailable", "downloadDone"].includes(key);
  }

  function update(snapshot = animation?.getSnapshot()) {
    if (!snapshot) return;
    stage.dataset.bookState = snapshot.state;
    stage.style.setProperty("--journal-motion-shift", snapshot.state === "closing" ? "-10px" : "10px");
    host.dataset.ready = String(!loading);
    host.dataset.animationMode = snapshot.framesAvailable ? "frames" : "static";
    host.setAttribute("aria-busy", String(loading));
    editor.hidden = snapshot.state !== "open";
    cover.hidden = snapshot.state !== "closed";
    cover.disabled = loading;
    toggle.disabled = loading;
    toggle.textContent = t(snapshot.target === 1 ? "closeAction" : "openAction");
    toggle.setAttribute("aria-expanded", String(snapshot.state === "open"));
    stop.hidden = !snapshot.animating;
    download.disabled = !hasText();
    retry.hidden = loading || snapshot.framesAvailable;
    renderStatus(snapshot);
  }

  function renderLanguage() {
    if (!mounted) return;
    host.querySelectorAll("[data-journal-copy]").forEach((node) => {
      node.textContent = t(node.dataset.journalCopy);
    });
    left.setAttribute("aria-label", t("leftPage"));
    right.setAttribute("aria-label", t("rightPage"));
    left.placeholder = t("leftPlaceholder");
    right.placeholder = t("rightPlaceholder");
    cover.setAttribute("aria-label", t("openAction"));
    canvas.setAttribute("aria-label", t("artwork"));
    staticImage.alt = t("artwork");
    document.getElementById("journalBookLegacyLabel").textContent = t("legacy");
    update();
  }

  function loadAssets() {
    if (loadPromise) return loadPromise;
    loading = true;
    update();
    abortLoad = new AbortController();
    const timeout = root.setTimeout(() => abortLoad.abort(), 15000);
    const options = { signal: abortLoad.signal };
    loadPromise = root.JournalBookAnimation.loadFrames(FRAME_URLS, options).then((sequence) => {
      frames = sequence.frames;
      loading = false;
      animation.setFramesAvailable(sequence.complete && Boolean(context));
      draw(animation.getSnapshot().frameIndex);
      update();
    }).catch(() => {
      loading = false;
      animation.setFramesAvailable(false);
      update();
    }).finally(() => { root.clearTimeout(timeout); loadPromise = null; });
    return loadPromise;
  }

  function exportText() {
    if (!hasText()) return;
    const text = [t("fileTitle"), "", t("leftPage"), left.value, "", t("rightPage"), right.value].join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "kreatorm-journal-prototype.txt";
    document.body.append(link);
    link.click();
    link.remove();
    root.setTimeout(() => URL.revokeObjectURL(url), 10000);
    lastExport = textSnapshot();
    exportedMessage = true;
    update();
  }

  function mount() {
    host = document.getElementById("journalBookPrototype");
    if (!host) return;
    // Static markup only. User text is kept in these textarea nodes for the
    // lifetime of the page; language changes and animation never replace them.
    host.innerHTML = `
      <div class="journal-book-stage" data-panel="journal-book-stage" data-book-state="closed" data-mobile-page="left">
        <canvas class="journal-book-canvas" width="1280" height="850" role="img"></canvas>
        <img class="journal-book-static" alt="" hidden />
        <img class="journal-book-motion" alt="" aria-hidden="true" hidden />
        <button class="journal-book-cover" type="button" data-journal-action="open" aria-controls="journalBookPages" disabled></button>
        <div id="journalBookPages" class="journal-book-editor" data-panel="journal-book-pages" hidden>
          <div class="journal-book-page-tabs" role="group">
            <button type="button" data-journal-action="page-left" data-journal-copy="leftPage" aria-pressed="true"></button>
            <button type="button" data-journal-action="page-right" data-journal-copy="rightPage" aria-pressed="false"></button>
          </div>
          <label class="journal-book-page" data-journal-page="left">
            <span class="journal-book-page-label" data-journal-copy="leftPage"></span>
            <textarea id="journalBookLeftPage" name="journalBookLeftPage" spellcheck="true"></textarea>
          </label>
          <label class="journal-book-page" data-journal-page="right">
            <span class="journal-book-page-label" data-journal-copy="rightPage"></span>
            <textarea id="journalBookRightPage" name="journalBookRightPage" spellcheck="true"></textarea>
          </label>
        </div>
      </div>
      <p class="journal-book-status" role="status" aria-live="polite"></p>
      <div class="journal-book-controls">
        <button type="button" data-journal-action="toggle" aria-controls="journalBookPages" disabled></button>
        <button type="button" data-journal-action="stop" data-journal-copy="stop" hidden></button>
        <button type="button" data-journal-action="download" data-journal-copy="download" disabled></button>
        <button type="button" data-journal-action="retry" data-journal-copy="retry" hidden></button>
      </div>`;
    stage = host.querySelector(".journal-book-stage");
    canvas = host.querySelector("canvas");
    context = canvas.getContext("2d");
    staticImage = host.querySelector(".journal-book-static");
    motionImage = host.querySelector(".journal-book-motion");
    editor = host.querySelector(".journal-book-editor");
    cover = host.querySelector(".journal-book-cover");
    status = host.querySelector(".journal-book-status");
    toggle = host.querySelector('[data-journal-action="toggle"]');
    stop = host.querySelector('[data-journal-action="stop"]');
    download = host.querySelector('[data-journal-action="download"]');
    retry = host.querySelector('[data-journal-action="retry"]');
    left = document.getElementById("journalBookLeftPage");
    right = document.getElementById("journalBookRightPage");
    pageMeasure = left.cloneNode(false);
    pageMeasure.removeAttribute("id");
    pageMeasure.removeAttribute("name");
    pageMeasure.removeAttribute("placeholder");
    pageMeasure.setAttribute("aria-hidden", "true");
    pageMeasure.tabIndex = -1;
    pageMeasure.disabled = true;
    Object.assign(pageMeasure.style, {
      position: "absolute", inset: "0", visibility: "hidden", pointerEvents: "none"
    });
    left.parentElement.append(pageMeasure);
    mediaQuery = root.matchMedia("(prefers-reduced-motion: reduce)");
    animation = new root.JournalBookAnimation({
      frameCount: FRAME_URLS.length,
      duration: 240,
      frameThresholds: [0.42, 0.58],
      framesAvailable: false,
      reducedMotion: mediaQuery.matches,
      onFrame: draw,
      onStateChange: update
    });
    mediaQuery.addEventListener("change", (event) => animation.setReducedMotion(event.matches));
    host.addEventListener("click", (event) => {
      if (root.MentorUIEvents.isTextEditingEvent(event)) return;
      const button = event.target.closest("button[data-journal-action]");
      if (!button || !host.contains(button) || button.disabled) return;
      const action = button.dataset.journalAction;
      if (action === "open" || action === "toggle") {
        exportedMessage = false;
        if (action === "open") animation.open();
        else animation.toggle();
      } else if (action === "stop") animation.cancel();
      else if (action === "download") exportText();
      else if (action === "retry") loadAssets();
      else if (action === "page-left" || action === "page-right") {
        selectPage(action === "page-left" ? "left" : "right");
      }
    });
    host.addEventListener("beforeinput", (event) => {
      if (event.target === left) pendingEdit = editSnapshot();
    });
    host.addEventListener("input", (event) => {
      if (event.target !== left && event.target !== right) return;
      lastTransfer = null;
      if (event.target === left && !event.isComposing) continueOnRight(pendingEdit);
      pendingEdit = null;
      exportedMessage = false;
      download.disabled = !hasText();
      renderStatus(animation.getSnapshot());
      // No parent rerender, animation, or storage write while typing.
    });
    host.addEventListener("compositionend", (event) => {
      if (event.target === left) continueOnRight(null);
    });
    host.addEventListener("keydown", (event) => {
      if ((event.target === left || event.target === right) && (event.ctrlKey || event.metaKey) &&
          !event.shiftKey && event.key.toLowerCase() === "z" && lastTransfer &&
          left.value === lastTransfer.left && right.value === lastTransfer.right) {
        event.preventDefault();
        const before = lastTransfer.before;
        lastTransfer = null;
        left.value = before.left;
        right.value = before.right;
        selectPage("left");
        left.focus({ preventScroll: true });
        left.setSelectionRange(before.start, before.end);
        download.disabled = !hasText();
        return;
      }
      if (root.MentorUIEvents.isTextEditingEvent(event)) return;
      if (event.key !== "Escape") return;
      const snapshot = animation.getSnapshot();
      if (snapshot.animating) animation.cancel();
      else if (snapshot.state === "open") animation.close();
    });
    root.addEventListener("beforeunload", (event) => {
      if (textSnapshot() === lastExport) return;
      event.preventDefault();
      event.returnValue = "";
    });
    mounted = true;
    renderLanguage();
    loadAssets();
  }

  root.MentorJournalBookPrototype = Object.freeze({
    activate() {
      if (!mounted) mount();
      else renderLanguage();
    },
    deactivate() {
      if (!mounted) return;
      const snapshot = animation.getSnapshot();
      if (snapshot.animating) animation.cancel({ snapTo: snapshot.target === 1 ? "open" : "closed" });
    },
    renderLanguage,
    getSnapshot() {
      return mounted ? { ...animation.getSnapshot(), loading, hasText: hasText() } : null;
    }
  });
})(window);
