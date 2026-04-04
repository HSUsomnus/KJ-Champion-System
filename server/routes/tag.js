/**
 * 標籤相關的 API 路由
 * Change 08: 標籤核心系統
 */

const express = require('express');
const router = express.Router();
const { optionalLineUser } = require('../middleware/auth');
const memberDbService = require('../services/memberDbService');
const tagDbService = require('../services/tagDbService');

/**
 * 檢查是否有標籤管理權限（管理者、負責人、開發者）
 */
const canManageTags = (member) => {
  return member && ['開發者', '負責人', '管理者'].includes(member.role);
};

// ============================================================
// 標籤 CRUD
// ============================================================

/**
 * GET /api/tags
 * 取得所有標籤（可依 category 過濾）
 */
router.get('/', optionalLineUser, async (req, res) => {
  try {
    const { category } = req.query;
    const tags = await tagDbService.getAllTags(category || undefined);

    res.json({
      success: true,
      data: tags,
    });
  } catch (error) {
    console.error('取得標籤列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/tags
 * 建立新標籤（管理者+）
 */
router.post('/', async (req, res) => {
  try {
    const { editorId, name, category, color, bgColor, description } = req.body;

    if (!editorId || !name) {
      return res.status(400).json({
        success: false,
        message: '缺少必要參數（editorId, name）',
      });
    }

    const editor = await memberDbService.getMemberByLineId(editorId);
    if (!canManageTags(editor)) {
      return res.status(403).json({
        success: false,
        message: '無權限管理標籤',
      });
    }

    const tag = await tagDbService.createTag({
      name,
      category,
      color,
      bgColor,
      description,
      createdBy: editorId,
    });

    res.json({
      success: true,
      data: tag,
    });
  } catch (error) {
    console.error('建立標籤錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT /api/tags/:id
 * 更新標籤（管理者+）
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { editorId, name, category, color, bgColor, description, sortOrder } = req.body;

    if (!editorId) {
      return res.status(400).json({
        success: false,
        message: '缺少 editorId',
      });
    }

    const editor = await memberDbService.getMemberByLineId(editorId);
    if (!canManageTags(editor)) {
      return res.status(403).json({
        success: false,
        message: '無權限管理標籤',
      });
    }

    const tag = await tagDbService.updateTag(parseInt(id, 10), {
      name,
      category,
      color,
      bgColor,
      description,
      sortOrder,
    });

    res.json({
      success: true,
      data: tag,
    });
  } catch (error) {
    console.error('更新標籤錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * DELETE /api/tags/:id
 * 刪除標籤（管理者+，系統標籤不可刪）
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const editorId = req.query.editorId || req.headers['x-line-user-id'];

    if (!editorId) {
      return res.status(400).json({
        success: false,
        message: '缺少 editorId',
      });
    }

    const editor = await memberDbService.getMemberByLineId(editorId);
    if (!canManageTags(editor)) {
      return res.status(403).json({
        success: false,
        message: '無權限管理標籤',
      });
    }

    await tagDbService.deleteTag(parseInt(id, 10));

    res.json({
      success: true,
      message: '標籤已刪除',
    });
  } catch (error) {
    console.error('刪除標籤錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/tags/:tagId/members
 * 取得擁有某標籤的所有成員（管理者+）
 */
router.get('/:tagId/members', async (req, res) => {
  try {
    const { tagId } = req.params;
    const editorId = req.query.editorId || req.headers['x-line-user-id'];

    if (!editorId) {
      return res.status(400).json({
        success: false,
        message: '缺少 editorId',
      });
    }

    const editor = await memberDbService.getMemberByLineId(editorId);
    if (!canManageTags(editor)) {
      return res.status(403).json({
        success: false,
        message: '無權限查詢',
      });
    }

    const members = await tagDbService.getMembersByTag(parseInt(tagId, 10));

    res.json({
      success: true,
      data: members,
      count: members.length,
    });
  } catch (error) {
    console.error('取得標籤成員錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================================
// 成員標籤管理
// ============================================================

/**
 * GET /api/tags/member/:lineId
 * 取得某成員的所有標籤（含虛擬星等/角色）
 */
router.get('/member/:lineId', optionalLineUser, async (req, res) => {
  try {
    const { lineId } = req.params;
    const tags = await tagDbService.getMemberTags(lineId);

    res.json({
      success: true,
      data: tags,
    });
  } catch (error) {
    console.error('取得成員標籤錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/tags/member/:lineId
 * 分配標籤給成員（管理者+）
 */
router.post('/member/:lineId', async (req, res) => {
  try {
    const { lineId } = req.params;
    const { editorId, tagId } = req.body;

    if (!editorId || !tagId) {
      return res.status(400).json({
        success: false,
        message: '缺少必要參數（editorId, tagId）',
      });
    }

    const editor = await memberDbService.getMemberByLineId(editorId);
    if (!canManageTags(editor)) {
      return res.status(403).json({
        success: false,
        message: '無權限分配標籤',
      });
    }

    const result = await tagDbService.assignTag(lineId, tagId, editorId);

    res.json({
      success: true,
      data: result,
      message: result.alreadyAssigned ? '該成員已有此標籤' : '標籤分配成功',
    });
  } catch (error) {
    console.error('分配標籤錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * DELETE /api/tags/member/:lineId/:tagId
 * 移除成員的標籤（管理者+）
 */
router.delete('/member/:lineId/:tagId', async (req, res) => {
  try {
    const { lineId, tagId } = req.params;
    const editorId = req.query.editorId || req.headers['x-line-user-id'];

    if (!editorId) {
      return res.status(400).json({
        success: false,
        message: '缺少 editorId',
      });
    }

    const editor = await memberDbService.getMemberByLineId(editorId);
    if (!canManageTags(editor)) {
      return res.status(403).json({
        success: false,
        message: '無權限移除標籤',
      });
    }

    await tagDbService.removeTag(lineId, parseInt(tagId, 10));

    res.json({
      success: true,
      message: '標籤已移除',
    });
  } catch (error) {
    console.error('移除標籤錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
