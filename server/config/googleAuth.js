/**
 * Google API 認證設定檔
 * 負責初始化 Google Calendar 和 Sheets API 的認證
 */

const { google } = require('googleapis');
require('dotenv').config();

// 建立 Google Auth 客戶端（使用 Service Account）
// Service Account 用於存取團體日曆和 Google Sheets
const getServiceAccountAuth = () => {
  try {
    // 方案 1：使用完整的 JSON 格式（推薦，避免私鑰換行問題）
    const googleCredentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    
    if (googleCredentialsJson) {
      try {
        const credentials = JSON.parse(googleCredentialsJson);
        const auth = new google.auth.JWT({
          email: credentials.client_email,
          key: credentials.private_key, // JSON 裡的 private_key 已經有正確的換行
          scopes: [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/drive', // 轉成 Google Sheet 並設「知道連結可檢視」需此範圍
          ],
          projectId: credentials.project_id,
        });
        console.log('✅ 使用 GOOGLE_SERVICE_ACCOUNT_JSON 認證成功');
        return auth;
      } catch (parseError) {
        console.error('❌ GOOGLE_SERVICE_ACCOUNT_JSON 格式錯誤:', parseError.message);
        // 繼續嘗試方案 2
      }
    }

    // 方案 2：使用分開的環境變數（舊方法，可能有換行符問題）
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const projectId = process.env.GOOGLE_PROJECT_ID;

    if (!serviceAccountEmail || !privateKey || !projectId) {
      console.warn('⚠️  Google API 環境變數未設定，將無法使用 Calendar/Sheets 功能');
      return null;
    }

    // 私鑰格式整理：Cloud Run / 環境變數常把換行存成 \n 或 \r\n，需還原成單一換行
    privateKey = privateKey.trim();
    // 還原「反斜線 + n」為換行（例如 .env 或 Console 裡填 \n）
    privateKey = privateKey.replace(/\\n/g, '\n');
    // 統一換行為 \n（避免 \r\n 或 \r 導致 DECODER 錯誤）
    privateKey = privateKey.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      throw new Error('GOOGLE_PRIVATE_KEY 格式不正確，應為完整 PEM（含 -----BEGIN PRIVATE KEY-----），請檢查 Cloud Run 環境變數');
    }

    // 建立 JWT 認證客戶端
    const auth = new google.auth.JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive',
      ],
      projectId: projectId,
    });

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

// 取得已認證的 Sheets API 客戶端
const getSheetsClient = async () => {
  const auth = getServiceAccountAuth();
  if (!auth) {
    return null;
  }
  return google.sheets({ version: 'v4', auth });
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

// 取得成員資料表設定
const getSheetConfig = () => {
  const sheetId = process.env.MEMBER_SHEET_ID;
  const sheetName = process.env.MEMBER_SHEET_NAME || '成員資料';
  
  if (!sheetId) {
    throw new Error('缺少 MEMBER_SHEET_ID 環境變數');
  }
  
  return { sheetId, sheetName };
};

module.exports = {
  getServiceAccountAuth,
  getCalendarClient,
  getSheetsClient,
  getDriveClient,
  getGroupCalendarId,
  getSheetConfig,
};
