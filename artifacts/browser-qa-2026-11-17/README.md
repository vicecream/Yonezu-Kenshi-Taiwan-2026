# 米津台北指南本機驗證

2026-11-17（Asia/Taipei），版本 **3.0.0（尚未發佈）**。本機使用 Node 22.12.0、Vite 7.3.7 及 Windows Edge 無頭瀏覽器；CI 版本設定另由 .node-version 管理。

## 通過項目

- 指南檢查：28 首固定順序、來源、獨立待補狀態、雙場次、台灣日期邊界、文件連結、版本及 SW 離線生命週期。
- 歌詞、卡拉 OK 與匯入：目前 0 行真實歌詞；使用合成文字檢查影片對齊、來源佐證、節錄、不修改原文時間、預覽及隔離寫入。沒有全文影片 ID 時不能宣稱同步完成。
- DOM 路由：兩場選擇及保存、28 首路由、羅馬字／編號搜尋、待補影片、合成讀音與時間、舊歌曲轉換提示及延後載入圖片。
- 正式建置：分別測試未設定網址及指定驗證網域的 metadata、robots、sitemap、預快取資產圖與封存排除，均使用隔離輸出目錄。
- 真實瀏覽器：跨台灣午夜與開演邊界、重新整理後場次選擇、五種尺寸、座位圖完整展開、搜尋、影片錯誤、待補影片停止舊影片及恢復正常影片。
- 真實 Service Worker：離線重新整理後 JS 正常初始化、首次開啟歌曲、座位圖離線讀取。

瀏覽器逐項結果與未捕捉錯誤清單見 [report.json](report.json)。原始資料與相容資產比對見 [封存完整性紀錄](../migration-archive-verification.json)。

## 圖片

- [手機首頁](home-390.png) · [桌面首頁](home-1440.png)
- [桌面預習清單](guide-desktop.png)
- [手機播放器](song-390.png) · [桌面播放器](song-1440.png)

測試尺寸為 375×667、390×844、430×932、768×1024、1440×900。圖片中的影片空白框來自受控 API fixture。

## 範圍與重跑

媒體狀態測試使用受控 YouTube API；**沒有驗證 20 首影片的實際串流播放、正式站、Safari 或實體手機**。官方作品頁提供的影片入口與影片實際可嵌入是不同的驗證項目。正式網站尚未建立，沒有發布或推送。

先完成 production build 並以 localhost:4174 啟動 preview，再將外部安裝的 Playwright Core ESM 入口傳入 scripts/check-player-browser.mjs。可用 YONEZU_QA_BASE_URL、YONEZU_QA_OUTPUT 覆寫預覽網址及輸出目錄。DOM 腳本同樣接受外部 linkedom ESM 入口，需加 Node 的 --experimental-vm-modules。

工作目錄沒有本專案 .git；差異及空白檢查使用修改前快照的獨立 Git 索引，比對目前工作目錄，沒有替使用者建立提交或變更實際索引。
