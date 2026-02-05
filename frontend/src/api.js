/**
 * API 呼叫基底：本機開發時由 Vite proxy 轉到 8080，發布後同源 /api
 */

const getBaseUrl = () => {
  if (import.meta.env?.BASE_URL) return ''
  return ''
}

/**
 * 取得當日行程
 * @param {string} date - YYYY-MM-DD
 * @param {string} [userId] - LINE User ID（選填，用於後端紀錄）
 */
export async function fetchTodayEvents(date, userId) {
  const params = new URLSearchParams({ date })
  if (userId) params.set('userId', userId)
  const res = await fetch(`/api/calendar/today?${params}`)
  const data = await res.json()
  if (!data.success) throw new Error(data.message || '取得行程失敗')
  return data.data
}

/**
 * 取得單一行程詳情
 */
export async function fetchEvent(eventId, userId) {
  const params = userId ? `?userId=${encodeURIComponent(userId)}` : ''
  const res = await fetch(`/api/calendar/events/${eventId}${params}`)
  const data = await res.json()
  if (!data.success) throw new Error(data.message || '取得行程失敗')
  return data.data
}

/**
 * 取得 LIFF ID（供前端初始化 LIFF）
 */
export async function fetchLiffId() {
  const res = await fetch('/api/line/liff-id')
  const data = await res.json()
  if (!data.success) throw new Error(data.message || '取得 LIFF ID 失敗')
  return data.data.liffId
}

/**
 * 取得成員列表
 */
export async function fetchMembers(userId) {
  const params = userId ? `?userId=${encodeURIComponent(userId)}` : ''
  const res = await fetch(`/api/members${params}`)
  const data = await res.json()
  if (!data.success) throw new Error(data.message || '取得成員失敗')
  return data.data
}

/**
 * 檢查是否已註冊
 */
export async function checkRegistered(userId) {
  const res = await fetch(`/api/members/check?userId=${encodeURIComponent(userId)}`)
  const data = await res.json()
  if (!data.success) throw new Error(data.message || '檢查失敗')
  return data.data.isRegistered
}

/**
 * 取得個人資料
 */
export async function fetchProfile(userId) {
  const res = await fetch(`/api/profile?userId=${encodeURIComponent(userId)}`)
  const data = await res.json()
  if (!data.success) {
    if (data.needRegister) throw new Error('NEED_REGISTER')
    throw new Error(data.message || '取得個人資料失敗')
  }
  return data.data
}
