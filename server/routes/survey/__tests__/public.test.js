'use strict';

const request = require('supertest');
const express = require('express');

jest.mock('../../../config/db', () => ({ query: jest.fn() }));
jest.mock('../../../services/survey/formService', () => ({
  getPublishedFormByToken: jest.fn(),
  submitForm: jest.fn(),
  listMembers: jest.fn(),
}));

const db = require('../../../config/db');
const formService = require('../../../services/survey/formService');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/survey', require('../public'));
  return app;
};

describe('GET /api/survey/health', () => {
  beforeEach(() => jest.resetAllMocks());

  test('DB 連線成功 → 200', async () => {
    db.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });
    const res = await request(buildApp()).get('/api/survey/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('DB 連線失敗 → 500', async () => {
    db.query.mockRejectedValue(new Error('connect ETIMEDOUT'));
    const res = await request(buildApp()).get('/api/survey/health');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/survey/forms/:token', () => {
  beforeEach(() => jest.resetAllMocks());

  test('token 有效 → 200 + 表單資料', async () => {
    formService.getPublishedFormByToken.mockResolvedValue({ id: 1, title: '康九冠軍調查', fields: [] });
    const res = await request(buildApp()).get('/api/survey/forms/abc123');
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('康九冠軍調查');
  });

  test('token 無效 / 表單非 published → 404 統一錯誤，不洩漏原因', async () => {
    formService.getPublishedFormByToken.mockResolvedValue(null);
    const res = await request(buildApp()).get('/api/survey/forms/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/survey/members', () => {
  beforeEach(() => jest.resetAllMocks());

  test('回傳名單', async () => {
    formService.listMembers.mockResolvedValue([{ id: 1, name: '徐毓紘' }]);
    const res = await request(buildApp()).get('/api/survey/members');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: 1, name: '徐毓紘' }]);
  });
});

describe('POST /api/survey/forms/:token/submit', () => {
  beforeEach(() => jest.resetAllMocks());

  test('送出成功 → 200', async () => {
    formService.submitForm.mockResolvedValue({ id: 99, created_at: '2026-07-08T00:00:00Z' });
    const res = await request(buildApp())
      .post('/api/survey/forms/abc123/submit')
      .send({ answers: { name: '徐毓紘' } });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('表單不存在 → 404', async () => {
    const err = new Error('找不到');
    err.code = 'FORM_NOT_FOUND';
    formService.submitForm.mockRejectedValue(err);
    const res = await request(buildApp())
      .post('/api/survey/forms/bad-token/submit')
      .send({ answers: {} });
    expect(res.status).toBe(404);
  });
});
