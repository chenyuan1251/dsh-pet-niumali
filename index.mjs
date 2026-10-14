import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const WEB_DIR = fileURLToPath(new URL("./web", import.meta.url));
const PET_PATH = "/pet-niumali";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function mimeFor(path) {
  return MIME[extname(path).toLowerCase()] || "application/octet-stream";
}

function safePath(pathname) {
  // strip prefix and decode
  let rel = pathname.slice(PET_PATH.length);
  if (rel.startsWith("/")) rel = rel.slice(1);
  // prevent directory traversal
  rel = decodeURIComponent(rel).replace(/\\/g, "/");
  if (rel.includes("..")) return null;
  return join(WEB_DIR, rel);
}

export const name = "dsh-pet-niumali";

// We only need the DSH web server; the plugin stays pending if webServer is absent.
export const inject = ["webServer"];

export function apply(ctx) {
  ctx.effect(() => {
    const dispose = ctx.webServer.register({
      kind: "prefix",
      path: PET_PATH,
      handler: (req, res) => {
        const pathname = new URL(req.url, "http://localhost").pathname;

        // The page references its assets relatively ("assets/style.css"), which only
        // resolve against /pet-niumali/ when the document URL ends in a slash. Without
        // this redirect every asset 404s and the page renders completely unstyled.
        if (pathname === PET_PATH) {
          res.writeHead(302, {
            location: `${PET_PATH}/`,
            "cache-control": "no-store",
          }).end();
          return;
        }

        let file = safePath(pathname);
        if (!file) {
          res.writeHead(403, { "cache-control": "no-store" }).end("Forbidden");
          return;
        }

        // Directory → index.html
        let stat;
        try {
          stat = statSync(file);
          if (stat.isDirectory()) {
            file = join(file, "index.html");
            stat = statSync(file);
          }
        } catch {
          // Never cache a miss: a 404 cached for a day outlives the file it failed on.
          res.writeHead(404, { "cache-control": "no-store" }).end("Not found");
          return;
        }

        const type = mimeFor(file);
        res.writeHead(200, {
          "content-type": type,
          "content-length": stat.size,
          // Keep the shell fresh but let the artwork be cached hard.
          "cache-control": type.startsWith("text/html")
            ? "no-cache"
            : "public, max-age=86400",
        });
        createReadStream(file).pipe(res);
      },
    });
    return () => {
      try { dispose(); } catch {}
    };
  }, "dsh-pet-niumali: serve /pet-niumali");
}
