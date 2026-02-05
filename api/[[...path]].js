/**
 * Vercel Serverless 入口：將 /api/* 請求交給 Express 後端
 * 專案根目錄的 server/server.js 只處理 API，不提供靜態檔
 */
module.exports = require('../server/server.js');
