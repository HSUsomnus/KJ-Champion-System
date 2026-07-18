'use strict';

const request = require('supertest');

jest.mock('../services/formService', () => ({
  getPublishedFormByToken: jest.fn(),
  submitForm: jest.fn(),
  listMembers: jest.fn(),
}));

describe('server.js — PUB-A 濫用防護（20.11）', () => {
  let app;
  let formService;

  beforeEach(() => {
    // 每個 test 重新 require，拿到全新的 rate limiter store（避免測試間互相污染次數）；
    // resetModules() 後必須重新 require formService，否則拿到的是舊 mock 實例，
    // 跟 server.js 內部實際用的不是同一個物件，設定 mockResolvedValue 不會生效。
    jest.resetModules();
    app = require('../server');
    formService = require('../services/formService');
  });

  test('trust proxy 已設定（D-J，前有 Zeabur/CF proxy）', () => {
    expect(app.get('trust proxy')).toBe(1);
  });

  test('require() 不會呼叫 app.listen 佔用 port', () => {
    // 若 app.listen 被呼叫，require() 會噴 EADDRINUSE 或掛住；能跑到這行代表沒佔 port
    expect(app).toBeDefined();
  });

  test('body 超過 32kb → 413', async () => {
    const res = await request(app)
      .post('/forms/some-token/submit')
      .send({ answers: { note: 'x'.repeat(40 * 1024) } });
    expect(res.status).toBe(413);
  });

  test('合法 token 送出超過 15 分 10 次 → 第 11 次 429，不再進 handler', async () => {
    formService.getPublishedFormByToken.mockResolvedValue({ id: 1, title: 't', fields: [] });
    formService.submitForm.mockResolvedValue({ id: 1, created_at: 'now' });

    let lastRes;
    for (let i = 0; i < 11; i += 1) {
      lastRes = await request(app).post('/forms/valid-token/submit').send({ answers: {} });
    }

    expect(lastRes.status).toBe(429);
    expect(lastRes.body).toEqual({ error: 'too_many_requests' });
    expect(formService.submitForm).toHaveBeenCalledTimes(10);
  });

  test('無效 token 不給獨立額度：不同無效 token 共用同一 IP 額度', async () => {
    formService.getPublishedFormByToken.mockResolvedValue(null);
    const notFoundErr = new Error('not found');
    notFoundErr.code = 'FORM_NOT_FOUND';
    formService.submitForm.mockRejectedValue(notFoundErr);

    let lastRes;
    for (let i = 0; i < 10; i += 1) {
      lastRes = await request(app).post(`/forms/bad-token-${i}/submit`).send({ answers: {} });
    }
    expect(lastRes.status).toBe(404);

    const eleventh = await request(app)
      .post('/forms/yet-another-bad-token/submit')
      .send({ answers: {} });
    expect(eleventh.status).toBe(429);
  });

  test('GET /forms/:token 不受送出限流影響（限流只掛在 /submit）', async () => {
    formService.getPublishedFormByToken.mockResolvedValue({ id: 1, title: 't', fields: [] });
    for (let i = 0; i < 15; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await request(app).get('/forms/valid-token');
    }
    const res = await request(app).get('/forms/valid-token');
    expect(res.status).toBe(200);
  });
});
