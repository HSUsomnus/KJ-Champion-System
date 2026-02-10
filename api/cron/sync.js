/**
 * Vercel Cron Handler：定時同步 Google Calendar 至 Supabase
 * 此檔案會被 Vercel Cron 自動呼叫
 */

require('dotenv').config();
const calendarSyncService = require('../../server/services/calendarSyncService');

module.exports = async (req, res) => {
  try {
    // 驗證請求來自 Vercel Cron
    const authHeader = req.headers.authorization;
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    console.log('⏰ Vercel Cron 觸發：開始同步 Calendar...');
    
    const result = await calendarSyncService.syncRecentMonths();
    
    console.log(`✅ Cron 同步完成: synced=${result.synced}, deleted=${result.deleted}`);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Cron 同步錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Cron 同步失敗',
    });
  }
};
