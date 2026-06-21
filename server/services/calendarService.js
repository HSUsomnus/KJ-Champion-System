/**
 * 行事曆服務層
 * 處理所有與 Google Calendar 相關的業務邏輯
 *
 * 注意：所有 Calendar API 呼叫改用 raw https.request（calendarApiRequest），
 * 不再走 googleapis / gaxios，原因：gaxios@6+ 在 Zeabur 的 Node.js 18 環境
 * 使用 native fetch（undici），對 www.googleapis.com 連線 Premature close。
 */

const { getToken, calendarApiRequest, getGroupCalendarId } = require('../config/googleAuth');
const memberDbService = require('./memberDbService');
const eventDbService = require('./eventDbService');

/**
 * 行程類型 → Google Calendar colorId 對照表
 */
const EVENT_TYPE_COLOR_MAP = {
  '學員上課': '5',
  '活動': '11',
  '諮詢簽約': '10',
  '紫星行程聊聊': '3',
};

const getGoogleColorId = (type) => EVENT_TYPE_COLOR_MAP[type] || undefined;

/** 整日行程：把前端傳的 start/end 轉成 Google 的 date 格式 */
const toGoogleAllDayRange = (startISO, endISO) => {
  const startDate = String(startISO).trim().slice(0, 10);
  const endDateRaw = String(endISO).trim().slice(0, 10);
  const endDt = new Date(endDateRaw + 'T12:00:00');
  endDt.setDate(endDt.getDate() + 1);
  const endDate = endDt.toISOString().slice(0, 10);
  return { startDate, endDate };
};

/** Calendar API 路徑前綴 */
const calPath = (calendarId, suffix = '') =>
  `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events${suffix}`;

/** 把 Google 原始 event 物件轉成我們的格式 */
const toEvent = (event) => ({
  id: event.id,
  title: event.summary || '無標題',
  description: event.description || '',
  start: event.start?.dateTime || event.start?.date,
  end: event.end?.dateTime || event.end?.date,
  location: event.location || '',
  type: event.extendedProperties?.private?.type || '活動',
  creator: event.creator?.email || '',
  allDay: !event.start?.dateTime,
  isBirthdayEvent: event.extendedProperties?.private?.isBirthday === '1',
});

/**
 * 取得指定日期範圍的團體行程
 */
const getGroupEvents = async (timeMin, timeMax) => {
  try {
    const calendarId = getGroupCalendarId();
    if (!calendarId) throw new Error('Google Calendar 未設定');

    const token = await getToken();
    const qs = new URLSearchParams({
      timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime',
    });
    const { data } = await calendarApiRequest({
      method: 'GET',
      path: `${calPath(calendarId)}?${qs}`,
      token,
    });
    return (data.items || []).map(toEvent);
  } catch (error) {
    console.error('❌ 取得團體行程失敗:', error.message);
    throw new Error(`取得團體行程失敗: ${error.message}`);
  }
};

/**
 * 取得當日的團體行程
 */
const getTodayGroupEvents = async (date) => {
  const timeMin = `${date}T00:00:00+08:00`;
  const [y, m, d] = date.split('-').map(Number);
  const next = new Date(y, m - 1, d + 1);
  const nextStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
  const timeMax = `${nextStr}T00:00:00+08:00`;
  return getGroupEvents(timeMin, timeMax);
};

/**
 * 取得單一團體行程
 */
const getGroupEventById = async (eventId) => {
  const calendarId = getGroupCalendarId();
  if (!calendarId) throw new Error('Google Calendar 未設定');

  const token = await getToken();
  const { data } = await calendarApiRequest({
    method: 'GET',
    path: calPath(calendarId, `/${eventId}`),
    token,
  });
  return toEvent(data);
};

/**
 * 新增團體行程
 */
const createGroupEvent = async (eventData) => {
  try {
    const calendarId = getGroupCalendarId();
    if (!calendarId) throw new Error('Google Calendar 未設定，無法新增行程');

    const token = await getToken();

    const isAllDay = !!eventData.allDay;
    let startPayload, endPayload;
    if (isAllDay) {
      const { startDate, endDate } = toGoogleAllDayRange(eventData.start, eventData.end);
      startPayload = { date: startDate };
      endPayload = { date: endDate };
    } else {
      startPayload = { dateTime: eventData.start, timeZone: 'Asia/Taipei' };
      endPayload = { dateTime: eventData.end, timeZone: 'Asia/Taipei' };
    }

    const extendedPrivate = { type: eventData.type || '活動' };
    if (eventData.isBirthdayEvent) extendedPrivate.isBirthday = '1';

    const colorId = getGoogleColorId(eventData.type);
    const event = {
      summary: eventData.title,
      description: eventData.description || '',
      location: eventData.location || '',
      start: startPayload,
      end: endPayload,
      ...(colorId ? { colorId } : {}),
      extendedProperties: { private: extendedPrivate },
    };

    const { data } = await calendarApiRequest({
      method: 'POST',
      path: calPath(calendarId),
      body: event,
      token,
    });

    const newEvent = toEvent(data);

    try {
      await eventDbService.upsertEvents([newEvent]);
      console.log(`✅ 新增行程已同步到資料庫: ${newEvent.id}`);
    } catch (syncError) {
      console.error('⚠️  同步到資料庫失敗:', syncError.message);
    }

    return newEvent;
  } catch (error) {
    console.error('❌ 新增團體行程失敗:', error.message);
    throw new Error(`新增團體行程失敗: ${error.message}`);
  }
};

/**
 * 更新團體行程
 */
const updateGroupEvent = async (eventId, eventData) => {
  try {
    const calendarId = getGroupCalendarId();
    if (!calendarId) throw new Error('Google Calendar 未設定，無法更新行程');

    const token = await getToken();
    const patch = {};

    if (eventData.title !== undefined) patch.summary = eventData.title;
    if (eventData.description !== undefined) patch.description = eventData.description;
    if (eventData.location !== undefined) patch.location = eventData.location;

    const isAllDay = !!eventData.allDay;
    if (eventData.start && eventData.end) {
      if (isAllDay) {
        const { startDate, endDate } = toGoogleAllDayRange(eventData.start, eventData.end);
        patch.start = { date: startDate, dateTime: null };
        patch.end = { date: endDate, dateTime: null };
      } else {
        patch.start = { dateTime: eventData.start, timeZone: 'Asia/Taipei', date: null };
        patch.end = { dateTime: eventData.end, timeZone: 'Asia/Taipei', date: null };
      }
    }

    if (eventData.type) {
      patch.extendedProperties = { private: { type: eventData.type } };
      const colorId = getGoogleColorId(eventData.type);
      if (colorId) patch.colorId = colorId;
    }

    const { data } = await calendarApiRequest({
      method: 'PATCH',
      path: calPath(calendarId, `/${eventId}`),
      body: patch,
      token,
    });

    const updatedEvent = toEvent(data);

    try {
      await eventDbService.upsertEvents([updatedEvent]);
      console.log(`✅ 更新行程已同步到資料庫: ${updatedEvent.id}`);
    } catch (syncError) {
      console.error('⚠️  同步到資料庫失敗:', syncError.message);
    }

    return updatedEvent;
  } catch (error) {
    console.error('❌ 更新團體行程失敗:', error.message);
    throw new Error(`更新團體行程失敗: ${error.message}`);
  }
};

/**
 * 刪除團體行程
 */
const deleteGroupEvent = async (eventId) => {
  try {
    const calendarId = getGroupCalendarId();
    if (!calendarId) throw new Error('Google Calendar 未設定，無法刪除行程');

    const token = await getToken();
    await calendarApiRequest({
      method: 'DELETE',
      path: calPath(calendarId, `/${eventId}`),
      token,
    });

    try {
      await eventDbService.deleteEventById(eventId);
      console.log(`✅ 刪除行程已同步到資料庫: ${eventId}`);
    } catch (syncError) {
      console.error('⚠️  同步刪除到資料庫失敗:', syncError.message);
    }
  } catch (error) {
    console.error('❌ 刪除團體行程失敗:', error.message);
    throw new Error(`刪除團體行程失敗: ${error.message}`);
  }
};

/**
 * 取得指定月份的團體行程
 */
const getGroupEventsByMonth = async (year, month, type = null) => {
  const lastDay = new Date(year, month, 0);
  const timeMin = `${year}-${String(month).padStart(2, '0')}-01T00:00:00+08:00`;
  const timeMax = `${year}-${String(month).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}T23:59:59+08:00`;

  let events = await getGroupEvents(timeMin, timeMax);
  if (type) events = events.filter(e => e.type === type);
  return events;
};

/**
 * 從生日字串解析出月、日
 */
const parseBirthdayMonthDay = (birthdayStr) => {
  const s = String(birthdayStr || '').trim();
  if (!s) return null;
  const match = s.match(/^(?:\d{4}-)?(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { month, day };
};

/**
 * 確保指定日期範圍內，所有有生日的成員都有生日行程
 */
const ensureBirthdayEventsInRange = async (timeMin, timeMax) => {
  const calendarId = getGroupCalendarId();
  if (!calendarId) {
    console.warn('⚠️  Google Calendar 未設定，跳過生日行程檢查');
    return 0;
  }

  const startDate = String(timeMin).trim().slice(0, 10);
  const endDate = String(timeMax).trim().slice(0, 10);
  const startYear = parseInt(startDate.slice(0, 4), 10);
  const endYear = parseInt(endDate.slice(0, 4), 10);

  const members = await memberDbService.getAllMembers();
  const withBirthday = members.filter(m => (m.name || '').trim() && parseBirthdayMonthDay(m.birthday));

  let created = 0;
  for (const member of withBirthday) {
    const { month, day } = parseBirthdayMonthDay(member.birthday);
    const nameStr = member.name.trim();
    const title = `🎂 ${nameStr}生日`;
    const oldTitle = `${nameStr}生日`;

    for (let y = startYear; y <= endYear; y++) {
      const d = new Date(y, month - 1, day);
      if (d.getMonth() !== month - 1 || d.getDate() !== day) continue;
      const dateStr = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (dateStr < startDate || dateStr > endDate) continue;

      const dayMin = `${dateStr}T00:00:00+08:00`;
      const nextD = new Date(parseInt(dateStr.slice(0, 4)), parseInt(dateStr.slice(5, 7)) - 1, parseInt(dateStr.slice(8, 10)) + 1);
      const nextStr = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, '0')}-${String(nextD.getDate()).padStart(2, '0')}`;
      const dayMax = `${nextStr}T00:00:00+08:00`;

      const existing = await getGroupEvents(dayMin, dayMax);
      if (existing.some(ev => ev.title === title || ev.title === oldTitle)) continue;

      await createGroupEvent({
        title, description: '', start: dateStr, end: dateStr,
        allDay: true, location: '', type: '活動', isBirthdayEvent: true,
      });
      created += 1;
    }
  }
  return created;
};

/**
 * 同步成員生日行程
 */
const syncMemberBirthdayEvents = async (member) => {
  const calendarId = getGroupCalendarId();
  if (!calendarId) {
    console.warn('⚠️  Google Calendar 未設定，跳過生日行程同步');
    return 0;
  }

  const name = (member.name || '').trim();
  const parsed = parseBirthdayMonthDay(member.birthday);
  if (!name || !parsed) return 0;

  const { month, day } = parsed;
  const title = `🎂 ${name}生日`;
  const oldTitle = `${name}生日`;
  const year = new Date().getFullYear();
  const timeMin = `${year - 1}-01-01T00:00:00+08:00`;
  const timeMax = `${year + 1}-12-31T23:59:59+08:00`;

  const events = await getGroupEvents(timeMin, timeMax);
  const myBirthdayEvents = events.filter(ev => ev.title === title || ev.title === oldTitle);

  let updated = 0;
  for (const ev of myBirthdayEvents) {
    const startStr = (ev.start || '').slice(0, 10);
    if (startStr.length < 10) continue;
    const eventMonth = parseInt(startStr.slice(5, 7), 10);
    const eventDay = parseInt(startStr.slice(8, 10), 10);
    if (eventMonth === month && eventDay === day) continue;

    const eventYear = startStr.slice(0, 4);
    const newDate = `${eventYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    await updateGroupEvent(ev.id, { title, start: newDate, end: newDate, allDay: true });
    updated += 1;
  }
  return updated;
};

/**
 * 批次更新所有行程顏色 + 生日行程標題加 🎂
 */
const batchUpdateEventColors = async () => {
  const calendarId = getGroupCalendarId();
  if (!calendarId) throw new Error('Google Calendar 未設定，無法批次更新');

  const now = new Date();
  const timeMin = `${now.getFullYear() - 2}-01-01T00:00:00+08:00`;
  const timeMax = `${now.getFullYear() + 2}-12-31T23:59:59+08:00`;

  console.log(`🔍 開始掃描行程（${timeMin.slice(0, 10)} ～ ${timeMax.slice(0, 10)}）...`);

  const token = await getToken();
  let allEvents = [];
  let pageToken;

  do {
    const qs = new URLSearchParams({
      timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime', maxResults: '250',
      ...(pageToken ? { pageToken } : {}),
    });
    const { data } = await calendarApiRequest({
      method: 'GET',
      path: `${calPath(calendarId)}?${qs}`,
      token,
    });
    allEvents = allEvents.concat(data.items || []);
    pageToken = data.nextPageToken;
  } while (pageToken);

  console.log(`📋 共找到 ${allEvents.length} 筆行程`);

  let colorUpdated = 0, titleUpdated = 0, skipped = 0, errors = 0;

  for (const event of allEvents) {
    const eventType = event.extendedProperties?.private?.type || '';
    const hasBirthdayFlag = event.extendedProperties?.private?.isBirthday === '1';
    const expectedColorId = getGoogleColorId(eventType);
    const title = event.summary || '';
    const isBirthday = hasBirthdayFlag || (title.endsWith('生日') && !title.startsWith('🎂'));
    const needColorUpdate = expectedColorId && event.colorId !== expectedColorId;
    const needTitleUpdate = isBirthday && title && !title.startsWith('🎂');

    if (!needColorUpdate && !needTitleUpdate) { skipped += 1; continue; }

    try {
      const patch = {};
      const changes = [];
      if (needColorUpdate) { patch.colorId = expectedColorId; changes.push(`顏色 → ${expectedColorId}`); }
      if (needTitleUpdate) { patch.summary = `🎂 ${title}`; changes.push(`標題 → 🎂 ${title}`); }

      await calendarApiRequest({
        method: 'PATCH',
        path: calPath(calendarId, `/${event.id}`),
        body: patch,
        token,
      });

      console.log(`  ✅ "${title}" — ${changes.join('、')}`);
      if (needColorUpdate) colorUpdated += 1;
      if (needTitleUpdate) titleUpdated += 1;
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.error(`  ❌ "${title}" 更新失敗:`, err.message);
      errors += 1;
    }
  }

  const result = { total: allEvents.length, colorUpdated, titleUpdated, skipped, errors };
  console.log(`\n🎉 批次更新完成！`);
  console.log(`   行程總數：${result.total}`);
  console.log(`   顏色更新：${result.colorUpdated} 筆`);
  console.log(`   標題加 🎂：${result.titleUpdated} 筆`);
  console.log(`   已跳過：  ${result.skipped} 筆`);
  console.log(`   失敗：    ${result.errors} 筆`);
  return result;
};

module.exports = {
  getGroupEvents,
  getTodayGroupEvents,
  getGroupEventById,
  createGroupEvent,
  updateGroupEvent,
  deleteGroupEvent,
  getGroupEventsByMonth,
  ensureBirthdayEventsInRange,
  syncMemberBirthdayEvents,
  batchUpdateEventColors,
};
