# v3.0.1 本機修正驗證

2026-11-18（Asia/Taipei）。Windows Edge，本機正式建置預覽 http://localhost:4174/，視窗約 1266 × 649。

## 實際瀏覽器觀察

- 首頁與兩場日期顯示正常；選擇 12/27 後顯示「已選場次」。
- 曲庫搜尋 Lemon 可顯示〈Lemon〉及專輯為 Lemon 的〈クランベリーとパンケーキ〉。
- 修正前，〈Lemon〉的播放進度持續前進，但影片區空白。原因為影片隱藏樣式誤匹配歌詞來源元件的 pending 狀態。
- 修正後，〈Lemon〉的官方 YouTube 嵌入畫面可見；按「播放影片」後看到實際 MV 與持續前進的播放進度。
- 同頁切到〈YELLOW GHOST〉後，舊 iframe 隱藏，畫面顯示影片入口待核實及官方資訊連結。

上述實際串流觀察只涵蓋〈Lemon〉，不代表其他 19 首影片、正式站、Safari 或實體手機已驗證。

## 程式檢查

- check:guide、check:deployment、build 及 git diff --check 通過。
- DOM smoke 通過；新增 Alt／Ctrl／Meta／Shift＋方向鍵不攔截原生操作、不換歌，以及單獨方向鍵仍可換歌的檢查。
- check-player-browser.mjs 新增可播放影片與從待補影片返回後的可見性斷言。本輪未重新執行該自動瀏覽器腳本；既有 38 項模擬結果仍屬 11/17 的歷史紀錄。

## 尚待確認

最新快捷鍵修正的原生瀏覽器返回操作尚未重測。電腦控制服務連線中斷，Cloudflare 首次部署、正式網址及線上驗收尚未完成；不將建置成功或 GitHub 檢查通過視為已上線。
