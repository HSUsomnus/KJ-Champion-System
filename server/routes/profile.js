/**
 * 個人資料相關的 API 路由
 */

const express = require('express');
const router = express.Router();
const { verifyLineUser } = require('../middleware/auth');
const sheetService = require('../services/sheetService');
const versionService = require('../services/versionService');

/**
 * GET /api/profile
 * 取得當前使用者的個人資料
 * 需要驗證 LINE User ID
 */
router.get('/', verifyLineUser, async (req, res) => {
  try {
    const lineId = req.lineUserId;
    const member = await sheetService.getMemberByLineId(lineId);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: '找不到個人資料，請先註冊',
        needRegister: true,
      });
    }

    res.json({
      success: true,
      data: member,
    });
  } catch (error) {
    console.error('取得個人資料錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '取得個人資料失敗',
    });
  }
});

/**
 * POST /api/profile/register
 * 註冊新成員
 * 需要驗證 LINE User ID
 */
router.post('/register', verifyLineUser, async (req, res) => {
  try {
    const lineId = req.lineUserId;
    const { name, email, phone, starLevel, courseRecord, pictureUrl, teslaFranchisee, teamResponsibilities, volunteerRecords } = req.body;

    // 驗證必填欄位
    if (!name) {
      return res.status(400).json({
        success: false,
        message: '請提供真實姓名',
      });
    }

    // 檢查是否已經註冊
    const isRegistered = await sheetService.isMemberRegistered(lineId);
    if (isRegistered) {
      return res.status(400).json({
        success: false,
        message: '此帳號已經註冊過了',
      });
    }

    // 驗證星等
    const validStarLevels = ['白星', '綠星', '橙星', '紅星', '紫星'];
    const memberStarLevel = starLevel && validStarLevels.includes(starLevel) 
      ? starLevel 
      : '白星';

    // 新增成員資料（含進階資訊）
    const member = await sheetService.createMember({
      lineId,
      name,
      email: email || '',
      phone: phone || '',
      starLevel: memberStarLevel,
      courseRecord: courseRecord || '',
      pictureUrl: pictureUrl || '',
      teslaFranchisee: teslaFranchisee || '',
      teamResponsibilities: teamResponsibilities || '',
      volunteerRecords: volunteerRecords || '',
    });

    // 更新版本號
    versionService.incrementVersion();

    res.json({
      success: true,
      data: member,
      message: '註冊成功',
    });
  } catch (error) {
    console.error('註冊錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '註冊失敗',
    });
  }
});

/**
 * POST /api/profile/sync-avatar
 * 每次用戶進入系統時由前端呼叫：比對 LINE 頭像與資料庫，有更新則寫回 Google Sheet
 * 需要驗證 LINE User ID，body: { pictureUrl }
 */
router.post('/sync-avatar', verifyLineUser, async (req, res) => {
  try {
    const lineId = req.lineUserId;
    const pictureUrl = (req.body && req.body.pictureUrl != null) ? String(req.body.pictureUrl).trim() : '';

    const member = await sheetService.getMemberByLineId(lineId);
    if (!member) {
      return res.json({ success: true, synced: false, message: '未註冊，不更新頭像' });
    }

    const storedUrl = (member.pictureUrl || '').trim();
    if (storedUrl === pictureUrl) {
      return res.json({ success: true, synced: false, message: '頭像未變更' });
    }

    await sheetService.updateMember(lineId, { pictureUrl: pictureUrl || '' });
    versionService.incrementVersion();

    return res.json({ success: true, synced: true, message: '頭像已同步更新' });
  } catch (error) {
    console.error('同步頭像錯誤:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '同步頭像失敗',
    });
  }
});

/**
 * PUT /api/profile
 * 更新個人資料
 * 需要驗證 LINE User ID
 */
router.put('/', verifyLineUser, async (req, res) => {
  try {
    const lineId = req.lineUserId;
    const { name, email, phone, starLevel, courseRecord, pictureUrl, teslaFranchisee, teamResponsibilities, volunteerRecords } = req.body;

    // 驗證星等（如果有的話）
    let memberStarLevel = starLevel;
    if (starLevel) {
      const validStarLevels = ['白星', '綠星', '橙星', '紅星', '紫星'];
      if (!validStarLevels.includes(starLevel)) {
        memberStarLevel = undefined; // 不更新無效的星等
      }
    }

    // 更新成員資料（含進階資訊）
    const member = await sheetService.updateMember(lineId, {
      name,
      email,
      phone,
      starLevel: memberStarLevel,
      courseRecord,
      pictureUrl,
      teslaFranchisee,
      teamResponsibilities,
      volunteerRecords,
    });

    // 更新版本號
    versionService.incrementVersion();

    res.json({
      success: true,
      data: member,
      message: '個人資料更新成功',
    });
  } catch (error) {
    console.error('更新個人資料錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '更新個人資料失敗',
    });
  }
});

module.exports = router;
