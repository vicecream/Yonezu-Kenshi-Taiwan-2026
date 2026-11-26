# 米津歌曲原文與 LRC

需要逐句核對影片起訖或整理卡拉 OK 字詞時間時，可用[本機時間軸校對網頁](../docs/timing-review.md)，選句後即可聽校。[初步對照 CSV／JSON](../artifacts/timing-review/README.md) 由現有 26 首、1,021 句與音訊候選產生，已補回 1,003 句原始 JSON 句尾；人工修正另外保存，模型秒數仍待逐句實聽。

[專案說明](../README.md) · [28 首來源與 ID](../docs/lyric-sources.md) · [匯入步驟](../docs/karaoke-import.md)

目前已從使用者提供的 LRCLIB JSON 匯入 26 首原文，共 1,021 行；本批新增 19 首、717 行，先前 7 首維持原有內容。對應原始檔保存在本資料夾的 `<歌曲 ID>.json`，下載資料夾中的原檔保留。`HaruGaTomori`（〈春が灯り〉）及 `KonnichiwaGokigenyou`（〈こんにちはごきげんよう！〉）原文仍待補。

使用 UTF-8，檔名採固定歌曲 ID，例如 `Lemon.lrc` 或 LRCLIB 原始 `Lemon.json`。保留來源、可使用依據及影片版本；不要將舊歌手內容改名後匯入。

26 份 JSON 已統一使用兩個空白縮排；字串中的換行仍以 `\n` 保存，以維持有效 JSON 與原始欄位內容。若要逐句對照歌詞與時間碼，可開啟 `readable/<歌曲 ID>.lrc`，例如[感電逐行檢視](readable/Kanden.lrc)。這 26 份檢視檔依已匯入的 1,021 行原文及 `sourceTime` 產生，每句各占一行，並逐列比對本機來源與網站。網站已明確設定 `timingMode: preview`，使用 LRC 時間逐句跟隨及跳轉；MV 片頭、段落等時差仍待逐首校正。`readable/` 供閱讀使用，正式匯入仍以 manifest 的 `songs[].file` 為準。

import-manifest.json 的 songs 已登記 26 首本機供稿；candidateEntries 保留 28 首的固定 ID、建議 LRC 檔名與來源狀態，其中 26 首有 LRCLIB JSON 網址。新增對應檔案後，將該筆草稿複製到 songs，依實際副檔名填妥 file、sourceUrl、usageBasis，先預覽，再以 --write 匯入。候選不會被自動下載或匯入；欄位及 JSON／LRC 格式差異見[來源欄位說明](../docs/song-source-fields.md)。目前 26 首均已啟用 LRC 逐句同步試播，中文仍維持 19 首完整、7 首部分整理；26 首已提供振り仮名與羅馬拼音切換，見[讀音維護](../docs/furigana.md)；影片時間精校待補，不以來源時間宣稱已核實影片對齊。

同份 JSON 的歌詞欄位可能使用不同分行或內容，本批依下列方式保存來源，未自行補詞或推算影片時間：

| 歌曲 | 實際匯入來源 | 處理依據 |
|---|---|---|
| 〈1991〉 | `NineteenNinetyOne.lrc`，取自同名 JSON 的 `syncedLyrics` | `lyricsfile` 最後一句缺少 `end_ms`，原解析會漏讀；改用已提供的 18 行 LRC，末句不補結束時間 |
| 〈IRIS OUT〉 | `IrisOut.json` 的 `lyricsfile` | 採用 44 行日文；另一個 `syncedLyrics` 欄位混有韓文與損壞字元 |
| 〈アイネクライネ〉 | `EineKleine.json` 的 `lyricsfile` | 沿用供稿的 52 行日文；另一個 `syncedLyrics` 欄位採不同分行與字詞，不混合拼接 |

原文、中文、讀音與影片同步可分開完成；資料產生至 src/song-lyrics.js，不直接編輯 dist。繁中供稿格式見 [translations](translations/README.md)。歷史內容見 [封存目錄](../archive/fujii-kaze-2026/README.md)。
