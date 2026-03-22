/**
 * 雙寫服務（DualWrite）
 * 主庫（Zeabur PostgreSQL）寫入成功後，fire-and-forget 備份寫入 Supabase。
 * 環境變數：
 *   DUAL_WRITE_ENABLED=true          開啟雙寫
 *   SUPABASE_BACKUP_URL=postgresql://... Supabase 備份庫連線字串
 */

const { Pool } = require('pg');

const enabled = process.env.DUAL_WRITE_ENABLED === 'true';
const isServerless = !!(process.env.VERCEL || process.env.VERCEL_ENV);

let backupPool = null;

if (enabled && process.env.SUPABASE_BACKUP_URL) {
  backupPool = new Pool({
    connectionString: process.env.SUPABASE_BACKUP_URL,
    max: isServerless ? 1 : 3,
    idleTimeoutMillis: isServerless ? 10000 : 30000,
    connectionTimeoutMillis: 3000,
    ssl: { rejectUnauthorized: false },
  });
  backupPool.on('error', (err) => {
    console.warn('[DualWrite] 備份連線池錯誤:', err.message);
  });
  console.log('🔄 DualWrite: 已啟用 Supabase 備份寫入');
} else if (enabled) {
  console.warn('⚠️  DualWrite: DUAL_WRITE_ENABLED=true 但缺少 SUPABASE_BACKUP_URL，雙寫已停用');
}

/**
 * 雙寫包裝器：主庫寫入成功後，非同步備份到 Supabase
 * @param {Function} primaryFn - 主庫寫入，失敗直接拋錯
 * @param {Function} backupFn  - 備份庫寫入，失敗只 warn，不影響主流程
 * @returns {Promise<any>} 主庫寫入結果
 */
const dualWrite = async (primaryFn, backupFn) => {
  const result = await primaryFn();
  if (backupPool) {
    backupFn().catch((err) =>
      console.warn('[DualWrite] Supabase backup failed:', err.message)
    );
  }
  return result;
};

/**
 * 對備份庫執行查詢（供各 service 建立 backupFn 使用）
 * @param {string} text   - SQL 語句
 * @param {Array}  params - 查詢參數
 */
const backupQuery = (text, params) => {
  if (!backupPool) return Promise.reject(new Error('備份連線池未初始化'));
  return backupPool.query(text, params);
};

/**
 * 從備份庫取得 client（用於 Transaction）
 */
const backupGetClient = () => {
  if (!backupPool) return Promise.reject(new Error('備份連線池未初始化'));
  return backupPool.connect();
};

module.exports = {
  dualWrite,
  backupQuery,
  backupGetClient,
  isEnabled: () => enabled && !!backupPool,
};
