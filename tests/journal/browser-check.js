"use strict";

// Isolated, disposable browser profile. Never opens a user's existing profile.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { spawn } = require("node:child_process");
const { createServer } = require("../../server.js");
const ROOT = path.resolve(__dirname, "../..");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const server = createServer({ apiKey: undefined, fetchImpl: async () => { throw new Error("Prototype must not call a provider."); } });
let browser, socket, profile;
const requests = [], errors = [];

async function main() {
  const browserPath = process.env.MENTOR_BROWSER || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  await fs.access(browserPath);
  profile = await fs.mkdtemp(path.join(os.tmpdir(), "journal-prototype-browser-"));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = "http://127.0.0.1:" + server.address().port;
  browser = spawn(browserPath, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", "--user-data-dir=" + profile, "about:blank"], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
  let launchError;
  browser.on("error", (error) => { launchError = error; });
  let port;
  for (let index = 0; index < 150; index++) {
    if (launchError) throw launchError;
    try { port = (await fs.readFile(path.join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]; break; }
    catch (_) { await sleep(100); }
  }
  assert.ok(port, "Chrome debugging port available");
  const pages = await (await fetch("http://127.0.0.1:" + port + "/json/list")).json();
  socket = new WebSocket(pages.find((page) => page.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const value = JSON.parse(event.data);
    if (value.method === "Runtime.exceptionThrown") errors.push(value.params.exceptionDetails.text);
    if (value.method === "Network.requestWillBeSent") requests.push(value.params.request);
    if (!value.id) return;
    const waiter = pending.get(value.id);
    if (!waiter) return;
    pending.delete(value.id);
    clearTimeout(waiter.timeout);
    if (value.error) waiter.reject(new Error(JSON.stringify(value.error)));
    else waiter.resolve(value.result);
  });
  const cdp = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error("CDP timeout: " + method)); }, 20000);
    pending.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id, method, params }));
  });
  async function evaluate(expression) {
    const value = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (value.exceptionDetails) throw new Error(JSON.stringify(value.exceptionDetails));
    return value.result.value;
  }
  async function wait(expression) {
    for (let index = 0; index < 400; index++) {
      if (await evaluate(expression)) return;
      await sleep(50);
    }
    throw new Error("Timed out: " + expression);
  }
  const click = (selector) => evaluate("document.querySelector(" + JSON.stringify(selector) + ").click()");
  const action = (name) => click('[data-journal-action="' + name + '"]');
  const state = () => evaluate("MentorJournalBookPrototype.getSnapshot()");
  const ready = () => wait("window.MentorJournalBookPrototype?.getSnapshot()?.loading === false");
  const artifactPath = path.join(ROOT, ".tools");
  const downloadPath = path.join(artifactPath, "journal-downloads");
  await fs.mkdir(downloadPath, { recursive: true });
  const screenshot = async (name) => {
    const value = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await fs.writeFile(path.join(artifactPath, name), Buffer.from(value.data, "base64"));
  };
  await cdp("Runtime.enable");
  await cdp("Page.enable");
  await cdp("Network.enable");
  await cdp("Browser.setDownloadBehavior", { behavior: "allow", downloadPath });
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await cdp("Page.navigate", { url: origin });
  await wait("Boolean(window.MentorAppReadyPromise)");
  await evaluate("MentorAppReadyPromise");
  await evaluate("MentorI18n.setLanguage('sr')");
  const durableSnapshot = "(async () => JSON.stringify(Object.fromEntries(await Promise.all(MentorData.database.tables.filter(t => !['meta','settings'].includes(t.name)).map(async t => [t.name,await t.toArray()])))))()";
  const beforeData = await evaluate(durableSnapshot);
  await evaluate("setView('journal')");
  await ready();
  assert.equal((await state()).framesAvailable, true);
  assert.equal((await state()).state, "closed");
  const closedWidth = await evaluate("document.querySelector('.journal-book-stage').getBoundingClientRect().width");
  await screenshot("journal-prototype-closed.png");

  await action("open");
  assert.equal((await state()).state, "opening");
  assert.equal(await evaluate("document.getElementById('journalBookPages').hidden"), true);
  await wait("MentorJournalBookPrototype.getSnapshot().state === 'open'");
  await sleep(220);
  assert.ok(await evaluate("document.querySelector('.journal-book-stage').getBoundingClientRect().width") > closedWidth, "open book enlarges");
  assert.equal((await state()).frameIndex, 2);
  assert.equal(await evaluate("document.getElementById('journalBookPages').hidden"), false);
  assert.equal(await evaluate("document.getElementById('journalBookLeftPage').placeholder"), "Počni ovde");
  assert.equal(await evaluate("document.getElementById('journalBookRightPage').placeholder"), "");
  await screenshot("journal-prototype-open.png");

  await evaluate("window.prototypeField=document.getElementById('journalBookLeftPage'); prototypeField.focus(); prototypeField.value='Danas pišem. Čuvam ž, š, ć i <img src=x onerror=alert(1)>.'; prototypeField.dispatchEvent(new Event('input',{bubbles:true})); document.getElementById('journalBookRightPage').value='Druga stranica.\\nNovi red.'; document.getElementById('journalBookRightPage').dispatchEvent(new Event('input',{bubbles:true})); prototypeField.setSelectionRange(5,5); prototypeField.click()");
  assert.equal((await state()).state, "open");
  assert.equal(await evaluate("document.activeElement === prototypeField && prototypeField.selectionStart === 5"), true);
  await evaluate("MentorI18n.setLanguage('en')");
  assert.equal(await evaluate("prototypeField === document.getElementById('journalBookLeftPage') && prototypeField.value.startsWith('Danas pišem.') && document.activeElement === prototypeField && prototypeField.selectionStart === 5"), true);
  assert.equal(await evaluate("document.querySelector('[data-journal-action=toggle]').textContent"), "Close book");
  await click('[data-panel="journal-book-stage"]');
  assert.equal((await state()).state, "open");

  await evaluate(`(() => {
    const l = document.getElementById('journalBookLeftPage');
    const r = document.getElementById('journalBookRightPage');
    window.pageFlowOriginal = { left: l.value, right: r.value };
    window.pageFlowText = Array.from({length:18}, (_, i) => 'Red ' + (i+1) + ': Čćžšđ 😀').join(String.fromCharCode(10));
    l.focus();
    l.dispatchEvent(new InputEvent('beforeinput', {bubbles:true,inputType:'insertFromPaste'}));
    l.value = pageFlowText;
    l.setSelectionRange(l.value.length,l.value.length);
    l.dispatchEvent(new InputEvent('input', {bubbles:true,inputType:'insertFromPaste'}));
  })()`);
  assert.equal(await evaluate("document.activeElement === document.getElementById('journalBookRightPage')"), true, "full left page moves the caret right");
  assert.equal(await evaluate("prototypeField.value + document.getElementById('journalBookRightPage').value === pageFlowText + pageFlowOriginal.right"), true, "page flow preserves pasted text and existing right-page content");
  assert.equal(await evaluate("prototypeField.scrollHeight <= prototypeField.clientHeight + 1 && prototypeField.scrollTop === 0"), true, "left page fits without internal scrolling");
  assert.equal(await evaluate("getComputedStyle(prototypeField).overflowY"), "hidden");
  assert.equal(await evaluate("getComputedStyle(prototypeField).outlineStyle"), "none");
  await evaluate("document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true,cancelable:true}))");
  assert.equal(await evaluate("prototypeField.value === pageFlowOriginal.left && document.getElementById('journalBookRightPage').value === pageFlowOriginal.right && document.activeElement === prototypeField"), true, "undo restores both pages together");
  await evaluate(`(() => {
    prototypeField.value = pageFlowText;
    prototypeField.setSelectionRange(prototypeField.value.length,prototypeField.value.length);
    prototypeField.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true}));
  })()`);
  assert.equal(await evaluate("document.activeElement === prototypeField && prototypeField.value === pageFlowText"), true, "IME composition is not interrupted");
  await evaluate("prototypeField.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}))");
  assert.equal(await evaluate("prototypeField.value + document.getElementById('journalBookRightPage').value === pageFlowText + pageFlowOriginal.right"), true);
  await evaluate("prototypeField.value=pageFlowOriginal.left;document.getElementById('journalBookRightPage').value=pageFlowOriginal.right;prototypeField.dispatchEvent(new Event('input',{bubbles:true}));prototypeField.focus()");

  await action("toggle");
  await sleep(150);
  const progress = (await state()).progress;
  assert.ok(progress > 0 && progress < 1);
  await action("toggle");
  assert.equal((await state()).state, "opening");
  await wait("MentorJournalBookPrototype.getSnapshot().state === 'open'");
  for (let index = 0; index < 8; index++) await action("toggle");
  await wait("MentorJournalBookPrototype.getSnapshot().state === 'open'");
  await action("toggle");
  await action("stop");
  assert.equal((await state()).animating, false);
  await evaluate("setView('dashboard'); setView('journal')");
  assert.equal(await evaluate("prototypeField === document.getElementById('journalBookLeftPage') && prototypeField.value.startsWith('Danas pišem.')"), true);

  await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await sleep(80);
  if ((await state()).state === "open") await action("toggle");
  await action("toggle");
  assert.equal((await state()).state, "open");
  assert.equal((await state()).animating, false);

  for (const [width, height] of [[1280,720],[1920,1080],[3840,2160],[390,844]]) {
    await cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    await sleep(80);
    assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), true, "no horizontal overflow at " + width);
    assert.equal(await evaluate("(() => {const r=document.querySelector('.journal-book-stage').getBoundingClientRect();return Math.abs(r.width/r.height-1280/850)<.01})()"), true);
  }
  await action("page-right");
  assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-journal-page=left]')).display"), "none");
  assert.equal(await evaluate("document.getElementById('journalBookRightPage').value"), "Druga stranica.\nNovi red.");
  await evaluate("document.getElementById('journalBookPrototype').scrollIntoView()");
  await screenshot("journal-prototype-mobile.png");
  await action("page-left");
  assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-journal-page=right]')).display"), "none");
  await evaluate("prototypeField.focus();prototypeField.value=pageFlowText;prototypeField.setSelectionRange(prototypeField.value.length,prototypeField.value.length);prototypeField.dispatchEvent(new Event('input',{bubbles:true}))");
  assert.equal(await evaluate("document.querySelector('.journal-book-stage').dataset.mobilePage === 'right' && document.activeElement === document.getElementById('journalBookRightPage')"), true, "mobile overflow switches to the visible right page");
  assert.equal(await evaluate("prototypeField.value + document.getElementById('journalBookRightPage').value === pageFlowText + pageFlowOriginal.right"), true);
  await evaluate("prototypeField.value=pageFlowOriginal.left;document.getElementById('journalBookRightPage').value=pageFlowOriginal.right;prototypeField.dispatchEvent(new Event('input',{bubbles:true}))");
  assert.equal(await evaluate(durableSnapshot), beforeData, "prototype leaves durable app domains untouched");

  await action("download");
  let downloaded;
  for (let index = 0; index < 100; index++) {
    try { downloaded = await fs.readFile(path.join(downloadPath,"kreatorm-journal-prototype.txt"), "utf8"); break; }
    catch (_) { await sleep(50); }
  }
  assert.ok(downloaded?.includes("Danas pišem.") && downloaded.includes("Druga stranica.\nNovi red."));
  await cdp("Network.setBlockedURLs", { urls: ["*assets/journal/book-prototype/knjigice/half-open.png"] });
  await evaluate("window.__journalBeforeReload = true");
  await cdp("Page.reload", { ignoreCache: true });
  await wait("!window.__journalBeforeReload && document.readyState === 'complete' && Boolean(window.MentorAppReadyPromise)");
  await evaluate("MentorAppReadyPromise");
  await evaluate("setView('journal')");
  await ready();
  assert.equal((await state()).framesAvailable, false);
  assert.equal((await state()).hasText, false, "prototype does not imply permanent storage");
  await action("open");
  assert.equal((await state()).state, "open");
  assert.equal((await state()).animating, false);
  assert.equal(await evaluate("document.getElementById('journalBookPages').hidden"), false);
  await cdp("Network.setBlockedURLs", { urls: [] });
  await action("retry");
  await ready();
  assert.equal((await state()).framesAvailable, true);
  assert.deepEqual(errors, []);
  assert.equal(requests.filter((request) => request.method === "POST" && request.url.includes("/api/mentor/")).length, 0);
  console.log("PASS: journal animation/editor/page flow/no scrollbars/no writing outline/placeholder/overflow text preservation/undo/IME/mobile page switch/SR+EN/focus/session/export/static fallback/retry/720p/1080p/4K/no domain writes/no AI requests.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ id: 999999, method: "Browser.close" }));
    socket.close();
  }
  if (browser && browser.exitCode === null) browser.kill();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  // Chromium may retain file locks. Leave the disposable OS-temp profile alone;
  // this check never deletes directories or uses a real browser profile.
});
