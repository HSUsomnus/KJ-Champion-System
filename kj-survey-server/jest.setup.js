/**
 * 測試環境獨立 secret（20.3）：不沿用 .env 真實值，避免測試意外碰到正式設定。
 */
process.env.SESSION_SECRET = 'test-only-session-secret';
process.env.LINE_CHANNEL_ID = 'test-only-line-channel-id';
process.env.LINE_CHANNEL_SECRET = 'test-only-line-channel-secret';
process.env.APP_URL = 'http://localhost:8081';
process.env.FRONTEND_URL = 'http://localhost:3000';
