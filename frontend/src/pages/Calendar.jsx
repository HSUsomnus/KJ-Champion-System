import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import FabNav from '../components/FabNav'
import FabAction, { PENCIL_ICON } from '../components/FabAction'
import { useAuth } from '../contexts/AuthContext'
import { api, mapEvent } from '../services/api'

const EVENT_TYPES = ['全部', '學員上課', '活動', '諮詢簽約', '紫星行程聊聊']

const TYPE_COLORS = {
  '學員上課': '#4A7C59',
  '活動': '#C7A33A',
  '諮詢簽約': '#3A7CC7',
  '紫星行程聊聊': '#8E44AD',
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay()
}

function formatMonth(year, month) {
  return `${year} 年 ${month + 1} 月`
}

function dateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function buildShareText(events, label) {
  if (events.length === 0) return `${label}：沒有行程`
  const lines = events.map(e => {
    const time = e.allDay ? '整日' : (e.time || '')
    return `${time ? time + ' ' : ''}${e.title}（${e.type}）`
  })
  return `${label}\n${lines.join('\n')}`
}

async function handleShare(text) {
  if (navigator.share) {
    try { await navigator.share({ text }) } catch { /* 使用者取消 */ }
  } else if (navigator.clipboard) {
    await navigator.clipboard.writeText(text)
    alert('已複製到剪貼簿')
  }
}

const SHARE_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
)

export default function Calendar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(dateStr(today.getFullYear(), today.getMonth(), today.getDate()))
  const [activeFab, setActiveFab] = useState(null)
  const [viewMode, setViewMode] = useState('calendar')
  const [typeFilter, setTypeFilter] = useState('全部')
  const [events, setEvents] = useState([])

  // 取得當月行程
  useEffect(() => {
    const m = month + 1
    api.getMonthEvents(year, m)
      .then(res => {
        if (res.success && res.data) {
          setEvents(res.data.map(mapEvent))
        }
      })
      .catch(() => {})
  }, [year, month])

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const todayStr = dateStr(today.getFullYear(), today.getMonth(), today.getDate())

  const eventsForDate = events.filter(e => e.date === selectedDate)
  const eventDates = new Set(events.map(e => e.date))

  // 時間表模式：當月行程，支援分類篩選
  const monthEvents = useMemo(() => {
    let filtered = events
    if (typeFilter !== '全部') {
      filtered = filtered.filter(e => e.type === typeFilter)
    }
    return filtered.sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
  }, [events, typeFilter])

  const groupedEvents = useMemo(() => {
    return monthEvents.reduce((acc, e) => {
      if (!acc[e.date]) acc[e.date] = []
      acc[e.date].push(e)
      return acc
    }, {})
  }, [monthEvents])

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const todayEvents = events.filter(e => e.date === todayStr)

  const fabItems = viewMode === 'calendar'
    ? [
        {
          label: '新增行程', path: '/add-event',
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>,
        },
        {
          label: '時間表模式', onClick: () => setViewMode('schedule'),
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
        },
        {
          label: '分享今日行程',
          onClick: () => handleShare(buildShareText(todayEvents, `${todayStr} 行程`)),
          icon: SHARE_ICON,
        },
      ]
    : [
        {
          label: '新增行程', path: '/add-event',
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>,
        },
        {
          label: '行事曆模式', onClick: () => setViewMode('calendar'),
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
        },
        {
          label: '分享行程',
          onClick: () => {
            const label = typeFilter === '全部'
              ? `${formatMonth(year, month)} 行程`
              : `${formatMonth(year, month)} ${typeFilter}`
            handleShare(buildShareText(monthEvents, label))
          },
          icon: SHARE_ICON,
        },
      ]

  const EventCard = ({ event }) => (
    <button
      onClick={() => navigate(`/event/${event.id}`)}
      className="w-full text-left rounded-2xl p-4 shadow-sm flex items-start gap-3 active:scale-[0.98] transition-transform"
      style={{ background: '#fff', border: '1px solid #E2DED8' }}
    >
      <div className="w-1 h-10 rounded-full shrink-0 mt-0.5" style={{ background: TYPE_COLORS[event.type] || '#4A7C59' }} />
      <div className="flex-1">
        <p className="text-sm font-medium" style={{ color: '#2C2C2C' }}>{event.title}</p>
        <div className="flex items-center gap-2 mt-1">
          {event.time && <span className="text-xs" style={{ color: '#8A8680' }}>{event.allDay ? '整日' : `${event.time}${event.endTime ? ` - ${event.endTime}` : ''}`}</span>}
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${TYPE_COLORS[event.type] || '#4A7C59'}15`, color: TYPE_COLORS[event.type] || '#4A7C59' }}>
            {event.type}
          </span>
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8680" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-3">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </button>
  )

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#F7F5F2' }}>
      <Header user={user} />

      <main className="flex-1 overflow-y-auto pt-16 pb-28 px-4">
        <div className="sticky top-0 z-20 -mx-4 px-4 pt-2 pb-2" style={{ background: '#F7F5F2' }}>
          <section className="flex items-center justify-between">
            <button onClick={prevMonth} className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all" style={{ background: '#EFEDE9' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2C2C2C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <h1 className="text-base font-semibold" style={{ color: '#2C2C2C' }}>{formatMonth(year, month)}</h1>
            <button onClick={nextMonth} className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all" style={{ background: '#EFEDE9' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2C2C2C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </section>

          {viewMode === 'schedule' && (
            <div className="flex gap-2 mt-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {EVENT_TYPES.map(tab => (
                <button
                  key={tab} onClick={() => setTypeFilter(tab)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all active:scale-95"
                  style={{
                    background: typeFilter === tab ? '#4A7C59' : '#fff',
                    color: typeFilter === tab ? '#fff' : '#2C2C2C',
                    border: typeFilter === tab ? '1px solid #4A7C59' : '1px solid #E2DED8',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}
        </div>

        {viewMode === 'calendar' ? (
          <>
            <section className="rounded-2xl p-3 shadow-sm mb-4" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
              <div className="grid grid-cols-7 mb-2">
                {WEEKDAYS.map(d => (
                  <div key={d} className="text-center text-xs font-medium py-1" style={{ color: '#8A8680' }}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {cells.map((day, i) => {
                  if (day === null) return <div key={`empty-${i}`} />
                  const ds = dateStr(year, month, day)
                  const isToday = ds === todayStr
                  const isSelected = ds === selectedDate
                  const hasEvent = eventDates.has(ds)
                  return (
                    <button
                      key={ds} onClick={() => setSelectedDate(ds)}
                      className="flex flex-col items-center justify-center py-1.5 rounded-xl transition-all active:scale-90"
                      style={{
                        background: isSelected ? '#4A7C59' : isToday ? '#E8F0EB' : 'transparent',
                        color: isSelected ? '#fff' : '#2C2C2C',
                      }}
                    >
                      <span className="text-sm">{day}</span>
                      {hasEvent && <div className="w-1 h-1 rounded-full mt-0.5" style={{ background: isSelected ? '#fff' : '#4A7C59' }} />}
                    </button>
                  )
                })}
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold mb-3" style={{ color: '#8A8680', letterSpacing: '0.06em' }}>
                {selectedDate === todayStr ? '今日行程' : `${selectedDate} 行程`}
              </h2>
              {eventsForDate.length === 0 ? (
                <div className="rounded-2xl p-6 shadow-sm text-center" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
                  <p className="text-sm" style={{ color: '#8A8680' }}>沒有行程</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {eventsForDate.map(event => <EventCard key={event.id} event={event} />)}
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="mt-2">
            {Object.keys(groupedEvents).length === 0 ? (
              <div className="rounded-2xl p-6 shadow-sm text-center" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
                <p className="text-sm" style={{ color: '#8A8680' }}>
                  {typeFilter === '全部' ? '本月沒有行程' : `本月沒有「${typeFilter}」行程`}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {Object.entries(groupedEvents).map(([date, evts]) => (
                  <div key={date}>
                    <p className="text-xs font-medium mb-2" style={{ color: '#8A8680' }}>{date}</p>
                    <div className="flex flex-col gap-2">
                      {evts.map(event => <EventCard key={event.id} event={event} />)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <FabNav onOpen={useCallback(() => setActiveFab('nav'), [])} />
      <FabAction items={fabItems} fabIcon={PENCIL_ICON} onOpen={useCallback(() => setActiveFab('action'), [])} />
    </div>
  )
}
