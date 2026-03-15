/**
 * 新增行程頁面的前端邏輯
 */

(function () {
  // 僅 localhost 為開發模式；ngrok／正式為內測
  var dev = window.LIFF && window.LIFF.isDevMode && window.LIFF.isDevMode();
  var q = dev ? '?dev=1' : '';
  var cancelLink = document.getElementById('add-cancel-link');
  if (cancelLink) cancelLink.href = '/index.html' + q;
  document.querySelectorAll('.bottom-nav a').forEach(function (a) {
    var base = (a.getAttribute('href') || '').split('?')[0];
    if (base) a.href = base + q;
  });

  // 依行程類型顯示不同的標題提示詞（placeholder + 下方灰色說明）
  var TITLE_HINTS = {
    '學員上課': '名字+金流課/藍圖課，ex:小陞金流課',
    '活動': '時間(選)+名稱+(財商/加盟)(選)，ex:13台北組聚(財商)、醫美茶會',
    '諮詢簽約': '時間+名字+保單諮詢/財物諮詢/保單簽約/天耀簽約，ex:13小陞財務諮詢',
    '紫星行程聊聊': '時間+名字+聊聊or其他'
  };
  // 若提示詞會斷行，則縮小字體直到單行；縮到最小仍放不下則改為換行，避免被切掉
  function shrinkHintToSingleLine(hintEl) {
    if (!hintEl) return;
    hintEl.style.whiteSpace = 'nowrap';
    hintEl.style.fontSize = '12px';
    hintEl.style.overflow = '';
    var minFontSize = 9;
    function fit() {
      if (hintEl.scrollWidth > hintEl.clientWidth) {
        var fs = parseInt(hintEl.style.fontSize, 10) || 12;
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
  function updateAddTitleHint() {
    var type = typeSelect ? typeSelect.value : '學員上課';
    var hint = TITLE_HINTS[type] || TITLE_HINTS['學員上課'];
    var titleInput = document.getElementById('add-title');
    var hintEl = document.getElementById('add-title-hint');
    if (titleInput) titleInput.placeholder = hint;
    if (hintEl) {
      hintEl.textContent = hint;
      hintEl.classList.remove('hint-single-line');
      hintEl.style.whiteSpace = '';
      hintEl.style.fontSize = '';
      hintEl.style.overflow = '';
      requestAnimationFrame(function () { shrinkHintToSingleLine(hintEl); });
    }
  }

  // 從 URL 參數讀取預設類型
  var urlParams = new URLSearchParams(location.search);
  var defaultType = urlParams.get('type');
  var typeSelect = document.getElementById('add-type');
  if (typeSelect) {
    if (defaultType) typeSelect.value = defaultType;
    // 類型為「學員上課」時預設勾選整日（下方初始化整日後會依此更新）
  }
  updateAddTitleHint();
  if (typeSelect) typeSelect.addEventListener('change', updateAddTitleHint);

  // 從 URL 參數讀取預設日期（從行事曆頁點「新增行程」會帶 date=YYYY-MM-DD）
  var defaultDate = urlParams.get('date');

  // 整日選項處理
  var allDayCheckbox = document.getElementById('add-all-day');
  var dateTimeGroup = document.getElementById('date-time-group');
  var timeRow = document.getElementById('add-time-row'); // 整日時隱藏時間選擇區塊
  var startTimeInput = document.getElementById('add-start-time');
  var endTimeInput = document.getElementById('add-end-time');
  var dateInput = document.getElementById('add-date');
  var endDateInput = document.getElementById('add-end-date');

  // 依整日勾選顯示／隱藏時間選擇區塊
  function toggleTimeRowVisibility() {
    var isAllDay = allDayCheckbox ? allDayCheckbox.checked : false;
    if (timeRow) timeRow.style.display = isAllDay ? 'none' : 'grid';
  }

  // 設定預設日期為今天（Flatpickr 初始化前先填值）
  var today = new Date();
  var pad = function (n) { return n < 10 ? '0' + n : n; };
  var todayStr = today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate());
  if (dateInput && !dateInput.value) {
    dateInput.value = defaultDate || todayStr;
  }
  if (endDateInput && !endDateInput.value) {
    endDateInput.value = dateInput ? dateInput.value : todayStr;
  }

  // 方案 3：Flatpickr 日期選擇（手機自動用原生）
  var addDateEl = dateInput;
  var addEndDateEl = endDateInput;
  if (typeof flatpickr !== 'undefined' && addDateEl) {
    var fpStart = flatpickr(addDateEl, {
      dateFormat: 'Y-m-d',
      locale: (typeof flatpickr !== 'undefined' && flatpickr.l10ns && flatpickr.l10ns.zh) ? 'zh' : undefined,
      allowInput: false,
      onChange: function (selectedDates, dateStr) {
        if (addEndDateEl && !addEndDateEl.value) addEndDateEl.value = dateStr;
        if (window.addEndDateFp && window.addEndDateFp.setDate) window.addEndDateFp.setDate(dateStr, false);
      }
    });
    if (addEndDateEl) {
      window.addEndDateFp = flatpickr(addEndDateEl, {
        dateFormat: 'Y-m-d',
        locale: (flatpickr.l10ns && flatpickr.l10ns.zh) ? 'zh' : undefined,
        allowInput: false
      });
    }
  }
  if (dateInput) {
    dateInput.addEventListener('change', function () {
      if (endDateInput && !endDateInput.value) endDateInput.value = this.value;
    });
  }

  // 今天／明天快捷按鈕
  document.querySelectorAll('.btn-date-shortcut').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var targetId = this.getAttribute('data-target');
      var days = parseInt(this.getAttribute('data-days'), 10) || 0;
      var d = new Date();
      d.setDate(d.getDate() + days);
      var pad = function (n) { return n < 10 ? '0' + n : n; };
      var val = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
      var target = document.getElementById(targetId);
      if (target) {
        target.value = val;
        if (targetId === 'add-date' && addEndDateEl && !addEndDateEl.value) addEndDateEl.value = val;
        if (window.addEndDateFp && targetId === 'add-date' && addEndDateEl && !addEndDateEl.value) window.addEndDateFp.setDate(val, false);
      }
    });
  });

  // 時間 Chip：點擊帶入對應時間
  document.querySelectorAll('.time-chips').forEach(function (wrap) {
    var targetId = wrap.getAttribute('data-target');
    var timeInput = targetId ? document.getElementById(targetId) : null;
    if (!timeInput) return;
    wrap.querySelectorAll('.time-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var t = this.getAttribute('data-time');
        if (t) timeInput.value = t;
      });
    });
  });

  // 設定預設時間為現在和一小時後
  var now = new Date();
  var end = new Date(now.getTime() + 60 * 60 * 1000);
  var timeStr = function (d) {
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  };
  if (startTimeInput && !startTimeInput.value) {
    startTimeInput.value = timeStr(now);
  }
  if (endTimeInput && !endTimeInput.value) {
    endTimeInput.value = timeStr(end);
  }

  // 「學員上課」時整日鎖住勾選且無法解除；活動、諮詢簽約可自由切換整日
  function syncAllDayByType() {
    if (!typeSelect || !allDayCheckbox) return;
    if (typeSelect.value === '學員上課') {
      allDayCheckbox.checked = true;
      allDayCheckbox.disabled = true; // 學員上課：整日鎖住，無法取消勾選
      if (startTimeInput) { startTimeInput.value = '00:00'; startTimeInput.disabled = true; }
      if (endTimeInput) { endTimeInput.value = '23:59'; endTimeInput.disabled = true; }
    } else {
      allDayCheckbox.disabled = false; // 活動、諮詢簽約：可切換整日
      allDayCheckbox.checked = false;
      if (startTimeInput) { startTimeInput.disabled = false; if (!startTimeInput.value) startTimeInput.value = timeStr(now); }
      if (endTimeInput) { endTimeInput.disabled = false; if (!endTimeInput.value) endTimeInput.value = timeStr(end); }
    }
  }
  syncAllDayByType();
  toggleTimeRowVisibility(); // 初始載入時依整日勾選顯示／隱藏時間區塊
  if (typeSelect) {
    typeSelect.addEventListener('change', function () {
      if (this.value === '學員上課') {
        allDayCheckbox.checked = true;
        allDayCheckbox.disabled = true;
        if (startTimeInput) { startTimeInput.value = '00:00'; startTimeInput.disabled = true; }
        if (endTimeInput) { endTimeInput.value = '23:59'; endTimeInput.disabled = true; }
      } else {
        allDayCheckbox.disabled = false;
        allDayCheckbox.checked = false;
        if (startTimeInput) { startTimeInput.disabled = false; if (!startTimeInput.value) startTimeInput.value = timeStr(now); }
        if (endTimeInput) { endTimeInput.disabled = false; if (!endTimeInput.value) endTimeInput.value = timeStr(end); }
      }
      toggleTimeRowVisibility();
    });
  }

  // 整日選項切換：勾選整日時隱藏時間選擇區塊（學員上課時整日已鎖住，不會觸發）
  if (allDayCheckbox) {
    allDayCheckbox.addEventListener('change', function () {
      if (typeSelect && typeSelect.value === '學員上課') return; // 學員上課整日鎖住，不處理
      var isAllDay = this.checked;
      if (isAllDay) {
        if (startTimeInput) { startTimeInput.value = '00:00'; startTimeInput.disabled = true; }
        if (endTimeInput) { endTimeInput.value = '23:59'; endTimeInput.disabled = true; }
      } else {
        if (startTimeInput) { startTimeInput.disabled = false; if (!startTimeInput.value) startTimeInput.value = timeStr(now); }
        if (endTimeInput) { endTimeInput.disabled = false; if (!endTimeInput.value) endTimeInput.value = timeStr(end); }
      }
      toggleTimeRowVisibility();
    });
  }

  // 開始時間改變時，自動設定結束時間為一小時後
  if (startTimeInput) {
    startTimeInput.addEventListener('change', function () {
      if (!allDayCheckbox || !allDayCheckbox.checked) {
        var startTime = this.value;
        if (startTime && endTimeInput) {
          var [hours, minutes] = startTime.split(':').map(Number);
          var startDate = new Date();
          startDate.setHours(hours, minutes, 0, 0);
          var endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
          endTimeInput.value = timeStr(endDate);
        }
      }
    });
  }

  var form = document.getElementById('event-add-form');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var userId = window.LIFF && window.LIFF.getUserId ? window.LIFF.getUserId() : null;
    if (!userId) {
      if (window.showAppAlert) await window.showAppAlert('無法取得使用者 ID，請在 LINE 中開啟或使用開發模式');
      else alert('無法取得使用者 ID，請在 LINE 中開啟或使用開發模式');
      return;
    }

    var dateVal = dateInput ? dateInput.value : '';
    var endDateVal = endDateInput ? endDateInput.value : '';
    if (!endDateVal) endDateVal = dateVal;
    var startTimeVal = startTimeInput ? startTimeInput.value : '';
    var endTimeVal = endTimeInput ? endTimeInput.value : '';
    var isAllDay = allDayCheckbox ? allDayCheckbox.checked : false;

    if (!dateVal || (!isAllDay && (!startTimeVal || !endTimeVal))) {
      if (window.showAppAlert) await window.showAppAlert('請填寫日期和時間');
      else alert('請填寫日期和時間');
      return;
    }
    if (endDateVal && endDateVal < dateVal) {
      if (window.showAppAlert) await window.showAppAlert('結束日期不可早於開始日期');
      else alert('結束日期不可早於開始日期');
      return;
    }

    var startISO, endISO;
    if (isAllDay) {
      startISO = dateVal + 'T00:00:00+08:00';
      endISO = endDateVal + 'T23:59:59+08:00';
    } else {
      startISO = dateVal + 'T' + startTimeVal + ':00+08:00';
      endISO = endDateVal + 'T' + endTimeVal + ':00+08:00';
      var startDate = new Date(startISO);
      var endDate = new Date(endISO);
      if (endDate < startDate) {
        endDate.setDate(endDate.getDate() + 1);
        var pad = function (n) { return n < 10 ? '0' + n : n; };
        endISO = endDate.getFullYear() + '-' + pad(endDate.getMonth() + 1) + '-' + pad(endDate.getDate()) + 'T' + endTimeVal + ':00+08:00';
      }
    }

    var body = {
      title: document.getElementById('add-title').value,
      type: document.getElementById('add-type').value,
      start: startISO,
      end: endISO,
      allDay: isAllDay,
      location: '',
      description: document.getElementById('add-description').value || ''
    };
    
    try {
      var res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Line-User-Id': userId },
        body: JSON.stringify(body)
      });
      var data = await res.json();
      if (data.success) {
        // 跳出「是否分享」對話框（是／否按鈕），不直接跳分享
        var wantShare = window.showShareConfirm && await window.showShareConfirm('✅ 新增成功！是否要分享這個行程？');
        if (wantShare) {
          var msgRes = await fetch('/api/line/share-message/' + data.data.id);
          var msgData = await msgRes.json();
          if (msgData.success && msgData.data && msgData.data.message && window.LIFF && window.LIFF.shareMessage) {
            await window.LIFF.shareMessage(msgData.data.message);
          }
        }
        // 離開前儲存本頁狀態（多步上一頁、關閉瀏覽器才清）
        if (window.__savePageState) window.__savePageState();
        // 回到來源頁面（列表或主頁），帶 restore=1 讓 scroll-restore 還原捲動／分頁
        var returnUrl = urlParams.get('return') || '/index.html';
        var sep = returnUrl.indexOf('?') !== -1 ? '&' : '?';
        var restoreParam = sep + 'restore=1';
        var devParam = (dev && returnUrl.indexOf('dev=1') === -1) ? '&dev=1' : '';
        window.location.href = returnUrl + restoreParam + devParam;
      } else {
        if (window.showAppAlert) await window.showAppAlert('新增失敗：' + (data.message || '未知錯誤'));
        else alert('新增失敗：' + (data.message || '未知錯誤'));
      }
    } catch (err) {
      console.error(err);
      if (window.showAppAlert) await window.showAppAlert('新增失敗，請稍後再試');
      else alert('新增失敗，請稍後再試');
    }
  });
})();
