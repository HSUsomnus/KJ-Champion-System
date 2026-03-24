# Spec: cloudflare-pages-validate

## Requirement: 現有前端驗證部署

Cloudflare Pages SHALL 以「無 build command」方式部署現有 `public/` 目錄。Build output directory 設為 `public`，Build command 留空。

### Scenario: 前後端 API 溝通驗證通過

- **WHEN** 從 `kj-champion-system.pages.dev` 呼叫 `/api/members` 與 `/api/calendar/events`
- **THEN** 回傳正確資料，無跨域錯誤

### Scenario: 資料庫連線驗證通過

- **WHEN** 透過前端執行新增 / 刪除測試行程
- **THEN** 資料確實寫入 Zeabur PostgreSQL，並可正確讀取

### Scenario: LINE Login 流程驗證通過

- **WHEN** 使用者從 Cloudflare Pages URL 進行 LINE Login
- **THEN** OAuth 回調至 Zeabur 後端後取得使用者資訊，redirect 回 Cloudflare Pages，登入流程完整可用

## Requirement: `_worker.js` API Proxy

`public/_worker.js` SHALL 攔截所有 `/api/*` 請求並 proxy 至 Zeabur 後端，使用 `redirect: 'manual'` 讓 LINE OAuth redirect 直接透傳瀏覽器。

### Scenario: API 請求被正確轉發

- **WHEN** 瀏覽器向 Cloudflare Pages 發送 `/api/calendar/events`
- **THEN** Worker 將請求轉發至 `https://kj-champion.zeabur.app/api/calendar/events`，回傳正確資料

### Scenario: 非 API 路徑由靜態資源處理

- **WHEN** 瀏覽器訪問靜態資源或 HTML 頁面
- **THEN** `env.ASSETS.fetch(request)` 直接提供靜態檔案，不觸發 proxy
