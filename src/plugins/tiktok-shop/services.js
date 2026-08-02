(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else (root.TSVF = root.TSVF || {}).TikTokShopServices = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function create(dependencies) {
    const d = dependencies || {};
    ["Validation", "Scoring", "Pack", "Compliance"].forEach(function (name) { if (!d[name]) throw new Error("Missing TikTok service dependency: " + name); });
    return Object.freeze({
      normalizeProduct: d.Validation.normalize,
      scoreProduct: d.Scoring.score,
      generatePack: d.Pack.build,
      scanText: d.Compliance.scanText,
      capabilities: ["product-scoring", "content-pack", "claim-scan"]
    });
  }
  return { create: create };
});
