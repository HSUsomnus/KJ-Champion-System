/**
 * KJ Survey API 服務層 — 獨立於主系統 api.js，呼叫 /survey-api/*（見 change 20 spec.md）
 */
import { getAdminToken } from './adminSession'

async function request(path, options = {}) {
  const headers = { ...options.headers }

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

// [設計決策] Change 20 v4 D-A：後台改真驗簽自簽 JWT，記憶體存、Authorization: Bearer 帶入。
// 不放 localStorage/cookie，reload 即失效（M-2 milestone 覆核：預期非 bug）。
async function adminRequest(path, options = {}) {
  const token = getAdminToken()
  const headers = { ...options.headers }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return request(path, { ...options, headers })
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

// ========== 後台（Section 3+ 陸續加入 forms/submissions/export 等呼叫，一律走 adminRequest 帶 Bearer） ==========

export { adminRequest }
