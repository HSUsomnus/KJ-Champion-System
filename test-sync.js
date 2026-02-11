/**
 * 測試腳本：手動觸發 Google Calendar 同步到 Supabase
 */

require('dotenv').config();
const calendarSyncService = require('./server/services/calendarSyncService');

async function testSync() {
  try {
    console.log('🔄 開始同步 Google Calendar 到 Supabase...');
    
    // 同步當月及前後兩個月的行程
    const result = await calendarSyncService.syncRecentMonths();
    
    console.log('✅ 同步完成:', result);
    process.exit(0);
  } catch (error) {
    console.error('❌ 同步失敗:', error);
    process.exit(1);
  }
}

testSync();
