# Change 28 Tasks — 殭屍分支清理 + role-guard 誤攔修復 + 直推收尾補強

> 進度唯一來源。實作 session 逐項勾選。分工見 spec.md「六、Sub-agent 平行執行配置」＝**序列、單 session、不平行**。
> 決策 A 已定案（2026-07-12）＝**一併修 `git tag`**，Phase 1 含改動 1（merge-base）+ 改動 2（git tag token 比對）。

## 前置（主 session）

- [x] 0.1 確認在實作分支（`git checkout -b m_b_<功能名> origin/claude/diagnosis-report-review-gqjfkw` 後 push -u）
- [x] 0.2 讀 `診斷報告.md` + `spec.md`（決策 A 已定案＝一併修 git tag）

## Phase 1 — role-guard.js doctor 段誤攔修復（merge-base + git tag）

- [x] 1.1 改動 1：`.claude/hooks/role-guard.js:87` `/^git merge\b/` → `/^git merge(\s|$)/`
- [x] 1.2 改動 2：line 82 `/^git tag\b/` 整行換為 spec 決策 A 的 token 比對 block（放行唯讀列出）
- [x] 1.3 Gate：`node -e` 驗 merge-base 放行（false）、真 merge 仍攔（true）；git tag 10 案例全過
- [x] 1.4 提醒使用者：hook 下次 tool call 生效，無需重啟服務
- [x] 1.5 commit（規則類，可與 Phase 2/3 合併為單 commit）

## Phase 2 — deploy-release skill 補「直推後刪功能分支」收尾

- [x] 2.1 `.claude/skills/deploy-release/SKILL.md`「### 直推流程」段後補收尾小節（要點見 spec Phase 2）
- [x] 2.2 Gate：`grep -n "直推後刪\|上線後.*刪.*分支\|--delete" .claude/skills/deploy-release/SKILL.md` 命中新段
- [x] 2.3 確認未動「功能上線」段

## Phase 3 — now.md 更新（與上線同 commit）

- [x] 3.1 `.claude/now.md`「最近推送」新增 change 28 紀錄
- [x] 3.2 Gate：`grep -c "change 28" .claude/now.md` ≥ 1

## 操作類（主 session + 使用者端，CCR 403 交使用者執行）

- [ ] X1 刪三殘留分支：使用者端執行
  `cd /home/ubuntu/dev/KJ-Champion-System && git push origin --delete m_b_role-guard補強 m_b_打包繼續指令 claude/packing-continue-skills-audit-qr0c9z && git fetch origin --prune`
- [ ] X2 change 28 上線：now.md 同 commit → 機密檢查 → 使用者確認 → cherry-pick `.claude/` → push main → `sync-branches.sh`
- [ ] X3 dogfood：內容進 main 後刪本 change 功能分支（使用者端 `git push origin --delete <本change分支>`）

## 驗收（全 ✅ 才收尾）

- [ ] V1 決策 A 已拍板，Phase 1 範圍與之一致
- [ ] V2 三個 Phase gate 全綠
- [ ] V3 三殘留分支已刪，`git branch -r` 不再出現
- [ ] V4 change 28 進 main，本 change 分支已刪
- [ ] V5 零產品程式碼異動
- [ ] V6 收尾員：CHANGELOG / context 版本檔 / now.md 記錄
