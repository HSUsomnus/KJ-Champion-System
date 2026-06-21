const { Pool } = require('pg');

const TABLES = ['members', 'events', 'financial_documents'];

/**
 * 全量覆蓋 prod DB → backup DB（每 8 小時排程 + 手動觸發）
 * 若 BACKUP_DATABASE_URL 未設定，直接跳過
 */
const syncProdToBackup = async () => {
  const backupUrl = process.env.BACKUP_DATABASE_URL;
  if (!backupUrl) {
    console.log('⚠️  backupSyncService: BACKUP_DATABASE_URL 未設定，跳過');
    return null;
  }

  const prodUrl = process.env.DATABASE_URL;
  if (!prodUrl) {
    throw new Error('DATABASE_URL 未設定');
  }

  const prodPool = new Pool({ connectionString: prodUrl, max: 3, connectionTimeoutMillis: 5000 });
  const backupPool = new Pool({ connectionString: backupUrl, max: 3, connectionTimeoutMillis: 5000 });
  const counts = {};

  try {
    console.log('🔄 開始 prod → backup 全量同步...');

    for (const table of TABLES) {
      const { rows } = await prodPool.query(`SELECT * FROM ${table}`);
      counts[table] = rows.length;

      const client = await backupPool.connect();
      try {
        await client.query('BEGIN');
        await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);

        if (rows.length > 0) {
          const cols = Object.keys(rows[0]);
          const colList = cols.map(c => `"${c}"`).join(', ');
          for (const row of rows) {
            const vals = cols.map((_, i) => `$${i + 1}`).join(', ');
            await client.query(
              `INSERT INTO ${table} (${colList}) VALUES (${vals})`,
              cols.map(c => row[c])
            );
          }
        }

        await client.query('COMMIT');
        console.log(`  ✅ ${table}: ${rows.length} 筆`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`同步 ${table} 失敗：${err.message}`);
      } finally {
        client.release();
      }
    }

    console.log('✅ prod → backup 同步完成', counts);
    return counts;
  } finally {
    await prodPool.end().catch(() => {});
    await backupPool.end().catch(() => {});
  }
};

module.exports = { syncProdToBackup };
