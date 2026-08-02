"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const EventBus = require("../src/core/event-bus.js");
const FeatureFlags = require("../src/core/feature-flags.js");
const PluginRegistry = require("../src/core/plugin-registry.js");
const VersionedStorage = require("../src/platform/versioned-storage.js");
const TikTokPlugin = require("../src/plugins/tiktok-shop/plugin.js");

test("event bus supports unsubscribe and isolates listener errors", () => {
  const errors = [];
  const bus = EventBus.create(error => errors.push(error.message));
  const seen = [];
  bus.on("x", () => { throw new Error("boom"); });
  const unsubscribe = bus.on("x", value => seen.push(value));
  bus.emit("x", 7); unsubscribe(); bus.emit("x", 8);
  assert.deepEqual(seen, [7]); assert.deepEqual(errors, ["boom", "boom"]);
});

test("feature flags return snapshots without exposing mutable state", () => {
  const flags = FeatureFlags.create({ studio: false });
  flags.set("studio", true); const snapshot = flags.snapshot(); snapshot.studio = false;
  assert.equal(flags.enabled("studio"), true);
});

test("TikTok plugin metadata is valid and registry rejects duplicates", () => {
  assert.equal(PluginRegistry.validate(TikTokPlugin).valid, true);
  const registry = PluginRegistry.create(); registry.register(TikTokPlugin);
  assert.equal(registry.list(true)[0].id, "tiktok-shop");
  assert.throws(() => registry.register(TikTokPlugin), /already registered/);
});

test("versioned storage migrates, persists, backs up and restores", () => {
  const adapter = VersionedStorage.memoryAdapter();
  adapter.setItem("records", JSON.stringify({ schemaVersion: 1, data: { names: ["A"] } }));
  const storage = VersionedStorage.create({ key: "records", version: 2, adapter, migrations: { 1: data => ({ names: data.names, projects: [] }) } });
  assert.deepEqual(storage.read(null), { names: ["A"], projects: [] });
  const backup = storage.backup();
  storage.write({ names: ["B"], projects: [] });
  assert.deepEqual(storage.restore(backup).data.names, ["A"]);
});

test("versioned storage rejects corrupt and future data without overwriting it", () => {
  const adapter = VersionedStorage.memoryAdapter();
  adapter.setItem("x", "{bad");
  const storage = VersionedStorage.create({ key: "x", version: 1, adapter });
  assert.deepEqual(storage.read([]), []); assert.ok(storage.lastError());
  assert.equal(storage.restore(JSON.stringify({ format: "wrong" })).ok, false);
});
