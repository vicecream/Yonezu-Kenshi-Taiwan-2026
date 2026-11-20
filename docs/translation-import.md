# 米津歌曲繁中翻譯匯入

[供稿說明](../lyrics/translations/README.md) · [曲目狀態](lyric-sources.md)

2026-11-20 已匯入使用者提供的 26 首繁中稿，共 987／1,021 列有中文；19 首完整、7 首部分整理。34 列未附譯文，另有 16 列內的和聲或片段待補，詳見[逐首對照報告](../artifacts/translations-alignment-review-2026-11-20.md)。原文、`sourceTime`、讀音與同步待補狀態保持不變。映射與使用依據見 [user-supplied.json](../lyrics/translations/user-supplied.json)，結果見[匯入報告](../artifacts/translations-import-report.json)。兩首隱藏曲沒有供稿；舊 PDF、照片譯詞與映射保留封存，不套用到米津歌曲。

2026-11-19 已核對 26 篇中文翻譯文章，原頁署名為 Alice／箱庭博物館；連結、署名與建議 TXT／PDF 路徑保存於 `lyrics/translations/sources.json.references`。另 2 首標記本次未找到。這些參考資料不參與正文匯入；逐首連結見[歌曲來源清單](lyric-sources.md)，四個輸入 JSON 的用途見[欄位說明](song-source-fields.md)。

翻譯可獨立於原文、讀音及同步時間提供。請保存原始檔、實際譯者、來源網址及可使用依據；提供平台與譯者身分須分開記錄。

本次 TXT 與先前貼文均未註明譯者，因此顯示「使用者提供（譯者未註明）」。既有 Alice／箱庭博物館文章連結仍保留為參考，不能據此推定供稿作者或外站重製授權。

## 匯入流程

1. 對照固定歌曲 ID 與原文版本。
2. 有原文時逐句對齊；重複段落、拆句及不確定的對應位置另記，不推測缺句。
3. 已對齊的 PDF 依 sources.json、extracted-pairs.json、alignment.json 記錄來源、雜湊及原文對應；直接供稿使用 user-supplied.json。
4. 本次 TXT 的人工拆合句及已核對重複段落保存在 `lyrics/translations/line-map.json`，先執行 `node scripts/prepare-supplied-translations.mjs` 預覽，核對後加 `--write`。原文與來源檔雜湊不符時須重新核對；不自動傳播翻譯。
5. 再執行 `node scripts/import-song-translations.mjs` 預覽，核對後加 `--write`。
6. 執行 `npm run check:imports`、兩項歌詞檢查與 build。

目前直接供稿 `user-supplied.json.songs` 有 26 首；PDF 輸入清單（`sources.json.songs`、抽取結果與 PDF 逐句映射）仍為空。不要把只有網址的 `references` 直接搬進 `songs`。匯入不能修改原文或同步時間，也不能因補中文就把 timingStatus 改為 ready。各列 `sourceRefs` 保存供稿正文行與字元範圍，`partial: true` 表示只提供該列部分譯文；前端對應 `translationPartial`，即使每列都有中文，也不將缺和聲的歌曲標成完整。

〈Flamingo〉供稿末尾一個片語與原文的對應尚未核實，原始 TXT 完整保留，該片語不填入字幕。重複段落只依已逐句核對並明列的映射重用，缺少原文依據的節錄不自動延伸。

尚無原文時先保存譯文供稿，不以中文反推日文或時間。現行匯入檢查使用合成測試驗證工具，另以已提供的本機文字檢查匯入預覽；通過工具測試不表示其他歌曲已有譯詞。
