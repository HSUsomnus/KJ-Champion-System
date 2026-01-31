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
    // 從環境變數讀取 Service Account 資訊
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const projectId = process.env.GOOGLE_PROJECT_ID;

    if (!serviceAccountEmail || !privateKey || !projectId) {
      throw new Error('缺少必要的 Google API 環境變數設定');
    }

    // 建立 JWT 認證客戶端
    const auth = new google.auth.JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/spreadsheets',
      ],
      projectId: projectId,
    });

    return auth;
  } catch (error) {
    console.error('❌ Google Service Account 認證失敗:', error.message);
    throw error;
  }
};

// 取得已認證的 Calendar API 客戶端
const getCalendarClient = async () => {
  const auth = getServiceAccountAuth();
  return google.calendar({ version: 'v3', auth });
};

// 取得已認證的 Sheets API 客戶端
const getSheetsClient = async () => {
  const auth = getServiceAccountAuth();
  return google.sheets({ version: 'v4', auth });
};

// 取得團體日曆 ID
const getGroupCalendarId = () => {
  const calendarId = process.env.GROUP_CALENDAR_ID;
  if (!calendarId) {
    throw new Error('缺少 GROUP_CALENDAR_ID 環境變數');
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
  getGroupCalendarId,
  getSheetConfig,
};
