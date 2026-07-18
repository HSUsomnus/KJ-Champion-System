const express = require('express');
const router = express.Router();
const formService = require('../services/formService');
const { asyncHandler } = require('../middleware/asyncHandler');

/**
 * GET /forms/:token
 * 前台填表頁用：查已發佈表單。查無/非 published 一律回同一種友善錯誤，不洩漏原因。
 */
router.get('/:token', asyncHandler(async (req, res) => {
  const form = await formService.getPublishedFormByToken(req.params.token);
  if (!form) {
    return res.status(404).json({ success: false, message: '找不到此表單，請確認連結是否正確' });
  }
  res.json({ success: true, data: form });
}));

/**
 * POST /forms/:token/submit
 */
router.post('/:token/submit', asyncHandler(async (req, res) => {
  try {
    const submission = await formService.submitForm(req.params.token, req.body.answers || {});
    res.json({ success: true, data: submission });
  } catch (error) {
    if (error.code === 'FORM_NOT_FOUND') {
      return res.status(404).json({ success: false, message: '找不到此表單，請確認連結是否正確' });
    }
    throw error;
  }
}));

module.exports = router;
