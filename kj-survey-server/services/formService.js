const db = require('../config/db');

/**
 * 依 token 查詢已發佈的表單。
 * @returns {object|null} 找到 published 表單時回傳表單，否則回傳 null
 */
const getPublishedFormByToken = async (token, executor = db) => {
  const result = await executor.query(
    `SELECT id, title, token, fields FROM survey_forms WHERE token = $1 AND status = 'published'`,
    [token]
  );
  return result.rows[0] || null;
};

/**
 * 取得全部團隊成員，供前台下拉選單與後台共用。
 */
const listMembers = async (executor = db) => {
  const result = await executor.query(
    `SELECT id, name, star_rank, recommender_name, status FROM survey_members ORDER BY name`
  );
  return result.rows;
};

/**
 * 取得已確認的團隊成員，僅提供前台選單需要的公開欄位。
 */
const listConfirmedMembers = async (executor = db) => {
  const result = await executor.query(
    `SELECT name, star_rank FROM survey_members WHERE status = 'confirmed' ORDER BY name`
  );
  return result.rows;
};

/**
 * 取得全部調查表單，依建立時間由新到舊排列。
 */
const listForms = async (executor = db) => {
  const result = await executor.query(
    `SELECT id, title, token, status, created_at FROM survey_forms ORDER BY created_at DESC`
  );
  return result.rows;
};

/**
 * 取得指定表單的所有提交，依建立時間由新到舊排列。
 */
const listSubmissionsByFormId = async (formId, executor = db) => {
  const result = await executor.query(
    `SELECT id, form_id, answers, created_at FROM survey_submissions WHERE form_id = $1 ORDER BY created_at DESC`,
    [formId]
  );
  return result.rows;
};

const isPlainObject = (value) => {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

/**
 * 驗證前台送出的 answers 是否符合表單欄位定義。
 */
const validateAnswers = (form, answers) => {
  if (!isPlainObject(answers)) {
    return { valid: false, field: null, reason: 'invalid_answers' };
  }

  const fields = Array.isArray(form?.fields) ? form.fields : [];
  const allowedKeys = new Set(fields.map((field) => field.key));

  for (const key of Object.keys(answers)) {
    if (!allowedKeys.has(key)) {
      return { valid: false, field: key, reason: 'unknown_field' };
    }
  }

  for (const field of fields) {
    const value = answers[field.key];
    const missing = value === undefined || value === null || value === '';

    if (field.required !== false && missing) {
      return { valid: false, field: field.key, reason: 'required' };
    }
    if (missing) continue;

    if (field.type === 'text') {
      if (typeof value !== 'string') {
        return { valid: false, field: field.key, reason: 'invalid_value' };
      }
      if (value.length > 500) {
        return { valid: false, field: field.key, reason: 'too_long' };
      }
    } else if (field.type === 'yesno') {
      if (value !== 'yes' && value !== 'no') {
        return { valid: false, field: field.key, reason: 'invalid_value' };
      }
    } else if (field.type === 'searchable_select') {
      if (typeof value !== 'string') {
        return { valid: false, field: field.key, reason: 'invalid_value' };
      }
      if (
        field.options?.source === 'static'
        && (!Array.isArray(field.options.values) || !field.options.values.includes(value))
      ) {
        return { valid: false, field: field.key, reason: 'invalid_value' };
      }
    }
  }

  return { valid: true };
};

const memberSourcedFieldKeys = (fields) =>
  fields
    .filter((field) => field.type === 'searchable_select' && field.options?.source === 'survey_members')
    .map((field) => field.key);

/**
 * 送出表單，並在同一個 transaction 中建立新 pending 成員與 submission。
 */
const submitForm = async (token, answers) => {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const form = await getPublishedFormByToken(token, client);
    if (!form) {
      const err = new Error('表單不存在或尚未發佈');
      err.code = 'FORM_NOT_FOUND';
      throw err;
    }

    const memberFieldKeys = memberSourcedFieldKeys(form.fields);
    if (memberFieldKeys.length > 0) {
      const existing = await listMembers(client);
      const existingNames = new Set(existing.map((member) => member.name));

      for (const key of memberFieldKeys) {
        const value = typeof answers[key] === 'string' ? answers[key].trim() : '';
        if (value && !existingNames.has(value)) {
          await client.query(
            `INSERT INTO survey_members (name, star_rank, recommender_name, status)
             VALUES ($1, '白', '', 'pending')
             ON CONFLICT (name) DO NOTHING`,
            [value]
          );
          existingNames.add(value);
        }
      }
    }

    const result = await client.query(
      `INSERT INTO survey_submissions (form_id, answers) VALUES ($1, $2) RETURNING id, created_at`,
      [form.id, JSON.stringify(answers)]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  getPublishedFormByToken,
  listMembers,
  listConfirmedMembers,
  listForms,
  listSubmissionsByFormId,
  validateAnswers,
  submitForm,
};
