# Change 27 — role-guard 補強（標記殘留提示 + push-main 誤攔修正）

## 背景

2026-07-12 VPS 實驗（remote-control session 被 role-guard 攔 push main）後的診斷結論：
圍籬環境無關屬設計本意、**不開洞**，但診斷過程實測發現兩個缺陷：

1. **標記殘留**：`.claude/.session-role` 只在 `/實作` 停止點刪除。session 中斷、context 爆掉、使用者中途換題，標記就永久留在工作目錄。之後同目錄的任何新對話（即使沒打卡）都被當 engineer/planner/doctor 攔截，且**新 session 不自知**，第一反應常誤判成環境問題。CCR 容器短命會自癒；**VPS 長駐工作目錄特別容易踩**。
2. **push-main regex 誤攔**：`role-guard.js:56` 的 `\bmain\b` 會命中任何含 main 這個 word 的分支名。實測（2026-07-12）：`git push -u origin fix-main-layout` 被 deny。engineer 被要求每 Phase 立即 push，功能分支撞名會卡死。

## 範圍

- ✅ `.claude/hooks/role-guard.js`（engineer push-main 判定收緊為 token 比對）
- ✅ `.claude/hooks/session-role-notice.js`（新增 SessionStart hook：殘留標記提示）
- ✅ `.claude/settings.json`（註冊 SessionStart hook）
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
```

## 上線方式

規則類直推 main（deploy-release skill「規則類更新」流程）。
**前置依賴：change 26 先上線**——本分支自 `m_b_打包繼續指令` 切出
（change 26 的 Phase 5.2 已動 `role-guard.js`，從 main 切必衝突），上線順序固定 26 → 27。
