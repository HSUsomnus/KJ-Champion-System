'use strict';

const request = require('supertest');
const express = require('express');

jest.mock('../../services/adminAuthService', () => ({
  getMemberRole: jest.fn(),
  isAdminRole: jest.fn((role) => ['管理者', '負責人', '開發者'].includes(role)),
}));

const { getMemberRole } = require('../../services/adminAuthService');

const buildApp = () => {
  const app = express();
  app.use('/admin-auth', require('../adminAuth'));
  return app;
};

describe('GET /admin-auth/me', () => {
  beforeEach(() => jest.clearAllMocks());

  test('沒有 X-Line-User-Id header → 401', async () => {
    const res = await request(buildApp()).get('/admin-auth/me');
    expect(res.status).toBe(401);
  });

  test('角色不足 → 403', async () => {
    getMemberRole.mockResolvedValue('一般人');
    const res = await request(buildApp())
      .get('/admin-auth/me')
      .set('X-Line-User-Id', 'U9999');
    expect(res.status).toBe(403);
  });

  test('角色足夠 → 200 + 回傳 admin 資料', async () => {
    getMemberRole.mockResolvedValue('管理者');
    const res = await request(buildApp())
      .get('/admin-auth/me')
      .set('X-Line-User-Id', 'U1234');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ lineId: 'U1234', role: '管理者' });
  });
});
