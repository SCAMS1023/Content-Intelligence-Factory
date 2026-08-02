(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else (root.TSVF = root.TSVF || {}).RecordSchemas = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const TYPES = ["products", "brandProfiles", "projects", "campaigns", "contentPacks", "research", "sources", "performance", "compliance", "preferences"];
  function emptyDatabase() {
    const data = { schemaVersion: 1 };
    TYPES.forEach(function (type) { data[type] = type === "preferences" ? {} : []; });
    return data;
  }
  function validateDatabase(value) {
    const errors = [];
    if (!value || typeof value !== "object" || Array.isArray(value)) return { valid: false, errors: ["database must be an object"] };
    if (value.schemaVersion !== 1) errors.push("unsupported database schemaVersion");
    TYPES.forEach(function (type) {
      const expectedObject = type === "preferences";
      if (expectedObject ? (!value[type] || typeof value[type] !== "object" || Array.isArray(value[type])) : !Array.isArray(value[type])) errors.push(type + " has an invalid type");
    });
    return { valid: errors.length === 0, errors: errors };
  }
  return { TYPES: TYPES, emptyDatabase: emptyDatabase, validateDatabase: validateDatabase };
});
