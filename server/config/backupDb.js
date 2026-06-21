const { Pool } = require('pg');

const BACKUP_DATABASE_URL = process.env.BACKUP_DATABASE_URL;

let pool = null;

if (BACKUP_DATABASE_URL) {
  pool = new Pool({
    connectionString: BACKUP_DATABASE_URL,
    max: 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 3000,
  });

  pool.on('error', (err) => {
    console.error('❌ 備份 DB 連線池錯誤:', err.message);
  });

  console.log('🔌 備份 DB 連線池已啟動');
} else {
  console.log('⚠️  BackupDB: BACKUP_DATABASE_URL 未設定，備份功能停用');
}

const query = async (text, params) => {
  if (!pool) return null;
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    console.error('❌ 備份 DB 寫入失敗:', err.message, '| SQL:', text.substring(0, 80));
    throw err;
  }
};

module.exports = { query, pool };
