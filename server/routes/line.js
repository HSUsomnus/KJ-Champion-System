/**
 * LINE 相關的 API 路由（分享、邀請等功能）
 */

const express = require('express');
const router = express.Router();
const { optionalLineUser, verifyLineUser } = require('../middleware/auth');
const { isValidLineUserId, isValidLineTargetId } = require('../config/lineConfig');
const lineService = require('../services/lineService');
const calendarService = require('../services/calendarService');
const agendaService = require('../services/agendaService');
const memberDbService = require('../services/memberDbService');

/**
 * 驗證請求者是否為開發者（用於每日行程推播設定 API）
 */
const requireDeveloper = async (req, res, next) => {
  try {
    const lineId = req.lineUserId;
    const member = await memberDbService.getMemberByLineId(lineId);
    if (!member || member.role !== '開發者') {
      return res.status(403).json({
        success: false,
        message: '僅開發者可存取此資源',
      });
    }
    next();
  } catch (error) {
    console.error('❌ 開發者權限檢查失敗:', error);
    res.status(500).json({
      success: false,
      message: error.message || '權限驗證失敗',
    });
  }
};

/**
 * GET /api/line/liff-id
 * 取得 LIFF ID（供前端使用）
 */
router.get('/liff-id', (req, res) => {
  try {
    const liffId = lineService.getLiffIdForClient();
    res.json({
      success: true,
      data: {
        liffId,
      },
    });
  } catch (error) {
    console.error('取得 LIFF ID 錯誤:', error);
    res.status(500).json({
      success: false,
      message: '取得 LIFF ID 失敗',
    });
  }
});

/**
 * GET /api/line/share-message/:eventId
 * 取得行程的分享訊息內容（LIFF shareTargetPicker 用，字卡內有詳情按鈕）
 */
router.get('/share-message/:eventId', optionalLineUser, async (req, res) => {
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
    };

    const shareMessage = lineService.generateShareMessage(event);
    const flexMessage = lineService.generateShareFlexMessage(event);

    res.json({
      success: true,
      data: {
        message: shareMessage,
        flexMessage: flexMessage,
        event: event,
      },
    });
  } catch (error) {
    console.error('產生分享訊息錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '產生分享訊息失敗',
    });
  }
});

/**
 * POST /api/line/push-share-event
 * 由 Bot 發送單一行程字卡；可指定發送到自己或指定好友／群組，泡泡按鈕會出現
 * Body: { eventId, userId, targetId? } — targetId 留空則發到 userId（自己）
 */
router.post('/push-share-event', async (req, res) => {
  try {
    const { eventId, userId, targetId } = req.body || {};
    if (!userId || !isValidLineUserId(userId)) {
      return res.status(400).json({
        success: false,
        message: '請提供有效的 userId（LINE User ID）',
      });
    }
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: '請提供 eventId',
      });
    }
    // 發送對象：有指定且格式正確則發到 targetId，否則發到自己（userId）
    const to = (targetId && isValidLineTargetId(targetId.trim())) ? targetId.trim() : userId;

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
    };

    const shareMessage = lineService.generateShareMessage(event);
    const flexMessage = lineService.generateShareFlexMessage(event);
    const liffId = lineService.getLiffIdForClient();
    const quickReply = {
      items: [
        {
          type: 'action',
          action: {
            type: 'uri',
            label: '詳情',
            uri: `https://liff.line.me/${liffId}/event-detail-standalone.html?id=${eventId}`,
          },
        },
      ],
    };

    const message = {
      type: 'flex',
      altText: shareMessage,
      contents: flexMessage,
      quickReply: quickReply,
    };
    await lineService.pushMessagesToUser(to, [message]);

    res.json({
      success: true,
      data: { message: to === userId ? '已發送到與 Bot 的聊天室' : '已轉發到指定對象' },
    });
  } catch (error) {
    console.error('[API] push-share-event 錯誤:', error);
    const msg = error.response?.data?.message || error.message;
    res.status(500).json({
      success: false,
      message: msg || '發送失敗',
    });
  }
});

/**
 * POST /api/line/push-share-month
 * 由 Bot 發送整月行程文字；可指定發送到自己或指定好友／群組，泡泡按鈕會出現
 * Body: { year, month, type, userId, targetId? } — targetId 留空則發到 userId（自己）
 */
router.post('/push-share-month', async (req, res) => {
  try {
    const { year, month, type, userId, targetId } = req.body || {};
    if (!userId || !isValidLineUserId(userId)) {
      return res.status(400).json({
        success: false,
        message: '請提供有效的 userId（LINE User ID）',
      });
    }
    if (!year || !month || !type) {
      return res.status(400).json({
        success: false,
        message: '請提供 year、month 和 type',
      });
    }
    // 發送對象：有指定且格式正確則發到 targetId，否則發到自己（userId）
    const to = (targetId && isValidLineTargetId(targetId.trim())) ? targetId.trim() : userId;

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    // 明確指定台灣時區 +08:00，避免 Vercel（UTC）的 new Date() 造成邊界偏移
    const lastDay = new Date(yearNum, monthNum, 0).getDate();
    const timeMin = `${yearNum}-${String(monthNum).padStart(2, '0')}-01T00:00:00+08:00`;
    const timeMax = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59+08:00`;
    const calendar = await require('../config/googleAuth').getCalendarClient();
    const calendarId = require('../config/googleAuth').getGroupCalendarId();
    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: timeMin,
      timeMax: timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = (response.data.items || [])
      .filter(item => (item.extendedProperties?.private?.type || '活動') === type)
      .map(item => ({
        id: item.id,
        title: item.summary || '無標題',
        description: item.description || '',
        start: item.start?.dateTime || item.start?.date,
        end: item.end?.dateTime || item.end?.date,
        type: item.extendedProperties?.private?.type || '活動',
        allDay: !item.start?.dateTime,
      }));

    const shareMessage = lineService.generateMonthShareMessage(events, yearNum, monthNum, type);
    const liffId = lineService.getLiffIdForClient();
    const quickReply = {
      items: [
        {
          type: 'action',
          action: {
            type: 'uri',
            label: '詳情',
            uri: `https://liff.line.me/${liffId}/month-events-standalone.html?year=${yearNum}&month=${monthNum}&type=${encodeURIComponent(type)}`,
          },
        },
      ],
    };

    const message = {
      type: 'text',
      text: shareMessage,
      quickReply: quickReply,
    };
    await lineService.pushMessagesToUser(to, [message]);

    res.json({
      success: true,
      data: { message: to === userId ? '已發送到與 Bot 的聊天室' : '已轉發到指定對象' },
    });
  } catch (error) {
    console.error('[API] push-share-month 錯誤:', error);
    const msg = error.response?.data?.message || error.message;
    res.status(500).json({
      success: false,
      message: msg || '發送失敗',
    });
  }
});

/**
 * GET /api/line/share-month-message
 * 取得整月行程的分享訊息內容（純文字，LIFF shareTargetPicker 用）
 * 查詢參數: year, month, type
 */
router.get('/share-month-message', optionalLineUser, async (req, res) => {
  try {
    const { year, month, type } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: '請提供 year 和 month 參數',
      });
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    const typeFilter = (type === '全部' || !type) ? null : type;
    // 明確指定台灣時區 +08:00，避免 Vercel（UTC）的 new Date() 造成邊界偏移
    const lastDay = new Date(yearNum, monthNum, 0).getDate();
    const timeMin = `${yearNum}-${String(monthNum).padStart(2, '0')}-01T00:00:00+08:00`;
    const timeMax = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59+08:00`;
    const calendar = await require('../config/googleAuth').getCalendarClient();
    const calendarId = require('../config/googleAuth').getGroupCalendarId();

    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: timeMin,
      timeMax: timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = (response.data.items || [])
      .filter(item => {
        if (!typeFilter) return true;
        const eventType = item.extendedProperties?.private?.type || '活動';
        return eventType === typeFilter;
      })
      .map(item => ({
        id: item.id,
        title: item.summary || '無標題',
        description: item.description || '',
        start: item.start?.dateTime || item.start?.date,
        end: item.end?.dateTime || item.end?.date,
        location: item.location || '',
        type: item.extendedProperties?.private?.type || '活動',
        allDay: !item.start?.dateTime,
      }));

    const typeLabel = typeFilter || '全部';
    const shareMessage = lineService.generateMonthShareMessage(events, yearNum, monthNum, typeLabel);

    res.json({
      success: true,
      data: {
        message: shareMessage,
        events: events,
      },
    });
  } catch (error) {
    console.error('產生整月分享訊息錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '產生整月分享訊息失敗',
    });
  }
});

/**
 * POST /api/line/push-invite-link
 * 由 Bot 推送「含 LIFF 連結」的訊息給使用者
 * 使用者從 LINE 聊天室點擊連結，會在 LINE 內開啟，即可用 shareTargetPicker 分享漂亮字卡
 * Body: { userId }
 */
router.post('/push-invite-link', async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId || !isValidLineUserId(userId)) {
      return res.status(400).json({ success: false, message: '請提供有效的 userId' });
    }
    const liffId = process.env.LIFF_ID || '';
    if (!liffId) {
      return res.status(500).json({ success: false, message: '未設定 LIFF_ID' });
    }
    const liffUrl = `https://liff.line.me/${liffId}?invitedBy=${encodeURIComponent(userId)}`;

    const flexMessage = {
      type: 'bubble',
      hero: {
        type: 'box',
        layout: 'vertical',
        contents: [{ type: 'text', text: '📋 分享邀請字卡', size: 'xl', weight: 'bold', align: 'center' }],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '點擊下方按鈕，選擇好友或群組即可分享漂亮的邀請字卡', size: 'sm', color: '#666666', wrap: true, align: 'center' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [{
          type: 'button',
          action: { type: 'uri', label: '開啟分享邀請字卡', uri: liffUrl },
          style: 'primary',
          color: '#06C755',
        }],
      },
    };

    await lineService.pushMessagesToUser(userId, [{
      type: 'flex',
      altText: '點擊按鈕分享邀請字卡',
      contents: flexMessage,
    }]);

    const botChatUrl = process.env.LINE_BOT_CHAT_URL || process.env.LINE_ADD_FRIEND_URL || '';

    console.log(`✅ [push-invite-link] LIFF 連結已推送給 ${userId}`);
    res.json({ success: true, botChatUrl });
  } catch (error) {
    console.error('[API] push-invite-link 錯誤:', error);
    const msg = error.response?.data?.message || error.message;
    res.status(500).json({ success: false, message: msg || '發送失敗' });
  }
});

/**
 * GET /api/line/invite-liff-url
 * 取得 LIFF 邀請頁網址（供前端點邀請時跳轉，僅用於發送漂亮 Flex 字卡）
 * 查詢參數: invitedBy（邀請人 LINE ID）
 */
router.get('/invite-liff-url', (req, res) => {
  try {
    const liffId = process.env.LIFF_ID || '';
    const invitedBy = req.query.invitedBy || '';
    if (!liffId) {
      return res.status(500).json({ success: false, message: '未設定 LIFF_ID' });
    }
    const qs = invitedBy ? '?invitedBy=' + encodeURIComponent(invitedBy) : '';
    const url = `https://liff.line.me/${liffId}${qs}`;
    res.json({ success: true, url });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/line/invite-message
 * 取得邀請訊息的內容（文案每次隨機擇一，康九冠軍事業部四則）
 * 查詢參數: baseUrl（選填）、minimal=1（極簡字卡）、inviterLineId（邀請人 LINE ID）
 */
router.get('/invite-message', optionalLineUser, (req, res) => {
  try {
    const baseUrl = req.query.baseUrl || (req.protocol + '://' + req.get('host'));
    const useMinimal = req.query.minimal === '1' || req.query.minimal === 'true';
    const inviterLineId = req.query.inviterLineId || req.lineUserId || ''; // 邀請人的 LINE ID
    
    const inviteMessage = lineService.generateInviteMessage();
    const liffId = lineService.getLiffIdForClient();
    // 邀請字卡按鈕連結：步驟 2 用「加入事業部行事曆」連結（開 App 詢問是否新增）；加好友用 env 或 LIFF 網址
    const calendarAddUrl = process.env.GROUP_CALENDAR_ID
      ? 'https://calendar.google.com/calendar/render?cid=' + encodeURIComponent(process.env.GROUP_CALENDAR_ID)
      : undefined;
    const lineAddFriendUrl = process.env.LINE_ADD_FRIEND_URL || undefined;
    const flexMessage = useMinimal
      ? lineService.generateInviteFlexMessageMinimal(liffId, inviterLineId)
      : lineService.generateInviteFlexMessage(liffId, baseUrl, { calendarAddUrl, lineAddFriendUrl, inviterLineId });

    console.log(`✅ 生成邀請訊息 - 邀請人: ${inviterLineId || '未指定'}`);
    
    res.json({
      success: true,
      data: {
        message: inviteMessage,
        flexMessage,
      },
    });
  } catch (error) {
    // 記錄完整錯誤，方便除錯
    console.error('產生邀請訊息錯誤:', error);
    // 回傳「實際錯誤內容」給前端顯示，不只用固定文字，方便 Debug
    res.status(500).json({
      success: false,
      message: error && error.message ? error.message : '產生邀請訊息失敗',
    });
  }
});

/**
 * POST /api/line/push-invite
 * 用 Bot 把美麗的 Flex 邀請字卡推送給邀請人自己
 * 邀請人在 LINE 中收到字卡後，可長按轉傳給任意好友或群組
 * Body: { userId, inviterLineId? }
 */
router.post('/push-invite', async (req, res) => {
  try {
    const { userId, inviterLineId } = req.body || {};
    if (!userId || !isValidLineUserId(userId)) {
      return res.status(400).json({ success: false, message: '請提供有效的 userId' });
    }

    const baseUrl = process.env.APP_URL || (req.protocol + '://' + req.get('host'));
    const liffId = lineService.getLiffIdForClient();
    const calendarAddUrl = process.env.GROUP_CALENDAR_ID
      ? 'https://calendar.google.com/calendar/render?cid=' + encodeURIComponent(process.env.GROUP_CALENDAR_ID)
      : undefined;
    const lineAddFriendUrl = process.env.LINE_ADD_FRIEND_URL || undefined;

    const flexMessage = lineService.generateInviteFlexMessage(liffId, baseUrl, {
      calendarAddUrl,
      lineAddFriendUrl,
      inviterLineId: inviterLineId || userId,
    });

    await lineService.pushMessagesToUser(userId, [{
      type: 'flex',
      altText: '邀請你加入康九冠軍事業部！',
      contents: flexMessage,
    }]);

    // 機器人聊天頁 URL，前端收到後可跳轉讓使用者立即轉傳給好友／群組
    const botChatUrl = process.env.LINE_BOT_CHAT_URL || process.env.LINE_ADD_FRIEND_URL || '';

    console.log(`✅ [push-invite] 邀請字卡已推送給 ${userId}`);
    res.json({ success: true, botChatUrl });
  } catch (error) {
    console.error('[API] push-invite 錯誤:', error);
    const msg = error.response?.data?.message || error.message;
    res.status(500).json({ success: false, message: msg || '發送失敗' });
  }
});

/**
 * GET /api/line/app-download
 * 依使用者裝置（安卓／蘋果）導向對應的 Google Calendar App 商店
 */
router.get('/app-download', (req, res) => {
  const ua = (req.get('user-agent') || '').toLowerCase();
  const isAndroid = /android/.test(ua);
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const androidUrl = 'https://play.google.com/store/apps/details?id=com.google.android.calendar';
  // ✅ 正確的 Google Calendar App Store ID 是 909319292
  const iosUrl = 'https://apps.apple.com/app/google-calendar-get-organized/id909319292';
  if (isAndroid) return res.redirect(302, androidUrl);
  if (isIOS) return res.redirect(302, iosUrl);
  res.redirect(302, androidUrl);
});

/**
 * GET /api/line/agenda-settings
 * 讀取每日行程推播設定（僅開發者）
 */
router.get('/agenda-settings', verifyLineUser, requireDeveloper, async (req, res) => {
  try {
    const settings = await agendaService.getAgendaSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('❌ 讀取推播設定失敗:', error);
    res.status(500).json({ success: false, message: error.message || '讀取設定失敗' });
  }
});

/**
 * PUT /api/line/agenda-settings
 * 更新每日行程推播設定（僅開發者）
 * Body: { time?: "HH:MM", enabled?: boolean, target?: "all" | "manager_above" | "developer" }
 */
router.put('/agenda-settings', verifyLineUser, requireDeveloper, async (req, res) => {
  try {
    const { time, enabled, target } = req.body || {};
    const updates = {};
    if (time !== undefined) updates.time = time;
    if (enabled !== undefined) updates.enabled = !!enabled;
    if (target !== undefined) updates.target = target;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: '沒有可更新的欄位' });
    }

    const latest = await agendaService.updateAgendaSettings(updates);
    res.json({ success: true, data: latest });
  } catch (error) {
    console.error('❌ 更新推播設定失敗:', error);
    res.status(400).json({ success: false, message: error.message || '更新設定失敗' });
  }
});

/**
 * POST /api/line/push-daily-agenda
 * 手動觸發推播明日行程（測試用，僅開發者）
 */
router.post('/push-daily-agenda', verifyLineUser, requireDeveloper, async (req, res) => {
  try {
    const result = await agendaService.sendDailyAgenda();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ 手動推播失敗:', error);
    res.status(500).json({ success: false, message: error.message || '推播失敗' });
  }
});

module.exports = router;
