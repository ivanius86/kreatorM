// Isolated Chrome profile with simulated Gemini and TheMealDB responses.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { createServer } = require("../../server.js");
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const geminiRequests = [];
const command = "Create one recipe with my basil";
const meal = { idMeal: "12345", strMeal: "Basil dish", strInstructions: "Mix the basil.", strMealThumb: "", strIngredient1: "Basil", strMeasure1: "30 g" };
const server = createServer({ apiKey: "isolated-recipe-test", fetchImpl: async (url, options) => {
  if (String(url).startsWith("https://www.themealdb.com/api/")) return new Response(JSON.stringify({ meals: [meal] }), { headers: { "content-type": "application/json" } });
  const request = JSON.parse(options.body); geminiRequests.push(request);
  const properties = request.generationConfig?.responseJsonSchema?.properties || {};
  const value = properties.evidence ? { evidence: command, requests: [{ action: "createRecipe", count: 1 }] }
    : { reply: "Review the recipe.", recipes: [{ action: "createRecipe", name: "Basil dish", description: "Mix 30 g basil.", servings: 1, mealType: "lunch", ingredients: [{ foodId: "user_food_browser_basil", name: "Basil", quantity: 30, unit: "g" }], sourceId: "12345", adapted: false, adaptationNote: "", unresolved: [] }] };
  return new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(value) }] } }] }));
} });
let chrome, socket, profile;
async function main() {
  const browser = process.env.MENTOR_BROWSER || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  await fs.access(browser);
  profile = await fs.mkdtemp(path.join(os.tmpdir(), "mentor-recipe-browser-"));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = "http://127.0.0.1:" + server.address().port;
  chrome = spawn(browser, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", "--user-data-dir=" + profile, "about:blank"], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
  let launchError; chrome.on("error", error => { launchError = error; });
  let port;
  for (let i = 0; i < 150; i++) { if (launchError) throw launchError; try { port = (await fs.readFile(path.join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]; break; } catch (_) { await sleep(100); } }
  assert.ok(port, "Chrome debugging port available");
  const pages = await (await fetch("http://127.0.0.1:" + port + "/json/list")).json();
  socket = new WebSocket(pages.find(page => page.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  let nextId = 0; const pending = new Map(); const errors = [];
  socket.addEventListener("message", event => { const value = JSON.parse(event.data); if (value.method === "Runtime.exceptionThrown") errors.push(value.params.exceptionDetails); if (!value.id) return; const waiter = pending.get(value.id); pending.delete(value.id); if (value.error) waiter.reject(new Error(JSON.stringify(value.error))); else waiter.resolve(value.result); });
  const cdp = (method, params = {}) => new Promise((resolve, reject) => { const id = ++nextId; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  async function evaluate(expression) { const result = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails)); return result.result.value; }
  async function wait(expression) { for (let i = 0; i < 200; i++) { if (await evaluate(expression)) return; await sleep(50); } throw new Error("Timed out: " + expression + " / " + await evaluate("document.getElementById('mentorRequestStatus')?.textContent")); }
  async function send(text) { await evaluate("(() => { const input=document.getElementById('mentorMessageInput'); input.value=" + JSON.stringify(text) + "; input.dispatchEvent(new Event('input',{bubbles:true})); document.getElementById('mentorSendButton').click(); })()"); }
  await cdp("Runtime.enable"); await cdp("Page.enable"); await cdp("Page.navigate", { url: origin });
  await wait("Boolean(window.MentorChatReadyPromise)"); await evaluate("window.MentorChatReadyPromise"); await evaluate("MentorChat.showChat()");
  await evaluate("document.querySelector('.sidebar-item[data-view=builder]').click()");
  await evaluate("(async()=>{ await MentorLazy.loadFeature('nutrition'); await MentorNutritionFoodFormService.create({id:'user_food_browser_basil',defaultName:'My basil',names:{sr:'Moj bosiljak',en:'Basil'},slug:'my-basil',categoryId:'vegetables',filterProfile:{dietary:{vegan:'allowed'},allergens:{gluten:'absent',dairy:'absent',lactose:'absent',egg:'absent',nuts:'absent',soy:'absent',sesame:'absent'}}}); window.confirm=()=>true; })()");
  await send(command);
  await wait("document.querySelectorAll('.mentor-message').length===2 && Boolean(document.querySelector('button[data-mentor-action=approve-action]'))");
  assert.equal(await evaluate("document.querySelector('button[data-mentor-action=approve-action]').disabled"), false);
  assert.equal(await evaluate("document.querySelector('.mentor-action-card').textContent.includes('My basil')"), true);
  assert.equal(geminiRequests.length, 2);
  assert.equal(JSON.stringify(geminiRequests[1]).includes("user_food_browser_basil"), true);
  assert.equal(JSON.stringify(geminiRequests[1]).includes("userFoodNutrients"), false);
  await evaluate("document.querySelector('button[data-mentor-action=approve-action]').click()");
  await wait("MentorPlanningRepository.getRecipes().some(item=>item.name==='Basil dish')");
  const saved = await evaluate("(()=>{const row=MentorPlanningRepository.getRecipes().find(item=>item.name==='Basil dish'); return {id:row.id,foodId:row.ingredients[0].foodId,quantity:row.ingredients[0].quantity,unit:row.ingredients[0].unit,imageType:row.image.imageType};})()");
  assert.equal(saved.foodId, "user_food_browser_basil"); assert.equal(saved.quantity, 30); assert.equal(saved.unit, "g"); assert.equal(saved.imageType, "none");
  await cdp("Page.reload"); await wait("Boolean(window.MentorChatReadyPromise)"); await evaluate("window.MentorChatReadyPromise"); await evaluate("MentorChat.showChat()");
  await evaluate("MentorLazy.loadFeature('nutrition')");
  assert.equal(await evaluate("Boolean(MentorPlanningRepository.getRecipeById(" + JSON.stringify(saved.id) + "))"), true);
  await evaluate("document.querySelector('.sidebar-item[data-view=builder]').click()");
  await evaluate("document.querySelector('button[data-mentor-action=new]').click()"); await wait("document.querySelectorAll('.mentor-message').length===0");
  await evaluate("window.confirm=()=>true"); await send(command);
  await wait("document.querySelectorAll('.mentor-message').length===2 && Boolean(document.querySelector('button[data-mentor-action=dismiss-action]'))");
  await evaluate("document.querySelector('button[data-mentor-action=dismiss-action]').click()");
  await wait("document.querySelector('.mentor-action-card').textContent.includes('Dismissed') || document.querySelector('.mentor-action-card').textContent.includes('Odbac')");
  assert.equal(await evaluate("MentorPlanningRepository.getRecipes().filter(item=>item.name==='Basil dish').length"), 1);
  await evaluate("document.querySelector('button[data-mentor-action=new]').click()"); await wait("document.querySelectorAll('.mentor-message').length===0");
  await evaluate("window.confirm=()=>false"); await send(command);
  await wait("document.querySelectorAll('.mentor-message').length===2 && Boolean(document.querySelector('button[data-mentor-action=approve-action]'))");
  assert.equal(await evaluate("document.querySelector('button[data-mentor-action=approve-action]').disabled"), true);
  assert.equal(await evaluate("document.querySelector('.mentor-action-card').textContent.includes('Basil')"), true);
  assert.equal(JSON.stringify(geminiRequests.at(-1)).includes("user_food_browser_basil"), false);
  assert.equal(await evaluate("MentorPlanningRepository.getRecipes().filter(item=>item.name==='Basil dish').length"), 1);
  assert.deepEqual(errors, []);
  console.log("PASS: simulated Gemini recipe uses consented user food, approval persists after reload, dismissal/denial do not write, source image optional");
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (socket?.readyState === WebSocket.OPEN) { socket.send(JSON.stringify({ id: 999999, method: "Browser.close" })); socket.close(); }
  if (chrome && chrome.exitCode === null) chrome.kill();
  server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  if (profile) { const target = path.resolve(profile); if (path.dirname(target) === path.resolve(os.tmpdir()) && path.basename(target).startsWith("mentor-recipe-browser-")) { await sleep(300); await fs.rm(target, { recursive: true, force: true }).catch(() => {}); } }
});
