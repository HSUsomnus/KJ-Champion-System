/**
 * 行程詳情頁面的前端邏輯
 * 負責顯示行程詳情並處理編輯功能
 */

let eventId = null;
let eventData = null;

/** 是否已綁定編輯表單的整日／時間監聽（避免重複綁定） */
let editFormListenersSetup = false;

/**
 * 初始化行程詳情頁面
 */
async function initEventDetail() {
  // 從 URL 取得行程 ID
  const urlParams = new URLSearchParams(window.location.search);
  eventId = urlParams.get('id');

  if (!eventId) {
    document.getElementById('loading').innerHTML = `
      <div class="empty-state">
        <div>❌</div>
        <p>找不到行程 ID</p>
      </div>
    `;
    return;
  }

  // 等待 LIFF 準備好
  window.addEventListener('liffReady', () => {
    loadEventDetail();
  });

  // 如果 LIFF 已經準備好，直接載入
  if (window.LIFF && window.LIFF.isInitialized()) {
    loadEventDetail();
  } else {
    // 即使 LIFF 未準備好，也可以載入行程詳情
    loadEventDetail();
  }

  // 設定編輯表單提交事件
  const editForm = document.getElementById('event-edit-form');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveEvent();
    });
  }
}

/**
 * 載入行程詳情
 */
async function loadEventDetail() {
  const loading = document.getElementById('loading');
  const detailDiv = document.getElementById('event-detail');

  try {
    const userId = window.LIFF ? window.LIFF.getUserId() : null;
    const url = `/api/calendar/events/${eventId}${userId ? `?userId=${userId}` : ''}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.success) {
      eventData = data.data;
      renderEventDetail(data.data);
      loading.classList.add('hidden');
      detailDiv.classList.remove('hidden');
    } else {
      throw new Error(data.message || '載入行程詳情失敗');
    }
  } catch (error) {
    console.error('載入行程詳情錯誤:', error);
    // 若上一層是已刪除的行程頁，就再往上一層（用上一頁返回）
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    loading.innerHTML = `
      <div class="empty-state">
        <div>❌</div>
        <p>載入失敗：${error.message}</p>
        <button class="btn btn-primary mt-16" onclick="if(window.__savePageState) window.__savePageState(); window.location.href='/index.html';">
          返回首頁
        </button>
      </div>
    `;
  }
}

/**
 * 渲染行程詳情（整日不顯示時間，與 Google Calendar 一致）
 */
function renderEventDetail(event) {
  document.getElementById('event-title').textContent = event.title || '無標題';
  document.getElementById('event-type').textContent = event.type || '活動';
  document.getElementById('event-type').className = `event-type ${event.type || '活動'}`;
  // 整日：依 API 的 allDay，或 start 為僅日期字串（YYYY-MM-DD）時也不顯示時間
  const isAllDay = !!(event.allDay ?? event.all_day) || /^\d{4}-\d{2}-\d{2}$/.test(String(event.start || '').trim());
  document.getElementById('event-date').textContent = formatDateTime(event.start, isAllDay);

  // 備註
  const descriptionItem = document.getElementById('event-description-item');
  const descriptionDiv = document.getElementById('event-description');
  if (event.description) {
    descriptionDiv.textContent = event.description;
    descriptionItem.classList.remove('hidden');
  } else {
    descriptionItem.classList.add('hidden');
  }
}

/**
 * 將 API 的 start/end（ISO 字串）轉成用於表單的本地日期時間
 * 若為「僅日期」格式（YYYY-MM-DD），以本地日期解析，避免時區造成日期錯位
 * @param {string} iso - 例 "2025-01-15" 或 "2025-01-15T08:00:00+08:00"
 * @returns {{ dateStr: string, timeStr: string, date: Date }}
 */
function parseEventDateTime(iso) {
  const pad = (n) => n < 10 ? '0' + n : n;
  const s = String(iso).trim();
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(s);
  let date;
  if (dateOnly) {
    const [y, m, d] = s.split('-').map(Number);
    date = new Date(y, m - 1, d);
  } else {
    date = new Date(s);
  }
  const dateStr = date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  const timeStr = pad(date.getHours()) + ':' + pad(date.getMinutes());
  return { dateStr, timeStr, date };
}

/**
 * 編輯行程：自動帶入原有行程資料（標題、類型、整日、日期時間、備註）
 * 若原行程為整日，進入編輯時「整日」自動勾選，日期時間一併填入
 */
function editEvent() {
  if (!eventData) return;

  // 隱藏詳情，顯示編輯表單
  document.getElementById('event-detail').classList.add('hidden');
  document.getElementById('edit-form').classList.remove('hidden');

  // 帶入標題、類型、備註
  document.getElementById('edit-title').value = eventData.title || '';
  document.getElementById('edit-type').value = eventData.type || '活動';
  document.getElementById('edit-description').value = eventData.description || '';

  const allDayCheckbox = document.getElementById('edit-all-day');
  const dateInput = document.getElementById('edit-date');
  const endDateInput = document.getElementById('edit-end-date');
  const startTimeInput = document.getElementById('edit-start-time');
  const endTimeInput = document.getElementById('edit-end-time');

  // 整日：支援 API 回傳 allDay 或 all_day
  const isAllDay = !!(eventData.allDay ?? eventData.all_day ?? false);

  if (eventData.start) {
    const start = parseEventDateTime(eventData.start);
    dateInput.value = start.dateStr;
    if (eventData.end) {
      const end = parseEventDateTime(eventData.end);
      if (endDateInput) endDateInput.value = end.dateStr;
      if (!isAllDay) endTimeInput.value = end.timeStr;
    } else if (endDateInput) {
      endDateInput.value = start.dateStr;
    }

    allDayCheckbox.checked = isAllDay;
    toggleEditTimeRow(isAllDay, startTimeInput, endTimeInput);

    if (isAllDay) {
      startTimeInput.value = '00:00';
      endTimeInput.value = '23:59';
    } else {
      startTimeInput.value = start.timeStr;
      if (!eventData.end) {
        const endDate = new Date(start.date);
        endDate.setHours(endDate.getHours() + 1, endDate.getMinutes(), 0, 0);
        const pad = (n) => n < 10 ? '0' + n : n;
        endTimeInput.value = pad(endDate.getHours()) + ':' + pad(endDate.getMinutes());
      }
    }
  } else {
    allDayCheckbox.checked = isAllDay;
    if (isAllDay) {
      startTimeInput.value = '00:00';
      endTimeInput.value = '23:59';
    }
    toggleEditTimeRow(isAllDay, startTimeInput, endTimeInput);
  }

  // 整日／時間監聽只綁定一次，避免重複觸發
  if (!editFormListenersSetup) {
    setupAllDayToggle();
    setupTimeAutoUpdate();
    editFormListenersSetup = true;
  }

  if (typeof initTimePickers === 'function') {
    setTimeout(initTimePickers, 100);
  }
}

/**
 * 顯示／隱藏編輯表單的「時間」列（與 Google Calendar 一致：整日時時間選擇消失）
 * @param {boolean} isAllDay - 是否整日
 * @param {HTMLInputElement} startTimeInput - 開始時間
 * @param {HTMLInputElement} endTimeInput - 結束時間
 */
function toggleEditTimeRow(isAllDay, startTimeInput, endTimeInput) {
  const timeRow = document.getElementById('edit-time-row');
  if (!timeRow) return;
  if (isAllDay) {
    timeRow.style.display = 'none';
    startTimeInput.removeAttribute('required');
    endTimeInput.removeAttribute('required');
  } else {
    timeRow.style.display = 'grid';
    startTimeInput.setAttribute('required', 'required');
    endTimeInput.setAttribute('required', 'required');
  }
}

/**
 * 設定整日選項切換（勾選整日時隱藏時間列，取消時顯示）
 */
function setupAllDayToggle() {
  const allDayCheckbox = document.getElementById('edit-all-day');
  const startTimeInput = document.getElementById('edit-start-time');
  const endTimeInput = document.getElementById('edit-end-time');
  if (!allDayCheckbox) return;

  allDayCheckbox.addEventListener('change', function() {
    const isAllDay = this.checked;
    if (isAllDay) {
      startTimeInput.value = '00:00';
      endTimeInput.value = '23:59';
    } else {
      if (!startTimeInput.value) {
        const now = new Date();
        const pad = (n) => n < 10 ? '0' + n : n;
        startTimeInput.value = pad(now.getHours()) + ':' + pad(now.getMinutes());
      }
      if (!endTimeInput.value) {
        const [hours, minutes] = startTimeInput.value.split(':').map(Number);
        const startDate = new Date();
        startDate.setHours(hours, minutes, 0, 0);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        const pad = (n) => n < 10 ? '0' + n : n;
        endTimeInput.value = pad(endDate.getHours()) + ':' + pad(endDate.getMinutes());
      }
    }
    toggleEditTimeRow(isAllDay, startTimeInput, endTimeInput);
  });
}

/**
 * 設定開始時間改變時自動更新結束時間
 */
function setupTimeAutoUpdate() {
  const startTimeInput = document.getElementById('edit-start-time');
  const endTimeInput = document.getElementById('edit-end-time');
  const allDayCheckbox = document.getElementById('edit-all-day');
  
  if (!startTimeInput || !endTimeInput) return;
  
  startTimeInput.addEventListener('change', function() {
    if (!allDayCheckbox || !allDayCheckbox.checked) {
      const startTime = this.value;
      if (startTime) {
        const [hours, minutes] = startTime.split(':').map(Number);
        const startDate = new Date();
        startDate.setHours(hours, minutes, 0, 0);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        const pad = (n) => n < 10 ? '0' + n : n;
        endTimeInput.value = pad(endDate.getHours()) + ':' + pad(endDate.getMinutes());
      }
    }
  });
}

/**
 * 取消編輯
 */
function cancelEdit() {
  document.getElementById('edit-form').classList.add('hidden');
  document.getElementById('event-detail').classList.remove('hidden');
}

/**
 * 刪除行程
 */
async function deleteEvent() {
  if (!eventId) return;
  
  // 確認刪除（統一彈窗風格）
  const confirmed = window.showAppConfirm ? await window.showAppConfirm('⚠️ 確定要刪除這個行程嗎？\n\n此操作無法復原！', { yesText: '確定', noText: '取消' }) : confirm('⚠️ 確定要刪除這個行程嗎？\n\n此操作無法復原！');
  if (!confirmed) return;
  
  const doubleConfirmed = window.showAppConfirm ? await window.showAppConfirm('⚠️ 最後確認：確定要刪除「' + (eventData?.title || '這個行程') + '」嗎？', { yesText: '確定', noText: '取消' }) : confirm('⚠️ 最後確認：確定要刪除「' + (eventData?.title || '這個行程') + '」嗎？');
  if (!doubleConfirmed) return;
  
  try {
    const userId = window.LIFF ? window.LIFF.getUserId() : null;
    
    if (!userId) {
      if (window.showAppAlert) await window.showAppAlert('無法取得使用者 ID，請在 LINE 中開啟此應用程式');
      else alert('無法取得使用者 ID，請在 LINE 中開啟此應用程式');
      return;
    }

    const response = await fetch(`/api/calendar/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'X-Line-User-Id': userId,
      },
    });

    const data = await response.json();

    if (data.success) {
      if (window.cacheService && typeof window.cacheService.clearCache === 'function') {
        window.cacheService.clearCache();
      }
      if (window.showAppAlert) await window.showAppAlert('✅ 行程已刪除');
      else alert('✅ 行程已刪除');
      if (window.history.length > 1) {
        window.history.back();
      } else {
        const dev = window.LIFF && window.LIFF.isDevMode && window.LIFF.isDevMode();
        window.location.href = '/index.html' + (dev ? '?dev=1' : '');
      }
    } else {
      if (window.showAppAlert) await window.showAppAlert('❌ 刪除失敗：' + (data.message || '未知錯誤'));
      else alert('❌ 刪除失敗：' + (data.message || '未知錯誤'));
    }
  } catch (error) {
    console.error('刪除行程錯誤:', error);
    if (window.showAppAlert) await window.showAppAlert('❌ 刪除失敗，請稍後再試');
    else alert('❌ 刪除失敗，請稍後再試');
  }
}

/**
 * 儲存行程
 */
async function saveEvent() {
  try {
    const userId = window.LIFF ? window.LIFF.getUserId() : null;
    
    if (!userId) {
      if (window.showAppAlert) await window.showAppAlert('無法取得使用者 ID，請在 LINE 中開啟此應用程式');
      else alert('無法取得使用者 ID，請在 LINE 中開啟此應用程式');
      return;
    }

    const dateInput = document.getElementById('edit-date');
    const endDateInput = document.getElementById('edit-end-date');
    const startTimeInput = document.getElementById('edit-start-time');
    const endTimeInput = document.getElementById('edit-end-time');
    const allDayCheckbox = document.getElementById('edit-all-day');
    
    const dateVal = dateInput ? dateInput.value : '';
    let endDateVal = endDateInput ? endDateInput.value : '';
    if (!endDateVal) endDateVal = dateVal;
    const startTimeVal = startTimeInput ? startTimeInput.value : '';
    const endTimeVal = endTimeInput ? endTimeInput.value : '';
    const isAllDay = allDayCheckbox ? allDayCheckbox.checked : false;

    if (!dateVal || (!isAllDay && (!startTimeVal || !endTimeVal))) {
      if (window.showAppAlert) await window.showAppAlert('請填寫日期和時間');
      else alert('請填寫日期和時間');
      return;
    }
    if (endDateVal < dateVal) {
      if (window.showAppAlert) await window.showAppAlert('結束日期不可早於開始日期');
      else alert('結束日期不可早於開始日期');
      return;
    }

    let startISO, endISO;
    if (isAllDay) {
      startISO = dateVal + 'T00:00:00+08:00';
      endISO = endDateVal + 'T23:59:59+08:00';
    } else {
      startISO = dateVal + 'T' + startTimeVal + ':00+08:00';
      endISO = endDateVal + 'T' + endTimeVal + ':00+08:00';
      const startDate = new Date(startISO);
      const endDate = new Date(endISO);
      if (endDate < startDate) {
        endDate.setDate(endDate.getDate() + 1);
        const pad = (n) => n < 10 ? '0' + n : n;
        endISO = endDate.getFullYear() + '-' + pad(endDate.getMonth() + 1) + '-' + pad(endDate.getDate()) + 'T' + endTimeVal + ':00+08:00';
      }
    }

    const formData = {
      title: document.getElementById('edit-title').value,
      type: document.getElementById('edit-type').value,
      start: startISO,
      end: endISO,
      allDay: isAllDay,
      location: '',
      description: document.getElementById('edit-description').value,
    };

    // 更新行程
    const response = await fetch(`/api/calendar/events/${eventId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Line-User-Id': userId,
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (data.success) {
      eventData = data.data;

      // 清除列表／行事曆快取，避免返回時字卡仍顯示舊資料
      if (window.cacheService && typeof window.cacheService.clearCache === 'function') {
        window.cacheService.clearCache();
      }

      // 跳出「是否分享」對話框（是／否按鈕），不直接跳分享
      var wantShare = window.showShareConfirm && await window.showShareConfirm('✅ 行程更新成功！是否要分享這個行程？');
      if (wantShare) {
        await shareEvent();
      }

      // 重新載入詳情
      await loadEventDetail();
      cancelEdit();
    } else {
      if (window.showAppAlert) await window.showAppAlert('❌ 更新失敗：' + (data.message || '未知錯誤'));
      else alert('❌ 更新失敗：' + (data.message || '未知錯誤'));
    }
  } catch (error) {
    console.error('儲存行程錯誤:', error);
    if (window.showAppAlert) await window.showAppAlert('❌ 儲存失敗，請稍後再試');
    else alert('❌ 儲存失敗，請稍後再試');
  }
}

/**
 * 分享行程（LIFF shareTargetPicker，字卡內有詳情按鈕）
 */
async function shareEvent() {
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
 * 格式化日期時間（與 Google Calendar 一致：整日只顯示日期，不顯示時間）
 * @param {string} dateTimeStr - API 的 start（ISO 字串）
 * @param {boolean} allDay - 是否整日
 */
function formatDateTime(dateTimeStr, allDay = false) {
  const s = String(dateTimeStr).trim();
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(s);
  const date = dateOnly
    ? new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)))
    : new Date(dateTimeStr);

  if (allDay) {
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  }

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

// 匯出函數供全域使用
window.shareEvent = shareEvent;
window.editEvent = editEvent;
window.cancelEdit = cancelEdit;
window.deleteEvent = deleteEvent;

// 頁面載入時初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEventDetail);
} else {
  initEventDetail();
}
