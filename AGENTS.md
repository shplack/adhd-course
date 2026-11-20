# Agent guide

- Make a local commit after every task; do not push unless requested.
- This is a dependency-light static site. Course data is in `course.js`; rendering and navigation are in `app.js`; resume serialization is in `progress.js`.
- The resume token is versioned and checksummed, not encrypted or authenticated. Version 1 stores the current module and completion bitset; version 2 identifies its quiz view and version 3 its diploma view. Anyone with the link can read and modify progress. Preserve old version decoding when changing the format or module order.
- Path links require a server fallback to `index.html`; nginx and the local development server provide one. Assets use root-relative URLs, so deploy at the domain root.
- Keep each module's citation verifiable, clearly external, and relevant to its claims. Avoid presenting practical suggestions as proven treatments.
- Modules have three to five questions in `questions`, each with `prompt`, `options`, and a zero-based `answer`. All must be correct to complete the module. Research links must be distinct and include authors, year, title, and journal; preserve study limitations.
- Each sublesson in `sections` has a `title`, at least three `paragraphs`, and an `example` with `scenario` and `try` text. Keep each sublesson 250–400 words, including its example, and frame suggestions as suggestions rather than proven treatment.
- Each sublesson also has a separately written `summary` in plain adult language. Its disclosure is available on hover, keyboard focus, and touch; do not replace the original lesson.
- The header's dark mode toggle defaults to light and stores its choice in local storage, separately from resume tokens. Keep both themes accessible.
- Maintain keyboard behavior, semantic markup, visible focus, live feedback, and accessible names. Run `npm test` and test with real assistive technology when possible. Automated checks do not replace manual review.
- Run `npm ci`, `npx playwright install chromium`, `npm test`, and `uvx pre-commit run --all-files`; install hooks using `uvx pre-commit install`. Hooks require Docker for hadolint and actionlint and network access to obtain their pinned tools initially.
- Format with `npm run format`. `npm run serve` and `npm run watch` (with browser live reload for site files) are development servers only. Use `npm run watch -- --port 4174` or the `PORT` environment variable to avoid port conflicts; use the hardened nginx image for distribution.
- `docker compose watch` rebuilds and restarts the hardened container when site files, `nginx.conf`, or the Dockerfile change; refresh the browser manually.
- `.github/workflows/publish.yml` builds pull requests and publishes amd64/arm64 images to GHCR on pushes to `main` and version tags. Keep action pins current and validate changes with actionlint.
- Before adding modules, consider the 30-module bitset limit and backward compatibility of existing links.
