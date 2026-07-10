# Change 23 — 模型分層工作證（三層角色邊界系統）【正式版】

> 由顧問 session（Claude Fable 5）與使用者討論定案後產出，供 Sonnet 直接執行。
> 本正式版整併兩個來源：(1) 2026-07-09 原草稿的三層架構（已與使用者定案，不推翻）；
> (2) change 22 全程執行與驗收累積的實戰教訓（trailer 消失事件、heredoc 型別閘 F 項修正、
> 收尾上下文交接缺口、gate 指令必須實測標準）。
> **依賴已滿足**：change 22 已上線 main（v2.11.0）——skill 目錄、git-guard deny 模式、
> deploy-release skill、commit 型別閘（含 heredoc 三層判定）皆已就緒。
> 產出日期：2026-07-10

---

## 一、背景與需求

使用者的模型分層策略：

| 模型 | 角色 | 職責 | 停止點 |
|---|---|---|---|
| Opus / Fable | 顧問 / 架構師 | 需求探索、糾錯導正、寫 spec.md + tasks.md、驗收 | spec + tasks 完成並經使用者確認 → 停止並交接 |
| Sonnet | 全端工程師 | 照 tasks.md 實作、蓋一層測一層、寫 README、逐 Phase commit | 全部 task 勾完 + README 完成 → 寫收尾筆記、呼叫收尾員子代理 |
| Haiku | 收尾員（**子代理**） | 記錄類收尾：CHANGELOG、context 檔、now.md、tag 指令準備 | 完成後回報主 session |

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
   實作 → 收尾的交接用**子代理**。
4. **交接素材必須落盤**（change 22 教訓新增）：子代理冷啟動、不帶主對話記憶。
   收尾所需資訊中，diff / deploy 慣例在磁碟上，但**學習日誌素材（實作中遇到的坑）
   與版本摘要只存在於實作 session 的記憶裡**——實作 session 停止點前必須先把這些
   寫進「收尾筆記」檔案，子代理才能無損接手（見 Phase 1.2 / 2.1）。
5. **分工邊界（change 22 討論定案）**：程式碼的 commit 由實作 session 自己做
   （commit message 品質來自實作上下文，外包給冷啟動子代理是負節省）；
   **收尾員只 commit 它自己產出的記錄檔**，一行程式碼都不碰。
   tag 不外包：CCR 沙箱 tag push 會 403，且 tag 綁「功能上線」需使用者確認——
   收尾員只**產出指令**交使用者執行。

### change 22 實戰教訓的制度化（本 change 一併落地）

| 教訓 | 事件 | 制度化位置 |
|---|---|---|
| commit trailer 不可丟 | change 22 補強兩個 commit 因繞 heredoc 限制改用單行訊息，`Co-Authored-By` + `Claude-Session` trailer 消失，模型可追溯性中斷（驗收時靠 trailer 才能回答「哪個模型做的」） | deploy-release skill 補 trailer 慣例（Phase 4.4）；收尾員定義內建 trailer 範本（Phase 2.1） |
| 便宜模型要關在圍欄裡 | Haiku 判斷力弱，能安全做收尾的前提是 change 22 的閘門（前綴 deny、tasks.md 提醒、main 產品碼 deny）已存在——子代理的工具呼叫同樣經過 PreToolUse hook | 已由 change 22 完成，本 spec 明文依賴 |
| gate 指令必須實測 | change 22 gate 7.3 的 grep 計數字面不可能達成 | 本 spec 第七節 gate 全部採用 change 22 補強驗證中**實際跑過的同型指令**（JSON pipe 測 hook、假 repo 模擬） |

### 語言紀律三層治理（使用者回饋新增，2026-07-10）

實測發現 Sonnet 實作 session 的進度短報常漂移為英文（偶發韓文 / 日文）——
CLAUDE.md 的語言規則是 ambient prose，模型埋頭程式碼幾十個 tool call 後注意力衰減，
與 change 22 之前「分支規則寫在文件裡沒人理」同病。語言輸出不是 tool call，
無法 deny 硬攔，改用三層便宜治理（總成本：常駐 +約 20 tokens、每回合 +約 25 tokens）：

| 層 | 機制 | 落地位置 |
|---|---|---|
| 1 | CLAUDE.md 鐵律區加一行（涵蓋 tool call 之間的進度短報） | Phase 4.5 |
| 2 | UserPromptSubmit hook 每回合注入一行語言提醒（規則在動作時點在場） | Phase 3.3 |
| 3 | `/實作` 角色卡內建語言與回報紀律（每 task 繁中一行回報，治「看不到進度」的不安） | Phase 1.2 要件 3 |

### 已知限制（明文告知使用者，不隱藏）

- Hook 讀不到當前 session 用的是哪個模型。本系統強制的是「角色標記」的邊界，
  **無法驗證使用者真的切了對的模型**（例如在 Opus session 打 `/實作` 不會被擋）。
  模型選擇仍靠使用者自律；角色邊界由系統強制。
- 「收尾員不改產品程式碼」無法用 role-guard 硬攔截（子代理與主 session 共用
  engineer 標記），以 agent 定義中的 prose 約束 + 職責範圍小為緩解。

---

## 二、執行約束（Sonnet 必讀）

1. 分支：從 main 切 `m_b_模型分層工作證`，推遠端。
2. 不碰 `server/`、`frontend/` 產品程式碼。
3. 新 hook 必過 `node --check`；**不得破壞 change 22 建立的既有 hook 行為**
   （第七節 gate 含 regression 把關）。
4. 每個 Phase 一個 commit，**tasks.md 勾選與該 Phase commit 同批**（git-guard 會提醒）；
   使用者中途手動 commit 允許，但須在驗收報告揭露。
5. commit 訊息帶型別前綴（git-guard 強制）+ 結尾 trailer（`Co-Authored-By` + `Claude-Session`）。
6. spec 未涵蓋的判斷點 → 停下來問使用者，不要自行決定。

---

## 三、Phase 1 — 角色 Command（開工打卡）

> 用 `.claude/commands/`（使用者主動呼叫的 slash command，比照既有 `子代理.md`），
> 不用 skill——角色設定是使用者主動行為，不適合靠模型自動判斷載入。

### 1.1 `.claude/commands/規劃.md`

內容要件：

1. 第一步執行：`echo "planner" > .claude/.session-role`
2. 宣告角色：顧問 / 架構師（Opus / Fable session 使用）。
   職責：需求探索（比照 workflow skill 的「新功能」流程）、指出使用者方向錯誤並導正、
   撰寫 spec.md + tasks.md。
3. **spec 撰寫標準**（引用 workflow skill 同名小節）：驗證 gate 每條指令必須實測；
   commit 數驗收條款要寫明使用者手動 commit 例外。
4. 禁區：**不寫任何產品程式碼**（`server/`、`frontend/`）。需求中的程式碼疑問用讀的，不用改的。
5. 停止點：spec + tasks 完成且使用者確認後——
   a. 輸出交接訊息：「規劃完成。請開新 session、切換 Sonnet，輸入 `/實作` 後說
      『執行計畫 change NN』。」
   b. 執行 `rm -f .claude/.session-role`（清除標記，避免殘留污染下個 session）
   c. 結束，不多做任何一步。

### 1.2 `.claude/commands/實作.md`

內容要件：

1. 第一步執行：`echo "engineer" > .claude/.session-role`
2. 宣告角色：全端工程師（Sonnet session 使用）。
   職責：讀當前 change 的 spec.md + tasks.md，依 workflow skill「執行計畫」流程逐 task 實作，
   蓋一層測一層，每 Phase 一個 commit（tasks.md 同勾、trailer 必附），最後完整重寫 README。
3. **語言與回報紀律**（使用者在遠端行動裝置監工，這是唯一的能見度來源）：
   - 所有回覆與 tool call 之間的進度短報**一律繁體中文（台灣用語）**，技術術語可英文；
   - 每完成一個 task：一行繁中回報「已完成 N.N〔做了什麼〕，驗證〔結果〕」；
   - 每個 Phase commit 後：回報 commit hash 與下一步。
4. 禁區：不擴大 spec 範圍（要改先問使用者）；不執行 `git tag`、不 push main（hook 會擋）。
5. 停止點：全部 task `[x]` + 測試綠 + README 完成後——
   a. **寫收尾筆記** `changes/NN-名稱/收尾筆記.md`，內容四段：
      版本號、改動摘要（給 CHANGELOG 用）、學習日誌素材（實作中遇到的坑：
      現象 / 試過的方法 / 最終解法 / 根本原因）、驗證結果摘要（gate 輸出重點）。
      沒遇到坑就寫「無」，不可省略檔案。
   b. 呼叫**收尾員子代理**（Agent tool，名稱「收尾員」），prompt 只需一句：
      「執行收尾，收尾筆記在 changes/NN-名稱/收尾筆記.md」。
   c. 子代理回報後，執行 `rm -f .claude/.session-role`，向使用者總結
      （含子代理回報轉述 + 待使用者執行的指令）並結束。

### 1.3 `.gitignore` 加入 `.claude/.session-role`

標記檔屬 session 狀態，禁止進版控（否則跨裝置互相污染）。

---

## 四、Phase 2 — 收尾員子代理（Haiku）

### 2.1 `.claude/agents/收尾員.md`

```markdown
---
name: 收尾員
description: 功能完成後的收尾專員 — CHANGELOG、.claude/context 版本檔、now.md 更新、tag 指令準備、記錄檔 commit。不修改任何產品程式碼。
model: haiku
---

# 收尾員

你是收尾專員，負責功能完成後的記錄工作。這些是小事但關係回溯能力，一項都不可省略。

## 職責（依序執行）

1. 讀 `changes/NN-名稱/收尾筆記.md`（主 session 留給你的交接素材：版本號、改動摘要、
   學習日誌素材、驗證結果）。找不到此檔 → 停止並回報主 session，不要自己猜內容。
2. 載入 deploy-release skill，依其 checklist 工作。
3. 更新 `.claude/CHANGELOG.md`（頂部加新版本摘要；維持近 5 版全文、更早一行索引的裁切規則）。
4. 建立 `.claude/context/vX.Y.Z.md`（背景 / 改動檔案 / 關鍵設計決策 / 學習日誌 / 驗證結果，
   格式依 deploy-release skill；學習日誌直接取材收尾筆記，不可自行編造）。
5. 更新 `.claude/now.md`（最近推送段落 + 當前 Change 段落）。
6. 刪除 `changes/NN-名稱/收尾筆記.md`（內容已由 context 檔承載，不留第二份）。
7. commit：`git add <具體檔案>`（禁止 -A），一個 commit 包含步驟 3–6 全部檔案。
   訊息格式：

   git commit -m "docs: vX.Y.Z 上線準備 — CHANGELOG、context、now.md" \
     -m "Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>" \
     -m "Claude-Session: <本 session 連結>"

8. 產出 tag 與 push 指令**給使用者確認後執行**（不自行 push main；
   CCR 沙箱 tag push 會 403，屆時直接給使用者手動指令）。

## 禁區

- 不修改 `server/`、`frontend/` 任何檔案。發現程式碼問題 → 記入回報，交回主 session，不動手修。
- 不執行 `git push origin main`、不自行打 tag（產出指令由使用者執行）。
- 不 commit 任何非自己產出的檔案。

## 回報格式

完成後回報：已更新的檔案清單、commit hash、待使用者執行的指令、發現的問題（若有）。
```

### 2.2 設計備註

- 子代理冷啟動不帶主對話記憶——磁碟上有 diff 與 deploy 慣例，
  記憶類資訊（學習日誌、版本摘要）由收尾筆記落盤交接（設計原則 4）。
- 子代理的工具呼叫同樣經過 PreToolUse hooks：git-guard 的 deny
  （main commit 產品碼、`git add -A`、缺型別前綴）對它一樣生效——這是便宜模型的圍欄。

---

## 五、Phase 3 — role-guard hook（確定性圍籬）

### 3.1 新增 `.claude/hooks/role-guard.js`

註冊於 settings.json：PreToolUse，matcher `Edit|Write|Bash`（與既有 rules-injector、
git-guard 並存，互不取代）。

邏輯：

1. 讀 `.claude/.session-role`；**檔案不存在 → 直接 exit 0（不攔截）**，
   一般 session 完全不受影響（向後相容）。
2. 依標記攔截，使用 change 22 建立的 `permissionDecision: 'deny'` 輸出格式：

| 標記 | 工具 | 攔截條件 | deny 訊息要點 |
|---|---|---|---|
| `planner` | Edit / Write | 目標路徑在 `server/`、`frontend/`、`package.json`、migrations | 「規劃 session 不寫程式碼——把需求寫進 spec.md。若要換角色：/實作 或刪除 .claude/.session-role」 |
| `engineer` | Bash | 指令含 `git tag` 或 `git push origin main`（**沿用 git-guard 的 cmdSegments 切段比對**，只比對段開頭，避免 commit 訊息內含 "git tag" 字樣誤判） | 「實作 session 到此為止——請呼叫收尾員子代理接手」 |

3. deny 訊息一律附「如何解除」（換角色指令或刪標記檔），避免使用者被鎖死
   （change 22 教訓：拒絕訊息本身要是教學，被擋的人一次重試就能過）。

### 3.2 新增 `.claude/hooks/lang-reminder.js`（語言紀律第 2 層）

註冊於 settings.json：**UserPromptSubmit**（每次使用者訊息送出時觸發，無需 matcher）。
不讀 stdin、無條件輸出一行提醒——規則在動作時點在場，不靠 ambient prose：

```js
#!/usr/bin/env node
// UserPromptSubmit hook: 每回合注入語言提醒
// 原因：CLAUDE.md 的語言規則在長 session 中注意力衰減，實測出現英/韓/日文漂移。
// 成本：每回合約 25 tokens，對比 change 22 每請求省 16.5K，可忽略。
const output = {
  hookSpecificOutput: {
    hookEventName: 'UserPromptSubmit',
    additionalContext: '🈶 [lang] 回覆與 tool call 之間的進度短報一律繁體中文（台灣用語）；技術術語可英文。'
  }
};
process.stdout.write(JSON.stringify(output) + '\n');
```

### 3.3 已知誤判邊界（實作時注意）

- engineer 的 `git push origin main` 攔截與 git-guard 第 5 類（警告）並存：
  role-guard deny 先生效即可，不需改 git-guard。
- `.claude/.session-role` 讀取失敗（權限、編碼）一律當作「無標記」放行——
  role-guard 錯的方向必須是「漏攔」不是「誤鎖」（它是紀律輔助，git-guard 才是安全底線）。
- 路徑比對必須用 `-c core.quotepath` 無關的來源（hook 收到的是 tool_input.file_path，
  非 git 輸出，不受 quotepath 影響；此註記防止未來誤加不必要的處理）。

---

## 六、Phase 4 — 文件整合

1. CLAUDE.md「Skill 索引」表下方加一小節（**≤ 3 行**，守住常駐 token 預算）：

   ```markdown
   ## Session 角色（模型分層）

   開 session 先打卡：Opus/Fable 規劃 → `/規劃`；Sonnet 實作 → `/實作`。收尾由「收尾員」子代理（Haiku）自動執行。
   ```

2. workflow skill 的「執行計畫」段落補一句：「建議在 `/實作` 角色下執行」。
3. deploy-release skill 補一句：「功能上線的記錄類收尾（CHANGELOG / context / now.md）
   由收尾員子代理執行」。
4. **deploy-release skill「git 指令規範」補 trailer 慣例**（change 22 教訓制度化）：

   每個 AI session 的 commit 訊息結尾必附兩行 trailer，標明執行模型與 session 來源
   （使用者手動 commit 不強制）：

   ```
   Co-Authored-By: Claude <模型名> <noreply@anthropic.com>
   Claude-Session: <session 連結>
   ```

   多行訊息寫法：heredoc 可用（型別閘 F 項已支援，首行必須是「type: 標題」），
   或多個 `-m` 分段（最後一個 `-m` 放 trailer）。
   丟失 trailer = 模型可追溯性中斷（change 22 補強期間發生過，驗收時靠 trailer
   才能回答「哪個 commit 是哪個模型做的」）。

5. **CLAUDE.md 鐵律區加語言一行**（語言紀律第 1 層）：

   ```
   - ⛔ 所有對使用者的文字輸出（含 tool call 之間的進度短報）一律繁體中文（台灣用語）
   ```

   放在鐵律清單最末（非 hook 攔截項，但升格鐵律 = 每次對話必見）。
   本項 + 第 1 項的「Session 角色」小節，合計常駐增量須 ≤ 60 tokens（7.4 gate 的
   token 估算把關）。

---

## 七、驗證 gate（Sonnet 執行用；每 Phase 全 ✅ 才 commit）

> 撰寫聲明：以下 hook 測試指令與 change 22 補強驗證中**實際執行過的同型指令**
> 一致（JSON pipe 餵 hook、標記檔切換模擬），計數類 grep 已逐條核過預期值定義
> （spec 撰寫標準）。role-guard.js 為新檔，其測試於實作後首跑。

### 7.1 Phase 1 gate

```bash
ls .claude/commands/規劃.md .claude/commands/實作.md      # 預期：兩檔皆存在
grep -c "session-role" .gitignore                          # 預期：≥ 1
# 兩個 command 各自包含五要件（標記寫入/職責/禁區/停止點/標記清除）
for f in .claude/commands/規劃.md .claude/commands/實作.md; do
  echo "== $f"
  grep -c "session-role" "$f"                              # 預期：≥ 2（寫入 + 清除各一）
  grep -c "停止點" "$f"                                    # 預期：≥ 1
done
grep -c "收尾筆記" .claude/commands/實作.md                # 預期：≥ 1（交接素材落盤步驟存在）
grep -c "繁體中文" .claude/commands/實作.md                # 預期：≥ 1（語言與回報紀律存在）
```

### 7.2 Phase 2 gate

```bash
head -6 .claude/agents/收尾員.md            # 預期：frontmatter 含 name / description / model: haiku
grep -c "model: haiku" .claude/agents/收尾員.md            # 預期：1
grep -c "收尾筆記" .claude/agents/收尾員.md                # 預期：≥ 2（讀取 + 刪除各至少一處）
grep -c "Co-Authored-By" .claude/agents/收尾員.md          # 預期：≥ 1（trailer 範本存在）
```

### 7.3 Phase 3 gate（hook 實測，pipe 餵 JSON）

```bash
node --check .claude/hooks/role-guard.js && node --check .claude/hooks/git-guard.js \
  && node --check .claude/hooks/lang-reminder.js

# 語言提醒 hook：無條件輸出繁中提醒
echo '{}' | node .claude/hooks/lang-reminder.js   # 預期：JSON 含 "繁體中文" 與 hookEventName UserPromptSubmit
grep -c "UserPromptSubmit" .claude/settings.json  # 預期：≥ 1（已註冊）

# 無標記 → 完全不攔（向後相容）
rm -f .claude/.session-role
echo '{"tool_name":"Edit","tool_input":{"file_path":"frontend/src/App.jsx"}}' \
  | node .claude/hooks/role-guard.js        # 預期：無輸出

# planner 寫產品碼 → deny
echo "planner" > .claude/.session-role
echo '{"tool_name":"Edit","tool_input":{"file_path":"frontend/src/App.jsx"}}' \
  | node .claude/hooks/role-guard.js        # 預期：含 "permissionDecision":"deny" 與解除方式

# planner 寫 spec 文件 → 放行
echo '{"tool_name":"Write","tool_input":{"file_path":"changes/24-x/spec.md"}}' \
  | node .claude/hooks/role-guard.js        # 預期：無輸出

# engineer 執行 git tag → deny；commit 訊息內含 "git tag" 字樣 → 不誤判
echo "engineer" > .claude/.session-role
echo '{"tool_name":"Bash","tool_input":{"command":"git tag v9.9.9"}}' \
  | node .claude/hooks/role-guard.js        # 預期：deny
echo '{"tool_name":"Bash","tool_input":{"command":"git commit -m \"docs: 說明 git tag 規則\""}}' \
  | node .claude/hooks/role-guard.js        # 預期：無 deny
rm -f .claude/.session-role

# regression：git-guard 既有行為不變（change 22 全套）
echo '{"tool_name":"Bash","tool_input":{"command":"git add -A"}}' \
  | node .claude/hooks/git-guard.js         # 預期：deny
echo '{"tool_name":"Bash","tool_input":{"command":"git commit -m \"更新 x\""}}' \
  | node .claude/hooks/git-guard.js         # 預期：deny（缺型別前綴）
```

### 7.4 Phase 4 gate

```bash
grep -c "Session 角色" CLAUDE.md                           # 預期：1（且新增段 ≤ 3 行，人工目視）
grep -c "繁體中文" CLAUDE.md                               # 預期：≥ 2（原語言小節 + 新鐵律行）
grep -c "/實作" .claude/skills/workflow/SKILL.md           # 預期：≥ 1
grep -c "收尾員" .claude/skills/deploy-release/SKILL.md    # 預期：≥ 1
grep -c "Co-Authored-By" .claude/skills/deploy-release/SKILL.md   # 預期：≥ 1（trailer 慣例）

# 常駐 token 估算（CLAUDE.md 增段後仍須 ≤ 3,500；commands / agents 不常駐、不計）
python3 -c "
import re, glob
files = ['CLAUDE.md', '.claude/now.md']
total = 0
for f in files:
    s = open(f, encoding='utf-8').read()
    cjk = len(re.findall(r'[一-鿿]', s)); total += cjk*1.5 + (len(s)-cjk)/4
for f in glob.glob('.claude/skills/*/SKILL.md'):
    s = open(f, encoding='utf-8').read()
    desc = s.split('---')[1] if s.count('---') >= 2 else ''
    cjk = len(re.findall(r'[一-鿿]', desc)); total += cjk*1.5 + (len(desc)-cjk)/4
print(f'常駐估算: {int(total)} tokens（門檻 3500）')
"
```

### 7.5 總驗收

- [ ] 7.1–7.4 全 ✅（後面 Phase 完成後重跑前面 gate，防互相改壞）
- [ ] `git log --oneline main..HEAD`：每 Phase 一個 commit（使用者手動 commit 例外，需揭露）
- [ ] 全部 commit 帶型別前綴 + trailer
- [ ] tasks.md 全勾，且勾選與各 Phase commit 同批
- [ ] 產出驗收報告：各 gate 結果、常駐 token 數、待使用者確認事項

---

## 八、使用者自辦事項

1. 模型選擇仍是手動：開規劃 session 記得切 Opus / Fable、實作 session 切 Sonnet
   （系統只能強制角色邊界，無法驗證模型身分，見「已知限制」）。
2. 首次使用後回饋停止點的體感：太早停 / 太晚停 → 微調 command 內的停止條件文字即可。
   語言漂移若仍偶發，回報顧問 session 再加強（下一級手段是 Stop hook 攔截重寫，
   成本較高，先不用）。
3. **開 session 第一句用繁體中文下指令**——模型會跟隨對話主導語言，英文標題 /
   英文開場的 session 容易整場被錨定成英文（語言紀律三層之外的免費習慣）。
4. 本 change 上線後的第一個新 change，全程走 `/規劃` → `/實作` → 收尾員流程跑一遍，
   實地驗證三層交接與語言紀律（這是第七節 gate 測不到的人眼驗收）。
