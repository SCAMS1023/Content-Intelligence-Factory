# Audit report

## Executive summary

The v2 core starts from a stronger baseline than the original MVP: user text is rendered through node construction, numeric unknowns remain distinct from zero, storage failures degrade safely, generation is deterministic, and 65 tests pass. The upgrade should extend these foundations rather than replace them.

## Confirmed findings

### Medium — CSV formula injection

The exporter quoted every cell but did not neutralize spreadsheet formula prefixes. Excel-compatible readers may execute quoted cells beginning with `=`, `+`, `-`, or `@`. The exporter now prefixes an apostrophe before RFC 4180 escaping, including when ignorable whitespace precedes the prefix. Regression tests cover all four prefixes.

### Low — package runner environment mismatch

`npm test` cannot run on the current workstation because its global npm shim references a missing module. This is not a repository defect. `node --test test/core.test.js` passes and remains the authoritative zero-dependency command.

### Low — repository text encoding presentation

Several source comments and UI strings display mojibake in the local checkout (`â€”`, `â€“`, and similar sequences). A controlled UTF-8 normalization pass is required, followed by browser and snapshot verification, because bulk replacement can alter intentional byte sequences.

### Resolved — legacy static-server URL parser

Node 24 reported that `url.parse()` has non-standard behavior with security implications. The dependency-free server now parses request targets with the WHATWG `URL` API while retaining the existing decode and root-containment checks.

## Areas reviewed

- DOM rendering and clipboard fallback
- CSV, JSON, Markdown, and filename exports
- localStorage probing, corruption recovery, and write failure behavior
- static-server URL decoding and root containment
- form parsing and scoring unknown semantics
- compliance rules and generated-copy scan coverage
- ARIA tabs, live regions, skip navigation, and keyboard handlers

## Open audit work

- Complete browser matrix and 390px responsive visual checks
- Add integration coverage for clipboard fallback and generated downloads
- Add migration and backup tests before changing the storage schema
- Measure compliance false-positive/false-negative fixtures
- Validate Markdown escaping when rendered by third-party consumers
- Add content-security guidance for hosted deployment
