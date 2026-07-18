'use strict';

const REQUIRED_KEYS = [
  'SESSION_SECRET',
  'LINE_CHANNEL_ID',
  'LINE_CHANNEL_SECRET',
  'APP_URL',
  'FRONTEND_URL',
];

describe('config/env', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('必要環境變數齊全 → 回傳對應值', () => {
    const env = require('../env');
    REQUIRED_KEYS.forEach((key) => {
      expect(env[key]).toBe(process.env[key]);
    });
  });

  test.each(REQUIRED_KEYS)('缺 %s → fail-fast 拋錯', (missingKey) => {
    delete process.env[missingKey];
    expect(() => require('../env')).toThrow(missingKey);
  });
});
