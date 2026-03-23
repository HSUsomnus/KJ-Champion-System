/**
 * Cloudflare Pages Worker
 * 攔截 /api/* 請求，proxy 至 Zeabur 後端
 * 其餘靜態資源由 env.ASSETS 處理
 */

const ZEABUR_BACKEND = 'https://kj-champion.zeabur.app';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      const targetUrl = ZEABUR_BACKEND + url.pathname + url.search;

      const proxyRequest = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
        redirect: 'follow',
      });

      return fetch(proxyRequest);
    }

    return env.ASSETS.fetch(request);
  },
};
