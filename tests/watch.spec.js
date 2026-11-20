import { test, expect } from "@playwright/test";
import {
  mkdtemp,
  copyFile,
  appendFile,
  readFile,
  writeFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { encodeProgress } from "../progress.js";

test("watch accepts an explicit port and rejects invalid ports", async ({
  request,
}) => {
  const reservation = createServer();
  await new Promise((resolveListen, reject) => {
    reservation.once("error", reject);
    reservation.listen(0, "127.0.0.1", resolveListen);
  });
  const port = reservation.address().port;
  await new Promise((resolveClose, reject) =>
    reservation.close((error) => (error ? reject(error) : resolveClose())),
  );
  const server = spawn(
    process.execPath,
    [resolve("scripts/serve.js"), "--watch", "--port", String(port)],
    {
      env: { ...process.env, PORT: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  try {
    const output = await new Promise((resolveOutput, reject) => {
      server.stdout.once("data", (chunk) => resolveOutput(chunk.toString()));
      server.once("error", reject);
      server.once("exit", (code) =>
        reject(new Error(`Watch server exited: ${code}`)),
      );
    });
    expect(output).toContain(`http://127.0.0.1:${port}`);
    expect((await request.get(`http://127.0.0.1:${port}/`)).status()).toBe(200);
  } finally {
    if (server.exitCode === null) {
      const exited = new Promise((resolveExit) =>
        server.once("exit", resolveExit),
      );
      server.kill();
      await exited;
    }
  }
  for (const bad of ["-1", "65536", "nope", ""]) {
    const result = spawnSync(
      process.execPath,
      [resolve("scripts/serve.js"), "--watch", "--port", bad],
      { encoding: "utf8", timeout: 5000 },
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/port/i);
  }
});

test("watch server reloads changed files and preserves a quiz deep link", async ({
  page,
}) => {
  const dir = await mkdtemp(join(tmpdir(), "alongside-watch-"));
  let server;
  try {
    for (const file of [
      "index.html",
      "app.js",
      "course.js",
      "progress.js",
      "styles.css",
    ]) {
      await copyFile(resolve(file), join(dir, file));
    }
    server = spawn(process.execPath, [resolve("scripts/serve.js"), "--watch"], {
      cwd: dir,
      env: { ...process.env, PORT: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const port = await new Promise((resolvePort, reject) => {
      let output = "";
      server.stdout.on("data", (chunk) => {
        output += chunk.toString();
        const match = output.match(/http:\/\/127\.0\.0\.1:(\d+)/);
        if (match) resolvePort(match[1]);
      });
      server.once("error", reject);
      server.once("exit", (code) =>
        reject(new Error(`Watch server exited: ${code}`)),
      );
    });
    const token = encodeProgress(
      { current: 1, completed: [0], view: "quiz" },
      4,
    );
    const address = `http://127.0.0.1:${port}/${token}`;
    const connected = page.waitForResponse((response) =>
      response.url().endsWith("/__dev/events"),
    );
    await page.goto(address);
    await connected;
    await expect(
      page.getByRole("heading", { name: "Quiz: Support without taking over" }),
    ).toBeVisible();
    for (const [file, comment] of [
      ["styles.css", "\n/* watch test */\n"],
      ["app.js", "\n// watch test\n"],
      ["course.js", "\n// watch test\n"],
      ["progress.js", "\n// watch test\n"],
      ["index.html", null],
    ]) {
      const reconnect = page.waitForResponse((response) =>
        response.url().endsWith("/__dev/events"),
      );
      const reload = page.waitForEvent("load");
      if (file === "index.html") {
        const path = join(dir, file);
        const html = await readFile(path, "utf8");
        await writeFile(
          path,
          html.replace("<footer>", "<footer><span>Watch test updated</span>"),
        );
      } else {
        await appendFile(join(dir, file), comment);
      }
      await reload;
      await reconnect;
      await expect(page).toHaveURL(address);
      await expect(
        page.getByRole("heading", {
          name: "Quiz: Support without taking over",
        }),
      ).toBeVisible();
      await expect(page.getByText("1 of 4 modules completed")).toBeVisible();
      if (file === "index.html") {
        await expect(
          page.getByText("Watch test updated", { exact: true }),
        ).toBeVisible();
      }
    }
  } finally {
    if (server && server.exitCode === null) {
      const exited = new Promise((resolveExit) =>
        server.once("exit", resolveExit),
      );
      server.kill();
      await exited;
    }
    await rm(dir, { recursive: true, force: true });
  }
});
