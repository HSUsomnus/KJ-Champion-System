/**
 * KJ Survey 後台表單服務（Change 20，Section 4–7）
 * 任務清單、完成狀況（attendance）、明細、匯出資料、表單建立器。
 * 複用 server/config/db 既有 pg pool。
 */

const crypto = require('crypto');
const db = require('../../config/db');
const { ADMIN_FIELD_TYPES } = require('./formService');

const UNGROUPED_LABEL = '未分組';

/**
 * 列出所有表單（側邊欄＝任務清單用），附各任務填寫筆數
 */
const listForms = async () => {
  const result = await db.query(
    `SELECT f.id, f.title, f.token, f.status, f.created_at,
            (SELECT COUNT(*)::int FROM survey_submissions s WHERE s.form_id = f.id) AS submission_count
     FROM survey_forms f
     ORDER BY f.created_at DESC`
  );
  return result.rows;
};

/**
 * 取單一表單（後台編輯 / 預覽用，不限 status）
 * @returns {object|null}
 */
const getFormById = async (id) => {
  const result = await db.query(
    `SELECT id, title, token, fields, status, created_at FROM survey_forms WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * 從一筆 submission 的 answers 取出「姓名」值（比對鍵）
 */
const submissionName = (answers) => ((answers && answers.name) || '').trim();

/**
 * 計算某任務的完成狀況（副總核心）
 * - 應填名單 = 整份 survey_members（甲案全名單比對）
 * - 已完成 = 姓名出現在該任務 survey_submissions.answers.name
 * - 按推薦人分組，各組進度 + 整體完成率
 * @returns {object} { form, overall, groups }
 * @throws FORM_NOT_FOUND
 */
const computeAttendance = async (formId) => {
  const form = await getFormById(formId);
  if (!form) {
    const err = new Error('表單不存在');
    err.code = 'FORM_NOT_FOUND';
    throw err;
  }

  const [membersRes, subsRes] = await Promise.all([
    db.query(`SELECT name, star_rank, recommender_name FROM survey_members ORDER BY name`),
    db.query(`SELECT answers FROM survey_submissions WHERE form_id = $1`, [formId]),
  ]);

  const members = membersRes.rows;
  const submittedNames = new Set(
    subsRes.rows.map((r) => submissionName(r.answers)).filter(Boolean)
  );

  // 按推薦人分組
  const groupsMap = new Map();
  for (const m of members) {
    const key = m.recommender_name || UNGROUPED_LABEL;
    if (!groupsMap.has(key)) groupsMap.set(key, []);
    groupsMap.get(key).push({
      name: m.name,
      star_rank: m.star_rank,
      completed: submittedNames.has(m.name),
    });
  }

  const groups = [...groupsMap.entries()]
    .map(([recommender, list]) => ({
      recommender,
      members: list,
      total: list.length,
      done: list.filter((x) => x.completed).length,
    }))
    .sort((a, b) => b.total - a.total || a.recommender.localeCompare(b.recommender, 'zh-Hant'));

  const total = members.length;
  const done = members.filter((m) => submittedNames.has(m.name)).length;

  return {
    form: { id: form.id, title: form.title, status: form.status },
    overall: { total, done, rate: total ? Math.round((done / total) * 100) : 0 },
    groups,
  };
};

/**
 * 某任務的逐筆填寫明細（含表單欄位定義，供前端 render 標題/型態）
 * @returns {object} { form: { id, title, fields }, submissions: [{ id, answers, created_at }] }
 * @throws FORM_NOT_FOUND
 */
const listSubmissions = async (formId) => {
  const form = await getFormById(formId);
  if (!form) {
    const err = new Error('表單不存在');
    err.code = 'FORM_NOT_FOUND';
    throw err;
  }

  const result = await db.query(
    `SELECT id, answers, created_at FROM survey_submissions WHERE form_id = $1 ORDER BY created_at DESC`,
    [formId]
  );

  return {
    form: { id: form.id, title: form.title, fields: form.fields },
    submissions: result.rows,
  };
};

module.exports = {
  listForms,
  getFormById,
  computeAttendance,
  listSubmissions,
  submissionName,
  UNGROUPED_LABEL,
  ADMIN_FIELD_TYPES,
  _generateToken: () => crypto.randomBytes(16).toString('hex'),
};
