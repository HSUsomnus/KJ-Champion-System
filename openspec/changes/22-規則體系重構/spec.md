# Change 22 — 規則體系重構與 Token 降本

> 本 spec 由顧問 session（Claude Fable 5）完整診斷後產出，供 Sonnet 直接執行。
> 診斷結論與證據已完成，執行者**不需要重新調查**，照本文件逐 Phase 實作即可。
> 產出日期：2026-07-09

---

## 一、背景（為什麼要做）

顧問 session 對專案做了全面 Token 消耗診斷與規則體系鑑識，確認以下問題：

### 1. 常駐上下文過重（每次請求固定稅 ~19,000 tokens）

CLAUDE.md + 全部 8 個 `.claude/rules/*.md` 每個 session 自動載入，實測估算約 19K tokens，
附加在對話中**每一次** API 請求的前綴上。其中多數規則與當次任務無關
（例如純後端 session 也載著 5.8K tokens 的 UIDESIGN）。

### 2. rules-injector hook 造成重複讀取

`rules-injector.js` 在每次 Read/Edit/Write 前端檔案時命令 Claude「必須立即 Read UIDESIGN.md」，
但該檔已在系統上下文中——每次服從指令 = 5,800 tokens 純重複。

### 3. 同一規則存放多份（最多 3 份），且已產生矛盾

| 重複規則 | 存放位置 |
|---|---|
| main 推送後全分支 sync 腳本 | deploy.md、workflow.md、post-push-sync.js（三份幾乎逐字相同） |
| 「推送前重寫 README」 | readme.md、deploy.md、main.md |
| main 分支禁止直接開發 | main.md、workflow.md、git-guard.js |
| 機密檢查流程 | deploy.md、main.md、.cursorrules |
| 規則檔職責說明 | CLAUDE.md 索引表、RULES-MAP.md |

### 4. 已確認的過時 / 矛盾內容

| 位置 | 問題 |
|---|---|
| `CLAUDE.md` 版本記憶 | 連結指向根目錄 `CHANGELOG.md`——該檔不存在（實際在 `.claude/CHANGELOG.md`） |
| `CLAUDE.md` 索引表 | `UIDESIGN.md` 寫成根目錄路徑——實際在 `.claude/rules/UIDESIGN.md` |
| `.cursorrules` | 引用已於 v2.0.0 刪除的 `public/js/liff.js`；**允許 `git add .`**，直接違反 deploy.md 禁令 |
| `RULES-MAP.md` | 描述 rules-injector 只觸發 Edit\|Write，但 settings.json 實際含 Read；殘留「beans-injector」錯字；readme.md 說明還提到已廢除的 dev 分支 |
| 遠端分支 | 規則說「dev 分支已廢除」但遠端 `dev` 分支仍存在；另有 `fix/landscape-orientation-overlay` 不符合任何命名規範 |

### 5. 分支紀律失效的根因（git 歷史鑑識結論）

- 分支規則原寫在 CLAUDE.md 頂層，經 `b4f787d`、`e10fa16` 兩次「精簡」被搬入 workflow.md，
  從「每次對話必見」降級為「需主動閱讀」。
- `git-guard.js` 直到 commit `4b296ec`（約 2026-06-23）才存在，此前兩個月規則只有 prose、零強制。
- 真空期尾端發生實際違規：`85ebc2a`（v2.10.1 hotfix 直接 commit 在 main，無 hotfix 分支）、
  `cbf8377`（change-19 後端直接落在 main，無 `_backend` 分支痕跡）。
- **即使是現在，git-guard.js 只輸出警告文字後 `exit 0`——是勸告不是攔截**。
- 部分守規的 merge 使用 fast-forward，分支結構在歷史上消失，無法審計。

### 6. 目標

| 指標 | 現況 | 目標 |
|---|---|---|
| 每 session 常駐規則 tokens | ~19,000 | ≤ 3,500 |
| 規則類檔案數 | 10（CLAUDE.md、8 rules、RULES-MAP、.cursorrules） | 5 以下 |
| 每條規則的事實來源 | 最多 3 份 | 恰好 1 份 |
| 鐵律執行方式 | prose 勸告 | hook 硬攔截 |

---

## 二、執行約束（Sonnet 必讀）

1. **分支**：從 main 切 `m_b_規則體系重構`，推遠端。本 change 的主題就是分支紀律——自己先守。
2. **不碰產品程式碼**：本 change 只動 `.claude/`、`scripts/`、根目錄文件、`openspec/`。
   `server/`、`frontend/` 一行都不改。
3. **不得推翻 CLAUDE.md「已定案決策」表中的任何決策**。
4. **搬移內容時保留原文語意**：只做搬移、合併、刪重複，**禁止自行改寫規則的語意**。
   例外：本 spec 明文指定的修改（如 README 規則降級）。
5. **每個 Phase 一個 commit**，Phase 內驗證通過才進下一 Phase（蓋一層測一層）。
6. **hooks 改完必跑** `node --check .claude/hooks/<file>.js`；**腳本必跑** `bash -n scripts/<file>.sh`。
7. 完成後更新 `tasks.md` 勾選狀態。
8. 有任何本 spec 未涵蓋的判斷點 → 停下來問使用者，不要自行決定。

---

## 三、Phase 1 — 修矛盾（P0，先消滅錯誤資訊）

### 1.1 修 CLAUDE.md 壞連結

- `版本記憶` 段：`[CHANGELOG.md](CHANGELOG.md)` → `[.claude/CHANGELOG.md](.claude/CHANGELOG.md)`
- 索引表：`UIDESIGN.md` 路徑改為 `.claude/rules/UIDESIGN.md`（Phase 4 會再改為 skill，此處先修正確路徑）

### 1.2 刪除 `.cursorrules`

整檔刪除。理由：Cursor 時代遺物、引用不存在的檔案、允許被禁止的 `git add .`。
（若使用者仍在用 Cursor，由使用者屆時重寫，不在本 change 範圍。）

### 1.3 刪除 `.claude/RULES-MAP.md`

整檔刪除，並從 CLAUDE.md 索引表移除該列。理由：meta 文件與實際狀態已脫鉤（見背景 4），
其資訊可從 settings.json + hook 原始碼 + CLAUDE.md 索引表推得，人工同步成本 > 價值。

### 1.4 遠端分支清理（需使用者逐項確認，不得自行刪除）

執行前先產出報告給使用者：

```bash
git fetch origin --prune
git log origin/main..origin/dev --oneline          # dev 領先 main 的內容
git log origin/main..origin/fix/landscape-orientation-overlay --oneline
```

- 若 dev 無領先內容 → 請使用者確認後刪除遠端 dev 分支（規則已廢除 dev）。
- `fix/landscape-orientation-overlay` 同樣列出差異，請使用者決定：改名為 `m_b_*` / 合併 / 刪除。
- ⚠️ CCR 沙箱刪遠端分支會 403，屆時給使用者手動指令即可。

### 1.5 now.md 加入清理規則

在 `.claude/now.md` 頂部註解區補一行維護規則：

```
已解決或已寫入 context 檔的地雷，必須從本檔移除（地雷清單只增不減 = 本檔膨脹失效）。
```

---

## 四、Phase 2 — Hook 硬化 + 腳本化（P0，把鐵律變成門鎖）

### 2.1 git-guard.js 從「勸告」升級為「硬攔截」

現況：所有攔截只輸出 `additionalContext` 後 `exit 0`，Claude 可無視。

改法：以下兩類改為**真正拒絕**，使用 PreToolUse 的 deny 輸出格式：

```js
// 拒絕執行的輸出格式（取代原本的 additionalContext）
const output = {
  hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: 'deny',
    permissionDecisionReason: '⛔ [git-guard] <原因文字，沿用現有訊息內容>'
  }
};
process.stdout.write(JSON.stringify(output) + '\n');
process.exit(0);
```

| 攔截項 | 現況 | 改為 |
|---|---|---|
| 在 main commit 產品程式碼（既有偵測邏輯不變） | 警告 | **deny** |
| `git add -A` / 孤立 `git add .`（既有偵測邏輯不變） | 警告 | **deny** |
| `git push origin main` 前 checklist | 警告 | 維持警告（push 本來就有人工確認流程，不擋） |

保留既有的誤判防護（heredoc 切段比對等），只改輸出行為。

### 2.2 新增 `scripts/sync-branches.sh`（sync 流程單一事實來源）

參考實作（可微調，但行為必須一致）：

```bash
#!/usr/bin/env bash
# main 推送後全分支同步 — 唯一事實來源
# 衝突時依 deploy 規則自動改用 -X theirs 並在結果中標示（需人工檢查被覆蓋的 dep）
set -u
git fetch origin --prune
OK=(); THEIRS=(); FAILED=()
for branch in $(git ls-remote --heads origin 'refs/heads/m_b_*' | sed 's|.*refs/heads/||'); do
  git checkout -B "$branch" "origin/$branch" >/dev/null 2>&1 || { FAILED+=("$branch(checkout)"); continue; }
  if git merge main --no-edit >/dev/null 2>&1; then
    git push origin "$branch" >/dev/null 2>&1 && OK+=("$branch") || FAILED+=("$branch(push)")
  else
    git merge --abort 2>/dev/null
    if git merge main -X theirs --no-edit >/dev/null 2>&1; then
      git push origin "$branch" >/dev/null 2>&1 && THEIRS+=("$branch") || FAILED+=("$branch(push)")
    else
      git merge --abort 2>/dev/null; FAILED+=("$branch(merge)")
    fi
  fi
done
git checkout main >/dev/null 2>&1
git fetch origin >/dev/null 2>&1
echo "=== 同步結果 ==="
echo "✅ 成功: ${OK[*]:-無}"
echo "⚠️ 使用 -X theirs（有內容被 main 覆蓋，接手該分支前需檢查 dep）: ${THEIRS[*]:-無}"
echo "❌ 失敗: ${FAILED[*]:-無}"
echo "=== behind 驗證（應全為 0）==="
for branch in $(git ls-remote --heads origin 'refs/heads/m_b_*' | sed 's|.*refs/heads/||'); do
  echo "$branch: behind main $(git rev-list --count "origin/$branch..origin/main" 2>/dev/null || echo '?')"
done
```

注意 deploy.md 已記載的 Bash 陷阱（pipeline exit code、set -e 迴圈中斷）——上述實作已避開，不要改回去。

**必須支援 `DRY_RUN=1` 模式**：只 fetch 並列出「將處理的分支與預計動作」，
不執行任何 checkout / merge / push。這是驗證用的安全開關（見第七節 Phase 2 gate）。

### 2.3 post-push-sync.js 訊息精簡

hook 輸出從「整段內嵌腳本」改為：

```
⚡ [post-push-sync] main 已推送 → 立即執行：bash scripts/sync-branches.sh
⚠️ 執行前確認所有 worktree 內無未儲存的工作。結果中若有 -X theirs 分支，必須回報使用者。
```

### 2.4 deploy.md / workflow.md 去重

兩檔中內嵌的 sync 腳本全文，替換為一行指向 `scripts/sync-branches.sh`。
「Bash 腳本陷阱」段落保留在 deploy.md（那是給改腳本的人看的），workflow.md 中的重複段落刪除。

### 2.5 merge 規範加入 --no-ff

deploy.md「推送到 main」段落加一條：**功能分支 / hotfix merge 進 main 一律 `git merge --no-ff`**，
保留分支結構供審計（背景 5：FF merge 曾讓守規證據消失）。

---

## 五、Phase 3 — 規則合併與流程降本（P1）

### 3.1 main.md、readme.md 併入 deploy.md 後刪除

- `rules/main.md` 的「嚴格規則」段落併入 deploy.md（去掉與 deploy.md 重複的推送流程）。
  main 分支警告的即時提醒功能已由 rules-injector（branch=main 時）+ git-guard deny 承擔。
- `rules/readme.md` 壓縮為 deploy.md 內的一小節（README 撰寫標準的區塊清單保留）。
- 刪除兩檔，CLAUDE.md 索引表同步移除。
- rules-injector.js 中 `rules/main.md` 的引用改指向 deploy.md（Phase 4 改 skill 時再統一調整）。

### 3.2 README 規則降級（明文修改語意，已獲使用者同意方向）

原規則：「不論哪個分支，push 或 merge 前必須完整重寫 README」。
改為：**「只在『功能上線』merge 進 main 時完整重寫 README；功能分支的中途 push 不需要。」**
修改位置：deploy.md（併入後的 README 小節）、workflow.md 若有提及處同步。

### 3.3 .claude/CHANGELOG.md 裁切

保留最近 5 個版本的完整摘要；更早版本壓縮為一行索引：
`## [vX.Y.Z] - 日期 — 一句話標題（詳見 .claude/context/vX.Y.Z.md）`。

### 3.4 settings.json 移除 Read 觸發

`rules-injector` 的 matcher 從 `"Edit|Write|Read"` 改為 `"Edit|Write"`（Read 觸發 = 純噪音 + 重複讀取的源頭）。

---

## 六、Phase 4 — Skill 化（P1，常駐 19K → ~3K 的主力）

### 4.1 建立 skill 目錄

```
.claude/skills/
├── uidesign/SKILL.md        ← 內容來源：.claude/rules/UIDESIGN.md 全文
├── deploy-release/SKILL.md  ← 內容來源：deploy.md（含已併入的 main/readme 內容）
├── database/SKILL.md        ← 內容來源：database.md 全文
└── workflow/SKILL.md        ← 內容來源：workflow.md 全文
```

frontmatter 範本（description 必須寫成觸發條件，這決定自動載入率）：

```yaml
---
name: uidesign
description: KJ 前端 UI 設計規範（Warm Minimal 設計系統）。任何新增、修改 frontend/ 內的 UI 元件、樣式、顏色、彈窗、Tab、FAB、SidebarNav 之前，必須先載入本 skill。
---
```

```yaml
---
name: deploy-release
description: 部署與 git 推送規則。執行 git push、merge、tag、功能上線、hotfix 上線、修改部署設定（_worker.js / zbpack / .env）之前，必須先載入本 skill。
---
```

```yaml
---
name: database
description: 資料庫操作安全規則（prod/backup/dev 三 DB 架構與雙閘門）。編輯 server/services/、產生 migration、或任何直接讀寫 DB 的操作之前，必須先載入本 skill。
---
```

```yaml
---
name: workflow
description: 功能開發完整流程（新功能／修改計畫／執行計畫／測試功能／修 bug／功能上線 六個關鍵字流程與分支策略）。使用者說出任一關鍵字、或開始任何實作與計畫動作之前，必須先載入本 skill。
---
```

- frontend.md、backend.md 內容較小（各 ~1–2KB）：frontend.md 併入 uidesign skill 開頭
  （目錄結構 / 測試指令 / 登入機制段落）；backend.md 併入 database skill 開頭
  （目錄結構 / API 路由表；「改 server/ 必提醒重啟」這一條移入 CLAUDE.md 鐵律區）。

### 4.2 rules-injector.js 改為「skill 載入提醒」

- 移除「必須立即 Read <檔案>」邏輯（該檔案將不存在）。
- 改為依路徑注入一行提醒，例如：
  `🎨 編輯前端 UI — 若尚未載入 uidesign skill，請先載入（分支：<branch>）`
- 對照表：`frontend/` → uidesign；`server/services/` → database；`server/` → database；
  部署設定檔 → deploy-release；branch=main 時附加 main 警告一行（文字內嵌 hook，不再依賴 rules/main.md）。

### 4.3 重寫 CLAUDE.md（全文草稿，可直接使用）

```markdown
# CLAUDE.md

## 對話啟動規則

每次對話開始第一件事：

1. 執行 `git branch --show-current && git log main -1 --oneline`
2. 讀 `.claude/now.md`（已知地雷 + 環境特殊狀態）
3. 才接受指令

上下文快滿輸入 `/打包`，新對話輸入 `/繼續`。

## 語言

繁體中文（台灣用語）。技術術語可英文，解釋繁中。

## 鐵律（不可違反；前兩條由 git-guard hook 硬攔截）

- ⛔ 禁止在 main 直接 commit 功能程式碼（server/、frontend/、package.json、部署設定、migrations）
- ⛔ 禁止 `git add -A` / `git add .`，一律指定具體檔案
- ⛔ prod / backup DB 任何寫入，需使用者明確回覆「確認操作正式 DB」
- ⛔ 功能分支必須推遠端；merge 進 main 一律 `--no-ff`
- ⛔ push main 前：更新 now.md（與推送同 commit）+ 機密檢查 + 使用者明確確認
- ⛔ 需求或方案不可行時，先說明並詢問使用者，不得自行改用其他做法
- 修改 `server/` 後必須提醒使用者重啟本機伺服器

## Skill 索引（依情境自動載入；未載入時可用 /skill名稱 手動載入）

| 情境 | Skill |
|---|---|
| 動 frontend/ 任何 UI 元件前 | uidesign |
| git push / merge / tag / 上線 / 部署設定 | deploy-release |
| 編輯 server/services/ 或任何 DB 操作 | database |
| 新功能／修改計畫／執行計畫／測試功能／修 bug／功能上線 | workflow |

## 已定案決策（不得推翻）

[原封不動保留現有整張表]

## 版本記憶

- 版本索引：[.claude/CHANGELOG.md](.claude/CHANGELOG.md)（近 5 版全文，更早僅索引）
- 每版詳細上下文：`.claude/context/vX.Y.Z.md`
```

### 4.4 刪除已搬移的 rules 檔

skill 建好並自測後，刪除 `.claude/rules/` 下的
`UIDESIGN.md`、`deploy.md`、`database.md`、`workflow.md`、`frontend.md`、`backend.md`
（main.md、readme.md 已在 Phase 3 刪除）。全 repo grep 確認無殘留引用：

```bash
grep -rn "\.claude/rules/" --include="*.md" --include="*.js" . | grep -v node_modules | grep -v openspec/changes/20
```

---

## 六之二、Phase 5 — OpenSpec 工具殘骸清理（P1）

> 背景：OpenSpec 開源工具（Fission-AI/OpenSpec）僅在早期 VS Code 環境使用過，
> 自 change 13 起實務上已改為純兩件套（spec.md + tasks.md），工具本身不再使用。
> 現存殘骸：01–10 的四件套格式（proposal/design）、`17-SidebarNav-UI重構` 與
> `17-桌機版面置中` 編號撞號（後者缺 spec.md，CHANGELOG 又稱其為 change 18）、
> 工具品牌名殘留在規則文字與目錄名。

### 5.1 已完成 change 資料夾歸檔刪除

刪除 `openspec/changes/` 下所有**已完成**的 change 資料夾（01–19 全部，含兩個 17）。
依據：歷史已由 git 與 `.claude/context/vX.Y.Z.md` 承載，資料夾是第三份重複 + 搜尋污染源。
保留原則：**進行中的 change 一律保留**。目前已知進行中：`20-團隊調查表單系統`
（若屆時已 merge 進 main 且仍在開發）、`22-規則體系重構`、`23-模型分層工作證`。
change 12 的資料夾在 `m_b_統一彈出訊息系統` 分支上、`20-AI員工後端橋接` 在
`claude/new-session-k97gfv` 分支上，main 上皆不存在，不需處理。

### 5.2 目錄與稱呼去品牌化

- `git mv openspec/changes changes` → 目錄改為根目錄 `changes/`，刪除空的 `openspec/`。
- 全 repo grep `openspec`，規則文字中「OpenSpec change」一律改為「change」、
  路徑 `openspec/changes/` 改為 `changes/`（workflow 內容已搬入 skill 者在 skill 內改）。
- 編號規則在 workflow skill 中補一句：「新 change 編號 = 現存最大編號 + 1」。

### 5.3 刪除雙裝置工作流段落

workflow.md（或已搬入的 workflow skill）中「雙裝置工作流（PC + 手機 Claude Code Web）」
整段刪除。使用者用什麼裝置屬使用者私事，模型不需知道；模型需要的環境事實
（CCR 沙箱 git tag 403、npm 不可用等）已在 `.claude/now.md` 地雷區，不受影響。

### 5.4 執行順序

Phase 5 排在 Phase 4 之後執行（workflow skill 先成形，再做路徑與稱呼替換，避免改兩次）。

---

## 七、驗證與成功判定（Sonnet 執行用）

### 7.0 判定總規則

1. **每個 Phase 結束時，先跑該 Phase 的 gate（下表），全 ✅ 才 commit、才進下一 Phase。**
2. 任一項 ❌ → 在該 Phase 內修復後重跑 gate。**修復方式若超出本 spec 範圍 → 停止，
   回報使用者**（列出：失敗項、實際輸出、你的診斷、建議做法），不得自行擴大改動。
3. 全部 Phase 完成後跑 7.6 總驗收；**總驗收全 ✅ = change 22 成功**，任何一項 ❌ = 未完成。
4. **回滾方式**：每 Phase 一個 commit，所以任何 Phase 出問題都可以 `git revert <該 Phase commit>`
   單獨撤銷，不影響其他 Phase。

### 7.1 Phase 1 gate（修矛盾）

```bash
# 全部指令的預期結果標注在註解中
ls .cursorrules .claude/RULES-MAP.md 2>&1        # 預期：兩者皆 No such file
grep -n "CHANGELOG.md\|UIDESIGN" CLAUDE.md        # 預期：路徑為 .claude/CHANGELOG.md 與 .claude/rules/UIDESIGN.md
grep -c "RULES-MAP" CLAUDE.md                     # 預期：0
head -8 .claude/now.md | grep "移除"              # 預期：命中新加入的地雷清理規則
```

### 7.2 Phase 2 gate（Hook 硬化）— 含不開新 session 的 hook 實測法

hook 可以直接用 pipe 餵 JSON 測試，不需要真的觸發 Claude 工具呼叫：

```bash
node --check .claude/hooks/git-guard.js && node --check .claude/hooks/post-push-sync.js
bash -n scripts/sync-branches.sh

# 測試 1：git add -A 必須被 deny（分支無關，可直接在工作分支測）
echo '{"tool_name":"Bash","tool_input":{"command":"git add -A"}}' \
  | node .claude/hooks/git-guard.js
# 預期 stdout 含："permissionDecision":"deny"

# 測試 2：heredoc / commit message 內含 "git add ." 字樣不得誤判
echo '{"tool_name":"Bash","tool_input":{"command":"git commit -m \"docs: 說明 git add . 的規則\""}}' \
  | node .claude/hooks/git-guard.js
# 預期：無 deny 輸出（在非 main 分支、無 staged 產品碼的前提下）

# 測試 3：main 分支 commit 產品程式碼必須被 deny —— 用暫存假 repo 模擬，不碰真 repo
PROJ=$(pwd); T=$(mktemp -d); cd "$T"
git init -qb main && mkdir server && echo x > server/a.js && git add server/a.js
echo '{"tool_name":"Bash","tool_input":{"command":"git commit -m test"}}' \
  | node "$PROJ/.claude/hooks/git-guard.js"
# 預期 stdout 含："permissionDecision":"deny"
cd "$PROJ" && rm -rf "$T"

# 測試 4：sync 腳本 DRY_RUN 模式
DRY_RUN=1 bash scripts/sync-branches.sh
# 預期：列出遠端 m_b_* 分支與預計動作，git status 確認工作區無任何變動、分支未切換
```

### 7.3 Phase 3 gate（規則合併）

```bash
ls .claude/rules/main.md .claude/rules/readme.md 2>&1   # 預期：皆 No such file
grep -rn "rules/main.md\|rules/readme.md" .claude/ CLAUDE.md | grep -v context/  # 預期：0 筆
grep -c "^## \[" .claude/CHANGELOG.md                    # 預期：完整摘要 ≤ 5 版（其餘為一行索引）
grep -n "Read" .claude/settings.json                     # 預期：matcher 中無 Read
grep -n "功能上線" .claude/rules/deploy.md | head -3     # 預期：README 重寫條件已改為僅功能上線
```

### 7.4 Phase 4 gate（Skill 化）

```bash
# frontmatter 合規：每檔前 5 行須含 ---、name:、description:
for f in .claude/skills/*/SKILL.md; do echo "== $f =="; head -5 "$f"; done

ls .claude/rules/ 2>&1                                   # 預期：目錄不存在或為空
grep -rn "\.claude/rules/" --include="*.md" --include="*.js" . \
  | grep -v node_modules | grep -v "changes/" | grep -v context/   # 預期：0 筆

# 常駐 token 估算（成功門檻 ≤ 3,500）
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

### 7.5 Phase 5 gate（OpenSpec 殘骸清理）

```bash
ls changes/                                              # 預期：僅存進行中 change（22、23，及已 merge 且仍開發中者）
ls openspec 2>&1                                         # 預期：No such file
grep -rni "openspec" --include="*.md" --include="*.js" . \
  | grep -v node_modules | grep -v context/ | grep -v changes/     # 預期：0 筆
grep -c "雙裝置" .claude/skills/workflow/SKILL.md        # 預期：0
```

### 7.6 總驗收（全部 Phase 完成後）

- [ ] 7.1–7.5 各 gate 重跑一次全 ✅（防後面 Phase 改壞前面的東西）
- [ ] `git log --oneline main..HEAD` 顯示 5–6 個 commit，每 Phase 一個
- [ ] tasks.md 全部勾選
- [ ] 產出**驗收報告**給使用者，格式：
  ```
  ## Change 22 驗收報告
  - 各 Phase gate 結果：（逐項 ✅/❌ + 關鍵輸出）
  - 常駐 token 估算：改造前 ~19,000 → 改造後 N
  - 待使用者確認事項：Phase 1.4 分支刪除清單、merge 進 main 的時機
  - 已知未盡事項：（若有）
  ```
- [ ] **最終人工驗收（使用者執行，Sonnet 在報告中提醒）**：merge main 後開一個全新 session，
  確認 (a) CLAUDE.md 正常載入且連結可達；(b) 說「幫我看一下某個前端元件」時 uidesign skill
  會被自動載入；(c) 在分支上執行 `git add -A` 被實際擋下。

## 八、使用者自辦事項（不在 Sonnet 執行範圍，列出供追蹤）

1. Claude Code 環境停用本專案用不到的 connectors（Canva / Figma / Gmail / Calendar / Drive / Make），只留 GitHub。
2. 遠端 dev 分支與 fix/landscape-orientation-overlay 的刪除確認（Phase 1.4 會產出報告）。
3. 模型分層習慣：Opus 規劃 → Sonnet 實作 → Haiku commit；階段之間開新 session（cache 依模型分開）。
4. 零碎使用時批次交辦；一個 change 收尾就 `/打包`。
5. docs/ 過時文件（Vercel/Supabase 時代 30+ 檔）搬 `docs/archive/`、大圖與 PDF 移出——可另開小 change 或手動處理。
6. **調查表單分支復工**（change 20-團隊調查表單系統，現在 `claude/new-feature-pz95p1`，
   領先 main 14 commits，內容完整安全）。本 change 上線 main 之後、繼續開發之前：
   a. 分支改名入籍：`git checkout claude/new-feature-pz95p1 && git checkout -b m_b_調查表單 && git push origin m_b_調查表單`
      （之後 sync 腳本才會涵蓋它；舊分支刪除在 CCR 會 403，PC 上刪）。
   b. 把 main 的新規則接進來：`git merge main --no-edit`。
      `.claude/` 相關衝突一律取 main 版本（main 是規則唯一來源）。
   c. 目錄遷移：merge 後表單的 spec 會殘留在舊路徑，執行
      `git mv openspec/changes/20-團隊調查表單系統 changes/ && rmdir -p openspec/changes 2>/dev/null`。
   d. 之後照常開發（change 23 上線後可用 `/實作` 角色）。
7. `20-AI員工後端橋接`（`claude/new-session-k97gfv` 分支，僅一個 spec commit）：
   撿起時將編號改為 21，避免與表單的 change 20 撞號。
