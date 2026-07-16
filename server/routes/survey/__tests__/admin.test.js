'use strict';

const request = require('supertest');
const express = require('express');

jest.mock('../../../services/survey/adminAuthService', () => ({
  getMemberRole: jest.fn(),
  isAdminRole: jest.fn((role) => ['管理者', '負責人', '開發者'].includes(role)),
}));
jest.mock('../../../services/survey/adminFormService', () => ({
  listForms: jest.fn(),
  computeAttendance: jest.fn(),
  listSubmissions: jest.fn(),
}));

const { getMemberRole } = require('../../../services/survey/adminAuthService');
const adminFormService = require('../../../services/survey/adminFormService');

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

describe('後台任務清單 / 完成狀況（需登入）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMemberRole.mockResolvedValue('管理者');
  });

  test('GET /forms 未登入 → 401', async () => {
    const res = await request(buildApp()).get('/api/survey/admin/forms');
    expect(res.status).toBe(401);
    expect(adminFormService.listForms).not.toHaveBeenCalled();
  });

  test('GET /forms 登入 → 200 + 任務清單', async () => {
    adminFormService.listForms.mockResolvedValue([{ id: 1, title: '康九冠軍調查', submission_count: 3 }]);
    const res = await request(buildApp())
      .get('/api/survey/admin/forms')
      .set('X-Line-User-Id', 'U1234');
    expect(res.status).toBe(200);
    expect(res.body.data[0].submission_count).toBe(3);
  });

  test('GET /forms/:id/attendance 登入 → 200 + 完成狀況', async () => {
    adminFormService.computeAttendance.mockResolvedValue({
      form: { id: 1, title: '康九冠軍調查', status: 'published' },
      overall: { total: 40, done: 12, rate: 30 },
      groups: [],
    });
    const res = await request(buildApp())
      .get('/api/survey/admin/forms/1/attendance')
      .set('X-Line-User-Id', 'U1234');
    expect(res.status).toBe(200);
    expect(res.body.data.overall).toEqual({ total: 40, done: 12, rate: 30 });
  });

  test('GET /forms/:id/attendance 任務不存在 → 404', async () => {
    const err = new Error('找不到');
    err.code = 'FORM_NOT_FOUND';
    adminFormService.computeAttendance.mockRejectedValue(err);
    const res = await request(buildApp())
      .get('/api/survey/admin/forms/999/attendance')
      .set('X-Line-User-Id', 'U1234');
    expect(res.status).toBe(404);
  });

  test('GET /forms/:id/submissions 登入 → 200 + 明細', async () => {
    adminFormService.listSubmissions.mockResolvedValue({
      form: { id: 1, title: '康九冠軍調查', fields: [] },
      submissions: [{ id: 9, answers: { name: '徐毓紘' }, created_at: 't' }],
    });
    const res = await request(buildApp())
      .get('/api/survey/admin/forms/1/submissions')
      .set('X-Line-User-Id', 'U1234');
    expect(res.status).toBe(200);
    expect(res.body.data.submissions).toHaveLength(1);
  });

  test('GET /forms/:id/submissions 未登入 → 401', async () => {
    const res = await request(buildApp()).get('/api/survey/admin/forms/1/submissions');
    expect(res.status).toBe(401);
  });
});
