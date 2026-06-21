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
 * GET /api/admin/export-backup-csv?table=members
 * 從 backup DB 匯出指定 table 為 CSV 下載（backup DB 走內網，不需開公網）
 * 用途：手動下載後再用 import-csv-to-dev.js 匯入 dev DB
 */
router.get('/export-backup-csv', verifyAdmin, async (req, res) => {
  const backupUrl = process.env.BACKUP_DATABASE_URL;
  if (!backupUrl) {
    return res.status(500).json({ success: false, message: 'BACKUP_DATABASE_URL 未設定' });
  }

  const table = req.query.table;
  if (!table || !/^[a-z_]+$/.test(table)) {
    return res.status(400).json({ success: false, message: '請提供合法的 table 名稱，例如 ?table=members' });
  }

  const pool = new Pool({ connectionString: backupUrl, max: 2, connectionTimeoutMillis: 5000 });
  try {
    const { rows } = await pool.query(`SELECT * FROM "${table}"`);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: `${table} 無資料` });
    }

    const cols = Object.keys(rows[0]);

    function toCSVField(value) {
      if (value === null || value === undefined) return '';
      const s = value instanceof Date ? value.toISOString() : String(value);
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }

    const lines = [
      cols.join(','),
      ...rows.map(row => cols.map(c => toCSVField(row[c])).join(',')),
    ];

    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${table}-backup-${date}.csv"`);
    res.send(lines.join('\n'));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    await pool.end().catch(() => {});
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
