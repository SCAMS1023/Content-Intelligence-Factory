/* Run with:  node --test test/
   No dependencies — node:test and node:assert only. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const Rng = require("../src/core/rng.js");
const Validation = require("../src/core/validation.js");
const Scoring = require("../src/core/scoring.js");
const Content = require("../src/core/content.js");
const Prompts = require("../src/core/prompts.js");
const Compliance = require("../src/core/compliance.js");
const Exporters = require("../src/core/exporters.js");
const Store = require("../src/core/store.js");
const Pack = require("../src/core/pack.js");

function sampleRaw(overrides) {
  return Object.assign({
    productName: "Ninja CREAMi",
    brand: "Ninja",
    price: "59.99",
    commission: "12",
    growth: "125",
    creators: "142",
    rating: "4.6",
    reviews: "3200",
    adsActive: "true",
    brandMatch: "true",
    benefits: "Makes frozen desserts at home\nMultiple texture settings\nEasy countertop use",
    offer: "Coupon shown on the product page",
    audience: "families and dessert lovers",
    problem: "store-bought ice cream is expensive",
    objection: "I thought it would be hard to clean"
  }, overrides || {});
}

function sampleProduct(overrides) {
  return Validation.normalize(sampleRaw(overrides)).product;
}

/* ---------------------------------------------------------------- rng */

test("rng is deterministic for the same seed", () => {
  const a = Rng.create("ninja").shuffle([1, 2, 3, 4, 5, 6, 7, 8]);
  const b = Rng.create("ninja").shuffle([1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(a, b);
});

test("rng differs across seeds", () => {
  const a = Rng.create("ninja").shuffle([1, 2, 3, 4, 5, 6, 7, 8]);
  const b = Rng.create("ninja::1").shuffle([1, 2, 3, 4, 5, 6, 7, 8]);
  assert.notDeepEqual(a, b);
});

test("rng shuffle preserves membership", () => {
  const src = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const out = Rng.create("x").shuffle(src);
  assert.deepEqual(out.slice().sort((a, b) => a - b), src);
  assert.deepEqual(src, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], "must not mutate input");
});

/* --------------------------------------------------------- validation */

test("blank numeric fields are null (unknown), not zero", () => {
  const { product } = Validation.normalize({ productName: "X", growth: "", creators: "   " });
  assert.equal(product.growth, null);
  assert.equal(product.creators, null);
  assert.notEqual(product.growth, 0);
});

test("an explicit zero stays zero", () => {
  const { product } = Validation.normalize({ productName: "X", growth: "0" });
  assert.equal(product.growth, 0);
});

test("currency and percent symbols are tolerated", () => {
  const { product } = Validation.normalize({ productName: "X", price: "$1,299.50", commission: "12%" });
  assert.equal(product.price, 1299.5);
  assert.equal(product.commission, 12);
});

test("out-of-range values are rejected with a field-scoped error", () => {
  const res = Validation.normalize({ productName: "X", commission: "250" });
  assert.equal(res.ok, false);
  assert.ok(res.errors.some(e => e.field === "commission"));
});

test("missing product name is an error", () => {
  assert.equal(Validation.normalize({}).ok, false);
});

test("non-numeric input is an error, not a silent zero", () => {
  const res = Validation.normalize({ productName: "X", price: "abc" });
  assert.equal(res.ok, false);
  assert.equal(res.product.price, null);
});

test("untouched booleans are null, not false", () => {
  const { product } = Validation.normalize({ productName: "X" });
  assert.equal(product.brandMatch, null);
  assert.equal(product.adsActive, null);
});

test("benefit lines are trimmed, de-blanked and capped", () => {
  const many = Array.from({ length: 30 }, (_, i) => "  benefit " + i + "  ").join("\n");
  const { product } = Validation.normalize({ productName: "X", benefits: many + "\n\n\n" });
  assert.equal(product.benefits.length, 12);
  assert.equal(product.benefits[0], "benefit 0");
});

/* ------------------------------------------------------------ scoring */

test("factor weights sum to 100", () => {
  assert.equal(Scoring.TOTAL_WEIGHT, 100);
});

test("a fully-specified product reports 100% confidence", () => {
  const s = Scoring.score(sampleProduct());
  assert.equal(s.confidencePct, 100);
  assert.equal(s.available, 100);
  assert.equal(s.flags.filter(f => f.level !== "info").length, 0);
});

test("the sample product lands in the test-candidate band", () => {
  /* $59.99 at 12% is a $7.20 payout: solid, not strong. The rubric should say so
     rather than flattering it — the original scored this same product 100/100. */
  const s = Scoring.score(sampleProduct());
  assert.ok(s.value >= 60 && s.value < 80, "expected 60-79, got " + s.value);
  assert.equal(s.rating.label, "Test candidate");
});

test("a product that maxes every factor reaches Strong candidate", () => {
  const s = Scoring.score(sampleProduct({
    price: "89.99", commission: "30", growth: "250", creators: "40", rating: "4.8"
  }));
  assert.equal(s.value, 100);
  assert.equal(s.rating.label, "Strong candidate");
});

test("unknown fields shrink confidence but do not silently zero the score", () => {
  const partial = sampleProduct({ growth: "", creators: "", rating: "", reviews: "", adsActive: "", brandMatch: "" });
  const s = Scoring.score(partial);
  assert.ok(s.confidencePct < 60, "confidence should drop, got " + s.confidencePct);
  assert.ok(s.value > 0, "score should still reflect the observed factors");
  assert.ok(s.flags.some(f => f.level === "info" && /rubric could be evaluated/.test(f.message)));
});

test("nothing known at all yields zero and a 'Not enough data' rating", () => {
  const s = Scoring.score(Validation.normalize({ productName: "Mystery" }).product);
  assert.equal(s.value, 0);
  assert.equal(s.confidencePct, 0);
  assert.equal(s.rating.label, "Not enough data");
});

test("price is scored as a band, not monotonically — the original's key bug", () => {
  const mid = Scoring.score(sampleProduct({ price: "59.99" }));
  const high = Scoring.score(sampleProduct({ price: "349.99" }));
  const midPrice = mid.breakdown.find(b => b.id === "price");
  const highPrice = high.breakdown.find(b => b.id === "price");
  assert.ok(midPrice.points > highPrice.points,
    "$59.99 must out-score $349.99 on the price factor");
});

test("a brand/shop mismatch caps the score and emits a blocking flag", () => {
  const s = Scoring.score(sampleProduct({ brandMatch: "false" }));
  assert.ok(s.value <= 39, "expected cap at 39, got " + s.value);
  assert.ok(s.flags.some(f => f.level === "block"));
});

test("declining demand is scored worse than flat demand", () => {
  const down = Scoring.score(sampleProduct({ growth: "-30" }));
  const flat = Scoring.score(sampleProduct({ growth: "0" }));
  assert.ok(down.value < flat.value);
  assert.ok(down.flags.some(f => /trending down/.test(f.message)));
});

test("saturated creator counts score worse than sparse ones", () => {
  const sparse = Scoring.score(sampleProduct({ creators: "40" }));
  const packed = Scoring.score(sampleProduct({ creators: "900" }));
  assert.ok(sparse.value > packed.value);
  assert.ok(packed.flags.some(f => /600 creators/.test(f.message)));
});

test("commission dollars need both price and commission", () => {
  assert.equal(Scoring.commissionDollars({ price: null, commission: 10 }), null);
  assert.equal(Scoring.commissionDollars({ price: 50, commission: null }), null);
  assert.ok(Math.abs(Scoring.commissionDollars({ price: 50, commission: 10 }) - 5) < 1e-9);
});

test("every breakdown row reports weight, status and points", () => {
  const s = Scoring.score(sampleProduct());
  assert.equal(s.breakdown.length, Scoring.FACTORS.length);
  s.breakdown.forEach(b => {
    assert.ok(typeof b.weight === "number");
    assert.ok(b.status === "observed" || b.status === "unknown");
    assert.ok(b.points <= b.weight + 1e-9);
  });
});

test("earnings projection is arithmetically correct and marked inferred", () => {
  const p = Scoring.projectEarnings(10, { views: 10000, ctr: 0.02, cvr: 0.03 });
  assert.equal(p.clicks, 200);
  assert.equal(p.orders, 6);
  assert.equal(p.revenue, 60);
  assert.equal(p.basis, "inferred");
});

test("earnings projection is null when payout is unknown", () => {
  assert.equal(Scoring.projectEarnings(null), null);
});

/* ------------------------------------------------------------ content */

test("ten complete video units are produced", () => {
  const vids = Content.buildVideos(sampleProduct(), 0);
  assert.equal(vids.length, 10);
  vids.forEach(v => {
    assert.ok(v.hook && v.hook.length > 10, "hook too short: " + v.hook);
    assert.ok(v.caption);
    assert.equal(v.script.length, 3);
    assert.ok(v.overlay.top && v.overlay.bottom);
    assert.ok(v.hashtags.length >= 3);
    assert.ok(v.cta);
    assert.ok(v.broll);
  });
});

test("every archetype appears exactly once", () => {
  const ids = Content.buildVideos(sampleProduct(), 0).map(v => v.archetype);
  assert.equal(new Set(ids).size, 10);
});

test("no rendered string leaks an unresolved {placeholder}", () => {
  /* Deliberately sparse: no benefits, audience, problem, objection or offer. */
  const bare = Validation.normalize({ productName: "Widget" }).product;
  [bare, sampleProduct()].forEach(product => {
    const vids = Content.buildVideos(product, 0);
    const blob = JSON.stringify(vids) + JSON.stringify(Prompts.buildFor(product, vids));
    const leak = blob.match(/\{[a-zA-Z]\w*\}/g);
    assert.equal(leak, null, "unresolved placeholders: " + leak);
  });
});

test("sparse input still produces readable copy with no double spaces", () => {
  const bare = Validation.normalize({ productName: "Widget" }).product;
  Content.buildVideos(bare, 0).forEach(v => {
    assert.ok(!/\s{2,}/.test(v.hook), "double space in: " + v.hook);
    assert.ok(!/\s+[.,!?]/.test(v.hook), "floating punctuation in: " + v.hook);
    assert.ok(!/undefined|null/.test(v.hook), "leaked value in: " + v.hook);
  });
});

test("different products produce different hooks — the original's biggest flaw", () => {
  const a = Content.buildVideos(sampleProduct({ productName: "Ninja CREAMi" }), 0);
  const b = Content.buildVideos(sampleProduct({ productName: "Stanley Tumbler" }), 0);
  const same = a.filter((v, i) => v.hook === b[i].hook);
  assert.equal(same.length, 0, "hooks should not be reusable verbatim across products");
});

test("generation is reproducible for the same product and salt", () => {
  const a = Content.buildVideos(sampleProduct(), 0).map(v => v.hook);
  const b = Content.buildVideos(sampleProduct(), 0).map(v => v.hook);
  assert.deepEqual(a, b);
});

test("changing the salt reshuffles variants", () => {
  const a = Content.buildVideos(sampleProduct(), 0).map(v => v.hook);
  const b = Content.buildVideos(sampleProduct(), 7).map(v => v.hook);
  assert.notDeepEqual(a, b);
});

test("benefits rotate across videos instead of always using the first", () => {
  const used = new Set();
  Content.buildVideos(sampleProduct(), 0).forEach((v, i) => {
    used.add(Content.buildContext(sampleProduct(), i).benefit);
  });
  assert.ok(used.size >= 3, "expected benefits to rotate, saw " + used.size);
});

test("benefits spliced mid-sentence are lower-cased", () => {
  /* Users type benefits capitalised. "…and show Makes frozen desserts at home
     happening" is the kind of seam that makes generated copy look generated. */
  const product = sampleProduct({ benefits: "Makes frozen desserts at home" });
  Content.buildVideos(product, 0).forEach(v => {
    v.script.forEach(s => {
      assert.ok(!/[—:,] +Makes frozen/.test(s.direction),
        "capitalised benefit spliced mid-sentence: " + s.direction);
    });
  });
  const ctx = Content.buildContext(product, 0);
  assert.equal(ctx.benefitLower, "makes frozen desserts at home");
});

test("verb phrasing reads correctly after 'expect the product to ...'", () => {
  assert.equal(Content.toVerbPhrase("Makes frozen desserts at home"), "make frozen desserts at home");
  assert.equal(Content.toVerbPhrase("Saves counter space"), "save counter space");
  assert.equal(Content.toVerbPhrase(""), "do what it does");
});

test("hashtags are unique, prefixed and bounded", () => {
  const tags = Content.buildVideos(sampleProduct(), 0)[0].hashtags;
  assert.equal(new Set(tags).size, tags.length);
  assert.ok(tags.length <= 7);
  tags.forEach(t => assert.match(t, /^#[a-z0-9]+$/));
});

test("posting plan covers all ten videos without repeats", () => {
  const vids = Content.buildVideos(sampleProduct(), 0);
  const plan = Content.postingPlan(vids);
  assert.equal(plan.length, 10);
  assert.equal(new Set(plan.map(s => s.video)).size, 10);
});

/* ------------------------------------------------------------ prompts */

test("each video gets its own prompt set with a rotating angle", () => {
  const product = sampleProduct();
  const vids = Content.buildVideos(product, 0);
  const prompts = Prompts.buildFor(product, vids);
  assert.equal(prompts.length, 10);
  assert.ok(new Set(prompts.map(p => p.image)).size > 1,
    "image prompts must differ between videos — the original repeated one prompt 10x");
  assert.ok(new Set(prompts.map(p => p.angle)).size >= 5);
});

test("prompts carry the product name and fidelity constraints", () => {
  const product = sampleProduct();
  const p = Prompts.buildFor(product, Content.buildVideos(product, 0))[0];
  assert.match(p.image, /Ninja CREAMi/);
  assert.match(p.image, /Preserve the real product exactly/);
  assert.match(p.video, /9:16/);
  assert.match(p.video, /bending, morphing, melting/);
});

/* --------------------------------------------------------- compliance */

test("health claims are flagged as high severity", () => {
  const f = Compliance.scanText("This will cure your back pain, it is FDA approved");
  assert.ok(f.some(x => x.ruleId === "medical" && x.severity === "high"));
});

test("fabricated urgency is flagged", () => {
  const f = Compliance.scanText("Hurry, the sale ends today and only 3 left");
  assert.ok(f.some(x => x.ruleId === "urgency"));
});

test("unprovable absolutes are flagged", () => {
  assert.ok(Compliance.scanText("the best blender guaranteed").some(x => x.ruleId === "absolutes"));
});

test("clean copy produces no findings", () => {
  assert.equal(Compliance.scanText("Makes frozen desserts at home in about 10 seconds.").length, 0);
});

test("every finding carries a why and a suggested fix", () => {
  Compliance.scanText("cure everything, guaranteed, sale ends today").forEach(f => {
    assert.ok(f.why && f.why.length > 10);
    assert.ok(f.fix && f.fix.length > 10);
  });
});

test("generated copy is claim-safe by construction", () => {
  /* The original shipped hooks like "This is the last day I would wait" and
     "TikTok quietly dropped ..." while its own checklist banned exactly that. */
  const product = Validation.normalize(sampleRaw({ offer: "", benefits: "Makes frozen desserts at home" })).product;
  const vids = Content.buildVideos(product, 0);
  vids.forEach(v => {
    const findings = []
      .concat(Compliance.scanText(v.hook, "hook"))
      .concat(Compliance.scanText(v.caption, "caption"))
      .concat(Compliance.scanText(v.overlay.top + " " + v.overlay.bottom, "overlay"))
      .concat(Compliance.scanText(v.cta, "cta"));
    assert.equal(findings.length, 0,
      "video " + v.n + " tripped the scanner: " + JSON.stringify(findings.map(f => f.phrase)));
  });
});

test("the scanner reaches user-supplied text inside a built pack", () => {
  const product = Validation.normalize(sampleRaw({ benefits: "Clinically proven to detox your body" })).product;
  const scan = Pack.build(product).compliance;
  assert.equal(scan.clean, false);
  assert.ok(scan.counts.high >= 1);
  assert.ok(scan.findings.some(f => /Benefit 1/.test(f.source)));
});

test("findings are ordered high severity first", () => {
  const scan = Compliance.scanPack(Pack.build(
    Validation.normalize(sampleRaw({
      benefits: "Cures acne\nThe best one guaranteed",
      offer: "Sale ends today"
    })).product
  ));
  const rank = { high: 0, medium: 1, low: 2 };
  for (let i = 1; i < scan.findings.length; i++) {
    assert.ok(rank[scan.findings[i - 1].severity] <= rank[scan.findings[i].severity]);
  }
});

/* ---------------------------------------------------------- exporters */

test("csv escapes quotes, commas and newlines per RFC 4180", () => {
  const out = Exporters.csvRows([["a"], ['say "hi", ok'], ["line1\nline2"]]);
  assert.match(out, /"say ""hi"", ok"/);
  assert.match(out, /"line1\nline2"/);
  assert.ok(out.includes("\r\n"), "rows must be CRLF terminated for Excel");
  assert.ok(out.charCodeAt(0) === 0xfeff, "must start with a UTF-8 BOM");
});

test("csv cell handles null and undefined", () => {
  assert.equal(Exporters.csvCell(null), '""');
  assert.equal(Exporters.csvCell(undefined), '""');
  assert.equal(Exporters.csvCell(0), '"0"');
});

test("video csv has one row per video with distinct prompts", () => {
  const pack = Pack.build(sampleProduct());
  const csv = Exporters.videosCsv(pack);
  const lines = csv.split("\r\n").filter(Boolean);
  /* Quoted cells contain no raw newlines in this pack, so line count is exact. */
  assert.equal(lines.length, 11, "expected header + 10 rows, got " + lines.length);
  const imageCol = Exporters.VIDEO_COLUMNS.indexOf("image_prompt");
  assert.ok(imageCol > 0);
  const prompts = pack.videos.map(v => v.prompts.image);
  assert.ok(new Set(prompts).size > 1, "prompts must vary per row");
});

test("formula-injection prefixes are neutralised before CSV quoting", () => {
  const out = Exporters.csvRows([["=1+1"], ["@SUM(A1)"]]);
  assert.match(out, /"'=1\+1"/);
  assert.match(out, /"'@SUM\(A1\)"/);
  ["+cmd", "-2+3", "  =HYPERLINK(\"https://example.invalid\")", "\t@SUM(A1)"].forEach(value => {
    assert.equal(Exporters.csvCell(value).charAt(1), "'", value);
  });
});

test("library csv renders unknown tri-state booleans as 'unknown'", () => {
  const pack = Pack.build(Validation.normalize({ productName: "X", price: "10", commission: "5" }).product);
  const csv = Exporters.libraryCsv([Object.assign({ savedAt: "now" }, pack)]);
  assert.match(csv, /"unknown"/);
});

test("markdown export contains the score table, videos and claim check", () => {
  const md = Exporters.markdown(Pack.build(sampleProduct()));
  assert.match(md, /# Ninja CREAMi/);
  assert.match(md, /## Opportunity/);
  assert.match(md, /\| Factor \| Weight \| Status \| Observed \|/);
  assert.match(md, /## Videos/);
  assert.match(md, /## Posting plan/);
  assert.match(md, /## Claim check/);
  assert.equal((md.match(/^### \d+\. /gm) || []).length, 10);
});

test("tab text is human-pasteable, not a JSON blob", () => {
  const pack = Pack.build(sampleProduct());
  const txt = Exporters.tabText(pack, "videos");
  assert.match(txt, /HOOK: /);
  assert.ok(!txt.trim().startsWith("{"));
});

test("filenames are sanitised", () => {
  const pack = Pack.build(sampleProduct({ productName: "Ninja / CREAMi™ <deluxe>" }));
  const name = Exporters.safeName(pack, "videos.csv");
  assert.match(name, /^[A-Za-z0-9_.]+$/);
});

/* --------------------------------------------------------------- pack */

test("pack assembles every section and stamps a schema version", () => {
  const pack = Pack.build(sampleProduct(), { now: "2026-01-01T00:00:00.000Z" });
  assert.equal(pack.schemaVersion, 2);
  assert.equal(pack.createdAt, "2026-01-01T00:00:00.000Z");
  ["product", "opportunity", "projection", "videos", "postingPlan", "checklist", "compliance"]
    .forEach(k => assert.ok(pack[k], "missing " + k));
  assert.equal(pack.videos.length, 10);
  assert.ok(pack.videos.every(v => v.prompts));
});

test("pack survives a product with nothing but a name", () => {
  const pack = Pack.build(Validation.normalize({ productName: "Widget" }).product);
  assert.equal(pack.videos.length, 10);
  assert.equal(pack.projection, null);
  assert.doesNotThrow(() => Exporters.markdown(pack));
  assert.doesNotThrow(() => Exporters.videosCsv(pack));
});

test("hostile input is carried as inert data, never as markup", () => {
  const evil = '<img src=x onerror="alert(1)">';
  const pack = Pack.build(Validation.normalize({ productName: evil, benefits: evil }).product);
  /* The core layer stores it verbatim; ui/dom.js is what guarantees it is only
     ever written via textContent. This asserts we do not pre-build HTML strings. */
  assert.equal(pack.product.productName, evil);
  assert.ok(!/<script/i.test(Exporters.markdown(pack).replace(evil, "")));
  const csv = Exporters.videosCsv(pack);
  assert.ok(csv.includes('""'.length ? "onerror" : ""), "value round-trips through csv");
});

/* -------------------------------------------------------------- store */

test("library round-trips through storage", () => {
  const s = Store.create(Store.memoryStorage());
  const pack = Pack.build(sampleProduct());
  const res = s.savePack(pack);
  assert.equal(res.ok, true);
  const list = s.listLibrary();
  assert.equal(list.length, 1);
  assert.equal(list[0].product.productName, "Ninja CREAMi");
  assert.equal(list[0].opportunity.value, pack.opportunity.value);
});

test("saving the same product replaces rather than duplicates", () => {
  const s = Store.create(Store.memoryStorage());
  s.savePack(Pack.build(sampleProduct()));
  const second = s.savePack(Pack.build(sampleProduct({ price: "79.99" })));
  assert.equal(second.replaced, true);
  assert.equal(s.listLibrary().length, 1);
  assert.equal(s.listLibrary()[0].product.price, 79.99);
});

test("delete is soft and restorable to its original position", () => {
  const s = Store.create(Store.memoryStorage());
  s.savePack(Pack.build(sampleProduct({ productName: "A" })));
  s.savePack(Pack.build(sampleProduct({ productName: "B" })));
  s.savePack(Pack.build(sampleProduct({ productName: "C" })));
  const names = () => s.listLibrary().map(e => e.product.productName);
  const before = names();
  const target = s.listLibrary()[1];

  const del = s.remove(target.id);
  assert.equal(del.ok, true);
  assert.equal(s.listLibrary().length, 2);
  assert.equal(s.listTrash().length, 1);

  assert.equal(s.restore(target.id).ok, true);
  assert.deepEqual(names(), before, "restore must put it back where it was");
  assert.equal(s.listTrash().length, 0);
});

test("removing an unknown id is a no-op", () => {
  const s = Store.create(Store.memoryStorage());
  assert.equal(s.remove("nope").ok, false);
  assert.equal(s.restore("nope").ok, false);
});

test("corrupt storage degrades to empty instead of throwing", () => {
  const backing = Store.memoryStorage();
  backing.setItem(Store.KEYS.library, "{not json");
  const s = Store.create(backing);
  assert.doesNotThrow(() => s.listLibrary());
  assert.deepEqual(s.listLibrary(), []);
});

test("a storage backend that throws on write does not crash the app", () => {
  const s = Store.create({
    getItem: () => null,
    setItem: () => { throw new Error("QuotaExceededError"); },
    removeItem: () => {}
  });
  const res = s.savePack(Pack.build(sampleProduct()));
  assert.equal(res.ok, false);
  assert.match(res.error, /Quota/);
});

test("drafts round-trip", () => {
  const s = Store.create(Store.memoryStorage());
  s.saveDraft({ productName: "half typed" });
  assert.equal(s.loadDraft().productName, "half typed");
  s.clearDraft();
  assert.equal(s.loadDraft(), null);
});
