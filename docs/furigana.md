# 米津歌曲日文讀音維護

[歌詞來源](lyric-sources.md) · [匯入流程](karaoke-import.md)

26 首已匯入原文的歌曲，共 1,021 行（792 個不同句子），均提供振り仮名及羅馬拼音；`readingsStatus` 為 `ready`。播放器「讀音」按鈕依序切換「振り仮名 → 羅馬拼音 → 假名＋拼音」，並以 `yonezu-reading` 保存偏好，換歌、重新開啟及已快取的離線頁面都沿用選擇。兩首隱藏曲無原文，仍維持 `pending`。

這是依使用者供稿原文產生的參考讀音：以 [Kuromoji](https://github.com/takuyaa/kuromoji.js) 分詞及 [Kuroshiro](https://github.com/hexenq/kuroshiro) 產生 ruby，另維護詞彙修正，例如「二人／ふたり」「彷徨う／さまよう」「昏い／くらい」。不是官方逐字讀音或逐首聽辨紀錄；供稿的異體、錯字及片段原樣保留，不為了讀音自行改詞。歌曲特殊唱法可再以全文覆寫修正。

`furigana.js` 是產生後的逐行表；詞彙修正在 `lyrics/readings/overrides.json`，完整句子的人工覆寫在 `src/furigana-corrections.js`。也可隨原文 manifest 的 `readings` 提供全文對照。只處理目前米津供稿，不讀取封存資料。工具及字典只在整理資料時使用，不加入應用程式相依套件，也不在使用者裝置即時轉換。

羅馬拼音以 Hepburn 為基礎，助詞使用 wa／e／o；一般長音保留 ou／ei，片假名長音符號可呈現為 ā／ī／ū／ē／ō。原有英文及未指定讀法的數字保留；「100」「4443」另附假名讀法。ruby 移除 `rt` 後必須完全還原原文，全部漢字皆需假名；羅馬拼音不能漏行或夾帶日文。原文尚未取得、讀音不完整或只提供中文時，控制保持停用；讀音檔載入失敗時可點選「重試讀音」。

重新產生時，先將固定版本工具安裝在忽略的工具目錄，再執行預覽與寫入：

```sh
npm install --prefix node_modules/.cache/reading-tools --no-audit --no-fund --package-lock=false kuromoji@0.1.2 kuroshiro@1.2.0 kuroshiro-analyzer-kuromoji@1.1.0
node scripts/generate-readings.mjs node_modules/.cache/reading-tools
node scripts/generate-readings.mjs node_modules/.cache/reading-tools --write
node scripts/import-song-lyrics.mjs lyrics/import-manifest.json --write
node scripts/generate-readings.mjs node_modules/.cache/reading-tools --check
```

新增漢字但字典沒有讀音、未用到修正規則、共用句子發生衝突，工具都會停止。修改原文後須重建讀音，再透過匯入同步每首狀態；不要只把 `readingsStatus` 改為 `ready`。

```sh
npm run check:lyrics
npm run check:karaoke
npm run check:imports
```

檢查涵蓋全文完整性、ruby 還原、日文字元漏入拼音、促音／拗音及對齊演算法。對齊使用合成時間測試，不等於已核對實際 YouTube 串流或影片逐字時間。
