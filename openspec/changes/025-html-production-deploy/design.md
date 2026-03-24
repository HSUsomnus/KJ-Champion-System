# Design: 025-html-production-deploy

> ⬜ **待開始**

## 架構圖

```
【目前 staging 狀態】
staging branch
  └─ Cloudflare Pages (kj-champion-system.pages.dev, Preview)
  └─ Zeabur 後端 (監聽 staging)
  └─ Zeabur PostgreSQL (正式資料)

【目標 main 正式環境】
main branch
  └─ Cloudflare Pages (kj-champion-system.pages.dev, Production)
  └─ Zeabur 後端 (監聽 main，正式服務)
  └─ Zeabur PostgreSQL (同一個，正式資料)

【完成後 staging 狀態】
staging branch
  └─ Cloudflare Pages (Preview，供新前端開發預覽)
  └─ 無獨立後端（新前端開發階段不需要）
  └─ 無獨立 DB 連線
```

## 步驟設計

### Step 1：合併 staging → main

- 開 PR：`staging` → `main`
- review + merge
- Cloudflare Pages 自動觸發 main branch 的 Production build

### Step 2：Zeabur 正式後端

- 在 Zeabur 建立新服務，監聽 `main` 分支（或將現有服務改為追蹤 main）
- 設定正式環境變數：
  - `DATABASE_URL`（Zeabur PostgreSQL 內網）
  - `LINE_CHANNEL_ID`、`LINE_CHANNEL_SECRET`
  - `GOOGLE_*`
  - `FRONTEND_URL=https://kj-champion-system.pages.dev`
  - `NODE_ENV=production`

### Step 3：LINE Console

- 正式 LINE Login Channel 新增 Callback URL：
  `https://kj-champion-system.pages.dev/api/auth/line-callback`

### Step 4：Cloudflare Pages Production branch

- `kj-champion-system` 專案設定 → Production branch 改為 `main`
- Preview branch 保留 `staging`（供新前端預覽）

### Step 5：驗證 main

- API 溝通：`/api/members`、`/api/calendar/events`
- DB CRUD：新增 / 刪除測試行程，確認落在 Zeabur PostgreSQL
- LINE Login：完整 OAuth 流程

### Step 6：清空 staging

- 停止 Zeabur staging 後端服務（節省資源）
- staging `_worker.js` 的 API proxy 目標更新為正式後端 URL（若需要）
- staging 環境準備好供新前端（React/Vite）開發

## 風險與注意事項

| 風險 | 處理方式 |
|------|----------|
| main 驗證失敗 | Production branch 切回 staging，Zeabur 正式服務停止 |
| DB 資料被測試污染 | 驗證時使用真實資料操作（非破壞性），測試後清除測試行程 |
| LINE Callback URL 衝突 | staging 與 main 共用同一個 pages.dev 網域，不衝突 |
