# Agent guide

- Make a local commit after every task; do not push unless requested.
- This is a dependency-light static site. Course data is in `course.js`; rendering and navigation are in `app.js`; resume serialization is in `progress.js`.
- Resume tokens are versioned and checksummed, not encrypted or authenticated. V1–3 map historical positions using the immutable legacy table in `progress.js`; v1 completions are ambiguous and reset, while v2–3 use frozen shipped quiz fingerprints. V4 stores stable module IDs, views, and quiz fingerprints. Keep IDs unique and permanent (never reuse removed IDs), preserve old decoders and fingerprint algorithm, and retain legacy mappings. Quiz question, option, or answer edits reset that quiz's completion; prose edits and reordering do not. New encodings require a new version, not a change to v4's algorithm. Links cannot recover scroll position.
- Path links require a server fallback to `index.html`; nginx and the local development server provide one. Assets use root-relative URLs, so deploy at the domain root.
- Keep each module's citation verifiable, clearly external, and relevant to its claims. Avoid presenting practical suggestions as proven treatments.
- Modules have three to five questions in `questions`, each with `prompt`, `options`, and a zero-based `answer`. All must be correct to complete the module. Research links must be distinct and include authors, year, title, and journal; preserve study limitations.
- Each sublesson in `sections` has a `title`, at least three `paragraphs`, and an `example` with `scenario` and `try` text. Keep each sublesson 250–400 words, including its example, and frame suggestions as suggestions rather than proven treatment.
- Each module has one `example.avoid` paired with its existing scenario and suggested approach; keep it respectful and non-shaming.
- Each sublesson also has a separately written `summary` in plain adult language. Its disclosure is available on hover, keyboard focus, and touch; do not replace the original lesson.
- The header's dark mode toggle defaults to light and stores its choice in local storage, separately from resume tokens. Keep both themes accessible.
- Unfinished-quiz reminders apply only to pointer clicks; keyboard and assistive-technology virtual clicks skip them. This means sighted keyboard-only users also skip the reminder; input modality cannot reliably identify screen readers.
- Maintain keyboard behavior, semantic markup, visible focus, live feedback, and accessible names. Run `npm test` and test with real assistive technology when possible. Automated checks do not replace manual review.
- Run `npm ci`, `npx playwright install chromium`, `npm test`, and `uvx pre-commit run --all-files`; install hooks using `uvx pre-commit install`. Hooks require Docker for hadolint and actionlint and network access to obtain their pinned tools initially.
- Format with `npm run format`. `npm run serve` and `npm run watch` (with browser live reload for site files) are development servers only. Use `npm run watch -- --port 4174` or the `PORT` environment variable to avoid port conflicts; use the hardened nginx image for distribution.
- `docker compose watch` rebuilds and restarts the hardened container when site files, `nginx.conf`, or the Dockerfile change; refresh the browser manually.
- `.github/workflows/publish.yml` builds pull requests and publishes amd64/arm64 images to GHCR on pushes to `main` and version tags. Keep action pins current and validate changes with actionlint.
- Before adding modules, consider the 30-module limit and backward compatibility of existing links.
