/**
 * Express 伺服器主程式
 * 負責啟動伺服器並設定所有路由
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

// 引入路由
const calendarRoutes = require('./routes/calendar');
const memberRoutes = require('./routes/member');
const profileRoutes = require('./routes/profile');
const lineRoutes = require('./routes/line');

// 建立 Express 應用程式
const app = express();
const PORT = process.env.PORT || 8080;

// 中介層設定
// 允許跨來源請求（CORS）
app.use(cors());

// 解析 JSON 格式的請求 body
app.use(express.json());

// 解析 URL 編碼的請求 body
app.use(express.urlencoded({ extended: true }));

// 提供靜態檔案（前端頁面、CSS、JS）
// 開發環境：關閉快取，修改 UI 後重開伺服器即可看到變更
const publicPath = path.join(__dirname, '../public');
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    if (req.path.match(/\.(html|css|js)$/)) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
    next();
  });
}
app.use(express.static(publicPath));

// 康九 logo 已放在 public/images/logo.png，由上方 express.static 直接提供，無需自訂路由

// 瀏覽器預設會請求 /favicon.ico，用康九 logo 回傳，避免 Console 出現 404
const faviconPath = path.join(publicPath, 'images', 'logo.png');
app.get('/favicon.ico', (req, res) => {
  res.type('image/png');
  res.sendFile(faviconPath, (err) => {
    if (err) res.status(404).end();
  });
});

// API 路由
app.use('/api/calendar', calendarRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/line', lineRoutes);

// 健康檢查端點（供 Cloud Run 使用）
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// 根路徑：回傳前端主頁
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 404 錯誤處理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '找不到請求的資源',
  });
});

// 全域錯誤處理
app.use((err, req, res, next) => {
  console.error('❌ 伺服器錯誤:', err);
  res.status(500).json({
    success: false,
    message: err.message || '伺服器發生錯誤',
  });
});

// 匯出 app 供 Vercel Serverless 使用
module.exports = app;

// 本機開發時啟動伺服器
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 伺服器已啟動在 http://localhost:${PORT}`);
    console.log(`📅 環境: ${process.env.NODE_ENV || 'development'}`);
  });

  // 優雅關閉處理
  process.on('SIGTERM', () => {
    console.log('收到 SIGTERM 訊號，正在關閉伺服器...');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('收到 SIGINT 訊號，正在關閉伺服器...');
    process.exit(0);
  });
}
