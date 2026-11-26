# 卡拉 OK 音訊時間候選

每首 JSON 對應現行曲庫的指定 YouTube ID 及已提供歌詞，保存來源／音訊 SHA-256、模型修訂、字詞起訖、分數、異常與可套用狀態。全部為 `unreviewed`，不含人工通過紀錄，不載入正式指南播放器。

CTC 對齊使用原音混音；〈Flamingo〉、〈LADY〉、〈さよーならまたいつか！〉等曲目另以 Whisper 已知歌詞對齊比較，逐首後端見處理紀錄，零長度等異常可退回同音訊 CTC。時間來自模型對音訊的對齊，沒有按字數平均分配。伴奏、和聲、長音、重複段落、日英混用及原有 MV 偏移仍需實聽；低分不代表百分比精度。

本機網頁只將覆蓋完整、時間有效且分數通過初步門檻的候選填入新草稿，並維持待聽校。已保存的人工修正不會因重跑模型被覆寫。音訊和模型保留在專案外 `D:/Codex/.yonezu-karaoke-tools/` 與既有 Python 環境。

操作與重跑方式見[校對工具說明](../../docs/timing-review.md)；[音訊處理紀錄](../../artifacts/timing-review/audio-alignment.json)、[來源句尾檢查](../../artifacts/timing-review/source-audit.json)、[候選驗證](../../artifacts/timing-review/candidate-validation.json)分開記錄。
