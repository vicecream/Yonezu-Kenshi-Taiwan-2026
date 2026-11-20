// Verify supplied LRC coverage; --online checks public video metadata, not audio alignment.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { VISIBLE_SONGS, SONGS } from "../src/song-metadata.js";
import { SONG_LYRICS } from "../src/song-lyrics.js";
import { prepareSong } from "./import-song-lyrics.mjs";

const manifest = JSON.parse(await fs.readFile("lyrics/import-manifest.json", "utf8"));
const songs = [];
for (const song of VISIBLE_SONGS) {
  const entry = manifest.songs.find(entry => entry.id === song.id);
  assert.ok(entry, song.id + ": missing local input");
  const input = await fs.readFile("lyrics/" + entry.file, "utf8");
  const supplied = prepareSong(entry, input, song);
  const lrcFile = "lyrics/readable/" + song.id + ".lrc";
  const lrc = await fs.readFile(lrcFile, "utf8");
  const readable = prepareSong({ ...entry, file: song.id + ".lrc" }, lrc, song);
  const content = SONG_LYRICS.find(item => item.id === song.id);
  const identity = rows => rows.map(({ jp, sourceTime }) => ({ jp, sourceTime }));
  assert.deepEqual(identity(readable.lyrics), identity(supplied.lyrics), song.id + ": LRC differs from input");
  assert.deepEqual(identity(content.lyrics), identity(supplied.lyrics), song.id + ": app differs from input");
  songs.push({ id: song.id, title: song.title, lrcFile, sourceFile: "lyrics/" + entry.file,
    sha256: crypto.createHash("sha256").update(lrc).digest("hex"), lines: readable.lyrics.length,
    first: readable.lyrics[0].sourceTime, last: readable.lyrics.at(-1).sourceTime,
    youtubeId: song.youtubeId, timingStatus: content.timingStatus, sourceUrl: entry.sourceUrl });
}
if (process.argv.includes("--online")) {
  const queue = [...songs];
  await Promise.all(Array.from({ length: 3 }, async () => { while (queue.length) {
    const song = queue.shift();
    try {
      const response = await fetch("https://www.youtube.com/watch?v=" + song.youtubeId, { signal: AbortSignal.timeout(20000) });
      const html = await response.text();
      const match = html.match(/var ytInitialPlayerResponse = (\{.*?\});/);
      assert.ok(response.ok && match, "Video metadata unavailable: HTTP " + response.status);
      const player = JSON.parse(match[1]);
      const tracks = player.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
      song.videoMetadata = { status: player.playabilityStatus?.status,
        playableInEmbed: player.playabilityStatus?.playableInEmbed === true,
        title: player.videoDetails?.title, duration: Number(player.videoDetails?.lengthSeconds),
        captionLanguages: tracks.map(track => ({ language: track.languageCode, automatic: track.kind === "asr" })),
        lastAnchorWithinVideo: song.last <= Number(player.videoDetails?.lengthSeconds),
        audioAlignmentVerified: false };
    } catch (error) { song.videoMetadata = { error: error.message, audioAlignmentVerified: false }; }
    console.log(song.id + ": " + song.lines + " LRC rows; " + (song.videoMetadata.status || song.videoMetadata.error));
  }}));
}
const report = { checkedAt: new Date().toISOString(), timeZone: "Asia/Taipei", visibleSongs: songs.length,
  totalLines: songs.reduce((sum, song) => sum + song.lines, 0),
  limitation: "Public video metadata and LRC checks do not verify audible line timing. LRC preview remains explicitly uncalibrated.",
  hiddenSongs: SONGS.filter(song => song.hidden).map(song => ({ id: song.id, title: song.title, lrc: false, visible: false })), songs };
const output = process.env.YONEZU_LRC_AUDIT_OUTPUT || "artifacts/lrc-sync-2026-11-20/coverage.json";
await fs.mkdir(new URL("../artifacts/lrc-sync-2026-11-20/", import.meta.url), { recursive: true });
await fs.writeFile(output, JSON.stringify(report, null, 2) + "\n");
console.log(`PASS ${report.visibleSongs} visible songs / ${report.totalLines} exact LRC rows`);
