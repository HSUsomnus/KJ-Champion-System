/**
 * KJ Survey API 服務層 — 獨立於主系統 api.js。
 * 後端已併入主系統 server/（Change 20 策略修訂），呼叫路徑前綴 /api/survey/*，
 * 落在既有 /api/* 代理規則下，指向同一個主系統後端（見 changes/20-.../spec.md）。
 */

function getLineUserId() {
  return localStorage.getItem('lineUserId')
}

async function request(path, options = {}) {
  const userId = getLineUserId()
  const headers = { ...options.headers }

  if (userId) {
    headers['X-Line-User-Id'] = userId
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`/api/survey${path}`, { ...options, headers })
  const data = await res.json()

  if (!res.ok) {
    const err = new Error(data.message || `API Error ${res.status}`)
    err.status = res.status
    err.data = data
    throw err
  }

  return data
}

export function getFormByToken(token) {
  return request(`/forms/${token}`)
}

export function getMembers() {
  return request(`/members`)
}

export function submitForm(token, answers) {
  return request(`/forms/${token}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  })
}

// ========== 後台認證 ==========
// [設計決策] 不自己做登入流程，沿用主系統既有的 /api/auth/line-login
// （見 pages/Login.jsx handleLineLogin），登入完成後帶著同一個 lineUserId
// 打這支 API 確認角色。原本自建 OAuth callback + cookie session 的做法
// 因為 LINE 導回網域跟前端網域對不上，session cookie 設錯地方，一直失敗。
// 若要修改：確認不會重新引入「後端自己發 OAuth callback」的設計

export function getAdminMe() {
  return request('/admin/me')
}

// ========== 後台資料（需登入，Section 4–7） ==========

export function getAdminForms() {
  return request('/admin/forms')
}

export function getFormAttendance(id) {
  return request(`/admin/forms/${id}/attendance`)
}

export function getFormSubmissions(id) {
  return request(`/admin/forms/${id}/submissions`)
}

export function createForm(payload) {
  return request('/admin/forms', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateForm(id, payload) {
  return request(`/admin/forms/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function publishForm(id) {
  return request(`/admin/forms/${id}/publish`, { method: 'POST' })
}

// 匯出用完整網址（供 <a href> 直接下載；帶不了 header，改用 query 帶 lineUserId）
export function exportUrl(id, format) {
  const userId = getLineUserId() || ''
  return `/api/survey/admin/forms/${id}/export.${format}?lineUserId=${encodeURIComponent(userId)}`
}
