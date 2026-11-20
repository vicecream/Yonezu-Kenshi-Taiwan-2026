// Controlled API fixtures exercise app media states; they do not certify live YouTube playback.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { SONGS, VISIBLE_SONGS } from "../src/song-metadata.js";
import { SONG_LYRICS } from "../src/song-lyrics.js";
if (!process.argv[2]) throw new Error("Pass the installed Playwright Core ESM entry.");
const { chromium } = await import(pathToFileURL(path.resolve(process.argv[2])).href);
const base = process.env.YONEZU_QA_BASE_URL || "http://localhost:4174/";
const output = path.resolve(process.env.YONEZU_QA_OUTPUT || "artifacts/browser-qa-2026-11-17");
await fs.mkdir(output, { recursive: true });
const report = { mediaMode: "Controlled YouTube API fixture; live streaming not verified", checks: [], errors: [] };
const check = (name, condition) => { assert.ok(condition, name); report.checks.push(name); console.log("PASS " + name); };
const songViewIsOffstage = page => page.locator("#song-view").evaluate(element => element.inert && element.classList.contains("offstage") && element.getBoundingClientRect().right <= 0);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const fixture = `
window.__ytTest = { instances: [], requests: [] };
window.YT = {
  PlayerState: { UNSTARTED:-1, ENDED:0, PLAYING:1, PAUSED:2, BUFFERING:3, CUED:5 },
  Player: class {
    constructor(id, options) {
      this.options=options; this.id=options.videoId; this.state=-1; this.rate=1; this.volume=100;
      this.iframe=document.createElement('iframe'); this.iframe.id=id; this.iframe.src='about:blank';
      document.getElementById(id).replaceWith(this.iframe); window.__ytTest.instances.push(this);
    }
    emit(name, data) { if(name==='onStateChange') this.state=data; this.options.events[name]?.({target:this,data}); }
    loadVideoById(id) { this.id=id; this.state=-1; window.__ytTest.requests.push(id); }
    playVideo() { this.emit('onStateChange',1); }
    pauseVideo() { this.emit('onStateChange',2); }
    getPlayerState() { return this.state; }
    getVideoUrl() { return 'https://www.youtube.com/watch?v='+this.id; }
    getIframe() { return this.iframe; }
    getCurrentTime() { return this.time || 0; }
    getDuration() { return 600; }
    getAvailablePlaybackRates() { return [.5,.75,1,1.25,1.5,2]; }
    getPlaybackRate() { return this.rate; }
    setPlaybackRate(rate) { this.rate=rate; this.emit('onPlaybackRateChange',rate); }
    setVolume(v) { this.volume=v; }
    getVolume() { return this.volume; }
    mute() { this.muted=true; }
    unMute() { this.muted=false; }
    isMuted() { return !!this.muted; }
    seekTo(time) { this.time=time; this.lastSeek=time; }
    destroy() { this.iframe.remove(); }
  }
};
window.onYouTubeIframeAPIReady();
`;
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "zh-TW", timezoneId: "America/Los_Angeles", serviceWorkers: "block" });
  await context.addInitScript(() => {
    const NativeDate = Date;
    window.__qaNow = NativeDate.parse("2026-12-26T17:59:59+08:00");
    window.Date = class extends NativeDate { constructor(...args){ super(...(args.length ? args : [window.__qaNow])); } static now(){ return window.__qaNow; } };
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on("pageerror", error => report.errors.push(error.message));
  await page.route("https://www.youtube.com/iframe_api*", route => route.fulfill({ contentType: "text/javascript", body: fixture }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
  await page.goto(base);
  check("Default selects the Taipei date despite a different browser timezone", await page.locator('[data-show-id="2026-12-26"]').getAttribute("aria-pressed") === "true");
  await page.locator('[data-show-id="2026-12-27"]').click();
  await page.reload();
  check("Manual show choice persists after reload", await page.locator('[data-show-id="2026-12-27"]').getAttribute("aria-pressed") === "true");
  await page.evaluate(() => localStorage.removeItem("yonezu-selected-show"));
  await page.reload();
  await page.evaluate(() => window.__qaNow = Date.parse("2026-12-26T18:00:00+08:00"));
  await page.waitForFunction(() => document.getElementById("cd-dday").textContent === "已開演");
  check("18:00 start does not jump to the next show", await page.locator('[data-show-id="2026-12-26"]').getAttribute("aria-pressed") === "true");
  await page.evaluate(() => window.__qaNow = Date.parse("2026-12-27T00:00:00+08:00"));
  await page.waitForFunction(() => document.querySelector('[data-show-id="2026-12-27"]').getAttribute("aria-pressed") === "true");
  check("Taipei midnight automatically advances to the second show", true);
  await page.locator("#info-toggle").click();
  check("Ticket details show the organizer's refund period and fee", /不含購票當日/.test(await page.locator("#info-panel").innerText()) && /5%/.test(await page.locator("#info-panel").innerText()));
  await page.locator("#info-toggle").click();
  check("Seat image stays in an inert template until expansion", await page.locator("#seat-panel img").count() === 0);
  await page.locator("#seat-toggle").click();
  await page.locator("#seat-panel img").waitFor();
  check("Expanded seat image loads successfully", await page.locator("#seat-panel img").evaluate(image => image.complete && image.naturalWidth > 0));
  for (const [width, height] of [[375,667],[390,844],[430,932],[768,1024],[1440,900]]) {
    await page.setViewportSize({ width, height });
    await page.waitForFunction(() => [...document.querySelectorAll(".info-card.open .info-panel")].every(panel => panel.clientHeight >= panel.scrollHeight - 1));
    check("Expanded seat map remains fully visible at " + width, await page.locator("#seat-panel img").evaluate(image => image.getBoundingClientRect().bottom <= image.closest(".info-panel").getBoundingClientRect().bottom + 1));
    check("Home has no horizontal overflow at " + width, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    if (width === 390 || width === 1440) await page.screenshot({ path: path.join(output, "home-" + width + ".png"), fullPage: true });
  }
  await page.locator("#guide-btn").click();
  await page.locator(".song-row").last().waitFor();
  check("Only the 26 visible songs render in the browser", await page.locator(".song-row").count() === VISIBLE_SONGS.length);
  for (const song of SONGS.filter(song => song.hidden)) {
    check(song.id + " is absent from the guide", await page.locator(`.song-row[data-id="${song.id}"]`).count() === 0);
    await page.locator("#song-search-input").fill(song.title);
    check(song.id + " cannot be found by title", await page.locator("#song-list > li:visible button").count() === 0);
  }
  await page.locator("#song-search-input").fill("M87");
  check("Romanized alias search finds M八七", await page.locator("#song-list > li:visible button").getAttribute("data-id") === "M87");
  await page.locator("#song-search-input").fill("23");
  check("Original preparation number 23 still finds 烏", await page.locator("#song-list > li:visible button").getAttribute("data-id") === "Karasu");
  await page.locator("#song-search-input").fill("");
  await page.screenshot({ path: path.join(output, "guide-desktop.png"), fullPage: true });
  await page.evaluate(() => location.hash = "#/song/Lemon");
  await page.waitForFunction(() => window.__ytTest?.instances.length === 1);
  const emit = async (name, data) => page.evaluate(({ name, data }) => window.__ytTest.instances.at(-1).emit(name, data), { name, data });
  const state = () => page.locator("#video-status").getAttribute("data-state");
  await emit("onReady");
  await emit("onStateChange", 3);
  check("Buffering has a distinct message", await state() === "buffering");
  await emit("onAutoplayBlocked");
  check("Autoplay blocking offers manual playback", await page.locator("#video-start").isVisible());
  await page.locator("#video-start").click();
  check("Manual playback clears the blocked status", await state() === "playing");
  check("Pending lyric metadata does not hide a playable video", await page.locator("#yt-player").isVisible());
  await emit("onError", 150);
  check("Embed failure links the current official video", (await page.locator("#video-open").getAttribute("href")).includes("SX_ViT4Ra7k"));
  for (const song of SONGS.filter(song => song.hidden)) {
    await page.evaluate(id => location.hash = "#/song/" + id, song.id);
    await page.locator(".pending-page").waitFor();
    check(song.id + " direct route does not expose the hidden song", /此歌曲暫未開放/.test(await page.locator("#app").innerText()) && !(await page.locator("#app").innerText()).includes(song.title)
      && await songViewIsOffstage(page));
  }
  await emit("onStateChange", 1);
  check("Delayed old player callbacks cannot resume playback on a hidden route", await songViewIsOffstage(page) && await page.evaluate(() => __ytTest.instances[0].state === 2));
  await context.setOffline(true);
  check("Hidden route stays unavailable offline", /此歌曲暫未開放/.test(await page.locator("#app").innerText()));
  await context.setOffline(false);
  await page.evaluate(() => location.hash = "#/song/Lemon");
  await page.waitForFunction(() => !document.getElementById("yt-player").hidden);
  await emit("onStateChange", 1);
  check("Returning to a verified video reuses the player", await page.evaluate(() => __ytTest.instances.length === 1) && await state() === "playing");
  check("Returning from a hidden route restores the visible player", await page.locator("#yt-player").isVisible());
  await page.locator("#song-picker-btn").click();
  check("Song picker contains only the 26 visible songs", await page.locator(".song-sheet-item").count() === VISIBLE_SONGS.length
    && await page.locator('.song-sheet-item[data-id="HaruGaTomori"], .song-sheet-item[data-id="KonnichiwaGokigenyou"]').count() === 0);
  await page.locator("#sheet-search-input").fill("M87");
  check("Song picker alias search preserves M八七", await page.locator("#song-sheet-list > li:visible button").getAttribute("data-id") === "M87");
  await page.locator(".song-sheet-close").click();
  await page.evaluate(() => location.hash = "#/song/IrisOut");
  await page.waitForFunction(() => document.getElementById("song-page-heading").textContent === "IRIS OUT");
  await page.locator("#next-song").click();
  await page.waitForFunction(() => location.hash === "#/song/Karasu" && document.getElementById("song-page-heading").textContent === "烏");
  check("Next skips both hidden songs and retains preparation number 23", await page.locator("#song-picker-number").textContent() === "23.");
  await page.locator("#prev-song").click();
  await page.waitForFunction(() => location.hash === "#/song/IrisOut" && document.getElementById("song-page-heading").textContent === "IRIS OUT");
  check("Previous skips both hidden songs", true);
  for (const [songId, videoId, audio] of [
    ["YellowGhost", "hvZe_uu_u9A", true], ["Yumeutsutsu", "7yM35hOfW9E", true],
    ["CranberryAndPancake", "5r365k5-lA8", true], ["MelancholyKitchen", "0GEoiLdCkUM", true],
    ["NineteenNinetyOne", "1cnndBdzCAk", false], ["MayoeruHitsuji", "DAeERkHEy00", true],
  ]) {
    await page.evaluate(id => location.hash = "#/song/" + id, songId);
    await page.waitForFunction(id => window.__ytTest.instances[0].id === id, videoId);
    check(songId + " uses its configured YouTube ID and media label", (await page.locator("#watch-on-yt").getAttribute("href")).endsWith(videoId)
      && (await page.locator("#watch-on-yt").innerText()).includes(audio ? "聆聽" : "觀看")
      && await page.locator("#yt-player").isVisible());
  }
  await page.evaluate(() => location.hash = "#/song/Lemon");
  await page.waitForFunction(() => window.__ytTest.instances[0].id === "SX_ViT4Ra7k");
  for (const [width, height] of [[375,667],[390,844],[430,932],[768,1024],[1440,900]]) {
    await page.setViewportSize({ width, height });
    check("Song page has no horizontal overflow at " + width, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    if (width === 390 || width === 1440) await page.screenshot({ path: path.join(output, "song-" + width + ".png"), fullPage: true });
  }
  await page.evaluate(() => location.hash = "#/song/Prema");
  await page.locator(".pending-page").waitFor();
  check("Legacy song routes offer the current guide", /米津玄師/.test(await page.locator("#app").innerText()));
  await page.goto(base + "#/setlist");
  await page.locator(".pending-page").waitFor();
  check("Direct setlist route keeps Taipei concert order unconfirmed", /台北場歌單待確認/.test(await page.locator("#app").innerText()));
  await page.goto(base + "?debug=1#/song/YellowGhost");
  await page.waitForFunction(() => document.getElementById("dbg")?.textContent.includes("同步次數") && document.querySelectorAll("#lyrics-list .lyric-line").length === 34);
  check("Direct imported-song route and Traditional Chinese debug text load", await state() !== "pending" && /待補歌詞時為 0/.test(await page.locator("#dbg").innerText()));
  await page.goto(base + "#/song/YellowGhost");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const song of VISIBLE_SONGS) {
    const content = SONG_LYRICS.find(item => item.id === song.id);
    await page.evaluate(id => location.hash = "#/song/" + id, song.id);
    await page.waitForFunction(({title,count,id}) => document.getElementById("song-page-heading")?.textContent === title
      && document.querySelectorAll("button.lyric-line").length === count && window.__ytTest.instances.at(-1)?.id === id,
      {title:song.title,count:content.lyrics.length,id:song.youtubeId});
    await emit("onReady");
    await emit("onStateChange", 1);
    assert.ok(await page.locator("#autoscroll-btn").isEnabled());
    const indices = [0, Math.floor(content.lyrics.length / 2), content.lyrics.length - 1, 0];
    for (const index of indices) {
      await page.evaluate(time => { window.__ytTest.instances.at(-1).time = time; }, content.lyrics[index].time + 0.01);
      await page.waitForFunction(index => document.querySelector(".lyric-line.active")?.dataset.idx === String(index), index);
      assert.equal(await page.locator(".lyric-line.active").count(), 1);
      if (index === content.lyrics.length - 1) await page.waitForFunction(() => document.querySelector(".lyrics-scroll").scrollTop > 0);
    }
    const seekIndex = Math.floor(content.lyrics.length / 3);
    await page.locator(".lyric-line").nth(seekIndex).click({ force: true });
    assert.equal(await page.evaluate(() => window.__ytTest.instances.at(-1).lastSeek), content.lyrics[seekIndex].time);
    await page.waitForFunction(index => document.querySelector(".lyric-line.active")?.dataset.idx === String(index), seekIndex);
    check(song.id + " LRC follows first/middle/last/backward player times and seeks from a lyric click", true);
    if (song.id === "Lemon") await page.screenshot({ path: path.join(output, "lrc-follow-lemon-mobile.png"), fullPage: true });
  }
  await context.close();

  const delayed = await browser.newContext({ serviceWorkers: "block" });
  const delayedPage = await delayed.newPage();
  delayedPage.setDefaultTimeout(10000);
  delayedPage.on("pageerror", error => report.errors.push(error.message));
  await delayedPage.route(/youtube\.com|fonts\.(googleapis|gstatic)\.com/, route => route.abort());
  const lyricsUrl = /\/(?:assets\/song-lyrics-[^/]+|src\/song-lyrics)\.js(?:\?.*)?$/;
  let releaseLyrics;
  const lyricsHeld = new Promise(resolve => { releaseLyrics = resolve; });
  await delayedPage.route(lyricsUrl, async route => { await lyricsHeld; await route.continue(); });
  const lyricsRequested = delayedPage.waitForRequest(lyricsUrl);
  await delayedPage.goto(base + "#/song/Lemon", { waitUntil: "domcontentloaded" });
  await lyricsRequested;
  await delayedPage.evaluate(() => location.hash = "#/song/HaruGaTomori");
  await delayedPage.locator(".pending-page").waitFor();
  const lyricsReceived = delayedPage.waitForResponse(lyricsUrl);
  releaseLyrics();
  await lyricsReceived;
  await delayedPage.waitForLoadState("networkidle");
  check("Delayed lyric loading cannot reopen the previous song after entering a hidden route", /此歌曲暫未開放/.test(await delayedPage.locator("#app").innerText())
    && await songViewIsOffstage(delayedPage));
  await delayed.close();

  const offline = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "allow" });
  const offlinePage = await offline.newPage();
  offlinePage.on("pageerror", error => report.errors.push(error.message));
  await offlinePage.goto(base);
  await offlinePage.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 25000 });
  check("App registers and activates the real production service worker", true);
  await offline.setOffline(true);
  await offlinePage.reload();
  await offlinePage.waitForFunction(() => document.querySelector('[data-show-id][aria-pressed="true"]'));
  check("Cached homepage and its JavaScript initialize offline", await offlinePage.locator(".hero").count() === 1);
  await offlinePage.waitForFunction(() => document.getElementById("app-banner-msg")?.textContent.includes("已快取的活動資訊"));
  check("Offline message accurately describes cached local content", /影片及外部網站需要網路/.test(await offlinePage.locator("#app-banner-msg").innerText()));
  await offlinePage.evaluate(() => location.hash = "#/song/YellowGhost");
  await offlinePage.waitForFunction(() => document.querySelectorAll("#lyrics-list .lyric-line").length === 34);
  check("Visible lazy song data opens for the first time offline", /原文歌詞已匯入/.test(await offlinePage.locator("#song-content-status").innerText()));
  for (const song of SONGS.filter(song => song.hidden)) {
    await offlinePage.evaluate(id => location.hash = "#/song/" + id, song.id);
    await offlinePage.locator(".pending-page").waitFor();
    check(song.id + " stays hidden offline", /此歌曲暫未開放/.test(await offlinePage.locator("#app").innerText()) && await songViewIsOffstage(offlinePage));
  }
  check("Official seat image is cached offline", await offlinePage.evaluate(async () => (await fetch("./images/taipei-seat-map.jpg")).status === 200));
  await offline.close();
  check("No uncaught application errors", report.errors.length === 0);
} finally {
  await fs.writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await browser.close();
}
