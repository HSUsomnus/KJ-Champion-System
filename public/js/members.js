/**
 * 成員列表頁面的前端邏輯
 * 負責顯示所有成員並處理邀請功能
 */

let currentUserId = null; // 當前用戶 ID
let membersData = []; // 成員數據

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
 * 取得當前用戶 ID
 */
async function checkAdminPermission() {
  currentUserId = window.LIFF ? window.LIFF.getUserId() : null;
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
    
    return `
    <div class="member-card" data-line-id="${escapeHtml(member.lineId)}" data-is-self="${isSelf ? '1' : '0'}" onclick="handleMemberCardClick(this)">
      <img src="${avatarUrl}" alt="${escapeHtml(displayName)}" class="member-avatar" 
           onerror="this.src='${placeholderUrl.replace(/'/g, "\\'")}'">
      <div class="member-info">
        <div class="member-name">
          ${escapeHtml(displayName)}
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

// 頁面載入時初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMembers);
} else {
  initMembers();
}
