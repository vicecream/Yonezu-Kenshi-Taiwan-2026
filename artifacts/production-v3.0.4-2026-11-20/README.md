# v3.0.4 正式站驗收與離線問題

2026-11-20（Asia/Taipei）。此版本的離線重整問題由後續 v3.0.5 修正。

- 來源：`55b7767cdcdf4ad246223f223b4ae1058e833638`，發布提交：`ed48431241f415edb235361a9983477a92b0fbde`。
- Production 部署 ID：`d935a2b6-ba81-4326-b4ac-dbf5c1c7133d`，控制台時間 2026-11-20T10:08:27.199405Z。
- ZIP SHA-256：`4222fe0333095f55996c3d3c110751c97811067814e94e5f000c23ded027af7a`。
- [公開檔案比對](published-files.json)：35 個公開檔案與設定正式網址的本機建置逐位元一致，HTTP 回應標頭、版本與分享網址通過。`_headers` 是部署設定，不是公開資產。
- [架構檢查](architecture/report.json)：55 項通過，包括全曲中文對照與初次離線切換歌曲；此流程切換 hash，沒有重整離線首頁。
- [播放器檢查](player/report.json)：啟用真實 SW 後首次離線重整首頁失敗，後續離線檢查未執行，不能宣稱此輪全部通過。外部媒體狀態採受控 API，不代表即時 YouTube 串流已驗證。
- [原始診斷](offline-diagnostic.json)與[快取回應正規化診斷](offline-diagnostic-normalized.json)：Cloudflare 將 `/index.html` 以 HTTP 308 轉到 `/`，快取的 index 回應 `redirected` 為 true；沿用相同正文、狀態與標頭建立新回應後，首次離線重整成功。新增 `scripts/check-offline-redirect.mjs` 在本機重現相同失敗並驗證修正。

平台行為依據：[Cloudflare Serving Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/)。
