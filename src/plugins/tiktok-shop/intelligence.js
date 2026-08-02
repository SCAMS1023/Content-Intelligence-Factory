(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else (root.TSVF = root.TSVF || {}).TikTokIntelligence = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const LIFECYCLE = ["discovered", "researching", "testing", "scaling", "paused", "retired"];
  const DEFAULT_WEIGHTS = Object.freeze({ commissionQuality: 25, demandMomentum: 18, saturation: 18, priceFit: 12, sellerAuthenticity: 10, adSupport: 9, reviewQuality: 8 });
  function clean(value) { return String(value || "").trim(); }
  function id(prefix) { return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8); }
  function normalizeWeights(weights) {
    const source = Object.assign({}, DEFAULT_WEIGHTS, weights || {}); let total = 0;
    Object.keys(DEFAULT_WEIGHTS).forEach(function (key) { const value = Number(source[key]); if (!Number.isFinite(value) || value < 0) throw new Error("Invalid weight: " + key); source[key] = value; total += value; });
    if (total <= 0) throw new Error("At least one scoring weight must be positive");
    const normalized = {}; Object.keys(DEFAULT_WEIGHTS).forEach(function (key) { normalized[key] = source[key] * 100 / total; });
    return normalized;
  }
  function profile(input) {
    const value = input || {};
    return { id: value.id || id("score"), name: clean(value.name) || "Default opportunity", version: 1, weights: normalizeWeights(value.weights), createdAt: value.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
  }
  function evidence(input) {
    const value = input || {}; const url = clean(value.url);
    if (url && !/^https?:\/\//i.test(url)) throw new Error("Evidence link must use http or https");
    return { id: value.id || id("evidence"), type: clean(value.type) || "manual-note", value: value.value === undefined ? null : value.value, url: url, observedAt: value.observedAt || new Date().toISOString(), source: clean(value.source) || "manual", inferred: value.inferred === true, notes: clean(value.notes) };
  }
  function fingerprint(product) { return [product && product.productName, product && product.brand].map(function (v) { return clean(v).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }).join("|"); }
  function duplicates(products) {
    const groups = Object.create(null); (products || []).forEach(function (product) { const key = fingerprint(product); if (key !== "|") (groups[key] = groups[key] || []).push(product); });
    return Object.keys(groups).filter(function (key) { return groups[key].length > 1; }).map(function (key) { return { fingerprint: key, records: groups[key] }; });
  }
  function parseCsv(text) {
    const rows = []; let row = [], cell = "", quoted = false; const value = String(text || "").replace(/^\uFEFF/, "");
    for (let i = 0; i < value.length; i++) { const ch = value[i]; if (quoted) { if (ch === '"' && value[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = false; else cell += ch; } else if (ch === '"') quoted = true; else if (ch === ",") { row.push(cell); cell = ""; } else if (ch === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; } else cell += ch; }
    if (quoted) throw new Error("CSV contains an unclosed quote"); if (cell || row.length) { row.push(cell); rows.push(row); }
    if (rows.length < 2) return []; const headers = rows.shift().map(function (h) { return clean(h); });
    return rows.filter(function (r) { return r.some(clean); }).map(function (r) { const item = {}; headers.forEach(function (h, i) { if (h) item[h] = clean(r[i]); }); return item; });
  }
  function testingPlan(product) {
    const name = clean(product && product.productName) || "Product";
    return { product: name, inferred: true, hypothesis: "Different hook families may change qualified attention for " + name + ".", variants: ["problem-first", "straight-demo", "objection-handling"], primaryMetric: "product click-through rate", guardrails: ["claim-risk findings", "negative comment rate"], minimumPosts: 6, note: "This is a recommended test design, not a performance prediction." };
  }
  function enrich(product, options) {
    const o = options || {}; const stage = LIFECYCLE.indexOf(o.lifecycleStage) >= 0 ? o.lifecycleStage : "discovered";
    return Object.assign({}, product, { intelligence: { scoringProfileId: o.scoringProfileId || null, evidence: (o.evidence || []).map(evidence), lifecycleStage: stage, watchlists: (o.watchlists || []).map(clean).filter(Boolean), campaignId: o.campaignId || null, researchNotes: clean(o.researchNotes), offerVerification: o.offerVerification || "unverified", updatedAt: new Date().toISOString() } });
  }
  return { LIFECYCLE: LIFECYCLE, DEFAULT_WEIGHTS: DEFAULT_WEIGHTS, normalizeWeights: normalizeWeights, profile: profile, evidence: evidence, fingerprint: fingerprint, duplicates: duplicates, parseCsv: parseCsv, testingPlan: testingPlan, enrich: enrich };
});
