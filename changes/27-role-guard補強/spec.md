# Change 27 — role-guard 補強（標記殘留提示 + push-main 誤攔修正）

## 背景

2026-07-12 VPS 實驗（remote-control session 被 role-guard 攔 push main）後的診斷結論：
圍籬環境無關屬設計本意、**不開洞**，但診斷過程實測發現兩個缺陷：

1. **標記殘留**：`.claude/.session-role` 只在 `/實作` 停止點刪除。session 中斷、context 爆掉、使用者中途換題，標記就永久留在工作目錄。之後同目錄的任何新對話（即使沒打卡）都被當 engineer/planner/doctor 攔截，且**新 session 不自知**，第一反應常誤判成環境問題。CCR 容器短命會自癒；**VPS 長駐工作目錄特別容易踩**。
2. **push-main regex 誤攔**：`role-guard.js:56` 的 `\bmain\b` 會命中任何含 main 這個 word 的分支名。實測（2026-07-12）：`git push -u origin fix-main-layout` 被 deny。engineer 被要求每 Phase 立即 push，功能分支撞名會卡死。
3. **交給使用者的終端機指令不自包含**（2026-07-12 change 26 上線實測教訓）：使用者在 Termius 貼指令，SSH 登入起點是家目錄 `~`，session 給的指令沒帶 `cd` → 連環 `fatal: not a git repository`；指令含 `<路徑>` 佔位符 → 使用者原樣貼上，bash 把 `<` 當重導向，`syntax error near '&&'`。

## 範圍

- ✅ `.claude/hooks/role-guard.js`（engineer push-main 判定收緊為 token 比對）
- ✅ `.claude/hooks/session-role-notice.js`（新增 SessionStart hook：殘留標記提示）
- ✅ `.claude/settings.json`（註冊 SessionStart hook）
- ✅ `.claude/commands/實作.md`（停止點補「使用者終端機指令紀律」）
- ✅ `.claude/commands/vps新對話.md`（新增：remote-control session 開新／關閉管理）
- ❌ 不動 `/實作`、`/規劃`、`/診斷` 打卡格式（殘留偵測用檔案 mtime，不需嵌時間戳）
- ❌ 不做「標記自動過期放行」（見設計決策 1）
- ❌ 不動 `server/`、`frontend/` 任何產品程式碼

## 技術設計

### 1. push-main 判定收緊（role-guard.js engineer 段）

現行（`role-guard.js:56`）：

```js
/^git push\b.*\borigin\b.*\bmain\b/.test(t)
```

改為 token 比對：段開頭是 `git push` 時，把該段以空白切成 token，
任一 token 符合以下才 deny：

- 等於 `main` 或 `refs/heads/main`（直接推 main ref）
- refspec 形式：`/^[^:]*:(refs\/heads\/)?main$/`（如 `HEAD:main`、`foo:main`）

其餘（如 `fix-main-layout`、`m_b_main頁改版`）放行。`git tag` 判定不變。
doctor 段的既有規則不動。

### 2. 殘留標記提示（新增 session-role-notice.js，SessionStart hook）

行為：

1. 讀 `.claude/.session-role`；不存在 → 靜默 `exit 0`
2. 存在 → 讀角色字串 + 檔案 mtime，向 stdout 輸出提示（會注入新 session 的 context）：
   角色、寫入距今幾小時、以及一句「若此標記是前一個 session 的殘留，請與使用者確認沿用或刪除
   `.claude/.session-role`；殘留會攔截 push main 等操作」
3. 任何錯誤一律 `exit 0`——與 role-guard 同哲學（fail-open，紀律輔助不是安全底線）

### 3. settings.json 註冊

`hooks` 新增 `SessionStart` 段，command：`node .claude/hooks/session-role-notice.js`，timeout 10。

### 4. 實作.md 停止點補「使用者終端機指令紀律」

engineer 被 role-guard 攔下的收尾操作（merge main、push main、`git tag`）最終由**使用者
在 Termius（自己的終端機）執行**。`實作.md`「停止點」第 3 點的「待使用者執行的指令」擴充為
固定紀律（新增一小節，四條）：

1. 明講**「請貼到 Termius（或你自己的終端機）執行」**，不假設使用者知道要換環境
2. code block **第一段必為 `cd <repo 絕對路徑>`**——路徑以 `pwd` 實際取值**寫死進指令**，
   禁止留 `<路徑>` 類佔位符（使用者 SSH 登入起點是 `~`；佔位符原樣貼上會被 bash 當重導向）
3. 全串以 `&&` 串接成單行——任一步失敗即停，不連環噴錯
4. 指令自包含：假設使用者終端是乾淨 shell（與 deploy-release「403 fallback 指令自包含」同精神）

與既有「上線確認訊息的指令紀律」（code block 只放現在請你執行的指令）並列，不互相取代。

### 5. `/vps新對話`（.claude/commands/vps新對話.md，新增）

> 定位：管理 DevVps 上的 claude remote-control session——產生「開新 session」的可貼上指令，
> 或列出既有 session 問使用者要關哪個。使用情境：session context 快滿要換新、或 VPS 上掛著
> 太多舊 session 要清。

**模式判斷（第一步）**：使用者輸入含「關」（要關／關閉）→ 關閉模式；否則 → 開新模式（預設）。

**環境判斷（第二步）**：`pgrep -f "claude remote-control"` 有結果 → 本機就是 VPS，
Claude 可直接代執行；無結果（CCR / 其他環境）→ 一律只輸出自包含指令給使用者貼 Termius
（遵守技術設計 4 的四條紀律：cd 絕對路徑、&& 串接、無佔位符、乾淨 shell 假設）。

**開新模式**：

1. session 名稱：使用者有給就用，沒給預設 `KJ-<當前 change 編號或主題>`；
   tmux session 名稱取唯一值（如 `kj-<HHMM>`），避免與既有 tmux session 撞名
2. 產出單一 code block（貼 Termius 一次通）：
   `tmux new -d -s <tmux名> 'cd /home/ubuntu/dev/KJ-Champion-System && claude remote-control --name "<session名>"'`
   （名稱由 Claude 代入實值後輸出，code block 內不得殘留 `<>` 佔位符）
3. 固定附一句：「貼上執行後，開 Claude app → Code 列表點『<session名>』即可（不需掃 QR）。」
4. 本機即 VPS 時：直接 Bash 代執行上述指令並回報「已建立，去 app 列表找 <session名>」

**關閉模式**：

1. 列出對照表：`tmux ls` ＋ `ps -eo pid,etime,args | grep "[r]emote-control"`
   （ps 可看到 `--name` 參數，把 tmux session ↔ claude session 名稱對起來）
2. 問使用者要關哪個（列選項，含各 session 名稱與存活時間），不自行判斷
3. **目標是自己所在的 process 時必須警告**：「關閉後本對話立即結束」，要求再次明確確認
4. 本機即 VPS：確認後 `tmux kill-session -t <名>`（非 tmux 管理的 process 用 kill PID）並回報；
   CCR / 其他環境：輸出自包含 kill 指令給使用者貼 Termius

**平實語言撰寫，不嵌比喻**（與 /診斷 同標準）。

## 關鍵設計決策

1. **殘留用「開場提示 + 人決策」，不做自動過期放行**：VPS 上正常的實作 session 本來就可能跨日，
   標記超時自動失效會讓長壽 engineer session 誤放行 push main，反而弱化圍籬。提示不改變攔截行為，
   只消除「新 session 不自知」這個誤判源。
2. **殘留偵測用檔案 mtime，不改打卡格式**：三個打卡指令（`echo "engineer" > ...`）零改動、
   零遷移成本，role-guard 讀檔邏輯也不用動。
3. **regex 用 token 比對而非再堆 `\b`**：refspec 語意是「整個 token 是不是 main ref」，
   word boundary 天生表達不了，收緊到 token 層級才治本。

## Sub-agent 平行執行配置（實作 session 照此執行，不自行判斷平行邊界）

**全部主 session 序列，不派 sub-agent**：三個檔案改動量小、Phase 2 的 settings.json 與
hook 檔需一起功能實測，拆平行沒有收益只有 commit 交錯風險。

## 驗證 Gate（指令均已於 2026-07-12 對現狀實測；G1 現狀為兩者皆 deny，確認 bug 存在）

```bash
# G1 誤攔修正（功能實測）
printf engineer > .claude/.session-role
echo '{"tool_name":"Bash","tool_input":{"command":"git push -u origin fix-main-layout"}}' | node .claude/hooks/role-guard.js
# 預期：無輸出（放行）。現狀實測：deny（bug）
echo '{"tool_name":"Bash","tool_input":{"command":"git push origin main"}}' | node .claude/hooks/role-guard.js
# 預期：輸出 deny JSON（圍籬仍在）
echo '{"tool_name":"Bash","tool_input":{"command":"git push origin HEAD:main"}}' | node .claude/hooks/role-guard.js
# 預期：輸出 deny JSON（refspec 形式仍攔）
rm -f .claude/.session-role

# G2 hook 語法健康
node --check .claude/hooks/role-guard.js                    # 預期無輸出、exit 0
node --check .claude/hooks/session-role-notice.js           # 預期無輸出、exit 0

# G3 殘留提示 hook 功能（現狀實測：檔案不存在）
printf engineer > .claude/.session-role
node .claude/hooks/session-role-notice.js                   # 預期：輸出含 engineer 與殘留提醒
rm -f .claude/.session-role
node .claude/hooks/session-role-notice.js                   # 預期：無輸出、exit 0

# G4 SessionStart 已註冊（現狀實測：0）
grep -c "SessionStart" .claude/settings.json                # 預期 ≥1

# G5 實作.md 含使用者終端機指令紀律（現狀實測：0）
grep -c "Termius" .claude/commands/實作.md                  # 預期 ≥1
grep -c "cd " .claude/commands/實作.md                      # 預期 ≥1

# G6 /vps新對話 指令存在且含核心要素（現狀實測：檔案不存在）
grep -c "remote-control" .claude/commands/vps新對話.md      # 預期 ≥1
grep -c "tmux" .claude/commands/vps新對話.md                # 預期 ≥1
grep -c "kill-session" .claude/commands/vps新對話.md        # 預期 ≥1
```

## 上線方式

規則類直推 main（deploy-release skill「規則類更新」流程）。
**前置依賴：change 26 先上線**——本分支自 `m_b_打包繼續指令` 切出
（change 26 的 Phase 5.2 已動 `role-guard.js`，從 main 切必衝突），上線順序固定 26 → 27。
