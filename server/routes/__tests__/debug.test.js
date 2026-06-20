'use strict';

// Mock external dependencies before any require
jest.mock('../../config/db');
jest.mock('https');

const request = require('supertest');
const express = require('express');
const https = require('https');
const db = require('../../config/db');
const crypto = require('crypto');
const { EventEmitter } = require('events');

// ── Shared test fixtures ───────────────────────────────────────────────────

const FAKE_CREDS = {
  client_email: 'test@test-project.iam.gserviceaccount.com',
  private_key: '-----BEGIN PRIVATE KEY-----\nFAKE\n-----END PRIVATE KEY-----',
  private_key_id: 'key-abc',
  project_id: 'test-project',
};

const FAKE_TOKEN_RESP = { access_token: 'test-access-token', expires_in: 3600 };
const FAKE_CALENDAR_RESP = { id: 'cal123@group.calendar.google.com', summary: '測試日曆' };

// Build a fake https call that emits data+end asynchronously
const buildHttpsMock = (body, statusCode = 200) => {
  const res = new EventEmitter();
  res.statusCode = statusCode;
  const req = { on: jest.fn().mockReturnThis(), write: jest.fn(), end: jest.fn(), destroy: jest.fn() };
  https.request.mockImplementationOnce((opts, cb) => {
    cb(res);
    process.nextTick(() => {
      res.emit('data', JSON.stringify(body));
      res.emit('end');
    });
    return req;
  });
};

// ── App setup ─────────────────────────────────────────────────────────────

let app;

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();

  // Mock crypto.createSign so tests don't need a real RSA private key
  jest.spyOn(crypto, 'createSign').mockReturnValue({
    update: jest.fn(),
    sign: jest.fn().mockReturnValue(Buffer.from('fake-signature')),
  });

  process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify(FAKE_CREDS);
  process.env.GROUP_CALENDAR_ID = 'test-cal@group.calendar.google.com';

  // Build a minimal app with only the debug router (avoids full server.js startup)
  app = express();
  app.use(express.json());
  const debugRouter = require('../debug');
  app.use('/api/debug', debugRouter);
});

afterEach(() => {
  jest.restoreAllMocks();
  delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  delete process.env.GROUP_CALENDAR_ID;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('GET /api/debug/health', () => {
  describe('all checks pass', () => {
    test('returns 200 with ok:true', async () => {
      // Mock: token exchange → calendar GET → (db below)
      buildHttpsMock(FAKE_TOKEN_RESP);
      buildHttpsMock(FAKE_CALENDAR_RESP);
      db.query.mockResolvedValue({ rows: [{ cnt: '42' }] });

      const res = await request(app).get('/api/debug/health');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    test('response contains ts, env, and checks fields', async () => {
      buildHttpsMock(FAKE_TOKEN_RESP);
      buildHttpsMock(FAKE_CALENDAR_RESP);
      db.query.mockResolvedValue({ rows: [{ cnt: '5' }] });

      const res = await request(app).get('/api/debug/health');

      expect(res.body).toHaveProperty('ts');
      expect(res.body).toHaveProperty('env');
      expect(res.body).toHaveProperty('checks');
      expect(res.body.checks).toHaveProperty('credentials');
      expect(res.body.checks).toHaveProperty('token');
      expect(res.body.checks).toHaveProperty('calendar');
      expect(res.body.checks).toHaveProperty('db');
    });

    test('credentials check includes SA email in detail', async () => {
      buildHttpsMock(FAKE_TOKEN_RESP);
      buildHttpsMock(FAKE_CALENDAR_RESP);
      db.query.mockResolvedValue({ rows: [{ cnt: '0' }] });

      const res = await request(app).get('/api/debug/health');

      expect(res.body.checks.credentials.ok).toBe(true);
      expect(res.body.checks.credentials.detail).toContain(FAKE_CREDS.client_email);
    });

    test('db check reports event count', async () => {
      buildHttpsMock(FAKE_TOKEN_RESP);
      buildHttpsMock(FAKE_CALENDAR_RESP);
      db.query.mockResolvedValue({ rows: [{ cnt: '99' }] });

      const res = await request(app).get('/api/debug/health');

      expect(res.body.checks.db.ok).toBe(true);
      expect(res.body.checks.db.detail).toContain('99');
    });
  });

  describe('credentials check fails', () => {
    test('returns 503 when GOOGLE_SERVICE_ACCOUNT_JSON is missing', async () => {
      delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
      db.query.mockResolvedValue({ rows: [{ cnt: '0' }] });

      const res = await request(app).get('/api/debug/health');

      expect(res.status).toBe(503);
      expect(res.body.ok).toBe(false);
      expect(res.body.checks.credentials.ok).toBe(false);
    });

    test('token and calendar checks are skipped when credentials fail', async () => {
      delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
      db.query.mockResolvedValue({ rows: [{ cnt: '0' }] });

      const res = await request(app).get('/api/debug/health');

      // token and calendar marked as skipped (ok:false with skip message)
      expect(res.body.checks.token.ok).toBe(false);
      expect(res.body.checks.calendar.ok).toBe(false);
    });
  });

  describe('token check fails', () => {
    test('returns 503 when Google token exchange returns error', async () => {
      buildHttpsMock({ error: 'invalid_grant' }, 401);
      db.query.mockResolvedValue({ rows: [{ cnt: '0' }] });

      const res = await request(app).get('/api/debug/health');

      expect(res.status).toBe(503);
      expect(res.body.checks.token.ok).toBe(false);
    });

    test('calendar check is skipped when token fails', async () => {
      buildHttpsMock({ error: 'invalid_grant' }, 401);
      db.query.mockResolvedValue({ rows: [{ cnt: '0' }] });

      const res = await request(app).get('/api/debug/health');

      expect(res.body.checks.calendar.ok).toBe(false);
      expect(res.body.checks.calendar.detail).toContain('跳過');
    });
  });

  describe('calendar check fails', () => {
    test('returns 503 when calendar API returns an error body', async () => {
      buildHttpsMock(FAKE_TOKEN_RESP);
      buildHttpsMock({ error: { code: 403, message: 'The caller does not have permission' } });
      db.query.mockResolvedValue({ rows: [{ cnt: '0' }] });

      const res = await request(app).get('/api/debug/health');

      expect(res.status).toBe(503);
      expect(res.body.checks.calendar.ok).toBe(false);
    });

    test('returns 503 when GROUP_CALENDAR_ID is not set', async () => {
      delete process.env.GROUP_CALENDAR_ID;
      buildHttpsMock(FAKE_TOKEN_RESP);
      db.query.mockResolvedValue({ rows: [{ cnt: '0' }] });

      const res = await request(app).get('/api/debug/health');

      expect(res.status).toBe(503);
      expect(res.body.checks.calendar.ok).toBe(false);
      expect(res.body.checks.calendar.detail).toContain('GROUP_CALENDAR_ID');
    });
  });

  describe('db check fails', () => {
    test('returns 503 when DB query throws', async () => {
      buildHttpsMock(FAKE_TOKEN_RESP);
      buildHttpsMock(FAKE_CALENDAR_RESP);
      db.query.mockRejectedValue(new Error('ECONNREFUSED'));

      const res = await request(app).get('/api/debug/health');

      expect(res.status).toBe(503);
      expect(res.body.checks.db.ok).toBe(false);
      expect(res.body.checks.db.detail).toContain('ECONNREFUSED');
    });
  });
});
