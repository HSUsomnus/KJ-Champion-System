# Change 26 — tasks

> 進度唯一來源。每 Phase 一個 commit（使用者手動 commit 例外，驗收報告須揭露）；
> 純規則文件，依 workflow skill 測試表「純 spec/tasks 文件、規則檔」跳過 Unit Test，以 spec 的 G1–G10 gate 取代。
>
> **Sub-agent 分工已由 spec「Sub-agent 平行執行配置」定案，實作 session 不自行判斷**：
> Phase 1、2、4 → 三個 sub-agent 平行（只寫檔＋跑 gate，不 commit）；
> Phase 0、3、5、6 與**所有 commit/push** → 主 session 序列執行。

## Phase 0 — 懸掛狀態清理（使用者已決策 2026-07-11，見 spec「懸掛狀態處置」）

- [ ] 0.1 刪除遠端分支 `m_b_三層流程補強`（已 merge，與 main 同 SHA e5fa804）
- [ ] 0.2 刪除遠端分支 `claude/project-spec-review-95epn4`（0 個領先 commit）
- [ ] 0.3 刪除遠端分支 `claude/new-session-k97gfv`（PR #4 已關閉；change 21 spec 可從已關 PR 撿回）
- [ ] 0.4 用 `git ls-remote --heads origin` 驗證：上述三分支消失，`m_b_調查表單`、`claude/change-20-strategy-hf8eds`（PR #12 保留）仍在
- [ ] 0.5 CCR 環境刪分支若 403：輸出自包含指令交使用者本機執行（`git push origin --delete <分支名>` 三行），不阻塞後續 Phase

## Phase 1 — /打包 指令

- [x] 1.1 新增 `.claude/commands/打包.md`（依 spec「技術設計 1」六段交接檔 + 分支分流 + 不壓縮警語）
- [x] 1.2 跑 gate G1（打包.md 部分）、G2

## Phase 2 — /繼續 指令

- [x] 2.1 新增 `.claude/commands/繼續.md`（依 spec「技術設計 2」：git log --all 尋找 handoff、fallback 問使用者、接手後刪檔）
- [x] 2.2 跑 gate G1（繼續.md 部分）、G3

## Phase 3 — CLAUDE.md

- [ ] 3.1 補 /打包 vs /compact 機制區分一句
- [ ] 3.2 啟動規則第 1 步改為 `git fetch origin main --quiet && git log origin/main -1 --oneline`
- [ ] 3.3 跑 gate G4

## Phase 4 — 記憶體系除錯

- [x] 4.1 `.claude/skills/workflow/SKILL.md`：4 處 `deploy.md` 引用改為「deploy-release skill」（行 233/239/252/309）
- [x] 4.2 `.claude/skills/workflow/SKILL.md`「spec 撰寫標準」加「Sub-agent 平行執行配置」必寫段（四條判準，依 spec 技術設計 7）
- [x] 4.3 `.claude/hooks/git-guard.js`：4 處警告文字 `deploy.md` 改為「deploy-release skill」（行 11/34/136/141）
- [x] 4.4 `.claude/now.md`：change 20 spec 路徑改為 `changes/20-團隊調查表單系統/spec.md`
- [x] 4.5 跑 gate G5、G6、G7、G11（workflow 部分）

## Phase 5 — /診斷 指令 + doctor 角色圍籬 + 子代理清理

- [ ] 5.1 新增 `.claude/commands/診斷.md`（依 spec「技術設計 5」：職責、方案 A 報告交付、起手式輸出、停止點；平實語言，不嵌比喻；內建待辦清單須標註 sub-agent 分工——技術設計 7）
- [ ] 5.2 `.claude/hooks/role-guard.js` 新增 doctor 角色攔截（依 spec 禁區清單；`git commit`/`git push` 不攔）
- [ ] 5.3 CLAUDE.md「Session 角色」段補 /診斷 一行（最高階模型）
- [ ] 5.4 `.claude/commands/規劃.md`「spec 撰寫標準」節補「Sub-agent 平行執行配置」必寫段引用（依 spec 技術設計 7）
- [ ] 5.5 刪除 `.claude/commands/子代理.md`（已壞：引用不存在的 open-worktree-vscode.js hook）
- [ ] 5.6 跑 gate G7、G8、G9、G10、G11（規劃/診斷部分）

## Phase 6 — 上線（規則類直推 main）

- [ ] 6.1 更新 `.claude/now.md`「最近推送」段（與推送同 commit）
- [ ] 6.2 機密檢查（git status 無 .env / Key/ / 金鑰 *.json）
- [ ] 6.3 列推送清單，等使用者明確確認
- [ ] 6.4 push main（CCR 403 則交自包含指令給使用者）→ `bash scripts/sync-branches.sh`
