// Headless tests of the local tool. Synthetic media/attestations never reach user reviews.
// node scripts/check-timing-review-browser.mjs <external Playwright Core ESM entry>
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { startServer } from "../tools/timing-review/server.mjs";

if (!process.argv[2]) throw new Error("Pass the installed Playwright Core ESM entry.");
const { chromium } = await import(pathToFileURL(path.resolve(process.argv[2])).href);
const storage = await fs.mkdtemp(path.join(os.tmpdir(), "yonezu-timing-browser-"));
const output = path.resolve("artifacts/timing-review/qa");
await fs.mkdir(output, { recursive: true });
const running = await startServer({ port: 0, storage, includeCandidates: false });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const report = { mediaMode: "Synthetic YouTube API and silent WAV; live YouTube and listening not verified", checks: [], errors: [] };
const check = (name, condition) => { assert.ok(condition, name); report.checks.push(name); console.log("PASS " + name); };
const fixture = `
window.YT = { Player: class {
  constructor(id, options) { this.id = options.videoId; this.options = options; this.time = 0; this.state = 2; this.rate = 1;
    window.__yt = this; this.element = document.createElement('iframe'); this.element.id = id;
    document.getElementById(id).replaceWith(this.element); setTimeout(() => options.events.onReady({target:this}), 0); }
  getCurrentTime() { return this.time; } getPlayerState() { return this.state; }
  playVideo() { this.state = 1; } pauseVideo() { this.state = 2; }
  seekTo(time) { this.time = time; } setPlaybackRate(rate) { this.rate = rate; }
  destroy() { this.element.remove(); this.state = 2; }
} }; window.onYouTubeIframeAPIReady();`;
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, locale: "zh-TW", acceptDownloads: true });
  const page = await context.newPage(); page.setDefaultTimeout(12000);
  page.on("pageerror", error => report.errors.push(error.message));
  await page.route("https://www.youtube.com/iframe_api", route => route.fulfill({ contentType: "text/javascript", body: fixture }));
  await page.goto(running.url);
  await page.locator("#workspace:not([hidden])").waitFor();
  check("26 songs, 1,021 lines and explicit pending word timing", await page.locator("#song option").count() === 26 && /1,021/.test(await page.locator("#catalog-info").innerText()));
  for (const song of running.catalog.songs) {
    await page.locator("#song").selectOption(song.id);
    await page.waitForFunction(id => location.hash === "#" + id && !document.querySelector("#song").disabled, song.id);
    check(`${song.id}: exact line count and source ends`, await page.locator("#lines button").count() === song.lines.length && /句已有來源句尾/.test(await page.locator("#candidate-info").innerText()));
  }
  const select = async id => { await page.locator("#song").selectOption(id); await page.waitForFunction(value => location.hash === "#" + value && !document.querySelector("#song").disabled, id); };
  const saved = () => page.waitForFunction(() => document.querySelector("#save-status").textContent === "修正已自動儲存到本機");
  const adjust = (bound, delta) => page.locator(`[data-adjust-bound="${bound}"][data-delta="${delta}"]`).click();
  const savedLine = async () => JSON.parse(await fs.readFile(path.join(storage, "Flamingo.json"), "utf8")).draft.lines[0];
  await select("Flamingo");
  check("Flamingo preserves source 8.55 and current 16.31", await page.locator("#line-start").inputValue() === "16.31" && /00:08.550/.test(await page.locator("#source-time").innerText()));
  await page.locator("#pass").click();
  check("Passing requires a reviewer", /校對者/.test(await page.locator("#feedback").innerText()));
  await page.locator("#reviewer").fill("synthetic-browser-test");
  await page.locator("#pass").click();
  check("No whole-song anchors or confirmation gate", await page.locator("#anchors, #confirm-source, #source-status").count() === 0 && /聽校聲明/.test(await page.locator("#feedback").innerText()));
  await page.locator("#connect-video").click();
  await page.waitForFunction(() => document.querySelector("#media-status").textContent.includes("已就緒"));
  await page.evaluate(() => window.__yt.options.events.onError({ data: 153 }));
  check("YouTube errors offer retry and local media", await page.locator("#retry-video").isVisible() && /153/.test(await page.locator("#media-status").innerText()));
  await page.locator("#retry-video").click();
  await page.waitForFunction(() => document.querySelector("#media-status").textContent.includes("已就緒"));
  await page.locator("#play-line").click();
  check("Line seek uses exact video time with preview pre-roll", await page.evaluate(() => Math.abs(window.__yt.time - 16.01) < .001));
  await page.locator("#rate").selectOption("0.75");
  check("Playback speed reaches the player", await page.evaluate(() => window.__yt.rate === .75));
  await page.locator("#loop").check();
  await page.evaluate(() => { window.__yt.time = 999; });
  await page.waitForFunction(() => window.__yt.time < 20);
  check("Loop returns to the selected line", await page.evaluate(() => Math.abs(window.__yt.time - 16.01) < .001));
  await page.locator("#toggle-play").click(); await page.locator("#loop").uncheck();
  await page.locator("#line-end").fill("19.9"); await saved();
  await page.locator("#pass").click();
  check("Passing requires explicit listening attestation", /聽校聲明/.test(await page.locator("#feedback").innerText()));
  await page.locator("#listened").check(); await page.locator("#pass").click(); await saved();
  check("Synthetic line approval persists with signature", /已聽校/.test(await page.locator("#review-status").innerText()) && JSON.parse(await fs.readFile(path.join(storage, "Flamingo.json"), "utf8")).draft.lines[0].review.timingSignature);
  const approved = await savedLine();
  await adjust("end", "0.1"); await saved();
  const extended = await savedLine();
  check("End +0.1 lengthens only the end, saves and revokes approval", extended.end === 20 && extended.start === approved.start
    && extended.sourceEnd === approved.sourceEnd && extended.baselineEnd === approved.baselineEnd
    && JSON.stringify(extended.words) === JSON.stringify(approved.words) && extended.review.status === "pending"
    && extended.review.timingSignature === undefined);
  await adjust("end", "-0.1"); await saved();
  check("End -0.1 restores the end without moving the start", await page.locator("#line-end").inputValue() === "19.9" && await page.locator("#line-start").inputValue() === "16.31");
  await page.locator("#listened").check(); await page.locator("#pass").click(); await saved();
  await page.locator("#shift-forward").click(); await saved();
  check("Editing revokes approval without moving original LRC", /待聽校/.test(await page.locator("#review-status").innerText()) && await page.locator("#line-start").inputValue() === "16.41" && /00:08.550/.test(await page.locator("#source-time").innerText()));
  await adjust("start", "-0.1"); await saved();
  check("Start -0.1 leaves the end untouched", await page.locator("#line-start").inputValue() === "16.31" && await page.locator("#line-end").inputValue() === "20");
  await adjust("start", "0.1"); await saved();
  check("Start +0.1 restores only the start", await page.locator("#line-start").inputValue() === "16.41" && await page.locator("#line-end").inputValue() === "20");
  for (const bound of ["start", "end"]) {
    const input = page.locator(`#line-${bound}`), value = Number(await input.inputValue());
    await input.press("Alt+ArrowUp"); await saved();
    check(`${bound}: shortcut adds exactly 0.1 and retains field focus`, Number(await input.inputValue()) === Math.round((value + .1) * 1000) / 1000
      && await input.evaluate(element => document.activeElement === element));
    await input.press("Alt+ArrowDown"); await saved();
    check(`${bound}: shortcut subtracts exactly 0.1`, Number(await input.inputValue()) === value);
  }
  await page.locator("#line-end").fill(""); await saved();
  const missingRevision = JSON.parse(await fs.readFile(path.join(storage, "Flamingo.json"), "utf8")).revision;
  await adjust("end", "0.1");
  check("A missing end stays pending and creates no fabricated time or save", await page.locator("#line-end").inputValue() === ""
    && /請先填寫結束時間/.test(await page.locator("#feedback").innerText())
    && JSON.parse(await fs.readFile(path.join(storage, "Flamingo.json"), "utf8")).revision === missingRevision);
  await page.locator("#line-end").fill("20"); await page.locator("#line-start").fill("0.05"); await saved();
  await page.locator("#line-start").press("Alt+ArrowDown");
  check("Negative adjustments are rejected without changing either boundary", await page.locator("#line-start").inputValue() === "0.05"
    && await page.locator("#line-end").inputValue() === "20" && /不能小於 0 秒/.test(await page.locator("#feedback").innerText()));
  await page.locator("#line-start").fill("16.41"); await saved();
  await page.locator("#word-panel summary").click();
  check("Word start fields stay blank until supplied", await page.locator('#words input[data-bound="start"]').evaluateAll(inputs => inputs.every(input => input.value === "")));
  await page.locator("#level").selectOption("word"); await page.locator("#listened").check(); await page.locator("#pass").click();
  check("Pending words cannot pass", /字詞時間待補/.test(await page.locator("#feedback").innerText()));
  await page.locator("#words input").evaluateAll(inputs => inputs.forEach(input => {
    const index = Number(input.dataset.word);
    input.value = String(Math.round((16.41 + index * .04 + (input.dataset.bound === "end" ? .07 : 0)) * 1000) / 1000);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }));
  await saved();
  check("Complete synthetic words preserve exact Japanese punctuation and spaces", await page.locator("#preview-jp .karaoke-word").count() > 0 && await page.locator("#preview-jp").innerText() === await page.locator("#line-jp").innerText());
  await page.locator("#listened").check(); await page.locator("#pass").click(); await saved();
  check("Word approval remains distinct from line approval", JSON.parse(await fs.readFile(path.join(storage, "Flamingo.json"), "utf8")).draft.lines[0].review.level === "word");
  await page.locator('#words input[data-word="0"][data-bound="end"]').fill("16.49"); await saved();
  check("Editing a word revokes its listening approval", /待聽校/.test(await page.locator("#review-status").innerText()));
  const beforeNudges = await savedLine();
  for (let index = 0; index < 10; index++) await page.locator("#line-end").press("Alt+ArrowUp");
  await saved();
  const afterNudges = await savedLine();
  check("Repeated end nudges add exactly one second and preserve timed words", afterNudges.end === beforeNudges.end + 1
    && afterNudges.start === beforeNudges.start && JSON.stringify(afterNudges.words) === JSON.stringify(beforeNudges.words));
  for (let index = 0; index < 10; index++) await page.locator("#line-end").press("Alt+ArrowDown");
  await saved();
  await page.locator("#level").selectOption("line");
  await page.locator("#search").fill("zzzz-no-match"); check("Search handles empty results", await page.locator("#empty-list").isVisible());
  await page.locator("#search").fill("");
  await page.locator("#note").fill("Synthetic note, with newline\nfor CSV quoting"); await saved();
  const getDownload = async selector => { const pending = page.waitForEvent("download"); await page.locator(selector).click(); const download = await pending; return { name: download.suggestedFilename(), text: await fs.readFile(await download.path(), "utf8") }; };
  const json = await getDownload("#export-json");
  const exported = JSON.parse(json.text);
  check("JSON contains source identity, original and revised seconds", exported.songId === "Flamingo" && exported.lines[0].start === 16.41 && exported.lines[0].sourceStart === 8.55);
  const csv = await getDownload("#export-csv");
  check("CSV preserves quotes, UTF-8 and multi-line notes", csv.text.startsWith("\uFEFF") && csv.text.includes("Synthetic note, with newline\nfor CSV quoting"));
  check("LRC exports revised video anchors", (await getDownload("#export-lrc")).text.includes("[00:16.410]"));
  check("Word CSV exports missing timing explicitly", (await getDownload("#export-words")).text.includes('"pending"'));
  const all = await getDownload("#export-all");
  check("All-song CSV includes current edits and all 26 IDs", all.text.includes('"16.41"') && running.catalog.songs.every(song => all.text.includes(`"${song.id}"`)));
  await page.locator("#line-start").fill("16.51"); await saved();
  await page.locator("#import-json").setInputFiles({ name: "review.json", mimeType: "application/json", buffer: Buffer.from(json.text) });
  await page.waitForFunction(() => document.querySelector("#line-start").value === "16.41"); await saved();
  check("Exported JSON round-trips edits", await page.locator("#line-start").inputValue() === "16.41");
  const stale = { ...exported, sourceFingerprint: "stale" };
  await page.locator("#import-json").setInputFiles({ name: "stale.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(stale)) });
  await page.waitForFunction(() => document.querySelector("#feedback").textContent.includes("來源或影片版本"));
  check("Stale source import is rejected", await page.locator("#line-start").inputValue() === "16.41");
  await page.reload(); await page.locator("#workspace:not([hidden])").waitFor();
  check("Reload restores current song, edits and reviewer", await page.locator("#song").inputValue() === "Flamingo" && await page.locator("#line-start").inputValue() === "16.41" && await page.locator("#reviewer").inputValue() === "synthetic-browser-test");
  // A browser-decoded silent fixture tests the actual local audio control, not singing alignment.
  const wav = Buffer.alloc(44 + 8000 * 2 * 40); wav.write("RIFF"); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8); wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(wav.length - 44, 40);
  await page.locator("#audio-file").setInputFiles({ name: "synthetic-silence.wav", mimeType: "audio/wav", buffer: wav });
  await page.waitForFunction(() => document.querySelector("audio").readyState >= 1);
  await page.locator("#play-line").click(); await page.waitForFunction(() => !document.querySelector("audio").paused);
  check("Local audio plays exact line range without a version form", await page.evaluate(() => document.querySelector("audio").currentTime >= 16.1) && await page.locator("#confirm-source").count() === 0);
  await select("Lady");
  check("Switching songs clears old local media", await page.evaluate(() => document.querySelector("audio").paused && !document.querySelector("audio").getAttribute("src")));
  await page.route(/^https?:\/\/(?!localhost:)/, route => route.abort());
  await page.reload(); await page.locator("#workspace:not([hidden])").waitFor();
  check("Local content works with external requests blocked", await page.locator("#song-title").innerText() === "LADY");
  await page.screenshot({ path: path.join(output, "desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  check("Mobile has no document overflow", await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  check("Mobile boundary adjustment buttons meet 44px touch targets", await page.locator("[data-adjust-bound]").evaluateAll(buttons => buttons.length === 4 && buttons.every(button => {
    const rect = button.getBoundingClientRect(); return rect.width >= 44 && rect.height >= 44;
  })));
  await page.locator("#word-panel summary").click();
  check("Mobile word table scrolls within its own region", await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: path.join(output, "mobile.png"), fullPage: true });
  check("No service worker registered by local tool", await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length === 0));
  check("No browser script errors", report.errors.length === 0);
} finally {
  await fs.writeFile(path.join(output, "results.json"), JSON.stringify(report, null, 2) + "\n");
  await browser.close(); await running.close();
  assert.ok(path.dirname(path.resolve(storage)) === path.resolve(os.tmpdir()) && path.basename(storage).startsWith("yonezu-timing-browser-"), "Cleanup stays in the created temporary directory");
  await fs.rm(storage, { recursive: true, force: true });
}
