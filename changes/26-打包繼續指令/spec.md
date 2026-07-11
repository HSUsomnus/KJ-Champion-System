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

- ✅ `.claude/commands/打包.md`、`.claude/commands/繼續.md`、`.claude/commands/診斷.md`（新增）
- ✅ `.claude/hooks/role-guard.js`（新增 doctor 角色攔截）
- ✅ `CLAUDE.md`（機制說明一句 + 啟動規則改讀 origin/main + Session 角色段補 /健檢）
- ✅ `.claude/skills/workflow/SKILL.md`、`.claude/hooks/git-guard.js`、`.claude/now.md`（除錯）
- ✅ 刪除 `.claude/commands/子代理.md`（已壞，使用者決策：刪不修）
- ❌ 不動 `server/`、`frontend/` 任何產品程式碼
- ❌ 不動歷史 context 檔（`.claude/context/*.md` 是當時快照，內含 deploy.md 引用屬正常）
- ❌ status line：使用者決策**不做**

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
4. 回報收尾**必附「下個 session 起手式」code block**（使用者直接複製貼進新對話執行）：

   ```
   git fetch origin <工作分支>
   git checkout <工作分支>
   ```

   並固定加一句：「貼上執行後，輸入 `/繼續`。」——這是使用者跨 session 的唯一入口，不可省略。

⛔ /打包 **不呼叫 /compact、不壓縮 context**——如果只是想在同一 session 繼續，用內建 `/compact` 即可，不需要 /打包。

### 2. `/繼續`（.claude/commands/繼續.md）

> 定位：新對話的接手指令。先讀狀態、再回報、才接受指令（與 CLAUDE.md 啟動規則相容、且更完整）。

執行步驟：

1. 若目前分支工作區已有 `.claude/handoff.md`（使用者已照 /打包 給的起手式切好分支）→ 直接讀，跳到步驟 3
2. 否則 fallback 搜尋：`git fetch --all --quiet` → `git log --all -1 --format='%H %ct %D' -- .claude/handoff.md`
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

### 5. `/診斷`（.claude/commands/診斷.md）＋ doctor 角色（role-guard 新增）

> 定位：最高階模型（Fable / Opus）專用的診斷 session——與使用者討論問題、找出根因、寫診斷報告。
> **只診斷、不動手**。存在原因：高階模型 token 昂貴，必須全數花在找根因與解法討論上，
> 不得消耗在關分支、開分支這類機械操作（本 change 規劃期間的實際教訓）。
> 指令文字用平實語言撰寫，不嵌入任何比喻。

打卡：`echo "doctor" > .claude/.session-role`（標記值用 ASCII，與 planner / engineer 慣例一致）

職責：

1. 依使用者指定範圍（全專案或某個專題）讀 now.md、記憶體系、相關程式碼，找出問題根因
2. 與使用者往返討論：根因是什麼 → 有哪些解法與取捨 → 要治到什麼程度、或先怎麼止血
3. 產出診斷報告：發現分級（🔴 壞掉／🟡 過時／🟠 懸掛／⚪ 債務）＋ 每項的根因與建議做法
4. 需要動手的項目整理成待辦清單放進報告，交 `/規劃` 開 spec 或 `/實作` 執行，本 session 不動手

報告交付（使用者定案：方案 A）：

- 報告寫入 `changes/NN-主題/診斷報告.md`（或使用者指定路徑）
- **報告檔的 commit + push（推本 session 分支）是本角色唯一允許的 git 寫入**——
  新 session 都是全新 clone，git 遠端是報告到達下個 session 的唯一通道
- 停止點輸出起手式 code block（與 /打包 同格式：fetch + checkout 本分支），
  使用者開新 session（Sonnet `/實作`）貼上即可接手執行報告內容

禁區（`role-guard.js` 新增 `doctor` 角色硬攔截）：

- Edit / Write：`server/`、`frontend/`、`package.json`、migrations（同 planner 檢查）
- Bash（段開頭比對，比照既有 engineer 寫法避免 heredoc 誤判）：
  `git tag`、`git branch -d/-D`、`git push origin --delete`、`git checkout -b`、`git switch -c`、
  `git merge`、`git cherry-pick`、`git rebase`、`git reset` → 一律 deny；
  `git commit` / `git push` **不攔**（方案 A 報告交付通道；「僅限報告檔」由指令文字約束，
  push main 仍有既有 git-guard 警告 + 使用者確認流程把關）；唯讀 git 不受限
- 攔截訊息比照既有格式：「⛔ [role-guard] 診斷 session 只診斷不動手——把此項寫進診斷報告，交 /規劃 或 /實作。」

停止點：報告交付 + 起手式輸出 → `rm -f .claude/.session-role` → 結束。

連帶：CLAUDE.md「Session 角色」段補一行（診斷 → `/診斷`，最高階模型）。

### 6. 刪除 `.claude/commands/子代理.md`（使用者決策 2026-07-11）

引用的 `.claude/hooks/open-worktree-vscode.js` 不存在、settings.json 無對應 hook，指令整體已壞且僅對本機 VS Code 情境有意義 → 直接刪除，不修。

## 關鍵設計決策

1. **handoff.md 跟工作分支走，用 `git log --all` 尋找**：不推 main（避開 push main 確認流程）、不需要任何新基礎設施；新對話 fetch 後一定找得到。代價是 /繼續 要多一次 fetch --all，可接受。
2. **交接檔單次生命週期**：/繼續 接手後即刪。now.md 的教訓（地雷清單只增不減＝膨脹失效）同樣適用於交接檔——陳舊交接比沒有交接更危險。
3. **context 用量不寫進 workflow skill 自報**：模型自估 context 用量不準，寫進 skill 只會拿到不可靠數字。準確來源是內建 `/context` 指令與 status line。
4. **指令放 repo 的 `.claude/commands/`，不放個人 `~/.claude/`**：這樣 PC / VPS / CCR 所有 clone 都可用，且受版本控制。
5. **doctor 角色用 hook 硬攔截，不靠指令文字自律**：本 change 規劃期間，高階模型 session 被 stop hook 一推就順手去關 PR、要刪分支——證明「文字禁區」擋不住環境壓力，必須比照 planner / engineer 用 role-guard deny。攔的是分支／merge／tag 類 Bash 操作與產品碼 Edit/Write；`git commit` / `git push` 依方案 A 不攔（報告檔交付通道，「僅限報告檔」由指令文字約束）。MCP 類 GitHub 操作攔不到（role-guard 只掛 Edit|Write|Bash），由指令文字補充禁止，屬已知限制。
6. **/打包 收尾必吐起手式**：跨 session 的斷點在「新對話不知道去哪個分支」，把起手式做成 /打包 的固定輸出格式，使用者只需複製貼上＋輸入 /繼續，不需記任何分支名。

## 驗證 Gate（指令均已對現狀實測過語法；計數採保守下限，不猜精確值——change 25 教訓）

```bash
# G1 兩個指令存在
ls .claude/commands/打包.md .claude/commands/繼續.md        # 預期：兩檔皆列出

# G2 /打包 含 handoff 機制、「不壓縮」警語、起手式輸出格式
grep -c "handoff" .claude/commands/打包.md                  # 預期 ≥1
grep -c "compact" .claude/commands/打包.md                  # 預期 ≥1
grep -c "起手式" .claude/commands/打包.md                   # 預期 ≥1

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

# G7 hook 語法健康（改完 git-guard / role-guard 後）
node --check .claude/hooks/git-guard.js                     # 預期無輸出、exit 0
node --check .claude/hooks/role-guard.js                    # 預期無輸出、exit 0

# G8 子代理.md 已刪除（現狀實測：檔案存在）
ls .claude/commands/子代理.md                               # 預期 No such file、exit 非 0

# G9 /診斷 指令存在且含核心要素
grep -c "doctor" .claude/commands/診斷.md                   # 預期 ≥1
grep -c "起手式" .claude/commands/診斷.md                   # 預期 ≥1

# G10 role-guard 含 doctor 角色（現狀實測：0）
grep -c "doctor" .claude/hooks/role-guard.js                # 預期 ≥1
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

## 待確認事項（不阻塞本 change）

1. 若你 PC 的 `~/.claude/commands/` 已有舊版 打包/繼續，repo 版上線後應刪除個人版避免兩套打架。

（原待確認事項已全數定案 2026-07-11：子代理.md → 刪除不修；status line → 不做；診斷報告交付 → 方案 A。）
