/**
 * 執行資料庫遷移腳本
 * 用法：node scripts/run-migration.js <migration_file>
 * 例如：node scripts/run-migration.js add_invited_by.sql
 */

const fs = require('fs');
const path = require('path');
const db = require('../server/config/db');

async function runMigration(filename) {
  try {
    // 讀取 SQL 檔案
    const sqlPath = path.join(__dirname, '../server/migrations', filename);
    
    if (!fs.existsSync(sqlPath)) {
      console.error(`❌ 找不到遷移檔案: ${sqlPath}`);
      process.exit(1);
    }
    
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log(`📂 執行遷移: ${filename}`);
    console.log('SQL 內容:');
    console.log('─'.repeat(50));
    console.log(sql);
    console.log('─'.repeat(50));
    
    // 執行 SQL
    await db.query(sql);
    
    console.log('✅ 遷移執行成功！');
    
  } catch (error) {
    console.error('❌ 遷移執行失敗:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    // 關閉資料庫連線
    await db.end();
  }
}

// 從命令列參數取得檔案名稱
const filename = process.argv[2];

if (!filename) {
  console.error('❌ 請提供遷移檔案名稱');
  console.log('用法: node scripts/run-migration.js <migration_file>');
  console.log('例如: node scripts/run-migration.js add_invited_by.sql');
  process.exit(1);
}

runMigration(filename);
