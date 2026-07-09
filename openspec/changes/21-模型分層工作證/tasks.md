# Change 21 — 模型分層工作證 — Tasks

> 進度唯一來源。依賴 change 20 完成後執行。
> 全部為 `.claude/` / 文件類變更，驗證方式為 spec.md 第七節驗收清單。

## 0. 前置

- [ ] 0.1 確認 change 20 已上線 main（skill 目錄與 git-guard deny 模式已存在）
- [ ] 0.2 從 main 切 `m_b_模型分層工作證` 並推遠端

## 1. Phase 1 — 角色 Command

- [ ] 1.1 建立 `.claude/commands/規劃.md`（標記寫入 / 職責 / 禁區 / 停止點交接 / 標記清除）
- [ ] 1.2 建立 `.claude/commands/實作.md`（同上，停止點改為呼叫收尾員子代理）
- [ ] 1.3 `.gitignore` 加入 `.claude/.session-role`
- [ ] 1.4 commit

## 2. Phase 2 — 收尾員子代理

- [ ] 2.1 建立 `.claude/agents/收尾員.md`（frontmatter：name / description / model: haiku）
- [ ] 2.2 內容依 spec 2.1：職責六步驟、禁區、回報格式
- [ ] 2.3 commit

## 3. Phase 3 — role-guard hook

- [ ] 3.1 建立 `.claude/hooks/role-guard.js`（無標記 → 放行；planner / engineer 依表 deny）
- [ ] 3.2 settings.json 註冊 PreToolUse matcher `Edit|Write|Bash`
- [ ] 3.3 `node --check` 通過
- [ ] 3.4 模擬驗證：無標記不攔 / planner 寫 frontend 被 deny / engineer 執行 git tag 被 deny
- [ ] 3.5 commit

## 4. Phase 4 — 文件整合

- [ ] 4.1 CLAUDE.md 加「Session 角色」小節（≤ 3 行）
- [ ] 4.2 workflow skill「執行計畫」補角色建議一句
- [ ] 4.3 deploy-release skill 補收尾員說明一句
- [ ] 4.4 commit

## 5. 收尾

- [ ] 5.1 跑完 spec.md 第七節驗收清單，全項通過
- [ ] 5.2 更新 `.claude/now.md`「當前 Change」段落
- [ ] 5.3 回報使用者：驗收結果 + 使用者自辦事項（spec 第八節）
