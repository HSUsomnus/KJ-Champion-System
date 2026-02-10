/**
 * Google Calendar Watch 服務
 * 管理 Calendar Push Notification 通道的建立、續期與查詢
 */

const { getCalendarClient, getGroupCalendarId } = require('../config/googleAuth');
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * 註冊 Calendar Watch 通道
 * @returns {Promise<Object>} Watch 通道資訊
 */
const registerWatch = async () => {
  try {
    const calendar = await getCalendarClient();
    const calendarId = getGroupCalendarId();
    const appUrl = process.env.APP_URL || process.env.VERCEL_URL || '';
    
    if (!appUrl) {
      throw new Error('缺少 APP_URL 環境變數，無法註冊 Calendar Watch');
    }
    
    const webhookUrl = `${appUrl.replace(/\/$/, '')}/api/calendar/webhook`;
    const channelId = `liff-calendar-${uuidv4()}`;
    
    // Watch 有效期限：7 天
    const expiration = Date.now() + (7 * 24 * 60 * 60 * 1000);
    
    console.log(`📡 註冊 Calendar Watch: ${webhookUrl}`);
    
    const response = await calendar.events.watch({
      calendarId: calendarId,
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        expiration: expiration,
      },
    });
    
    // 儲存 Watch 資訊至資料庫
    await db.query(`
      INSERT INTO calendar_watches (channel_id, resource_id, calendar_id, expiration)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (channel_id) DO UPDATE SET
        resource_id = EXCLUDED.resource_id,
        expiration = EXCLUDED.expiration
    `, [
      channelId,
      response.data.resourceId,
      calendarId,
      expiration,
    ]);
    
    console.log(`✅ Watch 註冊成功: ${channelId}, 到期時間: ${new Date(expiration).toISOString()}`);
    
    return {
      channelId: channelId,
      resourceId: response.data.resourceId,
      expiration: expiration,
    };
  } catch (error) {
    console.error('❌ 註冊 Calendar Watch 失敗:', error.message);
    throw error;
  }
};

/**
 * 停止 Calendar Watch 通道
 * @param {string} channelId - 通道 ID
 * @param {string} resourceId - 資源 ID
 */
const stopWatch = async (channelId, resourceId) => {
  try {
    const calendar = await getCalendarClient();
    
    await calendar.channels.stop({
      requestBody: {
        id: channelId,
        resourceId: resourceId,
      },
    });
    
    // 從資料庫刪除
    await db.query('DELETE FROM calendar_watches WHERE channel_id = $1', [channelId]);
    
    console.log(`✅ Watch 已停止: ${channelId}`);
  } catch (error) {
    console.error('❌ 停止 Watch 失敗:', error.message);
    throw error;
  }
};

/**
 * 取得所有 Watch 通道
 * @returns {Promise<Array>} Watch 通道陣列
 */
const getAllWatches = async () => {
  try {
    const result = await db.query('SELECT * FROM calendar_watches ORDER BY created_at DESC');
    return result.rows;
  } catch (error) {
    console.error('❌ 查詢 Watch 通道失敗:', error.message);
    return [];
  }
};

/**
 * 續期即將到期的 Watch 通道
 * 建議每天執行一次，檢查並續期 2 天內到期的通道
 * @returns {Promise<number>} 續期的通道數量
 */
const renewExpiringWatches = async () => {
  try {
    const watches = await getAllWatches();
    const now = Date.now();
    const twoDaysLater = now + (2 * 24 * 60 * 60 * 1000);
    
    let renewed = 0;
    
    for (const watch of watches) {
      if (watch.expiration < twoDaysLater) {
        console.log(`⚠️  Watch ${watch.channel_id} 即將到期，重新註冊...`);
        
        // 停止舊通道
        try {
          await stopWatch(watch.channel_id, watch.resource_id);
        } catch (error) {
          console.log('  (舊通道可能已失效，略過停止步驟)');
        }
        
        // 註冊新通道
        await registerWatch();
        renewed++;
      }
    }
    
    if (renewed === 0) {
      console.log('✅ 所有 Watch 通道仍有效，無需續期');
    } else {
      console.log(`✅ 已續期 ${renewed} 個 Watch 通道`);
    }
    
    return renewed;
  } catch (error) {
    console.error('❌ 續期 Watch 失敗:', error.message);
    throw error;
  }
};

module.exports = {
  registerWatch,
  stopWatch,
  getAllWatches,
  renewExpiringWatches,
};
