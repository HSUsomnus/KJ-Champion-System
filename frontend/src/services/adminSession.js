/**
 * KJ Survey 後台 JWT 記憶體存放（D-A：記憶體，非 cookie）
 * 純模組層變數，reload / 分頁關閉即清空 —— 對應 M-2「F5/PWA reload/crash 後需重登，預期非 bug」。
 */
let adminToken = null

export function setAdminToken(token) {
  adminToken = token
}

export function getAdminToken() {
  return adminToken
}

export function clearAdminToken() {
  adminToken = null
}
