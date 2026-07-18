/**
 * KJ Survey 後台認證（Change 20 v4，D-A 真驗簽 + 自簽短效 JWT）
 * state / nonce：D-F + D-I（覆核 B-2：process memory Map，單 instance 前提，
 * 若日後多 instance 需改共享 store）。
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const env = require('../config/env');

const ADMIN_ROLES = ['管理者', '負責人', '開發者'];
const STATE_TTL_SECONDS = 10 * 60;
const JWT_EXPIRES_IN = '4h';

const LINE_AUTHORIZE_URL = 'https://access.line.me/oauth2/v2.1/authorize';
const LINE_TOKEN_URL = 'https://api.line.me/oauth2/v2.1/token';
const LINE_VERIFY_URL = 'https://api.line.me/oauth2/v2.1/verify';

// D-I：nonce 存 process memory Map<nonce,{exp}>，callback 驗證時原子 consume
const nonceStore = new Map();

const cleanupExpiredNonces = () => {
  const now = Date.now();
  for (const [nonce, entry] of nonceStore) {
    if (entry.exp <= now) nonceStore.delete(nonce);
  }
};

const getMemberRole = async (lineId) => {
  const result = await db.query('SELECT role FROM members WHERE line_id = $1', [lineId]);
  return result.rows[0]?.role || null;
};

const isAdminRole = (role) => ADMIN_ROLES.includes(role);

const getCallbackUrl = () => `${env.FRONTEND_URL}/survey-api/admin-auth/line-callback`;

const hmacSign = (input) =>
  crypto.createHmac('sha256', env.SESSION_SECRET).update(input).digest('base64url');

/**
 * D-F + H-2：state payload 僅 { nonce, iat, exp }，不含任何使用者可控 return URL/origin
 * （防 open redirect）。格式：base64url(payload) + '.' + HMAC-SHA256(payload, SESSION_SECRET)
 */
const generateState = () => {
  cleanupExpiredNonces();

  const nonce = crypto.randomBytes(16).toString('hex');
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + STATE_TTL_SECONDS;
  nonceStore.set(nonce, { exp: exp * 1000 });

  const encodedPayload = Buffer.from(JSON.stringify({ nonce, iat, exp })).toString('base64url');
  return `${encodedPayload}.${hmacSign(encodedPayload)}`;
};

/**
 * 驗 state：簽章正確 + 未過期 + nonce 存在且原子 consume（驗證前先刪除，
 * 重放第二次因 nonce 已不在 store 中而失敗）。任一失敗回傳 false，不洩漏細節。
 */
const verifyAndConsumeState = (state) => {
  if (typeof state !== 'string') return false;

  const parts = state.split('.');
  if (parts.length !== 2) return false;
  const [encodedPayload, signature] = parts;

  let expectedSignature;
  try {
    expectedSignature = hmacSign(encodedPayload);
  } catch {
    return false;
  }

  const signatureBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (signatureBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(signatureBuf, expectedBuf)) {
    return false;
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    return false;
  }

  const { nonce, exp } = payload || {};
  if (!nonce || typeof exp !== 'number') return false;

  // 原子 consume：無論後續是否過期都先移除，杜絕重放
  const existed = nonceStore.delete(nonce);
  if (!existed) return false;

  const nowSeconds = Math.floor(Date.now() / 1000);
  return exp > nowSeconds;
};

/**
 * code 換 id_token（redirect_uri 須與 line-login 導向時登記值完全一致，D-H）
 */
const exchangeCodeForIdToken = async (code) => {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getCallbackUrl(),
    client_id: env.LINE_CHANNEL_ID,
    client_secret: env.LINE_CHANNEL_SECRET,
  });

  const res = await fetch(LINE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const err = new Error(`LINE token 交換失敗：${res.status}`);
    err.code = 'LINE_TOKEN_EXCHANGE_FAILED';
    throw err;
  }

  const data = await res.json();
  if (!data.id_token) {
    const err = new Error('LINE token 回應缺少 id_token');
    err.code = 'LINE_TOKEN_EXCHANGE_FAILED';
    throw err;
  }
  return data.id_token;
};

/**
 * LINE 官方驗簽（oauth2/v2.1/verify），成功回傳解出的 claims（含 sub）
 */
const verifyLineIdToken = async (idToken) => {
  const body = new URLSearchParams({ id_token: idToken, client_id: env.LINE_CHANNEL_ID });

  const res = await fetch(LINE_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const err = new Error(`LINE id_token 驗簽失敗：${res.status}`);
    err.code = 'LINE_VERIFY_FAILED';
    throw err;
  }

  const claims = await res.json();
  if (!claims.sub) {
    const err = new Error('LINE 驗簽回應缺少 sub');
    err.code = 'LINE_VERIFY_FAILED';
    throw err;
  }
  return claims;
};

/**
 * D-H：導向 LINE 授權頁，redirect_uri 與 token 交換時用的字串完全一致
 */
const buildLineLoginUrl = () => {
  const state = generateState();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.LINE_CHANNEL_ID,
    redirect_uri: getCallbackUrl(),
    state,
    scope: 'openid',
  });
  return `${LINE_AUTHORIZE_URL}?${params.toString()}`;
};

/**
 * 自簽短效 JWT，payload 只放 lineId，不放 role（D-G：role 每次向 DB 重查）
 */
const issueAdminJwt = (lineId) =>
  jwt.sign({ lineId }, env.SESSION_SECRET, { expiresIn: JWT_EXPIRES_IN });

/**
 * 驗 JWT 簽章 + exp，回傳 payload；失敗直接 throw（middleware 負責轉 401）
 */
const verifyAdminJwt = (token) => jwt.verify(token, env.SESSION_SECRET);

module.exports = {
  getMemberRole,
  isAdminRole,
  buildLineLoginUrl,
  generateState,
  verifyAndConsumeState,
  exchangeCodeForIdToken,
  verifyLineIdToken,
  issueAdminJwt,
  verifyAdminJwt,
  getCallbackUrl,
  // 測試用：直接操作 nonce store 驗證原子 consume/重放
  _nonceStore: nonceStore,
};
