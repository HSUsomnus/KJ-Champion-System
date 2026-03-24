/**
 * 資料庫還原腳本
 *
 * 用法：
 *   node scripts/restore-db.js backups/backup-2025-01-15_093045.json
 *
 * ⚠️  警告：還原會清空指定資料表後重新寫入，請確認後再執行
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function main() {
  const backupFile = process.argv[2];

  if (!backupFile) {
    console.error('❌ 請指定備份檔案路徑');
    console.error('   用法：node scripts/restore-db.js backups/backup-YYYY-MM-DD_HHMMSS.json');
    process.exit(1);
  }

  const filepath = path.isAbsolute(backupFile)
    ? backupFile
    : path.join(__dirname, '..', backupFile);

  if (!fs.existsSync(filepath)) {
    console.error('❌ 找不到備份檔案：', filepath);
    process.exit(1);
  }

  const backup = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  const tables = Object.keys(backup.tables);
  const totalRows = tables.reduce((s, t) => s + backup.tables[t].count, 0);

  console.log('\n📋 備份資訊：');
  console.log(`   備份時間：${backup.timestamp}`);
  console.log(`   資料來源：${backup.source}`);
  console.log(`   資料表數：${tables.length}`);
  tables.forEach(t => console.log(`     - ${t}：${backup.tables[t].count} 筆`));
  console.log(`   總計：${totalRows} 筆\n`);

  const answer = await confirm('⚠️  確定要還原？這會清空上述資料表後重新寫入。\n   輸入 "yes" 確認：');

  if (answer !== 'yes') {
    console.log('已取消還原。');
    process.exit(0);
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
  console.log('\n✅ 資料庫連線成功，開始還原...\n');

  try {
    await client.query('BEGIN');

    for (const table of tables) {
      const tableData = backup.tables[table];
      if (tableData.error || tableData.count === 0) {
        console.log(`  略過 ${table}（無資料或原備份失敗）`);
        continue;
      }

      process.stdout.write(`  還原 ${table}（${tableData.count} 筆）... `);

      // 清空資料表（保留 schema）
      await client.query(`DELETE FROM "${table}"`);

      // 逐筆插入
      let inserted = 0;
      for (const row of tableData.rows) {
        const cols = Object.keys(row);
        const vals = Object.values(row);
        const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
        const colNames = cols.map(c => `"${c}"`).join(', ');

        await client.query(
          `INSERT INTO "${table}" (${colNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          vals
        );
        inserted++;
      }

      console.log(`${inserted} 筆 ✅`);
    }

    await client.query('COMMIT');
    console.log('\n✅ 還原完成！');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ 還原失敗，已回滾：', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
