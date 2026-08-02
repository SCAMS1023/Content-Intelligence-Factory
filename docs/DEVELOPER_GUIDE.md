# Developer guide

## Constraints

The application must keep working from `file://`. Runtime modules therefore use UMD wrappers and classic script order. Do not introduce a mandatory build, server, dependency, account, or network provider.

## Tests

Run:

```bash
node --test test/*.test.js
```

The package script runs the same suite with `npm test`. New behavior requires regression coverage.

## Architecture

Shared foundations live in `src/core`, storage and migrations in `src/platform`, schemas in `src/schemas`, platform features in `src/plugins`, and browser wiring in `src/ui`. Plugins declare validated metadata and must degrade gracefully when providers are absent.

## Security

Treat forms, imports, transcripts, stored records, provider responses, and generated text as untrusted. Use safe DOM node construction and `textContent`; never send user data to an HTML parser. Validate imports before writes, neutralize CSV formulas, preserve provenance, and label inference and correlation.

## Adding a plugin

Create metadata containing `id`, `name`, `version`, `description`, `dependencies`, `routes`, `services`, `storageSchema`, `capabilities`, and `enabled`. Register dependencies before dependents. Add unit and integration tests and preserve offline boot.

