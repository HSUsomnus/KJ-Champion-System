const express = require('express');
const router = express.Router();
const db = require('../config/db');

/**
 * GET /health
 * 檢查服務存活 + DB 連線
 */
router.get('/', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ success: true, message: 'kj-survey-server 運作正常，DB 連線成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'DB 連線失敗', error: error.message });
  }
});

module.exports = router;
