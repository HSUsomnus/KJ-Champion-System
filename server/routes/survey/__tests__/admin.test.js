'use strict';

const request = require('supertest');
const express = require('express');

jest.mock('../../../services/survey/adminAuthService', () => ({
  getMemberRole: jest.fn(),
  isAdminRole: jest.fn((role) => ['管理者', '負責人', '開發者'].includes(role)),
}));

const { getMemberRole } = require('../../../services/survey/adminAuthService');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/survey/admin', require('../admin'));
  return app;
};

describe('GET /api/survey/admin/me', () => {
  beforeEach(() => jest.clearAllMocks());

  test('沒有 X-Line-User-Id header → 401', async () => {
    const res = await request(buildApp()).get('/api/survey/admin/me');
    expect(res.status).toBe(401);
  });

  test('角色不足 → 403', async () => {
    getMemberRole.mockResolvedValue('一般人');
    const res = await request(buildApp())
      .get('/api/survey/admin/me')
      .set('X-Line-User-Id', 'U9999');
    expect(res.status).toBe(403);
  });

  test('角色足夠 → 200 + 回傳 admin 資料', async () => {
    getMemberRole.mockResolvedValue('管理者');
    const res = await request(buildApp())
      .get('/api/survey/admin/me')
      .set('X-Line-User-Id', 'U1234');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ lineId: 'U1234', role: '管理者' });
  });
});
