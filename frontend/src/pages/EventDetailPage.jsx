import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useLiff } from '../context/LiffContext'
import PageHeader from '../components/PageHeader'
import { fetchEvent } from '../api'

const TYPE_STYLES = {
  學員上課: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200',
  活動: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-200',
  諮詢簽約: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-200',
}

/** 將 API 的 start/end 轉成顯示用字串（日期 + 是否整日） */
function formatEventTime(event) {
  const start = event?.start
  if (!start) return { startStr: '', endStr: '' }
  const isAllDay = event?.allDay || /^\d{4}-\d{2}-\d{2}$/.test(String(start).trim())
  const d = new Date(start + (isAllDay ? 'T12:00:00' : ''))
  const dateStr = `${d.getFullYear()}年 ${d.getMonth() + 1}月 ${d.getDate()}日 (${['日','一','二','三','四','五','六'][d.getDay()]})`
  if (isAllDay) return { startStr: dateStr + ' 整日', endStr: '' }
  const timeStr = d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
  const end = event?.end
  const endTime = end ? new Date(end).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : ''
  return { startStr: `${dateStr} ${timeStr}`, endStr: endTime ? `${dateStr} ${endTime}` : '' }
}

export default function EventDetailPage() {
  const { id } = useParams()
  const { userId } = useLiff()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchEvent(id, userId || undefined)
      .then((data) => { if (!cancelled) setEvent(data) })
      .catch((err) => { if (!cancelled) setError(err.message || '載入失敗') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id, userId])

  const typeClass = TYPE_STYLES[event?.type] || 'bg-amber-100 text-amber-700'
  const { startStr, endStr } = event ? formatEventTime(event) : { startStr: '', endStr: '' }

  if (loading) {
    return (
      <>
        <PageHeader title="行程詳情" onRefresh={() => window.location.reload()} />
        <div className="p-4 text-slate-500">載入中...</div>
      </>
    )
  }
  if (error || !event) {
    return (
      <>
        <PageHeader title="行程詳情" onRefresh={() => window.location.reload()} />
        <div className="p-4 text-slate-500">{error || '找不到該行程'}</div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="行程詳情" onRefresh={() => window.location.reload()} />
      <div className="flex-1 overflow-y-auto pb-32 px-4 pt-4">
        <div className="bg-white dark:bg-surface-dark rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-white/5 mb-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <div className="flex items-start justify-between mb-3">
            <div className={`flex h-7 shrink-0 items-center justify-center gap-x-2 rounded-full px-3 ${typeClass}`}>
              <div className="size-2 rounded-full bg-amber-500" />
              <p className="text-xs font-bold leading-normal">{event.type}</p>
            </div>
          </div>
          <h1 className="text-slate-900 dark:text-white text-2xl font-bold leading-tight mb-6">{event.title}</h1>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="material-symbols-outlined">calendar_today</span>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wide">開始時間</p>
                <p className="text-slate-900 dark:text-white text-base font-semibold mt-0.5">{startStr}</p>
              </div>
            </div>
            {endStr && (
              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <span className="material-symbols-outlined">schedule</span>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wide">結束時間</p>
                  <p className="text-slate-900 dark:text-white text-base font-semibold mt-0.5">{endStr}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-slate-900 dark:text-white text-lg font-bold leading-tight pb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-gray-400 text-[20px]">description</span>
            備註
          </h3>
          <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-100 dark:border-white/5 shadow-sm">
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{event.description || '無'}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-4">
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-green-600 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined">share</span>
            分享行程
          </button>
          {!event.isBirthdayEvent && (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex items-center justify-center gap-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 text-slate-900 dark:text-white font-semibold py-3.5 px-6 rounded-xl active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">edit</span>
                編輯
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-transparent hover:bg-red-100 dark:hover:bg-red-900/30 font-semibold py-3.5 px-6 rounded-xl active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
                刪除
              </button>
            </div>
          )}
          {event.isBirthdayEvent && (
            <p className="text-slate-500 dark:text-slate-400 text-sm text-center py-2">
              系統生成的生日行程僅供查看，不可編輯或刪除
            </p>
          )}
        </div>
      </div>
    </>
  )
}
