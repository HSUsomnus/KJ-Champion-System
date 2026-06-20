const crypto = require('crypto');
const https = require('https');
const { google } = require('googleapis');
require('dotenv').config();

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive',
];

// google-auth-library@9.x 的 JWT.refreshTokenNoCache() 在 JWT assertion 的
// aud 欄位和 POST URL 都硬編碼了已廢棄端點 www.googleapis.com/oauth2/v4/token。
// 設定 auth.tokenUrl 和 transporter patch 都只改了 URL，沒改 aud，
// Google 新端點驗證 aud 不符會直接關閉連線（Premature close）。
// 解法：完全跳過 JWT.refreshTokenNoCache，改用 Node.js 原生 crypto + https
// 自行簽 JWT assertion（aud 正確）並直接換 token。
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const b64u = (v) =>
  Buffer.from(typeof v === 'string' ? v : JSON.stringify(v))
    .toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

// Module-level token cache（單一 SA，跨呼叫共用）
let _tokenCache = { token: null, expiresAt: 0 };

const exchangeJWTForToken = (credentials) =>
  new Promise((resolve, reject) => {
    const now = Math.floor(Date.now() / 1000);
    const header = b64u({ alg: 'RS256', typ: 'JWT', kid: credentials.private_key_id });
    const payload = b64u({
      iss: credentials.client_email,
      scope: SCOPES.join(' '),
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    });
    const unsigned = `${header}.${payload}`;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(unsigned);
    const sig = b64u(signer.sign(credentials.private_key));
    const assertion = `${unsigned}.${sig}`;

    const body = Buffer.from(
      `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer` +
        `&assertion=${encodeURIComponent(assertion)}`
    );

    const req = https.request(
      {
        hostname: 'oauth2.googleapis.com',
        port: 443,
        path: '/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': body.length,
        },
        timeout: 12000,
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            const json = JSON.parse(raw);
            if (json.access_token) {
              resolve(json);
            } else {
              reject(new Error(`Token exchange failed (${res.statusCode}): ${raw}`));
            }
          } catch {
            reject(new Error(`Token response parse error: ${raw}`));
          }
        });
      }
    );
    req.on('timeout', () => { req.destroy(); reject(new Error('Token request timeout (12s)')); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

const getAccessToken = async (credentials) => {
  const now = Date.now();
  if (_tokenCache.token && now < _tokenCache.expiresAt) {
    return _tokenCache.token;
  }
  const data = await exchangeJWTForToken(credentials);
  _tokenCache = {
    token: data.access_token,
    expiresAt: now + (data.expires_in - 60) * 1000,
  };
  console.log('✅ [googleAuth] Access Token 換取成功');
  return _tokenCache.token;
};

const parseCredentials = () => {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      return JSON.parse(json);
    } catch (e) {
      console.error('❌ GOOGLE_SERVICE_ACCOUNT_JSON 格式錯誤:', e.message);
    }
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = process.env.GOOGLE_PRIVATE_KEY;
  if (email && key) {
    key = key.trim().replace(/\\n/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (!key.includes('-----BEGIN PRIVATE KEY-----')) {
      console.error('❌ GOOGLE_PRIVATE_KEY 格式不正確');
      return null;
    }
    return { client_email: email, private_key: key };
  }

  return null;
};

// 建立 Google Auth 客戶端
// 回傳標準 JWT 實例，但覆寫 getRequestHeaders 改用我們自己的 token 換取邏輯
const getServiceAccountAuth = () => {
  try {
    const credentials = parseCredentials();
    if (!credentials) {
      console.warn('⚠️  Google API 環境變數未設定，將無法使用 Calendar/Sheets 功能');
      return null;
    }

    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: SCOPES,
      keyId: credentials.private_key_id,
    });

    // 覆寫 getRequestHeaders：googleapis-common 呼叫此方法取得 Authorization header
    auth.getRequestHeaders = async () => {
      const token = await getAccessToken(credentials);
      return { Authorization: `Bearer ${token}` };
    };

    console.log('✅ 使用 GOOGLE_SERVICE_ACCOUNT_JSON 認證成功');
    return auth;
  } catch (error) {
    console.error('❌ Google Service Account 認證失敗:', error.message);
    console.warn('⚠️  將無法使用 Google Calendar/Sheets 功能');
    return null;
  }
};

const getCalendarClient = async () => {
  const auth = getServiceAccountAuth();
  if (!auth) return null;
  return google.calendar({ version: 'v3', auth });
};

const getDriveClient = async () => {
  const auth = getServiceAccountAuth();
  if (!auth) return null;
  return google.drive({ version: 'v3', auth });
};

const getGroupCalendarId = () => {
  const calendarId = process.env.GROUP_CALENDAR_ID;
  if (!calendarId) {
    console.warn('⚠️  缺少 GROUP_CALENDAR_ID 環境變數');
    return null;
  }
  return calendarId;
};

module.exports = {
  getServiceAccountAuth,
  getCalendarClient,
  getDriveClient,
  getGroupCalendarId,
};
