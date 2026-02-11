/**
 * 財力文件上傳管理 API
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const db = require('../config/db');
const memberDbService = require('../services/memberDbService');

// 設定 multer 用於檔案上傳（記憶體儲存）
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB 限制
  }
});

/**
 * POST /api/financial/upload
 * 上傳財力文件（已壓縮）
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

    console.log(`✅ 財力文件上傳成功: ${originalFilename} (用戶: ${userId})`);

    res.json({
      success: true,
      data: result.rows[0],
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

    // 查詢文件列表，並 JOIN members 表取得評語作者姓名
    const result = await db.query(`
      SELECT 
        fd.id, fd.original_filename, fd.file_size, fd.mime_type, 
        fd.uploaded_at, fd.updated_at, fd.metadata,
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
 * 下載財力文件（壓縮格式）
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

    // 設定回應標頭
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.original_filename)}.zip"`);
    
    // 傳送壓縮檔案
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
 * 更新財力文件評語（僅上級和開發者可操作）
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

    // 檢查權限：是否為上級或開發者
    const isAdmin = process.env.ADMIN_LINE_USER_IDS?.split(',').includes(editorId);
    const isSuperior = await memberDbService.isSuperior(editorId, userId);

    if (!isAdmin && !isSuperior) {
      return res.status(403).json({
        success: false,
        message: '您沒有權限編輯此評語',
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
 * 檢查使用者是否有權限編輯評語
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

    // 檢查是否為開發者
    const isAdmin = process.env.ADMIN_LINE_USER_IDS?.split(',').includes(editorId);
    
    // 檢查是否為上級
    const isSuperior = await memberDbService.isSuperior(editorId, targetUserId);

    res.json({
      success: true,
      data: {
        canEdit: isAdmin || isSuperior,
        isAdmin,
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
