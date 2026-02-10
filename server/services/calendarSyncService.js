/**
 * Google Calendar 同步服務
 * 將 Google Calendar 資料同步至 Supabase PostgreSQL
 */

const calendarService = require('./calendarService');
const eventDbService = require('./eventDbService');

/**
 * 從 Google Calendar 同步行程至 Supabase
 * @param {string} timeMin - 同步範圍開始時間 (ISO 8601)
 * @param {string} timeMax - 同步範圍結束時間 (ISO 8601)
 * @returns {Promise<Object>} 同步結果統計
 */
const syncFromCalendar = async (timeMin, timeMax) => {
  try {
    console.log(`🔄 開始同步 Google Calendar: ${timeMin} ~ ${timeMax}`);
    
    // 1. 從 Google Calendar 取得行程
    const calendarEvents = await calendarService.getGroupEvents(timeMin, timeMax);
    console.log(`✅ 從 Calendar 取得 ${calendarEvents.length} 筆行程`);
    
    // 2. Upsert 到 Supabase (新增或更新)
    const upserted = await eventDbService.upsertEvents(calendarEvents);
    console.log(`✅ Upsert ${upserted} 筆行程至 Supabase`);
    
    // 3. 刪除 Supabase 中有、但 Calendar 已移除的行程
    const googleEventIds = calendarEvents.map(e => e.id);
    const deleted = await eventDbService.deleteEventsNotIn(googleEventIds, timeMin, timeMax);
    if (deleted > 0) {
      console.log(`✅ 刪除 ${deleted} 筆已從 Calendar 移除的行程`);
    }
    
    return {
      success: true,
      synced: upserted,
      deleted: deleted,
      total: calendarEvents.length,
    };
  } catch (error) {
    console.error('❌ 同步失敗:', error.message);
    throw error;
  }
};

/**
 * 同步當月及前後兩個月的行程（建議的同步範圍）
 * @returns {Promise<Object>} 同步結果
 */
const syncRecentMonths = async () => {
  const now = new Date();
  
  // 前兩個月
  const startDate = new Date(now);
  startDate.setMonth(startDate.getMonth() - 2);
  startDate.setDate(1);
  
  // 後兩個月
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + 3);
  endDate.setDate(0); // 上個月最後一天
  
  const timeMin = startDate.toISOString();
  const timeMax = endDate.toISOString();
  
  return await syncFromCalendar(timeMin, timeMax);
};

/**
 * 處理 Google Calendar Push Notification Webhook
 * 當收到 Google 的變更通知時，觸發同步
 * @param {Object} headers - Webhook request headers
 * @returns {Promise<Object>} 處理結果
 */
const handleWebhook = async (headers) => {
  try {
    const resourceState = headers['x-goog-resource-state'];
    const channelId = headers['x-goog-channel-id'];
    
    console.log(`📬 收到 Calendar Webhook: state=${resourceState}, channel=${channelId}`);
    
    // sync 表示有變更，exists 是初始化確認
    if (resourceState === 'sync') {
      console.log('⏭️  初始化通知，略過');
      return { success: true, action: 'skipped', reason: 'sync notification' };
    }
    
    if (resourceState === 'exists') {
      console.log('🔄 Calendar 有變更，觸發同步');
      const result = await syncRecentMonths();
      return { success: true, action: 'synced', ...result };
    }
    
    return { success: true, action: 'unknown', resourceState };
  } catch (error) {
    console.error('❌ Webhook 處理失敗:', error.message);
    throw error;
  }
};

module.exports = {
  syncFromCalendar,
  syncRecentMonths,
  handleWebhook,
};
