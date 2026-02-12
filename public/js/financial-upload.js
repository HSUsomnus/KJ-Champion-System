/**
 * 財力上傳管理頁面
 */

let userId = '';
let selectedFile = null;
let currentEditorId = ''; // 當前編輯者 ID（用於檢查權限）
let canViewFinancial = false; // 是否有權限查看財力
let canEditComments = false; // 是否有權限編輯評語
let isViewOnly = false; // 是否為唯讀模式（從管理中心進入）

/**
 * 初始化頁面
 */
async function init() {
  // 從 URL 取得 userId
  const urlParams = new URLSearchParams(window.location.search);
  userId = urlParams.get('userId');
  const isAuth = urlParams.get('auth') === '1'; // LINE Login 回調標記
  isViewOnly = urlParams.get('viewOnly') === '1'; // 是否為唯讀模式

  // 如果沒有 userId，顯示登入表單
  if (!userId) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('auth-form').classList.remove('hidden');
    return;
  }

  // 如果是 LINE Login 回調，驗證成功後自動載入
  if (isAuth) {
    console.log('✅ LINE Login 驗證成功');
  }

  // 取得當前編輯者 ID（從 URL 或 sessionStorage）
  currentEditorId = urlParams.get('editorId') || sessionStorage.getItem('editorId') || userId;
  if (currentEditorId) {
    sessionStorage.setItem('editorId', currentEditorId);
  }

  // 有 userId，載入文件
  try {
    // 檢查權限
    await checkEditPermission();
    
    // 載入文件列表
    await loadDocuments();
    
    // 載入財力金額
    await loadFinancialAmount();
    
    // 隱藏載入動畫，顯示主要內容
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('main-content').classList.remove('hidden');
    
    // 如果不是唯讀模式，顯示上傳區域
    if (!isViewOnly) {
      document.getElementById('upload-section').classList.remove('hidden');
    }
  } catch (error) {
    console.error('載入失敗:', error);
    document.getElementById('loading').innerHTML = `
      <div class="empty-state">
        <div>❌</div>
        <p>載入失敗：${error.message}</p>
        <button class="btn btn-primary" onclick="location.reload()">重試</button>
      </div>
    `;
  }
}

/**
 * 檢查權限
 * - canView: 可以查看財力（上級、負責人、開發者）
 * - canEdit: 可以編輯評語（只有負責人和開發者）
 */
async function checkEditPermission() {
  try {
    const response = await fetch(`/api/financial/check-permission?editorId=${encodeURIComponent(currentEditorId)}&targetUserId=${encodeURIComponent(userId)}`);
    const data = await response.json();
    if (data.success) {
      canViewFinancial = data.data.canView;
      canEditComments = data.data.canEdit;
      
      let permissionMsg = '';
      if (data.data.isAdmin) {
        permissionMsg = '開發者權限';
      } else if (data.data.isManager) {
        permissionMsg = '負責人權限';
      } else if (data.data.isSuperior) {
        permissionMsg = '上級權限（僅可查看）';
      }
      
      console.log(`權限檢查: ${permissionMsg} - 可查看: ${canViewFinancial}, 可編輯評語: ${canEditComments}`);
    }
  } catch (error) {
    console.error('檢查權限錯誤:', error);
    canViewFinancial = false;
    canEditComments = false;
  }
}

/**
 * 使用 LINE 登入
 */
function loginWithLine() {
  const returnUrl = '/financial-upload.html';
  window.location.href = `/api/auth/line-login?returnUrl=${encodeURIComponent(returnUrl)}`;
}

/**
 * 載入文件列表
 */
async function loadDocuments() {
  try {
    const response = await fetch(`/api/financial/list?userId=${encodeURIComponent(userId)}`);
    const data = await response.json();

    if (data.success) {
      renderDocuments(data.data || []);
    } else {
      console.error('載入文件失敗:', data.message);
      renderDocuments([]);
    }
  } catch (error) {
    console.error('載入文件錯誤:', error);
    renderDocuments([]);
  }
}

/**
 * 渲染文件列表
 */
function renderDocuments(documents) {
  const container = document.getElementById('documents-list');
  
  if (documents.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 24px;">
        <div style="font-size: 48px;">📭</div>
        <p>尚無上傳記錄</p>
      </div>
    `;
    return;
  }

  container.innerHTML = documents.map(doc => {
    const commentHtml = renderCommentSection(doc);
    return `
      <div class="document-item" style="padding: 12px; border-bottom: 1px solid var(--border-color);">
        <!-- 文件資訊和操作按鈕 -->
        <div style="display: flex; gap: 12px; margin-bottom: 8px;">
          <!-- 左側：文件資訊 -->
          <div style="flex: 1; min-width: 0;">
            <p style="margin: 0 0 4px; font-weight: 600; word-wrap: break-word;">
              📄 ${escapeHtml(doc.original_filename)}
            </p>
            <p style="margin: 0; font-size: 12px; color: var(--text-light);">
              ${formatFileSize(doc.file_size)} · ${formatDate(doc.uploaded_at)}
            </p>
          </div>
          <!-- 右側：操作按鈕；瀏覽＝開啟該筆上傳的試算表預覽頁 -->
          <div style="display: flex; flex-direction: column; gap: 6px; min-width: 80px;">
            <button class="btn btn-sm btn-secondary" data-doc-id="${doc.id}" data-doc-filename="${escapeHtml(doc.original_filename).replace(/"/g, '&quot;')}" onclick="previewDocument(parseInt(this.dataset.docId,10), this.dataset.docFilename)" style="width: 100%; padding: 6px 12px; font-size: 13px;">
              👁️ 瀏覽
            </button>
            <button class="btn btn-sm btn-primary" onclick="downloadDocument(${doc.id}, '${escapeHtml(doc.original_filename)}')" style="width: 100%; padding: 6px 12px; font-size: 13px;">
              ⬇️ 下載
            </button>
          </div>
        </div>
        
        <!-- 評語區域 -->
        ${commentHtml}
      </div>
    `;
  }).join('');
}

/**
 * 渲染評語區域
 */
function renderCommentSection(doc) {
  const hasComment = doc.comment && doc.comment.trim();
  const commentAuthor = doc.comment_author_name || '未知';
  const commentTime = doc.comment_updated_at ? formatDate(doc.comment_updated_at) : '';
  
  if (canEditComments) {
    // 有權限編輯評語（負責人、開發者）
    return `
      <div style="margin-top: 8px; padding: 8px; background: var(--bg-color); border-radius: 4px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-size: 12px; font-weight: 600; color: var(--text-light);">💬 評語</span>
          <button class="btn btn-sm" onclick="editComment(${doc.id}, '${escapeHtml(doc.comment || '')}', '${commentAuthor}', '${commentTime}')" style="font-size: 12px; padding: 2px 8px;">
            ${hasComment ? '✏️ 編輯' : '➕ 新增'}
          </button>
        </div>
        ${hasComment ? `
          <p style="margin: 4px 0 0; font-size: 13px; color: var(--text-color); white-space: pre-wrap;">${escapeHtml(doc.comment)}</p>
          <p style="margin: 4px 0 0; font-size: 11px; color: var(--text-light);">
            ${commentAuthor} · ${commentTime}
          </p>
        ` : `
          <p style="margin: 4px 0 0; font-size: 12px; color: var(--text-light); font-style: italic;">尚無評語</p>
        `}
      </div>
    `;
  } else if (canViewFinancial) {
    // 有查看權限但不能編輯（上級）
    if (!hasComment) {
      return ''; // 沒有評語就不顯示
    }
    return `
      <div style="margin-top: 8px; padding: 8px; background: var(--bg-color); border-radius: 4px;">
        <span style="font-size: 12px; font-weight: 600; color: var(--text-light);">💬 評語</span>
        <p style="margin: 4px 0 0; font-size: 13px; color: var(--text-color); white-space: pre-wrap;">${escapeHtml(doc.comment)}</p>
        <p style="margin: 4px 0 0; font-size: 11px; color: var(--text-light);">
          ${commentAuthor} · ${commentTime}
        </p>
      </div>
    `;
  } else {
    // 沒有權限
    return '';
  }
}

/**
 * 選擇檔案
 */
function selectFile() {
  document.getElementById('file-input').click();
}

// 檔案選擇事件
document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-input');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        // 檢查是否為試算表格式
        const allowedExtensions = ['.xlsx', '.xls', '.csv', '.ods', '.xlsm'];
        const fileName = file.name.toLowerCase();
        const isAllowed = allowedExtensions.some(ext => fileName.endsWith(ext));
        
        if (!isAllowed) {
          alert('⚠️ 只支援試算表檔案格式（.xlsx, .xls, .csv, .ods, .xlsm）');
          fileInput.value = '';
          return;
        }

        selectedFile = file;
        document.getElementById('selected-filename').textContent = file.name;
        document.getElementById('selected-filesize').textContent = formatFileSize(file.size);
        document.getElementById('file-info').classList.remove('hidden');
        document.getElementById('upload-btn').classList.remove('hidden');
      }
    });
  }
  
  init();
});

/**
 * 上傳檔案
 */
async function uploadFile() {
  if (!selectedFile) {
    alert('請先選擇檔案');
    return;
  }

  const uploadBtn = document.getElementById('upload-btn');
  uploadBtn.disabled = true;
  uploadBtn.textContent = '上傳中...';

  try {
    // 直接上傳原始檔案（不壓縮、不轉換，保留原始格式）
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('userId', userId);
    formData.append('originalFilename', selectedFile.name);
    formData.append('originalSize', selectedFile.size);
    formData.append('mimeType', selectedFile.type || 'application/octet-stream');

    const response = await fetch('/api/financial/upload', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (data.success) {
      alert('✅ 上傳成功！');
      // 重置表單
      selectedFile = null;
      document.getElementById('file-input').value = '';
      document.getElementById('file-info').classList.add('hidden');
      document.getElementById('upload-btn').classList.add('hidden');
      // 重新載入列表
      await loadDocuments();
    } else {
      alert('❌ 上傳失敗：' + (data.message || '未知錯誤'));
    }
  } catch (error) {
    console.error('上傳錯誤:', error);
    alert('❌ 上傳失敗：' + error.message);
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = '開始上傳';
  }
}

/**
 * 預覽文件（導航到獨立預覽頁面，支援 LIFF 和手機縮放）
 */
function previewDocument(id, filename) {
  // 組合預覽頁面的 URL
  const previewUrl = `/financial-preview.html?docId=${id}&userId=${encodeURIComponent(userId)}&filename=${encodeURIComponent(filename)}`;
  
  // 直接導航到預覽頁面（LIFF 和一般瀏覽器都能用）
  window.location.href = previewUrl;
}

/**
 * 下載文件（直接導航到下載 URL，LIFF 也能用）
 */
function downloadDocument(id, filename) {
  // 直接用網址觸發下載（後端已設定 Content-Disposition: attachment）
  window.location.href = `/api/financial/download/${id}?userId=${encodeURIComponent(userId)}`;
}

/**
 * 格式化檔案大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * 格式化日期
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
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
 * 編輯評語
 */
function editComment(docId, currentComment, author, time) {
  const newComment = prompt(
    `編輯評語\n${author && time ? `\n上次編輯：${author} · ${time}` : ''}\n\n請輸入新的評語內容：`,
    currentComment || ''
  );
  
  // 如果用戶取消或內容沒變，不做任何事
  if (newComment === null) return;
  
  // 儲存評語
  saveComment(docId, newComment.trim());
}

/**
 * 載入該用戶的財力金額
 * - 從管理中心進入（viewOnly）：顯示下拉選單可編輯
 * - 從個人資料進入：只顯示文字（唯讀）
 */
async function loadFinancialAmount() {
  try {
    // 取得該用戶的成員資料（包含 financialAmount）
    const response = await fetch(`/api/members/${encodeURIComponent(userId)}`);
    const data = await response.json();

    if (data.success) {
      const amount = data.data.financialAmount || '';
      const displayEl = document.getElementById('financial-amount-display');
      const selectEl = document.getElementById('financial-amount-select');

      if (isViewOnly && canEditComments) {
        // 從管理中心進入 + 有編輯權限（負責人/開發者）→ 顯示下拉選單可編輯
        if (displayEl) displayEl.classList.add('hidden');
        if (selectEl) {
          selectEl.classList.remove('hidden');
          selectEl.value = amount;

          // 選擇改變時自動儲存
          selectEl.addEventListener('change', async () => {
            await saveFinancialAmount(selectEl.value);
          });
        }
      } else {
        // 個人資料進入 或 無編輯權限 → 只顯示文字
        if (displayEl) {
          if (amount) {
            displayEl.textContent = amount;
            displayEl.style.color = 'var(--text-color)';
            displayEl.style.fontWeight = '600';
          } else {
            displayEl.textContent = '無資料';
            displayEl.style.color = '#999';
            displayEl.style.fontWeight = 'normal';
          }
        }
      }
    }
  } catch (error) {
    console.error('載入財力金額錯誤:', error);
  }
}

/**
 * 儲存財力金額到資料庫
 */
async function saveFinancialAmount(amount) {
  try {
    const response = await fetch('/api/members/update-financial-amount', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        editorId: currentEditorId,
        targetLineId: userId,
        amount: amount,
      }),
    });

    const data = await response.json();
    if (data.success) {
      console.log('✅ 財力金額已更新:', amount || '無');
    } else {
      alert('❌ 更新失敗：' + (data.message || '未知錯誤'));
    }
  } catch (error) {
    console.error('儲存財力金額錯誤:', error);
    alert('❌ 儲存失敗：' + error.message);
  }
}

/**
 * 儲存評語
 */
async function saveComment(docId, comment) {
  try {
    const response = await fetch(`/api/financial/${docId}/comment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        editorId: currentEditorId,
        comment: comment,
      }),
    });

    const data = await response.json();

    if (data.success) {
      alert('✅ 評語已儲存');
      // 重新載入文件列表
      await loadDocuments();
    } else {
      alert('❌ 儲存失敗：' + (data.message || '未知錯誤'));
    }
  } catch (error) {
    console.error('儲存評語錯誤:', error);
    alert('❌ 儲存失敗：' + error.message);
  }
}
