/**
 * 成員相關的 API 路由
 */

const express = require('express');
const router = express.Router();
const { optionalLineUser } = require('../middleware/auth');
const memberDbService = require('../services/memberDbService');

/**
 * GET /api/members
 * 取得所有成員列表
 */
router.get('/', optionalLineUser, async (req, res) => {
  try {
    const members = await memberDbService.getAllMembers();

    res.json({
      success: true,
      data: members,
    });
  } catch (error) {
    console.error('取得成員列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '取得成員列表失敗',
    });
  }
});

/**
 * GET /api/members/check
 * 檢查使用者是否已註冊
 * 查詢參數: userId (LINE User ID)
 */
router.get('/check', async (req, res) => {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '請提供 userId 參數',
      });
    }

    const isRegistered = await memberDbService.isMemberRegistered(userId);

    res.json({
      success: true,
      data: {
        isRegistered,
      },
    });
  } catch (error) {
    console.error('檢查註冊狀態錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '檢查註冊狀態失敗',
    });
  }
});

/**
 * GET /api/members/avatar/:lineId
 * 代理成員 LINE 頭像（解決跨域／Referrer 導致頭像不顯示）
 */
router.get('/avatar/:lineId', optionalLineUser, async (req, res) => {
  try {
    const { lineId } = req.params;
    const member = await memberDbService.getMemberByLineId(lineId);
    if (!member || !member.pictureUrl || !String(member.pictureUrl).trim()) {
      return res.status(404).send('No avatar');
    }
    const imageResponse = await fetch(member.pictureUrl, {
      headers: { 'User-Agent': 'LIFF-Calendar/1.0' },
    });
    if (!imageResponse.ok) {
      return res.status(404).send('No avatar');
    }
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    const buffer = await imageResponse.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('取得成員頭像錯誤:', error);
    res.status(500).send('Error');
  }
});

/**
 * GET /api/members/:lineId
 * 取得指定成員的詳細資料
 */
router.get('/:lineId', optionalLineUser, async (req, res) => {
  try {
    const { lineId } = req.params;
    const member = await memberDbService.getMemberByLineId(lineId);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: '找不到該成員',
      });
    }

    res.json({
      success: true,
      data: member,
    });
  } catch (error) {
    console.error('取得成員資料錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '取得成員資料失敗',
    });
  }
});

/**
 * GET /api/members/:lineId/subordinates
 * 取得某人邀請的所有下級成員
 */
router.get('/:lineId/subordinates', optionalLineUser, async (req, res) => {
  try {
    const { lineId } = req.params;
    const subordinates = await memberDbService.getSubordinates(lineId);

    res.json({
      success: true,
      data: subordinates,
      count: subordinates.length,
    });
  } catch (error) {
    console.error('取得下級成員錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '取得下級成員失敗',
    });
  }
});

/**
 * GET /api/members/:lineId/superior
 * 取得某人的上級（邀請人）
 */
router.get('/:lineId/superior', optionalLineUser, async (req, res) => {
  try {
    const { lineId } = req.params;
    const superior = await memberDbService.getSuperior(lineId);

    if (!superior) {
      return res.json({
        success: true,
        data: null,
        message: '此成員沒有上級',
      });
    }

    res.json({
      success: true,
      data: superior,
    });
  } catch (error) {
    console.error('取得上級成員錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '取得上級成員失敗',
    });
  }
});

/**
 * POST /api/members/check-permission
 * 檢查某人是否為另一人的上級
 * Body: { superiorLineId, subordinateLineId }
 */
router.post('/check-permission', optionalLineUser, async (req, res) => {
  try {
    const { superiorLineId, subordinateLineId } = req.body;

    if (!superiorLineId || !subordinateLineId) {
      return res.status(400).json({
        success: false,
        message: '請提供 superiorLineId 和 subordinateLineId',
      });
    }

    const isSuperior = await memberDbService.isSuperior(superiorLineId, subordinateLineId);

    res.json({
      success: true,
      data: {
        isSuperior,
        superiorLineId,
        subordinateLineId,
      },
    });
  } catch (error) {
    console.error('檢查權限錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '檢查權限失敗',
    });
  }
});

/**
 * PUT /api/members/update-financial-amount
 * 更新成員財力金額（負責人 + 開發者可用）
 */
router.put('/update-financial-amount', async (req, res) => {
  try {
    const { editorId, targetLineId, amount } = req.body;

    if (!editorId || !targetLineId) {
      return res.status(400).json({
        success: false,
        message: '缺少必要參數',
      });
    }

    // 檢查編輯者權限（只有負責人和開發者可以編輯）
    const editor = await memberDbService.getMemberByLineId(editorId);
    const canEdit = editor && (editor.role === '開發者' || editor.role === '負責人');

    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: '無權限修改財力金額',
      });
    }

    // 更新財力金額
    const updatedMember = await memberDbService.updateFinancialAmount(targetLineId, amount || '');

    res.json({
      success: true,
      data: updatedMember,
      message: '財力金額更新成功',
    });
  } catch (error) {
    console.error('❌ 更新財力金額錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '更新財力金額失敗',
    });
  }
});

/**
 * PUT /api/members/update-roles
 * 批量更新成員權限（僅開發者可用）
 */
router.put('/update-roles', async (req, res) => {
  try {
    const { editorId, updates } = req.body;

    if (!editorId || !updates || !Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        message: '缺少必要參數',
      });
    }

    // 檢查是否為開發者（從資料庫讀取）
    const editor = await memberDbService.getMemberByLineId(editorId);
    const isAdmin = editor && editor.role === '開發者';
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: '只有開發者可以修改權限',
      });
    }

    // 批量更新權限
    const results = [];
    for (const update of updates) {
      try {
        await memberDbService.updateMemberRole(update.lineId, update.role);
        results.push({ lineId: update.lineId, success: true });
      } catch (error) {
        results.push({ lineId: update.lineId, success: false, error: error.message });
      }
    }

    console.log(`✅ 權限批量更新完成: ${results.filter(r => r.success).length}/${updates.length} 成功`);

    res.json({
      success: true,
      data: results,
      message: '權限更新完成',
    });
  } catch (error) {
    console.error('❌ 批量更新權限錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '批量更新權限失敗',
    });
  }
});

module.exports = router;
