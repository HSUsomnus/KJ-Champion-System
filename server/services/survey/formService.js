/**
 * KJ Survey 表單服務層（Change 20）
 * 合併進主系統 server/ 後，複用既有 pg pool（server/config/db.js），不另建連線池。
 */

const db = require('../../config/db');

const ADMIN_FIELD_TYPES = ['text', 'searchable_select', 'yesno', 'upload'];

/**
 * 依 token 找已發佈的表單
 * @returns {object|null} 查無或非 published 一律回傳 null（前台不區分原因）
 */
const getPublishedFormByToken = async (token) => {
  const result = await db.query(
    `SELECT id, title, token, fields FROM survey_forms WHERE token = $1 AND status = 'published'`,
    [token]
  );
  return result.rows[0] || null;
};

/**
 * 團隊名單（前台姓名/推薦人下拉用）
 */
const listMembers = async () => {
  const result = await db.query(
    `SELECT id, name, star_rank, recommender_name, status FROM survey_members ORDER BY name`
  );
  return result.rows;
};

/**
 * 找出 form.fields 中「讀 survey_members」的欄位（name / recommender 這類）
 */
const memberSourcedFieldKeys = (fields) =>
  fields
    .filter((f) => f.type === 'searchable_select' && f.options?.source === 'survey_members')
    .map((f) => f.key);

/**
 * 送出表單填寫
 * - 寫入 survey_submissions
 * - answers 中屬於「讀 survey_members」欄位、且不在既有名單內的新姓名 → 寫入 survey_members（status='pending'）
 */
const submitForm = async (token, answers) => {
  const form = await getPublishedFormByToken(token);
  if (!form) {
    const err = new Error('表單不存在或已下架');
    err.code = 'FORM_NOT_FOUND';
    throw err;
  }

  const memberFieldKeys = memberSourcedFieldKeys(form.fields);
  if (memberFieldKeys.length > 0) {
    const existing = await listMembers();
    const existingNames = new Set(existing.map((m) => m.name));

    for (const key of memberFieldKeys) {
      const value = (answers[key] || '').trim();
      if (value && !existingNames.has(value)) {
        await db.query(
          `INSERT INTO survey_members (name, star_rank, recommender_name, status)
           VALUES ($1, '白', '', 'pending')
           ON CONFLICT (name) DO NOTHING`,
          [value]
        );
        existingNames.add(value);
      }
    }
  }

  const result = await db.query(
    `INSERT INTO survey_submissions (form_id, answers) VALUES ($1, $2) RETURNING id, created_at`,
    [form.id, JSON.stringify(answers)]
  );

  return result.rows[0];
};

module.exports = {
  getPublishedFormByToken,
  listMembers,
  submitForm,
  memberSourcedFieldKeys,
  ADMIN_FIELD_TYPES,
};
