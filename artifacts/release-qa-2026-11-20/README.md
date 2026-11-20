# v3.0.3 發版整合驗收

2026-11-20（Asia/Taipei）。本次維護以已發布的 v3.0.2 為基礎，保留播放器可見性、瀏覽器快捷鍵及正式站部署文件，發布範圍見 [PR #3](https://github.com/vicecream/Yonezu-Kenshi-Taiwan-2026/pull/3)。

使用 Node 24.16.0、鎖檔指定的 Vite 7.3.7 與 Windows Edge 無頭瀏覽器。在 `node_modules/.cache/yonezu-release-dist` 建立未設定部署網址的隔離 production build，以 localhost:4176 測試。

| 檢查 | 結果與證據 |
|---|---|
| 架構、導覽與 PWA | [56 項通過，0 項失敗](report.json)；28 首直接路由及首次離線開啟均正常，15 項本地資源 HTTP／MIME 正確 |
| 播放器與離線 | [44 項通過，0 個未捕捉錯誤](player/report.json)；包含待補歌詞不誤隱藏影片、從待補曲目返回後恢復影片可見性 |
| DOM 與快捷鍵 | check-dom-smoke 通過，包含 Alt／Ctrl／Meta／Shift＋方向鍵保留原生操作及單獨方向鍵換歌 |
| 指南、版本與文件 | check:guide 通過；v3.0.3 標記一致、既有版本紀錄與 PR 歸屬保留 |
| 部署設定 | check:deployment 的無網址與指定網址建置均通過，圖片僅帶入目前活動原檔，歷史封存排除 |
| 建置與文字 | npm run build 及 git diff --check 通過；正式發布提交與後續 changelog 連結依專案流程分開建立 |

[手機首頁](home-mobile.png) · [桌面曲庫](guide-desktop.png) · [清單尾端](guide-end-mobile.png) · [待補歌曲](pending-song-mobile.png) · [桌面歌曲頁](player/song-1440.png)

本次媒體狀態使用受控 YouTube API fixture；沒有新增實際串流、原生 PiP、Safari 或實體手機驗收。先前〈Lemon〉的實際播放觀察保留於[原驗證紀錄](../browser-qa-2026-11-18/README.md)，不延伸宣稱其他曲目已播放。

僅更新 GitHub 來源；目前正式站使用 Direct Upload，網站部署另行處理。重跑方式沿用[架構驗收說明](../local-architecture-2026-11-18/README.md#重跑)，將輸出目錄改為本目錄，並設定 `YONEZU_QA_BASE_URL=http://localhost:4176/`。
