'use strict';

jest.mock('../../config/db', () => ({ query: jest.fn() }));
jest.mock('axios');

process.env.LINE_CHANNEL_ID = 'test-channel-id';
process.env.LINE_CHANNEL_SECRET = 'test-channel-secret';
process.env.SESSION_SECRET = 'test-session-secret';

const axios = require('axios');
const db = require('../../config/db');
const {
  verifyIdToken,
  getMemberRole,
  isAdminRole,
  signSessionToken,
  verifySessionToken,
} = require('../adminAuthService');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('adminAuthService', () => {
  test('verifyIdToken 呼叫 LINE 官方 verify 端點，回傳驗過簽的 lineId', async () => {
    axios.post.mockResolvedValue({ data: { sub: 'U1234', name: '測試管理者' } });

    const result = await verifyIdToken('fake-id-token');

    expect(axios.post).toHaveBeenCalledWith(
      'https://api.line.me/oauth2/v2.1/verify',
      expect.any(URLSearchParams),
      expect.any(Object)
    );
    expect(result).toEqual({ lineId: 'U1234', displayName: '測試管理者' });
  });

  test('getMemberRole 查主系統 members 表', async () => {
    db.query.mockResolvedValue({ rows: [{ role: '管理者' }] });

    const role = await getMemberRole('U1234');

    expect(db.query).toHaveBeenCalledWith('SELECT role FROM members WHERE line_id = $1', ['U1234']);
    expect(role).toBe('管理者');
  });

  test('getMemberRole 查無此人回傳 null', async () => {
    db.query.mockResolvedValue({ rows: [] });

    expect(await getMemberRole('U9999')).toBeNull();
  });

  test.each([
    ['管理者', true],
    ['負責人', true],
    ['開發者', true],
    ['一般人', false],
    [null, false],
  ])('isAdminRole(%s) → %s', (role, expected) => {
    expect(isAdminRole(role)).toBe(expected);
  });

  test('signSessionToken / verifySessionToken 來回一致', () => {
    const token = signSessionToken({ lineId: 'U1234', role: '管理者' });
    const decoded = verifySessionToken(token);
    expect(decoded.lineId).toBe('U1234');
    expect(decoded.role).toBe('管理者');
  });

  test('verifySessionToken 對偽造/錯誤簽章的 token 丟出例外', () => {
    expect(() => verifySessionToken('not-a-real-jwt')).toThrow();
  });
});
