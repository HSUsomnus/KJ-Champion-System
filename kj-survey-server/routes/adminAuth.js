/**
 * KJ Survey 後台 LINE Login 認證（甲案）
 * 沿用主系統既有 LINE Login channel，但 session 機制不同：
 * 只發 httpOnly session cookie（不落地 localStorage），關閉瀏覽器即失效
 */

const express = require('express');
const router = express.Router();
const {
  exchangeCodeForIdToken,
  verifyIdToken,
  getMemberRole,
  isAdminRole,
  signSessionToken,
  SESSION_TTL_SECONDS,
} = require('../services/adminAuthService');
const { requireAdminSession, SESSION_COOKIE } = require('../middleware/requireAdminSession');

const APP_URL = process.env.APP_URL || 'http://localhost:8081';
const FRONTEND_URL = process.env.FRONTEND_URL || APP_URL;

const ALLOWED_ORIGINS = [
  /^https:\/\/.*\.pages\.dev$/,
  /^https:\/\/.*kj-champion.*$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

function getClientOrigin(req) {
  const origin = req.get('Origin');
  if (origin && origin !== 'null') return origin;
  const referer = req.get('Referer');
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch (e) {
      return null;
    }
  }
  return null;
}

function isAllowedOrigin(origin) {
  return !!origin && ALLOWED_ORIGINS.some((pattern) => pattern.test(origin));
}

// [設計決策] redirect_uri 指向前端網域（經 _worker.js 的 /survey-api/* 代理轉發），
// 不是後端自己的網址（APP_URL）
// 原因：LINE 導回時若直接落在後端網域，session cookie 會被設在後端的網域上，
// 前端網域（瀏覽器實際呼叫 API 的來源）收不到，等於白登入
// 若要修改：確認 LINE Developers Console 的 Callback URL 清單有對應更新
const redirectUriFor = (frontendOrigin) => `${frontendOrigin}/survey-api/admin-auth/callback`;

/**
 * GET /admin-auth/line-login
 */
router.get('/line-login', (req, res) => {
  const clientOrigin = getClientOrigin(req);
  const frontendOrigin = isAllowedOrigin(clientOrigin) ? clientOrigin : FRONTEND_URL;
  const state = Buffer.from(JSON.stringify({ frontendOrigin })).toString('base64');

  const authUrl =
    `https://access.line.me/oauth2/v2.1/authorize?` +
    `response_type=code&` +
    `client_id=${process.env.LINE_CHANNEL_ID}&` +
    `redirect_uri=${encodeURIComponent(redirectUriFor(frontendOrigin))}&` +
    `state=${state}&` +
    `scope=profile%20openid`;

  res.redirect(authUrl);
});

/**
 * GET /admin-auth/callback
 */
router.get('/callback', async (req, res) => {
  let frontendOrigin = FRONTEND_URL;
  try {
    const { code, state } = req.query;
    if (state) {
      try {
        frontendOrigin = JSON.parse(Buffer.from(state, 'base64').toString()).frontendOrigin || FRONTEND_URL;
      } catch (e) {
        // state 解析失敗，用預設值
      }
    }

    if (!code) {
      return res.redirect(`${frontendOrigin}/admin?authError=missing_code`);
    }

    const idToken = await exchangeCodeForIdToken(code, redirectUriFor(frontendOrigin));
    const { lineId } = await verifyIdToken(idToken);
    const role = await getMemberRole(lineId);

    if (!isAdminRole(role)) {
      return res.redirect(`${frontendOrigin}/admin?authError=forbidden`);
    }

    const sessionToken = signSessionToken({ lineId, role });
    res.cookie(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: undefined, // 不設 maxAge/expires → session cookie，關瀏覽器即失效
    });

    res.redirect(`${frontendOrigin}/admin`);
  } catch (error) {
    console.error('❌ 後台 LINE Login 回調錯誤:', error.response?.data || error.message);
    res.redirect(`${frontendOrigin}/admin?authError=server_error`);
  }
});

/**
 * GET /admin-auth/me — 前端 /admin 頁面載入時呼叫，確認是否已登入
 */
router.get('/me', requireAdminSession, (req, res) => {
  res.json({ success: true, data: req.admin });
});

/**
 * POST /admin-auth/logout
 */
router.post('/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE);
  res.json({ success: true });
});

module.exports = router;
