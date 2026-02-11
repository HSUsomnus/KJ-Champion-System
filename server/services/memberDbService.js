/**
 * 成員資料庫服務層 (Supabase PostgreSQL)
 * 取代 sheetService.js 中的成員相關邏輯
 */

const db = require('../config/db');

/**
 * 將電話號碼統一轉成字串並回傳給前端
 * - 若為 9 碼且以 9 開頭（台灣手機少存了前導 0），自動補 0 成 0912345678
 */
const phoneToText = (v) => {
  if (v == null || v === '') return '';
  const s = String(v).trim();
  if (!s) return '';
  // 台灣手機 09XX：若為 9 碼且開頭是 9，視為少存了前導 0，自動補上
  if (/^9\d{8}$/.test(s)) return '0' + s;
  return s;
};

/**
 * 將資料庫 row 轉換成成員物件
 */
const rowToMember = (row) => ({
  lineId: row.line_id,
  name: row.name || '',
  email: row.email || '',
  phone: phoneToText(row.phone),
  starLevel: row.star_level || '白星',
  courseRecord: row.course_record || '',
  pictureUrl: row.picture_url || '',
  teslaFranchisee: row.tesla_franchisee || '',
  teamResponsibilities: row.team_responsibilities || '',
  volunteerRecords: row.volunteer_records || '',
  birthday: row.birthday || '',
  displayName: row.display_name || '',
  role: row.role || '一般人',
});

/**
 * 取得所有成員資料
 * @returns {Promise<Array>} 成員陣列
 */
const getAllMembers = async () => {
  try {
    const result = await db.query(`
      SELECT * FROM members
      ORDER BY created_at DESC
    `);
    
    return result.rows.map(rowToMember);
  } catch (error) {
    console.error('❌ 取得成員資料失敗:', error.message);
    throw new Error(`取得成員資料失敗: ${error.message}`);
  }
};

/**
 * 根據 LINE ID 取得成員資料
 * @param {string} lineId - LINE User ID
 * @returns {Promise<Object|null>} 成員物件，找不到則回傳 null
 */
const getMemberByLineId = async (lineId) => {
  try {
    const result = await db.query(
      `SELECT * FROM members WHERE line_id = $1`,
      [lineId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return rowToMember(result.rows[0]);
  } catch (error) {
    console.error('❌ 查詢成員資料失敗:', error.message);
    throw error;
  }
};

/**
 * 檢查成員是否已註冊
 * @param {string} lineId - LINE User ID
 * @returns {Promise<boolean>} 是否已註冊
 */
const isMemberRegistered = async (lineId) => {
  const member = await getMemberByLineId(lineId);
  return member !== null;
};

/**
 * 新增成員資料
 * @param {Object} memberData - 成員資料
 * @returns {Promise<Object>} 新增的成員物件
 */
const createMember = async (memberData) => {
  try {
    const result = await db.query(`
      INSERT INTO members (
        line_id, name, email, phone, star_level, course_record,
        picture_url, tesla_franchisee, team_responsibilities,
        volunteer_records, birthday, display_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      memberData.lineId || '',
      memberData.name || '',
      memberData.email || '',
      memberData.phone || '',
      memberData.starLevel || '白星',
      memberData.courseRecord || '',
      memberData.pictureUrl || '',
      memberData.teslaFranchisee || '',
      memberData.teamResponsibilities || '',
      memberData.volunteerRecords || '',
      memberData.birthday || '',
      memberData.displayName || '',
    ]);

    return rowToMember(result.rows[0]);
  } catch (error) {
    console.error('❌ 新增成員資料失敗:', error.message);
    throw new Error(`新增成員資料失敗: ${error.message}`);
  }
};

/**
 * 更新成員資料
 * @param {string} lineId - LINE User ID
 * @param {Object} memberData - 要更新的成員資料
 * @returns {Promise<Object>} 更新後的成員物件
 */
const updateMember = async (lineId, memberData) => {
  try {
    // 先找到該成員的資料
    const member = await getMemberByLineId(lineId);
    if (!member) {
      throw new Error('找不到該成員資料');
    }

    // 準備更新的資料（只更新有傳入的欄位）
    const phoneVal = memberData.phone !== undefined ? memberData.phone : member.phone;
    
    const result = await db.query(`
      UPDATE members
      SET 
        name = $1,
        email = $2,
        phone = $3,
        star_level = $4,
        course_record = $5,
        picture_url = $6,
        tesla_franchisee = $7,
        team_responsibilities = $8,
        volunteer_records = $9,
        birthday = $10,
        display_name = $11,
        updated_at = NOW()
      WHERE line_id = $12
      RETURNING *
    `, [
      memberData.name !== undefined ? memberData.name : member.name,
      memberData.email !== undefined ? memberData.email : member.email,
      phoneToText(phoneVal),
      memberData.starLevel !== undefined ? memberData.starLevel : member.starLevel,
      memberData.courseRecord !== undefined ? memberData.courseRecord : member.courseRecord,
      memberData.pictureUrl !== undefined ? memberData.pictureUrl : member.pictureUrl,
      memberData.teslaFranchisee !== undefined ? memberData.teslaFranchisee : member.teslaFranchisee,
      memberData.teamResponsibilities !== undefined ? memberData.teamResponsibilities : member.teamResponsibilities,
      memberData.volunteerRecords !== undefined ? memberData.volunteerRecords : member.volunteerRecords,
      memberData.birthday !== undefined ? memberData.birthday : member.birthday,
      memberData.displayName !== undefined ? memberData.displayName : member.displayName,
      lineId,
    ]);

    return rowToMember(result.rows[0]);
  } catch (error) {
    console.error('❌ 更新成員資料失敗:', error.message);
    throw new Error(`更新成員資料失敗: ${error.message}`);
  }
};

/**
 * 取得成員的權限角色
 * @param {string} lineId - LINE User ID
 * @returns {Promise<string>} 權限角色：開發者、管理者、負責人、一般人
 */
const getMemberRole = async (lineId) => {
  try {
    const result = await db.query(
      `SELECT role FROM members WHERE line_id = $1`,
      [lineId]
    );
    
    if (result.rows.length === 0) {
      return '一般人'; // 預設為一般人
    }
    
    return result.rows[0].role || '一般人';
  } catch (error) {
    console.error('❌ 查詢成員權限失敗:', error.message);
    return '一般人'; // 錯誤時預設為一般人
  }
};

/**
 * 更新成員的權限角色（只有開發者可以操作）
 * @param {string} lineId - LINE User ID
 * @param {string} newRole - 新的權限角色
 * @returns {Promise<Object>} 更新後的成員物件
 */
const updateMemberRole = async (lineId, newRole) => {
  const validRoles = ['開發者', '管理者', '負責人', '一般人'];
  
  if (!validRoles.includes(newRole)) {
    throw new Error(`無效的權限角色: ${newRole}`);
  }

  try {
    const result = await db.query(
      `UPDATE members SET role = $1, updated_at = NOW() WHERE line_id = $2 RETURNING *`,
      [newRole, lineId]
    );

    if (result.rows.length === 0) {
      throw new Error('找不到該成員');
    }

    return rowToMember(result.rows[0]);
  } catch (error) {
    console.error('❌ 更新成員權限失敗:', error.message);
    throw new Error(`更新成員權限失敗: ${error.message}`);
  }
};

module.exports = {
  getAllMembers,
  getMemberByLineId,
  isMemberRegistered,
  createMember,
  updateMember,
  getMemberRole,
  updateMemberRole,
};
