/**
 * LINE 服務層
 * 處理 LINE LIFF 相關的功能（分享、邀請等）與 Messaging API（Bot Push）
 */

const axios = require('axios');
const { getLiffId, getChannelAccessToken, getAppUrl } = require('../config/lineConfig');

/**
 * 產生分享訊息的內容
 * @param {Object} event - 行程物件
 * @returns {string} 分享訊息文字
 */
/**
 * 產生分享訊息的內容（單一行程文字；欄位為空則不輸出該行）
 * @param {Object} event - 行程物件
 * @returns {string} 分享訊息文字
 */
const generateShareMessage = (event) => {
  const date = new Date(event.start);
  const dateStr = date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    timeZone: 'Asia/Taipei',
  });
  const isAllDay = !!event.allDay || /^\d{4}-\d{2}-\d{2}$/.test(String(event.start || '').trim());
  const parts = ['📅 ' + (event.title || '行程'), '', '日期：' + dateStr];
  if (!isAllDay) {
    const timeStr = date.toLocaleTimeString('zh-TW', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Asia/Taipei',
      hour12: false
    });
    parts.push('時間：' + timeStr);
  }
  if (event.type && String(event.type).trim()) parts.push('類型：' + event.type.trim());
  if (event.description && String(event.description).trim()) parts.push('', '備註：', event.description.trim());
  return parts.join('\n');
};

/** 分享字卡：依類型對應背景色（學員上課-黃、活動-紅、簽約諮詢-綠） */
const SHARE_CARD_TYPE_COLOR = {
  學員上課: '#F4B400',
  活動: '#EA4335',
  諮詢簽約: '#0F9D58',
};

/**
 * 產生單一行程的分享 Flex 字卡（分享出去為字卡；欄位為空則不輸出該區塊）
 * 字卡背景色依類型；類型以白字顯示在字卡右上角；字卡底部有「詳情」按鈕
 * @param {Object} event - 行程物件（含 id, title, start, allDay, location, type, description）
 * @returns {object} Flex Message contents（bubble）
 */
const generateShareFlexMessage = (event) => {
  const date = new Date(event.start);
  const dateStr = date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    timeZone: 'Asia/Taipei',
  });
  const isAllDay = !!event.allDay || /^\d{4}-\d{2}-\d{2}$/.test(String(event.start || '').trim());

  // 類型顯示文字（與系統一致）；無則用「活動」
  const typeLabel = (event.type && String(event.type).trim()) ? event.type.trim() : '活動';
  const headerBg = SHARE_CARD_TYPE_COLOR[typeLabel] || SHARE_CARD_TYPE_COLOR['活動'];

  const bodyContents = [
    { type: 'text', text: '📅 ' + dateStr, size: 'sm', color: '#666666', wrap: true, align: 'start' },
  ];
  if (!isAllDay) {
    const timeStr = date.toLocaleTimeString('zh-TW', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Asia/Taipei',
      hour12: false
    });
    bodyContents.push({ type: 'text', text: '🕐 ' + timeStr, size: 'sm', color: '#666666', wrap: true, align: 'start', margin: 'sm' });
  }
  const desc = event.description && String(event.description).trim() ? event.description.trim() : '';
  if (desc) {
    bodyContents.push({ type: 'separator', margin: 'md' });
    bodyContents.push({ type: 'text', text: '備註：', size: 'sm', color: '#555555', weight: 'bold', wrap: true, align: 'start', margin: 'md' });
    bodyContents.push({ type: 'text', text: desc, size: 'sm', color: '#333333', wrap: true, align: 'start', margin: 'xs' });
  }

  // 詳情頁純網頁 URL（不經過 LIFF，任何人都能直接打開）
  const appUrl = getAppUrl();
  const detailUrl = `${appUrl}/event-detail-standalone.html?id=${event.id || ''}`;

  // 標題列：左邊標題、右邊白色類型文字；底部：詳情按鈕
  return {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: event.title || '行程', size: 'lg', weight: 'bold', color: '#ffffff', wrap: true, align: 'start', flex: 1 },
        { type: 'text', text: typeLabel, size: 'sm', color: '#ffffff', align: 'end', flex: 0 },
      ],
      backgroundColor: headerBg,
      paddingAll: '16px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: bodyContents,
      spacing: 'xs',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: { type: 'uri', label: '詳情', uri: detailUrl },
          style: 'primary',
          height: 'sm',
        },
      ],
      paddingAll: '12px',
    },
  };
};

/**
 * 產生整月行程的分享訊息
 * @param {Array} events - 行程陣列
 * @param {number} year - 年份
 * @param {number} month - 月份
 * @param {string} type - 行程類型
 * @returns {string} 分享訊息文字
 */
const generateMonthShareMessage = (events, year, month, type) => {
  if (events.length === 0) {
    return `📅 ${year}年${month}月 ${type}\n\n本月目前沒有 ${type} 類型的行程。`;
  }

  // 格式化日期時間（24小時制，使用台北時區）
  const formatDateTime = (dateTimeStr, allDay = false) => {
    const date = new Date(dateTimeStr);
    const pad = (n) => n < 10 ? '0' + n : n;
    
    if (allDay) {
      return date.toLocaleDateString('zh-TW', {
        month: 'long',
        day: 'numeric',
        weekday: 'short',
        timeZone: 'Asia/Taipei',
      });
    }
    
    const dateStr = date.toLocaleDateString('zh-TW', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
      timeZone: 'Asia/Taipei',
    });
    
    // 使用 toLocaleString 確保使用台北時區
    const taipeiDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
    const timeStr = pad(taipeiDate.getHours()) + ':' + pad(taipeiDate.getMinutes());
    return `${dateStr} ${timeStr}`;
  };

  let message = `📅 ${year}年${month}月 ${type} 行程\n\n`;
  message += `共 ${events.length} 個行程：\n\n`;

  // 依日期排序
  const sortedEvents = events.sort((a, b) => new Date(a.start) - new Date(b.start));

  sortedEvents.forEach((event, index) => {
    message += `${index + 1}. ${event.title}\n`;
    message += `   📅 ${formatDateTime(event.start, event.allDay)}\n`;
    if (event.description && String(event.description).trim()) {
      message += `   📝 ${event.description.trim()}\n`;
    }
    message += '\n';
  });

  return message.trim();
};

/** 邀請字卡文案（康九冠軍事業部）：每次隨機擇一；已排版換行與留白 */
const INVITE_TEMPLATES = [
  '歡迎加入！\n\n康九冠軍事業部就是你最強的後盾。\n放手去衝，有問題隨時在群裡喊一聲，我們一起解決，一起贏！',
  '歡迎入隊！\n\n一個人拼很累，一群人拼才有力。\n康九冠軍事業部歡迎你的加入，讓我們強強聯手，打贏每一場仗。',
  '歡迎新血加入康九冠軍事業部！\n\n空想一百次不如實幹一次。\n很高興戰隊裡多了你，我們一起捲起袖子幹大事！',
  '歡迎新夥伴！\n\n康九冠軍事業部這塊招牌，由我們一起擦亮。\n未來的路我們並肩同行，一起把市場打下來，把榮耀贏回來！',
];

/** 從邀請文案中隨機選一則 */
const pickRandomInviteTemplate = () =>
  INVITE_TEMPLATES[Math.floor(Math.random() * INVITE_TEMPLATES.length)];

/**
 * 產生邀請訊息的內容（純文字，供複製／備用）
 * 每次隨機擇一則康九冠軍事業部文案
 * @returns {string} 邀請訊息文字
 */
const generateInviteMessage = () => {
  const selectedTemplate = pickRandomInviteTemplate();
  return `${selectedTemplate}\n\n📱 請完成以下步驟加入我們：\n1️⃣ 下載 Google Calendar App\n2️⃣ 加入事業部行事曆\n3️⃣ 進入行事曆/個人頁\n4️⃣ 添加小幫手為好友`;
};

/** Google Calendar App 商店連結（第一步按鈕導向用） */
const GOOGLE_CALENDAR_ANDROID = 'https://play.google.com/store/apps/details?id=com.google.android.calendar';
const GOOGLE_CALENDAR_IOS = 'https://apps.apple.com/app/google-calendar/id905677184';

/** 由日曆 ID 組出「加入事業部行事曆」連結（日曆 ID 來自 env GROUP_CALENDAR_ID，不寫死在程式碼） */
const buildCalendarAddUrl = (calendarId) =>
  'https://calendar.google.com/calendar/render?cid=' + encodeURIComponent(calendarId || process.env.GROUP_CALENDAR_ID || '');

/**
 * 極簡版邀請 Flex 字卡（僅標題 + 一個按鈕），用於測試 shareTargetPicker 是否會顯示字卡
 * 若極簡版能顯示字卡，代表問題在完整版結構；若仍為文字，代表環境或 LINE 行為
 * @param {string} liffId - LIFF ID
 * @param {string} inviterLineId - 邀請人的 LINE ID（選填）
 * @returns {object} Flex Message contents（bubble）
 */
const generateInviteFlexMessageMinimal = (liffId, inviterLineId = '') => {
  const liffUrl = inviterLineId 
    ? `https://liff.line.me/${liffId}?invitedBy=${encodeURIComponent(inviterLineId)}`
    : `https://liff.line.me/${liffId}`;
  return {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '歡迎加入我們', size: 'lg', weight: 'bold', wrap: true },
        { type: 'text', text: '請點下方按鈕開啟 LIFF 網頁。', size: 'sm', color: '#666666', wrap: true, margin: 'md' },
        {
          type: 'button',
          action: { type: 'uri', label: '開啟 LIFF 網頁', uri: liffUrl },
          style: 'primary',
        },
      ],
      spacing: 'md',
    },
  };
};

/**
 * 產生邀請 Flex 字卡（4 個步驟皆為按鈕；按鈕連結由 options 或預設值填入）
 * 文案每次隨機擇一（康九冠軍事業部四則）
 * @param {string} liffId - LIFF ID（用於 LIFF 網址與未設定時的 fallback）
 * @param {string} baseUrl - 本站網址，用於 app-download 導向
 * @param {object} options - 選填。calendarAddUrl＝加入團體日曆連結（開 App 詢問是否新增）；lineAddFriendUrl＝加 LINE 好友連結；inviterLineId＝邀請人的 LINE ID
 * @returns {object} Flex Message contents（bubble）
 */
const generateInviteFlexMessage = (liffId, baseUrl, options = {}) => {
  const selectedTemplate = pickRandomInviteTemplate();
  // 步驟 3：進入 LIFF，帶上邀請人 ID 參數
  const inviterLineId = options.inviterLineId || '';
  const liffUrl = liffId 
    ? (inviterLineId 
        ? `https://liff.line.me/${liffId}?invitedBy=${encodeURIComponent(inviterLineId)}`
        : `https://liff.line.me/${liffId}`)
    : '';
  const appDownloadUrl = baseUrl ? `${String(baseUrl).replace(/\/$/, '')}/api/line/app-download` : null;
  // 步驟 2：加入團體日曆連結（由 route 傳入 env GROUP_CALENDAR_ID；未傳則用 env）
  const calendarAddUrl = options.calendarAddUrl || buildCalendarAddUrl();
  // 步驟 4：加小幫手為好友連結（僅用 route 傳入的 env LINE_ADD_FRIEND_URL，不寫死）
  const lineAddFriendUrl = options.lineAddFriendUrl || undefined;

  return {
    type: 'bubble',
    // 舊專案風格：綠色標題帶 + 白底內文 + 四顆按鈕（文字與連結不變）
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '👋 歡迎加入我們', size: 'lg', weight: 'bold', color: '#ffffff', wrap: true, align: 'start' },
      ],
      backgroundColor: '#17c950',
      paddingAll: '16px',
      paddingTop: '14px',
      paddingBottom: '14px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        // 副標／文案區（白底黑字、左對齊、有換行留白）
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text', text: selectedTemplate, size: 'sm', color: '#333333', wrap: true, align: 'start' },
          ],
          spacing: 'none',
          margin: 'md',
        },
        // 分隔說明：請完成以下步驟（左對齊）
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text', text: '請完成以下步驟加入我們：', size: 'sm', color: '#555555', weight: 'bold', wrap: true, align: 'start' },
          ],
          margin: 'lg',
          spacing: 'xs',
        },
        // 按鈕區：與舊專案一致，只設 color（按鈕色）；如果 LINE 好友連結未設定則只顯示前 3 個按鈕
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              action: {
                type: 'uri',
                label: '1️⃣ 下載 Google Calendar App',
                uri: appDownloadUrl || GOOGLE_CALENDAR_ANDROID,
              },
              style: 'primary',
              height: 'sm',
              color: '#4285F4',
            },
            {
              type: 'button',
              action: {
                type: 'uri',
                label: '2️⃣ 加入事業部行事曆',
                uri: calendarAddUrl,
              },
              style: 'primary',
              height: 'sm',
              color: '#F4B400',
            },
            {
              type: 'button',
              action: {
                type: 'uri',
                label: '3️⃣ 進入行事曆/個人頁',
                uri: liffUrl,
              },
              style: 'primary',
              height: 'sm',
              color: '#9C27B0',
            },
            // 第 4 個按鈕：只有當 LINE 好友連結有設定時才顯示，避免 uri 為 undefined 導致字卡錯誤
            ...(lineAddFriendUrl ? [{
              type: 'button',
              action: {
                type: 'uri',
                label: '4️⃣ 添加小幫手為好友',
                uri: lineAddFriendUrl,
              },
              style: 'primary',
              height: 'sm',
              color: '#00B900',
            }] : []),
          ],
          spacing: 'sm',
          margin: 'md',
        },
      ],
      spacing: 'sm',
    },
  };
};

/**
 * 取得 LINE LIFF ID
 * @returns {string} LIFF ID
 */
const getLiffIdForClient = () => {
  return getLiffId();
};

/**
 * 以 Bot 身份用 Messaging API Push 發送訊息給指定使用者（方案 A：發到與 Bot 的 1-on-1，泡泡會出來）
 * @param {string} userId - LINE User ID（33 字元）
 * @param {Array<object>} messages - Messaging API 訊息陣列（最多 5 則）
 * @returns {Promise<void>}
 */
const pushMessagesToUser = async (userId, messages) => {
  const token = getChannelAccessToken();
  try {
    const res = await axios.post(
      'https://api.line.me/v2/bot/message/push',
      { to: userId, messages },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (res.status !== 200) {
      throw new Error(res.data?.message || `Push API 回傳 ${res.status}`);
    }
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    throw new Error(msg);
  }
};

module.exports = {
  generateShareMessage,
  generateShareFlexMessage,
  generateMonthShareMessage,
  generateInviteMessage,
  generateInviteFlexMessage,
  generateInviteFlexMessageMinimal,
  getLiffIdForClient,
  pushMessagesToUser,
};
