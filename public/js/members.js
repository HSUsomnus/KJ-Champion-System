/**
 * 成員列表頁面的前端邏輯
 * 負責顯示所有成員並處理邀請功能
 */

let isRoleEditMode = false; // 是否在權限編輯模式
let currentUserId = null; // 當前用戶 ID
let membersData = []; // 成員數據
let isAdmin = false; // 是否為開發者

/**
 * 初始化成員列表頁面
 */
async function initMembers() {
  // 等待 LIFF 準備好
  window.addEventListener('liffReady', () => {
    checkAdminPermission();
    loadMembers();
  });

  // 如果 LIFF 已經準備好，直接載入
  if (window.LIFF && window.LIFF.isInitialized()) {
    checkAdminPermission();
    loadMembers();
  }
}

/**
 * 檢查是否為開發者或負責人
 */
async function checkAdminPermission() {
  currentUserId = window.LIFF ? window.LIFF.getUserId() : null;
  if (!currentUserId) return;

  try {
    // 取得當前用戶資料
    const response = await fetch(`/api/members/${currentUserId}`);
    const data = await response.json();
    
    if (data.success) {
      const member = data.data;
      isAdmin = member.role === '開發者';
      const isManager = member.role === '負責人';
      
      // 如果是開發者，顯示權限設定按鈕
      if (isAdmin) {
        const roleEditBtn = document.getElementById('role-edit-btn');
        if (roleEditBtn) {
          roleEditBtn.classList.remove('hidden');
        }
      }
      
      // 如果是開發者或負責人，顯示管理按鈕
      if (isAdmin || isManager) {
        const managementBtn = document.getElementById('management-btn');
        if (managementBtn) {
          managementBtn.classList.remove('hidden');
        }
      }
    }
  } catch (error) {
    console.error('檢查管理員權限錯誤:', error);
  }
}

/**
 * 前往管理中心
 */
function goToManagement() {
  window.location.href = '/management.html';
}

/**
 * 載入成員列表
 */
async function loadMembers() {
  const container = document.getElementById('members-list');
  if (!container) return;

  try {
    const userId = window.LIFF ? window.LIFF.getUserId() : null;
    const url = `/api/members${userId ? `?userId=${userId}` : ''}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.success) {
      membersData = data.data; // 儲存成員數據
      renderMembers(membersData, userId);
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <div>❌</div>
          <p>載入失敗：${data.message || '未知錯誤'}</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('載入成員列表錯誤:', error);
    const container = document.getElementById('members-list');
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <div>❌</div>
          <p>載入失敗，請稍後再試</p>
        </div>
      `;
    }
  }
}

/**
 * 渲染成員列表（currentUserId：目前登入者，點自己的字卡會進個人資料可編輯）
 */
function renderMembers(members, currentUserId) {
  const container = document.getElementById('members-list');
  if (!container) return;

  if (members.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div>👥</div>
        <p>目前沒有成員</p>
      </div>
    `;
    return;
  }

  // 依星等排序（紫星 > 紅星 > 橙星 > 綠星 > 白星）
  const starOrder = { '紫星': 5, '紅星': 4, '橙星': 3, '綠星': 2, '白星': 1 };
  const sortedMembers = [...members].sort((a, b) => {
    return (starOrder[b.starLevel] || 0) - (starOrder[a.starLevel] || 0);
  });

  // 頭像：有 pictureUrl 則用後端代理 URL；字卡主標為 LINE 名字，真實姓名小字，右側 > 提示可點擊
  const placeholderUrl = 'https://via.placeholder.com/60?text=👤';
  container.innerHTML = sortedMembers.map(member => {
    const hasAvatar = member.pictureUrl && String(member.pictureUrl).trim();
    const avatarUrl = hasAvatar ? `/api/members/avatar/${encodeURIComponent(member.lineId)}` : placeholderUrl;
    const isSelf = currentUserId && member.lineId === currentUserId;
    const displayName = (member.displayName && String(member.displayName).trim()) ? member.displayName : (member.name || '未設定');
    const realName = member.name && String(member.name).trim() ? member.name : '';
    
    // 權限標籤和選單（只有開發者可見）
    let roleHtml = '';
    if (isAdmin) {
      const role = member.role || '一般人';
      if (isRoleEditMode) {
        // 編輯模式：顯示下拉選單
        roleHtml = `
          <select class="role-select" data-line-id="${escapeHtml(member.lineId)}" onclick="event.stopPropagation()">
            <option value="一般人" ${role === '一般人' ? 'selected' : ''}>一般人</option>
            <option value="負責人" ${role === '負責人' ? 'selected' : ''}>負責人</option>
            <option value="開發者" ${role === '開發者' ? 'selected' : ''}>開發者</option>
          </select>
        `;
      } else {
        // 查看模式：顯示權限標籤
        const roleClass = role === '一般人' ? 'member' : (role === '負責人' ? 'manager' : 'admin');
        roleHtml = `<span class="member-role-badge ${roleClass}">${role}</span>`;
      }
    }
    
    return `
    <div class="member-card" data-line-id="${escapeHtml(member.lineId)}" data-is-self="${isSelf ? '1' : '0'}" onclick="handleMemberCardClick(this)">
      <img src="${avatarUrl}" alt="${escapeHtml(displayName)}" class="member-avatar" 
           onerror="this.src='${placeholderUrl.replace(/'/g, "\\'")}'">
      <div class="member-info">
        <div class="member-name">
          ${escapeHtml(displayName)}
          ${roleHtml}
        </div>
        ${realName && realName !== displayName ? `<div class="member-real-name">${escapeHtml(realName)}</div>` : ''}
        <span class="member-star ${escapeHtml(member.starLevel || '白星')}">
          ${escapeHtml(member.starLevel || '白星')}
        </span>
      </div>
      <span class="member-card-arrow" aria-hidden="true">&gt;</span>
    </div>
  `;
  }).join('');
}

/**
 * 點成員字卡：自己 → 個人資料（可編輯），他人 → 成員詳情（唯讀）
 */
function handleMemberCardClick(cardEl) {
  const lineId = cardEl.getAttribute('data-line-id');
  const isSelf = cardEl.getAttribute('data-is-self') === '1';
  const dev = window.LIFF && window.LIFF.isDevMode && window.LIFF.isDevMode();
  const qs = dev ? '?dev=1' : '';
  if (window.__savePageState) window.__savePageState();
  if (isSelf) {
    window.location.href = '/profile.html' + qs;
  } else {
    window.location.href = `/member-detail.html${qs}${qs ? '&' : '?'}id=${encodeURIComponent(lineId)}`;
  }
}

/**
 * 查看成員詳情
 */
function viewMemberDetail(lineId) {
  if (window.__savePageState) window.__savePageState();
  const dev = window.LIFF && window.LIFF.isDevMode && window.LIFF.isDevMode();
  const q = dev ? '?dev=1&' : '?';
  window.location.href = `/member-detail.html${q}id=${encodeURIComponent(lineId)}`;
}

/**
 * 邀請新成員：直接呼叫 liff.shareTargetPicker 分享 Flex 字卡
 * 失敗就顯示錯誤訊息，不 fallback 文字
 */
async function inviteMember() {
  try {
    const baseUrl = window.location.origin;
    const useMinimal = /[?&]minimal=1/.test(location.search);
    // 取得當前用戶的 LINE ID 作為邀請人
    const inviterLineId = window.LIFF && window.LIFF.getUserId ? window.LIFF.getUserId() : '';
    
    const url = `/api/line/invite-message?baseUrl=${encodeURIComponent(baseUrl)}${useMinimal ? '&minimal=1' : ''}${inviterLineId ? '&inviterLineId=' + encodeURIComponent(inviterLineId) : ''}`;
    const res = await fetch(url);
    
    // 先取文字，避免回傳非 JSON（例如 HTML 錯誤頁）時 parse 炸掉
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      // 伺服器回傳的不是 JSON（例如 502 的 HTML），顯示狀態與內容前段
      console.error('[邀請] 回傳非 JSON', res.status, text.slice(0, 200));
      var nonJsonErr = res.status + ' ' + (res.statusText || '') + '\n' + (text.slice(0, 200) || '無內容');
      if (window.showAppAlert) await window.showAppAlert(nonJsonErr);
      else alert(nonJsonErr);
      return;
    }

    if (!data.success || !data.data || !data.data.flexMessage) {
      // 只顯示後端回傳的 message 或狀態，不自己加「無法取得邀請字卡」等字
      var apiErr = (data && data.message) ? data.message : (res.status + ' ' + (res.statusText || '') + (data ? '\n' + JSON.stringify(data).slice(0, 300) : ''));
      console.error('[邀請] API 失敗', res.status, data);
      if (window.showAppAlert) await window.showAppAlert(apiErr || String(res.status));
      else alert(apiErr || String(res.status));
      return;
    }

    var flexBubble = data.data.flexMessage;
    var messages = [{ type: 'flex', altText: '邀請加入我們：請完成以下步驟', contents: flexBubble }];

    await liff.shareTargetPicker(messages);
  } catch (err) {
    var errMsg = (err && (err.code || err.message)) ? (err.code ? err.code + ': ' : '') + (err.message || '') : String(err);
    console.error('[邀請] shareTargetPicker 失敗', errMsg, err);
    if (window.showAppAlert) await window.showAppAlert(errMsg || '未知錯誤');
    else alert(errMsg || '未知錯誤');
  }
}

/**
 * HTML 轉義
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 匯出函數供全域使用
window.inviteMember = inviteMember;
window.viewMemberDetail = viewMemberDetail;
window.handleMemberCardClick = handleMemberCardClick;

/**
 * 切換權限編輯模式
 */
function toggleRoleEditMode() {
  if (isRoleEditMode) {
    // 儲存模式 → 查看模式
    saveRoles();
  } else {
    // 查看模式 → 編輯模式
    isRoleEditMode = true;
    const btn = document.getElementById('role-edit-btn');
    if (btn) {
      btn.textContent = '💾 權限儲存';
      btn.classList.add('save-mode');
    }
    renderMembers(membersData, currentUserId);
  }
}

/**
 * 儲存權限變更
 */
async function saveRoles() {
  if (!isAdmin) {
    alert('❌ 只有開發者可以修改權限');
    return;
  }

  // 收集所有下拉選單的變更
  const selects = document.querySelectorAll('.role-select');
  const updates = [];
  
  selects.forEach(select => {
    const lineId = select.getAttribute('data-line-id');
    const newRole = select.value;
    updates.push({ lineId, role: newRole });
  });

  if (updates.length === 0) {
    alert('❌ 沒有需要更新的權限');
    return;
  }

  try {
    const response = await fetch('/api/members/update-roles', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        editorId: currentUserId,
        updates: updates,
      }),
    });

    const data = await response.json();

    if (data.success) {
      alert(`✅ 權限更新成功！`);
      
      // 更新本地數據
      updates.forEach(update => {
        const member = membersData.find(m => m.lineId === update.lineId);
        if (member) {
          member.role = update.role;
        }
      });
      
      // 退出編輯模式
      isRoleEditMode = false;
      const btn = document.getElementById('role-edit-btn');
      if (btn) {
        btn.textContent = '⚙️ 權限設定';
        btn.classList.remove('save-mode');
      }
      
      // 重新渲染
      renderMembers(membersData, currentUserId);
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
  document.addEventListener('DOMContentLoaded', initMembers);
} else {
  initMembers();
}
