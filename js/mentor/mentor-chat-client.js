(function (root) {
  "use strict";

  async function chat(request, signal) {
    const response = await fetch("/api/mentor/chat", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request), signal
    });
    let result;
    try { result = await response.json(); }
    catch (_) {
      const error = new Error();
      error.code = response.ok ? "INVALID_RESPONSE" : "NETWORK";
      throw error;
    }
    if (!response.ok) {
      const error = new Error();
      error.code = result?.error?.code || "NETWORK";
      throw error;
    }
    return result;
  }

  async function status() {
    const response = await fetch("/api/mentor/status");
    return response.ok ? response.json() : null;
  }

  async function route(text, signal) {
    const response = await fetch("/api/mentor/route", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }), signal });
    let result;
    try { result = await response.json(); }
    catch (_) { const error = new Error("INVALID_RESPONSE"); error.code = "INVALID_RESPONSE"; throw error; }
    if (!response.ok) { const error = new Error(result?.error?.code || "NETWORK"); error.code = result?.error?.code || "NETWORK"; throw error; }
    return result;
  }

  async function food(operation, value, signal) {
    const key = { search: "text", details: "id", verify: "token" }[operation];
    if (!key) throw Object.assign(new Error("INVALID_REQUEST"), { code: "INVALID_REQUEST" });
    const response = await fetch("/api/mentor/foods/" + operation, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: value }), signal });
    let result; try { result = await response.json(); } catch (_) { throw Object.assign(new Error("INVALID_RESPONSE"), { code: "INVALID_RESPONSE" }); }
    if (!response.ok) throw Object.assign(new Error(result?.error?.code || "NETWORK"), { code: result?.error?.code || "NETWORK" });
    return result;
  }
  root.MentorChatClient = Object.freeze({ chat, status, route, food });
})(window);
