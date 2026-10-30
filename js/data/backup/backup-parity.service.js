(function (root) {
  "use strict";

  const namespace = root.MentorDataPhase0 = root.MentorDataPhase0 || {};

  function recordCount(value) {
    if (Array.isArray(value)) return value.length;
    if (value === null || value === undefined) return 0;
    if (Array.isArray(value.records)) return value.records.length;
    if (Array.isArray(value.goals)) return value.goals.length;
    if (Array.isArray(value.events)) return value.events.length;
    return 1;
  }

  function idSet(value) {
    const records = Array.isArray(value)
      ? value
      : Array.isArray(value?.records)
        ? value.records
        : Array.isArray(value?.goals)
          ? value.goals
          : Array.isArray(value?.events)
            ? value.events
            : [];
    return records.map((item) => String(item?.id ?? item?.key ?? "")).filter(Boolean).sort();
  }

  async function checksum(value, service, cryptoApi) {
    return (await service.sha256(service.stableStringify(value), cryptoApi)).hex;
  }

  async function mediaFingerprint(record, service, cryptoApi) {
    return {
      id: String(record.id),
      blobChecksum: (await service.sha256(record.blob, cryptoApi)).hex,
      blobSize: Number(record.blob?.size ?? record.blob?.byteLength ?? 0),
      thumbnailChecksum: record.thumbnail ? (await service.sha256(record.thumbnail, cryptoApi)).hex : null,
      thumbnailSize: Number(record.thumbnail?.size ?? record.thumbnail?.byteLength ?? 0)
    };
  }

  async function verify(input, options) {
    const service = options?.checksumService || namespace.BackupChecksumService;
    const cryptoApi = options?.cryptoApi;
    const errors = [];
    const domains = [];
    const restoredStores = input.restored?.stores || {};

    for (const [backupDomain, expectedValue] of Object.entries(input.expectedDomains || {})) {
      const store = namespace.IsolatedRestoreService.domainPaths[`data/${backupDomain}.json`];
      const actualValue = restoredStores[store];
      const expectedChecksum = await checksum(expectedValue, service, cryptoApi);
      const actualChecksum = await checksum(actualValue, service, cryptoApi);
      const expectedIds = idSet(expectedValue);
      const actualIds = idSet(actualValue);
      const result = {
        domain: backupDomain,
        expectedChecksum,
        actualChecksum,
        expectedRecordCount: recordCount(expectedValue),
        actualRecordCount: recordCount(actualValue),
        expectedIds,
        actualIds
      };
      if (expectedChecksum !== actualChecksum) errors.push(`DOMAIN_CHECKSUM_MISMATCH:${backupDomain}`);
      if (result.expectedRecordCount !== result.actualRecordCount) errors.push(`DOMAIN_RECORD_COUNT_MISMATCH:${backupDomain}`);
      if (JSON.stringify(expectedIds) !== JSON.stringify(actualIds)) errors.push(`DOMAIN_ID_SET_MISMATCH:${backupDomain}`);
      domains.push(result);
    }

    const expectedMedia = [];
    for (const record of input.expectedMedia || []) expectedMedia.push(await mediaFingerprint(record, service, cryptoApi));
    const actualMedia = [];
    for (const record of input.restored?.media || []) actualMedia.push(await mediaFingerprint(record, service, cryptoApi));
    expectedMedia.sort((left, right) => left.id.localeCompare(right.id));
    actualMedia.sort((left, right) => left.id.localeCompare(right.id));
    if (JSON.stringify(expectedMedia) !== JSON.stringify(actualMedia)) errors.push("MEDIA_PARITY_MISMATCH");

    return {
      valid: errors.length === 0,
      errors,
      domains,
      media: {
        expectedRecordCount: expectedMedia.length,
        actualRecordCount: actualMedia.length,
        expectedIds: expectedMedia.map((item) => item.id),
        actualIds: actualMedia.map((item) => item.id),
        expected: expectedMedia,
        actual: actualMedia
      }
    };
  }

  namespace.BackupParityService = Object.freeze({ verify, recordCount, idSet });
})(typeof window !== "undefined" ? window : globalThis);
