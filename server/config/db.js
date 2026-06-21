/**
 * PostgreSQL 資料庫連線設定 (Supabase)
 * 使用 pg 套件連接 Supabase PostgreSQL
 */

const { Pool } = require('pg');
require('dotenv').config();
// 判斷執行環境
// Vercel Serverless：每個 Function 實例各自建立 pool，需嚴格限制連線數
// 否則多個實例同時啟動會超過 Supabase 免費版上限（約 15 條）
// Cloud Run / 本機：長時間運行的容器，可使用較大的連線池
const isServerless = !!(process.env.VERCEL || process.env.VERCEL_ENV);
const maxConnections = isServerless ? 2 : 10;

console.log(`🔌 DB 連線池：${isServerless ? 'Serverless 模式' : '容器/本機模式'}，max=${maxConnections}`);

// 建立連線池
// Supabase 建議使用 Transaction Mode (port 6543) 以支援 Serverless 環境
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: maxConnections,           // Serverless: 2，容器: 10
  idleTimeoutMillis: isServerless ? 10000 : 30000,   // Serverless 縮短閒置逾時
  connectionTimeoutMillis: 2000, // 連線建立逾時 2 秒
});

// 監聽連線錯誤
pool.on('error', (err) => {
  console.error('❌ PostgreSQL 連線池錯誤:', err);
});

/**
 * 執行查詢
 * @param {string} text - SQL 查詢語句
 * @param {Array} params - 查詢參數
 * @returns {Promise<Object>} 查詢結果
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('SQL 執行:', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('❌ SQL 執行錯誤:', { text, error: error.message });
    throw error;
  }
};

/**
 * 取得單一客戶端連線 (用於 Transaction)
 */
const getClient = async () => {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);
  
  // 設定逾時後自動釋放
  const timeout = setTimeout(() => {
    console.error('❌ 客戶端連線逾時，強制釋放');
    client.release();
  }, 5000);
  
  // 包裝 release 以清除逾時
  client.release = () => {
    clearTimeout(timeout);
    return release();
  };
  
  return client;
};

/**
 * 優雅關閉連線池
 */
const end = async () => {
  await pool.end();
  console.log('✅ PostgreSQL 連線池已關閉');
};

module.exports = {
  query,
  getClient,
  pool,
  end,
};
