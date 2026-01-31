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

  // 從 URL 參數讀取預設類型
  var urlParams = new URLSearchParams(location.search);
  var defaultType = urlParams.get('type');
  if (defaultType) {
    var typeSelect = document.getElementById('add-type');
    if (typeSelect) {
      typeSelect.value = defaultType;
    }
  }

  // 從 URL 參數讀取預設日期（從行事曆頁點「新增行程」會帶 date=YYYY-MM-DD）
  var defaultDate = urlParams.get('date');

  // 初始化時間選擇器（延遲執行確保DOM已載入）
  setTimeout(function() {
    if (typeof initTimePickers === 'function') {
      initTimePickers();
    }
  }, 200);

  // 整日選項處理
  var allDayCheckbox = document.getElementById('add-all-day');
  var dateTimeGroup = document.getElementById('date-time-group');
  var startTimeInput = document.getElementById('add-start-time');
  var endTimeInput = document.getElementById('add-end-time');
  var dateInput = document.getElementById('add-date');
  var endDateInput = document.getElementById('add-end-date');

  // 設定預設日期為今天
  var today = new Date();
  var pad = function (n) { return n < 10 ? '0' + n : n; };
  var todayStr = today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate());
  if (dateInput && !dateInput.value) {
    if (defaultDate) {
      dateInput.value = defaultDate;
    } else {
      dateInput.value = todayStr;
    }
  }
  if (endDateInput && !endDateInput.value) {
    endDateInput.value = dateInput ? dateInput.value : todayStr;
  }
  if (dateInput) {
    dateInput.addEventListener('change', function () {
      if (endDateInput && !endDateInput.value) endDateInput.value = this.value;
    });
  }

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

  // 整日選項切換
  if (allDayCheckbox) {
    allDayCheckbox.addEventListener('change', function () {
      var isAllDay = this.checked;
      if (isAllDay) {
        // 整日：時間設為 00:00 和 23:59
        if (startTimeInput) startTimeInput.value = '00:00';
        if (endTimeInput) endTimeInput.value = '23:59';
        if (startTimeInput) startTimeInput.disabled = true;
        if (endTimeInput) endTimeInput.disabled = true;
      } else {
        // 非整日：啟用時間輸入
        if (startTimeInput) startTimeInput.disabled = false;
        if (endTimeInput) endTimeInput.disabled = false;
        // 如果時間為空，設定預設值
        if (startTimeInput && !startTimeInput.value) {
          startTimeInput.value = timeStr(now);
        }
        if (endTimeInput && !endTimeInput.value) {
          endTimeInput.value = timeStr(end);
        }
      }
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
          if (msgData.success && msgData.data && msgData.data.flexMessage) {
            if (typeof liff !== 'undefined' && liff.shareTargetPicker) {
              await liff.shareTargetPicker([{ type: 'flex', altText: msgData.data.message, contents: msgData.data.flexMessage }]);
            } else if (window.LIFF && window.LIFF.shareMessage && msgData.data.message) {
              await window.LIFF.shareMessage(msgData.data.message);
            }
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
