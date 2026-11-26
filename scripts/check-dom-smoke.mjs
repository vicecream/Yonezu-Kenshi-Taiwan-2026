// Optional DOM-only smoke check. Install linkedom outside the project, then run:
// node --experimental-vm-modules scripts/check-dom-smoke.mjs <linkedom-esm-entry>
// This deliberately does not claim browser layout, media or accessibility QA.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";
import { EVENT, SHOWS, SONGS as ALL_SONGS, VISIBLE_SONGS as SONGS, ONSITE, ALBUMS } from "../src/data.js";
import { SONG_LYRICS } from "../src/song-lyrics.js";
import { songCapabilities } from "../src/song-content.js";

if (!process.argv[2]) throw new Error("Pass the installed linkedom ESM entry path; no project dependency is required.");
const { parseHTML } = await import(pathToFileURL(path.resolve(process.argv[2])).href);
const root = fileURLToPath(new URL("../", import.meta.url));
const { window } = parseHTML(fs.readFileSync(path.join(root, "index.html"), "utf8"));
const document = window.document;
const location = { hash: "#/", search: "", href: "https://guide.example/", origin: "https://guide.example", protocol: "https:", reload(){} };
const timers = new Map();
let nextTimer = 1;
const schedule = callback => { const id = nextTimer++; timers.set(id, callback); return id; };
const cancel = id => timers.delete(id);
const storage = new Map();
const localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)) };
for (const [key, value] of Object.entries({
  location, navigator: { onLine: true, userAgent: "DOM smoke fixture", maxTouchPoints: 0 },
  matchMedia: () => ({ matches: false, addEventListener(){} }),
  innerWidth: 1280, innerHeight: 900, scrollY: 0,
  scrollTo(){}, focus(){}, setTimeout: schedule, clearTimeout: cancel,
  fetch: async () => { throw new Error("DOM fixture has no network"); },
  requestAnimationFrame: schedule, cancelAnimationFrame: cancel,
  getComputedStyle: () => ({ marginTop: "0px", getPropertyValue: () => "" }),
})) Object.defineProperty(window, key, { value, writable: true, configurable: true });
const rect = () => ({ x: 0, y: 0, top: 0, bottom: 400, left: 0, right: 600, width: 600, height: 400 });
window.HTMLElement.prototype.getBoundingClientRect = rect;
window.HTMLElement.prototype.scrollIntoView = function(){};
window.HTMLElement.prototype.focus = function(){};
window.HTMLElement.prototype.pause = function(){};
window.HTMLElement.prototype.play = async function(){};
window.HTMLElement.prototype.load = function(){};
// linkedom's select value has no browser setter; supply browser-like semantics.
Object.defineProperty(window.HTMLSelectElement.prototype, "value", {
  configurable: true,
  get(){ return this.getAttribute("data-fixture-value") || this.querySelector("option[selected]")?.value || this.querySelector("option")?.value || ""; },
  set(value){ this.setAttribute("data-fixture-value", String(value)); },
});
const context = vm.createContext({
  window, document, location, navigator: window.navigator, localStorage,
  console, performance, URL, URLSearchParams, Intl, Date, Node: window.Node, NodeFilter: window.NodeFilter,
  Response, fetch: async () => { throw new Error("DOM fixture has no network"); },
  setTimeout: schedule, clearTimeout: cancel, setInterval: schedule, clearInterval: cancel,
  requestAnimationFrame: schedule, cancelAnimationFrame: cancel,
  getComputedStyle: window.getComputedStyle,
});
const modules = new Map();
function getModule(url){
  const key = url.href;
  if (modules.has(key)) return modules.get(key);
  let module;
  if (url.search === "?inline" || url.search === "?raw"){
    const text = fs.readFileSync(fileURLToPath(new URL(url.pathname, url)), "utf8");
    module = new vm.SyntheticModule(["default"], function(){ this.setExport("default", text); }, { context, identifier: key });
  } else {
    const filename = fileURLToPath(url);
    let source = fs.readFileSync(filename, "utf8");
    if (filename === path.join(root, "src", "main.js")) {
      source = source.replace(/\}\)\.catch\(\(\) => \{\r?\n      window.clearTimeout\(lyricsLoadTimer\);/,
        "}).catch(error => { console.error(error);\n      window.clearTimeout(lyricsLoadTimer);");
      source += "\nexport { router, renderSong, currentSong, updateTodayCard, updateLyricsSync };\nexport function installTimelineFixture(){ const clock = { time:0, seek:null }; player = { getCurrentTime:()=>clock.time, getDuration:()=>400, getPlayerState:()=>2, seekTo:value=>{clock.time=value;clock.seek=value;}, playVideo(){} }; playerReady=true; return clock; }\n";
    }
    module = new vm.SourceTextModule(source, {
      context, identifier: key,
      initializeImportMeta(meta){ meta.env = { BASE_URL: "./", DEV: false }; },
      importModuleDynamically: async (specifier, parent) => {
        const child = getModule(new URL(specifier, parent.identifier));
        if (child.status === "unlinked") await child.link(linker);
        if (child.status === "linked") await child.evaluate();
        return child;
      },
    });
  }
  modules.set(key, module);
  return module;
}
const linker = (specifier, parent) => getModule(new URL(specifier, parent.identifier));
const main = getModule(pathToFileURL(path.join(root, "src", "main.js")));
await main.link(linker);
await main.evaluate();
const settle = async () => { for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve)); };
async function route(hash){ location.hash = hash; main.namespace.router(); await settle(); }

assert.ok(document.querySelector(".hero"), "Home renders");
assert.match(document.querySelector(".hero").textContent, /米津玄師/);
assert.equal(document.querySelectorAll("[data-show-id]").length, 2);
document.querySelector('[data-show-id="2026-12-27"]').click();
assert.equal(storage.get("yonezu-selected-show"), "2026-12-27");
assert.equal(document.querySelector('[data-show-id="2026-12-27"]').getAttribute("aria-pressed"), "true");
document.querySelector('[data-show-id="2026-12-26"]').click();
main.namespace.updateTodayCard(Date.parse("2026-12-26T15:00:00+08:00"));
assert.equal(document.getElementById("today-card").hidden, false);
assert.match(document.getElementById("today-title").textContent, /12\/26/);
assert.equal(document.querySelectorAll("#today-list li").length, 2);
document.getElementById("seat-toggle").click();
const image = document.querySelector("#seat-panel img");
assert.equal(image.getAttribute("src"), EVENT.seatMap);
await route("#/guide");
assert.equal(document.querySelectorAll(".song-row").length, 26);
assert.deepEqual([...document.querySelectorAll(".song-row")].map(button => button.dataset.id), SONGS.map(song => song.id));
const search = document.getElementById("song-search-input");
search.value = "M87";
search.dispatchEvent(new window.Event("input"));
assert.equal(document.querySelectorAll("#song-list > li:not([hidden])").length, 1);
assert.equal(document.querySelector("#song-list > li:not([hidden]) button").dataset.id, "M87");
search.value = "12";
search.dispatchEvent(new window.Event("input"));
assert.equal(document.querySelector("#song-list > li:not([hidden]) button").dataset.id, "Lemon");
search.value = "23";
search.dispatchEvent(new window.Event("input"));
assert.equal(document.querySelector("#song-list > li:not([hidden]) button").dataset.id, "Karasu", "Visible songs retain original preparation numbers");
for (const query of ["21", "22", ...ALL_SONGS.filter(song => song.hidden).flatMap(song => [song.title, song.romanizedTitle])]) {
  search.value = query;
  search.dispatchEvent(new window.Event("input"));
  assert.equal(document.querySelectorAll("#song-list > li:not([hidden])").length, 0, query + ": hidden songs are not searchable");
}
await route("#/song/Lemon");
assert.match(document.getElementById("song-content-status").textContent, /原文歌詞已匯入/);
assert.equal(document.getElementById("reading-btn").disabled, false);
assert.ok(document.querySelectorAll(".lyric-jp ruby rt").length > 0, "Real imported lyrics show furigana");
const originalTranslation = document.querySelector(".lyric-zh").textContent;
document.getElementById("reading-btn").click();
assert.equal(storage.get("yonezu-reading"), "romaji");
assert.doesNotMatch(document.querySelector(".lyric-jp").textContent, /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u);
assert.equal(document.querySelector(".lyric-jp").lang, "ja-Latn");
document.getElementById("reading-btn").click();
assert.equal(storage.get("yonezu-reading"), "both");
assert.ok(document.getElementById("song-page").classList.contains("reading-both"));
assert.ok(document.querySelector(".lyric-romaji").textContent.trim());
assert.equal(document.querySelector(".lyric-zh").textContent, originalTranslation);
document.getElementById("reading-btn").click();
assert.equal(storage.get("yonezu-reading"), "kana");
assert.equal(document.getElementById("autoscroll-btn").disabled, false);
assert.equal(document.querySelectorAll(".lyric-line").length, SONG_LYRICS.find(song => song.id === "Lemon").lyrics.length);
assert.ok(document.querySelectorAll("button.lyric-line").length > 0, "Requested LRC preview enables lyric seeking");
assert.ok(document.getElementById("watch-on-yt").href.includes("SX_ViT4Ra7k"));
assert.equal(document.querySelectorAll(".song-sheet-item").length, 26);
const sheetSearch = document.getElementById("sheet-search-input");
sheetSearch.value = "M87";
sheetSearch.dispatchEvent(new window.Event("input"));
assert.equal(document.querySelector("#song-sheet-list > li:not([hidden]) button").dataset.id, "M87", "Sheet aliases still match songs after the hidden entries");
sheetSearch.value = "";
sheetSearch.dispatchEvent(new window.Event("input"));
for (const modifier of ["altKey", "ctrlKey", "metaKey", "shiftKey"]) {
  const event = new window.Event("keydown", { bubbles: true, cancelable: true });
  Object.assign(event, { key: "ArrowLeft", [modifier]: true });
  document.dispatchEvent(event);
  assert.equal(event.defaultPrevented, false, modifier + " keeps its native shortcut");
  assert.equal(location.hash, "#/song/Lemon", modifier + " does not change the song");
}
const previousSongKey = new window.Event("keydown", { bubbles: true, cancelable: true });
Object.assign(previousSongKey, { key: "ArrowLeft" });
document.dispatchEvent(previousSongKey);
assert.equal(previousSongKey.defaultPrevented, true);
assert.equal(location.hash, "#/song/NineteenNinetyOne", "An unmodified arrow still changes songs");
await route("#/song/IrisOut");
document.getElementById("next-song").click();
assert.equal(location.hash, "#/song/Karasu", "Next skips both hidden songs");
await route(location.hash);
document.getElementById("prev-song").click();
assert.equal(location.hash, "#/song/IrisOut", "Previous skips both hidden songs");
for (const song of ALL_SONGS.filter(song => song.hidden)) {
  await route("#/song/" + song.id);
  assert.match(document.getElementById("app").textContent, /此歌曲暫未開放/);
  assert.ok(!document.getElementById("app").textContent.includes(song.title));
  assert.ok(document.getElementById("song-view").classList.contains("offstage"));
}
await route("#/song/YellowGhost");
assert.equal(document.getElementById("watch-on-yt").getAttribute("href"), SONGS[0].videoSourceUrl);
assert.match(document.getElementById("watch-on-yt").textContent, /聆聽/);
for (const song of SONGS) {
  await route("#/song/" + song.id);
  assert.equal(main.namespace.currentSong.id, song.id);
}
const base = SONG_LYRICS.find(song => song.id === "Lemon");
main.namespace.renderSong({ ...base, youtubeId: null, previewUrl: "https://example.com/announcement" });
assert.equal(document.getElementById("video-status").dataset.state, "pending", "Synthetic missing-video fixture retains the pending state");
assert.equal(document.getElementById("play-toggle").disabled, true);
assert.equal(document.getElementById("yt-player").hidden, true);
window.JP_FURIGANA = { "日本語": "<ruby>日本語<rt>にほんご</rt></ruby>" };
window.JP_ROMAJI = { "日本語": "nihongo" };
main.namespace.renderSong({ ...base, readingsStatus: "ready", lyrics: [{ jp: "日本語", tr: "合成測試", time: 1 }, { jp: "Example", time: 3 }] });
await settle();
assert.equal(document.getElementById("reading-btn").disabled, false);
assert.equal(document.getElementById("chinese-toggle").disabled, false);
assert.ok(document.querySelectorAll(".lyric-jp ruby rt").length > 0);
const clock = main.namespace.installTimelineFixture();
clock.time = 1.5;
main.namespace.updateLyricsSync(true);
assert.equal(document.querySelectorAll(".lyric-line.active").length, 1);
main.namespace.renderSong({ ...base, language: "en", lyrics: [{ jp: "Synthetic untimed line" }], readingsStatus: "pending" });
assert.equal(document.getElementById("reading-btn").hidden, true);
assert.equal(document.getElementById("autoscroll-btn").disabled, true);
assert.equal(document.querySelector(".lyric-line").tagName, "DIV");
await route("#/setlist");
assert.match(document.getElementById("app").textContent, /台北場歌單待確認/);
await route("#/song/Prema");
assert.match(document.getElementById("app").textContent, /米津玄師台北/);
await route("#/");
assert.equal(document.querySelector('[data-show-id="2026-12-26"]').getAttribute("aria-pressed"), "true");
console.log("PASS DOM: two shows, 26 visible routes, hidden routes/search, preserved numbering, skipped neighbors, synthetic media/readings/timing, legacy routes and lazy images.");
