/**
 * 註冊 Google Calendar Watch 通道
 * 使用方式：node scripts/register-calendar-watch.js
 */

require('dotenv').config();
const calendarWatchService = require('../server/services/calendarWatchService');

async function register() {
  try {
    console.log('📡 開始註冊 Google Calendar Watch 通道...\n');
    
    const result = await calendarWatchService.registerWatch();
    
    console.log('\n✅ Watch 通道註冊成功！');
    console.log(`   - Channel ID: ${result.channelId}`);
    console.log(`   - Resource ID: ${result.resourceId}`);
    console.log(`   - 到期時間: ${new Date(result.expiration).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`);
    console.log(`\n📌 提醒：Watch 約 7 天後到期，請設定 Cron 定期續期\n`);
    
  } catch (error) {
    console.error('\n❌ 註冊失敗:', error);
    throw error;
  }
}

// 執行註冊
if (require.main === module) {
  register()
    .then(() => {
      console.log('🎉 註冊腳本執行完畢');
      process.exit(0);
    })
    .catch((err) => {
      console.error('💥 註冊腳本執行失敗:', err);
      process.exit(1);
    });
}

module.exports = { register };
