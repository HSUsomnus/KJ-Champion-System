/**
 * kj-survey-server 主程式
 * 康九團隊調查表單系統 — 獨立後端（Change 20）
 * 與主系統 server/ 部署切開，僅共用同一個 PostgreSQL（見 openspec/changes/20-.../spec.md）
 */

const express = require('express');
const cors = require('cors');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
require('dotenv').config();

try {
  require('./config/env');
} catch (err) {
  console.error('❌ 啟動失敗:', err.message);
  process.exit(1);
}

const healthRoutes = require('./routes/health');
const formsRoutes = require('./routes/forms');
const membersRoutes = require('./routes/members');
const adminAuthRoutes = require('./routes/adminAuth');
const { errorHandler } = require('./middleware/errorHandler');
const formService = require('./services/formService');

const app = express();
const PORT = process.env.PORT || 8081;

const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:3000',
  process.env.APP_URL,
  process.env.FRONTEND_URL,
].filter(Boolean);

// Zeabur/Cloudflare 前面有 proxy，req.ip 須信任 X-Forwarded-For 才拿得到真實 client IP（D-J）
app.set('trust proxy', 1);

app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }));
app.use(express.json({ limit: '32kb' }));

/**
 * 送出表單濫用防護（D-E + D-J）：key = client IP + form id，15 分 10 次。
 * 無效 token 不給獨立額度 —— 查無此表單一律退回只用 IP 計，避免亂打 token 繞過限流。
 */
const submitRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: async (req) => {
    const ip = ipKeyGenerator(req.ip);
    let form = null;
    try {
      form = await formService.getPublishedFormByToken(req.params.token);
    } catch {
      // DB 查詢失敗時退回只用 IP 計，寧可誤限流也不能整條流程掛掉
      form = null;
    }
    return form ? `${ip}:${req.params.token}` : ip;
  },
  handler: (req, res) => {
    res.status(429).json({ error: 'too_many_requests' });
  },
});

app.use('/health', healthRoutes);
app.use('/forms/:token/submit', submitRateLimiter);
app.use('/forms', formsRoutes);
app.use('/members', membersRoutes);
app.use('/admin-auth', adminAuthRoutes);

app.use(errorHandler);

// require.main 判斷：`node server.js` 直接執行才監聽埠；被 require()（如測試）不佔用 port
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ kj-survey-server 已啟動，PORT=${PORT}`);
  });
}

module.exports = app;
