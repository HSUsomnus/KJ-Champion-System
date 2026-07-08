'use strict';

const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');

jest.mock('../../services/adminAuthService', () => ({
  exchangeCodeForIdToken: jest.fn(),
  verifyIdToken: jest.fn(),
  getMemberRole: jest.fn(),
  isAdminRole: jest.fn((role) => ['管理者', '負責人', '開發者'].includes(role)),
  signSessionToken: jest.fn(() => 'signed-session-token'),
  verifySessionToken: jest.fn(),
  SESSION_TTL_SECONDS: 4 * 60 * 60,
}));

const adminAuthService = require('../../services/adminAuthService');

const buildApp = () => {
  process.env.APP_URL = 'https://kj-survey-dev.zeabur.app';
  process.env.FRONTEND_URL = 'https://kjcs-dev.pages.dev';
  process.env.LINE_CHANNEL_ID = 'test-channel-id';

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/admin-auth', require('../adminAuth'));
  return app;
};

describe('GET /admin-auth/line-login', () => {
  test('導向 LINE 授權頁，帶正確 client_id 與 redirect_uri', async () => {
    const res = await request(buildApp()).get('/admin-auth/line-login');

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('https://access.line.me/oauth2/v2.1/authorize');
    expect(res.headers.location).toContain('client_id=test-channel-id');
    expect(res.headers.location).toContain(
      encodeURIComponent('https://kj-survey-dev.zeabur.app/admin-auth/callback')
    );
  });
});

describe('GET /admin-auth/callback', () => {
  beforeEach(() => jest.clearAllMocks());

  test('角色足夠 → 設 session cookie、導回 /admin', async () => {
    adminAuthService.exchangeCodeForIdToken.mockResolvedValue('fake-id-token');
    adminAuthService.verifyIdToken.mockResolvedValue({ lineId: 'U1234', displayName: '測試' });
    adminAuthService.getMemberRole.mockResolvedValue('管理者');

    const res = await request(buildApp()).get('/admin-auth/callback?code=abc');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://kjcs-dev.pages.dev/admin');
    expect(res.headers['set-cookie']?.[0]).toContain('kj_survey_admin_session=signed-session-token');
    expect(res.headers['set-cookie']?.[0]).toContain('HttpOnly');
  });

  test('角色不足（一般人） → 導回 /admin?authError=forbidden，不設 cookie', async () => {
    adminAuthService.exchangeCodeForIdToken.mockResolvedValue('fake-id-token');
    adminAuthService.verifyIdToken.mockResolvedValue({ lineId: 'U9999', displayName: '一般夥伴' });
    adminAuthService.getMemberRole.mockResolvedValue('一般人');

    const res = await request(buildApp()).get('/admin-auth/callback?code=abc');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://kjcs-dev.pages.dev/admin?authError=forbidden');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  test('查無此人（role 為 null） → 導回 forbidden', async () => {
    adminAuthService.exchangeCodeForIdToken.mockResolvedValue('fake-id-token');
    adminAuthService.verifyIdToken.mockResolvedValue({ lineId: 'U0000', displayName: '陌生人' });
    adminAuthService.getMemberRole.mockResolvedValue(null);

    const res = await request(buildApp()).get('/admin-auth/callback?code=abc');

    expect(res.headers.location).toBe('https://kjcs-dev.pages.dev/admin?authError=forbidden');
  });

  test('缺少 code → 導回 missing_code', async () => {
    const res = await request(buildApp()).get('/admin-auth/callback');
    expect(res.headers.location).toBe('https://kjcs-dev.pages.dev/admin?authError=missing_code');
  });
});

describe('GET /admin-auth/me', () => {
  beforeEach(() => jest.clearAllMocks());

  test('沒有 session cookie → 401', async () => {
    const res = await request(buildApp()).get('/admin-auth/me');
    expect(res.status).toBe(401);
  });

  test('有效 session cookie → 200 + 回傳 admin 資料', async () => {
    adminAuthService.verifySessionToken.mockReturnValue({ lineId: 'U1234', role: '管理者' });

    const res = await request(buildApp())
      .get('/admin-auth/me')
      .set('Cookie', ['kj_survey_admin_session=valid-token']);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ lineId: 'U1234', role: '管理者' });
  });
});

describe('POST /admin-auth/logout', () => {
  test('清除 session cookie', async () => {
    const res = await request(buildApp()).post('/admin-auth/logout');
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']?.[0]).toContain('kj_survey_admin_session=;');
  });
});
