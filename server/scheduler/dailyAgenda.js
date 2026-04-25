/**
 * 每日行程推播排程器
 * 使用 node-cron，timezone 固定為 Asia/Taipei
 */

const cron = require('node-cron');
const agendaService = require('../services/agendaService');

let task = null;

/**
 * 將 HH:MM 格式時間轉成 cron 表達式
 * @param {string} timeStr - 例 "21:00"
 * @returns {string} 例 "0 21 * * *"
 */
const timeToCronExpr = (timeStr) => {
  const [h, m] = timeStr.split(':').map((n) => parseInt(n, 10));
  return `${m} ${h} * * *`;
};

/**
 * 執行推播（包 try/catch 避免 cron callback 拋錯）
 */
const runPush = async () => {
  console.log('⏰ 每日行程推播：定時觸發');
  try {
    await agendaService.sendDailyAgenda();
  } catch (err) {
    console.error('❌ 每日行程推播失敗:', err.message);
  }
};

/**
 * 啟動排程（從 DB 讀取設定）
 */
const start = async () => {
  try {
    const settings = await agendaService.getAgendaSettings();
    if (!settings.enabled) {
      console.log('📅 每日行程推播：已停用（daily_agenda_enabled=false）');
      return;
    }
    const cronExpr = timeToCronExpr(settings.time);
    task = cron.schedule(cronExpr, runPush, {
      timezone: 'Asia/Taipei',
      scheduled: true,
    });
    console.log(`📅 每日行程推播：已排程（${cronExpr} Asia/Taipei，對象：${settings.target}）`);
  } catch (err) {
    console.error('❌ 每日行程推播排程啟動失敗:', err.message);
  }
};

/**
 * 停止排程
 */
const stop = () => {
  if (task) {
    task.stop();
    task = null;
    console.log('📅 每日行程推播：已停止');
  }
};

/**
 * 依新設定重排（updateAgendaSettings 呼叫）
 * @param {{time: string, enabled: boolean, target: string}} settings
 */
const reschedule = (settings) => {
  stop();
  if (!settings.enabled) {
    console.log('📅 每日行程推播：已停用（重排時 enabled=false）');
    return;
  }
  const cronExpr = timeToCronExpr(settings.time);
  task = cron.schedule(cronExpr, runPush, {
    timezone: 'Asia/Taipei',
    scheduled: true,
  });
  console.log(`📅 每日行程推播：已重新排程（${cronExpr} Asia/Taipei，對象：${settings.target}）`);
};

module.exports = { start, stop, reschedule };
