# Content Intelligence Factory implementation plan

## Delivery principles

The existing TikTok Shop Video Factory remains a working offline product throughout the upgrade. New platform capabilities are introduced behind stable module boundaries and feature flags. Every stage ends with automated tests, security and accessibility review, and documentation updates.

## Baseline

- Baseline command: `node --test test/core.test.js`
- Baseline result: 65 passed, 0 failed on 2026-08-01 with Node 24.18.0.
- The machine's `npm` shim is broken; the underlying dependency-free test command works.

## Stages

1. **Audit and hardening** — complete architecture, security, accessibility, export, storage, and compatibility review; fix high/medium findings.
2. **Shared foundation** — event bus, plugin registry, schemas, versioned storage, migrations, logging, recovery, feature flags, and export service.
3. **TikTok plugin extraction** — preserve current scoring/generation while moving platform-specific policy behind plugin metadata and services.
4. **Content Studio** — deterministic shared generation, profiles, presets, variants, locks, history, favorites, and provider adapter.
5. **YouTube intelligence** — manual URL/transcript/metadata import with provenance and analysis interfaces; no unsupported scraping claims.
6. **Intelligence engine** — evidence-backed patterns, DNA reports, blueprints, testing matrices, contradictions, and confidence.
7. **Operations UI** — dashboard, projects, campaigns, production queue, calendar, source library, analytics, compliance, exports, settings, and health.
8. **Learning foundation** — manual/imported performance records, comparisons, correlation-based recommendations, and explicit uncertainty.
9. **Integration contracts** — provider interfaces and full backup/report exports without credentials or online requirements.
10. **Release verification** — automated, server, browser, accessibility, storage, migration, export, and end-to-end workflow checks.

## Current stage

Stages 1–3 foundations are implemented locally: hardening, modular core, shared database, non-destructive legacy migration, expanded TikTok intelligence, Content Studio services, YouTube manual import, provenance-aware analysis, cross-platform patterns, and correlation-only performance analytics. The suite contains 103 passing tests. The next implementation slice is the visible multi-route operations dashboard and persistence wiring for these new services.
