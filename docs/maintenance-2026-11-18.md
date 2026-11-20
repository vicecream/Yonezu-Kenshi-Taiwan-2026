# 米津玄師 2026 台北指南全面維護

檢查日期：2026-11-18（Asia/Taipei）。工作版本 **3.0.1（尚未發佈）**，本次為內容、設定及圖片維護，採 PATCH 升版。沒有建立提交、推送或部署。

以上為發布前的檢查快照；整合遠端已發布的 v3.0.2 後，本次維護納入 v3.0.3。後續來源發布狀態見 [README](../README.md) 與 [CHANGELOG](../CHANGELOG.md)，本紀錄不代表網站部署結果。

## 掃描範圍與處理

| 範圍 | 結果與維護 |
|---|---|
| 活動與票務 | 重新讀取[主辦專頁公開資料](https://yk2026.abigart.com/data.js)及[官方巡演公告](https://reissuerecords.net/2026/10/22/kenshi-yonezu-2026-2027-world-tour-ghost/)。12/26、12/27 臺北大巨蛋，兩場皆預計 15:00 入場、18:00 開演；更新查核日期，補上主辦退票規則。 |
| 售票與入場狀態 | 保留全場實名制、證件正本、年齡與拍攝限制。11/19 12:00 一般販售仍依剩餘票況及公告，不能據日期推論有票。領票、周邊、動線及專屬接駁未核實部分維持待公告。 |
| 圖片 | 目視檢查桌機海報、手機海報、座位圖及 PWA 圖示；三張活動圖片重新下載後的 SHA-256 與本地一致。 |
| 舊圖片 | 三張舊高雄場圖片與既有封存逐一比對雜湊後，移除有效目錄中的重複檔，共 738,313 bytes。封存及 public/assets 相容檔維持原樣。 |
| 建置與快取 | Vite 僅複製活動欄位指定的圖片；SW 預快取維持米津版資產與 yonezu 命名空間。同步 package、鎖檔、BUILD、CACHE_VERSION 及 HTML 版本。 |
| HTML 與文字 | 清理過時的入口註解，將除錯文字改為繁體中文；離線提示明示已快取活動資訊與本地內容，不宣稱待補歌詞及應援已可使用。首頁提醒保留「預計」入場。 |
| 設定檔 | manifest、圖示來源、robots、sitemap、Vite、Node 與 CI 設定均檢視；規格工具設定繁體中文，空白範本補入目前專案背景。SITE.url 保持 null，CI 僅檢查建置。 |
| 歌曲與內容 | 28 首 ID、固定預習編號及官方來源狀態維持；20 首有影片入口、8 首完整影片待核實。原文、翻譯、讀音及同步時間仍待補，公告與預告不當作完整歌曲影片。本次未重新逐首核對歌曲來源或驗證 YouTube 串流。 |
| 歷史與署名 | 歷史歌名、舊連結、遷移測試及原作者署名屬追溯資料，保留於封存、版本紀錄、相容檔及程式來源說明，未替換成米津演出事實。 |

## 圖片核對

| 本地圖片 | 官方原檔 SHA-256 |
|---|---|
| images/ghost-poster.jpg | `1b01957963675e1750751fee23c0b5c48a23a62f47e15c8ebd5848ed11a08dc3` |
| images/ghost-poster-mobile.jpg | `7b214641ed85427d6b956bf221f56ad534d1d6350f6cfda275462f1812f65e8f` |
| images/taipei-seat-map.jpg | `954c9e3e6258766b0d87130017af44a9772ac11996fa41fa0015077e7bd381c4` |

原檔網址見[圖片來源](content-sources.md#圖片與圖示)。主辦公開 data.js 本次下載的 SHA-256 為 `1d6aef8dc14ade7b3f067933a0a4fb72c2d20449b5c066520ad1bdba4e6d5d63`，僅讀取文字，沒有執行第三方腳本。

## 驗證與限制

已通過以下檢查：

- `npm run check:guide`：28 首資料狀態、雙場次、跨時區邊界、版本、文件與 SW 生命週期。擴大現行來源掃描、檢查 HTML 版本參數，並修正 CRLF 換行造成的版本誤判。
- `npm run check:lyrics`、`npm run check:karaoke`、`npm run check:imports`：目前 0 行真實歌詞；合成資料的讀音、時間對齊及隔離匯入通過，未新增歌詞。
- `npm run build`、`npm run check:deployment`：無網址及指定驗證網址的建置通過；有效圖片只有三張官方原檔，沒有封存目錄。未設定網址時仍為 noindex，沒有 canonical 或 sitemap。
- `scripts/check-dom-smoke.mjs`：雙場次、28 首路由、搜尋、待補與舊連結狀態通過。
- `scripts/check-player-browser.mjs`：Windows Edge 無頭瀏覽器共 42 項通過，五種尺寸、實際頁面路由、主辦退票文字、待補影片轉換、繁中除錯文字及真實 SW 離線內容均正常，沒有未捕捉的應用程式錯誤。見[逐項結果與截圖](../artifacts/browser-qa-2026-11-18/README.md)。
- `git diff --check`：通過；歷史封存與 public/assets 相容檔沒有變更。

正式網站尚未建立；本次本機驗證不能代表正式部署、Safari 或實體手機驗收。媒體錯誤與換歌狀態使用受控 YouTube API fixture，沒有驗證實際影片串流。

套件檢查發現 picomatch 4.0.7 的既有 ReDoS 公告，npm audit 共列 4 項 high（同一問題連帶標記 picomatch、fdir、tinyglobby、Vite）。[上游公告](https://github.com/advisories/GHSA-fc5q-39xc-vjpf)目前未列修補版；本次保留鎖檔依賴，沒有依 npm 建議強制降版 Vite。此依賴用於開發建置；網站輸出為靜態檔案，未將該 Node 套件當成網站執行服務。
