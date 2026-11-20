import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { SITE, EVENT, SHOWS, ONSITE, TICKETS, SONGS, VISIBLE_SONGS } from "../src/data.js";
import { SONG_LYRICS } from "../src/song-lyrics.js";
import { showState, resolveShow, todayTimeline } from "../src/show-time.js";
import { songCapabilities } from "../src/song-content.js";
import { homeHtml } from "../src/ui/home.js";
import { deploymentSiteUrl } from "../vite.config.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const pkg = JSON.parse(read("package.json"));
assert.equal(SONGS.length, 28);
assert.equal(new Set(SONGS.map(song => song.id)).size, 28);
assert.equal(VISIBLE_SONGS.length, 26);
assert.deepEqual(SONGS.filter(song => song.hidden).map(song => song.id), ["HaruGaTomori", "KonnichiwaGokigenyou"]);
assert.ok(VISIBLE_SONGS.every(song => !song.hidden && SONGS.includes(song)));
assert.deepEqual(VISIBLE_SONGS.map(song => SONGS.indexOf(song) + 1), [...Array.from({ length: 20 }, (_, index) => index + 1), 23, 24, 25, 26, 27, 28]);
assert.deepEqual(SONGS.map(song => song.title), ["YELLOW GHOST", "春雷", "感電", "Flamingo", "LADY", "ゆめうつつ", "クランベリーとパンケーキ", "死神", "さよーならまたいつか！", "メランコリーキッチン", "1991", "Lemon", "JANE DOE", "海の幽霊", "夜鷹", "LOSER", "BOW AND ARROW", "ピースサイン", "KICK BACK", "IRIS OUT", "春が灯り", "こんにちはごきげんよう！", "烏", "迷える羊", "Plazma", "M八七", "地球儀", "アイネクライネ"]);
for (const song of SONGS) {
  assert.equal(song.artist, "Kenshi Yonezu");
  assert.equal(new URL(song.sourceUrl).hostname, "reissuerecords.net");
  assert.equal(new URL(song.listenUrl).protocol, "https:");
  if (song.youtubeId) assert.match(song.youtubeId, /^[\w-]{11}$/);
  else assert.ok(song.listenUrl && !song.videoSourceUrl);
  assert.ok(song.karaokeArtists.includes("米津玄師"));
}
assert.equal(SONGS.filter(song => song.youtubeId).length, 26);
assert.equal(SONGS.filter(song => song.videoType === "official-audio").length, 6);
assert.equal(SONGS.find(song => song.id === "Shinigami").youtubeId, "YwntuDTDgA8", "Full LRC requires the full official audio, not the short MV");
assert.equal(SONGS.filter(song => song.previewUrl).length, 2);
const lyricInputs = JSON.parse(read("lyrics/import-manifest.json"));
const translationInputs = JSON.parse(read("lyrics/translations/sources.json"));
assert.deepEqual(lyricInputs.candidateEntries.map(entry => entry.id), SONGS.map(song => song.id));
assert.deepEqual(translationInputs.references.map(entry => entry.id), SONGS.map(song => song.id));
for (const [index, song] of SONGS.entries()) {
  const candidate = lyricInputs.candidateEntries[index];
  const reference = translationInputs.references[index];
  assert.equal(candidate.file, song.id + ".lrc");
  assert.equal(candidate.sourceUrl, song.lyricsCandidateUrl);
  assert.equal(reference.referenceUrl, song.translationReferenceUrl);
  assert.equal(reference.declaredTranslator, song.translationReferenceCredit);
  assert.equal(reference.file, song.id + ".zh.txt");
  assert.equal(reference.suggestedPdf, song.title + ".pdf");
  assert.equal(reference.translationSourceUrl, reference.referenceUrl);
  if (song.releaseStatus === "announced") {
    assert.equal(song.youtubeId, null);
    assert.equal(candidate.sourceUrl, null);
    assert.equal(reference.referenceUrl, null);
    assert.equal(candidate.candidateStatus, "source-not-found");
    assert.equal(reference.status, "source-not-found");
  } else {
    assert.equal(new URL(candidate.sourceUrl).hostname, "lrclib.net");
    assert.equal(new URL(reference.referenceUrl).hostname, "alicepika.blog.fc2.com");
  }
}
console.log("PASS 28 matching source drafts, local import paths and separate pending announcements");
assert.deepEqual(SONG_LYRICS.map(song => song.id), SONGS.map(song => song.id));
const localInputs = new Map(lyricInputs.songs.map(entry => [entry.id, entry]));
const suppliedTranslations = JSON.parse(read("lyrics/translations/user-supplied.json"));
const localTranslations = new Map(suppliedTranslations.songs.map(entry => [entry.id, entry]));
assert.equal(localTranslations.size, suppliedTranslations.songs.length, "Local translation imports must have unique song IDs");
assert.equal(localInputs.size, lyricInputs.songs.length, "Local lyric imports must have unique song IDs");
for (const entry of localInputs.values()) {
  assert.ok(SONGS.some(song => song.id === entry.id), entry.id + ": known current song");
  assert.equal(entry.sourceUrl, lyricInputs.candidateEntries.find(candidate => candidate.id === entry.id).sourceUrl);
  assert.ok(entry.usageBasis?.trim(), entry.id + ": supplied-file basis");
  const localPath = path.resolve(root, "lyrics", entry.file);
  assert.ok(fs.existsSync(localPath), entry.id + ": local source exists");
  if (entry.file.endsWith(".json")) {
    const payload = JSON.parse(fs.readFileSync(localPath, "utf8"));
    assert.equal(String(payload.id), new URL(entry.sourceUrl).pathname.split("/").at(-1), entry.id + ": provider record identity");
  }
}
for (const song of SONG_LYRICS) {
  const caps = songCapabilities(song);
  assert.equal(caps.timed, !song.hidden);
  assert.equal(caps.readings, false);
  const input = localInputs.get(song.id);
  assert.equal(caps.hasOriginal, Boolean(input), song.id + ": originals require supplied local input");
  const translation = localTranslations.get(song.id);
  assert.equal(caps.hasTranslation, Boolean(translation?.entries.length), song.id + ": translations require supplied local input");
  if (translation) {
    assert.ok(translation.usageBasis?.trim(), song.id + ": supplied translation basis");
    assert.ok(fs.existsSync(path.resolve(root, "lyrics/translations", translation.file)), song.id + ": local translation exists");
    assert.equal(song.translationCredit, translation.translationCredit);
    assert.equal(song.lyrics.filter(line => line.tr?.trim()).length, translation.entries.length);
    assert.equal(song.translationStatus, caps.translationComplete ? "ready" : "partial");
    for (const row of translation.entries) {
      assert.equal(song.lyrics[row.index]?.jp, row.jp, song.id + ": translation preserves original text");
      assert.equal(song.lyrics[row.index]?.tr, row.tr, song.id + ": translation matches reviewed mapping");
    }
  }
  if (input) {
    assert.equal(song.lyricsStatus, "imported");
    assert.equal(song.lyricsSourceUrl, input.sourceUrl);
    assert.equal(song.lyricsUsageBasis, input.usageBasis);
    assert.equal(input.timingMode, "preview");
    assert.equal(song.timingStatus, "preview");
    assert.equal(song.timingPreview.youtubeId, song.youtubeId);
    assert.equal(song.readingsStatus, "pending");
    assert.ok(song.lyrics.every((line, index) => line.jp.trim()
      && Number.isFinite(line.sourceTime) && line.sourceTime >= 0
      && (index === 0 || line.sourceTime >= song.lyrics[index - 1].sourceTime)
      && line.time === line.sourceTime), song.id + ": explicitly requested LRC preview preserves every source timestamp");
  }
}
assert.equal(songCapabilities({ language: "ja", readingsStatus: "pending", lyrics: [{ jp: "Example" }] }).readings, false);
assert.equal(songCapabilities({ lyrics: [{ jp: "First", time: 3 }, { jp: "Second", time: 1 }] }).timed, false);
assert.equal(songCapabilities({ lyrics: [{ jp: "First", tr: "測試", time: 0 }, { jp: "Second", time: 1 }] }).translationComplete, false);
assert.equal(songCapabilities({ lyrics: [{ jp: "First", time: 0 }, { jp: "Second", time: 1 }] }).timed, true);
console.log("PASS 28 fixed songs, official sources, missing video and independent pending capabilities");

assert.deepEqual(SHOWS.map(show => show.date), ["2026-12-26", "2026-12-27"]);
assert.equal(EVENT.timeZone, "Asia/Taipei");
for (const show of SHOWS) {
  assert.equal(show.doors, "15:00");
  assert.equal(show.startLabel, "18:00");
  assert.equal("end" in show, false);
}
const timeCases = [
  ["2026-12-25T23:59:59+08:00", "2026-12-26", "upcoming", 1],
  ["2026-12-26T00:00:00+08:00", "2026-12-26", "upcoming", 0],
  ["2026-12-26T17:59:59+08:00", "2026-12-26", "upcoming", 0],
  ["2026-12-26T18:00:00+08:00", "2026-12-26", "started", 0],
  ["2026-12-26T23:59:59+08:00", "2026-12-26", "started", 0],
  ["2026-12-27T00:00:00+08:00", "2026-12-27", "upcoming", 0],
  ["2026-12-27T18:00:00+08:00", "2026-12-27", "started", 0],
  ["2026-12-28T00:00:00+08:00", "2026-12-27", "past", 0],
];
for (const tz of ["UTC", "America/Los_Angeles", "Asia/Tokyo"]) {
  const code = `import { showState } from ${JSON.stringify(new URL("../src/show-time.js", import.meta.url).href)}; console.log(JSON.stringify(${JSON.stringify(timeCases)}.map(([value])=>{const s=showState(Date.parse(value)); return [s.show.id,s.phase,s.days]})));`;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", code], { env: { ...process.env, TZ: tz }, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), timeCases.map(([, id, phase, days]) => [id, phase, days]), tz);
}
const midnight = Date.parse("2026-12-27T00:00:00+08:00");
assert.equal(showState(midnight, "2026-12-26").phase, "past");
assert.equal(resolveShow(midnight, "invalid").id, "2026-12-27");
assert.equal(todayTimeline(midnight, "2026-12-26").steps.length, 0);
assert.equal(todayTimeline(Date.parse("2026-12-26T15:00:00+08:00")).currentIndex, 0);
assert.equal(todayTimeline(Date.parse("2026-12-26T18:00:00+08:00")).nextIndex, -1);
console.log("PASS both shows, manual choice, Taipei midnight and start boundaries across host timezones");

const html = homeHtml("v" + pkg.version);
for (const text of ["米津玄師", "12/26（六）", "12/27（日）", `${VISIBLE_SONGS.length} 首歌曲預習`, "全程禁止拍照", "實名制", "待主辦公告"]) assert.ok(html.includes(text), text);
for (const text of [html, SITE.description, read("index.html"), JSON.parse(read("manifest.json")).description]) assert.doesNotMatch(text, /28 首/);
assert.equal((html.match(/data-show-id=/g) || []).length, 2);
assert.equal((html.match(/class="info-panel-template"/g) || []).length, 5);
assert.match(html, /data-src="\.\/images\/taipei-seat-map.jpg"/);
assert.doesNotMatch(html, /Fujii|藤井|高雄|Prema|KKTIX|全家|世運大道/);
assert.equal(ONSITE.checkedAt, EVENT.checkedAt);
assert.deepEqual(TICKETS.prices, [5980, 5680, 4880, 4480, 3880, 2800, 2480, 1800]);
assert.equal(SITE.url, null);
assert.equal(SITE.repoUrl, "https://github.com/vicecream/Yonezu-Kenshi-Taiwan-2026");
assert.equal(deploymentSiteUrl({}), null);
assert.equal(deploymentSiteUrl({ SITE_URL: "https://guide.example", CF_PAGES_URL: "https://preview.example" }), "https://guide.example/");
assert.equal(deploymentSiteUrl({ CF_PAGES_URL: "https://preview.example" }), "https://preview.example/");
for (const value of ["http://example.com", "https://example.com/path", "https://x:y@example.com", "https://example.com/?q=1", "https://example.com/#song"]) assert.throws(() => deploymentSiteUrl({ SITE_URL: value }));
const lock = JSON.parse(read("package-lock.json"));
assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
assert.equal(lock.version, pkg.version);
assert.equal(lock.packages[""].version, pkg.version);
assert.equal(lock.name, pkg.name);
assert.equal(lock.packages[""].name, pkg.name);
assert.ok(read("src/main.js").includes('const BUILD = "v' + pkg.version + '"'));
assert.ok(read("sw.js").includes('const CACHE_VERSION = "v' + pkg.version + '"'));
assert.ok(read("index.html").includes('src/main.js?build=v' + pkg.version));
assert.ok(read("index.html").includes('src/app.css?build=v' + pkg.version));
const changelogHeading = read("CHANGELOG.md").split(/\r?\n/).find(line => line.startsWith("## "));
const changelogVersion = changelogHeading?.match(/^## (?:\[\*\*)?v(\d+\.\d+\.\d+)(?:\*\*\]\(https:\/\/github\.com\/vicecream\/Yonezu-Kenshi-Taiwan-2026\/commit\/[a-f0-9]{40}\)|（尚未發佈）)?$/);
assert.equal(changelogVersion?.[1], pkg.version, "Newest changelog version must match the shipped version");
assert.equal(JSON.parse(read("manifest.json")).name, SITE.name);
assert.equal(fs.existsSync(path.join(root, "CNAME")), false);
console.log("PASS homepage, lazy information, versions and unset/valid/invalid deployment URLs");

// The real worker executes against a controlled Cache API, including offline fetch.
{
  const origin = "https://guide.example";
  const key = request => new URL(typeof request === "string" ? request : request.url, origin).href;
  const stores = new Map(), listeners = new Map();
  let offline = false;
  const fetchFixture = async request => { if (offline) throw new Error("Offline"); return new Response(key(request)); };
  const caches = {
    async keys(){ return [...stores.keys()]; }, async delete(name){ return stores.delete(name); },
    async open(name){ if (!stores.has(name)) stores.set(name, new Map()); const entries = stores.get(name); return {
      async add(request){ entries.set(key(request), await fetchFixture(request)); },
      async put(request, response){ entries.set(key(request), response.clone()); },
      async match(request, options = {}){
        // Simulate Vary: Origin differences between install and module loads.
        if (typeof request !== "string" && request.mode === "cors" && !options.ignoreVary) return undefined;
        return entries.get(key(request))?.clone();
      },
    }; },
  };
  class RelativeRequest extends Request { constructor(input, init){ super(key(input), init); } }
  const self = { location: { origin }, clients: { async claim(){} }, skipWaiting(){}, addEventListener(type, handler){ listeners.set(type, handler); } };
  vm.runInNewContext(read("sw.js"), { self, caches, fetch: fetchFixture, Request: RelativeRequest, Response, URL });
  const lifecycle = async type => { let done; listeners.get(type)({ waitUntil(promise){ done = promise; } }); await done; };
  stores.set("yonezu-guide-v0", new Map()); stores.set("other-site-cache", new Map());
  await lifecycle("install"); await lifecycle("activate");
  assert.deepEqual(await caches.keys(), ["other-site-cache", "yonezu-guide-v" + pkg.version]);
  const cache = await caches.open("yonezu-guide-v" + pkg.version);
  for (const asset of ["./", "./index.html", EVENT.poster, EVENT.posterMobile, EVENT.seatMap]) assert.ok(await cache.match(asset), asset);
  offline = true;
  const request = url => { let result; listeners.get("fetch")({ request: { method: "GET", mode: url === origin + "/" ? "navigate" : "cors", url }, respondWith(promise){ result = promise; } }); return result; };
  assert.equal((await request(origin + "/")).status, 200);
  assert.equal((await request(new URL(EVENT.seatMap, origin).href)).status, 200);
  assert.equal(request("https://www.youtube.com/iframe_api"), undefined);
}
console.log("PASS service worker namespace, offline home/images and external-video boundary");

const currentDocs = ["README.md", "AGENTS.md", "DESIGN.md", "CLOUDFLARE_DEPLOY.md", "CHANGELOG.md", ...fs.readdirSync(path.join(root, "docs")).filter(file => file.endsWith(".md")).map(file => "docs/" + file), "lyrics/README.md", "lyrics/translations/README.md"];
for (const file of currentDocs) {
  const source = read(file);
  for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].split("#")[0];
    if (!target || /^[a-z]+:/i.test(target)) continue;
    assert.ok(fs.existsSync(path.resolve(root, path.dirname(file), decodeURIComponent(target))), file + ": " + target);
  }
  if (file !== "CHANGELOG.md") assert.doesNotMatch(source, /https:\/\/fujii-kaze-taiwan-2026\.pages\.dev|https:\/\/kaze\.tiaui\.co/);
}
const activeSources = fs.readdirSync(path.join(root, "src"), { recursive: true })
  .filter(file => /\.(js|css)$/.test(file)).map(file => "src/" + file);
for (const file of [...activeSources, "index.html", "manifest.json", "sw.js", "vite.config.js", "karaoke-sources.js", "furigana.js", "docs/spectra/config.yaml"]) {
  assert.doesNotMatch(read(file), /Fujii Kaze|藤井風|高雄|kaze-|kaze\.tiaui|Prema|KKTIX|KKLIVE/i, file);
}
for (const file of [EVENT.poster, EVENT.posterMobile, EVENT.seatMap]) assert.ok(fs.statSync(path.join(root, file)).size > 1000);
for (const file of ["prema-poster.jpg", "kaohsiung-venue-map.jpg", "kaohsiung-stage-map.png"]) {
  assert.equal(fs.existsSync(path.join(root, "images", file)), false, "Legacy image must stay archived: " + file);
  assert.ok(fs.statSync(path.join(root, "archive/fujii-kaze-2026/images", file)).size > 1000);
}
assert.ok(fs.existsSync(path.join(root, "archive/fujii-kaze-2026/lyrics/Prema.lrc")));
console.log("PASS current documentation links, artist isolation and preserved source archive");
