/**
 * KJ Survey 公開路由（Change 20）— 免登入
 * 掛在 /api/survey，隨主後端一起部署（後端合併，見 changes/20-.../spec.md）。
 *   GET  /api/survey/health          健康檢查（DB 連線）
 *   GET  /api/survey/forms/:token    前台填表：查已發佈表單
 *   POST /api/survey/forms/:token/submit  送出填寫
 *   GET  /api/survey/members         前台姓名/推薦人下拉用
 */

const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const formService = require('../../services/survey/formService');

/**
 * GET /api/survey/health — 服務存活 + DB 連線檢查
 */
router.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ success: true, message: 'KJ Survey 運作正常，DB 連線成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'DB 連線失敗', error: error.message });
  }
});

/**
 * GET /api/survey/members — 前台姓名/推薦人下拉用（公開，不含敏感資訊）
 */
router.get('/members', async (req, res) => {
  const members = await formService.listMembers();
  res.json({ success: true, data: members });
});

/**
 * GET /api/survey/forms/:token
 * 前台填表頁用：查已發佈表單。查無 / 非 published 一律回同一種友善錯誤，不洩漏原因。
 */
router.get('/forms/:token', async (req, res) => {
  const form = await formService.getPublishedFormByToken(req.params.token);
  if (!form) {
    return res.status(404).json({ success: false, message: '找不到此表單，請確認連結是否正確' });
  }
  res.json({ success: true, data: form });
});

/**
 * POST /api/survey/forms/:token/submit
 */
router.post('/forms/:token/submit', async (req, res) => {
  try {
    const submission = await formService.submitForm(req.params.token, req.body.answers || {});
    res.json({ success: true, data: submission });
  } catch (error) {
    if (error.code === 'FORM_NOT_FOUND') {
      return res.status(404).json({ success: false, message: '找不到此表單，請確認連結是否正確' });
    }
    console.error('❌ Survey 送出表單失敗:', error);
    res.status(500).json({ success: false, message: '送出失敗，請稍後再試' });
  }
});

module.exports = router;
