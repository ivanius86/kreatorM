(function (root) {
  "use strict";

  const namespace = root.MentorDataPhase0 = root.MentorDataPhase0 || {};

  function utf8Bytes(value) {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(String(value));
    const encoded = unescape(encodeURIComponent(String(value)));
    return Uint8Array.from(encoded, (character) => character.charCodeAt(0));
  }

  function toHex(buffer) {
    return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function canonicalize(value) {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (!value || typeof value !== "object") return value;
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = canonicalize(value[key]);
      return result;
    }, {});
  }

  function stableStringify(value) {
    return JSON.stringify(canonicalize(value));
  }

  async function toBytes(value) {
    if (typeof value === "string") return utf8Bytes(value);
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    if (value && typeof value.arrayBuffer === "function") return new Uint8Array(await value.arrayBuffer());
    return utf8Bytes(stableStringify(value));
  }

  async function sha256(value, cryptoApi) {
    const api = cryptoApi || root.crypto;
    if (!api?.subtle?.digest) {
      const error = new Error("Web Crypto SHA-256 is unavailable.");
      error.code = "CHECKSUM_UNAVAILABLE";
      throw error;
    }
    const bytes = await toBytes(value);
    const digest = await api.subtle.digest("SHA-256", bytes);
    return { algorithm: "SHA-256", hex: toHex(digest), byteSize: bytes.byteLength };
  }

  function byteSize(value) {
    if (typeof value === "string") return utf8Bytes(value).byteLength;
    if (typeof value?.size === "number") return value.size;
    if (value instanceof ArrayBuffer) return value.byteLength;
    if (ArrayBuffer.isView(value)) return value.byteLength;
    return utf8Bytes(stableStringify(value)).byteLength;
  }

  namespace.BackupChecksumService = Object.freeze({
    byteSize,
    canonicalize,
    stableStringify,
    sha256
  });
})(typeof window !== "undefined" ? window : globalThis);
