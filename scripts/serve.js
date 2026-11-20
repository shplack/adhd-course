import { createServer } from "node:http";
import { watch } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const root = resolve(".");
const watching = process.argv.includes("--watch");
const clients = new Set();
const port = process.env.PORT === undefined ? 4173 : Number(process.env.PORT);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new RangeError("PORT must be an integer from 0 to 65535");
}
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};
if (watching) {
  let timer;
  watch(root, (event, name) => {
    if (name && !/\.(html|css|js)$/i.test(name.toString())) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      for (const client of clients) client.write("data: reload\n\n");
    }, 150);
  });
}

const server = createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  if (watching && path === "/__dev/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(": connected\n\n");
    clients.add(res);
    res.on("close", () => clients.delete(res));
    return;
  }
  if (watching && path === "/__dev/live-reload.js") {
    res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
    res.end(
      'new EventSource("/__dev/events").onmessage = () => location.reload();',
    );
    return;
  }
  const file =
    path === "/" || !extname(path)
      ? "index.html"
      : decodeURIComponent(path).slice(1);
  const target = resolve(root, file);
  if (!target.startsWith(root + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    let data = await readFile(target);
    if (watching && file === "index.html") {
      data = data
        .toString()
        .replace(
          "</body>",
          '<script type="module" src="/__dev/live-reload.js"></script></body>',
        );
    }
    res.writeHead(200, {
      "Content-Type": types[extname(target)] || "application/octet-stream",
    });
    res.end(data);
  } catch {
    res.writeHead(404).end("Not found");
  }
});
server.listen(port, "127.0.0.1", () => {
  console.log(`Course available at http://127.0.0.1:${server.address().port}`);
});
