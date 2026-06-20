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
// signer.sign() 回傳 Buffer；Buffer.isBuffer 判斷避免走到 JSON.stringify(buffer)
const b64u = (v) =>
  (Buffer.isBuffer(v) ? v : Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)))
    .toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

// Module-level token cache（單一 SA，跨呼叫共用）
let _tokenCache = { token: null, expiresAt: 0 };

const exchangeJWTForToken = (credentials) =>
  new Promise((resolve, reject) => {
    const tokenUrl = credentials._tokenUrl || TOKEN_URL;
    const tokenUrlObj = new URL(tokenUrl);
    const now = Math.floor(Date.now() / 1000);
    const header = b64u({ alg: 'RS256', typ: 'JWT', kid: credentials.private_key_id });
    const payload = b64u({
      iss: credentials.client_email,
      scope: SCOPES.join(' '),
      aud: tokenUrl,
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
        hostname: tokenUrlObj.hostname,
        port: 443,
        path: tokenUrlObj.pathname,
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
  // 優先用 JSON 裡的 token_uri，確保端點跟著金鑰走，不依賴硬編碼的 TOKEN_URL
  const tokenUrl = credentials.token_uri || TOKEN_URL;
  const data = await exchangeJWTForToken({ ...credentials, _tokenUrl: tokenUrl });
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

// 對外開放：取得 access token（calendarService.js 用原生 HTTPS 呼叫 Calendar API 時使用）
const getToken = async () => {
  const creds = parseCredentials();
  if (!creds) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON 未設定或格式錯誤');
  return getAccessToken(creds);
};

// 原生 HTTPS 呼叫 Google Calendar API（完全不走 gaxios / googleapis HTTP client）
// 原因：gaxios@6+ 在 Zeabur 的 Node.js 18 環境使用 native fetch（undici），
//        對 www.googleapis.com 連線 Premature close；raw https.request 正常。
const calendarApiRequest = ({ method, path, body = null, token }) =>
  new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    };
    if (bodyStr) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }
    const req = https.request(
      { hostname: 'www.googleapis.com', port: 443, path, method, headers, timeout: 15000 },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          if (res.statusCode === 204) { resolve({ status: 204, data: null }); return; }
          try {
            const data = JSON.parse(raw);
            if (res.statusCode >= 400) {
              reject(new Error(`Calendar API ${res.statusCode}: ${data?.error?.message || raw}`));
            } else {
              resolve({ status: res.statusCode, data });
            }
          } catch {
            reject(new Error(`Calendar API parse error (${res.statusCode}): ${raw}`));
          }
        });
      }
    );
    req.on('timeout', () => { req.destroy(); reject(new Error('Calendar API timeout (15s)')); });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });

// googleapis-common 呼叫 auth.request() → OAuth2Client 內部 refreshTokenNoCache()
// → www.googleapis.com/oauth2/v4/token（舊廢棄端點，已 Premature close）。
// 根本解法：不用 google.auth.JWT，改用 google.auth.OAuth2。
// 我們先用自己的 JWT exchange 拿好 access_token，再 setCredentials 給 OAuth2。
// googleapis 看到 credentials 有有效 access_token，直接取用，完全不走 JWT refresh。
// （注意：getCalendarClient / getDriveClient 保留給需要 googleapis 物件的地方，
//   calendarService.js 已改用 calendarApiRequest 完全繞過 gaxios。）
const getServiceAccountAuth = async () => {
  try {
    const credentials = parseCredentials();
    if (!credentials) {
      console.warn('⚠️  Google API 環境變數未設定，將無法使用 Calendar/Sheets 功能');
      return null;
    }

    const token = await getAccessToken(credentials);

    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: token,
      expiry_date: Date.now() + 55 * 60 * 1000,
      token_type: 'Bearer',
    });

    // token 到期時 googleapis 呼叫 refreshAccessToken()，
    // 覆寫改走我們自己的 JWT exchange，不走 OAuth2 的 refresh_token 流程。
    auth.refreshAccessToken = async () => {
      const newToken = await getAccessToken(credentials);
      const creds = {
        access_token: newToken,
        expiry_date: Date.now() + 55 * 60 * 1000,
        token_type: 'Bearer',
      };
      auth.setCredentials(creds);
      return { credentials: creds, res: null };
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
  const auth = await getServiceAccountAuth();
  if (!auth) return null;
  return google.calendar({ version: 'v3', auth });
};

const getDriveClient = async () => {
  const auth = await getServiceAccountAuth();
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
  TOKEN_URL,
  getToken,
  calendarApiRequest,
  getServiceAccountAuth,
  getCalendarClient,
  getDriveClient,
  getGroupCalendarId,
};
