/**
 * 日期選擇器組件（與時間選擇器同風格：彈窗 + 滾輪 + 取消/確定）
 * 取代原生 input type="date" 的醜陋 UI，與選擇時間 UI 統一
 */

// 取得某年某月有幾天
function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

// 補零
function pad(n) {
  return n < 10 ? '0' + n : String(n);
}

class DatePicker {
  constructor(inputElement) {
    this.input = inputElement;
    this.selectedYear = new Date().getFullYear();
    this.selectedMonth = 1;
    this.selectedDay = 1;
    this.modal = null;
    this.init();
  }

  init() {
    this.createModal();

    // 點擊時開啟彈窗；不攔截 focus，以便鍵盤可直接輸入日期
    this.input.addEventListener('click', (e) => {
      e.preventDefault();
      this.input.blur();
      this.open();
    });
    // 鍵盤輸入 YYYY-MM-DD 時同步到滾輪
    this.input.addEventListener('input', () => this.syncFromInput());
    this.input.addEventListener('blur', () => this.syncFromInput());

    if (this.input.value) {
      const [y, m, d] = this.input.value.split('-').map(Number);
      this.selectedYear = y || this.selectedYear;
      this.selectedMonth = m || 1;
      this.selectedDay = Math.min(d || 1, getDaysInMonth(this.selectedYear, this.selectedMonth));
    } else {
      const now = new Date();
      this.selectedYear = now.getFullYear();
      this.selectedMonth = now.getMonth() + 1;
      this.selectedDay = now.getDate();
    }
    this.updateInput();
  }

  createModal() {
    const modal = document.createElement('div');
    modal.className = 'time-picker-modal date-picker-modal';
    modal.setAttribute('aria-label', '選擇日期');
    modal.innerHTML = `
      <div class="time-picker-content">
        <div class="time-picker-header">
          <div class="time-picker-title">選擇日期</div>
          <button type="button" class="time-picker-close" aria-label="關閉">×</button>
        </div>
        <div class="time-picker-wheels date-picker-wheels">
          <div class="time-picker-wheel" id="date-year-wheel">
            <div class="time-picker-wheel-scroll" id="date-year-scroll"></div>
          </div>
          <div class="date-picker-sep">/</div>
          <div class="time-picker-wheel" id="date-month-wheel">
            <div class="time-picker-wheel-scroll" id="date-month-scroll"></div>
          </div>
          <div class="date-picker-sep">/</div>
          <div class="time-picker-wheel" id="date-day-wheel">
            <div class="time-picker-wheel-scroll" id="date-day-scroll"></div>
          </div>
        </div>
        <div class="time-picker-actions">
          <button type="button" class="btn btn-secondary date-picker-cancel">取消</button>
          <button type="button" class="btn btn-primary date-picker-confirm">確定</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modal = modal;

    const now = new Date();
    const startYear = now.getFullYear() - 2;
    const endYear = now.getFullYear() + 10;

    const yearScroll = modal.querySelector('#date-year-scroll');
    for (let y = startYear; y <= endYear; y++) {
      const item = document.createElement('div');
      item.className = 'time-picker-item';
      item.textContent = String(y);
      item.dataset.value = y;
      yearScroll.appendChild(item);
    }

    const monthScroll = modal.querySelector('#date-month-scroll');
    for (let m = 1; m <= 12; m++) {
      const item = document.createElement('div');
      item.className = 'time-picker-item';
      item.textContent = String(m);
      item.dataset.value = m;
      monthScroll.appendChild(item);
    }

    this.buildDayScroll(modal.querySelector('#date-day-scroll'));

    modal.querySelector('.time-picker-close').addEventListener('click', () => this.close());
    modal.querySelector('.date-picker-cancel').addEventListener('click', () => this.close());
    modal.querySelector('.date-picker-confirm').addEventListener('click', () => this.confirm());

    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.close();
    });

    this.setupWheelEvents(modal.querySelector('#date-year-wheel'), 'year');
    this.setupWheelEvents(modal.querySelector('#date-month-wheel'), 'month');
    this.setupWheelEvents(modal.querySelector('#date-day-wheel'), 'day');

    this.updateWheelPosition();
  }

  buildDayScroll(dayScroll) {
    dayScroll.innerHTML = '';
    const maxDay = getDaysInMonth(this.selectedYear, this.selectedMonth);
    for (let d = 1; d <= maxDay; d++) {
      const item = document.createElement('div');
      item.className = 'time-picker-item';
      item.textContent = String(d);
      item.dataset.value = d;
      dayScroll.appendChild(item);
    }
  }

  setupWheelEvents(wheel, type) {
    const scroll = wheel.querySelector('.time-picker-wheel-scroll');
    let isDragging = false;
    let startY = 0;
    let currentY = 0;
    let currentOffset = 0;

    wheel.addEventListener('touchstart', (e) => {
      isDragging = true;
      startY = e.touches[0].clientY;
      currentOffset = this.getScrollOffset(scroll);
    });

    wheel.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      this.setScrollOffset(scroll, currentOffset + diff);
      this.updateSelectedItem(wheel, type);
    });

    wheel.addEventListener('touchend', () => {
      if (!isDragging) return;
      isDragging = false;
      this.snapToNearest(wheel, type);
    });

    scroll.addEventListener('click', (e) => {
      const item = e.target.closest('.time-picker-item');
      if (item) {
        const value = parseInt(item.dataset.value, 10);
        if (type === 'year') this.selectedYear = value;
        else if (type === 'month') this.selectedMonth = value;
        else this.selectedDay = value;
        if (type === 'year' || type === 'month') this.refreshDayWheel();
        this.updateWheelPosition();
      }
    });
  }

  refreshDayWheel() {
    const maxDay = getDaysInMonth(this.selectedYear, this.selectedMonth);
    if (this.selectedDay > maxDay) this.selectedDay = maxDay;
    const dayScroll = this.modal.querySelector('#date-day-scroll');
    this.buildDayScroll(dayScroll);
    this.updateWheelPosition();
  }

  /** 從輸入框同步日期（鍵盤輸入 YYYY-MM-DD 時更新內部狀態） */
  syncFromInput() {
    const val = (this.input.value || '').trim();
    const m = val.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!m) return;
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const d = parseInt(m[3], 10);
    if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || d < 1) return;
    const maxDay = getDaysInMonth(y, mo);
    if (d > maxDay) return;
    this.selectedYear = y;
    this.selectedMonth = mo;
    this.selectedDay = d;
    this.updateInput();
  }

  getScrollOffset(scroll) {
    const transform = window.getComputedStyle(scroll).transform;
    if (transform === 'none') return 0;
    const m = transform.match(/matrix.*\((.+)\)/);
    if (m) return parseFloat(m[1].split(',')[5]) || 0;
    return 0;
  }

  setScrollOffset(scroll, offset) {
    scroll.style.transform = 'translateY(' + offset + 'px)';
  }

  updateSelectedItem(wheel, type) {
    const scroll = wheel.querySelector('.time-picker-wheel-scroll');
    const items = scroll.querySelectorAll('.time-picker-item');
    const wheelRect = wheel.getBoundingClientRect();
    const centerY = wheelRect.top + wheelRect.height / 2;

    let selectedItem = null;
    let minDistance = Infinity;

    items.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const cy = rect.top + rect.height / 2;
      const d = Math.abs(cy - centerY);
      if (d < minDistance) {
        minDistance = d;
        selectedItem = item;
      }
    });

    items.forEach((el) => el.classList.remove('selected'));
    if (selectedItem) {
      selectedItem.classList.add('selected');
      const v = parseInt(selectedItem.dataset.value, 10);
      if (type === 'year') this.selectedYear = v;
      else if (type === 'month') this.selectedMonth = v;
      else this.selectedDay = v;
      if (type === 'year' || type === 'month') this.refreshDayWheel();
    }
  }

  snapToNearest(wheel, type) {
    const scroll = wheel.querySelector('.time-picker-wheel-scroll');
    const items = scroll.querySelectorAll('.time-picker-item');
    const wheelRect = wheel.getBoundingClientRect();
    const centerY = wheelRect.top + wheelRect.height / 2;

    let nearestIndex = 0;
    let minDistance = Infinity;

    items.forEach((item, index) => {
      const rect = item.getBoundingClientRect();
      const cy = rect.top + rect.height / 2;
      const d = Math.abs(cy - centerY);
      if (d < minDistance) {
        minDistance = d;
        nearestIndex = index;
      }
    });

    // 與時間選擇器同一套置中公式：滾輪高 200、項目高 36、上 padding 72，選中項置中
    const wheelHeight = 200;
    const itemHeight = 36;
    const paddingTop = 72;
    const centerYVal = wheelHeight / 2;
    const targetOffset = centerYVal - (paddingTop + nearestIndex * itemHeight + itemHeight / 2);

    scroll.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    this.setScrollOffset(scroll, targetOffset);

    const value = parseInt(items[nearestIndex].dataset.value, 10);
    if (type === 'year') this.selectedYear = value;
    else if (type === 'month') this.selectedMonth = value;
    else this.selectedDay = value;
    if (type === 'year' || type === 'month') this.refreshDayWheel();

    items.forEach((item, i) => item.classList.toggle('selected', i === nearestIndex));

    setTimeout(() => { scroll.style.transition = ''; }, 300);
  }

  updateWheelPosition() {
    // 與時間選擇器同一套：滾輪高 200、項目高 36、上 padding 72，選中項置中
    const wheelHeight = 200;
    const itemHeight = 36;
    const paddingTop = 72;
    const centerYVal = wheelHeight / 2;

    const yearScroll = this.modal.querySelector('#date-year-scroll');
    const yearItems = yearScroll.querySelectorAll('.time-picker-item');
    const yearIndex = Array.from(yearItems).findIndex((el) => parseInt(el.dataset.value, 10) === this.selectedYear);
    if (yearIndex >= 0) {
      const offset = centerYVal - (paddingTop + yearIndex * itemHeight + itemHeight / 2);
      yearScroll.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      yearScroll.style.transform = 'translateY(' + offset + 'px)';
      yearItems.forEach((el, i) => el.classList.toggle('selected', i === yearIndex));
    }
    setTimeout(() => { yearScroll.style.transition = ''; }, 300);

    const monthScroll = this.modal.querySelector('#date-month-scroll');
    const monthItems = monthScroll.querySelectorAll('.time-picker-item');
    const monthIndex = this.selectedMonth - 1;
    const monthOffset = centerYVal - (paddingTop + monthIndex * itemHeight + itemHeight / 2);
    monthScroll.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    monthScroll.style.transform = 'translateY(' + monthOffset + 'px)';
    monthItems.forEach((el, i) => el.classList.toggle('selected', i === monthIndex));
    setTimeout(() => { monthScroll.style.transition = ''; }, 300);

    const dayScroll = this.modal.querySelector('#date-day-scroll');
    const dayItems = dayScroll.querySelectorAll('.time-picker-item');
    const dayIndex = Math.min(this.selectedDay - 1, dayItems.length - 1);
    if (dayItems.length) {
      const dayOffset = centerYVal - (paddingTop + dayIndex * itemHeight + itemHeight / 2);
      dayScroll.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      dayScroll.style.transform = 'translateY(' + dayOffset + 'px)';
      dayItems.forEach((el, i) => el.classList.toggle('selected', i === dayIndex));
    }
    setTimeout(() => { dayScroll.style.transition = ''; }, 300);
  }

  open() {
    if (this.input.value) {
      const parts = this.input.value.split('-').map(Number);
      if (parts.length >= 3) {
        this.selectedYear = parts[0];
        this.selectedMonth = parts[1] || 1;
        const maxDay = getDaysInMonth(this.selectedYear, this.selectedMonth);
        this.selectedDay = Math.min(parts[2] || 1, maxDay);
      }
    } else {
      const now = new Date();
      this.selectedYear = now.getFullYear();
      this.selectedMonth = now.getMonth() + 1;
      this.selectedDay = now.getDate();
    }
    this.refreshDayWheel();
    this.updateWheelPosition();
    this.modal.classList.add('active');
  }

  close() {
    this.modal.classList.remove('active');
  }

  confirm() {
    const maxDay = getDaysInMonth(this.selectedYear, this.selectedMonth);
    const day = Math.min(this.selectedDay, maxDay);
    this.input.value = this.selectedYear + '-' + pad(this.selectedMonth) + '-' + pad(day);
    this.close();
    this.input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  updateInput() {
    const maxDay = getDaysInMonth(this.selectedYear, this.selectedMonth);
    const day = Math.min(this.selectedDay, maxDay);
    this.input.value = this.selectedYear + '-' + pad(this.selectedMonth) + '-' + pad(day);
  }
}

function initDatePickers() {
  document.querySelectorAll('input[type="date"]').forEach(function (input) {
    if (!input.dataset.datePickerInitialized) {
      new DatePicker(input);
      input.dataset.datePickerInitialized = 'true';
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDatePickers);
} else {
  initDatePickers();
}

window.DatePicker = DatePicker;
window.initDatePickers = initDatePickers;
