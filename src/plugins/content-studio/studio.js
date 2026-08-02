(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("../../core/rng.js"));
  else (root.TSVF = root.TSVF || {}).ContentStudio = factory(root.TSVF.Rng);
})(typeof globalThis !== "undefined" ? globalThis : this, function (Rng) {
  "use strict";
  const PLATFORMS = { tiktok: { duration: 15, ratio: "9:16" }, shorts: { duration: 30, ratio: "9:16" }, youtube: { duration: 480, ratio: "16:9" }, instagram: { duration: 30, ratio: "9:16" } };
  const TONES = ["clear", "conversational", "energetic", "educational", "direct"];
  function clean(value) { return String(value || "").trim(); }
  function profile(input) { const v = input || {}; return { id: v.id || "brand_" + Date.now().toString(36), name: clean(v.name) || "Untitled brand", voice: clean(v.voice) || "clear", prohibitedPhrases: (v.prohibitedPhrases || []).map(clean).filter(Boolean), preferredTerms: (v.preferredTerms || []).map(clean).filter(Boolean), audience: { name: clean(v.audience && v.audience.name), needs: clean(v.audience && v.audience.needs), objections: clean(v.audience && v.audience.objections) } }; }
  function preset(input) { const v = input || {}; const platform = PLATFORMS[v.platform] ? v.platform : "tiktok"; return { platform: platform, duration: Number(v.duration) > 0 ? Number(v.duration) : PLATFORMS[platform].duration, ratio: v.ratio || PLATFORMS[platform].ratio, tone: TONES.indexOf(v.tone) >= 0 ? v.tone : "clear", complianceSafe: v.complianceSafe !== false }; }
  function provider(adapter) {
    const value = adapter || {};
    return { available: function () { return typeof value.generate === "function" && value.enabled !== false; }, generate: function (request) { if (typeof value.generate !== "function" || value.enabled === false) return Promise.resolve({ ok: false, unavailable: true, reason: "No AI provider configured" }); return Promise.resolve(value.generate(request)); } };
  }
  function generate(input, options) {
    const value = input || {}; const o = options || {}; const p = preset(o.preset); const rng = Rng.create(clean(value.subject) + "::" + (o.seed || 0));
    const subject = clean(value.subject) || "this idea"; const benefit = clean(value.benefit) || "the key benefit"; const audience = clean(value.audience) || "the intended audience";
    const hooks = ["The part nobody explains about " + subject + ".", "If you are " + audience + ", start here.", "Before you choose " + subject + ", watch this."];
    const variant = { id: "variant_" + Date.now().toString(36) + "_" + (o.seed || 0), seed: o.seed || 0, platform: p.platform, duration: p.duration, tone: p.tone, complianceSafe: p.complianceSafe, hook: rng.pick(hooks), title: subject + ": a practical guide", caption: "A clear look at " + subject + " and " + benefit + ".", cta: "Review the source details and decide whether it fits your needs.", voiceover: "Here is what to know about " + subject + ". Focus on " + benefit + ", verify the evidence, and compare it with your own needs.", status: "idea", favorite: false, inferred: true, createdAt: new Date().toISOString() };
    const locked = o.locked || {}; const previous = o.previous || {}; Object.keys(locked).forEach(function (key) { if (locked[key] && previous[key] !== undefined) variant[key] = previous[key]; });
    return variant;
  }
  function history(current, next, limit) { const list = (current || []).slice(); list.unshift(next); return list.slice(0, limit || 50); }
  function compare(variants) { const list = variants || []; return list.map(function (v) { return { id: v.id, hook: v.hook, title: v.title, platform: v.platform, duration: v.duration, favorite: v.favorite === true }; }); }
  function batch(items, options) { return (items || []).map(function (item, index) { return generate(item, Object.assign({}, options, { seed: (options && options.seed || 0) + index })); }); }
  return { PLATFORMS: PLATFORMS, TONES: TONES, profile: profile, preset: preset, provider: provider, generate: generate, history: history, compare: compare, batch: batch };
});
