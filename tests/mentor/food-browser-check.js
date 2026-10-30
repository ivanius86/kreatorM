// Isolated browser storage and source fixtures; never writes to the user's data.
"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs/promises"), os = require("node:os"), path = require("node:path");
const { spawn } = require("node:child_process");
const { createServer } = require("../../server.js");
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const record = { fdcId: 9990001, description: "Watercress, raw", dataType: "SR Legacy", foodNutrients: [
  { nutrient: { id: 1003, unitName: "g" }, amount: 2.3 }, { nutrient: { id: 1162, unitName: "mg" }, amount: 43 }, { nutrient: { id: 1178, unitName: "ug" }, amount: 0 }
] };
const server = createServer({ apiKey: "isolated-test-key", fetchImpl: async (url, options) => {
  if (url.startsWith("https://api.nal.usda.gov/")) return Response.json(url.includes("foods/search") ? { foods: [record] } : record);
  if (url.startsWith("https://www.themealdb.com/")) return Response.json({ meals: [] });
  const request = JSON.parse(options.body), properties = request.generationConfig.responseJsonSchema.properties;
  let value;
  if (properties.evidence) {
    const input = JSON.parse(request.contents[0].parts[0].text); value = { evidence: input.command, requests: [{ action: "createRecipe", count: 1 }] };
  } else if (properties.recipes) {
    const command = request.contents.at(-1).parts[0].text;
    const recoveryLine = request.systemInstruction.parts[0].text.split("\n").find(line => line.startsWith("UNTRUSTED_RECIPE_RECOVERY_CONTEXT: "));
    const recovery = recoveryLine ? JSON.parse(recoveryLine.slice("UNTRUSTED_RECIPE_RECOVERY_CONTEXT: ".length)) : null;
    const watercress = /potočark|potocark/i.test(command);
    const available = request.systemInstruction.parts[0].text.includes('"id":"user_food_usda_9990001"');
    const substitute = /umesto|instead/i.test(command);
    const missingBean = /posebn/i.test(command) && !substitute;
    const ingredient = (foodId, name, quantity) => ({ foodId, name, quantity, unit: "g" });
    const ingredients = watercress ? [ingredient(available ? "user_food_usda_9990001" : "missing:watercress", "Potočarka, sirova", 100), ingredient("food_onion_raw", "Crni luk", 50)]
      : [ingredient(missingBean ? "missing:beans" : "food_beans_pinto_boiled", missingBean ? "Pasulj, kuvan, posebna sorta" : "Pasulj, kuvan", 500), ingredient("food_smoked_pork_ribs_cia_aboliv", "Dimljena svinjska rebra", 600)];
    if (available && watercress) assert.ok(recovery?.originalText.includes("6 porcija"));
    if (substitute) assert.ok(recovery?.originalText.includes("5 porcija"));
    const servings = Number((recovery?.originalText || command).match(/(\d+) porcija/)?.[1] || 4);
    value = { reply: "Pregledaj recept.", recipes: [{ action: "createRecipe", name: watercress ? "Potočarka sa lukom" : "Pasulj sa rebrima", description: watercress ? "1. Operi i naseckaj potočarku.\n2. Dodaj luk i dovrši salatu." : "1. Kuvaj rebra dok ne omekšaju.\n2. Dodaj kuvani pasulj i dovrši jelo.", servings, mealType: "lunch", sourceId: "catalog", adapted: true, adaptationNote: "Sastavljeno od stvarnih namirnica iz kataloga, sa izabranim količinama.", ingredients, unresolved: [] }] };
  } else value = properties.query ? { query: "watercress raw" } : { nameSr: "Potočarka, sirova", categoryId: "vegetables", preparationState: "raw" };
  return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(value) }] } }] });
} });
let browser, socket, profile;
async function main() {
  profile = await fs.mkdtemp(path.join(os.tmpdir(), "mentor-food-browser-"));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = "http://127.0.0.1:" + server.address().port;
  browser = spawn(process.env.MENTOR_BROWSER || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", ["--headless=new", "--disable-gpu", "--no-first-run", "--remote-debugging-port=0", "--user-data-dir=" + profile, "about:blank"], { windowsHide: true, stdio: "ignore" });
  let launchError; browser.on("error", error => { launchError = error; });
  let port;
  for (let i = 0; i < 120; i++) { if (launchError) throw launchError; try { port = (await fs.readFile(path.join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]; break; } catch (_) { await pause(100); } }
  assert.ok(port, "Browser debugging port");
  const pages = await (await fetch("http://127.0.0.1:" + port + "/json/list")).json();
  socket = new WebSocket(pages.find(page => page.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  let nextId = 0; const pending = new Map(), errors = [];
  socket.addEventListener("message", event => { const value = JSON.parse(event.data); if (value.method === "Runtime.exceptionThrown") errors.push(value.params.exceptionDetails); if (!value.id) return; const waiter = pending.get(value.id); pending.delete(value.id); if (!waiter) return; value.error ? waiter.reject(new Error(JSON.stringify(value.error))) : waiter.resolve(value.result); });
  const cdp = (method, params = {}) => new Promise((resolve, reject) => { const id = ++nextId; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  async function evaluate(expression) { const result = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails)); return result.result.value; }
  async function wait(expression) { for (let i = 0; i < 200; i++) { if (await evaluate(expression)) return; await pause(50); } throw new Error("Timed out: " + expression + " / " + await evaluate("document.getElementById('mentorRequestStatus')?.textContent")); }
  async function ready() { await wait("Boolean(window.MentorChatReadyPromise)"); await evaluate("MentorChatReadyPromise"); await evaluate("MentorChat.showChat(); window.confirm=()=>true"); await evaluate("document.querySelector('.sidebar-item[data-view=builder]').click()"); await evaluate("MentorLazy.loadFeature('nutrition')"); }
  async function send(text) { await evaluate("(()=>{const input=document.getElementById('mentorMessageInput');input.value=" + JSON.stringify(text) + ";input.dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('mentorSendButton').click();})()"); }
  await cdp("Runtime.enable"); await cdp("Page.enable"); await cdp("Page.navigate", { url: origin }); await ready();
  if (process.argv.includes("--catalog-recipes")) {
    const fresh = async () => { await evaluate("document.querySelector('button[data-mentor-action=new]').click()"); await wait("document.querySelectorAll('.mentor-message').length===0"); };
    await send("NAPRAVI MI RECEPT, PASULJ SA REBRIMA");
    await wait("Boolean(document.querySelector('button[data-mentor-action=approve-action]:not(:disabled)'))");
    await evaluate("document.querySelector('button[data-mentor-action=approve-action]').click()");
    await wait("MentorPlanningRepository.getRecipes().length===1");
    assert.equal(await evaluate("MentorPlanningRepository.getRecipes()[0].source.provider"), "Mentor");
    await fresh(); await send("Napravi recept za potocarku sa lukom za 6 porcija");
    await wait("Boolean(document.querySelector('button[data-mentor-action=research-recipe-food]'))");
    assert.equal(await evaluate("document.querySelector('button[data-mentor-action=approve-action]').disabled"), true);
    await evaluate("document.querySelector('button[data-mentor-action=research-recipe-food]').click()");
    await wait("Boolean(document.querySelector('button[data-mentor-action=fill-choice]'))");
    await evaluate("document.querySelector('button[data-mentor-action=fill-choice]').click()");
    await wait("Boolean(document.querySelector('button[data-mentor-action=approve-write]'))");
    await cdp("Page.reload"); await ready();
    await evaluate("document.querySelector('button[data-mentor-action=approve-write]').click()");
    await wait("Boolean(document.querySelector('button[data-mentor-action=resume-recipe]'))");
    assert.equal(await evaluate("MentorPlanningRepository.getRecipes().length"), 1);
    await evaluate("document.querySelector('button[data-mentor-action=resume-recipe]').click()");
    await wait("Boolean(document.querySelector('button[data-mentor-action=approve-action]:not(:disabled)'))");
    await evaluate("document.querySelector('button[data-mentor-action=approve-action]:not(:disabled)').click()");
    await wait("MentorPlanningRepository.getRecipes().length===2");
    assert.equal(await evaluate("MentorPlanningRepository.getRecipes().some(recipe=>recipe.ingredients.some(row=>row.foodId==='user_food_usda_9990001'))"), true);
    assert.equal(await evaluate("MentorPlanningRepository.getRecipes().find(recipe=>recipe.name==='Potočarka sa lukom').servings"), 6);
    await fresh(); await send("Napravi pasulj sa rebrima sa posebnom sortom pasulja za 5 porcija");
    await wait("Boolean(document.querySelector('button[data-mentor-action=substitute-recipe-food]'))");
    await evaluate("document.querySelector('button[data-mentor-action=substitute-recipe-food]').click()");
    await wait("document.querySelectorAll('button[data-mentor-action=approve-action]').length===2 && !Array.from(document.querySelectorAll('button[data-mentor-action=approve-action]')).at(-1).disabled");
    assert.equal(await evaluate("MentorPlanningRepository.getRecipes().length"), 2);
    assert.equal(await evaluate("document.querySelector('button[data-mentor-action=approve-action]').disabled"), true);
    assert.equal(errors.length, 0, JSON.stringify(errors));
    console.log("Catalog recipe browser check passed: beans+ribs approval without a source, missing food creation+approval+reload+explicit resume, and substitution creates a new uncommitted recipe with the original still blocked."); return;
  }
  await send("Dodaj novu namirnicu potočarka u bazu namirnica");
  await wait("Boolean(document.querySelector('button[data-mentor-action=fill-choice]'))");
  assert.equal(await evaluate("MentorFoodRepository.getById('user_food_usda_9990001')"), null);
  await evaluate("document.querySelector('button[data-mentor-action=fill-choice]').click()");
  await wait("Boolean(document.querySelector('button[data-mentor-action=approve-write]'))");
  assert.equal(await evaluate("document.querySelector('button[data-mentor-action=approve-write]').disabled"), false);
  assert.equal(await evaluate("Array.from(document.querySelectorAll('.mentor-food-nutrients tbody tr')).filter(row=>row.querySelectorAll('td').length===3).length"), 45);
  assert.equal(await evaluate("document.querySelector('.mentor-food-preview').textContent.includes('USDA FoodData Central')"), true);
  assert.equal(await evaluate("MentorFoodRepository.getById('user_food_usda_9990001')"), null);
  await cdp("Page.reload"); await ready();
  await wait("Boolean(document.querySelector('button[data-mentor-action=approve-write]'))");
  await evaluate("document.querySelector('button[data-mentor-action=approve-write]').click()");
  await wait("Boolean(MentorFoodRepository.getById('user_food_usda_9990001')) && !document.querySelector('button[data-mentor-action=approve-write]')");
  assert.equal(await evaluate("MentorFoodRepository.getNutrients('user_food_usda_9990001').length"), 45);
  assert.equal(await evaluate("MentorFoodRepository.getSource('usda_9990001').fdcId"), 9990001);
  assert.equal(await evaluate("MentorFoodRepository.getById('user_food_usda_9990001').image.imageType"), "none");
  await send("Prikaži sve vitamine i minerale za 200 g potočarke");
  await wait("Array.from(document.querySelectorAll('.mentor-message[data-role=assistant]')).at(-1)?.textContent.includes('86')");
  await cdp("Page.reload"); await ready();
  assert.equal(await evaluate("MentorFoodRepository.getAll().filter(food=>food.id==='user_food_usda_9990001').length"), 1);
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log("Food browser check passed: source selection, 45-field preview, no write before approval, pending reload, durable food+source+nutrients, full local read, no image or duplicates.");
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (socket?.readyState === WebSocket.OPEN) { socket.send(JSON.stringify({ id: 999999, method: "Browser.close" })); socket.close(); }
  if (browser?.exitCode === null) browser.kill();
  server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  if (profile) { const target = path.resolve(profile); if (path.dirname(target) === path.resolve(os.tmpdir()) && path.basename(target).startsWith("mentor-food-browser-")) { await pause(300); await fs.rm(target, { recursive: true, force: true }).catch(() => {}); } }
});
