// Opt-in end-to-end check with isolated browser storage and simulated Gemini HTTP.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { createServer } = require("../../server.js");
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const requests = [];
const server = createServer({ apiKey: "isolated-browser-test-key", fetchImpl: async (_, options) => {
  const request = JSON.parse(options.body); requests.push(request);
  const structuredRoute = Boolean(request.generationConfig?.responseJsonSchema?.properties?.capabilityId);
  return new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: structuredRoute ? JSON.stringify({ capabilityId: "nutrition.recipe.search" }) : "Cloud reply" }] } }] }));
} });
let chrome, socket, profile;
async function main() {
  const browser = process.env.MENTOR_BROWSER || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  await fs.access(browser);
  profile = await fs.mkdtemp(path.join(os.tmpdir(), "mentor-inventory-browser-"));
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
  async function wait(expression) {
    for (let i = 0; i < 200; i++) { if (await evaluate(expression)) return; await sleep(50); }
    throw new Error("Timed out: " + expression + " / " + await evaluate("document.getElementById('mentorRequestStatus')?.textContent"));
  }
  async function send(message) {
    await evaluate("(() => { const input=document.getElementById('mentorMessageInput'); input.value=" + JSON.stringify(message) + "; input.dispatchEvent(new Event('input',{bubbles:true})); document.getElementById('mentorSendButton').click(); })()");
  }
  await cdp("Runtime.enable"); await cdp("Page.enable");
  await cdp("Page.navigate", { url: origin });
  await wait("Boolean(window.MentorChatReadyPromise)"); await evaluate("window.MentorChatReadyPromise"); await evaluate("MentorChat.showChat()");
  await evaluate("document.querySelector('.sidebar-item[data-view=builder]').click()");
  await evaluate("(async()=>{ await MentorLazy.loadFeature('nutrition'); const food=MentorFoodRepository.getAll()[0]; window.inventoryTestBatch=await MentorInventoryService.saveBatch({foodId:food.id,locationId:'location_fridge',quantity:2,unit:'kg'}); window.confirm=()=>true; })()");
  await send("Koliko namirnica imam u frižideru?");
  await wait("document.querySelectorAll('.mentor-message').length===2");
  assert.equal(requests.length, 0);
  assert.equal(await evaluate("document.querySelector('.mentor-message[data-role=assistant] .mentor-message-text').textContent.includes('2 kg')"), true);
  assert.equal(await evaluate("MentorInventoryRepository.getBatchById(window.inventoryTestBatch.id).quantity"), 2);
  await send("Help me think about a goal");
  await wait("document.querySelectorAll('.mentor-message').length===4");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].contents.length, 1);
  assert.equal(JSON.stringify(requests[0]).includes("2 kg"), false);
  await cdp("Page.reload"); await wait("Boolean(window.MentorChatReadyPromise)"); await evaluate("window.MentorChatReadyPromise"); await evaluate("MentorChat.showChat()");
  await evaluate("document.querySelector('.sidebar-item[data-view=builder]').click()");
  await wait("document.querySelectorAll('.mentor-message').length===4");
  assert.equal(await evaluate("document.querySelector('.mentor-message[data-role=assistant] .mentor-message-text').textContent.includes('2 kg')"), true);
  await evaluate("document.querySelector('button[data-mentor-action=new]').click()");
  await wait("document.querySelectorAll('.mentor-message').length===0");
  await evaluate("window.confirm=()=>false");
  await send("Šta imam u zamrzivaču?"); await wait("document.querySelectorAll('.mentor-message').length===2");
  assert.equal(requests.length, 1);
  assert.equal(await evaluate("document.querySelector('.mentor-message[data-role=assistant] .mentor-message-text').textContent.includes('did not read')"), true);
  await evaluate("(async()=>{ await MentorLazy.loadFeature('nutrition'); const batch=MentorInventoryRepository.getBatches()[0]; const food=MentorFoodRepository.getById(batch.foodId); window.phase4FoodName=food.defaultName; const recipe=await MentorPlanningService.saveRecipe({name:'Phase 4 soup',servings:1,mealType:'lunch',ingredients:[{foodId:food.id,quantity:100,unit:'g'}]}); const now=new Date(); const tomorrow=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1); const date=[tomorrow.getFullYear(),String(tomorrow.getMonth()+1).padStart(2,'0'),String(tomorrow.getDate()).padStart(2,'0')].join('-'); await MentorPlanningService.saveMealPlanEntry({recipeId:recipe.id,plannedDate:date,mealType:'lunch',servings:1}); window.confirm=()=>true; })()");
  await evaluate("document.querySelector('button[data-mentor-action=new]').click()"); await wait("document.querySelectorAll('.mentor-message').length===0");
  const foodName = await evaluate("window.phase4FoodName");
  const availabilityMatches = await evaluate("MentorCapabilityRegistry.matches(" + JSON.stringify("Koliko " + foodName + " imam u frižideru?") + ").map(item=>item.capability.id)");
  assert.deepEqual(availabilityMatches, ["nutrition.inventory.getAvailability"], foodName);
  await send("Pronađi " + foodName); await wait("document.querySelectorAll('.mentor-message').length===2");
  assert.equal(await evaluate("document.querySelector('.mentor-message[data-role=assistant] .mentor-message-text').textContent.includes(" + JSON.stringify(foodName) + ")"), true);
  await send("Koliko " + foodName + " imam u frižideru?"); await wait("document.querySelectorAll('.mentor-message').length===4");
  const availabilityReply = await evaluate("document.querySelectorAll('.mentor-message[data-role=assistant]')[1].textContent");
  assert.ok(availabilityReply.includes("available now"), foodName + " / " + await evaluate("document.querySelectorAll('.mentor-message[data-role=user]')[1].textContent") + " / model requests=" + requests.length + " / " + availabilityReply);
  await send("Koje recepte imam?"); await wait("document.querySelectorAll('.mentor-message').length===6");
  assert.equal(await evaluate("document.querySelectorAll('.mentor-message[data-role=assistant]')[2].textContent.includes('Phase 4 soup')"), true);
  await send("Šta imam sutra za ručak?"); await wait("document.querySelectorAll('.mentor-message').length===8");
  assert.equal(await evaluate("document.querySelectorAll('.mentor-message[data-role=assistant]')[3].textContent.includes('Phase 4 soup')"), true);
  assert.equal(requests.length, 1, "clear Nutrition reads must not call Gemini");
  const beforeRouting = requests.length;
  await send("Pogledaj recept i zalihe?"); await wait("document.querySelectorAll('.mentor-message').length===10");
  assert.equal(requests.length, beforeRouting + 1, "ambiguous read may call Gemini only after permission");
  assert.equal(requests.at(-1).contents.length, 1);
  assert.equal(JSON.stringify(requests.at(-1)).includes("Phase 4 soup"), false);
  await send("Help me plan my priorities"); await wait("document.querySelectorAll('.mentor-message').length===12");
  assert.equal(requests.at(-1).contents.length, 1, "all local Nutrition turns must stay out of Gemini context");
  assert.deepEqual(errors, []);
  console.log("PASS: five local Nutrition reads, permission denial, ambiguous Gemini route, no Nutrition data leakage, reload persistence (Gemini HTTP simulated)");
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (socket?.readyState === WebSocket.OPEN) { socket.send(JSON.stringify({ id: 999999, method: "Browser.close" })); socket.close(); }
  if (chrome && chrome.exitCode === null) chrome.kill();
  server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  if (profile) {
    const target = path.resolve(profile);
    if (path.dirname(target) === path.resolve(os.tmpdir()) && path.basename(target).startsWith("mentor-inventory-browser-")) {
      await sleep(300); await fs.rm(target, { recursive: true, force: true }).catch(() => {});
    }
  }
});
