const axios = require('axios');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET;
const SESSION_TTL_SECONDS = 4 * 60 * 60; // 4 小時，過期需重新登入
const ADMIN_ROLES = ['管理者', '負責人', '開發者'];

/**
 * 用授權碼換 id_token（比照主系統 server/routes/auth.js 的模式）
 */
const exchangeCodeForIdToken = async (code, redirectUri) => {
  const tokenResponse = await axios.post(
    'https://api.line.me/oauth2/v2.1/token',
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: LINE_CHANNEL_ID,
      client_secret: LINE_CHANNEL_SECRET,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return tokenResponse.data.id_token;
};

/**
 * 後端驗簽：呼叫 LINE 官方 verify 端點，絕不信任前端傳來的 LINE ID
 * @returns {{ lineId: string, displayName: string }}
 */
const verifyIdToken = async (idToken) => {
  const verifyResponse = await axios.post(
    'https://api.line.me/oauth2/v2.1/verify',
    new URLSearchParams({ id_token: idToken, client_id: LINE_CHANNEL_ID }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return {
    lineId: verifyResponse.data.sub,
    displayName: verifyResponse.data.name || '',
  };
};

/**
 * 查主系統 members 表的角色（同一個 DB，直接查，不需額外內部 API）
 * @returns {string|null} role，查無此人回傳 null
 */
const getMemberRole = async (lineId) => {
  const result = await db.query('SELECT role FROM members WHERE line_id = $1', [lineId]);
  return result.rows[0]?.role || null;
};

const isAdminRole = (role) => ADMIN_ROLES.includes(role);

/**
 * 簽發後台 session token（JWT，短效期，前端存 httpOnly cookie，不落地 localStorage）
 */
const signSessionToken = ({ lineId, role }) =>
  jwt.sign({ lineId, role }, SESSION_SECRET, { expiresIn: SESSION_TTL_SECONDS });

/**
 * 驗證後台 session token，無效/過期會丟出例外
 */
const verifySessionToken = (token) => jwt.verify(token, SESSION_SECRET);

module.exports = {
  exchangeCodeForIdToken,
  verifyIdToken,
  getMemberRole,
  isAdminRole,
  signSessionToken,
  verifySessionToken,
  SESSION_TTL_SECONDS,
};
