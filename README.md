# TikTok Shop Video Factory

Score a TikTok Shop product, generate ten complete short-form video units, and export a production pack.

Runs entirely in your browser. No install, no account, no API key, no network requests.

---

## Start it

1. Open `index.html` — double-click it, or drag it into a browser.
2. Press **Load sample** to see a filled-in example.
3. Replace the sample with your own product data.
4. Press **Generate production pack**.

That's it. There is no build step and nothing to install.

<details>
<summary>Optional: serve it over http://localhost instead</summary>

Some browsers restrict clipboard access on `file://` URLs. The app falls back to a
manual copy path automatically, but if you'd rather have the native clipboard:

```bash
npm run serve
```

Then open <http://localhost:4173>. Requires Node, uses no dependencies.
</details>

---

## What you get

**An opportunity score, 0–100, with the arithmetic shown.** Seven weighted factors,
each contributing a stated number of points, each labelled observed or unknown.

**A confidence figure.** Blank fields are treated as *unknown*, not as zero. They
drop out of the denominator and lower the confidence percentage instead of
quietly dragging the score down. A product scored on two known factors reports
40% confidence, not a falsely precise number.

**Ten complete, shootable video units.** Each one is a matched set, not a loose
line of copy:

| Piece | What it is |
| --- | --- |
| Hook | The opening line, written to one of ten distinct archetypes |
| Intent | Why that archetype works, so you can shoot it deliberately |
| Caption | Matched to the hook, not drawn from an unrelated list |
| Shot script | Three beats — 0:00–0:02, 0:02–0:07, 0:07–0:10 — with camera direction and the line to say |
| Overlay text | Top and bottom on-screen text |
| B-roll note | What the supporting footage needs to do |
| Hashtags | Product-specific plus category tags |
| Image prompt | Per-video, with a rotating shot angle |
| Video prompt | Per-video, with product-fidelity constraints |
| Voiceover | Assembled from the hook, the benefit and the CTA |

The ten archetypes: curiosity gap, objection handling, price/coupon check, feed
saturation, problem-first, assumption flip, straight demo, POV, audience callout,
and expectation vs reality.

**A posting plan.** Two posts a day for five days, deliberately alternating angle
families so you aren't testing two similar hooks back to back.

**A claim-risk check.** Scans both what you typed and everything generated from it
for the claim categories that get affiliate videos pulled — medical, body, earnings,
unprovable absolutes, fabricated urgency, competitor disparagement, false official
status. Each finding says what tripped, why it matters, and how to reword it.

**An earnings projection**, clearly labelled *inferred*, with the click-through and
conversion assumptions exposed as editable inputs.

**A product library.** Save scored products, rank them by score or payout, and
compare a screening batch. Stored in your browser only. Deletes go to a trash
bucket you can undo from.

**Exports:** per-video CSV (one row per video, 16 columns), Markdown production
brief, full JSON, per-tab plain text, and a print stylesheet.

---

## How scoring works

| Factor | Weight | Notes |
| --- | ---: | --- |
| Commission per sale | 25 | `price × commission%`. The real income driver. |
| Demand trend (7d) | 18 | Negative growth scores below flat. |
| Creator competition | 18 | Fewer is better. Over 600 is flagged as saturated. |
| Price band | 12 | Banded, not monotonic — see below. |
| Seller authenticity | 10 | A confirmed mismatch caps the total score at 39. |
| Brand ad support | 9 | |
| Rating | 8 | Below 4.0 warns about returns and clawbacks. |

**Price is scored as a band on purpose.** The $25–$120 impulse range scores full
marks; a $349 appliance scores 0.15× because it converts far worse on
short-form. Rewarding price monotonically overrates expensive products.

Ratings: 80+ strong, 60–79 test, 40–59 weak, below 40 skip. Under 40% confidence
the app reports *Not enough data* rather than a rating it can't support.

---

## Boundaries

This does not scrape research tools, generate the image or video, log into TikTok,
or publish anything. Those need external accounts, paid APIs, browser automation
or platform approval. This automates the planning and production-pack work around
them, which is the repeatable part.

**The claim scanner is a drafting aid, not legal advice.** It catches common
patterns; it cannot tell you whether a specific claim is substantiated. Verify
every price, coupon, stock level and factual claim against the live listing
before you post, and keep the dated screenshots.

---

## Project layout

```
index.html              Markup and script order
assets/styles.css       Theming (light/dark/auto), responsive, print
src/core/               Pure logic — no DOM, unit tested
  rng.js                Seeded RNG so copy varies but reproduces
  validation.js         Parsing; blank means unknown, not zero
  scoring.js            Weighted rubric, breakdown, confidence, projection
  content.js            Ten archetypes → ten complete video units
  prompts.js            Per-video image/video prompts with fidelity constraints
  compliance.js         Claim-risk scanner and checklist
  pack.js               Assembles the full pack
  exporters.js          JSON, CSV (RFC 4180), Markdown, plain text
  store.js              localStorage library, drafts, soft delete
src/ui/
  dom.js                Safe node construction; nothing user-supplied as markup
  app.js                Wiring
test/core.test.js       65 tests, node:test, zero dependencies
tools/serve.js          Optional local static server
```

Core modules are UMD-wrapped: they attach to `window.TSVF` in the browser and
`require()` cleanly in Node, which is what lets the logic be tested without a
browser or a build step. Browsers block ES module scripts on `file://`, so
classic scripts are a deliberate constraint, not an oversight.

---

## Tests

```bash
npm test
```

65 tests over the pure core: scoring arithmetic and unknown-handling, template
rendering with no unresolved placeholders, claim detection, RFC 4180 CSV escaping,
seeded reproducibility, and storage round-trips including corruption and quota
failure.

---

## Changes from the original MVP

See [CHANGELOG.md](CHANGELOG.md). Briefly: the original had a live XSS hole, a CSV
export that repeated one prompt across all ten rows, scoring that rated a $349
product above a $60 one, ten hooks that were identical for every product, and
generated urgency claims its own checklist prohibited. All of those are fixed and
covered by tests.
