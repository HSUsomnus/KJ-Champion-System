const { google } = require('googleapis');
require('dotenv').config();

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive',
];

// google-auth-library@9.x 的 JWT.refreshTokenNoCache() 把 JWT_ACCESS_TOKEN_URL
// 硬編碼為 'https://www.googleapis.com/oauth2/v4/token'（已廢棄，Google 開始拒絕連線）。
// 設定 auth.tokenUrl 屬性沒有用，因為方法內部直接用常數，不讀屬性。
// 唯一有效的做法：在 transporter 層攔截 HTTP 請求並替換 URL。
const patchTransporter = (auth) => {
  const orig = auth.transporter;
  const origRequest = orig.request.bind(orig);
  auth.transporter = {
    request: async (opts) => {
      if (opts.url === 'https://www.googleapis.com/oauth2/v4/token') {
        opts.url = 'https://oauth2.googleapis.com/token';
      }
      return origRequest(opts);
    },
  };
};

const getServiceAccountAuth = () => {
  try {
    const googleCredentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    if (googleCredentialsJson) {
      try {
        const credentials = JSON.parse(googleCredentialsJson);
        const auth = new google.auth.JWT({
          email: credentials.client_email,
          key: credentials.private_key,
          scopes: SCOPES,
          keyId: credentials.private_key_id,
        });
        patchTransporter(auth);
        console.log('✅ 使用 GOOGLE_SERVICE_ACCOUNT_JSON 認證成功');
        return auth;
      } catch (parseError) {
        console.error('❌ GOOGLE_SERVICE_ACCOUNT_JSON 格式錯誤:', parseError.message);
      }
    }

    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!serviceAccountEmail || !privateKey) {
      console.warn('⚠️  Google API 環境變數未設定，將無法使用 Calendar/Sheets 功能');
      return null;
    }

    privateKey = privateKey.trim().replace(/\\n/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      throw new Error('GOOGLE_PRIVATE_KEY 格式不正確');
    }

    const auth = new google.auth.JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: SCOPES,
    });
    patchTransporter(auth);

    console.log('✅ 使用分開的環境變數認證成功');
    return auth;
  } catch (error) {
    console.error('❌ Google Service Account 認證失敗:', error.message);
    console.warn('⚠️  將無法使用 Google Calendar/Sheets 功能');
    return null;
  }
};

const getCalendarClient = async () => {
  const auth = getServiceAccountAuth();
  if (!auth) {
    return null;
  }
  return google.calendar({ version: 'v3', auth });
};

const getDriveClient = async () => {
  const auth = getServiceAccountAuth();
  if (!auth) {
    return null;
  }
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
