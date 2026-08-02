# Repository working agreement

- Preserve the zero-install `file://` application and dependency-free static server.
- Extend stable core behavior incrementally; do not rewrite working features without tests.
- Keep user-controlled text out of HTML parsing APIs. Render it with `textContent`.
- Mark inferred analytics explicitly and preserve source provenance.
- Run `node --test test/core.test.js` after every logical change.
- Add regression tests for every confirmed defect and update the relevant documentation.
- Never add credentials, scraping claims, or a mandatory online provider.
