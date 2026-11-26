# v3.1.0 發布驗證

2026-11-27，時間採 Asia/Taipei。發布提交：[5a05bf7](https://github.com/vicecream/Yonezu-Kenshi-Taiwan-2026/commit/5a05bf7c7067f822fc105027f7d5c2b971ad7bd3)；功能與更新紀錄見 [PR #8](https://github.com/vicecream/Yonezu-Kenshi-Taiwan-2026/pull/8)。

- [架構／讀音／全曲離線驗證](architecture-named-origin/report.json)：58 項通過、0 項失敗；正式 SITE_URL 建置，26 首直接路由、三種讀音、讀音重試、手機／桌面與首次離線開啟。
- [播放器／逐句同步驗證](player/report.json)：88 項通過，沒有未捕捉錯誤；播放器使用受控 YouTube API，不代表真實串流或人工聽校通過。
- [發布檔案清單與 SHA-256](package.json)：以已核實的正式網址建置 dist，保留 ZIP 雜湊及每份輸出檔案的大小與雜湊。
- [公開網站驗證](live/report.json)：正式網址另行完成 58 項檢查、0 項失敗，涵蓋 26 首直接路由、振り仮名／羅馬拼音／雙重顯示、手機與桌面、全曲首次離線開啟；外部影音及字型請求封鎖，未將此結果視為真實 YouTube 播放或人工聽校。
- [Production 部署紀錄](deployment.json)：部署 ID `4f1901be-d75f-40b9-8d55-015f8962e243`，建置來源為已合併 main 的 `4ec07dfd70b0017a03133c99cf9e71128926ccaf`；35 個公開檔案與本機 dist 的 SHA-256 全數一致，並確認正式 canonical、`nosniff` 回應標頭與 `v3.1.0` SW。

正式網址：https://yonezu-kenshi-taiwan-2026.pages.dev/ 。本次部署專屬網址：https://4f1901be.yonezu-kenshi-taiwan-2026.pages.dev/ 。發布 ZIP 的 SHA-256 為 `38d3f83f8985da1f812eaa5c4a0709e1aa3fdb4e6218d5d593b77d681a340276`。

本機校對工具、原音、模型及人工草稿不加入正式網站輸出。Cloudflare 採既有 Pages 專案 Direct Upload，GitHub 推送與網站部署分別驗證。
