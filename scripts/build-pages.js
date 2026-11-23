import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

const basePath = process.env.PAGES_BASE_PATH ?? "/adhd-course/";
if (!/^\/(?:[a-zA-Z0-9._-]+\/)*$/.test(basePath)) {
  throw new Error("PAGES_BASE_PATH must be an absolute directory path.");
}
const output = resolve(process.env.PAGES_OUTPUT_DIR ?? "dist");
await mkdir(output, { recursive: true });
let html = await readFile("index.html", "utf8");
for (const path of ["/favicon.svg", "/styles.css", "/app.js", "/"]) {
  const original = `="${path}"`;
  if (!html.includes(original))
    throw new Error(`Missing ${original} in index.html`);
  html = html.replace(original, `="${basePath}${path.slice(1)}"`);
}
await Promise.all([
  writeFile(join(output, "index.html"), html),
  writeFile(join(output, "404.html"), html),
  ...["app.js", "course.js", "progress.js", "styles.css", "favicon.svg"].map(
    (file) => copyFile(file, join(output, file)),
  ),
]);
