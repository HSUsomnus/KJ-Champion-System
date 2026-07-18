/**
 * 保護後台路由（D-G：撤權延遲降到單次請求內）
 * 驗 JWT 簽章 + exp → 取 lineId → 每次重查 DB role（JWT payload 不放 role，
 * 所以撤權後即使 token 還沒過期，下一次請求也會被擋）。
 */
const adminAuthService = require('../services/adminAuthService');

const requireAdminSession = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, message: '請先登入' });
  }

  let payload;
  try {
    payload = adminAuthService.verifyAdminJwt(token);
  } catch (error) {
    return res.status(401).json({ success: false, message: '登入已過期，請重新登入' });
  }

  const role = await adminAuthService.getMemberRole(payload.lineId);
  if (!adminAuthService.isAdminRole(role)) {
    return res.status(403).json({ success: false, message: '此帳號沒有後台權限' });
  }

  req.admin = { lineId: payload.lineId, role };
  next();
};

module.exports = { requireAdminSession };
