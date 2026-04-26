import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import FabNav from '../components/FabNav'
import FabAction, { PENCIL_ICON } from '../components/FabAction'
import shareEvent from '../utils/shareEvent'
import { useToast, useConfirm } from '../components/feedback'
import { useAuth } from '../contexts/AuthContext'
import { api, mapEvent } from '../services/api'

const TYPE_COLORS = {
  '學員上課': '#4A7C59',
  '活動': '#C7A33A',
  '諮詢簽約': '#3A7CC7',
  '紫星行程聊聊': '#8E44AD',
}

export default function EventDetail() {
  const { user } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const [activeFab, setActiveFab] = useState(null)
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getEvent(id)
      .then(res => {
        if (res.success && res.data) {
          setEvent(mapEvent(res.data))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#F7F5F2' }}>
        <Header user={user} />
        <main className="flex-1 flex items-center justify-center pt-16">
          <p className="text-sm" style={{ color: '#8A8680' }}>載入中...</p>
        </main>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#F7F5F2' }}>
        <Header user={user} />
        <main className="flex-1 flex items-center justify-center pt-16">
          <div className="text-center">
            <p className="text-sm" style={{ color: '#8A8680' }}>找不到此行程</p>
            <button onClick={() => navigate('/calendar')} className="mt-4 px-4 py-2 rounded-xl text-sm" style={{ background: '#4A7C59', color: '#fff' }}>
              返回行事曆
            </button>
          </div>
        </main>
      </div>
    )
  }

  const typeColor = TYPE_COLORS[event.type] || '#4A7C59'

  const handleDelete = async () => {
    const ok = await confirm({
      title: '確認刪除',
      message: `確定刪除「${event.title}」？\n此操作無法復原。`,
      confirmText: '刪除',
      variant: 'danger',
    })
    if (!ok) return
    try {
      const res = await api.deleteEvent(event.id)
      if (res.success) {
        toast.success('已刪除')
        navigate('/calendar')
      } else {
        toast.error(res.error || res.message || '刪除失敗')
      }
    } catch (err) {
      toast.error(err.message || '刪除失敗')
    }
  }

  const handleShareEvent = async () => {
    const r = await shareEvent(event)
    if (r.copied) toast.success('已複製到剪貼簿')
  }

  const fabItems = event.isBirthdayEvent
    ? [
        {
          label: '分享',
          onClick: handleShareEvent,
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
        },
      ]
    : [
        {
          label: '編輯',
          onClick: () => navigate('/add-event', { state: { event } }),
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
        },
        {
          label: '分享',
          onClick: handleShareEvent,
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
        },
        {
          label: '刪除',
          onClick: handleDelete,
          labelColor: '#dc2626',
          labelBorderColor: '#dc2626',
          btnColor: '#dc2626',
          btnBorderColor: '#dc2626',
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>,
        },
      ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F7F5F2' }}>
      <Header user={user} />

      <main className="flex-1 overflow-y-auto pt-16 pb-28 px-4">
        <div className="mt-4 mb-3">
          <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: `${typeColor}15`, color: typeColor }}>
            {event.type}
          </span>
        </div>

        <h1 className="text-xl font-semibold mb-6" style={{ color: '#2C2C2C' }}>{event.title}</h1>

        <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
          <div className="px-4 py-3.5 flex items-center gap-3" style={{ borderBottom: '1px solid #E2DED8' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A8680" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="3"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span className="text-sm" style={{ color: '#2C2C2C' }}>{event.date}</span>
          </div>

          <div className="px-4 py-3.5 flex items-center gap-3" style={{ borderBottom: '1px solid #E2DED8' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A8680" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span className="text-sm" style={{ color: '#2C2C2C' }}>
              {event.allDay ? '整日' : `${event.time || ''}${event.endTime ? ` - ${event.endTime}` : ''}`}
            </span>
          </div>

          {event.description && (
            <div className="px-4 py-3.5 flex items-start gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A8680" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                <line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/>
              </svg>
              <span className="text-sm" style={{ color: '#2C2C2C' }}>{event.description}</span>
            </div>
          )}
        </div>
      </main>

      <FabNav onOpen={() => setActiveFab('nav')} />
      <FabAction items={fabItems} fabIcon={PENCIL_ICON} onOpen={() => setActiveFab('action')} />
    </div>
  )
}
