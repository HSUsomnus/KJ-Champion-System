# CLAUDE.md

## 對話啟動規則

每次對話開始，第一件事必須執行：

1. 讀取 NOW.md
2. 確認目前功能範圍與進度
3. 才開始接受任何指令

上下文快滿時輸入 `/打包`，新對話輸入 `/繼續`。

## 語言

繁體中文（台灣用語）。技術術語可保留英文，但解釋必須用繁體中文。

## 工作流

| 關鍵字 | 動作 |
| ------ | ---- |
| **「新增功能」** | 切分支 + 開 OpenSpec change |
| **「修改計畫」** | 確認分支 → 只動文件 |
| **「執行計畫」** | 確認分支 → 實作程式碼 |
| **「測試功能」** | merge 到 dev |
| **「功能上線」** | merge 到 main，關 change |

詳細規則：`.claude/rules/workflow.md`

## 推送前必做（摘要）

機密檢查 + README 完整重寫 + 使用者確認。
詳細步驟見 `.claude/rules/deploy.md`。

### 規則類更新可直推 main

`.claude/`、`.gitignore`、`scripts/`工具腳本、`CLAUDE.md` 等規則類變更，可直接 cherry-pick 到 main 並 push，不需走功能分支流程。
功能、伺服器、資料庫、插件等程式碼變更**禁止直推 main**。
詳見 `.claude/rules/deploy.md`。

### main 推送後必須同步所有分支

任何 push 到 main 之後，立即將 main merge 到所有其他本機分支（`dev`、`m_b_*` 等），確保規則與基礎建設全域一致。

**⚠️ 執行前警告使用者：** merge 過程需要 checkout 各分支，若有 worktree 佔用的分支會先暫時移除 worktree，merge 完成後自動重建。請確認所有 worktree 內無未儲存的工作。

## 版本記憶

版本索引：`CHANGELOG.md`，詳細上下文：`.claude/context/vX.Y.Z.md`

## 關鍵檔案

| 檔案 | 說明 |
| --- | --- |
| `public/js/liff.js` | LINE Login + window.LIFF 介面 |
| `server/server.js` | Express 主入口 |
| `server/routes/auth.js` | LINE OAuth 回調 |
| `openspec/STATUS.md` | OpenSpec 狀態儀表板 |

## NOW.md 更新規則

以下情況必須自動更新 NOW.md，不需等待指令：

1. 完成一個任務項目後
2. 發現新的地雷或限制時
3. 設計決策有調整時
4. 使用者執行 `/打包` 時

更新權限：

- 進度、地雷：Claude Code 自由更新
- 設計決策：有變動才更新，需告知使用者
- 功能範圍：使用者確認後才能更改

---

## 程式碼決策註解規範

當實作涉及非直覺的設計選擇時，在該段程式碼上方加入：

// [設計決策] 簡短描述這個選擇
// 原因：為什麼不用更直覺的方式
// 若要修改：請先確認 NOW.md 的設計決策區塊

適用情境：

- 繞過某個 library 的預設行為
- 刻意不使用某個更簡單的方案
- 與一般慣例不同的實作方式

---

## 已定案決策（不得推翻）

> 以下決策已經過深思熟慮，執行中不得建議更改或繞過。
> 若有充分理由需要調整，須先明確告知使用者，等待確認。

### 身份驗證

- 不使用 LIFF SDK，採自製 LINE OAuth
- 原因：避免 LINE SDK 版本升級造成鎖定，自製更可控

### 資料庫

- 主庫為 Zeabur PostgreSQL，不得建議換回 Supabase
- 原因：已完成遷移，Supabase 進入退場流程

### 前端架構

- 正式環境：純 HTML + 原生 JS（public/）
- Staging：React + Vite + PWA（frontend/）
- 兩者不得混用，功能開發依部署目標選擇正確目錄

### 部署

- 前端目標：Cloudflare Pages
- 後端目標：Zeabur
- 遷移順序不得跳階（後端先於前端遷移）

<!-- 新增決策格式：
### 功能名稱
- 決策內容
- 原因：為什麼這樣決定
-->
