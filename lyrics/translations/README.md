# 米津歌曲繁中譯詞供稿

[曲目與 ID](../../docs/lyric-sources.md) · [匯入說明](../../docs/translation-import.md)

26 首已從使用者提供的本機中文稿對齊，共 987／1,021 列有中文；19 首完整、7 首部分整理。未附譯文的 34 列及另 16 列內的未核實片段保留待補，詳見[逐首報告](../../artifacts/translations-alignment-review-2026-11-20.md)。原始 TXT 不改寫；譯者未註明，署名記為「使用者提供（譯者未註明）」。兩首暫時隱藏的公告曲沒有供稿，原始設定保留。

不必自行補時間碼，也不必強制與 LRC 行數一致；有原文對照更容易核實拆句與重複段落。沒有提供的部分保留待補，不把其他歌曲的譯者署名移過來。

sources.json 的 references 已保存 28 首的文章／待補狀態、來源署名與建議 TXT／PDF 路徑，其中 26 首已核對 Alice／箱庭博物館的對應翻譯文章。文章署名與本次供稿分開記錄；未確認使用者貼文的譯者前，不把文章署名當成本次供稿的署名。

user-supplied.json 已記錄 26 首的提供日期、使用依據、範圍、逐句映射及部分列標記。line-map.json 保存新增 25 首的人工核對規則、原文及 TXT 雜湊；執行 `node scripts/prepare-supplied-translations.mjs` 預覽，核對後加 `--write` 產生映射，再預覽並執行 `node scripts/import-song-translations.mjs --write`。原文或供稿變更後須重新核對，工具不自動推測重複段落。

PDF 輸入清單 sources.json 的 songs、extracted-pairs.json 及 alignment.json 仍為空。alignment.json 用於 PDF 逐句對齊，不能用文章網址取代；各欄位用途見[來源欄位說明](../../docs/song-source-fields.md)。

舊 PDF、照片及歷史映射已保存於 [歷史封存](../../archive/fujii-kaze-2026/README.md)，不屬於米津曲庫。
