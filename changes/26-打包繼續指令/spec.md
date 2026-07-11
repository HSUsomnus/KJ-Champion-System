# Change 26 — /打包、/繼續 指令實作 + 記憶體系除錯

## 背景

CLAUDE.md 第一段寫「上下文快滿輸入 `/打包`，新對話輸入 `/繼續`」，但 `.claude/commands/` 裡**這兩個指令根本不存在**（僅有 子代理/實作/規劃 三個）。它們可能存在於使用者 PC 的個人 `~/.claude/commands/`，但沒進 repo——VPS / CCR 上的任何 clone 都用不到。

另外使用者對機制有一個關鍵誤解需在文件中講清楚：

| 機制 | 性質 | 觸發 |
|---|---|---|
| 內建 `/compact`（含 auto-compact） | **同一 session** 就地壓縮 context | 手動或自動 |
| `/打包` → 新對話 → `/繼續` | **跨 session 交接**：寫交接檔 → 新對話讀回 | 手動 |

「等 /打包 壓縮完再 /繼續」是把兩種機制混在一起——/打包 不壓縮任何東西，它是寫交接檔。

附帶：本次健檢發現的記憶體系字面錯誤（過時的 deploy.md 引用、now.md 的 change 20 路徑寫錯）一併修正。

## 範圍

- ✅ `.claude/commands/打包.md`、`.claude/commands/繼續.md`（新增）
- ✅ `CLAUDE.md`（機制說明一句 + 啟動規則改讀 origin/main）
- ✅ `.claude/skills/workflow/SKILL.md`、`.claude/hooks/git-guard.js`、`.claude/now.md`（除錯）
- ❌ 不動 `server/`、`frontend/` 任何產品程式碼
- ❌ 不動歷史 context 檔（`.claude/context/*.md` 是當時快照，內含 deploy.md 引用屬正常）
- ❌ status line 顯示 context 剩餘量：**列待確認**（見下），不在本 change 硬做

## 技術設計

### 1. `/打包`（.claude/commands/打包.md）

> 定位：context 快滿、或要換裝置/換模型續作時，把「git 和檔案讀不出來的工作狀態」落盤推遠端。

執行步驟：

1. 更新 `.claude/now.md`（既有職責：當前 change、新地雷、環境特殊狀態）
2. 寫 `.claude/handoff.md`（交接檔），固定六段：
   - 打包時間 + session 角色（planner / engineer / 無）
   - 當前任務：change 編號、分支、目標一句話
   - 已完成 / 進行中 / 下一步（各條列）
   - 工作區狀態：未 commit 的檔案清單（`git status --short` 貼上）與處置建議
   - 關鍵決策與注意事項（本 session 內做過、但還沒進 spec/context 的判斷）
   - 給 /繼續 的第一個動作（明確一句，例：「跑 Phase 3 gate 後繼續 task 3.2」）
3. commit `.claude/handoff.md`（+ now.md 若同分支）並 **push 目前分支**：
   - 在 `m_b_*` / `claude/*` 分支 → 直接 commit + push（功能分支本來就必推遠端）
   - 在 `main` → 屬規則類直推，但 push main 需使用者確認 → 列清單等確認，未確認就停在 commit
4. 回報：「已打包並推至 `<分支>`。請開新對話，輸入 `/繼續`。」

⛔ /打包 **不呼叫 /compact、不壓縮 context**——如果只是想在同一 session 繼續，用內建 `/compact` 即可，不需要 /打包。

### 2. `/繼續`（.claude/commands/繼續.md）

> 定位：新對話的接手指令。先讀狀態、再回報、才接受指令（與 CLAUDE.md 啟動規則相容、且更完整）。

執行步驟：

1. `git fetch --all --quiet`
2. 找最新交接檔：`git log --all -1 --format='%H %ct %D' -- .claude/handoff.md`
   - 找到 → checkout 該 commit 所在分支，讀 `.claude/handoff.md`
   - 找不到（或該 commit 已是「刪除 handoff」）→ fallback：讀 `.claude/now.md`「當前 Change」段，回報後**詢問使用者要接手什麼**，不自行猜測
3. 讀 now.md + 該 change 的 spec.md / tasks.md（若有）
4. 回報接手摘要：上次做到哪、工作區/分支狀態、下一步是什麼
5. 依 handoff 記錄的角色提醒打卡（`/規劃` 或 `/實作`）
6. **接手後的第一個 commit 順手刪除 `.claude/handoff.md`**（交接檔生命週期＝單次；殘留會誤導下下次 /繼續）

### 3. CLAUDE.md 更新

- 「上下文快滿輸入 `/打包`，新對話輸入 `/繼續`」後補一句機制區分：「（/打包＝寫交接檔跨對話交接；同對話就地壓縮用內建 /compact，兩者不同）」
- 啟動規則第 1 步 `git log main -1 --oneline` 改為 `git fetch origin main --quiet && git log origin/main -1 --oneline`：CCR / 新 clone 的本機 main ref 可能是舊快照（本次健檢實測：本機 main 停在 824895e，遠端已是 e5fa804），讀本機 main 會誤判 HEAD

### 4. 記憶體系除錯（本次健檢發現）

| 檔案 | 問題 | 修法 |
|---|---|---|
| `.claude/skills/workflow/SKILL.md` 行 233/239/252/309 | 引用已於 v2.11.0 廢除的 `deploy.md` | 改為「deploy-release skill」 |
| `.claude/hooks/git-guard.js` 行 11/34/136/141 | 警告文字同樣引用 `deploy.md` | 改為「deploy-release skill」 |
| `.claude/now.md` 當前 Change 段 | spec 路徑寫 `changes/20-調查表單/spec.md`，實際是 `changes/20-團隊調查表單系統/` | 改為實際路徑 |

## 關鍵設計決策

1. **handoff.md 跟工作分支走，用 `git log --all` 尋找**：不推 main（避開 push main 確認流程）、不需要任何新基礎設施；新對話 fetch 後一定找得到。代價是 /繼續 要多一次 fetch --all，可接受。
2. **交接檔單次生命週期**：/繼續 接手後即刪。now.md 的教訓（地雷清單只增不減＝膨脹失效）同樣適用於交接檔——陳舊交接比沒有交接更危險。
3. **context 用量不寫進 workflow skill 自報**：模型自估 context 用量不準，寫進 skill 只會拿到不可靠數字。準確來源是內建 `/context` 指令與 status line。
4. **指令放 repo 的 `.claude/commands/`，不放個人 `~/.claude/`**：這樣 PC / VPS / CCR 所有 clone 都可用，且受版本控制。

## 驗證 Gate（指令均已對現狀實測過語法；計數採保守下限，不猜精確值——change 25 教訓）

```bash
# G1 兩個指令存在
ls .claude/commands/打包.md .claude/commands/繼續.md        # 預期：兩檔皆列出

# G2 /打包 含 handoff 機制與「不壓縮」警語
grep -c "handoff" .claude/commands/打包.md                  # 預期 ≥1
grep -c "compact" .claude/commands/打包.md                  # 預期 ≥1

# G3 /繼續 含 fallback 與刪檔規則
grep -c "now.md" .claude/commands/繼續.md                   # 預期 ≥1
grep -c "刪除" .claude/commands/繼續.md                     # 預期 ≥1

# G4 CLAUDE.md 機制區分（現狀實測：0）
grep -c "compact" CLAUDE.md                                 # 預期 ≥1

# G5 過時引用清零（現狀實測：workflow 4、git-guard 4）
grep -c "deploy\.md" .claude/skills/workflow/SKILL.md       # 預期輸出 0（exit code 1 屬正常）
grep -c "deploy\.md" .claude/hooks/git-guard.js             # 預期輸出 0（exit code 1 屬正常）

# G6 now.md 路徑修正（現狀實測：0）
grep -c "20-團隊調查表單系統" .claude/now.md                # 預期 ≥1

# G7 hook 語法健康（改完 git-guard 後）
node --check .claude/hooks/git-guard.js                     # 預期無輸出、exit 0
```

## 上線方式

規則類直推 main（deploy-release skill「規則類更新」流程）：commit → cherry-pick 到 main → **使用者明確確認**後 push → `bash scripts/sync-branches.sh`。now.md 更新與推送同 commit。CCR 環境 push main 若 403，改由使用者本機執行（指令須自包含）。

## 懸掛狀態處置（使用者決策 2026-07-11，納入本 change 執行）

| 項目 | 決策 | 狀態 |
|---|---|---|
| PR #12（change 20 策略修訂） | **保留**，使用者後續以 Opus session 繼續完成規劃文件 | 不動 |
| PR #4（change 21 AI 員工橋接 spec，已過時） | **關閉** | ✅ 已由規劃 session 關閉 |
| 分支 `m_b_三層流程補強`、`claude/project-spec-review-95epn4`、`claude/new-session-k97gfv` | **刪除** | 待實作 session 執行（tasks Phase 0） |
| 分支 `m_b_調查表單`、`claude/change-20-strategy-hf8eds` | 保留（change 20 進行中 + PR #12） | 不動 |

實作備註：使用者將於 VPS 以 Sonnet `/實作` 執行本 change，並藉此測試平行 sub-agent 工作流。

## 待確認事項（不阻塞本 change，但需使用者決定）

1. **`.claude/commands/子代理.md` 已壞**：引用的 `.claude/hooks/open-worktree-vscode.js` 不存在、settings.json 也無對應 hook，且該指令只對本機 VS Code 有意義。要「修」（改為直接執行 `code <worktree路徑>`）還是「刪」？
2. **status line 顯示 context 剩餘量**：要做的話屬個人環境設定（PC 的 `~/.claude/settings.json` statusLine），不適合進 repo。是否要我出一份設定給你在 PC 上套用？
3. 若你 PC 的 `~/.claude/commands/` 已有舊版 打包/繼續，repo 版上線後應刪除個人版避免兩套打架。
