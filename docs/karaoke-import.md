# 米津歌曲原文與同步匯入

[歌詞資料夾](../lyrics/README.md) · [曲目與來源](lyric-sources.md)

## 搜尋來源候選

```sh
node scripts/find-karaoke-sources.mjs
```

搜尋目前 28 首的歌名及 Kenshi Yonezu／米津玄師別名，輸出 artifacts/karaoke-source-search.json。報告只保留來源、歌名、歌手、專輯、長度及同步資料有無，不保存歌詞全文。錯誤與查無資料分開記錄；同名、翻唱、live、remix 及 instrumental 不能自動視為同一版本。

2026-11-17 已完成目前 28 首的候選搜尋：26 首找到可解析、包含日文的時間歌詞來源，另 2 首本次未找到。逐首網址、程式連結與限制見[核對報告](../artifacts/lyrics-audit-2026-11-17.md)，原始中繼資料見[搜尋紀錄](../artifacts/karaoke-source-search-2026-11-17.json)。當時尚未匯入；候選可解析或已有官方影片入口，都不代表全文完整或影片時間已核實。

2026-11-19 已將 28 首的固定 ID、建議本機路徑與來源填入 `lyrics/import-manifest.json.candidateEntries`，並補齊 26 首 YouTube 與翻譯文章連結。完整欄位對應見[來源欄位與匯入入口](song-source-fields.md)；本輪重讀遇到的 HTTP 429 與歷次解析狀態分別保存於[核對中繼資料](../artifacts/song-source-review-2026-11-19.json)。

## 匯入本地檔案

先在 lyrics/ 放入可使用的原文或 LRC，再在 import-manifest.json 記錄對應 ID、檔案、來源與可使用依據。完整 ID 見歌曲來源清單。

```sh
node scripts/import-song-lyrics.mjs lyrics/import-manifest.json
node scripts/import-song-lyrics.mjs lyrics/import-manifest.json --write
```

範例：

```json
{
  "songs": [{
    "id": "Lemon",
    "file": "Lemon.lrc",
    "sourceUrl": "請填入實際原文來源",
    "usageBasis": "請記錄可使用依據",
    "allowPendingReadings": true
  }]
}
```

以上是格式範例。manifest 的 `songs` 已登記 26 首本機供稿，匯入共 1,021 行原文並對齊 987 列中文；26 首已明確設定 timingMode 為 preview，啟用逐句同步、跟隨及跳轉，讀音與影片精校仍待補。26 份使用者提供的原始 JSON 均保留，〈1991〉另從同檔 `syncedLyrics` 抽出 LRC，避免漏讀缺少結束時間的末句；欄位選擇見[歌詞資料夾](../lyrics/README.md)。`candidateEntries` 保留逐首候選網址，其他歌曲可在提供對應檔案後複製到 `songs` 並補妥 `usageBasis`。工具不會讀取候選草稿或下載網址內容。純原文可設定 format 為 plain-text，不附時間。LRC 預設只保存來源時間，不啟用影片同步；需要逐行試播時明確設定 timingMode 為 preview，介面會標記待校正。

完成影片比對後，alignment 記錄當前 youtubeId、offsetSeconds 與 checkedAt。沒有完整影片的曲目不能以 null ID 宣稱同步完成；不能把預告時間當成完整歌曲時間。

readings 可分別提供 furigana 與 romaji。沒有完整讀音時使用 allowPendingReadings，維持讀音待補。中文依原文逐句對齊，不能僅按行號硬配。

匯入後執行 check:guide、check:lyrics、check:karaoke、check:imports 及 build。工具產生的模組只依賴米津曲庫，不載入舊照片譯詞。
