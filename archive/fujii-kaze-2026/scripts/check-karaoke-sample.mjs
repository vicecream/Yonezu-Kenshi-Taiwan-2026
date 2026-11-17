import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import vm from "node:vm";
import { SONG_LYRICS } from "../src/song-lyrics.js";
import { SONGS } from "../src/song-metadata.js";
import { FURIGANA_CORRECTIONS } from "../src/furigana-corrections.js";

const input = new URL("../lyrics/word-timing/its-alright-sample.json", import.meta.url);
const sample = JSON.parse(readFileSync(input, "utf8"));
const original = new URL("../lyrics/It's Alright.lrc", import.meta.url);
assert.equal(sample.lrcSha256, createHash("sha256").update(readFileSync(original)).digest("hex"), "Sample must match the current user-supplied LRC");
assert.equal(sample.youtubeId, SONGS.find(song => song.id === "ItsAlright").youtubeId, "Sample must use the site's current video");
assert.equal(sample.status, "experimental-unreviewed", "Automatic timing must remain explicitly unreviewed");
assert(sample.clip.end - sample.clip.start >= 30 && sample.clip.end - sample.clip.start <= 60, "Trial must be a 30–60 second excerpt");
assert.equal(sample.lines.length, 11);
assert.equal(sample.lines.filter(line => line.language === "ja").length, 4);
assert.equal(sample.lines.filter(line => line.language === "en").length, 7);
const song = SONG_LYRICS.find(song => song.id === sample.songId);
const normalize = value => value.normalize("NFKC").toLowerCase().replace(/[\p{P}\p{Z}\s]/gu, "");
const context = { window: {} };
vm.runInNewContext(readFileSync(new URL("../karaoke-sources.js", import.meta.url), "utf8"), context);
let total = 0;
let previous = sample.clip.start;
for (const line of sample.lines) {
  const source = song.lyrics.find(row => Math.abs(row.sourceTime - line.sourceStart) < 0.005);
  assert(source, "Every trial row must map to an existing LRC row");
  assert.equal(line.text, source.jp, "Keep the user-supplied lyric text intact");
  assert.equal(normalize(line.words.map(word => word.text).join("")), normalize(line.text), "Every sung character must have a source timing unit");
  assert(line.start >= previous - 0.001, "Lines must not overlap or reverse");
  assert(line.start >= sample.clip.start && line.end <= sample.clip.end);
  let end = line.start;
  for (const word of line.words) {
    assert(Number.isFinite(word.start) && Number.isFinite(word.end) && word.end > word.start);
    assert(word.start >= end - 0.001 && word.end <= line.windowEnd + 0.001, "Words must stay ordered and inside their LRC window");
    assert(Number.isFinite(word.score) && word.score >= 0 && word.score <= 1);
    end = word.end;
    total++;
  }
  previous = line.end;
  const markup = FURIGANA_CORRECTIONS[line.text] || line.text;
  const bases = markup.replace(/<rt>.*?<\/rt>/gu, "").replace(/<[^>]+>/gu, "");
  const units = [...bases.matchAll(/[A-Za-z]+(?:['’][A-Za-z]+)?|\S/gu)].map(hit => hit[0]);
  const mapping = context.window.KARAOKE_SOURCES.mapUnitsToWords(units, line.words);
  assert.equal(mapping.matched, mapping.total, "Existing karaoke text mapper must cover all displayed units");
}
console.log(`Karaoke sample: 11 lines, JA 4 / EN 7, ${total} timed units; text, video, source hash, order, bounds and renderer mapping pass.`);
console.log("These checks verify data integrity, not auditory timing accuracy.");
