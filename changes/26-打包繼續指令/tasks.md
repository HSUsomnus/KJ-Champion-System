# Change 26 — tasks

> 進度唯一來源。每 Phase 一個 commit（使用者手動 commit 例外，驗收報告須揭露）；
> 純規則文件，依 workflow skill 測試表「純 spec/tasks 文件、規則檔」跳過 Unit Test，以 spec 的 G1–G7 gate 取代。

## Phase 1 — /打包 指令

- [ ] 1.1 新增 `.claude/commands/打包.md`（依 spec「技術設計 1」六段交接檔 + 分支分流 + 不壓縮警語）
- [ ] 1.2 跑 gate G1（打包.md 部分）、G2

## Phase 2 — /繼續 指令

- [ ] 2.1 新增 `.claude/commands/繼續.md`（依 spec「技術設計 2」：git log --all 尋找 handoff、fallback 問使用者、接手後刪檔）
- [ ] 2.2 跑 gate G1（繼續.md 部分）、G3

## Phase 3 — CLAUDE.md

- [ ] 3.1 補 /打包 vs /compact 機制區分一句
- [ ] 3.2 啟動規則第 1 步改為 `git fetch origin main --quiet && git log origin/main -1 --oneline`
- [ ] 3.3 跑 gate G4

## Phase 4 — 記憶體系除錯

- [ ] 4.1 `.claude/skills/workflow/SKILL.md`：4 處 `deploy.md` 引用改為「deploy-release skill」（行 233/239/252/309）
- [ ] 4.2 `.claude/hooks/git-guard.js`：4 處警告文字 `deploy.md` 改為「deploy-release skill」（行 11/34/136/141）
- [ ] 4.3 `.claude/now.md`：change 20 spec 路徑改為 `changes/20-團隊調查表單系統/spec.md`
- [ ] 4.4 跑 gate G5、G6、G7

## Phase 5 — 上線（規則類直推 main）

- [ ] 5.1 更新 `.claude/now.md`「最近推送」段（與推送同 commit）
- [ ] 5.2 機密檢查（git status 無 .env / Key/ / 金鑰 *.json）
- [ ] 5.3 列推送清單，等使用者明確確認
- [ ] 5.4 push main（CCR 403 則交自包含指令給使用者）→ `bash scripts/sync-branches.sh`
