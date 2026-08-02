"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const VersionedStorage = require("../src/platform/versioned-storage.js");
const Repository = require("../src/platform/database-repository.js");
const Migration = require("../src/platform/legacy-migration.js");
const Services = require("../src/plugins/tiktok-shop/services.js");
const Validation = require("../src/core/validation.js");
const Scoring = require("../src/core/scoring.js");
const Pack = require("../src/core/pack.js");
const Compliance = require("../src/core/compliance.js");

test("repository upserts cloned records and rejects invalid collections", () => {
  const repo = Repository.create(VersionedStorage.memoryAdapter()); const record = { id: "p1", name: "A" };
  assert.equal(repo.upsert("products", record).ok, true); record.name = "mutated";
  assert.equal(repo.list("products")[0].name, "A");
  assert.equal(repo.upsert("missing", record).ok, false);
});

test("legacy migration copies records once without deleting source keys", () => {
  const adapter = VersionedStorage.memoryAdapter(); const legacy = [{ id: "p1", product: { productName: "A" } }];
  adapter.setItem("tsvf.library.v2", JSON.stringify(legacy)); adapter.setItem("tsvf.prefs.v2", JSON.stringify({ theme: "dark" }));
  const repo = Repository.create(adapter); const first = Migration.run(adapter, repo); const second = Migration.run(adapter, repo);
  assert.deepEqual(first, { ok: true, skipped: false, imported: 1 }); assert.equal(second.skipped, true);
  assert.equal(repo.list("products").length, 1); assert.equal(repo.read().preferences.theme, "dark");
  assert.equal(adapter.getItem("tsvf.library.v2"), JSON.stringify(legacy));
});

test("legacy migration tolerates corrupt source records", () => {
  const adapter = VersionedStorage.memoryAdapter(); adapter.setItem("tsvf.library.v2", "{bad");
  const result = Migration.run(adapter, Repository.create(adapter));
  assert.equal(result.ok, true); assert.equal(result.imported, 0);
});

test("TikTok services preserve existing deterministic core behavior", () => {
  const service = Services.create({ Validation, Scoring, Pack, Compliance });
  const product = service.normalizeProduct({ productName: "Widget" }).product;
  assert.equal(service.generatePack(product).videos.length, 10);
  assert.equal(service.scanText("guaranteed")[0].ruleId, "absolutes");
});
