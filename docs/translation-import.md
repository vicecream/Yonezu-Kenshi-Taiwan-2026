# 米津歌曲繁中翻譯匯入

[供稿說明](../lyrics/translations/README.md) · [曲目狀態](lyric-sources.md)

目前 28 首均未提供可匯入的繁中譯詞。舊 PDF、照片譯詞、逐句映射與匯入結果已封存，不能套用到米津歌曲。

翻譯可獨立於原文、讀音及同步時間提供。請保存原始檔、實際譯者、來源網址及可使用依據；提供平台與譯者身分須分開記錄。

## 匯入流程

1. 對照固定歌曲 ID 與原文版本。
2. 有原文時逐句對齊；重複段落、拆句及不確定的對應位置另記，不推測缺句。
3. 已對齊的 PDF 依 sources.json、extracted-pairs.json、alignment.json 記錄來源、雜湊及原文對應；直接供稿使用 user-supplied.json。
4. 先執行 `node scripts/import-song-translations.mjs` 預覽，核對後再加 `--write`。
5. 執行 `npm run check:imports`、兩項歌詞檢查與 build。

目前各輸入清單均為空，預覽只會回報沒有已提供的翻譯。匯入不能修改原文或同步時間，也不能因補中文就把 timingStatus 改為 ready。提供節錄時只更新已確認列，不能自動套到後面的重複段落。

尚無原文時先保存譯文供稿，不以中文反推日文或時間。現行匯入檢查使用合成測試，不能視為已有米津全文譯詞。
