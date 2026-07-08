'use strict';

jest.mock('../../services/adminAuthService', () => ({
  getMemberRole: jest.fn(),
  isAdminRole: jest.fn((role) => ['管理者', '負責人', '開發者'].includes(role)),
}));

const { getMemberRole } = require('../../services/adminAuthService');
const { requireAdminRole } = require('../requireAdminRole');

const buildRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('requireAdminRole', () => {
  beforeEach(() => jest.clearAllMocks());

  test('沒有 X-Line-User-Id header → 401', async () => {
    const req = { headers: {} };
    const res = buildRes();
    const next = jest.fn();

    await requireAdminRole(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('有 header 但角色是一般人 → 403', async () => {
    getMemberRole.mockResolvedValue('一般人');
    const req = { headers: { 'x-line-user-id': 'U9999' } };
    const res = buildRes();
    const next = jest.fn();

    await requireAdminRole(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('查無此人（role 為 null） → 403', async () => {
    getMemberRole.mockResolvedValue(null);
    const req = { headers: { 'x-line-user-id': 'U0000' } };
    const res = buildRes();
    const next = jest.fn();

    await requireAdminRole(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('角色足夠 → 放行，req.admin 帶正確資料', async () => {
    getMemberRole.mockResolvedValue('管理者');
    const req = { headers: { 'x-line-user-id': 'U1234' } };
    const res = buildRes();
    const next = jest.fn();

    await requireAdminRole(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.admin).toEqual({ lineId: 'U1234', role: '管理者' });
  });
});
