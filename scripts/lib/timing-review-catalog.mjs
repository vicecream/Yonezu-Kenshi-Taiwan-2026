import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import vm from "node:vm";
import { SONG_LYRICS } from "../../src/song-lyrics.js";
import { FURIGANA_CORRECTIONS } from "../../src/furigana-corrections.js";

export const root = new URL("../../", import.meta.url);
const hash = text => createHash("sha256").update(text).digest("hex");
const readingContext = { window: {} };
vm.runInNewContext(await fs.readFile(new URL("furigana.js", root), "utf8"), readingContext);
const decode = text => text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, key) => {
  if (key.startsWith("#")) return String.fromCodePoint(key[1].toLowerCase() === "x" ? parseInt(key.slice(2), 16) : Number(key.slice(1)));
  return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " }[key.toLowerCase()] || match;
});
function units(text) {
  const markup = FURIGANA_CORRECTIONS[text] || readingContext.window.JP_FURIGANA?.[text] || text;
  const output = [];
  const add = value => { for (const hit of decode(value.replace(/<[^>]*>/g, "")).matchAll(/[\p{Script=Latin}\p{N}]+(?:['’_-][\p{Script=Latin}\p{N}]+)*|[^\s\p{P}]/gu)) output.push({ text: hit[0], reading: hit[0] }); };
  let cursor = 0;
  for (const hit of markup.matchAll(/<ruby(?:\s[^>]*)?>(.*?)<rt(?:\s[^>]*)?>(.*?)<\/rt>\s*<\/ruby>/gu)) {
    add(markup.slice(cursor, hit.index));
    output.push({ text: decode(hit[1].replace(/<[^>]*>/g, "")), reading: decode(hit[2].replace(/<[^>]*>/g, "")) });
    cursor = hit.index + hit[0].length;
  }
  add(markup.slice(cursor));
  return output;
}
export async function buildCatalog({ includeCandidates = true } = {}) {
  const manifest = JSON.parse(await fs.readFile(new URL("lyrics/import-manifest.json", root), "utf8"));
  const songs = [];
  for (const song of SONG_LYRICS.filter(song => !song.hidden)) {
    const input = manifest.songs.find(entry => entry.id === song.id);
    const sourceSha256 = input ? hash(await fs.readFile(new URL(`lyrics/${input.file}`, root))) : null;
    const counts = new Map();
    song.lyrics.forEach(line => counts.set(line.jp, (counts.get(line.jp) || 0) + 1));
    const lines = song.lyrics.map((line, index) => ({
      index, lineId: `${song.id}:${index}:${line.sourceTime ?? "pending"}`,
      text: line.jp, translation: line.tr || "", sourceStart: line.sourceTime ?? null, sourceEnd: line.sourceEnd ?? null,
      baselineStart: line.time ?? null, baselineEnd: line.endTime ?? null,
      repeated: counts.get(line.jp) > 1, units: units(line.jp),
    }));
    const fingerprint = rows => hash(JSON.stringify({ youtubeId: song.youtubeId, sourceSha256, lines: rows }));
    const previousLines = input?.file.endsWith(".json") ? lines.map(line => ({ ...line, sourceEnd: null, baselineEnd: null })) : lines;
    let candidate = null;
    if (includeCandidates) {
      try {
        candidate = JSON.parse(await fs.readFile(new URL(`lyrics/timing-candidates/${song.id}.json`, root), "utf8"));
        if (candidate.sourceFingerprint !== fingerprint(lines) || candidate.youtubeId !== song.youtubeId || candidate.sourceSha256 !== sourceSha256) throw new Error(`${song.id}: automatic timing source changed; regenerate candidates`);
      } catch (error) { if (error.code !== "ENOENT") throw error; }
    }
    songs.push({ id: song.id, title: song.title, youtubeId: song.youtubeId, videoType: song.videoType,
      videoUrl: song.videoSourceUrl || null, sourceUrl: song.lyricsSourceUrl || null,
      sourceFile: input ? `lyrics/${input.file}` : null, sourceSha256,
      offsetSeconds: song.timingPreview?.offsetSeconds ?? song.timingAlignment?.offsetSeconds ?? 0,
      timingStatus: song.timingStatus, wordTimingStatus: candidate ? "automatic-candidate" : "pending", lines,
      sourceFingerprint: fingerprint(lines), previousFingerprint: fingerprint(previousLines),
      candidates: candidate,
    });
  }
  return { format: "yonezu-timing-catalog-v1", timeBasis: "目前指定影片的秒數；sourceStart/sourceEnd 為原始 LRC 秒數",
    status: "awaiting-listening", songCount: songs.length, lineCount: songs.reduce((sum, song) => sum + song.lines.length, 0),
    excluded: SONG_LYRICS.filter(song => song.hidden).map(song => ({ id: song.id, title: song.title, status: "hidden-pending-content" })), songs };
}
