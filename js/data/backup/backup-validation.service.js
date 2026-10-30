(function (root) {
  "use strict";

  const namespace = root.MentorDataPhase0 = root.MentorDataPhase0 || {};

  async function validatePreparedBundle(bundle, options) {
    const checksumService = options?.checksumService || namespace.BackupChecksumService;
    const cryptoApi = options?.cryptoApi;
    const errors = [];
    if (!bundle || typeof bundle !== "object") return { valid: false, errors: ["BUNDLE_OBJECT_REQUIRED"] };
    if (bundle.isZip !== false || bundle.requiresZipPacker !== true) errors.push("BUNDLE_PREPARATION_STATE_INVALID");
    const manifestValidation = namespace.BackupManifestSchema.validateManifest(bundle.manifest);
    errors.push(...manifestValidation.errors);

    const allEntries = [...(bundle.jsonEntries || []), ...(bundle.binaryEntries || [])];
    const manifestByPath = new Map((bundle.manifest?.entries || []).map((entry) => [entry.path, entry]));
    const actualPaths = new Set();
    for (const entry of allEntries) {
      if (actualPaths.has(entry.path)) errors.push(`BUNDLE_PATH_DUPLICATE:${entry.path}`);
      actualPaths.add(entry.path);
      if (entry.path === namespace.BackupFormat.manifestPath) continue;
      const expected = manifestByPath.get(entry.path);
      if (!expected) {
        errors.push(`MANIFEST_ENTRY_MISSING:${entry.path}`);
        continue;
      }
      try {
        const checksum = await checksumService.sha256(entry.data, cryptoApi);
        if (checksum.hex !== expected.sha256) errors.push(`ENTRY_CHECKSUM_MISMATCH:${entry.path}`);
        if (checksum.byteSize !== expected.byteSize) errors.push(`ENTRY_SIZE_MISMATCH:${entry.path}`);
      } catch (error) {
        errors.push(`${error?.code || "ENTRY_CHECKSUM_FAILED"}:${entry.path}`);
      }
    }
    for (const path of manifestByPath.keys()) {
      if (!actualPaths.has(path)) errors.push(`BUNDLE_ENTRY_MISSING:${path}`);
    }

    return { valid: errors.length === 0, errors };
  }

  namespace.BackupValidationService = Object.freeze({ validatePreparedBundle });
})(typeof window !== "undefined" ? window : globalThis);
