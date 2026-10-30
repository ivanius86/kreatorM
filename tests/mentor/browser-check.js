// Opt-in browser integration checks. Uses an isolated profile and mocked Gemini only.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { spawn } = require("node:child_process");
const { createServer } = require("../../server.js");
const protocol = require("../../js/mentor/mentor-protocol.js");
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const requests = [];
let quotaFailed = false;
const server = createServer({ apiKey: "browser-test-only-secret", fetchImpl: async (_, options) => {
  const request = JSON.parse(options.body); requests.push(request);
  const latest = request.contents.at(-1).parts[0].text;
  if (latest === "[quota]" && !quotaFailed) { quotaFailed = true; return new Response('{"error":{"status":"RESOURCE_EXHAUSTED"}}', { status: 429 }); }
  if (latest === "[slow]") await new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, 2200);
    options.signal.addEventListener("abort", () => { clearTimeout(timer); reject(new Error("aborted")); }, { once: true });
  });
  const proposal = latest === "[proposal]" ? protocol.validateProposal({ action: "createGoal", title: "Learn Serbian", type: "habit", category: "Personal Growth", firstAction: "Read one page", frequency: "Daily", tasks: [{ title: "Read one page", cadence: "Daily" }], milestones: ["Finish chapter one"] }) : null;
  const reply = latest === "[xss]" ? '<img src=x onerror="window.unsafeExecuted=true">' : "Context turns: " + request.contents.length + ". What would a useful next step look like?";
  return new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ reply, proposal }) }] } }] }));
} });
let chrome, socket, profile;
async function main() {
  const browser = process.env.MENTOR_BROWSER || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  await fs.access(browser);
  profile = await fs.mkdtemp(path.join(os.tmpdir(), "mentor-chat-browser-"));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = "http://127.0.0.1:" + server.address().port;
  chrome = spawn(browser, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", "--user-data-dir=" + profile, "about:blank"], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
  let launchError; chrome.on("error", error => { launchError = error; });
  let port;
  for (let i = 0; i < 150; i++) {
    if (launchError) throw launchError;
    try { port = (await fs.readFile(path.join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]; break; } catch (_) { await sleep(100); }
  }
  assert.ok(port, "Chrome debugging port available");
  const pages = await (await fetch("http://127.0.0.1:" + port + "/json/list")).json();
  socket = new WebSocket(pages.find(page => page.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  let nextId = 0; const pending = new Map(); const errors = [];
  socket.addEventListener("message", event => {
    const value = JSON.parse(event.data);
    if (value.method === "Runtime.exceptionThrown") errors.push(value.params.exceptionDetails);
    if (!value.id) return;
    const waiter = pending.get(value.id); pending.delete(value.id);
    if (value.error) waiter.reject(new Error(JSON.stringify(value.error))); else waiter.resolve(value.result);
  });
  const cdp = (method, params = {}) => new Promise((resolve, reject) => { const id = ++nextId; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  async function evaluate(expression) {
    const result = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  async function wait(expression, label = expression) {
    for (let i = 0; i < 200; i++) { if (await evaluate(expression)) return; await sleep(50); }
    throw new Error("Timed out: " + label + " status=" + await evaluate("document.getElementById('mentorRequestStatus')?.textContent"));
  }
  const click = selector => evaluate("document.querySelector(" + JSON.stringify(selector) + ").click()");
  const enter = text => evaluate("(() => { const input=document.getElementById('mentorMessageInput'); input.value=" + JSON.stringify(text) + "; input.dispatchEvent(new Event('input',{bubbles:true})); document.getElementById('mentorSendButton').click(); })()");
  const newConversation = async () => { const before = await evaluate("document.getElementById('mentorConversationSelect').value"); await click("button[data-mentor-action='new']"); await wait("document.getElementById('mentorConversationSelect').value !== " + JSON.stringify(before)); await wait("!document.getElementById('mentorMessageInput').disabled"); };
  await cdp("Runtime.enable"); await cdp("Page.enable");
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await cdp("Page.navigate", { url: origin });
  await wait("Boolean(window.MentorChatReadyPromise)");
  await evaluate("window.MentorChatReadyPromise");
  await evaluate("MentorI18n.setLanguage('en')");
  await click('#mentorLauncher');
  await wait("document.getElementById('mentorChatTitle').textContent === 'Mentor'");
  assert.equal(await evaluate("document.querySelector('.sidebar-item[data-view=builder]').textContent.trim()"), "Goal Creator");
  await evaluate("window.originalMentorInput=document.getElementById('mentorMessageInput'); originalMentorInput.focus(); originalMentorInput.value='draft'; originalMentorInput.dispatchEvent(new Event('input',{bubbles:true})); document.getElementById('mentorMessages').click()");
  assert.equal(await evaluate("originalMentorInput===document.getElementById('mentorMessageInput') && originalMentorInput.value==='draft' && MentorI18n.getLanguage()==='en'"), true);
  await evaluate("originalMentorInput.value='I want to learn Serbian'; originalMentorInput.focus(); originalMentorInput.dispatchEvent(new Event('input',{bubbles:true}))");
  await cdp("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", text: "\r", unmodifiedText: "\r", windowsVirtualKeyCode: 13, modifiers: 8 });
  await cdp("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, modifiers: 8 });
  assert.ok((await evaluate("originalMentorInput.value")).includes("\n"));
  assert.equal(await evaluate("document.querySelectorAll('.mentor-message').length"), 0);
  await cdp("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, modifiers: 0 });
  await cdp("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, modifiers: 0 });
  await wait("document.querySelectorAll('.mentor-message').length===2");
  const firstConversation = await evaluate("document.getElementById('mentorConversationSelect').value");
  await enter("Ten minutes a day"); await wait("document.querySelectorAll('.mentor-message').length===4");
  assert.equal(requests[1].contents.length, 3);
  assert.ok(requests[0].systemInstruction.parts[0].text.endsWith("null"));
  await cdp("Page.reload"); await wait("Boolean(window.MentorChatReadyPromise)"); await evaluate("window.MentorChatReadyPromise");
  await click('#mentorLauncher'); await wait("document.querySelectorAll('.mentor-message').length===4");
  assert.equal(await evaluate("document.getElementById('mentorConversationSelect').value"), firstConversation);
  await newConversation(); assert.equal(await evaluate("document.querySelectorAll('.mentor-message').length"), 0);
  await evaluate("document.getElementById('mentorConversationSelect').value=" + JSON.stringify(firstConversation) + "; document.getElementById('mentorConversationSelect').dispatchEvent(new Event('change',{bubbles:true}))");
  await wait("document.querySelectorAll('.mentor-message').length===4");
  await newConversation(); await enter("[quota]"); await wait("Boolean(document.querySelector('button[data-mentor-action=retry]'))");
  assert.ok((await evaluate("document.getElementById('mentorRequestStatus').textContent")).includes("quota"));
  await click("button[data-mentor-action='retry']"); await wait("document.querySelectorAll('.mentor-message').length===2 && document.getElementById('mentorCancelButton').classList.contains('hidden')");
  await newConversation(); await enter("[xss]"); await wait("document.querySelectorAll('.mentor-message').length===2");
  assert.equal(await evaluate("!window.unsafeExecuted && !document.querySelector('.mentor-message-text img')"), true);
  await evaluate("MentorGoalsService.createGoal({id:'existing-browser-goal',type:'long-term',title:'Existing saved goal',category:'Other',firstAction:'Review',targetDate:null},appState)");
  await newConversation(); await enter("[proposal]"); await wait("Boolean(document.querySelector('button[data-mentor-action=approve]'))");
  assert.equal(await evaluate("MentorData.repositories.goals.getAll().length"), 1);
  const beforeApproval = requests.length;
  await click("button[data-mentor-action='approve']"); await wait("document.querySelector('.mentor-proposal').textContent.includes('Goal saved')");
  assert.equal(await evaluate("MentorData.repositories.goals.getAll().length"), 2);
  const deletedElsewhere = await evaluate("document.getElementById('mentorConversationSelect').value");
  await evaluate("(async()=>{ const repository=await new MentorConversationsRepository().initialize(); await repository.remove(" + JSON.stringify(deletedElsewhere) + "); repository.close(); document.getElementById('mentorMessageInput').value='keep this draft'; window.dispatchEvent(new Event('focus')); })()");
  await wait("document.getElementById('mentorConversationSelect').value!==" + JSON.stringify(deletedElsewhere));
  assert.equal(await evaluate("document.getElementById('mentorMessageInput').value"), "keep this draft");
  assert.equal(requests.length, beforeApproval);
  const newGoalId = await evaluate("MentorData.repositories.goals.getAll().find(goal=>goal.id!=='existing-browser-goal').id");
  await evaluate("document.getElementById('mentorGoalContext').value=" + JSON.stringify(newGoalId));
  await enter("Help me with this goal"); await wait("document.querySelectorAll('.mentor-message').length===4");
  assert.ok(requests.at(-1).systemInstruction.parts[0].text.includes(newGoalId));
  await click("button[data-mentor-action='show-manual']");
  assert.equal(await evaluate("!document.getElementById('mentorManualCreator').classList.contains('hidden') && Boolean(document.getElementById('categoryGrid'))"), true);
  await evaluate("MentorChat.showChat()");
  await newConversation(); await enter("[slow]"); await wait("document.querySelectorAll('.mentor-message').length===1");
  await newConversation(); await sleep(2300);
  assert.equal(await evaluate("document.querySelectorAll('.mentor-message').length"), 0);
  const beforeDeleteCount = await evaluate("document.querySelectorAll('#mentorConversationSelect option').length");
  await evaluate("window.confirm=()=>true"); await click("button[data-mentor-action='delete']");
  await wait("document.querySelectorAll('#mentorConversationSelect option').length===" + (beforeDeleteCount - 1));
  assert.equal(await evaluate("MentorData.repositories.goals.getAll().length"), 2);
  await evaluate("MentorI18n.setLanguage('sr')"); await wait("document.querySelector('[data-mentor-i18n=description]').textContent==='Tvoj saputnik ka ostvarenju ciljeva.'");
  await newConversation(); await enter("Želim da naučim nešto novo"); await wait("document.querySelectorAll('.mentor-message').length===2");
  assert.ok(requests.at(-1).systemInstruction.parts[0].text.includes("Serbian (Latin script)"));
  await fs.mkdir(path.join(__dirname, "../../.tools"), { recursive: true });
  const screenshot = async name => { const value = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); await fs.writeFile(path.join(__dirname, "../../.tools", name), Buffer.from(value.data, "base64")); };
  await screenshot("mentor-desktop.png");
  await cdp("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await sleep(300);
  assert.equal(await evaluate("document.getElementById('mentorChatPanel').getBoundingClientRect().height < innerHeight && !document.getElementById('mentorChatPanel').inert"), true);
  assert.equal(await evaluate("document.documentElement.scrollWidth <= 391"), true);
  await screenshot("mentor-mobile.png");
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  for (const view of ["planner", "brainstorming", "finance", "nutrition", "settings", "journal", "bodyEnergy", "dashboard"]) {
    await evaluate("setView(" + JSON.stringify(view) + ")");
    assert.equal(await evaluate("!document.getElementById(" + JSON.stringify(view === "planner" ? "plannerView" : view + "View") + ").classList.contains('hidden')"), true);
  }
  assert.deepEqual(errors, []);
  console.log("PASS: browser chat/context/reload/history/retry/XSS/proposals/goal sharing/cancellation/SR+EN/mobile/legacy builder/navigation; mocked Gemini requests=" + requests.length);
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (socket?.readyState === WebSocket.OPEN) { socket.send(JSON.stringify({ id: 999999, method: "Browser.close" })); socket.close(); }
  if (chrome && chrome.exitCode === null) chrome.kill();
  server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  // Keep the disposable profile in OS temp if Chrome still holds it; never touch user profiles.
  if (profile) {
    const target = path.resolve(profile);
    if (path.dirname(target) === path.resolve(os.tmpdir()) && path.basename(target).startsWith("mentor-chat-browser-")) {
      await sleep(300); await fs.rm(target, { recursive: true, force: true }).catch(() => {});
    }
  }
});
