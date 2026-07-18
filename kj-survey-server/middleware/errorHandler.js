/**
 * 共用 error middleware（M-3）：asyncHandler 轉交的例外統一在此收斂，
 * 避免每支 route 各自重複寫「未知錯誤 → 500」的樣板碼。
 */
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  console.error('❌ 未預期錯誤:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.publicMessage || '伺服器發生錯誤，請稍後再試',
  });
};

module.exports = { errorHandler };
