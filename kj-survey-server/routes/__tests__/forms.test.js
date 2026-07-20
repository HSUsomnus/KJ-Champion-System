'use strict';

const request = require('supertest');
const express = require('express');

jest.mock('../../services/formService', () => ({
  getPublishedFormByToken: jest.fn(),
  listConfirmedMembers: jest.fn(),
  validateAnswers: jest.fn(),
  submitForm: jest.fn(),
}));

const formService = require('../../services/formService');
const { errorHandler } = require('../../middleware/errorHandler');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/forms', require('../forms'));
  app.use(errorHandler);
  return app;
};

describe('GET /forms/:token', () => {
  beforeEach(() => jest.resetAllMocks());
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => console.error.mockRestore());

  test('token 有效 → 200 + 表單資料', async () => {
    formService.getPublishedFormByToken.mockResolvedValue({ id: 1, title: '康九冠軍調查', fields: [] });
    const res = await request(buildApp()).get('/forms/abc123');
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('康九冠軍調查');
  });

  test('token 無效 / 表單非 published → 404 統一錯誤，不洩漏原因', async () => {
    formService.getPublishedFormByToken.mockResolvedValue(null);
    const res = await request(buildApp()).get('/forms/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('DB 連線失敗 → 500，不是無回應掛起', async () => {
    formService.getPublishedFormByToken.mockRejectedValue(new Error('connect ETIMEDOUT'));
    const res = await request(buildApp()).get('/forms/abc123');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /forms/:token/members', () => {
  beforeEach(() => jest.resetAllMocks());

  test('無效 token → 404，且不查詢成員', async () => {
    formService.getPublishedFormByToken.mockResolvedValue(null);

    const res = await request(buildApp()).get('/forms/bad-token/members');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: '找不到此表單，請確認連結是否正確' });
    expect(formService.listConfirmedMembers).not.toHaveBeenCalled();
  });

  test('有效 token → 200，只回傳 confirmed 成員', async () => {
    formService.getPublishedFormByToken.mockResolvedValue({ id: 1, status: 'published' });
    formService.listConfirmedMembers.mockResolvedValue([
      { name: '王小明', star_rank: '一星' },
      { name: '陳小華', star_rank: '二星' },
    ]);

    const res = await request(buildApp()).get('/forms/abc123/members');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: [
        { name: '王小明', star_rank: '一星' },
        { name: '陳小華', star_rank: '二星' },
      ],
    });
  });

  test('每筆資料只保留 name 與 star_rank', async () => {
    formService.getPublishedFormByToken.mockResolvedValue({ id: 1, status: 'published' });
    formService.listConfirmedMembers.mockResolvedValue([
      {
        id: 9,
        name: '王小明',
        star_rank: '一星',
        status: 'confirmed',
        recommender_name: '陳推薦人',
      },
    ]);

    const res = await request(buildApp()).get('/forms/abc123/members');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ name: '王小明', star_rank: '一星' }]);
  });
});

describe('POST /forms/:token/submit', () => {
  beforeEach(() => jest.resetAllMocks());
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => console.error.mockRestore());

  test('token 無效（查無已發佈表單）→ 404，不驗證也不送出', async () => {
    formService.getPublishedFormByToken.mockResolvedValue(null);

    const res = await request(buildApp())
      .post('/forms/bad-token/submit')
      .send({ answers: {} });

    expect(res.status).toBe(404);
    expect(formService.validateAnswers).not.toHaveBeenCalled();
    expect(formService.submitForm).not.toHaveBeenCalled();
  });

  test('驗證失敗 → 400 { error, field, reason }，不呼叫 submitForm（H-2：失敗不寫 DB）', async () => {
    formService.getPublishedFormByToken.mockResolvedValue({ id: 1, fields: [] });
    formService.validateAnswers.mockReturnValue({ valid: false, field: 'name', reason: 'required' });

    const res = await request(buildApp())
      .post('/forms/abc123/submit')
      .send({ answers: {} });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'validation_failed', field: 'name', reason: 'required' });
    expect(formService.submitForm).not.toHaveBeenCalled();
  });

  test('驗證通過 → 送出成功 200', async () => {
    formService.getPublishedFormByToken.mockResolvedValue({ id: 1, fields: [] });
    formService.validateAnswers.mockReturnValue({ valid: true });
    formService.submitForm.mockResolvedValue({ id: 99, created_at: '2026-07-08T00:00:00Z' });

    const res = await request(buildApp())
      .post('/forms/abc123/submit')
      .send({ answers: { name: '徐毓紘' } });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(formService.submitForm).toHaveBeenCalledWith('abc123', { name: '徐毓紘' });
  });

  test('驗證通過但 submitForm 內部才發現表單不存在（TOCTOU）→ 404', async () => {
    formService.getPublishedFormByToken.mockResolvedValue({ id: 1, fields: [] });
    formService.validateAnswers.mockReturnValue({ valid: true });
    const err = new Error('找不到');
    err.code = 'FORM_NOT_FOUND';
    formService.submitForm.mockRejectedValue(err);

    const res = await request(buildApp())
      .post('/forms/abc123/submit')
      .send({ answers: {} });

    expect(res.status).toBe(404);
  });

  test('未預期錯誤（如 DB 掛了）→ 500，不洩漏內部訊息', async () => {
    formService.getPublishedFormByToken.mockResolvedValue({ id: 1, fields: [] });
    formService.validateAnswers.mockReturnValue({ valid: true });
    formService.submitForm.mockRejectedValue(new Error('connect ETIMEDOUT'));

    const res = await request(buildApp())
      .post('/forms/abc123/submit')
      .send({ answers: {} });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).not.toMatch(/ETIMEDOUT/);
  });
});
