# Changelog

## 2.1.0 — modular storage foundation

- Added an event bus, feature flags, validated plugin registry, and TikTok Shop plugin metadata.
- Added versioned storage envelopes, sequential migrations, and in-memory fallback.
- Added full local backup export and validated atomic restore with rollback.
- Added shared record collection schemas for products, brands, projects, campaigns, content, research, sources, performance, compliance, and preferences.
- Added an idempotent, non-destructive migration from legacy TikTok records into the shared database.
- Added a TikTok service facade for validation, scoring, generation, and compliance.
- Neutralized CSV spreadsheet-formula prefixes before RFC 4180 escaping.
- Replaced the static server's legacy URL parser with the WHATWG URL API.
- Expanded the automated suite from 65 to 74 tests.
- Added expanded TikTok intelligence models for evidence, scoring profiles, batch CSV intake, lifecycle, watchlists, campaigns, duplicates, and testing plans.
- Added Content Studio foundations for profiles, presets, deterministic variants, locks, history, batches, and optional provider adapters.
- Added YouTube manual URL, metadata, and transcript intake with provenance and text-analysis limitations.
- Added cross-platform pattern intelligence and performance correlation services that explicitly reject causal interpretation.
- Expanded the automated suite to 103 tests.

## 2.0.0 — rebuild

Complete rebuild of the local MVP. Same premise, same zero-install constraint
(double-click `index.html`, no dependencies, no build step, no network calls).

### Bugs fixed in the original

- **Stored XSS.** Output was built with `innerHTML` and the product name was
  interpolated straight in, so `<img src=x onerror=alert(1)>` in the name field
  executed on generate. All rendering now goes through node construction with
  `textContent`; nothing user-supplied is ever written as markup.
- **CSV repeated one prompt across all ten rows.** `image_prompt` and
  `video_prompt` held the same string in every row, so the export carried one
  prompt ten times. Each video now has its own prompt set with a rotating shot
  angle.
- **CSV row count was hardcoded to 10** (`for(let i=0;i<10;i++)`), which would
  emit blank rows if the hook count ever changed. It now iterates the actual pack.
- **CSV was unreadable in Excel.** No UTF-8 BOM and LF terminators mangled
  non-ASCII characters and broke quoted cells containing newlines. Now RFC 4180:
  BOM, CRLF, doubled quotes.
- **Price scoring was monotonic.** `price >= 45` scored full marks, so a $349
  product outranked a $60 one despite converting far worse on short-form. Price
  is now a band peaking at $25–$120.
- **Blank inputs were treated as zero.** `+value || 0` collapsed "unknown" and
  "zero" into the same number, so an unfilled form scored as a genuinely bad
  product. Blank is now `null`, excluded from the denominator, and reported as a
  confidence percentage.
- **No input validation.** A 500% commission or a negative price was accepted
  silently. Ranges are enforced with field-scoped error messages.
- **Generated copy contradicted the app's own checklist.** Hooks like *"This is
  the last day I would wait"* and *"TikTok quietly dropped {offer}"* invent
  urgency, while the checklist said *"Do not claim a sale ends today unless
  verified."* Every template is now claim-safe by construction, and a test
  asserts the generated pack passes the scanner.
- **Copy Pack copied raw JSON**, which is not pasteable anywhere useful. It now
  copies the active tab as formatted plain text.
- **Clipboard failed silently on `file://`**, which is the app's primary run mode.
  There is now a `execCommand` fallback and a visible message when both fail.
- **Nothing persisted.** A refresh discarded everything typed.
- **Tabs were not tabs.** No `role`, no `aria-selected`, no keyboard support.

### What's new

- **Ten hook archetypes** producing ten *complete* video units — hook, matched
  caption, three-beat shot script with camera direction, overlay text, b-roll
  note, hashtags, CTA and per-video AI prompts. The original produced ten fixed
  sentences with the product name swapped in, identical for every product, plus
  ten unrelated captions.
- **Seeded generation.** Copy is reproducible per product and reshuffles on
  demand, rather than being fixed or fully random.
- **Transparent scoring.** Every factor shows its weight, its earned points, the
  observed value behind it, and why it matters.
- **Confidence reporting** separating observed evidence from unknowns, and
  earnings projection explicitly labelled inferred with editable assumptions.
- **Claim-risk scanner** across seven categories, scanning both user input and
  generated copy, each finding carrying a why and a suggested rewording.
- **Product library** with ranking, comparison, soft delete with undo, draft
  autosave, and a library-wide CSV export for screening batches.
- **Posting plan** alternating angle families across five days.
- **Markdown and print exports** in addition to JSON and CSV.
- **Light/dark/auto theming**, responsive to 390px, reduced-motion support,
  skip link, focus-visible styles, ARIA tabs with arrow-key navigation, and
  live-region score announcements.
- **65 tests** (`npm test`) over the pure core, using `node:test` with no
  dependencies added.
- **Optional local static server** (`npm run serve`) for testing on an http origin.

### Structure

Single 9KB `app.js` split into nine pure core modules plus two UI modules. Core
modules are UMD-wrapped so the same files run as classic browser scripts and as
Node CommonJS for testing — ES modules were not an option because browsers block
module scripts on `file://`, and the double-click launch is the point.

### Known fixes made during the rebuild

- `[hidden]` was being overridden by class-level `display` rules, leaving the
  empty state and the inactive view both visible. Caught by visual check after
  DOM-property assertions passed; fixed with an explicit `[hidden]` rule.
- User-typed benefits are capitalised and were being spliced mid-sentence into
  shot directions (*"show Makes frozen desserts at home happening"*). Beat
  templates now use a colon/dash construction with a lower-cased benefit token.
