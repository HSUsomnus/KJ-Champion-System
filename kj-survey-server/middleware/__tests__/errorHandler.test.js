'use strict';

const { errorHandler } = require('../errorHandler');

describe('errorHandler', () => {
  const buildRes = () => ({
    headersSent: false,
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  });

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test('無 statusCode 例外 → 500 + 通用訊息', () => {
    const res = buildRes();
    errorHandler(new Error('connect ETIMEDOUT'), {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: '伺服器發生錯誤，請稍後再試',
    });
  });

  test('帶 statusCode/publicMessage 例外 → 使用該值', () => {
    const res = buildRes();
    const err = new Error('驗證失敗');
    err.statusCode = 400;
    err.publicMessage = '參數錯誤';
    errorHandler(err, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: '參數錯誤' });
  });

  test('res.headersSent 為 true → 交給 Express 預設處理（呼叫 next）', () => {
    const res = { ...buildRes(), headersSent: true };
    const next = jest.fn();
    const err = new Error('已送出回應後才出錯');
    errorHandler(err, {}, res, next);
    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
  });
});
