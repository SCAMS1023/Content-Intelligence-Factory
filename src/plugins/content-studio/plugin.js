(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else (root.TSVF = root.TSVF || {}).ContentStudioPlugin = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  return Object.freeze({ id: "content-studio", name: "Content Studio", version: "1.0.0", description: "Deterministic cross-platform content generation with optional providers.", dependencies: [], routes: ["content-studio"], services: { studio: "ContentStudio" }, storageSchema: { version: 1 }, capabilities: ["profiles", "presets", "variants", "field-locks", "history", "favorites", "batch-generation", "provider-adapter"], enabled: false });
});
