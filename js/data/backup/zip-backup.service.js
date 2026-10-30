(function (root) {
  "use strict";

  const namespace = root.MentorDataPhase0 = root.MentorDataPhase0 || {};
  const DEFAULT_LIMITS = Object.freeze({
    maxEntries: 10000,
    maxManifestBytes: 5 * 1024 * 1024,
    maxEntryBytes: 512 * 1024 * 1024,
    maxTotalBytes: 2 * 1024 * 1024 * 1024
  });

  function requireLibrary(library) {
    const fflate = library || root.fflate;
    if (!fflate?.zip || !fflate?.unzip || !fflate?.strToU8 || !fflate?.strFromU8) {
      const error = new Error("The locally installed fflate library is required.");
      error.code = "ZIP_LIBRARY_UNAVAILABLE";
      throw error;
    }
    return fflate;
  }

  async function toBytes(value) {
    if (typeof value === "string") {
      if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(value);
      return Uint8Array.from(unescape(encodeURIComponent(value)), (character) => character.charCodeAt(0));
    }
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    if (value && typeof value.arrayBuffer === "function") return new Uint8Array(await value.arrayBuffer());
    const error = new Error("ZIP entry data type is unsupported.");
    error.code = "ZIP_ENTRY_TYPE_UNSUPPORTED";
    throw error;
  }

  function safeArchivePath(path) {
    const value = String(path || "");
    if (!value || value.startsWith("/") || value.startsWith("\\") || value.includes("\\") || /^[a-z]:/i.test(value)) return false;
    return value.split("/").every((segment) => segment && segment !== "." && segment !== "..");
  }

  function zipAsync(fflate, entries, options) {
    return new Promise((resolve, reject) => {
      fflate.zip(entries, options, (error, data) => {
        if (error) return reject(error);
        resolve(data);
      });
    });
  }

  function unzipAsync(fflate, bytes, options) {
    return new Promise((resolve, reject) => {
      fflate.unzip(bytes, options || {}, (error, data) => {
        if (error) return reject(error);
        resolve(data);
      });
    });
  }

  function structuredRecordCount(value) {
    if (Array.isArray(value)) return value.length;
    if (Array.isArray(value?.records)) return value.records.length;
    if (Array.isArray(value?.goals)) return value.goals.length;
    if (Array.isArray(value?.events)) return value.events.length;
    return value === null || value === undefined ? 0 : 1;
  }

  async function packPreparedBundle(bundle, options) {
    const fflate = requireLibrary(options?.fflate);
    const validation = await namespace.BackupValidationService.validatePreparedBundle(bundle, {
      checksumService: options?.checksumService,
      cryptoApi: options?.cryptoApi
    });
    if (!validation.valid) {
      const error = new Error("Prepared backup bundle is invalid.");
      error.code = "BACKUP_BUNDLE_INVALID";
      error.details = validation.errors;
      throw error;
    }

    const files = {};
    for (const entry of [...bundle.jsonEntries, ...bundle.binaryEntries]) {
      if (!safeArchivePath(entry.path)) {
        const error = new Error("Unsafe ZIP entry path.");
        error.code = "ZIP_ENTRY_PATH_UNSAFE";
        throw error;
      }
      const bytes = await toBytes(entry.data);
      files[entry.path] = [bytes, {
        level: entry.contentType === "application/json" ? 6 : 0,
        mtime: new Date("1980-01-01T00:00:00.000Z")
      }];
    }
    const zipOptions = {
      level: 6,
      mtime: new Date("1980-01-01T00:00:00.000Z")
    };
    const bytes = options?.synchronous
      ? fflate.zipSync(files, zipOptions)
      : await zipAsync(fflate, files, zipOptions);
    const timestamp = String(bundle.createdAt || new Date().toISOString()).replace(/[:.]/g, "");
    return {
      filename: `kreatorm-backup-${timestamp}.zip`,
      contentType: "application/zip",
      byteSize: bytes.byteLength,
      bytes,
      blob: typeof Blob !== "undefined" ? new Blob([bytes], { type: "application/zip" }) : null
    };
  }

  async function readAndValidateZip(zipValue, options) {
    const fflate = requireLibrary(options?.fflate);
    const checksumService = options?.checksumService || namespace.BackupChecksumService;
    const cryptoApi = options?.cryptoApi;
    const limits = { ...DEFAULT_LIMITS, ...(options?.limits || {}) };
    const zipBytes = await toBytes(zipValue);

    const manifestFilter = {
      filter(file) {
        return file.name === namespace.BackupFormat.manifestPath
          && Number(file.originalSize || 0) <= limits.maxManifestBytes;
      }
    };
    const manifestOnly = options?.synchronous
      ? fflate.unzipSync(zipBytes, manifestFilter)
      : await unzipAsync(fflate, zipBytes, manifestFilter);
    const manifestBytes = manifestOnly[namespace.BackupFormat.manifestPath];
    if (!manifestBytes) {
      const error = new Error("ZIP manifest is missing or exceeds its size limit.");
      error.code = "ZIP_MANIFEST_MISSING";
      throw error;
    }

    let manifest;
    try {
      manifest = JSON.parse(fflate.strFromU8(manifestBytes));
    } catch (_) {
      const error = new Error("ZIP manifest JSON is invalid.");
      error.code = "ZIP_MANIFEST_INVALID_JSON";
      throw error;
    }
    const manifestValidation = namespace.BackupManifestSchema.validateManifest(manifest);
    if (!manifestValidation.valid) {
      const error = new Error("ZIP manifest is invalid.");
      error.code = "ZIP_MANIFEST_INVALID";
      error.details = manifestValidation.errors;
      throw error;
    }
    if (manifest.entries.length > limits.maxEntries) {
      const error = new Error("ZIP contains too many entries.");
      error.code = "ZIP_ENTRY_LIMIT_EXCEEDED";
      throw error;
    }

    const expected = new Map(manifest.entries.map((entry) => [entry.path, entry]));
    const totalExpected = manifest.entries.reduce((total, entry) => total + Number(entry.byteSize || 0), 0);
    if (totalExpected > limits.maxTotalBytes || manifest.entries.some((entry) => entry.byteSize > limits.maxEntryBytes)) {
      const error = new Error("ZIP declared size exceeds safety limits.");
      error.code = "ZIP_SIZE_LIMIT_EXCEEDED";
      throw error;
    }
    for (const path of expected.keys()) {
      if (!safeArchivePath(path) || path === namespace.BackupFormat.manifestPath) {
        const error = new Error("ZIP manifest contains an unsafe path.");
        error.code = "ZIP_ENTRY_PATH_UNSAFE";
        throw error;
      }
    }

    const archiveFilter = {
      filter(file) {
        if (file.name === namespace.BackupFormat.manifestPath) return true;
        const entry = expected.get(file.name);
        return Boolean(entry) && Number(file.originalSize || 0) === Number(entry.byteSize);
      }
    };
    const files = options?.synchronous
      ? fflate.unzipSync(zipBytes, archiveFilter)
      : await unzipAsync(fflate, zipBytes, archiveFilter);
    const errors = [];
    for (const [path, entry] of expected.entries()) {
      const data = files[path];
      if (!data) {
        errors.push(`ZIP_ENTRY_MISSING:${path}`);
        continue;
      }
      const checksum = await checksumService.sha256(data, cryptoApi);
      if (checksum.byteSize !== entry.byteSize) errors.push(`ZIP_ENTRY_SIZE_MISMATCH:${path}`);
      if (checksum.hex !== entry.sha256) errors.push(`ZIP_ENTRY_CHECKSUM_MISMATCH:${path}`);
    }
    if (Object.keys(manifest.rawSources || {}).length) {
      try {
        const rawDocument = JSON.parse(fflate.strFromU8(files[namespace.BackupFormat.rawLocalStoragePath]));
        for (const [key, summary] of Object.entries(manifest.rawSources)) {
          const raw = rawDocument?.sources?.[key];
          if (typeof raw !== "string") {
            errors.push(`ZIP_RAW_SOURCE_MISSING:${key}`);
            continue;
          }
          const rawChecksum = await checksumService.sha256(raw, cryptoApi);
          if (rawChecksum.byteSize !== summary.byteSize) errors.push(`ZIP_RAW_SOURCE_SIZE_MISMATCH:${key}`);
          if (rawChecksum.hex !== summary.sha256) errors.push(`ZIP_RAW_SOURCE_CHECKSUM_MISMATCH:${key}`);
        }
      } catch (_) {
        errors.push("ZIP_RAW_DOCUMENT_INVALID");
      }
    }
    for (const [domain, summary] of Object.entries(manifest.domains || {})) {
      const path = `data/${domain}.json`;
      try {
        const value = JSON.parse(fflate.strFromU8(files[path]));
        if (Number(value?.version) !== summary.version) errors.push(`ZIP_DOMAIN_VERSION_MISMATCH:${domain}`);
        if (structuredRecordCount(value) !== summary.count) errors.push(`ZIP_DOMAIN_COUNT_MISMATCH:${domain}`);
      } catch (_) {
        errors.push(`ZIP_DOMAIN_JSON_INVALID:${domain}`);
      }
    }
    const extractedPaths = Object.keys(files).filter((path) => path !== namespace.BackupFormat.manifestPath);
    if (extractedPaths.length !== expected.size) errors.push("ZIP_ENTRY_COUNT_MISMATCH");
    if (errors.length) {
      const error = new Error("ZIP backup validation failed.");
      error.code = "ZIP_VALIDATION_FAILED";
      error.details = errors;
      throw error;
    }
    return {
      status: "valid",
      manifest,
      files,
      zipByteSize: zipBytes.byteLength
    };
  }

  namespace.ZipBackupService = Object.freeze({
    packPreparedBundle,
    readAndValidateZip,
    safeArchivePath,
    limits: DEFAULT_LIMITS
  });
})(typeof window !== "undefined" ? window : globalThis);
