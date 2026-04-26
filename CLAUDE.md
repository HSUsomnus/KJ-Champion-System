# CLAUDE.md

## 對話啟動規則

每次對話開始第一件事：

1. 讀 `NOW.md` 確認目前進度與設計決策
2. 才接受指令

上下文快滿輸入 `/打包`，新對話輸入 `/繼續`。

## 語言

繁體中文（台灣用語）。技術術語可英文，解釋繁中。

## 工作流關鍵字（詳細：[`.claude/rules/workflow.md`](.claude/rules/workflow.md)）

| 關鍵字 | 動作 |
|---|---|
| 「新增功能」 | 切分支 + 開 OpenSpec change |
| 「修改計畫」 | 確認分支 → 動 OpenSpec 文件 |
| 「執行計畫」 | 確認分支 → 寫程式碼 |
| 「修 bug」 | **先判斷 bug 來源**：main 上的 → hotfix；dev 上發現但來自 m_b_* → 改該 m_b_* |
| 「測試功能」 | merge 功能分支到 dev |
| 「功能上線」 | merge 到 main + tag + 同步 |
| 「格式化 dev」 | dev 重置至 main（dev 壞掉直接重置最快，不在 dev 修） |

## 推送原則（詳細：[`.claude/rules/deploy.md`](.claude/rules/deploy.md)）

- **推 main 前必做**：機密檢查 + README 重寫 + CHANGELOG / `.claude/context/vX.Y.Z.md` / 使用者確認
- **可直推 main**：`.claude/`、`CLAUDE.md`、`scripts/` 工具腳本、`.gitignore`、`CHANGELOG.md`、`NOW.md`（規則 / 文件類）
- **禁止直推 main**：`server/`、`frontend/`、`public/`、migrations、`package.json`、部署設定（`_worker.js` 等）
- **main push 後必須同步全分支**（dev + 所有 m_b_*）

## 雙裝置工作流（PC + 手機 Claude Code Web）

- PC：複雜重構、實機 UI 驗證、跑 `npm test` / `pg_dump`、tag 建立、刪分支（手機 CCR 沙箱會 403）
- 手機：駕駛等候時段主力產出、新功能 scaffolding、OpenSpec 文件、小修
- **同步管道是 git**：兩裝置進度都靠 GitHub 主分支 / NOW.md / OpenSpec STATUS 共享，不靠 Claude session 記憶

## 關鍵檔案

| 檔案 | 說明 |
|---|---|
| `NOW.md` | 當前執行狀態（每次新對話必讀） |
| `openspec/STATUS.md` | OpenSpec 狀態儀表板 |
| `UIDESIGN.md` | **前端 UI 規範總入口**（動到任何 UI 元件 / 新增彈窗 / 改視覺前必讀） |
| `frontend/src/App.jsx` | React Router 主入口（含 onboarding guard） |
| `frontend/src/contexts/AuthContext.jsx` | 認證 + `isProfileComplete` / `isStatsComplete` |
| `frontend/public/_worker.js` | Cloudflare Worker（`/api/*` proxy + dev/prod 分流） |
| `server/server.js` | Express 主入口 |
| `server/routes/auth.js` | LINE OAuth 回調（動態 origin 偵測 + 白名單） |

## 版本記憶

- 版本索引：[`CHANGELOG.md`](CHANGELOG.md)
- 每版詳細上下文：`.claude/context/vX.Y.Z.md`

## NOW.md 更新規則

以下情況**自動更新**，不需等指令：完成 task、發現新地雷、設計決策變動、使用者 `/打包`。

- 進度 / 地雷：Claude 自由更新
- 設計決策：有變動才更新，需告知使用者
- 功能範圍：使用者確認後才能改

## 前端 UI 規範

**動到任何前端 UI 元件 / 新增彈窗 / 修改視覺前必讀：[`UIDESIGN.md`](UIDESIGN.md)**

涵蓋：

- **Warm Minimal 設計系統**：色板（`#F7F5F2` bg / `#4A7C59` accent / `#2C2C2C` text）、排版、圓形元素、卡片、按鈕、FAB、SVG icon、間距、動畫
- **Feedback 元件規範**（v2.4.0）：Toast / ConfirmDialog / BottomSheet / FieldError 視覺與 API
- **彈出訊息決策樹**：何時用 toast、何時用 dialog、何時用 inline error
- **禁止事項**：emoji icon、漸層、純黑、外部 icon library、原生 `alert / confirm / prompt`、第三方通知套件

> 若需新增 UI 規範請更新 `UIDESIGN.md` 而非分散在各處註解。

## 程式碼決策註解規範

實作涉及非直覺選擇時，在程式碼上方加註：

```js
// [設計決策] 簡短描述這個選擇
// 原因：為什麼不用更直覺的方式
// 若要修改：請先確認 NOW.md 的設計決策區塊
```

適用：繞過 library 預設行為、刻意不用更簡單方案、與一般慣例不同的實作。

---

## 已定案決策（不得推翻）

> 以下決策已深思熟慮，執行中不得建議更改或繞過。若有充分理由需要調整，須先明確告知使用者並等待確認。

| 領域 | 決策 | 原因 |
|---|---|---|
| **身份驗證** | 不使用 LIFF SDK，採自製 LINE OAuth | 避免 SDK 版本鎖定，自製更可控 |
| **資料庫** | Zeabur PostgreSQL（已從 Supabase 遷移完成） | Supabase 退場流程，禁止建議換回 |
| **前端架構** | React + Vite + PWA（`frontend/`），舊 `public/` 已於 v2.0.0 刪除 | 雙前端並行設計已廢除，禁止復用或重建舊 `public/` |
| **部署架構（v2.1.0）** | 前端 Cloudflare Pages、後端 Zeabur；**dev / prod 跨 Zeabur 專案物理隔離**（`kj-champion-dev` vs `kj-champion`） | dev 任何錯誤 / 寫入無法物理觸碰 prod DB |
| **prod DB 公網（v2.1.0）** | 預設關閉，僅內網（`postgresql.zeabur.internal:5432`）存取 | 安全強化；PC 維護需暫時開公網，做完關 |
| **新用戶 onboarding（v2.0.7+）** | 強制流程：用戶資料 4 欄全必填 → 用戶數據（課程紀錄 ≥ 1 筆）→ 主應用，未完成不得進其他頁 | 業務規則保證資料完整性 |

<!-- 新增決策格式：
| 新領域 | 決策內容 | 原因 |
-->
