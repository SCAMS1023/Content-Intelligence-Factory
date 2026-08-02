"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Intelligence = require("../src/plugins/tiktok-shop/intelligence.js");

test("editable weights are normalized to 100 without mutating defaults", () => {
  const weights = Intelligence.normalizeWeights({ commissionQuality: 50 });
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(total - 100) < 1e-9); assert.equal(Intelligence.DEFAULT_WEIGHTS.commissionQuality, 25);
  assert.throws(() => Intelligence.normalizeWeights({ saturation: -1 }), /Invalid weight/);
});

test("evidence validates links and labels inferred values", () => {
  const item = Intelligence.evidence({ type: "sales-growth", value: 20, url: "https://example.com/evidence", inferred: true });
  assert.equal(item.inferred, true); assert.equal(item.source, "manual");
  assert.throws(() => Intelligence.evidence({ url: "javascript:alert(1)" }), /http or https/);
});

test("duplicate detection normalizes punctuation and case", () => {
  const groups = Intelligence.duplicates([{ id: 1, productName: "Ninja CREAMi!", brand: "Ninja" }, { id: 2, productName: "ninja-creami", brand: "NINJA" }, { id: 3, productName: "Other" }]);
  assert.equal(groups.length, 1); assert.equal(groups[0].records.length, 2);
});

test("batch CSV intake handles quoted commas and escaped quotes", () => {
  const rows = Intelligence.parseCsv('productName,brand,notes\r\n"Widget, Pro",Acme,"Say ""hello"""\r\n');
  assert.deepEqual(rows, [{ productName: "Widget, Pro", brand: "Acme", notes: 'Say "hello"' }]);
  assert.throws(() => Intelligence.parseCsv('name\n"broken'), /unclosed quote/);
});

test("enriched product retains evidence provenance and safe lifecycle fallback", () => {
  const item = Intelligence.enrich({ productName: "Widget" }, { lifecycleStage: "invalid", watchlists: [" Winners ", ""], evidence: [{ source: "listing", observedAt: "2026-08-01T00:00:00.000Z" }] });
  assert.equal(item.intelligence.lifecycleStage, "discovered"); assert.deepEqual(item.intelligence.watchlists, ["Winners"]); assert.equal(item.intelligence.evidence[0].source, "listing");
});

test("testing plans identify inference and avoid performance promises", () => {
  const plan = Intelligence.testingPlan({ productName: "Widget" });
  assert.equal(plan.inferred, true); assert.equal(plan.minimumPosts, 6); assert.match(plan.note, /not a performance prediction/);
});
