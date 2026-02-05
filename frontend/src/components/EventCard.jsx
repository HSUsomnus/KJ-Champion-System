import { Link } from 'react-router-dom'

const TYPE_STYLES = {
  學員上課: 'bg-type-class',
  活動: 'bg-type-activity',
  諮詢簽約: 'bg-type-consult',
}

/** 將 API 的 start 轉成 date / time 字串供顯示 */
function formatEventDisplay(event) {
  const start = event.start
  if (!start) return { date: '', time: null, isAllDay: event.allDay }
  const isAllDay = event.allDay || /^\d{4}-\d{2}-\d{2}$/.test(String(start).trim())
  const d = new Date(start)
  const date = d.toISOString().slice(0, 10)
  const time = isAllDay ? null : d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
  return { date, time, isAllDay }
}

export default function EventCard({ event }) {
  const { id, title, type, isBirthdayEvent } = event
  const { date, time, isAllDay } = formatEventDisplay(event)
  const typeClass = TYPE_STYLES[type] || 'bg-primary'

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[20px] shadow-sm overflow-hidden border border-slate-100 dark:border-slate-800">
      <div className={`${typeClass} px-4 py-2 flex items-center justify-center gap-2`}>
        <span className="material-symbols-outlined text-white text-[18px] fill-icon">calendar_month</span>
        <span className="text-white text-[14px] font-bold">
          {date?.replace(/-/g, '/').slice(0, 7)} {type}
        </span>
      </div>
      <div className="p-4 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="mb-1">
            <span className="text-[14px] font-medium text-slate-400 dark:text-slate-500">{date}</span>
            {!isAllDay && time && (
              <span className="text-[14px] font-medium text-line-green ml-1">{time}</span>
            )}
          </div>
          <h4 className="text-[17px] font-bold text-slate-800 dark:text-white truncate">{title}</h4>
        </div>
        <div className="flex items-center gap-1 ml-4 shrink-0">
          <Link
            to={`/event/${id}`}
            className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label={isBirthdayEvent ? '查看' : '編輯'}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isBirthdayEvent ? 'visibility' : 'edit'}
            </span>
          </Link>
          <button
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="分享"
          >
            <span className="material-symbols-outlined text-[20px]">share</span>
          </button>
        </div>
      </div>
    </div>
  )
}
