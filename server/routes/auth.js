/**
 * LINE Login 認證路由（用於獨立網頁非 LIFF）
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const memberDbService = require('../services/memberDbService');

// LINE Login 設定
const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const APP_URL = process.env.APP_URL || 'http://localhost:8080';

/**
 * GET /api/auth/line-login
 * 導向 LINE Login 授權頁面
 */
router.get('/line-login', (req, res) => {
  const state = req.query.state || Math.random().toString(36).substring(7);
  const redirectUri = `${APP_URL}/api/auth/line-callback`;
  const returnUrl = req.query.returnUrl || '/financial-upload.html';
  
  // 將 returnUrl 儲存在 state 中
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
 * LINE Login 回調處理
 */
router.get('/line-callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).send('❌ 缺少授權碼');
    }

    // 解析 state 取得 returnUrl
    let returnUrl = '/financial-upload.html';
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      returnUrl = stateData.returnUrl || returnUrl;
    } catch (e) {
      console.log('解析 state 失敗，使用預設 returnUrl');
    }

    // 取得 Access Token
    const tokenResponse = await axios.post('https://api.line.me/oauth2/v2.1/token', 
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: `${APP_URL}/api/auth/line-callback`,
        client_id: LINE_CHANNEL_ID,
        client_secret: LINE_CHANNEL_SECRET,
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { id_token, access_token } = tokenResponse.data;

    // 驗證 ID Token 取得使用者資訊
    const verifyResponse = await axios.post('https://api.line.me/oauth2/v2.1/verify',
      new URLSearchParams({
        id_token: id_token,
        client_id: LINE_CHANNEL_ID,
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const lineUserId = verifyResponse.data.sub;

    // 檢查是否為系統成員
    const isMember = await memberDbService.isMemberRegistered(lineUserId);
    
    if (!isMember) {
      return res.send(`
        <!DOCTYPE html>
        <html lang="zh-TW">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>存取被拒絕</title>
          <link rel="stylesheet" href="/css/style.css">
        </head>
        <body>
          <div class="container" style="padding-top: 60px;">
            <div class="card text-center">
              <div style="font-size: 64px; margin-bottom: 16px;">🚫</div>
              <h2 style="margin-bottom: 16px;">存取被拒絕</h2>
              <p style="color: var(--text-light); margin-bottom: 24px;">
                您的帳號尚未註冊為系統成員，無法使用此功能。
              </p>
              <button class="btn btn-primary" onclick="window.close()">關閉</button>
            </div>
          </div>
        </body>
        </html>
      `);
    }

    console.log(`✅ LINE Login 成功: ${lineUserId}`);

    // 驗證成功，導向目標頁面並帶上 userId 和 token
    const finalUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}userId=${encodeURIComponent(lineUserId)}&auth=1`;
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
            <button class="btn btn-primary" onclick="window.location.href='/financial-upload.html'">返回</button>
          </div>
        </div>
      </body>
      </html>
    `);
  }
});

module.exports = router;
