"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Studio = require("../src/plugins/content-studio/studio.js");
const PluginRegistry = require("../src/core/plugin-registry.js");
const Plugin = require("../src/plugins/content-studio/plugin.js");

test("Content Studio plugin metadata is registry-valid and disabled by default", () => { assert.equal(PluginRegistry.validate(Plugin).valid, true); assert.equal(Plugin.enabled, false); });
test("profiles and presets normalize offline inputs", () => { const p = Studio.profile({ name: " Brand ", prohibitedPhrases: [" hype ", ""] }); assert.equal(p.name, "Brand"); assert.deepEqual(p.prohibitedPhrases, ["hype"]); assert.equal(Studio.preset({ platform: "youtube" }).ratio, "16:9"); });
test("generation is deterministic by subject and seed", () => { const a = Studio.generate({ subject: "Widget" }, { seed: 3 }); const b = Studio.generate({ subject: "Widget" }, { seed: 3 }); assert.equal(a.hook, b.hook); assert.equal(a.inferred, true); });
test("locked fields survive regeneration", () => { const previous = Studio.generate({ subject: "Widget" }, { seed: 1 }); const next = Studio.generate({ subject: "Widget" }, { seed: 8, previous, locked: { hook: true } }); assert.equal(next.hook, previous.hook); });
test("batch generation and comparison preserve variant identities", () => { const variants = Studio.batch([{ subject: "A" }, { subject: "B" }], { seed: 2 }); assert.equal(variants.length, 2); assert.equal(Studio.compare(variants)[0].id, variants[0].id); });
test("missing AI provider degrades gracefully", async () => { const result = await Studio.provider().generate({ prompt: "x" }); assert.equal(result.unavailable, true); });
test("configured provider adapter is optional and callable", async () => { const result = await Studio.provider({ generate: request => ({ ok: true, text: request.prompt }) }).generate({ prompt: "hello" }); assert.deepEqual(result, { ok: true, text: "hello" }); });
