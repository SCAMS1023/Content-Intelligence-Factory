/* Optional local static server. The app is designed to run by double-clicking
   index.html, but a real http:// origin is handy for testing clipboard access
   and devtools. Zero dependencies.

   Usage: npm run serve   (then open http://localhost:4173) */
"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const url = require("node:url");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT) || 4173;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".md": "text/markdown; charset=utf-8"
};

const server = http.createServer(function (req, res) {
  let pathname;
  try {
    pathname = decodeURIComponent(url.parse(req.url).pathname);
  } catch (e) {
    res.writeHead(400).end("Bad request");
    return;
  }

  if (pathname === "/") pathname = "/index.html";

  const target = path.join(ROOT, pathname);
  const rel = path.relative(ROOT, target);

  /* Refuse anything that escapes the project root. */
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  fs.readFile(target, function (err, data) {
    if (err) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not found: " + pathname);
      return;
    }
    res.writeHead(200, {
      "content-type": TYPES[path.extname(target).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-store"
    }).end(data);
  });
});

server.listen(PORT, function () {
  console.log("TikTok Shop Video Factory serving " + ROOT);
  console.log("http://localhost:" + PORT);
});
