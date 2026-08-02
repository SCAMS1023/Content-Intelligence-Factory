"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Schemas = require("../src/schemas/records.js");
const Backups = require("../src/platform/backup-service.js");

function adapter(failKey) {
  const data = Object.create(null);
  return { getItem: key => Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null, setItem: (key, value) => { if (key === failKey) throw new Error("QuotaExceededError"); data[key] = String(value); }, removeItem: key => { delete data[key]; }, data };
}

test("empty shared database satisfies every record collection schema", () => {
  const db = Schemas.emptyDatabase();
  assert.equal(Schemas.validateDatabase(db).valid, true);
  assert.deepEqual(Object.keys(db).sort(), Schemas.TYPES.concat("schemaVersion").sort());
});

test("backup round-trips existing legacy storage exactly", () => {
  const a = adapter(); a.setItem("tsvf.library.v2", JSON.stringify([{ id: "p1" }])); a.setItem("tsvf.prefs.v2", JSON.stringify({ theme: "dark" }));
  const service = Backups.create(a); const text = service.exportText();
  a.setItem("tsvf.library.v2", "[]");
  const result = service.restore(text);
  assert.equal(result.ok, true); assert.deepEqual(JSON.parse(a.getItem("tsvf.library.v2")), [{ id: "p1" }]);
});

test("backup rejects malformed, oversized, unknown-key and corrupt records before writing", () => {
  const a = adapter(); a.setItem("tsvf.library.v2", "[]"); const service = Backups.create(a);
  const original = a.getItem("tsvf.library.v2");
  ["{bad", "x".repeat(Backups.MAX_IMPORT_BYTES + 1), JSON.stringify({ format: Backups.FORMAT, formatVersion: 1, records: { evil: "[]" } }), JSON.stringify({ format: Backups.FORMAT, formatVersion: 1, records: { "tsvf.library.v2": "{bad" } })].forEach(text => assert.equal(service.restore(text).ok, false));
  assert.equal(a.getItem("tsvf.library.v2"), original);
});

test("failed restore rolls back every previously written key", () => {
  const a = adapter("tsvf.trash.v2"); a.data["tsvf.library.v2"] = "[1]"; a.data["tsvf.trash.v2"] = "[2]";
  const service = Backups.create(a); const text = JSON.stringify({ format: Backups.FORMAT, formatVersion: 1, records: { "tsvf.library.v2": "[3]", "tsvf.trash.v2": "[4]" } });
  assert.equal(service.restore(text).ok, false); assert.equal(a.getItem("tsvf.library.v2"), "[1]"); assert.equal(a.getItem("tsvf.trash.v2"), "[2]");
});
