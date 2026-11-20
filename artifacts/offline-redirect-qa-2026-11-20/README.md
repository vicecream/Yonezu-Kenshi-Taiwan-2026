# v3.0.5 離線重整回歸

2026-11-20（Asia/Taipei）。Windows Edge，真實 Service Worker 與本機正式建置。

- [308 轉址報告](report.json)：初次快取保存真正 redirected 回應的前提下，首次離線重整首頁、初次開啟〈Lemon〉及再次離線重整歌曲頁均成功，無未捕捉錯誤。修正前同一腳本在首頁重整重現 `net::ERR_FAILED`。
- [播放器回歸](player/report.json)：62 項通過，涵蓋隱藏曲、中文內容、手機與桌面版面、真實 SW 離線啟動；媒體狀態採受控 API，不代表即時 YouTube 串流已驗證。
- `check:guide`、`check:deployment`、正式建置與 `git diff --check` 通過。歌詞文字及來源映射未再修改。
- 正式站發現的問題與部署包對應見 [v3.0.4 診斷](../production-v3.0.4-2026-11-20/README.md)。

重跑轉址回歸：`node scripts/check-offline-redirect.mjs <外部 Playwright Core ESM 路徑>`。
