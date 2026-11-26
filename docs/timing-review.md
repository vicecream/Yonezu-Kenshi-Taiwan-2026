# 歌詞時間軸對照與本機聽校

沿用藤井風專案的本機聽校方式：來源、音訊自動候選、人工修正、正式播放器資料分開保存。選句後即可校對，無需先確認整曲的三個位置。自動候選不代表人工聽校通過。

## 開啟網頁

在專案根目錄執行：

```powershell
npm.cmd run timing:review
```

開啟 <http://localhost:5175/>。服務只綁定本機 `127.0.0.1` 與 `::1`；數字 IPv4 入口會轉到 `localhost`，讓 YouTube 使用具名稱的來源。埠號占用時可設定 `$env:YONEZU_TIMING_PORT = '5176'`。按 Ctrl+C 停止服務。

工具放在 `tools/timing-review/`，不加入正式指南路由、Vite 建置、預快取或 Service Worker。YouTube 需要網路，本機頁面與音訊可在無外部網路時使用。校對頁無需新增 Node 依賴；按需重新對齊使用下述既有 Python 音訊模型環境。

## 目前資料與欄位

目前網站開放的 26 首、1,021 句，由當前 `src/song-lyrics.js` 與本機來源檔建立。隱藏且缺少內容的兩首不加入選單。保留固定歌曲 ID 與行序，重複歌詞依各次出現分列。

| 欄位 | 意義 |
|---|---|
| `sourceStart`／`sourceEnd` | 原始 LRC／JSON 秒數，校時不改動；缺少句尾使用 `null` |
| `baselineStart`／`baselineEnd` | 啟動工具時網站使用的影片時間，包含既有偏移 |
| `start`／`end` | 人工修正後的影片秒數，初始沿用網站時間 |
| `deltaSeconds` | 修正開始減原始來源開始，包含原有與新增偏移 |
| `words[].start`／`words[].end` | 字詞起訖；可用音訊候選先填入秒數，其餘 `null`，不以句長平均分配 |
| `review.status` | `pending` 待聽校、`needs-fix` 待修、`passed` 已聽校 |
| `review.level` | `line` 逐句或 `word` 逐字／詞；逐句通過不代表字詞通過 |

已修正匯入器漏存結構化 JSON `end_ms` 的問題，補回 25 首、1,003 句的來源句尾。〈1991〉17 句保留下一個明示 LRC 時間作區間終點，最後一句仍缺少句尾。來源資料並不等於已核實 MV；既有偏移只套用一次，例如〈Flamingo〉+7.76 秒、〈LADY〉+14.073 秒及〈さよーならまたいつか！〉+1.041 秒。

缺少句尾時維持待補，不以音訊長度或固定秒數假造。試聽本句若缺句尾，暫以下一句開始作停止邊界，不寫入來源；最後一句無邊界則繼續播放。

## 建議操作

1. 選歌並填校對者代號。連線 YouTube 播放器，或載入與指定影片相同版本、包含相同片頭的本機音訊。音訊不會上傳；重新整理後需再次選檔。
2. 直接選句，使用試聽、循環、倒退與倍速。開始與結束各有 ±0.1 秒按鈕；焦點在對應欄位時，按 `Alt + ↓`／`Alt + ↑` 可單獨減／加 0.1 秒，不會連動另一個起訖或字詞時間。也可直接輸入秒數、取播放時間，或使用「整句」／全曲平移；時間均以目前影片為準。空白時間須先填入或取播放時間，微調不會自動補值或產生負數。
3. 如需逐字卡拉 OK，展開字詞表。新草稿會保守填入符合條件的既有音訊候選。先校正本句開始與結束，再按「依目前區段重新對齊字詞」，會重新分析目前區段內的原音，只更新字詞時間，不覆蓋本句起訖。既有逐句通過保留；逐字／詞通過會撤銷，新字詞仍待聽校。分組沿用既有 ruby 讀音，不拆分模型無法區分的同一詞、不平均分配時間。同句字詞可重疊，起點須依原文排列。時間與覆蓋有效後顯示漸進反白草稿。
4. 選通過範圍，勾選本句實聽聲明並標記通過，不需要任何整曲確認表單。缺句尾、順序錯誤或逐字不完整時不能通過；無法確認則標記待修並填備註。
5. 匯出 JSON 備份或交回處理。也可匯出本曲／全曲庫逐句 CSV、本曲逐字 CSV，或含修正起點的 LRC。LRC **不保存句尾、字詞或通過紀錄**；接續校對請用 JSON。

修改時間取消本句通過，全曲平移取消全曲通過；相鄰句修改導致已通過句子順序失效時也會撤銷。更換音訊來源會撤銷使用另一來源的通過紀錄，可立即逐句繼續。匯入 JSON 前下載現有草稿備份，檢查歌曲、原文、行數、來源指紋與通過紀錄的時間簽章。

「依目前區段重新對齊字詞」會先儲存目前草稿，再使用指定影片已核對的本機原音，以修正後的開始／結束作為精確分析範圍；不加舊偏移、不縮放舊候選，也不把模型推定的發聲起訖寫回句子邊界。分析期間可取消；換句、換歌或修改時間會取消，另一分頁改動也會阻止舊結果套用。失敗時保留原有字詞與句子時間。若正在播放本機檔，只傳送檔案 SHA-256 與指定原音比對，不上傳音訊；不是同一份已核對原音時，先切回 YouTube 或載入相同原音。

本機預設使用 `D:\Codex\.karaoke-qa-tools/` 的 `align.py`、Python 與已快取模型，以及 `D:\Codex\.yonezu-karaoke-tools/<歌曲 ID>/mix.wav`；可用 `YONEZU_ALIGNMENT_TOOLS`、`YONEZU_ALIGNMENT_PYTHON`、`YONEZU_AUDIO_WORK` 改路徑。只讀本機模型，不自動下載。每次分析的手動區段、模型結果與紀錄另存原音資料夾的 `line-realign-*`，不覆寫原始候選或正式播放器資料。驗證指令為 `node scripts/check-manual-word-alignment.mjs`；加 `--audio` 可測試真實原音重新對齊，仍不代表人工聽校。

## 保存與接續

修改自動保存到專案外 `D:\Codex\.yonezu-timing-review\<歌曲ID>.json`，保留上一版 `.bak`；可用 `YONEZU_TIMING_STORAGE` 指定其他資料夾。待顯示「修正已自動儲存到本機」再關閉。多分頁同時編輯同曲會拒絕覆寫；先匯出 JSON 再重新載入。

來源檔、影片、原文、翻譯、既有時間或讀音分組改變時，指紋會改變。停止服務、封存舊修正檔，再重啟建立新草稿；不要改指紋沿用通過標記。工具啟動時讀取一次來源，編輯來源後須重啟。

本次僅補回同一 JSON 來源句尾的舊草稿可安全遷移：保留已改起點、句尾、字詞與備註，只補空白句尾；儲存時另存完整舊檔至 `before-end-recovery/`。不相容的來源變更仍會拒絕匯入。

修正不會直接覆寫網站或 manifest。JSON 是此專案的逐句／手動逐字草稿格式，**不是藤井風 `reviewed-karaoke-v1` 自動候選匯入檔**。正式套用前需依修正範圍更新來源與匯入流程，另行驗證播放器。

## 接續短句間空檔

在校對服務執行中，可批次把 **2 秒以內（含 2 秒）**的正向句間空檔加到上一句句尾，讓字幕接續到下一句開始；超過 2 秒的空檔保留，是否為間奏仍待實聽。先預覽，再明確寫入：

```powershell
node scripts/extend-timing-gaps.mjs
node scripts/extend-timing-gaps.mjs --write
node scripts/check-timing-gaps.mjs
```

播放跟隨預覽在沒有有效歌詞句子的空檔顯示 `(~間奏♪~)`，下一句開始時恢復原文與譯文。這是預覽提示，不加入歌詞列或改動校對時間。

處理目前 26 首，優先使用已保存的人工草稿；尚未建立的歌曲沿用保守預填候選。只延長有效句尾，不改任何起點、原文、來源秒數或模型候選。完整且有效的逐字句子同步延長最後字詞；缺漏字詞不補造，缺句尾、重疊及末句維持原狀。這是字幕接續整理，不代表已核實持續發聲。

寫入前將既有草稿完整備份到校對儲存目錄的 `before-gap-extension/<時間>/`，再經校對服務的版本檢查儲存並讀回比對。受影響句子的通過標記撤銷，備註保留，舊通過紀錄留在備份。完成後重新整理校對頁載入新版本；舊分頁會被版本檢查阻止覆寫。

本次操作的逐首摘要、保留長空檔、句尾前後差異及全曲逐句對照匯出至 [gap-extension/](../artifacts/timing-review/gap-extension/)。每次執行會更新該目錄的報告；不覆寫初始候選匯出。

先前 5 秒門檻的紀錄保留於 `gap-extension/history-5s/`；改為 2 秒時，依該次逐筆差異撤回超過門檻的自動延長，同步還原當時延長的尾字。已有後續人工句尾、字詞或通過紀錄的項目保留並列出衝突，不用整份舊草稿覆蓋。這項門檻修正與音訊來源檢查均不等於逐曲實聽通過。

`node scripts/audit-review-audio.mjs` 可逐曲核對專案外 `D:\Codex\.yonezu-karaoke-tools/` 的指定影片 ID、原音與 WAV 雜湊、未裁切的時間基準、音訊長度及目前草稿是否超出音訊。結果保存至 [影片音訊來源檢查](../artifacts/timing-review/video-audit/report.json)與[逐句比較表](../artifacts/timing-review/video-audit/line-timing-audit.csv)，可用 `YONEZU_AUDIO_WORK` 改變音訊資料夾。這個指令不收聽音訊、不修改時間，也不產生通過紀錄；原有模型候選仍需依影片逐句實聽。

## 初始對照資料與檢查

```powershell
npm.cmd run timing:export
npm.cmd run check:timing
```

產出 [曲庫 JSON](../artifacts/timing-review/catalog.json)、[逐句 CSV](../artifacts/timing-review/line-timing.csv) 與[逐字 CSV](../artifacts/timing-review/word-timing.csv)。資料包含來源及音訊初步候選，不讀人工修正；修正後全曲庫請從網頁匯出。CSV 使用 UTF-8 BOM，時間單位為秒，缺值留空。

## 重跑音訊候選

使用指定 YouTube ID 的原音，保留音訊雜湊、來源歌詞雜湊、模型修訂與單句異常。原音及模型留在專案外，候選放在 `lyrics/timing-candidates/`，不進正式播放器。本輪使用原音混音，沒有先分離人聲；伴奏、長音、和聲或讀音會影響模型，低分位置需優先實聽。

可在已具備藤井風 Python 工具環境的本機重跑：

```powershell
node scripts/prepare-timing-jobs.mjs D:/Codex/.yonezu-karaoke-tools
D:/Codex/.karaoke-qa-tools/Scripts/python.exe scripts/run-timing-alignment.py --tools D:/Codex/.karaoke-qa-tools --work D:/Codex/.yonezu-karaoke-tools
```

`--songs` 可指定歌曲 ID；`--backend whisper` 使用第二種模型，並以相同音訊的 CTC 結果作後備。未完成、低信心或字詞未覆蓋完整的句子不會自動當作通過。進度與逐首結果見[音訊處理紀錄](../artifacts/timing-review/audio-alignment.json)，來源句尾核對見[來源檢查](../artifacts/timing-review/source-audit.json)。

自動預填另外排除緊貼分析視窗邊界 80 毫秒內、開始時間變動超過 0.75 秒、句尾變動超過 1 秒的候選，保留原始模型秒數及提示供實聽。這些門檻用於保守篩選，不代表時間精度保證；可用 `node scripts/screen-timing-candidates.mjs` 重新檢查候選。

功能驗證可證明資料與介面行為；合成播放器測試不能當作真實 YouTube 播放或人工聽校已完成。
