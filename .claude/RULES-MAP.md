# 規則體系地圖

> 速查用。了解「哪個檔案管什麼、誰呼叫它、什麼時候讀」。

---

## 零、Claude Code 原生識別檔案（不能刪）

這些是 Claude Code 本身會自動讀取或掃描的特殊檔案，刪除會破壞工具本身的運作。

| 檔案 | Claude Code 行為 | 刪除後果 |
|------|----------------|---------|
| `CLAUDE.md` | 啟動時自動載入為 system prompt | Claude 收不到任何專案指令 |
| `.claude/settings.json` | 讀取 Hook 設定與 permissions | 三個 Hook 全部失效 |
| `.claude/settings.local.json` | 本機 permissions allowlist | 每個指令都需重新審批（可重建） |
| `.claude/commands/*.md` | 掃描目錄產生 slash command | 刪除對應 `.md` = 移除那個 slash command |

**以下所有檔案都是本專案自訂的**，Claude Code 本身不認識。刪除不會壞掉 Claude Code，只會失去專案規則與紀錄。

---

## 一、整體架構

```
CLAUDE.md（頂層入口，每次對話必讀）
│
├── .claude/now.md                    動態地雷狀態，每次對話第二步
│
├── .claude/settings.json             Hook 設定（PreToolUse / PostToolUse）
│   ├── PreToolUse → Edit|Write       → rules-injector.js
│   ├── PreToolUse → Bash             → git-guard.js
│   └── PostToolUse → Bash            → post-push-sync.js
│
└── .claude/rules/workflow.md         流程主幹（任何實作或計畫動作前）
    ├── .claude/rules/deploy.md       git 操作與部署 checklist
    │   ├── .claude/rules/main.md     main 分支額外限制
    │   └── .claude/rules/readme.md   推送前必寫 README
    ├── .claude/rules/frontend.md     frontend/ 領域規則
    ├── .claude/rules/backend.md      server/ 領域規則
    │   └── .claude/rules/database.md services/ + DB 安全閘門（最嚴）
    └── （依賴）UIDESIGN.md           UI 元件視覺規範（非 .claude/）

openspec/changes/NN-名稱/
    ├── spec.md                       需求 + 技術設計（無全域 STATUS.md）
    └── tasks.md                      可勾選實作清單，進度唯一來源
```

---

## 二、Hook 系統

### 設定檔：`.claude/settings.json`

| Hook 事件 | 觸發工具 | 執行腳本 |
|-----------|---------|---------|
| `PreToolUse` | `Edit` 或 `Write` | `.claude/hooks/rules-injector.js` |
| `PreToolUse` | `Bash` | `.claude/hooks/git-guard.js` |
| `PostToolUse` | `Bash` | `.claude/hooks/post-push-sync.js` |

---

### Hook 腳本詳細說明

#### `.claude/hooks/rules-injector.js`
- **上級 Hook**：`settings.json` → `PreToolUse`（`Edit|Write`）
- **觸發時機**：每次 Claude 呼叫 Edit 或 Write 工具前
- **呼叫的規則檔**：

  | 被編輯的檔案路徑 | 注入的規則 |
  |----------------|-----------|
  | `frontend/` 或 `public/` | `rules/frontend.md` |
  | `server/services/` | `rules/backend.md` + `rules/database.md` |
  | `server/`（非 services） | `rules/backend.md` |
  | `zbpack`、`_worker`、`_redirects`、`wrangler`、`.env` | `rules/deploy.md` |
  | 當前分支為 `main` | 額外加 `rules/main.md` |
  | `.claude/`、`openspec/STATUS`、`CLAUDE.md` | 豁免，不注入任何規則 |

- **行為**：輸出 `additionalContext` 提示 Claude 主動 Read 對應規則檔（不注入全文，保持 context 輕量）

#### `.claude/hooks/git-guard.js`
- **上級 Hook**：`settings.json` → `PreToolUse`（`Bash`）
- **觸發時機**：每次 Claude 呼叫 Bash 工具前
- **守衛的三類操作**：

  | 攔截條件 | 行為 | 依據規則 |
  |---------|------|---------|
  | `git push origin main`（非 --delete） | 顯示 deploy checklist（now.md、機密檢查、使用者確認、push 後 sync） | `rules/deploy.md` |
  | `git commit` 在 `main` 且 staged 有非 `.claude/` 檔案 | 封鎖並要求切到 `m_b_*` 分支 | `rules/workflow.md` |
  | `git add -A` 或 `git add .` | 封鎖，要求指定具體檔案路徑 | `rules/deploy.md` |

#### `.claude/hooks/post-push-sync.js`
- **上級 Hook**：`settings.json` → `PostToolUse`（`Bash`）
- **觸發時機**：Bash 工具執行完畢後（偵測是否為 `git push origin main`）
- **行為**：push main 完成後，自動輸出全分支 sync 腳本提醒：
  1. 對所有遠端 `m_b_*` 逐一 merge main 並 push
  2. 衝突時使用 `-X theirs` 並在回報中列出被覆蓋的內容

---

## 三、規則檔詳細說明

### `CLAUDE.md`（頂層入口）
- **觸發**：每次對話第一步，Claude 主動讀取
- **不被 Hook 呼叫**（beans-injector 豁免此檔）
- **職責**：對話啟動順序、統一索引表、已定案決策（不得推翻的技術選型）、版本記憶索引

### `.claude/now.md`（動態狀態）
- **觸發**：每次對話第二步，Claude 主動讀取
- **不被 Hook 呼叫**（rules-injector 豁免 `.claude/` 目錄）
- **職責**：已知地雷、當前 Change 進度、最近推送摘要、環境特殊狀態
- **維護時機**：每次推送 main 前必須更新，與推送同一個 commit

### `.claude/rules/workflow.md`（流程主幹）
- **觸發**：Claude 手動讀取（任何實作或計畫動作前）
- **不直接被 Hook 呼叫**（屬於邏輯層，非路徑觸發）
- **職責**：新功能探索→建計畫→執行→測試→上線完整流程；蓋一層測一層原則；分支架構；`.claude/` 修改流程

### `.claude/rules/deploy.md`（部署 checklist）
- **觸發來源**：
  - rules-injector.js（當編輯 `_worker.js`、`.env`、`zbpack` 等部署設定檔時）
  - git-guard.js（推送 main 前顯示摘要）
  - Claude 手動讀取（git 操作前）
- **職責**：Zeabur 雙專案架構、推送前必做 5 項、直推 main 規則、push main 後全分支同步流程、CCR 沙箱 403 限制

### `.claude/rules/main.md`（main 分支限制）
- **觸發來源**：rules-injector.js（當前分支為 `main` 時附加）
- **職責**：main 分支強制警告、禁止直接開發、推送流程摘要（完整版在 deploy.md）

### `.claude/rules/readme.md`（README 規範）
- **觸發**：Claude 手動讀取（推送或合併前）
- **不被 Hook 呼叫**（時機判斷依賴 Claude 自身流程判斷）
- **職責**：各分支 README 格式要求；dev 分支必填功能分支總表；嚴禁複製上次 README

### `.claude/rules/frontend.md`（前端領域）
- **觸發來源**：rules-injector.js（編輯 `frontend/` 或 `public/` 時）
- **職責**：前端目錄結構、本機開發指令、測試指令、登入機制（`?dev=1`）、分享機制、UI 規範入口（→ UIDESIGN.md）

### `.claude/rules/backend.md`（後端領域）
- **觸發來源**：rules-injector.js（編輯 `server/` 時）
- **職責**：修改後必提醒重啟伺服器、目錄結構（routes / services）、API 路由前綴規範

### `.claude/rules/database.md`（DB 安全閘門，最嚴）
- **觸發來源**：rules-injector.js（編輯 `server/services/` 時，與 backend.md 同時注入）
- **職責**：雙重閘門設計
  - **第一閘門**：確認使用 dev 測試 DB，禁止直接寫 prod
  - **第二閘門**：寫入 prod DB 前必須強制警告 + 使用者明確回覆「確認測試正式 DB」+ 做完關公網

---

## 四、觸發關係速查表

| 規則檔 | Claude 主動讀 | rules-injector.js | git-guard.js | post-push-sync.js |
|--------|:---:|:---:|:---:|:---:|
| `CLAUDE.md` | ✅ 每次對話 | 豁免 | — | — |
| `.claude/now.md` | ✅ 每次對話 | 豁免 | — | — |
| `rules/workflow.md` | ✅ 實作前 | — | — | — |
| `rules/deploy.md` | ✅ git 前 | ✅ 部署設定檔 | ✅ push main 摘要 | — |
| `rules/main.md` | — | ✅ 分支=main | — | — |
| `rules/readme.md` | ✅ 推送前 | — | — | — |
| `rules/frontend.md` | — | ✅ `frontend/` | — | — |
| `rules/backend.md` | — | ✅ `server/` | — | — |
| `rules/database.md` | — | ✅ `server/services/` | — | — |
| 全分支 sync 腳本 | — | — | — | ✅ push main 後 |

---

## 五、`.claude/` 完整目錄

```
.claude/
├── settings.json          Hook 設定（版控，全員共用）
├── settings.local.json    本機 permissions allowlist（不版控）
├── now.md                 動態地雷狀態
├── RULES-MAP.md           本檔（規則體系地圖）
├── CHANGELOG.md           版本索引（給 Claude 看的輕量摘要）
├── hooks/
│   ├── rules-injector.js  PreToolUse Edit|Write → 路徑比對注入規則提示
│   ├── git-guard.js       PreToolUse Bash → git 危險操作守衛（main 分支 + push main）
│   └── post-push-sync.js  PostToolUse Bash → push main 後輸出 m_b_* sync 腳本
├── rules/
│   ├── workflow.md        流程主幹（最常讀）
│   ├── deploy.md          部署 checklist
│   ├── main.md            main 分支限制
│   ├── readme.md          README 規範
│   ├── frontend.md        前端領域
│   ├── backend.md         後端領域
│   └── database.md        DB 安全閘門
├── commands/
│   └── 子代理.md          /子代理 slash command：開所有 m_b_* worktree
└── context/
    └── vX.Y.Z.md          各版本詳細上下文（背景/改動/學習日誌）

openspec/changes/NN-名稱/
├── spec.md                需求 + 技術設計（STATUS.md 已廢除）
└── tasks.md               可勾選實作清單，進度唯一來源
```
