'use strict';

jest.mock('../../config/db', () => ({
  query: jest.fn(),
}));

const db = require('../../config/db');
const {
  computeAttendance,
  listConfirmedMembersWithRecommender,
} = require('../attendanceService');

describe('attendanceService.listConfirmedMembersWithRecommender', () => {
  beforeEach(() => jest.resetAllMocks());

  test('未傳 executor 時使用 db.query，並只查 confirmed 與推薦人欄位', async () => {
    const members = [{ name: '王小明', recommender_name: '陳推薦' }];
    db.query.mockResolvedValue({ rows: members });

    await expect(listConfirmedMembersWithRecommender()).resolves.toEqual(members);
    expect(db.query).toHaveBeenCalledWith(
      "SELECT name, star_rank, recommender_name FROM survey_members WHERE status = 'confirmed' ORDER BY name"
    );
  });

  test('可改用傳入的 client', async () => {
    const client = { query: jest.fn() };
    const members = [{ name: '王小明', recommender_name: '陳推薦' }];
    client.query.mockResolvedValue({ rows: members });

    await expect(listConfirmedMembersWithRecommender(client)).resolves.toEqual(members);
    expect(client.query).toHaveBeenCalledWith(
      "SELECT name, star_rank, recommender_name FROM survey_members WHERE status = 'confirmed' ORDER BY name"
    );
    expect(db.query).not.toHaveBeenCalled();
  });
});

describe('attendanceService.computeAttendance', () => {
  test('母數完全以呼叫端傳入的 confirmed members 為準，不額外處理 pending', () => {
    const result = computeAttendance(
      [{ name: '已確認成員', recommender_name: '推薦人甲' }],
      [{ answers: { name: 'pending 成員' } }]
    );

    expect(result.totalMembers).toBe(1);
    expect(result.totalFilled).toBe(0);
    expect(result.groups[0].members).toEqual([{ name: '已確認成員', filled: false }]);
  });

  test('依推薦人分組，正確計算 total、filled，並標示未填者', () => {
    const result = computeAttendance(
      [
        { name: '王小明', recommender_name: '推薦人乙' },
        { name: '李小華', recommender_name: '推薦人甲' },
        { name: '陳小美', recommender_name: '推薦人甲' },
      ],
      [{ answers: { name: '李小華' } }, { answers: { name: '王小明' } }]
    );

    expect(result).toMatchObject({ totalMembers: 3, totalFilled: 2 });
    const expectedGroups = [
      { recommender: '推薦人甲', total: 2, filled: 1 },
      { recommender: '推薦人乙', total: 1, filled: 1 },
    ].sort((left, right) => left.recommender.localeCompare(right.recommender, 'zh-Hant'));
    expect(result.groups.map(({ recommender, total, filled }) => ({ recommender, total, filled })))
      .toEqual(expectedGroups);
    const recommenderAGroup = result.groups.find((group) => group.recommender === '推薦人甲');
    expect(recommenderAGroup.members).toEqual(expect.arrayContaining([
      { name: '陳小美', filled: false },
      { name: '李小華', filled: true },
    ]));
  });

  test('null、undefined、空字串與純空白推薦人全部歸入最後的無推薦人組', () => {
    const result = computeAttendance([
      { name: '甲', recommender_name: null },
      { name: '乙', recommender_name: undefined },
      { name: '丙', recommender_name: '' },
      { name: '丁', recommender_name: '   ' },
      { name: '戊', recommender_name: '有推薦人' },
    ], []);

    expect(result.groups).toHaveLength(2);
    expect(result.groups[1]).toMatchObject({ recommender: null, total: 4, filled: 0 });
    expect(result.groups[1].members.map((member) => member.name)).toEqual(
      ['甲', '乙', '丙', '丁'].sort((left, right) => left.localeCompare(right, 'zh-Hant'))
    );
  });

  test('姓名只差空白字元時仍視為不同字串，不做寬鬆比對', () => {
    const result = computeAttendance(
      [{ name: '𠮷田', recommender_name: '推薦人' }],
      [{ answers: { name: '𠮷田 ' } }]
    );

    expect(result.totalFilled).toBe(0);
    expect(result.groups[0].members[0]).toEqual({ name: '𠮷田', filled: false });
  });

  test('可用自訂 nameFieldKey 精確判定已填', () => {
    const result = computeAttendance(
      [{ name: '𠮷田', recommender_name: '推薦人' }],
      [{ answers: { member_name: '𠮷田' } }],
      'member_name'
    );

    expect(result.totalFilled).toBe(1);
  });

  test('member 的 star_rank 會原樣帶到輸出（點名表 UI 需要顯示星等）', () => {
    const result = computeAttendance(
      [{ name: '王小明', star_rank: '橙', recommender_name: '推薦人' }],
      []
    );

    expect(result.groups[0].members[0]).toEqual({ name: '王小明', star_rank: '橙', filled: false });
  });

  test('同名重複送出只算一次，總進度與組進度都不超過 total', () => {
    const result = computeAttendance(
      [{ name: '同名成員', recommender_name: '推薦人' }],
      [
        { answers: { name: '同名成員' } },
        { answers: { name: '同名成員' } },
      ]
    );

    expect(result).toMatchObject({ totalMembers: 1, totalFilled: 1 });
    expect(result.groups[0]).toMatchObject({ total: 1, filled: 1 });
    expect(result.groups[0].filled).toBeLessThanOrEqual(result.groups[0].total);
  });
});
