/**
 * API 服務層：呼叫後端 /api/* 端點
 * 與舊前端的 fetch 呼叫對應
 */

const API_BASE = '';

/**
 * 取得 API 預設 headers（含 LINE User ID）
 */
function headers(userId) {
  const h = { 'Content-Type': 'application/json' };
  if (userId) h['X-Line-User-Id'] = userId;
  return h;
}

/**
 * 檢查成員是否已註冊
 */
export async function checkMember(userId) {
  const res = await fetch(`${API_BASE}/api/members/check?userId=${encodeURIComponent(userId)}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || '檢查註冊失敗');
  return data.data;
}

/**
 * 取得個人資料
 */
export async function getProfile(userId) {
  const res = await fetch(`${API_BASE}/api/profile`, { headers: headers(userId) });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || '取得個人資料失敗');
  return data.data;
}

/**
 * 更新個人資料
 */
export async function updateProfile(userId, body) {
  const res = await fetch(`${API_BASE}/api/profile`, {
    method: 'PUT',
    headers: headers(userId),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || '更新失敗');
  return data.data;
}

/**
 * 註冊新成員
 */
export async function registerProfile(userId, body) {
  const res = await fetch(`${API_BASE}/api/profile/register`, {
    method: 'POST',
    headers: headers(userId),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || '註冊失敗');
  return data.data;
}

/**
 * 取得指定日期範圍的行程
 */
export async function getEvents(startDate, endDate) {
  const res = await fetch(
    `${API_BASE}/api/calendar/events?startDate=${startDate}&endDate=${endDate}`
  );
  const data = await res.json();
  if (!data.success) throw new Error(data.message || '取得行程失敗');
  return data.data;
}

/**
 * 取得當日行程
 */
export async function getTodayEvents(date) {
  const d = date || new Date().toISOString().split('T')[0];
  const res = await fetch(`${API_BASE}/api/calendar/today?date=${d}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || '取得當日行程失敗');
  return data.data;
}

/**
 * 取得所有成員
 */
export async function getMembers() {
  const res = await fetch(`${API_BASE}/api/members`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || '取得成員失敗');
  return data.data;
}
