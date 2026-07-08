/**
 * KJ Survey 後台身分檢查
 * 不自己做登入流程 —— 沿用主系統既有的 LINE Login（/api/auth/line-login）。
 * 前端登入完成後，帶著主系統發的 LINE ID（X-Line-User-Id header）打這支
 * API 確認角色，比照主系統既有的驗證模式。
 */

const express = require('express');
const router = express.Router();
const { requireAdminRole } = require('../middleware/requireAdminRole');

/**
 * GET /admin-auth/me — 確認目前這個 LINE ID 是否有後台權限
 */
router.get('/me', requireAdminRole, (req, res) => {
  res.json({ success: true, data: req.admin });
});

module.exports = router;
