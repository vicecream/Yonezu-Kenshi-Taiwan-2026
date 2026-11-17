import { SONG_LYRICS } from "../src/song-lyrics.js";
import { FURIGANA_CORRECTIONS } from "../src/furigana-corrections.js";
import "../karaoke-sources.js";

const $ = selector => document.querySelector(selector);
const audio = $("#audio");
const play = $("#play");
const seek = $("#seek");
const enabled = $("#karaoke");
const status = $("#audio-status");
const escape = text => String(text).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const clock = seconds => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${(seconds % 60).toFixed(2).padStart(5, "0")}`;
const sourceSong = SONG_LYRICS.find(song => song.id === "ItsAlright");
let data;
let rows = [];
let activeIndex = -1;
let frame;
const atClipEnd = () => data && audio.currentTime >= data.clip.end - data.clip.start - 0.02;

function decorate(element, timed) {
  const units = [];
  const visit = node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const fragment = document.createDocumentFragment();
      for (const hit of (node.textContent || "").matchAll(/[A-Za-z]+(?:['’][A-Za-z]+)?|\s+|./gu)) {
        if (/^\s+$/u.test(hit[0])) { fragment.append(hit[0]); continue; }
        const span = document.createElement("span");
        span.className = "karaoke-unit";
        span.textContent = hit[0];
        fragment.append(span);
        units.push({ element: span, text: hit[0] });
      }
      node.replaceWith(fragment);
    } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "RUBY") {
      const span = document.createElement("span");
      span.className = "karaoke-unit";
      const text = [...node.childNodes].filter(child => child.nodeType === Node.TEXT_NODE).map(child => child.textContent).join("");
      node.replaceWith(span);
      span.append(node);
      units.push({ element: span, text });
    } else if (node.nodeType === Node.ELEMENT_NODE && !["RT", "RP"].includes(node.tagName)) {
      [...node.childNodes].forEach(visit);
    }
  };
  [...element.childNodes].forEach(visit);
  const mapped = window.KARAOKE_SOURCES.mapUnitsToWords(units.map(unit => unit.text), timed.words);
  units.forEach((unit, i) => {
    unit.timing = mapped.timings[i];
    const scored = timed.words.filter(word => unit.timing && word.start < unit.timing.end && word.end > unit.timing.start);
    unit.score = scored.length ? scored.reduce((sum, word) => sum + word.score, 0) / scored.length : null;
  });
  return units;
}

function paint() {
  if (!data) return;
  const time = Math.min(data.clip.end, data.clip.start + audio.currentTime);
  $("#clock").textContent = `${clock(time)} / ${clock(data.clip.end)}`;
  seek.value = String(audio.currentTime);
  const index = rows.findIndex(row => time >= row.data.start && time <= row.data.end);
  if (index !== activeIndex) {
    rows.forEach((row, i) => row.element.classList.toggle("active", i === index));
    activeIndex = index;
    if (index >= 0) {
      const container = $("#lyrics");
      const row = rows[index].element;
      container.scrollTo({ top: Math.max(0, row.offsetTop - (container.clientHeight - row.clientHeight) / 2), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
  }
  rows.forEach(row => row.units.forEach(unit => {
    const timing = unit.timing;
    const progress = timing ? Math.max(0, Math.min(1, (time - timing.start) / Math.max(0.02, timing.end - timing.start))) : 0;
    const active = enabled.checked && row === rows[index];
    unit.element.classList.toggle("lit", active && progress >= 1);
    unit.element.classList.toggle("current", active && progress > 0 && progress < 1);
  }));
  const currentWord = rows[index]?.data.words.find(word => time >= word.start && time < word.end);
  const current = currentWord ? { text: currentWord.text, timing: currentWord, score: currentWord.score, progress: (time - currentWord.start) / Math.max(0.02, currentWord.end - currentWord.start) } : null;
  $("#current-unit").textContent = current ? current.text : audio.currentTime === 0 ? "準備播放" : "停頓";
  $("#unit-range").textContent = current ? `${clock(current.timing.start)} → ${clock(current.timing.end)}` : "等待下一個演唱單元";
  $("#unit-score").textContent = current?.score != null ? `模型分數 ${current.score.toFixed(3)} · ${rows[index].data.language.toUpperCase()}` : "模型分數非準確率";
  $("#unit-progress").style.width = `${(current?.progress || 0) * 100}%`;
}

function tick() {
  paint();
  if (data && audio.currentTime >= data.clip.end - data.clip.start) { audio.pause(); status.textContent = "片段播放完畢，可從頭重播。"; return; }
  if (!audio.paused) frame = requestAnimationFrame(tick);
}
play.addEventListener("click", async () => {
  if (!audio.paused) { audio.pause(); return; }
  if (audio.ended || atClipEnd()) audio.currentTime = 0;
  try { await audio.play(); } catch (error) { status.textContent = `播放失敗：${error.message}`; }
});
audio.addEventListener("play", () => { play.textContent = "暫停片段"; status.textContent = "正在播放本機片段 · 與官方影片共用時間軸"; cancelAnimationFrame(frame); tick(); });
audio.addEventListener("pause", () => { play.textContent = "播放片段"; status.textContent = audio.ended || atClipEnd() ? "片段播放完畢，可從頭重播。" : "已暫停，可點選任一句跳轉。"; cancelAnimationFrame(frame); paint(); });
audio.addEventListener("timeupdate", paint);
audio.addEventListener("seeked", paint);
audio.addEventListener("error", () => { status.textContent = "本機音訊尚未就緒，請透過試作伺服器開啟此頁。"; });
$("#restart").addEventListener("click", () => { audio.currentTime = 0; paint(); });
seek.addEventListener("input", () => { audio.currentTime = Number(seek.value); paint(); });
$("#speed").addEventListener("change", event => { audio.playbackRate = Number(event.target.value); });
$("#track").addEventListener("change", event => {
  const time = audio.currentTime;
  const playing = !audio.paused;
  audio.src = event.target.value;
  audio.addEventListener("loadedmetadata", async () => {
    audio.currentTime = time;
    audio.playbackRate = Number($("#speed").value);
    if (playing) { try { await audio.play(); } catch (error) { status.textContent = `播放失敗：${error.message}`; } }
    paint();
  }, { once: true });
});
enabled.addEventListener("change", () => { document.body.classList.toggle("karaoke-off", !enabled.checked); paint(); });

try {
  const response = await fetch("/lyrics/word-timing/its-alright-sample.json");
  if (!response.ok) throw new Error(`逐字資料 HTTP ${response.status}`);
  data = await response.json();
  for (const [index, line] of data.lines.entries()) {
    const local = sourceSong.lyrics.find(row => Math.abs(row.sourceTime - line.sourceStart) < 0.005);
    const row = document.createElement("button");
    row.className = "lyric-row";
    row.setAttribute("aria-label", `跳至 ${clock(line.start)}，${line.text}`);
    const markup = FURIGANA_CORRECTIONS[line.text] || escape(line.text);
    row.innerHTML = `<span class="line-meta"><span>${clock(line.start)} — ${clock(line.end)}</span><span>${line.language === "ja" ? "日文" : "英文"} · ${line.words.length} 單元</span></span><span class="line-original" lang="${line.language}">${markup}</span>${local?.tr ? `<span class="line-translation">${escape(local.tr)}</span>` : ""}`;
    $("#lyrics").append(row);
    rows.push({ element: row, data: line, units: decorate(row.querySelector(".line-original"), line) });
    row.addEventListener("click", () => { audio.currentTime = Math.max(0, line.start - data.clip.start); paint(); });
    const report = document.createElement("p");
    report.textContent = `${index + 1}. ${clock(line.start)}–${clock(line.end)} · ${line.words.length} 單元 · 平均分數 ${(line.words.reduce((sum, word) => sum + word.score, 0) / line.words.length).toFixed(3)}`;
    $("#line-report").append(report);
  }
  $("#summary").innerHTML = `<dt>歌曲</dt><dd>Fujii Kaze · It's Alright</dd><dt>片段</dt><dd>${clock(data.clip.start)}–${clock(data.clip.end)}</dd><dt>歌詞</dt><dd>${data.lines.filter(line => line.language === "ja").length} 句日文 / ${data.lines.filter(line => line.language === "en").length} 句英文</dd><dt>時間</dt><dd>${data.lines.reduce((sum, line) => sum + line.words.length, 0)} 個字／單字單元</dd><dt>狀態</dt><dd>自動對齊・待聽校</dd>`;
  seek.max = String(data.clip.end - data.clip.start);
  const ready = () => { play.disabled = false; $("#restart").disabled = false; seek.disabled = false; status.textContent = "已載入本機音訊與逐字資料，按播放開始。"; };
  if (audio.readyState >= 1) ready(); else audio.addEventListener("loadedmetadata", ready, { once: true });
  paint();
} catch (error) { status.textContent = `無法載入試作：${error.message}`; }
