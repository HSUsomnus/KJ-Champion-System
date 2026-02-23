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
 * 邀請新成員：透過 LINE URL Scheme 分享邀請連結
 * 使用者點擊後會開啟 LINE 的「分享給…」畫面，選擇好友或群組
 */
async function inviteMember() {
  try {
    // 取得當前用戶的 LINE ID 作為邀請人
    const inviterLineId = window.LIFF && window.LIFF.getUserId ? window.LIFF.getUserId() : '';
    const baseUrl = window.location.origin;

    // 組合邀請連結（指向註冊頁面）
    const inviteUrl = baseUrl + '/profile.html' + (inviterLineId ? '?invitedBy=' + encodeURIComponent(inviterLineId) : '');
    const shareText = '📋 邀請你加入我們！\n\n請點擊下方連結完成註冊：\n' + inviteUrl;

    // 用 LINE URL Scheme 分享（手機會開 LINE 選好友／群組）
    await window.LIFF.shareMessage(shareText);
  } catch (err) {
    var errMsg = (err && err.message) ? err.message : String(err || '');
    console.error('[邀請] 失敗', errMsg, err);
    if (window.showAppAlert) await window.showAppAlert(errMsg || '邀請失敗');
    else alert(errMsg || '邀請失敗');
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
