# Cloudflare Pages 部署指南

[專案說明](README.md) · [維護規範](AGENTS.md) · [目標儲存庫](https://github.com/vicecream/Yonezu-Kenshi-Taiwan-2026)

## 目前狀態

米津版來源 v3.0.0 已發布至目標儲存庫 main，對應 [PR #1](https://github.com/vicecream/Yonezu-Kenshi-Taiwan-2026/pull/1)。正式網站尚未建立；目前停在 Cloudflare 登入頁，需完成帳號登入後才能連接儲存庫、部署及驗證正式站。舊指南的部署證據見歷史封存。

## 建置設定

| 欄位 | 值 |
|---|---|
| 產品 | Cloudflare Pages，連接 Git 儲存庫 |
| Repository | vicecream/Yonezu-Kenshi-Taiwan-2026 |
| Production branch | main |
| Project name | 建議 yonezu-kenshi-taiwan-2026，實際名稱依控制台可用值 |
| Framework preset | None |
| Build command | npm run build |
| Output directory | dist |
| Root directory | 儲存庫根目錄 |
| Node | 採 .node-version；CI 也讀取此檔 |
| Functions／資料庫 | 不需要 |

1. 依 AGENTS 檢查 Git 工作目錄、差異與 remote URL，再處理明確要求的發布。
2. 在 Cloudflare 連接上述儲存庫，授權範圍限所需專案，填入建置設定。
3. 等候實際部署成功後，複製控制台分配的 HTTPS 網址，確認首頁與歌曲 hash 路由。
4. 把正式網址填入 Production 的 SITE_URL 並重建；正式 URL 未確認前不得猜測或填入舊網址。
5. 核對部署 SHA、輸出及 HTTP 回應。GitHub Actions 成功僅代表檢查通過。

## 網址與搜尋資訊

網址優先序為 SITE_URL、CF_PAGES_URL、src/data.js 的 SITE.url。SITE.url 目前為 null；有設定時必須是無帳密、查詢及 hash 的 HTTPS 網站根目錄。

沒有網址也能本機建置，但不輸出 canonical、og:url、絕對 og:image 或 sitemap，robots 禁止索引。設定真實網址後，建置才產生對應的分享與搜尋資訊。Preview 使用 Cloudflare 分配的網址；不要手動偽造 CF_PAGES_URL。

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

驗收首頁兩場切換、28 首搜尋、正常影片與待補影片、重新整理歌曲頁、深淺色、手機及桌面版面。Hash 路由使用 `/#/song/Lemon`，不需要新增伺服器路由規則。

線上開啟並等待約 8 秒註冊 SW、完成快取後，再切換離線重整；活動資訊及本地圖片應可閱讀。YouTube、外部網站及未取得的外部字型／時間資料仍需連線。恢復連線後確認播放器可手動重試。

`public/_headers` 提供 nosniff 及 strict-origin-when-cross-origin；本機 preview 不代表 Pages 回應標頭已驗證。部署後需檢查實際 HTTP 標頭、manifest 及各資源狀態。

## 更新與回復

資料維護位置見 README。發布版本需同步 package、鎖檔、BUILD、CACHE_VERSION、HTML 版本參數及 CHANGELOG。Cloudflare 回復舊 deployment 不會修改 Git；來源修正使用新提交，避免改寫歷史。回復後另驗證 SW 更新及新瀏覽器工作階段。

參考：[Pages Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/) · [建置設定](https://developers.cloudflare.com/pages/configuration/build-configuration/) · [Rollbacks](https://developers.cloudflare.com/pages/configuration/rollbacks/)
