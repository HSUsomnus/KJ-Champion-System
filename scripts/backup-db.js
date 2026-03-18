/**
 * 資料庫手動備份腳本
 *
 * 用法：
 *   node scripts/backup-db.js
 *
 * 需求：
 *   - .env 已設定 DATABASE_URL
 *   - 已安裝 npm dependencies（npm install）
 *
 * 輸出：
 *   backups/backup-YYYY-MM-DD_HHMMSS.json
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// ── 設定 ────────────────────────────────────────────
const TABLES = [
  'members',
  'calendar_events',
  'event_participants',
  // 若有其他資料表，加在這裡
];

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
// ────────────────────────────────────────────────────

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ 未設定 DATABASE_URL，請確認 .env 檔案');
    process.exit(1);
  }

  // 建立備份目錄
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log('📁 建立備份目錄：backups/');
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 15000,
    ssl: process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  });

  const client = await pool.connect();
  console.log('✅ 資料庫連線成功\n');

  const backup = {
    timestamp: new Date().toISOString(),
    source: process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':***@'), // 隱藏密碼
    tables: {},
  };

  let totalRows = 0;

  try {
    for (const table of TABLES) {
      process.stdout.write(`  備份 ${table}... `);
      try {
        const res = await client.query(
          `SELECT * FROM "${table}" ORDER BY created_at DESC`
        );
        backup.tables[table] = {
          count: res.rows.length,
          columns: res.fields.map(f => f.name),
          rows: res.rows,
        };
        totalRows += res.rows.length;
        console.log(`${res.rows.length} 筆 ✅`);
      } catch (err) {
        console.log(`⚠️  略過（${err.message}）`);
        backup.tables[table] = { count: 0, rows: [], error: err.message };
      }
    }

    // 產生備份檔名（含時間戳記）
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/T/, '_')
      .replace(/:/g, '')
      .slice(0, 15); // 格式：2025-01-15_093045

    const filename = `backup-${timestamp}.json`;
    const filepath = path.join(BACKUP_DIR, filename);

    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf8');

    const fileSizeKB = (fs.statSync(filepath).size / 1024).toFixed(1);

    console.log('\n─────────────────────────────────');
    console.log(`📦 備份完成`);
    console.log(`   檔案：backups/${filename}`);
    console.log(`   大小：${fileSizeKB} KB`);
    console.log(`   總計：${totalRows} 筆資料`);
    console.log('─────────────────────────────────');
    console.log('\n💡 還原方式：node scripts/restore-db.js backups/' + filename);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('\n❌ 備份失敗：', err.message);
  process.exit(1);
});
