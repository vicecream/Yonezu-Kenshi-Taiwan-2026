// Build-time only: install the pinned tools outside the application dependencies.
// See docs/furigana.md. Preview by default; --write replaces furigana.js.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { SONG_LYRICS } from "../src/song-lyrics.js";

const [toolsDirectory, mode] = process.argv.slice(2);
assert.ok(toolsDirectory && (!mode || ["--write", "--check"].includes(mode)),
  "Usage: node scripts/generate-readings.mjs <tools-directory> [--write|--check]");
const require = createRequire(path.resolve(toolsDirectory, "package.json"));
assert.equal(require("kuroshiro/package.json").version, "1.2.0");
assert.equal(require("kuroshiro-analyzer-kuromoji/package.json").version, "1.1.0");
assert.equal(require("kuromoji/package.json").version, "0.1.2");
const Kuroshiro = require("kuroshiro").default;
const Analyzer = require("kuroshiro-analyzer-kuromoji");
const analyzer = new Analyzer();
await analyzer.init();
const { rules } = JSON.parse(await fs.readFile(new URL("../lyrics/readings/overrides.json", import.meta.url), "utf8"));
rules.sort((a, b) => b.text.length - a.text.length);
const usedRules = new Set();
const japanese = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}々]/u;
const escape = text => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function correctTokens(tokens, songId) {
  const corrected = [];
  for (let i = 0; i < tokens.length;) {
    let matched = false;
    for (const rule of rules) {
      if (rule.songs && !rule.songs.includes(songId)) continue;
      let source = "", end = i;
      while (end < tokens.length && source.length < rule.text.length) source += tokens[end++].surface_form;
      if (source !== rule.text) continue;
      assert.match(rule.reading, /^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u);
      const reading = Kuroshiro.Util.kanaToKatakana(rule.reading);
      corrected.push({ surface_form: source, reading, pronunciation: reading });
      usedRules.add(rule);
      i = end;
      matched = true;
      break;
    }
    if (!matched) corrected.push({ ...tokens[i++] });
  }
  return corrected;
}

const kana = {}, romaji = {};
let songs = 0, lines = 0;
for (const song of SONG_LYRICS) {
  if (song.language !== "ja" || !song.lyrics.length) continue;
  songs++;
  for (const line of song.lyrics) {
    const source = line.jp;
    assert.equal(typeof source, "string", `${song.id}: expected plain imported original`);
    const tokens = correctTokens(await analyzer.parse(source), song.id);
    assert.equal(tokens.map(token => token.surface_form).join(""), source, `${song.id}: tokenizer must preserve every character`);
    for (const token of tokens) {
      if (/[\p{Script=Han}々]/u.test(token.surface_form)) {
        assert.ok(token.reading && !/[\p{Script=Han}々]/u.test(token.reading), `${song.id}: add a reading override for ${token.surface_form}`);
      }
      token.surface_form = escape(token.surface_form);
    }
    const converter = new Kuroshiro();
    await converter.init({ init: async () => {}, parse: async () => structuredClone(tokens) });
    let markup = (await converter.convert(source, { to: "hiragana", mode: "furigana" })).replace(/<rp>.*?<\/rp>/g, "");
    for (const token of tokens.filter(token => /^\d+$/u.test(token.surface_form) && japanese.test(token.reading || ""))) {
      markup = markup.replace(token.surface_form, `<ruby>${token.surface_form}<rt>${Kuroshiro.Util.kanaToHiragna(token.reading)}</rt></ruby>`);
    }
    // Convert the same corrected readings; keep ordinary long vowels as ou/ei.
    // Pronunciation still supplies the topic/direction particles wa/e.
    const romanTokens = [];
    for (const token of tokens) {
      const value = token.pos === "助詞" ? token.pronunciation || token.reading : token.reading;
      const reading = value || token.surface_form;
      const previous = romanTokens.at(-1);
      // Dictionary boundaries can split っ/ゃ from the next/previous syllable.
      // Join those pieces before transliteration (なかっ + た => nakatta).
      if (previous && (/^[っッゃゅょャュョぁぃぅぇぉァィゥェォ]/u.test(reading)
          || /[っッ]$/u.test(previous)) && japanese.test(reading) && japanese.test(previous)) {
        romanTokens[romanTokens.length - 1] += reading;
      } else romanTokens.push(reading);
    }
    const roman = romanTokens.map(value => japanese.test(value)
      ? Kuroshiro.Util.kanaToRomaji(Kuroshiro.Util.kanaToKatakana(value), "hepburn").replace(/m(?=[bmp])/gu, "n")
      : value).join(" ")
      .replace(/&(amp|lt|gt|quot|#39);/g, (_, name) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" })[name])
      .replace(/・/gu, ".").replace(/\s+/gu, " ").replace(/\s+([,!?;:、。！？）」』])/gu, "$1")
      .replace(/([（「『])\s+/gu, "$1").replace(/([A-Za-z])\s+(['’])/gu, "$1$2").trim();
    assert.ok(!japanese.test(roman), `${song.id}: romaji must not contain Japanese: ${source}`);
    if (Object.hasOwn(kana, source)) {
      assert.equal(kana[source], markup, `${song.id}: conflicting shared-line kana`);
      assert.equal(romaji[source], roman, `${song.id}: conflicting shared-line romaji`);
    }
    kana[source] = markup;
    romaji[source] = roman;
    lines++;
  }
}
for (const rule of rules) assert.ok(usedRules.has(rule), `Unused override: ${rule.text}`);
const serialize = value => JSON.stringify(value, null, 2).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
const output = `// Generated from supplied originals with lexical corrections; see docs/furigana.md.\n// Rebuild with scripts/generate-readings.mjs; full-line overrides live in src/furigana-corrections.js.\nwindow.JP_FURIGANA = Object.freeze(${serialize(kana)});\nwindow.JP_ROMAJI = Object.freeze(${serialize(romaji)});\n`;
const target = new URL("../furigana.js", import.meta.url);
if (mode === "--write") await fs.writeFile(target, output, "utf8");
if (mode === "--check") assert.equal(await fs.readFile(target, "utf8"), output, "Regenerate furigana.js after changing originals or overrides");
console.log(`${songs} songs / ${lines} lines / ${Object.keys(kana).length} unique readings; ${mode === "--write" ? "written" : mode === "--check" ? "up to date" : "preview only (add --write to save)"}.`);
