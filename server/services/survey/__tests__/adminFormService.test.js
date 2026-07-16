'use strict';

jest.mock('../../../config/db', () => ({ query: jest.fn() }));

const db = require('../../../config/db');
const adminFormService = require('../adminFormService');

const FORM_ROW = { id: 1, title: '康九冠軍調查', token: 't', fields: [], status: 'published' };
const MEMBERS = [
  { name: '李冠陞', star_rank: '紫', recommender_name: '' },
  { name: '徐毓紘', star_rank: '橙', recommender_name: '李冠陞' },
  { name: '曹琬琦', star_rank: '橙', recommender_name: '李冠陞' },
  { name: '黃仲龍', star_rank: '綠', recommender_name: '曹琬琦' },
];

beforeEach(() => jest.resetAllMocks());

describe('adminFormService.listForms', () => {
  test('回傳所有表單 + 填寫筆數', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: 1, title: '康九冠軍調查', token: 't', status: 'published', submission_count: 3 }],
    });
    const forms = await adminFormService.listForms();
    expect(forms).toHaveLength(1);
    expect(forms[0].submission_count).toBe(3);
  });
});

describe('adminFormService.computeAttendance', () => {
  test('表單不存在 → FORM_NOT_FOUND', async () => {
    db.query.mockResolvedValueOnce({ rows: [] }); // getFormById
    await expect(adminFormService.computeAttendance(999)).rejects.toMatchObject({
      code: 'FORM_NOT_FOUND',
    });
  });

  test('按推薦人分組 + 進度 + 整體完成率計算正確', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [FORM_ROW] }) // getFormById
      .mockResolvedValueOnce({ rows: MEMBERS }) // members
      .mockResolvedValueOnce({ rows: [{ answers: { name: '徐毓紘' } }, { answers: { name: '黃仲龍' } }] }); // subs

    const result = await adminFormService.computeAttendance(1);

    // 整體：4 人應填、2 人完成 → 50%
    expect(result.overall).toEqual({ total: 4, done: 2, rate: 50 });

    // 分組（按 total desc）：李冠陞(2 人) 排第一
    expect(result.groups[0].recommender).toBe('李冠陞');
    expect(result.groups[0].total).toBe(2);
    expect(result.groups[0].done).toBe(1);

    // 徐毓紘 已完成、曹琬琦 未完成
    const liGroup = result.groups.find((g) => g.recommender === '李冠陞');
    expect(liGroup.members.find((m) => m.name === '徐毓紘').completed).toBe(true);
    expect(liGroup.members.find((m) => m.name === '曹琬琦').completed).toBe(false);

    // 推薦人為空 → 歸入「未分組」
    const ungrouped = result.groups.find((g) => g.recommender === '未分組');
    expect(ungrouped.members[0].name).toBe('李冠陞');
    expect(ungrouped.members[0].completed).toBe(false);
  });

  test('無人填寫 → 完成率 0，所有人 incomplete', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [FORM_ROW] })
      .mockResolvedValueOnce({ rows: MEMBERS })
      .mockResolvedValueOnce({ rows: [] });

    const result = await adminFormService.computeAttendance(1);
    expect(result.overall).toEqual({ total: 4, done: 0, rate: 0 });
    expect(result.groups.every((g) => g.done === 0)).toBe(true);
  });

  test('填寫者不在名冊內（pending 新姓名）不灌水完成數', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [FORM_ROW] })
      .mockResolvedValueOnce({ rows: MEMBERS })
      .mockResolvedValueOnce({ rows: [{ answers: { name: '路人甲' } }] }); // 不在 MEMBERS

    const result = await adminFormService.computeAttendance(1);
    expect(result.overall.done).toBe(0);
  });
});

describe('adminFormService.listSubmissions', () => {
  test('表單不存在 → FORM_NOT_FOUND', async () => {
    db.query.mockResolvedValueOnce({ rows: [] }); // getFormById
    await expect(adminFormService.listSubmissions(999)).rejects.toMatchObject({
      code: 'FORM_NOT_FOUND',
    });
  });

  test('回傳表單欄位定義 + 逐筆明細', async () => {
    const fields = [{ key: 'name', label: '姓名', type: 'searchable_select' }];
    db.query
      .mockResolvedValueOnce({ rows: [{ ...FORM_ROW, fields }] }) // getFormById
      .mockResolvedValueOnce({ rows: [{ id: 9, answers: { name: '徐毓紘' }, created_at: 't' }] }); // submissions

    const data = await adminFormService.listSubmissions(1);
    expect(data.form.fields).toEqual(fields);
    expect(data.submissions).toHaveLength(1);
    expect(data.submissions[0].answers.name).toBe('徐毓紘');
  });
});
