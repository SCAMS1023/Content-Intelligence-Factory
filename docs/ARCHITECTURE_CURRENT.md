# Current architecture

The application is a dependency-free classic-script browser app. `index.html` establishes script order; UMD modules expose the same pure functions through `window.TSVF` and CommonJS. `src/core` owns validation, scoring, deterministic content, prompts, compliance, pack assembly, exports, and local storage. `src/ui` owns safe DOM construction, clipboard/download helpers, rendering, and event wiring. `tools/serve.js` is an optional Node static server. Tests exercise the pure core through CommonJS.

The design deliberately supports `file://`, so ES-module-only boot, mandatory bundling, service dependencies, and network-only storage are incompatible with the product contract.

The principal constraint is coupling at the product boundary: TikTok-specific scoring, content, compliance, storage records, and UI flow are treated as the whole application rather than one registered capability.

The compatibility bridge now registers TikTok plugin metadata and services without changing the existing UI calls. On boot, legacy `tsvf.*.v2` records are copied once into `cif.database.v1`; the original keys remain untouched and continue to drive the current UI until extraction is complete.
