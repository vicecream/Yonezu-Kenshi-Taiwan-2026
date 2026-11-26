// Inspect real generated candidates in the local UI without creating listening attestations.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { startServer } from "../tools/timing-review/server.mjs";
import { createDraft } from "../tools/timing-review/model.js";

if (!process.argv[2]) throw new Error("Pass the installed Playwright Core ESM entry.");
const { chromium } = await import(pathToFileURL(path.resolve(process.argv[2])).href);
const storage = await fs.mkdtemp(path.join(os.tmpdir(), "yonezu-real-candidate-ui-"));
const output = path.resolve("artifacts/timing-review/qa-candidates");
await fs.mkdir(output, { recursive: true });
const running = await startServer({ port: 0, storage });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const report = { mediaMode: "Real audio-derived candidate data; no streaming or human listening certification", checks: [], errors: [] };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); console.log("PASS " + name); };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, locale: "zh-TW" });
  const page = await context.newPage(); page.setDefaultTimeout(12000);
  page.on("pageerror", error => report.errors.push(error.message));
  await page.route(/^https?:\/\/(?!localhost:)/, route => route.abort());
  await page.goto(running.url);
  await page.locator("#workspace:not([hidden])").waitFor();
  for (const song of running.catalog.songs) {
    await page.locator("#song").selectOption(song.id);
    await page.waitForFunction(id => location.hash === "#" + id && !document.querySelector("#song").disabled, song.id);
    const draft = createDraft(song);
    const index = Math.max(0, draft.lines.findIndex(line => line.candidateBasis));
    await page.locator(`[data-line="${index}"]`).click();
    if (!await page.locator("#word-panel").evaluate(element => element.open)) await page.locator("#word-panel summary").click();
    const line = draft.lines[index];
    const fields = await page.locator("#words input").evaluateAll(inputs => inputs.map(input => input.value === "" ? null : Number(input.value)));
    check(`${song.id}: actual candidate seconds and original text`, await page.locator("#line-start").inputValue() === String(line.start)
      && await page.locator("#line-end").inputValue() === String(line.end ?? "") && await page.locator("#line-jp").innerText() === line.text
      && JSON.stringify(fields) === JSON.stringify(line.words.flatMap(word => [word.start, word.end])));
    check(`${song.id}: no invented listening approval or whole-song gate`, (await page.locator("#progress").innerText()).startsWith("0 /")
      && await page.locator("#anchors, #confirm-source").count() === 0);
  }
  check("Read-only inspection did not write any manual reviews", (await fs.readdir(storage)).length === 0);
  await page.locator("#song").selectOption("Lady");
  await page.waitForFunction(() => location.hash === "#Lady" && !document.querySelector("#song").disabled);
  const lady = running.catalog.songs.find(song => song.id === "Lady");
  const index = Math.max(0, createDraft(lady).lines.findIndex(line => line.candidateBasis));
  await page.locator(`[data-line="${index}"]`).click();
  check("Word action offers current-range audio alignment instead of restoring old candidate bounds",
    (await page.locator("#apply-candidate").innerText()).includes("依目前區段") && await page.locator("#apply-candidate").isEnabled());
  await page.screenshot({ path: path.join(output, "desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  check("Actual-candidate mobile page stays within viewport", await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: path.join(output, "mobile.png"), fullPage: true });
  check("Preview preserves original Japanese text with candidate units", await page.locator("#preview-jp").innerText() === await page.locator("#line-jp").innerText());
  for (const file of await fs.readdir(storage)) if (file.endsWith(".json")) {
    const saved = JSON.parse(await fs.readFile(path.join(storage, file), "utf8"));
    check("Trying candidate timings creates no listening attestations", saved.draft.lines.every(line => line.review.status === "pending"));
  }
  check("No browser script errors", report.errors.length === 0);
} finally {
  await browser.close(); await running.close();
  await fs.writeFile(path.join(output, "results.json"), JSON.stringify(report, null, 2) + "\n");
  assert.ok(path.dirname(path.resolve(storage)) === path.resolve(os.tmpdir()) && path.basename(storage).startsWith("yonezu-real-candidate-ui-"));
  await fs.rm(storage, { recursive: true, force: true });
}
