# Security model

## Trust boundaries

User form data, imported files, transcripts, URLs, provider responses, stored records, and generated content are untrusted. They may be displayed only through text nodes or safe attribute setters, validated before persistence, and escaped or neutralized for each export format.

## Required controls

- No `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval`, or dynamic function construction with untrusted data.
- CSV formula prefixes are neutralized before RFC 4180 escaping.
- Imports use size limits, schema versions, explicit migrations, and recoverable rejection.
- Storage writes are failure-aware; corrupt values are quarantined or ignored without destroying the last valid backup.
- Static file paths are decoded once and verified to remain inside the application root.
- Provider credentials are never committed or stored by default.
- Claims and analytics clearly separate observations, inferences, correlations, and unsupported causation.

The compliance scanner is a drafting aid, not legal advice.
