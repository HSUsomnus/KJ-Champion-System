'use strict';

jest.mock('../../../config/db', () => ({ query: jest.fn() }));

const db = require('../../../config/db');
const { getMemberRole, isAdminRole } = require('../adminAuthService');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('adminAuthService', () => {
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
});
