/**
 * KJ Survey API 服務層 — 獨立於主系統 api.js，呼叫 /survey-api/*（見 change 20 spec.md）
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

  const res = await fetch(`/survey-api${path}`, { ...options, headers })
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
  return request('/admin-auth/me')
}
