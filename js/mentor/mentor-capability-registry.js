(function (root) {
  "use strict";
  const capabilities = new Map();
  function fail(code) { const error = new Error(code); error.code = code; throw error; }
  function register(definition) {
    if (!definition || !/^[a-z][a-zA-Z0-9]*(?:\.[a-z][a-zA-Z0-9]*)+$/.test(definition.id) || capabilities.has(definition.id) ||
        !definition.module || !definition.description || !definition.inputSchema || !definition.permissions ||
        !["read", "write"].includes(definition.type) || typeof definition.match !== "function" || typeof definition.adapter !== "function" ||
        (definition.type === "write" && [definition.prepare, definition.preflight, definition.inputFor].some(value => typeof value !== "function"))) fail("INVALID_CAPABILITY");
    capabilities.set(definition.id, Object.freeze({ ...definition }));
  }
  function get(id) { return capabilities.get(id) || null; }
  function matches(text, context) {
    const result = [];
    for (const capability of capabilities.values()) {
      const input = capability.match(text, context);
      if (input) result.push({ capability, input });
    }
    return result;
  }
  function resolve(text, context) {
    const found = matches(text, context);
    return found.length === 1 ? found[0] : null;
  }
  function validateInput(schema, input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) fail("INVALID_CAPABILITY_INPUT");
    if (Object.keys(input).some(key => !Object.hasOwn(schema.properties, key))) fail("INVALID_CAPABILITY_INPUT");
    for (const [key, spec] of Object.entries(schema.properties)) {
      const value = input[key];
      if (value == null) { if (schema.required?.includes(key)) fail("INVALID_CAPABILITY_INPUT"); continue; }
      if (spec.type !== typeof value || (spec.type === "number" && !Number.isFinite(value)) || (spec.maxLength && value.length > spec.maxLength)) fail("INVALID_CAPABILITY_INPUT");
    }
  }
  async function execute(id, input, { authorize, signal, confirmed = false } = {}) {
    const capability = get(id);
    if (!capability) fail("UNKNOWN_CAPABILITY");
    validateInput(capability.inputSchema, input);
    if (capability.type === "write" && confirmed !== true) fail("CAPABILITY_CONFIRMATION_REQUIRED");
    if (signal?.aborted) fail("CANCELLED");
    if (typeof authorize !== "function" || await authorize(capability, input) !== true) fail("CAPABILITY_PERMISSION_DENIED");
    if (signal?.aborted) fail("CANCELLED");
    return capability.adapter(input, { signal });
  }
  root.MentorCapabilityRegistry = Object.freeze({ register, get, matches, resolve, execute });
})(window);
