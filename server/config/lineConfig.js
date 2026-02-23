/**
 * LINE LIFF 設定檔
 * 負責 LINE 相關的配置與驗證
 */

require('dotenv').config();

// 取得 LINE LIFF ID（選填；未設定時回傳空字串，不拋錯）
const getLiffId = () => {
  return process.env.LIFF_ID || '';
};

// 取得 LINE Channel ID
const getChannelId = () => {
  return process.env.LINE_CHANNEL_ID || '';
};

// 取得 LINE Channel Secret
const getChannelSecret = () => {
  return process.env.LINE_CHANNEL_SECRET || '';
};

// 取得 LINE Channel Access Token（Messaging API 用於 Bot 發送 Push 訊息）
const getChannelAccessToken = () => {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    throw new Error('缺少 LINE_CHANNEL_ACCESS_TOKEN 環境變數（Messaging API 用）');
  }
  return token;
};

// 取得應用程式對外網址（用於獨立詳情頁連結）
const getAppUrl = () => {
  const url = process.env.APP_URL;
  if (!url) {
    throw new Error('缺少 APP_URL 環境變數（應用程式對外網址）');
  }
  return url.replace(/\/$/, ''); // 移除結尾斜線
};

// 驗證 LINE User ID 格式（基本驗證）
const isValidLineUserId = (userId) => {
  // LINE User ID 通常是 33 個字元的字串
  return userId && typeof userId === 'string' && userId.length === 33;
};

// 驗證 LINE 發送對象（User ID / Group ID / Room ID 皆為 33 字元）
const isValidLineTargetId = (id) => {
  return id && typeof id === 'string' && id.trim().length === 33;
};

module.exports = {
  getLiffId,
  getChannelId,
  getChannelSecret,
  getChannelAccessToken,
  getAppUrl,
  isValidLineUserId,
  isValidLineTargetId,
};
