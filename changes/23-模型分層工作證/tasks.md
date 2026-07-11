# Change 23 — 模型分層工作證 — Tasks

> 進度唯一來源。每個 Phase 完成並通過 spec.md 第七節對應 gate 才勾 [x]，
> **勾選與該 Phase commit 同批**（git-guard 會提醒）。
> 全部為 `.claude/` / 文件類變更，不含產品程式碼，無 vitest 對象。
> 全部 commit：型別前綴（git-guard 強制）+ 結尾 trailer（Co-Authored-By + Claude-Session）。

## 0. 前置

- [x] 0.1 確認 change 22 已上線 main（v2.11.0：skill 目錄、git-guard deny、heredoc 型別閘 F 項）
- [x] 0.2 從 main 切 `m_b_模型分層工作證` 並推遠端

## 1. Phase 1 — 角色 Command

- [x] 1.1 建立 `.claude/commands/規劃.md`（標記寫入 / 職責 / spec 撰寫標準引用 / 禁區 / 停止點交接 / 標記清除）
- [x] 1.2 建立 `.claude/commands/實作.md`（同上，加：語言與回報紀律〔繁中、每 task 一行回報、Phase commit 回報 hash〕；停止點含：寫收尾筆記 → 呼叫收尾員子代理 → 清標記）
- [x] 1.3 `.gitignore` 加入 `.claude/.session-role`
- [x] 1.4 跑 7.1 gate 全 ✅ → commit

## 2. Phase 2 — 收尾員子代理

- [x] 2.1 建立 `.claude/agents/收尾員.md`（frontmatter：name / description / model: haiku）
- [x] 2.2 內容依 spec 2.1：讀收尾筆記 → CHANGELOG → context 檔 → now.md → 刪筆記 → commit（含 trailer 範本）→ tag 指令產出
- [x] 2.3 跑 7.2 gate 全 ✅ → commit

## 3. Phase 3 — role-guard hook

- [x] 3.1 建立 `.claude/hooks/role-guard.js`（無標記 → 放行；planner / engineer 依表 deny；deny 訊息附解除方式；讀檔失敗一律放行）
- [x] 3.2 建立 `.claude/hooks/lang-reminder.js`（UserPromptSubmit 每回合注入語言提醒，依 spec 3.2 參考實作）
- [x] 3.3 settings.json 註冊：role-guard（PreToolUse matcher `Edit|Write|Bash`）+ lang-reminder（UserPromptSubmit）
- [x] 3.4 跑 7.3 gate 全 ✅（含 pipe 實測 + git-guard regression 兩項 + lang-reminder 輸出驗證）→ commit

## 4. Phase 4 — 文件整合

- [x] 4.1 CLAUDE.md 加「Session 角色」小節（≤ 3 行）
- [x] 4.2 workflow skill「執行計畫」補「建議在 /實作 角色下執行」一句
- [x] 4.3 deploy-release skill 補收尾員說明一句
- [x] 4.4 deploy-release skill「git 指令規範」補 commit trailer 慣例（含 heredoc / 多 -m 寫法與 change 22 事件說明）
- [x] 4.5 CLAUDE.md 鐵律區加語言一行（含進度短報；與 4.1 合計常駐增量 ≤ 60 tokens）
- [x] 4.6 跑 7.4 gate 全 ✅（含常駐 token 估算 ≤ 3,500）→ commit

## 5. 收尾

- [x] 5.1 重跑 7.1–7.4 全部 gate + 完成 7.5 總驗收
- [x] 5.2 更新 `.claude/now.md`「當前 Change」段落
- [x] 5.3 回報使用者：驗收報告 + 使用者自辦事項（spec 第八節，特別是第 3 條的首次實地走流程驗收）
