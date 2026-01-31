/**
 * 統一彈窗：與新增／編輯行程完成後的「是否分享」同一風格
 * 提供單按鈕（提示）與雙按鈕（確認），取代原生 alert／confirm
 */

/** 簡單跳脫 HTML，避免 XSS；並將換行轉成 <br> */
function dialogMessageHtml(str) {
  if (str == null) return '';
  var s = String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return s.replace(/\n/g, '<br>');
}

/** 建立共用 overlay 與 box 的 HTML（同一風格） */
function createDialogOverlay(message, buttons) {
  var overlay = document.createElement('div');
  overlay.className = 'share-confirm-overlay app-dialog-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  var actionsHtml = buttons.map(function (b) {
    var cls = b.primary ? 'btn btn-primary' : 'btn btn-secondary';
    return '<button type="button" class="' + cls + ' app-dialog-btn" data-result="' + (b.result === undefined ? '' : b.result) + '">' + (b.text || '確定') + '</button>';
  }).join('');
  overlay.innerHTML =
    '<div class="share-confirm-box app-dialog-box">' +
    '<p class="share-confirm-message app-dialog-message">' + dialogMessageHtml(message) + '</p>' +
    '<div class="share-confirm-actions app-dialog-actions">' + actionsHtml + '</div>' +
    '</div>';
  return overlay;
}

/**
 * 單按鈕提示（取代 alert），風格與完成編輯彈窗一致
 * @param {string} message - 提示文字
 * @returns {Promise<void>}
 */
function showAppAlert(message) {
  return new Promise(function (resolve) {
    var overlay = createDialogOverlay(message, [{ text: '確定', primary: true }]);
    document.body.appendChild(overlay);
    function close() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      resolve();
    }
    overlay.querySelector('.app-dialog-btn').addEventListener('click', close);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
  });
}

/**
 * 雙按鈕確認（取代 confirm），風格與完成編輯彈窗一致
 * @param {string} message - 提示文字
 * @param {Object} [opts] - { yesText: '是', noText: '否' }
 * @returns {Promise<boolean>} 左鍵（是）= true，右鍵（否）= false
 */
function showAppConfirm(message, opts) {
  opts = opts || {};
  var yesText = opts.yesText !== undefined ? opts.yesText : '是';
  var noText = opts.noText !== undefined ? opts.noText : '否';
  return new Promise(function (resolve) {
    var overlay = createDialogOverlay(message, [
      { text: yesText, primary: true, result: 'yes' },
      { text: noText, primary: false, result: 'no' }
    ]);
    document.body.appendChild(overlay);
    function close(result) {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      resolve(result);
    }
    var btns = overlay.querySelectorAll('.app-dialog-btn');
    btns[0].addEventListener('click', function () { close(true); });
    btns[1].addEventListener('click', function () { close(false); });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close(false);
    });
  });
}

/**
 * 顯示「是否分享」對話框，回傳 Promise<boolean>：是=true，否=false
 * @param {string} message - 提示文字（例如「✅ 新增成功！是否要分享這個行程？」）
 * @returns {Promise<boolean>}
 */
function showShareConfirm(message) {
  return showAppConfirm(message || '是否要分享？', { yesText: '是', noText: '否' });
}

window.showAppAlert = showAppAlert;
window.showAppConfirm = showAppConfirm;
window.showShareConfirm = showShareConfirm;
