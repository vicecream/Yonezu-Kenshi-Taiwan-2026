// Local authoring tool, intentionally excluded from the Vite build and SW.
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { buildCatalog, root } from "../../scripts/lib/timing-review-catalog.mjs";
import { validateDraft, migrateDraft, lineIssues, applyAlignedWords } from "./model.js";
import { alignCurrentLine } from "./alignment.js";

async function readInput(req) {
  if (!req.headers["content-type"]?.startsWith("application/json")) throw Object.assign(new Error("JSON required"), { status: 415 });
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 4_000_000) throw Object.assign(new Error("資料超過上限。"), { status: 413 });
    chunks.push(chunk);
  }
  // Decode once: network chunks can split a Japanese UTF-8 character.
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function startServer({ port = Number(process.env.YONEZU_TIMING_PORT || 5175),
  storage = process.env.YONEZU_TIMING_STORAGE || fileURLToPath(new URL("../.yonezu-timing-review/", root)), includeCandidates = true,
  alignLine = alignCurrentLine } = {}) {
  const catalog = await buildCatalog({ includeCandidates });
  const queues = new Map();
  let activeAlignment = null;
  const json = (res, data, status = 200) => {
    if (res.destroyed || res.writableEnded) return;
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify(data));
  };
  const read = async id => {
    try { return JSON.parse(await fs.readFile(path.join(storage, `${id}.json`), "utf8")); }
    catch (error) { if (error.code === "ENOENT") return null; throw error; }
  };
  const handler = async (req, res) => {
    try {
      if (!/^(localhost|127\.0\.0\.1):\d+$/.test(req.headers.host || "")) return json(res, { error: "Local host only" }, 403);
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return json(res, { error: "Same-origin requests only" }, 403);
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (["GET", "HEAD"].includes(req.method) && req.headers.host.startsWith("127.0.0.1")) {
        res.writeHead(307, { Location: `http://localhost:${server.address().port}${url.pathname}${url.search}` });
        return res.end();
      }
      if (url.pathname === "/api/catalog" && req.method === "GET") return json(res, {
        ...catalog, reviewMode: "per-line", wordAlignmentMode: "current-line-audio", songs: catalog.songs.map(({ lines, candidates, ...song }) => ({ ...song, lineCount: lines.length,
          candidateLines: candidates?.lines?.length || 0 })), storage,
      });
      const match = /^\/api\/song\/([A-Za-z0-9]+)(\/align)?$/.exec(url.pathname);
      if (match) {
        const song = catalog.songs.find(song => song.id === match[1]);
        if (!song) return json(res, { error: "歌曲尚未開放或不存在。" }, 404);
        if (match[2]) {
          if (req.method !== "POST") return json(res, { error: "Method not allowed" }, 405);
          const input = await readInput(req);
          const record = await read(song.id);
          if (!record || record.revision !== input.revision) return json(res, { error: "草稿版本已變更，請重新載入後再對齊。" }, 409);
          const draft = migrateDraft(record.draft, song);
          const index = input.lineIndex;
          if (!Number.isInteger(index) || index < 0 || index >= draft.lines.length) throw new Error("句子不存在。");
          const line = draft.lines[index];
          if (lineIssues(line, draft.lines[index - 1], draft.lines[index + 1]).length) throw new Error("請先填妥本句起訖與順序，再重新對齊。");
          const identity = draft.mediaIdentity || draft.sourceReview?.mediaIdentity || "youtube";
          if (input.mediaIdentity !== identity) throw new Error("播放音訊已變更，請確認來源並儲存後再重新對齊。");
          if (identity !== "youtube" && !/^[a-f0-9]{64}$/.test(input.mediaSha256 || "")) throw new Error("請載入原本使用的音訊後再重新對齊，或切回 YouTube。");
          if (activeAlignment) return json(res, { error: "另一句正在重新對齊，請稍後再試。" }, 409);
          const controller = new AbortController();
          activeAlignment = controller;
          const disconnected = () => { if (!res.writableEnded) controller.abort(); };
          res.once("close", disconnected);
          try {
            const candidate = await alignLine(song, structuredClone(line), { signal: controller.signal, mediaSha256: input.mediaSha256 || null });
            if (controller.signal.aborted) return;
            const current = await read(song.id);
            if (current?.revision !== record.revision) return json(res, { error: "對齊期間草稿已變更，未套用結果；請重新載入後再試。" }, 409);
            if (!applyAlignedWords(structuredClone(line), candidate, draft.lines[index - 1], draft.lines[index + 1])) throw new Error("重新對齊未產生本句區段內的完整字詞時間，原有時間已保留。");
            return json(res, { candidate, revision: record.revision });
          } finally {
            res.off("close", disconnected);
            if (activeAlignment === controller) activeAlignment = null;
          }
        }
        if (req.method === "GET") {
          const record = await read(song.id);
          const draft = record ? migrateDraft(record.draft, song) : null;
          return json(res, { song, draft, migrated: record && record.draft.sourceFingerprint !== song.sourceFingerprint, revision: record?.revision || null });
        }
        if (req.method === "PUT") {
          const input = await readInput(req);
          validateDraft(input.draft, song);
          const pending = (queues.get(song.id) || Promise.resolve()).catch(() => {}).then(async () => {
            const current = await read(song.id);
            if ((current?.revision || null) !== input.revision) return json(res, { error: "另一個分頁已修改此曲。請先匯出目前 JSON 備份，再重新載入。" }, 409);
            if (current) migrateDraft(current.draft, song);
            await fs.mkdir(storage, { recursive: true });
            const revision = randomUUID();
            const target = path.join(storage, `${song.id}.json`);
            const temporary = path.join(storage, `${song.id}.${revision}.tmp`);
            if (current) await fs.copyFile(target, target + ".bak");
            if (current && current.draft.sourceFingerprint !== song.sourceFingerprint) {
              const history = path.join(storage, "before-end-recovery");
              await fs.mkdir(history, { recursive: true });
              await fs.copyFile(target, path.join(history, `${song.id}.${current.revision}.json`));
            }
            await fs.writeFile(temporary, JSON.stringify({ revision, draft: input.draft }, null, 2) + "\n");
            await fs.rename(temporary, target);
            json(res, { saved: true, revision });
          });
          queues.set(song.id, pending);
          await pending;
          return;
        }
        return json(res, { error: "Method not allowed" }, 405);
      }
      const files = { "/": ["index.html", "text/html"], "/app.js": ["app.js", "text/javascript"],
        "/model.js": ["model.js", "text/javascript"], "/style.css": ["style.css", "text/css"] };
      if (files[url.pathname] && ["GET", "HEAD"].includes(req.method)) {
        const [file, mime] = files[url.pathname];
        const content = await fs.readFile(new URL(file, import.meta.url));
        res.writeHead(200, { "Content-Type": mime + "; charset=utf-8", "Cache-Control": "no-store",
          "Referrer-Policy": "strict-origin-when-cross-origin", "X-Content-Type-Options": "nosniff" });
        res.end(req.method === "HEAD" ? undefined : content);
        return;
      }
      json(res, { error: "Not found" }, 404);
    } catch (error) { json(res, { error: error.code === "ENOENT" ? "本機對齊工具或指定影片原音尚未備妥，原有時間已保留。" : error.message }, error.status || 400); }
  };
  const server = http.createServer(handler);
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolve); });
  const ipv6 = http.createServer(handler);
  try {
    await new Promise((resolve, reject) => { ipv6.once("error", reject); ipv6.listen(server.address().port, "::1", resolve); });
  } catch (error) {
    if (!["EADDRNOTAVAIL", "EAFNOSUPPORT"].includes(error.code)) { await new Promise(resolve => server.close(resolve)); throw error; }
  }
  const close = () => {
    activeAlignment?.abort();
    return Promise.all([server, ipv6].filter(item => item.listening).map(item => new Promise(resolve => item.close(resolve))));
  };
  return { server, close, catalog, storage, url: `http://localhost:${server.address().port}/` };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const running = await startServer();
  console.log(`歌詞時間軸聽校：${running.url}`);
  console.log(`${running.catalog.songCount} 首 / ${running.catalog.lineCount} 句 · 修正資料：${running.storage}`);
}
