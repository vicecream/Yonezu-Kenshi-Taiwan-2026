# 米津台北指南維護驗證

2026-11-18（Asia/Taipei），工作版本 **3.0.1（尚未發佈）**。使用 Node 24.16.0、Vite 7.3.7 與 Windows Edge 無頭瀏覽器，在 localhost:4174 的正式建置執行既有測試。維護範圍與官方資料核對見[全面維護紀錄](../../docs/maintenance-2026-11-18.md)。

## 結果

[report.json](report.json) 共記錄 **42 項通過**，未捕捉的應用程式錯誤為 0。

- 雙場次自動選擇、手動保存、台灣午夜與開演邊界正常。
- 票務資訊顯示主辦公告的退票期限與 5% 手續費。
- 座位圖展開後才建立圖片，375×667、390×844、430×932、768×1024、1440×900 均無水平溢出或圖面裁切。
- 28 首顯示、羅馬字搜尋、舊連結及直接開啟歌單待確認頁正常。
- 從影片換至已公告新曲時停止舊影片；延遲回呼不會啟動待補歌曲，切回有影片曲目可復用播放器。
- 直接開啟待補歌曲與繁中除錯文字正常。
- 真實 SW 註冊與接管、離線重整、首次離線載入歌曲資料及座位圖正常；提示明示僅可閱讀已快取內容。

## 截圖

- [手機首頁與座位圖](home-390.png) · [桌面首頁與座位圖](home-1440.png)
- [桌面預習清單](guide-desktop.png)
- [手機歌曲頁](song-390.png) · [桌面歌曲頁](song-1440.png)

已目視檢查手機首頁與桌面歌曲頁；影片空白框來自受控 API fixture。測試將日期固定在演出日以驗證場次邊界，截圖倒數並非驗收日的即時倒數。

## 範圍與重跑

媒體狀態以受控 YouTube API fixture 檢查，沒有驗證 20 首影片的實際串流、正式站、Safari 或實體手機。第三方字型不屬於此次連線驗證範圍。

先執行 `npm run build`，再啟動 `npm run preview -- --host localhost --port 4174 --strictPort`。將外部安裝的 Playwright Core ESM 入口傳給 `node scripts/check-player-browser.mjs <入口>`，並設定 `YONEZU_QA_BASE_URL=http://localhost:4174/`、`YONEZU_QA_OUTPUT=artifacts/browser-qa-2026-11-18`；測試工具未加入網站依賴。DOM 驗證同樣可使用外部 linkedom，詳見[專案說明](../../README.md#本機開發與檢查)。
