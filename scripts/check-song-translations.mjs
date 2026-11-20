// Synthetic text validates alignment; no copyrighted song text is a fixture.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { applyTranslationAlignment, applyUserProvidedTranslation, importTranslations } from "./import-song-translations.mjs";
import { prepareSuppliedTranslations, resolveSourceSelector } from "./prepare-supplied-translations.mjs";
import { songCapabilities } from "../src/song-content.js";
import { SONG_LYRICS } from "../src/song-lyrics.js";

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
assert.throws(() => applyUserProvidedTranslation(song, { ...entry, entries: [{ ...entry.entries[0], tr: "???" }] }, "第一句測試文字"), /differs from the supplied excerpt/, "Encoding damage must not pass as an empty normalized match");
const partialEntry = { ...entry, entries: [{ ...alignment.lines[0], partial: true }, alignment.lines[1]] };
const partial = applyUserProvidedTranslation(song, partialEntry, "第一句測試文字\n第二句測試文字");
assert.equal(partial.translationStatus, "partial", "An untranslated backing phrase must keep the song partial even when every row has some Chinese");
assert.equal(songCapabilities(partial).translationComplete, false);
assert.throws(() => applyUserProvidedTranslation(song, { ...partialEntry, complete: true }, "第一句測試文字\n第二句測試文字"), /cover every subtitle row/);
assert.throws(() => applyUserProvidedTranslation(song, { ...entry, sha256: "changed" }, "第一句測試文字"), /supplied text changed/);
assert.equal(resolveSourceSelector("0:1:+1#third", ["first　second", "third fourth"]).text, "second　third");
assert.throws(() => resolveSourceSelector("0:2:3", ["first　second"]), /Invalid token range/);
assert.throws(() => resolveSourceSelector("0#invented", ["first"]), /Excerpt not found/);
const suppliedBefore = await fs.readFile("lyrics/translations/user-supplied.json", "utf8");
const reviewed = await prepareSuppliedTranslations();
assert.deepEqual(reviewed, JSON.parse(suppliedBefore), "Saved mappings must match the reviewed local source selectors");
assert.equal(await fs.readFile("lyrics/translations/user-supplied.json", "utf8"), suppliedBefore, "Preparation preview must preserve supplied mappings");
for (const entry of reviewed.songs) {
  const content = SONG_LYRICS.find(song => song.id === entry.id);
  const body = (await fs.readFile("lyrics/translations/" + entry.file, "utf8")).replace(/^\uFEFF/, "").split(/\r?\n/).map(line => line.trim()).filter(Boolean).slice(1);
  for (const row of entry.entries) {
    if (row.sourceRefs) assert.equal(row.sourceRefs.map(ref => body[ref.line].slice(ref.start, ref.end)).join("　"), row.tr, entry.id + ": exact source wording");
    assert.equal(Boolean(content.lyrics[row.index].translationPartial), row.partial === true, entry.id + ": backing-phrase completeness");
  }
}
const before = await fs.readFile("src/song-lyrics.js", "utf8");
await importTranslations();
assert.equal(await fs.readFile("src/song-lyrics.js", "utf8"), before, "Preview must preserve real content");
console.log("PASS translation evidence, partial excerpts, immutable timelines and non-mutating preview.");
