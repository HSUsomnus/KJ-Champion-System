const cron = require('node-cron');
const { syncProdToBackup } = require('../services/backupSyncService');

let task = null;

const start = () => {
  if (!process.env.BACKUP_DATABASE_URL) {
    console.log('⚠️  backupSync: BACKUP_DATABASE_URL 未設定，排程停用');
    return;
  }

  // 每 8 小時整點執行（0:00, 8:00, 16:00 台北時間）
  task = cron.schedule('0 */8 * * *', async () => {
    try {
      await syncProdToBackup();
    } catch (err) {
      console.error('❌ 備份排程失敗:', err.message);
    }
  }, { timezone: 'Asia/Taipei' });

  console.log('⏰ 備份排程已啟動（每 8 小時，台北時間 0/8/16 點整）');
};

const stop = () => {
  if (task) {
    task.stop();
    task = null;
  }
};

module.exports = { start, stop };
