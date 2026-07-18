'use strict';

jest.mock('../../services/adminAuthService', () => ({
  verifyAdminJwt: jest.fn(),
  getMemberRole: jest.fn(),
  isAdminRole: jest.fn(),
}));

const adminAuthService = require('../../services/adminAuthService');
const { requireAdminSession } = require('../requireAdminSession');

const buildRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('requireAdminSession', () => {
  beforeEach(() => jest.clearAllMocks());

  test('無 Authorization header → 401，不驗 JWT', async () => {
    const req = { headers: {} };
    const res = buildRes();
    const next = jest.fn();

    await requireAdminSession(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    expect(adminAuthService.verifyAdminJwt).not.toHaveBeenCalled();
  });

  test('非 Bearer scheme → 401', async () => {
    const req = { headers: { authorization: 'Basic abc123' } };
    const res = buildRes();
    const next = jest.fn();

    await requireAdminSession(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('JWT 過期/竄改 → verifyAdminJwt throw → 401', async () => {
    adminAuthService.verifyAdminJwt.mockImplementation(() => {
      throw new Error('jwt expired');
    });
    const req = { headers: { authorization: 'Bearer bad.token' } };
    const res = buildRes();
    const next = jest.fn();

    await requireAdminSession(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('JWT 有效但已撤權（DB role 不足）→ 403', async () => {
    adminAuthService.verifyAdminJwt.mockReturnValue({ lineId: 'U9999' });
    adminAuthService.getMemberRole.mockResolvedValue('一般人');
    adminAuthService.isAdminRole.mockReturnValue(false);
    const req = { headers: { authorization: 'Bearer good.token' } };
    const res = buildRes();
    const next = jest.fn();

    await requireAdminSession(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('JWT 有效 + 角色足夠 → 放行，req.admin 帶正確資料（每次都重查 DB，非信任 JWT）', async () => {
    adminAuthService.verifyAdminJwt.mockReturnValue({ lineId: 'U1234' });
    adminAuthService.getMemberRole.mockResolvedValue('管理者');
    adminAuthService.isAdminRole.mockReturnValue(true);
    const req = { headers: { authorization: 'Bearer good.token' } };
    const res = buildRes();
    const next = jest.fn();

    await requireAdminSession(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.admin).toEqual({ lineId: 'U1234', role: '管理者' });
    expect(adminAuthService.getMemberRole).toHaveBeenCalledWith('U1234');
  });
});
