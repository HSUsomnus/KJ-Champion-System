/**
 * 行事曆相關的前端邏輯
 * 負責顯示行事曆、行程字卡，以及處理行程的 CRUD 操作
 */

// 當前選取的日期
let currentDate = new Date();
let selectedDate = new Date();
let todayEvents = [];

/**
 * 將 Date 轉成 YYYY-MM-DD（給 API 與 URL 參數用）
 */
function formatYMD(d) {
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * 更新「新增行程」按鈕連結：自動帶入所選日期
 * 也會保留開發模式參數（?dev=1）
 */
function updateAddEventLinkBySelectedDate(dateStr) {
  // 取得按鈕
  const link = document.getElementById('add-event-link');
  if (!link) return;

  // 僅 localhost 為開發模式；ngrok／正式為內測
  const dev = window.LIFF && window.LIFF.isDevMode && window.LIFF.isDevMode();

  // 組合 query：dev + date
  const q = dev ? '?dev=1&' : '?';
  const safeDate = encodeURIComponent(dateStr || formatYMD(selectedDate));

  // 設定 href：點下去會帶入所選日期到新增頁
  link.href = `/add-event.html${q}date=${safeDate}`;
}

/**
 * 更新「今日行程」標題：顯示所選日期
 */
function updateSelectedDateTitle(dateStr) {
  const title = document.getElementById('selected-date-title');
  if (!title) return;

  // 沒帶日期：視為今天
  if (!dateStr) {
    title.textContent = '今日行程';
    return;
  }

  // 顯示：YYYY-MM-DD 行程（簡單清楚）
  title.textContent = `${dateStr} 行程`;
}

/**
 * 初始化行事曆頁面
 */
async function initCalendar() {
  if (window.cacheService) {
    await window.cacheService.checkAndUpdateData();
  }

  // 從詳情／新增返回時（bfcache 還原）重新檢查版本並載入，避免字卡與詳情不一致
  window.addEventListener('pageshow', async function (e) {
    if (e.persisted && window.cacheService) {
      await window.cacheService.checkAndUpdateData();
      await loadCalendar();
      await loadTodayEvents();
    }
  });

  window.addEventListener('liffReady', async () => {
    await loadCalendar();
    await loadTodayEvents();
  });

  if (window.LIFF && window.LIFF.isInitialized()) {
    await loadCalendar();
    await loadTodayEvents();
  } else {
    await loadCalendar();
    await loadTodayEvents();
  }

  updateAddEventLinkBySelectedDate(formatYMD(selectedDate));
  updateSelectedDateTitle(null);
  setupCalendarEvents();
}

/**
 * 載入行事曆
 */
async function loadCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  // 計算該月的第一天和最後一天
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

  try {
    // 優先使用快取資料
    let events = [];
    if (window.cacheService) {
      const cachedEvents = window.cacheService.getCachedEvents();
      if (cachedEvents && cachedEvents.length > 0) {
        // 從快取中過濾出該月的行程
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        events = cachedEvents.filter(event => {
          const eventStart = new Date(event.start);
          const eventEnd = event.end ? new Date(event.end) : eventStart;
          return eventStart <= end && eventEnd >= start;
        });
      }
    }

    // 如果快取沒有資料，才從 API 載入
    if (events.length === 0) {
      const response = await fetch(`/api/calendar/events?startDate=${startDate}&endDate=${endDate}`);
      const data = await response.json();

      if (data.success) {
        events = data.data;
      } else {
        console.error('載入行事曆失敗:', data.message);
      }
    }

    renderCalendar(year, month, events);
  } catch (error) {
    console.error('載入行事曆錯誤:', error);
  }
}

/**
 * 載入當日行程
 */
async function loadTodayEvents() {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    // 優先使用快取資料
    let events = [];
    if (window.cacheService) {
      const cachedEvents = window.cacheService.getCachedEvents();
      if (cachedEvents && cachedEvents.length > 0) {
        // 從快取中過濾出當日的行程
        const todayStart = new Date(today + 'T00:00:00');
        const todayEnd = new Date(today + 'T23:59:59');
        
        events = cachedEvents.filter(event => {
          const eventDate = new Date(event.start);
          return eventDate >= todayStart && eventDate <= todayEnd;
        });
      }
    }

    // 如果快取沒有資料，才從 API 載入
    if (events.length === 0) {
      const userId = window.LIFF ? window.LIFF.getUserId() : null;
      const url = `/api/calendar/today?date=${today}${userId ? `&userId=${userId}` : ''}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        events = data.data;
      } else {
        console.error('載入當日行程失敗:', data.message);
      }
    }

    todayEvents = events;
    renderTodayEvents(events);

    // 預設載入完成後：標題與按鈕都以「今天」為準
    selectedDate = new Date();
    updateSelectedDateTitle(null);
    updateAddEventLinkBySelectedDate(today);
  } catch (error) {
    console.error('載入當日行程錯誤:', error);
  }
}

/**
 * 渲染行事曆
 */
function renderCalendar(year, month, events) {
  const calendarGrid = document.getElementById('calendar-grid');
  if (!calendarGrid) return;

  // 清空現有內容
  calendarGrid.innerHTML = '';

  // 星期標題
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  weekdays.forEach(day => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'calendar-day-header';
    dayHeader.textContent = day;
    calendarGrid.appendChild(dayHeader);
  });

  // 計算該月第一天是星期幾
  const firstDay = new Date(year, month - 1, 1);
  const firstDayWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;

  // 填入空白（月初）
  for (let i = 0; i < firstDayWeekday; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.className = 'calendar-day';
    calendarGrid.appendChild(emptyDay);
  }

  // 填入日期
  for (let day = 1; day <= daysInMonth; day++) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    dayElement.textContent = day;

    // 檢查今天
    if (isCurrentMonth && day === today.getDate()) {
      dayElement.classList.add('today');
    }

    // 取得當地日期字串 YYYY-MM-DD（供比對用）
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // 當天所有行程（包含跨日行程）：dateStr 在行程的 start 和 end 之間
    const dayEvents = events.filter(event => {
      const startD = new Date(event.start);
      const endD = event.end ? new Date(event.end) : startD;
      const startStr = `${startD.getFullYear()}-${String(startD.getMonth() + 1).padStart(2, '0')}-${String(startD.getDate()).padStart(2, '0')}`;
      const endStr = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}-${String(endD.getDate()).padStart(2, '0')}`;
      // 日期在行程區間內（含頭尾）
      return dateStr >= startStr && dateStr <= endStr;
    });

    // 收集當日所有獨特的行程類型
    const eventTypes = [...new Set(dayEvents.map(e => e.type || '活動'))];
    
    // 類型優先級排序（學員上課 > 活動 > 諮詢簽約 > 個人行程）
    const typeOrder = ['學員上課', '活動', '諮詢簽約', '個人行程'];
    const sortedTypes = eventTypes.sort((a, b) => {
      const aIdx = typeOrder.indexOf(a);
      const bIdx = typeOrder.indexOf(b);
      if (aIdx === -1 && bIdx === -1) return 0;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    }).slice(0, 4); // 最多 4 個點點

    // 如果有行程，顯示多個顏色點點
    if (sortedTypes.length > 0) {
      dayElement.classList.add('has-events');
      
      // 創建點點容器
      const dotsContainer = document.createElement('div');
      dotsContainer.className = 'event-dots';
      
      sortedTypes.forEach(type => {
        const dot = document.createElement('span');
        dot.className = 'event-dot';
        
        // 設定顏色
        if (type === '學員上課') dot.style.backgroundColor = '#F57F17'; // 橙色
        else if (type === '活動') dot.style.backgroundColor = '#C62828'; // 紅色
        else if (type === '諮詢簽約') dot.style.backgroundColor = '#2E7D32'; // 綠色
        else if (type === '個人行程') dot.style.backgroundColor = '#1976D2'; // 藍色
        else dot.style.backgroundColor = '#999'; // 其他
        
        dotsContainer.appendChild(dot);
      });
      
      dayElement.appendChild(dotsContainer);
    }

    // 點擊事件
    dayElement.addEventListener('click', () => {
      selectedDate = new Date(year, month - 1, day);
      // 所選日期字串（YYYY-MM-DD）
      const selectedStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      // 移除其他選取狀態
      document.querySelectorAll('.calendar-day.selected').forEach(el => {
        el.classList.remove('selected');
      });
      dayElement.classList.add('selected');
      
      // 載入該日的行程
      loadDateEvents(selectedStr);

      // 更新標題與新增行程按鈕（會帶入所選日期）
      updateSelectedDateTitle(selectedStr);
      updateAddEventLinkBySelectedDate(selectedStr);
    });

    calendarGrid.appendChild(dayElement);
  }

  // 更新月份顯示
  const monthDisplay = document.getElementById('calendar-month');
  if (monthDisplay) {
    monthDisplay.textContent = `${year}年${month}月`;
  }
}

/**
 * 載入指定日期的行程
 */
async function loadDateEvents(date) {
  try {
    const response = await fetch(`/api/calendar/events?startDate=${date}&endDate=${date}`);
    const data = await response.json();

    if (data.success) {
      renderTodayEvents(data.data, date);
    }
  } catch (error) {
    console.error('載入日期行程錯誤:', error);
  }
}

/**
 * 渲染當日行程字卡
 */
function renderTodayEvents(events, date = null) {
  const container = document.getElementById('today-events');
  if (!container) return;

  if (events.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div>📅</div>
        <p>${date ? '這一天' : '今天'}沒有行程</p>
      </div>
    `;
    return;
  }

  container.innerHTML = events.map(event => `
    <div class="event-card" data-event-id="${event.id}">
      <div class="event-card-header">
        <div class="event-title">${escapeHtml(event.title)}</div>
        <span class="event-type ${escapeHtml(event.type)}">${escapeHtml(event.type)}</span>
      </div>
      <div class="event-info">
        <div class="event-info-item">
          <span>📅</span>
          <span>${formatDateTime(event.start, event.allDay || event.all_day)}</span>
        </div>
        ${event.description ? `
        <div class="event-info-item">
          <span>📝</span>
          <span>${escapeHtml(event.description)}</span>
        </div>
        ` : ''}
      </div>
      <div class="event-actions">
        <button class="btn btn-secondary btn-small" onclick="viewEventDetail('${event.id}')">
          查看詳情
        </button>
        <button class="btn btn-primary btn-small share-btn" onclick="shareEvent('${event.id}')">
          🔗 分享
        </button>
      </div>
    </div>
  `).join('');
}

/**
 * 格式化日期時間
 */
function formatDateTime(dateTimeStr, allDay = false) {
  const date = new Date(dateTimeStr);
  
  if (allDay) {
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  }

  // 24小時制格式
  const pad = (n) => n < 10 ? '0' + n : n;
  const dateStr = date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
  const timeStr = pad(date.getHours()) + ':' + pad(date.getMinutes());
  
  return dateStr + ' ' + timeStr;
}

/**
 * 分享行程（LIFF shareTargetPicker，字卡內有詳情按鈕）
 */
async function shareEvent(eventId) {
  try {
    const response = await fetch(`/api/line/share-message/${eventId}`);
    const data = await response.json();

    if (!data.success || !data.data) {
      const errMsg = data.message || '無法取得分享內容';
      if (window.showAppAlert) await window.showAppAlert('❌ ' + errMsg);
      else alert('❌ ' + errMsg);
      return;
    }

    const msgData = data.data;
    if (typeof liff !== 'undefined' && liff.shareTargetPicker && msgData.flexMessage) {
      const messages = [{
        type: 'flex',
        altText: msgData.message,
        contents: msgData.flexMessage,
      }];
      await liff.shareTargetPicker(messages);
    } else if (window.LIFF && window.LIFF.shareMessage) {
      await window.LIFF.shareMessage(msgData.message);
    } else {
      if (window.showAppAlert) await window.showAppAlert('分享功能僅在 LINE App 內可用');
      else alert('分享功能僅在 LINE App 內可用');
    }
  } catch (error) {
    console.error('分享行程錯誤:', error);
    const errMsg = error.message || '分享失敗';
    if (window.showAppAlert) await window.showAppAlert('❌ ' + errMsg);
    else alert('❌ ' + errMsg);
  }
}

/**
 * 查看行程詳情（保留開發模式參數）
 */
function viewEventDetail(eventId) {
  if (window.__savePageState) window.__savePageState();
  var q = (window.LIFF && window.LIFF.isDevMode && window.LIFF.isDevMode()) ? '&dev=1' : '';
  window.location.href = '/event-detail.html?id=' + eventId + q;
}

/**
 * 設定行事曆事件
 */
function setupCalendarEvents() {
  // 上一個月（用「該月 1 號」切換，避免 31 號 setMonth 造成跳兩月）
  const prevBtn = document.getElementById('calendar-prev');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      loadCalendar();
    });
  }

  // 下一個月（同上，避免日數溢出）
  const nextBtn = document.getElementById('calendar-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      loadCalendar();
    });
  }
}

/**
 * HTML 轉義（防止 XSS）
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 頁面載入時初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCalendar);
} else {
  initCalendar();
}

// 匯出函數供其他模組使用
window.Calendar = {
  loadCalendar,
  loadTodayEvents,
  shareEvent,
  viewEventDetail,
};
