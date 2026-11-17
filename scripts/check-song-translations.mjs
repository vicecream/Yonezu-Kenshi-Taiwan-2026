// Synthetic text validates alignment; no copyrighted song text is a fixture.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { applyTranslationAlignment, applyUserProvidedTranslation, importTranslations } from "./import-song-translations.mjs";

const song = { id: "Lemon", timingStatus: "preview", lyrics: [
  { jp: "Example first line", sourceTime: 1, time: 3, endTime: 5 },
  { jp: "Example second line", sourceTime: 4, time: 6 },
] };
const evidence = { id: song.id, sha256: "synthetic", pairs: [{ index: 0, translation: "第一句測試文字" }, { index: 1, translation: "第二句測試文字" }] };
const alignment = { id: song.id, sha256: evidence.sha256, lines: song.lyrics.map((line, index) => ({ index, jp: line.jp, time: line.sourceTime, tr: evidence.pairs[index].translation, sourcePairs: [index], method: "synthetic" })) };
const translated = applyTranslationAlignment(song, alignment, evidence);
assert.equal(translated.translationStatus, "ready");
assert.deepEqual(translated.lyrics.map(({ tr, translationRef, translationMapping, ...line }) => line), song.lyrics);
assert.equal(translated.timingStatus, "preview");
for (const field of ["jp", "time"]) {
  const changed = structuredClone(alignment);
  changed.lines[0][field] = field === "time" ? 99 : "Wrong original";
  assert.throws(() => applyTranslationAlignment(song, changed, evidence), /timeline changed/);
}
const invented = structuredClone(alignment);
invented.lines[0].tr = "內容不在提供來源";
assert.throws(() => applyTranslationAlignment(song, invented, evidence), /differs from the supplied PDF/);
const entry = { id: song.id, file: "synthetic.zh.txt", translationCredit: "Synthetic fixture source", translationCreditRole: "source", complete: false, entries: [alignment.lines[0]] };
const excerpt = applyUserProvidedTranslation(song, entry, "第一句測試文字");
assert.equal(excerpt.translationStatus, "partial");
assert.equal(excerpt.lyrics[1].tr, undefined, "Excerpts must not propagate to other rows");
assert.deepEqual(song.lyrics[0], { jp: "Example first line", sourceTime: 1, time: 3, endTime: 5 }, "Inputs remain immutable");
assert.throws(() => applyUserProvidedTranslation(song, { ...entry, complete: true }, "第一句測試文字"), /cover every subtitle row/);
assert.throws(() => applyUserProvidedTranslation(song, { ...entry, entries: [entry.entries[0], entry.entries[0]] }, "第一句測試文字"), /duplicate row/);
const before = await fs.readFile("src/song-lyrics.js", "utf8");
await importTranslations();
assert.equal(await fs.readFile("src/song-lyrics.js", "utf8"), before, "Preview must preserve real content");
console.log("PASS translation evidence, partial excerpts, immutable timelines and non-mutating preview.");
