/**
 * 開發人員專用 API 路由
 * 需要開發人員權限（ADMIN_LINE_USER_IDS）
 */

const express = require('express');
const router = express.Router();
const { verifyLineUser, verifyAdmin } = require('../middleware/auth');
const memberDbService = require('../services/memberDbService');
const calendarService = require('../services/calendarService');
const versionService = require('../services/versionService');

/**
 * GET /api/admin/check
 * 檢查當前使用者的權限等級
 */
router.get('/check', verifyLineUser, async (req, res) => {
  try {
    const { getUserRole } = require('../middleware/auth');
    const role = await getUserRole(req.lineUserId);
    const isAdminUser = (role === '開發者');
    
    res.json({
      success: true,
      data: {
        isAdmin: isAdminUser,
        role: role,
      },
    });
  } catch (error) {
    console.error('檢查開發人員權限錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '檢查權限失敗',
    });
  }
});

/**
 * POST /api/admin/sync-all-birthdays
 * 強制同步所有成員的生日行程到 Google Calendar 和資料庫
 * 只有開發人員權限才能執行
 */
router.post('/sync-all-birthdays', verifyLineUser, verifyAdmin, async (req, res) => {
  try {
    console.log('🔧 開發人員觸發：開始強制同步所有成員生日行程...');
    
    // 取得所有有生日的成員
    const allMembers = await memberDbService.getAllMembers();
    const membersWithBirthday = allMembers.filter(m => m.birthday && m.birthday.trim());
    
    if (membersWithBirthday.length === 0) {
      return res.json({
        success: true,
        message: '沒有需要同步的生日資料',
        data: {
          total: 0,
          synced: 0,
          failed: 0,
        },
      });
    }

    // 逐一同步每個成員的生日行程
    const results = {
      total: membersWithBirthday.length,
      synced: 0,
      failed: 0,
      details: [],
    };

    for (const member of membersWithBirthday) {
      try {
        const count = await calendarService.syncMemberBirthdayEvents(member);
        results.synced += 1;
        results.details.push({
          name: member.name,
          birthday: member.birthday,
          eventsCreated: count,
          status: 'success',
        });
        console.log(`  ✅ ${member.name} (${member.birthday}): ${count} 個生日行程已同步`);
      } catch (err) {
        results.failed += 1;
        results.details.push({
          name: member.name,
          birthday: member.birthday,
          status: 'failed',
          error: err.message,
        });
        console.warn(`  ⚠️ ${member.name} (${member.birthday}): 同步失敗 - ${err.message}`);
      }
    }

    // 更新版本號（觸發前端快取更新）
    versionService.incrementVersion();

    console.log(`🎉 同步完成！成功 ${results.synced}/${results.total}，失敗 ${results.failed}`);

    res.json({
      success: true,
      message: `已同步 ${results.synced}/${results.total} 位成員的生日行程`,
      data: results,
    });
  } catch (error) {
    console.error('❌ 強制同步生日行程錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '同步失敗',
    });
  }
});

/**
 * GET /api/admin/members
 * 取得所有成員及其權限（開發人員專用）
 */
router.get('/members', verifyLineUser, verifyAdmin, async (req, res) => {
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
 * PUT /api/admin/members/:lineId/role
 * 更新指定成員的權限（開發人員專用）
 */
router.put('/members/:lineId/role', verifyLineUser, verifyAdmin, async (req, res) => {
  try {
    const { lineId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: '請提供權限角色',
      });
    }

    const validRoles = ['開發者', '管理者', '負責人', '一般人'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `無效的權限角色，有效值：${validRoles.join('、')}`,
      });
    }

    const updatedMember = await memberDbService.updateMemberRole(lineId, role);

    res.json({
      success: true,
      data: updatedMember,
      message: `已將 ${updatedMember.name} 的權限更新為 ${role}`,
    });
  } catch (error) {
    console.error('更新成員權限錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '更新權限失敗',
    });
  }
});

module.exports = router;
