(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else (root.TSVF = root.TSVF || {}).VersionedStorage = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function memoryAdapter() {
    const values = Object.create(null);
    return { persistent: false, getItem: function (k) { return Object.prototype.hasOwnProperty.call(values, k) ? values[k] : null; }, setItem: function (k, v) { values[k] = String(v); }, removeItem: function (k) { delete values[k]; } };
  }
  function create(options) {
    const key = options.key;
    const currentVersion = options.version;
    const migrations = options.migrations || {};
    let adapter = options.adapter || memoryAdapter();
    let lastError = null;
    function envelope(data) { return { schemaVersion: currentVersion, updatedAt: new Date().toISOString(), data: data }; }
    function migrate(record) {
      let next = record;
      while (next.schemaVersion < currentVersion) {
        const migration = migrations[next.schemaVersion];
        if (typeof migration !== "function") throw new Error("Missing migration from version " + next.schemaVersion);
        next = { schemaVersion: next.schemaVersion + 1, updatedAt: new Date().toISOString(), data: migration(next.data) };
      }
      if (next.schemaVersion > currentVersion) throw new Error("Stored data uses a newer schema");
      return next;
    }
    function read(fallback) {
      try {
        const raw = adapter.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        if (!parsed || !Number.isInteger(parsed.schemaVersion) || !("data" in parsed)) throw new Error("Invalid storage envelope");
        const migrated = migrate(parsed);
        if (migrated.schemaVersion !== parsed.schemaVersion) adapter.setItem(key, JSON.stringify(migrated));
        lastError = null;
        return migrated.data;
      } catch (error) { lastError = error; return fallback; }
    }
    function write(data) {
      try { adapter.setItem(key, JSON.stringify(envelope(data))); lastError = null; return { ok: true }; }
      catch (error) { lastError = error; return { ok: false, error: String(error) }; }
    }
    function backup(data) { return JSON.stringify({ format: "cif-backup", version: 1, createdAt: new Date().toISOString(), stores: { [key]: envelope(data === undefined ? read(null) : data) } }, null, 2); }
    function restore(text) {
      try {
        const parsed = JSON.parse(text);
        if (!parsed || parsed.format !== "cif-backup" || !parsed.stores || !parsed.stores[key]) throw new Error("Invalid backup");
        const migrated = migrate(parsed.stores[key]);
        adapter.setItem(key, JSON.stringify(migrated));
        lastError = null;
        return { ok: true, data: migrated.data };
      } catch (error) { lastError = error; return { ok: false, error: String(error) }; }
    }
    return { read: read, write: write, backup: backup, restore: restore, lastError: function () { return lastError; }, isPersistent: function () { return adapter.persistent !== false; } };
  }
  return { memoryAdapter: memoryAdapter, create: create };
});
