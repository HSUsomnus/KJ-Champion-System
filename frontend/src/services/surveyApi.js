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

// [設計決策] Change 20 v4 D-D：舊版 /members 不需 token 就能撈全隊名單，是隱私漏洞。
// 前台改綁定「已發佈表單的 token」+ 只回 confirmed 狀態（新姓名/待核對名單不外洩）。
export function getMembersByToken(token) {
  return request(`/forms/${token}/members`)
}

export function submitForm(token, answers) {
  return request(`/forms/${token}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  })
}

// ========== 後台（Section 3+ 陸續加入 forms/submissions/export 等呼叫，一律走 adminRequest 帶 Bearer） ==========

export function getAdminForms() {
  return adminRequest('/admin/forms')
}

export function getAdminSubmissions(formId) {
  return adminRequest(`/admin/forms/${formId}/submissions`)
}

export function getAdminAttendance(formId) {
  return adminRequest(`/admin/forms/${formId}/attendance`)
}

// [設計決策] 匯出回應是檔案 blob 不是 JSON，不能走 request()/adminRequest()
// （兩者都固定 res.json()）。檔名優先讀後端 Content-Disposition 的 filename*
// （UTF-8 表單標題），讀不到才退回 export.<format>。
export async function downloadAdminExport(formId, format) {
  const token = getAdminToken()
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`/survey-api/admin/forms/${formId}/export.${format}`, { headers })

  if (!res.ok) {
    let message = `匯出失敗 ${res.status}`
    try {
      const data = await res.json()
      message = data.message || message
    } catch {
      // 回應不是 JSON（例如伺服器層級錯誤頁），用預設訊息
    }
    const err = new Error(message)
    err.status = res.status
    throw err
  }

  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') || ''
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/)
  const asciiMatch = disposition.match(/filename="([^"]+)"/)
  const filename = utf8Match
    ? decodeURIComponent(utf8Match[1])
    : asciiMatch?.[1] || `export.${format}`

  return { blob, filename }
}

export { adminRequest }
