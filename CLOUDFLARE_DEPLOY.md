# Cloudflare Pages 部署指南

[專案說明](README.md) · [維護規範](AGENTS.md) · [目標儲存庫](https://github.com/vicecream/Yonezu-Kenshi-Taiwan-2026)

## 目前狀態

正式網站為 https://yonezu-kenshi-taiwan-2026.pages.dev/，Cloudflare Pages 專案名稱為 yonezu-kenshi-taiwan-2026。2026-11-27 已部署 v3.1.0 至 Production，來源為 main 的 `4ec07dfd70b0017a03133c99cf9e71128926ccaf`；部署 ID 為 `4f1901be-d75f-40b9-8d55-015f8962e243`。已核對 35 個公開檔案的 SHA-256、首頁、正式網址與 SW 版本，詳見[本次發布驗證](artifacts/release-v3.1.0/README.md)及[部署紀錄](artifacts/release-v3.1.0/deployment.json)。

目前採 Direct Upload，沒有 Git connection；GitHub main 與 GitHub Actions 的成功不代表網站已更新。上一版 v3.0.6 的驗收保留於[歷史正式站紀錄](artifacts/production-v3.0.6-2026-11-20/README.md)。

## 建置設定

| 欄位 | 值 |
|---|---|
| 產品 | Cloudflare Pages，Direct Upload |
| 來源儲存庫 | vicecream/Yonezu-Kenshi-Taiwan-2026，main |
| 部署環境 | Production |
| Project name | yonezu-kenshi-taiwan-2026 |
| 建置位置 | 本機 Vite 建置 |
| Build command | SITE_URL 設為正式網址後執行 npm run build |
| Output directory | dist |
| Root directory | 儲存庫根目錄 |
| Node | 採 .node-version；CI 也讀取此檔 |
| Functions／資料庫 | 不需要 |

1. 依 AGENTS 檢查 Git 工作目錄、差異與 remote URL，再處理明確要求的發布。
2. 在本機將 SITE_URL 設為 https://yonezu-kenshi-taiwan-2026.pages.dev/，再執行 npm run build。
3. 將 dist 內的檔案打包成 ZIP；index.html 必須位於 ZIP 根目錄，不能再包一層 dist，也不能包含來源、node_modules 或 archive。
4. 在既有 Pages 專案選 Create deployment、Production，上傳 ZIP 並部署；或使用已授權的 Wrangler 上傳 dist 目錄。Wrangler 接受目錄，ZIP 用於控制台上傳。不要因為目前沒有 Git connection 就重複建立同名專案。
5. 等候成功後，核對 Production 部署、首頁、歌曲 hash 路由、SW 版本及實際靜態檔案。使用來源 SHA、ZIP SHA-256 及部署 ID 保存對應；Wrangler 可用 `--commit-hash` 記錄實際建置來源。

PowerShell 建置範例：

```powershell
$env:SITE_URL = "https://yonezu-kenshi-taiwan-2026.pages.dev/"
npm.cmd run build
```

本次已使用 Wrangler `4.168.0` 完成上傳；先確認既有專案及 Production branch 為 main，再以實際建置提交執行：

```powershell
npx.cmd --yes wrangler@4.168.0 pages project list
npx.cmd --yes wrangler@4.168.0 pages deploy dist --project-name yonezu-kenshi-taiwan-2026 --branch main --commit-hash 4ec07dfd70b0017a03133c99cf9e71128926ccaf --commit-message 'chore(release): publish guide v3.1.0' --commit-dirty=true
npx.cmd --yes wrangler@4.168.0 pages deployment list --project-name yonezu-kenshi-taiwan-2026
```

本次工作目錄另有未納入建置的本機校對資料，因此如實設定 `--commit-dirty=true`；上傳範圍只包含 dist。後續發布須換成當次實際來源 SHA，並依工作目錄狀態設定此旗標。

## 網址與搜尋資訊

網址優先序為 SITE_URL、CF_PAGES_URL、src/data.js 的 SITE.url。SITE.url 目前為 null；有設定時必須是無帳密、查詢及 hash 的 HTTPS 網站根目錄。

沒有網址也能本機建置，但不輸出 canonical、og:url、絕對 og:image 或 sitemap，robots 禁止索引。正式 Direct Upload 必須在本機建置時設定上述 SITE_URL；Cloudflare 不會替已上傳的靜態檔案補上建置變數。不要手動偽造 CF_PAGES_URL。

本專案不含有效 CNAME。日後有自訂網域時，先完成 Cloudflare Custom domains 與 HTTPS，再更新 SITE_URL。原 GitHub Pages 部署工作流程已改為純檢查流程，不同時發布兩個網站。

## 本機與上線驗收

```sh
npm ci
npm run check:guide
npm run check:lyrics
npm run check:karaoke
npm run check:imports
npm run check:deployment
npm run build
git diff --check
npm run preview
```

驗收首頁兩場切換、26 首可見歌曲搜尋、中文對照與完整／部分狀態、兩首隱藏歌曲的網址、重新整理歌曲頁、深淺色、手機及桌面版面。完整曲庫保留 28 首，前後換歌須跳過隱藏曲。Hash 路由使用 `/#/song/Lemon`，不需要新增伺服器路由規則。

線上開啟並等待約 8 秒註冊 SW、完成快取後，再切換離線重整；活動資訊及本地圖片應可閱讀。YouTube、外部網站及未取得的外部字型／時間資料仍需連線。恢復連線後確認播放器可手動重試。

`public/_headers` 提供 nosniff 及 strict-origin-when-cross-origin；本機 preview 不代表 Pages 回應標頭已驗證。部署後需檢查實際 HTTP 標頭、manifest 及各資源狀態。

## 更新與回復

資料維護位置見 README。發布版本需同步 package、鎖檔、BUILD、CACHE_VERSION、HTML 版本參數及 CHANGELOG。Cloudflare 回復舊 deployment 不會修改 Git；來源修正使用新提交，避免改寫歷史。回復後另驗證 SW 更新及新瀏覽器工作階段。

參考：[Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/) · [Pages Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/) · [建置設定](https://developers.cloudflare.com/pages/configuration/build-configuration/) · [Rollbacks](https://developers.cloudflare.com/pages/configuration/rollbacks/)
