import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildCatalog } from "./lib/timing-review-catalog.mjs";
import { createDraft, csv, invalidate, isTime, lineIssues, tableRows, validateDraft, wordSegments } from "../tools/timing-review/model.js";

// Presentation holds for the current review drafts; never rewrite source/model timestamps.
export const GAP_LIMIT_SECONDS = 2;
export function extendLineGaps(draft, maxGapSeconds = GAP_LIMIT_SECONDS) {
  if (!Number.isFinite(maxGapSeconds) || maxGapSeconds <= 0) throw new Error("接續上限須為正秒數。");
  const updated = structuredClone(draft), changes = [], retained = [];
  for (let index = 0; index < updated.lines.length - 1; index++) {
    const line = updated.lines[index], next = updated.lines[index + 1];
    if (lineIssues(line).length || !isTime(next.start)) continue;
    const gapMs = Math.round(next.start * 1000) - Math.round(line.end * 1000);
    if (gapMs <= 0) continue; // Preserve overlaps, equal boundaries and missing ends.
    const gapSeconds = gapMs / 1000;
    if (gapMs > Math.round(maxGapSeconds * 1000)) {
      retained.push({ line: index + 1, end: line.end, nextStart: next.start, gapSeconds });
      continue;
    }
    const lastWord = !lineIssues(line, null, null, "word").length && wordSegments(line) ? line.words.at(-1) : null;
    changes.push({ songId: draft.songId, title: draft.title, line: index + 1,
      previousEnd: line.end, end: next.start, gapSeconds,
      lastWord: lastWord?.text ?? "", previousWordEnd: lastWord?.end ?? null, wordEnd: lastWord ? next.start : null,
      previousStatus: line.review.status });
    line.end = next.start;
    if (lastWord) lastWord.end = next.start;
    invalidate(line); // An extended boundary is a new draft, not a listening attestation.
  }
  return { draft: updated, changes, retained };
}

// Retract only identifiable automatic holds; later manual edits/reviews take priority.
export function retractLongGapExtensions(draft, previousChanges, maxGapSeconds = GAP_LIMIT_SECONDS) {
  if (!Number.isFinite(maxGapSeconds) || maxGapSeconds <= 0) throw new Error("接續上限須為正秒數。");
  const updated = structuredClone(draft), restored = [], conflicts = [];
  for (const change of previousChanges.filter(change => change.songId === draft.songId)) {
    const line = updated.lines[change.line - 1];
    if (!line || !isTime(change.previousEnd) || !isTime(change.end) || !isTime(line.start)) throw new Error("舊接續紀錄格式錯誤。");
    const next = updated.lines[change.line];
    if (!isTime(next?.start) || Math.round(next.start * 1000) - Math.round(change.previousEnd * 1000) <= Math.round(maxGapSeconds * 1000)) continue;
    if (line.end === change.previousEnd) continue; // Already restored.
    const conflict = reason => conflicts.push({ songId: draft.songId, line: change.line, reason });
    if (line.end !== change.end || line.review.status === "passed") { conflict("later-manual-end-or-review"); continue; }
    const proposed = structuredClone(line);
    proposed.end = change.previousEnd;
    if (change.wordEnd !== null) {
      const last = proposed.words.at(-1);
      if (!last || last.text !== change.lastWord || last.end !== change.wordEnd || !isTime(change.previousWordEnd)) {
        conflict("later-manual-word-change"); continue;
      }
      last.end = change.previousWordEnd;
    }
    if (proposed.end <= proposed.start || proposed.words.some(word => isTime(word.end) && word.end > proposed.end
      || isTime(word.start) && word.start >= proposed.end
      || isTime(word.start) && isTime(word.end) && word.end <= word.start)) {
      conflict("later-manual-timing-outside-original-end"); continue;
    }
    invalidate(proposed);
    updated.lines[change.line - 1] = proposed;
    restored.push({ ...change, retractedEnd: change.end, end: proposed.end,
      retractedWordEnd: change.wordEnd, wordEnd: change.wordEnd === null ? null : change.previousWordEnd });
  }
  return { draft: updated, restored, conflicts };
}

export async function extendReviewGaps({ base = "http://localhost:5175/", write = false,
  output = "artifacts/timing-review/gap-extension", maxGapSeconds = GAP_LIMIT_SECONDS, previousChanges = [] } = {}) {
  const url = new URL(base);
  if (url.protocol !== "http:" || url.hostname !== "localhost" || url.pathname !== "/") throw new Error("請使用本機校對服務的 http://localhost:<port>/ 網址。");
  const request = async (route, options) => {
    const response = await fetch(new URL(route, url), options);
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || `HTTP ${response.status}`);
    return value;
  };
  const catalog = await buildCatalog();
  const service = await request("api/catalog");
  const plans = [];
  // Prepare/validate every song before the first write; use the active service's revisions.
  for (const expected of catalog.songs) {
    const data = await request(`api/song/${expected.id}`);
    if (data.song.sourceFingerprint !== expected.sourceFingerprint) throw new Error(`${expected.id}: 校對服務來源已過期，請重新啟動。`);
    const before = data.draft || createDraft(data.song);
    validateDraft(before, expected);
    const retraction = retractLongGapExtensions(before, previousChanges, maxGapSeconds);
    const result = extendLineGaps(retraction.draft, maxGapSeconds);
    validateDraft(result.draft, expected);
    plans.push({ song: expected, revision: data.revision, existed: Boolean(data.draft),
      restored: retraction.restored, conflicts: retraction.conflicts, ...result });
  }
  const allChanges = plans.flatMap(plan => plan.changes);
  const allRestored = plans.flatMap(plan => plan.restored);
  const active = new Map();
  for (const plan of plans) for (const change of previousChanges.filter(change => change.songId === plan.song.id)) {
    const line = plan.draft.lines[change.line - 1], next = plan.draft.lines[change.line];
    const gapMs = isTime(next?.start) ? Math.round(next.start * 1000) - Math.round(change.previousEnd * 1000) : Infinity;
    if (line?.end === next?.start && gapMs > 0 && gapMs <= Math.round(maxGapSeconds * 1000)) {
      active.set(`${change.songId}:${change.line}`, { ...change, end: line.end, gapSeconds: gapMs / 1000 });
    }
  }
  for (const change of allChanges) active.set(`${change.songId}:${change.line}`, change);
  let backup = null;
  if (write) {
    backup = path.join(service.storage, "before-gap-extension", new Date().toISOString().replace(/[:.]/g, "-"));
    await fs.mkdir(backup, { recursive: true });
    // Keep the complete planned comparison even if a live edit interrupts the batch.
    await fs.writeFile(path.join(backup, "prepared-changes.csv"), csv(allChanges));
    await fs.writeFile(path.join(backup, "prepared-restored.csv"), csv(allRestored));
    await fs.writeFile(path.join(backup, "prepared-line-timing.csv"), csv(plans.flatMap(plan => tableRows(plan.song, plan.draft))));
    // Permanent copies supplement the service's rolling .bak file.
    for (const plan of plans.filter(plan => plan.existed)) {
      const original = await fs.readFile(path.join(service.storage, `${plan.song.id}.json`));
      if (JSON.parse(original).revision !== plan.revision) throw new Error(`${plan.song.id}: 草稿已由其他分頁變更，未覆寫，請重跑。`);
      await fs.writeFile(path.join(backup, `${plan.song.id}.json`), original);
    }
    for (const plan of plans) {
      if (plan.existed && !plan.changes.length && !plan.restored.length) continue;
      try {
        await request(`api/song/${plan.song.id}`, { method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draft: plan.draft, revision: plan.revision }) });
      } catch (error) {
        throw new Error(`${plan.song.id}: ${error.message} 本次調整對照保留於 ${backup}。`);
      }
    }
    // Verify the readback, including unchanged source fields, starts and word data.
    for (const plan of plans) {
      const saved = await request(`api/song/${plan.song.id}`);
      if (JSON.stringify(saved.draft) !== JSON.stringify(plan.draft)) throw new Error(`${plan.song.id}: 儲存後資料與本次調整不符。`);
    }
  }
  const report = { format: "yonezu-timing-gap-extension-v1", written: write, maxGapSeconds, backup,
    basis: "Existing review drafts, otherwise conservative initial drafts; no new listening verification",
    songCount: plans.length, lineCount: plans.reduce((sum, plan) => sum + plan.draft.lines.length, 0),
    extendedLines: allChanges.length, extendedLastWords: allChanges.filter(change => change.wordEnd !== null).length,
    restoredLongGapExtensions: allRestored.length,
    activeExtendedLines: active.size,
    preservedManualChanges: plans.flatMap(plan => plan.conflicts),
    revokedApprovals: allChanges.filter(change => change.previousStatus === "passed").length,
    songs: plans.map(plan => ({ id: plan.song.id, title: plan.song.title, lines: plan.draft.lines.length,
      usedSavedDraft: plan.existed, extendedLines: plan.changes.length,
      restoredLongGapExtensions: plan.restored.length,
      retainedLongGaps: plan.retained })) };
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await fs.writeFile(path.join(output, "changes.csv"), csv(allChanges));
  await fs.writeFile(path.join(output, "changes.json"), JSON.stringify(allChanges, null, 2) + "\n");
  await fs.writeFile(path.join(output, "restored.csv"), csv(allRestored));
  await fs.writeFile(path.join(output, "active-extensions.csv"), csv([...active.values()]));
  await fs.writeFile(path.join(output, "line-timing.csv"), csv(plans.flatMap(plan => tableRows(plan.song, plan.draft))));
  console.log(`${write ? "SAVED" : "PREVIEW"} ${report.songCount} songs / ${report.lineCount} lines; ${report.extendedLines} ends, ${report.extendedLastWords} last words; gaps > ${maxGapSeconds}s retained.`);
  if (allRestored.length) console.log(`Retracted ${allRestored.length} previous automatic extensions longer than ${maxGapSeconds}s.`);
  if (backup) console.log(`Backup: ${backup}`);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== "--write")) throw new Error("用法：node scripts/extend-timing-gaps.mjs [--write]；先啟動 npm.cmd run timing:review。");
  await extendReviewGaps({ write: args.includes("--write") });
}
