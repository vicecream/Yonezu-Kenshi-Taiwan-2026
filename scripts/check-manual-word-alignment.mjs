import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildCatalog } from "./lib/timing-review-catalog.mjs";
import { candidateFromAlignment } from "../tools/timing-review/alignment.js";
import { applyAlignedWords, createDraft, timingSignature, validateDraft, wordSegments } from "../tools/timing-review/model.js";
import { startServer } from "../tools/timing-review/server.mjs";

const song = (await buildCatalog()).songs.find(song => song.id === "Flamingo");
const draft = createDraft(song, { useCandidates: false });
const line = draft.lines[0];
line.start = 16.4; line.end = 20.2;
line.review = { status: "passed", note: "Synthetic fixture only", level: "line", reviewer: "synthetic-range-test",
  reviewedAt: "2026-11-22T00:00:00.000Z", listened: true, timingSignature: timingSignature(line) };
function fixtureCandidate(current) {
  const spans = [[.1, .6], [.6, 1], [1.8, 2.8], [2.8, 3.1]];
  return { index: current.index, text: current.text, start: current.start, end: current.end,
    words: current.units.map((unit, index) => ({ ...unit, start: current.start + spans[index][0], end: current.start + spans[index][1] })),
    flags: [], alignment: { backend: "synthetic-test", rangeStart: current.start, rangeEnd: current.end } };
}
const before = structuredClone(line), candidate = fixtureCandidate(line);
assert.ok(applyAlignedWords(line, candidate, null, draft.lines[1]));
assert.equal(line.start, before.start); assert.equal(line.end, before.end);
assert.equal(line.review.status, "passed"); assert.equal(line.review.level, "line");
assert.equal(line.review.reviewedAt, before.review.reviewedAt);
assert.equal(line.review.note, before.review.note);
validateDraft(draft, song);
for (const bad of [
  { ...candidate, start: song.lines[0].baselineStart },
  { ...candidate, words: candidate.words.slice(1) },
  { ...candidate, words: candidate.words.map((word, index) => index ? word : { ...word, start: line.start - .01 }) },
  { ...candidate, words: candidate.words.map((word, index) => index ? word : { ...word, end: line.end + .01 }) },
]) {
  const unchanged = structuredClone(line);
  assert.equal(applyAlignedWords(line, bad), false);
  assert.deepEqual(line, unchanged, "Invalid result cannot mutate a manual correction");
}
line.review.level = "word"; line.review.timingSignature = timingSignature(line);
assert.ok(applyAlignedWords(line, candidate));
assert.equal(line.review.status, "pending", "New words cannot inherit word approval");

const raw = { youtubeId: song.youtubeId, sourceFingerprint: song.sourceFingerprint, lrcSha256: song.sourceSha256,
  models: {}, lines: [{ index: line.index, text: line.text, windowStart: line.start, windowEnd: line.end,
    words: [{ text: line.text, start: line.start + .2, end: line.end - .1, score: .9 }], flags: [] }] };
const merged = candidateFromAlignment(song, line, raw, "fixture", "fixture");
assert.equal(merged.words.length, 1, "Do not divide a model phrase into invented per-character times");
assert.equal(merged.words[0].text, line.text, "Preserve internal spaces when model/reading units merge");
assert.equal(wordSegments({ ...line, words: merged.words }).map(part => part.text).join(""), line.text);
assert.throws(() => candidateFromAlignment(song, line, { ...raw, sourceFingerprint: "stale" }, "fixture", "fixture"));
assert.throws(() => candidateFromAlignment(song, line, { ...raw, lines: [{ ...raw.lines[0], windowEnd: 99 }] }, "fixture", "fixture"));

const storage = await fs.mkdtemp(path.join(os.tmpdir(), "yonezu-manual-range-"));
let mode = "success", calls = 0, released, announce;
let started = new Promise(resolve => { announce = resolve; });
const running = await startServer({ port: 0, storage, alignLine: async (currentSong, currentLine, { signal }) => {
  calls++;
  assert.equal(currentSong.id, song.id);
  assert.equal(currentLine.start, 16.4); assert.equal(currentLine.end, 20.2);
  if (mode === "defer") {
    announce();
    await new Promise((resolve, reject) => {
      released = resolve;
      signal.addEventListener("abort", () => reject(new DOMException("Cancelled", "AbortError")), { once: true });
    });
  }
  return fixtureCandidate(currentLine);
} });
try {
  const target = path.join(storage, "Flamingo.json");
  await fs.writeFile(target, JSON.stringify({ revision: "initial", draft }));
  const endpoint = running.url + "api/song/Flamingo";
  const post = (revision = "initial", lineIndex = 0, extra = {}, signal) => fetch(endpoint + "/align", {
    method: "POST", headers: { "Content-Type": "application/json" }, signal,
    body: JSON.stringify({ revision, lineIndex, mediaIdentity: "youtube", ...extra }) });
  assert.equal((await post("stale")).status, 409);
  assert.equal((await post("initial", 999)).status, 400);
  assert.equal((await post("initial", 0, { mediaIdentity: "other-audio" })).status, 400);
  assert.equal(calls, 0);
  const bytes = await fs.readFile(target, "utf8");
  const result = await post(); assert.equal(result.status, 200, await result.clone().text());
  const value = await result.json();
  assert.equal(value.candidate.start, 16.4); assert.equal(value.candidate.end, 20.2);
  assert.equal(await fs.readFile(target, "utf8"), bytes, "Analysis itself never overwrites a review");

  const invalid = structuredClone(draft); invalid.lines[0].end = null;
  await fs.writeFile(target, JSON.stringify({ revision: "missing-end", draft: invalid }));
  assert.equal((await post("missing-end")).status, 400);
  assert.equal(calls, 1, "Missing manual bounds cannot fall back to old candidate bounds");
  await fs.writeFile(target, bytes);

  mode = "defer";
  const pending = post(); await started;
  assert.equal((await post()).status, 409, "Only one audio model job at a time");
  draft.lines[1].review.note = "A newer correction from another tab";
  const saved = await fetch(endpoint, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draft, revision: "initial" }) });
  assert.equal(saved.status, 200); const revision = (await saved.json()).revision;
  released(); assert.equal((await pending).status, 409, "Do not return stale results after another tab saves");
  const newer = await fs.readFile(target, "utf8");

  started = new Promise(resolve => { announce = resolve; });
  const abort = new AbortController();
  const cancelled = post(revision, 0, {}, abort.signal).catch(error => error);
  await started; abort.abort(); await cancelled;
  for (let attempt = 0; attempt < 20; attempt++) {
    mode = "success";
    const retry = await post(revision);
    if (retry.status === 200) break;
    assert.equal(retry.status, 409);
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.ok(attempt < 19, "Cancelled model job must release its slot");
  }
  assert.equal(await fs.readFile(target, "utf8"), newer);
  console.log("PASS exact manual bounds, original text/grouping, line-only approvals, word revocation, stale revisions, cancellation and read-only analysis");
} finally {
  await running.close();
  assert.equal(path.dirname(storage), os.tmpdir()); assert.ok(path.basename(storage).startsWith("yonezu-manual-range-"));
  await fs.rm(storage, { recursive: true, force: true });
}

if (process.argv.includes("--audio")) {
  const current = { ...song.lines[0], start: 16.31, end: 20.57 };
  const audioStorage = await fs.mkdtemp(path.join(os.tmpdir(), "yonezu-range-audio-"));
  const audioServer = await startServer({ port: 0, storage: audioStorage });
  let candidate;
  try {
    const audioDraft = createDraft(song, { useCandidates: false });
    audioDraft.lines[0].start = current.start; audioDraft.lines[0].end = current.end;
    const originalRecord = JSON.stringify({ revision: "actual-audio-test", draft: audioDraft });
    await fs.writeFile(path.join(audioStorage, "Flamingo.json"), originalRecord);
    const response = await fetch(audioServer.url + "api/song/Flamingo/align", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision: "actual-audio-test", lineIndex: 0, mediaIdentity: "youtube" }) });
    assert.equal(response.status, 200, await response.clone().text());
    candidate = (await response.json()).candidate;
    assert.equal(await fs.readFile(path.join(audioStorage, "Flamingo.json"), "utf8"), originalRecord, "Real audio analysis leaves the saved manual bounds untouched");
  } finally {
    await audioServer.close();
    assert.equal(path.dirname(audioStorage), os.tmpdir()); assert.ok(path.basename(audioStorage).startsWith("yonezu-range-audio-"));
    await fs.rm(audioStorage, { recursive: true, force: true });
  }
  assert.equal(candidate.start, current.start); assert.equal(candidate.end, current.end);
  assert.ok(candidate.words.every(word => word.start >= current.start && word.end <= current.end));
  const output = "artifacts/timing-review/qa-manual-alignment";
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(output + "/actual-audio.json", JSON.stringify({ method: "Real specified-video audio within exact current bounds; not human listening",
    songId: song.id, originalBaseline: [current.baselineStart, current.baselineEnd], manualBounds: [current.start, current.end], candidate }, null, 2) + "\n");
  console.log(`PASS actual ${song.id} audio reanalysis: ${candidate.words.length} units; manual ${candidate.start}–${candidate.end}s unchanged; listening pending`);
}
