# 28 首歌曲來源欄位與匯入入口

[逐首連結](lyric-sources.md) · [原文匯入](karaoke-import.md) · [翻譯匯入](translation-import.md)

2026-11-19（Asia/Taipei）依藤井風封存版流程整理。28 首都有固定 ID；26 首有 YouTube、LRC 候選與中文參考文章。2026-11-20 已匯入本機 26 首、1,021 行原文，並對齊 987 列中文；19 首完整、7 首部分整理。兩首暫時隱藏的公告曲保留原始設定；讀音及影片同步仍待補。

## 程式內對應欄位

完整曲庫 `SONGS` 保留 28 首；網站以 `VISIBLE_SONGS` 顯示 26 首。`src/song-metadata.js` 的 `hiddenSongIds` 暫時包含 `HaruGaTomori`、`KonnichiwaGokigenyou`；從集合移除 ID 即可恢復顯示，其他歌曲的固定預習編號不變。

| 需求 | 設定位置／欄位 | 意義 |
|---|---|---|
| YouTube | `src/song-metadata.js`：`youtubeId`、`videoSourceUrl` | 播放器實際使用的完整歌曲入口；兩首新曲為 null |
| 影片或音源 | 同檔：`videoType` | `music-video` 為 MV；`official-audio` 為官方發行音源；`pending` 為完整歌曲入口待補 |
| 影片核對依據 | 同檔：`videoReferenceUrl`、`videoCheckedAt` | 官方公告、作品頁或官方發行音源頻道；不是已逐首實播的聲明 |
| LRC 網址 | 同檔：`lyricsCandidateUrl` | LRCLIB 單筆 JSON API 候選，沒有自動下載或啟用同步 |
| 中文翻譯網址 | 同檔：`translationReferenceUrl`、`translationReferenceCredit` | 原翻譯文章與署名；不表示字幕 `tr` 已填入 |
| LRC 匯入草稿 | `lyrics/import-manifest.json`：`candidateEntries` | 28 首的 `id`、`file`、`sourceUrl` 與待補使用依據 |
| 本機原文匯入 | 同檔：`songs` | 已提供的 26 首本機檔案、來源與提供方式；原始 `<歌曲 ID>.json` 均保留 |
| 翻譯來源草稿 | `lyrics/translations/sources.json`：`references` | 28 首的文章、署名、建議 TXT／PDF 路徑及待補狀態 |

來源網址與實際內容狀態分開保存。`lyricsStatus`、`translationStatus`、`readingsStatus`、`timingStatus` 仍依已提供的內容決定；新增連結不會將空字幕標成完成。

## 原文／LRC 如何匯入

1. 提供 UTF-8 本機檔案，例如 `lyrics/Lemon.lrc`。
2. 從 manifest 的 `candidateEntries` 複製該首到 `songs`，填妥本次 `usageBasis`。`file` 相對於 manifest，因此填 `Lemon.lrc`，不是 `lyrics/Lemon.lrc`。
3. 若提供的是 LRCLIB 原始 JSON，改用 `file: "Lemon.json"`；匯入工具優先讀取 `lyricsfile`，無可用資料時再讀取 `syncedLyrics`。需要指定 `syncedLyrics` 時可抽出為 `.lrc`，並保留原始 JSON 供核對；本次〈1991〉採此方式，詳見[欄位選擇](../lyrics/README.md)。不要把整個 JSON 改副檔名為 `.lrc`。
4. 預覽後再寫入；沒有時間校正資料時省略 `alignment` 與 `timingMode`，只保存來源時間。需要未校正的逐句試播時再設 `timingMode: "preview"`。

```sh
node scripts/import-song-lyrics.mjs lyrics/import-manifest.json
node scripts/import-song-lyrics.mjs lyrics/import-manifest.json --write
```

`candidateEntries` 不會由工具讀入；`songs` 只登記已提供本機檔案及使用依據的歌曲，目前共 26 首。下載資料夾中的原檔保留，專案內以歌曲 ID 命名並保存原始 JSON 內容。

## 中文翻譯的四個輸入檔

| 檔案 | 何時填入 | 主要欄位 |
|---|---|---|
| `sources.json` 的 `references` | 只有外部文章連結時 | 本次已填入；不參與正文匯入 |
| `sources.json` 的 `songs` | 使用者已提供 PDF 時 | `id`、`title`、`file`、`pdf`、`referenceUrl`、來源署名、使用依據 |
| `extracted-pairs.json` | PDF 已抽取並核對時 | PDF SHA-256、頁碼、`pairs` 的原文／中文 |
| `alignment.json` 的 `songs` | 有本機原文及已核對的 PDF 對照時 | `id`、`pdf`、`sha256`、每列 `index`／`jp`／`time`／`tr`／`sourcePairs`／`method` |
| `user-supplied.json` 的 `songs` | 使用者直接提供 TXT／貼文時 | `id`、`file`、來源署名、範圍、`entries` 的逐句映射 |
| `line-map.json` | 本次 25 首 TXT 人工對照後 | 每列的供稿索引、拆合句、部分列、已核對重複段落及原文／供稿雜湊 |

`alignment.json` 不是貼來源網址的地方；它記錄 PDF 原文與中文的逐句關係，目前沒有 PDF 供稿，因此維持空白。26 首直接供稿走 `user-supplied.json`；新增 25 首先以 `prepare-supplied-translations.mjs` 讀取 `line-map.json` 預覽並產生映射。`sourceRefs` 保存正文行與字元範圍，`partial` 記錄列內待補片段；`usageBasis`、`scope` 記錄提供方式與待補範圍。文章署名保留在 `references`，未註明譯者的供稿另標為「使用者提供（譯者未註明）」。不能只把文章網址放進 `sources.json.songs`。

現有 PDF 抽取工具依原始歌名配對檔名，所以 `suggestedPdf` 採原題，例如 `春雷.pdf`；TXT 仍採 `Shunrai.zh.txt`。抽取器原先處理 MARUMARU 雙語 PDF 版型，不能假定 Alice 文章的列印 PDF 可直接套用。直接提供的文章文字走 TXT 供稿與逐句映射；PDF 須先核對版型及抽取結果。

適用版型的 PDF 可先執行 `python scripts/extract-translation-pdfs.py` 預覽，核對抽取內容與逐句映射後，再依翻譯匯入說明操作：

```sh
node scripts/import-song-translations.mjs
node scripts/import-song-translations.mjs --write
```

實際網站字幕最後寫入 `src/song-lyrics.js` 的 `{ jp, tr, time }`。未提供的中文列保持空白；不以文章段落數或 LRC 列數強制配對，也不在補中文時改動時間。

## 這次核對的範圍

- 26 篇翻譯文章均讀取成功，歌名對應目前曲庫，原頁署名為 Alice／箱庭博物館；選用完整版本的〈ピースサイン〉，未採 TV edit 或訪談文章。
- 26 個 YouTube 入口均讀取 oEmbed 標題與頻道資料；新增的五個 Topic 音源另核對發行商標記及長度，〈1991〉另由官方 MV 公告確認。
- LRC 延續 2026-11-17 的 26 個候選並重新讀取，重試後均可解析。初次 HTTP 429、成功重試與查無資料分開記錄；完整性、逐句正確性與影片同步仍未校正。
- 每首原始核對狀態見 [2026-11-19 中繼資料](../artifacts/song-source-review-2026-11-19.json)。查到網頁不等於網站已匯入全文，也不代表已驗證 26 首的即時串流或嵌入播放。
