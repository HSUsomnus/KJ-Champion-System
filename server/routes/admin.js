const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { syncProdToBackup } = require('../services/backupSyncService');

const TABLES = ['members', 'events', 'financial_documents'];

const verifyAdmin = (req, res, next) => {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!process.env.ADMIN_SECRET || token !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ success: false, message: '未授權' });
  }
  next();
};

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
 * POST /api/admin/sync-backup-to-dev
 * 把備份 DB 的資料全量覆蓋到 dev DB（per-table TRUNCATE + INSERT）
 */
router.post('/sync-backup-to-dev', verifyAdmin, async (req, res) => {
  const backupUrl = process.env.BACKUP_DATABASE_URL;
  const devUrl = process.env.DEV_DATABASE_URL;

  if (!backupUrl || !devUrl) {
    return res.status(500).json({
      success: false,
      message: 'BACKUP_DATABASE_URL 或 DEV_DATABASE_URL 未設定',
    });
  }

  const backupPool = new Pool({ connectionString: backupUrl, max: 3, connectionTimeoutMillis: 5000 });
  const devPool = new Pool({ connectionString: devUrl, max: 3, connectionTimeoutMillis: 5000 });
  const counts = {};

  try {
    for (const table of TABLES) {
      const { rows } = await backupPool.query(`SELECT * FROM ${table}`);
      counts[table] = rows.length;

      const devClient = await devPool.connect();
      try {
        await devClient.query('BEGIN');
        await devClient.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);

        if (rows.length > 0) {
          const cols = Object.keys(rows[0]);
          const colList = cols.map(c => `"${c}"`).join(', ');
          for (const row of rows) {
            const vals = cols.map((_, i) => `$${i + 1}`).join(', ');
            await devClient.query(
              `INSERT INTO ${table} (${colList}) VALUES (${vals})`,
              cols.map(c => row[c])
            );
          }
        }

        await devClient.query('COMMIT');
      } catch (err) {
        await devClient.query('ROLLBACK');
        throw new Error(`同步 ${table} 失敗：${err.message}`);
      } finally {
        devClient.release();
      }
    }

    res.json({ success: true, tables: counts });
  } catch (err) {
    console.error('❌ sync-backup-to-dev 失敗:', err.message);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    await backupPool.end().catch(() => {});
    await devPool.end().catch(() => {});
  }
});

/**
 * GET /api/admin/backup-status
 * 查詢備份 DB 各 table 筆數
 */
router.get('/backup-status', verifyAdmin, async (req, res) => {
  const backupUrl = process.env.BACKUP_DATABASE_URL;
  if (!backupUrl) {
    return res.status(500).json({ success: false, message: 'BACKUP_DATABASE_URL 未設定' });
  }

  const pool = new Pool({ connectionString: backupUrl, max: 2, connectionTimeoutMillis: 5000 });
  try {
    const counts = {};
    for (const table of TABLES) {
      const { rows } = await pool.query(`SELECT COUNT(*) AS n FROM ${table}`);
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
