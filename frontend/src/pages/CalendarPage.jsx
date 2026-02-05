import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useLiff } from '../context/LiffContext'
import { fetchTodayEvents } from '../api'
import PageHeader from '../components/PageHeader'
import EventCard from '../components/EventCard'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export default function CalendarPage() {
  const { userId } = useLiff()
  const [current, setCurrent] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const dateStr = useMemo(() => {
    const y = selectedDate.getFullYear()
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const day = String(selectedDate.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }, [selectedDate])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchTodayEvents(dateStr, userId || undefined)
      .then((data) => {
        if (!cancelled) setEvents(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || '載入失敗')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [dateStr, userId])

  const yearMonthLabel = `${current.getFullYear()}年 ${current.getMonth() + 1}月`
  const selectedLabel = selectedDate.toISOString().slice(0, 10).replace(/-/g, '/')

  const calendarDays = useMemo(() => {
    const year = current.getFullYear()
    const month = current.getMonth()
    const first = new Date(year, month, 1)
    const last = new Date(year, month + 1, 0)
    const startPad = first.getDay()
    const days = []
    for (let i = 0; i < startPad; i++) days.push(null)
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d))
    return days
  }, [current])

  const isSelected = (d) => d && selectedDate && d.toDateString() === selectedDate.toDateString()
  const isToday = (d) => {
    if (!d) return false
    const t = new Date()
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
  }

  return (
    <>
      <PageHeader title="行事曆" onRefresh={() => window.location.reload()} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex-none px-6 pt-6 pb-2 bg-background-light dark:bg-background-dark z-10">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setCurrent((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
              className="p-2 rounded-full hover:bg-surface-light dark:hover:bg-surface-dark transition-colors text-slate-800 dark:text-white"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{yearMonthLabel}</h2>
            <button
              type="button"
              onClick={() => setCurrent((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
              className="p-2 rounded-full hover:bg-surface-light dark:hover:bg-surface-dark transition-colors text-slate-800 dark:text-white"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </header>

        <div className="flex-none px-4 pb-6 bg-background-light dark:bg-background-dark border-b border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map((day, i) => (
              <div
                key={day}
                className={`text-xs font-semibold text-center py-2 ${i === 0 ? 'text-red-500' : 'text-slate-400'}`}
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-2 place-items-center">
            {calendarDays.map((d, i) => {
              if (!d) return <div key={`pad-${i}`} className="h-10 w-10" />
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  className={`h-10 w-10 flex flex-col items-center justify-center rounded-lg transition-all ${
                    isSelected(d)
                      ? 'border-2 border-primary text-slate-900 dark:text-white font-bold bg-green-50/50 dark:bg-green-900/20 shadow-sm scale-105'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-surface-light dark:hover:bg-surface-dark'
                  }`}
                >
                  <span className="text-sm font-medium">{d.getDate()}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex-1 bg-slate-50 dark:bg-[#162e21] flex flex-col overflow-hidden relative shadow-up">
          <div className="flex items-center justify-between px-6 pt-6 pb-2 shrink-0">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              {selectedLabel} 行程
            </h3>
            <Link
              to="/add-event"
              className="flex items-center justify-center h-9 w-9 bg-primary hover:bg-primary-dark text-white rounded-full shadow-md transition-colors"
              title="新增行程"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto px-6 pb-[100px] pt-2 no-scrollbar space-y-4">
            {loading && <p className="text-slate-500 text-sm">載入中...</p>}
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {!loading && !error && events.length === 0 && (
              <p className="text-slate-500 text-sm">當日尚無行程</p>
            )}
            {!loading && !error && events.length > 0 && events.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
