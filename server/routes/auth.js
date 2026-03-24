/**
 * LINE Login 認證路由（OAuth 2.0，不依賴 LIFF）
 * 所有頁面都可透過此路由進行 LINE 登入
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
 * GET /api/auth/line-login
 * 導向 LINE Login 授權頁面
 * Query: returnUrl（登入後要回到哪一頁，預設為首頁）
 */
router.get('/line-login', (req, res) => {
  const state = req.query.state || Math.random().toString(36).substring(7);
  const redirectUri = `${APP_URL}/api/auth/line-callback`;
  const returnUrl = req.query.returnUrl || '/index.html';

  // 把 returnUrl 編進 state，回調時取出
  const stateData = JSON.stringify({ state, returnUrl });
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

    // 從 state 取出 returnUrl
    let returnUrl = '/index.html';
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      returnUrl = stateData.returnUrl || returnUrl;
    } catch (e) {
      console.log('解析 state 失敗，使用預設 returnUrl');
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

    console.log(`✅ LINE Login 成功: ${lineUserId} (${displayName})`);

    // 導回前端頁面，帶上使用者資訊（前端會存到 localStorage 並清除 URL 參數）
    const sep = returnUrl.includes('?') ? '&' : '?';
    const finalUrl = `${FRONTEND_URL}${returnUrl}${sep}userId=${encodeURIComponent(lineUserId)}&displayName=${encodeURIComponent(displayName)}&pictureUrl=${encodeURIComponent(pictureUrl)}&auth=1`;
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
