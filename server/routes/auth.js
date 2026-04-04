/**
 * LINE Login 認證路由（OAuth 2.0，不依賴 LIFF）
 * 所有頁面都可透過此路由進行 LINE 登入
 * 自動偵測前端 origin，callback 後跳回發起登入的前端站
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const APP_URL = process.env.APP_URL || 'http://localhost:8080';
// 登入後跳回前端域名（分離部署時 FRONTEND_URL 與 APP_URL 不同）
const FRONTEND_URL = process.env.FRONTEND_URL || APP_URL;

/**
 * Origin 白名單 — 允許的前端域名模式
 * 符合的 origin 才會作為 redirect 目標，否則 fallback 到 FRONTEND_URL
 */
const ALLOWED_ORIGINS = [
  /^https:\/\/.*\.pages\.dev$/,           // Cloudflare Pages（任何子域）
  /^https:\/\/.*kj-champion.*$/,          // 專案相關域名
  /^http:\/\/localhost(:\d+)?$/,          // 本機開發
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,      // 本機開發
];

/**
 * 從 request header 偵測前端 origin
 * 優先 Origin header，其次 Referer（取 origin 部分）
 */
function getClientOrigin(req) {
  const origin = req.get('Origin');
  if (origin && origin !== 'null') return origin;

  const referer = req.get('Referer');
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch (e) {}
  }
  return null;
}

/**
 * 驗證 origin 是否在白名單內
 */
function isAllowedOrigin(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some(pattern => pattern.test(origin));
}

/**
 * GET /api/auth/line-login
 * 導向 LINE Login 授權頁面
 * Query: returnUrl（登入後要回到哪一頁，預設為首頁）
 */
router.get('/line-login', (req, res) => {
  const state = req.query.state || Math.random().toString(36).substring(7);
  const redirectUri = `${APP_URL}/api/auth/line-callback`;
  const returnUrl = req.query.returnUrl || '/index.html';

  // 偵測前端 origin，通過白名單才使用
  const clientOrigin = getClientOrigin(req);
  const frontendOrigin = isAllowedOrigin(clientOrigin) ? clientOrigin : null;

  // 把 returnUrl 和 frontendOrigin 編進 state，回調時取出
  const stateData = JSON.stringify({ state, returnUrl, frontendOrigin });
  const encodedState = Buffer.from(stateData).toString('base64');

  const authUrl = `https://access.line.me/oauth2/v2.1/authorize?` +
    `response_type=code&` +
    `client_id=${LINE_CHANNEL_ID}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `state=${encodedState}&` +
    `scope=profile%20openid`;

  res.redirect(authUrl);
});

/**
 * GET /api/auth/line-callback
 * LINE Login 回調：驗證 token → 取得使用者資訊 → 導回前端頁面
 */
router.get('/line-callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).send('❌ 缺少授權碼');
    }

    // 從 state 取出 returnUrl 和 frontendOrigin
    let returnUrl = '/index.html';
    let redirectOrigin = FRONTEND_URL;
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      returnUrl = stateData.returnUrl || returnUrl;
      // 使用 state 中的 frontendOrigin，若無則 fallback 到 FRONTEND_URL
      if (stateData.frontendOrigin) {
        redirectOrigin = stateData.frontendOrigin;
      }
    } catch (e) {
      console.log('解析 state 失敗，使用預設 returnUrl 和 FRONTEND_URL');
    }

    // 用授權碼換取 Access Token
    const tokenResponse = await axios.post('https://api.line.me/oauth2/v2.1/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: `${APP_URL}/api/auth/line-callback`,
        client_id: LINE_CHANNEL_ID,
        client_secret: LINE_CHANNEL_SECRET,
      }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const { id_token } = tokenResponse.data;

    // 驗證 ID Token，取得使用者資訊
    const verifyResponse = await axios.post('https://api.line.me/oauth2/v2.1/verify',
      new URLSearchParams({
        id_token: id_token,
        client_id: LINE_CHANNEL_ID,
      }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const lineUserId = verifyResponse.data.sub;
    const displayName = verifyResponse.data.name || '';
    const pictureUrl = verifyResponse.data.picture || '';

    console.log(`✅ LINE Login 成功: ${lineUserId} (${displayName}) → redirect to ${redirectOrigin}`);

    // 導回前端頁面，帶上使用者資訊（前端會存到 localStorage 並清除 URL 參數）
    const sep = returnUrl.includes('?') ? '&' : '?';
    const finalUrl = `${redirectOrigin}${returnUrl}${sep}userId=${encodeURIComponent(lineUserId)}&displayName=${encodeURIComponent(displayName)}&pictureUrl=${encodeURIComponent(pictureUrl)}&auth=1`;
    res.redirect(finalUrl);

  } catch (error) {
    console.error('❌ LINE Login 回調錯誤:', error.response?.data || error.message);
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="zh-TW">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>登入失敗</title>
        <link rel="stylesheet" href="/css/style.css">
      </head>
      <body>
        <div class="container" style="padding-top: 60px;">
          <div class="card text-center">
            <div style="font-size: 64px; margin-bottom: 16px;">❌</div>
            <h2 style="margin-bottom: 16px;">登入失敗</h2>
            <p style="color: var(--text-light); margin-bottom: 24px;">
              ${error.message || '未知錯誤'}
            </p>
            <button class="btn btn-primary" onclick="window.location.href='/'">返回首頁</button>
          </div>
        </div>
      </body>
      </html>
    `);
  }
});

module.exports = router;
