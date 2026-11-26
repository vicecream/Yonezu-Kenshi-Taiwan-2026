import fs from "node:fs/promises";
import path from "node:path";
import { buildCatalog } from "./lib/timing-review-catalog.mjs";
import { csv, createDraft, tableRows } from "../tools/timing-review/model.js";

const output = path.resolve(process.argv[2] || "artifacts/timing-review");
const catalog = await buildCatalog();
await fs.mkdir(output, { recursive: true });
await fs.writeFile(path.join(output, "catalog.json"), JSON.stringify(catalog, null, 2) + "\n");
await fs.writeFile(path.join(output, "line-timing.csv"), csv(catalog.songs.flatMap(song => tableRows(song))));
const words = catalog.songs.flatMap(song => createDraft(song).lines.flatMap(line => line.words.map((word, index) => ({
  songId: song.id, title: song.title, youtubeId: song.youtubeId, line: line.index + 1, unit: index + 1,
  text: word.text, reading: word.reading, start: word.start, end: word.end, score: word.score ?? null,
  status: line.candidateBasis ? "automatic-candidate" : "pending", flags: (line.candidateFlags || []).join(";"),
}))));
await fs.writeFile(path.join(output, "word-timing.csv"), csv(words));
const candidates = catalog.songs.flatMap(song => (song.candidates?.lines || []).flatMap(line => line.words.map((word, index) => ({
  songId: song.id, title: song.title, youtubeId: song.youtubeId, line: line.index + 1, unit: index + 1, text: word.text, reading: word.reading,
  start: word.start, end: word.end, score: word.score ?? null, status: "automatic-candidate", usable: line.usable, flags: line.flags.join(";"),
}))));
await fs.writeFile(path.join(output, "candidate-word-timing.csv"), csv(candidates));
if (catalog.songs.every(song => song.candidates)) {
  await fs.writeFile(path.join(output, "audio-alignment.json"), JSON.stringify({
    format: "yonezu-audio-alignment-report-v1", method: "Known-text alignment on specified-video original mixes; CTC, with Whisper comparison where recorded",
    songs: catalog.songs.map(song => ({ songId: song.id, youtubeId: song.youtubeId, state: "candidate-ready", lines: song.lines.length,
      usableLines: song.candidates.lines.filter(line => line.usable).length, words: song.candidates.lines.reduce((sum, line) => sum + line.words.length, 0),
      candidateFile: `lyrics/timing-candidates/${song.id}.json`, duration: song.candidates.duration, backend: song.candidates.backend || "ctc", listeningStatus: "unreviewed" })),
  }, null, 2) + "\n");
}
console.log(`${catalog.songCount} songs, ${catalog.lineCount} lines: ${output}`);
console.log(`${words.filter(word => word.start !== null).length}/${words.length} units have provisional audio timings. All listening decisions remain pending.`);
