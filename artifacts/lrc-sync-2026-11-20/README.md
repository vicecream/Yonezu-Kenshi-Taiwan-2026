# 全曲 LRC 跟隨驗收

2026-11-20（Asia/Taipei），v3.0.6。來源從已發布 main 的獨立 worktree 完成，並行的本機讀音工作保留。

- [來源覆蓋報告](coverage.json)：26 首可見歌曲均有可解析的逐行 LRC，合計 1,021 行，與本機 JSON 及網站日文逐列一致。公開 YouTube metadata 顯示可播放及可嵌入，所有最後時間碼均在影片長度內；這是 metadata 檢查，不是即時串流或音訊對齊驗證。
- 〈死神〉原播放入口為 119 秒的[短版 MV](https://www.youtube.com/watch?v=8nxaZ69ElEc)，改用 181 秒的[完整官方音源](https://www.youtube.com/watch?v=YwntuDTDgA8)，同一藝人頻道且說明列出 Sony Music Labels 與 LOST CORNER。
- LRC 以明確的 `timingMode: preview` 啟用逐句跟隨、點句跳轉及逐行高亮；未逐首聽辨或取得可解析的影片字幕時間，不宣稱已精準校正 MV 片頭或段落差異，網站顯示「LRC 逐句同步・影片待校正」。
- 全部原文、987 列中文、來源時間及翻譯標記逐列比對原始快照，均保持不變；19 首完整、7 首部分整理，讀音狀態不納入本次發布。
- [架構報告](architecture/report.json)：55 項通過，26 首逐列時間、原文／中文與同步按鈕、署名、直接網址、手機／桌面、搜尋、前後換歌及首次離線開啟。
- [播放器報告](player/report.json)：88 項通過，逐首測試前段、中段、尾段、倒退與點句跳轉；採可控制時間的 YouTube API fixture，未宣稱已驗證逐首實際串流或音訊對齊。
- [離線轉址回歸](offline-redirect.json)：真實 Service Worker 及 HTTP 308 index 轉址下，首次離線重整首頁與歌曲頁通過。
- `check:guide`、`check:lyrics`、`check:karaoke`、`check:imports`、`check:deployment`、DOM smoke、build 與 `git diff --check` 通過。
