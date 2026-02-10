/**
 * 續期即將到期的 Calendar Watch 通道
 * 使用方式：node scripts/renew-calendar-watch.js
 * 建議透過 Vercel Cron 每天執行一次
 */

require('dotenv').config();
const calendarWatchService = require('../server/services/calendarWatchService');

async function renew() {
  try {
    console.log('🔄 檢查並續期即將到期的 Calendar Watch 通道...\n');
    
    const renewed = await calendarWatchService.renewExpiringWatches();
    
    if (renewed === 0) {
      console.log('✅ 無需續期，所有通道仍有效\n');
    } else {
      console.log(`\n✅ 已成功續期 ${renewed} 個通道\n`);
    }
    
  } catch (error) {
    console.error('\n❌ 續期失敗:', error);
    throw error;
  }
}

// 執行續期
if (require.main === module) {
  renew()
    .then(() => {
      console.log('🎉 續期腳本執行完畢');
      process.exit(0);
    })
    .catch((err) => {
      console.error('💥 續期腳本執行失敗:', err);
      process.exit(1);
    });
}

module.exports = { renew };
