/**
 * KJ Survey 後台權限服務（Change 20）
 * 合併進 server/ 後，直接查主系統同一個 PostgreSQL 的 members 表，不需額外內部 API。
 * 只唯讀 members，不寫入、不動其結構（符合「過渡期不碰主系統既有資料表結構」鐵律）。
 */

const db = require('../../config/db');

const ADMIN_ROLES = ['管理者', '負責人', '開發者'];

/**
 * 查主系統 members 表的角色（同一個 DB，直接查）
 * @returns {string|null} role，查無此人回傳 null
 */
const getMemberRole = async (lineId) => {
  const result = await db.query('SELECT role FROM members WHERE line_id = $1', [lineId]);
  return result.rows[0]?.role || null;
};

const isAdminRole = (role) => ADMIN_ROLES.includes(role);

module.exports = { getMemberRole, isAdminRole, ADMIN_ROLES };
