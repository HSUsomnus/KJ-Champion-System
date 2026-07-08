const { verifySessionToken } = require('../services/adminAuthService');

const SESSION_COOKIE = 'kj_survey_admin_session';

/**
 * 保護 /admin/* 路由：驗證 session cookie，通過才放行
 * 未通過一律 401，不洩漏「是沒登入還是權限不夠」的細節差異
 */
const requireAdminSession = (req, res, next) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    return res.status(401).json({ success: false, message: '請先登入' });
  }

  try {
    req.admin = verifySessionToken(token);
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: '登入已過期，請重新登入' });
  }
};

module.exports = { requireAdminSession, SESSION_COOKIE };
