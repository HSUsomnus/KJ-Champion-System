/**
 * Cloudflare Pages Worker
 * 攔截 /api/* 請求，proxy 至 Zeabur 後端
 * OAuth redirect 自動重寫為當前 origin（避免 DEV/正式站混跳）
 * 其餘靜態資源由 env.ASSETS 處理，找不到時 fallback 到 index.html（SPA）
 */

const ZEABUR_BACKEND = 'https://kj-champion-system-dev.zeabur.app';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const currentOrigin = url.origin;

    if (url.pathname.startsWith('/api/')) {
      const targetUrl = ZEABUR_BACKEND + url.pathname + url.search;

      const proxyRequest = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
        redirect: 'manual',
      });

      const response = await fetch(proxyRequest);

      // 後端若回傳 redirect（如 LINE OAuth 跳轉）
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('Location');
        if (location) {
          // 外部跳轉（如 LINE 授權頁）→ 直接放行
          try {
            const locUrl = new URL(location);
            // 若 redirect 目標是後端或前端站 → 重寫為當前 origin
            // 這樣無論 DEV 站或正式站，都跳回自己
            if (locUrl.origin === ZEABUR_BACKEND || locUrl.hostname.includes('pages.dev') || locUrl.hostname.includes('kj-champion')) {
              const rewritten = currentOrigin + locUrl.pathname + locUrl.search + locUrl.hash;
              return Response.redirect(rewritten, response.status);
            }
          } catch (e) {
            // location 解析失敗，直接放行
          }
          return Response.redirect(location, response.status);
        }
      }

      return response;
    }

    // 靜態資源優先
    const assetResponse = await env.ASSETS.fetch(request);

    // 找不到靜態資源（404）→ SPA fallback 到 index.html
    if (assetResponse.status === 404) {
      const indexRequest = new Request(new URL('/', url.origin), request);
      return env.ASSETS.fetch(indexRequest);
    }

    return assetResponse;
  },
};
