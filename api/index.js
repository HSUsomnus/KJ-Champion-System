/**
 * Vercel Serverless Function 入口
 * 匯入 Express app 並作為 Serverless Function 執行
 */

const app = require('../server/server');

// Vercel 會自動將這個 handler 包裝成 Serverless Function
module.exports = app;
