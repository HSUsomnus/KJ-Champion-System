/**
 * 包裝 async route handler：catch 掉 rejected promise 轉交 next(err)。
 * Express 4 不會自動攔截 async handler 的例外，缺這層會讓錯誤變成無回應的掛起請求。
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { asyncHandler };
