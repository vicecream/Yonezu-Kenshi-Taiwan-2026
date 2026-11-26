import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { extendLineGaps, extendReviewGaps, retractLongGapExtensions, GAP_LIMIT_SECONDS } from "./extend-timing-gaps.mjs";
import { createDraft, timingSignature, validateDraft } from "../tools/timing-review/model.js";
import { startServer } from "../tools/timing-review/server.mjs";

const make = (start, end, words = []) => ({ text: "あい", start, end, words, review: { status: "pending", note: "Keep this note" } });
const original = { songId: "fixture", lines: [
  make(0, 1, [{ text: "あ", reading: "あ", start: 0, end: .5 }, { text: "い", reading: "い", start: .5, end: 1 }]),
  make(3, 4), make(6.001, 7), make(8, 10), make(9, null), make(11, 12),
] };
original.lines[0].review = { status: "passed", note: "Keep reviewer note", timingSignature: "old" };
const snapshot = structuredClone(original);
const fixed = extendLineGaps(original);
assert.deepEqual(original, snapshot, "Plan without mutating the input");
assert.equal(GAP_LIMIT_SECONDS, 2);
assert.equal(fixed.draft.lines[0].end, 3, "Include an exact two-second gap");
assert.equal(fixed.draft.lines[0].words.at(-1).end, 3, "Extend the final complete word");
assert.equal(fixed.draft.lines[0].words[0].end, .5, "Other words keep their original times");
assert.equal(fixed.draft.lines[0].review.status, "pending");
assert.equal(fixed.draft.lines[0].review.note, "Keep reviewer note");
assert.equal(fixed.draft.lines[0].review.timingSignature, undefined);
assert.equal(fixed.draft.lines[1].end, 4, "Preserve a 2.001-second gap");
assert.equal(fixed.draft.lines[2].end, 8);
assert.equal(fixed.draft.lines[3].end, 10, "Do not shorten overlaps");
assert.equal(fixed.draft.lines[4].end, null, "Do not fabricate missing ends");
assert.equal(fixed.draft.lines[5].end, 12, "No endpoint invented for the final line");
assert.equal(fixed.retained.length, 1);
assert.deepEqual(extendLineGaps(fixed.draft).changes, [], "Repeated runs are idempotent");
assert.deepEqual(fixed.draft.lines.map(line => line.start), original.lines.map(line => line.start));
assert.throws(() => extendLineGaps(original, -1));
const incomplete = { lines: [make(0, 1, [{ text: "あ", reading: "あ", start: null, end: null }]), make(2, 3)] };
assert.equal(extendLineGaps(incomplete).draft.lines[0].words[0].end, null, "Keep incomplete words pending");

const legacy = { songId: "fixture", lines: [make(0, 1, [{ text: "あ", reading: "あ", start: 0, end: .5 },
  { text: "い", reading: "い", start: .5, end: 1 }]), make(4, 5)] };
const old = extendLineGaps(legacy, 5);
const restored = retractLongGapExtensions(old.draft, old.changes);
assert.deepEqual(restored.draft, legacy, "Retract the old line/word hold without changing source data");
assert.equal(restored.restored.length, 1);
assert.equal(retractLongGapExtensions(restored.draft, old.changes).restored.length, 0, "Retraction is idempotent");
const edited = structuredClone(old.draft);
edited.lines[0].end = 3.9;
assert.deepEqual(retractLongGapExtensions(edited, old.changes).draft, edited, "Preserve later manual ends");
edited.lines[0].end = 4; edited.lines[0].words.at(-1).end = 3.8;
assert.deepEqual(retractLongGapExtensions(edited, old.changes).draft, edited, "Preserve later word changes");
edited.lines[0].words.at(-1).end = 4; edited.lines[0].review.status = "passed";
assert.equal(retractLongGapExtensions(edited, old.changes).conflicts[0].reason, "later-manual-end-or-review");

const storage = await fs.mkdtemp(path.join(os.tmpdir(), "yonezu-gap-test-"));
const output = path.join(storage, "exports");
const running = await startServer({ port: 0, storage });
try {
  const song = running.catalog.songs.find(song => song.id === "Flamingo");
  const draft = createDraft(song, { useCandidates: false });
  draft.lines[0].start += .1; // A user's corrected start must survive.
  draft.lines[0].review = { status: "passed", note: "Synthetic approval", level: "line", listened: true,
    reviewer: "synthetic-gap-test", reviewedAt: "2026-11-22T00:00:00.000Z", timingSignature: timingSignature(draft.lines[0]) };
  await fs.writeFile(path.join(storage, "Flamingo.json"), JSON.stringify({ revision: "synthetic-original", draft }, null, 2) + "\n");
  const payload = Buffer.from(JSON.stringify({ draft, revision: "synthetic-original" }));
  const split = payload.indexOf(Buffer.from("宵")) + 1;
  assert.ok(split > 1);
  const chunked = await new Promise((resolve, reject) => {
    const req = http.request(new URL("api/song/Flamingo", running.url), { method: "PUT",
      headers: { "Content-Type": "application/json" } }, res => {
      res.resume(); res.on("end", () => resolve(res.statusCode));
    });
    req.on("error", reject);
    req.write(payload.subarray(0, split));
    setTimeout(() => req.end(payload.subarray(split)), 20);
  });
  assert.equal(chunked, 200, "Save a Japanese UTF-8 character split across HTTP chunks");
  const saved = await fs.readFile(path.join(storage, "Flamingo.json"), "utf8");
  assert.deepEqual(JSON.parse(saved).draft, draft, "Chunked saves preserve every character");
  const preview = await extendReviewGaps({ base: running.url, output });
  assert.equal(preview.songCount, 26);
  assert.equal(preview.lineCount, 1021);
  assert.ok(preview.extendedLines > 300 && preview.extendedLines < 400);
  assert.equal(await fs.readFile(path.join(storage, "Flamingo.json"), "utf8"), saved, "Preview never writes drafts");
  assert.deepEqual((await fs.readdir(storage)).sort(), ["Flamingo.json", "Flamingo.json.bak", "exports"]);
  const report = await extendReviewGaps({ base: running.url, output, write: true });
  assert.equal(await fs.readFile(path.join(report.backup, "Flamingo.json"), "utf8"), saved, "Backup retains the exact approval and original bytes");
  for (const current of running.catalog.songs) {
    const record = JSON.parse(await fs.readFile(path.join(storage, `${current.id}.json`), "utf8"));
    validateDraft(record.draft, current);
    assert.equal(extendLineGaps(record.draft).changes.length, 0, `${current.id}: all eligible gaps closed`);
  }
  const updated = JSON.parse(await fs.readFile(path.join(storage, "Flamingo.json"), "utf8")).draft;
  assert.equal(updated.lines[0].start, draft.lines[0].start);
  assert.equal(updated.lines[0].sourceEnd, draft.lines[0].sourceEnd);
  assert.equal(updated.lines[0].end, updated.lines[1].start);
  assert.equal(updated.lines[0].review.note, "Synthetic approval");
  assert.equal(updated.lines[0].review.status, "pending");
  const fiveSecond = await extendReviewGaps({ base: running.url, output, maxGapSeconds: 5, write: true });
  const previousChanges = JSON.parse(await fs.readFile(path.join(output, "changes.json"), "utf8"));
  assert.ok(fiveSecond.extendedLines > 0);
  const tightened = await extendReviewGaps({ base: running.url, output, previousChanges, write: true });
  assert.equal(tightened.restoredLongGapExtensions, fiveSecond.extendedLines);
  assert.deepEqual(tightened.preservedManualChanges, []);
  for (const current of running.catalog.songs) {
    const savedDraft = JSON.parse(await fs.readFile(path.join(storage, `${current.id}.json`), "utf8")).draft;
    validateDraft(savedDraft, current);
    assert.equal(retractLongGapExtensions(savedDraft, previousChanges).restored.length, 0);
    assert.equal(extendLineGaps(savedDraft).changes.length, 0);
  }
  console.log("PASS gap thresholds, final words, missing data, overlaps, approvals, preview, exact backups and 26-song save/readback");
} finally {
  await running.close();
  assert.equal(path.dirname(path.resolve(storage)), path.resolve(os.tmpdir()));
  assert.ok(path.basename(storage).startsWith("yonezu-gap-test-"));
  await fs.rm(storage, { recursive: true, force: true });
}
