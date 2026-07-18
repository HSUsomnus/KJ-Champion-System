/**
 * KJ Survey 後台權限 middleware（Change 20）
 *
 * [設計決策] 登入沿用主系統既有的 LINE Login（/api/auth/line-login），前端登入完成後
 * 帶著同一個 lineUserId（X-Line-User-Id header）打後台 API，這裡查同一個 DB 的
 * members.role 確認是管理者/負責人/開發者才放行。
 * 原因：原規劃的「survey 自建 OAuth callback + cookie session」因 LINE 導回網域跟前端
 *   網域對不上、cookie 設錯地方而失敗（見 surveyApi.js 註解），已改用主系統既有登入流程。
 * 若要修改：請先確認不會重新引入「survey 後端自己發 OAuth callback」的設計。
 */

const { getMemberRole, isAdminRole } = require('../../services/survey/adminAuthService');

const requireAdminRole = async (req, res, next) => {
  // 一般 API 走 X-Line-User-Id header；下載連結（<a href>）無法帶 header，
  // 改由 query.lineUserId 帶入（信任層級同 header，仍後端查角色）。
  const lineUserId = req.headers['x-line-user-id'] || req.query?.lineUserId;
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
    console.error('❌ Survey 後台權限查詢錯誤:', error);
    res.status(500).json({ success: false, message: '權限驗證失敗，請稍後再試' });
  }
};

module.exports = { requireAdminRole };
