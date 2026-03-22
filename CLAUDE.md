# CLAUDE.md — AI 助理專案規則

> 本檔案供 Claude Code 自動載入，定義此專案的 AI 助理行為規範。
> 等同 `.cursorrules`，但適用於 Claude Code。

---

## 語言

所有回應、說明、程式碼注釋建議皆使用**繁體中文**（台灣用語）。
技術術語可保留英文，但解釋必須用繁體中文。

---

## OpenSpec 強制規則（最高優先）

本專案使用 OpenSpec 規範化開發流程。**任何程式碼修改前，必須遵守以下規則：**

### 修改前必做

1. 執行 `openspec status --json` 確認目前進行中的 change
2. 閱讀對應的 `tasks.md`，確認當前應執行哪個 task
3. **只執行當前未完成（`[ ]`）且前置任務已完成（`[x]`）的 task**
4. 不得跳過任何未完成的前置步驟

### 嚴禁行為

- ❌ 未查 OpenSpec 狀態就直接動程式碼
- ❌ 執行尚未輪到的 task（即使技術上可行）
- ❌ 因為「看起來像問題」就自行修改，應先確認是否在 tasks 範圍內
- ❌ 診斷問題時順手實作（診斷 ≠ 授權修改）

### 正確流程

- 使用者問診斷問題 → 只分析、回報，**不動程式碼**
- 使用者說「執行」「實作」→ 先查 OpenSpec 當前 task，再動手
- 發現問題超出當前 task 範圍 → 回報使用者，等待指示

### 任何程式碼修改後，必須同步回寫 OpenSpec 文件

**這是防止「規格漂移」的最後防線。程式碼與規格不一致，等於下一次對話的地雷。**

凡對程式碼做了任何修改（無論是修 bug、加功能、還是緊急補檔），必須立刻更新以下文件：

1. **`tasks.md`**：
   - 若修改對應某個 task → 將該 task 標記為 `[x]`
   - 若修改是計畫外的緊急修復 → 在對應位置補寫一條新 task 並標記 `[x]`，說明做了什麼、為什麼

2. **`design.md`**（若架構有變動）：
   - 更新受影響的設計決策、元件說明或流程圖描述

3. **`specs/*.md`**（若行為規格有變動）：
   - 更新受影響的 API 規格、資料結構、業務邏輯說明

4. **禁止只改程式碼不更新文件**：
   - 若沒有更新對應 OpenSpec 文件，視為修改不完整
   - 下次 `/opsx:apply` 將以文件為準重新執行，可能覆蓋掉未記錄的修改

### 本次錯誤記錄（供學習）

**發生時間**：2026-03-22
**錯誤行為**：使用者詢問診斷問題，AI 未查 OpenSpec tasks 順序，直接將 `dualWriteService.js` 加入 `staging` 分支並推送。
**實際規定**：tasks 2e.1 明確指定該檔案只應存在於 `main` 分支；staging 的後端部署屬於 tasks 2f（尚未開始）。
**教訓**：診斷問題 ≠ 授權修改。任何修改前必須確認 OpenSpec 當前位置。

---

## 版本記憶查找

每個版本的詳細上下文記錄於獨立檔案，**需要時才讀取**：

```
.claude/context/v1.4.0.md   ← 目前最新版
.claude/context/v1.3.0.md
.claude/context/v1.2.0.md
.claude/context/v1.1.0.md
.claude/context/v1.0.0.md
```

版本索引：`CHANGELOG.md`（輕量，每版三行）

---

## 推送到 GitHub（必跑機密檢查流程）

當使用者說「推送到 GitHub」「push」或類似意圖時，**必須依序執行**：

### 步驟 1：推送前準備（版本文件）

1. 更新 `CHANGELOG.md`（在最上方加入新版本，舊版永遠保留）
2. 建立 `.claude/context/vX.Y.Z.md`（本版詳細上下文）
3. **完整重寫 `README.md`**（每次推送必做，不是選擇性更新）：
   - 重新撰寫技術架構、功能清單、專案結構、部署說明
   - 頂部版本號更新為本次版本（例如 `目前版本：v1.4.0`）
   - 確保內容反映目前程式碼的實際狀態，刪除過時資訊

### 步驟 2：機密檢查

- 確認 `.gitignore` 包含：`.env`、`.env.backup`、`.env.local`、`Key/`、金鑰用 `*.json`
- 執行 `git status`，列出將被推送的項目
- 確認 `.env`、`.env.backup`、`Key/` 不在清單中
- 搜尋機密模式：長 Token、`-----BEGIN PRIVATE KEY-----`、真實 Calendar ID / Sheets ID、寫死的帳號密碼
- 回覆使用者：推送項目清單 + 檢查結果，請使用者確認

### 步驟 3：使用者確認後，執行推送

```bash
git add <具體檔案>   # 不要用 git add -A，避免意外加入機密
git commit -m "feat/fix/chore: ..."
git push origin main
git tag vX.Y.Z
git push --tags
```

### 原則

- 未完成機密檢查並列出推送項目前，不得執行 `git add`/`commit`/`push`
- 未經使用者確認，不得執行 `git push`
- 發現機密必須先排除，不得直接推送

---

## 重要專案規則

### 前端

- 所有前端改動只改 `public/` 目錄
- **不動** `frontend/`（若存在為舊版 React，已廢棄）
- 開發模式測試：`http://localhost:8080?dev=1`（自動模擬登入）
- 未登入狀態測試：清除 localStorage 的 `lineUserId` 再重整

### 後端

- 修改 `server/` 目錄後，**必須提醒使用者重啟本機伺服器**
- 後端路由：`server/routes/`，業務邏輯：`server/services/`

### 登入機制

- 正式登入：LINE Login OAuth（不依賴 LIFF SDK）
- 本機測試：URL 帶 `?dev=1` 自動模擬登入

### 分享

- 手機：LINE URL Scheme（`https://line.me/R/share?text=...`）
- 電腦：Web Share API 或複製到剪貼簿

### 錯誤處理

- catch 到錯誤時，只顯示**實際錯誤內容**（`err.message`、`err.code` 或 API 回傳訊息）
- 不要自行加「失敗」「錯誤」等總結
- 功能失敗時不要 fallback 成其他行為，只顯示錯誤

### 需求變更

- 未經詢問不得自行改動使用者的需求或實作方案
- 若原方案有困難，必須先說明原因 + 提出替代方案 + 明確詢問使用者

---

## 關鍵檔案速查

| 檔案 | 說明 |
|------|------|
| `public/js/liff.js` | 核心：LINE Login + window.LIFF 介面 |
| `public/index.html` | 主頁（月曆） |
| `server/server.js` | Express 主入口 |
| `server/routes/auth.js` | LINE OAuth 回調 |
| `server/routes/calendar.js` | 行事曆 CRUD |
| `server/routes/member.js` | 成員管理 |
| `server/routes/financial.js` | 財務（限 manager）|
| `CHANGELOG.md` | 版本索引（輕量）|
| `.claude/context/` | 各版本詳細上下文 |
