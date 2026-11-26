// Synthetic analysis and listening attestations stay in temporary review storage.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { startServer } from "../tools/timing-review/server.mjs";

if (!process.argv[2]) throw new Error("Pass the installed Playwright Core ESM entry.");
const { chromium } = await import(pathToFileURL(path.resolve(process.argv[2])).href);
const storage = await fs.mkdtemp(path.join(os.tmpdir(), "yonezu-manual-word-ui-"));
const output = "artifacts/timing-review/qa-manual-alignment";
await fs.mkdir(output, { recursive: true });
let mode = "success", release, received = [], aborted = 0;
const running = await startServer({ port: 0, storage, includeCandidates: false, alignLine: async (song, line, { signal }) => {
  received.push({ id: song.id, start: line.start, end: line.end });
  if (mode === "failure") throw new Error("Synthetic model unavailable");
  if (mode === "wait") await new Promise((resolve, reject) => {
    release = resolve;
    signal.addEventListener("abort", () => { aborted++; reject(new DOMException("Cancelled", "AbortError")); }, { once: true });
  });
  const spans = [[.1, .6], [.6, 1], [1.8, 2.8], [2.8, 3.1]];
  return { index: line.index, text: line.text, start: line.start, end: line.end, flags: [],
    words: line.units.map((unit, index) => ({ ...unit, start: line.start + spans[index][0], end: line.start + spans[index][1] })),
    alignment: { backend: "synthetic-fixture", rangeStart: line.start, rangeEnd: line.end } };
} });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const report = { basis: "Synthetic model results in isolated temporary storage; not actual audio or human listening", checks: [], errors: [] };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); console.log("PASS " + name); };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, locale: "zh-TW" });
  page.setDefaultTimeout(10000);
  page.on("pageerror", error => report.errors.push(error.message));
  await page.route(/^https?:\/\/(?!localhost:)/, route => route.abort());
  const wait = (fn, arg) => page.waitForFunction(fn, arg, { polling: 100 });
  const saved = () => wait(() => document.querySelector("#save-status").textContent === "修正已自動儲存到本機");
  const record = async () => JSON.parse(await fs.readFile(path.join(storage, "Flamingo.json"), "utf8"));
  const completed = () => wait(() => document.querySelector("#word-align-status").textContent.startsWith("已依目前起訖"));
  await page.goto(running.url + "#Flamingo"); await page.locator("#workspace:not([hidden])").waitFor();
  await page.locator("#line-start").fill("16.4"); await page.locator("#line-end").fill("20.2"); await saved();
  await page.locator("#reviewer").fill("synthetic-ui-test");
  await page.locator("#listened").check(); await page.locator("#pass").click(); await saved();
  const approved = (await record()).draft.lines[0];
  await page.locator("#word-panel summary").click();
  await page.locator("#apply-candidate").click(); await completed();
  const aligned = (await record()).draft.lines[0];
  check("Request uses manually corrected 16.4–20.2 rather than original bounds", received[0].start === 16.4 && received[0].end === 20.2);
  check("Manual bounds and line-only approval survive new words", aligned.start === 16.4 && aligned.end === 20.2
    && aligned.review.status === "passed" && aligned.review.level === "line" && aligned.review.reviewedAt === approved.review.reviewedAt);
  check("Preview identifies the retained approval as line-only", (await page.locator("#preview-state").innerText()).includes("逐句已聽校"));
  check("Word table and progressive preview show new complete text", await page.locator("#words input").evaluateAll(inputs => inputs.every(input => input.value !== ""))
    && await page.locator("#preview-jp").innerText() === aligned.text && await page.locator("#preview-jp .karaoke-word").count() > 0);

  await page.locator("#level").selectOption("word"); await page.locator("#listened").check(); await page.locator("#pass").click(); await saved();
  check("Synthetic word approval can be distinguished", (await record()).draft.lines[0].review.level === "word");
  await page.locator("#apply-candidate").click(); await completed();
  check("Recomputed words cannot inherit a word-level approval", (await record()).draft.lines[0].review.status === "pending");

  mode = "failure";
  const beforeFailure = (await record()).draft.lines[0];
  await page.locator("#apply-candidate").click();
  await wait(() => document.querySelector("#word-align-status").textContent.startsWith("重新對齊未完成"));
  check("Unavailable model preserves original words and bounds", JSON.stringify((await record()).draft.lines[0]) === JSON.stringify(beforeFailure));

  mode = "wait";
  await page.locator("#apply-candidate").click();
  await wait(() => document.querySelector("#word-align-status").textContent.startsWith("正在分析"));
  check("In-flight analysis exposes cancellation and disables repeated submission", await page.locator("#cancel-word-alignment").isVisible()
    && await page.locator("#apply-candidate").isDisabled());
  await page.locator("#cancel-word-alignment").click();
  await wait(() => document.querySelector("#word-align-status").textContent.startsWith("已取消"));
  for (let index = 0; index < 40 && !aborted; index++) await new Promise(resolve => setTimeout(resolve, 10));
  check("Cancel stops the server job without overwriting data", aborted > 0 && JSON.stringify((await record()).draft.lines[0]) === JSON.stringify(beforeFailure));

  await page.locator("#apply-candidate").click();
  await wait(() => document.querySelector("#word-align-status").textContent.startsWith("正在分析"));
  await page.locator("#line-start").fill("16.5"); await saved();
  check("Editing during analysis cancels stale results and keeps the new start", await page.locator("#line-start").inputValue() === "16.5"
    && await page.locator("#apply-candidate").isEnabled() && (await record()).draft.lines[0].start === 16.5);

  await page.locator("#apply-candidate").click();
  await wait(() => document.querySelector("#word-align-status").textContent.startsWith("正在分析"));
  const remote = await record(); remote.draft.lines[1].review.note = "Newer correction from another tab";
  const response = await fetch(running.url + "api/song/Flamingo", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(remote) });
  assert.equal(response.status, 200); release();
  await wait(() => document.querySelector("#word-align-status").textContent.startsWith("重新對齊未完成"));
  check("Another tab's revision blocks stale word results", (await record()).draft.lines[1].review.note === "Newer correction from another tab"
    && (await record()).draft.lines[0].start === 16.5);

  await page.reload(); await page.locator("#workspace:not([hidden])").waitFor();
  if (!await page.locator("#word-panel").evaluate(element => element.open)) await page.locator("#word-panel summary").click();
  await page.screenshot({ path: output + "/desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  check("New controls fit mobile without document overflow", await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: output + "/mobile.png", fullPage: true });
  check("No page errors or production service worker", report.errors.length === 0
    && await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length === 0));
} finally {
  await fs.writeFile(output + "/browser-results.json", JSON.stringify(report, null, 2) + "\n");
  await browser.close(); await running.close();
  assert.equal(path.dirname(storage), os.tmpdir()); assert.ok(path.basename(storage).startsWith("yonezu-manual-word-ui-"));
  await fs.rm(storage, { recursive: true, force: true });
}
