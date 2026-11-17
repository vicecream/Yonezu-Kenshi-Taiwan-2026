import http from "node:http";
import { createReadStream, statSync, existsSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const audioArgument = process.argv.indexOf("--audio");
if (audioArgument < 0 || !process.argv[audioArgument + 1]) throw new Error("Pass --audio <local excerpt.mp3>");
const audio = resolve(process.argv[audioArgument + 1]);
if (!existsSync(audio)) throw new Error("Local excerpt audio was not found");
const vocalArgument = process.argv.indexOf("--vocals");
const vocals = vocalArgument >= 0 ? resolve(process.argv[vocalArgument + 1]) : null;
const port = Number(process.env.KARAOKE_SAMPLE_PORT || 5174);
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".mp3": "audio/mpeg", ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp" };
const server = http.createServer((request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");
    const pathname = decodeURIComponent(url.pathname);
    const file = pathname === "/sample-audio.mp3" ? audio : pathname === "/sample-vocals.mp3" && vocals ? vocals : resolve(root, `.${pathname === "/" ? "/experiments/its-alright.html" : pathname}`);
    if (file !== audio && file !== vocals && (!file.startsWith(root.endsWith(sep) ? root : root + sep) || pathname.split("/").some(part => part.startsWith(".")))) {
      response.writeHead(403).end(); return;
    }
    if (!["GET", "HEAD"].includes(request.method)) { response.writeHead(405).end(); return; }
    const stat = statSync(file);
    if (!stat.isFile()) { response.writeHead(404).end(); return; }
    const headers = { "Content-Type": mime[extname(file)] || "application/octet-stream", "Cache-Control": "no-store", "Accept-Ranges": "bytes", "X-Content-Type-Options": "nosniff" };
    const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Math.min(stat.size - 1, range[2] ? Number(range[2]) : stat.size - 1);
      if (start > end || start >= stat.size) { response.writeHead(416, { "Content-Range": `bytes */${stat.size}` }).end(); return; }
      response.writeHead(206, { ...headers, "Content-Length": end - start + 1, "Content-Range": `bytes ${start}-${end}/${stat.size}` });
      if (request.method === "HEAD") response.end(); else createReadStream(file, { start, end }).pipe(response);
    } else {
      response.writeHead(200, { ...headers, "Content-Length": stat.size });
      if (request.method === "HEAD") response.end(); else createReadStream(file).pipe(response);
    }
  } catch { response.writeHead(404).end("Not found"); }
});
server.listen(port, "127.0.0.1", () => console.log(`Karaoke sample: http://127.0.0.1:${port}/experiments/its-alright.html`));
