/**
 * Cloudflare Pages Worker
 * 攔截 /api/* 請求，proxy 至 Zeabur 後端
 * 其餘靜態資源由 env.ASSETS 處理
 */

const ZEABUR_BACKEND = 'https://kj-champion-system.zeabur.app';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      const targetUrl = ZEABUR_BACKEND + url.pathname + url.search;

      const proxyRequest = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
        redirect: 'manual',
      });

      const response = await fetch(proxyRequest);

      // 後端若回傳 redirect（如 LINE OAuth 跳轉），直接讓瀏覽器跟隨，不在 Worker 內代理
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('Location');
        if (location) {
          return Response.redirect(location, response.status);
        }
      }

      return response;
    }

    return env.ASSETS.fetch(request);
  },
};
