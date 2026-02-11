/**
 * 財力文件上傳管理 API
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const db = require('../config/db');

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
 * 取得使用者的財力文件列表
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

    const result = await db.query(`
      SELECT 
        id, original_filename, file_size, mime_type, 
        uploaded_at, updated_at, metadata
      FROM financial_documents
      WHERE line_id = $1
      ORDER BY uploaded_at DESC
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

module.exports = router;
