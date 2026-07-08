/**
 * kj-survey-server 主程式
 * 康九團隊調查表單系統 — 獨立後端（Change 20）
 * 與主系統 server/ 部署切開，僅共用同一個 PostgreSQL（見 openspec/changes/20-.../spec.md）
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const healthRoutes = require('./routes/health');
const formsRoutes = require('./routes/forms');
const membersRoutes = require('./routes/members');
const adminAuthRoutes = require('./routes/adminAuth');

const app = express();
const PORT = process.env.PORT || 8081;

const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:3000',
  process.env.APP_URL,
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }));
app.use(express.json());

app.use('/health', healthRoutes);
app.use('/forms', formsRoutes);
app.use('/members', membersRoutes);
app.use('/admin-auth', adminAuthRoutes);

app.listen(PORT, () => {
  console.log(`✅ kj-survey-server 已啟動，PORT=${PORT}`);
});

module.exports = app;
