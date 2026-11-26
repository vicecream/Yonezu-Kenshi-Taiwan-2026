// Local production-site audit. External media is blocked; streaming is not certified.
// node scripts/check-site-architecture.mjs <external Playwright Core ESM entry>
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { EVENT, SITE, SONGS as ALL_SONGS, VISIBLE_SONGS as SONGS } from "../src/data.js";
import { SONG_LYRICS } from "../src/song-lyrics.js";
import { songCapabilities } from "../src/song-content.js";

if (!process.argv[2]) throw new Error("Pass the installed Playwright Core ESM entry.");
const { chromium } = await import(pathToFileURL(path.resolve(process.argv[2])).href);
const base = process.env.YONEZU_QA_BASE_URL || "http://localhost:4175/";
const output = path.resolve(process.env.YONEZU_ARCH_QA_OUTPUT || "artifacts/local-architecture-2026-11-18");
const pkg = JSON.parse(await fs.readFile("package.json", "utf8"));
const report = {
  checkedAt: new Date().toISOString(), timeZone: "Asia/Taipei", baseUrl: base,
  version: pkg.version, browser: "Microsoft Edge (headless, isolated context)",
  mediaMode: "External YouTube and font requests blocked; real local navigation and assets tested",
  checks: [], failures: [], pageErrors: [], localRequestFailures: [], routes: [], assets: [],
};
await fs.mkdir(output, { recursive: true });
const test = async (name, action) => {
  try { await action(); report.checks.push(name); console.log("PASS " + name); }
  catch (error) { report.failures.push({ name, message: error.message, stack: error.stack }); console.error("FAIL " + name + ": " + error.message); }
};
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "zh-TW", timezoneId: "Asia/Taipei", serviceWorkers: "block" });
const page = await context.newPage();
page.setDefaultTimeout(8000);
const origin = new URL(base).origin;
page.on("pageerror", error => report.pageErrors.push(error.message));
page.on("requestfailed", request => {
  if (new URL(request.url()).origin === origin && request.failure()?.errorText !== "net::ERR_ABORTED") {
    report.localRequestFailures.push({ url: request.url(), error: request.failure()?.errorText });
  }
});
await page.route(/^https:\/\/(?:www\.youtube\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//, route => route.abort());
const goto = async hash => {
  await page.goto(base + hash);
  await page.waitForFunction(() => document.querySelector('[data-show-id][aria-pressed="true"], .guide-page, #song-view:not([inert]) #song-page'));
};
const imageReady = async selector => {
  await page.locator(selector).scrollIntoViewIfNeeded();
  await page.waitForFunction(selector => [...document.querySelectorAll(selector)].every(img => img.complete && img.naturalWidth > 0), selector);
};
const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
// The renderer inserts typographic spacing between CJK and Latin/numeric text.
const readingText = text => text.replace(/\s+/gu, "");
const songReady = async song => {
  await page.waitForFunction(({title,count}) => document.getElementById("song-page-heading")?.textContent === title && document.querySelectorAll("#song-sheet-list > li").length === count, {title:song.title,count:SONGS.length});
  await page.waitForFunction(() => document.getElementById("reading-btn")?.disabled === false);
};

try {
  await test("Production homepage responds with the current prerendered guide", async () => {
    const response = await context.request.get(base);
    assert.equal(response.status(), 200);
    const html = await response.text();
    assert.ok(html.includes(SITE.title));
    assert.ok(html.includes("12/26（六）") && html.includes("12/27（日）"));
    assert.ok(html.includes("v" + pkg.version));
    assert.doesNotMatch(html, /\/@vite\/client|src\/main\.js/);
    assert.match(html, /noindex, nofollow/);
  });
  await test("PWA manifest and every declared icon are valid local assets", async () => {
    const response = await context.request.get(new URL("manifest.json", base).href);
    assert.equal(response.status(), 200);
    const manifest = await response.json();
    assert.equal(manifest.name, SITE.name);
    assert.equal(new URL(manifest.scope, base).origin, origin);
    assert.equal(new URL(manifest.start_url, base).href, new URL(base).href);
    for (const icon of manifest.icons) {
      const resource = await context.request.get(new URL(icon.src, base).href);
      assert.equal(resource.status(), 200);
      assert.match(resource.headers()["content-type"], /image\/png/);
      const bytes = await resource.body();
      assert.equal(bytes.subarray(1, 4).toString(), "PNG");
      assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, icon.sizes);
    }
  });
  await test("All generated SW chunks and event images return correct resource types", async () => {
    const response = await context.request.get(new URL("sw.js", base).href);
    assert.equal(response.status(), 200);
    const worker = await response.text();
    assert.ok(worker.includes(`const CACHE_VERSION = "v${pkg.version}"`));
    const chunks = JSON.parse(worker.match(/const VITE_BUILD_ASSETS = (\[[^;]*\]);/)[1]);
    const resources = [...new Set([...chunks, EVENT.poster, EVENT.posterMobile, EVENT.seatMap, "./apple-touch-icon.png"])];
    for (const resource of resources) {
      assert.doesNotMatch(resource, /archive|prema|kaohsiung/i);
      const result = await context.request.get(new URL(resource, base).href);
      assert.equal(result.status(), 200, resource);
      const type = result.headers()["content-type"] || "";
      const expected = resource.endsWith(".js") ? /javascript/ : resource.endsWith(".css") ? /text\/css/ : /image\//;
      assert.match(type, expected, resource);
      report.assets.push({ path: resource, status: result.status(), contentType: type });
    }
    const robots = await context.request.get(new URL("robots.txt", base).href);
    assert.match(await robots.text(), /Disallow: \//);
  });

  await goto("");
  await test("Homepage poster and both show selectors initialize", async () => {
    await imageReady(".official-poster img");
    assert.equal(await page.locator("[data-show-id]").count(), 2);
    assert.equal(await page.locator('[data-show-id][aria-pressed="true"]').count(), 1);
    assert.ok(await noOverflow());
    await page.screenshot({ path: path.join(output, "home-mobile.png"), fullPage: true });
  });
  for (const id of ["info", "notice", "seat", "way", "manner"]) {
    await test("Home information card expands and collapses: " + id, async () => {
      const toggle = page.locator(`#${id}-toggle`), panel = page.locator(`#${id}-panel`);
      assert.equal(await toggle.getAttribute("aria-expanded"), "false");
      await toggle.click();
      assert.equal(await toggle.getAttribute("aria-expanded"), "true");
      assert.equal(await panel.evaluate(node => node.inert), false);
      assert.ok((await panel.innerText()).trim().length > 10);
      if (id === "seat") await imageReady(".seat-map-image");
      await page.waitForFunction(id => { const el = document.getElementById(id + "-panel"); return el.clientHeight >= el.scrollHeight - 1; }, id);
      await toggle.click();
      await page.waitForFunction(id => document.getElementById(id + "-toggle")?.getAttribute("aria-expanded") === "false", id);
      assert.equal(await toggle.getAttribute("aria-expanded"), "false");
      assert.equal(await panel.evaluate(node => node.inert), true);
    });
  }
  await test("Expanded home links have valid destinations and safe new-tab attributes", async () => {
    for (const id of ["info", "notice", "seat", "way", "manner"]) await page.locator(`#${id}-toggle`).click();
    const links = await page.locator("#app a[href]").evaluateAll(nodes => nodes.map(a => ({ href: a.href, target: a.target, rel: a.rel })));
    assert.ok(links.length > 10);
    for (const link of links) {
      assert.ok(["https:", "http:"].includes(new URL(link.href).protocol));
      if (link.target === "_blank") assert.ok(link.rel.split(/\s+/).includes("noopener"));
      if (new URL(link.href).origin === origin && !new URL(link.href).hash) {
        const result = await context.request.get(link.href);
        assert.equal(result.status(), 200, link.href);
        assert.match(result.headers()["content-type"], /image\//);
      }
    }
    for (const id of ["info", "notice", "seat", "way", "manner"]) await page.locator(`#${id}-toggle`).click();
  });
  await test("Changelog opens, loads its split chunk, and restores focus on Escape", async () => {
    await page.locator("#app [data-open-changelog]").click();
    await page.waitForFunction(() => document.getElementById("changelog-content")?.dataset.rendered === "1");
    assert.equal(await page.locator("#app").evaluate(node => node.inert), true);
    assert.ok((await page.locator("#changelog-content").innerText()).includes("v" + pkg.version));
    assert.equal(await page.locator("#changelog-close").evaluate(node => node === document.activeElement), true);
    await page.locator("#changelog-close").press("Escape");
    assert.equal(await page.locator("#changelog-view").getAttribute("aria-hidden"), "true");
    assert.equal(await page.locator("#app [data-open-changelog]").evaluate(node => node === document.activeElement), true);
  });
  await test("Home setlist navigation offers a working preparation link", async () => {
    await page.locator("#setlist-btn").click();
    await page.waitForURL("**/#/setlist");
    assert.match(await page.locator(".pending-page").innerText(), /台北場歌單待確認/);
    await page.locator('a[href="#/guide"]').click();
    await page.locator(".song-row").last().waitFor();
    assert.equal(await page.locator(".song-row").count(), SONGS.length);
  });
  await test("Preparation list matches all fixed IDs and numbers", async () => {
    await page.locator('[data-sort="default"]').click();
    assert.deepEqual(await page.locator(".song-row").evaluateAll(nodes => nodes.map(node => node.dataset.id)), SONGS.map(song => song.id));
  });
  await test("Original title, romanized title, number and empty search states work", async () => {
    for (const [query, id] of [["春雷", "Shunrai"], ["M87", "M87"], ["28", "EineKleine"], ["02", "Shunrai"]]) {
      await page.locator("#song-search-input").fill(query);
      assert.equal(await page.locator("#song-list > li:visible .song-row").count(), 1);
      assert.equal(await page.locator("#song-list > li:visible .song-row").getAttribute("data-id"), id);
    }
    await page.locator("#song-search-input").fill("no-such-yonezu-track");
    assert.ok(await page.locator("#song-empty").isVisible());
    await page.locator("#song-search-clear").click();
    assert.equal(await page.locator("#song-list > li:visible .song-row").count(), SONGS.length);
  });
  await test("Name sorting persists and switching back restores preparation numbering", async () => {
    await page.locator('[data-sort="title"]').click();
    const sorted = await page.locator(".song-row").evaluateAll(nodes => nodes.map(node => node.dataset.id));
    assert.notDeepEqual(sorted, SONGS.map(song => song.id));
    await page.reload();
    await page.locator(".song-row").last().waitFor();
    assert.deepEqual(await page.locator(".song-row").evaluateAll(nodes => nodes.map(node => node.dataset.id)), sorted);
    await page.locator('[data-sort="default"]').click();
    assert.deepEqual(await page.locator(".song-row").evaluateAll(nodes => nodes.map(node => node.dataset.id)), SONGS.map(song => song.id));
  });
  await test("Every preparation row paints correctly when scrolled into view", async () => {
    for (const song of SONGS) {
      const row = page.locator(`.song-row[data-id="${song.id}"]`);
      await row.scrollIntoViewIfNeeded();
      assert.ok((await row.innerText()).includes(song.title), song.id);
      const box = await row.boundingBox();
      assert.ok(box && box.height >= 44 && box.width > 0, song.id);
    }
    await page.screenshot({ path: path.join(output, "guide-end-mobile.png") });
  });
  await test("Reading theme toggles and survives a direct reload", async () => {
    const original = await page.locator("html").getAttribute("data-theme");
    await page.locator("#app [data-theme-toggle]").click();
    const next = await page.locator("html").getAttribute("data-theme");
    assert.notEqual(next, original);
    await page.reload();
    assert.equal(await page.locator("html").getAttribute("data-theme"), next);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator(".songs-head").scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, "guide-desktop.png") });
  });
  for (const [index, song] of SONGS.entries()) {
    await test("Direct song route: " + song.id, async () => {
      await goto("#/song/" + song.id);
      await songReady(song);
      assert.equal(await page.locator("#song-picker-title").innerText(), song.title);
      assert.equal(await page.locator("#song-picker-number").innerText(), String(ALL_SONGS.findIndex(item => item.id === song.id) + 1).padStart(2, "0") + ".");
      assert.equal(await page.locator("#watch-on-yt").getAttribute("href"), song.listenUrl);
      const content = SONG_LYRICS.find(item => item.id === song.id), caps = songCapabilities(content);
      assert.match(await page.locator("#song-content-status").innerText(), caps.translationComplete ? /繁中翻譯已整理/ : /繁中翻譯部分整理/);
      assert.ok(await page.locator("#reading-btn").isEnabled());
      assert.ok(await page.locator(".lyric-jp ruby rt").count() > 0);
      for (const selector of ["#karaoke-btn", "#autoscroll-btn"]) assert.equal(await page.locator(selector).isEnabled(), caps.timed, song.id + ": " + selector);
      assert.match(await page.locator("#song-content-status").innerText(), /LRC.*待校正/);
      assert.deepEqual(await page.locator(".lyric-line").evaluateAll(rows => rows.map(row => Number(row.dataset.time))), content.lyrics.map(row => row.time));
      assert.ok(await page.locator("#japanese-toggle").isEnabled());
      assert.ok(await page.locator("#chinese-toggle").isEnabled());
      assert.equal(await page.locator(".lyric-line").count(), content.lyrics.length);
      assert.deepEqual((await page.locator(".lyric-jp").evaluateAll(nodes => nodes.map(node => {
        const copy = node.cloneNode(true);
        copy.querySelectorAll("rt, rp").forEach(reading => reading.remove());
        return copy.textContent;
      }))).map(readingText), content.lyrics.map(line => readingText(line.jp)));
      assert.deepEqual((await page.locator(".lyric-zh").allTextContents()).map(readingText), content.lyrics.map(line => readingText(line.tr || "")));
      assert.ok((await page.locator("#lyrics-credit").textContent()).includes(content.translationCredit));
      if (!song.youtubeId) {
        assert.equal(await page.locator("#video-status").getAttribute("data-state"), "pending");
        assert.ok(await page.locator("#play-toggle").isDisabled());
        if (song.previewUrl) assert.match(await page.locator("#watch-on-yt").innerText(), /公告／預告/);
      }
      report.routes.push({ id: song.id, title: song.title, video: song.youtubeId ? "official entry; streaming unverified" : "pending", lyrics: content.lyricsStatus, translation: content.translationStatus, translatedRows: content.lyrics.filter(line => line.tr).length });
    });
  }
  await test("Furigana, romaji and both modes persist across reloads and songs", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await goto("#/song/Lemon");
    await songReady(SONGS.find(song => song.id === "Lemon"));
    const chinese = await page.locator(".lyric-zh").allTextContents();
    assert.equal(await page.locator("#reading-value").textContent(), "振り仮名");
    const touch = await page.locator("#reading-btn").boundingBox();
    assert.ok(touch.width >= 44 && touch.height >= 44, "Reading switch meets the touch target size");
    await page.screenshot({ path: path.join(output, "readings-kana-mobile.png") });
    await page.locator("#reading-btn").click();
    assert.equal(await page.locator("#reading-value").textContent(), "羅馬拼音");
    assert.equal(await page.locator(".lyric-jp").first().getAttribute("lang"), "ja-Latn");
    assert.doesNotMatch((await page.locator(".lyric-jp").allTextContents()).join(""), /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u);
    await page.screenshot({ path: path.join(output, "readings-romaji-mobile.png") });
    await page.locator("#reading-btn").click();
    assert.equal(await page.locator("#reading-value").textContent(), "假名＋拼音");
    assert.ok(await page.locator(".lyric-romaji").first().isVisible());
    await page.screenshot({ path: path.join(output, "readings-both-mobile.png") });
    assert.ok(await noOverflow());
    await page.setViewportSize({ width: 1440, height: 1000 });
    assert.ok(await noOverflow());
    await page.screenshot({ path: path.join(output, "readings-both-desktop.png") });
    assert.deepEqual(await page.locator(".lyric-zh").allTextContents(), chinese);
    await page.reload();
    await songReady(SONGS.find(song => song.id === "Lemon"));
    assert.equal(await page.locator("#reading-value").textContent(), "假名＋拼音");
    await page.locator("#next-song").click();
    await songReady(SONGS.find(song => song.id === "JaneDoe"));
    assert.equal(await page.locator("#reading-value").textContent(), "假名＋拼音");
    await page.locator("#reading-btn").click();
    assert.equal(await page.locator("#reading-value").textContent(), "振り仮名");
    assert.equal(await page.evaluate(() => localStorage.getItem("yonezu-reading")), "kana");
  });
  await test("Reading loading keeps both mode empty and cannot repaint an old song", async () => {
    const isolated = await browser.newContext({ serviceWorkers: "block" });
    let release;
    const held = new Promise(resolve => { release = resolve; });
    try {
      const delayed = await isolated.newPage();
      delayed.on("pageerror", error => report.pageErrors.push(error.message));
      await delayed.addInitScript(() => localStorage.setItem("yonezu-reading", "both"));
      await delayed.route(/youtube\.com|fonts\.(googleapis|gstatic)\.com/, route => route.abort());
      await delayed.route(/\/assets\/furigana-[^/]+\.js$/, async route => { await held; await route.continue(); });
      await delayed.goto(base + "#/song/Lemon");
      await delayed.waitForFunction(() => document.getElementById("reading-value")?.textContent === "讀音載入中");
      assert.ok(await delayed.locator("#reading-btn").isDisabled());
      assert.ok((await delayed.locator(".lyric-romaji").allTextContents()).every(text => !text.trim()));
      await delayed.locator("#next-song").click();
      await delayed.waitForFunction(() => document.getElementById("song-page-heading")?.textContent === "JANE DOE");
      release();
      await delayed.waitForFunction(() => document.getElementById("reading-btn")?.disabled === false);
      assert.equal(await delayed.locator("#song-page-heading").textContent(), "JANE DOE");
      assert.equal(await delayed.locator(".lyric-line").count(), SONG_LYRICS.find(song => song.id === "JaneDoe").lyrics.length);
      assert.ok(await delayed.locator(".lyric-jp ruby rt").count() > 0);
      assert.ok(await delayed.locator(".lyric-romaji").first().isVisible());
    } finally { release(); await isolated.close(); }
  });
  await test("A failed reading chunk offers a working retry", async () => {
    const isolated = await browser.newContext({ serviceWorkers: "block" });
    try {
      const retryPage = await isolated.newPage();
      retryPage.on("pageerror", error => report.pageErrors.push(error.message));
      await retryPage.route(/youtube\.com|fonts\.(googleapis|gstatic)\.com/, route => route.abort());
      let attempts = 0;
      await retryPage.route(/\/assets\/furigana-[^/]+\.js$/, route => ++attempts === 1 ? route.abort() : route.continue());
      await retryPage.goto(base + "#/song/Lemon");
      await retryPage.waitForFunction(() => document.getElementById("reading-value")?.textContent === "重試讀音");
      await retryPage.locator("#reading-btn").click();
      await retryPage.waitForFunction(() => document.querySelector(".lyric-jp ruby rt"));
      assert.equal(await retryPage.locator("#reading-value").textContent(), "振り仮名");
      assert.ok(await retryPage.locator("#reading-btn").isEnabled());
    } finally { await isolated.close(); }
  });
  await test("Chinese and original visibility controls preserve bilingual reading preferences", async () => {
    await goto("#/song/Lemon");
    await songReady(SONGS.find(song => song.id === "Lemon"));
    await page.locator("#chinese-toggle").click();
    assert.equal(await page.locator("#song-page").evaluate(node => node.classList.contains("hide-chinese")), true);
    await page.reload();
    await songReady(SONGS.find(song => song.id === "Lemon"));
    assert.equal(await page.locator("#chinese-toggle").getAttribute("aria-pressed"), "false");
    await page.locator("#japanese-toggle").click();
    assert.ok(await page.locator(".lyrics-hidden-message").isVisible());
    await page.locator("#chinese-toggle").click();
    assert.equal(await page.locator("#song-page").evaluate(node => node.classList.contains("hide-chinese")), false);
    await page.locator("#japanese-toggle").click();
  });
  await test("Previous/next navigation loops through fixed preparation order", async () => {
    await goto("#/song/YellowGhost");
    await songReady(SONGS[0]);
    await page.locator("#next-song").click();
    await songReady(SONGS[1]);
    await page.locator("#prev-song").click();
    await songReady(SONGS[0]);
    await page.locator("#prev-song").click();
    await songReady(SONGS.at(-1));
    await page.locator("#next-song").click();
    await songReady(SONGS[0]);
  });
  await test("Song picker opens, searches, selects and restores focus", async () => {
    await page.locator("#song-picker-btn").click();
    assert.equal(await page.locator("#song-sheet").getAttribute("aria-hidden"), "false");
    assert.equal(await page.locator("#song-page > .song-body").evaluate(node => node.inert), true);
    assert.equal(await page.locator(".song-sheet-close").evaluate(node => node === document.activeElement), true);
    await page.locator("#sheet-search-input").fill("M87");
    assert.equal(await page.locator("#song-sheet-list > li:visible").count(), 1);
    await page.locator('#song-sheet-list .song-sheet-item[data-id="M87"]').click();
    await songReady(SONGS.find(song => song.id === "M87"));
    assert.equal(await page.locator("#song-sheet").getAttribute("aria-hidden"), "true");
    await page.locator("#song-picker-btn").click();
    await page.locator(".song-sheet-close").press("Escape");
    assert.equal(await page.locator("#song-picker-btn").evaluate(node => node === document.activeElement), true);
  });
  await test("Compact display persists across reload and can be turned off", async () => {
    await page.locator("#venue-btn").click();
    assert.ok(await page.locator("#song-page").evaluate(node => node.classList.contains("venue")));
    await page.reload();
    await songReady(SONGS.find(song => song.id === "M87"));
    assert.ok(await page.locator("#song-page").evaluate(node => node.classList.contains("venue")));
    await page.locator("#venue-btn").click();
    assert.equal(await page.locator("#song-page").evaluate(node => node.classList.contains("venue")), false);
  });
  await test("Song back button, browser Back and Forward keep routes usable", async () => {
    await page.locator("#song-back-btn").click();
    await page.locator(".song-row").last().waitFor();
    await page.locator('.song-row[data-id="YellowGhost"]').click();
    await songReady(SONGS[0]);
    await page.goBack();
    await page.locator(".song-row").last().waitFor();
    await page.goForward();
    await songReady(SONGS[0]);
  });
  await test("Malformed and legacy song routes offer working recovery links", async () => {
    for (const hash of ["#/song/Prema", "#/song/DoesNotExist", "#/song/%E0%A4%A"]) {
      await goto(hash);
      assert.match(await page.locator(".pending-page").innerText(), /本指南已轉換/);
      assert.equal(await page.locator('a[href="#/guide"]').count(), 1);
    }
    await page.locator('a[href="#/"]').click();
    await page.locator(".hero").waitFor();
  });
  for (const width of [375, 390, 768, 1440]) {
    await test("Home, guide and pending song remain within viewport at " + width, async () => {
      await page.setViewportSize({ width, height: 900 });
      for (const hash of ["#/", "#/guide", "#/song/YellowGhost"]) {
        await goto(hash);
        if (hash.includes("song/")) await songReady(SONGS[0]);
        assert.ok(await noOverflow(), hash);
        if (width === 390 && hash.includes("song/")) await page.screenshot({ path: path.join(output, "pending-song-mobile.png"), fullPage: true });
      }
    });
  }
  await test("Every song route can first open offline after production SW precache", async () => {
    const offline = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "zh-TW", timezoneId: "Asia/Taipei", serviceWorkers: "allow" });
    try {
      const offlinePage = await offline.newPage();
      offlinePage.setDefaultTimeout(15000);
      offlinePage.on("pageerror", error => report.pageErrors.push(error.message));
      await offlinePage.route(/^https:\/\/(?:www\.youtube\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//, route => route.abort());
      await offlinePage.goto(base);
      await offlinePage.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 25000 });
      // Let the startup connectivity hint settle before dismissing its offline form.
      await offlinePage.waitForFunction(() => performance.now() > 2000);
      await offline.setOffline(true);
      await offlinePage.locator("#app-banner.offline.show").waitFor();
      await offlinePage.locator("#app-banner-close").click();
      for (const song of SONGS) {
        await offlinePage.goto(base + "#/song/" + song.id);
        await offlinePage.waitForFunction(({title,count}) => document.getElementById("song-page-heading")?.textContent === title && document.querySelectorAll("#song-sheet-list > li").length === count, {title:song.title,count:SONGS.length});
        const content = SONG_LYRICS.find(item => item.id === song.id);
        await offlinePage.waitForFunction(() => document.getElementById("reading-btn")?.disabled === false);
        if (await offlinePage.locator("#app-banner.offline.show").isVisible()) {
          await offlinePage.locator("#app-banner-close").click({ noWaitAfter: true });
        }
        assert.ok(await offlinePage.locator(".lyric-jp ruby rt").count() > 0, song.id + ": offline furigana");
        await offlinePage.locator("#reading-btn").click({ noWaitAfter: true });
        assert.doesNotMatch((await offlinePage.locator(".lyric-jp").allTextContents()).join(""), /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u);
        await offlinePage.locator("#reading-btn").click({ noWaitAfter: true });
        await offlinePage.locator("#reading-btn").click({ noWaitAfter: true });
        await offlinePage.waitForFunction(() => document.getElementById("reading-value")?.textContent === "振り仮名");
        assert.match(await offlinePage.locator("#song-content-status").innerText(), /原文歌詞已匯入/);
        assert.deepEqual((await offlinePage.locator(".lyric-zh").allTextContents()).map(readingText), content.lyrics.map(line => readingText(line.tr || "")));
        assert.equal(await offlinePage.locator("#video-status").getAttribute("data-state"), song.youtubeId ? "offline" : "pending");
        console.log("PASS Offline reading route: " + song.id);
      }
    } finally { await offline.close(); }
  });
  await test("No uncaught application errors or failed local resource requests", async () => {
    assert.deepEqual(report.pageErrors, []);
    assert.deepEqual(report.localRequestFailures, []);
  });
} finally {
  await browser.close();
  report.summary = { passed: report.checks.length, failed: report.failures.length, songs: report.routes.length, assets: report.assets.length };
  await fs.writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
}
if (report.failures.length) process.exitCode = 1;
