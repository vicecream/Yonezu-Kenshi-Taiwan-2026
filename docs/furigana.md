# 米津歌曲日文讀音維護

[歌詞來源](lyric-sources.md) · [匯入流程](karaoke-import.md)

目前曲庫 28 首皆以日文歌曲處理，逐行歌詞及讀音尚未提供；readingsStatus 維持 pending。歌名的羅馬字用於搜尋，不能當成逐行歌詞讀音。

逐行假名與羅馬字分別維護於 furigana.js、src/furigana-corrections.js，或隨原文 manifest 的 readings 一併提供。只加入已核對的米津原文，不沿用其他歌手對照。

每個 ruby 去除標記後必須與原文相同，漢字需對應正確假名；羅馬字不能遺漏日文行或夾帶日文。原文尚未取得、讀音不完整或只提供中文時，讀音控制保持停用。

```sh
npm run check:lyrics
npm run check:karaoke
npm run check:imports
```

目前檢查涵蓋 pending 狀態、對齊演算法及合成測試；沒有宣稱已完成米津歌詞假名。實際內容補齊後，再對各行及當前影片時間重新驗證。
