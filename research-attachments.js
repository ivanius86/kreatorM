(function (root) {
  "use strict";
  const MAX_SOURCE = 25 * 1024 * 1024, MAX_MEDIA = 100 * 1024 * 1024;
  const sessions = new Set();
  const stop = (options = {}) => {
    Array.from(sessions).forEach((session) => {
      if (options.preserveMinimized && session.modal.classList.contains("is-minimized")) return;
      session.close();
    });
  };
  function attachmentMetadata(card, file, url) {
    return file || url ? { attachmentMediaId: "", attachmentName: "", attachmentKind: "", attachmentMime: "" } : { attachmentMediaId: card.attachmentMediaId || "", attachmentName: card.attachmentName || "", attachmentKind: card.attachmentKind || "", attachmentMime: card.attachmentMime || "" };
  }
  async function validate(file, type) {
    if (!(file instanceof Blob) || !file.size || file.size > (type === "source" ? MAX_SOURCE : MAX_MEDIA)) throw new Error("invalidFile");
    const bytes = new Uint8Array(await file.slice(0, 512).arrayBuffer());
    if (type === "av") {
      const mime = file.type.toLowerCase();
      if (!/^(audio|video)\/(webm|mp4|mpeg|ogg|wav|x-wav|quicktime|aac|3gpp|x-m4a)(;.*)?$/.test(mime)) throw new Error("invalidFile");
      const ascii = new TextDecoder("latin1").decode(bytes);
      const signature = mime.includes("webm") ? bytes[0] === 26 && bytes[1] === 69 && bytes[2] === 223 && bytes[3] === 163
        : mime.includes("ogg") ? ascii.startsWith("OggS")
        : mime.includes("wav") ? ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WAVE"
        : /mp4|quicktime|3gpp|m4a/.test(mime) ? ascii.slice(4, 8) === "ftyp" || ascii.slice(4, 8) === "moov"
        : ascii.startsWith("ID3") || bytes[0] === 255 && (bytes[1] & 224) === 224;
      if (!signature) throw new Error("invalidFile");
      return { kind: mime.startsWith("audio/") ? "audio" : "video", mime };
    }
    const name = String(file.name || "").toLowerCase();
    const header = new TextDecoder().decode(bytes);
    if (header.startsWith("%PDF-") && (!name || name.endsWith(".pdf"))) return { kind: "pdf", mime: "application/pdf" };
    if (bytes[0] === 80 && bytes[1] === 75 && (!name || name.endsWith(".docx"))) { await docxText(file); return { kind: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }; }
    if (name.endsWith(".txt") || !name && /^text\/plain/.test(file.type)) {
      if (bytes.includes(0)) throw new Error("invalidFile");
      return { kind: "txt", mime: "text/plain" };
    }
    throw new Error("invalidFile");
  }
  async function docxText(blob) {
    if (!root.fflate?.unzipSync) throw new Error("readerFailed");
    const limit = 8 * 1024 * 1024;
    const files = root.fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()), { filter: (entry) => {
      if (entry.name !== "word/document.xml") return false;
      if (entry.originalSize > limit) throw new Error("invalidFile");
      return true;
    } });
    const xml = files["word/document.xml"];
    if (!xml || xml.length > limit) throw new Error("invalidFile");
    const source = new TextDecoder("utf-8", { fatal: true }).decode(xml);
    if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error("invalidFile");
    const document = new DOMParser().parseFromString(source, "application/xml");
    if (document.getElementsByTagName("parsererror").length) throw new Error("invalidFile");
    return Array.from(document.getElementsByTagNameNS("*", "p"), (p) => Array.from(p.getElementsByTagNameNS("*", "t"), (t) => t.textContent).join("")).join("\n\n");
  }
  function dialog(view, title, t, escape, trigger, persistent = false) {
    stop({ preserveMinimized: true });
    document.body.insertAdjacentHTML("beforeend", '<div class="research-direction-modal research-attachment-modal" data-research-attachment-modal role="dialog" aria-modal="true" aria-label="' + escape(title) + '"><div class="research-attachment-reader"><div class="research-direction-modal-head"><strong>' + escape(title) + '</strong><button type="button" class="research-direction-modal-close" data-attachment-close aria-label="' + escape(t("actions.close")) + '">×</button></div><div data-attachment-body></div></div></div>');
    const modal = Array.from(document.body.querySelectorAll("[data-research-attachment-modal]")).at(-1);
    const cleanup = [];
    const session = { alive: true, close() { if (!this.alive) return; this.alive = false; sessions.delete(this); modal._researchMediaPanelCleanup?.(); cleanup.forEach((fn) => fn()); modal.remove(); document.removeEventListener("keydown", key); if (trigger?.isConnected) trigger.focus(); root.MentorResearch?.syncModalLayer?.(); }, modal, cleanup };
    const key = (event) => { if (event.key === "Escape" && !modal.classList.contains("is-minimized")) session.close(); };
    sessions.add(session);
    const observer = new MutationObserver(() => { if ((!modal.isConnected || (!persistent && !view.isConnected)) && session.alive) session.close(); });
    observer.observe(document.body, { childList: true, subtree: true }); cleanup.push(() => observer.disconnect());
    modal.addEventListener("pointerdown", (event) => event.stopPropagation());
    modal.addEventListener("click", (event) => { event.stopPropagation(); if ((!modal.classList.contains("is-minimized") && event.target === modal) || event.target.closest("[data-attachment-close]")) session.close(); });
    document.addEventListener("keydown", key);
    modal.querySelector("button").focus();
    root.MentorResearch?.setModalLayer?.(true);
    return session;
  }
  async function sourceBlob(card, signal) {
    if (card.attachmentMediaId) {
      const record = await root.MentorData?.repositories?.media?.getEntity("research-" + card.type, card.attachmentMediaId);
      if (!record?.blob) throw new Error("readerFailed");
      return record.blob;
    }
    const url = new URL(card.url);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("linkFailed");
    const response = await fetch(url.href, { signal, credentials: "omit" });
    if (!response.ok || Number(response.headers.get("content-length")) > MAX_SOURCE) throw new Error("linkFailed");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("linkFailed");
    const chunks = []; let size = 0;
    try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > MAX_SOURCE) throw new Error("invalidFile"); chunks.push(value); } }
    finally { await reader.cancel().catch(() => {}); }
    const contentType = response.headers.get("content-type") || "";
    const originalName = decodeURIComponent(url.pathname.split("/").pop()) || "";
    const name = /\.(pdf|docx|txt)$/i.test(originalName) ? originalName : contentType.includes("pdf") ? "source.pdf" : contentType.includes("wordprocessingml") ? "source.docx" : contentType.startsWith("text/plain") ? "source.txt" : "";
    return new File(chunks, name, { type: contentType });
  }
  async function open(view, card, trigger, t, escape) {
    const session = dialog(view, card.title || t("canvas.types." + card.type), t, escape, trigger, card.type === "av");
    if (card.type === "av") {
      session.modal.classList.add("is-media-player");
      root.MentorResearch?.bindMediaMinimize?.(session.modal, session.modal.querySelector(".research-direction-modal-head"));
    }
    const body = session.modal.querySelector("[data-attachment-body]");
    const footer = document.createElement("div"); footer.className = "research-attachment-links"; body.after(footer);
    if (/^https?:\/\//i.test(card.url || "")) {
      const link = document.createElement("a"); link.href = card.url; link.target = "_blank"; link.rel = "noopener noreferrer"; link.textContent = t("canvas.openOriginal"); footer.append(link);
    }
    if (card.type === "note") { body.innerHTML = '<pre class="research-attachment-text">' + escape(card.text || card.note?.body || "") + '</pre>'; return; }
    body.textContent = t("attachments.loading");
    const controller = new AbortController(); session.cleanup.push(() => controller.abort());
    try {
      const blob = await sourceBlob(card, controller.signal);
      if (!session.alive) return;
      const downloadUrl = URL.createObjectURL(blob); session.cleanup.push(() => URL.revokeObjectURL(downloadUrl));
      const download = document.createElement("a"); download.href = downloadUrl; download.download = card.attachmentMediaId ? card.attachmentName || "note" : blob.name || "note"; download.textContent = t("attachments.download"); footer.append(download);
      if (card.type === "av") {
        const url = URL.createObjectURL(blob); session.cleanup.push(() => URL.revokeObjectURL(url));
        const media = document.createElement(card.attachmentKind === "audio" ? "audio" : "video"); media.controls = true; media.playsInline = true; media.src = url;
        media.addEventListener("error", () => { body.append(document.createTextNode(t("attachments.readerFailed"))); });
        session.cleanup.push(() => { media.pause(); media.removeAttribute("src"); media.load(); }); body.replaceChildren(media); return;
      }
      const info = await validate(blob.name ? blob : new File([blob], card.attachmentName || "", { type: card.attachmentMime || blob.type }), "source");
      if (!session.alive) return;
      if (info.kind === "pdf") { await pdfReader(body, blob, session, t); return; }
      const text = info.kind === "docx" ? await docxText(blob) : await blob.text();
      if (!session.alive) return;
      const pre = document.createElement("pre"); pre.className = "research-attachment-text"; pre.textContent = text; body.replaceChildren(pre);
    } catch (error) { if (session.alive) body.textContent = t(card.url ? "attachments.linkFailed" : "attachments.readerFailed"); }
  }
  async function pdfReader(body, blob, session, t) {
    const pdfjs = await import("./js/vendor/pdfjs/pdf.mjs");
    if (!session.alive) return;
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("./js/vendor/pdfjs/pdf.worker.mjs", document.baseURI).href;
    const task = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false, stopAtErrors: true });
    session.cleanup.push(() => { task.destroy().catch(() => {}); });
    const pdf = await task.promise;
    if (!session.alive) return;
    body.innerHTML = '<div class="research-pdf-controls"><button type="button" data-pdf-prev>‹</button><span data-pdf-page></span><button type="button" data-pdf-next>›</button><button type="button" data-pdf-minus>−</button><button type="button" data-pdf-plus>+</button></div><div class="research-pdf-page"><canvas></canvas><pre class="research-pdf-text"></pre></div>';
    const canvas = body.querySelector("canvas"), text = body.querySelector("pre"); let pageNumber = 1, zoom = 1, renderTask = null, request = 0;
    session.cleanup.push(() => { request++; renderTask?.cancel(); });
    for (const [selector, key] of [["prev", "previous"], ["next", "next"], ["minus", "zoomOut"], ["plus", "zoomIn"]]) body.querySelector("[data-pdf-" + selector + "]").setAttribute("aria-label", t("attachments." + key));
    async function render() {
      const id = ++request; renderTask?.cancel();
      const page = await pdf.getPage(pageNumber); if (!session.alive || id !== request) return;
      const base = page.getViewport({ scale: 1 }); const scale = Math.min(1.6, Math.max(.3, (body.clientWidth - 32) / base.width)) * zoom;
      const viewport = page.getViewport({ scale }); canvas.width = viewport.width; canvas.height = viewport.height;
      body.querySelector("[data-pdf-page]").textContent = pageNumber + " / " + pdf.numPages;
      body.querySelector("[data-pdf-prev]").disabled = pageNumber === 1; body.querySelector("[data-pdf-next]").disabled = pageNumber === pdf.numPages;
      renderTask = page.render({ canvasContext: canvas.getContext("2d"), viewport });
      try { await renderTask.promise; const content = await page.getTextContent(); if (session.alive && id === request) text.textContent = content.items.map((item) => item.str + (item.hasEOL ? "\n" : " ")).join(""); } catch (error) { if (error.name !== "RenderingCancelledException") throw error; }
    }
    const change = (fn) => { fn(); render().catch(() => { if (session.alive) text.textContent = t("attachments.readerFailed"); }); };
    body.querySelector("[data-pdf-prev]").onclick = () => change(() => { pageNumber = Math.max(1, pageNumber - 1); });
    body.querySelector("[data-pdf-next]").onclick = () => change(() => { pageNumber = Math.min(pdf.numPages, pageNumber + 1); });
    body.querySelector("[data-pdf-minus]").onclick = () => change(() => { zoom = Math.max(.5, zoom - .25); });
    body.querySelector("[data-pdf-plus]").onclick = () => change(() => { zoom = Math.min(3, zoom + .25); });
    await render();
  }
  function form(view, card, actions, t, escape) {
    const type = card.type, session = dialog(view, t("canvas.types." + type), t, escape);
    root.MentorResearch?.bindDraggableForm?.(session.modal);
    const body = session.modal.querySelector("[data-attachment-body]");
    body.innerHTML = '<form class="research-canvas-form" data-attachment-form><label><span>' + escape(t("canvas.title")) + '</span><input name="title" required value="' + escape(card.title || "") + '" /></label><label><span>' + escape(t("canvas.description")) + '</span><textarea name="text">' + escape(card.text || "") + '</textarea></label>' + (type === "source" ? '<label><span>' + escape(t("attachments.sourceUrl")) + '</span><input name="url" type="url" value="' + escape(card.url || "") + '" /></label><label><span>' + escape(t("attachments.sourceFile")) + '</span><input name="file" type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" /></label>' : '<label><span>' + escape(t("attachments.mode")) + '</span><select name="mode"><option value="audio">' + escape(t("attachments.audio")) + '</option><option value="video"' + (card.attachmentKind === "video" ? ' selected' : '') + '>' + escape(t("attachments.video")) + '</option></select></label><div class="research-record-controls"><button type="button" data-record-start>' + escape(t("attachments.record")) + '</button><button type="button" data-record-stop disabled>' + escape(t("attachments.stop")) + '</button></div><div data-record-preview></div><label><span>' + escape(t("attachments.mediaFile")) + '</span><input name="file" type="file" accept="audio/*,video/*" /></label><label><span>' + escape(t("attachments.captureFile")) + '</span><input name="capture" type="file" accept="audio/*" capture="user" /></label>') + '<small>' + escape(t(type === "source" ? "attachments.sourceHint" : "attachments.mediaHint")) + '</small>' + (card.attachmentName ? '<small>' + escape(card.attachmentName) + '</small>' : '') + '<p role="status" data-attachment-status></p><p class="research-canvas-form-error" data-attachment-error hidden></p><div class="research-reference-form-actions"><button type="button" class="research-secondary-btn muted" data-attachment-close>' + escape(t("actions.cancel")) + '</button><button type="submit" class="research-primary-btn">' + escape(t("actions.save")) + '</button></div></form>';
    const form = body.querySelector("form"), error = form.querySelector("[data-attachment-error]"), status = form.querySelector("[data-attachment-status]");
    let stream = null, recorder = null, recorded = null, previewUrl = "", generation = 0, timer = null, saving = false;
    const clearPreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = ""; const preview = form.querySelector("[data-record-preview]"); preview?.querySelector("video, audio")?.pause(); preview?.replaceChildren(); };
    const stopTracks = () => { stream?.getTracks().forEach((track) => track.stop()); stream = null; };
    const release = () => { generation++; window.clearTimeout(timer); if (recorder?.state !== "inactive") recorder?.stop(); stopTracks(); clearPreview(); };
    session.cleanup.push(release);
    const showError = (key) => { if (!session.alive) return; error.textContent = t("attachments." + key); error.hidden = false; };
    const submit = form.querySelector('[type="submit"]');
    const start = form.querySelector("[data-record-start]"), stopButton = form.querySelector("[data-record-stop]");
    const resetButtons = () => { if (start) start.disabled = false; if (stopButton) stopButton.disabled = true; submit.disabled = false; if (form.elements.mode) form.elements.mode.disabled = false; };
    if (type === "av") {
      const preview = form.querySelector("[data-record-preview]");
      const clearRecording = () => { release(); recorded = null; recorder = null; status.textContent = ""; resetButtons(); };
      form.elements.mode.addEventListener("change", () => { clearRecording(); form.elements.capture.accept = form.elements.mode.value === "video" ? "video/*" : "audio/*"; });
      form.elements.capture.accept = form.elements.mode.value === "video" ? "video/*" : "audio/*";
      for (const input of [form.elements.file, form.elements.capture]) input.addEventListener("change", () => { if (input.files.length) { clearRecording(); (input === form.elements.file ? form.elements.capture : form.elements.file).value = ""; } });
      start.addEventListener("click", async () => {
        if (saving) return;
        clearRecording(); error.hidden = true; const id = generation;
        if (!root.isSecureContext || !navigator.mediaDevices?.getUserMedia || !root.MediaRecorder) { showError("recordUnavailable"); return; }
        start.disabled = true; submit.disabled = true; form.elements.mode.disabled = true; status.textContent = t("attachments.permission");
        try {
          const video = form.elements.mode.value === "video";
          const acquired = await navigator.mediaDevices.getUserMedia({ audio: true, video: video ? { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } : false });
          if (!session.alive || id !== generation) { acquired.getTracks().forEach((track) => track.stop()); return; }
          stream = acquired;
          const options = video ? ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"] : ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"];
          const mimeType = options.find((mime) => MediaRecorder.isTypeSupported(mime));
          recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
          const currentRecorder = recorder, currentStream = stream;
          const stopCurrentTracks = () => { currentStream.getTracks().forEach((track) => track.stop()); if (stream === currentStream) stream = null; };
          const chunks = []; let size = 0, oversized = false;
          if (video) { const player = document.createElement("video"); player.muted = true; player.autoplay = true; player.playsInline = true; player.srcObject = stream; preview.replaceChildren(player); player.play().catch(() => {}); }
          recorder.ondataavailable = (event) => { size += event.data.size; if (size > MAX_MEDIA) { oversized = true; if (currentRecorder.state !== "inactive") currentRecorder.stop(); } else if (event.data.size) chunks.push(event.data); };
          recorder.onerror = () => { stopCurrentTracks(); if (!session.alive || id !== generation) return; generation++; recorded = null; window.clearTimeout(timer); clearPreview(); resetButtons(); if (currentRecorder.state !== "inactive") currentRecorder.stop(); showError("recordFailed"); };
          recorder.onstop = () => {
            stopCurrentTracks(); if (!session.alive || id !== generation) return;
            window.clearTimeout(timer);
            clearPreview(); resetButtons();
            if (oversized || !chunks.length) { showError("invalidFile"); return; }
            const mime = currentRecorder.mimeType || chunks[0].type;
            const extension = mime.includes("mp4") ? "mp4" : mime.includes("ogg") ? "ogg" : "webm";
            recorded = new File(chunks, "note-" + Date.now() + "." + extension, { type: mime });
            previewUrl = URL.createObjectURL(recorded); const player = document.createElement(video ? "video" : "audio"); player.controls = true; player.playsInline = true; player.src = previewUrl; preview.replaceChildren(player);
            form.elements.file.value = ""; form.elements.capture.value = ""; status.textContent = t("attachments.recorded"); start.textContent = t("attachments.rerecord");
          };
          recorder.start(1000); stopButton.disabled = false; status.textContent = t("attachments.recording"); timer = window.setTimeout(() => { if (recorder?.state === "recording") recorder.stop(); }, 10 * 60 * 1000);
        } catch (_) { stopTracks(); if (session.alive && id === generation) { resetButtons(); showError("recordFailed"); } }
      });
      stopButton.addEventListener("click", () => { stopButton.disabled = true; if (recorder?.state === "recording") recorder.stop(); });
    }
    form.addEventListener("submit", async (event) => {
      event.preventDefault(); error.hidden = true;
      if (saving || recorder?.state === "recording" || !session.alive) return;
      const file = form.elements.file.files[0] || form.elements.capture?.files[0] || recorded;
      const url = form.elements.url?.value.trim() || "";
      if (!file && !(type === "source" && url) && !card.attachmentMediaId) { showError("sourceRequired"); return; }
      if (url && !/^https?:\/\//i.test(url)) { showError("linkFailed"); return; }
      saving = true; submit.disabled = true; if (start) start.disabled = true;
      form.querySelectorAll("input, textarea, select").forEach((input) => { input.disabled = true; });
      try {
        if (file) await validate(file, type);
        if (!session.alive) return;
        const next = { ...card, ...attachmentMetadata(card, file, url), id: card.source === "item" ? card.id : undefined, type, title: form.elements.title.value.trim(), text: form.elements.text.value.trim(), canvasParentKey: card.canvasParentKey || card.parentKey || "", url: file ? "" : url };
        delete next.key; delete next.source;
        const saved = file ? await actions.saveCanvasAttachment?.(next, file) : await actions.saveCanvasItem?.(next);
        if (saved === true) session.close(); else showError("saveFailed");
      } catch (error) { showError(error.message === "invalidFile" ? "invalidFile" : "saveFailed"); }
      finally { saving = false; if (session.alive) { resetButtons(); form.querySelectorAll("input, textarea, select").forEach((input) => { input.disabled = false; }); } }
    });
    form.elements.title.focus();
    return session;
  }
  root.addEventListener("pagehide", stop);
  // Capture uses the existing recorder and its permission/track/URL lifecycle. The
  // caller receives a draft File; durable storage remains owned by its final Save.
  function capture(view, mode, onCapture, t, escape) {
    return form(view, { type: "av", title: t("canvas.types.av"), attachmentKind: mode }, {
      async saveCanvasAttachment(_card, file) { await onCapture(file); return true; }
    }, t, escape);
  }
  root.MentorResearchAttachments = { validate, docxText, attachmentMetadata, open, form, capture, close: stop };
})(window);
