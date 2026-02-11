/**
 * 財力上傳管理頁面
 */

let userId = '';
let selectedFile = null;

/**
 * 初始化頁面
 */
async function init() {
  // 從 URL 取得 userId
  const urlParams = new URLSearchParams(window.location.search);
  userId = urlParams.get('userId');
  const isAuth = urlParams.get('auth') === '1'; // LINE Login 回調標記

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

  // 有 userId，載入文件
  try {
    await loadDocuments();
    
    // 隱藏載入動畫，顯示主要內容
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('main-content').classList.remove('hidden');
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
 * 使用 LINE 登入
 */
function loginWithLine() {
  const returnUrl = '/financial-upload.html';
  window.location.href = `/api/auth/line-login?returnUrl=${encodeURIComponent(returnUrl)}`;
}

/**
 * 驗證使用者 ID
 */
async function verifyUserId() {
  const inputUserId = document.getElementById('auth-user-id').value.trim();
  
  if (!inputUserId) {
    alert('請輸入 LINE User ID');
    return;
  }

  try {
    // 驗證該 User ID 是否存在於系統中
    const response = await fetch(`/api/members/check?userId=${encodeURIComponent(inputUserId)}`);
    const data = await response.json();

    if (data.success && data.data.isRegistered) {
      // 驗證成功，設定 userId 並載入內容
      userId = inputUserId;
      
      // 更新 URL（不重新整理頁面）
      const newUrl = new URL(window.location);
      newUrl.searchParams.set('userId', userId);
      window.history.pushState({}, '', newUrl);
      
      // 隱藏驗證表單，顯示載入動畫
      document.getElementById('auth-form').classList.add('hidden');
      document.getElementById('loading').classList.remove('hidden');
      
      // 載入文件
      await loadDocuments();
      
      // 顯示主要內容
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('main-content').classList.remove('hidden');
    } else {
      alert('❌ 此 User ID 不存在或尚未註冊，請確認後再試');
    }
  } catch (error) {
    console.error('驗證錯誤:', error);
    alert('❌ 驗證失敗：' + error.message);
  }
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

  container.innerHTML = documents.map(doc => `
    <div class="document-item" style="padding: 12px; border-bottom: 1px solid var(--border-color);">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="flex: 1; min-width: 0;">
          <p style="margin: 0 0 4px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            📄 ${escapeHtml(doc.original_filename)}
          </p>
          <p style="margin: 0; font-size: 12px; color: var(--text-light);">
            ${formatFileSize(doc.file_size)} · ${formatDate(doc.uploaded_at)}
          </p>
        </div>
        <div style="display: flex; gap: 8px; margin-left: 12px;">
          <button class="btn btn-sm btn-secondary" onclick="previewDocument(${doc.id}, '${escapeHtml(doc.original_filename)}')">
            👁️ 瀏覽
          </button>
          <button class="btn btn-sm btn-primary" onclick="downloadDocument(${doc.id}, '${escapeHtml(doc.original_filename)}')">
            ⬇️ 下載
          </button>
        </div>
      </div>
    </div>
  `).join('');
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
    // 讀取 Excel 檔案
    const arrayBuffer = await selectedFile.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    
    // 轉換為 JSON
    const sheetData = {};
    workbook.SheetNames.forEach(sheetName => {
      sheetData[sheetName] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    });

    // 壓縮資料
    const zip = new JSZip();
    zip.file('data.json', JSON.stringify(sheetData));
    const compressed = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });

    // 上傳到伺服器
    const formData = new FormData();
    formData.append('file', compressed);
    formData.append('userId', userId);
    formData.append('originalFilename', selectedFile.name);
    formData.append('originalSize', selectedFile.size);
    formData.append('mimeType', selectedFile.type);

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
 * 預覽文件
 */
async function previewDocument(id, filename) {
  try {
    const response = await fetch(`/api/financial/download/${id}?userId=${encodeURIComponent(userId)}`);
    const blob = await response.blob();
    
    // 解壓縮
    const zip = await JSZip.loadAsync(blob);
    const jsonText = await zip.file('data.json').async('string');
    const sheetData = JSON.parse(jsonText);

    // 顯示預覽
    const previewContent = document.getElementById('preview-content');
    previewContent.innerHTML = '';

    Object.keys(sheetData).forEach(sheetName => {
      const sheetDiv = document.createElement('div');
      sheetDiv.style.marginBottom = '24px';
      
      const title = document.createElement('h3');
      title.textContent = sheetName;
      title.style.marginBottom = '12px';
      sheetDiv.appendChild(title);

      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.fontSize = '14px';

      sheetData[sheetName].forEach((row, i) => {
        const tr = document.createElement('tr');
        row.forEach(cell => {
          const td = document.createElement(i === 0 ? 'th' : 'td');
          td.textContent = cell || '';
          td.style.border = '1px solid var(--border-color)';
          td.style.padding = '8px';
          td.style.textAlign = 'left';
          if (i === 0) {
            td.style.backgroundColor = 'var(--bg-color)';
            td.style.fontWeight = '600';
          }
          tr.appendChild(td);
        });
        table.appendChild(tr);
      });

      sheetDiv.appendChild(table);
      previewContent.appendChild(sheetDiv);
    });

    document.getElementById('preview-title').textContent = filename;
    document.getElementById('preview-modal').classList.remove('hidden');
  } catch (error) {
    console.error('預覽錯誤:', error);
    alert('❌ 預覽失敗：' + error.message);
  }
}

/**
 * 下載文件
 */
async function downloadDocument(id, filename) {
  try {
    const response = await fetch(`/api/financial/download/${id}?userId=${encodeURIComponent(userId)}`);
    const blob = await response.blob();
    
    // 創建下載連結
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('下載錯誤:', error);
    alert('❌ 下載失敗：' + error.message);
  }
}

/**
 * 關閉預覽
 */
function closePreview() {
  document.getElementById('preview-modal').classList.add('hidden');
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
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
