/**
 * 行事曆相關的 API 路由
 */

const express = require('express');
const router = express.Router();
const { verifyLineUser, optionalLineUser } = require('../middleware/auth');
const calendarService = require('../services/calendarService');
const versionService = require('../services/versionService');

/**
 * GET /api/calendar/events
 * 取得指定日期範圍的團體行程
 * 查詢參數: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
router.get('/events', optionalLineUser, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '請提供 startDate 和 endDate 參數',
      });
    }

    const timeMin = `${startDate}T00:00:00+08:00`;
    const timeMax = `${endDate}T23:59:59+08:00`;

    const events = await calendarService.getGroupEvents(timeMin, timeMax);

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error('取得行程列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '取得行程列表失敗',
    });
  }
});

/**
 * GET /api/calendar/today
 * 取得當日的團體行程
 * 查詢參數: date (YYYY-MM-DD，選填，預設為今天)
 */
router.get('/today', optionalLineUser, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const events = await calendarService.getTodayGroupEvents(date);

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error('取得當日行程錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '取得當日行程失敗',
    });
  }
});

/**
 * GET /api/calendar/month
 * 取得指定月份的團體行程（用於列表模式）
 * 查詢參數: year, month, type (選填)
 */
router.get('/month', optionalLineUser, async (req, res) => {
  try {
    const year = parseInt(req.query.year);
    const month = parseInt(req.query.month);
    const type = req.query.type || null;

    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: '請提供有效的年份和月份',
      });
    }

    const events = await calendarService.getGroupEventsByMonth(year, month, type);

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error('取得月份行程錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '取得月份行程失敗',
    });
  }
});

/**
 * POST /api/calendar/events
 * 新增團體行程
 * 需要驗證 LINE User ID
 */
router.post('/events', verifyLineUser, async (req, res) => {
  try {
    const { title, description, start, end, location, type, allDay } = req.body;

    // 驗證必填欄位
    if (!title || !start || !end) {
      return res.status(400).json({
        success: false,
        message: '請提供標題、開始時間和結束時間',
      });
    }

    // 驗證行程類型
    const validTypes = ['學員上課', '活動', '諮詢簽約'];
    const eventType = type && validTypes.includes(type) ? type : '活動';

    const event = await calendarService.createGroupEvent({
      title,
      description,
      start,
      end,
      allDay: !!allDay,
      location,
      type: eventType,
    });

    // 更新版本號
    versionService.incrementVersion();

    res.json({
      success: true,
      data: event,
      message: '行程新增成功',
    });
  } catch (error) {
    console.error('新增行程錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '新增行程失敗',
    });
  }
});

/**
 * PUT /api/calendar/events/:eventId
 * 更新團體行程
 * 需要驗證 LINE User ID
 */
router.put('/events/:eventId', verifyLineUser, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { title, description, start, end, location, type, allDay } = req.body;

    // 驗證行程類型（如果有的話）
    let eventType = type;
    if (type) {
      const validTypes = ['學員上課', '活動', '諮詢簽約'];
      if (!validTypes.includes(type)) {
        eventType = '活動';
      }
    }

    const event = await calendarService.updateGroupEvent(eventId, {
      title,
      description,
      start,
      end,
      allDay: !!allDay,
      location,
      type: eventType,
    });

    // 更新版本號
    versionService.incrementVersion();

    res.json({
      success: true,
      data: event,
      message: '行程更新成功',
    });
  } catch (error) {
    console.error('更新行程錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '更新行程失敗',
    });
  }
});

/**
 * DELETE /api/calendar/events/:eventId
 * 刪除團體行程
 * 需要驗證 LINE User ID
 */
router.delete('/events/:eventId', verifyLineUser, async (req, res) => {
  try {
    const { eventId } = req.params;
    await calendarService.deleteGroupEvent(eventId);

    // 更新版本號
    versionService.incrementVersion();

    res.json({
      success: true,
      message: '行程刪除成功',
    });
  } catch (error) {
    console.error('刪除行程錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '刪除行程失敗',
    });
  }
});

/**
 * GET /api/calendar/version
 * 取得當前版本號和所有資料（用於快取機制）
 */
router.get('/version', optionalLineUser, async (req, res) => {
  try {
    const clientVersion = req.query.version ? parseInt(req.query.version) : null;
    const currentVersion = versionService.getCurrentVersion();

    // 如果版本號相同，只回傳版本號
    if (clientVersion && versionService.isVersionSame(clientVersion)) {
      return res.json({
        success: true,
        data: {
          version: currentVersion,
          changed: false,
        },
      });
    }

    // 版本號不同，回傳所有資料
    // 取得未來一年的行程
    const now = new Date();
    const oneYearLater = new Date(now);
    oneYearLater.setFullYear(now.getFullYear() + 1);

    const timeMin = now.toISOString();
    const timeMax = oneYearLater.toISOString();

    const events = await calendarService.getGroupEvents(timeMin, timeMax);

    // 取得所有成員
    const sheetService = require('../services/sheetService');
    const members = await sheetService.getAllMembers();

    res.json({
      success: true,
      data: {
        version: currentVersion,
        changed: true,
        events: events,
        members: members,
      },
    });
  } catch (error) {
    console.error('取得版本號和資料錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '取得版本號和資料失敗',
    });
  }
});

/**
 * GET /api/calendar/events/:eventId
 * 取得單一行程的詳細資訊
 */
router.get('/events/:eventId', optionalLineUser, async (req, res) => {
  try {
    const { eventId } = req.params;
    const calendar = await require('../config/googleAuth').getCalendarClient();
    const calendarId = require('../config/googleAuth').getGroupCalendarId();

    const response = await calendar.events.get({
      calendarId: calendarId,
      eventId: eventId,
    });

    const event = {
      id: response.data.id,
      title: response.data.summary || '無標題',
      description: response.data.description || '',
      start: response.data.start?.dateTime || response.data.start?.date,
      end: response.data.end?.dateTime || response.data.end?.date,
      location: response.data.location || '',
      type: response.data.extendedProperties?.private?.type || '活動',
      allDay: !response.data.start?.dateTime,
      creator: response.data.creator?.email || '',
    };

    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error('取得行程詳情錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '取得行程詳情失敗',
    });
  }
});

module.exports = router;
