const db = require('../config/db');

const ADMIN_ROLES = ['管理者', '負責人', '開發者'];

/**
 * 查主系統 members 表的角色（同一個 DB，直接查，不需額外內部 API）
 * @returns {string|null} role，查無此人回傳 null
 */
const getMemberRole = async (lineId) => {
  const result = await db.query('SELECT role FROM members WHERE line_id = $1', [lineId]);
  return result.rows[0]?.role || null;
};

const isAdminRole = (role) => ADMIN_ROLES.includes(role);

module.exports = { getMemberRole, isAdminRole };
