import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { buildCatalog } from "./lib/timing-review-catalog.mjs";
import { createDraft, lineIssues, wordSegments, validateDraft } from "../tools/timing-review/model.js";

const catalog = await buildCatalog();
const report = { format: "yonezu-candidate-validation-v1", listeningStatus: "unreviewed", songs: [], pending: [] };
for (const song of catalog.songs) {
  if (!song.candidates) { report.pending.push(song.id); continue; }
  const candidate = song.candidates;
  assert.equal(candidate.format, "yonezu-audio-timing-candidate-v1");
  assert.equal(candidate.songId, song.id);
  assert.equal(candidate.status, "unreviewed");
  assert.equal(candidate.lines.length, song.lines.length);
  assert.ok(candidate.duration > 0);
  for (const key of ["audioSha256", "alignmentAudioSha256", "sourceSha256", "helperScriptSha256"]) assert.match(candidate[key], /^[a-f0-9]{64}$/);
  for (const [index, line] of candidate.lines.entries()) {
    assert.equal(line.index, index);
    assert.equal(line.text, song.lines[index].text);
    assert.equal(line.status, "unreviewed");
    if (line.usable) {
      assert.deepEqual(lineIssues(line, null, null, "word"), [], `${song.id}#${index}: valid word bounds and full text`);
      assert.equal(wordSegments(line)?.map(segment => segment.text).join(""), line.text);
      assert.ok(line.end <= candidate.duration);
    }
  }
  const draft = createDraft(song);
  validateDraft(draft, song);
  assert.ok(draft.lines.every((line, index) => index === 0 || line.start >= draft.lines[index - 1].start), `${song.id}: initial starts must stay ordered`);
  assert.ok(draft.lines.every(line => line.review.status === "pending"));
  report.songs.push({ id: song.id, lines: song.lines.length, candidateLines: candidate.lines.filter(line => line.words.length).length,
    appliedLines: draft.lines.filter(line => line.candidateBasis).length, units: candidate.lines.reduce((sum, line) => sum + line.words.length, 0),
    flaggedLines: candidate.lines.filter(line => line.flags.length).length,
    sourceBeyondAudio: song.lines.filter(line => line.baselineStart >= candidate.duration || line.baselineEnd > candidate.duration).map(line => line.index + 1),
    backend: candidate.backend || "ctc", passedLines: 0 });
}
if (process.argv.includes("--complete")) assert.equal(report.pending.length, 0, `Missing candidates: ${report.pending.join(", ")}`);
report.complete = report.pending.length === 0;
await fs.writeFile("artifacts/timing-review/candidate-validation.json", JSON.stringify(report, null, 2) + "\n");
console.log(`PASS ${report.songs.length}/${catalog.songs.length} audio candidate files; ${report.songs.reduce((sum, song) => sum + song.units, 0)} units; all listening decisions pending.`);
