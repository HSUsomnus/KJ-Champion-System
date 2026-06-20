# Spec: 07-oauth動態redirect

> ✅ DONE（v1.6.0 已上線）

## 背景與範圍

後端 `server/routes/auth.js` 的 LINE OAuth callback 完成後，redirect 目標硬編碼為環境變數 `FRONTEND_URL`，導致 DEV 站登入完跳回正式站。未來新增任何前端部署都需要改後端環境變數，前後端無法真正分離。

### 目標

**後端改一次，永遠不用再動。** 任何前端部署自動跳回自己的 origin。

### 解法

後端自動從 HTTP 請求的 `Origin` / `Referer` header 偵測前端 origin：

1. `/api/auth/line-login`：從 request header 取得前端 origin，編碼進 OAuth state
2. `/api/auth/line-callback`：從 state 取出 origin，redirect 到該 origin
3. 白名單驗證：防止 open redirect 攻擊
4. Fallback：header 沒有 origin 或不在白名單 → 用 `FRONTEND_URL`

### 影響範圍

只動 `server/routes/auth.js`（一個檔案），向下相容。

---

## 技術設計

### Origin 偵測邏輯

優先 `Origin` header，其次 `Referer` header（取 origin 部分）。

### 白名單驗證

```javascript
const ALLOWED_ORIGINS = [
  /^https:\/\/.*\.pages\.dev$/,           // Cloudflare Pages（任何子域）
  /^https:\/\/.*kj-champion.*$/,          // 專案相關域名
  /^http:\/\/localhost(:\d+)?$/,          // 本機開發
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,      // 本機開發
]
```

### State 擴充

```json
{ "state": "xxx", "returnUrl": "/login", "frontendOrigin": "https://kjcs-dev.pages.dev" }
```

### 向下相容

| 情境 | 行為 |
|------|------|
| 新前端（帶 Origin header）| 自動偵測，跳回來源 |
| 舊前端（無 Origin header）| fallback 到 `FRONTEND_URL` |
| origin 不在白名單 | fallback 到 `FRONTEND_URL` |
| 惡意 origin | 白名單擋掉，用 `FRONTEND_URL` |
