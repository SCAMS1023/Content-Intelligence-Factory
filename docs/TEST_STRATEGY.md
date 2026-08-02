# Test strategy

## Layers

- Unit tests cover deterministic core logic, schemas, migrations, scoring, compliance, exports, and adapters.
- Integration tests cover plugin registration, storage recovery, backup round-trips, UI orchestration, and provider absence.
- Browser smoke tests cover boot, sample generation, save/delete/undo, tabs, theme, keyboard navigation, downloads, and 390px layout.
- Security fixtures cover XSS payloads, CSV formulas, malformed imports, traversal inputs, corrupt storage, and hostile provider data.

## Release gate

All automated tests must pass; the dependency-free server must start; `index.html` must still boot without a server; no user-controlled value may reach an HTML parser; storage migrations and full backups must round-trip; inferred values and correlations must be visibly labelled.
