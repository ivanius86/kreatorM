(function (root) {
  "use strict";

  function httpUrl(value, base = "") {
    try {
      const raw = String(value || "").trim();
      if (!raw) return "";
      const url = new URL(raw, base || undefined);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
    } catch (_) { return ""; }
  }

  function cleanTitle(value) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, 200);
  }

  function firstUri(value) {
    return String(value || "").split(/\r?\n/).map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#")).map((line) => httpUrl(line)).find(Boolean) || "";
  }

  function plainHttpUrl(value) {
    const line = String(value || "").split(/\r?\n/)[0].trim();
    return /^https?:\/\/\S+$/i.test(line) ? httpUrl(line) : "";
  }

  function parseTransfer(transfer) {
    if (!transfer) return null;
    const html = String(transfer.getData("text/html") || "").slice(0, 100000);
    const mozLines = String(transfer.getData("text/x-moz-url") || "").split(/\r?\n/);
    const uri = firstUri(transfer.getData("text/uri-list")) || plainHttpUrl(mozLines[0]);
    const plainRaw = transfer.getData("text/plain") || "";
    const plainLines = String(plainRaw).split(/\r?\n/);
    const plainUrl = plainHttpUrl(plainLines[0]);
    const plain = cleanTitle(plainUrl ? plainLines.slice(1).join(" ") : plainRaw);
    const document = html ? new DOMParser().parseFromString(html, "text/html") : null;
    const image = document?.querySelector("img");
    const anchor = image?.closest("a[href]") || document?.querySelector("a[href]");
    const anchorUrl = httpUrl(anchor?.getAttribute("href"), plainUrl || uri);
    const imageCandidate = uri || plainUrl;
    const likelyImage = /\.(?:png|jpe?g|webp|gif|avif|bmp|svg)(?:[?#]|$)/i.test(imageCandidate);
    const imageUrl = httpUrl(image?.getAttribute("src"), anchorUrl || plainUrl || uri) ||
      (image && likelyImage ? imageCandidate : "");
    const file = Array.from(transfer.files || []).find((item) => item.type?.startsWith("image/") || (!item.type && /\.(?:png|jpe?g|webp|gif|avif|bmp)$/i.test(item.name || ""))) || null;
    const sourceUrl = anchorUrl || (plainUrl && plainUrl !== imageUrl ? plainUrl : "") || (uri && uri !== imageUrl ? uri : "") || imageUrl;
    const hint = cleanTitle(document?.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
      document?.querySelector("title")?.textContent || anchor?.getAttribute("title") || anchor?.textContent ||
      image?.getAttribute("title") || image?.getAttribute("alt") || mozLines[1] || plain);
    if (imageUrl || file) return { kind: "image", imageUrl, sourceUrl, pageUrl: sourceUrl !== imageUrl ? sourceUrl : "", titleHint: hint, file };
    const linkUrl = uri || anchorUrl || plainUrl;
    if (linkUrl) return { kind: "link", sourceUrl: linkUrl, pageUrl: linkUrl, titleHint: hint };
    const otherFile = Array.from(transfer.files || [])[0];
    if (otherFile) return { kind: "file", file: otherFile, titleHint: cleanTitle(otherFile.name), pageUrl: "", sourceUrl: "" };
    const text = String(plainRaw).trim().slice(0, 100000);
    return text && !/^[a-z][a-z0-9+.-]*:/i.test(text) ? { kind: "text", text, titleHint: cleanTitle(text).slice(0, 80), pageUrl: "", sourceUrl: "" } : null;
  }

  function titleFromUrl(value) {
    try {
      const url = new URL(value);
      const segment = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "")
        .replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[-_]+/g, " ");
      return cleanTitle(url.hostname + (segment ? " · " + segment : ""));
    } catch (_) { return ""; }
  }

  function titleFromImageUrl(imageUrl) {
    try {
      const url = new URL(imageUrl);
      const name = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "")
        .replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[-_]+/g, " ");
      return cleanTitle(name) || url.hostname;
    } catch (_) { return ""; }
  }

  async function fetchPageTitle(pageUrl) {
    if (!pageUrl || typeof fetch !== "function") return "";
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), 2500) : null;
    try {
      const response = await fetch(pageUrl, { mode: "cors", credentials: "omit", referrerPolicy: "no-referrer", signal: controller?.signal });
      if (!response.ok || !/^text\/html\b/i.test(response.headers.get("content-type") || "")) return "";
      const length = Number(response.headers.get("content-length") || 0);
      if (length > 500000) return "";
      let html = "";
      const reader = response.body?.getReader?.();
      if (reader) {
        const decoder = new TextDecoder();
        while (html.length < 150000) {
          const chunk = await reader.read();
          if (chunk.done) break;
          html += decoder.decode(chunk.value, { stream: true });
        }
        html += decoder.decode();
        reader.cancel().catch(() => {});
      } else html = (await response.text()).slice(0, 150000);
      const document = new DOMParser().parseFromString(html, "text/html");
      return cleanTitle(document.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
        document.querySelector('meta[name="twitter:title"]')?.getAttribute("content") ||
        document.querySelector("title")?.textContent);
    } catch (_) { return ""; }
    finally { if (timeout) clearTimeout(timeout); }
  }

  function bind(host, options) {
    host._researchExternalDropOptions = options;
    if (host._researchExternalDropBound) return;
    host._researchExternalDropBound = true;
    const viewportFor = (event) => {
      if (root.MentorUIEvents?.isTextEditingEvent?.(event)) return null;
      const viewport = event.target.closest?.("[data-research-canvas-viewport]");
      return viewport && host.contains(viewport) ? viewport : null;
    };
    host.addEventListener("dragover", (event) => {
      const viewport = viewportFor(event);
      if (!viewport || !Array.from(event.dataTransfer?.types || []).some((type) => ["text/html", "text/uri-list", "text/x-moz-url", "text/plain", "Files"].includes(type))) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      viewport.classList.add("is-external-image-over");
    });
    host.addEventListener("dragleave", (event) => {
      const viewport = viewportFor(event);
      if (viewport && !viewport.contains(event.relatedTarget)) viewport.classList.remove("is-external-image-over");
    });
    host.addEventListener("drop", (event) => {
      const viewport = viewportFor(event);
      if (!viewport) return;
      viewport.classList.remove("is-external-image-over");
      if (!Array.from(event.dataTransfer?.types || []).some((type) => ["text/html", "text/uri-list", "text/x-moz-url", "text/plain", "Files"].includes(type))) return;
      event.preventDefault();
      const item = parseTransfer(event.dataTransfer);
      if (!item) return;
      event.stopPropagation();
      host._researchExternalDropOptions?.onDrop(item, event, viewport);
    });
    host.addEventListener("paste", (event) => {
      const viewport = viewportFor(event);
      if (!viewport || !event.clipboardData) return;
      const item = parseTransfer(event.clipboardData);
      if (!item) return;
      event.preventDefault(); event.stopPropagation();
      const rect = viewport.getBoundingClientRect();
      host._researchExternalDropOptions?.onDrop(item, { target: event.target, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }, viewport);
    });
  }

  root.MentorResearchExternalDrop = { bind, parseTransfer, fetchPageTitle, titleFromImageUrl, titleFromUrl };
})(window);
