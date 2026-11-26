// Source/clock audit only. This script cannot attest to hearing a performance.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { buildCatalog } from "./lib/timing-review-catalog.mjs";
import { csv, isTime, round, validateDraft } from "../tools/timing-review/model.js";

const work = path.resolve(process.env.YONEZU_AUDIO_WORK || "../.yonezu-karaoke-tools");
const base = "http://localhost:5175/";
const output = "artifacts/timing-review/video-audit";
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
function wavDuration(bytes) {
  assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
  assert.equal(bytes.toString("ascii", 8, 12), "WAVE");
  let rate = null, dataBytes = null;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const type = bytes.toString("ascii", offset, offset + 4), size = bytes.readUInt32LE(offset + 4);
    assert.ok(offset + 8 + size <= bytes.length, "Complete WAV chunks");
    if (type === "fmt ") { assert.ok(size >= 16); rate = bytes.readUInt32LE(offset + 16); }
    if (type === "data") dataBytes = size;
    offset += 8 + size + size % 2;
  }
  assert.ok(rate > 0 && dataBytes > 0);
  return dataBytes / rate;
}
const report = { format: "yonezu-review-video-audit-v1", listeningStatus: "unreviewed",
  method: "Per-song specified-video identity, original audio/WAV SHA-256, untrimmed clock, duration and current draft bounds; no new listening",
  songs: [] };
const rows = [];
for (const song of (await buildCatalog()).songs) {
  const directory = path.join(work, song.id);
  const origin = JSON.parse(await fs.readFile(path.join(directory, "source-origin.json"), "utf8"));
  const receipt = JSON.parse(await fs.readFile(path.join(directory, "separation.json"), "utf8"));
  const original = await fs.readFile(path.join(directory, "source.webm"));
  const audio = await fs.readFile(path.join(directory, "mix.wav"));
  const sourceHash = hash(original), audioHash = hash(audio), duration = wavDuration(audio);
  assert.equal(origin.youtubeId, song.youtubeId, `${song.id}: specified video`);
  assert.equal(origin.audioSha256, sourceHash);
  assert.equal(song.candidates.audioSha256, sourceHash);
  assert.equal(song.candidates.alignmentAudioSha256, audioHash);
  assert.equal(receipt.audioSha256, sourceHash);
  assert.equal(receipt.alignmentAudioSha256, audioHash);
  assert.equal(receipt.start, 0, `${song.id}: no trimmed intro`);
  assert.ok(Math.abs(duration - song.candidates.duration) < .001, `${song.id}: candidate clock duration`);
  const response = await fetch(`${base}api/song/${song.id}`);
  assert.ok(response.ok);
  const { draft } = await response.json();
  validateDraft(draft, song);
  const outsideMedia = [], missingEnds = [];
  for (const line of draft.lines) {
    if (line.start > duration || line.end > duration) outsideMedia.push(line.index + 1);
    if (!isTime(line.end)) missingEnds.push(line.index + 1);
    const candidate = song.candidates.lines.find(item => item.index === line.index);
    rows.push({ songId: song.id, title: song.title, line: line.index + 1, videoId: song.youtubeId,
      videoUrl: `https://www.youtube.com/watch?v=${song.youtubeId}&t=${Math.floor(line.start || 0)}s`,
      start: line.start, end: line.end, mediaDuration: round(duration),
      modelStart: candidate?.start ?? null, modelEnd: candidate?.end ?? null,
      modelStartDelta: isTime(candidate?.start) && isTime(line.start) ? round(candidate.start - line.start) : null,
      modelFlags: (candidate?.flags || []).join(";"), currentReview: line.review.status,
      listeningAudit: "not-performed" });
  }
  report.songs.push({ id: song.id, title: song.title, youtubeId: song.youtubeId,
    sourceAudioSha256: sourceHash, alignmentAudioSha256: audioHash, duration: round(duration),
    audioStartsAtVideoSecond: 0, existingOffsetSeconds: song.offsetSeconds,
    identityAndClock: "matched", newListening: "not-performed", lines: draft.lines.length,
    outsideMedia, missingEnds });
}
await fs.mkdir(output, { recursive: true });
await fs.writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
await fs.writeFile(path.join(output, "line-timing-audit.csv"), csv(rows));
console.log(`PASS ${report.songs.length} specified-video audio identities / ${rows.length} current lines; no new listening attestation.`);
console.log(JSON.stringify(report.songs.filter(song => song.outsideMedia.length || song.missingEnds.length)
  .map(({ id, outsideMedia, missingEnds }) => ({ id, outsideMedia, missingEnds }))));
