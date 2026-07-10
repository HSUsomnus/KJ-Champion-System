# Change 22 — 規則體系重構與 Token 降本 — Tasks

> 進度唯一來源。每個 task 完成並通過該 Phase 驗證才勾 [x]。
> 本 change 全部是 `.claude/` / `scripts/` / 文件類變更，不含產品程式碼，無 vitest 對象。
> **每個 Phase commit 前，必須先通過 spec.md 第七節對應的 gate（7.1–7.5），
> 全 ✅ 才 commit；任一 ❌ 依 7.0 判定總規則處理（修復重跑 / 超範圍即停並回報）。**

## 0. 前置

- [x] 0.1 從 main 切 `m_b_規則體系重構` 並推遠端

## 1. Phase 1 — 修矛盾

- [x] 1.1 CLAUDE.md 修兩處壞連結（CHANGELOG 路徑、UIDESIGN 路徑）
- [x] 1.2 刪除 `.cursorrules`
- [x] 1.3 刪除 `.claude/RULES-MAP.md` + CLAUDE.md 索引表移除該列
- [x] 1.4 產出遠端分支差異報告（dev、fix/landscape-orientation-overlay）交使用者決定
- [x] 1.5 now.md 頂部加入地雷清理規則
- [x] 1.6 commit（Phase 1 一個 commit）

## 2. Phase 2 — Hook 硬化 + 腳本化

- [x] 2.1 git-guard.js：main commit 產品程式碼 → permissionDecision deny
- [x] 2.2 git-guard.js：`git add -A` / 孤立 `git add .` → permissionDecision deny
- [x] 2.3 新增 `scripts/sync-branches.sh`（`bash -n` 通過；**執行時修訂**：衝突預設停下回報，`SYNC_STRATEGY=theirs` 手動開關才覆蓋，見 spec.md 2.2 註記）
- [x] 2.4 post-push-sync.js 輸出改為指向 sync-branches.sh
- [x] 2.5 deploy.md / workflow.md 內嵌 sync 腳本替換為指向 scripts/sync-branches.sh
- [x] 2.6 deploy.md 加入 merge `--no-ff` 規範
- [x] 2.7 `node --check` 三個 hook 全通過 + 模擬 `git add -A` 確認實際被 deny
- [x] 2.8 commit

## 3. Phase 3 — 規則合併與流程降本

- [x] 3.1 main.md 內容併入 deploy.md，刪除 main.md
- [x] 3.2 readme.md 內容併入 deploy.md，刪除 readme.md
- [x] 3.3 README 規則降級為「僅功能上線 main 時重寫」（deploy.md + workflow.md 同步）
- [x] 3.4 .claude/CHANGELOG.md 裁切（近 5 版全文，其餘一行索引）
- [x] 3.5 settings.json：rules-injector matcher 移除 Read（使用者於 GitHub 手動編輯完成）
- [x] 3.6 CLAUDE.md 索引表同步（移除 main.md / readme.md 列）
- [x] 3.7 commit

## 4. Phase 4 — Skill 化

- [x] 4.1 建立 `.claude/skills/uidesign/SKILL.md`（UIDESIGN.md 全文 + frontend.md 開發段落，含 frontmatter）
- [x] 4.2 建立 `.claude/skills/deploy-release/SKILL.md`（deploy.md 含已併入內容）
- [x] 4.3 建立 `.claude/skills/database/SKILL.md`（database.md + backend.md 目錄/路由段落）
- [x] 4.4 建立 `.claude/skills/workflow/SKILL.md`（workflow.md 全文）
- [x] 4.5 rules-injector.js 改為 skill 載入提醒（main 警告文字內嵌 hook）
- [x] 4.6 重寫 CLAUDE.md（依 spec 4.3 草稿，已定案決策表原封保留）
- [x] 4.7 刪除已搬移的 `.claude/rules/*.md`
- [x] 4.8 全 repo grep 確認無 `.claude/rules/` 殘留引用（另修正 `.gitignore` 誤將 `.claude/skills/` 整個排除、`.claude/now.md` 一處存活引用）
- [x] 4.9 commit

## 5. Phase 5 — OpenSpec 工具殘骸清理

- [x] 5.1 刪除 `openspec/changes/` 下所有已完成 change 資料夾（01–19，含兩個 17；change 20 本分支未存在，無需保留動作）
- [x] 5.2 `git mv openspec/changes changes`，刪除空的 `openspec/`
- [x] 5.3 全 repo grep `openspec`：規則/skill 文字中「OpenSpec change」→「change」、路徑改 `changes/`（另修正 rules-injector.js 殘留的 `/openspec/STATUS` 過時檢查、README.md 專案結構圖、now.md 兩處歷史記錄）
- [x] 5.4 workflow skill 補「新 change 編號 = 現存最大編號 + 1」一句
- [x] 5.5 刪除「雙裝置工作流」整段（確認 now.md 地雷區已涵蓋 CCR 環境事實）
- [x] 5.6 commit

## 6. 收尾

- [x] 6.1 重跑 7.1–7.5 全部 gate + 完成 7.6 總驗收（含驗收報告產出）
- [x] 6.2 常駐 token 估算 ≤ 3,500（估算方式：中文字數 ×1.5 + 其他字元 ÷4）
- [x] 6.3 更新 `.claude/now.md`「當前 Change」段落
- [x] 6.4 回報使用者：驗收結果 + 使用者自辦事項清單（spec 第八節）

## 7. 補強 — 紀律閘門（addendum-紀律補強.md）

- [x] 7.1 git-guard.js：m_b_* commit 未帶 tasks.md → additionalContext 提醒（A 項）
- [x] 7.2 git-guard.js：commit message 型別前綴格式閘 → deny（B 項）
- [x] 7.3 deploy-release skill 補 commit 型別對照表（C 項）
- [x] 7.4 workflow skill 補「spec 撰寫標準」兩條（D 項）
- [x] 7.5 change 22 spec gate 7.3 指令修正（E 項）
- [x] 7.6 addendum 第四節 gate 全 ✅（含 regression）
- [x] 7.7 一個 commit（chore: 前綴、tasks.md 勾選同 commit）+ push

## 8. 補強 2 — heredoc 型別閘修正（addendum2-最終驗收與heredoc修正.md）

- [x] 8.1 git-guard.js 型別閘訊息擷取改三層判定（F 項）
- [x] 8.2 第四節 gate 全 ✅（F1–F8 + regression）
- [x] 8.3 一個 commit（chore: 前綴、tasks.md 勾選同 commit）+ push
