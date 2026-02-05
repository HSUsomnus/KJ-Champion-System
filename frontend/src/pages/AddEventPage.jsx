import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'

const TYPES = [
  { value: '學員上課', label: '學員上課', bg: 'peer-checked:bg-[#FEF9C3] peer-checked:text-[#854D0E] dark:peer-checked:bg-yellow-900/40 dark:peer-checked:text-yellow-400' },
  { value: '活動', label: '活動', bg: 'peer-checked:bg-[#FEE2E2] peer-checked:text-[#991B1B] dark:peer-checked:bg-red-900/40 dark:peer-checked:text-red-400' },
  { value: '諮詢簽約', label: '諮詢簽約', bg: 'peer-checked:bg-[#DCFCE7] peer-checked:text-[#166534] dark:peer-checked:bg-green-900/40 dark:peer-checked:text-green-400' },
]

// 依行程類型顯示不同的標題提示詞（灰色 placeholder + 下方說明）
const TITLE_HINTS = {
  學員上課: '名字+金流課/藍圖課，ex:小陞金流課',
  活動: '時間(選)+名稱+(財商/加盟)(選)，ex:13台北組聚(財商)、醫美茶會',
  諮詢簽約: '時間+名字+保單諮詢/財物諮詢/保單簽約/天耀簽約，ex:13小陞財務諮詢',
}

export default function AddEventPage() {
  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState('學員上課')
  // 類型為「學員上課」時預設整日
  const [allDay, setAllDay] = useState(true)
  const [startDate, setStartDate] = useState('2023-10-24')
  const [startTime, setStartTime] = useState('10:00')
  const [endDate, setEndDate] = useState('2023-10-24')
  const [endTime, setEndTime] = useState('11:00')
  const [note, setNote] = useState('')

  // 只有「學員上課」鎖住默認整日；活動、諮詢簽約預設非整日並顯示時間
  useEffect(() => {
    if (eventType === '學員上課') setAllDay(true)
    else setAllDay(false)
  }, [eventType])

  // 標題提示詞：若會斷行則縮小字體直到單行；縮到最小仍放不下則換行，避免被切掉
  const hintRef = useRef(null)
  useEffect(() => {
    const el = hintRef.current
    if (!el) return
    el.style.whiteSpace = 'nowrap'
    el.style.fontSize = '12px'
    el.style.overflow = ''
    const minFontSize = 9
    const fit = () => {
      if (el.scrollWidth > el.clientWidth) {
        const fs = parseInt(el.style.fontSize, 10) || 12
        if (fs > minFontSize) {
          el.style.fontSize = `${fs - 1}px`
          requestAnimationFrame(fit)
        } else {
          el.style.whiteSpace = 'normal'
          el.style.overflow = 'visible'
        }
      }
    }
    const id = requestAnimationFrame(fit)
    return () => cancelAnimationFrame(id)
  }, [eventType])

  return (
    <>
      <PageHeader title="新增行程" onRefresh={() => window.location.reload()} />
      <div className="flex-1 overflow-y-auto no-scrollbar pb-[100px]">
        <div className="px-5 py-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-900 dark:text-gray-200">行程標題</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={TITLE_HINTS[eventType]}
              className="w-full h-12 px-4 rounded-xl bg-white dark:bg-surface-dark border-0 ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-primary text-base placeholder:text-gray-400"
            />
            <p
              ref={hintRef}
              className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 break-words"
              style={{ whiteSpace: 'nowrap' }}
              aria-hidden="true"
            >
              {TITLE_HINTS[eventType]}
            </p>
          </label>
        </div>

        <div className="px-5 py-2">
          <span className="text-sm font-medium text-slate-900 dark:text-gray-200 mb-2 block">行程類型</span>
          <div className="flex p-1 bg-gray-100 dark:bg-surface-dark rounded-xl ring-1 ring-gray-200 dark:ring-gray-700">
            {TYPES.map((t) => (
              <label key={t.value} className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="eventType"
                  value={t.value}
                  checked={eventType === t.value}
                  onChange={() => setEventType(t.value)}
                  className="peer sr-only"
                />
                <div
                  className={`py-2.5 px-1 text-center text-[13px] font-bold rounded-lg text-gray-500 dark:text-gray-400 peer-checked:shadow-sm transition-all duration-200 ${t.bg}`}
                >
                  {t.label}
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-900 dark:text-gray-200">日期與時間</span>
            <label className={`flex items-center gap-2 ${eventType === '學員上課' ? 'cursor-default' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                checked={allDay}
                disabled={eventType === '學員上課'}
                onChange={(e) => setAllDay(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">整日</span>
            </label>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <span className="text-[11px] text-gray-400 dark:text-gray-500 ml-1">開始時間</span>
              <div className="flex items-center justify-between bg-white dark:bg-surface-dark h-14 px-4 rounded-xl ring-1 ring-gray-200 dark:ring-gray-700 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
                    <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                  </div>
                  <span className="text-base text-slate-900 dark:text-white font-medium">
                    {startDate.replace(/-/g, '/')} {!allDay && startTime}
                  </span>
                </div>
                <span className="material-symbols-outlined text-gray-400 text-[20px]">edit</span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] text-gray-400 dark:text-gray-500 ml-1">結束時間</span>
              <div className="flex items-center justify-between bg-white dark:bg-surface-dark h-14 px-4 rounded-xl ring-1 ring-gray-200 dark:ring-gray-700 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
                    <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                  </div>
                  <span className="text-base text-slate-900 dark:text-white font-medium">
                    {endDate.replace(/-/g, '/')} {!allDay && endTime}
                  </span>
                </div>
                <span className="material-symbols-outlined text-gray-400 text-[20px]">edit</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-2">
          <label className="block space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-medium text-slate-900 dark:text-gray-200">備註</span>
              <span className="text-xs text-gray-400">{note.length}/200</span>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 200))}
              placeholder="在此輸入行程細節..."
              rows={4}
              className="w-full min-h-[140px] p-4 rounded-xl bg-white dark:bg-surface-dark border-0 ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-primary text-base placeholder:text-gray-400 resize-none transition-all shadow-sm"
            />
          </label>
        </div>

        <div className="h-8" />
        <div className="px-5 space-y-3">
          <button
            type="button"
            className="w-full h-12 bg-primary hover:bg-green-600 text-white font-bold rounded-lg shadow-lg shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            儲存
          </button>
          <Link
            to="/"
            className="w-full h-12 bg-transparent text-gray-500 dark:text-gray-400 font-medium rounded-lg active:bg-gray-100 dark:active:bg-gray-800 transition-all flex items-center justify-center gap-2 block"
          >
            取消
          </Link>
        </div>
      </div>
    </>
  )
}
