/**
 * 個人資料頁面的前端邏輯
 * 負責載入、顯示和更新個人資料
 */

let userProfile = null;

/**
 * 初始化個人資料頁面
 */
async function initProfile() {
  // 等待 LIFF 準備好
  window.addEventListener('liffReady', async () => {
    await checkRegistration();
  });

  // 如果 LIFF 已經準備好，直接檢查
  if (window.LIFF && window.LIFF.isInitialized()) {
    await checkRegistration();
  }

  // 設定表單提交事件
  setupFormEvents();
}

/**
 * 檢查使用者是否已註冊
 */
async function checkRegistration() {
  const loading = document.getElementById('loading');
  const profileDisplay = document.getElementById('profile-display');
  const registerForm = document.getElementById('register-form');

  try {
    const userId = window.LIFF ? window.LIFF.getUserId() : null;
    
    if (!userId) {
      // 如果沒有 User ID，顯示錯誤
      loading.innerHTML = `
        <div class="empty-state">
          <div>❌</div>
          <p>無法取得使用者資訊，請在 LINE 中開啟此應用程式</p>
        </div>
      `;
      return;
    }

    // 檢查註冊狀態
    const response = await fetch(`/api/members/check?userId=${userId}`);
    const data = await response.json();

    if (data.success) {
      if (data.data.isRegistered) {
        // 已註冊：頁面標題改回「個人資料」
        if (document.title !== undefined) document.title = '個人資料';
        var titleEl = document.getElementById('page-title-text');
        if (titleEl) titleEl.textContent = '👤 個人資料';
        // 載入個人資料
        await loadProfile();
      } else {
        // 未註冊，顯示註冊頁：標題與按鈕為「註冊」
        if (document.title !== undefined) document.title = '註冊';
        var titleEl = document.getElementById('page-title-text');
        if (titleEl) titleEl.textContent = '註冊';
        loading.classList.add('hidden');
        registerForm.classList.remove('hidden');
        loadLineProfile();
        
        // 隱藏標題列的邀請按鈕（註冊頁面不顯示）
        const inviteBtn = document.getElementById('btn-invite-header');
        if (inviteBtn) inviteBtn.style.display = 'none';
      }
    } else {
      throw new Error(data.message || '檢查註冊狀態失敗');
    }
  } catch (error) {
    console.error('檢查註冊狀態錯誤:', error);
    loading.innerHTML = `
      <div class="empty-state">
        <div>❌</div>
        <p>載入失敗：${error.message}</p>
      </div>
    `;
  }
}

/**
 * 載入 LINE 使用者資料（頭像、LINE 顯示名稱）
 * 頭像下方顯示 LINE 名字（displayName）
 */
function loadLineProfile() {
  if (window.LIFF) {
    const profile = window.LIFF.getProfile();
    if (profile) {
      const avatarImg = document.getElementById('profile-avatar');
      const lineNameEl = document.getElementById('profile-line-name');
      if (avatarImg && profile.pictureUrl) {
        avatarImg.src = profile.pictureUrl;
      }
      if (lineNameEl) {
        lineNameEl.textContent = profile.displayName || 'LINE 名字';
      }
    }
  }
  const starBadge = document.getElementById('profile-star-icon');
  if (starBadge && !starBadge.textContent) {
    updateStarDisplay('白星');
  }
}

/**
 * 載入個人資料
 */
async function loadProfile() {
  const loading = document.getElementById('loading');
  const profileDisplay = document.getElementById('profile-display');
  const registerForm = document.getElementById('register-form');

  try {
    const userId = window.LIFF ? window.LIFF.getUserId() : null;
    
    if (!userId) {
      throw new Error('無法取得使用者 ID');
    }

    // 取得個人資料
    const response = await fetch('/api/profile', {
      headers: {
        'X-Line-User-Id': userId,
      },
    });

    const data = await response.json();

    if (data.success) {
      userProfile = data.data;
      
      // 載入 LINE 頭像和姓名
      loadLineProfile();

      // 更新顯示模式（唯讀）
      updateProfileView(userProfile);

      // 填入表單資料（編輯模式用）
      document.getElementById('name').value = userProfile.name || '';
      document.getElementById('email').value = userProfile.email || '';
      document.getElementById('phone').value = userProfile.phone || '';
      document.getElementById('starLevel').value = userProfile.starLevel || '白星';

      // 進階資訊：課程紀錄複選框
      const courseRecord = userProfile.courseRecord || '';
      const selectedCourses = courseRecord.split(',').map(c => c.trim()).filter(c => c);
      document.querySelectorAll('input[name="courseRecord"]').forEach(checkbox => {
        checkbox.checked = selectedCourses.includes(checkbox.value);
      });

      // 基本資料：生日（編輯時顯示完整年月日）
      const birthdayInput = document.getElementById('birthday');
      if (birthdayInput) birthdayInput.value = userProfile.birthday || '';

      // 進階資訊：特斯拉加盟主、團隊負責事項
      const teslaSelect = document.getElementById('teslaFranchisee');
      if (teslaSelect) teslaSelect.value = userProfile.teslaFranchisee || '';
      const teamInput = document.getElementById('teamResponsibilities');
      if (teamInput) teamInput.value = userProfile.teamResponsibilities || '';

      // 進階資訊：課程志工紀錄列表
      renderVolunteerRecordsList(parseVolunteerRecords(userProfile.volunteerRecords));
      setupVolunteerAddForm();

      // 頭像下方顯示 LINE 名字（優先從 getProfile，無則用後端 displayName）
      const lineNameEl = document.getElementById('profile-line-name');
      if (lineNameEl) {
        const lineProfile = window.LIFF && window.LIFF.getProfile ? window.LIFF.getProfile() : null;
        lineNameEl.textContent = (lineProfile && lineProfile.displayName) ? lineProfile.displayName : (userProfile.displayName || 'LINE 名字');
      }
      updateStarDisplay(userProfile.starLevel || '白星');

      // 若基本資料未填完整，彈窗提示並進入編輯模式
      if (!isBasicInfoComplete(userProfile)) {
        loading.classList.add('hidden');
        registerForm.classList.add('hidden');
        profileDisplay.classList.remove('hidden');
        document.getElementById('profile-view-mode').classList.add('hidden');
        document.getElementById('profile-edit-mode').classList.remove('hidden');
        
        // 顯示標題列的邀請按鈕
        const inviteBtn = document.getElementById('btn-invite-header');
        if (inviteBtn) inviteBtn.style.display = 'flex';
        
        (async function () {
          if (window.showAppAlert) await window.showAppAlert('請補齊基本資料後儲存');
          else alert('請補齊基本資料後儲存');
        })();
        return;
      }

      // 顯示個人資料（預設為唯讀模式）
      loading.classList.add('hidden');
      registerForm.classList.add('hidden');
      profileDisplay.classList.remove('hidden');
      document.getElementById('profile-view-mode').classList.remove('hidden');
      document.getElementById('profile-edit-mode').classList.add('hidden');
      
      // 顯示標題列的邀請按鈕（已註冊用戶）
      const inviteBtn = document.getElementById('btn-invite-header');
      if (inviteBtn) inviteBtn.style.display = 'flex';
    } else if (data.needRegister) {
      // 需要註冊
      loading.classList.add('hidden');
      registerForm.classList.remove('hidden');
      loadLineProfile();
    } else {
      throw new Error(data.message || '載入個人資料失敗');
    }
  } catch (error) {
    console.error('載入個人資料錯誤:', error);
    loading.innerHTML = `
      <div class="empty-state">
        <div>❌</div>
        <p>載入失敗：${error.message}</p>
      </div>
    `;
  }
}

/**
 * 設定表單提交事件
 */
function setupFormEvents() {
  // 個人資料更新表單
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await updateProfile();
    });
  }

  // 註冊表單
  const registerForm = document.getElementById('register-form-content');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await registerUser();
    });
  }
}

/**
 * 更新星等顯示
 */
function updateStarDisplay(starLevel) {
  const starBadge = document.getElementById('profile-star-icon');
  if (starBadge) {
    starBadge.className = 'member-star ' + (starLevel || '白星');
    starBadge.textContent = starLevel || '白星';
  }
}

/**
 * 生日唯讀時只顯示月/日（不顯示年）
 * @param {string} yyyyMmDd - YYYY-MM-DD 或空
 * @returns {string}
 */
function formatBirthdayView(yyyyMmDd) {
  if (!yyyyMmDd || typeof yyyyMmDd !== 'string') return '未填';
  const parts = yyyyMmDd.trim().split('-');
  if (parts.length >= 2) return parts[1] + '/' + parts[2];
  return yyyyMmDd;
}

/**
 * 檢查基本資料是否已填寫完整（真實姓名必填且不可為空／未設定）
 * @param {Object} profile - 成員資料
 * @returns {boolean}
 */
function isBasicInfoComplete(profile) {
  const name = (profile && profile.name) ? String(profile.name).trim() : '';
  if (!name || name === '未設定') return false;
  return true;
}

/**
 * 更新個人資料顯示（唯讀模式），含基本資料與進階資訊
 */
function updateProfileView(profile) {
  document.getElementById('view-name').textContent = profile.name || '未設定';
  document.getElementById('view-email').textContent = profile.email || '未設定';
  document.getElementById('view-phone').textContent = profile.phone || '未設定';
  document.getElementById('view-starLevel').textContent = profile.starLevel || '白星';
  document.getElementById('view-birthday').textContent = formatBirthdayView(profile.birthday);

  // 進階資訊：課程紀錄
  const courseRecord = profile.courseRecord || '';
  if (courseRecord) {
    const courses = courseRecord.split(',').map(c => c.trim()).filter(c => c);
    document.getElementById('view-courseRecord').textContent = courses.join('、') || '無';
  } else {
    document.getElementById('view-courseRecord').textContent = '無';
  }

  // 進階資訊：是否為特斯拉出行加盟主
  const teslaEl = document.getElementById('view-teslaFranchisee');
  if (teslaEl) teslaEl.textContent = profile.teslaFranchisee === '是' || profile.teslaFranchisee === '否' ? profile.teslaFranchisee : '未填';

  // 進階資訊：團隊負責事項
  const teamEl = document.getElementById('view-teamResponsibilities');
  if (teamEl) teamEl.textContent = (profile.teamResponsibilities || '').trim() || '未填';

  // 進階資訊：課程志工（解析 JSON 陣列顯示）
  const volunteerEl = document.getElementById('view-volunteerRecords');
  if (volunteerEl) {
    const list = parseVolunteerRecords(profile.volunteerRecords);
    if (list.length === 0) {
      volunteerEl.textContent = '無';
    } else {
      volunteerEl.textContent = list.map(r => `${r.date} ${r.option}`).join('、');
    }
  }
}

/**
 * 解析課程志工紀錄 JSON 字串，回傳陣列 [{ date, option }, ...]
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
 * 啟用編輯模式
 */
function enableEditMode() {
  document.getElementById('profile-view-mode').classList.add('hidden');
  document.getElementById('profile-edit-mode').classList.remove('hidden');
}

/**
 * 取消編輯模式
 */
function cancelEditMode() {
  // 重新載入資料以恢復原始值
  if (userProfile) {
    document.getElementById('name').value = userProfile.name || '';
    document.getElementById('email').value = userProfile.email || '';
    document.getElementById('phone').value = userProfile.phone || '';
    document.getElementById('starLevel').value = userProfile.starLevel || '白星';
    const courseRecord = userProfile.courseRecord || '';
    const selectedCourses = courseRecord.split(',').map(c => c.trim()).filter(c => c);
    document.querySelectorAll('input[name="courseRecord"]').forEach(checkbox => {
      checkbox.checked = selectedCourses.includes(checkbox.value);
    });
    const teslaSelect = document.getElementById('teslaFranchisee');
    if (teslaSelect) teslaSelect.value = userProfile.teslaFranchisee || '';
    const teamInput = document.getElementById('teamResponsibilities');
    if (teamInput) teamInput.value = userProfile.teamResponsibilities || '';
    renderVolunteerRecordsList(parseVolunteerRecords(userProfile.volunteerRecords));
    const birthdayInput = document.getElementById('birthday');
    if (birthdayInput) birthdayInput.value = userProfile.birthday || '';
  }
  document.getElementById('profile-view-mode').classList.remove('hidden');
  document.getElementById('profile-edit-mode').classList.add('hidden');
}

/** 課程志工紀錄暫存（編輯時使用），陣列 [{ date, option }, ...] */
let volunteerRecordsEdit = [];

/**
 * 渲染課程志工紀錄列表（編輯模式用），並更新暫存
 */
function renderVolunteerRecordsList(list) {
  volunteerRecordsEdit = Array.isArray(list) ? list.slice() : [];
  const container = document.getElementById('volunteer-records-list');
  if (!container) return;
  if (volunteerRecordsEdit.length === 0) {
    container.innerHTML = '<p class="text-muted" style="margin:0; font-size: 14px;">尚無記錄，可點「新增記錄」</p>';
    return;
  }
  container.innerHTML = volunteerRecordsEdit.map((r, i) => `
    <div class="volunteer-record-item" data-index="${i}" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color, #eee);">
      <span>${r.date || ''} ${r.option || ''}</span>
      <button type="button" class="btn btn-small" data-index="${i}" aria-label="刪除此筆">刪除</button>
    </div>
  `).join('');
  // 綁定刪除按鈕
  container.querySelectorAll('.volunteer-record-item button').forEach(btn => {
    btn.addEventListener('click', function () {
      const idx = parseInt(this.getAttribute('data-index'), 10);
      volunteerRecordsEdit.splice(idx, 1);
      renderVolunteerRecordsList(volunteerRecordsEdit);
    });
  });
}

/**
 * 設定「新增記錄」表單：顯示/隱藏、確定/取消
 */
function setupVolunteerAddForm() {
  const btnAdd = document.getElementById('btn-add-volunteer');
  const form = document.getElementById('volunteer-add-form');
  const btnConfirm = document.getElementById('volunteer-confirm');
  const btnCancel = document.getElementById('volunteer-cancel');
  const inputDate = document.getElementById('volunteer-date');
  const inputOption = document.getElementById('volunteer-option');
  if (!btnAdd || !form) return;

  btnAdd.addEventListener('click', function () {
    form.classList.remove('hidden');
    if (inputDate) inputDate.value = new Date().toISOString().slice(0, 10);
    if (inputOption) inputOption.value = '金流';
  });

  function hideForm() {
    form.classList.add('hidden');
  }

  if (btnCancel) btnCancel.addEventListener('click', hideForm);
  if (btnConfirm) {
    btnConfirm.addEventListener('click', function () {
      const date = inputDate ? inputDate.value : '';
      const option = inputOption ? inputOption.value : '金流';
      if (date) {
        volunteerRecordsEdit.push({ date, option });
        renderVolunteerRecordsList(volunteerRecordsEdit);
      }
      hideForm();
    });
  }
}

/**
 * 取得選取的課程紀錄（複選框）
 */
function getSelectedCourses(prefix = '') {
  const checkboxes = document.querySelectorAll(`input[name="${prefix}courseRecord"]:checked`);
  return Array.from(checkboxes).map(cb => cb.value).join(', ');
}

/**
 * 更新個人資料
 */
async function updateProfile() {
  try {
    const userId = window.LIFF ? window.LIFF.getUserId() : null;
    
    if (!userId) {
      if (window.showAppAlert) await window.showAppAlert('無法取得使用者 ID');
      else alert('無法取得使用者 ID');
      return;
    }

    // 一併更新 LINE 頭像 URL 與顯示名稱（成員列表用）
    const lineProfile = window.LIFF && window.LIFF.getProfile ? window.LIFF.getProfile() : null;
    const pictureUrl = (lineProfile && lineProfile.pictureUrl) ? lineProfile.pictureUrl : '';
    const displayName = (lineProfile && lineProfile.displayName) ? lineProfile.displayName : '';
    const formData = {
      name: document.getElementById('name').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
      starLevel: document.getElementById('starLevel').value,
      courseRecord: getSelectedCourses(),
      pictureUrl: pictureUrl,
      teslaFranchisee: document.getElementById('teslaFranchisee').value || '',
      teamResponsibilities: document.getElementById('teamResponsibilities').value || '',
      volunteerRecords: JSON.stringify(volunteerRecordsEdit),
      birthday: document.getElementById('birthday') ? document.getElementById('birthday').value : '',
      displayName: displayName,
    };
    
    // 更新星等顯示
    updateStarDisplay(formData.starLevel);

    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Line-User-Id': userId,
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (data.success) {
      // 不論後端有沒有回傳資料，都當成成功：用回傳資料或目前表單值更新畫面
      userProfile = data.data || {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        starLevel: formData.starLevel,
        courseRecord: formData.courseRecord,
        teslaFranchisee: formData.teslaFranchisee,
        teamResponsibilities: formData.teamResponsibilities,
        volunteerRecords: formData.volunteerRecords,
        birthday: formData.birthday,
        displayName: formData.displayName,
      };
      // 更新唯讀區塊的顯示內容
      updateProfileView(userProfile);
      // 更新頭像旁的姓名
      const nameDisplay = document.getElementById('profile-name');
      if (nameDisplay) {
        nameDisplay.textContent = userProfile.name || '未設定';
      }
      // 先關閉編輯模式、跳回個人資料（唯讀畫面）
      document.getElementById('profile-view-mode').classList.remove('hidden');
      document.getElementById('profile-edit-mode').classList.add('hidden');
      // 再跳出「個人資料更新成功」視窗（統一彈窗風格）
      if (window.showAppAlert) await window.showAppAlert('✅ 個人資料更新成功！');
      else alert('✅ 個人資料更新成功！');
    } else {
      if (window.showAppAlert) await window.showAppAlert('❌ 更新失敗：' + (data.message || '未知錯誤'));
      else alert('❌ 更新失敗：' + (data.message || '未知錯誤'));
    }
  } catch (error) {
    console.error('更新個人資料錯誤:', error);
    if (window.showAppAlert) await window.showAppAlert('❌ 更新失敗，請稍後再試');
    else alert('❌ 更新失敗，請稍後再試');
  }
}

/**
 * 註冊表單驗證：檢查完整性與格式，回傳 { valid, messages }
 */
function validateRegisterForm() {
  const messages = [];
  const name = (document.getElementById('reg-name').value || '').trim();
  const email = (document.getElementById('reg-email').value || '').trim();
  const phone = (document.getElementById('reg-phone').value || '').trim();

  // 真實姓名：必填
  if (!name) {
    messages.push('請填寫「真實姓名」，此為必填欄位。');
  }

  // Email：若填了須為合法格式
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      messages.push('「Email」格式不正確，請填寫有效的電子郵件地址（例：abc@example.com）。');
    }
  }

  // 電話號碼：若填了須為合法格式（數字、可含 - 或空格，有效長度約 7–12 碼）
  if (phone) {
    const digitsOnly = phone.replace(/[\s\-]/g, '');
    if (!/^\d+$/.test(digitsOnly) || digitsOnly.length < 7 || digitsOnly.length > 12) {
      messages.push('「電話號碼」格式不正確，請填寫 7～12 碼數字（可含 - 或空格）。');
    }
  }

  return {
    valid: messages.length === 0,
    messages: messages,
  };
}

/**
 * 註冊新使用者
 */
async function registerUser() {
  try {
    const userId = window.LIFF ? window.LIFF.getUserId() : null;
    
    if (!userId) {
      if (window.showAppAlert) await window.showAppAlert('無法取得使用者 ID');
      else alert('無法取得使用者 ID');
      return;
    }

    // 送出前先做完整性與格式驗證
    const validation = validateRegisterForm();
    if (!validation.valid) {
      if (window.showAppAlert) await window.showAppAlert('請完整填寫並確認資料正確：\n\n' + validation.messages.join('\n'));
      else alert('請完整填寫並確認資料正確：\n\n' + validation.messages.join('\n'));
      return;
    }

    // 取得 LINE 頭像 URL（註冊時一併存入，成員列表可顯示頭像）
    const lineProfile = window.LIFF && window.LIFF.getProfile ? window.LIFF.getProfile() : null;
    const pictureUrl = (lineProfile && lineProfile.pictureUrl) ? lineProfile.pictureUrl : '';

    // 從 URL 參數中讀取邀請人 ID（如果有的話）
    const urlParams = new URLSearchParams(window.location.search);
    const invitedBy = urlParams.get('invitedBy') || '';
    if (invitedBy) {
      console.log('✅ 檢測到邀請人:', invitedBy);
    }

    const regBirthday = document.getElementById('reg-birthday') ? document.getElementById('reg-birthday').value : '';
    const formData = {
      name: (document.getElementById('reg-name').value || '').trim(),
      email: (document.getElementById('reg-email').value || '').trim(),
      phone: (document.getElementById('reg-phone').value || '').trim(),
      starLevel: document.getElementById('reg-starLevel').value,
      courseRecord: getSelectedCourses('reg-'),
      pictureUrl: pictureUrl,
      teslaFranchisee: document.getElementById('reg-teslaFranchisee') ? document.getElementById('reg-teslaFranchisee').value : '',
      teamResponsibilities: document.getElementById('reg-teamResponsibilities') ? document.getElementById('reg-teamResponsibilities').value : '',
      volunteerRecords: '[]',
      birthday: regBirthday || '',
      displayName: (lineProfile && lineProfile.displayName) ? lineProfile.displayName : '',
      invitedBy: invitedBy, // 記錄邀請人的 LINE ID
    };

    const response = await fetch('/api/profile/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Line-User-Id': userId,
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (data.success) {
      if (window.showAppAlert) await window.showAppAlert('✅ 註冊成功！');
      else alert('✅ 註冊成功！');
      // 導向行事曆主頁（離開前儲存本頁狀態）
      if (window.__savePageState) window.__savePageState();
      var qs = window.location.search || '';
      window.location.href = '/index.html' + qs;
    } else {
      if (window.showAppAlert) await window.showAppAlert('❌ 註冊失敗：' + (data.message || '未知錯誤'));
      else alert('❌ 註冊失敗：' + (data.message || '未知錯誤'));
    }
  } catch (error) {
    console.error('註冊錯誤:', error);
    if (window.showAppAlert) await window.showAppAlert('❌ 註冊失敗，請稍後再試');
    else alert('❌ 註冊失敗，請稍後再試');
  }
}

/**
 * 從個人資料頁面邀請新成員
 * 用 LINE Share URL 開啟「選好友／群組」分享頁（機器人訊息不能長按轉傳）
 */
async function inviteMemberFromProfile() {
  try {
    const inviterLineId = window.LIFF && window.LIFF.getUserId ? window.LIFF.getUserId() : '';
    if (!inviterLineId) {
      if (window.showAppAlert) await window.showAppAlert('請先登入 LINE 再邀請');
      else alert('請先登入 LINE 再邀請');
      return;
    }

    const baseUrl = window.location.origin;
    const inviteUrl = baseUrl + '/profile.html' + (inviterLineId ? '?invitedBy=' + encodeURIComponent(inviterLineId) : '');
    const shareText = '📋 邀請你加入我們！\n\n請點擊下方連結完成註冊：\n' + inviteUrl;

    const lineShareUrl = 'https://line.me/R/share?text=' + encodeURIComponent(shareText);

    window.location.href = lineShareUrl;
  } catch (error) {
    console.error('[邀請] 錯誤:', error);
    const errMsg = (error && error.message) ? error.message : String(error || '');
    if (window.showAppAlert) await window.showAppAlert('❌ 邀請失敗：' + errMsg);
    else alert('❌ 邀請失敗：' + errMsg);
  }
}

/**
 * 前往財力上傳頁面
 */
function goToFinancialUpload() {
  const userId = (window.LIFF && typeof window.LIFF.getUserId === 'function')
    ? window.LIFF.getUserId()
    : (userProfile && userProfile.lineId) ? userProfile.lineId : '';

  const targetUrl = userId
    ? `/financial-upload.html?userId=${encodeURIComponent(userId)}`
    : '/financial-upload.html';

  window.location.href = targetUrl;
}

// 匯出函數供全域使用
window.enableEditMode = enableEditMode;
window.cancelEditMode = cancelEditMode;
window.inviteMemberFromProfile = inviteMemberFromProfile;
window.goToFinancialUpload = goToFinancialUpload;

// 頁面載入時初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProfile);
} else {
  initProfile();
}
