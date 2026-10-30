"use strict";
const http = require("node:http");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const protocol = require("./js/mentor/mentor-protocol.js");
const { createMentorCore } = require("./server/mentor-core.js");
const { createModelGateway } = require("./server/model-gateway.js");
const { createGemini, DEFAULT_MODEL } = require("./server/gemini.js");
const { createRecipeSources } = require("./server/recipe-sources.js");
const { createFoodSources } = require("./server/food-sources.js");
const actionResources = require("./js/i18n/mentor-actions.js");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".otf": "font/otf" };
const SAFE_CODES = new Set(["MISSING_API_KEY", "INVALID_API_KEY", "QUOTA", "NETWORK", "TIMEOUT", "MODEL_UNAVAILABLE", "BLOCKED", "INVALID_RESPONSE", "INVALID_REQUEST", "BUSY", "FOOD_SOURCE_UNAVAILABLE", "FOOD_PROPOSAL_EXPIRED", "FOOD_USDA_QUOTA"]);
function coded(code) { const result = new Error(code); result.code = code; return result; }
function isPublic(relative) {
  const parts = relative.split(/[\\/]/);
  if (!relative || parts.some(part => !part || part.startsWith(".") || part.includes(":"))) return false;
  const extension = path.extname(relative).toLowerCase();
  if (!MIME[extension]) return false;
  if (parts.length === 1) return relative === "index.html" || ((extension === ".js" || extension === ".css") && relative !== "server.js");
  if (parts[0] === "js") return [".js", ".mjs", ".css"].includes(extension);
  return ["assets", "icons", "fonts"].includes(parts[0]) && ![".js", ".mjs", ".html", ".css"].includes(extension);
}
function createServer({ providerName = process.env.MENTOR_AI_PROVIDER || "gemini", model = process.env.MENTOR_AI_MODEL || (providerName === "gemini" ? process.env.GEMINI_MODEL || DEFAULT_MODEL : undefined), apiKey = process.env.GEMINI_API_KEY, qwenApiKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY, qwenBaseUrl = process.env.MENTOR_QWEN_BASE_URL, fetchImpl = globalThis.fetch, timeoutMs = 75000, root = __dirname, now = Date.now } = {}) {
  const publicRoot = fs.realpathSync(root);
  const recipeSources = createRecipeSources({ fetchImpl, now });
  const gateway = createModelGateway({ name: providerName, model, apiKey: providerName === "qwen" ? qwenApiKey : apiKey, baseUrl: qwenBaseUrl, fetchImpl, timeoutMs });
  const foodSources = createFoodSources({ fetchImpl, provider: gateway, now });
  let foodActive = 0, foodStarts = [];
  const mentor = createMentorCore({ provider: gateway, recipeSources, timeoutMs, onUsage: ({ usage }) => {
    console.info("Mentor model usage: " + JSON.stringify({ provider: gateway.name, model: gateway.model, ...usage }));
  } });
  const cache = new Map();
  let active = 0;
  let starts = [];
  let diagnosticStarts = [];
  const diagnosticStages = new Set(["conversation-reserve", "conversation-refresh", "intelligence-router", "nutrition-context", "request-context", "request-validation", "request-storage", "provider-request", "response-validation", "response-storage", "response-render", "conversation-release", "interface", "initialization"]);
  const diagnosticNames = new Set(["Error", "TypeError", "RangeError", "ReferenceError", "SyntaxError", "QuotaExceededError", "SecurityError", "InvalidStateError", "DatabaseClosedError", "UnknownError", "AbortError", "DataCloneError", "TransactionInactiveError", "MentorDataError", "DexieError"]);
  const diagnosticCodes = new Set([...SAFE_CODES, ...Object.keys(actionResources.en.errors), "STORAGE", "CANCELLED", "GOAL_SAVE", "STALE_REQUEST", "CONVERSATION_DELETED"]);
  function json(response, status, value) {
    if (response.destroyed || response.writableEnded) return;
    response.writeHead(status, { "content-type": "application/json; charset=utf-8" }); response.end(JSON.stringify(value));
  }
  function failure(response, cause) {
    const code = cause && SAFE_CODES.has(cause.code) ? cause.code : "NETWORK";
    if (code === "NETWORK" || code === "INVALID_RESPONSE") {
      const phases = new Set(["upstream-http", "upstream-size", "upstream-json", "transport", "candidate-finish", "candidate-text", "generated-json", "provider"]);
      const diagnostic = { code, phase: phases.has(cause?.phase) ? cause.phase : "application-response" };
      if (Number.isInteger(cause?.upstreamStatus) && cause.upstreamStatus >= 100 && cause.upstreamStatus <= 599) diagnostic.upstreamStatus = cause.upstreamStatus;
      console.warn("Mentor provider diagnostic: " + JSON.stringify(diagnostic));
    }
    const status = code === "INVALID_REQUEST" ? 400 : ["BUSY", "QUOTA", "FOOD_USDA_QUOTA"].includes(code) ? 429 : code === "MISSING_API_KEY" ? 503 : code === "TIMEOUT" ? 504 : 502;
    const source = cause?.source === "usda" ? { source: "usda", retryAfterSeconds: Number.isFinite(cause.retryAfterSeconds) ? cause.retryAfterSeconds : null } : {};
    json(response, status, { error: { code, ...source } });
  }
  async function body(request, maximum = protocol.LIMITS.BODY_BYTES) {
    const chunks = []; let size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > maximum) throw coded("INVALID_REQUEST");
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString("utf8");
  }
  async function chat(request, response) {
    if (!/^application\/json(?:\s*;.*)?$/i.test(request.headers["content-type"] || "")) throw coded("INVALID_REQUEST");
    const length = request.headers["content-length"];
    if (length && Number(length) > protocol.LIMITS.BODY_BYTES) throw coded("INVALID_REQUEST");
    const raw = await body(request);
    let parsed; try { parsed = JSON.parse(raw); } catch (_) { throw coded("INVALID_REQUEST"); }
    const validated = protocol.validateRequest(parsed);
    const hash = crypto.createHash("sha256").update(raw).digest("hex");
    const timestamp = now();
    for (const [key, value] of cache) if (!value.pending && value.expires <= timestamp) cache.delete(key);
    let entry = cache.get(validated.requestId);
    if (entry && entry.hash !== hash) throw coded("INVALID_REQUEST");
    if (!entry) {
      starts = starts.filter(value => value > timestamp - 60000);
      if (active >= 2 || starts.length >= 12) throw coded("BUSY");
      if (cache.size >= 100) {
        const oldest = [...cache].find(([, value]) => !value.pending);
        if (oldest) cache.delete(oldest[0]); else throw coded("BUSY");
      }
      if (!gateway.configured) throw coded("MISSING_API_KEY");
      starts.push(timestamp); active += 1;
      entry = { hash, controller: new AbortController(), pending: true, expires: timestamp + 300000, waiters: 0 };
      cache.set(validated.requestId, entry);
      entry.promise = mentor.generate(validated, { signal: entry.controller.signal }).then(value => {
        entry.expires = now() + 300000;
        return value;
      }).catch(cause => { cache.delete(validated.requestId); throw cause; }).finally(() => { entry.pending = false; active -= 1; });
    }
    entry.waiters += 1;
    let released = false;
    const release = () => {
      if (released) return;
      released = true; entry.waiters -= 1;
      if (!entry.waiters && entry.pending) entry.controller.abort();
    };
    response.once("close", release);
    try { json(response, 200, await entry.promise); }
    finally { response.removeListener("close", release); release(); }
  }
  async function routeRead(request, response) {
    if (!/^application\/json(?:\s*;.*)?$/i.test(request.headers["content-type"] || "")) throw coded("INVALID_REQUEST");
    let value; try { value = JSON.parse(await body(request, 4300)); } catch (_) { throw coded("INVALID_REQUEST"); }
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== 1 || typeof value.text !== "string" || !value.text.trim() || value.text.length > 4000) throw coded("INVALID_REQUEST");
    if (!gateway.configured) throw coded("MISSING_API_KEY");
    const timestamp = now(); starts = starts.filter(time => time > timestamp - 60000);
    if (active >= 2 || starts.length >= 12) throw coded("BUSY");
    starts.push(timestamp); active += 1;
    const controller = new AbortController(); const abort = () => controller.abort(); response.once("close", abort);
    try { json(response, 200, await mentor.routeIntent(value.text, { signal: controller.signal })); }
    finally { active -= 1; response.removeListener("close", abort); }
  }
  async function staticFile(request, response, pathname) {
    let decoded; try { decoded = decodeURIComponent(pathname); } catch (_) { response.writeHead(404); response.end(); return; }
    if (decoded.includes("\\") || decoded.includes("\0")) { response.writeHead(404); response.end(); return; }
    const relative = decoded === "/" ? "index.html" : decoded.replace(/^\//, "");
    if (!isPublic(relative)) { response.writeHead(404); response.end(); return; }
    const filePath = path.resolve(publicRoot, relative);
    try {
      const resolved = await fsp.realpath(filePath);
      const realRelative = path.relative(publicRoot, resolved);
      if (!isPublic(realRelative)) { response.writeHead(404); response.end(); return; }
      const info = await fsp.stat(resolved);
      if (!info.isFile()) { response.writeHead(404); response.end(); return; }
      response.writeHead(200, { "content-type": MIME[path.extname(resolved).toLowerCase()], "content-length": info.size });
      if (request.method === "HEAD") response.end();
      else {
        const stream = fs.createReadStream(resolved);
        stream.on("error", () => response.destroy());
        response.on("close", () => stream.destroy());
        stream.pipe(response);
      }
    } catch (_) { response.writeHead(404); response.end(); }
  }
  const server = http.createServer(async (request, response) => {
    response.setHeader("x-content-type-options", "nosniff");
    response.setHeader("referrer-policy", "same-origin");
    response.setHeader("cache-control", "no-store");
    const address = server.address();
    const allowedHosts = ["127.0.0.1:" + address.port, "localhost:" + address.port];
    if (!allowedHosts.includes(request.headers.host)) { json(response, 403, { error: { code: "INVALID_REQUEST" } }); return; }
    const origin = "http://" + request.headers.host;
    if (request.headers.origin && request.headers.origin !== origin) { json(response, 403, { error: { code: "INVALID_REQUEST" } }); return; }
    if (request.method === "POST" && request.headers.origin !== origin) { json(response, 403, { error: { code: "INVALID_REQUEST" } }); return; }
    let pathname;
    try { pathname = new URL(request.url, origin).pathname; } catch (_) { json(response, 400, { error: { code: "INVALID_REQUEST" } }); return; }
    try {
      if (pathname === "/api/mentor/status" && request.method === "GET") { json(response, 200, { configured: gateway.configured }); return; }
      if (/^\/api\/mentor\/foods\/(search|details|verify)$/.test(pathname) && request.method === "POST") {
        if (!/^application\/json(?:\s*;.*)?$/i.test(request.headers["content-type"] || "")) throw coded("INVALID_REQUEST");
        let value; try { value = JSON.parse(await body(request, pathname.endsWith("/verify") ? 52000 : 2000)); } catch (_) { throw coded("INVALID_REQUEST"); }
        const operation = pathname.split("/").at(-1), key = { search: "text", details: "id", verify: "token" }[operation];
        if (!value || typeof value !== "object" || Object.keys(value).length !== 1 || typeof value[key] !== "string") throw coded("INVALID_REQUEST");
        const timestamp = now(); foodStarts = foodStarts.filter(time => time > timestamp - 60000);
        if (foodActive >= 2 || foodStarts.length >= 30) throw coded("BUSY");
        foodStarts.push(timestamp); foodActive++;
        try { json(response, 200, await foodSources[operation](value[key])); }
        finally { foodActive--; }
        return;
      }
      if (pathname === "/api/mentor/client-diagnostic" && request.method === "POST") {
        if (!/^application\/json(?:\s*;.*)?$/i.test(request.headers["content-type"] || "")) throw coded("INVALID_REQUEST");
        let value; try { value = JSON.parse(await body(request, 1024)); } catch (_) { throw coded("INVALID_REQUEST"); }
        if (!value || !diagnosticStages.has(value.stage) || !diagnosticNames.has(value.name) || !diagnosticCodes.has(value.code)) throw coded("INVALID_REQUEST");
        if (value.location != null) {
          const match = typeof value.location === "string" && value.location.match(/^([a-zA-Z0-9_./-]+\.js):([0-9]{1,7}):([0-9]{1,7})$/);
          if (!match || !isPublic(match[1])) throw coded("INVALID_REQUEST");
        }
        const timestamp = now(); diagnosticStarts = diagnosticStarts.filter(time => time > timestamp - 60000);
        if (diagnosticStarts.length < 30) { diagnosticStarts.push(timestamp); console.warn("Mentor client diagnostic: " + JSON.stringify({stage:value.stage,name:value.name,code:value.code,...(value.location ? {location:value.location} : {})})); }
        response.writeHead(204); response.end(); return;
      }
      if (pathname === "/api/mentor/chat" && request.method === "POST") { await chat(request, response); return; }
      if (pathname === "/api/mentor/route" && request.method === "POST") { await routeRead(request, response); return; }
      const imageMatch = pathname.match(/^\/api\/mentor\/recipe-images\/(\d{1,12})$/);
      if (imageMatch && request.method === "GET") {
        const controller = new AbortController(); const cancel = () => controller.abort(); response.once("close", cancel);
        try { const image = await recipeSources.getImage(imageMatch[1], { signal: controller.signal }); if (!image) { response.writeHead(404); response.end(); return; } response.writeHead(200, { "content-type": image.mime, "content-length": image.buffer.length, "cache-control": "private, max-age=600" }); response.end(image.buffer); }
        catch (_) { if (!response.destroyed) { response.writeHead(502); response.end(); } }
        finally { response.removeListener("close", cancel); }
        return;
      }
      if ((request.method === "GET" || request.method === "HEAD") && !pathname.startsWith("/api/")) { await staticFile(request, response, pathname); return; }
      response.writeHead(404); response.end();
    } catch (cause) { failure(response, cause); }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.on("close", () => { for (const entry of cache.values()) if (entry.pending) entry.controller.abort(); });
  return server;
}
function loadEnvironment() {
  try { process.loadEnvFile(path.join(__dirname, ".env")); }
  catch (cause) { if (cause.code !== "ENOENT") throw new Error("Cannot load .env. Check its permissions and format."); }
}
async function main() {
  loadEnvironment();
  if (process.argv.includes("--check-gemini")) {
    await createGemini({ apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL || DEFAULT_MODEL }).check();
    console.log("Gemini model and structured generation check passed."); return;
  }
  const port = process.env.PORT == null ? 3000 : Number(process.env.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw coded("INVALID_REQUEST");
  const server = createServer();
  server.on("error", () => { console.error("Mentor server could not start. Check that PORT is available."); process.exitCode = 1; });
  server.listen(port, "127.0.0.1", () => console.log("Mentor: http://127.0.0.1:" + port));
}
if (require.main === module) main().catch(cause => { console.error("Mentor: " + (SAFE_CODES.has(cause.code) ? cause.code : "STARTUP_ERROR")); process.exitCode = 1; });
module.exports = { createServer, loadEnvironment };
