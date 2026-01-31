/**
 * 行事曆服務層
 * 處理所有與 Google Calendar 相關的業務邏輯
 */

const { getCalendarClient, getGroupCalendarId } = require('../config/googleAuth');

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

    // 呼叫 Google Calendar API 取得事件列表
    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: timeMin,
      timeMax: timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });

    // 轉換成我們需要的格式
    const events = (response.data.items || []).map(event => ({
      id: event.id,
      title: event.summary || '無標題',
      description: event.description || '',
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      location: event.location || '',
      // 從擴充屬性中取得行程類型（如果有的話）
      type: event.extendedProperties?.private?.type || '活動',
      // 建立者資訊
      creator: event.creator?.email || '',
      // 是否為全天事件
      allDay: !event.start?.dateTime,
    }));

    return events;
  } catch (error) {
    console.error('❌ 取得團體行程失敗:', error.message);
    throw new Error(`取得團體行程失敗: ${error.message}`);
  }
};

/**
 * 取得當日的團體行程
 * @param {string} date - 日期 (YYYY-MM-DD 格式)
 * @returns {Promise<Array>} 當日行程陣列
 */
const getTodayGroupEvents = async (date) => {
  // 設定當日的開始和結束時間
  const timeMin = `${date}T00:00:00+08:00`; // 台灣時區
  const timeMax = `${date}T23:59:59+08:00`;

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
 * 新增團體行程
 * @param {Object} eventData - 行程資料
 * @param {string} eventData.title - 行程標題
 * @param {string} eventData.description - 行程描述
 * @param {string} eventData.start - 開始時間（ISO 字串）
 * @param {string} eventData.end - 結束時間（ISO 字串）
 * @param {boolean} eventData.allDay - 是否整日（整日時用 date 寫入 Google）
 * @param {string} eventData.location - 地點
 * @param {string} eventData.type - 行程類型（學員上課、活動、諮詢簽約）
 * @returns {Promise<Object>} 新增的行程物件
 */
const createGroupEvent = async (eventData) => {
  try {
    const calendar = await getCalendarClient();
    const calendarId = getGroupCalendarId();

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

    const event = {
      summary: eventData.title,
      description: eventData.description || '',
      location: eventData.location || '',
      start: startPayload,
      end: endPayload,
      extendedProperties: {
        private: {
          type: eventData.type || '活動',
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: calendarId,
      resource: event,
    });

    // 回傳格式化的行程資料
    return {
      id: response.data.id,
      title: response.data.summary,
      description: response.data.description || '',
      start: response.data.start?.dateTime || response.data.start?.date,
      end: response.data.end?.dateTime || response.data.end?.date,
      location: response.data.location || '',
      type: response.data.extendedProperties?.private?.type || '活動',
      allDay: !response.data.start?.dateTime,
    };
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
    }

    const response = await calendar.events.patch({
      calendarId: calendarId,
      eventId: eventId,
      resource: patch,
    });

    // 回傳格式化的行程資料
    return {
      id: response.data.id,
      title: response.data.summary,
      description: response.data.description || '',
      start: response.data.start?.dateTime || response.data.start?.date,
      end: response.data.end?.dateTime || response.data.end?.date,
      location: response.data.location || '',
      type: response.data.extendedProperties?.private?.type || '活動',
      allDay: !response.data.start?.dateTime,
    };
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

    await calendar.events.delete({
      calendarId: calendarId,
      eventId: eventId,
    });
  } catch (error) {
    console.error('❌ 刪除團體行程失敗:', error.message);
    throw new Error(`刪除團體行程失敗: ${error.message}`);
  }
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
  createGroupEvent,
  updateGroupEvent,
  deleteGroupEvent,
  getGroupEventsByMonth,
};
