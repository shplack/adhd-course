# Agent guide

- This is a dependency-light static site. Course data is in `course.js`; rendering and navigation are in `app.js`; resume serialization is in `progress.js`.
- The resume token is versioned and checksummed, not encrypted or authenticated. It stores only the current module and completion bitset. Anyone with the link can read and modify progress. Preserve old version decoding when changing the format or module order.
- Path links require a server fallback to `index.html`; nginx and the local development server provide one. Assets use root-relative URLs, so deploy at the domain root.
- Keep each module's citation verifiable, clearly external, and relevant to its claims. Avoid presenting practical suggestions as proven treatments.
- Modules have three to five questions in `questions`, each with `prompt`, `options`, and a zero-based `answer`. All must be correct to complete the module. Research links must be distinct and include authors, year, title, and journal; preserve study limitations.
- Each sublesson in `sections` has a `title`, at least three `paragraphs`, and an `example` with `scenario` and `try` text. Keep each sublesson 250–400 words, including its example, and frame suggestions as suggestions rather than proven treatment.
- Maintain keyboard behavior, semantic markup, visible focus, live feedback, and accessible names. Run `npm test` and test with real assistive technology when possible. Automated checks do not replace manual review.
- Run `npm ci`, `npx playwright install chromium`, `npm test`, and `uvx pre-commit run --all-files`; install hooks using `uvx pre-commit install`. Hooks require Docker for hadolint and network access to obtain their pinned tools initially.
- Format with `npm run format`. `npm run serve` is a development server only; use the hardened nginx image for distribution.
- Before adding modules, consider the 30-module bitset limit and backward compatibility of existing links.
