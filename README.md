# Alongside

A short, research-informed course for parents and caregivers of adults with ADHD. It is educational, not medical advice. Each module links to its evidence source.

## Run locally

Install Node.js, then run `npm ci` and `npm run serve`. Visit <http://127.0.0.1:4173>. JavaScript is required for the interactive course. The local server is for development only.

## Progress and privacy

Copy the resume link after navigating or completing a quiz; an older saved link retains its older progress. Links work as `/<token>` or `/#<token>` and do not require an account or server-side storage. The token contains only a module number and completion flags, not names or quiz answers. It is not secret, encrypted, or tamper-proof: anyone holding a link can inspect or change it. URLs may appear in browser history, logs, or messages, so share carefully. Invalid links start a fresh course with a message. Deploy at the domain root with a fallback to `index.html`.

## Checks

Run `npx playwright install chromium` once and `npm test` for unit, keyboard, screen-reader-facing role/name, and axe accessibility checks. `npm run format` formats files; `npm run check` checks formatting and JavaScript syntax. Install the real pre-commit framework (for example with `uvx pre-commit install`) and run `uvx pre-commit run --all-files`. The hooks require Node and `npm ci` dependencies.

## Docker

Run `docker compose up --build` and visit <http://127.0.0.1:8080>. The example runs unprivileged with a read-only root filesystem, a temporary writable `/tmp`, all capabilities dropped, and no new privileges. Alternatively: `docker build -t alongside .` then `docker run --rm -p 127.0.0.1:8080:8080 --read-only --tmpfs /tmp:rw,noexec,nosuid,size=16m --cap-drop ALL --security-opt no-new-privileges alongside`. Terminate TLS at a trusted reverse proxy in production. The image serves on port 8080 and exposes `/health`.

## Sources

- [NIMH: ADHD in Adults, 4 Things to Know](https://www.nimh.nih.gov/health/publications/adhd-what-you-need-to-know) — adult symptoms, daily functioning, and treatment.
- [NICE NG87: ADHD diagnosis and management](https://www.nice.org.uk/guidance/ng87/chapter/Recommendations) — shared decisions, environmental modifications, and support.
