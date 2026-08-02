# Target architecture

The target is an offline-first shell with a small shared foundation and independently registered platform plugins.

- `src/app`: boot, navigation, orchestration, error recovery
- `src/core`: event bus, plugin registry, feature flags, logging
- `src/platform`: storage adapters, migrations, import/export, provider contracts
- `src/shared`: schemas, UI primitives, scoring and compliance utilities
- `src/plugins/tiktok-shop`: current product intelligence workflow
- `src/plugins/content-studio`: cross-platform deterministic generation
- `src/plugins/youtube-intelligence`: manual research import and analysis
- `src/plugins/analytics`: performance records and correlation analysis
- `src/workers`: optional computation workers with synchronous fallback
- `src/schemas`: versioned record definitions

Every plugin declares `id`, `name`, `version`, `description`, `dependencies`, `routes`, `services`, `storageSchema`, `capabilities`, and `enabled`. Providers are optional adapters; missing providers produce useful offline states rather than startup failures.
