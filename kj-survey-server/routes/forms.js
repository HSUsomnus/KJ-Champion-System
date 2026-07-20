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
 * GET /forms/:token/members
 * 前台選單用：僅在 token 對應已發佈表單時回傳已確認成員的公開欄位。
 */
router.get('/:token/members', asyncHandler(async (req, res) => {
  const form = await formService.getPublishedFormByToken(req.params.token);
  if (!form) {
    return res.status(404).json({ success: false, message: '找不到此表單，請確認連結是否正確' });
  }

  const members = await formService.listConfirmedMembers();
  const data = members.map(({ name, star_rank }) => ({ name, star_rank }));
  res.json({ success: true, data });
}));

/**
 * POST /forms/:token/submit
 * 送出前先驗證（H-2）：失敗回 400，不寫 DB。
 */
router.post('/:token/submit', asyncHandler(async (req, res) => {
  const form = await formService.getPublishedFormByToken(req.params.token);
  if (!form) {
    return res.status(404).json({ success: false, message: '找不到此表單，請確認連結是否正確' });
  }

  const answers = req.body.answers || {};
  const validation = formService.validateAnswers(form, answers);
  if (!validation.valid) {
    return res.status(400).json({
      error: 'validation_failed',
      field: validation.field,
      reason: validation.reason,
    });
  }

  try {
    const submission = await formService.submitForm(req.params.token, answers);
    res.json({ success: true, data: submission });
  } catch (error) {
    if (error.code === 'FORM_NOT_FOUND') {
      return res.status(404).json({ success: false, message: '找不到此表單，請確認連結是否正確' });
    }
    throw error;
  }
}));

module.exports = router;
