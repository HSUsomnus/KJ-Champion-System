/**
 * KJ Survey API 服務層 — 獨立於主系統 api.js，呼叫 /survey-api/*（見 change 20 spec.md）
 */

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
