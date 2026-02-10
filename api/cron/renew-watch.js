/**
 * Vercel Cron Handler：續期 Calendar Watch 通道
 * 此檔案會被 Vercel Cron 自動呼叫
 */

require('dotenv').config();
const calendarWatchService = require('../../server/services/calendarWatchService');

module.exports = async (req, res) => {
  try {
    // 驗證請求來自 Vercel Cron
    const authHeader = req.headers.authorization;
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    console.log('⏰ Vercel Cron 觸發：檢查 Watch 續期...');
    
    const renewed = await calendarWatchService.renewExpiringWatches();
    
    res.json({
      success: true,
      renewed: renewed,
      message: renewed > 0 ? `已續期 ${renewed} 個通道` : '無需續期',
    });
  } catch (error) {
    console.error('❌ Cron 續期錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Cron 續期失敗',
    });
  }
};
