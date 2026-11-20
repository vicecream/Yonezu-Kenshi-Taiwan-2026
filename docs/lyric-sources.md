# 米津玄師 28 首歌曲來源與狀態

[專案說明](../README.md) · [原文匯入](karaoke-import.md) · [翻譯匯入](translation-import.md)

曲目由使用者指定，依以下順序固定編號，並非台北場歌單或演出順序。作品頁於 2026-11-14 核對；YouTube 與翻譯來源於 2026-11-19 補查。官方連結不等同歌詞或時間已核實。

本文件保留完整 28 首資料；網站目前顯示 26 首，〈春が灯り〉、〈こんにちはごきげんよう！〉暫時隱藏，其餘歌曲保留原預習編號。顯示設定為 `src/song-metadata.js` 的 `hiddenSongIds`，不影響原始來源及匯入資料。

26 首已從使用者提供的本機 LRCLIB JSON 匯入 1,021 行原文；2026-11-20 已對齊 26 首中文稿，共 987 列有中文，19 首完整、7 首部分整理。34 列未附譯文，另 16 列內的和聲或片段待補，詳見[逐首對照報告](../artifacts/translations-alignment-review-2026-11-20.md)。兩首隱藏曲的原文、逐行讀音及影片同步仍待補。26 首已有 YouTube 入口（21 首 MV、5 首官方發行音源），另 2 首保留公告／預告來源。中文文章與本機供稿分開記錄，供稿譯者未註明，不套用參考文章署名。

2026-11-17 歌詞與時間來源另見[逐首核對報告](../artifacts/lyrics-audit-2026-11-17.md)：當時 26 首已找到外部候選，尚未匯入或核對影片同步。

程式欄位、逐首本機檔名及現有四個翻譯 JSON 的用途，見[來源欄位與匯入入口](song-source-fields.md)。LRC 連結回傳 LRCLIB JSON，需取 `syncedLyrics` 才是 LRC；不能把整份 JSON 當作 `.lrc`。中文連結均指向 Alice／箱庭博物館的對應翻譯文章。

| 編號 | ID | 原始歌名 | 專輯／來源 | YouTube／官方入口 | LRC 來源候選 | 中文翻譯文章 |
|---|---|---|---|---|---|---|
| 1 | YellowGhost | YELLOW GHOST | [LOST CORNER](https://reissuerecords.net/discography/lost-corner/) | [官方音源](https://www.youtube.com/watch?v=hvZe_uu_u9A) | [LRCLIB JSON](https://lrclib.net/api/get/11926614) | [Alice／箱庭博物館](https://alicepika.blog.fc2.com/blog-entry-804.html) |
| 2 | Shunrai | 春雷 | [BOOTLEG](https://reissuerecords.net/discography/bootleg/) | [MV](https://www.youtube.com/watch?v=zkNzxsaCunU) | [LRCLIB JSON](https://lrclib.net/api/get/10031040) | [Alice／箱庭博物館](https://alicepika.blog.fc2.com/blog-entry-575.html) |
| 3 | Kanden | 感電 | [STRAY SHEEP](https://reissuerecords.net/discography/stray-sheep/) | [MV](https://www.youtube.com/watch?v=UFQEttrn6CQ) | [LRCLIB JSON](https://lrclib.net/api/get/11502024) | [Alice／箱庭博物館](https://alicepika.blog.fc2.com/blog-entry-647.html) |
| 4 | Flamingo | Flamingo | [STRAY SHEEP](https://reissuerecords.net/discography/stray-sheep/) | [MV](https://www.youtube.com/watch?v=Uh6dkL1M9DM) | [LRCLIB JSON](https://lrclib.net/api/get/65587) | [Alice／箱庭博物館](https://alicepika.blog.fc2.com/blog-entry-610.html) |
| 5 | Lady | LADY | [LOST CORNER](https://reissuerecords.net/discography/lost-corner/) | [MV](https://www.youtube.com/watch?v=DdF-u3fe5pg) | [LRCLIB JSON](https://lrclib.net/api/get/11929499) | [Alice／箱庭博物館](https://alicepika.blog.fc2.com/blog-entry-751.html) |
| 6 | Yumeutsutsu | ゆめうつつ | [LOST CORNER](https://reissuerecords.net/discography/lost-corner/) | [官方音源](https://www.youtube.com/watch?v=7yM35hOfW9E) | [LRCLIB JSON](https://lrclib.net/api/get/14452926) | [Alice／箱庭博物館](https://alicepika.blog.fc2.com/blog-entry-666.html) |
| 7 | CranberryAndPancake | クランベリーとパンケーキ | [Lemon](https://reissuerecords.net/discography/lemon/) | [官方音源](https://www.youtube.com/watch?v=5r365k5-lA8) | [LRCLIB JSON](https://lrclib.net/api/get/10123569) | [Alice／箱庭博物館](https://alicepika.blog.fc2.com/blog-entry-590.html) |
| 8 | Shinigami | 死神 | [LOST CORNER](https://reissuerecords.net/discography/lost-corner/) | [MV](https://www.youtube.com/watch?v=8nxaZ69ElEc) | [LRCLIB JSON](https://lrclib.net/api/get/12206559) | [Alice／箱庭博物館](https://alicepika.blog.fc2.com/blog-entry-667.html) |
| 9 | SayonaraMataItsuka | さよーならまたいつか！ | [LOST CORNER](https://reissuerecords.net/discography/lost-corner/) | [MV](https://www.youtube.com/watch?v=-wb2PAx6aEs) | [LRCLIB JSON](https://lrclib.net/api/get/14452815) | [Alice／箱庭博物館](https://alicepika.blog.fc2.com/blog-entry-778.html) |
| 10 | MelancholyKitchen | メランコリーキッチン | [YANKEE](https://reissuerecords.net/discography/yankee/) | [官方音源](https://www.youtube.com/watch?v=0GEoiLdCkUM) | [LRCLIB JSON](https://lrclib.net/api/get/1883852) | [Alice／箱庭博物館](https://alicepika.blog.fc2.com/blog-entry-226.html) |
| 11 | NineteenNinetyOne | 1991 | [1991](https://reissuerecords.net/discography/1991%E3%80%80%E3%80%80%E3%80%80%E3%80%80%E3%80%80%E3%80%80%E3%80%8E%E7%A7%92%E9%80%9F5%E3%82%BB%E3%83%B3%E3%83%81%E3%83%A1%E3%83%BC%E3%83%88%E3%83%AB%E3%80%8F%E4%B8%BB%E9%A1%8C%E6%AD%8C/) | [MV](https://www.youtube.com/watch?v=1cnndBdzCAk) | [LRCLIB JSON](https://lrclib.net/api/get/24879963) | [Alice／箱庭博物館](https://alicepika.blog.fc2.com/blog-entry-825.html) |
| 12 | Lemon | Lemon | [STRAY SHEEP](https://reissuerecords.net/discography/stray-sheep/) | [MV](https://www.youtube.com/watch?v=SX_ViT4Ra7k) | [LRCLIB JSON](https://lrclib.net/api/get/65910) | [Alice／箱庭博物館](https://alicepika.blog.fc2.com/blog-entry-584.html) |
| 13 | JaneDoe | JANE DOE | [IRIS OUT / JANE DOE](https://reissuerecords.net/discography/irisout_janedoe/) | [MV](https://www.youtube.com/watch?v=sPLqsLsooJY) | [LRCLIB JSON](https://lrclib.net/api/get/26422844) | [Alice／箱庭博物館](https://alicepika.blog.fc2.com/blog-entry-820.html) |
| 14 | UmiNoYuurei | 海の幽霊 | [STRAY SHEEP](https://reissuerecords.net/discography/stray-sheep/) | [MV](https://www.youtube.com/watch?v=1s84rIhPuhk) | [LRCLIB JSON](https://lrclib.net/api/get/9920815) | [Alice／箱庭博物館](https://alicepika.blog.fc2.com/blog-entry-635.html) |
| 15 | Yodaka | 夜鷹 | [夜鷹](https://reissuerecords.net/discography/yodaka/) | [MV](https://www.youtube.com/watch?v=l2jvIuTp534) | [LRCLIB JSON](https://lrclib.net/api/get/37790422) | [Alice／箱庭博物館](https://alicepika.blog.fc2.com/blog-entry-842.html) |
| 16 | Loser | LOSER | [BOOTLEG](https://reissuerecords.net/discography/bootleg/) | [MV](https://www.youtube.com/watch?v=Dx_fKPBPYUI) | [LRCLIB JSON](https://lrclib.net/api/get/1319675) | [Alice／箱庭博物館](https://alicepika.blog.fc2.com/blog-entry-446.html) |
| 17 | BowAndArrow | BOW AND ARROW | [Plazma / BOW AND ARROW](https://reissuerecords.net/discography/plazma_bowandarrow/) | [MV](https://www.youtube.com/watch?v=M-Eyhjkepy0) | [LRCLIB JSON](https://lrclib.net/api/get/30476214) | [Alice／箱庭博物館](https://alicepika.blog.fc2.com/blog-entry-814.html) |
| 18 | PeaceSign | ピースサイン | [BOOTLEG](https://reissuerecords.net/discography/bootleg/) | [MV](https://www.youtube.com/watch?v=9aJVr5tTTWk) | [LRCLIB JSON](https://lrclib.net/api/get/10123611) | [Alice／箱庭博物館](https://alicepika.blog.fc2.com/blog-entry-549.html) |
| 19 | KickBack | KICK BACK | [LOST CORNER](https://reissuerecords.net/discography/lost-corner/) | [MV](https://www.youtube.com/watch?v=M2cckDmNLMI) | [LRCLIB JSON](https://lrclib.net/api/get/952051) | [Alice／箱庭博物館](https://alicepika.blog.fc2.com/blog-entry-739.html) |
| 20 | IrisOut | IRIS OUT | [IRIS OUT / JANE DOE](https://reissuerecords.net/discography/irisout_janedoe/) | [MV](https://www.youtube.com/watch?v=LmZD-TU96q4) | [LRCLIB JSON](https://lrclib.net/api/get/24226683) | [Alice／箱庭博物館](https://alicepika.blog.fc2.com/blog-entry-819.html) |
| 21 | HaruGaTomori | 春が灯り | [已公布新曲](https://reissuerecords.net/2026/10/22/kusuriyanohitorigoto_movie/) | [公告／預告](https://reissuerecords.net/2026/10/22/kusuriyanohitorigoto_movie/) | 待補 | 待補 |
| 22 | KonnichiwaGokigenyou | こんにちはごきげんよう！ | [已公布新曲](https://reissuerecords.net/2026/11/02/toranitsubasa_movie/) | [公告／預告](https://reissuerecords.net/2026/11/02/toranitsubasa_movie/) | 待補 | 待補 |
| 23 | Karasu | 烏 | [烏](https://reissuerecords.net/discography/karasu/) | [MV](https://www.youtube.com/watch?v=YjPMupS1Lg4) | [LRCLIB JSON](https://lrclib.net/api/get/36156838) | [Alice／箱庭博物館](https://alicepika.blog.fc2.com/blog-entry-833.html) |
| 24 | MayoeruHitsuji | 迷える羊 | [STRAY SHEEP](https://reissuerecords.net/discography/stray-sheep/) | [官方音源](https://www.youtube.com/watch?v=DAeERkHEy00) | [LRCLIB JSON](https://lrclib.net/api/get/1319865) | [Alice／箱庭博物館](https://alicepika.blog.fc2.com/blog-entry-686.html) |
| 25 | Plazma | Plazma | [Plazma / BOW AND ARROW](https://reissuerecords.net/discography/plazma_bowandarrow/) | [MV](https://www.youtube.com/watch?v=fp3F6TqBsAU) | [LRCLIB JSON](https://lrclib.net/api/get/16717326) | [Alice／箱庭博物館](https://alicepika.blog.fc2.com/blog-entry-815.html) |
| 26 | M87 | M八七 | [LOST CORNER](https://reissuerecords.net/discography/lost-corner/) | [MV](https://www.youtube.com/watch?v=Zhx1n6uvgUE) | [LRCLIB JSON](https://lrclib.net/api/get/13504276) | [Alice／箱庭博物館](https://alicepika.blog.fc2.com/blog-entry-730.html) |
| 27 | Chikyugi | 地球儀 | [LOST CORNER](https://reissuerecords.net/discography/lost-corner/) | [MV](https://www.youtube.com/watch?v=VUsURj_OYdA) | [LRCLIB JSON](https://lrclib.net/api/get/3069994) | [Alice／箱庭博物館](https://alicepika.blog.fc2.com/blog-entry-758.html) |
| 28 | EineKleine | アイネクライネ | [YANKEE](https://reissuerecords.net/discography/yankee/) | [MV](https://www.youtube.com/watch?v=-EKxzId_Sj4) | [LRCLIB JSON](https://lrclib.net/api/get/1883354) | [Alice／箱庭博物館](https://alicepika.blog.fc2.com/blog-entry-625.html) |

〈こんにちはごきげんよう！〉依官方名稱保留驚嘆號；〈春が灯り〉與該曲目前只確認主題歌公告與預告，發行及完整歌曲影片狀態仍需後續核實。

來源中繼資料：[2026-11-14 核對紀錄](../artifacts/yonezu-source-check-2026-11-14.json) · [2026-11-19 影片／LRC／翻譯核對](../artifacts/song-source-review-2026-11-19.json)。
