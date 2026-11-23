import { test, expect } from "@playwright/test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { modules } from "../course.js";
import { encodeProgress } from "../progress.js";

test("Pages build serves assets and resumes under the project path", async ({
  page,
}) => {
  const dir = await mkdtemp(join(tmpdir(), "course-pages-"));
  let server;
  try {
    const build = spawnSync(process.execPath, ["scripts/build-pages.js"], {
      cwd: resolve("."),
      env: {
        ...process.env,
        PAGES_OUTPUT_DIR: dir,
        PAGES_BASE_PATH: "/adhd-course/",
      },
      encoding: "utf8",
    });
    expect(build.status, build.stderr).toBe(0);
    const files = new Map(
      await Promise.all(
        [
          "index.html",
          "404.html",
          "app.js",
          "course.js",
          "progress.js",
          "styles.css",
          "favicon.svg",
        ].map(async (name) => [name, await readFile(join(dir, name))]),
      ),
    );
    expect(files.get("404.html").equals(files.get("index.html"))).toBe(true);
    server = createServer((req, res) => {
      const path = new URL(req.url, "http://localhost").pathname;
      const name =
        path === "/adhd-course/"
          ? "index.html"
          : path.slice("/adhd-course/".length);
      const type = name.endsWith(".js")
        ? "text/javascript"
        : name.endsWith(".css")
          ? "text/css"
          : name.endsWith(".svg")
            ? "image/svg+xml"
            : "text/html";
      if (!files.has(name)) {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end(files.get("404.html"));
      } else {
        res.writeHead(200, { "Content-Type": type });
        res.end(files.get(name));
      }
    });
    await new Promise((resolveListen) =>
      server.listen(0, "127.0.0.1", resolveListen),
    );
    const base = `http://127.0.0.1:${server.address().port}/adhd-course/`;
    const token = encodeProgress(
      { current: 2, completed: [0], view: "quiz" },
      modules,
    );
    await page.goto(base);
    await expect(
      page.getByRole("heading", { name: modules[0].title, level: 2 }),
    ).toBeVisible();
    await expect(page.locator("#invalid-link")).toBeEmpty();
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
      "href",
      "/adhd-course/favicon.svg",
    );
    const response = await page.goto(`${base}${token}`);
    expect(response.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: `Quiz: ${modules[2].title}` }),
    ).toBeVisible();
    await expect(page.locator("#progress-count")).toHaveText(
      "1 of 4 modules completed",
    );
    await expect(page.getByLabel("Your resume link")).toHaveValue(
      `${base}${token}`,
    );
    await page.goto(`${base}#${token}`);
    await expect(
      page.getByRole("heading", { name: `Quiz: ${modules[2].title}` }),
    ).toBeVisible();
    await page.goto(`${base}1-2-f-1enyvj8`);
    await expect(
      page.getByRole("status").filter({ hasText: /saved link.*updated/i }),
    ).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/adhd-course/4-`));
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Reset course progress" }).click();
    await expect(page).toHaveURL(base);
    await expect(page.locator("#progress-count")).toHaveText(
      "0 of 4 modules completed",
    );
    await expect(
      page.getByRole("link", { name: "ADHD for parents" }),
    ).toHaveAttribute("href", "/adhd-course/");
  } finally {
    if (server) await new Promise((resolveClose) => server.close(resolveClose));
    await rm(dir, { recursive: true, force: true });
  }
});
