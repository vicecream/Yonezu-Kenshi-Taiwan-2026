# YELLOW GHOST 中文供稿匯入驗證

2026-11-20（Asia/Taipei）。Windows Edge，本機 Vite 正式建置預覽 `http://localhost:4180/`。

- 使用者提供的全部中文依原順序對齊 30／34 列；兩處括號和聲與末尾四列 Yeah 未補寫，維持部分整理。
- 原文、來源時間、其他歌曲及讀音／影片同步待補狀態均保留。譯者未註明，顯示「使用者提供（譯者未註明）」。
- `check:guide`、`check:lyrics`、`check:karaoke`、`check:imports`、`build`、`git diff --check` 通過；另檢查對齊後的中文依序保留原稿全部文字。
- [瀏覽器報告](report.json) 包含實際路由、中文開關及偏好保存、375／390／768／1440 寬度、其他歌曲待補狀態，以及正式 Service Worker 的離線中文載入，無未捕捉錯誤。
- [手機截圖](yellow-ghost-390.png)與[桌面截圖](yellow-ghost-1440.png)已檢視。本次內容檢查刻意阻擋外部影片與字型請求，影片區顯示連線失敗；不代表已測試即時 YouTube 播放。
- 既有受控 YouTube API 瀏覽器檢查另全數通過，涵蓋待補影片切換與離線啟動；同樣不代表已驗證實際串流或嵌入權限。
