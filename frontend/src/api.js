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
 * 取得指定月份的團體行程（用於行程列表，含生日行程）
 * @param {number} year - 年份
 * @param {number} month - 月份 1–12
 * @param {string} [type] - 選填，篩選類型：學員上課 / 活動 / 諮詢簽約，傳「全部」或不傳則不篩選
 * @param {string} [userId] - LINE User ID（選填）
 */
export async function fetchMonthEvents(year, month, type, userId) {
  const params = new URLSearchParams({ year: String(year), month: String(month) })
  if (type && type !== '全部') params.set('type', type)
  if (userId) params.set('userId', userId)
  const res = await fetch(`/api/calendar/month?${params}`)
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

/**
 * 更新個人資料
 * @param {string} userId - LINE User ID
 * @param {Object} profileData - 個人資料（含 name, email, phone, birthday 等）
 */
export async function updateProfile(userId, profileData) {
  const res = await fetch('/api/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Line-User-Id': userId,
    },
    body: JSON.stringify(profileData),
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.message || '更新個人資料失敗')
  return data.data
}

/**
 * 進入系統時同步 LINE 頭像到 Google Sheet（有變更才更新，不阻塞畫面）
 */
export function syncProfileAvatar(userId, pictureUrl) {
  if (!userId) return
  fetch('/api/profile/sync-avatar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Line-User-Id': userId },
    body: JSON.stringify({ pictureUrl: pictureUrl || '' }),
  })
    .then((res) => res.json())
    .catch(() => {})
}

/**
 * 進入 LIFF 時同步生日行程：檢查日曆上「姓名+生日」的日期是否與個人資料生日一致，若不一致則由後端更新
 * 不阻塞畫面，靜默呼叫
 */
export function syncBirthdayEvent(userId) {
  if (!userId) return
  fetch('/api/calendar/sync-my-birthday', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Line-User-Id': userId },
  })
    .then((res) => res.json())
    .catch(() => {})
}

// 與 public/js/cacheService.js 相同的 key，供進入 LIFF 時清除並重建快取
const CACHE_KEY_VERSION = 'app_data_version'
const CACHE_KEY_EVENTS = 'app_data_events'
const CACHE_KEY_MEMBERS = 'app_data_members'

/**
 * 清除本地快取（版本號、行程、成員）
 */
export function clearAppCache() {
  try {
    localStorage.removeItem(CACHE_KEY_VERSION)
    localStorage.removeItem(CACHE_KEY_EVENTS)
    localStorage.removeItem(CACHE_KEY_MEMBERS)
  } catch (e) {
    // 忽略 localStorage 不可用（如無痕模式）
  }
}

/**
 * 進入 LIFF 時：先清除快取，再向後端取得最新版本與資料並寫回 localStorage
 * 不阻塞畫面，靜默執行；與舊版 cacheService 共用同一份快取，確保資料一致
 */
export function refreshAppCacheOnLiffEnter() {
  clearAppCache()
  fetch('/api/calendar/version')
    .then((res) => res.json())
    .then((data) => {
      if (!data.success || !data.data) return
      const { version, events, members } = data.data
      if (version == null) return
      try {
        localStorage.setItem(CACHE_KEY_VERSION, String(version))
        localStorage.setItem(CACHE_KEY_EVENTS, JSON.stringify(events || []))
        localStorage.setItem(CACHE_KEY_MEMBERS, JSON.stringify(members || []))
      } catch (e) {
        // 忽略寫入失敗
      }
    })
    .catch(() => {})
}
