# Spec: cloudflare-pages-deploy

## ADDED Requirements

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
