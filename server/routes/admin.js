const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { syncProdToBackup } = require('../services/backupSyncService');

const verifyAdmin = (req, res, next) => {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!process.env.ADMIN_SECRET || token !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ success: false, message: '未授權' });
  }
  next();
};

async function discoverTables(pool) {
  const { rows } = await pool.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
  );
  return rows.map(r => r.tablename);
}

/**
 * POST /api/admin/sync-prod-to-backup
 * 立即觸發 prod → backup 全量同步（不等 8 小時排程）
 */
router.post('/sync-prod-to-backup', verifyAdmin, async (req, res) => {
  try {
    const counts = await syncProdToBackup();
    if (counts === null) {
      return res.status(500).json({ success: false, message: 'BACKUP_DATABASE_URL 未設定' });
    }
    res.json({ success: true, tables: counts });
  } catch (err) {
    console.error('❌ sync-prod-to-backup 失敗:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});


/**
 * GET /api/admin/backup-status
 * 查詢備份 DB 各 table 筆數（自動探索所有 public table）
 */
router.get('/backup-status', verifyAdmin, async (req, res) => {
  const backupUrl = process.env.BACKUP_DATABASE_URL;
  if (!backupUrl) {
    return res.status(500).json({ success: false, message: 'BACKUP_DATABASE_URL 未設定' });
  }

  const pool = new Pool({ connectionString: backupUrl, max: 2, connectionTimeoutMillis: 5000 });
  try {
    const tables = await discoverTables(pool);
    const counts = {};
    for (const table of tables) {
      const { rows } = await pool.query(`SELECT COUNT(*) AS n FROM "${table}"`);
      counts[table] = parseInt(rows[0].n, 10);
    }
    res.json({ success: true, backup_db: counts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    await pool.end().catch(() => {});
  }
});

module.exports = router;
