/**
 * 行程詳情頁面的前端邏輯
 * 負責顯示行程詳情並處理編輯功能
 */

let eventId = null;
let eventData = null;

/** 是否已綁定編輯表單的整日／時間監聽（避免重複綁定） */
let editFormListenersSetup = false;

/** 依行程類型顯示不同的標題提示詞（placeholder + 下方灰色說明） */
const TITLE_HINTS = {
  '學員上課': '名字+金流課/藍圖課，ex:小陞金流課',
  '活動': '時間(選)+名稱+(財商/加盟)(選)，ex:13台北組聚(財商)、醫美茶會',
  '諮詢簽約': '時間+名字+保單諮詢/財物諮詢/保單簽約/天耀簽約，ex:13小陞財務諮詢'
};
/** 若提示詞會斷行，則縮小字體直到單行顯示 */
function shrinkHintToSingleLine(hintEl) {
  if (!hintEl) return;
  hintEl.style.whiteSpace = 'nowrap';
  hintEl.style.fontSize = '12px';
  hintEl.style.overflow = '';
  const minFontSize = 9;
  function fit() {
    if (hintEl.scrollWidth > hintEl.clientWidth) {
      const fs = parseInt(hintEl.style.fontSize, 10) || 12;
      if (fs > minFontSize) {
        hintEl.style.fontSize = (fs - 1) + 'px';
        requestAnimationFrame(fit);
      } else {
        // 已縮到最小仍放不下：改為換行，完整顯示不切掉
        hintEl.style.whiteSpace = 'normal';
        hintEl.style.overflow = 'visible';
      }
    } else {
      hintEl.classList.add('hint-single-line');
    }
  }
  requestAnimationFrame(fit);
}
function updateEditTitleHint() {
  const typeSelect = document.getElementById('edit-type');
  const type = typeSelect ? typeSelect.value : '學員上課';
  const hint = TITLE_HINTS[type] || TITLE_HINTS['學員上課'];
  const titleInput = document.getElementById('edit-title');
  const hintEl = document.getElementById('edit-title-hint');
  if (titleInput) titleInput.placeholder = hint;
  if (hintEl) {
    hintEl.textContent = hint;
    hintEl.classList.remove('hint-single-line');
    hintEl.style.whiteSpace = '';
    hintEl.style.fontSize = '';
    hintEl.style.overflow = '';
    requestAnimationFrame(() => shrinkHintToSingleLine(hintEl));
  }
}

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
  // 依目前類型更新標題提示詞（placeholder + 下方說明）
  updateEditTitleHint();

  const allDayCheckbox = document.getElementById('edit-all-day');
  const dateInput = document.getElementById('edit-date');
  const endDateInput = document.getElementById('edit-end-date');
  const startTimeInput = document.getElementById('edit-start-time');
  const endTimeInput = document.getElementById('edit-end-time');

  // 整日：與新增行程同步——只有「學員上課」默認整日並隱藏時間；活動、諮詢簽約一律顯示時間選擇
  const eventType = eventData.type || '活動';
  const isAllDay = (eventType === '學員上課') ? true : false;

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
    if (window.editDateFp) window.editDateFp.setDate(dateInput.value, false);
    if (window.editEndDateFp) window.editEndDateFp.setDate(endDateInput.value || dateInput.value, false);
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
    // 只有「學員上課」鎖住默認整日並隱藏時間；選「活動」「諮詢簽約」時改為非整日並顯示時間
    const editTypeSelect = document.getElementById('edit-type');
    if (editTypeSelect) {
      editTypeSelect.addEventListener('change', function () {
        updateEditTitleHint();
        const cb = document.getElementById('edit-all-day');
        const startTimeInput = document.getElementById('edit-start-time');
        const endTimeInput = document.getElementById('edit-end-time');
        if (this.value === '學員上課') {
          if (cb) cb.checked = true;
          if (startTimeInput) startTimeInput.value = '00:00';
          if (endTimeInput) endTimeInput.value = '23:59';
          toggleEditTimeRow(true, startTimeInput, endTimeInput);
        } else {
          // 活動、諮詢簽約：預設非整日，顯示時間選擇
          if (cb) cb.checked = false;
          if (startTimeInput) startTimeInput.disabled = false;
          if (endTimeInput) endTimeInput.disabled = false;
          toggleEditTimeRow(false, startTimeInput, endTimeInput);
        }
      });
    }
    editFormListenersSetup = true;
  }

  // 方案 3：編輯表單 Flatpickr + 今天／明天 + 時間 Chip（僅首次綁定）
  initEditFormDatePickers();
  setupEditFormDateShortcutsAndChips();
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
 * 方案 3：編輯表單 Flatpickr 日期選擇（僅初始化一次）
 */
function initEditFormDatePickers() {
  if (window.editDateFp) return;
  const editDateEl = document.getElementById('edit-date');
  const editEndDateEl = document.getElementById('edit-end-date');
  if (typeof flatpickr === 'undefined' || !editDateEl) return;
  window.editDateFp = flatpickr(editDateEl, {
    dateFormat: 'Y-m-d',
    locale: (flatpickr.l10ns && flatpickr.l10ns.zh) ? 'zh' : undefined,
    allowInput: false,
    onChange: function (selectedDates, dateStr) {
      if (editEndDateEl && !editEndDateEl.value) {
        editEndDateEl.value = dateStr;
        if (window.editEndDateFp) window.editEndDateFp.setDate(dateStr, false);
      }
    }
  });
  if (editEndDateEl) {
    window.editEndDateFp = flatpickr(editEndDateEl, {
      dateFormat: 'Y-m-d',
      locale: (flatpickr.l10ns && flatpickr.l10ns.zh) ? 'zh' : undefined,
      allowInput: false
    });
  }
}

/**
 * 方案 3：編輯表單「今天／明天」按鈕與時間 Chip（僅綁定一次）
 */
function setupEditFormDateShortcutsAndChips() {
  if (window.editFormShortcutsSetup) return;
  const pad = (n) => n < 10 ? '0' + n : n;
  document.querySelectorAll('.btn-edit-date-shortcut').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const targetId = this.getAttribute('data-target');
      const days = parseInt(this.getAttribute('data-days'), 10) || 0;
      const d = new Date();
      d.setDate(d.getDate() + days);
      const val = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
      const target = document.getElementById(targetId);
      if (target) {
        target.value = val;
        if (targetId === 'edit-date' && window.editDateFp) window.editDateFp.setDate(val, false);
        if (targetId === 'edit-end-date' && window.editEndDateFp) window.editEndDateFp.setDate(val, false);
        if (targetId === 'edit-date') {
          const endEl = document.getElementById('edit-end-date');
          if (endEl && !endEl.value) {
            endEl.value = val;
            if (window.editEndDateFp) window.editEndDateFp.setDate(val, false);
          }
        }
      }
    });
  });
  document.querySelectorAll('#edit-date-time-group .time-chips').forEach(function (wrap) {
    const targetId = wrap.getAttribute('data-target');
    const timeInput = targetId ? document.getElementById(targetId) : null;
    if (!timeInput) return;
    wrap.querySelectorAll('.time-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        const t = this.getAttribute('data-time');
        if (t) timeInput.value = t;
      });
    });
  });
  window.editFormShortcutsSetup = true;
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
 * 分享行程（與行事曆／列表相同：純文字分享，不依賴 LIFF）
 */
async function shareEvent() {
  try {
    const response = await fetch(`/api/line/share-message/${eventId}`);
    const data = await response.json();

    if (!data.success || !data.data || !data.data.message) {
      const errMsg = data.message || '無法取得分享內容';
      if (window.showAppAlert) await window.showAppAlert('❌ ' + errMsg);
      else alert('❌ ' + errMsg);
      return;
    }

    if (window.LIFF && window.LIFF.shareMessage) {
      await window.LIFF.shareMessage(data.data.message);
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
