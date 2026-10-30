(function (root) {
  "use strict";

  root.MentorStorageAdapterContract = Object.freeze({
    assert(adapter) {
      ["read", "write", "remove", "readRaw"].forEach((method) => {
        if (typeof adapter?.[method] !== "function") throw new TypeError(`Storage adapter is missing ${method}().`);
      });
      return adapter;
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
