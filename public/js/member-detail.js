/**
 * 成員詳情頁面的前端邏輯
 * 負責顯示其他成員的個人資料（唯讀模式）
 */

let memberLineId = null;
let currentUserId = null;

/**
 * 初始化成員詳情頁面
 */
async function initMemberDetail() {
  // 從 URL 取得成員 LINE ID
  const urlParams = new URLSearchParams(window.location.search);
  memberLineId = urlParams.get('id');

  if (!memberLineId) {
    document.getElementById('loading').innerHTML = `
      <div class="empty-state">
        <div>❌</div>
        <p>找不到成員 ID</p>
      </div>
    `;
    return;
  }

  // 取得當前用戶 ID
  currentUserId = window.LIFF ? window.LIFF.getUserId() : null;

  // 載入成員資料
  await loadMemberDetail();
  
  // 檢查是否顯示財力查看按鈕
  await checkFinancialViewPermission();
}

/**
 * 載入成員詳情
 */
async function loadMemberDetail() {
  const loading = document.getElementById('loading');
  const memberDisplay = document.getElementById('member-display');

  try {
    const userId = window.LIFF ? window.LIFF.getUserId() : null;
    const url = `/api/members/${memberLineId}${userId ? `?userId=${userId}` : ''}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.success) {
      renderMemberDetail(data.data);
      loading.classList.add('hidden');
      memberDisplay.classList.remove('hidden');
    } else {
      throw new Error(data.message || '載入成員資料失敗');
    }
  } catch (error) {
    console.error('載入成員詳情錯誤:', error);
    loading.innerHTML = `
      <div class="empty-state">
        <div>❌</div>
        <p>載入失敗：${error.message}</p>
        <button class="btn btn-primary mt-16" onclick="if(window.__savePageState) window.__savePageState(); window.location.href='/members.html';">
          返回成員列表
        </button>
      </div>
    `;
  }
}

/**
 * 渲染成員詳情
 */
function renderMemberDetail(member) {
  // 頭部顯示 LINE 名字（顯示名稱），無則用真實姓名
  const displayName = (member.displayName && String(member.displayName).trim()) ? member.displayName : (member.name || '未設定');
  document.getElementById('member-name').textContent = displayName;
  updateStarDisplay(member.starLevel || '白星');
  document.getElementById('view-name').textContent = member.name || '未設定';
  document.getElementById('view-email').textContent = member.email || '未設定';
  document.getElementById('view-phone').textContent = member.phone || '未設定';
  document.getElementById('view-starLevel').textContent = member.starLevel || '白星';
  
  // 生日顯示（只顯示月/日）
  const birthdayEl = document.getElementById('view-birthday');
  if (birthdayEl) {
    let displayBirthday = '未設定';
    if (member.birthday) {
      const bd = String(member.birthday).trim();
      if (bd.includes('-')) {
        const parts = bd.split('-');
        if (parts.length === 3) {
          displayBirthday = `${parts[1]}/${parts[2]}`;
        } else {
          displayBirthday = bd;
        }
      } else {
        displayBirthday = bd;
      }
    }
    birthdayEl.textContent = displayBirthday;
  }

  // 進階資訊：課程紀錄
  const courseRecord = member.courseRecord || '';
  const courses = courseRecord.split(',').map(c => c.trim()).filter(c => c);
  document.getElementById('view-courseRecord').textContent = courses.length > 0 ? courses.join('、') : '未設定';

  // 進階資訊：是否為特斯拉出行加盟主
  const teslaEl = document.getElementById('view-teslaFranchisee');
  if (teslaEl) teslaEl.textContent = member.teslaFranchisee === '是' || member.teslaFranchisee === '否' ? member.teslaFranchisee : '未填';

  // 進階資訊：團隊負責事項
  const teamEl = document.getElementById('view-teamResponsibilities');
  if (teamEl) teamEl.textContent = (member.teamResponsibilities || '').trim() || '未填';

  // 進階資訊：課程志工
  const volunteerEl = document.getElementById('view-volunteerRecords');
  if (volunteerEl) {
    const list = parseVolunteerRecords(member.volunteerRecords);
    volunteerEl.textContent = list.length === 0 ? '無' : list.map(r => `${r.date} ${r.option}`).join('、');
  }
  
  // 顯示 LINE 頭像（經後端代理，避免 LINE CDN 不顯示；無則用預設圖）
  const avatarImg = document.getElementById('member-avatar');
  if (avatarImg) {
    const placeholderUrl = 'https://via.placeholder.com/100?text=👤';
    const hasAvatar = member.pictureUrl && String(member.pictureUrl).trim();
    avatarImg.src = hasAvatar ? `/api/members/avatar/${encodeURIComponent(member.lineId)}` : placeholderUrl;
    avatarImg.onerror = function() {
      this.src = placeholderUrl;
    };
  }
}

/**
 * 解析課程志工紀錄 JSON 字串
 */
function parseVolunteerRecords(str) {
  if (!str || typeof str !== 'string') return [];
  try {
    const arr = JSON.parse(str);
    return Array.isArray(arr) ? arr.filter(r => r && (r.date || r.option)) : [];
  } catch (e) {
    return [];
  }
}

/**
 * 更新星等顯示
 */
function updateStarDisplay(starLevel) {
  const starBadge = document.getElementById('member-star-icon');
  if (starBadge) {
    starBadge.className = 'member-star ' + (starLevel || '白星');
    starBadge.textContent = starLevel || '白星';
  }
}

/**
 * 檢查是否有權限查看財力（上級或開發者）
 */
async function checkFinancialViewPermission() {
  if (!currentUserId || !memberLineId) {
    return;
  }

  try {
    const response = await fetch(`/api/financial/check-permission?editorId=${encodeURIComponent(currentUserId)}&targetUserId=${encodeURIComponent(memberLineId)}`);
    const data = await response.json();

    if (data.success && data.data.canEdit) {
      // 有權限，顯示按鈕
      const btn = document.getElementById('view-financial-btn');
      if (btn) {
        btn.classList.remove('hidden');
      }
    }
  } catch (error) {
    console.error('檢查財力查看權限錯誤:', error);
  }
}

/**
 * 查看成員的財力上傳
 */
function viewMemberFinancial() {
  if (!memberLineId || !currentUserId) {
    alert('無法取得必要資訊');
    return;
  }

  // 跳轉到財力上傳頁面，帶上目標用戶 ID 和當前用戶 ID（作為編輯者）
  const baseUrl = window.location.origin;
  const targetUrl = `${baseUrl}/financial-upload.html?userId=${encodeURIComponent(memberLineId)}&editorId=${encodeURIComponent(currentUserId)}`;
  window.location.href = targetUrl;
}

// 頁面載入時初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMemberDetail);
} else {
  initMemberDetail();
}
