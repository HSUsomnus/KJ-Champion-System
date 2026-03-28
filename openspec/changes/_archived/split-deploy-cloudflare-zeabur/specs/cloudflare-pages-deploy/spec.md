# Spec: cloudflare-pages-deploy

## ADDED Requirements

### Requirement: 現有前端驗證部署（重構前）

在進行 React 重構之前，Cloudflare Pages SHALL 先以「無 build command」方式部署現有 `public/` 目錄，作為前後端溝通與資料庫連線的驗證環境。Build output directory 設為 `public`，Build command 留空。

#### Scenario: 現有前端成功部署

- **WHEN** Cloudflare Pages 以 `public` 為輸出目錄、無 build command 完成部署
- **THEN** 瀏覽器可訪問 Cloudflare Pages URL，載入現有純 HTML 前端頁面

#### Scenario: 前後端 API 溝通驗證通過

- **WHEN** 從 Cloudflare Pages 網域呼叫 `/api/members` 與 `/api/calendar/events`
- **THEN** 回傳正確資料，無跨域錯誤，確認前端 → Zeabur 後端通訊正常

#### Scenario: 資料庫連線驗證通過

- **WHEN** 透過前端執行新增 / 刪除測試行程
- **THEN** 資料確實寫入 Zeabur PostgreSQL，並可正確讀取，確認 DB 連線無誤

#### Scenario: LINE Login 流程驗證通過

- **WHEN** 使用者從 Cloudflare Pages URL 進行 LINE Login
- **THEN** OAuth 回調至 Zeabur 後端後成功取得使用者資訊，登入流程完整可用

### Requirement: Vite Build Pipeline

Cloudflare Pages 專案 SHALL 設定 build command 為 `cd frontend && npm install && npm run build`，Build output directory 為 `frontend/dist`，並監聽 `staging` 分支。

#### Scenario: GitHub push 觸發自動 build

- **WHEN** `staging` 分支有新 commit push 到 GitHub
- **THEN** Cloudflare Pages 自動執行 build command，將 `frontend/dist` 發布上線

#### Scenario: Build 失敗不影響正式環境

- **WHEN** `frontend/` build 失敗（e.g. TypeScript 錯誤）
- **THEN** Cloudflare Pages 保留上一個成功的部署，`main` 分支的 Vercel 正式環境完全不受影響

### Requirement: _redirects API Proxy

`frontend/public/_redirects` SHALL 存在，並將所有 `/api/*` 請求透明 proxy 轉發至 Zeabur 後端 URL，讓前端可使用相對路徑 `/api/...` 呼叫 API。

#### Scenario: API 請求被正確轉發

- **WHEN** 瀏覽器向 Cloudflare Pages 發送 `/api/calendar/events` 請求
- **THEN** Cloudflare 將請求轉發至 `https://<zeabur-backend>/api/calendar/events`，瀏覽器收到後端回應，不發生跨域錯誤

#### Scenario: 非 API 路徑不受影響

- **WHEN** 瀏覽器訪問 React 路由或靜態資源
- **THEN** Cloudflare Pages 直接提供靜態檔案或回傳 `index.html`（SPA fallback），不觸發 proxy 規則

### Requirement: SPA Fallback 路由

`frontend/public/_redirects` SHALL 包含 SPA fallback 規則，將所有非 API 路徑導回 `index.html`，支援 React Router 的前端路由。

#### Scenario: 直接訪問子路由

- **WHEN** 使用者直接輸入 `https://<pages-url>/calendar` 或重新整理頁面
- **THEN** Cloudflare Pages 回傳 `frontend/dist/index.html`，React Router 接管路由渲染

### Requirement: 靜態資源快取

`frontend/public/_headers` SHALL 存在，為 Vite 產生的 hash 命名靜態資源設定長效快取，為 HTML 設定不快取。

#### Scenario: Vite hash 資源長效快取

- **WHEN** 瀏覽器請求 `/assets/index-Abc123.js`（Vite hash 命名）
- **THEN** 回應包含 `Cache-Control: public, max-age=31536000, immutable`

#### Scenario: HTML 不快取

- **WHEN** 瀏覽器請求 `index.html`
- **THEN** 回應包含 `Cache-Control: no-cache`，確保每次取得最新入口點
