/**
 * LINE 使用者驗證中介層
 * 驗證來自 LINE LIFF 的請求是否有效
 */

const { isValidLineUserId } = require('../config/lineConfig');

/**
 * 驗證 LINE User ID 的中介層
 * 從請求標頭或查詢參數中取得 LINE User ID 並驗證
 */
const verifyLineUser = (req, res, next) => {
  try {
    // 從查詢參數或標頭中取得 LINE User ID
    // LINE LIFF 會自動在 URL 中加入 liff.state 參數，我們可以從中取得使用者資訊
    const lineUserId = req.query.userId || req.headers['x-line-user-id'];
    
    if (!lineUserId) {
      return res.status(401).json({
        success: false,
        message: '缺少 LINE User ID',
      });
    }

    // 驗證 User ID 格式
    if (!isValidLineUserId(lineUserId)) {
      return res.status(401).json({
        success: false,
        message: '無效的 LINE User ID 格式',
      });
    }

    // 將驗證過的 User ID 附加到請求物件上，供後續路由使用
    req.lineUserId = lineUserId;
    next();
  } catch (error) {
    console.error('❌ LINE 使用者驗證錯誤:', error);
    res.status(500).json({
      success: false,
      message: '驗證過程發生錯誤',
    });
  }
};

/**
 * 可選的 LINE User ID 驗證（用於公開 API）
 * 如果有提供 User ID 就驗證，沒有也沒關係
 */
const optionalLineUser = (req, res, next) => {
  const lineUserId = req.query.userId || req.headers['x-line-user-id'];
  
  if (lineUserId && isValidLineUserId(lineUserId)) {
    req.lineUserId = lineUserId;
  }
  
  next();
};

module.exports = {
  verifyLineUser,
  optionalLineUser,
};
