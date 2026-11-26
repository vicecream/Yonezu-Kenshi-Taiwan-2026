// Reject clipped or unusually large corrections from automatic prefill.
// Keep every original model timestamp in the candidate file for listening review.
import fs from "node:fs/promises";
import { buildCatalog } from "./lib/timing-review-catalog.mjs";
const selected = process.argv.includes("--songs") ? process.argv.slice(process.argv.indexOf("--songs") + 1) : null;
const catalog = await buildCatalog({ includeCandidates: false });
let screened = 0, held = 0;
for (const song of catalog.songs) {
  if (selected && !selected.includes(song.id)) continue;
  const file = `lyrics/timing-candidates/${song.id}.json`;
  let candidate;
  try { candidate = JSON.parse(await fs.readFile(file, "utf8")); }
  catch (error) { if (error.code === "ENOENT") continue; throw error; }
  if (candidate.sourceFingerprint !== song.sourceFingerprint) throw new Error(`${song.id}: source changed`);
  for (const line of candidate.lines) {
    const source = song.lines[line.index];
    const flags = new Set(line.flags);
    if (line.words.length) {
      const from = Math.max(0, source.baselineStart - 1.2);
      const to = Math.min(candidate.duration, source.baselineEnd === null ? candidate.duration : source.baselineEnd + 1.2);
      if (line.start - from < .08 || to - line.end < .08) flags.add("analysis-window-edge");
      if (Math.abs(line.start - source.baselineStart) > .75) flags.add("large-start-change-listen");
      if (source.baselineEnd !== null && Math.abs(line.end - source.baselineEnd) > 1) flags.add("large-end-change-listen");
    }
    if (["analysis-window-edge", "large-start-change-listen", "large-end-change-listen"].some(flag => flags.has(flag))) {
      if (line.usable) held++;
      line.usable = false;
    }
    line.flags = [...flags].sort();
    screened++;
  }
  candidate.screening = "window-edge-80ms; start-delta-750ms; end-delta-1000ms; v1";
  const temporary = file + ".screening.tmp";
  await fs.writeFile(temporary, JSON.stringify(candidate, null, 2) + "\n");
  await fs.rename(temporary, file);
}
console.log(`Screened ${screened} lines; withheld ${held} additional boundary/large-delta candidates from automatic prefill.`);
