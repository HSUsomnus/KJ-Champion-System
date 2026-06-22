/**
 * API 服務層 — 集中管理所有後端 API 呼叫
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

  // FormData 不需手動設 Content-Type（瀏覽器自動帶 boundary）
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`/api${path}`, { ...options, headers })
  const data = await res.json()

  if (!res.ok) {
    const err = new Error(data.message || `API Error ${res.status}`)
    err.status = res.status
    err.data = data
    throw err
  }

  return data
}

/**
 * 將後端 member 物件的 name 映射為 realName（前端統一用 realName）
 */
export function mapMember(m) {
  if (!m) return m
  return {
    ...m,
    realName: m.name || m.realName || '',
    pictureUrl: m.pictureUrl || null,
  }
}

/**
 * 將後端 event（ISO start/end）轉為前端格式（date/time/endTime）
 */
export function mapEvent(e) {
  if (!e) return e
  const startDate = new Date(e.start)
  const endDate = e.end ? new Date(e.end) : null

  const pad = (n) => String(n).padStart(2, '0')

  return {
    ...e,
    date: `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`,
    time: e.allDay ? null : `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`,
    endTime: (!e.allDay && endDate) ? `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}` : null,
    endDate: endDate ? `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}` : null,
  }
}

/**
 * 將前端表單格式轉為 API 的 start/end ISO 格式
 */
export function formToEventPayload(form) {
  let start, end

  if (form.allDay) {
    start = `${form.date}T00:00:00+08:00`
    const ed = form.endDate || form.date
    end = `${ed}T23:59:59+08:00`
  } else {
    const st = form.startTime || '00:00'
    const et = form.endTime || st
    start = `${form.date}T${st}:00+08:00`
    const ed = form.endDate || form.date
    end = `${ed}T${et}:00+08:00`
  }

  return {
    title: form.title,
    description: form.description || '',
    start,
    end,
    type: form.type,
    allDay: form.allDay,
  }
}

// ===== API 方法 =====

export const api = {
  // === Profile ===
  getProfile: () => request('/profile'),
  updateProfile: (body) => request('/profile', {
    method: 'PUT',
    body: JSON.stringify(body),
  }),
  register: (body) => request('/profile/register', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  syncAvatar: (pictureUrl) => request('/profile/sync-avatar', {
    method: 'POST',
    body: JSON.stringify({ pictureUrl }),
  }),

  // === Members ===
  getMembers: () => request('/members'),
  getMember: (lineId) => request(`/members/${lineId}`),
  checkMember: (userId) => request(`/members/check?userId=${userId}`),
  updateRoles: (editorId, updates) => request('/members/update-roles', {
    method: 'PUT',
    body: JSON.stringify({ editorId, updates }),
  }),
  updateFinancialAmount: (editorId, targetLineId, amount) =>
    request('/members/update-financial-amount', {
      method: 'PUT',
      body: JSON.stringify({ editorId, targetLineId, amount }),
    }),

  // === Calendar ===
  getEvents: (startDate, endDate) =>
    request(`/calendar/events?startDate=${startDate}&endDate=${endDate}`),
  getMonthEvents: (year, month, type) => {
    let url = `/calendar/month?year=${year}&month=${month}`
    if (type && type !== '全部') url += `&type=${type}`
    return request(url)
  },
  getEvent: (eventId) => request(`/calendar/events/${eventId}`),
  createEvent: (body) => request('/calendar/events', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  updateEvent: (eventId, body) => request(`/calendar/events/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  }),
  deleteEvent: (eventId) => request(`/calendar/events/${eventId}`, {
    method: 'DELETE',
  }),

  // === Financial ===
  getFinancialList: (userId) => request(`/financial/list?userId=${userId}`),
  uploadFinancial: (formData) => request('/financial/upload', {
    method: 'POST',
    body: formData,
  }),
  deleteFinancial: (id, userId) => request(`/financial/${id}?userId=${userId}`, {
    method: 'DELETE',
  }),
  checkFinancialPermission: (editorId, targetUserId) =>
    request(`/financial/check-permission?editorId=${editorId}&targetUserId=${targetUserId}`),

  // === LINE 系統連結（公開） ===
  getSystemLinks: () => request('/line/system-links'),

  // === LINE Bot 每日行程推播設定（開發者） ===
  getAgendaSettings: () => request('/line/agenda-settings'),
  updateAgendaSettings: (body) => request('/line/agenda-settings', {
    method: 'PUT',
    body: JSON.stringify(body),
  }),
  pushDailyAgenda: () => request('/line/push-daily-agenda', {
    method: 'POST',
  }),
}
