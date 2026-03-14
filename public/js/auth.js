/**
 * 身份驗證與 LINE 功能模組（不依賴 LIFF SDK）
 * 使用 LINE Login (OAuth) 登入 + LINE URL Scheme 分享
 * 提供 window.LIFF 介面，讓其他頁面無需修改
 */

// ========== 執行模式（請手動設定） ==========
// 'development' = 開發模式（模擬 LINE，本機測試）
// 'production'  = 正式模式（LINE Login OAuth + LINE URL Scheme）
var APP_RUN_MODE = 'production';
// ==========

// 登入狀態
let authInitialized = false;
let currentUserId = null;
let currentProfile = null;

/**
 * 檢查網址是否帶有 dev 參數（?dev=1 或 ?dev=0）
 */
function getDevParamFromUrl() {
  try {
    var params = new URLSearchParams(window.location.search);
    var dev = params.get('dev');
    if (dev === '1') return 'development';
    if (dev === '0') return 'production';
  } catch (e) {}
  return null;
}

/**
 * 取得執行模式（URL 參數可覆蓋 APP_RUN_MODE）
 */
function getRunMode() {
  var urlOverride = getDevParamFromUrl();
  if (urlOverride) return urlOverride;
  var m = (typeof APP_RUN_MODE === 'string' && APP_RUN_MODE) || 'production';
  // 相容舊的 'internal' 模式，視為 'production'
  if (m === 'internal') return 'production';
  if (m !== 'development' && m !== 'production') return 'production';
  return m;
}

/**
 * 是否為開發模式
 */
function isDevMode() {
  return getRunMode() === 'development';
}

/**
 * 進入系統時：將 LINE 頭像與資料庫比對，有更新則同步
 */
function syncAvatarOnEntry(userId, pictureUrl) {
  if (!userId) return;
  fetch('/api/profile/sync-avatar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Line-User-Id': userId },
    body: JSON.stringify({ pictureUrl: pictureUrl || '' }),
  }).then(function (res) { return res.json(); }).then(function (data) {
    if (data.synced) console.log('🔄 LINE 頭像已同步更新');
  }).catch(function (err) {
    console.warn('同步頭像略過:', err && err.message ? err.message : err);
  });
}

/**
 * 初始化登入狀態
 * 流程：URL 參數 → localStorage → 未登入
 */
async function initAuth() {
  try {
    // === 開發模式：使用模擬 LINE ID ===
    if (isDevMode()) {
      currentUserId = 'U11111111111111111111111111111111';
      currentProfile = {
        userId: currentUserId,
        displayName: '開發測試員',
        pictureUrl: 'https://via.placeholder.com/100',
        statusMessage: ''
      };
      authInitialized = true;
      console.log('🛠️ 開發模式：已使用模擬 LINE ID');
      setTimeout(function () {
        window.dispatchEvent(new CustomEvent('liffReady', {
          detail: { userId: currentUserId, profile: currentProfile }
        }));
      }, 0);
      return;
    }

    // === 正式模式：從 URL 參數或 localStorage 取得 userId ===
    var params = new URLSearchParams(window.location.search);
    var urlUserId = params.get('userId');
    var isAuth = params.get('auth') === '1';

    if (urlUserId) {
      // 從 OAuth 回調拿到 userId，存到 localStorage
      currentUserId = urlUserId;
      try { localStorage.setItem('lineUserId', urlUserId); } catch (e) { console.warn('[auth] localStorage 寫入失敗:', e); }

      // 也儲存 LINE 暱稱與頭像（由 OAuth 回調帶回）
      var urlDisplayName = params.get('displayName');
      var urlPictureUrl = params.get('pictureUrl');
      try { if (urlDisplayName) localStorage.setItem('lineDisplayName', urlDisplayName); } catch (e) {}
      try { if (urlPictureUrl) localStorage.setItem('linePictureUrl', urlPictureUrl); } catch (e) {}

      currentProfile = {
        userId: currentUserId,
        displayName: urlDisplayName || '',
        pictureUrl: urlPictureUrl || '',
        statusMessage: ''
      };

      // 清除 URL 中的登入參數（保留其他參數如 date、id 等）
      if (isAuth) {
        try {
          var cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete('userId');
          cleanUrl.searchParams.delete('auth');
          cleanUrl.searchParams.delete('displayName');
          cleanUrl.searchParams.delete('pictureUrl');
          history.replaceState({}, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
        } catch (e) { console.warn('[auth] history.replaceState 失敗:', e); }
      }
    } else {
      // 沒有 URL 參數，從 localStorage 讀取
      currentUserId = localStorage.getItem('lineUserId');
      if (currentUserId) {
        currentProfile = {
          userId: currentUserId,
          displayName: localStorage.getItem('lineDisplayName') || '',
          pictureUrl: localStorage.getItem('linePictureUrl') || '',
          statusMessage: ''
        };
      }
    }

    // 標記初始化完成
    authInitialized = true;

    if (currentUserId) {
      console.log('✅ 登入成功，使用者 ID:', currentUserId);
      // 同步 LINE 頭像
      if (currentProfile && currentProfile.pictureUrl) {
        syncAvatarOnEntry(currentUserId, currentProfile.pictureUrl);
      }
    } else {
      console.log('⚠️ 尚未登入');
    }

    // 觸發 liffReady 事件（讓其他頁面可以接收）
    // 用 setTimeout(0) 確保 HTML inline script 的 listener 已先註冊
    setTimeout(function() {
      window.dispatchEvent(new CustomEvent('liffReady', {
        detail: { userId: currentUserId, profile: currentProfile }
      }));
    }, 0);

    // 首頁的流程由 index 的 entryGate 處理
    var path = (window.location.pathname || '').toLowerCase();
    var isEntryPage = path === '/' || path.endsWith('/index.html');
    if (isEntryPage) return;

    // 非首頁：未登入時顯示登入按鈕
    if (!currentUserId) {
      showLoginOverlay();
    }

  } catch (error) {
    console.error('❌ 初始化失敗:', error);
    authInitialized = false;
    setTimeout(function() {
      window.dispatchEvent(new CustomEvent('liffReady', {
        detail: { userId: null, profile: null }
      }));
    }, 0);
  }
}

/**
 * 取得 LINE User ID
 */
function getUserId() {
  return currentUserId;
}

/**
 * 取得 LINE 使用者資料
 */
function getProfile() {
  return currentProfile;
}

/**
 * 分享訊息到 LINE（使用 LINE URL Scheme，不需要 LIFF）
 * 手機：開啟 LINE 的「分享給…」畫面，可選好友／群組
 * 電腦：嘗試 Web Share API，失敗則複製到剪貼簿
 */
async function shareMessage(message) {
  try {
    var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile) {
      // 手機：用 LINE URL Scheme 開啟 LINE 的分享畫面
      var lineShareUrl = 'https://line.me/R/share?text=' + encodeURIComponent(message);
      window.location.href = lineShareUrl;
      return;
    }

    // 電腦：嘗試 Web Share API
    if (navigator.share) {
      await navigator.share({ title: '分享', text: message });
      return;
    }

    // 最後手段：複製到剪貼簿
    await navigator.clipboard.writeText(message);
    if (window.showAppAlert) await window.showAppAlert('📋 訊息已複製到剪貼簿！');
    else alert('📋 訊息已複製到剪貼簿！');
  } catch (error) {
    console.error('分享失敗:', error);
    try {
      await navigator.clipboard.writeText(message);
      if (window.showAppAlert) await window.showAppAlert('📋 訊息已複製到剪貼簿！');
      else alert('📋 訊息已複製到剪貼簿！');
    } catch (clipboardError) {
      if (window.showAppAlert) await window.showAppAlert('請手動複製：\n\n' + message);
      else alert('請手動複製：\n\n' + message);
    }
  }
}

/**
 * 分享多則訊息到 LINE（取代原本的 liff.shareTargetPicker）
 * 從訊息陣列中取出文字內容，用 LINE URL Scheme 分享
 */
async function shareTargetPicker(messages) {
  // 從訊息中取出可讀文字
  var textParts = [];
  for (var i = 0; i < messages.length; i++) {
    var msg = messages[i];
    if (msg.text) textParts.push(msg.text);
    else if (msg.altText) textParts.push(msg.altText);
  }
  var text = textParts.join('\n') || '分享內容';
  return shareMessage(text);
}

/**
 * 開啟外部連結（直接用 window.open，不需要 LIFF）
 */
function openURL(url, external) {
  window.open(url, '_blank');
}

/**
 * 關閉視窗
 */
function closeWindow() {
  if (window.showAppConfirm) {
    window.showAppConfirm('確定要離開嗎？', { yesText: '確定', noText: '取消' }).then(function (ok) {
      if (ok) window.close();
    });
  } else if (confirm('確定要離開嗎？')) {
    window.close();
  }
}

/**
 * 觸發 LINE 登入（導向 LINE OAuth 授權頁）
 */
function triggerLogin() {
  if (isDevMode()) return;
  // 把當前頁面網址當作登入後的返回目標
  var returnUrl = window.location.pathname + window.location.search;
  window.location.href = '/api/auth/line-login?returnUrl=' + encodeURIComponent(returnUrl);
}

/**
 * 登出：清除 localStorage 並重新載入
 */
function logout() {
  localStorage.removeItem('lineUserId');
  localStorage.removeItem('lineDisplayName');
  localStorage.removeItem('linePictureUrl');
  currentUserId = null;
  currentProfile = null;
  authInitialized = false;
  window.location.reload();
}

/**
 * 顯示「使用 LINE 登入」全螢幕 overlay
 */
function showLoginOverlay() {
  if (document.getElementById('liff-login-overlay')) return;
  var overlay = document.createElement('div');
  overlay.id = 'liff-login-overlay';
  overlay.className = 'liff-login-overlay';
  overlay.innerHTML =
    '<h2>📅 行事曆</h2>' +
    '<p>請使用 LINE 帳號登入，以使用行程與成員功能。</p>' +
    '<button type="button" class="btn-line-login" id="liff-login-btn">使用 LINE 登入</button>';
  overlay.querySelector('#liff-login-btn').addEventListener('click', function () {
    var btn = this;
    btn.disabled = true;
    btn.textContent = '導向登入中…';
    triggerLogin();
  });
  document.body.appendChild(overlay);
}

/**
 * 取得「分享／轉發」的發送對象（後端 Push 用）
 */
function getShareTarget() {
  var msg = '發送到與 Bot 的聊天室（自己）請留空；\n轉發到指定好友或群組請輸入 User ID 或 Group ID（33 字元）';
  var input = prompt(msg);
  if (input === null) return Promise.resolve({ cancelled: true, targetId: null });
  var trimmed = String(input || '').trim();
  if (trimmed.length === 0) return Promise.resolve({ cancelled: false, targetId: null });
  if (trimmed.length !== 33) {
    alert('請輸入 33 字元的 User ID 或 Group ID');
    return Promise.resolve({ cancelled: true, targetId: null });
  }
  return Promise.resolve({ cancelled: false, targetId: trimmed });
}

// 頁面載入時自動初始化
initAuth();

// === 匯出 window.LIFF 介面（保持不變，其他頁面無需修改）===
window.LIFF = {
  init: initAuth,
  getUserId: getUserId,
  getProfile: getProfile,
  shareMessage: shareMessage,
  shareTargetPicker: shareTargetPicker,
  getShareTarget: getShareTarget,
  openURL: openURL,
  closeWindow: closeWindow,
  login: triggerLogin,
  logout: logout,
  isInitialized: function () { return authInitialized; },
  getRunMode: getRunMode,
  isDevMode: isDevMode,
};

// === window.liff 相容層（讓舊呼叫仍能運作）===
window.liff = {
  shareTargetPicker: shareTargetPicker,
  shareMessage: shareMessage,
  isInClient: function () { return false; },
  isLoggedIn: function () { return !!currentUserId; },
  login: triggerLogin,
  getProfile: function () { return Promise.resolve(currentProfile); },
  init: function () { return Promise.resolve(); },
};

// === Service Worker 註冊 ===
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js')
      .then(function (reg) { console.log('[SW] 已註冊:', reg.scope); })
      .catch(function (err) { console.warn('[SW] 註冊失敗:', err); });
  });
}

// === PWA 手機視窗尺寸（安裝在電腦時自動縮成手機比例）===
if (window.matchMedia('(display-mode: standalone)').matches) {
  // 390 x 844 = iPhone 14 常用尺寸
  window.resizeTo(390, 844);
  window.moveTo(
    Math.round((screen.width - 390) / 2),
    Math.round((screen.height - 844) / 2)
  );
}
