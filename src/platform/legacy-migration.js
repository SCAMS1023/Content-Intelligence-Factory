(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else (root.TSVF = root.TSVF || {}).LegacyMigration = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const MARKER = "cif.migration.tsvf-v2.v1";
  function parse(adapter, key, fallback) { try { const raw = adapter.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (error) { return fallback; } }
  function run(adapter, repository) {
    if (!adapter || !repository) return { ok: false, error: "Storage and repository are required" };
    if (adapter.getItem(MARKER)) return { ok: true, skipped: true, imported: 0 };
    const library = parse(adapter, "tsvf.library.v2", []);
    const prefs = parse(adapter, "tsvf.prefs.v2", {});
    const database = repository.read();
    let imported = 0;
    (Array.isArray(library) ? library : []).forEach(function (entry) {
      if (!entry || !entry.id || database.products.some(function (item) { return item.id === entry.id; })) return;
      database.products.push(Object.assign({ sourcePlugin: "tiktok-shop", migratedFrom: "tsvf.library.v2" }, entry)); imported++;
    });
    database.preferences = Object.assign({}, prefs, database.preferences || {});
    const saved = repository.replace(database);
    if (!saved.ok) return saved;
    try { adapter.setItem(MARKER, JSON.stringify({ completedAt: new Date().toISOString(), imported: imported })); }
    catch (error) { return { ok: false, error: String(error) }; }
    return { ok: true, skipped: false, imported: imported };
  }
  return { MARKER: MARKER, run: run };
});
