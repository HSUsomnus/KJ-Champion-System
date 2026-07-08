/**
 * Cloudflare Pages Worker
 * 攔截 /api/* 請求，依當前 Pages 網址自動 proxy 至對應的 Zeabur 後端
 * 攔截 /survey-api/* 請求，proxy 至 KJ Survey 獨立後端（change 20，見 openspec/changes/20-.../spec.md）
 * OAuth redirect 自動重寫為當前 origin（避免 DEV/正式站混跳）
 * 其餘靜態資源由 env.ASSETS 處理，找不到時 fallback 到 index.html（SPA）
 */

const ZEABUR_BACKEND_PROD = 'https://kj-champion-system.zeabur.app';
const ZEABUR_BACKEND_DEV = 'https://kj-champion-dev.zeabur.app';

// KJ Survey 獨立後端（change 20）— 待 Zeabur 服務建立後確認實際網址
const ZEABUR_SURVEY_BACKEND_PROD = 'https://kj-survey.zeabur.app';
const ZEABUR_SURVEY_BACKEND_DEV = 'https://kj-survey-dev.zeabur.app';

// 依 Pages 網址判斷要 proxy 到哪個後端
// - kjcs-dev.pages.dev → dev 後端
// - 其他（kj-champion-system.pages.dev / 自訂網域）→ 正式後端
const resolveBackend = (hostname) => {
  if (hostname === 'kjcs-dev.pages.dev' || hostname.startsWith('kjcs-dev')) {
    return ZEABUR_BACKEND_DEV;
  }
  return ZEABUR_BACKEND_PROD;
};

const resolveSurveyBackend = (hostname) => {
  if (hostname === 'kjcs-dev.pages.dev' || hostname.startsWith('kjcs-dev')) {
    return ZEABUR_SURVEY_BACKEND_DEV;
  }
  return ZEABUR_SURVEY_BACKEND_PROD;
};

// 共用的 proxy 邏輯：轉發請求、處理 OAuth redirect 重寫
async function proxyToBackend(request, url, currentOrigin, backend, targetPath) {
  const targetUrl = backend + targetPath + url.search;

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
        if (locUrl.origin === backend || locUrl.hostname.includes('pages.dev') || locUrl.hostname.includes('kj-champion') || locUrl.hostname.includes('kj-survey')) {
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const currentOrigin = url.origin;

    if (url.pathname.startsWith('/api/')) {
      const backend = resolveBackend(url.hostname);
      return proxyToBackend(request, url, currentOrigin, backend, url.pathname);
    }

    if (url.pathname.startsWith('/survey-api/')) {
      const backend = resolveSurveyBackend(url.hostname);
      // kj-survey-server 路由掛在根目錄（/forms、/members），不含 /survey-api 前綴
      const targetPath = url.pathname.replace(/^\/survey-api/, '');
      return proxyToBackend(request, url, currentOrigin, backend, targetPath);
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
