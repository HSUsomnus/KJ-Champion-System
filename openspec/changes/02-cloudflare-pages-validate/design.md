# Design: 02-cloudflare-pages-validate

## Decision 4：用 `_worker.js` 做 API Proxy（非 `_redirects`）

**選擇**：`public/_worker.js`（Cloudflare Workers）攔截 `/api/*` 請求並 proxy 至 Zeabur 後端。

```js
// public/_worker.js
const ZEABUR_BACKEND = 'https://kj-champion.zeabur.app';
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return fetch(ZEABUR_BACKEND + url.pathname + url.search, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'manual',  // LINE OAuth redirect 直接透傳瀏覽器
      });
    }
    return env.ASSETS.fetch(request);
  },
};
```

**為何不用 `_redirects`**：Cloudflare Pages 的 `_redirects` 不支援 proxy 到外部 URL（`200` status 只允許相對路徑）。`_worker.js` 是 Cloudflare 官方建議的外部 proxy 方式。

**`redirect: 'manual'` 的原因**：LINE OAuth 回調會發 302 redirect，若讓 Worker 自動 follow redirect，瀏覽器會看到後端的 redirect target 而非透傳，導致 LINE Login 失敗。

## Decision 5：CORS 只需設環境變數

**選擇**：`server.js` CORS 已有 `FRONTEND_URL` 支援，在 Zeabur 設定 `FRONTEND_URL=https://kj-champion-system.pages.dev` 即可，後端程式碼無需修改。

## LINE Login 修正始末

**問題**：`auth.js` callback 原本 redirect 回 `APP_URL`（Zeabur 後端網域），導致登入後跳到後端而非前端。

**修正**：callback redirect 改用 `FRONTEND_URL + returnUrl`，登入後正確跳回 Cloudflare Pages。

**關鍵環境變數**：
- `APP_URL`：後端自身網域（`https://kj-champion.zeabur.app`）
- `FRONTEND_URL`：前端網域（`https://kj-champion-system.pages.dev`）

## Cloudflare Pages 設定（2g 驗證階段）

```
Build command:      （留空）
Build output dir:   public
Branch:             staging
```

> React 重構完成後（Task 5）會更新為 `cd frontend && npm install && npm run build`，詳見 [04-react-vite-pwa-frontend](../04-react-vite-pwa-frontend/design.md)。
