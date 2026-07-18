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

const generateToken = () => crypto.randomBytes(16).toString('hex');

/**
 * 驗證建立器送來的欄位陣列。不合法 → 丟 VALIDATION（400）。
 * 每個欄位需有非空 key / label，type ∈ ADMIN_FIELD_TYPES，key 不可重複。
 */
const validateFields = (fields) => {
  if (!Array.isArray(fields) || fields.length === 0) {
    throwValidation('至少需要一個欄位');
  }
  const seen = new Set();
  for (const f of fields) {
    if (!f || typeof f.key !== 'string' || !f.key.trim()) throwValidation('欄位 key 不可為空');
    if (typeof f.label !== 'string' || !f.label.trim()) throwValidation(`欄位「${f.key}」缺少標題`);
    if (!ADMIN_FIELD_TYPES.includes(f.type)) throwValidation(`欄位「${f.key}」型態不合法`);
    if (seen.has(f.key)) throwValidation(`欄位 key 重複：${f.key}`);
    seen.add(f.key);
  }
};

const throwValidation = (message) => {
  const err = new Error(message);
  err.code = 'VALIDATION';
  throw err;
};

/**
 * 建立草稿表單（發佈前）。建立時即產生 token（schema token NOT NULL）。
 */
const createForm = async ({ title, fields }) => {
  if (typeof title !== 'string' || !title.trim()) throwValidation('請填任務標題');
  validateFields(fields);

  const result = await db.query(
    `INSERT INTO survey_forms (title, token, fields, status)
     VALUES ($1, $2, $3, 'draft')
     RETURNING id, title, token, fields, status, created_at`,
    [title.trim(), generateToken(), JSON.stringify(fields)]
  );
  return result.rows[0];
};

/**
 * 編輯表單欄位 / 標題。
 * @throws FORM_NOT_FOUND / VALIDATION
 */
const updateForm = async (id, { title, fields }) => {
  const existing = await getFormById(id);
  if (!existing) {
    const err = new Error('表單不存在');
    err.code = 'FORM_NOT_FOUND';
    throw err;
  }
  const nextTitle = title != null ? title : existing.title;
  const nextFields = fields != null ? fields : existing.fields;
  if (typeof nextTitle !== 'string' || !nextTitle.trim()) throwValidation('請填任務標題');
  validateFields(nextFields);

  const result = await db.query(
    `UPDATE survey_forms SET title = $1, fields = $2 WHERE id = $3
     RETURNING id, title, token, fields, status, created_at`,
    [nextTitle.trim(), JSON.stringify(nextFields), id]
  );
  return result.rows[0];
};

/**
 * 發佈表單（draft → published）；若無 token 則補產生。
 * @throws FORM_NOT_FOUND
 */
const publishForm = async (id) => {
  const existing = await getFormById(id);
  if (!existing) {
    const err = new Error('表單不存在');
    err.code = 'FORM_NOT_FOUND';
    throw err;
  }
  const token = existing.token || generateToken();
  const result = await db.query(
    `UPDATE survey_forms SET status = 'published', token = $1 WHERE id = $2
     RETURNING id, title, token, fields, status, created_at`,
    [token, id]
  );
  return result.rows[0];
};

module.exports = {
  listForms,
  getFormById,
  computeAttendance,
  listSubmissions,
  createForm,
  updateForm,
  publishForm,
  validateFields,
  submissionName,
  UNGROUPED_LABEL,
  ADMIN_FIELD_TYPES,
  _generateToken: generateToken,
};
