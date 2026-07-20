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
