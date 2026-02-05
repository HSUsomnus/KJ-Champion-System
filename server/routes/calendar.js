/**
 * 行事曆相關的 API 路由
 */

const express = require('express');
const router = express.Router();
const { verifyLineUser, optionalLineUser } = require('../middleware/auth');
const calendarService = require('../services/calendarService');
const versionService = require('../services/versionService');
const sheetService = require('../services/sheetService');

/**
 * POST /api/calendar/sync-my-birthday
 * 每次用戶進入 LIFF 時呼叫：檢查該用戶的生日行程日期是否與個人資料生日一致，若不一致則更新行程
 * 需要驗證 LINE User ID（標頭 X-Line-User-Id 或 query userId）
 */
router.post('/sync-my-birthday', verifyLineUser, async (req, res) => {
  try {
    const member = await sheetService.getMemberByLineId(req.lineUserId);
    if (!member) {
      return res.json({ success: true, data: { updated: 0 }, message: '未註冊成員' });
    }
    const updated = await calendarService.syncMemberBirthdayEvents(member);
    if (updated > 0) versionService.incrementVersion();
    res.json({
      success: true,
      data: { updated },
      message: updated > 0 ? `已更新 ${updated} 筆生日行程日期` : '生日行程日期已是最新',
    });
  } catch (error) {
    console.error('同步生日行程錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '同步生日行程失敗',
    });
  }
});

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

    const birthdayCreated = await calendarService.ensureBirthdayEventsInRange(timeMin, timeMax);
    if (birthdayCreated > 0) versionService.incrementVersion();
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
    const timeMin = `${date}T00:00:00+08:00`;
    const timeMax = `${date}T23:59:59+08:00`;
    const birthdayCreated = await calendarService.ensureBirthdayEventsInRange(timeMin, timeMax);
    if (birthdayCreated > 0) versionService.incrementVersion();
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

    const timeMin = `${year}-${String(month).padStart(2, '0')}-01T00:00:00+08:00`;
    const lastDay = new Date(year, month, 0).getDate();
    const timeMax = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59+08:00`;
    const birthdayCreated = await calendarService.ensureBirthdayEventsInRange(timeMin, timeMax);
    if (birthdayCreated > 0) versionService.incrementVersion();
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
 * 需要驗證 LINE User ID；系統生成的生日行程不可編輯
 */
router.put('/events/:eventId', verifyLineUser, async (req, res) => {
  try {
    const { eventId } = req.params;
    const existing = await calendarService.getGroupEventById(eventId).catch(() => null);
    if (!existing) {
      return res.status(404).json({ success: false, message: '找不到該行程' });
    }
    if (existing.isBirthdayEvent) {
      return res.status(403).json({
        success: false,
        message: '系統生成的生日行程不可編輯',
      });
    }

    const { title, description, start, end, location, type, allDay } = req.body;

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
 * 需要驗證 LINE User ID；系統生成的生日行程不可刪除
 */
router.delete('/events/:eventId', verifyLineUser, async (req, res) => {
  try {
    const { eventId } = req.params;
    const existing = await calendarService.getGroupEventById(eventId).catch(() => null);
    if (!existing) {
      return res.status(404).json({ success: false, message: '找不到該行程' });
    }
    if (existing.isBirthdayEvent) {
      return res.status(403).json({
        success: false,
        message: '系統生成的生日行程不可刪除',
      });
    }
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

    const birthdayCreated = await calendarService.ensureBirthdayEventsInRange(timeMin, timeMax);
    if (birthdayCreated > 0) versionService.incrementVersion();
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
 * 取得單一行程的詳細資訊（含 isBirthdayEvent，前端據此隱藏編輯/刪除）
 */
router.get('/events/:eventId', optionalLineUser, async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await calendarService.getGroupEventById(eventId);
    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    if (error.response?.status === 404 || error.code === 404) {
      return res.status(404).json({ success: false, message: '找不到該行程' });
    }
    console.error('取得行程詳情錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '取得行程詳情失敗',
    });
  }
});

module.exports = router;
