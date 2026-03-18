/**
 * Express 伺服器主程式
 * 負責啟動伺服器並設定所有路由
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

// 引入資料庫
const db = require('./config/db');

// 引入路由
const calendarRoutes = require('./routes/calendar');
const memberRoutes = require('./routes/member');
const profileRoutes = require('./routes/profile');
const lineRoutes = require('./routes/line');
const financialRoutes = require('./routes/financial');
const authRoutes = require('./routes/auth');

// 建立 Express 應用程式
const app = express();
const PORT = process.env.PORT || 8080;

// 判斷使用哪個前端：USE_REACT_FRONTEND=1 且 frontend/dist 存在時使用 React
const reactDistPath = path.join(__dirname, '../frontend/dist');
const distExists = fs.existsSync(reactDistPath);
const useReactFrontend =
  process.env.USE_REACT_FRONTEND === '1' && distExists;
const publicPath = useReactFrontend ? reactDistPath : path.join(__dirname, '../public');

// 啟動時記錄前端使用狀態
console.log('🔧 前端配置:');
console.log('  USE_REACT_FRONTEND:', process.env.USE_REACT_FRONTEND);
console.log('  frontend/dist 存在:', distExists);
console.log('  使用前端:', useReactFrontend ? 'React (frontend/dist)' : 'HTML (public)');
console.log('  路徑:', publicPath);

// 中介層設定
// 允許跨來源請求（CORS）
// 白名單：本機開發 + APP_URL（後端本身） + FRONTEND_URL（前端獨立部署，如 Vercel）
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:3000',
  process.env.APP_URL,       // 後端本身的網址（Cloud Run）
  process.env.FRONTEND_URL,  // 前端獨立部署網址（Vercel 等）
].filter(Boolean); // 過濾掉未設定的 undefined

console.log('🌐 CORS 允許來源:', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // origin 為 undefined 表示同源請求（如 Postman、curl、後端自呼叫）
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS 拒絕來源: ${origin}`);
      callback(new Error(`CORS 不允許來源: ${origin}`));
    }
  },
  credentials: true, // 允許帶 Cookie / Authorization header
}));

// 解析 JSON 格式的請求 body
app.use(express.json());

// 解析 URL 編碼的請求 body
app.use(express.urlencoded({ extended: true }));

// 提供靜態檔案（前端頁面、CSS、JS）
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    if (req.path.match(/\.(html|css|js)$/)) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
    next();
  });
}
app.use(express.static(publicPath));

// favicon：優先從當前 publicPath 取得 logo
const faviconPath = path.join(publicPath, 'images', 'logo.png');
const fallbackFavicon = path.join(__dirname, '../public/images/logo.png');
app.get('/favicon.ico', (req, res) => {
  res.type('image/png');
  const src = fs.existsSync(faviconPath) ? faviconPath : fallbackFavicon;
  res.sendFile(src, (err) => {
    if (err) res.status(404).end();
  });
});

// API 路由
app.use('/api/calendar', calendarRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/line', lineRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/auth', authRoutes);

// 健康檢查端點（供 Cloud Run 使用）
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// 根路徑：回傳前端主頁
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// React SPA fallback：非 API、非實際檔案的 GET 請求都回傳 index.html
if (useReactFrontend) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(reactDistPath, 'index.html'), (err) => {
      if (err) next();
    });
  });
}

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

// 自動執行資料庫 migration（安全的 IF NOT EXISTS）
(async () => {
  try {
    // 新增 financial_amount 欄位（如果不存在的話）
    await db.query(`
      ALTER TABLE members
      ADD COLUMN IF NOT EXISTS financial_amount VARCHAR(50) DEFAULT ''
    `);
    console.log('✅ 資料庫 migration 完成（financial_amount）');
  } catch (error) {
    console.error('⚠️ 資料庫 migration 錯誤（非致命）:', error.message);
  }
})();

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
