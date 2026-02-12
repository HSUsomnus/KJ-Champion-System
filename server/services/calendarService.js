/**
 * 行事曆服務層
 * 處理所有與 Google Calendar 相關的業務邏輯
 */

const { getCalendarClient, getGroupCalendarId } = require('../config/googleAuth');
const memberDbService = require('./memberDbService');
const eventDbService = require('./eventDbService');

/**
 * 行程類型 → Google Calendar colorId 對照表
 * Google Calendar 有 11 種內建顏色（數字 1~11）
 * 這裡讓顏色盡量跟 LIFF 前端的分類顏色一致
 *   學員上課 → 5（Banana 香蕉黃）
 *   活動     → 11（Tomato 番茄紅）
 *   諮詢簽約 → 10（Basil 羅勒綠）
 */
const EVENT_TYPE_COLOR_MAP = {
  '學員上課': '5',   // 黃色 — 對應 LIFF 的 #FBC02D
  '活動': '11',      // 紅色 — 對應 LIFF 的 #E53935
  '諮詢簽約': '10',  // 綠色 — 對應 LIFF 的 #4CAF50
};

/**
 * 根據行程類型取得 Google Calendar colorId
 * 如果找不到對應的類型，就回傳 undefined（使用日曆預設顏色）
 * @param {string} type - 行程類型
 * @returns {string|undefined} Google Calendar colorId
 */
const getGoogleColorId = (type) => EVENT_TYPE_COLOR_MAP[type] || undefined;

/**
 * 取得指定日期範圍的團體行程
 * @param {string} timeMin - 開始時間 (ISO 8601 格式)
 * @param {string} timeMax - 結束時間 (ISO 8601 格式)
 * @returns {Promise<Array>} 行程陣列
 */
const getGroupEvents = async (timeMin, timeMax) => {
  try {
    const calendar = await getCalendarClient();
    const calendarId = getGroupCalendarId();
    
    if (!calendar || !calendarId) {
      throw new Error('Google Calendar 未設定');
    }

    // 呼叫 Google Calendar API 取得事件列表
    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: timeMin,
      timeMax: timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });

    // 轉換成我們需要的格式（含是否為系統生成的生日行程，此類不可編輯/刪除）
    const events = (response.data.items || []).map(event => ({
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
    }));

    return events;
  } catch (error) {
    console.error('❌ 取得團體行程失敗:', error.message);
    throw new Error(`取得團體行程失敗: ${error.message}`);
  }
};

/**
 * 取得當日的團體行程
 * timeMax 用次日 00:00:00，確保整日行程（如生日）會被 Google API 列入
 * @param {string} date - 日期 (YYYY-MM-DD 格式)
 * @returns {Promise<Array>} 當日行程陣列
 */
const getTodayGroupEvents = async (date) => {
  const timeMin = `${date}T00:00:00+08:00`;
  const [y, m, d] = date.split('-').map(Number);
  const next = new Date(y, m - 1, d + 1);
  const nextStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
  const timeMax = `${nextStr}T00:00:00+08:00`;

  return await getGroupEvents(timeMin, timeMax);
};

/**
 * 整日行程：把前端傳的 start/end 轉成 Google 的 date 格式
 * Google 整日用 start.date / end.date，且 end 為「隔天」（不包含當天）
 * 例：單日 1/15 → start.date=2025-01-15, end.date=2025-01-16
 */
const toGoogleAllDayRange = (startISO, endISO) => {
  const startDate = String(startISO).trim().slice(0, 10);
  const endDateRaw = String(endISO).trim().slice(0, 10);
  const endDt = new Date(endDateRaw + 'T12:00:00');
  endDt.setDate(endDt.getDate() + 1);
  const endDate = endDt.toISOString().slice(0, 10);
  return { startDate, endDate };
};

/**
 * 從生日字串解析出月、日（支援 YYYY-MM-DD 或 MM-DD）
 * @param {string} birthdayStr - 生日字串
 * @returns {{ month: number, day: number } | null}
 */
const parseBirthdayMonthDay = (birthdayStr) => {
  const s = String(birthdayStr || '').trim();
  if (!s) return null;
  // 支援 YYYY-MM-DD（取後半 MM-DD）或 MM-DD
  const match = s.match(/^(?:\d{4}-)?(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { month, day };
};

/**
 * 確保指定日期範圍內，所有有生日的成員都有一筆「真實姓名+生日」的整日活動
 * 若該日已有同名生日行程則不重複建立
 * @param {string} timeMin - 開始時間 (ISO 8601)
 * @param {string} timeMax - 結束時間 (ISO 8601)
 * @returns {Promise<number>} 本次新建立的生日行程數量
 */
const ensureBirthdayEventsInRange = async (timeMin, timeMax) => {
  // 檢查 Google Calendar 是否可用
  const calendar = await getCalendarClient();
  const calendarId = getGroupCalendarId();
  if (!calendar || !calendarId) {
    console.warn('⚠️  Google Calendar 未設定，跳過生日行程檢查');
    return 0;
  }

  const startDate = String(timeMin).trim().slice(0, 10);
  const endDate = String(timeMax).trim().slice(0, 10);
  const startYear = parseInt(startDate.slice(0, 4), 10);
  const endYear = parseInt(endDate.slice(0, 4), 10);

  const members = await memberDbService.getAllMembers();
  const withBirthday = members.filter(m => {
    const name = (m.name || '').trim();
    const parsed = parseBirthdayMonthDay(m.birthday);
    return name && parsed;
  });

  let created = 0;
  for (const member of withBirthday) {
    const { month, day } = parseBirthdayMonthDay(member.birthday);
    const title = `${member.name.trim()}生日`;

    for (let y = startYear; y <= endYear; y++) {
      const d = new Date(y, month - 1, day);
      if (d.getMonth() !== month - 1 || d.getDate() !== day) continue; // 無效日如 2/30
      const dateStr = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (dateStr < startDate || dateStr > endDate) continue;

      const dayMin = `${dateStr}T00:00:00+08:00`;
      const [dy, dm, dd] = dateStr.split('-').map(Number);
      const nextD = new Date(dy, dm - 1, dd + 1);
      const nextStr = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, '0')}-${String(nextD.getDate()).padStart(2, '0')}`;
      const dayMax = `${nextStr}T00:00:00+08:00`;
      const existing = await getGroupEvents(dayMin, dayMax);
      const hasBirthday = existing.some(ev => ev.title === title);
      if (hasBirthday) continue;

      await createGroupEvent({
        title,
        description: '',
        start: dateStr,
        end: dateStr,
        allDay: true,
        location: '',
        type: '活動',
        isBirthdayEvent: true,
      });
      created += 1;
    }
  }
  return created;
};

/**
 * 檢查並更新該成員的生日行程：若日曆上「真實姓名+生日」的行程日期與成員目前生日不符，則更新為新日期
 * （例如用戶在個人資料改了生日，每次進入 LIFF 時會把既有生日行程改到正確的月日）
 * @param {Object} member - 成員物件（至少含 name、birthday）
 * @returns {Promise<number>} 被更新的行程數量
 */
const syncMemberBirthdayEvents = async (member) => {
  // 檢查 Google Calendar 是否可用
  const calendar = await getCalendarClient();
  const calendarId = getGroupCalendarId();
  if (!calendar || !calendarId) {
    console.warn('⚠️  Google Calendar 未設定，跳過生日行程同步');
    return 0;
  }

  const name = (member.name || '').trim();
  const parsed = parseBirthdayMonthDay(member.birthday);
  if (!name || !parsed) return 0;

  const { month, day } = parsed;
  const title = `${name}生日`;
  const year = new Date().getFullYear();
  const timeMin = `${year - 1}-01-01T00:00:00+08:00`;
  const timeMax = `${year + 1}-12-31T23:59:59+08:00`;

  const events = await getGroupEvents(timeMin, timeMax);
  const myBirthdayEvents = events.filter(ev => ev.title === title);

  let updated = 0;
  for (const ev of myBirthdayEvents) {
    const startStr = (ev.start || '').slice(0, 10);
    if (startStr.length < 10) continue;
    const eventMonth = parseInt(startStr.slice(5, 7), 10);
    const eventDay = parseInt(startStr.slice(8, 10), 10);
    if (eventMonth === month && eventDay === day) continue;

    const eventYear = startStr.slice(0, 4);
    const newDate = `${eventYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    await updateGroupEvent(ev.id, {
      title,
      start: newDate,
      end: newDate,
      allDay: true,
    });
    updated += 1;
  }
  return updated;
};

/**
 * 新增團體行程
 * @param {Object} eventData - 行程資料
 * @param {string} eventData.title - 行程標題
 * @param {string} eventData.description - 行程描述
 * @param {string} eventData.start - 開始時間（ISO 字串）
 * @param {string} eventData.end - 結束時間（ISO 字串）
 * @param {boolean} eventData.allDay - 是否整日（整日時用 date 寫入 Google）
 * @param {string} eventData.location - 地點
 * @param {string} eventData.type - 行程類型（學員上課、活動、諮詢簽約）
 * @param {boolean} [eventData.isBirthdayEvent] - 是否為系統生成的生日行程（寫入 Google 後不可編輯/刪除）
 * @returns {Promise<Object>} 新增的行程物件
 */
const createGroupEvent = async (eventData) => {
  try {
    const calendar = await getCalendarClient();
    const calendarId = getGroupCalendarId();
    
    if (!calendar || !calendarId) {
      throw new Error('Google Calendar 未設定，無法新增行程');
    }

    const isAllDay = !!eventData.allDay;
    let startPayload;
    let endPayload;

    if (isAllDay) {
      const { startDate, endDate } = toGoogleAllDayRange(eventData.start, eventData.end);
      startPayload = { date: startDate };
      endPayload = { date: endDate };
    } else {
      startPayload = { dateTime: eventData.start, timeZone: 'Asia/Taipei' };
      endPayload = { dateTime: eventData.end, timeZone: 'Asia/Taipei' };
    }

    const extendedPrivate = {
      type: eventData.type || '活動',
    };
    if (eventData.isBirthdayEvent) {
      extendedPrivate.isBirthday = '1';
    }

    // 根據行程類型取得對應的 Google Calendar 顏色
    const colorId = getGoogleColorId(eventData.type);

    const event = {
      summary: eventData.title,
      description: eventData.description || '',
      location: eventData.location || '',
      start: startPayload,
      end: endPayload,
      // 設定行程顏色，讓 Google Calendar 也能用顏色區分類型
      ...(colorId ? { colorId } : {}),
      extendedProperties: {
        private: extendedPrivate,
      },
    };

    const response = await calendar.events.insert({
      calendarId: calendarId,
      resource: event,
    });

    const newEvent = {
      id: response.data.id,
      title: response.data.summary,
      description: response.data.description || '',
      start: response.data.start?.dateTime || response.data.start?.date,
      end: response.data.end?.dateTime || response.data.end?.date,
      location: response.data.location || '',
      type: response.data.extendedProperties?.private?.type || '活動',
      allDay: !response.data.start?.dateTime,
      isBirthdayEvent: response.data.extendedProperties?.private?.isBirthday === '1',
      creator: response.data.creator?.email || '',
    };

    // 立即同步到資料庫（緩衝區）
    try {
      await eventDbService.upsertEvents([newEvent]);
      console.log(`✅ 新增行程已同步到資料庫: ${newEvent.id}`);
    } catch (syncError) {
      console.error('⚠️  同步到資料庫失敗:', syncError.message);
      // 不拋出錯誤，避免影響主流程
    }

    return newEvent;
  } catch (error) {
    console.error('❌ 新增團體行程失敗:', error.message);
    throw new Error(`新增團體行程失敗: ${error.message}`);
  }
};

/**
 * 更新團體行程（整日時用 date 寫入 Google，非整日用 dateTime）
 * @param {string} eventId - 行程 ID
 * @param {Object} eventData - 要更新的行程資料
 * @returns {Promise<Object>} 更新後的行程物件
 */
const updateGroupEvent = async (eventId, eventData) => {
  try {
    const calendar = await getCalendarClient();
    const calendarId = getGroupCalendarId();
    
    if (!calendar || !calendarId) {
      throw new Error('Google Calendar 未設定，無法更新行程');
    }

    const patch = {};

    if (eventData.title !== undefined) {
      patch.summary = eventData.title;
    }

    if (eventData.description !== undefined) {
      patch.description = eventData.description;
    }

    if (eventData.location !== undefined) {
      patch.location = eventData.location;
    }

    const isAllDay = !!eventData.allDay;
    if (eventData.start && eventData.end) {
      if (isAllDay) {
        const { startDate, endDate } = toGoogleAllDayRange(eventData.start, eventData.end);
        // PATCH 會合併欄位，必須明確清掉 dateTime，否則會同時存在 date 與 dateTime 導致 Invalid start time
        patch.start = { date: startDate, dateTime: null };
        patch.end = { date: endDate, dateTime: null };
      } else {
        // 從整日改為有時間時，必須明確清掉 date
        patch.start = { dateTime: eventData.start, timeZone: 'Asia/Taipei', date: null };
        patch.end = { dateTime: eventData.end, timeZone: 'Asia/Taipei', date: null };
      }
    }

    if (eventData.type) {
      patch.extendedProperties = {
        private: {
          type: eventData.type,
        },
      };
      // 行程類型改了，顏色也要跟著更新
      const colorId = getGoogleColorId(eventData.type);
      if (colorId) {
        patch.colorId = colorId;
      }
    }

    const response = await calendar.events.patch({
      calendarId: calendarId,
      eventId: eventId,
      resource: patch,
    });

    // 回傳格式化的行程資料
    const updatedEvent = {
      id: response.data.id,
      title: response.data.summary,
      description: response.data.description || '',
      start: response.data.start?.dateTime || response.data.start?.date,
      end: response.data.end?.dateTime || response.data.end?.date,
      location: response.data.location || '',
      type: response.data.extendedProperties?.private?.type || '活動',
      allDay: !response.data.start?.dateTime,
      isBirthdayEvent: response.data.extendedProperties?.private?.isBirthday === '1',
      creator: response.data.creator?.email || '',
    };

    // 立即同步到資料庫（緩衝區）
    try {
      await eventDbService.upsertEvents([updatedEvent]);
      console.log(`✅ 更新行程已同步到資料庫: ${updatedEvent.id}`);
    } catch (syncError) {
      console.error('⚠️  同步到資料庫失敗:', syncError.message);
      // 不拋出錯誤，避免影響主流程
    }

    return updatedEvent;
  } catch (error) {
    console.error('❌ 更新團體行程失敗:', error.message);
    throw new Error(`更新團體行程失敗: ${error.message}`);
  }
};

/**
 * 刪除團體行程
 * @param {string} eventId - 行程 ID
 * @returns {Promise<void>}
 */
const deleteGroupEvent = async (eventId) => {
  try {
    const calendar = await getCalendarClient();
    const calendarId = getGroupCalendarId();
    
    if (!calendar || !calendarId) {
      throw new Error('Google Calendar 未設定，無法刪除行程');
    }

    await calendar.events.delete({
      calendarId: calendarId,
      eventId: eventId,
    });

    // 立即從資料庫刪除（緩衝區）
    try {
      await eventDbService.deleteEventById(eventId);
      console.log(`✅ 刪除行程已同步到資料庫: ${eventId}`);
    } catch (syncError) {
      console.error('⚠️  同步刪除到資料庫失敗:', syncError.message);
      // 不拋出錯誤，避免影響主流程
    }
  } catch (error) {
    console.error('❌ 刪除團體行程失敗:', error.message);
    throw new Error(`刪除團體行程失敗: ${error.message}`);
  }
};

/**
 * 取得單一團體行程（含 isBirthdayEvent，供後端判斷是否允許編輯/刪除）
 * @param {string} eventId - 行程 ID
 * @returns {Promise<Object>} 行程物件，找不到時拋錯
 */
const getGroupEventById = async (eventId) => {
  const calendar = await getCalendarClient();
  const calendarId = getGroupCalendarId();
  
  if (!calendar || !calendarId) {
    throw new Error('Google Calendar 未設定');
  }
  
  const response = await calendar.events.get({
    calendarId: calendarId,
    eventId: eventId,
  });
  const event = response.data;
  return {
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
  };
};

/**
 * 取得指定月份的團體行程（用於列表模式）
 * @param {number} year - 年份
 * @param {number} month - 月份 (1-12)
 * @param {string} type - 行程類型（選填）
 * @returns {Promise<Array>} 行程陣列
 */
const getGroupEventsByMonth = async (year, month, type = null) => {
  // 計算該月的第一天和最後一天
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  const timeMin = `${year}-${String(month).padStart(2, '0')}-01T00:00:00+08:00`;
  const timeMax = `${year}-${String(month).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}T23:59:59+08:00`;

  let events = await getGroupEvents(timeMin, timeMax);

  // 如果有指定類型，進行篩選
  if (type) {
    events = events.filter(event => event.type === type);
  }

  return events;
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
};
