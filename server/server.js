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
const debugRoutes = require('./routes/debug');
const adminRoutes = require('./routes/admin');

// 引入排程
const dailyAgendaScheduler = require('./scheduler/dailyAgenda');
const calendarSyncScheduler = require('./scheduler/calendarSync');
const backupSyncScheduler = require('./scheduler/backupSync');

// 建立 Express 應用程式
const app = express();
const PORT = process.env.PORT || 8080;

// 判斷使用哪個前端：USE_REACT_FRONTEND=1 且 frontend/dist 存在時使用 React
const reactDistPath = path.join(__dirname, '../frontend/dist');
const distExists = fs.existsSync(reactDistPath);
const useReactFrontend =
  process.env.USE_REACT_FRONTEND === '1' && distExists;
const publicPath = useReactFrontend ? reactDistPath : path.join(__dirname, '../public');
// v2.0.0 起 public/ 已刪除；prod 上 frontend/dist 不存在，後端純 API 模式
const publicExists = fs.existsSync(publicPath);

// 啟動時記錄前端使用狀態
console.log('🔧 前端配置:');
console.log('  USE_REACT_FRONTEND:', process.env.USE_REACT_FRONTEND);
console.log('  frontend/dist 存在:', distExists);
console.log('  使用前端:', useReactFrontend ? 'React (frontend/dist)' : publicExists ? 'HTML (public)' : '無（純 API 模式）');
console.log('  路徑:', publicPath, '| 存在:', publicExists);

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
if (publicExists) {
  app.use(express.static(publicPath));
}

// favicon：目錄存在才嘗試送檔，否則 404
const faviconPath = path.join(publicPath, 'images', 'logo.png');
app.get('/favicon.ico', (req, res) => {
  if (fs.existsSync(faviconPath)) {
    res.type('image/png');
    res.sendFile(faviconPath, (err) => { if (err) res.status(404).end(); });
  } else {
    res.status(404).end();
  }
});

// API 路由
app.use('/api/calendar', calendarRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/line', lineRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/auth', authRoutes);

// 自檢端點（永遠開放 — 只回傳 ok/fail 狀態，不暴露 token 或私鑰）
app.use('/api/debug', debugRoutes);
app.use('/api/admin', adminRoutes);
console.log('🔧 [debug] /api/debug/health 已啟用');

// 健康檢查端點（供 Cloud Run 使用）
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// 根路徑：有前端目錄才送 index.html，否則純 API 模式回傳 JSON
app.get('/', (req, res) => {
  const indexPath = path.join(publicPath, 'index.html');
  if (publicExists && fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ status: 'ok', service: 'kj-champion-api' });
  }
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

    // 新增 system_settings 表（每日行程推播設定）
    await db.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.query(`
      INSERT INTO system_settings (key, value) VALUES ('daily_agenda_time', '21:00')
      ON CONFLICT (key) DO NOTHING
    `);
    await db.query(`
      INSERT INTO system_settings (key, value) VALUES ('daily_agenda_enabled', 'true')
      ON CONFLICT (key) DO NOTHING
    `);
    await db.query(`
      INSERT INTO system_settings (key, value) VALUES ('daily_agenda_target', 'developer')
      ON CONFLICT (key) DO NOTHING
    `);
    console.log('✅ 資料庫 migration 完成（system_settings）');
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
    // 啟動每日行程推播排程（僅在長駐程式中啟動）
    dailyAgendaScheduler.start();
    // 啟動每分鐘 Google Calendar 同步排程
    calendarSyncScheduler.start();
    // 啟動每 8 小時備份同步排程（BACKUP_DATABASE_URL 未設定時自動停用）
    backupSyncScheduler.start();
  });

  // 優雅關閉處理
  process.on('SIGTERM', () => {
    console.log('收到 SIGTERM 訊號，正在關閉伺服器...');
    dailyAgendaScheduler.stop();
    calendarSyncScheduler.stop();
    backupSyncScheduler.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('收到 SIGINT 訊號，正在關閉伺服器...');
    dailyAgendaScheduler.stop();
    calendarSyncScheduler.stop();
    backupSyncScheduler.stop();
    process.exit(0);
  });
}
