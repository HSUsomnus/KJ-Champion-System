/**
 * 版本號服務
 * 管理資料版本號，當行程或成員資料變更時自動更新版本號
 */

let currentVersion = Date.now(); // 使用時間戳作為版本號

/**
 * 取得當前版本號
 * @returns {number} 版本號
 */
const getCurrentVersion = () => {
  return currentVersion;
};

/**
 * 更新版本號（當資料變更時呼叫）
 */
const incrementVersion = () => {
  currentVersion = Date.now();
  console.log(`📌 版本號已更新：${currentVersion}`);
};

/**
 * 檢查版本號是否相同
 * @param {number} clientVersion - 客戶端版本號
 * @returns {boolean} 是否相同
 */
const isVersionSame = (clientVersion) => {
  return clientVersion === currentVersion;
};

module.exports = {
  getCurrentVersion,
  incrementVersion,
  isVersionSame,
};
