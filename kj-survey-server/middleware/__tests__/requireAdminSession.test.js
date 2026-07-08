'use strict';

process.env.SESSION_SECRET = 'test-session-secret';

const { requireAdminSession, SESSION_COOKIE } = require('../requireAdminSession');
const { signSessionToken } = require('../../services/adminAuthService');

const buildRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('requireAdminSession', () => {
  test('沒有 cookie → 401', () => {
    const req = { cookies: {} };
    const res = buildRes();
    const next = jest.fn();

    requireAdminSession(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('cookie 是偽造/過期的 token → 401', () => {
    const req = { cookies: { [SESSION_COOKIE]: 'bad-token' } };
    const res = buildRes();
    const next = jest.fn();

    requireAdminSession(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('有效 token → 放行，req.admin 帶正確資料', () => {
    const token = signSessionToken({ lineId: 'U1234', role: '管理者' });
    const req = { cookies: { [SESSION_COOKIE]: token } };
    const res = buildRes();
    const next = jest.fn();

    requireAdminSession(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.admin.lineId).toBe('U1234');
    expect(req.admin.role).toBe('管理者');
  });
});
