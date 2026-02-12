/**
 * 管理中心頁面邏輯
 */

let currentUserId = null;
let currentTab = 'data'; // 當前分頁
let isPermissionEditMode = false; // 權限編輯模式
let permissionMembersData = []; // 權限分頁的成員數據
let userPermissions = {
  isAdmin: false,
  isManager: false,
  isGuanLiZhe: false,
  canViewData: false, // 可查看數據（負責人、開發者、管理者）
  canViewFinancial: false, // 可查看財力（負責人、開發者）
  canEditPermission: false, // 可編輯權限（僅開發者）
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
      
      // 權限分頁：負責人 + 開發者
      userPermissions.canEditPermission = userPermissions.isAdmin || userPermissions.isManager;

      // 如果是負責人或開發者，顯示權限分頁按鈕
      if (userPermissions.canEditPermission) {
        const permTabBtn = document.getElementById('tab-btn-permission');
        if (permTabBtn) permTabBtn.style.display = '';
      }

      // 載入數據（所有人都能進入管理中心）
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
  if (tabName === 'permission' && !userPermissions.canEditPermission) {
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
  } else if (currentTab === 'permission') {
    await loadPermissionTab();
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
      </div>
      <div style="font-size: 13px; line-height: 1.8;">
        <div style="margin-bottom: 6px;">
          <span style="color: var(--text-light); white-space: nowrap;">📚 課程紀錄：</span>
          <span>${escapeHtml(member.courseRecord) || '-'}</span>
        </div>
        <div style="margin-bottom: 6px;">
          <span style="color: var(--text-light); white-space: nowrap;">🚗 特斯拉加盟主：</span>
          <span>${escapeHtml(member.teslaFranchisee) || '-'}</span>
        </div>
        <div style="margin-bottom: 6px;">
          <span style="color: var(--text-light); white-space: nowrap;">👥 團隊負責事項：</span>
          <span>${escapeHtml(member.teamResponsibilities) || '-'}</span>
        </div>
        <div>
          <span style="color: var(--text-light); white-space: nowrap;">🤝 課程志工：</span>
          <span>${formatVolunteerRecords(member.volunteerRecords)}</span>
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

  container.innerHTML = members.map(member => {
    // 財力金額顯示（有值就顯示，沒有就顯示灰色「無資料」）
    const amount = member.financialAmount || '';
    const amountHtml = amount
      ? `<span style="font-size: 13px; font-weight: 600; color: #e67e22; background: #fef5e7; padding: 2px 8px; border-radius: 12px; white-space: nowrap;">${escapeHtml(amount)}</span>`
      : `<span style="font-size: 13px; color: #999; white-space: nowrap;">無資料</span>`;

    return `
      <div class="data-item" style="padding: 16px; border-bottom: 1px solid var(--border-color); cursor: pointer;" onclick="viewMemberFinancial('${escapeHtml(member.lineId)}', '${escapeHtml(member.displayName || member.name || '未設定')}')">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${member.pictureUrl || 'https://via.placeholder.com/50?text=👤'}" 
               alt="${escapeHtml(member.name)}" 
               style="width: 50px; height: 50px; border-radius: 50%;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; font-size: 16px;">${escapeHtml(member.displayName || member.name || '未設定')}</div>
            <div style="font-size: 12px; color: var(--text-light);">${escapeHtml(member.name || '未設定')}</div>
          </div>
          ${amountHtml}
          <span style="font-size: 18px; color: var(--text-light);">&gt;</span>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * 查看成員財力（在 LIFF 內會用外部瀏覽器開啟）
 */
function viewMemberFinancial(lineId, memberName) {
  const targetUrl = `${window.location.origin}/financial-upload.html?userId=${encodeURIComponent(lineId)}&editorId=${encodeURIComponent(currentUserId)}&viewOnly=1`;
  if (window.LIFF && window.LIFF.openURL) {
    window.LIFF.openURL(targetUrl, true);
  } else {
    window.location.href = targetUrl;
  }
}

/**
 * 格式化課程志工紀錄
 * 把 JSON 格式轉成好看的文字
 */
function formatVolunteerRecords(records) {
  if (!records) return '-';
  
  try {
    // 嘗試解析 JSON
    let parsed = records;
    if (typeof records === 'string') {
      parsed = JSON.parse(records);
    }
    
    // 如果是陣列，格式化每一筆
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(item => {
        const date = item.date || '';
        const option = item.option || '';
        return `${date} ${option}`;
      }).join('、');
    }
    
    return escapeHtml(String(records)) || '-';
  } catch (e) {
    // 不是 JSON，直接顯示原文
    return escapeHtml(String(records)) || '-';
  }
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

/**
 * 載入權限分頁
 */
async function loadPermissionTab() {
  const container = document.getElementById('permission-list');
  if (!container) return;

  container.innerHTML = '<div class="loading" style="padding: 24px; text-align: center;">載入中...</div>';

  try {
    const response = await fetch('/api/members');
    const data = await response.json();

    if (data.success) {
      permissionMembersData = data.data;
      renderPermissionList(permissionMembersData);
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <div>❌</div>
          <p>載入失敗</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('載入權限分頁錯誤:', error);
    container.innerHTML = `
      <div class="empty-state">
        <div>❌</div>
        <p>載入失敗，請稍後再試</p>
      </div>
    `;
  }
}

/**
 * 渲染權限列表（跟數據分頁一樣的卡片樣式，但顯示權限資訊）
 */
function renderPermissionList(members) {
  const container = document.getElementById('permission-list');
  if (!members || members.length === 0) {
    container.innerHTML = '<div class="empty-state"><div>📭</div><p>暫無成員</p></div>';
    return;
  }

  container.innerHTML = members.map(member => {
    const role = member.role || '一般人';

    // 編輯模式：下拉選單（負責人、管理者、一般人）
    // 顯示模式：權限標籤
    let roleHtml = '';
    if (isPermissionEditMode) {
      roleHtml = `
        <select class="role-select" data-line-id="${escapeHtml(member.lineId)}">
          <option value="一般人" ${role === '一般人' ? 'selected' : ''}>一般人</option>
          <option value="管理者" ${role === '管理者' ? 'selected' : ''}>管理者</option>
          <option value="負責人" ${role === '負責人' ? 'selected' : ''}>負責人</option>
          <option value="開發者" ${role === '開發者' ? 'selected' : ''}>開發者</option>
        </select>
      `;
    } else {
      roleHtml = `<span class="member-role-badge ${getRoleClass(role)}">${role}</span>`;
    }

    return `
      <div class="data-item" style="padding: 16px; border-bottom: 1px solid var(--border-color);">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${member.pictureUrl || 'https://via.placeholder.com/50?text=👤'}" 
               alt="${escapeHtml(member.name)}" 
               style="width: 50px; height: 50px; border-radius: 50%;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; font-size: 16px;">${escapeHtml(member.displayName || member.name || '未設定')}</div>
            <div style="font-size: 12px; color: var(--text-light);">${escapeHtml(member.name || '未設定')}</div>
          </div>
          ${roleHtml}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * 切換權限編輯模式
 */
function togglePermissionEditMode() {
  const btn = document.getElementById('permission-edit-btn');
  
  if (isPermissionEditMode) {
    // 儲存
    savePermissions();
  } else {
    // 進入編輯模式
    isPermissionEditMode = true;
    if (btn) {
      btn.textContent = '💾 儲存權限';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-secondary');
      btn.style.background = '#e74c3c';
      btn.style.color = 'white';
    }
    renderPermissionList(permissionMembersData);
  }
}

/**
 * 儲存權限變更
 */
async function savePermissions() {
  // 收集所有下拉選單的值
  const selects = document.querySelectorAll('.role-select');
  const updates = [];
  
  selects.forEach(select => {
    const lineId = select.getAttribute('data-line-id');
    const newRole = select.value;
    updates.push({ lineId, role: newRole });
  });

  if (updates.length === 0) return;

  try {
    const response = await fetch('/api/members/update-roles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        editorId: currentUserId,
        updates: updates,
      }),
    });

    const data = await response.json();

    if (data.success) {
      alert('✅ 權限更新成功');
      
      // 更新本地數據
      updates.forEach(update => {
        const member = permissionMembersData.find(m => m.lineId === update.lineId);
        if (member) member.role = update.role;
      });
      
      // 退出編輯模式
      isPermissionEditMode = false;
      const btn = document.getElementById('permission-edit-btn');
      if (btn) {
        btn.textContent = '⚙️ 編輯權限';
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
        btn.style.background = '';
        btn.style.color = '';
      }
      renderPermissionList(permissionMembersData);
    } else {
      alert('❌ 更新失敗：' + (data.message || '未知錯誤'));
    }
  } catch (error) {
    console.error('儲存權限錯誤:', error);
    alert('❌ 儲存失敗：' + error.message);
  }
}

// 頁面載入時初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initManagement);
} else {
  initManagement();
}
