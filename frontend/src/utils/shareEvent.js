/**
 * 分享單一行程（Web Share API → clipboard fallback）
 * @param {Object} event - { title, date, time, endTime, allDay, type, description }
 */
export default async function shareEvent(event) {
  const time = event.allDay ? '整日' : `${event.time || event.startTime || ''}${event.endTime ? ' - ' + event.endTime : ''}`
  const text = `${event.title}\n${event.date} ${time}\n類型：${event.type}${event.description ? '\n備註：' + event.description : ''}`

  if (navigator.share) {
    try { await navigator.share({ text }) } catch { /* 使用者取消 */ }
  } else if (navigator.clipboard) {
    await navigator.clipboard.writeText(text)
    alert('已複製到剪貼簿')
  }
}
