# Change 20 — 規則體系重構與 Token 降本 — Tasks

> 進度唯一來源。每個 task 完成並通過該 Phase 驗證才勾 [x]。
> 本 change 全部是 `.claude/` / `scripts/` / 文件類變更，不含產品程式碼，無 vitest 對象；
> 驗證方式為 spec.md 第七節驗收清單中的靜態檢查。

## 0. 前置

- [ ] 0.1 從 main 切 `m_b_規則體系重構` 並推遠端

## 1. Phase 1 — 修矛盾

- [ ] 1.1 CLAUDE.md 修兩處壞連結（CHANGELOG 路徑、UIDESIGN 路徑）
- [ ] 1.2 刪除 `.cursorrules`
- [ ] 1.3 刪除 `.claude/RULES-MAP.md` + CLAUDE.md 索引表移除該列
- [ ] 1.4 產出遠端分支差異報告（dev、fix/landscape-orientation-overlay）交使用者決定
- [ ] 1.5 now.md 頂部加入地雷清理規則
- [ ] 1.6 commit（Phase 1 一個 commit）

## 2. Phase 2 — Hook 硬化 + 腳本化

- [ ] 2.1 git-guard.js：main commit 產品程式碼 → permissionDecision deny
- [ ] 2.2 git-guard.js：`git add -A` / 孤立 `git add .` → permissionDecision deny
- [ ] 2.3 新增 `scripts/sync-branches.sh`（`bash -n` 通過）
- [ ] 2.4 post-push-sync.js 輸出改為指向 sync-branches.sh
- [ ] 2.5 deploy.md / workflow.md 內嵌 sync 腳本替換為指向 scripts/sync-branches.sh
- [ ] 2.6 deploy.md 加入 merge `--no-ff` 規範
- [ ] 2.7 `node --check` 三個 hook 全通過 + 模擬 `git add -A` 確認實際被 deny
- [ ] 2.8 commit

## 3. Phase 3 — 規則合併與流程降本

- [ ] 3.1 main.md 內容併入 deploy.md，刪除 main.md
- [ ] 3.2 readme.md 內容併入 deploy.md，刪除 readme.md
- [ ] 3.3 README 規則降級為「僅功能上線 main 時重寫」（deploy.md + workflow.md 同步）
- [ ] 3.4 .claude/CHANGELOG.md 裁切（近 5 版全文，其餘一行索引）
- [ ] 3.5 settings.json：rules-injector matcher 移除 Read
- [ ] 3.6 CLAUDE.md 索引表同步（移除 main.md / readme.md 列）
- [ ] 3.7 commit

## 4. Phase 4 — Skill 化

- [ ] 4.1 建立 `.claude/skills/uidesign/SKILL.md`（UIDESIGN.md 全文 + frontend.md 開發段落，含 frontmatter）
- [ ] 4.2 建立 `.claude/skills/deploy-release/SKILL.md`（deploy.md 含已併入內容）
- [ ] 4.3 建立 `.claude/skills/database/SKILL.md`（database.md + backend.md 目錄/路由段落）
- [ ] 4.4 建立 `.claude/skills/workflow/SKILL.md`（workflow.md 全文）
- [ ] 4.5 rules-injector.js 改為 skill 載入提醒（main 警告文字內嵌 hook）
- [ ] 4.6 重寫 CLAUDE.md（依 spec 4.3 草稿，已定案決策表原封保留）
- [ ] 4.7 刪除已搬移的 `.claude/rules/*.md`
- [ ] 4.8 全 repo grep 確認無 `.claude/rules/` 殘留引用
- [ ] 4.9 commit

## 5. Phase 5 — OpenSpec 工具殘骸清理

- [ ] 5.1 刪除 `openspec/changes/` 下所有已完成 change 資料夾（01–19，含兩個 17；保留 20）
- [ ] 5.2 `git mv openspec/changes changes`，刪除空的 `openspec/`
- [ ] 5.3 全 repo grep `openspec`：規則/skill 文字中「OpenSpec change」→「change」、路徑改 `changes/`
- [ ] 5.4 workflow skill 補「新 change 編號 = 現存最大編號 + 1」一句
- [ ] 5.5 刪除「雙裝置工作流」整段（確認 now.md 地雷區已涵蓋 CCR 環境事實）
- [ ] 5.6 commit

## 6. 收尾

- [ ] 6.1 跑完 spec.md 第七節驗收清單，全項通過
- [ ] 6.2 常駐 token 估算 ≤ 3,500（估算方式：中文字數 ×1.5 + 其他字元 ÷4）
- [ ] 6.3 更新 `.claude/now.md`「當前 Change」段落
- [ ] 6.4 回報使用者：驗收結果 + 使用者自辦事項清單（spec 第八節）
