# Change 27 — tasks

> 進度唯一來源。每 Phase 一個 commit（使用者手動 commit 例外，驗收報告須揭露）；
> 純規則檔，依 workflow skill 測試表跳過 Unit Test，以 spec 的 G1–G6 gate 取代。
>
> **Sub-agent 分工已由 spec 定案：全部主 session 序列，不派 sub-agent。**
> **前置依賴：change 26 先上線（本分支自 m_b_打包繼續指令 切出）。**

## Phase 1 — push-main 判定收緊

- [x] 1.1 `.claude/hooks/role-guard.js`：engineer 段 push-main 判定改為 token 比對（依 spec 技術設計 1；git tag 與 doctor 段不動）
- [x] 1.2 跑 gate G1、G2（role-guard 部分）

## Phase 2 — 殘留標記提示 hook

- [x] 2.1 新增 `.claude/hooks/session-role-notice.js`（依 spec 技術設計 2：mtime、fail-open）
- [x] 2.2 `.claude/settings.json` 註冊 SessionStart hook（依 spec 技術設計 3）
- [x] 2.3 跑 gate G2（notice 部分）、G3、G4

## Phase 3 — 實作.md 停止點補「使用者終端機指令紀律」

- [x] 3.1 `.claude/commands/實作.md`：停止點第 3 點擴充四條紀律（依 spec 技術設計 4：明講貼到 Termius、cd 絕對路徑寫死、&& 串接單行、指令自包含）
- [x] 3.2 跑 gate G5

## Phase 4 — /vps新對話 指令

- [ ] 4.1 新增 `.claude/commands/vps新對話.md`（依 spec 技術設計 5：模式判斷、環境判斷、開新模式產指令／代執行、關閉模式列表詢問＋自殺警告；平實語言）
- [ ] 4.2 跑 gate G6

## Phase 5 — 上線（規則類直推 main；change 26 已於 2026-07-12 上 main，前置已滿足）

- [ ] 5.1 確認 change 26 已上線 main（`git log origin/main` 可見 change 26 commits），未上線則停下回報
- [ ] 5.2 更新 `.claude/now.md`「最近推送」段（與推送同 commit）
- [ ] 5.3 機密檢查（git status 無 .env / Key/ / 金鑰 *.json）
- [ ] 5.4 列推送清單，等使用者明確確認
- [ ] 5.5 push main（CCR/VPS 403 則交自包含指令給使用者，含 cd 絕對路徑、&& 串接）→ `bash scripts/sync-branches.sh`
