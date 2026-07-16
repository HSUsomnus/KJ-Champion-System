/**
 * KJ Survey 後台路由（Change 20）— 全部需登入（requireAdminRole）
 * 掛在 /api/survey/admin，隨主後端一起部署。
 *   GET  /api/survey/admin/me   確認目前 LINE ID 是否有後台權限（回傳身分）
 * （Section 4–7 的儀表板 / 明細 / 匯出 / 建立器端點於後續 Phase 加入）
 */

const express = require('express');
const router = express.Router();
const { requireAdminRole } = require('./requireAdminRole');

// 所有後台路由統一先過權限閘門
router.use(requireAdminRole);

/**
 * GET /api/survey/admin/me — 確認目前這個 LINE ID 是否有後台權限
 */
router.get('/me', (req, res) => {
  res.json({ success: true, data: req.admin });
});

module.exports = router;
