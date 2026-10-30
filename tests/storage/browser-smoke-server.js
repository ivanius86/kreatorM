const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const PORT = Number(process.env.KREATORM_SMOKE_PORT || 41739);
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

const server = http.createServer((request, response) => {
  const relative = request.url === "/" ? "tests/storage/browser-smoke.html" : decodeURIComponent(request.url.split("?")[0]).replace(/^\/+/, "");
  const resolved = path.resolve(ROOT, relative);
  if (resolved !== ROOT && !resolved.startsWith(`${ROOT}${path.sep}`)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  fs.stat(resolved, (statError, stat) => {
    if (statError || !stat.isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": MIME[path.extname(resolved)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    fs.createReadStream(resolved).pipe(response);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  process.stdout.write(`KREATORM_SMOKE_SERVER_READY:${PORT}\n`);
});
