"use strict";
const API = "https://www.themealdb.com/api/json/v1/1/";
function createRecipeSources({ fetchImpl = globalThis.fetch, timeoutMs = 8000, now = Date.now } = {}) {
  const recipes = new Map(); const images = new Map(); const discoveries = new Map();
  function put(cache, key, value, max) { if (cache.size >= max && !cache.has(key)) cache.delete(cache.keys().next().value); cache.set(key, { value, expires: now() + 600000 }); }
  function read(cache, key) { const item = cache.get(key); if (!item) return null; if (item.expires <= now()) { cache.delete(key); return null; } return item.value; }
  async function bytes(url, max, signal, image) {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.hostname !== "www.themealdb.com" || (image ? !/^\/images\/media\/meals\/[a-zA-Z0-9_./-]+$/.test(parsed.pathname) : !parsed.pathname.startsWith("/api/json/v1/1/"))) throw new Error("INVALID_SOURCE");
    const controller = new AbortController(); const abort = () => controller.abort();
    if (signal) { if (signal.aborted) controller.abort(); else signal.addEventListener("abort", abort, { once: true }); }
    const timer = setTimeout(abort, timeoutMs);
    try {
      const response = await fetchImpl(url, { signal: controller.signal, redirect: "error" });
      if (!response.ok || response.redirected || Number(response.headers.get("content-length")) > max) throw new Error("SOURCE_UNAVAILABLE");
      const mime = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
      if (image ? !["image/jpeg", "image/png", "image/webp"].includes(mime) : mime !== "application/json") throw new Error("INVALID_SOURCE");
      const reader = response.body.getReader(); const chunks = []; let size = 0;
      try { while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > max) { await reader.cancel(); throw new Error("SOURCE_TOO_LARGE"); } chunks.push(Buffer.from(part.value)); } }
      finally { reader.releaseLock(); }
      const buffer = Buffer.concat(chunks);
      if (image) {
        const valid = mime === "image/jpeg" ? buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255 : mime === "image/png" ? buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
        if (!valid) throw new Error("INVALID_IMAGE");
      }
      return { buffer, mime };
    } finally { clearTimeout(timer); if (signal) signal.removeEventListener("abort", abort); }
  }
  async function json(endpoint, signal) { const data = await bytes(API + endpoint, 524288, signal, false); return JSON.parse(data.buffer.toString("utf8")); }
  function normalize(meal) {
    const id = String(meal.idMeal || ""); if (!/^\d{1,12}$/.test(id) || typeof meal.strMeal !== "string" || typeof meal.strInstructions !== "string") return null;
    const image = typeof meal.strMealThumb === "string" && /^https:\/\/www\.themealdb\.com\/images\/media\/meals\/[a-zA-Z0-9_./-]+$/.test(meal.strMealThumb) ? meal.strMealThumb : "";
    const ingredients = [];
    for (let index = 1; index <= 20; index++) if (typeof meal["strIngredient" + index] === "string" && meal["strIngredient" + index].trim()) ingredients.push({ name: meal["strIngredient" + index].trim().slice(0, 150), measure: String(meal["strMeasure" + index] || "").trim().slice(0, 150) });
    return { id, title: meal.strMeal.slice(0, 200), instructions: meal.strInstructions.slice(0, 6000), ingredients, originalImageUrl: image, url: "https://www.themealdb.com/meal.php?c=" + id };
  }
  async function discover({ vegan = false, query = "", signal, planning = false, meatPolicy } = {}) {
    const term = String(query).replace(/[^a-zA-Z0-9 -]/g, "").trim().slice(0, 60);
    const key = (vegan ? "vegan" : term || "chickpea") + (planning ? ":plan" : "") + (meatPolicy || ""); const cached = read(discoveries, key); if (cached) return cached;
    const queries = [...(vegan ? ["search.php?s=chickpea", "search.php?s=lentil", "search.php?s=tofu", "filter.php?c=Vegan"] : ["search.php?s=" + encodeURIComponent(term || "chickpea")]), ...(planning ? ["search.php?s=pancakes", "search.php?s=salad"] : []), ...(meatPolicy === "chicken-fish-only" ? ["search.php?s=salmon", "search.php?s=chicken"] : [])];
    const responses = await Promise.allSettled(queries.map(endpoint => json(endpoint, signal)));
    const groups = responses.filter(item => item.status === "fulfilled").map(item => Array.isArray(item.value.meals) ? item.value.meals : []);
    const roundRobin = Array.from({length: Math.min(12, Math.max(0, ...groups.map(group => group.length)))}, (_, index) => groups.map(group => group[index]).filter(Boolean)).flat();
    let candidates = [...new Map(roundRobin.filter(item => /^\d{1,12}$/.test(String(item.idMeal))).map(item => [String(item.idMeal), item])).values()].slice(0, planning ? 12 : 8);
    candidates = await Promise.all(candidates.map(async item => { if (item.strInstructions) return item; try { const full = await json("lookup.php?i=" + item.idMeal, signal); return full.meals && full.meals[0]; } catch (_) { return null; } }));
    const result = candidates.filter(Boolean).map(normalize).filter(Boolean).slice(0, planning ? 12 : 8);
    for (const recipe of result) put(recipes, recipe.id, recipe, 40);
    put(discoveries, key, result, 20); return result;
  }
  async function getImage(id, { signal } = {}) {
    if (!/^\d{1,12}$/.test(id)) return null;
    let recipe = read(recipes, id);
    if (!recipe) { const data = await json("lookup.php?i=" + id, signal); recipe = normalize(data.meals?.[0] || {}); if (!recipe || recipe.id !== id) return null; put(recipes, id, recipe, 40); }
    if (!recipe.originalImageUrl) return null;
    let image = read(images, id); if (!image) { image = await bytes(recipe.originalImageUrl, 2097152, signal, true); put(images, id, image, 20); } return image;
  }
  return { discover, get: id => read(recipes, String(id)), getImage };
}
module.exports = { createRecipeSources };
