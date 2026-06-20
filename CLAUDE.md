# CLAUDE.md

## 對話啟動規則

每次對話開始第一件事：

1. 執行 `git branch --show-current && git log main -1 --oneline`（確認分支與 HEAD）
2. 讀 `.claude/now.md`（確認已知地雷與環境特殊狀態）
3. 才接受指令

上下文快滿輸入 `/打包`，新對話輸入 `/繼續`。

## 語言

繁體中文（台灣用語）。技術術語可英文，解釋繁中。

## 統一索引表

| 文件 | 職責 | 何時讀 |
|---|---|---|
| `.claude/now.md` | 已知地雷 + 環境特殊狀態 | 每次 session 開始 |
| `.claude/rules/workflow.md` | 分支、change、關鍵字完整流程 | 任何實作或計畫動作前 |
| `.claude/rules/deploy.md` | 部署、git 推送完整 checklist | git 操作前 |
| `.claude/rules/backend.md` | 後端 `server/` 規則 | 編輯 `server/` 前 |
| `.claude/rules/database.md` | 資料庫操作安全規則 | 編輯 `server/services/` 前 |
| `.claude/rules/frontend.md` | 前端 `frontend/` 規則 | 編輯 `frontend/` 前 |
| `.claude/rules/main.md` | main 分支限制 | 確認在 main 分支時 |
| `.claude/rules/readme.md` | README 撰寫標準 | 推送或合併前 |
| `openspec/STATUS.md` | 所有 change 路線圖 | 執行/修改計畫前 |
| `UIDESIGN.md` | 前端 UI 完整規範 | 動任何 UI 元件前 |

> 新增任何 `.claude/rules/*.md` 或專案規範文件，必須同時在此表加一行。

## 已定案決策（不得推翻）

> 以下決策已深思熟慮，執行中不得建議更改或繞過。若有充分理由需要調整，須先明確告知使用者並等待確認。

| 領域 | 決策 | 原因 |
|---|---|---|
| **身份驗證** | 不使用 LIFF SDK，採自製 LINE OAuth | 避免 SDK 版本鎖定，自製更可控 |
| **資料庫** | Zeabur PostgreSQL（已從 Supabase 遷移完成） | Supabase 退場流程，禁止建議換回 |
| **前端架構** | React + Vite + PWA（`frontend/`），舊 `public/` 已於 v2.0.0 刪除 | 雙前端並行設計已廢除，禁止復用或重建舊 `public/` |
| **部署架構（v2.1.0）** | 前端 Cloudflare Pages、後端 Zeabur；**dev / prod 跨 Zeabur 專案物理隔離** | dev 任何錯誤 / 寫入無法物理觸碰 prod DB |
| **prod DB 公網（v2.1.0）** | 預設關閉，僅內網存取 | 安全強化；PC 維護需暫時開公網，做完關 |
| **新用戶 onboarding（v2.0.7+）** | 強制流程：用戶資料 4 欄全必填 → 用戶數據（課程紀錄 ≥ 1 筆）→ 主應用 | 業務規則保證資料完整性 |

## 版本記憶

- 版本索引：[`CHANGELOG.md`](CHANGELOG.md)
- 每版詳細上下文：`.claude/context/vX.Y.Z.md`
