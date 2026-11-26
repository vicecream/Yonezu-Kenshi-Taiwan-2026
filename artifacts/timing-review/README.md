# 歌詞時間軸初步校對資料

- [逐句 CSV](line-timing.csv)：26 首、1,021 句，含原始時間、網站時間、初始修正欄位、日文、中文、狀態與缺漏提示。
- [逐字 CSV](word-timing.csv)：校對頁新草稿會填入的字詞秒數；缺值留空。
- [全部字詞候選 CSV](candidate-word-timing.csv)：包含未自動採用的低信心候選、分數與異常提示，供逐詞比較。
- [曲庫 JSON](catalog.json)：來源與音訊候選快照，含來源檔 SHA-256、影片 ID、時間線指紋與字詞分組。
- [來源句尾檢查](source-audit.json)：補回 25 首、1,003 句原始 JSON 的結束秒數；原文與開始秒數不變。
- [音訊對齊紀錄](audio-alignment.json) · [候選結構驗證](candidate-validation.json)：逐首處理狀態、筆數及待聽校範圍。
- [操作說明](../../docs/timing-review.md)：啟動校對網頁、修改起訖、匯出與接續。
- [短空檔接續結果](gap-extension/report.json) · [目前保留的接續](gap-extension/active-extensions.csv) · [撤回舊延長](gap-extension/restored.csv) · [調整後全曲逐句 CSV](gap-extension/line-timing.csv)：以人工草稿優先整理 26 首，僅接續 2 秒內（含 2 秒）的空檔；原始來源與上方初始候選檔不變。5 秒舊紀錄留在 `gap-extension/history-5s/`。重跑方式與完整備份位置見[接續說明](../../docs/timing-review.md#接續短句間空檔)。
- [接續預覽驗證](gap-extension/qa/results.json)：使用 26 首已保存草稿的隔離副本，確認 2 秒內空檔延續、下一句交接、超過門檻的空檔保留、尾字漸進及桌機／手機版面；播放器時鐘為合成測試，不代表真實 YouTube 或人工聽校通過。
- [影片音訊來源檢查](video-audit/report.json) · [逐句影片／模型時間比較](video-audit/line-timing-audit.csv)：逐首核對 26 份指定影片原音、雜湊、完整片頭及時間長度；模型秒數另列比較，未執行新的實聽，不產生通過紀錄。
- [手動區段音訊重算](qa-manual-alignment/actual-audio.json) · [手動區段介面驗證](qa-manual-alignment/browser-results.json)：前者以〈Flamingo〉指定影片原音在 16.310～20.570 秒內實際重算字詞，句子邊界不變；後者在隔離儲存使用合成模型／通過紀錄，驗證逐句通過保留、逐字通過撤銷、失敗、取消及跨分頁衝突。兩者均不代表人工聽校通過。

用 `npm.cmd run timing:export` 重新產生。秒數包含原始資料及音訊模型的初步候選，全部保留待聽校；沒有按字數平均分配時間。〈1991〉最後一句仍缺來源句尾，不補造來源數值；若有音訊候選結尾，會分別列示。既有 MV 偏移只套用一次。人工修正另存專案外，不受這個指令覆蓋。

本機資料、伺服器與 Edge 無頭瀏覽器驗證已通過，見[驗證結果](qa/results.json)、[桌面截圖](qa/desktop.png)及[手機截圖](qa/mobile.png)。測試使用隔離暫存目錄、合成 YouTube API 與無聲 WAV，未寫入真正的聽校紀錄，亦不代表實際 YouTube 播放或歌唱時間已核實。

[真實候選資料介面驗證](qa-candidates/results.json)及[截圖](qa-candidates/desktop.png)使用本輪音訊產生的秒數，確認填入、原文、待聽校狀態及手機版面，不產生人工通過紀錄。正式指南另經[播放器回歸](qa-production-player/report.json)與[路由／離線驗證](qa-production-architecture/report.json)檢查。
