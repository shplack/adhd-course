# Alongside

A short, research-informed course for parents and caregivers of adults with ADHD. It is educational, not medical advice. Each module links to its own peer-reviewed research source and ends with three questions; all must be answered correctly to complete it.

## Run locally

Install Node.js, then run `npm ci` and `npm run serve`. Visit <http://127.0.0.1:4173>. JavaScript is required for the interactive course. The local server is for development only.

## Progress and privacy

Copy the resume link after navigating or completing a quiz; an older saved link retains its older progress. Links work as `/<token>` or `/#<token>` and do not require an account or server-side storage. The token contains only a module number and completion flags, not names or quiz answers. It is not secret, encrypted, or tamper-proof: anyone holding a link can inspect or change it. URLs may appear in browser history, logs, or messages, so share carefully. Invalid links start a fresh course with a message. Deploy at the domain root with a fallback to `index.html`.

## Checks

Run `npx playwright install chromium` once and `npm test` for unit, keyboard, screen-reader-facing role/name, and axe accessibility checks across modules and feedback states. `npm run format` formats files; `npm run check` checks formatting and JavaScript syntax. Install the real pre-commit framework (for example with `uvx pre-commit install`) and run `uvx pre-commit run --all-files`. The hooks require Node, `npm ci` dependencies, Docker for hadolint, and network access for the initial tool downloads. Automated checks do not replace testing with a screen reader.

## Docker

Run `docker compose up --build` and visit <http://127.0.0.1:8080>. The example runs unprivileged with a read-only root filesystem, a temporary writable `/tmp`, all capabilities dropped, and no new privileges. Alternatively: `docker build -t alongside .` then `docker run --rm -p 127.0.0.1:8080:8080 --read-only --tmpfs /tmp:rw,noexec,nosuid,size=16m --cap-drop ALL --security-opt no-new-privileges alongside`. Terminate TLS at a trusted reverse proxy in production. The image serves on port 8080 and exposes `/health`.

## Sources

- [Faraone SV et al. (2021). The World Federation of ADHD International Consensus Statement: 208 Evidence-based Conclusions about the Disorder. Neuroscience & Biobehavioral Reviews.](https://pmc.ncbi.nlm.nih.gov/articles/PMC8328933/)
- [Stevens AE et al. (2023). Transitioning to college with ADHD: a qualitative examination of parental support and the renegotiation of the parent-child relationship. Current Psychology.](https://pmc.ncbi.nlm.nih.gov/articles/PMC10041513/) Small qualitative study of 11 college students; findings may not generalize to all adults.
- [Safren SA et al. (2010). Cognitive Behavioral Therapy vs Relaxation With Educational Support for Medication-Treated Adults With ADHD and Persistent Symptoms: A Randomized Controlled Trial. JAMA.](https://pmc.ncbi.nlm.nih.gov/articles/PMC3641654/)
- [Cortese S et al. (2018). Comparative efficacy and tolerability of medications for attention-deficit hyperactivity disorder in children, adolescents, and adults: a systematic review and network meta-analysis. The Lancet Psychiatry.](https://pmc.ncbi.nlm.nih.gov/articles/PMC6109107/)
