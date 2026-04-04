/**
 * 標籤資料庫服務層
 * Change 08: 標籤核心系統
 */

const db = require('../config/db');
const memberDbService = require('./memberDbService');

// 星等虛擬標籤顏色對照
const STAR_TAG_COLORS = {
  '白星': { color: '#8A8680', bgColor: '#F7F5F2' },
  '綠星': { color: '#4A7C59', bgColor: '#E8F0EB' },
  '橙星': { color: '#E67E22', bgColor: '#FFF3E0' },
  '紅星': { color: '#C0392B', bgColor: '#FDECEA' },
  '紫星': { color: '#8E44AD', bgColor: '#F3E5F5' },
};

// 角色虛擬標籤顏色對照
const ROLE_TAG_COLORS = {
  '一般人': { color: '#8A8680', bgColor: '#EFEDE9' },
  '管理者': { color: '#8E44AD', bgColor: '#F3E5F5' },
  '負責人': { color: '#2980B9', bgColor: '#EBF5FB' },
  '開發者': { color: '#4A7C59', bgColor: '#E8F0EB' },
};

/**
 * 將資料庫 row 轉換成標籤物件
 */
const rowToTag = (row) => ({
  id: row.id,
  name: row.name,
  category: row.category,
  color: row.color,
  bgColor: row.bg_color,
  description: row.description || '',
  isSystem: row.is_system || false,
  sortOrder: row.sort_order || 0,
  createdBy: row.created_by || '',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * 取得所有標籤
 * @param {string} [category] - 依類別過濾（身份/技能/成就/自訂）
 */
const getAllTags = async (category) => {
  try {
    let sql = 'SELECT * FROM tags ORDER BY sort_order ASC, created_at ASC';
    let params = [];

    if (category) {
      sql = 'SELECT * FROM tags WHERE category = $1 ORDER BY sort_order ASC, created_at ASC';
      params = [category];
    }

    const result = await db.query(sql, params);
    return result.rows.map(rowToTag);
  } catch (error) {
    console.error('❌ 取得標籤列表失敗:', error.message);
    throw new Error(`取得標籤列表失敗: ${error.message}`);
  }
};

/**
 * 根據 ID 取得標籤
 */
const getTagById = async (id) => {
  try {
    const result = await db.query('SELECT * FROM tags WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return rowToTag(result.rows[0]);
  } catch (error) {
    console.error('❌ 取得標籤失敗:', error.message);
    throw error;
  }
};

/**
 * 建立標籤
 */
const createTag = async ({ name, category, color, bgColor, description, createdBy }) => {
  try {
    const sql = `
      INSERT INTO tags (name, category, color, bg_color, description, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const params = [
      name,
      category || '自訂',
      color || '#8A8680',
      bgColor || '#EFEDE9',
      description || '',
      createdBy || '',
    ];
    const result = await db.query(sql, params);
    console.log(`✅ 建立標籤: ${name} (${category || '自訂'})`);
    return rowToTag(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      throw new Error(`標籤「${name}」在「${category || '自訂'}」類別中已存在`);
    }
    console.error('❌ 建立標籤失敗:', error.message);
    throw new Error(`建立標籤失敗: ${error.message}`);
  }
};

/**
 * 更新標籤
 */
const updateTag = async (id, { name, category, color, bgColor, description, sortOrder }) => {
  try {
    const tag = await getTagById(id);
    if (!tag) throw new Error('找不到該標籤');

    const sql = `
      UPDATE tags SET
        name = $1,
        category = $2,
        color = $3,
        bg_color = $4,
        description = $5,
        sort_order = $6,
        updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `;
    const params = [
      name !== undefined ? name : tag.name,
      category !== undefined ? category : tag.category,
      color !== undefined ? color : tag.color,
      bgColor !== undefined ? bgColor : tag.bgColor,
      description !== undefined ? description : tag.description,
      sortOrder !== undefined ? sortOrder : tag.sortOrder,
      id,
    ];
    const result = await db.query(sql, params);
    return rowToTag(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      throw new Error('同類別中已有同名標籤');
    }
    console.error('❌ 更新標籤失敗:', error.message);
    throw error;
  }
};

/**
 * 刪除標籤（系統標籤不可刪）
 */
const deleteTag = async (id) => {
  try {
    const tag = await getTagById(id);
    if (!tag) throw new Error('找不到該標籤');
    if (tag.isSystem) throw new Error('系統標籤不可刪除');

    await db.query('DELETE FROM tags WHERE id = $1', [id]);
    console.log(`✅ 刪除標籤: ${tag.name}`);
    return true;
  } catch (error) {
    console.error('❌ 刪除標籤失敗:', error.message);
    throw error;
  }
};

/**
 * 取得成員的所有標籤（含虛擬星等/角色標籤）
 */
const getMemberTags = async (lineId) => {
  try {
    // 查詢真實標籤
    const result = await db.query(
      `SELECT t.* FROM tags t
       INNER JOIN member_tags mt ON mt.tag_id = t.id
       WHERE mt.member_line_id = $1
       ORDER BY t.sort_order ASC, t.created_at ASC`,
      [lineId]
    );
    const realTags = result.rows.map(rowToTag);

    // 查詢成員資料以產生虛擬標籤
    const member = await memberDbService.getMemberByLineId(lineId);
    const virtualTags = [];

    if (member) {
      // 星等虛擬標籤
      const starLevel = member.starLevel || '白星';
      const starColors = STAR_TAG_COLORS[starLevel] || STAR_TAG_COLORS['白星'];
      virtualTags.push({
        id: 'system-star',
        name: starLevel,
        category: '身份',
        color: starColors.color,
        bgColor: starColors.bgColor,
        description: '星等（系統自動）',
        isSystem: true,
        sortOrder: -2,
        createdBy: '',
        createdAt: null,
        updatedAt: null,
      });

      // 角色虛擬標籤（一般人不顯示）
      const role = member.role || '一般人';
      if (role !== '一般人') {
        const roleColors = ROLE_TAG_COLORS[role] || ROLE_TAG_COLORS['一般人'];
        virtualTags.push({
          id: 'system-role',
          name: role,
          category: '身份',
          color: roleColors.color,
          bgColor: roleColors.bgColor,
          description: '角色（系統自動）',
          isSystem: true,
          sortOrder: -1,
          createdBy: '',
          createdAt: null,
          updatedAt: null,
        });
      }
    }

    return [...virtualTags, ...realTags];
  } catch (error) {
    console.error('❌ 取得成員標籤失敗:', error.message);
    throw new Error(`取得成員標籤失敗: ${error.message}`);
  }
};

/**
 * 分配標籤給成員
 */
const assignTag = async (lineId, tagId, assignedBy) => {
  try {
    const sql = `
      INSERT INTO member_tags (member_line_id, tag_id, assigned_by)
      VALUES ($1, $2, $3)
      ON CONFLICT (member_line_id, tag_id) DO NOTHING
      RETURNING *
    `;
    const result = await db.query(sql, [lineId, tagId, assignedBy || '']);
    if (result.rows.length === 0) {
      return { alreadyAssigned: true };
    }
    console.log(`✅ 分配標籤: ${lineId} <- tag#${tagId}`);
    return { alreadyAssigned: false };
  } catch (error) {
    console.error('❌ 分配標籤失敗:', error.message);
    throw new Error(`分配標籤失敗: ${error.message}`);
  }
};

/**
 * 移除成員的標籤
 */
const removeTag = async (lineId, tagId) => {
  try {
    const result = await db.query(
      'DELETE FROM member_tags WHERE member_line_id = $1 AND tag_id = $2',
      [lineId, tagId]
    );
    if (result.rowCount === 0) {
      throw new Error('該成員沒有此標籤');
    }
    console.log(`✅ 移除標籤: ${lineId} x tag#${tagId}`);
    return true;
  } catch (error) {
    console.error('❌ 移除標籤失敗:', error.message);
    throw error;
  }
};

/**
 * 取得擁有某標籤的所有成員
 */
const getMembersByTag = async (tagId) => {
  try {
    const result = await db.query(
      `SELECT m.* FROM members m
       INNER JOIN member_tags mt ON mt.member_line_id = m.line_id
       WHERE mt.tag_id = $1
       ORDER BY m.created_at DESC`,
      [tagId]
    );
    // 使用 memberDbService 的格式不可行（rowToMember 未 export），
    // 直接回傳基本欄位
    return result.rows.map(row => ({
      lineId: row.line_id,
      name: row.name || '',
      displayName: row.display_name || '',
      pictureUrl: row.picture_url || '',
      starLevel: row.star_level || '白星',
      role: row.role || '一般人',
    }));
  } catch (error) {
    console.error('❌ 取得標籤成員失敗:', error.message);
    throw new Error(`取得標籤成員失敗: ${error.message}`);
  }
};

module.exports = {
  getAllTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
  getMemberTags,
  assignTag,
  removeTag,
  getMembersByTag,
};
