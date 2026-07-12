# CLAUDE.md

## 對話啟動規則

每次對話開始第一件事：

1. 執行 `git branch --show-current && git fetch origin main --quiet && git log origin/main -1 --oneline`（確認分支與 HEAD；讀本機 main 可能是舊快照，CCR/新 clone 曾實測落後遠端）
2. 讀 `.claude/now.md`（確認已知地雷與環境特殊狀態）
3. 才接受指令

上下文快滿輸入 `/打包`，新對話輸入 `/繼續`。（/打包＝寫交接檔跨對話交接；同對話就地壓縮用內建 `/compact`，兩者不同）

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
- ⛔ 所有對使用者的文字輸出（含 tool call 之間的進度短報）一律繁體中文（台灣用語）

## Skill 索引（依情境自動載入；未載入時可用 /skill名稱 手動載入）

| 情境 | Skill |
|---|---|
| 動 frontend/ 任何 UI 元件前 | uidesign |
| git push / merge / tag / 上線 / 部署設定 | deploy-release |
| 編輯 server/services/ 或任何 DB 操作 | database |
| 新功能／修改計畫／執行計畫／測試功能／修 bug／功能上線 | workflow |

## Session 角色（模型分層）

開 session 先打卡：Opus/Fable 規劃 → `/規劃`；Sonnet 實作 → `/實作`；最高階模型診斷 → `/診斷`（只診斷、不動手）。收尾由「收尾員」子代理（Haiku）自動執行。

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

- 版本索引：[.claude/CHANGELOG.md](.claude/CHANGELOG.md)（近 5 版全文，更早僅索引）
- 每版詳細上下文：`.claude/context/vX.Y.Z.md`
