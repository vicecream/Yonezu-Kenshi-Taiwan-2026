// Resolve manually reviewed source selectors; this tool does not translate or infer repeats.
import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { SONG_LYRICS } from "../src/song-lyrics.js";

const sha256 = text => crypto.createHash("sha256").update(text).digest("hex");
const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
export function resolveSourceSelector(selector, lines) {
  const refs = [];
  const text = String(selector).split("+").map(part => {
    const match = part.match(/^(\d+)(?::(\d+):(\d*)|#(.*))?$/u);
    requireValue(match, `Invalid source selector: ${part}`);
    const index = Number(match[1]), line = lines[index];
    requireValue(typeof line === "string", `Missing Chinese body line: ${index}`);
    let start = 0, end = line.length;
    if (match[2] !== undefined) {
      const tokens = line.split("　");
      const from = Number(match[2]), to = match[3] === "" ? tokens.length : Number(match[3]);
      requireValue(from < to && to <= tokens.length, `Invalid token range: ${part}`);
      start = tokens.slice(0, from).join("　").length + (from ? 1 : 0);
      end = start + tokens.slice(from, to).join("　").length;
    } else if (match[4] !== undefined) {
      start = line.indexOf(match[4]);
      requireValue(start >= 0 && match[4].trim(), `Excerpt not found: ${part}`);
      end = start + match[4].length;
    }
    refs.push({ line: index, start, end });
    return line.slice(start, end);
  }).join("　");
  requireValue(text.trim(), `Empty source selector: ${selector}`);
  return { text, refs };
}

export async function prepareSuppliedTranslations({ write = false } = {}) {
  const directory = new URL("../lyrics/translations/", import.meta.url);
  const plan = JSON.parse(await fs.readFile(new URL("line-map.json", directory), "utf8"));
  const supplied = JSON.parse(await fs.readFile(new URL("user-supplied.json", directory), "utf8"));
  const retained = supplied.songs.filter(entry => !Object.hasOwn(plan.songs, entry.id));
  for (const entry of retained) {
    if (entry.id === "YellowGhost") for (const row of entry.entries.filter(row => [26,28].includes(row.index))) {
      row.partial = true;
      row.pendingReason = "括號內離れないでいて和聲未提供中文；只對齊已提供的主句。";
    }
  }
  const prepared = [];
  for (const [id, mapping] of Object.entries(plan.songs)) {
    const song = SONG_LYRICS.find(song => song.id === id);
    requireValue(song && mapping.rows.length === song.lyrics.length, `${id}: original row count changed`);
    const identity = JSON.stringify(song.lyrics.map(({ jp, sourceTime, time }) => ({ jp, sourceTime, time })));
    requireValue(sha256(identity) === mapping.originalSha256, `${id}: original text or timing changed; review alignment again`);
    requireValue(/^[\w.-]+\.txt$/.test(mapping.file), `${id}: invalid text filename`);
    const text = await fs.readFile(new URL(mapping.file, directory), "utf8");
    requireValue(sha256(text) === mapping.sourceSha256, `${id}: supplied text changed; review alignment again`);
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).map(line => line.trim()).filter(Boolean).slice(1);
    const partialRows = new Set(mapping.partialRows || []);
    requireValue([...partialRows].every(index => Number.isInteger(index) && mapping.rows[index] != null), `${id}: invalid partial row`);
    for (const group of mapping.reviewedRepeats || []) {
      requireValue(group.every(index => song.lyrics[index]?.jp === song.lyrics[group[0]]?.jp), `${id}: repeated originals differ; review instead of propagating`);
    }
    const entries = mapping.rows.flatMap((selector, index) => {
      if (selector === null) return [];
      const source = resolveSourceSelector(selector, lines);
      const original = song.lyrics[index];
      return [{ index, jp: original.jp,
        ...(original.time === undefined ? {} : { time: original.time }),
        tr: source.text, sourceRefs: source.refs,
        ...(partialRows.has(index) ? { partial: true, pendingReason: mapping.note } : {}),
      }];
    });
    const covered = lines.map(line => Array(line.length).fill(false));
    for (const row of entries) for (const ref of row.sourceRefs) for (let index = ref.start; index < ref.end; index++) covered[ref.line][index] = true;
    const unused = lines.flatMap((line, index) => {
      const text = line.split("").filter((character, offset) => !covered[index][offset] && !/[\s\p{P}\p{S}]/u.test(character)).join("");
      return text ? [{ line: index, text }] : [];
    });
    requireValue(JSON.stringify(unused) === JSON.stringify(mapping.unmappedSource || []), `${id}: unreviewed source fragments remain`);
    const complete = entries.length === song.lyrics.length && !partialRows.size;
    prepared.push({
      id, file: mapping.file, providedVia: "local-file", providedAt: "2026-11-20",
      translationCredit: "使用者提供（譯者未註明）", translationCreditRole: "source",
      usageBasis: "使用者提供專案內的本機繁體中文 TXT，並要求逐句對照整理及匯入；未推定外站譯者或重製授權。",
      scope: `已核對 ${entries.length}／${song.lyrics.length} 列；${mapping.note || "拆句、合句及重複段落依明確映射保留原稿措辭。"}`,
      complete, sha256: mapping.sourceSha256, alignmentFile: "line-map.json", entries,
    });
    console.log(`${id}: ${entries.length}/${song.lyrics.length} translated rows; ${partialRows.size} partial rows`);
  }
  const result = { songs: [...retained, ...prepared] };
  if (write) await fs.writeFile(new URL("user-supplied.json", directory), JSON.stringify(result, null, 2) + "\n", "utf8");
  else console.log("Preview only. Add --write to save the reviewed mappings.");
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  requireValue(args.length === 0 || (args.length === 1 && args[0] === "--write"), "Usage: node scripts/prepare-supplied-translations.mjs [--write]");
  prepareSuppliedTranslations({ write: args.includes("--write") }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
