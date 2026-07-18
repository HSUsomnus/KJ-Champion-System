const express = require('express');
const router = express.Router();
const formService = require('../services/formService');
const { asyncHandler } = require('../middleware/asyncHandler');

/**
 * GET /members
 * 前台姓名/推薦人下拉用（公開，不含敏感資訊）
 */
router.get('/', asyncHandler(async (req, res) => {
  const members = await formService.listMembers();
  res.json({ success: true, data: members });
}));

module.exports = router;
