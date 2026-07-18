'use strict';

jest.mock('../../config/db', () => ({ query: jest.fn() }));

const db = require('../../config/db');
const adminAuthService = require('../adminAuthService');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getMemberRole / isAdminRole', () => {
  test('getMemberRole 查主系統 members 表', async () => {
    db.query.mockResolvedValue({ rows: [{ role: '管理者' }] });

    const role = await adminAuthService.getMemberRole('U1234');

    expect(db.query).toHaveBeenCalledWith('SELECT role FROM members WHERE line_id = $1', ['U1234']);
    expect(role).toBe('管理者');
  });

  test('getMemberRole 查無此人回傳 null', async () => {
    db.query.mockResolvedValue({ rows: [] });

    expect(await adminAuthService.getMemberRole('U9999')).toBeNull();
  });

  test.each([
    ['管理者', true],
    ['負責人', true],
    ['開發者', true],
    ['一般人', false],
    [null, false],
  ])('isAdminRole(%s) → %s', (role, expected) => {
    expect(adminAuthService.isAdminRole(role)).toBe(expected);
  });
});

describe('state（D-F/D-I，簽章式 + 一次性 nonce）', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('剛產生的合法 state → 驗證通過', () => {
    const state = adminAuthService.generateState();
    expect(adminAuthService.verifyAndConsumeState(state)).toBe(true);
  });

  test('缺 state → false', () => {
    expect(adminAuthService.verifyAndConsumeState(undefined)).toBe(false);
    expect(adminAuthService.verifyAndConsumeState('')).toBe(false);
  });

  test('簽章被竄改 → false', () => {
    const state = adminAuthService.generateState();
    const [payload] = state.split('.');
    const tampered = `${payload}.臭掉的簽章`;
    expect(adminAuthService.verifyAndConsumeState(tampered)).toBe(false);
  });

  test('payload 被竄改（簽章對不上）→ false', () => {
    const state = adminAuthService.generateState();
    const [, signature] = state.split('.');
    const forgedPayload = Buffer.from(JSON.stringify({ nonce: 'forged', iat: 0, exp: 9999999999 })).toString(
      'base64url'
    );
    expect(adminAuthService.verifyAndConsumeState(`${forgedPayload}.${signature}`)).toBe(false);
  });

  test('過期 state（超過 10 分）→ false', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const state = adminAuthService.generateState();

    jest.setSystemTime(new Date('2026-01-01T00:10:01Z'));
    expect(adminAuthService.verifyAndConsumeState(state)).toBe(false);
  });

  test('重放：consume 後第二次驗證必失敗', () => {
    const state = adminAuthService.generateState();
    expect(adminAuthService.verifyAndConsumeState(state)).toBe(true);
    expect(adminAuthService.verifyAndConsumeState(state)).toBe(false);
  });

  test('state 不含 return URL / origin → 無 open redirect 面', () => {
    const state = adminAuthService.generateState();
    const [payload] = state.split('.');
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    expect(Object.keys(decoded).sort()).toEqual(['exp', 'iat', 'nonce']);
  });
});

describe('LINE token 交換 + 驗簽（mock fetch）', () => {
  afterEach(() => {
    global.fetch.mockRestore?.();
  });

  test('exchangeCodeForIdToken 成功 → 回傳 id_token', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id_token: 'fake.id.token' }),
    });

    const idToken = await adminAuthService.exchangeCodeForIdToken('code123');
    expect(idToken).toBe('fake.id.token');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.line.me/oauth2/v2.1/token',
      expect.objectContaining({ method: 'POST' })
    );
  });

  test('exchangeCodeForIdToken LINE 回應非 2xx → throw', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 400 });
    await expect(adminAuthService.exchangeCodeForIdToken('bad-code')).rejects.toThrow();
  });

  test('exchangeCodeForIdToken 回應缺 id_token → throw', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    await expect(adminAuthService.exchangeCodeForIdToken('code123')).rejects.toThrow();
  });

  test('verifyLineIdToken 成功 → 回傳 claims', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sub: 'U1234', aud: 'channel-id' }),
    });

    const claims = await adminAuthService.verifyLineIdToken('fake.id.token');
    expect(claims.sub).toBe('U1234');
  });

  test('verifyLineIdToken 驗簽失敗（非 2xx）→ throw', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 400 });
    await expect(adminAuthService.verifyLineIdToken('bad.token')).rejects.toThrow();
  });
});

describe('JWT 簽發 / 驗證', () => {
  test('issueAdminJwt 簽發後 verifyAdminJwt 可驗回 lineId，且不含 role', () => {
    const token = adminAuthService.issueAdminJwt('U1234');
    const payload = adminAuthService.verifyAdminJwt(token);
    expect(payload.lineId).toBe('U1234');
    expect(payload.role).toBeUndefined();
  });

  test('竄改過的 JWT → verifyAdminJwt throw', () => {
    const token = adminAuthService.issueAdminJwt('U1234');
    const tampered = `${token}x`;
    expect(() => adminAuthService.verifyAdminJwt(tampered)).toThrow();
  });

  test('過期 JWT → verifyAdminJwt throw', () => {
    const jwt = require('jsonwebtoken');
    const env = require('../../config/env');
    const expiredToken = jwt.sign({ lineId: 'U1234' }, env.SESSION_SECRET, { expiresIn: -1 });
    expect(() => adminAuthService.verifyAdminJwt(expiredToken)).toThrow();
  });
});
