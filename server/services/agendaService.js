/**
 * 每日行程推播服務層
 * 處理「每日定時推播明日行程」的核心邏輯
 */

const db = require('../config/db');
const eventDbService = require('./eventDbService');
const memberDbService = require('./memberDbService');
const lineService = require('./lineService');
const { isValidLineUserId } = require('../config/lineConfig');

/** 推播對象值對應的角色 */
const TARGET_ROLES = {
  all: ['一般人', '管理者', '負責人', '開發者'],
  manager_above: ['管理者', '負責人', '開發者'],
  developer: ['開發者'],
};

/**
 * 讀取推播設定（time / enabled / target）
 * @returns {Promise<{time: string, enabled: boolean, target: string}>}
 */
const getAgendaSettings = async () => {
  const result = await db.query(
    `SELECT key, value FROM system_settings WHERE key IN ($1, $2, $3)`,
    ['daily_agenda_time', 'daily_agenda_enabled', 'daily_agenda_target']
  );
  const map = {};
  result.rows.forEach((row) => { map[row.key] = row.value; });
  return {
    time: map.daily_agenda_time || '21:00',
    enabled: (map.daily_agenda_enabled || 'true') === 'true',
    target: map.daily_agenda_target || 'developer',
  };
};

/**
 * 更新推播設定並通知 scheduler 重排
 * @param {{time?: string, enabled?: boolean, target?: string}} updates
 * @returns {Promise<{time: string, enabled: boolean, target: string}>} 最新設定
 */
const updateAgendaSettings = async (updates) => {
  const entries = [];
  if (updates.time !== undefined) {
    if (!/^\d{2}:\d{2}$/.test(updates.time)) {
      throw new Error('時間格式錯誤，必須為 HH:MM');
    }
    entries.push(['daily_agenda_time', updates.time]);
  }
  if (updates.enabled !== undefined) {
    entries.push(['daily_agenda_enabled', updates.enabled ? 'true' : 'false']);
  }
  if (updates.target !== undefined) {
    if (!TARGET_ROLES[updates.target]) {
      throw new Error(`推播對象格式錯誤，必須為 ${Object.keys(TARGET_ROLES).join(' / ')}`);
    }
    entries.push(['daily_agenda_target', updates.target]);
  }

  for (const [key, value] of entries) {
    await db.query(
      `UPDATE system_settings SET value = $1, updated_at = NOW() WHERE key = $2`,
      [value, key]
    );
  }

  const latest = await getAgendaSettings();

  // 通知 scheduler 重排（動態 require 避免循環依賴）
  try {
    const scheduler = require('../scheduler/dailyAgenda');
    scheduler.reschedule(latest);
  } catch (err) {
    console.error('⚠️ scheduler reschedule 失敗:', err.message);
  }

  return latest;
};

/**
 * 取得明日的行程（台北時區 00:00 ~ 23:59）
 * @returns {Promise<Array>} 排序過的行程陣列
 */
const getTomorrowEvents = async () => {
  // 台北時區的「明天」
  const now = new Date();
  const taipeiNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  const tomorrow = new Date(taipeiNow);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');

  const timeMin = `${year}-${month}-${day}T00:00:00+08:00`;
  const timeMax = `${year}-${month}-${day}T23:59:59+08:00`;

  return await eventDbService.getEventsByRange(timeMin, timeMax);
};

/**
 * 依推播對象過濾成員
 * @param {Array} members - 成員陣列
 * @param {string} target - all / manager_above / developer
 * @returns {Array} 過濾後的成員
 */
const filterMembersByTarget = (members, target) => {
  const allowedRoles = TARGET_ROLES[target] || TARGET_ROLES.developer;
  return members.filter((m) => allowedRoles.includes(m.role));
};

/**
 * 將 YYYY-MM-DD 日期字串轉成台北時區中文日期顯示（M月D日 星期X）
 */
const formatTomorrowDateStr = () => {
  const now = new Date();
  const taipeiNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  const tomorrow = new Date(taipeiNow);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toLocaleDateString('zh-TW', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    timeZone: 'Asia/Taipei',
  });
};

/** 延遲 ms 毫秒 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 主流程：取明日行程 → 過濾成員 → 推播 LINE Flex
 * @returns {Promise<{totalMembers: number, sent: number, failed: number, eventCount: number, skipped?: boolean, reason?: string}>}
 */
const sendDailyAgenda = async () => {
  console.log('📬 每日行程推播：開始');

  const events = await getTomorrowEvents();
  console.log(`📬 明日行程共 ${events.length} 筆`);

  if (events.length === 0) {
    console.log('📬 明日無行程，跳過推播');
    return { totalMembers: 0, sent: 0, failed: 0, eventCount: 0, skipped: true, reason: 'no_events' };
  }

  const settings = await getAgendaSettings();
  if (!settings.enabled) {
    console.log('📬 推播已停用，跳過');
    return { totalMembers: 0, sent: 0, failed: 0, eventCount: events.length, skipped: true, reason: 'disabled' };
  }

  const allMembers = await memberDbService.getAllMembers();
  const targetMembers = filterMembersByTarget(allMembers, settings.target);
  const validMembers = targetMembers.filter((m) => isValidLineUserId(m.lineId));
  console.log(`📬 推播對象 ${settings.target}：${targetMembers.length} 位 / 有效 LINE ID ${validMembers.length} 位`);

  const dateStr = formatTomorrowDateStr();
  const flex = lineService.generateDailyAgendaFlexMessage(events, dateStr);
  const altText = `📅 明日行程（${dateStr}）共 ${events.length} 個行程`;
  const messages = [{ type: 'flex', altText, contents: flex }];

  let sent = 0;
  let failed = 0;
  for (const member of validMembers) {
    try {
      await lineService.pushMessagesToUser(member.lineId, messages);
      sent += 1;
    } catch (err) {
      failed += 1;
      console.error(`❌ 推播失敗（${member.name || member.lineId}）：${err.message}`);
    }
    await sleep(200); // 避免 LINE API rate limit
  }

  const result = {
    totalMembers: validMembers.length,
    sent,
    failed,
    eventCount: events.length,
  };
  console.log('✅ 每日行程推播完成:', result);
  return result;
};

module.exports = {
  TARGET_ROLES,
  getAgendaSettings,
  updateAgendaSettings,
  getTomorrowEvents,
  filterMembersByTarget,
  sendDailyAgenda,
};
