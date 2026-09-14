import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveStaticPath } from "./server-path.js";

const port = Number(process.env.PORT ?? 4173);
const root = fileURLToPath(new URL("..", import.meta.url));
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

createServer(async (request, response) => {
  const headers = {
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
  if (!["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405, { ...headers, Allow: "GET, HEAD" });
    response.end();
    return;
  }
  try {
    const pathname = request.url === "/" ? "/index.html" : request.url;
    const target = resolveStaticPath(root, pathname);
    if (!target) throw new Error("Invalid path");
    const file = await readFile(target);
    response.writeHead(200, { ...headers, "Content-Type": contentTypes[extname(target)] ?? "application/octet-stream" });
    response.end(request.method === "HEAD" ? undefined : file);
  } catch {
    response.writeHead(404, { ...headers, "Content-Type": "text/plain; charset=utf-8" });
    response.end("页面不存在");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`一目财务看板已启动：http://127.0.0.1:${port}`);
});
