/**
 * 時間選擇器組件（24小時制，類似Google表單的滾輪式UI）
 */

class TimePicker {
  constructor(inputElement, options = {}) {
    this.input = inputElement;
    this.options = {
      format24: true, // 24小時制
      ...options
    };
    this.selectedHour = 0;
    this.selectedMinute = 0;
    this.modal = null;
    this.init();
  }

  init() {
    // 建立時間選擇器彈窗
    this.createModal();
    
    // 綁定輸入框點擊事件
    this.input.addEventListener('click', (e) => {
      e.preventDefault();
      this.open();
    });
    
    // 設定初始值
    if (this.input.value) {
      const [hours, minutes] = this.input.value.split(':').map(Number);
      this.selectedHour = hours || 0;
      this.selectedMinute = minutes || 0;
    } else {
      const now = new Date();
      this.selectedHour = now.getHours();
      this.selectedMinute = now.getMinutes();
    }
    
    this.updateInput();
  }

  createModal() {
    // 建立彈窗HTML
    const modal = document.createElement('div');
    modal.className = 'time-picker-modal';
    modal.innerHTML = `
      <div class="time-picker-content">
        <div class="time-picker-header">
          <div class="time-picker-title">選擇時間</div>
          <button class="time-picker-close" onclick="this.closest('.time-picker-modal').classList.remove('active')">×</button>
        </div>
        <div class="time-picker-wheels">
          <div class="time-picker-wheel" id="hour-wheel">
            <div class="time-picker-wheel-scroll" id="hour-scroll"></div>
          </div>
          <div style="display: flex; align-items: center; font-size: 24px; color: var(--text-color); padding: 0 8px;">:</div>
          <div class="time-picker-wheel" id="minute-wheel">
            <div class="time-picker-wheel-scroll" id="minute-scroll"></div>
          </div>
        </div>
        <div class="time-picker-actions">
          <button class="btn btn-secondary" onclick="this.closest('.time-picker-modal').classList.remove('active')">取消</button>
          <button class="btn btn-primary" onclick="this.closest('.time-picker-modal').querySelector('.time-picker-confirm').click()">確定</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.modal = modal;
    
    // 建立小時滾輪
    const hourScroll = modal.querySelector('#hour-scroll');
    for (let i = 0; i < 24; i++) {
      const item = document.createElement('div');
      item.className = 'time-picker-item';
      item.textContent = String(i).padStart(2, '0');
      item.dataset.value = i;
      hourScroll.appendChild(item);
    }
    
    // 建立分鐘滾輪
    const minuteScroll = modal.querySelector('#minute-scroll');
    for (let i = 0; i < 60; i += 5) {
      const item = document.createElement('div');
      item.className = 'time-picker-item';
      item.textContent = String(i).padStart(2, '0');
      item.dataset.value = i;
      minuteScroll.appendChild(item);
    }
    
    // 設定滾輪事件
    this.setupWheelEvents(modal.querySelector('#hour-wheel'), 'hour');
    this.setupWheelEvents(modal.querySelector('#minute-wheel'), 'minute');
    
    // 確認按鈕
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'time-picker-confirm hidden';
    confirmBtn.addEventListener('click', () => {
      this.confirm();
    });
    modal.querySelector('.time-picker-actions').appendChild(confirmBtn);
    
    // 點擊背景關閉
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.close();
      }
    });
    
    // 初始化顯示
    this.updateWheelPosition();
  }

  setupWheelEvents(wheel, type) {
    const scroll = wheel.querySelector('.time-picker-wheel-scroll');
    let isDragging = false;
    let startY = 0;
    let currentY = 0;
    let currentOffset = 0;
    
    // 觸控事件
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
      const newOffset = currentOffset + diff;
      this.setScrollOffset(scroll, newOffset);
      this.updateSelectedItem(wheel, type);
    });
    
    wheel.addEventListener('touchend', () => {
      if (!isDragging) return;
      isDragging = false;
      this.snapToNearest(wheel, type);
    });
    
    // 點擊事件
    scroll.addEventListener('click', (e) => {
      const item = e.target.closest('.time-picker-item');
      if (item) {
        const value = parseInt(item.dataset.value);
        if (type === 'hour') {
          this.selectedHour = value;
        } else {
          this.selectedMinute = value;
        }
        this.updateWheelPosition();
      }
    });
  }

  getScrollOffset(scroll) {
    const transform = window.getComputedStyle(scroll).transform;
    if (transform === 'none') return 0;
    const matrix = transform.match(/matrix.*\((.+)\)/);
    if (matrix) {
      return parseFloat(matrix[1].split(',')[5]) || 0;
    }
    return 0;
  }

  setScrollOffset(scroll, offset) {
    scroll.style.transform = `translateY(${offset}px)`;
  }

  updateSelectedItem(wheel, type) {
    const scroll = wheel.querySelector('.time-picker-wheel-scroll');
    const items = scroll.querySelectorAll('.time-picker-item');
    const wheelRect = wheel.getBoundingClientRect();
    const centerY = wheelRect.top + wheelRect.height / 2;
    
    let selectedItem = null;
    let minDistance = Infinity;
    
    items.forEach((item) => {
      const itemRect = item.getBoundingClientRect();
      const itemCenterY = itemRect.top + itemRect.height / 2;
      const distance = Math.abs(itemCenterY - centerY);
      
      if (distance < minDistance) {
        minDistance = distance;
        selectedItem = item;
      }
    });
    
    // 更新選中狀態
    items.forEach(item => {
      item.classList.remove('selected');
    });
    if (selectedItem) {
      selectedItem.classList.add('selected');
      const value = parseInt(selectedItem.dataset.value);
      if (type === 'hour') {
        this.selectedHour = value;
      } else {
        this.selectedMinute = value;
      }
    }
  }

  snapToNearest(wheel, type) {
    const scroll = wheel.querySelector('.time-picker-wheel-scroll');
    const items = scroll.querySelectorAll('.time-picker-item');
    const wheelRect = wheel.getBoundingClientRect();
    const centerY = wheelRect.top + wheelRect.height / 2;
    
    let nearestItem = null;
    let nearestIndex = 0;
    let minDistance = Infinity;
    
    items.forEach((item, index) => {
      const itemRect = item.getBoundingClientRect();
      const itemCenterY = itemRect.top + itemRect.height / 2;
      const distance = Math.abs(itemCenterY - centerY);
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestItem = item;
        nearestIndex = index;
      }
    });
    
    if (nearestItem) {
      // 計算目標偏移量：讓選中項目在滾輪視窗正中央（200px 高，中心 100px；項目高 36px，上 padding 72px）
      const wheelHeight = 200;
      const itemHeight = 36;
      const paddingTop = 72;
      const centerY = wheelHeight / 2;
      const targetOffset = centerY - (paddingTop + nearestIndex * itemHeight + itemHeight / 2);
      
      scroll.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      this.setScrollOffset(scroll, targetOffset);
      
      // 更新選中狀態
      const value = parseInt(nearestItem.dataset.value);
      if (type === 'hour') {
        this.selectedHour = value;
      } else {
        this.selectedMinute = value;
      }
      
      // 更新選中樣式
      items.forEach((item, index) => {
        item.classList.toggle('selected', index === nearestIndex);
      });
      
      setTimeout(() => {
        scroll.style.transition = '';
      }, 300);
    }
  }

  updateWheelPosition() {
    const hourWheel = this.modal.querySelector('#hour-wheel');
    const minuteWheel = this.modal.querySelector('#minute-wheel');
    
    if (!hourWheel || !minuteWheel) return;
    
    const wheelHeight = 200;
    const itemHeight = 36;
    const paddingTop = 72;
    const centerY = wheelHeight / 2;
    
    // 更新小時位置：選中項目置中
    const hourScroll = hourWheel.querySelector('.time-picker-wheel-scroll');
    const hourItems = hourScroll.querySelectorAll('.time-picker-item');
    const selectedHourIndex = this.selectedHour;
    const hourOffset = centerY - (paddingTop + selectedHourIndex * itemHeight + itemHeight / 2);
    hourScroll.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    hourScroll.style.transform = `translateY(${hourOffset}px)`;
    hourItems.forEach((item, index) => {
      item.classList.toggle('selected', index === selectedHourIndex);
    });
    
    // 更新分鐘位置：選中項目置中
    const minuteScroll = minuteWheel.querySelector('.time-picker-wheel-scroll');
    const minuteItems = minuteScroll.querySelectorAll('.time-picker-item');
    const selectedMinuteIndex = Math.floor(this.selectedMinute / 5);
    const minuteOffset = centerY - (paddingTop + selectedMinuteIndex * itemHeight + itemHeight / 2);
    minuteScroll.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    minuteScroll.style.transform = `translateY(${minuteOffset}px)`;
    minuteItems.forEach((item, index) => {
      item.classList.toggle('selected', index === selectedMinuteIndex);
    });
    
    setTimeout(() => {
      hourScroll.style.transition = '';
      minuteScroll.style.transition = '';
    }, 300);
  }

  open() {
    if (this.input.value) {
      const [hours, minutes] = this.input.value.split(':').map(Number);
      this.selectedHour = hours || 0;
      this.selectedMinute = minutes || 0;
    }
    this.updateWheelPosition();
    this.modal.classList.add('active');
  }

  close() {
    this.modal.classList.remove('active');
  }

  confirm() {
    this.updateInput();
    this.close();
    // 觸發 change 事件
    this.input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  updateInput() {
    const pad = (n) => n < 10 ? '0' + n : n;
    this.input.value = `${pad(this.selectedHour)}:${pad(this.selectedMinute)}`;
  }
}

// 初始化所有時間輸入框
function initTimePickers() {
  document.querySelectorAll('input[type="time"]').forEach(input => {
    // 只在沒有初始化過的情況下初始化
    if (!input.dataset.timePickerInitialized) {
      new TimePicker(input);
      input.dataset.timePickerInitialized = 'true';
    }
  });
}

// 頁面載入時初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTimePickers);
} else {
  initTimePickers();
}

// 匯出供其他模組使用
window.TimePicker = TimePicker;
window.initTimePickers = initTimePickers;
