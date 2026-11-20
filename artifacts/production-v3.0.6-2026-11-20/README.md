# v3.0.6 正式站驗收

2026-11-20（Asia/Taipei），Cloudflare Pages Production Direct Upload。

- 正式網址：[米津玄師 GHOST 台北指南](https://yonezu-kenshi-taiwan-2026.pages.dev/)。
- 部署 ID：`272a4f73-1877-4cd8-8a8a-73ed5d93c8d7`；控制台時間：2026-11-20T14:31:03.271083Z（台北 22:31）。
- 部署來源：[`1380485de0eeb4ffb6514d3238c522b81f2c1d1d`](https://github.com/vicecream/Yonezu-Kenshi-Taiwan-2026/commit/1380485de0eeb4ffb6514d3238c522b81f2c1d1d)，發布提交：[`a6d0180dbded9a7c48da86c98a6ec5422dc75cde`](https://github.com/vicecream/Yonezu-Kenshi-Taiwan-2026/commit/a6d0180dbded9a7c48da86c98a6ec5422dc75cde)。
- ZIP SHA-256：`dd64537e69c0abe5ed71efec2c293ac1b737f2d5227b51d8ae993beb46a814eb`；36 個部署檔案的根目錄包含 index.html，使用已核實的正式 SITE_URL 建置。
- [公開檔案報告](published-files.json)：35 個公開檔案與本機部署包逐位元一致，HTTP 200、版本、canonical／sitemap、nosniff 及 referrer-policy 均通過；`_headers` 是部署設定，不是公開資產。
- [架構報告](architecture/report.json)：55 項通過，涵蓋全部 26 首的原文、中文、逐行時間、同步按鈕、手機／桌面及隱藏曲；另在真實 SW 快取後，首次離線重整首頁及逐首重新整理全部歌曲頁均成功。
- [播放器報告](player/report.json)：88 項通過，逐首檢查前、中、尾段及倒退的高亮、自動捲動、正常點句跳轉，另含真實 SW 離線啟動與兩首隱藏曲狀態，無未捕捉應用程式錯誤。
- 播放器使用受控 YouTube API fixture；網站明示「LRC 逐句同步・影片待校正」，未宣稱已核實逐首即時串流或 MV 音訊對齊。
- 剛部署後立即檢查曾取得不一致的檔案回應；稍後完整逐位元比對通過。保留[首輪](player-initial.json)、[第二輪](player-second.json)及[第三輪](player-third.json)未完成的測試報告；後續檢查補上遠端圖片完成、歌曲資料就緒的等待，並以正常點擊等待捲動穩定，避免強制點擊移動中的歌詞。正式站最終為 55＋88 項通過。

本次非執行時的測試及驗收紀錄更新不影響已部署建置；其餘並行本機讀音變更保留。
