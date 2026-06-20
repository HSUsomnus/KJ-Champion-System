'use strict';

// Mock https before anything requires it
jest.mock('https');

const https = require('https');
const crypto = require('crypto');
const { EventEmitter } = require('events');

// Minimal fake credentials (no real RSA key — we mock createSign)
const FAKE_CREDS = {
  client_email: 'test@test-project.iam.gserviceaccount.com',
  private_key: '-----BEGIN PRIVATE KEY-----\nFAKEKEY\n-----END PRIVATE KEY-----',
  private_key_id: 'key-abc123',
  project_id: 'test-project',
};

const SUCCESS_TOKEN = { access_token: 'test-access-token', expires_in: 3600, token_type: 'Bearer' };

// Build a fake https request/response pair that resolves with `body`
const buildHttpsMock = (body, statusCode = 200) => {
  const res = new EventEmitter();
  res.statusCode = statusCode;
  const req = {
    on: jest.fn().mockReturnThis(),
    write: jest.fn(),
    end: jest.fn(),
    destroy: jest.fn(),
  };
  https.request.mockImplementation((opts, cb) => {
    cb(res);
    process.nextTick(() => {
      res.emit('data', JSON.stringify(body));
      res.emit('end');
    });
    return req;
  });
  return { res, req };
};

describe('googleAuth', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    // Mock RSA signing so tests don't need a real private key
    jest.spyOn(crypto, 'createSign').mockReturnValue({
      update: jest.fn(),
      sign: jest.fn().mockReturnValue(Buffer.from('fake-rsa-signature')),
    });
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify(FAKE_CREDS);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_PRIVATE_KEY;
  });

  // ── getServiceAccountAuth ──────────────────────────────────────────────────

  describe('getServiceAccountAuth', () => {
    test('returns null when no credentials env vars are set', () => {
      delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
      const { getServiceAccountAuth } = require('../googleAuth');
      expect(getServiceAccountAuth()).toBeNull();
    });

    test('parses GOOGLE_SERVICE_ACCOUNT_JSON and returns auth object', () => {
      const { getServiceAccountAuth } = require('../googleAuth');
      const auth = getServiceAccountAuth();
      expect(auth).not.toBeNull();
      expect(typeof auth.getRequestHeaders).toBe('function');
    });

    test('parses GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY fallback', () => {
      delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'fallback@project.iam.gserviceaccount.com';
      process.env.GOOGLE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nFAKE\\n-----END PRIVATE KEY-----';
      const { getServiceAccountAuth } = require('../googleAuth');
      const auth = getServiceAccountAuth();
      expect(auth).not.toBeNull();
    });

    test('returns null when GOOGLE_SERVICE_ACCOUNT_JSON is invalid JSON', () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON = 'not-valid-json';
      const { getServiceAccountAuth } = require('../googleAuth');
      // Invalid JSON falls through to email/key env vars (also absent) → null
      expect(getServiceAccountAuth()).toBeNull();
    });
  });

  // ── exchangeJWTForToken / token exchange ───────────────────────────────────

  describe('token exchange', () => {
    test('POSTs to oauth2.googleapis.com/token', async () => {
      const { getServiceAccountAuth } = require('../googleAuth');
      const auth = getServiceAccountAuth();

      let capturedOpts;
      const res = new EventEmitter();
      res.statusCode = 200;
      const req = { on: jest.fn().mockReturnThis(), write: jest.fn(), end: jest.fn(), destroy: jest.fn() };
      https.request.mockImplementation((opts, cb) => {
        capturedOpts = opts;
        cb(res);
        process.nextTick(() => {
          res.emit('data', JSON.stringify(SUCCESS_TOKEN));
          res.emit('end');
        });
        return req;
      });

      await auth.getRequestHeaders();

      expect(capturedOpts.hostname).toBe('oauth2.googleapis.com');
      expect(capturedOpts.path).toBe('/token');
      expect(capturedOpts.method).toBe('POST');
    });

    test('uses correct aud in JWT assertion (oauth2.googleapis.com/token)', async () => {
      // The aud field is embedded in the JWT assertion payload (base64url-encoded).
      // Capture what gets written to the request body and decode to verify aud.
      const { getServiceAccountAuth } = require('../googleAuth');
      const auth = getServiceAccountAuth();

      let writtenBody = '';
      const res = new EventEmitter();
      res.statusCode = 200;
      const req = {
        on: jest.fn().mockReturnThis(),
        write: jest.fn((buf) => { writtenBody += buf.toString(); }),
        end: jest.fn(),
        destroy: jest.fn(),
      };
      https.request.mockImplementation((opts, cb) => {
        cb(res);
        process.nextTick(() => {
          res.emit('data', JSON.stringify(SUCCESS_TOKEN));
          res.emit('end');
        });
        return req;
      });

      await auth.getRequestHeaders();

      // Extract the assertion from the POST body
      const match = writtenBody.match(/assertion=([^&]+)/);
      expect(match).not.toBeNull();
      const assertion = decodeURIComponent(match[1]);
      const parts = assertion.split('.');
      // parts[1] is the payload — base64url decode it
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      expect(payload.aud).toBe('https://oauth2.googleapis.com/token');
    });

    test('throws when server returns error (no access_token)', async () => {
      const { getServiceAccountAuth } = require('../googleAuth');
      const auth = getServiceAccountAuth();
      buildHttpsMock({ error: 'invalid_grant', error_description: 'Token has been expired' }, 401);
      await expect(auth.getRequestHeaders()).rejects.toThrow();
    });

    test('throws on timeout', async () => {
      const { getServiceAccountAuth } = require('../googleAuth');
      const auth = getServiceAccountAuth();

      const req = {
        on: jest.fn((event, cb) => {
          if (event === 'timeout') process.nextTick(cb);
          return req;
        }),
        write: jest.fn(),
        end: jest.fn(),
        destroy: jest.fn(),
      };
      https.request.mockImplementation(() => req);

      await expect(auth.getRequestHeaders()).rejects.toThrow('timeout');
    });
  });

  // ── getRequestHeaders ──────────────────────────────────────────────────────

  describe('getRequestHeaders', () => {
    test('returns Authorization: Bearer <token>', async () => {
      const { getServiceAccountAuth } = require('../googleAuth');
      const auth = getServiceAccountAuth();
      buildHttpsMock(SUCCESS_TOKEN);

      const headers = await auth.getRequestHeaders();
      expect(headers.Authorization).toBe('Bearer test-access-token');
    });
  });

  // ── token caching ──────────────────────────────────────────────────────────

  describe('token caching', () => {
    test('reuses a valid cached token without calling https again', async () => {
      const { getServiceAccountAuth } = require('../googleAuth');
      const auth = getServiceAccountAuth();
      buildHttpsMock(SUCCESS_TOKEN);

      const h1 = await auth.getRequestHeaders();
      const h2 = await auth.getRequestHeaders();

      expect(h1.Authorization).toBe('Bearer test-access-token');
      expect(h2.Authorization).toBe('Bearer test-access-token');
      // Only one network round-trip
      expect(https.request).toHaveBeenCalledTimes(1);
    });

    test('fetches a new token when cache is expired', async () => {
      jest.useFakeTimers();
      const { getServiceAccountAuth } = require('../googleAuth');
      const auth = getServiceAccountAuth();
      buildHttpsMock({ access_token: 'first-token', expires_in: 60 });

      await auth.getRequestHeaders(); // populates cache

      // Advance time beyond the expiry window (expires_in - 60s buffer = 0s → immediate expiry)
      jest.advanceTimersByTime(1000);

      buildHttpsMock({ access_token: 'second-token', expires_in: 3600 });
      const h2 = await auth.getRequestHeaders();

      expect(h2.Authorization).toBe('Bearer second-token');
      expect(https.request).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });
  });
});
