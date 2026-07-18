'use strict';

const { asyncHandler } = require('../asyncHandler');

describe('asyncHandler', () => {
  test('handler 成功 → 不呼叫 next', async () => {
    const handler = asyncHandler(async (req, res) => res.json({ ok: true }));
    const next = jest.fn();
    const res = { json: jest.fn() };
    await handler({}, res, next);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(next).not.toHaveBeenCalled();
  });

  test('handler reject → 呼叫 next(err)，不 throw', async () => {
    const err = new Error('DB 掛了');
    const handler = asyncHandler(async () => {
      throw err;
    });
    const next = jest.fn();
    await handler({}, {}, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});
