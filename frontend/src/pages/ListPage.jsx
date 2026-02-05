import { useState, useEffect } from 'react'
import { useLiff } from '../context/LiffContext'
import PageHeader from '../components/PageHeader'
import EventCard from '../components/EventCard'
import { fetchMonthEvents } from '../api'

const TABS = ['全部', '學員上課', '活動', '諮詢簽約']

export default function ListPage() {
  const { userId } = useLiff()
  const [activeTab, setActiveTab] = useState('全部')
  const [current, setCurrent] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const year = current.getFullYear()
  const month = current.getMonth() + 1

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const typeParam = activeTab === '全部' ? null : activeTab
    fetchMonthEvents(year, month, typeParam, userId || undefined)
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
  }, [year, month, activeTab, userId])

  const yearMonthLabel = `${year}年 ${month}月`

  return (
    <>
      <PageHeader title="行程列表" onRefresh={() => window.location.reload()} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-none border-b border-slate-100 dark:border-slate-800 px-4">
          <div className="flex gap-6 min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex flex-col items-center pb-3 border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-primary'
                }`}
              >
                <span className="text-sm">{tab}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 pb-[100px]">
          <div className="sticky top-0 z-10 bg-background-light dark:bg-background-dark py-2 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{yearMonthLabel}</h3>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setCurrent((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                aria-label="上個月"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrent((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                aria-label="下個月"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          </div>
          <div className="space-y-4 pt-2">
            {loading && <p className="text-slate-500 dark:text-gray-400 text-center py-8">載入中...</p>}
            {error && <p className="text-red-500 text-sm text-center py-4">{error}</p>}
            {!loading && !error && events.length === 0 && (
              <p className="text-slate-500 dark:text-gray-400 text-center py-8">
                {activeTab === '全部' ? '目前沒有行程' : `目前沒有 ${activeTab} 類型的行程`}
              </p>
            )}
            {!loading && !error && events.length > 0 && events.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
          <div className="h-8" />
        </div>
      </div>
    </>
  )
}
