(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./versioned-storage.js"), require("../schemas/records.js"));
  else (root.TSVF = root.TSVF || {}).DatabaseRepository = factory(root.TSVF.VersionedStorage, root.TSVF.RecordSchemas);
})(typeof globalThis !== "undefined" ? globalThis : this, function (VersionedStorage, Schemas) {
  "use strict";
  const KEY = "cif.database.v1";
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function create(adapter) {
    const storage = VersionedStorage.create({ key: KEY, version: 1, adapter: adapter });
    function read() {
      const data = storage.read(null);
      if (data && Schemas.validateDatabase(data).valid) return data;
      return Schemas.emptyDatabase();
    }
    function commit(data) {
      const result = Schemas.validateDatabase(data);
      if (!result.valid) return { ok: false, error: result.errors.join("; ") };
      return storage.write(data);
    }
    return {
      key: KEY,
      read: read,
      replace: function (data) { return commit(clone(data)); },
      list: function (collection) { const data = read(); return Array.isArray(data[collection]) ? clone(data[collection]) : []; },
      upsert: function (collection, record) {
        const data = read();
        if (!Array.isArray(data[collection])) return { ok: false, error: "Unknown collection: " + collection };
        if (!record || !record.id) return { ok: false, error: "Record id is required" };
        const index = data[collection].findIndex(function (item) { return item.id === record.id; });
        if (index >= 0) data[collection][index] = clone(record); else data[collection].push(clone(record));
        const result = commit(data); return Object.assign(result, { replaced: index >= 0 });
      },
      backup: function () { return storage.backup(read()); },
      restore: function (text) { const result = storage.restore(text); if (!result.ok) return result; const valid = Schemas.validateDatabase(result.data); return valid.valid ? result : { ok: false, error: valid.errors.join("; ") }; },
      lastError: storage.lastError
    };
  }
  return { KEY: KEY, create: create };
});
