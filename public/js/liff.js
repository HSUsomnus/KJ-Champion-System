/**
 * LINE LIFF 初始化與工具函數
 * 負責初始化 LIFF SDK 並提供常用的 LINE 功能
 */

// ========== 執行模式（請手動設定，不要自動判斷） ==========
// 請依目前情境改為以下其一：
//   'development' = 開發模式（模擬 LINE，本機測試）
//   'internal'    = 內測模式（真實 LIFF，本機跑伺服 + ngrok 測試）
//   'production'  = 正式部署（真實 LIFF，正式網域）
var APP_RUN_MODE = 'internal';
// ==========

// LIFF 初始化狀態
let liffInitialized = false;
let liffUserId = null;
let liffProfile = null;

/**
 * 取得執行模式（依你設定的 APP_RUN_MODE，不自動判斷）
 */
function getRunMode() {
  var m = (typeof APP_RUN_MODE === 'string' && APP_RUN_MODE) || 'production';
  if (m !== 'development' && m !== 'internal' && m !== 'production') return 'production';
  return m;
}

/**
 * 是否為開發模式（僅當 APP_RUN_MODE === 'development' 時為 true）
 */
function isDevMode() {
  return getRunMode() === 'development';
}

/**
 * 每次用戶進入系統時呼叫：將目前 LINE 頭像與資料庫比對，有更新則同步到 Google Sheet
 * 不阻塞畫面，背景執行即可
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
 * 初始化 LINE LIFF
 * @returns {Promise<void>}
 */
async function initLIFF() {
  try {
    // 開發模式：跳過 LINE 登入，使用固定模擬 LINE ID，可測試成員/個人資料等（僅分享等需真實 LINE 的功能不可測）
    if (isDevMode()) {
      liffUserId = 'U11111111111111111111111111111111'; // 33 字元固定模擬 LINE User ID
      liffProfile = {
        userId: liffUserId,
        displayName: '開發測試員',
        pictureUrl: 'https://via.placeholder.com/100',
        statusMessage: ''
      };
      liffInitialized = true;
      console.log('🛠️ 開發模式：已使用模擬 LINE ID，可測試成員與個人資料');
      // 延遲觸發，讓其他腳本有時間註冊 liffReady 監聽
      setTimeout(function () {
        window.dispatchEvent(new CustomEvent('liffReady', { 
          detail: { userId: liffUserId, profile: liffProfile } 
        }));
      }, 0);

      // 開發模式：進入頁（index）的檢查與導向由 index 的 entryGate 處理（登入動畫後再檢查）
      // 非進入頁（例如直接開 list.html）若未註冊仍可操作，不在此強制導向
      return;
    }

    // 從後端取得 LIFF ID
    const response = await fetch('/api/line/liff-id');
    const data = await response.json();
    
    if (!data.success) {
      throw new Error('無法取得 LIFF ID');
    }

    const liffId = data.data.liffId;

    // 初始化 LIFF SDK
    await liff.init({ liffId: liffId });

    // 取得使用者資訊
    if (liff.isLoggedIn()) {
      const profile = await liff.getProfile();
      liffUserId = profile.userId;
      liffProfile = profile;
      // 每次進入系統：檢查用戶是否換 LINE 頭像，有更新則同步到 Google Sheet
      if (!isDevMode() && liffUserId) {
        syncAvatarOnEntry(liffUserId, (profile.pictureUrl || '').trim());
      }
      console.log('✅ LIFF 初始化成功');
      console.log('使用者 ID:', liffUserId);
    } else {
      // 未登入：不自動跳轉，改顯示「使用 LINE 登入」按鈕，讓使用者手動觸發登入（方便測試與整合）
      console.log('⚠️ 尚未使用 LINE 登入，請點選登入按鈕');
    }

    liffInitialized = true;
    
    // 觸發自訂事件，通知其他模組 LIFF 已準備好
    window.dispatchEvent(new CustomEvent('liffReady', { 
      detail: { userId: liffUserId, profile: liffProfile } 
    }));

    // 進入頁（index）的流程由 index 的 entryGate 腳本處理：登入動畫 → 檢查成員 → 登入頁/註冊頁/主頁
    var path = (window.location.pathname || '').toLowerCase();
    var isEntryPage = path === '/' || path.endsWith('/index.html');
    if (isEntryPage) {
      // 不在此處顯示 overlay、也不在此處做註冊檢查，交給 index 的 entryGate
      return;
    }

    // 非進入頁：未登入時顯示「使用 LINE 登入」overlay
    if (!liffUserId && typeof liff !== 'undefined') {
      showLoginOverlay();
    }

    // 非進入頁、已登入：若目前為 profile 以外需要登入的頁，可在此做其他檢查（進入頁已由 index 處理）

  } catch (error) {
    console.error('❌ LIFF 初始化失敗:', error);
    // 即使 LIFF 初始化失敗，也允許應用程式繼續運行（用於開發測試）
    liffInitialized = false;
    window.dispatchEvent(new CustomEvent('liffReady', { 
      detail: { userId: null, profile: null } 
    }));
  }
}

/**
 * 取得 LINE User ID
 * @returns {string|null}
 */
function getUserId() {
  return liffUserId;
}

/**
 * 取得 LINE 使用者資料
 * @returns {Object|null}
 */
function getProfile() {
  return liffProfile;
}

/**
 * 分享訊息到 LINE 好友或群組
 * @param {string} message - 要分享的訊息文字
 * @returns {Promise<void>}
 */
async function shareMessage(message) {
  try {
    if (!liffInitialized || !liff.isInClient()) {
      // 如果不在 LINE 環境中，使用 Web Share API
      if (navigator.share) {
        await navigator.share({
          title: '分享行程',
          text: message,
        });
        return;
      } else {
        // 複製到剪貼簿
        await navigator.clipboard.writeText(message);
        if (window.showAppAlert) await window.showAppAlert('訊息已複製到剪貼簿！');
        else alert('訊息已複製到剪貼簿！');
        return;
      }
    }

    // 使用 LINE LIFF 的分享功能
    await liff.shareTargetPicker([
      {
        type: 'text',
        text: message,
      },
    ]);
  } catch (error) {
    console.error('❌ 分享失敗:', error);
    
    // 如果分享失敗，嘗試複製到剪貼簿
    try {
      await navigator.clipboard.writeText(message);
      if (window.showAppAlert) await window.showAppAlert('分享功能無法使用，訊息已複製到剪貼簿！');
      else alert('分享功能無法使用，訊息已複製到剪貼簿！');
    } catch (clipboardError) {
      if (window.showAppAlert) await window.showAppAlert('無法分享訊息，請手動複製：\n\n' + message);
      else alert('無法分享訊息，請手動複製：\n\n' + message);
    }
  }
}

/**
 * 開啟外部連結
 * @param {string} url - 要開啟的網址
 * @param {boolean} external - 是否在外部瀏覽器開啟
 */
function openURL(url, external = false) {
  if (liffInitialized && liff.isInClient()) {
    if (external) {
      liff.openWindow({ url: url, external: true });
    } else {
      liff.openWindow({ url: url, external: false });
    }
  } else {
    window.open(url, '_blank');
  }
}

/**
 * 關閉 LIFF 視窗（回到 LINE）
 */
function closeWindow() {
  if (liffInitialized && liff.isInClient()) {
    liff.closeWindow();
  } else {
    // 如果不在 LINE 環境中，顯示提示（統一彈窗風格）
    if (window.showAppConfirm) {
      window.showAppConfirm('確定要離開嗎？', { yesText: '確定', noText: '取消' }).then(function (ok) {
        if (ok) window.close();
      });
    } else if (confirm('確定要離開嗎？')) {
      window.close();
    }
  }
}

/**
 * 觸發 LINE 登入（導向 LINE OAuth，登入後會回到目前頁面）
 * 僅在非開發模式且 LIFF 已載入時有效
 */
function triggerLogin() {
  if (isDevMode()) return;
  if (typeof liff !== 'undefined' && liff.login) {
    liff.login();
  }
}

/**
 * 顯示「使用 LINE 登入」全螢幕 overlay
 * 當非開發模式且未登入時，由 initLIFF 呼叫
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

// 頁面載入時自動初始化 LIFF
// 開發模式：不需要等 LIFF SDK（讓本地測試不被 CDN 載入速度影響）
if (isDevMode()) {
  initLIFF();
} else if (typeof liff !== 'undefined') {
  initLIFF();
} else {
  console.error('❌ LIFF SDK 未載入，請確認已引入 liff.js');
}

/**
 * 分享多則訊息到 LINE（可含 Flex 字卡）
 * 供成員頁「邀請新夥伴」等使用，分享出去會是字卡樣式而非純文字
 * @param {Array<object>} messages - 訊息陣列，例如 [{ type: 'flex', altText: '...', contents: flexBubble }]
 * @returns {Promise<void>}
 */
async function shareTargetPicker(messages) {
  if (typeof liff !== 'undefined' && liff.shareTargetPicker) {
    return liff.shareTargetPicker(messages);
  }
  return Promise.reject(new Error('shareTargetPicker 僅在 LINE App 內可用'));
}

/**
 * 取得「分享／轉發」的發送對象（供所有分享字卡、整月文字使用，不含邀請字卡）
 * 留空＝發送到與 Bot 的聊天室（自己）；輸入 33 字元＝轉發到指定 User ID 或 Group ID；取消＝不發送
 * @returns {Promise<{ cancelled: boolean, targetId: string|null }>}
 */
function getShareTarget() {
  const msg = '發送到與 Bot 的聊天室（自己）請留空；\n轉發到指定好友或群組請輸入 User ID 或 Group ID（33 字元）';
  const input = prompt(msg);
  if (input === null) return Promise.resolve({ cancelled: true, targetId: null });
  const trimmed = String(input || '').trim();
  if (trimmed.length === 0) return Promise.resolve({ cancelled: false, targetId: null });
  if (trimmed.length !== 33) {
    alert('請輸入 33 字元的 User ID 或 Group ID');
    return Promise.resolve({ cancelled: true, targetId: null });
  }
  return Promise.resolve({ cancelled: false, targetId: trimmed });
}

// 匯出函數供其他模組使用（單一 switch：開發／內測／正式）
window.LIFF = {
  init: initLIFF,
  getUserId: getUserId,
  getProfile: getProfile,
  shareMessage: shareMessage,
  shareTargetPicker: shareTargetPicker,
  getShareTarget: getShareTarget,
  openURL: openURL,
  closeWindow: closeWindow,
  login: triggerLogin,
  isInitialized: () => liffInitialized,
  getRunMode: getRunMode,
  isDevMode: isDevMode,
};
