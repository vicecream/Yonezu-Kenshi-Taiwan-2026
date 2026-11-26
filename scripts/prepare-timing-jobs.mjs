import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { buildCatalog, root } from "./lib/timing-review-catalog.mjs";

const output = path.resolve(process.argv[2] || "../.yonezu-karaoke-tools");
const catalog = await buildCatalog({ includeCandidates: false });
const priority = ["Flamingo", "Lady", "SayonaraMataItsuka"];
const songs = catalog.songs.map(song => ({
  songId: song.id, title: song.title, youtubeId: song.youtubeId, sourceFingerprint: song.sourceFingerprint,
  lrcFile: fileURLToPath(new URL(song.sourceFile, root)), lrcSha256: song.sourceSha256,
  sourceFile: song.sourceFile, offsetSeconds: song.offsetSeconds, lineCount: song.lines.length,
  existingAudio: song.id === "Flamingo" ? path.join(os.tmpdir(), "yonezu-flamingo-sync/mv-audio.webm")
    : song.id === "SayonaraMataItsuka" ? path.join(os.tmpdir(), "yonezu-sayonara-sync/mv-audio.webm") : null,
  lines: song.lines.map(line => ({ index: line.index, lineId: line.lineId, text: line.text,
    sourceStart: line.sourceStart, sourceEnd: line.sourceEnd, baselineStart: line.baselineStart, baselineEnd: line.baselineEnd,
    windowStart: Math.max(0, (line.baselineStart ?? 0) - 1.2), windowEnd: line.baselineEnd === null ? null : line.baselineEnd + 1.2,
    language: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(line.text) ? "ja" : "en",
    repeated: line.repeated, ctcUnits: line.units,
  })),
})).sort((a, b) => (priority.indexOf(a.songId) < 0 ? 99 : priority.indexOf(a.songId)) - (priority.indexOf(b.songId) < 0 ? 99 : priority.indexOf(b.songId)));
await fs.mkdir(output, { recursive: true });
await fs.writeFile(path.join(output, "jobs.json"), JSON.stringify({ format: "karaoke-jobs-v1", songs }, null, 2) + "\n");
console.log(`${songs.length} audio alignment jobs: ${output}`);
