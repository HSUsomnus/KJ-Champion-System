/**
 * 分享單一行程（Web Share API → clipboard fallback）
 * @param {Object} event - { title, date, time, endTime, allDay, type, description }
 * @returns {Promise<{ ok: boolean, copied?: boolean, cancelled?: boolean }>}
 *   ok=true 代表分享或複製成功
 *   copied=true 代表走 clipboard fallback（呼叫端可顯示「已複製」toast）
 *   cancelled=true 代表使用者取消 Web Share
 *
 * 設計決策：本檔為 utility 函式不能直接用 useToast hook，故改回傳 result，
 *   由呼叫端 page component 拿到 result 後自行觸發 toast。
 */
export default async function shareEvent(event) {
  const time = event.allDay
    ? '整日'
    : `${event.time || event.startTime || ''}${event.endTime ? ' - ' + event.endTime : ''}`
  const text = `${event.title}\n${event.date} ${time}\n類型：${event.type}${event.description ? '\n備註：' + event.description : ''}`

  if (navigator.share) {
    try {
      await navigator.share({ text })
      return { ok: true }
    } catch {
      return { ok: false, cancelled: true }
    }
  }
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text)
    return { ok: true, copied: true }
  }
  return { ok: false }
}
