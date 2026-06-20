'use strict';

// Mock https before anything requires it
jest.mock('https');

const https = require('https');
const crypto = require('crypto');
const { EventEmitter } = require('events');

const FAKE_CREDS = {
  client_email: 'test@test-project.iam.gserviceaccount.com',
  private_key: '-----BEGIN PRIVATE KEY-----\nFAKEKEY\n-----END PRIVATE KEY-----',
  private_key_id: 'key-abc123',
  project_id: 'test-project',
};

const SUCCESS_TOKEN = { access_token: 'test-access-token', expires_in: 3600, token_type: 'Bearer' };

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
  // getServiceAccountAuth 現在是 async：先用自己的 JWT exchange 拿 token，
  // 再建立 OAuth2 實例並 setCredentials，避免 googleapis 走舊端點。

  describe('getServiceAccountAuth', () => {
    test('returns null when no credentials env vars are set', async () => {
      delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
      const { getServiceAccountAuth } = require('../googleAuth');
      expect(await getServiceAccountAuth()).toBeNull();
    });

    test('fetches token and returns OAuth2 auth with access_token set', async () => {
      buildHttpsMock(SUCCESS_TOKEN);
      const { getServiceAccountAuth } = require('../googleAuth');
      const auth = await getServiceAccountAuth();
      expect(auth).not.toBeNull();
      expect(auth.credentials.access_token).toBe('test-access-token');
    });

    test('parses GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY fallback', async () => {
      delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'fallback@project.iam.gserviceaccount.com';
      process.env.GOOGLE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nFAKE\\n-----END PRIVATE KEY-----';
      buildHttpsMock(SUCCESS_TOKEN);
      const { getServiceAccountAuth } = require('../googleAuth');
      const auth = await getServiceAccountAuth();
      expect(auth).not.toBeNull();
    });

    test('returns null when GOOGLE_SERVICE_ACCOUNT_JSON is invalid JSON', async () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON = 'not-valid-json';
      const { getServiceAccountAuth } = require('../googleAuth');
      expect(await getServiceAccountAuth()).toBeNull();
    });

    test('returns null when token exchange fails', async () => {
      buildHttpsMock({ error: 'invalid_grant' }, 401);
      const { getServiceAccountAuth } = require('../googleAuth');
      expect(await getServiceAccountAuth()).toBeNull();
    });

    test('returns null on token exchange timeout', async () => {
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
      const { getServiceAccountAuth } = require('../googleAuth');
      expect(await getServiceAccountAuth()).toBeNull();
    });
  });

  // ── token exchange（POSTs to correct endpoint）────────────────────────────
  // token exchange 現在在 getServiceAccountAuth() 內觸發，不再由 getRequestHeaders 觸發

  describe('token exchange', () => {
    test('POSTs to oauth2.googleapis.com/token', async () => {
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

      const { getServiceAccountAuth } = require('../googleAuth');
      await getServiceAccountAuth();

      expect(capturedOpts.hostname).toBe('oauth2.googleapis.com');
      expect(capturedOpts.path).toBe('/token');
      expect(capturedOpts.method).toBe('POST');
    });

    test('uses correct aud in JWT assertion (oauth2.googleapis.com/token)', async () => {
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

      const { getServiceAccountAuth } = require('../googleAuth');
      await getServiceAccountAuth();

      const match = writtenBody.match(/assertion=([^&]+)/);
      expect(match).not.toBeNull();
      const assertion = decodeURIComponent(match[1]);
      const parts = assertion.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      expect(payload.aud).toBe('https://oauth2.googleapis.com/token');
    });

    test('JWT signature part is raw Buffer bytes, not JSON.stringify artefact', async () => {
      const FAKE_SIG_BUF = Buffer.from('fake-rsa-signature');
      crypto.createSign.mockReturnValue({ update: jest.fn(), sign: jest.fn().mockReturnValue(FAKE_SIG_BUF) });

      let writtenBody = '';
      const res = new EventEmitter();
      res.statusCode = 200;
      const req = {
        on: jest.fn().mockReturnThis(),
        write: jest.fn((buf) => { writtenBody += buf.toString(); }),
        end: jest.fn(), destroy: jest.fn(),
      };
      https.request.mockImplementation((opts, cb) => {
        cb(res);
        process.nextTick(() => { res.emit('data', JSON.stringify(SUCCESS_TOKEN)); res.emit('end'); });
        return req;
      });

      const { getServiceAccountAuth } = require('../googleAuth');
      await getServiceAccountAuth();

      const match = writtenBody.match(/assertion=([^&]+)/);
      const assertion = decodeURIComponent(match[1]);
      const sigPart = assertion.split('.')[2];
      const expectedSig = FAKE_SIG_BUF.toString('base64')
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      expect(sigPart).toBe(expectedSig);
    });
  });

  // ── getRequestHeaders ──────────────────────────────────────────────────────
  // OAuth2 + setCredentials：getRequestHeaders 直接從 credentials 取 token，
  // 不再觸發 https 呼叫（token 已在 getServiceAccountAuth() 時預設好）

  describe('getRequestHeaders', () => {
    test('returns Authorization: Bearer <token>', async () => {
      buildHttpsMock(SUCCESS_TOKEN);
      const { getServiceAccountAuth } = require('../googleAuth');
      const auth = await getServiceAccountAuth();

      // OAuth2 reads from pre-set credentials — no additional https call
      const headers = await auth.getRequestHeaders('https://www.googleapis.com/');
      expect(headers.Authorization).toBe('Bearer test-access-token');
      expect(https.request).toHaveBeenCalledTimes(1); // only the token exchange
    });
  });

  // ── token caching ──────────────────────────────────────────────────────────

  describe('token caching', () => {
    test('reuses a valid cached token without calling https again', async () => {
      buildHttpsMock(SUCCESS_TOKEN);
      const { getServiceAccountAuth } = require('../googleAuth');

      const auth1 = await getServiceAccountAuth();
      const auth2 = await getServiceAccountAuth();

      expect(auth1.credentials.access_token).toBe('test-access-token');
      expect(auth2.credentials.access_token).toBe('test-access-token');
      expect(https.request).toHaveBeenCalledTimes(1);
    });

    test('fetches a new token when cache is expired', async () => {
      jest.useFakeTimers();
      buildHttpsMock({ access_token: 'first-token', expires_in: 60 });
      const { getServiceAccountAuth } = require('../googleAuth');

      await getServiceAccountAuth(); // expires_in=60, buffer=60s → immediate expiry

      jest.advanceTimersByTime(1000);

      buildHttpsMock({ access_token: 'second-token', expires_in: 3600 });
      const auth2 = await getServiceAccountAuth();

      expect(auth2.credentials.access_token).toBe('second-token');
      expect(https.request).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });
  });
});
