# 米津歌曲原文與同步匯入

[歌詞資料夾](../lyrics/README.md) · [曲目與來源](lyric-sources.md)

## 搜尋來源候選

```sh
node scripts/find-karaoke-sources.mjs
```

搜尋目前 28 首的歌名及 Kenshi Yonezu／米津玄師別名，輸出 artifacts/karaoke-source-search.json。報告只保留來源、歌名、歌手、專輯、長度及同步資料有無，不保存歌詞全文。錯誤與查無資料分開記錄；同名、翻唱、live、remix 及 instrumental 不能自動視為同一版本。

目前沒有米津版來源候選搜尋完成的宣告。已有官方影片入口不代表歌詞或時間已核實。

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

以上是格式範例，來源欄位須換成真實網址後才能使用；目前 manifest 為空。純原文可設定 format 為 plain-text，不附時間。LRC 預設只保存來源時間，不啟用影片同步；需要逐行試播時明確設定 timingMode 為 preview，介面會標記待校正。

完成影片比對後，alignment 記錄當前 youtubeId、offsetSeconds 與 checkedAt。沒有完整影片的曲目不能以 null ID 宣稱同步完成；不能把預告時間當成完整歌曲時間。

readings 可分別提供 furigana 與 romaji。沒有完整讀音時使用 allowPendingReadings，維持讀音待補。中文依原文逐句對齊，不能僅按行號硬配。

匯入後執行 check:guide、check:lyrics、check:karaoke、check:imports 及 build。工具產生的模組只依賴米津曲庫，不載入舊照片譯詞。
