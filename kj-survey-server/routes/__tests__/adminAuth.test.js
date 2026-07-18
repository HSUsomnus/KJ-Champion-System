'use strict';

const request = require('supertest');
const express = require('express');

jest.mock('../../services/adminAuthService', () => ({
  buildLineLoginUrl: jest.fn(),
  verifyAndConsumeState: jest.fn(),
  exchangeCodeForIdToken: jest.fn(),
  verifyLineIdToken: jest.fn(),
  getMemberRole: jest.fn(),
  isAdminRole: jest.fn(),
  issueAdminJwt: jest.fn(),
}));

const adminAuthService = require('../../services/adminAuthService');

const FRONTEND_URL = 'http://localhost:3000';

const buildApp = () => {
  const app = express();
  app.use('/admin-auth', require('../adminAuth'));
  return app;
};

describe('GET /admin-auth/line-login', () => {
  beforeEach(() => jest.clearAllMocks());

  test('導向 LINE 授權頁', async () => {
    adminAuthService.buildLineLoginUrl.mockReturnValue('https://access.line.me/oauth2/v2.1/authorize?foo=bar');
    const res = await request(buildApp()).get('/admin-auth/line-login');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://access.line.me/oauth2/v2.1/authorize?foo=bar');
  });
});

describe('GET /admin-auth/line-callback', () => {
  beforeEach(() => jest.clearAllMocks());

  test('缺 code → 導回 admin 頁帶 authError=missing_params，不觸碰後續步驟', async () => {
    const res = await request(buildApp()).get('/admin-auth/line-callback').query({ state: 's' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`${FRONTEND_URL}/admin?authError=missing_params`);
    expect(adminAuthService.verifyAndConsumeState).not.toHaveBeenCalled();
  });

  test('缺 state → 導回 admin 頁帶 authError=missing_params', async () => {
    const res = await request(buildApp()).get('/admin-auth/line-callback').query({ code: 'c' });
    expect(res.headers.location).toBe(`${FRONTEND_URL}/admin?authError=missing_params`);
  });

  test('LINE 回傳 error 參數 → 導回 admin 頁帶 authError=missing_params', async () => {
    const res = await request(buildApp())
      .get('/admin-auth/line-callback')
      .query({ error: 'access_denied', code: 'c', state: 's' });
    expect(res.headers.location).toBe(`${FRONTEND_URL}/admin?authError=missing_params`);
  });

  test('state 驗證失敗（竄改/過期/重放）→ authError=invalid_state', async () => {
    adminAuthService.verifyAndConsumeState.mockReturnValue(false);
    const res = await request(buildApp())
      .get('/admin-auth/line-callback')
      .query({ code: 'c', state: 'bad-state' });
    expect(res.headers.location).toBe(`${FRONTEND_URL}/admin?authError=invalid_state`);
    expect(adminAuthService.exchangeCodeForIdToken).not.toHaveBeenCalled();
  });

  test('code 換 id_token 失敗 → authError=token_exchange_failed', async () => {
    adminAuthService.verifyAndConsumeState.mockReturnValue(true);
    adminAuthService.exchangeCodeForIdToken.mockRejectedValue(new Error('boom'));
    const res = await request(buildApp())
      .get('/admin-auth/line-callback')
      .query({ code: 'c', state: 's' });
    expect(res.headers.location).toBe(`${FRONTEND_URL}/admin?authError=token_exchange_failed`);
  });

  test('LINE 驗簽失敗 → authError=verify_failed', async () => {
    adminAuthService.verifyAndConsumeState.mockReturnValue(true);
    adminAuthService.exchangeCodeForIdToken.mockResolvedValue('id.token');
    adminAuthService.verifyLineIdToken.mockRejectedValue(new Error('boom'));
    const res = await request(buildApp())
      .get('/admin-auth/line-callback')
      .query({ code: 'c', state: 's' });
    expect(res.headers.location).toBe(`${FRONTEND_URL}/admin?authError=verify_failed`);
  });

  test('角色不足 → authError=forbidden', async () => {
    adminAuthService.verifyAndConsumeState.mockReturnValue(true);
    adminAuthService.exchangeCodeForIdToken.mockResolvedValue('id.token');
    adminAuthService.verifyLineIdToken.mockResolvedValue({ sub: 'U9999' });
    adminAuthService.getMemberRole.mockResolvedValue('一般人');
    adminAuthService.isAdminRole.mockReturnValue(false);
    const res = await request(buildApp())
      .get('/admin-auth/line-callback')
      .query({ code: 'c', state: 's' });
    expect(res.headers.location).toBe(`${FRONTEND_URL}/admin?authError=forbidden`);
    expect(adminAuthService.issueAdminJwt).not.toHaveBeenCalled();
  });

  test('全部通過 → 導回 admin 頁帶 #token（不受 state/query 控制目的地，防 open redirect）', async () => {
    adminAuthService.verifyAndConsumeState.mockReturnValue(true);
    adminAuthService.exchangeCodeForIdToken.mockResolvedValue('id.token');
    adminAuthService.verifyLineIdToken.mockResolvedValue({ sub: 'U1234' });
    adminAuthService.getMemberRole.mockResolvedValue('管理者');
    adminAuthService.isAdminRole.mockReturnValue(true);
    adminAuthService.issueAdminJwt.mockReturnValue('signed.jwt.token');

    const res = await request(buildApp())
      .get('/admin-auth/line-callback')
      .query({ code: 'c', state: 's' });

    expect(res.headers.location).toBe(`${FRONTEND_URL}/admin#token=signed.jwt.token`);
  });
});
