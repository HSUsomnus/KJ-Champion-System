# CLAUDE.md — AI 助理專案規則

> 本檔案供 Claude Code 自動載入，定義此專案的 AI 助理行為規範。
> 等同 `.cursorrules`，但適用於 Claude Code。

---

## 語言

所有回應、說明、程式碼注釋建議皆使用**繁體中文**（台灣用語）。
技術術語可保留英文，但解釋必須用繁體中文。

---

## 版本記憶查找

每個版本的詳細上下文記錄於獨立檔案，**需要時才讀取**：

```
.claude/context/v1.5.0.md   ← 目前最新版
.claude/context/v1.4.0.md
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
3. 檢查 `README.md` 是否過時：
   - 核對技術架構、功能清單、專案結構、部署說明
   - 過時內容必須重新編寫
   - 頂部更新版本號（例如 `目前版本：v1.5.0`）

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
- **不動** `frontend/`（React 舊版，已廢棄）
- 執行模式只改 `public/js/auth.js` 頂部的 `APP_RUN_MODE`：
  - `'development'` = 模擬登入（本機測試）
  - `'production'` = LINE Login OAuth（正式）

### 後端

- 修改 `server/` 目錄後，**必須提醒使用者重啟本機伺服器**
- 後端路由：`server/routes/`，業務邏輯：`server/services/`

### 登入與測試

- 正式登入：LINE Login OAuth（不依賴 LIFF SDK）
- 本機測試：`http://localhost:8080?dev=1`（自動模擬登入）
- 本機測試未登入狀態：清除 localStorage 的 `lineUserId` 再重整

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
| `public/js/auth.js` | 核心：LINE Login + window.LIFF 介面 |
| `public/sw.js` | Service Worker（快取策略，CACHE_NAME 版本號）|
| `public/manifest.json` | PWA 設定 |
| `server/server.js` | Express 主入口 |
| `server/routes/auth.js` | LINE OAuth 回調 |
| `server/routes/calendar.js` | 行事曆 CRUD |
| `server/routes/member.js` | 成員管理 |
| `server/routes/financial.js` | 財務（限 manager）|
| `CHANGELOG.md` | 版本索引（輕量）|
| `.claude/context/` | 各版本詳細上下文 |

---

## Service Worker 快取版本

每次更改靜態資源（JS/CSS/HTML）後，需在 `public/sw.js` 頂部升級 `CACHE_NAME`（例如 `kj-cache-v4` → `kj-cache-v5`），強制瀏覽器更新快取。
