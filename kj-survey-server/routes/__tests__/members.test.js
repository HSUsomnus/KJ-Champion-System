'use strict';

const request = require('supertest');
const express = require('express');

jest.mock('../../services/formService', () => ({
  listMembers: jest.fn(),
}));

const formService = require('../../services/formService');
const { errorHandler } = require('../../middleware/errorHandler');

const buildApp = () => {
  const app = express();
  app.use('/members', require('../members'));
  app.use(errorHandler);
  return app;
};

describe('GET /members', () => {
  beforeEach(() => jest.resetAllMocks());
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => console.error.mockRestore());

  test('查詢成功 → 200 + 名單', async () => {
    formService.listMembers.mockResolvedValue([{ id: 1, name: '徐毓紘', star_rank: '金' }]);
    const res = await request(buildApp()).get('/members');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });

  test('DB 連線失敗 → 500，不是無回應掛起', async () => {
    formService.listMembers.mockRejectedValue(new Error('connect ETIMEDOUT'));
    const res = await request(buildApp()).get('/members');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
