# 28 首歌詞、時間資料與程式連結核對

核對日期：2026-11-17（Asia/Taipei）。[完整來源中繼資料與解析紀錄](karaoke-source-search-2026-11-17.json)。

## 結果

- 28 首目前皆未匯入歌詞：原文、翻譯、讀音與本地同步時間都是 0/28。
- `src/song-lyrics.js` 將每首的 `lyrics` 設成空陣列；`lyrics/import-manifest.json` 的 `songs` 也是空陣列。這是資料尚未提供，並非載入器找不到已匯入的內容。
- 26 首找到 LRCLIB 時間歌詞候選，且各至少一筆能由目前解析器讀取、包含日文假名及有效時間。這只是結構檢查，不代表全文完整、文字正確、可使用依據或影片同步已確認。
- 〈春が灯り〉與〈こんにちはごきげんよう！〉在本次 LRCLIB／AMLL 查詢及補充網頁搜尋中，未找到可確認的完整時間歌詞。官方頁面目前提供主題歌公告與預告；不將預告視為完整歌曲。
- 程式已保存 20 首 YouTube ID 及對應觀看連結；另外 8 首有官方聆聽、作品資訊或公告入口。
- 本次保存候選網址及解析統計，沒有保存歌詞全文，也未執行正式曲庫匯入。

## 逐首結果

所有曲目的本地歌詞行數均為 0。下表「候選行數」是外部來源可解析的時間列數，可能包含合併句、讀音或額外標記，不等於歌曲應有的完整句數。LRCLIB 連結回傳 JSON，其中 `syncedLyrics` 為 LRC 時間字串；它不是已加入專案的 `.lrc` 檔。

| 編號 | 原始歌名 | 本地歌詞行數 | 外部時間歌詞候選 | 候選行數 | 程式已保存的影片／官方入口 |
|---|---|---:|---|---:|---|
| 1 | YELLOW GHOST | 0 | [LRCLIB 11926614](https://lrclib.net/api/get/11926614) | 34 | [官方聆聽](https://smej.lnk.to/LOSTCORNER)，YouTube ID 待補 |
| 2 | 春雷 | 0 | [LRCLIB 10031040](https://lrclib.net/api/get/10031040) | 40 | [YouTube](https://www.youtube.com/watch?v=zkNzxsaCunU) |
| 3 | 感電 | 0 | [LRCLIB 11502024](https://lrclib.net/api/get/11502024) | 55 | [YouTube](https://www.youtube.com/watch?v=UFQEttrn6CQ) |
| 4 | Flamingo | 0 | [LRCLIB 65587](https://lrclib.net/api/get/65587) | 45 | [YouTube](https://www.youtube.com/watch?v=Uh6dkL1M9DM) |
| 5 | LADY | 0 | [LRCLIB 11929499](https://lrclib.net/api/get/11929499) | 35 | [YouTube](https://www.youtube.com/watch?v=DdF-u3fe5pg) |
| 6 | ゆめうつつ | 0 | [LRCLIB 14452926](https://lrclib.net/api/get/14452926) | 46 | [官方聆聽](https://smej.lnk.to/LOSTCORNER)，YouTube ID 待補 |
| 7 | クランベリーとパンケーキ | 0 | [LRCLIB 10123569](https://lrclib.net/api/get/10123569) | 49 | [官方聆聽](https://smej.lnk.to/Lemon)，YouTube ID 待補 |
| 8 | 死神 | 0 | [LRCLIB 12206559](https://lrclib.net/api/get/12206559) | 53 | [YouTube](https://www.youtube.com/watch?v=8nxaZ69ElEc) |
| 9 | さよーならまたいつか！ | 0 | [LRCLIB 14452815](https://lrclib.net/api/get/14452815) | 35 | [YouTube](https://www.youtube.com/watch?v=-wb2PAx6aEs) |
| 10 | メランコリーキッチン | 0 | [LRCLIB 1883852](https://lrclib.net/api/get/1883852) | 47 | [官方聆聽](https://lnk.to/Yankee)，YouTube ID 待補 |
| 11 | 1991 | 0 | [LRCLIB 24879963](https://lrclib.net/api/get/24879963) | 17 | [官方聆聽](https://smej.lnk.to/1991)，YouTube ID 待補 |
| 12 | Lemon | 0 | [LRCLIB 65910](https://lrclib.net/api/get/65910) | 37 | [YouTube](https://www.youtube.com/watch?v=SX_ViT4Ra7k) |
| 13 | JANE DOE | 0 | [LRCLIB 26422844](https://lrclib.net/api/get/26422844) | 16 | [YouTube](https://www.youtube.com/watch?v=sPLqsLsooJY) |
| 14 | 海の幽霊 | 0 | [LRCLIB 9920815](https://lrclib.net/api/get/9920815) | 25 | [YouTube](https://www.youtube.com/watch?v=1s84rIhPuhk) |
| 15 | 夜鷹 | 0 | [LRCLIB 37790422](https://lrclib.net/api/get/37790422) | 33 | [YouTube](https://www.youtube.com/watch?v=l2jvIuTp534) |
| 16 | LOSER | 0 | [LRCLIB 1319675](https://lrclib.net/api/get/1319675) | 74 | [YouTube](https://www.youtube.com/watch?v=Dx_fKPBPYUI) |
| 17 | BOW AND ARROW | 0 | [LRCLIB 30476214](https://lrclib.net/api/get/30476214) | 22 | [YouTube](https://www.youtube.com/watch?v=M-Eyhjkepy0) |
| 18 | ピースサイン | 0 | [LRCLIB 10123611](https://lrclib.net/api/get/10123611) | 60 | [YouTube](https://www.youtube.com/watch?v=9aJVr5tTTWk) |
| 19 | KICK BACK | 0 | [LRCLIB 952051](https://lrclib.net/api/get/952051) | 46 | [YouTube](https://www.youtube.com/watch?v=M2cckDmNLMI) |
| 20 | IRIS OUT | 0 | [LRCLIB 24226683](https://lrclib.net/api/get/24226683) | 43 | [YouTube](https://www.youtube.com/watch?v=LmZD-TU96q4) |
| 21 | 春が灯り | 0 | 本次未找到 | — | [官方主題歌公告／預告](https://reissuerecords.net/2026/10/22/kusuriyanohitorigoto_movie/)，YouTube ID 待補 |
| 22 | こんにちはごきげんよう！ | 0 | 本次未找到 | — | [官方主題歌公告／預告](https://reissuerecords.net/2026/11/02/toranitsubasa_movie/)，YouTube ID 待補 |
| 23 | 烏 | 0 | [LRCLIB 36156838](https://lrclib.net/api/get/36156838) | 32 | [YouTube](https://www.youtube.com/watch?v=YjPMupS1Lg4) |
| 24 | 迷える羊 | 0 | [LRCLIB 1319865](https://lrclib.net/api/get/1319865) | 24 | [官方聆聽](https://smej.lnk.to/3OXrrlCi)，YouTube ID 待補 |
| 25 | Plazma | 0 | [LRCLIB 16717326](https://lrclib.net/api/get/16717326) | 28 | [YouTube](https://www.youtube.com/watch?v=fp3F6TqBsAU) |
| 26 | M八七 | 0 | [LRCLIB 13504276](https://lrclib.net/api/get/13504276) | 26 | [YouTube](https://www.youtube.com/watch?v=Zhx1n6uvgUE) |
| 27 | 地球儀 | 0 | [LRCLIB 3069994](https://lrclib.net/api/get/3069994) | 45 | [YouTube](https://www.youtube.com/watch?v=VUsURj_OYdA) |
| 28 | アイネクライネ | 0 | [LRCLIB 1883354](https://lrclib.net/api/get/1883354) | 52 | [YouTube](https://www.youtube.com/watch?v=-EKxzId_Sj4) |

## 程式接線與限制

- 歌曲與連結：`src/song-metadata.js` 的 `tracks` 保存 ID，`SONGS` 產生 `videoSourceUrl`、`listenUrl` 及 `previewUrl`；缺少 ID 時保留官方入口。
- 歌詞載入：`src/services/lazy-modules.js` 的 `loadSongLyrics()` 讀取 `src/song-lyrics.js`。目前得到的仍是 28 個空陣列。
- 外部來源：`karaoke-sources.js` 已包含多來源 worker、AMLL 與 LRCLIB API，以及 LRC／TTML 解析器；網址存在不表示當前曲目已經載入資料。
- 播放器：`src/main.js` 的 `loadKaraokeTiming()` 遇到沒有本地時間的曲目會直接返回待補狀態，因此目前不會自動下載外部原文或用搜尋結果補上空歌詞。
- YouTube 播放透過 IFrame API。本次核對的是程式內的 ID 與連結，未宣稱逐首驗證即時播放、嵌入權限或地區可用性。
- 來源搜尋先使用既有 `find-karaoke-sources.mjs`，查詢歌曲原題／羅馬字與 `Kenshi Yonezu`；另以 `米津玄師` 與合作歌手名稱補查 JANE DOE，並以 `米津玄師` 補查兩首未找到的曲目。AMLL 在本次設定的查詢範圍未返回匹配項目，不能推論整個資料庫沒有這些歌曲。
- 結構檢查只抽查候選，不是完整來源評選。部分項目只有羅馬字，部分 `lyricsfile` 雖存在卻無法由目前解析器讀取；失敗與另選結果保留在 JSON 的 `timingInspection.attempts`。
- 舊歌手的 LRC 位於 `archive/fujii-kaze-2026/`，未作為本次 28 首的內容。

## 驗證

`check:guide`、`check:lyrics`、`check:karaoke`、`check:imports` 與 `build` 皆通過。歌詞／卡拉 OK 檢查明確顯示 **28 songs / 0 lyric lines**；匯入測試的範例成功訊息是在隔離測試目錄產生，不代表正式曲庫已匯入。

目前環境無可用的 `git` 指令，因此無法執行 `git status` 或 `git diff --check`；另以檔案內容檢查本次報告及文件連結、JSON 一致性與行尾空白。
