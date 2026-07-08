const { getMemberRole, isAdminRole } = require('../services/adminAuthService');

/**
 * 保護後台路由：比照主系統既有模式，讀 X-Line-User-Id header，
 * 查同一個 DB 的 members.role，確認是管理者/負責人/開發者才放行。
 * 沒有另外做登入流程 —— 登入本身沿用主系統既有的 LINE Login（/api/auth/line-login）。
 */
const requireAdminRole = async (req, res, next) => {
  const lineUserId = req.headers['x-line-user-id'];
  if (!lineUserId) {
    return res.status(401).json({ success: false, message: '請先登入' });
  }

  try {
    const role = await getMemberRole(lineUserId);
    if (!isAdminRole(role)) {
      return res.status(403).json({ success: false, message: '此帳號沒有後台權限' });
    }
    req.admin = { lineId: lineUserId, role };
    next();
  } catch (error) {
    console.error('❌ 後台權限查詢錯誤:', error);
    res.status(500).json({ success: false, message: '權限驗證失敗，請稍後再試' });
  }
};

module.exports = { requireAdminRole };
