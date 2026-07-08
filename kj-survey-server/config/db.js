/**
 * PostgreSQL 連線設定
 * 共用主系統既有 DB（不建新 DB），比照 server/config/db.js 的 pool 寫法
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL 連線池錯誤:', err);
});

const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    console.log('SQL 執行:', { text, duration: Date.now() - start, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('❌ SQL 執行錯誤:', { text, error: error.message });
    throw error;
  }
};

module.exports = { query, pool };
