// Shared by the local review page, exports and the server. No production imports.
export const FORMAT = "yonezu-timing-review-v1";
export const STATUS = { pending: "待聽校", "needs-fix": "待修", passed: "已聽校" };
export const round = value => Math.round(value * 1000) / 1000;
export const isTime = value => typeof value === "number" && Number.isFinite(value) && value >= 0;
export function clock(value) {
  if (!isTime(value)) return "待補";
  const ms = Math.round(value * 1000);
  return `${String(Math.floor(ms / 60000)).padStart(2, "0")}:${(ms % 60000 / 1000).toFixed(3).padStart(6, "0")}`;
}
export function createDraft(song, { useCandidates = true } = {}) {
  const draft = {
    format: FORMAT, songId: song.id, title: song.title, youtubeId: song.youtubeId,
    sourceFingerprint: song.sourceFingerprint, mediaIdentity: "youtube",
    lines: song.lines.map(line => ({ ...structuredClone(line), start: line.baselineStart, end: line.baselineEnd,
      words: line.units.map(unit => ({ ...unit, start: null, end: null })), review: { status: "pending", note: "" } })),
  };
  if (useCandidates) for (const [index, line] of draft.lines.entries()) applyCandidate(line,
    song.candidates?.lines?.find(candidate => candidate.index === line.index), draft.lines[index - 1], draft.lines[index + 1]);
  return draft;
}
export function applyCandidate(line, candidate, previous, next, { allowFlagged = false } = {}) {
  if (!candidate || (!candidate.usable && !allowFlagged) || candidate.text !== line.text || !Array.isArray(candidate.words)
    || candidate.words.some(word => typeof word.text !== "string" || typeof word.reading !== "string")
    || lineIssues({ ...line, start: candidate.start, end: candidate.end, words: candidate.words }, previous, next, "word").length) return false;
  line.start = candidate.start; line.end = candidate.end;
  line.words = structuredClone(candidate.words);
  line.candidateFlags = candidate.flags || [];
  line.candidateBasis = "automatic-audio-alignment; listening pending";
  invalidate(line);
  return true;
}
export function applyAlignedWords(line, candidate, previous, next) {
  if (!candidate || candidate.index !== line.index || candidate.text !== line.text
    || candidate.start !== line.start || candidate.end !== line.end || !Array.isArray(candidate.words)
    || candidate.words.some(word => typeof word.text !== "string" || typeof word.reading !== "string")
    || lineIssues({ ...line, words: candidate.words }, previous, next, "word").length
    || !wordSegments({ ...line, words: candidate.words })) return false;
  const approvedLine = line.review.status === "passed" && line.review.level === "line"
    && line.review.timingSignature === timingSignature(line);
  line.words = structuredClone(candidate.words);
  line.candidateFlags = candidate.flags || [];
  line.candidateBasis = "automatic-audio-alignment within current line bounds; word listening pending";
  line.wordAlignment = structuredClone(candidate.alignment || {});
  // A line-only attestation covers the unchanged bounds, never the new word timings.
  if (approvedLine) line.review.timingSignature = timingSignature(line);
  else invalidate(line);
  return true;
}
export function invalidate(line) {
  line.review = { status: "pending", note: line.review.note || "" };
}
export const timingSignature = line => JSON.stringify([line.start, line.end, line.words.map(word => [word.text, word.start, word.end])]);
export function wordSegments(line) {
  const segments = [];
  let cursor = 0;
  for (const [wordIndex, word] of line.words.entries()) {
    const start = line.text.indexOf(word.text, cursor);
    if (start < 0) return null;
    if (start > cursor) segments.push({ text: line.text.slice(cursor, start), wordIndex: null });
    segments.push({ text: word.text, wordIndex });
    cursor = start + word.text.length;
  }
  if (cursor < line.text.length) segments.push({ text: line.text.slice(cursor), wordIndex: null });
  return segments;
}
export function shiftLines(lines, delta) {
  if (!Number.isFinite(delta)) throw new Error("請填寫有效的偏移秒數。");
  const shifted = structuredClone(lines);
  for (const line of shifted) {
    for (const target of [line, ...line.words]) for (const key of ["start", "end"]) {
      if (target[key] === null) continue;
      const value = round(target[key] + delta);
      if (!isTime(value)) throw new Error("偏移後會出現負數時間，未套用這次調整。");
      target[key] = value;
    }
    invalidate(line);
  }
  return shifted;
}
const plain = value => String(value).normalize("NFKC").replace(/[\p{P}\p{Z}\s]/gu, "");
export function lineIssues(line, previous, next, level = "line") {
  const issues = [];
  if (!isTime(line.start)) issues.push("開始時間待補");
  if (!isTime(line.end)) issues.push("句尾時間待補");
  if (isTime(line.start) && isTime(line.end) && line.end <= line.start) issues.push("句尾須晚於開始");
  if (isTime(previous?.start) && isTime(line.start) && line.start < previous.start) issues.push("起點早於上一句");
  if (isTime(next?.start) && isTime(line.start) && line.start > next.start) issues.push("起點晚於下一句");
  if (level === "word") {
    if (!line.words.length || plain(line.words.map(word => word.text).join("")) !== plain(line.text)) issues.push("字詞未完整對應原文");
    let last = -Infinity;
    for (const word of line.words) {
      if (!isTime(word.start) || !isTime(word.end)) { issues.push("字詞時間待補"); break; }
      if (word.end <= word.start || word.start < last) { issues.push("字詞起訖或順序有誤"); break; }
      if (isTime(line.start) && isTime(line.end) && (word.start < line.start || word.end > line.end)) { issues.push("字詞超出本句起訖"); break; }
      last = word.start;
    }
  }
  return issues;
}
export function validateDraft(draft, song) {
  if (draft?.format !== FORMAT || draft.songId !== song.id || draft.youtubeId !== song.youtubeId
    || draft.sourceFingerprint !== song.sourceFingerprint) throw new Error("來源或影片版本已改變，請保留舊檔，重新建立校對資料。");
  if (!Array.isArray(draft.lines) || draft.lines.length !== song.lines.length) throw new Error("歌詞行數與來源不符。");
  for (const [index, line] of draft.lines.entries()) {
    const baseline = song.lines[index];
    for (const key of ["index", "lineId", "text", "translation", "sourceStart", "sourceEnd", "baselineStart", "baselineEnd"]) {
      if (line[key] !== baseline[key]) throw new Error(`第 ${index + 1} 句的來源欄位已改變。`);
    }
    if (!Array.isArray(line.words) || line.words.length > 1000) throw new Error("字詞資料格式錯誤。");
    for (const target of [line, ...line.words]) {
      if ([target.start, target.end].some(value => value !== null && !isTime(value))) throw new Error("時間須為非負秒數或 null。");
    }
    if (line.words.some(word => typeof word.text !== "string" || typeof word.reading !== "string")) throw new Error("字詞格式錯誤。");
    if (!Object.hasOwn(STATUS, line.review?.status) || typeof line.review.note !== "string") throw new Error("校對狀態格式錯誤。");
    if (line.review.status === "passed") {
      if (!line.review.reviewer?.trim() || !Number.isFinite(Date.parse(line.review.reviewedAt))
        || !["line", "word"].includes(line.review.level) || !line.review.listened || line.review.timingSignature !== timingSignature(line)
        || lineIssues(line, draft.lines[index - 1], draft.lines[index + 1], line.review.level).length) throw new Error(`第 ${index + 1} 句尚未完成有效聽校。`);
    }
  }
  return draft;
}
export function migrateDraft(draft, song) {
  if (draft.sourceFingerprint === song.sourceFingerprint) return validateDraft(draft, song);
  if (!song.sourceFile?.endsWith(".json") || draft.sourceFingerprint !== song.previousFingerprint) return validateDraft(draft, song);
  const previous = { ...song, sourceFingerprint: song.previousFingerprint,
    lines: song.lines.map(line => ({ ...line, sourceEnd: null, baselineEnd: null })) };
  validateDraft(draft, previous);
  const updated = structuredClone(draft);
  updated.sourceFingerprint = song.sourceFingerprint;
  for (const [index, line] of updated.lines.entries()) {
    const untouched = line.start === line.baselineStart && line.end === line.baselineEnd && line.words.every(word => word.start === null && word.end === null)
      && line.review.status === "pending" && !line.review.note;
    line.sourceEnd = song.lines[index].sourceEnd;
    line.baselineEnd = song.lines[index].baselineEnd;
    if (line.end === null && line.baselineEnd !== null) { line.end = line.baselineEnd; invalidate(line); }
    if (untouched) applyCandidate(line, song.candidates?.lines?.find(candidate => candidate.index === index), updated.lines[index - 1], updated.lines[index + 1]);
  }
  return validateDraft(updated, song);
}
export function tableRows(song, draft = createDraft(song)) {
  return draft.lines.map(line => ({ songId: song.id, title: song.title, youtubeId: song.youtubeId,
    line: line.index + 1, sourceStart: line.sourceStart, sourceEnd: line.sourceEnd,
    baselineStart: line.baselineStart, baselineEnd: line.baselineEnd, start: line.start, end: line.end,
    startClock: clock(line.start), endClock: clock(line.end),
    deltaSeconds: isTime(line.start) && isTime(line.sourceStart) ? round(line.start - line.sourceStart) : null,
    japanese: line.text, chinese: line.translation, status: line.review.status,
    level: line.review.level || "line", issues: lineIssues(line, draft.lines[line.index - 1], draft.lines[line.index + 1]).join("；"),
    timingBasis: line.candidateBasis || "supplied line timestamps", candidateFlags: (line.candidateFlags || []).join(";"),
    reviewer: line.review.reviewer || "", reviewedAt: line.review.reviewedAt || "", note: line.review.note,
  }));
}
export function csv(rows) {
  if (!rows.length) return "\uFEFF";
  // Spreadsheet applications must treat user-provided notes and lyrics as text.
  const cell = value => { let text = String(value ?? ""); if (/^[\s]*[=+@-]/u.test(text)) text = "'" + text; return `"${text.replaceAll('"', '""')}"`; };
  const keys = Object.keys(rows[0]);
  return "\uFEFF" + [keys.map(cell).join(","), ...rows.map(row => keys.map(key => cell(row[key])).join(","))].join("\r\n") + "\r\n";
}
export function lrc(draft) {
  if (draft.lines.some((line, index) => !isTime(line.start) || index > 0 && line.start < draft.lines[index - 1].start)) throw new Error("開始時間缺漏或順序有誤，請先修正再匯出 LRC。");
  return `[ti:${draft.title}]\n[ar:米津玄師]\n[re:本機聽校草稿；非正式同步認證]\n` + draft.lines.map(line => `[${clock(line.start)}]${line.text}`).join("\n") + "\n";
}
