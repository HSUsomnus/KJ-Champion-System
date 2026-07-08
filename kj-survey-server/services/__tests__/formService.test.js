'use strict';

jest.mock('../../config/db', () => ({
  query: jest.fn(),
}));

const db = require('../../config/db');
const formService = require('../formService');

const PUBLISHED_FORM = {
  id: 1,
  title: '康九冠軍調查',
  token: 'abc123',
  fields: [
    { key: 'name', label: '姓名', type: 'searchable_select', options: { source: 'survey_members', field: 'name' } },
    { key: 'star_rank', label: '夥伴星等', type: 'searchable_select', options: { source: 'static', values: ['白', '綠', '橙', '紅', '紫'] } },
    { key: 'recommender', label: '推薦人', type: 'searchable_select', options: { source: 'survey_members', field: 'name' } },
    { key: 'join_master', label: '天驥加盟主', type: 'yesno' },
  ],
};

describe('formService.getPublishedFormByToken', () => {
  beforeEach(() => jest.resetAllMocks());

  test('token 有效 → 回傳表單', async () => {
    db.query.mockResolvedValue({ rows: [PUBLISHED_FORM] });
    const form = await formService.getPublishedFormByToken('abc123');
    expect(form).toEqual(PUBLISHED_FORM);
  });

  test('token 無效 / 表單非 published → null', async () => {
    db.query.mockResolvedValue({ rows: [] });
    const form = await formService.getPublishedFormByToken('not-exist');
    expect(form).toBeNull();
  });
});

describe('formService.submitForm', () => {
  beforeEach(() => jest.resetAllMocks());

  test('token 無效 → 丟 FORM_NOT_FOUND', async () => {
    db.query.mockResolvedValue({ rows: [] });
    await expect(formService.submitForm('bad-token', { name: '徐毓紘' })).rejects.toMatchObject({
      code: 'FORM_NOT_FOUND',
    });
  });

  test('新姓名（不在既有名單）→ 先寫入 survey_members(pending) 再寫入 submission', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [PUBLISHED_FORM] }) // getPublishedFormByToken
      .mockResolvedValueOnce({ rows: [{ id: 1, name: '徐毓紘', star_rank: '橙', recommender_name: '李冠陞', status: 'confirmed' }] }) // listMembers
      .mockResolvedValueOnce({ rows: [] }) // insert new member for 'name' field value if new
      .mockResolvedValueOnce({ rows: [] }) // insert new member for 'recommender' field value if new
      .mockResolvedValueOnce({ rows: [{ id: 99, created_at: '2026-07-08T00:00:00Z' }] }); // insert submission

    const result = await formService.submitForm('abc123', {
      name: '新夥伴A',
      star_rank: '白',
      recommender: '新夥伴B',
      join_master: 'yes',
    });

    expect(result).toEqual({ id: 99, created_at: '2026-07-08T00:00:00Z' });
    // 4 次 query：查表單 + 查名單 + 2 次新姓名 insert + submission insert = 5
    expect(db.query).toHaveBeenCalledTimes(5);
    expect(db.query.mock.calls[2][0]).toContain('INSERT INTO survey_members');
    expect(db.query.mock.calls[2][1]).toEqual(['新夥伴A']);
    expect(db.query.mock.calls[3][1]).toEqual(['新夥伴B']);
  });

  test('既有姓名（已在名單內）→ 不重複寫入 survey_members', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [PUBLISHED_FORM] })
      .mockResolvedValueOnce({ rows: [{ id: 1, name: '徐毓紘', star_rank: '橙', recommender_name: '李冠陞', status: 'confirmed' }] })
      .mockResolvedValueOnce({ rows: [{ id: 100, created_at: '2026-07-08T00:00:00Z' }] });

    await formService.submitForm('abc123', {
      name: '徐毓紘',
      star_rank: '橙',
      recommender: '徐毓紘',
      join_master: 'yes',
    });

    // 查表單 + 查名單 + submission insert = 3（沒有新姓名 insert）
    expect(db.query).toHaveBeenCalledTimes(3);
  });
});
