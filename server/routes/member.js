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
    const member = await sheetService.getMemberByLineId(lineId);

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

module.exports = router;
