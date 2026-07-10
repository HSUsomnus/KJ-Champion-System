# Change 23 — 模型分層工作證（三層角色邊界系統）

> 由顧問 session（Claude Fable 5）與使用者討論定案後產出，供 Sonnet 執行。
> **依賴：change 22 完成後才執行**（需要 change 22 建立的 skill 目錄、
> git-guard deny 模式、deploy-release skill）。
> 產出日期：2026-07-09

---

## 一、背景與需求

使用者的模型分層策略：

| 模型 | 角色 | 職責 | 停止點 |
|---|---|---|---|
| Opus | 顧問 / 架構師 | 需求探索、糾錯導正、寫 spec.md + tasks.md | spec + tasks 完成並經使用者確認 → 停止並交接 |
| Sonnet | 全端工程師 | 照 tasks.md 實作、蓋一層測一層、寫 README | 全部 task 勾完 + README 完成 → 呼叫收尾員子代理 |
| Haiku | 收尾員（**子代理**） | commit、CHANGELOG、context 檔、now.md、tag 準備 | 完成後回報主 session |

需求核心：**每個角色只做界內的事，到停止點必停**。

### 設計原則（討論定案）

1. **Skill / Hook 無法切換 session 模型**——模型只能由使用者手動選擇。
   例外：**子代理可以在定義中指定自己的模型**（`model: haiku`）。
2. 因此採「三張工作證」架構：
   - **Command 定義角色**（使用者 session 開始打卡）→ 讓模型「想停」
   - **Hook 看守邊界**（deny 硬攔截）→ 保證「必停」
   - **收尾工作交給 Haiku 子代理**（在 Sonnet session 內自動委派）→ 第三層免換 session
3. 規劃 → 實作的交接用**換 session**（spec/tasks 本來就是交接文件，
   且 prompt cache 依模型分開，換 session 反而省）；
   實作 → 收尾的交接用**子代理**（收尾所需上下文都在磁碟上，冷啟動無損）。

### 已知限制（明文告知使用者，不隱藏）

- Hook 讀不到當前 session 用的是哪個模型。本系統強制的是「角色標記」的邊界，
  **無法驗證使用者真的切了對的模型**（例如在 Opus session 打 `/實作` 不會被擋）。
  模型選擇仍靠使用者自律；角色邊界由系統強制。

---

## 二、執行約束（Sonnet 必讀）

1. 分支：change 22 上線後，從 main 切 `m_b_模型分層工作證`，推遠端。
2. 不碰 `server/`、`frontend/` 產品程式碼。
3. 新 hook 必過 `node --check`；改動不得破壞 change 22 建立的既有 hook 行為。
4. 每個 Phase 一個 commit；spec 未涵蓋的判斷點 → 停下來問使用者。

---

## 三、Phase 1 — 角色 Command（開工打卡）

> 用 `.claude/commands/`（使用者主動呼叫的 slash command，比照既有 `子代理.md`），
> 不用 skill——角色設定是使用者主動行為，不適合靠模型自動判斷載入。

### 1.1 `.claude/commands/規劃.md`

內容要件：

1. 第一步執行：`echo "planner" > .claude/.session-role`
2. 宣告角色：顧問 / 架構師（Opus session 使用）。
   職責：需求探索（比照 workflow skill 的「新功能」流程）、指出使用者方向錯誤並導正、
   撰寫 spec.md + tasks.md。
3. 禁區：**不寫任何產品程式碼**（`server/`、`frontend/`）。需求中的程式碼疑問用讀的，不用改的。
4. 停止點：spec + tasks 完成且使用者確認後——
   a. 輸出交接訊息：「規劃完成。請開新 session、切換 Sonnet，輸入 `/實作` 後說
      『執行計畫 change NN』。」
   b. 執行 `rm -f .claude/.session-role`（清除標記，避免殘留污染下個 session）
   c. 結束，不多做任何一步。

### 1.2 `.claude/commands/實作.md`

內容要件：

1. 第一步執行：`echo "engineer" > .claude/.session-role`
2. 宣告角色：全端工程師（Sonnet session 使用）。
   職責：讀當前 change 的 spec.md + tasks.md，依 workflow skill「執行計畫」流程逐 task 實作，
   蓋一層測一層，最後完整重寫 README。
3. 禁區：不擴大 spec 範圍（要改先問使用者）；不執行 `git tag`、不 push main（hook 會擋）。
4. 停止點：全部 task `[x]` + 測試綠 + README 完成後——
   a. 呼叫**收尾員子代理**（Agent tool，名稱「收尾員」），把 change 名稱、版本號、
      本次改動摘要交給它。
   b. 子代理回報後，執行 `rm -f .claude/.session-role`，向使用者總結並結束。

### 1.3 `.gitignore` 加入 `.claude/.session-role`

標記檔屬 session 狀態，禁止進版控（否則跨裝置互相污染）。

---

## 四、Phase 2 — 收尾員子代理（Haiku）

### 2.1 `.claude/agents/收尾員.md`

```markdown
---
name: 收尾員
description: 功能完成後的收尾專員 — commit、CHANGELOG、.claude/context 版本檔、now.md 更新、tag 指令準備。不修改任何產品程式碼。
model: haiku
---

# 收尾員

你是收尾專員，負責功能完成後的記錄工作。這些是小事但關係回溯能力，一項都不可省略。

## 職責（依序執行）

1. 載入 deploy-release skill，依其 checklist 工作。
2. 更新 `.claude/CHANGELOG.md`（頂部加新版本摘要）。
3. 建立 `.claude/context/vX.Y.Z.md`（背景 / 改動檔案 / 關鍵設計決策 / 學習日誌 / 驗證結果，
   格式依 deploy-release skill）。
4. 更新 `.claude/now.md`（最近推送段落 + 當前 Change 段落，與本次收尾同一個 commit）。
5. commit：`git add <具體檔案>`（禁止 -A），訊息用 `chore: vX.Y.Z 上線準備 — ...`。
6. 產出 tag 與 push 指令**給使用者確認後執行**（不自行 push main；
   CCR 沙箱 tag push 會 403，屆時直接給使用者手動指令）。

## 禁區

- 不修改 `server/`、`frontend/` 任何檔案。發現程式碼問題 → 記入回報，交回主 session，不動手修。
- 不執行 `git push origin main`、不自行打 tag（產出指令由使用者執行）。

## 回報格式

完成後回報：已更新的檔案清單、commit hash、待使用者執行的指令、發現的問題（若有）。
```

### 2.2 設計備註

- 子代理是冷啟動，不帶主對話記憶——所需上下文（diff、deploy 慣例）全在磁碟，
  主 session 呼叫時只需附上 change 名稱、版本號、改動摘要一段話。
- 子代理的工具呼叫同樣經過 PreToolUse hooks，git-guard 的 deny（main commit 產品碼、
  `git add -A`）對它一樣生效。
- 「不改產品程式碼」這條無法用 role-guard 硬攔截（子代理與主 session 共用 engineer 標記），
  以 agent 定義中的 prose 約束 + 職責範圍小為緩解，屬已知限制。

---

## 五、Phase 3 — role-guard hook（確定性圍籬）

### 3.1 新增 `.claude/hooks/role-guard.js`

註冊於 settings.json：PreToolUse，matcher `Edit|Write|Bash`。

邏輯：

1. 讀 `.claude/.session-role`；**檔案不存在 → 直接 exit 0（不攔截）**，
   一般 session 完全不受影響（向後相容）。
2. 依標記攔截，使用 change 22 建立的 `permissionDecision: 'deny'` 格式：

| 標記 | 工具 | 攔截條件 | deny 訊息要點 |
|---|---|---|---|
| `planner` | Edit / Write | 目標路徑在 `server/`、`frontend/`、`package.json`、migrations | 「規劃 session 不寫程式碼——把需求寫進 spec.md。若要換角色：/實作 或刪除 .claude/.session-role」 |
| `engineer` | Bash | 指令含 `git tag` 或 `git push origin main`（沿用 git-guard 的切段比對，避免 heredoc 誤判） | 「實作 session 到此為止——請呼叫收尾員子代理接手」 |

3. deny 訊息一律附「如何解除」（換角色指令或刪標記檔），避免使用者被鎖死。

### 3.2 驗證

- `node --check` 通過。
- 模擬三種情境：無標記（不攔）、planner 寫 frontend（deny）、engineer 執行 git tag（deny）。

---

## 六、Phase 4 — 文件整合

1. CLAUDE.md「Skill 索引」表下方加一小節（三行內）：

   ```
   ## Session 角色（模型分層）
   開 session 先打卡：Opus → `/規劃`；Sonnet → `/實作`。收尾由「收尾員」子代理（Haiku）自動執行。
   ```

2. workflow skill 的「執行計畫」段落補一句：「建議在 `/實作` 角色下執行」。
3. deploy-release skill 補一句：「功能上線的記錄類工作由收尾員子代理執行」。

---

## 七、驗收清單

- [ ] `node --check .claude/hooks/role-guard.js` 通過
- [ ] 無標記檔時，Edit/Write/Bash 行為與 change 23 之前完全一致
- [ ] `planner` 標記下 Edit `frontend/` 任一檔 → 實際被 deny
- [ ] `engineer` 標記下 `git tag vX` → 實際被 deny，且 heredoc 內含 "git tag" 字樣不誤判
- [ ] `.claude/agents/收尾員.md` frontmatter 合法（name / description / model: haiku）
- [ ] `.gitignore` 含 `.claude/.session-role`
- [ ] 兩個 command 檔各自包含：標記寫入、職責、禁區、停止點交接、標記清除
- [ ] CLAUDE.md 新增內容 ≤ 3 行（守住常駐 token 預算）

## 八、使用者自辦事項

1. 模型選擇仍是手動：開規劃 session 記得切 Opus、實作 session 切 Sonnet
   （系統只能強制角色邊界，無法驗證模型身分，見「已知限制」）。
2. 首次使用後回饋停止點的體感：太早停 / 太晚停 → 微調 command 內的停止條件文字即可。
