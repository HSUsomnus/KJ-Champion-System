/**
 * 財力文件上傳管理 API
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Readable } = require('stream');
const db = require('../config/db');
const memberDbService = require('../services/memberDbService');
const { getDriveClient } = require('../config/googleAuth');

// 設定 multer 用於檔案上傳（記憶體儲存）
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB 限制
  }
});

/**
 * 將上傳的試算表檔案轉成 Google Sheet 並取得唯讀檢視連結
 * @param {Buffer} buffer - 檔案內容
 * @param {string} filename - 檔名
 * @param {string} mimeType - 原始 MIME（如 xlsx、csv）
 * @returns {Promise<string|null>} 唯讀檢視 URL，失敗回傳 null
 */
async function uploadToDriveAsSheet(buffer, filename, mimeType) {
  const drive = await getDriveClient();
  if (!drive) {
    console.warn('⚠️  Google Drive 客戶端未初始化');
    return null;
  }
  const sourceMime = mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  try {
    // 使用 Buffer 作為 body（googleapis 支援），避免 stream 導致轉檔失敗
    const { data: file } = await drive.files.create({
      resource: {
        name: filename,
        mimeType: 'application/vnd.google-apps.spreadsheet',
      },
      media: {
        mimeType: sourceMime,
        body: Buffer.isBuffer(buffer) ? buffer : Readable.from(buffer),
      },
      fields: 'id',
    });
    if (!file.id) return null;
    await drive.permissions.create({
      fileId: file.id,
      requestBody: { type: 'anyone', role: 'reader' },
    });
    return `https://docs.google.com/spreadsheets/d/${file.id}/view`;
  } catch (err) {
    const detail = err.response?.data?.error?.message || err.message;
    console.error('⚠️  上傳至 Google Drive 轉試算表失敗:', detail, err.response?.data?.error || '');
    return null;
  }
}

/**
 * POST /api/financial/upload
 * 上傳財力文件；同時轉成 Google Sheet 並存唯讀連結，供「瀏覽」按鈕開啟
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { userId, originalFilename, originalSize, mimeType } = req.body;
    const compressedFile = req.file;

    if (!userId || !originalFilename || !compressedFile) {
      return res.status(400).json({
        success: false,
        message: '缺少必要參數',
      });
    }

    // 儲存到資料庫
    const result = await db.query(`
      INSERT INTO financial_documents (
        line_id, original_filename, file_size, mime_type, compressed_data, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, original_filename, file_size, uploaded_at
    `, [
      userId,
      originalFilename,
      parseInt(originalSize) || 0,
      mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      compressedFile.buffer,
      JSON.stringify({
        compressedSize: compressedFile.size,
        uploadedFrom: req.get('user-agent'),
      }),
    ]);

    const docId = result.rows[0].id;
    let sheetViewUrl = null;
    sheetViewUrl = await uploadToDriveAsSheet(
      compressedFile.buffer,
      originalFilename,
      mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    if (sheetViewUrl) {
      await db.query(
        'UPDATE financial_documents SET sheet_view_url = $1 WHERE id = $2',
        [sheetViewUrl, docId]
      );
    }

    const row = result.rows[0];
    if (sheetViewUrl) row.sheet_view_url = sheetViewUrl;

    console.log(`✅ 財力文件上傳成功: ${originalFilename} (用戶: ${userId})${sheetViewUrl ? '，已產生 Google Sheet 唯讀連結' : ''}`);

    res.json({
      success: true,
      data: row,
      message: '上傳成功',
    });
  } catch (error) {
    console.error('❌ 上傳財力文件錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '上傳失敗',
    });
  }
});

/**
 * GET /api/financial/sheet-view-url
 * 取得「在 Google 試算表查看」的連結（選填）
 * 優先用 GOOGLE_SHEET_VIEW_URL / FINANCIAL_SHEET_VIEW_URL；
 * 若未設定，則用 FINANCIAL_SHEET_ID 組出唯讀檢視連結
 * 試算表需設為「知道連結的任何人可檢視」則使用者不需登入 Google
 */
router.get('/sheet-view-url', (req, res) => {
  const customUrl = process.env.GOOGLE_SHEET_VIEW_URL || process.env.FINANCIAL_SHEET_VIEW_URL;
  if (customUrl && customUrl.trim()) {
    return res.json({ success: true, url: customUrl.trim() });
  }
  const sheetId = process.env.FINANCIAL_SHEET_ID;
  if (sheetId) {
    const viewUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/view`;
    return res.json({ success: true, url: viewUrl });
  }
  res.json({ success: true, url: null });
});

/**
 * GET /api/financial/list
 * 取得使用者的財力文件列表（包含評語）
 */
router.get('/list', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '缺少 userId 參數',
      });
    }

    // 查詢文件列表（含 Google Sheet 唯讀連結、評語）
    const result = await db.query(`
      SELECT 
        fd.id, fd.original_filename, fd.file_size, fd.mime_type, 
        fd.uploaded_at, fd.updated_at, fd.metadata,
        fd.sheet_view_url,
        fd.comment, fd.comment_author, fd.comment_updated_at,
        m.name as comment_author_name
      FROM financial_documents fd
      LEFT JOIN members m ON fd.comment_author = m.line_id
      WHERE fd.line_id = $1
      ORDER BY fd.uploaded_at DESC
    `, [userId]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('❌ 取得財力文件列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '取得列表失敗',
    });
  }
});

/**
 * GET /api/financial/download/:id
 * 下載財力文件（原始格式）
 */
router.get('/download/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '缺少 userId 參數',
      });
    }

    const result = await db.query(`
      SELECT compressed_data, original_filename, mime_type
      FROM financial_documents
      WHERE id = $1 AND line_id = $2
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到該文件',
      });
    }

    const doc = result.rows[0];

    // 設定回應標頭（用原始檔案的 MIME 類型和檔名）
    const mimeType = doc.mime_type || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.original_filename)}"`);
    
    // 傳送檔案
    res.send(doc.compressed_data);
  } catch (error) {
    console.error('❌ 下載財力文件錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '下載失敗',
    });
  }
});

/**
 * GET /api/financial/view-as-sheet/:id
 * 導向該筆上傳試算表的唯讀 Google Sheet 網頁；若尚無 sheet_view_url 則先上傳至 Drive 並寫入再導向
 */
router.get('/view-as-sheet/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, message: '缺少 userId 參數' });

    const result = await db.query(
      'SELECT compressed_data, original_filename, mime_type, sheet_view_url FROM financial_documents WHERE id = $1 AND line_id = $2',
      [id, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: '找不到該文件' });

    const doc = result.rows[0];
    if (doc.sheet_view_url) return res.redirect(302, doc.sheet_view_url);

    const url = await uploadToDriveAsSheet(
      doc.compressed_data,
      doc.original_filename,
      doc.mime_type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    if (!url) {
      // 轉檔失敗時導向 APP 內預覽頁，使用者仍可查看內容
      const previewUrl = `${req.protocol}://${req.get('host')}/financial-preview.html?docId=${id}&userId=${encodeURIComponent(userId)}&filename=${encodeURIComponent(doc.original_filename || '試算表')}`;
      return res.redirect(302, previewUrl);
    }

    await db.query('UPDATE financial_documents SET sheet_view_url = $1 WHERE id = $2', [url, id]);
    return res.redirect(302, url);
  } catch (error) {
    console.error('❌ view-as-sheet 錯誤:', error);
    res.status(500).json({ success: false, message: error.message || '開啟失敗' });
  }
});

/**
 * DELETE /api/financial/:id
 * 刪除財力文件
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '缺少 userId 參數',
      });
    }

    const result = await db.query(`
      DELETE FROM financial_documents
      WHERE id = $1 AND line_id = $2
      RETURNING original_filename
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到該文件或無權限刪除',
      });
    }

    console.log(`✅ 財力文件刪除成功: ${result.rows[0].original_filename}`);

    res.json({
      success: true,
      message: '刪除成功',
    });
  } catch (error) {
    console.error('❌ 刪除財力文件錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '刪除失敗',
    });
  }
});

/**
 * POST /api/financial/:id/comment
 * 更新財力文件評語（僅負責人和開發者可操作）
 */
router.post('/:id/comment', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, comment, editorId } = req.body;

    if (!userId || !editorId) {
      return res.status(400).json({
        success: false,
        message: '缺少必要參數',
      });
    }

    // 檢查編輯者權限（從資料庫讀取）
    const editorMember = await memberDbService.getMemberByLineId(editorId);
    
    if (!editorMember) {
      return res.status(403).json({
        success: false,
        message: '找不到編輯者資料',
      });
    }
    
    const isAdmin = editorMember.role === '開發者';
    const isManager = editorMember.role === '負責人';

    // 只有開發者和負責人可以編輯評語
    if (!isAdmin && !isManager) {
      return res.status(403).json({
        success: false,
        message: '只有負責人和開發者可以編輯評語',
      });
    }

    // 更新評語
    const result = await db.query(`
      UPDATE financial_documents
      SET comment = $1, comment_author = $2, comment_updated_at = NOW()
      WHERE id = $3 AND line_id = $4
      RETURNING id, comment, comment_author, comment_updated_at
    `, [comment || null, editorId, id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到該文件',
      });
    }

    // 取得評語作者姓名
    const authorResult = await db.query(`
      SELECT name FROM members WHERE line_id = $1
    `, [editorId]);

    const responseData = {
      ...result.rows[0],
      comment_author_name: authorResult.rows[0]?.name || '未知',
    };

    console.log(`✅ 評語更新成功: 文件 ID ${id} (編輯者: ${editorId})`);

    res.json({
      success: true,
      data: responseData,
      message: '評語更新成功',
    });
  } catch (error) {
    console.error('❌ 更新評語錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '更新評語失敗',
    });
  }
});

/**
 * GET /api/financial/check-permission
 * 檢查使用者的權限
 * - canView: 可以查看財力（上級、負責人、開發者、管理者）
 * - canEdit: 可以編輯評語（只有負責人和開發者）
 */
router.get('/check-permission', async (req, res) => {
  try {
    const { editorId, targetUserId } = req.query;

    if (!editorId || !targetUserId) {
      return res.status(400).json({
        success: false,
        message: '缺少必要參數',
      });
    }

    // 從資料庫檢查編輯者權限
    const editorMember = await memberDbService.getMemberByLineId(editorId);
    
    const isAdmin = editorMember && editorMember.role === '開發者';
    const isManager = editorMember && editorMember.role === '負責人';
    const isGuanLiZhe = editorMember && editorMember.role === '管理者';
    
    // 檢查是否為上級
    const isSuperior = await memberDbService.isSuperior(editorId, targetUserId);

    // 查看權限：上級、負責人、開發者、管理者都可以查看
    const canView = isAdmin || isManager || isGuanLiZhe || isSuperior;
    
    // 編輯評語權限：只有負責人和開發者可以編輯評語
    const canEdit = isAdmin || isManager;

    res.json({
      success: true,
      data: {
        canView,
        canEdit,
        isAdmin,
        isManager,
        isGuanLiZhe,
        isSuperior,
      },
    });
  } catch (error) {
    console.error('❌ 檢查權限錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '檢查權限失敗',
    });
  }
});

module.exports = router;
