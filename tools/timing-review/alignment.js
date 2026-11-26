// Local, on-demand audio alignment. Original candidates and human drafts are read-only here.
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { root } from "../../scripts/lib/timing-review-catalog.mjs";
import { isTime, lineIssues, round, wordSegments } from "./model.js";

const run = promisify(execFile);
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const plain = value => value.normalize("NFKC").replace(/[\p{P}\p{Z}\s]/gu, "");
async function verifyLocalWhisper(tools) {
  // Whisper would otherwise download missing/corrupt weights even with HF offline flags.
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(path.join(tools, "models/whisper/medium.pt"))) digest.update(chunk);
  if (digest.digest("hex") !== "345ae4da62f9b3d59415adc60127b97c714f32e89e936602e85993674d08dcb1") throw new Error("本機 Whisper 模型不完整，未啟動分析。");
}
function groupedWords(line, raw) {
  let position = 0, sourceCursor = 0;
  const units = line.units.map(unit => {
    const start = position, sourceStart = line.text.indexOf(unit.text, sourceCursor);
    if (sourceStart < 0) throw new Error("讀音與原文無法完整對應。");
    sourceCursor = sourceStart + unit.text.length;
    position += plain(unit.text).length;
    return { ...unit, start, end: position, sourceStart, sourceEnd: sourceCursor };
  });
  position = 0;
  const words = raw.filter(word => plain(word.text).length).map(word => {
    const start = position;
    position += plain(word.text).length;
    return { ...word, from: start, to: position };
  });
  if (!words.length || plain(words.map(word => word.text).join("")) !== plain(line.text)
    || plain(units.map(unit => unit.text).join("")) !== plain(line.text)) throw new Error("模型未完整對應本句原文。");
  // Merge at shared boundaries. Never invent sub-word timings by dividing a model token.
  const wordEnds = new Set(words.map(word => word.to));
  const boundaries = [0, ...units.filter(unit => wordEnds.has(unit.end)).map(unit => unit.end)];
  return boundaries.slice(1).map((end, index) => {
    const start = boundaries[index];
    const group = units.filter(unit => unit.start >= start && unit.end <= end);
    const hits = words.filter(word => word.from >= start && word.to <= end);
    return { text: line.text.slice(group[0].sourceStart, group.at(-1).sourceEnd),
      reading: group.map(unit => unit.reading).join(""),
      start: round(Math.min(...hits.map(word => word.start))), end: round(Math.max(...hits.map(word => word.end))),
      score: Math.round(hits.reduce((sum, word) => sum + (word.score ?? 0), 0) / hits.length * 10000) / 10000 };
  });
}

export function candidateFromAlignment(song, line, raw, backend, runId) {
  if (raw.youtubeId !== song.youtubeId || raw.sourceFingerprint !== song.sourceFingerprint
    || raw.lrcSha256 !== song.sourceSha256 || raw.lines?.length !== 1) throw new Error("重新對齊的來源版本不符。");
  const result = raw.lines[0];
  if (result.index !== line.index || result.text !== line.text || result.windowStart !== line.start || result.windowEnd !== line.end) throw new Error("重新對齊區段與目前句子不符。");
  const words = groupedWords(line, result.words);
  const candidate = { index: line.index, text: line.text, start: line.start, end: line.end, words,
    flags: result.flags || [], status: "unreviewed", alignment: { backend, runId, generatedAt: new Date().toISOString(),
      rangeStart: line.start, rangeEnd: line.end, sourceFingerprint: song.sourceFingerprint,
      audioSha256: raw.audioSha256, alignmentAudioSha256: raw.alignmentAudioSha256, models: raw.models } };
  if (lineIssues({ ...line, words }, null, null, "word").length || !wordSegments({ ...line, words })) throw new Error("模型未產生完整且位於本句區段內的字詞時間。");
  return candidate;
}

export async function alignCurrentLine(song, line, { signal, mediaSha256 = null } = {}) {
  if (!isTime(line.start) || !isTime(line.end) || line.end <= line.start) throw new Error("請先填妥本句有效的開始與結束時間。");
  const tools = path.resolve(process.env.YONEZU_ALIGNMENT_TOOLS || fileURLToPath(new URL("../.karaoke-qa-tools/", root)));
  const work = path.resolve(process.env.YONEZU_AUDIO_WORK || fileURLToPath(new URL("../.yonezu-karaoke-tools/", root)), song.id);
  const python = process.env.YONEZU_ALIGNMENT_PYTHON || path.join(tools, process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
  const origin = JSON.parse(await fs.readFile(path.join(work, "source-origin.json"), "utf8"));
  const receipt = JSON.parse(await fs.readFile(path.join(work, "separation.json"), "utf8"));
  const originalHash = hash(await fs.readFile(path.join(work, "source.webm")));
  const wavHash = hash(await fs.readFile(path.join(work, "mix.wav")));
  const expected = song.candidates;
  if (origin.youtubeId !== song.youtubeId || origin.audioSha256 !== originalHash || expected?.audioSha256 !== originalHash
    || expected.alignmentAudioSha256 !== wavHash || receipt.audioSha256 !== originalHash
    || receipt.alignmentAudioSha256 !== wavHash || receipt.start !== 0) throw new Error("指定影片的本機原音不符，未執行重新對齊。");
  if (mediaSha256 && ![originalHash, wavHash].includes(mediaSha256)) throw new Error("目前載入的音訊與指定影片原音不符，請先切回 YouTube 或載入相同原音。");
  if (line.end > expected.duration) throw new Error("本句結束時間超出指定影片音訊長度。");
  const sourceFile = fileURLToPath(new URL(song.sourceFile, root));
  if (hash(await fs.readFile(sourceFile)) !== song.sourceSha256) throw new Error("來源歌詞已改變，請重新啟動校對服務。");
  const directory = await fs.mkdtemp(path.join(work, "line-realign-"));
  const runId = path.basename(directory);
  const job = { songId: song.id, youtubeId: song.youtubeId, sourceFingerprint: song.sourceFingerprint,
    lrcFile: sourceFile, lrcSha256: song.sourceSha256,
    lines: [{ ...line, windowStart: line.start, windowEnd: line.end,
      language: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(line.text) ? "ja" : "en", ctcUnits: line.units }] };
  await fs.writeFile(path.join(directory, "jobs.json"), JSON.stringify({ songs: [job] }, null, 2) + "\n");
  const preferred = expected.backend === "whisper" ? "whisper" : "ctc";
  for (const backend of [preferred, preferred === "ctc" ? "whisper" : "ctc"]) {
    try {
      signal?.throwIfAborted();
      if (backend === "whisper") await verifyLocalWhisper(tools);
      signal?.throwIfAborted();
      const output = path.join(directory, `${backend}.json`);
      const result = await run(python, [path.join(tools, "align.py"), song.id, path.join(work, "mix.wav"), output,
        "--jobs", path.join(directory, "jobs.json"), "--cache", path.join(tools, "models"), "--backend", backend],
      { windowsHide: true, signal, timeout: 180000, maxBuffer: 2_000_000,
        env: { ...process.env, HF_HUB_OFFLINE: "1", TRANSFORMERS_OFFLINE: "1", PYTHONUTF8: "1" } });
      await fs.writeFile(path.join(directory, `${backend}.log`), result.stdout + "\n" + result.stderr);
      const raw = JSON.parse(await fs.readFile(output, "utf8"));
      if (raw.audioSha256 !== originalHash || raw.alignmentAudioSha256 !== wavHash) throw new Error("分析音訊版本不符。");
      const candidate = candidateFromAlignment(song, line, raw, backend, runId);
      const mean = candidate.words.reduce((sum, word) => sum + word.score, 0) / candidate.words.length;
      if (mean < .15) throw new Error("模型信心不足。");
      await fs.writeFile(path.join(directory, "candidate.json"), JSON.stringify(candidate, null, 2) + "\n");
      return candidate;
    } catch (error) {
      if (signal?.aborted) throw error;
      await fs.writeFile(path.join(directory, `${backend}-error.log`), String(error.stack || error));
    }
  }
  throw new Error("本句未能產生完整字詞時間。請確認區段包含整句演唱後重試；原有時間已保留。");
}
