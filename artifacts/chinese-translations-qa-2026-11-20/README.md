# 全曲中文對照匯入驗證

2026-11-20（Asia/Taipei）。Windows Edge，本機正式建置預覽 `http://localhost:4180/`。

- 26 首、1,021 列原文逐首比對；987 列已有中文，19 首完整、7 首部分整理。34 列沒有中文，另 16 列內的和聲或片段待補。
- 全部日文原文與來源時間保持不變；未因補中文開啟逐行讀音、影片同步或跳句。供稿原措辭與字元範圍、原文／供稿雜湊均有檢查，未確認的片語及未提供的哼唱不補寫。
- `check:guide`、`check:lyrics`、`check:karaoke`、`check:imports`、`check:deployment`、DOM smoke、build 與 `git diff --check` 通過。
- [架構與對照報告](architecture/report.json) 55 項通過，逐首核對實際日文與中文列、來源署名、完整／部分狀態、中文／原文開關、保存偏好、搜尋、排序、選歌與首次離線讀取全部可見歌曲。
- [播放器報告](player/report.json) 62 項通過，涵蓋兩首隱藏曲、舊回應／延遲歌詞載入、原預習編號、前後換歌、375／390／430／768／1440 寬度與真實 Service Worker 離線啟動。
- 沒有未捕捉的應用程式錯誤或失敗的本機資源。外部影片與字型在架構測試中刻意阻擋，播放器狀態採受控 YouTube API fixture；不代表已驗證即時 YouTube 串流。

逐首來源與待補範圍見[中文對照報告](../translations-alignment-review-2026-11-20.md)；GitHub 來源推送與 Cloudflare Direct Upload 為不同步驟。
