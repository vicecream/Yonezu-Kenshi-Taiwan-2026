import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setDefaultResultOrder } from "node:dns";
import { SONG_LYRICS } from "../src/song-lyrics.js";
import { buildCatalog } from "./lib/timing-review-catalog.mjs";
import { createDraft, shiftLines, validateDraft, migrateDraft, timingSignature, lineIssues, tableRows, csv, clock, lrc, wordSegments, applyCandidate } from "../tools/timing-review/model.js";
import { startServer } from "../tools/timing-review/server.mjs";

setDefaultResultOrder("ipv4first");

const catalog = await buildCatalog({ includeCandidates: false });
assert.equal(catalog.songCount, 26);
assert.equal(catalog.lineCount, 1021);
assert.equal(catalog.songs.flatMap(song => song.lines).filter(line => line.sourceEnd !== null).length, 1020);
assert.equal(catalog.songs.find(song => song.id === "NineteenNinetyOne").lines.at(-1).sourceEnd, null, "Do not fabricate the final missing source end");
for (const song of catalog.songs) {
  const original = SONG_LYRICS.find(item => item.id === song.id);
  assert.ok(!original.hidden);
  assert.equal(song.lines.length, original.lyrics.length);
  const draft = createDraft(song);
  validateDraft(draft, song);
  for (const [index, line] of draft.lines.entries()) {
    assert.equal(line.text, original.lyrics[index].jp);
    assert.equal(line.translation, original.lyrics[index].tr || "");
    assert.equal(line.start, original.lyrics[index].time ?? null);
    assert.equal(line.end, original.lyrics[index].endTime ?? null);
    assert.ok(line.words.every(word => word.start === null && word.end === null));
    assert.equal(line.review.status, "pending");
    const flat = text => text.normalize("NFKC").replace(/[\p{P}\p{Z}\s]/gu, "");
    assert.equal(flat(line.words.map(word => word.text).join("")), flat(line.text), `${song.id}#${index}: complete units`);
    assert.equal(wordSegments(line)?.map(segment => segment.text).join(""), line.text, `${song.id}#${index}: preserve punctuation and spaces`);
  }
  assert.equal(tableRows(song).length, original.lyrics.length);
}
const song = catalog.songs.find(song => song.id === "Flamingo");
const draft = createDraft(song), baseline = structuredClone(draft);
assert.equal(draft.lines[0].sourceStart, 8.55);
assert.equal(draft.lines[0].start, 16.31);
assert.equal(tableRows(song)[0].deltaSeconds, 7.76);
const shifted = shiftLines(draft.lines, -.1);
assert.equal(shifted[0].start, 16.21);
assert.equal(shifted[0].sourceStart, 8.55);
assert.deepEqual(draft, baseline);
assert.throws(() => shiftLines(draft.lines, -10000), /負數/);
assert.deepEqual(draft, baseline, "Failed shifts are atomic");
assert.equal(clock(59.9996), "01:00.000");
assert.ok(csv([{ text: '=HYPERLINK("test")', note: "a,b\nc" }]).startsWith('\uFEFF"text","note"\r\n"\'=HYPERLINK'));
assert.ok(lrc(draft).includes("[00:16.310]"));
draft.lines[0].start = null;
assert.throws(() => lrc(draft), /缺漏/);
draft.lines = structuredClone(baseline.lines);
assert.ok(lineIssues(draft.lines[0], null, null, "word").includes("字詞時間待補"));
assert.throws(() => validateDraft({ ...draft, sourceFingerprint: "stale" }, song), /來源/);
draft.lines[0].text += "changed";
assert.throws(() => validateDraft(draft, song), /來源欄位/);
draft.lines = structuredClone(baseline.lines);
// Synthetic attestations stay in temporary storage and never touch real reviews.
assert.equal(draft.sourceReview, undefined, "Whole-song confirmation is not required");
draft.lines[0].end ??= draft.lines[1].start;
draft.lines[0].review = { status: "passed", note: "Synthetic fixture", level: "line", reviewer: "synthetic-test",
  reviewedAt: "2026-11-20T00:00:00.000Z", listened: true, timingSignature: timingSignature(draft.lines[0]) };
validateDraft(draft, song);
const oldSong = { ...song, sourceFingerprint: song.previousFingerprint, lines: song.lines.map(line => ({ ...line, sourceEnd: null, baselineEnd: null })) };
const legacy = createDraft(oldSong);
legacy.lines[0].start = 16.52; legacy.lines[0].end = 19.8; legacy.lines[0].review.note = "Keep a user's correction";
const migrated = migrateDraft(legacy, song);
assert.equal(migrated.lines[0].start, 16.52);
assert.equal(migrated.lines[0].end, 19.8);
assert.equal(migrated.lines[0].review.note, "Keep a user's correction");
assert.equal(migrated.lines[1].end, song.lines[1].baselineEnd);
assert.equal(legacy.lines[1].end, null, "Migration does not mutate the saved original");
const flaggedLine = structuredClone(baseline.lines[0]);
const flaggedCandidate = { index: 0, text: flaggedLine.text, usable: false, start: flaggedLine.start, end: Math.round((flaggedLine.start + flaggedLine.words.length * .1) * 1000) / 1000,
  words: flaggedLine.words.map((word, index) => ({ ...word, start: Math.round((flaggedLine.start + index * .1) * 1000) / 1000,
    end: Math.round((flaggedLine.start + (index + 1) * .1) * 1000) / 1000 })), flags: ["analysis-window-edge"] };
assert.equal(applyCandidate(flaggedLine, flaggedCandidate), false, "Flagged candidates are excluded from automatic prefill");
assert.equal(applyCandidate(flaggedLine, flaggedCandidate, null, null, { allowFlagged: true }), true, "Users can directly try complete flagged candidates");
assert.equal(flaggedLine.review.status, "pending");
assert.deepEqual(flaggedLine.candidateFlags, ["analysis-window-edge"]);
const originalStart = draft.lines[0].start;
draft.lines[0].start = originalStart + .01;
assert.throws(() => validateDraft(draft, song), /有效聽校/);
draft.lines[0].start = originalStart;
const revoked = shiftLines(draft.lines, .1);
assert.equal(revoked[0].review.status, "pending");
assert.equal(revoked[0].review.timingSignature, undefined);

const storage = await fs.mkdtemp(path.join(os.tmpdir(), "yonezu-timing-test-"));
const running = await startServer({ port: 0, storage });
try {
  const base = running.url;
  assert.equal((await fetch(base)).status, 200);
  assert.equal((await (await fetch(base + "api/catalog")).json()).lineCount, 1021);
  for (const route of ["archive/fujii-kaze-2026/src/song-lyrics.js", "sw.js", "api/song/HaruGaTomori", ".git/config"]) assert.equal((await fetch(base + route)).status, 404);
  assert.equal((await fetch(base + "api/catalog", { headers: { Origin: "https://example.com" } })).status, 403);
  const url = base + "api/song/Flamingo";
  const put = (value, revision = null) => fetch(url, { method: "PUT", headers: { "Content-Type": "application/json", Origin: base.slice(0, -1) }, body: JSON.stringify({ draft: value, revision }) });
  const first = await put(draft);
  assert.equal(first.status, 200, await first.clone().text());
  const revision = (await first.json()).revision;
  assert.equal((await put(draft)).status, 409, "Stale tabs cannot overwrite newer revisions");
  const saved = await (await fetch(url)).json();
  assert.deepEqual(saved.draft, draft);
  draft.lines[1].review.note = "Second revision";
  assert.equal((await put(draft, revision)).status, 200);
  assert.equal((JSON.parse(await fs.readFile(path.join(storage, "Flamingo.json.bak"), "utf8"))).revision, revision);
  const bad = { ...draft, sourceFingerprint: "changed" };
  assert.equal((await put(bad, revision)).status, 400);
  const lady = catalog.songs.find(song => song.id === "Lady");
  const oldLady = createDraft({ ...lady, sourceFingerprint: lady.previousFingerprint, lines: lady.lines.map(line => ({ ...line, sourceEnd: null, baselineEnd: null })) });
  oldLady.lines[0].start = 25.6; oldLady.lines[0].review.note = "Preserved manual note";
  await fs.writeFile(path.join(storage, "Lady.json"), JSON.stringify({ revision: "legacy-test", draft: oldLady }));
  const migratedResponse = await (await fetch(base + "api/song/Lady")).json();
  assert.equal(migratedResponse.migrated, true);
  assert.equal(migratedResponse.draft.lines[0].start, 25.6);
  assert.equal(migratedResponse.draft.lines[0].end, lady.lines[0].baselineEnd);
  const migratedSave = await fetch(base + "api/song/Lady", { method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ revision: "legacy-test", draft: migratedResponse.draft }) });
  assert.equal(migratedSave.status, 200);
  assert.equal(JSON.parse(await fs.readFile(path.join(storage, "before-end-recovery/Lady.legacy-test.json"), "utf8")).draft.sourceFingerprint, lady.previousFingerprint);
  console.log("PASS 26 songs / 1,021 lines; exact source mapping, pending words, offsets, missing times, signatures, CSV/LRC, local persistence, backups and revision conflicts");
} finally {
  await running.close();
  assert.ok(path.dirname(path.resolve(storage)) === path.resolve(os.tmpdir()) && path.basename(storage).startsWith("yonezu-timing-test-"), "Cleanup stays in the created temporary directory");
  await fs.rm(storage, { recursive: true, force: true });
}
