# 〈It's Alright〉日英逐字卡拉 OK 試作

試作日期：2026-11-14（Asia/Taipei）。官方影片為 [HA3WzXw8vM8](https://www.youtube.com/watch?v=HA3WzXw8vM8)，與 `src/song-metadata.js` 的目前來源一致。測試片段為影片 **00:08.00–00:59.01，共 51.01 秒**，包含 4 句日文、7 句英文（含兩句 Ah）。原文沿用使用者提供的 `lyrics/It's Alright.lrc`。

此試作提供獨立本機頁面、逐字資料及可重跑腳本。正式歌曲資料與 LRC 不改動；此資料維持 `experimental-unreviewed`，不代表整首完成影片同步或逐字聽校。

目前共 **84 個時間單元**；9 句採 Whisper medium，2 句（第一句英文與第二句 Ah）因 Whisper 出現零長度詞，採用同音訊的 CTC 後備。

## 檔案與播放

- 測試頁：`experiments/its-alright.html`。
- 時間資料：`lyrics/word-timing/its-alright-sample.json`；所有秒數均以原始影片為準。
- 音訊、模型與原始候選保存在網站目錄外的 `D:\Codex\.karaoke-qa-tools`，不會隨網站建置發布。
- 播放器提供原音／分離人聲、逐句跳轉、進度拖曳、0.75 倍速與逐字高亮開關。日文 ruby 與中文沿用現有專案資料。

啟動本機頁面：

```powershell
node scripts/serve-karaoke-sample.mjs --audio 'D:\Codex\.karaoke-qa-tools\its-alright\excerpt.mp3' --vocals 'D:\Codex\.karaoke-qa-tools\its-alright\vocal-excerpt.mp3'
```

開啟 <http://127.0.0.1:5174/experiments/its-alright.html>。伺服器僅綁定 `127.0.0.1`，支援音訊 Range 請求；不需要啟用或修改網站的 Service Worker。此實驗頁未加入正式 Vite 建置入口。

## 音訊與對齊方法

1. 用 yt-dlp 取得官方影片的音訊（format 251），保留影片原始時間軸。
2. 裁出 00:08.00–00:59.01 的立體聲音訊，以 Demucs `htdemucs` 分離人聲；模型使用 CPU、`shifts=0`、7 秒區塊及 25% 重疊。
3. 轉為 16 kHz 單聲道人聲。分析用 WAV 前置 8 秒靜音，讓輸出直接使用影片秒數；播放用 MP3 則只包含片段，播放器加回 8 秒。
4. 每句沿用 LRC 的開始至下一句開始作為搜尋窗。Whisper medium 透過 stable-ts `align_words()` 對已知原文做 cross-attention / DTW 對齊，日英分開處理，不用辨識結果替換原文。
5. Whisper 若產生零長度詞，採同一份人聲、同一份原文的 wav2vec2 CTC Viterbi 候選作後備；每句記錄實際模型與後備原因，不平均分配缺失時間。
6. 以既有 `karaoke-sources.js` 的文字映射對應顯示單元。日文部分是字、詞組或 ruby，英文以單字為單元；多字詞不宣稱其內每字皆經獨立測量。

參考：[Demucs](https://github.com/adefossez/demucs)、[stable-ts 既有時間窗對齊](https://github.com/jianfch/stable-ts#alignment)、[日文 CTC 模型](https://huggingface.co/jonatasgrosman/wav2vec2-large-xlsr-53-japanese)、[英文 CTC 模型](https://huggingface.co/facebook/wav2vec2-base-960h)。依賴版本保存於 `scripts/karaoke-sample-requirements.txt`；模型修訂與音訊／LRC 雜湊保存在 JSON。

## 重跑

安裝依賴至獨立 Python 環境後，先分離人聲：

```powershell
python scripts/separate-karaoke-sample.py path/to/source.webm path/to/work
```

產生 CTC 後備，再產生 Whisper 主結果：

```powershell
python scripts/align-its-alright-sample.py path/to/work/vocal-16k.wav path/to/work/ctc.json --cache path/to/models --backend ctc
python scripts/align-its-alright-sample.py path/to/work/vocal-16k.wav path/to/work/final.json --cache path/to/models --backend whisper --ctc-fallback path/to/work/ctc.json
```

`path/to/work/final.json` 為自動候選；保留影音來源與處理紀錄後，才更新試作 JSON。不要自動將 `timingStatus` 或人工核對狀態改為完成。

## 結果與限制

直接用混音的第一輪 CTC 結果不穩定。相同模型的人聲分離前後平均單元分數，日文由 0.105 至 0.113，英文由 0.232 至 0.500；分數不是準確率，亦不能用來跨模型比較。日文因此改採 Whisper 對齊；英文重複字若產生零長度則使用 CTC 後備。

部分低分位置、拖長母音的收尾與重複 Ah 仍需人工逐段聽校。語音模型可能將歌唱的長音提早結束，即使資料順序與文字檢查通過，也不能當作時間精度驗證。

資料檢查：

```powershell
node scripts/check-karaoke-sample.mjs
npm run check:lyrics
npm run check:karaoke
npm run build
```

試作檢查會核對目前影片 ID、原始 LRC 雜湊、11 句原文完整性、日英覆蓋、時間順序／邊界，以及現有渲染器的文字映射；播放與高亮另以瀏覽器實測。

2026-11-14 已在 Edge 實測原音播放／暫停、日文 ruby 與英文單字高亮、進度拖曳、點句跳轉、逐字高亮開／關、分離人聲切換保留進度，以及 00:59.01 停止與從頭重播。此為介面與時間表運作驗證，未將自動候選標為人工聽校完成。
