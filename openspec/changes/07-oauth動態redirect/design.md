# Design — 07 OAuth 動態 Redirect

## 技術方案

### 修改檔案

只動一個檔案：`server/routes/auth.js`

### 流程（修改後）

```
前端（任何域名）
  │
  ├─ GET /api/auth/line-login?returnUrl=/login
  │   Headers: Origin: https://kjcs-dev.pages.dev
  │
  ├─ 後端從 Origin/Referer 取得前端 origin
  │   驗證白名單 → 通過 → 編碼進 OAuth state
  │                 不通過 → 用 FRONTEND_URL fallback
  │
  ├─ 後端 redirect → LINE 授權頁（state 帶有 origin）
  │
  ├─ LINE callback → 後端 /api/auth/line-callback
  │
  └─ 後端從 state 解碼 origin → redirect 到 origin/login?userId=...
     （自動跳回發起登入的前端，不再硬編碼）
```

### Origin 偵測邏輯

```javascript
function getClientOrigin(req) {
  // 優先 Origin header（瀏覽器導航請求通常有）
  // 其次 Referer header（取 origin 部分）
  const origin = req.get('Origin')
  if (origin) return origin

  const referer = req.get('Referer')
  if (referer) {
    try {
      return new URL(referer).origin
    } catch {}
  }
  return null
}
```

### 白名單驗證

```javascript
const ALLOWED_ORIGINS = [
  /^https:\/\/.*\.pages\.dev$/,           // Cloudflare Pages（任何子域）
  /^https:\/\/.*kj-champion.*$/,          // 專案相關域名
  /^http:\/\/localhost(:\d+)?$/,          // 本機開發
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,      // 本機開發
]

function isAllowedOrigin(origin) {
  if (!origin) return false
  return ALLOWED_ORIGINS.some(pattern => pattern.test(origin))
}
```

### State 編碼（擴充）

現有：
```json
{ "state": "xxx", "returnUrl": "/login" }
```

新增 `frontendOrigin` 欄位：
```json
{ "state": "xxx", "returnUrl": "/login", "frontendOrigin": "https://kjcs-dev.pages.dev" }
```

### Callback 修改

```javascript
// 從 state 取出 frontendOrigin，fallback 到 FRONTEND_URL
const redirectOrigin = stateData.frontendOrigin || FRONTEND_URL
const finalUrl = `${redirectOrigin}${returnUrl}${sep}userId=...`
```

### 向下相容

| 情境 | 行為 |
|------|------|
| 新前端（帶 Origin header） | 自動偵測，跳回來源 |
| 舊前端（無 Origin header） | fallback 到 `FRONTEND_URL` |
| state 無 `frontendOrigin`（舊流程） | fallback 到 `FRONTEND_URL` |
| origin 不在白名單 | fallback 到 `FRONTEND_URL` |
| 惡意 origin | 白名單擋掉，用 `FRONTEND_URL` |

## 不改的部分

- `APP_URL`：仍用於 `redirect_uri`（LINE callback 端點），不變
- `FRONTEND_URL`：保留作為 fallback，不移除
- 前端程式碼：完全不動
- LINE Console：不需改設定

---

*建立日期：2026-04-03*
