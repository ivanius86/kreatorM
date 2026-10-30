(function (root) {
  "use strict";

  const namespace = root.MentorDataPhase0 = root.MentorDataPhase0 || {};

  function createManifest(input) {
    const format = namespace.BackupFormat;
    return {
      backupFormat: format.id,
      backupVersion: format.version,
      createdAt: input.createdAt,
      appVersion: input.appVersion || "unknown",
      sourceMode: input.sourceMode || format.sourceMode,
      database: input.database || { name: null, structuralVersion: null, dataVersion: 1 },
      entries: (input.entries || []).map((entry) => ({
        path: entry.path,
        contentType: entry.contentType,
        byteSize: Number(entry.byteSize || 0),
        sha256: entry.sha256,
        recordCount: Number(entry.recordCount || 0)
      })),
      domains: Object.fromEntries(Object.entries(input.domains || {}).map(([domain, summary]) => [
        domain,
        {
          version: Number(summary.version),
          count: Number(summary.count || 0),
          checksum: summary.checksum
        }
      ])),
      rawSources: Object.fromEntries(Object.entries(input.rawSources || {}).map(([key, summary]) => [
        key,
        {
          byteSize: Number(summary.byteSize || 0),
          sha256: summary.sha256
        }
      ])),
      media: {
        recordCount: Number(input.media?.recordCount || 0),
        blobCount: Number(input.media?.blobCount || 0),
        totalBytes: Number(input.media?.totalBytes || 0)
      }
    };
  }

  function validateManifest(manifest) {
    const errors = [];
    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) return { valid: false, errors: ["MANIFEST_OBJECT_REQUIRED"] };
    if (manifest.backupFormat !== namespace.BackupFormat.id) errors.push("BACKUP_FORMAT_UNSUPPORTED");
    if (manifest.backupVersion !== namespace.BackupFormat.version) errors.push("BACKUP_VERSION_UNSUPPORTED");
    if (!manifest.createdAt || Number.isNaN(Date.parse(manifest.createdAt))) errors.push("CREATED_AT_INVALID");
    if (!Array.isArray(manifest.entries)) errors.push("ENTRIES_ARRAY_REQUIRED");
    else {
      const paths = new Set();
      manifest.entries.forEach((entry, index) => {
        if (!entry?.path) errors.push(`ENTRY_PATH_REQUIRED:${index}`);
        else if (paths.has(entry.path)) errors.push(`ENTRY_PATH_DUPLICATE:${entry.path}`);
        else paths.add(entry.path);
        if (!/^[a-f0-9]{64}$/i.test(String(entry?.sha256 || ""))) errors.push(`ENTRY_CHECKSUM_INVALID:${entry?.path || index}`);
        if (!Number.isFinite(entry?.byteSize) || entry.byteSize < 0) errors.push(`ENTRY_SIZE_INVALID:${entry?.path || index}`);
      });
      Object.entries(manifest.domains || {}).forEach(([domain, summary]) => {
        const path = `data/${domain}.json`;
        const entry = manifest.entries.find((item) => item.path === path);
        if (summary?.version !== 1) errors.push(`DOMAIN_VERSION_UNSUPPORTED:${domain}`);
        if (!Number.isFinite(summary?.count) || summary.count < 0) errors.push(`DOMAIN_COUNT_INVALID:${domain}`);
        if (!/^[a-f0-9]{64}$/i.test(String(summary?.checksum || ""))) errors.push(`DOMAIN_CHECKSUM_INVALID:${domain}`);
        if (!entry) errors.push(`DOMAIN_ENTRY_MISSING:${domain}`);
        else {
          if (summary.checksum !== entry.sha256) errors.push(`DOMAIN_ENTRY_CHECKSUM_MISMATCH:${domain}`);
          if (summary.count !== entry.recordCount) errors.push(`DOMAIN_ENTRY_COUNT_MISMATCH:${domain}`);
        }
      });
    }
    if (manifest.rawSources !== undefined && (!manifest.rawSources || typeof manifest.rawSources !== "object" || Array.isArray(manifest.rawSources))) {
      errors.push("RAW_SOURCES_SUMMARY_INVALID");
    } else {
      Object.entries(manifest.rawSources || {}).forEach(([key, summary]) => {
        if (!key) errors.push("RAW_SOURCE_KEY_REQUIRED");
        if (!Number.isFinite(summary?.byteSize) || summary.byteSize < 0) errors.push(`RAW_SOURCE_SIZE_INVALID:${key}`);
        if (!/^[a-f0-9]{64}$/i.test(String(summary?.sha256 || ""))) errors.push(`RAW_SOURCE_CHECKSUM_INVALID:${key}`);
      });
    }
    if (!manifest.media || typeof manifest.media !== "object") errors.push("MEDIA_SUMMARY_REQUIRED");
    return { valid: errors.length === 0, errors };
  }

  namespace.BackupManifestSchema = Object.freeze({ createManifest, validateManifest });
})(typeof window !== "undefined" ? window : globalThis);
