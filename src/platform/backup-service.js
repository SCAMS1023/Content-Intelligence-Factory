(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else (root.TSVF = root.TSVF || {}).BackupService = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const FORMAT = "content-intelligence-factory-backup";
  const FORMAT_VERSION = 1;
  const MAX_IMPORT_BYTES = 4 * 1024 * 1024;
  const LEGACY_KEYS = ["tsvf.library.v2", "tsvf.trash.v2", "tsvf.draft.v2", "tsvf.prefs.v2"];

  function bytes(value) { return new TextEncoder().encode(String(value)).length; }
  function create(adapter, options) {
    const storage = adapter || (typeof localStorage !== "undefined" ? localStorage : null);
    const keys = (options && options.keys) || LEGACY_KEYS;
    function snapshot() {
      const records = {};
      keys.forEach(function (key) { const value = storage && storage.getItem(key); if (value !== null && value !== undefined) records[key] = value; });
      return { format: FORMAT, formatVersion: FORMAT_VERSION, createdAt: new Date().toISOString(), records: records };
    }
    function exportText() {
      if (!storage) throw new Error("Persistent browser storage is unavailable");
      return JSON.stringify(snapshot(), null, 2);
    }
    function validate(text) {
      const errors = [];
      if (typeof text !== "string") return { valid: false, errors: ["backup must be text"] };
      if (bytes(text) > MAX_IMPORT_BYTES) return { valid: false, errors: ["backup exceeds the 4 MB safety limit"] };
      let parsed;
      try { parsed = JSON.parse(text); } catch (error) { return { valid: false, errors: ["backup is not valid JSON"] }; }
      if (!parsed || parsed.format !== FORMAT || parsed.formatVersion !== FORMAT_VERSION || !parsed.records || typeof parsed.records !== "object") errors.push("unsupported backup format");
      if (!errors.length) {
        Object.keys(parsed.records).forEach(function (key) {
          if (keys.indexOf(key) < 0) errors.push("unexpected storage key: " + key);
          if (typeof parsed.records[key] !== "string") errors.push("record must be serialized JSON: " + key);
          else { try { JSON.parse(parsed.records[key]); } catch (error) { errors.push("record contains invalid JSON: " + key); } }
        });
      }
      return { valid: errors.length === 0, errors: errors, value: parsed };
    }
    function restore(text) {
      if (!storage) return { ok: false, error: "Persistent browser storage is unavailable" };
      const result = validate(text);
      if (!result.valid) return { ok: false, error: result.errors.join("; ") };
      const before = {};
      keys.forEach(function (key) { before[key] = storage.getItem(key); });
      try {
        keys.forEach(function (key) {
          if (Object.prototype.hasOwnProperty.call(result.value.records, key)) storage.setItem(key, result.value.records[key]);
          else storage.removeItem(key);
        });
        return { ok: true, restoredKeys: Object.keys(result.value.records) };
      } catch (error) {
        try { keys.forEach(function (key) { if (before[key] === null) storage.removeItem(key); else storage.setItem(key, before[key]); }); } catch (rollbackError) {}
        return { ok: false, error: String(error) };
      }
    }
    function usage() {
      const used = keys.reduce(function (total, key) { const value = storage && storage.getItem(key); return total + (value ? bytes(key) + bytes(value) : 0); }, 0);
      return { usedBytes: used, importLimitBytes: MAX_IMPORT_BYTES };
    }
    return { snapshot: snapshot, exportText: exportText, validate: validate, restore: restore, usage: usage };
  }
  return { FORMAT: FORMAT, FORMAT_VERSION: FORMAT_VERSION, MAX_IMPORT_BYTES: MAX_IMPORT_BYTES, LEGACY_KEYS: LEGACY_KEYS, create: create };
});
