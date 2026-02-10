/**
 * 初次同步腳本：將 Google Calendar 行程匯入 Supabase PostgreSQL
 * 使用方式：node scripts/sync-calendar-to-supabase.js
 */

require('dotenv').config();
const calendarSyncService = require('../server/services/calendarSyncService');

async function initialSync() {
  try {
    console.log('🔄 開始初次同步 Google Calendar 行程至 Supabase...\n');
    
    // 同步過去 2 個月到未來 3 個月的行程
    const now = new Date();
    
    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - 2);
    startDate.setDate(1);
    
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 4);
    endDate.setDate(0);
    
    const timeMin = startDate.toISOString();
    const timeMax = endDate.toISOString();
    
    console.log(`📅 同步範圍: ${timeMin.split('T')[0]} ~ ${timeMax.split('T')[0]}\n`);
    
    const result = await calendarSyncService.syncFromCalendar(timeMin, timeMax);
    
    console.log('\n✅ 初次同步完成！');
    console.log(`   - 同步: ${result.synced} 筆行程`);
    console.log(`   - 刪除: ${result.deleted} 筆過期行程`);
    console.log(`   - 總計: ${result.total} 筆行程\n`);
    
  } catch (error) {
    console.error('\n❌ 同步失敗:', error);
    throw error;
  }
}

// 執行同步
if (require.main === module) {
  initialSync()
    .then(() => {
      console.log('🎉 初次同步腳本執行完畢');
      process.exit(0);
    })
    .catch((err) => {
      console.error('💥 同步腳本執行失敗:', err);
      process.exit(1);
    });
}

module.exports = { initialSync };
