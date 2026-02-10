/**
 * 列表模式的前端邏輯
 * 負責顯示三個類型分頁的行程列表
 */

// 當前載入的月份資料（每個類型）；「全部」不篩選類型
const eventsByType = {
  '全部': {},
  '學員上課': {},
  '活動': {},
  '諮詢簽約': {},
};

// 當前顯示的月份
let currentMonth = new Date().getMonth() + 1;
let currentYear = new Date().getFullYear();

// 當前顯示的分頁索引（0 = 全部，預設最先顯示）
let currentTabIndex = 0;
const tabTypes = ['全部', '學員上課', '活動', '諮詢簽約'];

/**
 * 初始化列表頁面
 */
async function initList() {
  setupTabs();
  setupMonthNavigation();

  // 從詳情／新增返回時（bfcache 還原）重新載入當前分頁，避免字卡與詳情不一致
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      eventsByType['全部'] = {};
      eventsByType['學員上課'] = {};
      eventsByType['活動'] = {};
      eventsByType['諮詢簽約'] = {};
      loadEventsForType(tabTypes[currentTabIndex]);
    }
  });

  window.addEventListener('liffReady', () => {
    updateMonthDisplay();
    loadEventsForType('全部');
  });

  if (window.LIFF && window.LIFF.isInitialized()) {
    updateMonthDisplay();
    loadEventsForType('全部');
  } else {
    setTimeout(() => {
      updateMonthDisplay();
      loadEventsForType('全部');
    }, 100);
  }
}

/**
 * 設定新增按鈕（根據當前分頁類型設定預設類型）
 */
function setupAddButton() {
  const addBtn = document.getElementById('list-add-btn');
  if (!addBtn) return;
  
  // 維持開發模式連結（僅 localhost 為開發模式；ngrok／正式為內測）
  const dev = window.LIFF && window.LIFF.isDevMode && window.LIFF.isDevMode();
  const q = dev ? '?dev=1&' : '?';
  
  // 監聽分頁切換，更新新增按鈕的連結（「全部」分頁時預設類型為學員上課）
  const updateAddButton = () => {
    const currentType = tabTypes[currentTabIndex];
    const typeForAdd = (currentType === '全部') ? '學員上課' : currentType;
    addBtn.href = `/add-event.html${q}type=${encodeURIComponent(typeForAdd)}&return=${encodeURIComponent('/list.html' + (dev ? '?dev=1' : ''))}`;
  };
  
  updateAddButton();
  
  // 儲存更新函數供其他地方使用
  window.updateAddButton = updateAddButton;
}

/**
 * 統一切換分頁的函數
 */
function switchTabByIndex(index) {
  if (index < 0 || index >= tabTypes.length) return;
  
  currentTabIndex = index;
  // 供 scroll-restore.js 記住分頁層級，按上一頁時還原
  window.__currentTabIndex = index;
  const type = tabTypes[index];
  
  // 更新按鈕狀態
  document.querySelectorAll('.tab-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === index);
  });
  
  // 更新內容顯示
  document.querySelectorAll('.tab-content').forEach((content, i) => {
    content.classList.toggle('active', i === index);
  });
  
  // 載入該類型的行程
  loadEventsForType(type);
  
  // 更新新增按鈕
  if (window.updateAddButton) {
    window.updateAddButton();
  }
}

// 供 scroll-restore.js 在「上一頁」回到列表時還原分頁與捲動位置
window.__currentTabIndex = 0;
window.__restoreListTab = switchTabByIndex;
// 取得列表頁「分頁內容區」的捲動位置（可捲動的是 #tab-content-wrapper）
window.__getListScrollTop = function () {
  var el = document.getElementById('tab-content-wrapper');
  return el ? el.scrollTop : 0;
};
// 設定列表頁分頁內容區的捲動位置
window.__setListScrollTop = function (y) {
  var el = document.getElementById('tab-content-wrapper');
  if (el && typeof y === 'number' && y >= 0) el.scrollTop = y;
};

/**
 * 設定分頁切換（僅點擊分頁按鈕，已取消滑動切換分頁）
 */
function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  
  tabButtons.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      // 使用統一切換函數
      switchTabByIndex(index);
    });
  });
}

/**
 * 設定月份切換按鈕
 */
function setupMonthNavigation() {
  const prevBtn = document.getElementById('prev-month-btn');
  const nextBtn = document.getElementById('next-month-btn');
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      changeMonth(-1);
    });
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      changeMonth(1);
    });
  }
}

/**
 * 切換月份（direction: -1 = 上一個月, 1 = 下一個月）
 */
function changeMonth(direction) {
  currentMonth += direction;
  
  // 處理跨年
  if (currentMonth < 1) {
    currentMonth = 12;
    currentYear--;
  } else if (currentMonth > 12) {
    currentMonth = 1;
    currentYear++;
  }
  
  // 清除當前月份的快取資料（讓它重新載入）
  const cacheKey = `${currentYear}-${currentMonth}`;
  tabTypes.forEach(type => {
    if (eventsByType[type] && eventsByType[type][cacheKey]) {
      delete eventsByType[type][cacheKey];
    }
  });
  
  // 更新月份顯示
  updateMonthDisplay();
  
  // 重新載入當前分頁的資料
  loadEventsForType(tabTypes[currentTabIndex]);
}

/**
 * 更新月份顯示文字
 */
function updateMonthDisplay() {
  const display = document.getElementById('current-month-display');
  if (display) {
    display.textContent = `${currentYear}年${currentMonth}月`;
  }
}

/**
 * 載入指定類型的行程（僅載入當前選擇的月份）
 */
async function loadEventsForType(type) {
  const tabContent = document.getElementById(`tab-${type}`);
  if (!tabContent) return;

  // 顯示資料加載動畫（與行事曆一致：透明毛玻璃 + 康九 logo）
  tabContent.innerHTML = `
    <div class="loading data-loading data-loading-overlay">
      <div class="data-loading-inner">
        <img src="/images/logo.png" alt="康九" class="data-loading-logo">
        <p class="data-loading-text">載入中...</p>
      </div>
    </div>
  `;

  try {
    // 只載入當前選擇的月份
    const cacheKey = `${currentYear}-${currentMonth}`;
    let allEvents = [];

    // 檢查是否已經載入過
    if (eventsByType[type][cacheKey]) {
      allEvents = eventsByType[type][cacheKey];
    } else {
      // 從 API 載入（「全部」不傳 type，後端回傳所有類型）
      const userId = window.LIFF ? window.LIFF.getUserId() : null;
      const typeParam = (type === '全部') ? '' : `&type=${encodeURIComponent(type)}`;
      const url = `/api/calendar/month?year=${currentYear}&month=${currentMonth}${typeParam}${userId ? `&userId=${userId}` : ''}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        eventsByType[type][cacheKey] = data.data;
        allEvents = data.data;
      }
    }

    // 渲染行程列表
    renderEventsList(tabContent, allEvents, type);
  } catch (error) {
    console.error('載入行程列表錯誤:', error);
    tabContent.innerHTML = `
      <div class="empty-state">
        <div>❌</div>
        <p>載入失敗，請稍後再試</p>
      </div>
    `;
  }
}

/**
 * 渲染行程列表
 */
function renderEventsList(container, events, type) {
  if (events.length === 0) {
    const emptyLabel = (type === '全部') ? '目前沒有行程' : `目前沒有 ${type} 類型的行程`;
    container.innerHTML = `
      <div class="empty-state">
        <div>📅</div>
        <p>${emptyLabel}</p>
      </div>
    `;
    return;
  }

  // 依月份分組
  const eventsByMonth = {};
  events.forEach(event => {
    const date = new Date(event.start);
    const monthKey = `${date.getFullYear()}年${date.getMonth() + 1}月`;
    
    if (!eventsByMonth[monthKey]) {
      eventsByMonth[monthKey] = [];
    }
    eventsByMonth[monthKey].push(event);
  });

  // 渲染每個月份的行程
  let html = '';
  Object.keys(eventsByMonth).sort().forEach(monthKey => {
    // 解析月份字串，取得年份和月份
    const monthMatch = monthKey.match(/(\d+)年(\d+)月/);
    const year = monthMatch ? parseInt(monthMatch[1]) : new Date().getFullYear();
    const month = monthMatch ? parseInt(monthMatch[2]) : new Date().getMonth() + 1;
    
    // 月份標題 + 右側按鈕（分享整月 + 新增）
    // 將 type 轉換為安全的 JavaScript 字串（處理單引號）
    const safeType = escapeHtml(type).replace(/'/g, "\\'");
    const typeForAdd = (type === '全部') ? '學員上課' : type;

    // 組合「新增」連結（保留 dev，並回到列表頁；「全部」時預設類型學員上課）
    const dev = window.LIFF && window.LIFF.isDevMode && window.LIFF.isDevMode();
    const q = dev ? '?dev=1&' : '?';
    const returnUrl = '/list.html' + (dev ? '?dev=1' : '');
    const addHref = `/add-event.html${q}type=${encodeURIComponent(typeForAdd)}&return=${encodeURIComponent(returnUrl)}`;

    html += `
      <div style="display: flex; justify-content: space-between; align-items: center; margin: 16px 0;">
        <h3 style="margin: 0;">${monthKey}</h3>
        <div style="display:flex; gap:8px; align-items:center;">
          <button class="btn btn-primary btn-small share-btn" onclick="shareMonthEvents(${year}, ${month}, '${safeType}')" style="padding: 6px 12px; font-size: 13px;">
            🔗 分享整月
          </button>
          <a class="btn btn-primary btn-small" href="${addHref}" style="padding: 6px 12px; font-size: 13px;">
            ➕ 新增
          </a>
        </div>
      </div>
    `;
    
    html += eventsByMonth[monthKey].map(event => `
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
  });

  container.innerHTML = html;
}

/**
 * 分享行程（單一行程用 Flex 字卡分享，非文字）
 */
async function shareEvent(eventId) {
  try {
    const response = await fetch(`/api/line/share-message/${eventId}`);
    const data = await response.json();

    if (!data.success || !data.data) {
      if (window.showAppAlert) await window.showAppAlert('無法取得分享內容');
      else alert('無法取得分享內容');
      return;
    }
    const msgData = data.data;
    if (typeof liff !== 'undefined' && liff.shareTargetPicker && msgData.flexMessage) {
      const messages = [{
        type: 'flex',
        altText: msgData.message,
        contents: msgData.flexMessage,
      }];
      if (msgData.quickReply) {
        messages[0].quickReply = msgData.quickReply;
      }
      await liff.shareTargetPicker(messages);
    } else if (window.LIFF && window.LIFF.shareMessage) {
      await window.LIFF.shareMessage(msgData.message);
    } else {
      if (window.showAppAlert) await window.showAppAlert('無法取得分享內容');
      else alert('無法取得分享內容');
    }
  } catch (error) {
    console.error('分享行程錯誤:', error);
    if (window.showAppAlert) await window.showAppAlert('分享失敗，請稍後再試');
    else alert('分享失敗，請稍後再試');
  }
}

/**
 * 分享整月行程（LIFF shareTargetPicker，純文字）
 */
async function shareMonthEvents(year, month, type) {
  try {
    const response = await fetch(`/api/line/share-month-message?year=${year}&month=${month}&type=${encodeURIComponent(type)}`);
    const data = await response.json();

    if (data.success && window.LIFF && data.data.message) {
      if (typeof liff !== 'undefined' && liff.shareTargetPicker) {
        const messages = [{ type: 'text', text: data.data.message }];
        await liff.shareTargetPicker(messages);
      } else if (window.LIFF.shareMessage) {
        await window.LIFF.shareMessage(data.data.message);
      }
    } else {
      const errMsg = data.message || '無法取得分享內容';
      if (window.showAppAlert) await window.showAppAlert('❌ ' + errMsg);
      else alert('❌ ' + errMsg);
    }
  } catch (error) {
    console.error('分享整月行程錯誤:', error);
    const errMsg = error.message || '分享失敗';
    if (window.showAppAlert) await window.showAppAlert('❌ ' + errMsg);
    else alert('❌ ' + errMsg);
  }
}

// 將函數暴露到全域，供 HTML 中的 onclick 使用
window.shareMonthEvents = shareMonthEvents;

/**
 * 查看行程詳情
 */
function viewEventDetail(eventId) {
  var q = (window.LIFF && window.LIFF.isDevMode && window.LIFF.isDevMode()) ? '&dev=1' : '';
  if (window.__savePageState) window.__savePageState();
  window.location.href = '/event-detail.html?id=' + eventId + q;
}

/**
 * 格式化日期時間（24小時制）
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
 * HTML 轉義
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 頁面載入時初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initList);
} else {
  initList();
}
