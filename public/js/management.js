/**
 * 管理中心頁面邏輯
 */

let currentUserId = null;
let currentTab = 'data'; // 當前分頁
let userPermissions = {
  isAdmin: false,
  isManager: false,
  isGuanLiZhe: false, // 管理者角色（如果有的話）
  canViewData: false, // 可查看數據（負責人、開發者、管理者）
  canViewFinancial: false, // 可查看財力（負責人、開發者）
};

/**
 * 初始化管理中心
 */
async function initManagement() {
  // 等待 LIFF 準備好
  window.addEventListener('liffReady', async () => {
    await checkPermissions();
  });

  // 如果 LIFF 已經準備好，直接執行
  if (window.LIFF && window.LIFF.isInitialized()) {
    await checkPermissions();
  }
}

/**
 * 檢查當前用戶權限
 */
async function checkPermissions() {
  currentUserId = window.LIFF ? window.LIFF.getUserId() : null;
  
  if (!currentUserId) {
    showNoPermission();
    return;
  }

  try {
    // 取得當前用戶資料
    const response = await fetch(`/api/members/${currentUserId}`);
    const data = await response.json();

    if (data.success) {
      const member = data.data;
      userPermissions.isAdmin = member.role === '開發者';
      userPermissions.isManager = member.role === '負責人';
      userPermissions.isGuanLiZhe = member.role === '管理者';
      
      // 數據分頁權限：負責人 + 開發者 + 管理者
      userPermissions.canViewData = userPermissions.isAdmin || userPermissions.isManager || userPermissions.isGuanLiZhe;
      
      // 財力分頁權限：負責人 + 開發者
      userPermissions.canViewFinancial = userPermissions.isAdmin || userPermissions.isManager;

      // 根據權限顯示內容
      if (!userPermissions.canViewData) {
        showNoPermission();
        return;
      }

      // 載入數據
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('main-content').classList.remove('hidden');
      
      // 載入當前分頁
      await loadCurrentTab();
    } else {
      showNoPermission();
    }
  } catch (error) {
    console.error('檢查權限錯誤:', error);
    showNoPermission();
  }
}

/**
 * 顯示無權限訪問
 */
function showNoPermission() {
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('no-permission').classList.remove('hidden');
}

/**
 * 切換分頁
 */
async function switchTab(tabName) {
  // 檢查權限
  if (tabName === 'financial' && !userPermissions.canViewFinancial) {
    alert('🚫 無權限訪問');
    return;
  }

  // 更新分頁狀態
  currentTab = tabName;

  // 更新按鈕樣式
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // 顯示對應分頁內容
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.add('hidden');
  });
  document.getElementById(`tab-${tabName}`).classList.remove('hidden');

  // 載入分頁數據
  await loadCurrentTab();
}

/**
 * 載入當前分頁數據
 */
async function loadCurrentTab() {
  if (currentTab === 'data') {
    await loadDataTab();
  } else if (currentTab === 'financial') {
    await loadFinancialTab();
  }
}

/**
 * 載入數據分頁（成員進階資訊）
 */
async function loadDataTab() {
  const container = document.getElementById('data-list');
  if (!container) return;

  container.innerHTML = '<div class="loading" style="padding: 24px; text-align: center;">載入中...</div>';

  try {
    const response = await fetch('/api/members');
    const data = await response.json();

    if (data.success) {
      renderDataList(data.data);
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <div>❌</div>
          <p>載入失敗：${data.message || '未知錯誤'}</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('載入數據分頁錯誤:', error);
    container.innerHTML = `
      <div class="empty-state">
        <div>❌</div>
        <p>載入失敗，請稍後再試</p>
      </div>
    `;
  }
}

/**
 * 渲染數據列表
 */
function renderDataList(members) {
  const container = document.getElementById('data-list');
  if (!members || members.length === 0) {
    container.innerHTML = '<div class="empty-state"><div>📭</div><p>暫無數據</p></div>';
    return;
  }

  container.innerHTML = members.map(member => `
    <div class="data-item" style="padding: 16px; border-bottom: 1px solid var(--border-color);">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <img src="${member.pictureUrl || 'https://via.placeholder.com/50?text=👤'}" 
             alt="${escapeHtml(member.name)}" 
             style="width: 50px; height: 50px; border-radius: 50%;">
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 16px;">${escapeHtml(member.displayName || member.name || '未設定')}</div>
          <div style="font-size: 12px; color: var(--text-light);">${escapeHtml(member.name || '未設定')}</div>
        </div>
        <span class="member-role-badge ${getRoleClass(member.role)}">${member.role || '一般人'}</span>
      </div>
      <div style="font-size: 13px; line-height: 1.6;">
        <div style="display: grid; grid-template-columns: 80px 1fr; gap: 8px;">
          <span style="color: var(--text-light);">📧 Email:</span>
          <span>${escapeHtml(member.email) || '-'}</span>
          
          <span style="color: var(--text-light);">📱 電話:</span>
          <span>${escapeHtml(member.phone) || '-'}</span>
          
          <span style="color: var(--text-light);">🎂 生日:</span>
          <span>${escapeHtml(member.birthday) || '-'}</span>
          
          <span style="color: var(--text-light);">⭐ 星等:</span>
          <span class="member-star ${escapeHtml(member.starLevel || '白星')}">${escapeHtml(member.starLevel || '白星')}</span>
          
          <span style="color: var(--text-light);">🚗 特斯拉:</span>
          <span>${escapeHtml(member.teslaFranchisee) || '-'}</span>
          
          <span style="color: var(--text-light);">👥 團隊:</span>
          <span>${escapeHtml(member.teamResponsibilities) || '-'}</span>
          
          <span style="color: var(--text-light);">📚 課程:</span>
          <span>${escapeHtml(member.courseRecord) || '-'}</span>
          
          <span style="color: var(--text-light);">🤝 志工:</span>
          <span>${escapeHtml(member.volunteerRecords) || '-'}</span>
        </div>
      </div>
    </div>
  `).join('');
}

/**
 * 載入財力分頁（所有成員的財力列表）
 */
async function loadFinancialTab() {
  const container = document.getElementById('financial-list');
  if (!container) return;

  // 檢查權限
  if (!userPermissions.canViewFinancial) {
    container.innerHTML = `
      <div class="empty-state">
        <div>🚫</div>
        <p>無權限訪問</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '<div class="loading" style="padding: 24px; text-align: center;">載入中...</div>';

  try {
    const response = await fetch('/api/members');
    const data = await response.json();

    if (data.success) {
      renderFinancialList(data.data);
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <div>❌</div>
          <p>載入失敗：${data.message || '未知錯誤'}</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('載入財力分頁錯誤:', error);
    container.innerHTML = `
      <div class="empty-state">
        <div>❌</div>
        <p>載入失敗，請稍後再試</p>
      </div>
    `;
  }
}

/**
 * 渲染財力列表
 */
function renderFinancialList(members) {
  const container = document.getElementById('financial-list');
  if (!members || members.length === 0) {
    container.innerHTML = '<div class="empty-state"><div>📭</div><p>暫無成員</p></div>';
    return;
  }

  container.innerHTML = members.map(member => `
    <div class="member-card" onclick="viewMemberFinancial('${escapeHtml(member.lineId)}', '${escapeHtml(member.displayName || member.name || '未設定')}')">
      <img src="${member.pictureUrl || 'https://via.placeholder.com/60?text=👤'}" 
           alt="${escapeHtml(member.name)}" 
           class="member-avatar">
      <div class="member-info">
        <div class="member-name">${escapeHtml(member.displayName || member.name || '未設定')}</div>
        ${member.name && member.name !== member.displayName ? `<div class="member-real-name">${escapeHtml(member.name)}</div>` : ''}
        <span class="member-role-badge ${getRoleClass(member.role)}">${member.role || '一般人'}</span>
      </div>
      <span class="member-card-arrow" aria-hidden="true">&gt;</span>
    </div>
  `).join('');
}

/**
 * 查看成員財力
 */
function viewMemberFinancial(lineId, memberName) {
  // 跳轉到財力上傳頁面（以管理員身份查看）
  const targetUrl = `/financial-upload.html?userId=${encodeURIComponent(lineId)}&editorId=${encodeURIComponent(currentUserId)}&viewOnly=1`;
  window.location.href = targetUrl;
}

/**
 * 取得角色對應的 CSS class
 */
function getRoleClass(role) {
  if (role === '開發者') return 'admin';
  if (role === '負責人') return 'manager';
  if (role === '管理者') return 'manager'; // 管理者使用與負責人相同的樣式
  return 'member';
}

/**
 * HTML 轉義
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 頁面載入時初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initManagement);
} else {
  initManagement();
}
