// Reproduce Cloudflare Pages' /index.html redirect using a real worker and browser.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";

if (!process.argv[2]) throw new Error("Pass the installed Playwright Core ESM entry.");
const { chromium } = await import(pathToFileURL(path.resolve(process.argv[2])).href);
const root = path.resolve("dist");
const pkg = JSON.parse(await fs.readFile("package.json", "utf8"));
const report = { version: pkg.version, mode: "Real worker, first installation, HTTP 308 index redirect", checks: [], errors: [] };
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg" };
const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  if (url.pathname === "/index.html") { response.writeHead(308, { Location: "/" }); response.end(); return; }
  const file = path.resolve(root, "." + (url.pathname === "/" ? "/index.html" : url.pathname));
  if (!file.startsWith(root + path.sep)) { response.writeHead(403); response.end(); return; }
  try { const bytes = await fs.readFile(file); response.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" }); response.end(bytes); }
  catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, "localhost", resolve));
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const context = await browser.newContext({ serviceWorkers: "allow" });
  const page = await context.newPage();
  page.on("pageerror", error => report.errors.push(error.message));
  await page.route(/youtube\.com|fonts\.(googleapis|gstatic)\.com/, route => route.abort());
  await page.goto(base);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 30000 });
  const redirected = await page.evaluate(async version => {
    const cache = await caches.open("yonezu-guide-v" + version);
    return (await cache.match("./index.html"))?.redirected;
  }, pkg.version);
  assert.equal(redirected, true, "The test must precache the real redirected response");
  report.checks.push("Initial index.html precache contains an HTTP redirect history");
  await context.setOffline(true);
  await page.reload();
  await page.locator(".hero").waitFor();
  report.checks.push("First offline homepage reload initializes after a redirected precache");
  await page.goto(base + "#/song/Lemon");
  await page.waitForFunction(() => document.getElementById("song-page-heading")?.textContent === "Lemon" && document.querySelectorAll(".lyric-line").length === 37);
  await page.reload();
  await page.waitForFunction(() => document.getElementById("song-page-heading")?.textContent === "Lemon" && document.querySelectorAll(".lyric-line").length === 37);
  report.checks.push("First offline song route and reload preserve bilingual local content");
  assert.deepEqual(report.errors, []);
  report.checks.push("No uncaught application errors");
  console.log("PASS redirected precache, first offline home/song reload and local content");
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  if (process.env.YONEZU_REDIRECT_QA_OUTPUT) {
    await fs.mkdir(path.dirname(process.env.YONEZU_REDIRECT_QA_OUTPUT), { recursive: true });
    await fs.writeFile(process.env.YONEZU_REDIRECT_QA_OUTPUT, JSON.stringify(report, null, 2) + "\n");
  }
}
