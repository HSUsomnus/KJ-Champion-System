/**
 * 啟動環境變數驗證（20.3）
 * 缺任一必要 secret 立即拋錯 fail-fast，避免帶著壞設定悄悄跑起來
 * （例如 state HMAC 簽章用到 undefined SESSION_SECRET）。
 */
require('dotenv').config();

const REQUIRED_KEYS = [
  'SESSION_SECRET',
  'LINE_CHANNEL_ID',
  'LINE_CHANNEL_SECRET',
  'APP_URL',
  'FRONTEND_URL',
];

const missing = REQUIRED_KEYS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`缺少必要環境變數：${missing.join(', ')}（見 .env.example）`);
}

module.exports = REQUIRED_KEYS.reduce((acc, key) => {
  acc[key] = process.env[key];
  return acc;
}, {});
