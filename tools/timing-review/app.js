import { STATUS, clock, round, isTime, createDraft, invalidate, shiftLines, lineIssues,
  validateDraft, migrateDraft, tableRows, csv, lrc, timingSignature, wordSegments, applyAlignedWords } from "/model.js";

const $ = selector => document.querySelector(selector);
const escape = text => String(text ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
let catalog, song, draft, selected = 0, saving = Promise.resolve(), saveFailure = null, pendingSaves = 0;
const revisions = new Map();
let alignmentTask = null;
let player = null, playerReady = false, apiPromise = null, playerEpoch = 0, playerTimer;
let mediaMode = "youtube", mediaIdentity = "youtube", audioUrl = null, stopAt = null, previewIndex = -1;
const audio = $("#audio");
const row = () => draft.lines[selected];
const feedback = message => { $("#feedback").textContent = message; };
const action = fn => async (...args) => { try { await fn(...args); } catch (error) { feedback(error.message); } };
function invalidateMediaReview() {
  if (!draft) return;
  draft.lines.filter(line => line.review.status === "passed" && (line.review.mediaIdentity || draft.mediaIdentity || draft.sourceReview?.mediaIdentity || "youtube") !== mediaIdentity).forEach(invalidate);
  draft.mediaIdentity = mediaIdentity;
  $("#listened").checked = false;
  renderList(); renderIssues(); renderPreview(selected); save();
}
async function request(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}
function save() {
  const snapshot = structuredClone(draft), currentSong = song;
  pendingSaves++;
  $("#save-status").textContent = "正在儲存修正…";
  saving = saving.catch(() => {}).then(async () => {
    validateDraft(snapshot, currentSong);
    const result = await request(`/api/song/${currentSong.id}`, { method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft: snapshot, revision: revisions.get(currentSong.id) || null }) });
    revisions.set(currentSong.id, result.revision);
    saveFailure = null;
  }).catch(error => {
    saveFailure = error;
    feedback(error.message);
  }).finally(() => {
    pendingSaves--;
    $("#save-status").textContent = pendingSaves ? "正在儲存修正…" : saveFailure ? "儲存失敗，請先匯出 JSON 備份" : "修正已自動儲存到本機";
  });
  return saving;
}
async function flush() { await saving; if (saveFailure) throw saveFailure; }
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  feedback(`已匯出 ${name}`);
}
function resetMedia() {
  cancelAlignment();
  stopAt = null; playerEpoch++; clearTimeout(playerTimer);
  if (player) { try { player.destroy(); } catch {} }
  player = null; playerReady = false; audio.pause(); audio.removeAttribute("src"); audio.load();
  if (audioUrl) URL.revokeObjectURL(audioUrl);
  audioUrl = null; mediaMode = "youtube"; mediaIdentity = "youtube";
  $("#audio-file").value = ""; audio.hidden = true; $("#use-youtube").hidden = true;
  $("#youtube-shell").hidden = false; $("#retry-video").hidden = true;
  if (!$("#youtube-player")) $("#youtube-shell").insertAdjacentHTML("afterbegin", '<div id="youtube-player"></div>');
  $("#video-placeholder").hidden = false;
  $("#connect-video").disabled = !song?.youtubeId;
  $("#media-status").textContent = "影片需要網路；也可載入與指定影片相同版本的音訊。";
}
async function loadSong(id) {
  cancelAlignment();
  await flush();
  $("#workspace").inert = true; $("#song").disabled = true;
  try {
    const data = await request(`/api/song/${id}`);
    resetMedia();
    song = data.song; draft = data.draft || createDraft(song); selected = 0;
    revisions.set(id, data.revision); $("#song").value = id;
    history.replaceState(null, "", `#${id}`);
    $("#song-title").textContent = song.title;
    $("#video-kind").textContent = song.videoType === "official-audio" ? "官方音源" : song.youtubeId ? "官方 MV" : "完整影片待補";
    $("#song-stats").textContent = `${song.lines.length} 句 · 初始偏移 ${song.offsetSeconds >= 0 ? "+" : ""}${song.offsetSeconds} 秒 · 影片逐句精校待確認`;
    $("#video-link").href = song.videoUrl || song.sourceUrl || "#";
    $("#source-info").textContent = `影片 ID：${song.youtubeId || "待補"} · 歌詞檔：${song.sourceFile || "待補"}`;
    $("#offset").value = "0"; $("#search").value = ""; $("#filter").value = "all";
    if (draft.mediaIdentity && draft.mediaIdentity !== "youtube") {
      $("#media-status").textContent = "此曲先前使用本機音訊；可載入同一檔案接續。";
    }
    const candidates = song.candidates?.lines || [];
    $("#candidate-info").textContent = `${song.lines.filter(line => isTime(line.baselineEnd)).length} / ${song.lines.length} 句已有來源句尾。${candidates.length ? `音訊對齊候選 ${candidates.length} 句，其中 ${candidates.filter(line => line.usable).length} 句符合自動預填條件。` : "字詞音訊對齊尚待處理。"} 可依目前修正起訖重新對齊字詞，新字詞仍需聽校。`;
    renderEditor();
    $("#workspace").hidden = false;
    $("#save-status").textContent = data.migrated ? "已保留既有修正並補齊來源句尾；下次修改時保存" : data.draft ? "已載入本機修正" : "初始資料已載入，尚未聽校";
    $("#connect-video").disabled = !song.youtubeId;
  } finally { $("#workspace").inert = false; $("#song").disabled = false; }
}
function renderList() {
  const query = $("#search").value.trim().toLowerCase(), filter = $("#filter").value;
  let count = 0;
  $("#lines").innerHTML = draft.lines.map((line, index) => {
    if (query && !`${index + 1} ${line.text} ${line.translation}`.toLowerCase().includes(query)) return "";
    const issues = lineIssues(line, draft.lines[index - 1], draft.lines[index + 1]);
    if (filter === "issues" ? !issues.length : filter !== "all" && line.review.status !== filter) return "";
    count++;
    return `<li><button data-line="${index}" class="${index === selected ? "selected " : ""}${line.review.status}" aria-current="${index === selected ? "true" : "false"}"><span class="line-number">${index + 1}</span><span lang="ja">${escape(line.text)}</span><span class="line-time">${clock(line.start)} · ${STATUS[line.review.status]}${line.review.level === "word" ? "（字詞）" : ""}${!isTime(line.end) ? " · 句尾待補" : ""}</span></button></li>`;
  }).join("");
  $("#empty-list").hidden = count > 0;
  $("#lines").querySelectorAll("button").forEach(button => button.onclick = () => selectLine(Number(button.dataset.line)));
  $("#progress").textContent = `${draft.lines.filter(line => line.review.status === "passed").length} / ${draft.lines.length} 已聽校`;
}
function selectLine(index) {
  cancelAlignment();
  selected = Math.max(0, Math.min(draft.lines.length - 1, index)); stopAt = null;
  renderEditor();
}
function renderEditor() {
  const line = row();
  renderList();
  $("#line-title").textContent = `第 ${selected + 1} 句`;
  $("#line-jp").textContent = line.text;
  $("#line-tr").textContent = line.translation || "中文待補";
  $("#source-time").textContent = `${clock(line.sourceStart)} ～ ${clock(line.sourceEnd)}`;
  $("#baseline-time").textContent = `${clock(line.baselineStart)} ～ ${clock(line.baselineEnd)}`;
  $("#line-start").value = line.start ?? ""; $("#line-end").value = line.end ?? "";
  $("#note").value = line.review.note;
  $("#apply-candidate").disabled = Boolean(alignmentTask) || Boolean(lineIssues(line, draft.lines[selected - 1], draft.lines[selected + 1]).length);
  $("#cancel-word-alignment").hidden = !alignmentTask;
  $("#level").value = line.review.level || "line"; $("#listened").checked = false;
  $("#previous").disabled = selected === 0; $("#next").disabled = selected === draft.lines.length - 1;
  $("#words").innerHTML = line.words.map((word, index) => `<tr><td><span lang="ja">${escape(word.text)}</span><small lang="ja">${escape(word.reading)}</small></td><td><input type="number" min="0" step="0.01" data-word="${index}" data-bound="start" aria-label="第 ${index + 1} 字詞開始" value="${word.start ?? ""}"></td><td><input type="number" min="0" step="0.01" data-word="${index}" data-bound="end" aria-label="第 ${index + 1} 字詞結束" value="${word.end ?? ""}"></td><td><button data-play-word="${index}" aria-label="試聽第 ${index + 1} 字詞">試聽</button></td></tr>`).join("");
  $("#words").querySelectorAll("input").forEach(input => input.oninput = action(() => {
    const value = readTime(input); line.words[Number(input.dataset.word)][input.dataset.bound] = value; changed();
  }));
  $("#words").querySelectorAll("button").forEach(button => button.onclick = action(() => {
    const word = line.words[Number(button.dataset.playWord)];
    if (!isTime(word.start) || !isTime(word.end) || word.end <= word.start) throw new Error("先填妥這個字詞的開始與結束時間。");
    playRange(word.start, word.end, "word");
  }));
  renderIssues(); renderPreview(selected);
}
function renderIssues() {
  const line = row(), issues = lineIssues(line, draft.lines[selected - 1], draft.lines[selected + 1], $("#level").value);
  const flags = [...(line.repeated ? ["重複句：請核對這一次出現的位置"] : []), ...(line.candidateBasis ? ["音訊自動對齊候選，尚待聽校"] : []),
    ...(line.candidateFlags?.includes("low-model-score") ? ["部分字詞模型分數偏低"] : []),
    ...(line.candidateFlags?.includes("analysis-window-edge") ? ["候選貼近分析邊界，需優先核對"] : []),
    ...(line.candidateFlags?.some(flag => flag.startsWith("large-")) ? ["候選與來源秒數差距較大"] : []), ...issues];
  $("#line-flags").textContent = flags.join(" · ") || "起訖格式有效，仍需實際聽校。";
  $("#review-status").textContent = `${STATUS[line.review.status]}${line.review.reviewer ? ` · ${line.review.reviewer}` : ""}${line.review.level === "word" ? " · 逐字／詞" : " · 逐句"}`;
}
function changed({ preserveLineReview = false } = {}) {
  cancelAlignment();
  if (!preserveLineReview) invalidate(row());
  $("#apply-candidate").disabled = Boolean(lineIssues(row(), draft.lines[selected - 1], draft.lines[selected + 1]).length);
  $("#listened").checked = false; stopAt = null;
  for (const index of [selected - 1, selected + 1]) {
    const neighbor = draft.lines[index];
    if (neighbor?.review.status === "passed" && lineIssues(neighbor, draft.lines[index - 1], draft.lines[index + 1], neighbor.review.level).length) invalidate(neighbor);
  }
  renderList(); renderIssues(); renderPreview(selected); save();
}
function cancelAlignment() {
  if (!alignmentTask) return;
  alignmentTask.controller.abort(); alignmentTask = null;
  $("#word-align-status").textContent = "已取消重新對齊，原有時間已保留。";
  $("#cancel-word-alignment").hidden = true;
  $("#apply-candidate").disabled = Boolean(lineIssues(row(), draft.lines[selected - 1], draft.lines[selected + 1]).length);
}
function readTime(input) {
  if (input.value === "") return null;
  const value = Number(input.value);
  if (!isTime(value)) throw new Error("時間必須是非負秒數。");
  return round(value);
}
function adjustBound(bound, delta) {
  const input = $(`#line-${bound}`), label = bound === "start" ? "開始" : "結束";
  const current = readTime(input);
  if (!isTime(current)) throw new Error(`請先填寫${label}時間，或取播放時間後再微調。`);
  const value = round(current + delta);
  if (!isTime(value)) throw new Error(`${label}時間不能小於 0 秒，未套用這次調整。`);
  row()[bound] = value;
  input.value = value;
  changed();
  feedback(`本句${label}時間：${value.toFixed(3)} 秒（${delta < 0 ? "−" : "＋"}0.1 秒）。`);
}
function renderPreview(index) {
  previewIndex = index;
  const line = draft.lines[index];
  if (!line) { $("#preview-jp").textContent = "(~間奏♪~)"; $("#preview-tr").textContent = ""; $("#preview-state").textContent = ""; return; }
  const segments = wordSegments(line);
  const complete = Boolean(segments) && !lineIssues(line, null, null, "word").length;
  $("#preview-jp").innerHTML = complete ? segments.map(segment => segment.wordIndex === null ? escape(segment.text)
    : `<span class="karaoke-word" data-word-index="${segment.wordIndex}">${escape(segment.text)}</span>`).join("") : escape(line.text);
  $("#preview-tr").textContent = line.translation || "中文待補";
  const status = line.review.status === "passed" ? `${line.review.level === "word" ? "逐字／詞" : "逐句"}已聽校` : STATUS[line.review.status];
  $("#preview-state").textContent = `第 ${index + 1} 句 · ${status} · ${complete ? "字詞時間草稿預覽" : "逐句預覽，字詞時間待補"}`;
}
function currentTime() { return mediaMode === "local" ? audio.currentTime : playerReady ? player.getCurrentTime() : null; }
function isPlaying() { return mediaMode === "local" ? !audio.paused : playerReady && player.getPlayerState() === 1; }
function pause() { if (mediaMode === "local") audio.pause(); else if (playerReady) player.pauseVideo(); }
function seek(time) { if (mediaMode === "local" && audio.readyState) audio.currentTime = time; else if (playerReady) player.seekTo(time, true); else throw new Error("請先連線播放器或載入本機音訊。"); }
async function play() {
  if (mediaMode === "local" && audio.src) await audio.play();
  else if (playerReady) player.playVideo();
  else throw new Error("請先連線 YouTube 播放器，或載入同版本的本機音訊。");
}
async function playRange(start, end, kind = "line") {
  if (!isTime(start)) throw new Error("這一句的開始時間待補。");
  seek(Math.max(0, start - .3));
  stopAt = isTime(end) && end > start ? { start, end, kind } : null;
  await play();
  if (!isTime(end)) feedback("句尾待補，先從本句開始播放；請實聽後補上結束時間。");
}
function youtubeApi() {
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    let timer;
    const fail = () => { clearTimeout(timer); apiPromise = null; reject(new Error("無法連線 YouTube。可按重試，或載入本機音訊。")); };
    window.onYouTubeIframeAPIReady = () => { clearTimeout(timer); resolve(); };
    document.querySelector("script[data-youtube]")?.remove();
    const script = document.createElement("script"); script.src = "https://www.youtube.com/iframe_api"; script.dataset.youtube = "true"; script.onerror = fail;
    timer = setTimeout(fail, 12000); document.head.append(script);
  });
  return apiPromise;
}
async function connectVideo() {
  if (!song.youtubeId) throw new Error("尚無完整歌曲影片，不能使用預告校時。");
  const epoch = ++playerEpoch, id = song.youtubeId;
  $("#connect-video").disabled = true; $("#retry-video").hidden = true;
  $("#media-status").textContent = "正在連線 YouTube…";
  try {
    await youtubeApi();
    if (epoch !== playerEpoch || id !== song.youtubeId || mediaMode !== "youtube") return;
    if (player) player.destroy(); playerReady = false;
    if (!$("#youtube-player")) $("#youtube-shell").insertAdjacentHTML("afterbegin", '<div id="youtube-player"></div>');
    const fail = message => {
      if (epoch !== playerEpoch) return;
      clearTimeout(playerTimer); playerReady = false;
      $("#media-status").textContent = message; $("#retry-video").hidden = false;
    };
    playerTimer = setTimeout(() => fail("播放器尚未就緒，可重試或改用本機音訊。"), 15000);
    player = new window.YT.Player("youtube-player", { videoId: id, width: "100%", height: "100%",
      playerVars: { playsinline: 1, origin: location.origin, rel: 0 }, events: {
        onReady: () => {
          if (epoch !== playerEpoch) return;
          clearTimeout(playerTimer); playerReady = true; $("#video-placeholder").hidden = true;
          player.setPlaybackRate(Number($("#rate").value)); $("#media-status").textContent = "影片已就緒；時間軸依這支影片計算。";
        },
        onError: event => fail(`YouTube 無法播放（${event.data}）。可開啟官方影片，或使用同版本本機音訊聽校。`),
      } });
  } catch (error) {
    if (epoch === playerEpoch) { $("#media-status").textContent = error.message; $("#retry-video").hidden = false; }
  } finally { if (epoch === playerEpoch) $("#connect-video").disabled = false; }
}

$("#reviewer").value = localStorage.getItem("yonezu-timing-reviewer") || "";
$("#reviewer").oninput = () => localStorage.setItem("yonezu-timing-reviewer", $("#reviewer").value);
$("#song").onchange = action(async () => { const id = $("#song").value; try { await loadSong(id); } catch (error) { if (song) $("#song").value = song.id; throw error; } });
$("#search").oninput = renderList; $("#filter").onchange = renderList;
$("#previous").onclick = () => selectLine(selected - 1); $("#next").onclick = () => selectLine(selected + 1);
$("#line-start").oninput = action(() => { row().start = readTime($("#line-start")); changed(); });
$("#line-end").oninput = action(() => { row().end = readTime($("#line-end")); changed(); });
document.querySelectorAll("[data-adjust-bound]").forEach(button => {
  button.onclick = action(() => adjustBound(button.dataset.adjustBound, Number(button.dataset.delta)));
});
for (const bound of ["start", "end"]) $(`#line-${bound}`).onkeydown = action(event => {
  if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing
    || !["ArrowDown", "ArrowUp"].includes(event.key)) return;
  event.preventDefault();
  adjustBound(bound, event.key === "ArrowDown" ? -.1 : .1);
});
$("#note").oninput = () => { row().review.note = $("#note").value; save(); };
$("#level").onchange = () => { $("#listened").checked = false; renderIssues(); };
for (const [selector, delta] of [["#shift-back", -.1], ["#shift-forward", .1]]) $(selector).onclick = action(() => {
  draft.lines[selected] = shiftLines([row()], delta)[0]; changed(); renderEditor();
});
$("#shift-song").onclick = action(() => {
  cancelAlignment();
  const delta = Number($("#offset").value);
  if (!delta) throw new Error("請填寫要再調整的秒數。初始偏移已套用。");
  draft.lines = shiftLines(draft.lines, delta); $("#offset").value = "0";
  save(); renderEditor(); feedback(`全曲已${delta < 0 ? "提前" : "延後"} ${Math.abs(delta)} 秒，通過標記已撤銷。`);
});
for (const bound of ["start", "end"]) $(`#stamp-${bound}`).onclick = action(() => {
  const time = currentTime(); if (!isTime(time)) throw new Error("播放器尚未就緒。");
  row()[bound] = round(time); changed(); renderEditor();
});
$("#play-line").onclick = action(() => playRange(row().start, row().end ?? draft.lines[selected + 1]?.start));
$("#toggle-play").onclick = action(async () => { stopAt = null; if (isPlaying()) pause(); else await play(); });
$("#rewind").onclick = action(() => { const time = currentTime(); if (!isTime(time)) throw new Error("播放器尚未就緒。"); seek(Math.max(0, time - 2)); });
$("#rate").onchange = () => { audio.playbackRate = Number($("#rate").value); if (playerReady) player.setPlaybackRate(Number($("#rate").value)); };
$("#connect-video").onclick = action(connectVideo); $("#retry-video").onclick = action(connectVideo);
$("#audio-file").onchange = action(() => {
  cancelAlignment();
  const file = $("#audio-file").files[0]; if (!file) return;
  pause(); playerEpoch++; clearTimeout(playerTimer);
  mediaMode = "local"; mediaIdentity = `${file.name}:${file.size}:${file.lastModified}`;
  if ((draft.mediaIdentity || draft.sourceReview?.mediaIdentity || "youtube") !== mediaIdentity) invalidateMediaReview();
  if (audioUrl) URL.revokeObjectURL(audioUrl); audioUrl = URL.createObjectURL(file);
  audio.src = audioUrl; audio.playbackRate = Number($("#rate").value); audio.hidden = false;
  $("#youtube-shell").hidden = true; $("#use-youtube").hidden = false; $("#retry-video").hidden = true;
  $("#media-status").textContent = `本機音訊：${file.name}。請確認與指定影片同版本，時間含相同片頭。`;
});
audio.onerror = () => { $("#media-status").textContent = "瀏覽器無法讀取此音訊。請改用支援的格式或官方影片。"; };
$("#use-youtube").onclick = action(() => {
  cancelAlignment();
  audio.pause(); mediaMode = "youtube"; mediaIdentity = "youtube"; stopAt = null;
  if ((draft.mediaIdentity || draft.sourceReview?.mediaIdentity || "youtube") !== "youtube") invalidateMediaReview();
  audio.hidden = true; $("#youtube-shell").hidden = false; $("#use-youtube").hidden = true;
  $("#connect-video").disabled = !song.youtubeId;
  $("#media-status").textContent = playerReady ? "已切回 YouTube。" : "請連線 YouTube 播放器。";
});
$("#fit-bounds").onclick = action(() => {
  if (!row().words.length || row().words.some(word => !isTime(word.start) || !isTime(word.end) || word.end <= word.start)) throw new Error("請先補齊所有字詞的有效起訖。");
  row().start = Math.min(...row().words.map(word => word.start)); row().end = Math.max(...row().words.map(word => word.end)); changed(); renderEditor();
});
$("#apply-candidate").onclick = action(async () => {
  if (alignmentTask) return;
  if (catalog.wordAlignmentMode !== "current-line-audio") throw new Error("請重啟本機校對服務，再重新整理以使用目前區段對齊。");
  const line = row(), task = { controller: new AbortController(), draft, line, signature: timingSignature(line), mediaIdentity };
  if (lineIssues(line, draft.lines[selected - 1], draft.lines[selected + 1]).length) throw new Error("請先填妥本句有效起訖與順序。");
  const current = () => alignmentTask === task && draft === task.draft && row() === line
    && timingSignature(line) === task.signature && mediaIdentity === task.mediaIdentity;
  alignmentTask = task; renderEditor();
  $("#word-align-status").textContent = "正在儲存目前區段…";
  try {
    await flush();
    if (!current()) return;
    await save(); await flush();
    if (!current()) return;
    let mediaSha256 = null;
    if (mediaMode === "local") {
      const file = $("#audio-file").files[0];
      if (!file) throw new Error("請先載入原本使用的音訊，或切回 YouTube。");
      const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      mediaSha256 = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
    }
    if (!current()) return;
    const revision = revisions.get(song.id);
    $("#word-align-status").textContent = `正在分析 ${clock(line.start)}～${clock(line.end)} 的原音，可取消；本句起訖保持不變。`;
    const result = await request(`/api/song/${song.id}/align`, { method: "POST", signal: task.controller.signal,
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lineIndex: line.index, revision, mediaIdentity, mediaSha256 }) });
    if (!current() || revisions.get(song.id) !== result.revision) throw new Error("對齊期間校對資料已變更，未套用結果；請再試一次。");
    if (!applyAlignedWords(line, result.candidate, draft.lines[selected - 1], draft.lines[selected + 1])) throw new Error("重新對齊結果與目前區段不符，原有時間已保留。");
    task.applied = true;
    task.appliedSignature = timingSignature(line);
    alignmentTask = null;
    changed({ preserveLineReview: true }); renderEditor(); await flush();
    if (alignmentTask || draft !== task.draft || row() !== line || timingSignature(line) !== task.appliedSignature) return;
    $("#word-align-status").textContent = "已依目前起訖重新對齊字詞；本句起訖與既有逐句通過保留，字詞仍待聽校。";
    feedback("已更新本句字詞時間，請試聽逐字／詞結果後再確認。");
  } catch (error) {
    if ((alignmentTask === task || task.applied && !alignmentTask && draft === task.draft && row() === line) && error.name !== "AbortError") {
      $("#word-align-status").textContent = task.applied ? "字詞時間已更新，但儲存失敗；請先匯出 JSON 備份。" : "重新對齊未完成，原有時間已保留。";
      throw error;
    }
  } finally {
    if (alignmentTask === task) { alignmentTask = null; renderEditor(); }
  }
});
$("#cancel-word-alignment").onclick = () => { cancelAlignment(); renderEditor(); };
$("#pass").onclick = action(async () => {
  cancelAlignment();
  const reviewer = $("#reviewer").value.trim(), level = $("#level").value;
  if (!reviewer) throw new Error("請先填寫校對者。");
  if (!$("#listened").checked) throw new Error("實際聽過這份修正後，請勾選聽校聲明。");
  const issues = lineIssues(row(), draft.lines[selected - 1], draft.lines[selected + 1], level);
  if (issues.length) throw new Error(issues.join("；"));
  row().review = { status: "passed", note: $("#note").value, level, reviewer, reviewedAt: new Date().toISOString(), listened: true, mediaIdentity, timingSignature: timingSignature(row()) };
  await save(); renderList(); renderIssues(); renderPreview(selected);
});
$("#needs-fix").onclick = () => { cancelAlignment(); row().review = { status: "needs-fix", note: $("#note").value }; $("#listened").checked = false; save(); renderList(); renderIssues(); renderPreview(selected); };
$("#pending").onclick = () => { cancelAlignment(); invalidate(row()); $("#listened").checked = false; save(); renderList(); renderIssues(); renderPreview(selected); };
$("#export-json").onclick = action(() => download(`${song.id}-timing-review.json`, JSON.stringify(validateDraft(draft, song), null, 2) + "\n", "application/json"));
$("#export-csv").onclick = action(() => download(`${song.id}-line-timing.csv`, csv(tableRows(song, draft)), "text/csv;charset=utf-8"));
$("#export-lrc").onclick = action(() => download(`${song.id}-review-draft.lrc`, lrc(draft), "text/plain;charset=utf-8"));
$("#export-words").onclick = action(() => {
  const rows = draft.lines.flatMap(line => line.words.map((word, index) => ({ songId: song.id, youtubeId: song.youtubeId, line: line.index + 1,
    word: index + 1, text: word.text, reading: word.reading, start: word.start, end: word.end,
    score: word.score ?? null, status: line.review.status === "passed" && line.review.level === "word" ? "passed" : line.candidateBasis ? "automatic-candidate" : "pending",
    flags: (line.candidateFlags || []).join(";"), note: line.review.note })));
  download(`${song.id}-word-timing.csv`, csv(rows), "text/csv;charset=utf-8");
});
$("#export-all").onclick = action(async () => {
  await flush(); const rows = []; $("#export-all").disabled = true;
  try {
    for (const item of catalog.songs) {
      const data = await request(`/api/song/${item.id}`); rows.push(...tableRows(data.song, item.id === song.id ? draft : data.draft || createDraft(data.song)));
    }
    download("yonezu-all-line-timing.csv", csv(rows), "text/csv;charset=utf-8");
  } finally { $("#export-all").disabled = false; }
});
$("#import-json").onchange = action(async () => {
  cancelAlignment();
  const file = $("#import-json").files[0]; if (!file) return;
  try {
    const imported = migrateDraft(JSON.parse(await file.text()), song);
    if (imported.songId !== song.id) throw new Error("請先選擇與匯入檔相同的歌曲。");
    validateDraft(imported, song); await flush();
    // Preserve an immediately downloadable copy before replacing the current draft.
    download(`${song.id}-before-import.json`, JSON.stringify(draft, null, 2) + "\n", "application/json");
    draft = imported; stopAt = null; await save(); renderEditor();
    feedback("修正 JSON 已匯入，匯入前的草稿也已下載備份。");
  } finally { $("#import-json").value = ""; }
});
window.addEventListener("beforeunload", event => { if (saveFailure || pendingSaves) { event.preventDefault(); event.returnValue = ""; } });
setInterval(() => {
  if (!draft) return;
  let time;
  try { time = currentTime(); } catch { return; }
  if (!isTime(time)) return;
  $("#clock").textContent = clock(time);
  if (stopAt && isPlaying() && time >= stopAt.end) {
    if ($("#loop").checked) seek(Math.max(0, stopAt.start - .3)); else { pause(); stopAt = null; }
  }
  if ($("#follow").checked && isPlaying() && !stopAt) {
    let index = -1;
    draft.lines.forEach((line, i) => { if (isTime(line.start) && time >= line.start && (!isTime(line.end) || time < line.end)) index = i; });
    if (index !== previewIndex) renderPreview(index);
  }
  const line = draft.lines[previewIndex];
  if (line) $("#preview-jp").querySelectorAll(".karaoke-word").forEach(element => {
    const word = line.words[Number(element.dataset.wordIndex)];
    element.style.setProperty("--fill", `${100 * Math.max(0, Math.min(1, (time - word.start) / (word.end - word.start)))}%`);
  });
}, 80);
action(async () => {
  catalog = await request("/api/catalog");
  if (catalog.reviewMode !== "per-line") {
    $("#save-status").textContent = "請重啟本機校對服務";
    throw new Error("目前服務仍載入舊版。請在原終端按 Ctrl+C，再執行 npm.cmd run timing:review，然後重新整理此頁。");
  }
  $("#catalog-info").textContent = `${catalog.songCount} 首 · ${catalog.lineCount.toLocaleString()} 句 · 音訊候選與人工聽校分開保存`;
  $("#storage-info").textContent = `本機保存位置：${catalog.storage}。來源改變時拒絕沿用舊修正；保留舊檔後重新整理。`;
  $("#song").innerHTML = catalog.songs.map(item => `<option value="${item.id}">${escape(item.title)} · ${item.lineCount} 句</option>`).join("");
  const id = decodeURIComponent(location.hash.slice(1));
  await loadSong(catalog.songs.some(item => item.id === id) ? id : catalog.songs[0].id);
})().catch(error => feedback(error.message));
