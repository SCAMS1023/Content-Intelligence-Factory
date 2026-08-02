(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else {
    root.TSVF = root.TSVF || {};
    root.TSVF.TikTokShopPlugin = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  return Object.freeze({
    id: "tiktok-shop",
    name: "TikTok Shop Intelligence",
    version: "2.1.0",
    description: "Offline product scoring, content planning, and compliance workflow.",
    dependencies: [],
    routes: ["workbench", "library"],
    services: { scoring: "Scoring", generation: "Pack", compliance: "Compliance" },
    storageSchema: { version: 2, legacyPrefix: "tsvf." },
    capabilities: ["product-scoring", "content-pack", "claim-scan", "local-library", "batch-intake", "scoring-profiles", "evidence", "watchlists", "campaign-assignment", "duplicate-detection", "testing-plans"],
    enabled: true
  });
});
