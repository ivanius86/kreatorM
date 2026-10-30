// Isolated Chrome storage; no real AI or user inventory is accessed.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { createServer } = require("../../server.js");
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let aiCalls = 0;
const server = createServer({ apiKey: "isolated-write-test", fetchImpl: async () => { aiCalls++; return new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "Unexpected AI call" }] } }] })); } });
let chrome, socket, profile;
async function main() {
  const browser = process.env.MENTOR_BROWSER || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  await fs.access(browser);
  profile = await fs.mkdtemp(path.join(os.tmpdir(), "mentor-write-browser-"));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = "http://127.0.0.1:" + server.address().port;
  chrome = spawn(browser, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", "--user-data-dir=" + profile, "about:blank"], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
  let launchError; chrome.on("error", error => { launchError = error; });
  let port;
  for (let i = 0; i < 150; i++) { if (launchError) throw launchError; try { port = (await fs.readFile(path.join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]; break; } catch (_) { await sleep(100); } }
  assert.ok(port);
  const pages = await (await fetch("http://127.0.0.1:" + port + "/json/list")).json();
  socket = new WebSocket(pages.find(page => page.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  let nextId = 0; const pending = new Map(); const errors = [];
  socket.addEventListener("message", event => { const value = JSON.parse(event.data); if (value.method === "Runtime.exceptionThrown") errors.push(value.params.exceptionDetails); if (!value.id) return; const waiter = pending.get(value.id); pending.delete(value.id); if (!waiter) return; if (value.error) waiter.reject(new Error(JSON.stringify(value.error))); else waiter.resolve(value.result); });
  const cdp = (method, params = {}) => new Promise((resolve, reject) => { const id = ++nextId; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  async function evaluate(expression) { const result = await Promise.race([cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }), new Promise((_, reject) => setTimeout(() => reject(new Error("Evaluate timed out: " + expression.slice(0, 100))), 10000))]); if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails)); return result.result.value; }
  async function wait(expression) { for (let i = 0; i < 200; i++) { try { if (await evaluate(expression)) return; } catch (error) { console.error("browser exceptions", errors); throw error; } await sleep(50); } throw new Error("Timed out: " + expression + " / " + await evaluate("document.getElementById('mentorRequestStatus')?.textContent")); }
  async function send(text) { await evaluate("(() => { const input=document.getElementById('mentorMessageInput'); input.value=" + JSON.stringify(text) + "; input.dispatchEvent(new Event('input',{bubbles:true})); document.getElementById('mentorSendButton').click(); })()"); }
  await cdp("Runtime.enable"); await cdp("Page.enable"); await cdp("Page.navigate", { url: origin });
  await wait("Boolean(window.MentorChatReadyPromise)"); await evaluate("window.MentorChatReadyPromise"); await evaluate("MentorChat.showChat()");
  await evaluate("document.querySelector('.sidebar-item[data-view=builder]').click()");
  await evaluate("window.confirm=()=>true; MentorLazy.loadFeature('nutrition')");
  await send("Dodaj 2 kg kinoe.");
  console.log("write browser: first message sent");
  await wait("document.querySelectorAll('.mentor-message').length===2");
  assert.equal(await evaluate("document.querySelector('.mentor-message[data-role=assistant]').textContent.includes('ostav')"), false);
  await send("U ostavu.");
  console.log("write browser: location sent");
  await wait("document.querySelectorAll('.mentor-message').length===4 && Boolean(document.querySelector('button[data-mentor-action=approve-write]'))");
  assert.equal(await evaluate("MentorInventoryRepository.getBatches().filter(row=>row.foodId===MentorFoodRepository.query({search:'Kinoa'})[0].id).length"), 0);
  await cdp("Page.reload"); await wait("Boolean(window.MentorChatReadyPromise)"); await evaluate("window.MentorChatReadyPromise"); await evaluate("MentorChat.showChat()");
  console.log("write browser: reloaded");
  await evaluate("document.querySelector('.sidebar-item[data-view=builder]').click()");
  await evaluate("window.confirm=()=>true");
  await evaluate("MentorLazy.loadFeature('nutrition')");
  console.log("write browser: nutrition loaded");
  await wait("Boolean(document.querySelector('button[data-mentor-action=approve-write]'))");
  await evaluate("document.querySelector('button[data-mentor-action=approve-write]').click()");
  console.log("write browser: add approved");
  await wait("MentorInventoryRepository.getBatches().some(row=>row.foodId===MentorFoodRepository.query({search:'Kinoa'})[0].id && row.quantity===2 && row.unit==='kg')");
  await wait("document.querySelector('[data-panel=mentor-write-preview]')?.textContent.includes('Sačuvano') || document.querySelector('[data-panel=mentor-write-preview]')?.textContent.includes('Saved')");
  console.log("write browser: add card settled");
  const before = await evaluate("MentorInventoryRepository.getBatches().filter(row=>row.foodId===MentorFoodRepository.query({search:'Kinoa'})[0].id).length");
  await evaluate("document.querySelector('button[data-mentor-action=approve-write]')?.click()"); await sleep(200);
  assert.equal(await evaluate("MentorInventoryRepository.getBatches().filter(row=>row.foodId===MentorFoodRepository.query({search:'Kinoa'})[0].id).length"), before);
  await send("Dopuni kinou za 1 kg.");
  console.log("write browser: restock sent");
  await wait("document.querySelectorAll('.mentor-message').length===6 && Boolean(document.querySelector('button[data-mentor-action=approve-write]'))");
  await evaluate("document.querySelector('button[data-mentor-action=approve-write]').click()");
  await wait("MentorInventoryRepository.getBatches().some(row=>row.foodId===MentorFoodRepository.query({search:'Kinoa'})[0].id && row.quantity===3)");
  assert.equal(aiCalls, 0);
  assert.deepEqual(errors, []);
  console.log("PASS: local inventory add + follow-up + reload + approval + duplicate click + restock; no AI calls");
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (socket?.readyState === WebSocket.OPEN) { socket.send(JSON.stringify({ id: 999999, method: "Browser.close" })); socket.close(); }
  if (chrome && chrome.exitCode === null) chrome.kill();
  server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  if (profile) { const target = path.resolve(profile); if (path.dirname(target) === path.resolve(os.tmpdir()) && path.basename(target).startsWith("mentor-write-browser-")) { await sleep(300); await fs.rm(target, { recursive: true, force: true }).catch(() => {}); } }
});
