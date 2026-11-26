import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { SONG_LYRICS } from "../src/song-lyrics.js";
import { prepareSong } from "./import-song-lyrics.mjs";

const manifest = JSON.parse(await fs.readFile("lyrics/import-manifest.json", "utf8"));
const songs = [];
for (const entry of manifest.songs) {
  const current = SONG_LYRICS.find(song => song.id === entry.id);
  const raw = await fs.readFile(path.join("lyrics", entry.file), "utf8");
  const imported = prepareSong(entry, raw, current);
  assert.equal(imported.lyrics.length, current.lyrics.length, `${entry.id}: line count`);
  const ends = imported.lyrics.filter(line => Number.isFinite(line.sourceEnd));
  const explicitRows = entry.file.endsWith(".json") ? [...(JSON.parse(raw).lyricsfile || "").matchAll(/^- text:[^\n]*\n  start_ms: ([\d.]+)\n  end_ms: ([\d.]+)/gm)] : [];
  for (const hit of explicitRows) assert.ok(Number(hit[2]) > Number(hit[1]), `${entry.id}: explicit end follows start`);
  const changedEnds = [];
  for (const [index, line] of imported.lyrics.entries()) {
    const old = current.lyrics[index];
    assert.equal(line.jp, old.jp, `${entry.id}#${index}: unchanged original`);
    assert.equal(line.sourceTime, old.sourceTime, `${entry.id}#${index}: unchanged source start`);
    assert.equal(line.time, old.time, `${entry.id}#${index}: unchanged video start`);
    if (line.sourceEnd !== old.sourceEnd) changedEnds.push(index + 1);
    if (Number.isFinite(line.sourceEnd)) {
      assert.ok(line.sourceEnd > line.sourceTime);
      assert.equal(line.endTime, Math.round((line.sourceEnd + (entry.previewOffsetSeconds || 0)) * 1000) / 1000);
    }
  }
  songs.push({ id: entry.id, title: current.title, youtubeId: current.youtubeId, sourceFile: `lyrics/${entry.file}`,
    offsetSeconds: entry.previewOffsetSeconds || 0, lines: imported.lyrics.length, sourceEnds: ends.length,
    recoveredEndLines: changedEnds, missingEndLines: imported.lyrics.flatMap((line, index) => Number.isFinite(line.sourceEnd) ? [] : [index + 1]),
    sourceEndBasis: entry.file.endsWith(".json") ? "supplied lyricsfile end_ms" : "next explicit LRC timestamp; final missing end remains pending",
    videoAlignmentStatus: "preview; per-line listening pending",
  });
}
const report = { format: "yonezu-source-timing-audit-v1", songs: songs.length, lines: songs.reduce((sum, song) => sum + song.lines, 0),
  sourceEnds: songs.reduce((sum, song) => sum + song.sourceEnds, 0), recoveredEnds: songs.reduce((sum, song) => sum + song.recoveredEndLines.length, 0),
  unchangedOriginalsAndStarts: true, results: songs };
await fs.mkdir("artifacts/timing-review", { recursive: true });
await fs.writeFile("artifacts/timing-review/source-audit.json", JSON.stringify(report, null, 2) + "\n");
console.log(`${report.songs} songs / ${report.lines} lines: ${report.sourceEnds} supplied ends, ${report.recoveredEnds} ends to recover; originals and starts unchanged.`);
