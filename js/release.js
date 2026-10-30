(function exposeKreatormRelease(root) {
  "use strict";

  const release = Object.freeze({
    version: "1.0.0",
    build: "20260730.1",
    releaseId: "1.0.0+build.20260730.1",
    storageDatabase: "kreatorm_app_db",
    storageStructuralVersion: 1
  });

  Object.defineProperty(root, "KREATORM_RELEASE", {
    value: release,
    enumerable: true,
    configurable: false,
    writable: false
  });
  Object.defineProperty(root, "MENTOR_APP_VERSION", {
    value: release.releaseId,
    enumerable: true,
    configurable: false,
    writable: false
  });
})(typeof window !== "undefined" ? window : globalThis);
