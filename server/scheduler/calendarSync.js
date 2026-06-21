const cron = require('node-cron');
const calendarSyncService = require('../services/calendarSyncService');

let task = null;

const runSync = async () => {
  console.log('🔄 [calendarSync] 定時同步觸發');
  try {
    const result = await calendarSyncService.syncRecentMonths();
    console.log(`✅ [calendarSync] 同步完成：synced=${result.synced}, deleted=${result.deleted}`);
  } catch (err) {
    console.error('❌ [calendarSync] 同步失敗:', err.message);
  }
};

const start = () => {
  if (task) return;
  task = cron.schedule('* * * * *', runSync, { timezone: 'Asia/Taipei' });
  console.log('📅 [calendarSync] 排程已啟動（每分鐘同步一次）');
};

const stop = () => {
  if (task) {
    task.stop();
    task = null;
    console.log('📅 [calendarSync] 排程已停止');
  }
};

module.exports = { start, stop };
