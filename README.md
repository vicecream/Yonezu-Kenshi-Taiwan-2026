# 米津玄師台北演唱會指南

繁體中文非官方粉絲指南，對應 **KENSHI YONEZU 2026-2027 WORLD TOUR / GHOST** 台北場：**2026/12/26（六）、12/27（日）臺北大巨蛋，兩場皆預計 15:00 入場、18:00 開演**。所有時間採 `Asia/Taipei`，實際安排以主辦公告為準。

[正式網站](https://yonezu-kenshi-taiwan-2026.pages.dev/) · [專案儲存庫](https://github.com/vicecream/Yonezu-Kenshi-Taiwan-2026) · [主辦專頁](https://yk2026.abigart.com/?lang=zh) · [藝人官方網站](https://reissuerecords.net/)

目前來源版本為 **3.0.2**，發布內容見[更新紀錄](CHANGELOG.md)。[正式網站](https://yonezu-kenshi-taiwan-2026.pages.dev/)使用 Cloudflare Pages 直接上傳；GitHub 的 main 保管來源，推送不會自動更新目前網站。建置與上傳方式見[部署指南](CLOUDFLARE_DEPLOY.md)。

## 文件導覽

| 需求 | 文件 |
|---|---|
| 演出、票務、交通與圖片的依據 | [內容來源](docs/content-sources.md) |
| 28 首曲目、官方影片與待補資料 | [歌曲來源清單](docs/lyric-sources.md) |
| 提供原文或 LRC | [歌詞資料夾](lyrics/README.md) · [匯入流程](docs/karaoke-import.md) |
| 提供繁體中文翻譯 | [供稿說明](lyrics/translations/README.md) · [翻譯匯入](docs/translation-import.md) |
| 假名與羅馬字 | [讀音維護](docs/furigana.md) |
| 設定新網站 | [Cloudflare Pages 部署](CLOUDFLARE_DEPLOY.md) |
| 開發規範與版本 | [AGENTS](AGENTS.md) · [設計規範](DESIGN.md) · [更新紀錄](CHANGELOG.md) |
| 本機驗收結果與截圖 | [2026-11-17 驗證紀錄](artifacts/browser-qa-2026-11-17/README.md) |
| 實際影片與快捷鍵修正驗證 | [2026-11-18 驗證紀錄](artifacts/browser-qa-2026-11-18/README.md) |
| 完整本機網站架構與離線流程 | [2026-11-18 架構驗收](artifacts/local-architecture-2026-11-18/README.md) |
| 設定、圖片與文字全面檢查 | [2026-11-18 維護紀錄](docs/maintenance-2026-11-18.md) |
| 舊指南、歌詞與測試紀錄 | [歷史封存](archive/fujii-kaze-2026/README.md) |

## 本機開發與檢查

```sh
npm ci
npm run dev
```

開發使用終端實際顯示的 `http://localhost:5173/`；正式建置預覽使用 `npm run build`、`npm run preview`，預設 `http://localhost:4173/`。YouTube 的來源識別可能限制數字 IP，因此指南會將同機的 `127.0.0.1`／`[::1]` 轉至同埠 localhost，保留路徑、查詢及 hash。

```sh
npm run check:guide
npm run check:lyrics
npm run check:karaoke
npm run check:imports
npm run check:deployment
npm run build
git diff --check
```

Node 設定見 `.node-version`；CI 直接讀取該檔。可額外傳入外部安裝的 linkedom 或 Playwright Core 執行 `scripts/check-dom-smoke.mjs`、`scripts/check-player-browser.mjs`。測試依賴不需要加入應用程式套件。

## 功能與資料狀態

- 首頁提供兩場選擇、倒數、票務、座位圖、交通與入場提醒。無手動選擇時優先當日場次，再選下一個演出日期；手動選擇會保存。開演當日維持「已開演」，隔日才視為該場日期已過。
- 28 首依使用者指定順序編號，保留名稱排序、原題／羅馬字／編號搜尋及播放器。編號不是演出順序；`#/setlist` 顯示台北場歌單待確認。
- 20 首已有藝人官方作品頁連結的影片；另 8 首提供官方聆聽或公告入口，完整影片待核實。〈春が灯り〉、〈こんにちはごきげんよう！〉目前只確認主題歌公告與預告，不當成完整 MV。
- 尚未提供米津版歌詞、譯詞、逐行讀音或影片同步時間；四者皆為待補。可用性依實際內容判定，不以空資料啟用讀音、同步或跳句。
- 保留換歌、倍速、簡潔模式及支援瀏覽器的 Document PiP。影片載入、離線及嵌入錯誤有各自提示，另提供官方入口。
- 周邊、票區入口、動線、專屬接駁及未核實的攜入細節維持待公告，不沿用舊場次安排。

## 資料維護位置

| 檔案 | 責任 |
|---|---|
| `src/data.js` | 網站、共用活動、SHOWS、票務、公告與當日行程 |
| `src/show-time.js` | 台灣日期、選定場次、倒數及當日行程狀態 |
| `src/song-metadata.js` | 28 首固定 ID、名稱、專輯、來源、別名與影片 |
| `src/song-lyrics.js` | 延後載入的原文、翻譯、時間及逐首出處 |
| `src/song-content.js` | 原文、翻譯、讀音及同步功能是否可用 |
| `furigana.js`、`src/furigana-corrections.js` | 已核對的逐行假名及羅馬字 |
| `karaoke-sources.js` | 外部時間來源、對齊與快取 |
| `src/main.js`、`src/ui/` | 路由、播放器及共用頁面 |
| `sw.js`、`vite.config.js` | 離線、相對路徑、部署網址與靜態輸出 |

歌詞列沿用 `{ jp, tr, time }`；沒有時間就省略，不能填 0 占位。全文及譯文須保存來源、可使用依據及實際譯者署名；同步僅適用已核對的影片版本。匯入工具預設預覽，明確加上 `--write` 才寫入。

## 離線與發布

先在線上開啟正式建置，等待 Service Worker 快取完成。已快取的程式、活動資訊、圖片及未來提供的本地歌詞可離線閱讀；影片與外部網站需要網路。

瀏覽器偏好、時間來源與 SW 使用 `yonezu-` 命名空間。建置僅複製 `src/data.js` 活動欄位指定的本地圖片，不整批複製圖片資料夾。保留 `public/assets/` 相容資產，但不將其加入新版本的預快取；歷史封存不進入建置輸出。

尚未設定正式網址時，建置不輸出 canonical 與 sitemap，並標記 noindex。新站建立後設定真實的 `SITE_URL`；Cloudflare 可採實際 `CF_PAGES_URL`。GitHub Actions 目前只檢查及建置，不自動發布。正式發版須依 AGENTS 同步版本、PR 歸屬及發布提交連結，目標為本專案的 main。
