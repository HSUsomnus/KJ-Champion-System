const { google } = require('googleapis');
require('dotenv').config();

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive',
];

// google-auth-library 的 JWT 預設打已廢棄的 www.googleapis.com/oauth2/v4/token
// 建立 JWT 後必須明確覆寫 tokenUrl，強制走正確端點
const CORRECT_TOKEN_URL = 'https://oauth2.googleapis.com/token';

const getServiceAccountAuth = () => {
  try {
    // 方案 1：使用完整的 JSON 格式（推薦）
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
        auth.tokenUrl = credentials.token_uri || CORRECT_TOKEN_URL;
        console.log('✅ 使用 GOOGLE_SERVICE_ACCOUNT_JSON 認證成功');
        return auth;
      } catch (parseError) {
        console.error('❌ GOOGLE_SERVICE_ACCOUNT_JSON 格式錯誤:', parseError.message);
      }
    }

    // 方案 2：使用分開的環境變數
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
    auth.tokenUrl = CORRECT_TOKEN_URL;

    console.log('✅ 使用分開的環境變數認證成功');
    return auth;
  } catch (error) {
    console.error('❌ Google Service Account 認證失敗:', error.message);
    console.warn('⚠️  將無法使用 Google Calendar/Sheets 功能');
    return null;
  }
};

// 取得已認證的 Calendar API 客戶端
const getCalendarClient = async () => {
  const auth = getServiceAccountAuth();
  if (!auth) {
    return null;
  }
  return google.calendar({ version: 'v3', auth });
};

// 取得已認證的 Drive API 客戶端（用於上傳試算表並轉成唯讀 Google Sheet）
const getDriveClient = async () => {
  const auth = getServiceAccountAuth();
  if (!auth) {
    return null;
  }
  return google.drive({ version: 'v3', auth });
};

// 取得團體日曆 ID
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
