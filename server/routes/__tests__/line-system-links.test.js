'use strict';

jest.mock('../../middleware/auth', () => ({
  optionalLineUser: (req, _res, next) => next(),
  verifyLineUser: (req, _res, next) => next(),
}));
jest.mock('../../config/lineConfig', () => ({
  isValidLineUserId: jest.fn(),
  isValidLineTargetId: jest.fn(),
}));
jest.mock('../../services/lineService', () => ({}));
jest.mock('../../services/calendarService', () => ({}));
jest.mock('../../services/agendaService', () => ({}));
jest.mock('../../services/memberDbService', () => ({}));

const request = require('supertest');
const express = require('express');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  const lineRouter = require('../line');
  app.use('/api/line', lineRouter);
  return app;
};

describe('GET /api/line/system-links', () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.LINE_ADD_FRIEND_URL;
    delete process.env.GROUP_CALENDAR_ID;
  });

  test('兩個 env 都有設 → 回傳正確 URL', async () => {
    process.env.LINE_ADD_FRIEND_URL = 'https://line.me/R/ti/p/@test';
    process.env.GROUP_CALENDAR_ID = 'abc123@group.calendar.google.com';

    const app = buildApp();
    const res = await request(app).get('/api/line/system-links');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.lineAddFriendUrl).toBe('https://line.me/R/ti/p/@test');
    expect(res.body.data.calendarAddUrl).toContain('https://calendar.google.com/calendar/render?cid=');
    expect(res.body.data.calendarAddUrl).toContain(encodeURIComponent('abc123@group.calendar.google.com'));
  });

  test('兩個 env 都沒設 → 兩個欄位都是 null', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/line/system-links');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.lineAddFriendUrl).toBeNull();
    expect(res.body.data.calendarAddUrl).toBeNull();
  });

  test('只有 LINE_ADD_FRIEND_URL → calendarAddUrl 為 null', async () => {
    process.env.LINE_ADD_FRIEND_URL = 'https://line.me/R/ti/p/@test';

    const app = buildApp();
    const res = await request(app).get('/api/line/system-links');

    expect(res.status).toBe(200);
    expect(res.body.data.lineAddFriendUrl).toBe('https://line.me/R/ti/p/@test');
    expect(res.body.data.calendarAddUrl).toBeNull();
  });
});
