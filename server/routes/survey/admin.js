/**
 * KJ Survey 後台路由（Change 20）— 全部需登入（requireAdminRole）
 * 掛在 /api/survey/admin，隨主後端一起部署。
 *   GET  /api/survey/admin/me   確認目前 LINE ID 是否有後台權限（回傳身分）
 * （Section 4–7 的儀表板 / 明細 / 匯出 / 建立器端點於後續 Phase 加入）
 */

const express = require('express');
const router = express.Router();
const { requireAdminRole } = require('./requireAdminRole');
const adminFormService = require('../../services/survey/adminFormService');

// 所有後台路由統一先過權限閘門
router.use(requireAdminRole);

/**
 * GET /api/survey/admin/me — 確認目前這個 LINE ID 是否有後台權限
 */
router.get('/me', (req, res) => {
  res.json({ success: true, data: req.admin });
});

/**
 * GET /api/survey/admin/forms — 列出所有表單（側邊欄＝任務清單）
 */
router.get('/forms', async (req, res) => {
  try {
    const forms = await adminFormService.listForms();
    res.json({ success: true, data: forms });
  } catch (error) {
    console.error('❌ Survey 列出任務失敗:', error);
    res.status(500).json({ success: false, message: '讀取任務清單失敗' });
  }
});

/**
 * GET /api/survey/admin/forms/:id/attendance — 完成狀況（首屏儀表板）
 */
router.get('/forms/:id/attendance', async (req, res) => {
  try {
    const attendance = await adminFormService.computeAttendance(req.params.id);
    res.json({ success: true, data: attendance });
  } catch (error) {
    if (error.code === 'FORM_NOT_FOUND') {
      return res.status(404).json({ success: false, message: '找不到此任務' });
    }
    console.error('❌ Survey 完成狀況計算失敗:', error);
    res.status(500).json({ success: false, message: '讀取完成狀況失敗' });
  }
});

/**
 * GET /api/survey/admin/forms/:id/submissions — 該任務逐筆明細（含欄位定義）
 */
router.get('/forms/:id/submissions', async (req, res) => {
  try {
    const data = await adminFormService.listSubmissions(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    if (error.code === 'FORM_NOT_FOUND') {
      return res.status(404).json({ success: false, message: '找不到此任務' });
    }
    console.error('❌ Survey 明細讀取失敗:', error);
    res.status(500).json({ success: false, message: '讀取明細失敗' });
  }
});

module.exports = router;
