'use strict';

const request = require('supertest');
const express = require('express');

jest.mock('../../config/db', () => ({
  query: jest.fn(),
}));

const db = require('../../config/db');

const buildApp = () => {
  const app = express();
  app.use('/health', require('../health'));
  return app;
};

describe('GET /health', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('DB 連線成功 → 200', async () => {
    db.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });
    const res = await request(buildApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('DB 連線失敗 → 500', async () => {
    db.query.mockRejectedValue(new Error('connect ETIMEDOUT'));
    const res = await request(buildApp()).get('/health');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
