# Change 29 Tasks — Codex 整合 VPS：AGENTS.md 規則檔

> 進度唯一來源。實作 session 逐項勾選。分工見 spec.md「六、Sub-agent 平行執行配置」＝**序列、單 session、不平行**。
> 範圍拍板（使用者 A/A/A，2026-07-13）＝只交付 AGENTS.md／完整版／規則類直推。

## 前置（主 session）

- [ ] 0.1 確認在實作分支（`git checkout -b m_b_<功能名> origin/claude/diagnosis-report-review-gqjfkw` 後 push -u）
- [ ] 0.2 讀 `spec.md`（範圍 A/A/A 已定案；上傳來源 = CLAUDE3.md 第六節第 1 點）

## Phase 1 — 建立 AGENTS.md（root，完整版）

- [ ] 1.1 於 repo root 新建 `AGENTS.md`，依 spec Phase 1 大綱撰寫（繁中；doom-loop 五要點 + 繼承鐵律）
- [ ] 1.2 Gate：`test -f AGENTS.md && echo EXISTS`（EXISTS）；`grep -cE "失敗停損|連續失敗|停手" AGENTS.md`（≥1）；`grep -cE "git add -A|main 直接 commit|繁體中文" AGENTS.md`（≥1）
- [ ] 1.3 確認五要點齊全：失敗停損（連續失敗 2 次停手）/ 動手前讀 root cause / 不假設 API / 測試最小化 / context 控制
- [ ] 1.4 commit（規則類，可與 Phase 2/3 合併為單 commit）

## Phase 2 — deploy-release skill 直推允許清單補 AGENTS.md

- [ ] 2.1 `.claude/skills/deploy-release/SKILL.md` 允許清單（約 129–132 行）在 `CLAUDE.md`/`CHANGELOG.md` 旁補 `AGENTS.md`（一行）
- [ ] 2.2 Gate：`grep -n "AGENTS.md" .claude/skills/deploy-release/SKILL.md` 命中允許清單段
- [ ] 2.3 確認未動「不得直推」清單、未動直推流程步驟

## Phase 3 — now.md 更新（與上線同 commit）

- [ ] 3.1 `.claude/now.md`「最近推送」新增 change 29 紀錄（AGENTS.md 建立 + deploy-release 允許清單補 AGENTS.md）
- [ ] 3.2 Gate：`grep -c "change 29" .claude/now.md` ≥ 1

## 操作類（主 session + 使用者端，CCR 403 交使用者執行）

- [ ] X1 change 29 上線：now.md 同 commit → 機密檢查 → 使用者確認 → cherry-pick `AGENTS.md` + `deploy-release/SKILL.md` + `now.md` → push main → `sync-branches.sh`
- [ ] X2 dogfood：內容進 main 後刪本 change 實作分支（使用者端 `git push origin --delete <本change實作分支> && git fetch origin --prune`）

## 驗收（全 ✅ 才收尾）

- [ ] V1 範圍 A/A/A 已定案，AGENTS.md 完整版、規則類直推
- [ ] V2 三個 Phase gate 全綠
- [ ] V3 AGENTS.md doom-loop 五要點齊全 + 繼承鐵律內嵌
- [ ] V4 deploy-release 允許清單已含 AGENTS.md
- [ ] V5 change 29 進 main，本 change 實作分支已刪
- [ ] V6 零產品程式碼異動、未建立任何 `.github/workflows`（CI/CD 非目標）
- [ ] V7 收尾員：CHANGELOG / context 版本檔 / now.md 記錄
