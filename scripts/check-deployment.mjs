// Build in isolated output directories, leaving dist available for browser QA.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
const directory = await fs.mkdtemp(path.join(os.tmpdir(), "yonezu-build-"));
for (const [name, configured] of [["unset", {}], ["configured", { SITE_URL: "https://concert.example/", CF_PAGES_URL: "https://preview.example/" }]]) {
  const output = path.join(directory, name);
  const env = { ...process.env };
  delete env.SITE_URL; delete env.CF_PAGES_URL;
  const result = spawnSync(process.execPath, ["node_modules/vite/bin/vite.js", "build", "--outDir", output, "--emptyOutDir"], { env: { ...env, ...configured }, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const html = await fs.readFile(path.join(output, "index.html"), "utf8");
  const robots = await fs.readFile(path.join(output, "robots.txt"), "utf8");
  if (name === "unset") {
    assert.doesNotMatch(html, /rel="canonical"|property="og:(url|image)"/);
    assert.match(html, /noindex, nofollow/);
    assert.match(robots, /Disallow: \//);
    await assert.rejects(fs.access(path.join(output, "sitemap.xml")));
  } else {
    assert.match(html, /rel="canonical" href="https:\/\/concert.example\/"/);
    assert.match(html, /property="og:image" content="https:\/\/concert.example\/icon-512.png"/);
    assert.match(robots, /Sitemap: https:\/\/concert.example\/sitemap.xml/);
    assert.match(await fs.readFile(path.join(output, "sitemap.xml"), "utf8"), /<loc>https:\/\/concert.example\/<\/loc>/);
  }
  assert.doesNotMatch(html, /kaze\.tiaui|fujii-kaze-taiwan/);
  await assert.rejects(fs.access(path.join(output, "CNAME")));
  await assert.rejects(fs.access(path.join(output, "archive")));
  const worker = await fs.readFile(path.join(output, "sw.js"), "utf8");
  const assets = JSON.parse(worker.match(/const VITE_BUILD_ASSETS = (\[[^;]*\]);/)[1]);
  assert.ok(assets.some(asset => asset.includes("song-lyrics-")));
  assert.ok(assets.every(asset => !asset.includes("archive") && !asset.includes("prema")));
  for (const asset of assets) await fs.access(path.join(output, asset));
  console.log("PASS production build: " + name + " URL, metadata, precache graph and archive exclusion");
}
