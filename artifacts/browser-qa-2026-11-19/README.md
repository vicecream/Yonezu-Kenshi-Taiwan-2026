# 歌曲來源設定驗證

2026-11-19（Asia/Taipei）。本機 Vite 正式建置預覽 `http://localhost:4177/`，Windows Edge。

- `check:guide`、`check:lyrics`、`check:karaoke`、`check:imports`、`build`、`git diff --check` 通過。
- DOM smoke 通過全部 28 個歌曲路由，確認原文、翻譯、讀音與同步仍待補。
- [瀏覽器報告](report.json) 共 46 項通過，無未捕捉錯誤。包含六個新增 YouTube ID、音源／MV 連結文字、待補歌曲切換、375／390／430／768／1440 寬度，以及正式 Service Worker 的離線載入。
- 播放器驗證使用受控 YouTube API fixture；不代表已逐首驗證即時串流、地區限制或實際嵌入權限。
- 另截取 [YELLOW GHOST 官方音源頁](audio-390.png) 與 [春が灯り 公告待補頁](announced-390.png)，確認「在 YouTube 聆聽」與公告／預告標示。這兩張截圖同樣未進行串流播放。

逐首外部來源核對見 [中繼資料](../song-source-review-2026-11-19.json)：26 篇翻譯文章、26 個 LRC 候選及 26 個 YouTube oEmbed 入口。LRC 重試後均能解析；本機正文仍為 0 行，影片時間尚未校正。
