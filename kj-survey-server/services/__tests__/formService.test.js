'use strict';

jest.mock('../../config/db', () => ({
  query: jest.fn(),
  pool: { connect: jest.fn() },
}));

const db = require('../../config/db');
const formService = require('../formService');

const PUBLISHED_FORM = {
  id: 1,
  title: '團隊調查',
  token: 'abc123',
  fields: [
    { key: 'name', label: '姓名', type: 'searchable_select', options: { source: 'survey_members' } },
    { key: 'star_rank', label: '星等', type: 'searchable_select', options: { source: 'static', values: ['一星', '二星'] } },
    { key: 'recommender', label: '推薦人', type: 'searchable_select', options: { source: 'survey_members' } },
    { key: 'join_master', label: '參加大師班', type: 'yesno' },
  ],
};

const createClient = () => ({
  query: jest.fn(),
  release: jest.fn(),
});

describe('formService helpers', () => {
  beforeEach(() => jest.resetAllMocks());

  test('getPublishedFormByToken 未傳 executor 時使用 db.query', async () => {
    db.query.mockResolvedValue({ rows: [PUBLISHED_FORM] });
    await expect(formService.getPublishedFormByToken('abc123')).resolves.toEqual(PUBLISHED_FORM);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('WHERE token = $1'), ['abc123']);
  });

  test('getPublishedFormByToken 查無表單時回傳 null', async () => {
    db.query.mockResolvedValue({ rows: [] });
    await expect(formService.getPublishedFormByToken('missing')).resolves.toBeNull();
  });

  test('listMembers 未傳 executor 時使用 db.query', async () => {
    const members = [{ id: 1, name: '王小明' }];
    db.query.mockResolvedValue({ rows: members });
    await expect(formService.listMembers()).resolves.toEqual(members);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('FROM survey_members'));
  });

  test('listConfirmedMembers 未傳 executor 時使用 db.query 並只查 confirmed', async () => {
    const members = [{ name: '王小明', star_rank: '一星' }];
    db.query.mockResolvedValue({ rows: members });

    await expect(formService.listConfirmedMembers()).resolves.toEqual(members);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("WHERE status = 'confirmed'"));
  });

  test('listConfirmedMembers 可改用傳入的 client', async () => {
    const client = createClient();
    const members = [{ name: '王小明', star_rank: '一星' }];
    client.query.mockResolvedValue({ rows: members });

    await expect(formService.listConfirmedMembers(client)).resolves.toEqual(members);
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining("WHERE status = 'confirmed'"));
    expect(db.query).not.toHaveBeenCalled();
  });

  test('helpers 可改用傳入的 client', async () => {
    const client = createClient();
    client.query
      .mockResolvedValueOnce({ rows: [PUBLISHED_FORM] })
      .mockResolvedValueOnce({ rows: [{ id: 1, name: '王小明' }] });

    await formService.getPublishedFormByToken('abc123', client);
    await formService.listMembers(client);

    expect(client.query).toHaveBeenCalledTimes(2);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('listForms 未傳 executor 時使用 db.query', async () => {
    const forms = [{ id: 1, title: '團隊調查' }];
    db.query.mockResolvedValue({ rows: forms });

    await expect(formService.listForms()).resolves.toEqual(forms);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringMatching(/FROM survey_forms ORDER BY created_at DESC/)
    );
  });

  test('listForms 可改用傳入的 client', async () => {
    const client = createClient();
    const forms = [{ id: 1, title: '團隊調查' }];
    client.query.mockResolvedValue({ rows: forms });

    await expect(formService.listForms(client)).resolves.toEqual(forms);
    expect(client.query).toHaveBeenCalledWith(
      expect.stringMatching(/FROM survey_forms ORDER BY created_at DESC/)
    );
    expect(db.query).not.toHaveBeenCalled();
  });

  test('listSubmissionsByFormId 未傳 executor 時使用 db.query', async () => {
    const submissions = [{ id: 9, form_id: 1, answers: {} }];
    db.query.mockResolvedValue({ rows: submissions });

    await expect(formService.listSubmissionsByFormId('1')).resolves.toEqual(submissions);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringMatching(/FROM survey_submissions WHERE form_id = \$1 ORDER BY created_at DESC/),
      ['1']
    );
  });

  test('listSubmissionsByFormId 可改用傳入的 client', async () => {
    const client = createClient();
    const submissions = [{ id: 9, form_id: 1, answers: {} }];
    client.query.mockResolvedValue({ rows: submissions });

    await expect(formService.listSubmissionsByFormId('1', client)).resolves.toEqual(submissions);
    expect(client.query).toHaveBeenCalledWith(
      expect.stringMatching(/FROM survey_submissions WHERE form_id = \$1 ORDER BY created_at DESC/),
      ['1']
    );
    expect(db.query).not.toHaveBeenCalled();
  });
});

describe('formService.validateAnswers', () => {
  const form = {
    fields: [
      { key: 'note', label: '備註', type: 'text', required: false },
      { key: 'join', label: '參加', type: 'yesno', required: true },
      { key: 'rank', label: '星等', type: 'searchable_select', required: true, options: { source: 'static', values: ['一星', '二星'] } },
      { key: 'name', label: '姓名', type: 'searchable_select', required: true, options: { source: 'survey_members' } },
    ],
  };

  test.each([null, [], 'text', 123])('answers 不是 plain object 時驗證失敗：%p', (answers) => {
    expect(formService.validateAnswers(form, answers)).toMatchObject({ valid: false, reason: 'invalid_answers' });
  });

  test('必填欄位缺漏時驗證失敗', () => {
    expect(formService.validateAnswers(form, { rank: '一星', name: '新姓名' })).toEqual({
      valid: false, field: 'join', reason: 'required',
    });
  });

  test('未定義 required 的 legacy 欄位視為必填', () => {
    const legacyForm = { fields: [{ key: 'legacy', label: '舊欄位', type: 'text' }] };
    expect(formService.validateAnswers(legacyForm, {})).toEqual({
      valid: false, field: 'legacy', reason: 'required',
    });
  });

  test('text 超過 500 字元時驗證失敗', () => {
    expect(formService.validateAnswers(form, {
      note: 'a'.repeat(501), join: 'yes', rank: '一星', name: '新姓名',
    })).toEqual({ valid: false, field: 'note', reason: 'too_long' });
  });

  test('yesno 不合法值時驗證失敗', () => {
    expect(formService.validateAnswers(form, { join: 'maybe', rank: '一星', name: '新姓名' }))
      .toEqual({ valid: false, field: 'join', reason: 'invalid_value' });
  });

  test.each([
    ['一星', true],
    ['三星', false],
  ])('static select 值 %s 的驗證結果', (rank, valid) => {
    const result = formService.validateAnswers(form, { join: 'yes', rank, name: '新姓名' });
    expect(result.valid).toBe(valid);
    if (!valid) expect(result).toMatchObject({ field: 'rank', reason: 'invalid_value' });
  });

  test('survey_members 來源接受名單外的新姓名', () => {
    expect(formService.validateAnswers(form, { join: 'yes', rank: '一星', name: '全新姓名' }))
      .toEqual({ valid: true });
  });

  test('未知 key 驗證失敗', () => {
    expect(formService.validateAnswers(form, {
      join: 'yes', rank: '一星', name: '新姓名', injected: 'value',
    })).toEqual({ valid: false, field: 'injected', reason: 'unknown_field' });
  });

  test('全部合法時回傳 valid true', () => {
    expect(formService.validateAnswers(form, {
      note: '正常內容', join: 'no', rank: '二星', name: '新姓名',
    })).toEqual({ valid: true });
  });
});

describe('formService.submitForm transaction', () => {
  let client;

  beforeEach(() => {
    jest.resetAllMocks();
    client = createClient();
    db.pool.connect.mockResolvedValue(client);
  });

  test('表單不存在時 rollback、release 並保留 FORM_NOT_FOUND', async () => {
    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(formService.submitForm('bad-token', {})).rejects.toMatchObject({ code: 'FORM_NOT_FOUND' });
    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query).not.toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test('正常送出只新增新姓名並 commit 回傳 submission', async () => {
    const submission = { id: 99, created_at: '2026-07-08T00:00:00Z' };
    client.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [PUBLISHED_FORM] })
      .mockResolvedValueOnce({ rows: [{ id: 1, name: '既有姓名' }] })
      .mockResolvedValueOnce({ rows: [] }) // 新推薦人 pending
      .mockResolvedValueOnce({ rows: [submission] })
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const answers = {
      name: '既有姓名', star_rank: '一星', recommender: '新推薦人', join_master: 'yes',
    };
    await expect(formService.submitForm('abc123', answers)).resolves.toEqual(submission);

    const memberInserts = client.query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO survey_members'));
    expect(memberInserts).toHaveLength(1);
    expect(memberInserts[0][1]).toEqual(['新推薦人']);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.query).not.toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('submission insert 失敗時 rollback，避免孤兒 pending member', async () => {
    const insertError = new Error('submission insert failed');
    client.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [PUBLISHED_FORM] })
      .mockResolvedValueOnce({ rows: [] }) // listMembers
      .mockResolvedValueOnce({ rows: [] }) // pending member
      .mockRejectedValueOnce(insertError) // submission
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

    await expect(formService.submitForm('abc123', {
      name: '新姓名', star_rank: '一星', recommender: '新姓名', join_master: 'yes',
    })).rejects.toBe(insertError);

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query).not.toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(db.query).not.toHaveBeenCalled();
  });
});

describe('formService form builder validators', () => {
  const textField = { key: 'note', label: '備註', type: 'text' };
  const validateFields = (fields) => formService.validateFormFields(fields);

  test.each([
    ['有效標題', { valid: true }],
    ['a'.repeat(200), { valid: true }],
    ['', { valid: false, field: 'title', reason: 'required' }],
    ['   ', { valid: false, field: 'title', reason: 'required' }],
    [null, { valid: false, field: 'title', reason: 'required' }],
    ['a'.repeat(201), { valid: false, field: 'title', reason: 'too_long' }],
  ])('validateFormTitle(%p)', (title, expected) => {
    expect(formService.validateFormTitle(title)).toEqual(expected);
  });

  test('fields 必須是陣列，空陣列與 50 欄合法，51 欄失敗', () => {
    expect(validateFields(null)).toEqual({ valid: false, field: 'fields', reason: 'invalid_type' });
    expect(validateFields([])).toEqual({ valid: true });
    expect(validateFields(Array.from({ length: 50 }, (_, i) => ({ ...textField, key: `field_${i}` })))).toEqual({ valid: true });
    expect(validateFields(Array.from({ length: 51 }, (_, i) => ({ ...textField, key: `field_${i}` })))).toEqual({ valid: false, field: 'fields', reason: 'too_many' });
  });

  test.each([
    [[textField], { valid: true }],
    [[null], { valid: false, field: 'fields', reason: 'invalid_key' }],
    [[{ ...textField, key: 'Bad-key' }], { valid: false, field: 'fields', reason: 'invalid_key' }],
    [[{ ...textField, key: `a${'b'.repeat(40)}` }], { valid: false, field: 'fields', reason: 'invalid_key' }],
    [[textField, { ...textField }], { valid: false, field: 'fields', reason: 'duplicate_key' }],
    [[{ ...textField, label: '' }], { valid: false, field: 'fields', reason: 'invalid_label' }],
    [[{ ...textField, label: 'a'.repeat(101) }], { valid: false, field: 'fields', reason: 'invalid_label' }],
    [[{ ...textField, type: 'upload' }], { valid: false, field: 'fields', reason: 'invalid_type_value' }],
    [[{ ...textField, type: 'yesno' }], { valid: true }],
  ])('field key/label/type 規則 %#', (fields, expected) => {
    expect(validateFields(fields)).toEqual(expected);
  });

  test('static searchable_select 接受最多 100 個唯一非空短字串', () => {
    const values = Array.from({ length: 100 }, (_, i) => `選項${i}`);
    expect(validateFields([{ key: 'rank', label: '星等', type: 'searchable_select', options: { source: 'static', values } }])).toEqual({ valid: true });
  });

  test.each([
    [{ source: 'other', values: [] }],
    [{ source: 'static', values: 'not-array' }],
    [{ source: 'static', values: Array.from({ length: 101 }, (_, i) => `v${i}`) }],
    [{ source: 'static', values: [''] }],
    [{ source: 'static', values: ['a'.repeat(101)] }],
    [{ source: 'static', values: ['重複', '重複'] }],
  ])('不合法 searchable_select options：%p', (options) => {
    expect(validateFields([{ key: 'rank', label: '星等', type: 'searchable_select', options }]))
      .toEqual({ valid: false, field: 'fields', reason: 'invalid_options' });
  });

  test('survey_members 只檢查 source，不檢查 values', () => {
    expect(validateFields([{
      key: 'name', label: '姓名', type: 'searchable_select',
      options: { source: 'survey_members', values: 'ignored' },
    }])).toEqual({ valid: true });
  });
});

describe('formService create/patch/publish', () => {
  beforeEach(() => jest.resetAllMocks());

  test('createDraftForm 產生 32 字元 token 並回傳 draft', async () => {
    db.query.mockImplementation(async (sql, params) => ({
      rows: [{ id: 1, title: params[0], token: params[1], fields: [], status: 'draft' }],
    }));
    const result = await formService.createDraftForm({ title: '新表單' });
    expect(result).toMatchObject({ title: '新表單', status: 'draft' });
    expect(result.token).toMatch(/^[a-f0-9]{32}$/);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO survey_forms'), [
      '新表單', result.token, '[]',
    ]);
  });

  test('createDraftForm title 不合法時帶 INVALID_FORM 資訊且不查 DB', async () => {
    await expect(formService.createDraftForm({ title: ' ' })).rejects.toMatchObject({
      code: 'INVALID_FORM', field: 'title', reason: 'required',
    });
    expect(db.query).not.toHaveBeenCalled();
  });

  test.each([
    [undefined, null, 'empty_patch'],
    [{}, null, 'empty_patch'],
    [{ status: 'draft' }, 'status', 'unknown_field'],
    [{ title: null }, 'title', 'null_value'],
    [{ fields: null }, 'fields', 'null_value'],
  ])('patchForm 拒絕 patch %#', async (patch, field, reason) => {
    await expect(formService.patchForm(1, patch)).rejects.toMatchObject({ code: 'INVALID_FORM', field, reason });
    expect(db.query).not.toHaveBeenCalled();
  });

  test('patchForm 只更新 title，fields 以 null 交給 COALESCE 保留', async () => {
    const updated = { id: 1, title: '新標題', fields: [{ key: 'old', label: '舊欄', type: 'text' }], status: 'draft' };
    db.query
      .mockResolvedValueOnce({ rows: [{ ...updated, title: '舊標題' }] })
      .mockResolvedValueOnce({ rows: [updated] });
    await expect(formService.patchForm(1, { title: '新標題' })).resolves.toEqual(updated);
    expect(db.query).toHaveBeenNthCalledWith(2, expect.stringContaining('title=COALESCE($1,title)'), ['新標題', null, 1]);
  });

  test('patchForm 只更新 fields，title 維持原值', async () => {
    const fields = [{ key: 'new_field', label: '新欄', type: 'yesno' }];
    const updated = { id: 1, title: '原標題', fields, status: 'draft' };
    db.query.mockResolvedValueOnce({ rows: [updated] }).mockResolvedValueOnce({ rows: [updated] });
    await expect(formService.patchForm(1, { fields })).resolves.toEqual(updated);
    expect(db.query).toHaveBeenNthCalledWith(2, expect.any(String), [null, JSON.stringify(fields), 1]);
  });

  test('patchForm id 找不到時 FORM_NOT_FOUND', async () => {
    db.query.mockResolvedValue({ rows: [] });
    await expect(formService.patchForm(404, { title: '合法' })).rejects.toMatchObject({ code: 'FORM_NOT_FOUND' });
  });

  test('patchForm 已發佈時 FORM_ALREADY_PUBLISHED 且不 UPDATE', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1, status: 'published' }] });
    await expect(formService.patchForm(1, { title: '' })).rejects.toMatchObject({ code: 'FORM_ALREADY_PUBLISHED' });
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  test('publishForm 將 draft 發佈且 token 不變', async () => {
    const draft = { id: 1, token: 'draft-token', status: 'draft', fields: [{ key: 'note' }] };
    const published = { ...draft, status: 'published' };
    db.query.mockResolvedValueOnce({ rows: [draft] }).mockResolvedValueOnce({ rows: [published] });
    await expect(formService.publishForm(1)).resolves.toEqual(published);
    expect(db.query).toHaveBeenNthCalledWith(2, expect.stringContaining("SET status='published'"), [1]);
    expect(published.token).toBe(draft.token);
  });

  test('publishForm 已 published 直接回現狀，不 UPDATE', async () => {
    const published = { id: 1, token: 'same-token', status: 'published', fields: [{ key: 'note' }] };
    db.query.mockResolvedValue({ rows: [published] });
    await expect(formService.publishForm(1)).resolves.toBe(published);
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][0]).toContain('SELECT');
  });

  test.each([[], undefined, null])('publishForm draft fields=%p 時拒絕發佈', async (fields) => {
    db.query.mockResolvedValue({ rows: [{ id: 1, status: 'draft', fields }] });
    await expect(formService.publishForm(1)).rejects.toMatchObject({
      code: 'INVALID_FORM', field: 'fields', reason: 'empty',
    });
    expect(db.query).toHaveBeenCalledTimes(1);
  });
});
